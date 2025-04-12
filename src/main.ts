import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const logger = new Logger('NestApplication');
  const configService = app.get(ConfigService);
  const APP_PORT = configService.getOrThrow<number>('APP_PORT', {
    infer: true,
  });

  app.use(helmet());
  app.use(compression());

  await app.listen(APP_PORT, () => logger.log(`Running on port ${APP_PORT}`));
}
bootstrap();
