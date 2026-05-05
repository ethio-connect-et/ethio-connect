FROM node@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS deps
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

RUN corepack enable

COPY dist/apps/central-hub/central-hub-api/package.json ./package.json
COPY dist/apps/central-hub/central-hub-api/pnpm-lock.yaml ./pnpm-lock.yaml
COPY dist/apps/central-hub/central-hub-api/workspace_modules ./workspace_modules

RUN node -e 'const fs = require("fs"); const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")); pkg.pnpm ??= {}; pkg.pnpm.overrides = { ...(pkg.pnpm.overrides ?? {}), lodash: "^4.18.0", "path-to-regexp": "^8.4.2" }; fs.writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);' \
    && pnpm install --prod --no-frozen-lockfile

FROM gcr.io/distroless/nodejs20-debian12@sha256:2cd820156cf039c8b54ae2d2a97e424b6729070714de8707a6b79f20d56f6a9a AS runtime-base

FROM busybox:1.36.1 AS runtime-fs
COPY --from=runtime-base / /rootfs
RUN rm -f /rootfs/usr/lib/x86_64-linux-gnu/libssl.so.3 \
    /rootfs/usr/lib/x86_64-linux-gnu/libcrypto.so.3 \
    /rootfs/var/lib/dpkg/status.d/libssl3 \
    /rootfs/var/lib/dpkg/status.d/libssl3.md5sums \
    && rm -rf /rootfs/usr/lib/x86_64-linux-gnu/ossl-modules \
    /rootfs/usr/share/doc/libssl3

FROM scratch
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=runtime-fs /rootfs/ /

COPY --chown=65532:65532 dist/apps/central-hub/central-hub-api/ ./
COPY --from=deps --chown=65532:65532 /app/node_modules ./node_modules

EXPOSE 3000
USER 65532:65532
ENTRYPOINT ["/nodejs/bin/node"]
CMD ["main.js"]
