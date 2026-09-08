# TheFinance Mag — production image.
#
# Multi-stage so the runtime image carries no source, no dev dependencies and
# no package manager. It runs `.next/standalone`, which `next build` emits with
# only the node_modules actually reached at runtime.
#
# Pinned to the Node 22 line, matching the Next 15 requirement. Alpine keeps
# the image small; the standalone server has no native dependency that needs
# glibc.

# ---------------------------------------------------------------- deps
FROM node:22-alpine AS deps
WORKDIR /app

# Only the manifests, so this layer is cached until a dependency actually
# changes — source edits do not re-run the install.
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------- build
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Telemetry is a network call to Vercel on every build. The server is in Iran
# and the call is neither wanted nor reliable.
ENV NEXT_TELEMETRY_DISABLED=1

# The three values below are IDENTICAL in staging and production, by design:
# canonicals must always name the production origin even when staging serves
# the page, so nothing here varies by environment. They are still passed as
# build args rather than hardcoded, so a genuinely different origin (a review
# app, say) is a build argument and not a code change.
#
# They must be present at BUILD time, not only at run time: statically
# prerendered pages bake canonical and og:url into their HTML, and that happens
# here. Runtime values still win for anything server-rendered — see the
# server-only names in lib/site.ts and mag.service.ts.
ARG SITE_ORIGIN=https://thefinance.ir
ARG WP_GRAPHQL_ENDPOINT=https://wp.thefinance.ir/mag/graphql
ARG USE_MOCK=false
# The image has no .git, so the build id has to be passed in. Without it the
# app reports "unknown" and /mag/health cannot tell you which commit is running
# — which is exactly how a three-week-stale container went unnoticed.
#   docker build --build-arg BUILD_ID=$(git rev-parse --short HEAD) ...
ARG BUILD_ID=unknown
ENV BUILD_ID=$BUILD_ID \
    SITE_ORIGIN=$SITE_ORIGIN \
    WP_GRAPHQL_ENDPOINT=$WP_GRAPHQL_ENDPOINT \
    USE_MOCK=$USE_MOCK

RUN npm run build

# ---------------------------------------------------------------- runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root. Next writes nothing outside .next/cache at runtime, so the app owns
# only what it needs to.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# `public` and `.next/static` are NOT inside standalone — Next expects them to
# be copied alongside. Without them the app serves HTML with no CSS, no JS and
# no font, which looks like a broken deploy rather than a missing copy step.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# ISR writes regenerated pages here. Created ahead of time and owned by the app
# user, or the first revalidation fails on a read-only directory.
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs
EXPOSE 3000

# server.js is what standalone emits; it already knows the basePath.
CMD ["node", "server.js"]
