# Workflow Integration Contract

Contract marker: `testing|staging|main -> testing|staging|production`

## Branch and Registry Mapping

| Source branch | Manifest branch | Expected immutable image reference              |
| ------------- | --------------- | ----------------------------------------------- |
| `testing`     | `testing`       | `ghcr.io/ethio-connect-et/<app>@sha256:<64hex>` |
| `staging`     | `staging`       | `ghcr.io/ethio-connect-et/<app>@sha256:<64hex>` |
| `main`        | `production`    | `ghcr.io/ethio-connect-et/<app>@sha256:<64hex>` |

Non-production promotions are dispatched by `.github/workflows/promote-manifest-nonprod.yml` on pushes to `testing` and `staging`. The workflow resolves deployable apps via `pnpm nx show projects --withTarget docker:build --json`, resolves each app's digest from `ghcr.io/ethio-connect-et/<app>:<branch>`, validates against `DIGEST_REGEX`, and dispatches `promote-image` to `ethio-connect-et/ethio-connect-manifest` with branch-specific concurrency and exponential-backoff retries.

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
    "signed_metadata": {
      "signature_algorithm": "ecdsa-p256-sha256",
      "key_id": "sigstore:github-actions-keyless",
      "cert_chain": ["<base64-leaf-cert-pem>"],
      "signature": "<base64-signature>",
      "canonical_payload": "{\"app\":\"...\",\"digest\":\"sha256:...\",...}"
    },
    "attestation_bundle": "{\"app\":\"...\",\"digest\":\"sha256:...\",\"release_id\":\"...\",...}"
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
