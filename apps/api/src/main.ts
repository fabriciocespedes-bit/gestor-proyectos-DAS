import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta props no declaradas en los DTO
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Las rutas ya incluyen el prefijo /v1 en sus controllers.
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`ProjectOS API escuchando en http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
