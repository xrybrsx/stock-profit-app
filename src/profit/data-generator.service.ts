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
    drift = 0.0000002,        // small positive drift per tick
    volatility = 0.0005,     // per‐tick volatility
  ): AsyncGenerator<PricePoint> {
    const start = new Date(startTime).getTime();
    const end   = new Date(endTime).getTime();
    const totalSeconds = Math.floor((end - start) / 1000);
    let currentPrice = new Decimal(startPrice);

    for (let i = 0; i <= totalSeconds; i++) {
      const t = start + i * 1000;
      // geometric Brownian increment: ΔS = S*(μΔt + σ√Δt·ε)
      const ε = this.randNormal();
      const factor = new Decimal(drift)
        .plus(new Decimal(volatility).times(ε))
        .plus(1);
      currentPrice = currentPrice.mul(factor);

      yield {
        timestamp: new Date(t).toISOString(),
        price: Number(currentPrice.toDecimalPlaces(4)),  // high precision
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
