// src/profit/profit.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ProfitDto } from './profit.dto';
import { ProfitService, ProfitResult } from './profit.service';
import { PricesService } from '../prices/prices.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('api/profit')
@UseGuards(ApiKeyGuard)
export class ProfitController {
  constructor(
    private readonly profitService: ProfitService,
    private readonly pricesService: PricesService,
  ) {}

  @Post()
  async getProfit(@Body() dto: ProfitDto): Promise<ProfitResult> {
    try {
      return await this.profitService.calculateProfit(
        dto.startTime,
        dto.endTime,
        dto.funds,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to calculate profit',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats-ready')
  isStatsReady(): { ready: boolean } {
    return { ready: this.pricesService.isStatsReady() };
  }

  @Get('minmax')
  async getMinMax(): Promise<{ min: string; max: string }> {
    try {
      // Fast path: read only first and last entries from the data file
      const quick = await this.pricesService.getMinMaxQuick();
      return { min: quick.start, max: quick.end };
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(err);
      }
      throw new HttpException(
        'Failed to retrieve time range',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
