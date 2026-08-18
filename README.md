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

Local services:

- Next.js: `http://localhost:3000/mag/`
- WordPress: `http://localhost:8080/`
- Health check: `http://localhost:3000/mag/health`

The sample passwords are for local development only. Staging and production
credentials must be supplied through the deployment environment, never Git.

## Quality gates

```bash
npm run typecheck
npm run lint
npm run build
docker compose config --quiet
```

No production deployment or content import is performed by these commands.
