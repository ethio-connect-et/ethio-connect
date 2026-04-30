# Module boundary rules

This workspace enforces dependency boundaries with `@nx/enforce-module-boundaries` in the root `eslint.config.mjs`.

## Required relations

- `platform:e2e` projects may depend only on:
  - matching application projects (`type:app`), and
  - shared libraries (`scope:shared`).
- `platform:web` code must not depend on `platform:api` libraries.
- Domain-isolated code (`domain:central-hub`, `domain:customer-portal`, `domain:vendor-portal`) may only depend on:
  - libraries in the same domain, and
  - `domain:shared` libraries.

These constraints are additive with existing scope/type constraints.

## Negative lint fixture

Use this fixture to verify that illegal imports are rejected:

- File: `libs/frontend-features/src/lint-fixtures/illegal-web-to-api-import.ts`
- Why invalid: it imports `@ethio-connect/api-features` (tagged `platform:api`) from a file linted with `platform:web` source tags.

Run:

```bash
pnpm exec eslint --no-ignore libs/frontend-features/src/lint-fixtures/illegal-web-to-api-import.ts
```

Expected result: lint fails with `@nx/enforce-module-boundaries`.

## Guidance for generators

When adding new apps/libs and tags:

1. Assign `platform:*` tags (`web`, `api`, or `e2e`) correctly.
2. Assign one `domain:*` tag for domain-owned projects (`central-hub`, `customer-portal`, `vendor-portal`) or `domain:shared`.
3. Keep imports within allowed domain/platform constraints.
4. If a cross-domain dependency is needed, add an explicit `depConstraints` exception with rationale in `eslint.config.mjs` and update this document.
