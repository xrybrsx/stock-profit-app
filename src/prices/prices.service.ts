// src/prices/prices.service.ts
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export interface PricePoint {
  timestamp: string;
  price: number;
}

@Injectable()
export class PricesService {
  private readonly filePath = path.resolve(process.cwd(), 'dist/data/3mo-prices.ndjson');
  private readonly MAX_CHART_POINTS = 1000;

  async onModuleInit() {
  this.warmUpStats(); // don't await — run in background
}

  private statsCache: {
  totalPoints: number;
  dateRange: { start: string; end: string };
  priceRange: { min: number; max: number };
} | null = null;

  private async warmUpStats() {
  try {
    this.statsCache = await this.getStatsFromStream();
    console.log('✅ Stats cache ready');
  } catch (err) {
    console.error('❌ Failed to preload stats:', err);
  }
}

  private async *streamPoints(): AsyncGenerator<PricePoint> {
    const fileStream = fs.createReadStream(this.filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (line.trim()) yield JSON.parse(line);
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
    const result: PricePoint[] = [];
    const pointsInRange: PricePoint[] = [];

    for await (const point of this.streamPoints()) {
      if (point.timestamp >= start && point.timestamp <= end) {
        pointsInRange.push(point);
      }
    }

    const step = Math.max(1, Math.floor(pointsInRange.length / this.MAX_CHART_POINTS));
    for (let i = 0; i < pointsInRange.length; i += step) {
      result.push(pointsInRange[i]);
    }

    return result;
  }


  async *streamRange(start: string, end: string): AsyncGenerator<PricePoint> {
  for await (const p of this.streamPoints()) {
    if (p.timestamp >= start && p.timestamp <= end) yield p;
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