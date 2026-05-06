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

COPY --chown=65532:65532 dist/apps/vendor-portal/vendor-portal-dashboard/.next/standalone/ ./
COPY --chown=65532:65532 dist/apps/vendor-portal/vendor-portal-dashboard/.next/static ./dist/apps/vendor-portal/vendor-portal-dashboard/.next/static
COPY --chown=65532:65532 apps/vendor-portal/vendor-portal-dashboard/public ./apps/vendor-portal/vendor-portal-dashboard/public

EXPOSE 3000
USER 65532:65532
ENTRYPOINT ["/nodejs/bin/node"]
CMD ["apps/vendor-portal/vendor-portal-dashboard/server.js"]
