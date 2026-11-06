# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=ricky-twin-pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile \
      --fetch-retries=5 \
      --fetch-retry-mintimeout=10000 \
      --fetch-retry-maxtimeout=120000

FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG RICKY_APP_VERSION=0.2.2
ARG RICKY_BUILD_COMMIT=development
ENV RICKY_APP_VERSION=$RICKY_APP_VERSION
ENV RICKY_BUILD_COMMIT=$RICKY_BUILD_COMMIT
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ARG RICKY_APP_VERSION=0.2.2
ARG RICKY_BUILD_COMMIT=development
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV RICKY_APP_VERSION=$RICKY_APP_VERSION
ENV RICKY_BUILD_COMMIT=$RICKY_BUILD_COMMIT
ENV RICKY_CONTENT_DATA_DIR=/app/data
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs deploy/data-maintenance.mjs ./deploy/data-maintenance.mjs
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1:3000/api/health | grep -q '"ok":true' || exit 1
CMD ["node", "server.js"]
