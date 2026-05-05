# Workflow Integration Contract

Contract marker: `testing|staging|main -> testing|staging|production`

## Branch and Registry Mapping

| Source branch | Manifest branch | Expected immutable image reference              |
| ------------- | --------------- | ----------------------------------------------- |
| `testing`     | `testing`       | `ghcr.io/ethio-connect-et/<app>@sha256:<64hex>` |
| `staging`     | `staging`       | `ghcr.io/ethio-connect-et/<app>@sha256:<64hex>` |
| `main`        | `production`    | `ghcr.io/ethio-connect-et/<app>@sha256:<64hex>` |

## Dispatch Event Schema

Repository target: `ethio-connect-et/ethio-connect-manifest`.

Event type: `promote-image`

```json
{
  "event_type": "promote-image",
  "client_payload": {
    "app": "<app-name>",
    "digest": "sha256:<64hex>",
    "env": "testing|staging|production",
    "source_repo": "ethio-connect-et/ethio-connect",
    "source_ref": "refs/heads/main",
    "source_commit": "<40-hex-sha>",
    "release_id": "<github-run-id>",
    "release_created_at": "2006-01-02T15:04:05Z",
    "signed_metadata": "<opaque-string>",
    "attestation_bundle": "{\"digest\":\"sha256:...\",\"source_commit\":\"...\",\"source_ref\":\"...\",\"release_id\":\"...\",\"release_created_at\":\"...\"}"
  }
}
```

Validation requirements:

- source env allowlist: `testing|staging|main`
- manifest env allowlist: `testing|staging|production`
- app allowlist from `pnpm nx show projects --withTarget docker:build --json`
- digest pattern: `sha256:<64hex>`
- registry prefix: `ghcr.io/ethio-connect-et/` (never `ghcr.io/ethioconnect/`)

## JSON Schema

A formal JSON schema for the `client_payload` is maintained at
`.github/contracts/promote-image.schema.json` in the source repo
(`ethio-connect-et/ethio-connect`).
