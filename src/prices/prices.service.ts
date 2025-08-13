// src/prices/prices.service.ts
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Very small LRU cache for memoizing chart data responses
class SimpleLruCache<K, V> {
  private map: Map<K, V> = new Map();
  constructor(private readonly maxEntries: number) {}
  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      // refresh recency
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }
  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.maxEntries) {
      // delete oldest
      const oldestKey = this.map.keys().next().value as K;
      this.map.delete(oldestKey);
    }
  }
}

export interface PricePoint {
  timestamp: string;
  price: number;
}

@Injectable()
export class PricesService {
  private readonly filePath = path.resolve(process.cwd(), 'dist/data/3mo-prices.ndjson');
  private readonly MAX_CHART_POINTS = 1000;
  private readonly FILE_STREAM_CHUNK_BYTES = 1 << 20; // 1MB chunks for faster reads

  // Cache a few recent chartData results by [start|end|maxPoints]
  private chartDataCache = new SimpleLruCache<string, PricePoint[]>(50);

  // Lightweight in-memory line index to allow fast seeking by timestamp
  private lineIndex: Array<{ ts: number; offset: number }> | null = null;
  private readonly INDEX_EVERY_N_LINES = 1000; // adjust for size/perf

  async onModuleInit() {
    this.warmUpStats(); // don't await — run in background
  }

  private statsCache: {
  totalPoints: number;
  dateRange: { start: string; end: string };
  priceRange: { min: number; max: number };
} | null = null;

  // Quick cache just for date range derived from first/last lines
  private dateRangeQuickCache: { start: string; end: string } | null = null;

