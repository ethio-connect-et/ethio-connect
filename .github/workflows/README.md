## Orchestrator ↔ Reusable workflow contract (affected-aware lanes)

The caller workflow (`orchestrator.yml`) is the single source of truth for base/head resolution. It computes and exports `NX_BASE` and `NX_HEAD` once in the `plan` job, then passes them as explicit `workflow_call` inputs into each lane workflow.

Contract details:

- `projects_json` is only an optimization hint used for matrix/lane shaping and observability (counts, summaries).
- Execution truth stays inside each lane reusable workflow via `pnpm nx affected ... --base=$NX_BASE --head=$NX_HEAD`.
- This avoids drift between precomputed project lists and runtime task graph decisions, especially when target availability differs by project.
- If a lane resolves to no affected work at execution time, the lane emits a deterministic artifact marker with `status=skipped-no-affected`.

Why this separation exists:

1. The orchestrator decides _which lanes to invoke_ and passes shared context.
2. Lane workflows decide _which tasks actually run_ against the same SHA range, preserving Nx as runtime authority.
3. Artifacts and summaries remain stable even when no affected tasks exist.

# Workflow Integration Contract

Contract marker: `testing|staging|main -> testing|staging|production`

## Branch and Registry Mapping

| Source branch | Manifest branch | Expected immutable image reference              |
| ------------- | --------------- | ----------------------------------------------- |
| `testing`     | `testing`       | `ghcr.io/ethio-connect-et/<app>@sha256:<64hex>` |
| `staging`     | `staging`       | `ghcr.io/ethio-connect-et/<app>@sha256:<64hex>` |
| `main`        | `production`    | `ghcr.io/ethio-connect-et/<app>@sha256:<64hex>` |

Non-production promotions are dispatched by `.github/workflows/promote-manifest-nonprod.yml` on pushes to `testing` and `staging`. The workflow resolves deployable apps via `pnpm nx show projects --withTarget docker:build --json`, resolves each app's digest from `ghcr.io/ethio-connect-et/<app>:<branch>`, validates against `DIGEST_REGEX`, and dispatches `promote-image` to `ethio-connect-et/ethio-connect-manifest` with branch-specific concurrency and exponential-backoff retries.

## Tagging Contract (Single Source of Truth)

Every published image MUST include immutable tags with the following contract:

- Required: `<semver>` (canonical release version tag).
- Required: `<shortsha>` (12-char source commit shorthand tag).
- Optional (non-production only): `<branch>` (mutable convenience tag such as `testing` or `staging`).

For non-`main` branches, the canonical release version uses a SemVer-compatible prerelease format (`0.0.0-<branch>.<shortsha>`). For `main`, the canonical release version is release-driven. Promotions MUST use digest references (`<image>@sha256:<64hex>`) and never rely on mutable branch tags.

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
    "source_sha": "<40-hex-sha>",
    "release_id": "<github-run-id>",
    "release_created_at": "2006-01-02T15:04:05Z",
    "canonical_release_version": "<semver-or-semver-prerelease>",
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
- immutable-only promotion source: `ghcr.io/ethio-connect-et/<app>@sha256:<64hex>`

## JSON Schema

A formal JSON schema for the `client_payload` is maintained at
`.github/contracts/promote-image.schema.json` in the source repo
(`ethio-connect-et/ethio-connect`).

## Machine-readable promotion + ArgoCD reconciliation contract

```yaml
contract_version: 1
promotion_contract:
  required_payload_fields:
    - project
    - immutable_ref
    - digest
    - source_sha
    - release_version
    - environment_target
  validation_rules:
    project: 'must match ^[a-z0-9._-]+$ and map to a deployable Nx app'
    immutable_ref: 'must match ghcr.io/ethio-connect-et/<project>@sha256:<64hex>; tags are rejected'
    digest: 'must match sha256:<64hex>'
    source_sha: 'must be a 40-character git commit SHA'
    release_version: 'non-empty canonical release version'
    environment_target:
      allowed_values: [testing, staging, production]
  rejection_conditions:
    - missing digest
    - missing source_sha
    - immutable_ref that is tag-based (image:tag)
    - immutable_ref not aligned with project + digest

argocd_reconciliation_contract:
  source_paths:
    - gitops/argocd/apps
    - gitops/argocd/tenants
    - gitops/argocd/workloads
  sync_window_seconds_max: 60
  required_health_checks:
    - application_status_synced
    - application_status_healthy
    - workloads_progressing_condition_false
  rollback_trigger_conditions:
    - sync_timeout_exceeds_60s
    - health_state_degraded
    - repeated_sync_failures_ge_3
    - rollout_failure_or_crashloop
```

