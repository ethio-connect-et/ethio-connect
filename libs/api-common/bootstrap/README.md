# Secure API bootstrap

Use `createSecureNestApp` for all Nest API entry points so platform security defaults stay consistent.

## What it configures

- Global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and `transform`.
- `helmet` middleware for common security headers.
- Explicit CORS policy with origin/method/header allowlists.
- Request body size limits for JSON and URL encoded payloads.
- Standardized exception redaction (stack traces are removed).

## Adoption pattern

```ts
import { Logger } from "@nestjs/common";
import { createSecureNestApp } from "@ethio-connect/api-common/bootstrap";
import { AppModule } from "./app/app.module";

async function bootstrap() {
  const app = await createSecureNestApp(AppModule);
  app.setGlobalPrefix("api");
  const port = process.env.PORT || 4000;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
}

bootstrap();
```

## Anti-drift rule

Do not duplicate bootstrap middleware in app-local `main.ts` files. Add any new platform-wide security behavior in `createSecureNestApp` and cover it with API e2e tests.
