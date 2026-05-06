# Workspace Target Contract Standard

This document defines the target contract for every Nx project in this workspace.

## Profiles and Required Targets

| Profile | Applies to | Required targets |
| --- | --- | --- |
| `app` | application projects that are not e2e and not release-publishable container apps | `build`, `lint`, `test` |
| `e2e` | e2e applications (typically tagged `platform:e2e`) | `build`, `lint`, `test`, `e2e` |
| `library` | publishable libraries (tagged `release:publish`) | `build`, `package`, `nx-release-publish` |
| `publishable-app` | deployable apps tagged `release:docker` and `release:publish` | `build`, `lint`, `test`, `docker:build`, `nx-release-publish` |
| `internal-only-lib` | libraries that are not published externally | `build`, `package` |

## Exemptions

If a required target is intentionally absent, it must be declared in `project.json`:

```json
{
  "metadata": {
    "targetContractProfile": "...",
    "targetContractExemptions": {
      "<target>": "why the target is intentionally not implemented"
    }
  }
}
```

The rationale string is required and must be non-empty.

## Release and Publish Discovery Rules

- Projects intended for Docker image build/publish **must** include tag `release:docker`.
- Projects intended for release publish target execution **must** include tag `release:publish`.
- CI/release workflows should select projects by these tags instead of broad `--withTarget` queries.

## Validation

Use the contract validator in CI and locally:

```bash
pnpm run validate:target-contract
```
