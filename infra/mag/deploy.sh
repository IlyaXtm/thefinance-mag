#!/usr/bin/env bash
#
# Deploy one magazine build on the frontend server.
#
#   sudo ./deploy.sh <sha>
#
# THIS IS THE RUN COMMAND, IN VERSION CONTROL. It used to live in three blocks
# pasted from docs/infra/frontend-deploy.md, and a pasted command drifts: on
# 2026-10-05 production was reported running with its port published on
# 0.0.0.0:3100 rather than 127.0.0.1, which serves the magazine straight from
# the host — no CDN, no nginx, so no staging noindex, no security headers and
# no rate limit keyed on X-Real-IP. The binding below is the fix, and having it
# here is what keeps it fixed.
#
# ── What it expects ─────────────────────────────────────────────────────────
#
#   ~/mag-<sha>.tar.gz   the image, built on a laptop and copied over. NEVER
#                        built here: a `docker build` on this host once took
#                        /inchart down — three products share it.
#   $ENV_FILE            runtime configuration, default /root/mag/.env, mode
#                        600. Template: infra/mag/.env.example. Holds the
#                        preview secret, which is why it is a file on the
#                        server and not a line in this script or a build arg.
#
# ── What it does ────────────────────────────────────────────────────────────
#
#   1. loads the image if it is not already loaded
#   2. keeps the running container as thefinance-mag-prev (stopped)
#   3. starts the new one on 127.0.0.1:3100
#   4. waits for /mag/health to report THIS sha and source "wpgraphql"
#   5. if it does not within 90s, puts -prev back and exits non-zero
#
# Step 4 checks the build id and the data source, not just "it answered".
# A container serving the mock, or an old image under a new tag, answers 200
# and looks perfectly healthy otherwise — both have happened.
#
# Manual rollback, any time after a deploy that passed its check:
#
#   sudo ./deploy.sh --rollback

set -Eeuo pipefail

readonly NAME=thefinance-mag
readonly PREV="${NAME}-prev"
readonly IMAGE_REPO=thefinance-mag
readonly ENV_FILE="${ENV_FILE:-/root/mag/.env}"
readonly BIND='127.0.0.1:3100:3000'
readonly HEALTH_TIMEOUT=90

log() { printf '[mag-deploy] %s\n' "$*"; }
fail() { printf '[mag-deploy] ERROR: %s\n' "$*" >&2; exit 1; }

rollback() {
  docker inspect "$PREV" >/dev/null 2>&1 || fail "no $PREV container to roll back to"
  log "rolling back to $(docker inspect --format '{{.Config.Image}}' "$PREV")"
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker rename "$PREV" "$NAME"
  docker start "$NAME" >/dev/null
  log 'rolled back'
}

# Asks the app, from inside its own container, what it is running. Prints
# nothing but the verdict, so no configuration ends up in a terminal log.
health_ok() {
  docker exec "$NAME" node -e "
    fetch('http://127.0.0.1:3000/mag/health')
      .then((r) => r.json())
      .then((h) => process.exit(h.buildId === '$1' && h.source === 'wpgraphql' ? 0 : 1))
      .catch(() => process.exit(1));
  " >/dev/null 2>&1
}

if [ "${1:-}" = '--rollback' ]; then
  rollback
  exit 0
fi

SHA="${1:-}"
[[ "$SHA" =~ ^[0-9a-f]{7,40}$ ]] || fail 'usage: deploy.sh <git-sha> | --rollback'
IMAGE="${IMAGE_REPO}:${SHA}"

# ── configuration ────────────────────────────────────────────────────────────
[ -r "$ENV_FILE" ] || fail "missing $ENV_FILE — create it from infra/mag/.env.example (chmod 600)"
# The secret must be present; its value is never echoed. A missing one does
# not break the site, it silently breaks Preview — so it is caught here.
grep -Eq '^(WP_PREVIEW_SECRET|TF_MAG_PREVIEW_SECRET)=.+' "$ENV_FILE" \
  || fail "$ENV_FILE has no WP_PREVIEW_SECRET value"

# ── image ────────────────────────────────────────────────────────────────────
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  TARBALL="${TARBALL:-$HOME/mag-${SHA}.tar.gz}"
  [ -r "$TARBALL" ] || fail "image $IMAGE not loaded and $TARBALL not found"
  log "loading $TARBALL"
  gunzip -c "$TARBALL" | docker load >/dev/null
fi
[ "$(docker image inspect --format '{{.Architecture}}' "$IMAGE")" = amd64 ] \
  || fail "$IMAGE is not amd64 — rebuild with --platform linux/amd64"

# ── swap ─────────────────────────────────────────────────────────────────────
docker rm -f "$PREV" >/dev/null 2>&1 || true
if docker inspect "$NAME" >/dev/null 2>&1; then
  log "keeping $(docker inspect --format '{{.Config.Image}}' "$NAME") as $PREV"
  docker stop "$NAME" >/dev/null
  docker rename "$NAME" "$PREV"
fi

log "starting $IMAGE on $BIND"
docker run -d --name "$NAME" --restart unless-stopped \
  -p "$BIND" \
  --env-file "$ENV_FILE" \
  -e NODE_ENV=production \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -e PORT=3000 \
  --log-opt max-size=10m --log-opt max-file=3 \
  "$IMAGE" >/dev/null

# ── verify, or put the old one back ──────────────────────────────────────────
for ((i = 0; i < HEALTH_TIMEOUT; i += 3)); do
  if health_ok "$SHA"; then
    log "healthy: buildId=$SHA, source=wpgraphql, bound to $BIND"
    exit 0
  fi
  sleep 3
done

docker logs --tail 50 "$NAME" >&2 || true
rollback
fail "$IMAGE did not report buildId=$SHA with source=wpgraphql within ${HEALTH_TIMEOUT}s"
