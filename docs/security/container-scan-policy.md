# Container Vulnerability Scan Gate Policy

## Scope

This policy applies to reusable container publishing and release publishing workflows that publish OCI images to GitHub Container Registry (GHCR).

## Severity Thresholds

- **Blocking severities:** `HIGH`, `CRITICAL`
- Any detected vulnerability at these severities causes the scan gate to fail by default.
- Lower severities (`MEDIUM`, `LOW`, `UNKNOWN`) are recorded in reports but do not block by default.

## Scanner and Evidence

- Scanner mode: **Trivy container image scan** against published GHCR image refs.
- Report formats persisted as workflow artifacts:
  - JSON (`*.json`)
  - SARIF (`*.sarif`)
- Job Summary includes:
  - Per-image HIGH/CRITICAL counts
  - Aggregate HIGH/CRITICAL counts
  - Gate decision (pass/fail/override)

## Enforcement

- Scan is executed **after image build and before `nx-release-publish`**.
- When the scan gate fails, downstream promotion is blocked because publish workflow fails.
- Manifest promotion is only allowed when:
  1. Scan gate passes; or
  2. Explicit override is enabled with auditable reason.

## Exception / Override Workflow

Overrides are intended for time-sensitive incidents only and must be auditable.

Required controls:

1. Set `scan_gate_override=true` in release workflow dispatch input.
2. Provide non-empty `scan_gate_override_reason`.
3. Ensure remediation issue/ticket is referenced in the reason.
4. Security team reviews post-release and tracks closure.

Audit trail sources:

- Workflow dispatch inputs
- Step summary "Scan Gate Override" section
- Stored scan artifacts (JSON/SARIF)

## Recommended Response to Failures

1. Inspect JSON/SARIF artifacts for package and CVE details.
2. Patch base images/dependencies and rebuild.
3. Re-run publish and confirm gate passes.
4. Use override only when risk is accepted by authorized approver.

## Trivy Ignore Governance

- Repository-level ignore policy is stored in `.trivyignore.yaml` and is applied in CI scans.
- Suppressions must be narrowly scoped to specific CVEs and time-bound with an expiry/review date.
- Each suppression must include auditable justification (for example, incident/ticket reference).
- Ignore entries are temporary and must be removed once base image or dependency remediation is available.
