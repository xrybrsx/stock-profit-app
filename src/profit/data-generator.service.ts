// src/profit/data-generator.service.ts
import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

export interface PricePoint {
  timestamp: string;  // ISO string
  price: number;
}

@Injectable()
export class DataGeneratorService {
  /**
   * Simulate a geometric‐Brownian‐motion price path,
   * one point per second between start and end.
   */
async *generatePriceStream(
  startTime: string,
  endTime: string,
  startPrice = 100,
  drift = 0.0000002,
  volatility = 0.0005,
): AsyncGenerator<PricePoint> {
  const start = new Date(startTime).getTime();
  const end   = new Date(endTime).getTime();
  const totalSeconds = Math.floor((end - start) / 1000);
  let price = startPrice;

  for (let i = 0; i <= totalSeconds; i++) {
    const ε = this.randNormal();
    const change = price * (drift + volatility * ε);
    price += change;

    yield {
      timestamp: new Date(start + i * 1000).toISOString(),
      price: Math.round(price * 10000) / 10000  // no Decimal
    };
  }
}


  /** Box-Muller transform for standard normal draws */
  private randNormal(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}
