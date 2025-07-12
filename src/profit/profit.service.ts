// src/profit/profit.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PricesService } from '../prices/prices.service';

export interface ProfitResult {
  buyTime:   string;
  sellTime:  string;
  buyPrice:  number;
  sellPrice: number;
  numShares: number;
  profit:    number;
  chartData: { timestamp: string; price: number }[]; // added chartData
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
    if (funds > 1000000) { // Reasonable upper limit
      throw new BadRequestException('Funds amount too large');
    }
  }

  private validateDateRange(startTime: string, endTime: string): void {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    
    if (start >= end) {
      throw new BadRequestException('Start time must be before end time');
    }
    
    // Prevent requests for very large date ranges
    const diffInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffInDays > 30) {
      throw new BadRequestException('Date range cannot exceed 30 days');
    }
  }

  calculateProfit(
    startTime: string,
    endTime:   string,
    funds:     number,
  ): ProfitResult {
    // Sanitize inputs
    const sanitizedStartTime = this.sanitizeInput(startTime);
    const sanitizedEndTime = this.sanitizeInput(endTime);
    const sanitizedFunds = Number(this.sanitizeInput(funds));

    // Validate inputs
    this.validateFunds(sanitizedFunds);
    this.validateDateRange(sanitizedStartTime, sanitizedEndTime);

    // Fetch full slice of data
    const slice = this.pricesService.getRange(sanitizedStartTime, sanitizedEndTime);
    if (slice.length < 2) {
      throw new BadRequestException(
        'Not enough data points in the given range',
      );
    }

    let minPoint = slice[0];
    let best = null as ProfitResult | null;

    // Single-pass O(n) scan
    for (let i = 1; i < slice.length; i++) {
      const current = slice[i];
      const numShares = sanitizedFunds / minPoint.price;
      const profit    = (current.price - minPoint.price) * numShares;

      if (!best || profit > best.profit) {
        best = {
          buyTime:   minPoint.timestamp,
          sellTime:  current.timestamp,
          buyPrice:  minPoint.price,
          sellPrice: current.price,
          numShares: parseFloat(numShares.toFixed(4)),
          profit:    parseFloat(profit.toFixed(2)),
          chartData: slice, // attach the entire time series slice
        };
      }

      if (current.price < minPoint.price) {
        minPoint = current;
      }
    }

    if (!best || best.profit <= 0) {
      throw new BadRequestException(
        'No profitable trade found in the given range',
      );
    }

    // Return the best trade + the original slice for charting
    return best;
  }
}

