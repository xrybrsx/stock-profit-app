import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ServeStaticModule }                   from '@nestjs/serve-static';
import { join }                                from 'path';
import { PricesModule }                        from './prices/prices.module';
import { ProfitController }                    from './profit/profit.controller';
import { ProfitService }                       from './profit/profit.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api*'],   // leave /api to your controllers
    }),
    PricesModule,
  ],
  controllers: [ProfitController],
  providers:   [ProfitService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        const url = req.originalUrl;

        // 1) Ignore API calls
        if (url.startsWith('/api')) {
          return next();
        }

        // 2) Ignore any request for a "file" (has an extension)
        //    so that .js/.css/.png etc are served normally
        if (url.includes('.') ) {
          return next();
        }

        // 3) Otherwise, serve index.html
        res.sendFile(join(__dirname, '..', 'public', 'index.html'));
      })
      .forRoutes('*');
  }
}
