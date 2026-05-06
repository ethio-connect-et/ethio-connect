# Container Image Hardening Strategy

## Why we removed manual root filesystem edits

We previously removed selected files from container root filesystems during image assembly (for example, `dpkg` status entries and OpenSSL shared libraries) to reduce scanner findings. That approach is no longer used because it can:

- hide package metadata instead of fixing vulnerability exposure,
- create drift from upstream base image integrity,
- make remediation harder to audit and reproduce.

## Current approach

1. **Refresh base images** regularly and consume updated digest-pinned runtime bases.
2. **Copy only required build artifacts** into final images (standalone app bundles and production dependencies).
3. **Avoid ad-hoc rootfs mutation** for vulnerability suppression.

This keeps image composition deterministic and aligns scanning results with the real runtime surface.

## Vulnerability exception policy

If a vulnerability cannot be remediated immediately, use a **narrowly scoped Trivy ignore** entry in `.trivyignore.yaml` with:

- explicit CVE id,
- justification,
- expiry date,
- review/ticket reference in the statement.

Ignore entries are temporary risk acceptances and must be removed after base image or dependency remediation lands.
