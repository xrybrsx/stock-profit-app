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
  totalCost: number;
  netProfit: number;
  chartData: { timestamp: string; price: number }[];
}

@Injectable()
export class ProfitService {
  // Transaction costs (configurable)
  private readonly TRANSACTION_FEE_PERCENT = 0.1; // 0.1% per transaction
  private readonly MIN_TRANSACTION_FEE = 1.0; // $1 minimum fee

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

  private calculateTransactionFee(amount: number): number {
    const fee = amount * (this.TRANSACTION_FEE_PERCENT / 100);
    return Math.max(fee, this.MIN_TRANSACTION_FEE);
  }

  private roundToCents(amount: number): number {
    return Math.round(amount * 100) / 100;
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

    let best = null as ProfitResult | null;

    // Realistic trading algorithm: find best buy-sell combination
    // You can only sell after you buy
    for (let buyIndex = 0; buyIndex < slice.length - 1; buyIndex++) {
      const buyPoint = slice[buyIndex];
      
      // Calculate how many shares we can buy with available funds
      const buyFee = this.calculateTransactionFee(sanitizedFunds);
      const availableForShares = sanitizedFunds - buyFee;
      const numShares = availableForShares / buyPoint.price;
      
      // Look for the best selling opportunity after buying
      for (let sellIndex = buyIndex + 1; sellIndex < slice.length; sellIndex++) {
        const sellPoint = slice[sellIndex];
        
        // Calculate gross profit from price difference
        const grossProfit = (sellPoint.price - buyPoint.price) * numShares;
        
        // Calculate transaction costs
        const sellAmount = sellPoint.price * numShares;
        const sellFee = this.calculateTransactionFee(sellAmount);
        const totalFees = buyFee + sellFee;
        
        // Calculate net profit
        const netProfit = grossProfit - totalFees;
        
        // Update best trade if this is more profitable
        if (netProfit > 0 && (!best || netProfit > best.netProfit)) {
          best = {
            buyTime:   buyPoint.timestamp,
            sellTime:  sellPoint.timestamp,
            buyPrice:  this.roundToCents(buyPoint.price),
            sellPrice: this.roundToCents(sellPoint.price),
            numShares: this.roundToCents(numShares),
            profit:    this.roundToCents(grossProfit),
            totalCost: this.roundToCents(totalFees),
            netProfit: this.roundToCents(netProfit),
            chartData: slice,
          };
        }
      }
    }

    if (!best || best.netProfit <= 0) {
      throw new BadRequestException(
        'No profitable trade found in the given range after transaction costs',
      );
    }

    return best;
  }
}

