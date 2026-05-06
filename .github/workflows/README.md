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

## Multi-platform container behavior

All Docker builds run through Nx targets (`pnpm nx run <project>:docker:build`) which now invoke Buildx with explicit target platforms via `--platform ${DOCKER_PLATFORMS:-linux/amd64,linux/arm64}`. CI workflows initialize `docker/setup-qemu-action` and `docker/setup-buildx-action` before `docker:build` and `nx-release-publish` targets so cross-architecture manifests are produced consistently.

Publish verification enforces immutable digest behavior per tag:

- Branch publish flow validates `<image_tag>` and `<branch_tag>` point to the same manifest digest.
- Release flow validates `<docker_version>` and `<short_sha>` point to the same manifest digest.
- All digests must match `sha256:<64hex>` and are resolved from GHCR using `docker buildx imagetools inspect`.

## Container security scan gate

Reusable publish and release publish workflows run a dedicated Trivy container scan step after `docker:build` and before `nx-release-publish`.

- Scan source: GHCR image refs produced by the workflow.
- Blocking severities: `HIGH`, `CRITICAL`.
- Evidence: JSON and SARIF reports uploaded as workflow artifacts.
- Summary: per-image and aggregate findings written to the GitHub job summary.
- Promotion behavior: manifest promotion is blocked when the scan gate fails unless an explicit audited override is set (`scan_gate_override=true` with `scan_gate_override_reason`).

Policy details and exception workflow are documented in `docs/security/container-scan-policy.md`.

## Rollback plan

If a multi-platform publish regression occurs:

1. Re-run publish with `DOCKER_PLATFORMS=linux/amd64` to force a single-platform emergency image while keeping the Nx execution contract unchanged.
2. Re-promote the last known-good digest from the manifest repo workflows (`promote-manifest*.yml`) rather than republishing mutable tags.
3. Revert the failing workflow or `nx.json` change and republish the same release tag; digest verification steps will fail fast if tag determinism is broken.
4. After stabilization, restore `DOCKER_PLATFORMS=linux/amd64,linux/arm64` and validate digest parity checks before promotion.
