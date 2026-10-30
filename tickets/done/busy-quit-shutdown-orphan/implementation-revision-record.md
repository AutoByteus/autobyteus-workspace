# Implementation Revision Record — busy-quit-shutdown-orphan

The current code and `implementation-handoff.md` are authoritative. This record indexes implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, round 3 (ARCH-REV-003 Pass) | N/A | `Initial Baseline` | SR-008, ARCH-REV-003 | Implemented D1–D3, the helper move and docs; ready for code review |
| IR-002 | `/software_engineering_team/code_reviewer`, `code-review-report.md`, round 2 (CRR-002 Fail, from API-REV-001 F-API-001) | CR-001 | `Local Fix` | SR-008, ARCH-REV-003, CRR-002, API-REV-001 | The shared reader drops its own `ps` row; back to code review |

## Revision Entries

### IR-001 — Stop-now fence, bounded server shutdown with a process-tree sweep, desktop tree force

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md`, round 3 (`Pass`), 2026-10-30.
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implementation complete per design-spec § Change / Refactor Sequence steps 1–5; step 6 (validation) belongs to API/E2E.
- Related solution revision IDs: SR-008 (design), SR-002 and SR-007 (approval).
- Related architecture-review revision IDs: ARCH-REV-003 (Pass; N-9 applied: one constructor).
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001 (user and app), BEH-002, BEH-003, BEH-004; REQ-001 to REQ-004; preserved BEH-005, BEH-007 (AC-010).
- Implementation delta:
  1. AGY's process-table helper moved to `autobyteus-server-ts/src/utils/process-tree.ts` (generalized to `selectDescendantProcessGroups(rows, rootPid, excludedPgids)` and `selectDescendantPidsInGroup(rows, rootPid, pgid)`, plus `readProcessTable`); AGY re-pointed with a private `listAgyBackgroundProcessGroups` in `agy-stream-process.ts`; no re-export shim; the old file removed; its test moved to `tests/unit/utils/process-tree.test.ts`.
  2. D1: `AgentRunManager.terminateAgentRun` fences first (not accepted → `false`); `stopAllAgentRuns` fences all runs concurrently (`Promise.allSettled`), then keeps the sequential finish; a rejected or not-accepted fence is collected in `errors` and that run is skipped. `AgentRunTermination` unchanged; no history writes.
  3. D2: `ServerProcessShutdown(runtime, { cleanupTimeoutMs, sweep, timers })`, 10 s bound starting after the startup barrier, then always the sweep; only `unconfirmed` (or the bound expiring, or a failed cleanup as before) sets exit 1 / IPC `failed`. New `src/shutdown/server-process-tree-sweep.ts` (`not-applicable` | `confirmed` | `unconfirmed`).
  4. D3: POSIX `BaseServerManager.forceStop`: async snapshot → SIGTERM recorded descendant targets → SIGKILL server → ≤ 1.5 s → SIGKILL recorded survivors. New `electron/server/serverProcessTree.ts`. Window, 2 s confirmation, `stopManagedBackend` and the Windows manager unchanged.
  5. Docs: `agent_execution.md` (Known-limit paragraph replaced, N-6 sentence), `antigravity_cli_runtime.md`, `electron_packaging.md`.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: IMP-01 to IMP-09 pass on implementation commit `bf2857ca29`; new D1 tests and the AC-011 test fail on base code (see `implementation-handoff.md` § Checks Run).
- Next recipient or routing: Code Reviewer (Medium / High route), per `get_handoff_rules`.
- Remaining limitations or risks: N-3, N-5/FU-007, N-7, U-A1, U-A2, U-A3 (validation-owned); see the handoff's Known Risks.

### IR-002 — The process-table reader drops its own `ps` row (CR-001)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md`, round 2 (CRR-002 `Fail`, failure-origin review of API-REV-001).
- Triggering finding IDs: CR-001 (F-API-001). F-API-002 is not implementation-owned (FU-008).
- Classification: `Local Fix`.
- Prior authoritative result: IR-001 (CRR-001 `Pass`; API-REV-001 `Fail` on F-API-001).
- Current authoritative result: CR-001 fixed; ready for the targeted source review.
- Related solution revision IDs: SR-008.
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: CRR-002.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: on every POSIX server exit the sweep selected the `ps` reader it had just run (a child of the server in the server's group, listed by itself), logged "1 process(es) … still running", SIGTERMed an already-reaped pid and counted it in `targets`. That broke the design's target invariant and its log contract (§ Ownership Boundaries, § Off-Spine Concerns).
- Approved behavior or requirement IDs affected: BEH-003 (REQ-003); outcome and exit code were already correct.
- Implementation delta: `src/utils/process-tree.ts` `readProcessTable` uses `spawnSync` (same args, 2 s timeout, stdio) and returns the table without the row whose pid is `result.pid`. It throws on a spawn error or a non-zero exit, as `execFileSync` did. AGY and the desktop copy are unchanged and get no branches (their readers are not descendants of their roots).
- Changed files or areas: `autobyteus-server-ts/src/utils/process-tree.ts`; `tests/unit/utils/process-tree.test.ts` (mocks `spawnSync`; reader-row and non-zero-exit cases); `tests/unit/shutdown/server-process-tree-sweep.test.ts` (idle server whose only child is the reader, through the default reader: `confirmed, 0`, no signal, no log). Code commit `83a73f24d7`.
- Local validation and result: IMP-10 (focused, 63 pass; 4 new/updated cases fail on IR-001's reader), IMP-11 (server typecheck), IMP-12 (build + gated real-process E2E: 2 pass, `sweepLines: []` where API-02 logged one line).
- Next recipient or routing: Code Reviewer (targeted delta), then API/E2E.
- Remaining limitations or risks: unchanged from IR-001.

