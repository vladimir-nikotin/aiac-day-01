import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CliService } from './cli.service';

async function bootstrap() {
  // const app = await NestFactory.createApplicationContext(AppModule);
  const app = await NestFactory.create(AppModule);

  // if cli
  const svc = app.get(CliService);
  await svc.run();
  await app.close();

  // if web
  // await app.listen(process.env.PORT ?? 3000);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
