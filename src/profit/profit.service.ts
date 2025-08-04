// src/profit/profit.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PricesService } from '../prices/prices.service';

export interface ProfitResult {
  buyTime:   string;
  sellTime:  string;
  buyPrice:  number;
  sellPrice: number;
  numShares: number;
  profit:    number;
  totalCost: number;    // now simply equal to total spent (no fees)
  netProfit: number;    // identical to profit
  chartData: { timestamp: string; price: number }[];
}

@Injectable()
export class ProfitService {
  constructor(private readonly pricesService: PricesService) {}

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
    if (funds > 100000000) {
      throw new BadRequestException('Funds amount too large');
    }
  }

  private validateDateRange(startTime: string, endTime: string): void {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new BadRequestException('Invalid or reversed date range');
    }
    const diffDays = (end.getTime() - start.getTime()) / 86400000;
    if (diffDays > 90) {
      throw new BadRequestException('Date range cannot exceed 90 days');
    }
  }

  private roundToCents(amount: number): number {
    return new Decimal(amount)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toNumber();
  }

  calculateProfit(
    startTime: string,
    endTime:   string,
    funds:     number,
  ): ProfitResult {
    const t0 = Date.now();

    // sanitize & validate
    const sT = this.sanitizeInput(startTime);
    const eT = this.sanitizeInput(endTime);
    const F  = Number(this.sanitizeInput(funds));
    this.validateFunds(F);
    this.validateDateRange(sT, eT);

    // fetch data
    const slice = this.pricesService.getRange(sT, eT);
    if (slice.length < 2) {
      throw new BadRequestException('Not enough data points for profit calculation');
    }

    // one-pass max-profit scan
    let minPricePoint    = slice[0];
    let bestProfit       = 0;
    let bestBuyPoint     = slice[0];
    let bestSellPoint    = slice[1];

    for (let i = 1; i < slice.length; i++) {
      const pt = slice[i];

      // compute potential profit if sold here
      const shares    = F / minPricePoint.price;
      const grossProf = (pt.price - minPricePoint.price) * shares;
      if (grossProf > bestProfit) {
        bestProfit    = grossProf;
        bestBuyPoint  = minPricePoint;
        bestSellPoint = pt;
      }

      // update minimum‐seen price
      if (pt.price < minPricePoint.price) {
        minPricePoint = pt;
      }
    }

    if (bestProfit <= 0) {
      throw new BadRequestException('No profitable trade found in the given range');
    }

    const numShares   = F / bestBuyPoint.price;
    const totalCost   = bestBuyPoint.price * numShares;
    const profit      = bestProfit;
    const netProfit   = profit; 
    const chartData   = this.pricesService.getChartData(sT, eT);

    // log perf in dev
    if (process.env.NODE_ENV === 'development') {
      console.log(`Profit scan in ${Date.now() - t0}ms over ${slice.length} points`);
    }

    return {
      buyTime:   bestBuyPoint.timestamp,
      sellTime:  bestSellPoint.timestamp,
      buyPrice:  this.roundToCents(bestBuyPoint.price),
      sellPrice: this.roundToCents(bestSellPoint.price),
      numShares: this.roundToCents(numShares),
      profit:    this.roundToCents(profit),
      totalCost: this.roundToCents(totalCost),
      netProfit: this.roundToCents(netProfit),
      chartData,
    };
  }
}
