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

  calculateProfit(
    startTime: string,
    endTime:   string,
    funds:     number,
  ): ProfitResult {
    // Fetch full slice of data
    const slice = this.pricesService.getRange(startTime, endTime);
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
      const numShares = funds / minPoint.price;
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

