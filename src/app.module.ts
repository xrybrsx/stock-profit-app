import { Module }           from '@nestjs/common';
import { PricesModule }     from './prices/prices.module';
import { ProfitController } from './profit/profit.controller';
import { ProfitService }    from './profit/profit.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join }              from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    PricesModule,
  ],
  controllers: [ProfitController],
  providers:    [ProfitService],
})
export class AppModule {}
