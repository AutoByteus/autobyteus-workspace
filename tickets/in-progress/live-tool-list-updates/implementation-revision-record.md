# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-004 (Pass) | N/A | `Initial Baseline` | `SR-004`, `ARCH-REV-004` | Ready for Code Review |
| IR-002 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-009 (Pass), after Code Reviewer CRR-001 | CR-001 (via SR-005…SR-009), CR-002, CR-003 | `Design Impact Rework` + `Local Fix` | `SR-009`, `ARCH-REV-009`, `CRR-001` | Ready for Code Review |

## Revision Entries

### IR-001 — Live tool list updates, steps 1–7

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `tickets/in-progress/live-tool-list-updates/design-review-report.md`, ARCH-REV-004 (Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: branch `codex/live-tool-list-updates` on base `origin/personal` @ `9f7c9c10a6`:
  - `f733da620e` step 1 (Agent Tools endpoint);
  - `e4746ade4e` step 2 (change signal);
  - `119bf31636` the Solution Designer's `Agent.replaceTools` clarification (design-spec, one row);
  - `a9cc802d99` steps 3–6 (run side, Claude/AGY, native, Codex/Grok, web) — one commit, because the backend contract change ties the five backends together;
  - `5cc31e6eca` step 7 docs;
  - the ticket artifacts and evidence commit that follows.
- Related solution revision IDs: `SR-004` (plus the step-5 clarification).
- Related architecture-review revision IDs: `ARCH-REV-004`.
- Related code-review revision IDs: `N/A`. Related API/E2E revision IDs: `N/A`. Related delivery revision IDs: `N/A`.
- Why recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001…BEH-004; REQ-001…REQ-010; AC-001…AC-008.
- Implementation delta: see `implementation-handoff.md` "Current Implementation Summary".
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas".
- Implementation-time corrections found by tests (all fixed before handoff):
  - `ToolListUpdateService.runPublished` registered its tracking entry after starting tracking; for a new run tracking ran to its "released meanwhile" check synchronously and dropped the run. The entry now exists before tracking starts (found by the integration test).
  - `resolveTurnToolNames` fell back to the configured tools when the instance map was empty, so removing every native tool would have restored the original list. The fallback now applies only before instances are prepared.
  - `AgentToolsMcpSessionStreams` used `JSON.stringify`, which the agent-tool result boundary architecture rule forbids outside its allow-list: the frame is a literal and the closing reply has no body.
- Local validation and result: see `implementation-handoff.md` "Local Implementation Checks Run".

### IR-002 — Remove the restart button and the failure notice; Team-member error; CR-002, CR-003

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, ARCH-REV-009 (Pass) on SR-009, following `code-review-report.md` CRR-001 (Fail: CR-001 Design Impact; CR-002, CR-003 Local Fix).
- Triggering finding IDs: CR-001 (resolved upstream as DEC-008, DEC-009, SR-005…SR-009), CR-002, CR-003.
- Classification: `Design Impact Rework` (CR-001's outcome) and `Local Fix` (CR-002, CR-003).
- Prior authoritative result: IR-001 at `f8affdd0fe` (code at `5f3923c4cd`).
- Current authoritative result: the IR-002 commit on `codex/live-tool-list-updates` (see the handoff and git log).
- Related solution revision IDs: `SR-005`…`SR-009`. Related architecture-review revision IDs: `ARCH-REV-009`. Related code-review revision IDs: `CRR-001`.
- Approved behavior or requirement IDs affected: BEH-004, REQ-010, AC-007 (now: a failed reopen fails the message with a plain error; no button; a Team member sees it in its conversation).
- Implementation delta:
  - Removed (Removal plan rows for DEC-008 and DEC-009): `restartRunWithNewTools` and its tests; the segment button, `runId` prop, `restart_run` handling, `isToolsReopenFailure`; the `action` field (payload, segment, handler); `toolsReopenFailed` and the three restart strings (en, zh-CN) and the spec key checks; `buildRuntimeSessionReopenFailedNotice`, `RUNTIME_SESSION_REOPEN_FAILED_NOTICE`, `RESTART_RUN_NOTICE_ACTION` and the Codex/ACP publish calls (and Codex's then-unused `publishSourceEvents`); the docs passages.
  - `runtimeSessionReopenFailedResult(error)`: `{ forwarded: false, code: "RUNTIME_SESSION_REOPEN_FAILED", message: "Couldn't give this run its new tools (<cause>). Send your message again to retry, or stop and resume the run.", turnId: null }`.
  - Team members: `ConfiguredAgentExecutionHandle.postMessage` lifecycle observer → run `ERROR` (no evidence) via `publishAgentEvent`.
  - CR-002: Claude tool-list logic in `ClaudeAgentToolsMcpSessionState` (`currentToolNames`, `applyExposure`).
  - CR-003: non-null `workingDirectory` on `AcpAgentRunBackendInput`.
- Tests: reopen tests assert the plain failed dispatch and no notice event (Codex, Grok); new integration `tests/integration/agent-collaboration/team-member-reopen-failure.integration.test.ts` (real handle, AgentRun and presentation adapter: the failing member's Team stream gets `ERROR` with the message, the other member nothing; verified to fail without the handle change); web `TeamStreamingService.spec.ts` (the member's conversation shows the error segment, the other member's nothing).
- Local validation and result: see `implementation-handoff.md` "Local Implementation Checks Run" (IR-002 block).

