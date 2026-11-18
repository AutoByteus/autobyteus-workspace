# Implementation Revision Record — atomic-agent-run-creation (autobyteus-349)

The current code and `implementation-handoff.md` are authoritative. This record indexes implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/software_engineering_team/architecture_reviewer`, `design-review-report.md` (ARCH-REV-002 Pass) | N/A | `Initial Baseline` | SR-004, ARCH-REV-002 | D1, D2 and the startup stage implemented with tests and docs; ready for code review |

## Revision Entries

### IR-001 — Undo a failed one-call creation; remove empty never-started runs at startup

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` (ARCH-REV-002 `Pass`), 2026-10-31.
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: design-spec § Change / Refactor Sequence steps 1–4 done; step 5 (validation) belongs to API/E2E.
- Related solution revision IDs: SR-004 (design), SR-002 (approval).
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001 (REQ-001; AC-001, AC-002), BEH-002 (REQ-002; AC-003); preserved BEH-003 (REQ-003; AC-005).
- Implementation delta:
  1. D1: `AgentRunService.createAgentRun` wraps activation; on error it calls `provisioningService.cancelPreparedAgentRun(runId)` (its own rejection becomes a failed result), logs a refusal with the run ID and reason, and rethrows the activation error.
  2. D2: `AgentRunProvisioningService.removeEmptyNeverStartedRuns()` replaces `cleanupStalePreparedRuns` (both methods; the old test removed; `PREPARED_RUN_TTL_MS` kept). No-follow content walk `holdsOnlyItsRecord`; record read through `readMetadataState`; skip rules and logging per the design; never throws.
  3. Startup: one `shutdown.stage(() => getAgentRunService().removeEmptyNeverStartedRuns())` in `server-runtime.ts` after `buildStudioServer`, before `prepareBeforeListen`.
  4. Tests: `agent-run-empty-never-started-removal.test.ts` (new), `agent-run-create-undo.test.ts` (new), `agent-run-create-service.test.ts` (4 cases), the startup-gate test (order assertion and a cancel-during-stage case).
  5. Docs: `agent_execution.md`.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas. Code commits `c533fc0b5b` and `93fa105819` (the architecture guard's allowlist entry for `server-runtime.ts`).
- Local validation and result: IMP-01 to IMP-05 pass on `93fa105819`; the new tests fail on base code and under the three rule mutations (see `implementation-handoff.md` § Checks Run).
- Next recipient or routing: Code Reviewer (Small / High), per `get_handoff_rules`.
- Remaining limitations or risks: FU-001 to FU-004; N-4 (stage startup time, for validation); folders without a standalone record are logged as one count line, not one line each (see the handoff).
