# Frontend Performance and Generated Typings Policy

## Frontend bundle budgets

The following Next.js applications are budget-enforced in CI:

- `@ethio-connect/customer-portal-dashboard`
- `@ethio-connect/vendor-portal-dashboard`
- `@ethio-connect/central-hub-dashboard`
- `@ethio-connect/public-website`

Budget source of truth: `tools/ci/frontend-performance-thresholds.json`.

Each app defines the following threshold metrics:

- `initialJsBytes`: JS bytes required for shared/initial page delivery (`/_app` + `/` chunks).
- `initialCssBytes`: CSS bytes required for shared/initial page delivery.
- `maxRouteChunkBytes`: upper bound for any non-shared route JS chunk.
- `totalJsBytes`: total JS bytes referenced by page chunk manifests.

CI enforcement command:

```bash
node tools/ci/check-frontend-performance.mjs
```

The quality workflow builds the four apps and fails the pipeline when a metric exceeds its threshold.

## Safe baseline/threshold updates

1. Build the targeted app(s) in production mode:
   - `pnpm exec nx run-many -t build -p <projects> --configuration=production`
2. Run the budget checker locally:
   - `node tools/ci/check-frontend-performance.mjs`
3. If you intentionally changed frontend payload size (new route/features/dependencies), update only the relevant app's thresholds in `tools/ci/frontend-performance-thresholds.json`.
4. In the PR description, justify the increase (feature rationale and expected user impact).
5. Keep changes minimal: avoid raising unrelated metrics.

## Generated typings policy

- `index.d.ts` files in frontend app roots are treated as generated declarations.
- Generated declaration files must include:
  - generator origin comment,
  - explicit `DO NOT EDIT` notice.
- Prefer concrete types over `any` in generated declarations when feasible.

## Allowed lint exceptions

- Lint exceptions for declaration artifacts are allowed only for generated output directories (for example, `dist/**` and `.next/types/**`).
- Broad inline disables in authored source trees (such as app-root `index.d.ts` files) are not allowed.
- If an exception is unavoidable, scope it narrowly to generated output paths in ESLint config.
