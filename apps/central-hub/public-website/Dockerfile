FROM gcr.io/distroless/nodejs20-debian12 AS runtime-base

FROM scratch
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=runtime-base / /

COPY --chown=65532:65532 dist/apps/central-hub/public-website/.next/standalone/ ./
COPY --chown=65532:65532 dist/apps/central-hub/public-website/.next/static ./dist/apps/central-hub/public-website/.next/static
COPY --chown=65532:65532 apps/central-hub/public-website/public ./apps/central-hub/public-website/public

EXPOSE 3000
USER 65532:65532
ENTRYPOINT ["/nodejs/bin/node"]
CMD ["apps/central-hub/public-website/server.js"]
