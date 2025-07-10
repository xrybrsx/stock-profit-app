import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // allow CORS as before
  app.enableCors({
    origin: 'http://localhost:5173', // dev; you can widen this in prod
  });

  // Use the Azure-provided PORT or default to 3000 locally
  const portString = process.env.PORT || '3000';
  const port       = parseInt(portString, 10);
  
  await app.listen(port);
  console.log(`Application is listening on port ${port}`);
}
bootstrap();
