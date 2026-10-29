# Handoff — Architecture Design Complete

- Package: `release-smoke-new-run-skill-links` (Project Task autobyteus-149; F6 of autobyteus-142)
- Result: `Architecture Design Complete`, `task_size=Medium`, `architectural_risk=Low` → direct implementation route (no independent architecture review per handoff rules)
- Current SR: `SR-001`
- Approval: requirements approved by the Solution Designer within the Task's direction (no `Needs user` decisions); user informed in the Solution Designer conversation 2026-10-19
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links`
- Branch: `codex/release-smoke-new-run-skill-links`
- Base: `origin/personal` @ `cba6b851227352d6bcefd5a8543ef8e5ba9f550d` (fetched 2026-10-19)
- Finalization target: `origin` / `personal` (RELEASE.md)
- Ticket folder: `tickets/in-progress/release-smoke-new-run-skill-links/` (not yet committed)

## Original Request (summary)

Make "same-skill link in the workspace" and "brand-new run of an agent with configured skills" part of the checks that run before a release, on the runtimes the product supports. Keep costs low: a cheap model, or scripted fixtures where a live run is not needed. Coordinate with autobyteus-65 (CI) and autobyteus-148 (stale gated suites) without duplicating them. Done when the check runs before a release, is documented where the release rules live, and the tests are merged.

## What To Build (see design-spec.md for the full design)

1. `scripts/release_smoke.py`: stdlib Python. It has no arguments and is the release smoke policy owner. It does the following:
   - a preflight check (`claude`/`codex`/`grok` on `PATH`, `~/.codex/auth.json`);
   - three serial vitest steps, each in its own clean environment with a JSON report in a temp folder: the live skill-links suite, the AGY scripted suite, the native suite;
   - a verdict against a fixed required-case list: each case matched exactly once and `passed`, and no test `failed`;
   - a summary of runtime × scenario with the commit, models and duration;
   - a `git status --porcelain` before/after guard;
   - exit 0/1.
   Its tests go in `scripts/tests/test_release_smoke.py` (unittest).
2. `workspace-skill-links-live.e2e.test.ts`: pin the cheapest models (Claude `haiku`, Codex `gpt-5.6-luna` (check the live catalog), Grok `grok-4.7`). Env vars override them. Remove the stale candidates and the `available[0]` fallback; when the model is missing, fail with the available list.
3. `agy-linked-skills-transport.e2e.test.ts`: add E09, a brand-new run, and E10, a brand-new lazily started team member. Both use an imported package agent with a configured skill, in a workspace with `.claude/.codex/.grok/skills` same-skill links, with the scripted CLI.
4. `configured-skill-on-demand-loading.e2e.test.ts`: add the same two scenarios for native AutoByteus at factory level, with the deterministic LLM and a memory folder that does not exist yet.
5. RELEASE.md "Checks Before Tagging": add a "Release smoke check" subsection (text guidance in design-spec "Guidance For Implementation").
6. TESTING.md: add one "Test layers" row, in its own `docs(testing): …` commit.

## Constraints

- No production source changes. If a scenario fails because of a product defect, report it; do not fix it here.
- No CI or workflow changes (autobyteus-65). Do not repair other stale gated suites (autobyteus-148). Do not assert F2/F3 (autobyteus-150).
- Test-owned data only, and a throwaway `CODEX_HOME` (the suite already does this). Leave nothing behind in the worktree.
- Live runs spend the user's credits: keep to the pinned cheap models and the existing short prompts. A full live smoke is about 15 short turns in total.

## Acceptance Criteria Pointer

AC-001..AC-009 in `requirements-doc.md`. Verification intent and negative runs are listed in design-spec "Change / Refactor Sequence" step 4.

## Open Risks / Assumptions

- ASM-001: the release machine has signed-in Claude, Codex and Grok CLIs (true on this host: Claude Code 2.1.302, codex-cli 0.163.0, grok 1.0.62; agy 1.4.2).
- RSK-001/003: an expired login or a retired model produces a clear failure; the waiver rule is in RELEASE.md.
- Follow-ups recorded (not this ticket): FU-1 (script enforcement, the user's call), FU-2 (TESTING.md AGY 1.3.5 note may be stale), FU-3 (note for autobyteus-65).

## Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links/tickets/in-progress/release-smoke-new-run-skill-links/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links/tickets/in-progress/release-smoke-new-run-skill-links/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links/tickets/in-progress/release-smoke-new-run-skill-links/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links/tickets/in-progress/release-smoke-new-run-skill-links/solution-revision-record.md`
- Architecture review artifacts: `N/A — not applicable` (direct route)

## Route

- Handoff rules applied (2026-10-19): `task_size=Medium` and `architectural_risk=Low` → `/software_engineering_team/implementation_engineer`. No other rule matches.
- Next expected action: implementation, then implementation-scoped checks and the downstream route.
