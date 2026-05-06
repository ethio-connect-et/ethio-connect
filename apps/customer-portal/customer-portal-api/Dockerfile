FROM node@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS deps
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

RUN corepack enable

COPY dist/apps/customer-portal/customer-portal-api/package.json ./package.json
COPY dist/apps/customer-portal/customer-portal-api/pnpm-lock.yaml ./pnpm-lock.yaml
COPY dist/apps/customer-portal/customer-portal-api/workspace_modules ./workspace_modules

RUN node -e 'const fs = require("fs"); const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")); pkg.pnpm ??= {}; pkg.pnpm.overrides = { ...(pkg.pnpm.overrides ?? {}), lodash: "^4.18.0", "path-to-regexp": "^8.4.2" }; fs.writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);' \
    && pnpm install --prod --no-frozen-lockfile

FROM gcr.io/distroless/nodejs20-debian12@sha256:6fe218dbad37e979c7542e670d28d6e23d3f53d2929693bc9cdded8b622f339f AS runtime-base

FROM debian:12-slim AS runtime-prune
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

COPY --from=runtime-prune /rootfs/ /

COPY --chown=65532:65532 dist/apps/customer-portal/customer-portal-api/ ./
COPY --from=deps --chown=65532:65532 /app/node_modules ./node_modules

EXPOSE 3000
USER 65532:65532
ENTRYPOINT ["/nodejs/bin/node"]
CMD ["main.js"]
