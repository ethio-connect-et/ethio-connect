# Architecture & Module Boundary Model

This workspace enforces dependency boundaries with `@nx/enforce-module-boundaries` in `eslint.config.mjs`.

## Source of truth for tags

Project tags are defined in:

- `apps/*/project.json`
- `libs/*/project.json`

The current taxonomy is:

- `scope:*` — vertical ownership boundary (`central-hub`, `customer-portal`, `vendor-portal`, `shared`)
- `domain:*` — business domain boundary (`central-hub`, `customer-portal`, `vendor-portal`, `shared`)
- `platform:*` — runtime boundary (`web`, `api`, `cross`, `e2e`)
- `type:*` — architectural layer (`app`, `api`, `dashboard`, `feature`, `ui`, `util`)

## Boundary rules

### Platform boundaries

- `platform:web` projects **cannot** depend on `platform:api` projects.
- `platform:web` may depend only on `platform:web`, `platform:cross`, and `scope:shared`.
- `platform:api` may depend only on `platform:api`, `platform:cross`, and `scope:shared`.
- `platform:cross` may depend only on `platform:cross` and `scope:shared`.

### Domain boundaries

- `domain:central-hub` may depend only on `domain:central-hub` and `scope:shared`.
- `domain:customer-portal` may depend only on `domain:customer-portal` and `scope:shared`.
- `domain:vendor-portal` may depend only on `domain:vendor-portal` and `scope:shared`.
- `domain:shared` may depend only on `domain:shared` and `scope:shared`.

This ensures cross-domain imports route through shared libraries tagged `scope:shared`.

### Scope boundaries

- `scope:central-hub` may depend only on `scope:central-hub` and `scope:shared`.
- `scope:customer-portal` may depend only on `scope:customer-portal` and `scope:shared`.
- `scope:vendor-portal` may depend only on `scope:vendor-portal` and `scope:shared`.
- `scope:shared` may depend only on `scope:shared`.

### E2E boundaries

`platform:e2e` projects are restricted to their own scope and app/api targets:

- `platform:e2e` + `scope:central-hub` may depend only on `scope:central-hub` projects tagged `type:app` or `type:api`.
- `platform:e2e` + `scope:customer-portal` may depend only on `scope:customer-portal` projects tagged `type:app` or `type:api`.
- `platform:e2e` + `scope:vendor-portal` may depend only on `scope:vendor-portal` projects tagged `type:app` or `type:api`.

### Type boundaries

Layering constraints are enforced with `type:*` tags:

- `type:app` → `feature`, `ui`, `util`, `data-access`, shared
- `type:dashboard` → `feature`, `ui`, `util`, shared
- `type:feature` → `feature`, `ui`, `util`, `data-access`, shared
- `type:api` → `feature`, `data-access`, `util`, shared
- `type:ui` → `ui`, `util`, shared
- `type:util` → `util`, shared

## CI enforcement

Violations are surfaced by ESLint via Nx lint targets and fail CI when running:

```bash
pnpm nx affected -t lint
```

Any boundary violation fails the affected lint task and therefore fails the CI run.
