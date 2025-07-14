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

  // sanitize the input by trimming the string
  private sanitizeInput(value: any): any {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  }
  y
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
    const diffInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24); // convert to days
    if (diffInDays > 1) {
      throw new BadRequestException('Date range cannot exceed 1 day');
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
    const startTimeMs = Date.now();
    
    // Sanitize inputs
    const sanitizedStartTime = this.sanitizeInput(startTime);
    const sanitizedEndTime = this.sanitizeInput(endTime);
    const sanitizedFunds = Number(this.sanitizeInput(funds));

    // Validate inputs
    this.validateFunds(sanitizedFunds);
    this.validateDateRange(sanitizedStartTime, sanitizedEndTime);

    // Fetch full slice of data
    const slice = this.pricesService.getRange(sanitizedStartTime, sanitizedEndTime);
   
    // Check if the requested range is within available data
    const allData = this.pricesService.getAll();
    const minTimestamp = allData[0]?.timestamp;
    const maxTimestamp = allData[allData.length - 1]?.timestamp;
    if (sanitizedStartTime < minTimestamp || sanitizedEndTime > maxTimestamp) {
      throw new BadRequestException('Selected timeframe is outside available data range');
    }

    let best = null as ProfitResult | null;
    let calculations = 0;

    // Optimized algorithm with early termination
    for (let buyIndex = 0; buyIndex < slice.length - 1; buyIndex++) {
      const buyPoint = slice[buyIndex];
      
      // Calculate how many shares we can buy with available funds
      const buyFee = this.calculateTransactionFee(sanitizedFunds);
      const availableForShares = sanitizedFunds - buyFee;
      const numShares = availableForShares / buyPoint.price;
      
      // Early termination: if we can't buy any shares, skip
      if (numShares <= 0) continue;
      
      // Find the maximum possible profit for this buy point
      let maxPriceAfterBuy = buyPoint.price;
      for (let i = buyIndex + 1; i < slice.length; i++) {
        if (slice[i].price > maxPriceAfterBuy) {
          maxPriceAfterBuy = slice[i].price;
        }
      }
      
      // Calculate potential maximum profit
      const potentialProfit = (maxPriceAfterBuy - buyPoint.price) * numShares;
      const potentialFees = buyFee + this.calculateTransactionFee(maxPriceAfterBuy * numShares);
      const potentialNetProfit = potentialProfit - potentialFees;
      
      // Early termination: if this buy point can't beat current best, skip
      if (best && potentialNetProfit <= best.netProfit) continue;
      
      // Look for the best selling opportunity after buying
      for (let sellIndex = buyIndex + 1; sellIndex < slice.length; sellIndex++) {
        calculations++;
        const sellPoint = slice[sellIndex];
        
        // Calculate gross profit from price difference
        const grossProfit = (sellPoint.price - buyPoint.price) * numShares;
        
        // Early termination: if gross profit is negative, skip
        if (grossProfit <= 0) continue;
        
        // Calculate transaction costs
        const sellAmount = sellPoint.price * numShares;
        const sellFee = this.calculateTransactionFee(sellAmount);
        const totalFees = buyFee + sellFee;
        
        // Calculate net profit
        const netProfit = grossProfit - totalFees;
        
        // Update best trade if this is more profitable
        if (netProfit > 0) {
          if (
            !best ||
            netProfit > best.netProfit ||
            (
              netProfit === best.netProfit &&
              (
                // Prefer shorter interval
                (Date.parse(sellPoint.timestamp) - Date.parse(buyPoint.timestamp)) <
                (Date.parse(best.sellTime) - Date.parse(best.buyTime))
              ) ||
              (
                // If interval is also equal, prefer earlier buy time
                (Date.parse(sellPoint.timestamp) - Date.parse(buyPoint.timestamp)) ===
                (Date.parse(best.sellTime) - Date.parse(best.buyTime)) &&
                Date.parse(buyPoint.timestamp) < Date.parse(best.buyTime)
              )
            )
          ) {
            best = {
              buyTime:   buyPoint.timestamp,
              sellTime:  sellPoint.timestamp,
              buyPrice:  this.roundToCents(buyPoint.price),
              sellPrice: this.roundToCents(sellPoint.price),
              numShares: this.roundToCents(numShares),
              profit:    this.roundToCents(grossProfit),
              totalCost: this.roundToCents(totalFees),
              netProfit: this.roundToCents(netProfit),
              chartData: this.pricesService.getChartData(sanitizedStartTime, sanitizedEndTime),
            };
          }
        }
      }
    }

    if (!best || best.netProfit <= 0) {
      throw new BadRequestException(
        'No profitable trade found in the given range after transaction costs',
      );
    }

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const executionTime = Date.now() - startTimeMs;
      console.log(`Profit calculation: ${calculations} calculations in ${executionTime}ms for ${slice.length} data points`);
    }

    return best;
  }
}

