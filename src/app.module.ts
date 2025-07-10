import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import * as express from 'express';
import { PricesModule } from './prices/prices.module';
import { ProfitController } from './profit/profit.controller';
import { ProfitService }    from './profit/profit.service';

@Module({
  imports: [
    // Serve static assets from /public
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api*'],
    }),
    PricesModule,
  ],
  controllers: [ProfitController],
  providers:   [ProfitService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Any non-API route, serve index.html
    consumer
      .apply((_req, res, next) => {
        if (!_req.originalUrl.startsWith('/api')) {
          res.sendFile(join(__dirname, '..', 'public', 'index.html'));
        } else {
          next();
        }
      })
      .forRoutes('*');
  }
}