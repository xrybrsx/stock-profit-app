import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import * as express from 'express';
import { PricesModule } from './prices/prices.module';
import { ProfitController } from './profit/profit.controller';
import { ProfitService } from './profit/profit.service';
import { SecurityMiddleware } from './middleware/security.middleware';
import { ConfigModule } from '@nestjs/config';
import { DataGeneratorService } from './profit/data-generator.service';
import { PricesService } from './prices/prices.service';
import { HealthController } from './health.controller';

const FRONTEND_DIST = join(__dirname, '..', 'stock-profit-frontend', 'dist');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    PricesModule,
  ],
  controllers: [ProfitController, HealthController],
  providers: [
    ProfitService,
    PricesService,
    DataGeneratorService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply security middleware to all routes
    consumer
      .apply(SecurityMiddleware)
      .forRoutes({ path: '/(.*)', method: RequestMethod.ALL });

    // Serve static assets from the built frontend
    consumer
      .apply(express.static(FRONTEND_DIST))
      .forRoutes({ path: '/(.*)', method: RequestMethod.ALL });

    // Apply SPA routing middleware (mute logs in production)
    consumer
      .apply((req, res, next) => {
        const url = req.originalUrl;

        if (url.startsWith('/api') || url.startsWith('/health')) {
          return next();
        }

        if (url.includes('.')) {
          return next();
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log('[SPA] Serving index.html for', url);
        }
        res.sendFile(join(FRONTEND_DIST, 'index.html'));
      })
      .forRoutes({ path: '/(.*)', method: RequestMethod.ALL });
  }
}
