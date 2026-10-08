# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record only locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer / design-review-report.md / round 1 (Pass) | N/A (applied AR-N-001, AR-N-002) | `Initial Baseline` | SR-002, ARCH-REV-001 | Idle shutdown removed; ready for code review |
| IR-002 | code_reviewer / code-review-report.md / CRR-001 round 1 (Fail, Local Fix) | CR-001 (+ optional doc rewrap) | `Local Fix` | SR-002, ARCH-REV-001, CRR-001 | Dead standalone `enterLifecycleFailStop` deleted; ready for delta review |

## Revision Entries

### IR-001 — Remove idle shutdown of delegated copies

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/design-review-report.md`, round 1 (Pass)
- Triggering finding IDs: N/A (non-blocking notes AR-N-001 and AR-N-002 applied; AR-N-003 is Solution Designer-only)
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Implementation complete; local checks green apart from unrelated base failures; AC-001 live before/after evidence recorded
- Related solution revision IDs: SR-001, SR-002
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: First implementation of DEC-004.
- Approved behavior or requirement IDs affected: REQ-001..REQ-005; AC-001..AC-006; BEH-001, BEH-002, BEH-004, BEH-007, BEH-008 (preserved)
- Implementation delta: Deleted the grace schedule, setting, Org event retirement and the whole quiet-termination chain; `withLiveLease` → `withLiveChain` (no leases); `onAgentStatus` forwards status only; queue kinds `activate | wake | reopen`; adapter interface without `tryShutDownIfQuiet`/`isLive`; adapter options without `publishAgentOffline`/`enterLifecycleFailStop`/`beginTaskExecutionEventRetirement`; LLM contract sentence replaced; docs and tests updated; new gated live E2E for AC-001 and an AC-004 settings test. Separate baseline commit `ba0437e00` fixes a pre-existing stale API call in `mixed-team-run-backend.integration.test.ts`.
- Changed files or areas: see implementation-handoff.md "Key Files Or Areas" (38 source files: +90/−811; 3 source files deleted; about 25 test files; 13 docs)
- Local validation and result: build and test typechecks pass; focused server suites 2627 passed (1 base failure); full unit suite fails only the 43 base failures; the two touched integration files pass; live Claude E2E before = expected FAIL (task stopped at 60 s), after = PASS (report at 91 s, marker written)
- Next recipient or routing: `/software_engineering_team/code_reviewer`
- Remaining limitations or risks: `mixed-task-delegation.e2e.test.ts` not run (needs LM Studio + Codex + Claude); AGY not exercised live; unrelated base failures reported separately (43 unit and 23 integration tests, identical on base)

### IR-002 — Delete the dead standalone `enterLifecycleFailStop` (CR-001)

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/code-review-report.md`, CRR-001 round 1 (Fail, Local Fix)
- Triggering finding IDs: CR-001; optional AgentRunTermination doc-comment rewrap
- Classification: `Local Fix`
- Prior authoritative result: IR-001 — standalone root kept `enterLifecycleFailStop()` after AR-N-002 removed its only caller (the adapter-option wiring)
- Current authoritative result: method deleted; no caller existed in src or tests. The Team and Org roots keep theirs (real callers: team-root-materializer, binding committer, agent-org-execution-scope-builder)
- Related solution revision IDs: SR-002
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: REQ-004 / AC-005 (no idle-only dead path)
- Approved behavior or requirement IDs affected: REQ-004, AC-005 (no behavior change)
- Implementation delta: removed `enterLifecycleFailStop(): void { this.enterFailStop(); }` from `StandaloneAgentRunRoot`; rewrapped the `AgentRunTermination` class doc comment (was one 168-character line)
- Changed files or areas: `autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-agent-run-root.ts`, `autobyteus-server-ts/src/agent-execution/domain/agent-run-termination.ts`
- Local validation and result: grep for standalone `enterLifecycleFailStop` finds nothing; `tsc -p tsconfig.build.json --noEmit` pass; test typecheck clean (only the existing TS6059 notices); `vitest run tests/unit/standalone-agent-run-root tests/integration/standalone-agent-run-root tests/unit/agent-execution/agent-run.test.ts` 6 files, 80 tests passed; step-8 grep returns only the AC-004 settings test; AR-N-001 grep returns nothing
- Next recipient or routing: `/software_engineering_team/code_reviewer` (targeted delta review)
- Remaining limitations or risks: unchanged from IR-001
