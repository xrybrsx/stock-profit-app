import { Module } from '@nestjs/common';
import { PricesService } from './prices.service';

@Module({
  providers: [PricesService],   // make PricesService available in this module
  exports:    [PricesService],   // allow other modules to inject it
})
export class PricesModule {}
