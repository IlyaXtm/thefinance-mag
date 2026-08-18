# TheFinance Mag

Non-destructive rebuild of `thefinance.ir/mag` as a headless publishing system:

- WordPress in Docker for editorial content
- WPGraphQL as the content contract
- Next.js App Router for the public `/mag` experience
- Existing production posts, media, metadata, and URLs preserved during migration

## Current phase

Phase 0: foundation and verification. Production is read-only. See
[`docs/phase-0-status.md`](docs/phase-0-status.md) and
[`docs/migration-safety.md`](docs/migration-safety.md).

## Local setup

Prerequisites: Docker with Compose, Node.js 22+, and npm 10+.

```bash
cp .env.example .env
npm install
docker compose config
docker compose up --build
```

The one-shot `wordpress-init` service installs WordPress and activates the
pinned WPGraphQL/SEO plugins idempotently. After the first boot:

```bash
npm run wp:seed
npm run wp:verify
```

Local services:

- Next.js: `http://localhost:3000/mag/` by default; set `WEB_HOST_PORT`
  when that host port is already occupied
- WordPress: `http://localhost:8080/` by default; `WORDPRESS_HOST_PORT` and
  `WORDPRESS_LOCAL_URL` must be changed together when needed
- Health check: `http://localhost:3000/mag/health`
- GraphQL: `http://localhost:8080/graphql`

The sample passwords are for local development only. Staging and production
credentials must be supplied through the deployment environment, never Git.

## Quality gates

```bash
npm run typecheck
npm run lint
npm run build
docker compose config --quiet
npm run wp:verify
```

No production deployment or content import is performed by these commands.
