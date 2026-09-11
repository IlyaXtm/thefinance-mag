# Documentation

Working documents for `thefinance.ir/mag`.

---

## Start here

New to the project, in this order:

1. **`../README.md`** — what this is and how to run it
2. **`learn/frontend.md`** — how the frontend works and why each decision was made
3. **`plan.md`** — where things stand and what's left
4. **`decisions.md`** — why it's built this way
5. **`changelog.md`** — what changed and why

If you are about to touch the CMS or a server instead, start at
**`infra/wp-vps.md`** — its first section is four constants that exist nowhere
else in version control.

---

## Everything, by purpose

### Understanding the project

| File | What it is |
|---|---|
| `plan.md` | Current state and remaining phases. **The single source for what's next** |
| `cutover-plan.md` | The cutover itself: steps, the one-line switch, rollback triggers, what is verified |
| `decisions.md` | Architecture and product decisions with rationale |
| `changelog.md` | What changed, when, and why |
| `backlog.md` | Deferred items, with enough context to pick them up |
| `phase-0-findings.md` | Verified facts about the existing system and what they changed |
| `roadmap.md` | What is left, ordered by what blocks what. Persian |
| `content-state.md` | **The content numbers, with a date and the queries to re-measure.** 54 articles, 14 with a market tag, 0 with a dek. Read before building against any field |

### Doing the work

| File | What it is |
|---|---|
| `handoff.md` | Checklist for picking the project up — verify, debug, measure |
| `design-audit.md` | Auditing the built pages against the design decisions |
| `phase-0-verification.md` | Executable checks against the live system |
| `audit-2026-08-20.md` | The result of running the two above: what was measured, what was fixed, what is still open |
| `audit-2026-08-20-pass2.md` | Second pass: adversarial content, interaction, theme switching and print |
| `audit-seo-security-performance.md` | SEO, security and performance sweep before the next stage |
| `content-team-guide.md` | What changed for editors: login, publish timing, the three rules, what is still in progress. Persian — it is sent to the content team |

### Design

| File | What it is |
|---|---|
| `design/summary.md` | Design phase completion: artifacts, components, tokens, debts |
| `design/listing-spec.md` | The listing page specification |
| `design/archive/` | Historical pass briefs and corrections. Reference only — the built code is authoritative |

### Infrastructure

| File | What it is |
|---|---|
| `infra/wp-vps.md` | CMS VPS provisioning, compose, nginx, hardening |
| `infra/media.md` | The image-URL contract, and why MinIO is deferred |
| `infra/seo-safety.md` | Cutover protocol: baseline, diff, reversible switch, monitoring |
| `infra/frontend-deploy.md` | **The frontend runbook.** What runs on the host, how to build and deploy, rollback, diagnostics, CDN rules. The image is built on a laptop, never on the server |
| `infra/server-move.md` | Moving the frontend server to another host, with the magazine-only section delimited. Persian — it is handed to whoever performs the move |

---

## Superseded

Kept for history; do not act on them.

| File | Superseded by | Why |
|---|---|---|
| `superseded/roadmap.md` | `plan.md` | Written before Phase 0. Superseded on phasing — note its redirect-map requirement turned out to be RIGHT; the Phase 0 conclusion that dropped it was wrong (2026-08-21) |
| `superseded/build-plan.md` | `plan.md` | Overlapping phase numbering with the roadmap; the two disagreed |
| `superseded/decision-brief.md` | `decisions.md` | Folded into the decisions log |
| `superseded/roadmap-review.md` | `decisions.md` | Review of an external roadmap; its conclusions are now decisions |
| `superseded/design-final-prompt.md` | The built code | The prompt that produced the design pass |

### Learning and process

Written for a person to read, not for the agent. **`CLAUDE.md` is instructions
to Claude; these are notes for you.** All Persian.

| File | What it is |
|---|---|
| `learn/frontend.md` | The frontend from first principles: headless CMS, the four render modes, Server Components, the data layer, tokens, `basePath`, redirects, RTL, images, raw CMS content. Written to be read start to finish |
| `learn/lessons.md` | Thirteen lessons from what actually happened — silent failure, the feeling of progress versus progress, knowing your numbers before designing |
| `learn/working-with-ai-tools.md` | How to prompt, what to ask for, and three failures that recurred |
| `learn/after-a-round.md` | Eleven steps from "the report arrived" to "it is live and verified". The commands live in `infra/frontend-deploy.md`; this says when and by what measure |

---

## Conventions

**Decisions get logged with their rationale.** The architecture decision was
reopened three times before it was written down. Reasoning is what stops a
settled question being reopened.

**Deferrals get logged too.** `backlog.md` records what was deferred and what
was already decided about it, so revisiting doesn't start from zero.

**Constraints in `CLAUDE.md` are not preferences.** Several are legal
(signal-selling is prohibited by Iranian securities law) or accessibility
requirements (WCAG contrast minimums). A few were arrived at after being wrong
once — those carry the measurement that corrected them.

**Verified facts carry their evidence.** Contrast ratios include the surface
they were measured against; schema claims name the plugin version they were
checked on. "It looked fine" is not a verification.
