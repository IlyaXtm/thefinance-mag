# Production releases and rollback

Every release that reaches `thefinance.ir/mag` gets a git tag `mag-prod-<date>`
on the commit its image was built from. The image tag is that commit's short
SHA, and `/mag/health` reports it as `buildId`.

Newest first.

| Date | Git tag | Build (image / `buildId`) | What changed | Rollback target |
|---|---|---|---|---|
| *pending* | *(`mag-prod-2026-10-08` once deployed)* | `0190020` | Home v2 (lead + 2×2, «بازارها:» row, news as a text list, market columns) + QA 16 Mehr fixes. Built and checked; not deployed — SSH to `thefinance-main` timed out on 2026-10-08 | `bc1f898`, or `90c0215` for the fixes without the redesign |
| 2026-10-07 | `mag-prod-2026-10-07` | `bc1f898` | Card images follow the artwork's shape (16:9 news, 3:2 lessons); footer social buttons | `9f72d32` |

Builds kept loaded on `thefinance-main` for rollback: `bc1f898` and earlier;
`90c0215` and `0190020` go up with the pending release. Check what is there
before relying on it:

```bash
ssh thefinance-main 'sudo docker images thefinance-mag'
```

---

## How to go back

### 1. One release back — seconds

```bash
ssh thefinance-main 'sudo ~/deploy.sh --rollback'
curl -s https://thefinance.ir/mag/health      # buildId should be the previous one
```

`deploy.sh` keeps the previous container as `thefinance-mag-prev`, so this is a
rename and a start. It only ever goes ONE step back.

### 2. To any kept build — about a minute

```bash
ssh thefinance-main 'sudo ~/deploy.sh 90c0215'   # e.g. the QA fixes without home v2
ssh thefinance-main 'sudo ~/deploy.sh bc1f898'   # e.g. production before 2026-10-08
```

This is a normal deploy of an older image: the running one becomes `-prev`, the
health check must report that build, and if it does not, `deploy.sh` puts the
previous one back by itself. If the image is no longer loaded, `deploy.sh` loads
`~/mag-<sha>.tar.gz`; if that is gone too, rebuild it from its tag (below).

### 3. Undo it in the code too — so the next release does not bring it back

A rollback on the server is temporary: the next deploy from `claude-main` would
ship the change again. To remove it for good, revert in git and release:

```bash
# A whole branch merged with --no-ff (one merge commit) — e.g. home v2:
git revert -m 1 <merge-commit>        # find it: git log --merges --oneline -5
# A single commit:
git revert <sha>
```

Then build, check and deploy as usual (`docs/learn/after-a-round.md`).

### 4. Rebuild an old release from its tag

```bash
git worktree add --detach /tmp/mag-old mag-prod-2026-10-07
cd /tmp/mag-old && SHA=$(git rev-parse --short HEAD)
docker build --platform linux/amd64 --build-arg BUILD_ID=$SHA \
  --build-arg SITE_ORIGIN=https://thefinance.ir \
  --build-arg WP_GRAPHQL_ENDPOINT=https://wp.thefinance.ir/mag/graphql \
  --build-arg USE_MOCK=false -t thefinance-mag:$SHA .
```

then transfer and `deploy.sh $SHA` as in `docs/infra/frontend-deploy.md`.

---

## Adding a release here

After a deploy is verified (health, pages, redirect diff):

```bash
git tag -a mag-prod-<YYYY-MM-DD> <sha> -m "<what changed>"
git push origin mag-prod-<YYYY-MM-DD>
```

and add a row to the table above. Two releases on one day: suffix `-2`.
