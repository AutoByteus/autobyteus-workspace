# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record only locates the baseline and later deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer pass, `design-review-report.md`, ARCH-REV-001 | N/A (REC-001, REC-002 applied; REC-003 doc nit, designer-owned) | `Initial Baseline` | SR-001, SR-002, ARCH-REV-001 | Implemented C-1..C-5 plus tests; commit `fccd1a009` |

## Revision Entries

### IR-001 — Release a standalone run's offline runtime before restoring it

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/design-review-report.md`, ARCH-REV-001 (Pass)
- Triggering finding IDs: N/A. Non-blocking recommendations REC-001 and REC-002 were applied. REC-003 (the design spec says "Four production files" but there are five) is a design-doc nit owned by the Solution Designer; no code impact.
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: C-1..C-5 implemented as designed; unit, integration-shaped lifecycle and fake-AGY E2E coverage added; implementation commit `fccd1a009` on `codex/interrupt-resend-retired-cleanup-stuck`.
- Related solution revision IDs: SR-001 (requirements, DEC-001 = A), SR-002 (design)
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: First implementation handoff.
- Approved behavior or requirement IDs affected: BEH-002..BEH-006; REQ-001..REQ-007; AC-001..AC-006, AC-008 (AC-007 is user desktop verification); QR-001, QR-002.
- Implementation delta:
  - C-1 `errors.ts`: new code `AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING` and `PreviousRuntimeReleasePendingError` (a subclass, like the existing `PlatformAgentRunRestoreError`) with the plain message. The quarantine predicate is unchanged.
  - C-2 `agent-run-activation-registry.ts`: `getRetiredRun(runId)`. The retired-claim refusal now throws `PreviousRuntimeReleasePendingError`; the "still owns retired cleanup" text is gone.
  - C-3 `agent-run-manager.ts`: `releaseRetiredRun(runId)`. No-op when nothing is retired. Otherwise `releaseExactRun(retired)`. A throw or non-accepted result is logged and becomes `PreviousRuntimeReleasePendingError(cause)`.
  - C-4 `standalone-agent-run-lifecycle-service.ts`: `awaitPreviousRuntimeRelease` runs in `resolveInsideTransition` after the active and quarantine checks, before `activateOnce`. `PREVIOUS_RUNTIME_RELEASE_WAIT_MS = 30_000`. The timer is cleared in `finally`; the in-flight release gets `.catch` when the wait fails (REC-002). The retryable code is not quarantined.
  - C-5 `configured-agent-execution-handle.ts`: a failed previous exact release (throw or not accepted) calls `markRetrySafe()` and rethrows. `this.agentRun` is kept.
- Changed files or areas: the five source files above. Tests: the registry, manager, lifecycle and handle unit tests; `tests/fixtures/agent-run-preparation-fixtures.ts` (the fake manager gets a default `releaseRetiredRun`); `tests/fixtures/agy-failure-cli.mjs` (new `interrupt_resend` case); `tests/integration/run-history/memory-layout-and-projection.integration.test.ts` (adds `releaseRetiredRun` to the mock); new `tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts`.
- Local validation and result: see the handoff's Local Implementation Checks. Focused suites: 1939 passed. The new E2E passes 2/2, three repeated runs are stable, and on base source it fails with the production symptom. The full server suite has failures that already exist on base; the same set fails with this change and nothing else. Source typecheck is clean.
- Next recipient or routing: Code Reviewer (Medium / High route), per `get_handoff_rules`.
- Remaining limitations or risks: see the handoff's Known Risks (ASM-001 live AGY, AC-007 desktop, the generic wording on the GraphQL `restoreAgentRun` path, stale offline status before rebind, base test debt).
