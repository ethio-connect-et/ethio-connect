Use a small number of explicit workflows in this repository.

Why:

- Keep the CI path centralized in `ci.yml` so pull request validation, protected-branch quality checks, and image publishing are easy to audit.
- Keep operational workflows separate when they represent different responsibilities, such as release, promotion, and rollback.
- Use `libs/infrastructure` in this monorepo as the GitOps source of truth.

Execution model in this repo:

- Entrypoint CI workflow: `ci.yml`
- Drafted release workflow: `release-drafter.yml`
- Operational workflows: `promote.yml`, `release.yml`, `rollback.yml`
- `ci.yml` contains branch policy checks, security scans, Nx quality tasks, image publishing, GitOps promotion PR automation, merge gating, and deploy/sync.
- Docker image publishing runs on pushes to `testing`, `staging`, and `main`.
- CI publishes a single build tag in the form `<branch>-<12-char-commit>`; GitOps overlays should reference that deployed build tag.
- The canonical CI promotion chain is explicit and ordered:
  1. build/publish images
  2. open or update GitOps promotion pull request
  3. merge gate for the promotion pull request
  4. deploy/sync via Argo CD
- Promotion and rollback workflows open pull requests against protected environment branches instead of pushing directly.
- If this repository disables pull request creation for `GITHUB_TOKEN`, set a `GITOPS_PR_TOKEN` secret with repo and pull request scopes so promotion and rollback PR creation can still be automated.
- Manual releases are cut from the selected base branch, then promote the matching build images to semver release tags and create a GitHub Release.

This keeps CI behavior in one place and reduces cross-workflow indirection.
