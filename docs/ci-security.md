# CI Workflow Security Hardening Policy

## Baseline requirements

All workflow files under `.github/workflows/*.yml` must:

1. Declare top-level `permissions: {}` to enforce deny-by-default.
2. Declare explicit `permissions` for every job.
3. Pin every external `uses:` action to a full 40-character commit SHA.

## Scope model

- **Top-level `permissions: {}`** blocks implicit token grants.
- **Job-level permissions** are the only allowed source of token scopes.
- **Reusable workflows** must still declare job permissions for each internal job.

## Allowed patterns and examples

### Minimal read-only job

```yaml
permissions: {}

jobs:
  lint:
    permissions:
      contents: read
```

### OIDC signing job

```yaml
permissions: {}

jobs:
  sign:
    permissions:
      contents: read
      id-token: write
      packages: write
```

### Immutable action reference

```yaml
- uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v5.0.0
```

## Exceptions

Exceptions are limited to cases where a required integration is technically blocked by pinned SHA usage or where a write scope is required by platform API behavior.

Required exception metadata in PR description or a linked issue:

- workflow file and job name,
- exact scope or unpinned action reference requested,
- reason and expiration date,
- compensating controls.

## Approval path

1. Open a PR including the exception metadata.
2. Request approvals from:
   - repository CODEOWNERS for `.github/workflows/**`, and
   - the security reviewer group.
3. Merge only after both approvals and a follow-up task is created to remove the exception before expiration.

## Enforcement

Policy is enforced by `tools/ci/validate-workflow-hardening.mjs` and executed from the governance pipeline.
