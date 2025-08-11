import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure CORS based on environment
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL] // Production origins
    : ['http://localhost:5173', 'http://localhost:3000']; // Development origins

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Basic startup/environment logs
  console.log('[BOOT] Starting backend service');
  console.log('[BOOT] NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('[BOOT] Allowed CORS origins:', allowedOrigins);
  if (process.env.FRONTEND_URL) {
    console.log('[BOOT] FRONTEND_URL set to:', process.env.FRONTEND_URL);
  }

  // Global validation pipe with proper error handling
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw errors if non-whitelisted values are provided
      transform: true, // Transform payloads to be objects typed according to their DTO classes
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        );
        return new BadRequestException(messages.join('; '));
      },
    }),
  );

  // Disable ETag and prevent caching of API responses
  const expressApp: any = app.getHttpAdapter().getInstance();
  expressApp.disable('etag');
  
  // Simple request logging for API routes
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    const { method } = req;
    const url = req.originalUrl || req.url;
    if (url && url.startsWith('/api')) {
      const ip = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress;
      const host = req.headers.host;
      const origin = req.headers.origin;
      const referer = req.headers.referer;
      const userAgent = req.headers['user-agent'];
      res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(
          `[API] ${method} ${url} -> ${res.statusCode} ${ms}ms | ip=${ip} host=${host} origin=${origin} referer=${referer} ua=${userAgent}`
        );
      });
    }
    next();
  });
  app.use((req: any, res: any, next: any) => {
    if (req.originalUrl && req.originalUrl.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  // Use the Azure-provided PORT or default to 3000 locally
  const portString = process.env.PORT || '3000';
  const port       = parseInt(portString, 10);
  
  await app.listen(port, '0.0.0.0');
  console.log(`[BOOT] Application is listening on port ${port}`);
}
bootstrap();