The reusable manifest promotion trigger enforces the payload fields above and fails fast when digest or SHA provenance is missing or malformed. Promotions are accepted only for immutable references (`image@sha256:...`) and rejected for mutable tag references.

ArgoCD automation must reconcile from the GitOps sources represented in diagrams (`gitops/argocd/apps`, `gitops/argocd/tenants`, `gitops/argocd/workloads`), meet the `<=60s` sync window expectation, pass health checks, and trigger rollback when contract conditions are met.

## Multi-platform container behavior

All Docker tag inputs are mandatory in CI: `IMAGE_TAG` and `BRANCH_TAG` must be set and must never be `latest`. Workflows now fail fast before invoking `pnpm nx run ...:docker:build` if either variable is missing or set to `latest`.

All Docker builds run through Nx targets (`pnpm nx run <project>:docker:build`) which now invoke Buildx with explicit target platforms via `--platform ${DOCKER_PLATFORMS:-linux/amd64}`. CI workflows initialize `docker/setup-qemu-action` and `docker/setup-buildx-action` before `docker:build` and `nx-release-publish` targets so cross-architecture manifests are produced consistently.

Publish verification enforces immutable digest behavior per tag:

- Branch publish flow validates `<image_tag>` and `<branch_tag>` point to the same manifest digest.
- Release flow validates `<docker_version>` and `<short_sha>` point to the same manifest digest.
- All digests must match `sha256:<64hex>` and are resolved from GHCR using `docker buildx imagetools inspect`.

## Container security scan gate

Reusable publish and release publish workflows run a dedicated Trivy container scan step after `docker:build` and before `nx-release-publish`.

- Scan source: GHCR image refs produced by the workflow.
- Scanner provenance: Trivy is installed through pinned `aquasecurity/setup-trivy` action commit (`v0.2.4` SHA) with explicit Trivy version pinning (`v0.65.0`).
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

## CI Performance SLOs (Nx Cloud metadata source of truth)

Performance trend tracking must use Nx Cloud run metadata links emitted by CI lane summaries. The quality lane summary records affected count, cache hit/miss indicators, and runtime deltas.

| Lane                               | Target cache hit rate (rolling)                                            | Expected runtime threshold |
| ---------------------------------- | -------------------------------------------------------------------------- | -------------------------- |
| Quality (lint/test/build affected) | >= 70%                                                                     | <= 15 minutes (900s)       |
| Docker Build/Publish               | >= 60% for cacheable prerequisites (`build`, `docker:build` prerequisites) | <= 25 minutes (1500s)      |

Policy:

- A sustained miss against either threshold for 3 consecutive runs should trigger investigation.
- The Nx Cloud run URL captured in job summary is the audit reference for each run.

## Workflow dependency map (2026-05 orchestrator unification)

Top-level CI entry is now `orchestrator.yml` with canonical lanes:

1. `quality` → `reusable-build-test-lint.yml`
2. `container publish` → `reusable-container-publish.yml`
3. `manifest promotion trigger` → `reusable-manifest-promotion-trigger.yml` (dispatches `promote-manifest-nonprod.yml` only for `testing`/`staging`)

Release governance remains intentionally separate and minimal:

- `release-attestation.yml`
- `promote-manifest.yml`

### Deprecation notes

- `release-build-publish.yml` is deprecated as a top-level orchestration path; new CI lane ownership lives in `orchestrator.yml` reusable callees.
- `promote-manifest-nonprod.yml` no longer owns branch push triggers directly; it is now trigger-consumed by the orchestrator manifest lane.

### Standardized reusable schema

Reusable workflow interfaces should use these canonical names:

- `projects_json`
- `nx_base` / `nx_head`
- `tag_context_json` and `canonical_release_version`/`short_sha` image metadata outputs
- deterministic artifact names (e.g. `publish-manifest-<ref>-<run_id>`, lane metrics artifacts)
