import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.enableCors({ origin: true, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // يتجاهل أي حقل غير معرّف بالـ DTO بدل رفضه بصمت
      forbidNonWhitelisted: true, // يرفض الطلب صراحة لو فيه حقل غريب — أوضح للمطورين المستهلكين للـ API
      transform: true, // يحوّل query params (strings) لأنواعها الصحيحة (numbers) تلقائيًا
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`Nexora backend running on http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
