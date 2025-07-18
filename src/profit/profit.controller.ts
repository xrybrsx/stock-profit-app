import { Controller, Post, Body, Get, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ProfitService, ProfitResult } from './profit.service';
import { ProfitDto }                    from './profit.dto';
import { PricesService }                from '../prices/prices.service';
import { ApiKeyGuard }                  from '../auth/api-key.guard';

@Controller('api/profit') // base path for all endpoints in this controller
@UseGuards(ApiKeyGuard) // Protect all endpoints in this controller
export class ProfitController {
  constructor(private readonly profitService: ProfitService,
  private readonly pricesService: PricesService,  // inject it 
  ){}

  // get the min and max timestamps of the price data
  @Get('minmax')
  getMinMax() {
    try {
      return {
        min: this.pricesService.getMinTimestamp(),
        max: this.pricesService.getMaxTimestamp(),
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve time range',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // get the statistics of the price data
  @Get('stats')
  getStats() {
    try {
      return this.pricesService.getStats();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // calculate the profit
  @Post()
  getProfit(@Body() dto: ProfitDto): ProfitResult {
    try {
      const { startTime, endTime, funds } = dto; // destructure the dto object
      return this.profitService.calculateProfit(
        startTime,
        endTime,
        funds,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to calculate profit',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
