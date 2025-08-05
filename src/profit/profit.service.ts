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
}

@Injectable()
export class ProfitService {
  constructor(
    private readonly pricesService: PricesService,
    private readonly dataGenerator: DataGeneratorService,
  ) {}

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

  /**
   * One-pass, streaming profit calculation over ~7.8M points.
   */
  async calculateProfit(
    startTime: string,
    endTime:   string,
    funds:     number,
  ): Promise<ProfitResult> {
    const t0 = Date.now();

    // sanitize & validate
    const sT = this.sanitizeInput(startTime);
    const eT = this.sanitizeInput(endTime);
    const F  = Number(this.sanitizeInput(funds));
    this.validateFunds(F);
    this.validateDateRange(sT, eT);

    // stream data one second apart, O(n) memory
    let minPoint: PricePoint | null = null;
    let bestBuySell: { buy: PricePoint; sell: PricePoint } | null = null;
    let bestProfit = 0;

    const stream = this.dataGenerator.generatePriceStream(sT, eT);
    for await (const pt of stream) {
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
    }

    if (!bestBuySell || bestProfit <= 0) {
      throw new BadRequestException('No profitable trade found in the given range');
    }

    const { buy, sell } = bestBuySell;

    if (buy.price === 0) {
      throw new BadRequestException('Buy price cannot be zero');
    }

    // Use Decimal for precise financial math
    const numShares = new Decimal(F).div(buy.price);
    const totalCost = numShares.mul(buy.price);
    const profit    = numShares.mul(new Decimal(sell.price).minus(buy.price));

    // <-- await here so chartData is PricePoint[], not Promise<PricePoint[]>
    const chartData = await this.pricesService.getChartData(sT, eT);

    // log perf in dev
    if (process.env.NODE_ENV === 'development') {
      console.log(`Profit scan in ${Date.now() - t0}ms over stream`);
    }

    return {
      buyTime:   buy.timestamp,
      sellTime:  sell.timestamp,
      buyPrice:  this.roundToCents(buy.price),
      sellPrice: this.roundToCents(sell.price),
      numShares: this.roundToCents(numShares.toNumber()),
      profit:    this.roundToCents(profit.toNumber()),
      totalCost: this.roundToCents(totalCost.toNumber()),
      netProfit: this.roundToCents(profit.toNumber()),
      chartData,  // now correctly typed as array
    };
  }
}
