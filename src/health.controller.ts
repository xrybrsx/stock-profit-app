import { Controller, Get } from '@nestjs/common';
import { PricesService } from './prices/prices.service';

@Controller('health')
export class HealthController {
  constructor(private readonly pricesService: PricesService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      statsReady: this.pricesService.isStatsReady(),
    };
  }
}


