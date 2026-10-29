# Handoff — SR-003 Design Impact: RELEASE.md cost wording (release-smoke-new-run-skill-links, autobyteus-149)

- Result: `Architecture Design Complete` (revision SR-003), `task_size=Medium`, `architectural_risk=Low`, direct route
- Requirements: unchanged, approved at SR-001 (plus the user-confirmation addendum)
- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links, branch `codex/release-smoke-new-run-skill-links`, API/E2E documents at 3c2bbf5aa6
- Ticket folder: /Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links/tickets/in-progress/release-smoke-new-run-skill-links/

## What changed and why

API/E2E found (FU-002, evidence `evidence/IMP-07-smoke-run-2.txt`, `evidence/API-08-smoke-full-run.txt`) that RELEASE.md's "Release smoke check" **Cost** line counts turns only, while the binding limits are the live CLIs' subscription quotas:
- Grok: about 150–240k tokens per run against 600k per rolling 24 h (IMP-07 hit `429 free-usage-exhausted`).
- Codex: the user's ChatGPT account limit stopped all Codex cases on 2026-10-29.

The RELEASE.md text is this change's own deliverable, so the fix belongs in this ticket (SR-002).

## Work

Edit only the RELEASE.md "Release smoke check" **Cost** bullet, following design-spec "Guidance For Implementation" (revised SR-003): name both quotas and say that a quota refusal is handled like a runtime that cannot run (wait for the reset, or the user's recorded waiver for that runtime). No code or test change.

## Validation timing (user decision, updated SR-004)

The user accepted the per-case proof for AC-001 instead of waiting for the Codex reset: "we can accept that the credit is not there and only codex app server is not tested … i will personally accept it". No smoke rerun is needed. After your edit, hand off to API/E2E as usual. API/E2E rechecks AC-007 on the final commit (docs-only, so TESTING.md "Rerun by impact" needs no rerun), records AC-001 as user-accepted and hands Pass to delivery.

## Open items

- FU-001 stays a follow-up (signed-out Grok reported as "model not offered").

## Route

Handoff rules (2026-10-29): Medium/Low → `/software_engineering_team/implementation_engineer`.