  // Resolve data file path across environments (env override, local data/, dist/data/, src/data/)
  private getDataFilePath(): string {
    const candidates = [
      process.env.PRICES_FILE ? path.resolve(process.cwd(), process.env.PRICES_FILE) : null,
      path.resolve(process.cwd(), 'data/3mo-prices.ndjson'),
      path.resolve(process.cwd(), 'dist/data/3mo-prices.ndjson'),
      path.resolve(process.cwd(), 'src/data/3mo-prices.ndjson'),
      // Fallbacks to JSON array file if NDJSON is unavailable
      path.resolve(process.cwd(), 'data/24h-prices.json'),
      path.resolve(process.cwd(), 'dist/data/24h-prices.json'),
      path.resolve(process.cwd(), 'src/data/24h-prices.json'),
    ].filter(Boolean) as string[];
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) return p;
      } catch {}
    }
    return this.filePath;
  }

  private async isJsonArrayFile(filePath: string): Promise<boolean> {
    try {
      const fh = await fsp.open(filePath, 'r');
      try {
        const buf = Buffer.alloc(1 << 12);
        const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
        const text = buf.subarray(0, bytesRead).toString('utf8');
        const firstNonWs = text.match(/\S/);
        return firstNonWs ? firstNonWs[0] === '[' : false;
      } finally {
        await fh.close();
      }
    } catch {
      return false;
    }
  }

  private async readFirstLineTimestamp(): Promise<string | null> {
    const filePath = this.getDataFilePath();
    if (await this.isJsonArrayFile(filePath)) {
      // JSON array mode
      try {
        const content = await fsp.readFile(filePath, 'utf8');
        const arr = JSON.parse(content);
        if (Array.isArray(arr) && arr.length > 0) {
          return arr[0]?.timestamp || null;
        }
        return null;
      } catch (e) {
        throw e;
      }
    }
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
      let acc = '';
      stream.on('data', (chunk: string) => {
        acc += chunk;
        const idx = acc.indexOf('\n');
        if (idx !== -1) {
          const line = acc.slice(0, idx).trim();
          stream.close();
          if (!line) return resolve(null);
          try {
            const parsed = JSON.parse(line);
            resolve(parsed.timestamp || null);
          } catch (e) {
            reject(e);
          }
        }
      });
      stream.on('end', () => {
        const line = acc.trim();
        if (!line) return resolve(null);
        try {
          const parsed = JSON.parse(line);
          resolve(parsed.timestamp || null);
        } catch (e) {
          reject(e);
        }
      });
      stream.on('error', reject);
    });
  }

  private async readLastLineTimestamp(): Promise<string | null> {
    const filePath = this.getDataFilePath();
    if (await this.isJsonArrayFile(filePath)) {
      try {
        const content = await fsp.readFile(filePath, 'utf8');
        const arr = JSON.parse(content);
        if (Array.isArray(arr) && arr.length > 0) {
          const last = arr[arr.length - 1];
          return last?.timestamp || null;
        }
        return null;
      } catch (e) {
        throw e;
      }
    }
    const fh = await fsp.open(filePath, 'r');
    try {
      const stat = await fh.stat();
      if (stat.size === 0) return null;
      const chunkSize = Math.min(64 * 1024, stat.size);
      const buffer = Buffer.alloc(chunkSize);
      const start = stat.size - chunkSize;
      await fh.read(buffer, 0, chunkSize, start);
      const text = buffer.toString('utf8');
      const lines = text.trimEnd().split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        const candidate = lines[i].trim();
        if (!candidate) continue;
        try {
          const parsed = JSON.parse(candidate);
          return parsed.timestamp || null;
        } catch {
          if (start > 0) {
            const newSize = Math.min(stat.size, chunkSize * 2);
            const newBuffer = Buffer.alloc(newSize);
            const newStart = stat.size - newSize;
            await fh.read(newBuffer, 0, newSize, newStart);
            const newText = newBuffer.toString('utf8');
            const newLines = newText.trimEnd().split('\n');
            for (let j = newLines.length - 1; j >= 0; j--) {
              const cand2 = newLines[j].trim();
              if (!cand2) continue;
              try {
                const parsed2 = JSON.parse(cand2);
                return parsed2.timestamp || null;
              } catch {}
            }
          }
        }
      }
      return null;
    } finally {
      await fh.close();
    }
  }

  public async getMinMaxQuick(): Promise<{ start: string; end: string }> {
    if (this.dateRangeQuickCache) return this.dateRangeQuickCache;
    const [startTs, endTs] = await Promise.all([
      this.readFirstLineTimestamp(),
      this.readLastLineTimestamp(),
    ]);
    if (!startTs || !endTs) throw new Error('No data found');
    this.dateRangeQuickCache = { start: startTs, end: endTs };
    return this.dateRangeQuickCache;
  }
  private async warmUpStats() {
    try {
      this.statsCache = await this.getStatsFromStream();
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Stats cache ready');
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Failed to preload stats:', err);
      }
    }
  }

  private async *streamPoints(): AsyncGenerator<PricePoint> {
    const filePath = this.getDataFilePath();
    if (await this.isJsonArrayFile(filePath)) {
      // Fallback: parse array in memory (sufficient for dev/test)
      const content = await fsp.readFile(filePath, 'utf8');
      const arr = JSON.parse(content);
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (item && typeof item === 'object') {
            yield item as PricePoint;
          }
        }
      }
      return;
    }
    const fileStream = fs.createReadStream(filePath, { highWaterMark: this.FILE_STREAM_CHUNK_BYTES });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (line.trim()) yield JSON.parse(line);
    }
  }

  private async buildLineIndex(): Promise<void> {
    if (this.lineIndex) return;
    const filePath = this.getDataFilePath();
    if (await this.isJsonArrayFile(filePath)) {
      // Do not build index for array mode; not used
      this.lineIndex = [];
      return;
    }
    const fd = await fsp.open(filePath, 'r');
    try {
      const CHUNK = 64 * 1024;
      const buffer = Buffer.alloc(CHUNK);
      let carry = '';
      let filePos = 0;
      let lineStartOffset = 0;
      let lineCount = 0;
      const index: Array<{ ts: number; offset: number }> = [];

      while (true) {
        const { bytesRead } = await fd.read(buffer, 0, CHUNK, filePos);
        if (bytesRead === 0) break;
        filePos += bytesRead;
        const text = carry + buffer.subarray(0, bytesRead).toString('utf8');
        let start = 0;
        while (true) {
          const nl = text.indexOf('\n', start);
          if (nl === -1) break;
          const line = text.slice(start, nl);
          const hasCR = line.endsWith('\r');
          const lineTrimmed = hasCR ? line.slice(0, -1) : line;
          const lineBytes = Buffer.byteLength(lineTrimmed, 'utf8') + (hasCR ? 2 : 1); // include CRLF or LF
          // Index every Nth line
          if (lineCount % this.INDEX_EVERY_N_LINES === 0) {
            try {
              const parsed = JSON.parse(lineTrimmed);
              const ts = Date.parse(parsed.timestamp);
              if (!isNaN(ts)) index.push({ ts, offset: lineStartOffset });
            } catch {
              // ignore malformed lines in index
            }
          }
          lineCount++;
          lineStartOffset += lineBytes;
          start = nl + 1;
        }
        carry = text.slice(start);
      }
      // Index the final line if no trailing newline
      if (carry.length > 0) {
        try {
          const finalLine = carry.endsWith('\r') ? carry.slice(0, -1) : carry;
          const ts = Date.parse(JSON.parse(finalLine).timestamp);
          if (!isNaN(ts)) index.push({ ts, offset: lineStartOffset });
        } catch {}
      }
      this.lineIndex = index;
    } finally {
      await fd.close();
    }
  }

  private findOffsetForTimestamp(targetIso: string): number {
    const target = Date.parse(targetIso);
    if (!this.lineIndex || this.lineIndex.length === 0 || isNaN(target)) return 0;
    let lo = 0, hi = this.lineIndex.length - 1, best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const { ts, offset } = this.lineIndex[mid];
      if (ts <= target) {
        best = offset;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best;
  }

  private async *streamPointsFromOffset(offset: number): AsyncGenerator<PricePoint> {
    const fileStream = fs.createReadStream(this.getDataFilePath(), { start: offset, highWaterMark: this.FILE_STREAM_CHUNK_BYTES });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
    for await (const line of rl) {
      const t = line.trim();
      if (!t) continue;
      try {
        yield JSON.parse(t);
      } catch {
        // skip malformed first partial line if offset landed mid-line
        continue;
      }
    }
  }

  

  async getMinTimestamp(): Promise<string> {
    for await (const point of this.streamPoints()) {
      return point.timestamp; // first point
    }
    throw new Error('No data found');
  }

  async getMaxTimestamp(): Promise<string> {
    let last: PricePoint | null = null;
    for await (const point of this.streamPoints()) {
      last = point;
    }
    if (!last) throw new Error('No data found');
    return last.timestamp;
  }

  async getChartData(start: string, end: string): Promise<PricePoint[]> {
    // Cache key based on requested range and resolution
    const cacheKey = `${start}|${end}|${this.MAX_CHART_POINTS}`;
    const cached = this.chartDataCache.get(cacheKey);
    if (cached) return cached;

    const startMs = Date.parse(start);
    const endMs = Date.parse(end);
    if (isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
      return [];
    }

    const targetPoints = this.MAX_CHART_POINTS;
    const spanMs = endMs - startMs;
    const bucketMs = Math.max(1, Math.floor(spanMs / targetPoints));

    // Keep first point seen per bucket (simple and fast). Optionally could implement LTTB later.
    const bucketFirst: Map<number, PricePoint> = new Map();

    for await (const point of this.streamPoints()) {
      const ts = Date.parse(point.timestamp);
      if (ts < startMs) continue;
      if (ts > endMs) break;
      const bucketIndex = Math.floor((ts - startMs) / bucketMs);
      if (!bucketFirst.has(bucketIndex)) {
        bucketFirst.set(bucketIndex, point);
      }
    }

    const result: PricePoint[] = Array.from(bucketFirst.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, p]) => p);

    this.chartDataCache.set(cacheKey, result);
    return result;
  }


  async *streamRange(start: string, end: string): AsyncGenerator<PricePoint> {
    const startMs = Date.parse(start);
    const endMs = Date.parse(end);
    let yielded = false;
    // Build index lazily on first range scan to enable seeking
    if (!this.lineIndex) {
      try { await this.buildLineIndex(); } catch {}
    }
    const startOffset = this.findOffsetForTimestamp(start);
    try {
      for await (const p of this.streamPointsFromOffset(startOffset)) {
        const ts = Date.parse(p.timestamp);
        if (!isNaN(startMs) && ts < startMs) continue;
        if (!isNaN(endMs) && ts > endMs) break;
        yielded = true;
        yield p;
      }
    } catch {
      // ignore and fallback below
    }
    // Fallback: if nothing yielded (e.g., bad offset), stream from beginning
    if (!yielded) {
      for await (const p of this.streamPoints()) {
        const ts = Date.parse(p.timestamp);
        if (!isNaN(startMs) && ts < startMs) continue;
        if (!isNaN(endMs) && ts > endMs) break;
        yield p;
      }
    }
  }

 async getStatsFromStream(): Promise<{
  totalPoints: number;
  dateRange: { start: string; end: string };
  priceRange: { min: number; max: number };
}> {
  let totalPoints = 0;
  let start = '';
  let end = '';
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  for await (const point of this.streamPoints()) {
    totalPoints++;
    if (!start) start = point.timestamp;
    end = point.timestamp;
    if (point.price < minPrice) minPrice = point.price;
    if (point.price > maxPrice) maxPrice = point.price;
  }

  if (totalPoints === 0) {
    throw new Error('No data found for stats');
  }

  return {
    totalPoints,
    dateRange: { start, end },
    priceRange: { min: minPrice, max: maxPrice },
  };
  }

  public isStatsReady(): boolean {
  return this.statsCache !== null;
}

  public getStats(): {
  totalPoints: number;
  dateRange: { start: string; end: string };
  priceRange: { min: number; max: number };
} {
  if (!this.statsCache) {
    throw new Error('Stats not ready yet');
  }
  return this.statsCache;
}
  
}