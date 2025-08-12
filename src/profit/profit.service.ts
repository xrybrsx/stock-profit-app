// src/profit/profit.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PricesService } from '../prices/prices.service';
import { DataGeneratorService, PricePoint } from './data-generator.service';

export interface ProfitResult {
  buyTime:   string;
  sellTime:  string;
  buyPrice:  number;
  sellPrice: number;
  numShares: number;
  profit:    number;
  totalCost: number;
  netProfit: number;
  chartData: { timestamp: string; price: number }[];
  profitPercent: number;
  explanation: {
    // method: string;
    // timeComplexity: string;
    formula: string;
    pointsScanned: number;
  };
}

@Injectable()
export class ProfitService {
  constructor(
    private readonly pricesService: PricesService,
    private readonly dataGenerator: DataGeneratorService,
  ) {}

  // Minimum meaningful profit to return a result (in dollars)
  private readonly MIN_PROFIT_DOLLARS = 0.01;

  // Cache best buy/sell pair per [start|end]. Result is independent of funds.
  private bestPairCache: Map<string, { buy: PricePoint; sell: PricePoint }> = new Map();
  private readonly bestPairCacheLimit = 200;

  private setBestPairCache(key: string, value: { buy: PricePoint; sell: PricePoint }) {
    if (this.bestPairCache.has(key)) this.bestPairCache.delete(key);
    this.bestPairCache.set(key, value);
    if (this.bestPairCache.size > this.bestPairCacheLimit) {
      const oldestKey = this.bestPairCache.keys().next().value as string;
      this.bestPairCache.delete(oldestKey);
    }
  }

  private sanitizeInput(value: any): any {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  }

  private validateFunds(funds: number): void {
    if (funds <= 0) {
      throw new BadRequestException('Funds must be a positive number');
    }
    if (funds > 100_000_000) {
      throw new BadRequestException('Funds amount too large');
    }
  }

  private validateDateRange(startTime: string, endTime: string): void {
    const start = new Date(startTime);
    const end   = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new BadRequestException('Invalid or reversed date range');
    }
    const diffDays = (end.getTime() - start.getTime()) / 86_400_000;
    if (diffDays > 90) {
      throw new BadRequestException('Date range cannot exceed 90 days');
    }
  }

  private roundToCents(amount: number): number {
    return new Decimal(amount)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toNumber();
  }

 async calculateProfit(
  startTime: string,
  endTime:   string,
  funds:     number,
): Promise<ProfitResult> {
  const t0 = Date.now();

  // ✅ Sanitize inputs
  const sT = this.sanitizeInput(startTime);
  const eT = this.sanitizeInput(endTime);
  const F  = Number(this.sanitizeInput(funds));
  this.validateFunds(F);
  this.validateDateRange(sT, eT);

  // ✅ Stream points to find best buy/sell (single pass) and build chart data buckets
  const cacheKey = `${sT}|${eT}`;
  let bestBuySell: { buy: PricePoint; sell: PricePoint } | null = this.bestPairCache.get(cacheKey) || null;
  let minPoint: PricePoint | null = null;
  let bestProfit = 0;
  let pointsScanned = 0;

  const startMs = Date.parse(sT);
  const endMs = Date.parse(eT);
  const MAX_CHART_POINTS = 1000;
  const spanMs = Math.max(1, endMs - startMs);
  const bucketMs = Math.max(1, Math.floor(spanMs / MAX_CHART_POINTS));
  const bucketFirst: Map<number, PricePoint> = new Map();

  if (!bestBuySell) {
    for await (const pt of this.pricesService.streamRange(sT, eT)) {
      // Chart bucket sampling: keep first point in each time bucket
      const ts = Date.parse(pt.timestamp);
      const bucketIndex = Math.floor((ts - startMs) / bucketMs);
      if (!bucketFirst.has(bucketIndex)) bucketFirst.set(bucketIndex, pt);

      if (!minPoint || pt.price < minPoint.price) {
        minPoint = pt;
        continue;
      }

      const shares = F / minPoint.price;
      const profit = (pt.price - minPoint.price) * shares;

      if (profit > bestProfit) {
        bestProfit  = profit;
        bestBuySell = { buy: minPoint, sell: pt };
      }
      pointsScanned++;
    }
    if (bestBuySell) this.setBestPairCache(cacheKey, bestBuySell);
  }

  if (!bestBuySell) {
    throw new BadRequestException('No profitable trade found in the given range');
  }

  const { buy, sell } = bestBuySell;
  if (buy.price === 0) {
    throw new BadRequestException('Buy price cannot be zero');
  }

  const numShares = F / buy.price;
  const totalCost = numShares * buy.price;
  const profit    = (sell.price - buy.price) * numShares;
  // If profit is <= 0 or shares are effectively zero, treat as no-op
  if (profit <= 0 || numShares < 0.0001) {
    throw new BadRequestException('No profitable trade found in the given range');
  }
  // Enforce a minimum meaningful profit just like we enforce money precision on inputs
  if (profit < this.MIN_PROFIT_DOLLARS) {
    throw new BadRequestException('Profit below $0.01 — no meaningful trade found in the given range');
  }
  const profitPercent = Number(new Decimal(profit).div(totalCost).mul(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP));

  // ✅ Get full-range chart data (own streaming + cache handles performance)
  const chartData = await this.pricesService.getChartData(sT, eT);

  // ✅ Snap marker prices to chart for alignment
function snapToNearest(ts: string): PricePoint | undefined {
  return chartData.reduce((nearest, p) => {
    const diff = Math.abs(Date.parse(p.timestamp) - Date.parse(ts));
    const bestDiff = nearest ? Math.abs(Date.parse(nearest.timestamp) - Date.parse(ts)) : Infinity;
    return diff < bestDiff ? p : nearest;
  }, undefined as PricePoint | undefined);
}

const buySnap  = snapToNearest(buy.timestamp);
const sellSnap = snapToNearest(sell.timestamp);

const buyY     = buySnap?.price ?? this.roundToCents(buy.price);
const sellY    = sellSnap?.price ?? this.roundToCents(sell.price);

  // 🧪 Log perf
  const duration = Date.now() - t0;
  console.log(`[PROFIT] Took ${duration}ms for range ${startTime} → ${endTime}`);
  console.log('--- Profit Calculation Debug ---');
  console.log('Buy Timestamp:', buy.timestamp);
console.log('Buy Price:', buy.price);
console.log('Sell Timestamp:', sell.timestamp);
console.log('Sell Price:', sell.price);
console.log('Investment (Funds):', F);
console.log('Num Shares:', numShares.toString());
console.log('Total Cost:', totalCost.toString());
console.log('Profit:', profit.toString());


  return {
    buyTime:   buy.timestamp,
    sellTime:  sell.timestamp,
    buyPrice:  this.roundToCents(buyY),
    sellPrice: this.roundToCents(sellY),
    numShares: Number(new Decimal(numShares).toDecimalPlaces(4, Decimal.ROUND_HALF_UP)),
    profit:    this.roundToCents(profit),
    totalCost: this.roundToCents(totalCost),
    netProfit: this.roundToCents(profit),
    chartData,
    profitPercent,
    explanation: {
      // method: 'Single-pass streaming scan keeping the running minimum and best buy→sell pair',
      // timeComplexity: 'O(n) over the selected range',
      formula: 'shares = funds / buyPrice \n profit = (sellPrice - buyPrice) * shares \n profit% = profit / totalCost * 100',
      pointsScanned,
    },
  };
}
}
