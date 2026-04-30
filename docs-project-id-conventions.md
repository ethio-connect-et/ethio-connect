# Project ID Naming Convention

## Apps

Use `@ethio-connect/<domain>-<capability>-<suffix>`.

- `domain`: `central-hub`, `customer-portal`, `vendor-portal`
- `capability`: functional area (for example `dashboard`, `public-dashboard`, `api`)
- `suffix`:
  - `dashboard` for Next.js/web frontends
  - `api` (or `api-server` when needed) for backend services
  - `e2e` for end-to-end test applications

### Examples

- `@ethio-connect/central-hub-dashboard`
- `@ethio-connect/central-hub-public-dashboard`
- `@ethio-connect/customer-portal-api`
- `@ethio-connect/vendor-portal-dashboard-e2e`

## Libs

Use `@ethio-connect/<domain-or-shared>-<layer-or-feature>`.

Examples:

- `@ethio-connect/api-common`
- `@ethio-connect/frontend-features`
- `@ethio-connect/ui-components`

## Target Baseline (Applications)

Every app project must expose:

- `lint`
- `test`
- `build`
- `e2e` (for e2e projects)
- `container` (non-e2e deployable apps)
- `container-push` (non-e2e deployable apps)
- `deploy-metadata`

This baseline enables consistent CI orchestration across all app types.
