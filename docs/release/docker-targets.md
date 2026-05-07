# Docker targets policy

## Targets

- `docker:build-local`: local and CI/PR validation image build target. This target performs Docker image build only and does **not** include push, signing, or attestation behavior.
- `docker:build-push`: release-only target. This target depends on `docker:build-local` and adds registry push behavior (`--push`) plus release metadata/signing/attestation workflows.

## Allowed trigger contexts

- `docker:build-local`
  - Local developer workflows.
  - Pull request validation and CI checks.
  - Non-release CI branches.
- `docker:build-push`
  - Protected release workflows only.
  - Tag/release branch contexts (for example `refs/tags/*` and approved release branches).
  - Never from `pull_request` events.

## Nx invocation examples

Use Nx via the package manager:

- `pnpm nx run <app>:docker:build-local`
- `pnpm nx run-many -t docker:build-local --projects=<app1,app2>`
- `pnpm nx run <app>:docker:build-push`

## Release-only controls and ownership

- GitHub workflow guards (`if:` conditions) prevent push jobs from running during pull request events.
- Release workflows are the only place where push/sign/attest flows execute.
- Ownership:
  - Platform/DevOps maintainers own release workflow permissions and protected environment policy.
  - Application teams own Dockerfile correctness and local buildability via `docker:build-local`.
