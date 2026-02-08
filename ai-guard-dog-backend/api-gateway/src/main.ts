/**
 * AI Guard DAO - API Gateway Entry Point
 * 
 * NestJS application bootstrap
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { AppConfig } from './config/app.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Get config
  const configService = app.get(ConfigService<AppConfig>);
  const port = configService.get('port', { infer: true }) || 3001;
  const nodeEnv = configService.get('nodeEnv', { infer: true }) || 'development';

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: nodeEnv === 'production' 
      ? ['https://ai-guard-dao.xyz'] 
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(port);

  logger.log(`🚀 AI Guard DAO API Gateway running on port ${port}`);
  logger.log(`📍 Environment: ${nodeEnv}`);
  logger.log(`📍 Health check: http://localhost:${port}/api/v1/health`);
  logger.log(`📍 Auth endpoints:`);
  logger.log(`   POST /api/v1/auth/nonce`);
  logger.log(`   POST /api/v1/auth/verify`);
  logger.log(`   GET  /api/v1/auth/session`);
  logger.log(`   POST /api/v1/auth/logout`);
}

bootstrap();
