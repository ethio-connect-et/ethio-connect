# Docker release targets

Standardized Docker workflow for deployable Nx apps uses only `@nx/docker` plugin targets:

- `docker:build`: image build target used for local and CI/PR validation builds.
- `docker:run`: runtime target for local container execution.
- `nx-release-publish`: release publishing target that uses Nx release versioning and publishes the image.

## Required targets for deployable apps

- `docker:build`
- `docker:run`
- `nx-release-publish`
- `docker:metadata`

## Usage

- `pnpm nx run <app>:docker:build`
- `pnpm nx run-many -t docker:build --projects=<app1,app2>`
- `pnpm nx run <app>:docker:run`
- `pnpm nx run <app>:nx-release-publish`

## Ownership expectations

- Platform team owns shared target defaults and release conventions in `nx.json`.
- Application teams own Dockerfile correctness and buildability via `docker:build`.
- Release orchestration must flow through Nx versioning/release + `nx-release-publish`.
