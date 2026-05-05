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
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=runtime-fs /rootfs/ /

COPY --chown=65532:65532 dist/apps/customer-portal/customer-portal-dashboard/.next/standalone/apps ./apps
COPY --chown=65532:65532 dist/apps/customer-portal/customer-portal-dashboard/.next/standalone/dist ./dist
COPY --chown=65532:65532 dist/apps/customer-portal/customer-portal-dashboard/.next/standalone/node_modules ./node_modules
COPY --chown=65532:65532 dist/apps/customer-portal/customer-portal-dashboard/.next/standalone/package.json ./package.json
COPY --chown=65532:65532 dist/apps/customer-portal/customer-portal-dashboard/workspace_modules ./workspace_modules
COPY --chown=65532:65532 dist/apps/customer-portal/customer-portal-dashboard/.next/static ./dist/apps/customer-portal/customer-portal-dashboard/.next/static

EXPOSE 3000
USER 65532:65532
ENTRYPOINT ["/nodejs/bin/node"]
CMD ["apps/customer-portal/customer-portal-dashboard/server.js"]
