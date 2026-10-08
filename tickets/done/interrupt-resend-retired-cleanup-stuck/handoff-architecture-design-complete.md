# Handoff — Architecture Design Complete

- Result classification: `Architecture Design Complete`
- Package identifier: `interrupt-resend-retired-cleanup-stuck`
- Current solution revision: `SR-002`
- From: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-08

## Original Request

Project Task `project_task_9167f6b9-9b93-42ca-b20d-333d9619fbe6`, delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): a standalone Daily Assistant run on Antigravity became permanently unusable after Interrupt plus an immediate resend ("Agent run '…' still owns retired cleanup."). Fix the root cause so a send right after an interrupt is accepted once cleanup finishes, or rejected with a clear temporary message, and never permanently blocked. Already-stuck runs must recover without losing history, errors must be understandable, the race must be covered by tests, and the user verifies in the desktop app.

## Goals And Approval Basis

- Requirements: SR-001, **Approved** by the user on 2026-10-08 in the Solution Designer conversation ("I like your suggestion. Let's go."). DEC-001 = Option A: wait for cleanup and then deliver; after a 30 s bound or a failure, show a retryable plain-language error.
- Design: SR-002, `design-spec.md`, status Ready. Intended behavior is unchanged from SR-001.
- Behavior-defining supplements: None.

## Root Cause (summary)

When a published run's backend goes inactive, the registry's inactive discovery moves it to `retired`. Only an explicit termination clears `retired`, and `claim()` refuses a new activation while the id is retired. Team members and delegated copies exact-release the old run before re-activating. The standalone run path never does, and it then caches the refusal as a quarantine until restart. Antigravity interrupt stops the AGY process, so every AGY interrupt triggers this; other runtimes trigger it only when the runtime exits on its own. Introduced in `028cca231` (2026-10-05). Reproduced by a unit probe and confirmed in the production server log.

## Design (summary)

- C-1 `errors.ts`: new retryable code `AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING` (not a quarantine code).
- C-2 registry: `getRetiredRun(runId)`; the retired-claim refusal uses the new code with a plain message.
- C-3 `AgentRunManager.releaseRetiredRun(runId)`: exact release of the owed run through the existing `releaseExactRun`; failure becomes the new code.
- C-4 standalone lifecycle: inside the per-run transition lane, after the existing active and quarantine checks, wait up to 30 s for `releaseRetiredRun`, then activate. The new code is never cached as a quarantine.
- C-5 configured handle: a failed previous release in `initializeReady` marks the readiness attempt retry-safe (fixes the latent permanent-stuck state, R-001).
- Tests: unit (registry, manager, lifecycle including timeout and concurrency, handle) and a new deterministic fake-AGY E2E `tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts` for interrupt + immediate and delayed resend.

## Classification

- `task_size`: **Medium** — 5 production files in existing owners; no API, persistence or web change.
- `architectural_risk`: **High** — concurrency/lifecycle ordering change at the activation/termination boundary (racing an in-flight interrupt), plus reclassification of an error that both the quarantine and the team retry-safety logic depend on; the regression originated in this same area.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck`
- Branch: `codex/interrupt-resend-retired-cleanup-stuck`
- Base: `origin/personal` @ `ace86bf1f` (fetched 2026-10-08)
- Finalization target: `origin/personal`
- Dependencies installed in the worktree (`pnpm install --frozen-lockfile`). No source changes yet; ticket artifacts are untracked.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/solution-revision-record.md`
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/evidence/` (user screenshot, server log excerpt, reproduction probe)
- Prior architecture review artifacts: N/A — not applicable (first review).
- Product Design artifacts: N/A — not applicable.

## Open Risks / Uncertainty

- ASM-001: AGY restore by conversation id after an interrupt-stop (expected to match restart restore) — confirm in validation.
- A brief stale offline status from the old run may reach the session before it rebinds (cosmetic).
- AC-007 requires the user's desktop verification on the stuck run `daily_assistant_feb311e786054ec1acd79eae16d785f9` after installing the fixed build.

## Routing

- Handoff rules applied (2026-10-08): `architectural_risk=High` matches the rule "Architecture Design Complete with task_size=Large or architectural_risk=High … ready for independent architecture review" -> `/software_engineering_team/architecture_reviewer`.
- Expected output: architecture review report (Pass / Fail / Blocked) on SR-002.
