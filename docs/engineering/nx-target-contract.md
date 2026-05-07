# Nx Target Contract Policy

## Purpose

This contract keeps Nx project capabilities consistent by archetype while avoiding nonsensical deployment requirements for non-deployable projects.

## Archetypes

Archetype is inferred from `project.json`:

- **Deployable app**: `projectType: "application"` and tagged `release:docker`.
- **E2E app**: tagged `platform:e2e` or project root/name ending with `-e2e`.
- **Shared lib**: `projectType: "library"`.

## Required targets by archetype

### Deployable app

Required targets:

- `build`
- `lint`
- `test`
- `docker:build` (implemented with `@nx/docker:build`, not raw `nx:run-commands`)
- `nx-release-publish` (implemented with `@nx/docker:release-publish`)

Standard flow for deployable apps:

1. `docker:build` runs via `@nx/docker` plugin defaults from `nx.json` and depends on `build` (plus `prune` only for projects that actually define `prune`).
2. `nx-release-publish` publishes using the existing `@nx/docker` release integration.
3. `docker:metadata` generates `dist/containers/{projectName}/image.json` in a reusable post-publish step (`tools/containers/write-image-manifest.mjs`) so digest/manifest logic is not duplicated in every app target.

### Docker image tagging strategy (canonical)

This repository uses **Nx Release-managed Docker tagging**.

- `docker:build` must allow the `@nx/docker` plugin default tag behavior (do not set `skipDefaultTag: true`).
- `nx-release-publish` is responsible for publishing the release tag and must use the Nx Release-provided `${VERSION}` as the canonical image tag.
- Optional non-release convenience tags (for example CI build counters) may be added in `docker:build` args, but they cannot replace release tags and must not require a custom `IMAGE_TAG` input.

This policy applies to every deployable app that exposes both `docker:build` and `nx-release-publish`.

### E2E app

Required targets:

- `build`
- `lint`
- `test`
- `e2e`

Forbidden deployment targets by default:

- `docker:build`
- `nx-release-publish`

### Shared lib

Required targets:

- `build`

Forbidden deployment targets by default:

- `docker:build`
- `nx-release-publish`

> Note: shared libraries that are intentionally published should either move to a dedicated publishable archetype in a follow-up policy revision, or provide a documented exception (below).

## Exception process

If a project must violate this default contract, add rationale under `metadata.targetContract` in `project.json`:

```json
{
  "metadata": {
    "targetContract": {
      "requiredExemptions": {
        "docker:build": "reason a normally required target is intentionally absent"
      },
      "allowedForbiddenTargets": {
        "nx-release-publish": "reason this non-deployable project needs a deployment target"
      }
    }
  }
}
```

Rules:

- Exemption reasons must be non-empty strings.
- Use `requiredExemptions` only for missing required targets.
- Use `allowedForbiddenTargets` only when intentionally keeping a forbidden target.

## Migration notes

The workspace has standardized deployable app Docker targets around `@nx/docker` plugin-backed `docker:build` and `nx-release-publish`, with per-app metadata generation delegated to `docker:metadata`. Keep future app onboarding aligned with this pattern to satisfy `tools/ci/validate-project-targets.mjs` and avoid reintroducing raw `docker buildx` shell targets in individual `project.json` files.
