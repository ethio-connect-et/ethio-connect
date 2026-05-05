# Workflow Integration Contract

Contract marker: `testing|staging|main -> testing|staging|production`

## Branch and Registry Mapping

| Source branch | Manifest branch | Expected immutable image reference |
|---|---|---|
| `testing` | `testing` | `ghcr.io/ethio-connect-et/<app>@sha256:<64hex>` |
| `staging` | `staging` | `ghcr.io/ethio-connect-et/<app>@sha256:<64hex>` |
| `main` | `production` | `ghcr.io/ethio-connect-et/<app>@sha256:<64hex>` |

## Dispatch Event Schema

Repository target: `ethio-connect-et/ethio-connect-manifest`.

Event type: `promote-image`

```json
{
  "event_type": "promote-image",
  "client_payload": {
    "app": "<app-name>",
    "digest": "sha256:<64hex>",
    "env": "testing|staging|production"
  }
}
```

Validation requirements:
- source env allowlist: `testing|staging|main`
- manifest env allowlist: `testing|staging|production`
- app allowlist from `pnpm nx show projects --withTarget docker:build --json`
- digest pattern: `sha256:<64hex>`
