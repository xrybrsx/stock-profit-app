import { Controller, Post, Body } from '@nestjs/common';
import { ProfitDto }              from './profit.dto';
import { ProfitService }          from './profit.service';
import { ProfitResult }           from './profit.service';

@Controller('api/profit')
export class ProfitController {
  constructor(private profitService: ProfitService) {}

  @Post()
  getProfit(@Body() dto: ProfitDto): ProfitResult {
    return this.profitService.calculate(dto.startTime, dto.endTime, dto.funds);
  }
}
