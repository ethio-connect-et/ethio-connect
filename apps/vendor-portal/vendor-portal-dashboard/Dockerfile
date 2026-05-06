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
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=runtime-base / /
# Overlay patched libssl3 on top of the distroless filesystem
COPY --from=security-patcher /rootfs/usr/ /usr/

COPY --chown=65532:65532 dist/apps/vendor-portal/vendor-portal-dashboard/.next/standalone/ ./
COPY --chown=65532:65532 dist/apps/vendor-portal/vendor-portal-dashboard/.next/static ./dist/apps/vendor-portal/vendor-portal-dashboard/.next/static
COPY --chown=65532:65532 apps/vendor-portal/vendor-portal-dashboard/public ./apps/vendor-portal/vendor-portal-dashboard/public

EXPOSE 3000
USER 65532:65532
ENTRYPOINT ["/nodejs/bin/node"]
CMD ["apps/vendor-portal/vendor-portal-dashboard/server.js"]
