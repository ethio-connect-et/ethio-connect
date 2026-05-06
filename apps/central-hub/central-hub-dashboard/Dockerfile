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
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=runtime-prune /rootfs/ /

COPY --chown=65532:65532 dist/apps/central-hub/central-hub-dashboard/.next/standalone/ ./
COPY --chown=65532:65532 dist/apps/central-hub/central-hub-dashboard/.next/static ./dist/apps/central-hub/central-hub-dashboard/.next/static
COPY --chown=65532:65532 apps/central-hub/central-hub-dashboard/public ./apps/central-hub/central-hub-dashboard/public

EXPOSE 3000
USER 65532:65532
ENTRYPOINT ["/nodejs/bin/node"]
CMD ["apps/central-hub/central-hub-dashboard/server.js"]
