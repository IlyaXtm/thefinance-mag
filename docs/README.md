# Documentation

Working documents for `thefinance.ir/mag`.

---

## Start here

New to the project, in this order:

1. **`../README.md`** — what this is and how to run it
2. **`plan.md`** — where things stand and what's left
3. **`decisions.md`** — why it's built this way
4. **`changelog.md`** — what changed and why

---

## Everything, by purpose

### Understanding the project

| File | What it is |
|---|---|
| `plan.md` | Current state and remaining phases. **The single source for what's next** |
| `decisions.md` | Architecture and product decisions with rationale |
| `changelog.md` | What changed, when, and why |
| `backlog.md` | Deferred items, with enough context to pick them up |
| `phase-0-findings.md` | Verified facts about the existing system and what they changed |

### Doing the work

| File | What it is |
|---|---|
| `handoff.md` | Checklist for picking the project up — verify, debug, measure |
| `design-audit.md` | Auditing the built pages against the design decisions |
| `phase-0-verification.md` | Executable checks against the live system |
| `audit-2026-08-20.md` | The result of running the two above: what was measured, what was fixed, what is still open |
| `audit-2026-08-20-pass2.md` | Second pass: adversarial content, interaction, theme switching and print |
| `audit-seo-security-performance.md` | SEO, security and performance sweep before the next stage |

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
| `infra/frontend-deploy.md` | Frontend server: container, staging host, nginx, the cutover line |

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
