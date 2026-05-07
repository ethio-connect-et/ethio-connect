import { ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { BaseExceptionFilter } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";

const ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"];
const ALLOWED_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const ALLOWED_HEADERS = ["Content-Type", "Authorization", "X-Request-Id"];
const BODY_SIZE_LIMIT = "1mb";

class RedactingExceptionFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: Parameters<BaseExceptionFilter["catch"]>[1]) {
    if (exception instanceof Error) {
      exception.stack = undefined;
    }
    super.catch(exception, host);
  }
}

export async function createSecureNestApp<T>(rootModule: T): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(rootModule as never);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(helmet());

  app.enableCors({
    origin: ALLOWED_ORIGINS,
    methods: ALLOWED_METHODS,
    allowedHeaders: ALLOWED_HEADERS,
    credentials: false,
  });

  app.useBodyParser("json", { limit: BODY_SIZE_LIMIT });
  app.useBodyParser("urlencoded", { limit: BODY_SIZE_LIMIT, extended: true });

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new RedactingExceptionFilter(httpAdapterHost.httpAdapter));

  return app;
}

export const secureAppConfig = {
  allowedOrigins: ALLOWED_ORIGINS,
  allowedMethods: ALLOWED_METHODS,
  allowedHeaders: ALLOWED_HEADERS,
  bodySizeLimit: BODY_SIZE_LIMIT,
};
