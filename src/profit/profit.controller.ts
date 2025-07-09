import { Controller, Post, Body, Get } from '@nestjs/common';
import { ProfitService, ProfitResult } from './profit.service';
import { ProfitDto }                    from './profit.dto';
import { PricesService }                from '../prices/prices.service';

@Controller('api/profit')
export class ProfitController {
  constructor(private readonly profitService: ProfitService,
  private readonly pricesService: PricesService,  // inject it 
  ){}

  @Get('minmax')
  getMinMax() {
    return {
      min: this.pricesService.getMinTimestamp(),
      max: this.pricesService.getMaxTimestamp(),
    };
  }

  @Post()
  getProfit(@Body() dto: ProfitDto): ProfitResult {
    const { startTime, endTime, funds } = dto;
    return this.profitService.calculateProfit(
      startTime,
      endTime,
      funds,
    );
  }
}
