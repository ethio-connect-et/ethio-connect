# Module Boundaries Policy

This workspace enforces architecture boundaries with `@nx/enforce-module-boundaries` in the root ESLint flat config.

## Tag families and allowed dependency directions

### `scope:*`
- `scope:central-hub` → `scope:central-hub`, `scope:shared`
- `scope:customer-portal` → `scope:customer-portal`, `scope:shared`
- `scope:vendor-portal` → `scope:vendor-portal`, `scope:shared`
- `scope:shared` → `scope:shared` only

Intent: product slices are isolated and can depend only on shared foundations.

### `domain:*`
- `domain:central-hub` → `domain:central-hub`, `domain:shared`
- `domain:customer-portal` → `domain:customer-portal`, `domain:shared`
- `domain:vendor-portal` → `domain:vendor-portal`, `domain:shared`
- `domain:shared` → `domain:shared` only

Intent: no cross-product domain coupling.

### `platform:*`
- `platform:web` → `platform:web`, `platform:cross` (never `platform:api`, `platform:e2e`)
- `platform:api` → `platform:api`, `platform:cross` (never `platform:web`, `platform:e2e`)
- `platform:cross` → `platform:cross` only
- `platform:e2e` → `platform:web`, `platform:api`, `platform:e2e`, `platform:cross` (plus same-scope constraints)

Intent: keep runtime boundaries explicit while letting tests integrate through public entry points.

### `type:*`
- `type:app` / `type:dashboard` → `type:feature`, `type:data-access`, `type:ui`, `type:util`, `type:contracts`
- `type:feature` → `type:data-access`, `type:ui`, `type:util`, `type:contracts`
- `type:data-access` → `type:util`, `type:contracts`
- `type:ui` → `type:ui`, `type:util`, `type:contracts`
- `type:util` → `type:util`, `type:contracts`
- `type:contracts` → `type:contracts`, `type:util`

Intent: enforce one-way dependencies (app → feature → data-access/util) and forbid reverse dependencies.

## Exception policy (allowlist)

Exceptions must be narrowly scoped, declared in root `eslint.config.mjs`, and include inline rationale comments.

Current vetted exceptions:
- `@ethio-connect-et/ethioconnect`: shared contracts package used across domains for compatibility.
- `@ethio-connect/ui-components`: shared primitives/UI kit consumed across domains.

Rules for new exceptions:
1. Prefer tag-based constraints first.
2. Allowlist only stable, cross-cutting primitives/contracts.
3. Document rationale inline in ESLint config and update this document.
4. Keep patterns package-specific (no broad wildcards).
