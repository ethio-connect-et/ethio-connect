# Release Target Audit & Migration Notes

Date: 2026-05-07

## Scope

Workspace-wide audit of every `project.json` target definition, with emphasis on:

- `release*`
- `publish*`
- `version*`
- `tag*`
- `changelog*`
- `docker:*`
- `nx:run-commands` wrappers

## Findings (from `project.json` files)

### Pattern matches for release/version/publish/tag/changelog

No `project.json` target names matched `release*`, `publish*`, `version*`, `tag*`, or `changelog*`.

### Canonical docker/release targets (workspace via Nx plugin + target defaults)

These are the canonical targets retained for release flows:

| Target | Source | Purpose | Status |
|---|---|---|---|
| `docker:build` | `@nx/docker` plugin + `targetDefaults` | Build container images from project Dockerfiles | **Retain** |
| `docker:run` | `@nx/docker` plugin | Runtime gate/smoke execution before publish (optional by workflow input) | **Retain** |
| `nx-release-publish` | `@nx/docker` plugin + `targetDefaults` | Publish built images/artifacts in Nx release flow | **Retain** |
| `build` | project/inferred + `targetDefaults` | Build prerequisite for docker pipeline | **Retain** |

### `docker:*` targets observed in `project.json`

Only explicit `docker:*` target present in project configs is `docker:metadata` (implemented via `nx:run-commands`), used to write release image metadata/manifests after publish.

| Target | Executor | Action |
|---|---|---|
| `docker:metadata` | `nx:run-commands` | **Retain** (post-publish metadata generation) |

### `nx:run-commands` wrappers (observed)

Common wrappers found across projects:

- `typecheck`
- `deploy-metadata`
- `docker:metadata`
- API `build` wrappers in some backend services
- root `container:image-metadata`

None of these wrappers are release/version/publish/tag/changelog targets. No deprecated custom release targets remain in `project.json`.

## Target mapping table (deprecations/removals)

| Legacy / custom target family | Replacement | Decision |
|---|---|---|
| `release*` custom project targets | `pnpm exec nx release version ...` + `pnpm exec nx release changelog ...` | **Deprecated/removed (none currently present)** |
| `publish*` custom project targets | `nx-release-publish` (with `docker:build` prereq) | **Deprecated/removed (none currently present)** |
| `version*` custom project targets | `pnpm exec nx release version ...` | **Deprecated/removed (none currently present)** |
| `tag*` custom project targets | Nx release tag management (`releaseTag` in `nx.json`) | **Deprecated/removed (none currently present)** |
| `changelog*` custom project targets | `pnpm exec nx release changelog ...` | **Deprecated/removed (none currently present)** |

## Deterministic dependency chain

Required release chain:

1. `build`
2. `docker:build`
3. optional gate: `docker:run`
4. `nx-release-publish`

Enforcement now includes:

- `docker:build` depends on `build` (plus prune prerequisite).
- `nx-release-publish` depends on `docker:build`.
- `docker:run` depends on `docker:build`.

## Maintainer invocation patterns

### Standard release preparation

```bash
pnpm exec nx release version <specifier> --groups=<release_group> --yes
pnpm exec nx release changelog <resolved-version> --groups=<release_group> --yes
```

### Docker build/run/publish path

```bash
pnpm exec nx run-many -t docker:build --projects=<csv-projects>
pnpm exec nx run-many -t docker:run --projects=<csv-projects>   # optional gate
pnpm exec nx run-many -t nx-release-publish --projects=<csv-projects>
```

### Policy

- Do not introduce new project-level `release*`, `publish*`, `version*`, `tag*`, or `changelog*` targets when equivalent Nx release commands exist.
- Prefer Nx release groups and canonical docker targets above.
