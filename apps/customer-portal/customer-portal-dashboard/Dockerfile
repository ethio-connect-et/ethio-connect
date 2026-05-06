FROM gcr.io/distroless/nodejs20-debian12 AS runtime-base

FROM scratch
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=runtime-base / /

COPY --chown=65532:65532 dist/apps/customer-portal/customer-portal-dashboard/.next/standalone/ ./
COPY --chown=65532:65532 dist/apps/customer-portal/customer-portal-dashboard/.next/static ./dist/apps/customer-portal/customer-portal-dashboard/.next/static
COPY --chown=65532:65532 apps/customer-portal/customer-portal-dashboard/public ./apps/customer-portal/customer-portal-dashboard/public

EXPOSE 3000
USER 65532:65532
ENTRYPOINT ["/nodejs/bin/node"]
CMD ["apps/customer-portal/customer-portal-dashboard/server.js"]
