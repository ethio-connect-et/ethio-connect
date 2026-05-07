FROM node@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS deps
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

RUN corepack prepare pnpm@10.20.0 --activate

COPY dist/apps/central-hub/central-hub-api/package.json ./package.json
COPY dist/apps/central-hub/central-hub-api/pnpm-lock.yaml ./pnpm-lock.yaml
COPY dist/apps/central-hub/central-hub-api/workspace_modules ./workspace_modules

RUN pnpm install --prod

# Security patcher: installs patched libssl3 to resolve CVE-2026-31789 (CRITICAL),
# CVE-2026-28387/28388/28389/28390 (HIGH), CVE-2026-31790 (MEDIUM).
FROM debian:bookworm-slim AS security-patcher
RUN apt-get update \
    && apt-get install -y --no-install-recommends libssl3 \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /rootfs \
    && dpkg -L libssl3 | grep '^/' | while IFS= read -r f; do \
        [ -f "$f" ] || continue; \
        install -D "$f" "/rootfs$f"; \
    done

FROM gcr.io/distroless/nodejs20-debian12 AS runtime-base

FROM scratch
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=runtime-base / /
# Overlay patched libssl3 on top of the distroless filesystem
COPY --from=security-patcher /rootfs/usr/ /usr/

COPY --chown=65532:65532 dist/apps/central-hub/central-hub-api/ ./
COPY --from=deps --chown=65532:65532 /app/node_modules ./node_modules

EXPOSE 3000
USER 65532:65532
ENTRYPOINT ["/nodejs/bin/node"]
CMD ["main.js"]
