# EthioConnect GitOps Bootstrap (Argo CD)

This directory is the Argo CD bootstrap entrypoint for the EthioConnect manifest repository.

## Directory Layout

- `bootstrap/root-app.yaml`: Root App-of-Apps (`ec-root`) which loads all environment apps.
- `apps/`: Environment child Applications (`ec-env-testing`, `ec-env-staging`, `ec-env-production`).
- `envs/<env>/kustomization.yaml`: Environment bundles that include tenant/workload generators.
- `tenants/ec-tenants-appset.yaml`: Tenant + environment ApplicationSet generator with consistent naming.
- `workloads/templates/`: API/dashboard app templates and sync hooks for migration + smoke checks.
- `promotion/images-*.yaml`: Promotion wiring files updated by CI/CD automation.

## Naming Convention

EthioConnect Argo resources use a consistent `ec-` prefix:

- Root app: `ec-root`
- Environment app: `ec-env-<environment>`
- Tenant app: `ec-<environment>-<tenant>`
- Workload app: `ec-<environment>-<tenant>-<workload>`

## Reconciliation Targets (<= 60s)

All Applications/ApplicationSet templates include:

- `syncPolicy.automated.prune: true`
- `syncPolicy.automated.selfHeal: true`
- Retry policy:
  - `limit: 6`
  - backoff `duration: 5s`, `factor: 2`, `maxDuration: 40s`

This converges rapidly and stays within a one-minute operational reconciliation target in normal failure/retry cycles.

## Health Checks + Rollback Safety

- Sync wave ordering:
  - Root app wave `0`
  - Environment apps wave `1`
  - Tenant apps wave `2`
  - API workloads wave `5`
  - Dashboard workloads wave `10`
  - Smoke validation hook wave `20`
- Hooks:
  - `PreSync` DB migration job (`pre-sync-db-migration-hook.yaml`)
  - `PostSync` smoke test job (`post-sync-smoke-hook.yaml`)
- Safe defaults:
  - `PruneLast=true` on root.
  - `PrunePropagationPolicy=foreground` on environment apps.
  - `revisionHistoryLimit: 10` on dashboard apps.

## Promotion Model Wiring (from `ethio-connect` CI)

CI pipeline writes image references (tag + digest) into:

- `promotion/images-testing.yaml`
- `promotion/images-staging.yaml`
- `promotion/images-production.yaml`

### Suggested CI flow

1. Build/push images from monorepo CI.
2. Resolve immutable digests.
3. Update the target environment file under `promotion/`.
4. Commit + push to manifest repo (bot user).
5. Argo CD auto-sync reconciles changed workloads.

### Promotion path

- Testing receives `testing-latest` digests first.
- Promotion job copies approved digests to `images-staging.yaml`.
- Release approval copies identical digests to `images-production.yaml`.

Use digest pinning for rollback-safe, reproducible releases.

## Operator Runbook

### Bootstrap

1. Install Argo CD in cluster.
2. Apply `bootstrap/root-app.yaml`.
3. Verify `ec-root` and child apps are `Synced/Healthy`.

### Standard failure handling

1. Check app status:
   - `argocd app get ec-root`
   - `argocd app list | grep '^ec-'`
2. Inspect operation history + events:
   - `argocd app history <app-name>`
   - `kubectl -n argocd logs deploy/argocd-application-controller`
3. If hook failed:
   - Inspect job pod logs in target namespace.
   - Fix manifest/image/config, recommit, and let auto-sync retry.
4. For urgent rollback:
   - Revert digest in corresponding `promotion/images-<env>.yaml`.
   - Commit revert; Argo self-heal reconciles automatically.

### Common failure paths

- **ImagePullBackOff**: bad tag/digest in `promotion/` file; restore last known good digest.
- **PreSync migration failure**: DB drift or incompatible migration; hotfix migration job/image and retry.
- **Dashboard unhealthy, API healthy**: likely frontend config drift; rollback dashboard digest only.
- **Cross-tenant issue**: pause/sync a single app (`ec-<env>-<tenant>`) to isolate blast radius.

## Notes

- Production entries in `ec-tenants-appset.yaml` are set up for stricter manual promotion workflows.
- Keep tenant directories and workload overlays aligned with ApplicationSet paths.
