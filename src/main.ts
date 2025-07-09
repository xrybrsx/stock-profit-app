import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();                       // allow cross-origin calls
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,                     // strip unknown fields
    transform: true,                     // auto-convert types
  }));

  await app.listen(3000);
}
bootstrap();
