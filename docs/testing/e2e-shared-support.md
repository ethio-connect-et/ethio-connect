# E2E Shared Support and Execution Guide

## Audit of repeated setup in `apps/*-e2e/**`

Common repeated blocks found across API e2e suites:

- **Startup wait logic**: each suite waited for host/port with `waitForPortOpen` and local defaults (`4000`, `4001`, `4002`).
- **Base URL wiring**: each suite configured `axios.defaults.baseURL` via `HOST`/`PORT`.
- **Teardown/port cleanup**: each suite called `killPort` with mostly identical behavior.
- **Setup/teardown logging and shared teardown message**: repeated `globalThis.__TEARDOWN_MESSAGE__` handling.

Current status after refactor:

- Startup is centralized via `bootstrapService`.
- URL wiring is centralized via `applyAxiosFixture` + `resolveServiceTarget`.
- Teardown is centralized via `teardownService`.
- Retry/backoff is scoped to startup race points only (`waitForPortOpen`).

No suite-specific seeded test data exists in current e2e suites, but seed hooks are now supported via options.

## Local and CI execution patterns

### Startup assumptions

- The target app/service is expected to be launched by Nx e2e orchestration.
- Each suite resolves service location from environment:
  - `HOST` (default: `localhost`)
  - `PORT` (default per suite)
- If `PORT` is unavailable at first probe, startup performs bounded retries with incremental delay.

### Deterministic teardown guarantees

- Teardown is centralized and deterministic: by default it attempts `killPort(target.port)` exactly once.
- Teardown message uses a known default and does not depend on per-suite mutable state.
- Teardown behavior can be overridden only with explicit options (`skipKillPort`) for controlled cases.

### Required env vars

- None required for default local runs.
- Optional overrides:
  - `HOST`
  - `PORT`

### Safe defaults and typed overrides

- `resolveServiceTarget` provides safe defaults (`localhost`, suite-specific default port, `http`).
- `bootstrapService` options allow controlled override for:
  - startup retry attempts/delay
  - seed strategy (`none | required | optional`)
  - optional seed function
- `applyAxiosFixture` supports optional auth fixture and response validation override.
