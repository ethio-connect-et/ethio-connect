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
- `docker:build`
- `nx-release-publish`

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

## Migration notes (current workspace)

Current non-conforming projects and what to fix:

1. **Deployable apps missing `docker:build`** (must add target or exemption)
   - `apps/central-hub/central-hub-api/project.json`
   - `apps/central-hub/central-hub-dashboard/project.json`
   - `apps/central-hub/public-website/project.json`
   - `apps/customer-portal/customer-portal-api/project.json`
   - `apps/customer-portal/customer-portal-dashboard/project.json`
   - `apps/vendor-portal/vendor-api-server/project.json`
   - `apps/vendor-portal/vendor-portal-dashboard/project.json`

2. **E2E apps carrying forbidden deployment target `nx-release-publish`** (remove target or add justified exception)
   - `apps/central-hub/central-hub-api-e2e/project.json`
   - `apps/central-hub/central-hub-dashboard-e2e/project.json`
   - `apps/central-hub/public-website-e2e/project.json`
   - `apps/customer-portal/customer-portal-api-e2e/project.json`
   - `apps/customer-portal/customer-portal-dashboard-e2e/project.json`
   - `apps/vendor-portal/vendor-api-server-e2e/project.json`
   - `apps/vendor-portal/vendor-portal-dashboard-e2e/project.json`

3. **Shared libs carrying forbidden deployment target `nx-release-publish`** (remove target or add justified exception)
   - `libs/api-common/project.json`
   - `libs/api-features/project.json`
   - `libs/ethioconnect/project.json`
   - `libs/frontend-features/project.json`
   - `libs/ui-components/project.json`
