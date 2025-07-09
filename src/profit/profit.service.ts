import { Injectable, BadRequestException } from '@nestjs/common';
import { PricesService } from '../prices/prices.service';

export interface ProfitResult {
  buyTime:   string;
  sellTime:  string;
  buyPrice:  number;
  sellPrice: number;
  numShares: number;
  profit:    number;
}

@Injectable()
export class ProfitService {
  constructor(private prices: PricesService) {}

  calculate(start: string, end: string, funds: number): ProfitResult {
    const points = this.prices.getRange(start, end);
    if (points.length < 2) {
      throw new BadRequestException('Range too small');
    }

    // Initialize with the first point
    let minPoint = points[0];
    let best: ProfitResult | null = null;

    for (let i = 1; i < points.length; i++) {
      const now = points[i];
      const shares = funds / minPoint.price;
      const profit = (now.price - minPoint.price) * shares;

      // If this trade is better, record it
      if (!best || profit > best.profit) {
        best = {
          buyTime:   minPoint.timestamp,
          sellTime:  now.timestamp,
          buyPrice:  minPoint.price,
          sellPrice: now.price,
          numShares: parseFloat(shares.toFixed(4)),
          profit:    parseFloat(profit.toFixed(2)),
        };
      }

      // Update lowest buy price so far
      if (now.price < minPoint.price) {
        minPoint = now;
      }
    }

    if (!best || best.profit <= 0) {
      throw new BadRequestException('No profitable trade found in the given range');
    }

    return best;
  }
}
