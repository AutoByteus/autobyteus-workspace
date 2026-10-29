# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-004 (Pass) | N/A | `Initial Baseline` | `SR-004`, `ARCH-REV-004` | Ready for Code Review |
| IR-002 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-009 (Pass), after Code Reviewer CRR-001 | CR-001 (via SR-005…SR-009), CR-002, CR-003 | `Design Impact Rework` + `Local Fix` | `SR-009`, `ARCH-REV-009`, `CRR-001` | Ready for Code Review |
| IR-003 | Code Reviewer / `code-review-report.md` / CRR-002 (Fail) | CR-004 | `Local Fix` | `SR-009`, `CRR-002` | Ready for Code Review |
| IR-004 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-010 (Pass), after API/E2E round 1 (API-05) and failure-origin review CRR-004 | API-05 (CRR-004 Design Impact) | `Design Impact Rework` | `SR-010`, `ARCH-REV-010`, `CRR-004` | Ready for Code Review |
| IR-005 | Delivery Engineer / `release-deployment-report.md` / DR-001 (Blocked: build-only release run `40950729360` failed `guard:localization-boundary`) | DR-001 | `Local Fix` | `DR-001` | Ready for Code Review |

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

### IR-003 — CR-004: publish a Team member's failed message only when it was not sent

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CRR-002 (Fail, Full Re-Audit), probe `evidence/CRR-002-probe-team-member-duplicate-error.log`.
- Triggering finding IDs: CR-004 (blocking, introduced by IR-002: every ordinary failed turn of a member's direct input showed its error twice; a runtime failure added one per pending input).
- Classification: `Local Fix`.
- Prior authoritative result: IR-002 at `60d9d78d43` (code `c4da95428e`).
- Current authoritative result: the IR-003 commit on `codex/live-tool-list-updates` (see git log).
- Related solution revision IDs: `SR-009` (unchanged: its own no-duplicate premise). Related code-review revision IDs: `CRR-002`.
- Implementation delta:
  - New `agent-collaboration/execution/backends/member-input-failure-observer.ts` (owned by the handle): publishes a run `ERROR { code, message }` only when no `forwarded` fact came before the `failed` one **and** the code is not one of `RUN_EVENT_INPUT_FAILURE_CODES` (`RUNTIME_TURN_FAILED`, `RUNTIME_GLOBAL_FAILURE`, now exported from `agent-run-input-lifecycle.ts` beside the code that produces them). The second condition goes slightly beyond the reviewer's rule 1: a still-queued input failed by the run's own runtime-global ERROR has no `forwarded` fact either, and the run already published that ERROR, so publishing it would duplicate it (the "one extra error per pending input" in CR-004).
  - `|| "RUNTIME_REJECTED"` dropped: every `failed` fact carries a non-empty code (`agent-run-input-admission-state.ts`: dispatch results use `requiredString(result.code) ?? "RUNTIME_COMMAND_FAILED"`; every other source is a literal).
  - `configured-agent-execution-handle.ts`: 485 non-blank lines at base, 487 now.
  - Docs: `tool_list_updates.md` and `agent_execution.md` say "a failed message that was not sent".
- Tests:
  - `team-member-reopen-failure.integration.test.ts`: the reopen case asserts exactly `RUNTIME_SESSION_REOPEN_FAILED`. New case: a sent member turn that fails with a turn-terminal ERROR gives exactly one ERROR on the Team stream (the run's own, `PROVIDER_ERROR`). Checked to fail when the observer publishes on every `failed` fact (IR-002's behavior).
  - New unit `tests/unit/agent-collaboration/member-input-failure-observer.test.ts`: not-sent failure published; failures after `forwarded` not published; a queued input failed by `RUNTIME_GLOBAL_FAILURE`/`RUNTIME_TURN_FAILED` not published; other facts ignored.
- Local validation and result: see `implementation-handoff.md` (IR-003 block) and `evidence/local-checks.log`.

### IR-004 — SR-010: one shared unsent-input failure rule, now also for single runs

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, ARCH-REV-010 (Pass) on SR-010, after API/E2E round 1 (API-05: a single run's failed, unsent message was silent on the run stream; `evidence/api-e2e/API-05-failed-send-frames.jsonl`) and the code reviewer's failure-origin review CRR-004 (Design Impact).
- Classification: `Design Impact Rework`.
- Prior authoritative result: IR-003 at `8aaf2740fd` (code `c8f6319838`; CRR-003 Pass).
- Current authoritative result: code commit `011275b49a` on `codex/live-tool-list-updates`.
- Related solution revision IDs: `SR-010`. Related architecture-review revision IDs: `ARCH-REV-010`. Related code-review revision IDs: `CRR-004`.
- Implementation delta:
  - The rule moved, unchanged, from `agent-collaboration/execution/backends/member-input-failure-observer.ts` to `agent-execution/input/unsent-input-failure-observer.ts` as `createUnsentInputFailureObserver({ runId, publish })` (`git mv`; no old file left). Its unit test moved to `tests/unit/agent-execution/input/unsent-input-failure-observer.test.ts`. The Team handle imports it.
  - `AgentRunCommandCoordinator.post` composes its `lifecycleObserver` from `applyInputLifecycle` plus the shared observer, for both the standalone-owned and the direct branch. `publish` sends `getAgentRunEventMessageMapper().map(event)` through `this.broadcaster.publishToRun(runId, …)` (new `publishRunEvent`, shaped like `publishStatus`); never `AgentRun.publishEvent`. The coordinator goes from 320 (base) to 338 non-blank lines.
  - Docs: `tool_list_updates.md`, `agent_execution.md`, web `agent_execution_architecture.md` describe the one shared rule for single runs and Team members.
- Tests:
  - Shared-rule unit tests (moved): not sent → `ERROR`; after `forwarded` → nothing; `RUNTIME_TURN_FAILED` / `RUNTIME_GLOBAL_FAILURE` → nothing; other facts ignored.
  - New `tests/integration/agent-execution/single-run-unsent-input-failure.integration.test.ts` (real coordinator, real AgentRun): a reopen failure gives exactly one `ERROR` frame with `RUNTIME_SESSION_REOPEN_FAILED` and the message; a sent turn that then fails gives no coordinator `ERROR` frame (the run's own ERROR is published by the run). The first case fails against the coordinator without the change.
  - The API-05 e2e (`tests/e2e/runtime/tool-list-reopen-failure.e2e.test.ts`), unchanged, now passes (`evidence/ir-004-api-05-rerun.log`).
- Local validation and result: see `implementation-handoff.md` (IR-004 block) and `evidence/local-checks.log`.

### IR-005 — DR-001: the notice spec reads its messages through the localization runtime

- Triggering role, report path, and round: `/software_engineering_team/delivery_engineer`, `release-deployment-report.md` / `delivery-revision-record.md`, DR-001. The build-only desktop release run `40950729360` on `personal` @ `be9e78dc93` failed "Build Linux x64" and "Build Linux ARM64" at `pnpm guard:localization-boundary`.
- Triggering finding IDs: DR-001.
- Classification: `Local Fix` (this ticket's test code; introduced in `a9cc802d99`, kept in `c4da95428e`). My earlier web checks ran the suites and the typecheck but not this guard, which is how it got through.
- Prior authoritative result: merged on `personal` @ `be9e78dc93`; delivery blocker record `4fb1c1640d`.
- Current authoritative result: the IR-005 commit on `codex/live-tool-list-updates`, fast-forwarded to `origin/personal` @ `4fb1c1640d` first (no revert).
- Implementation delta: `autobyteus-web/components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts` no longer imports `~/localization/messages/en/workspace` and `~/localization/messages/zh-CN/workspace`. It reads both locales through `getCatalog('en')` / `getCatalog('zh-CN')` from `~/localization/runtime/catalogRegistry`, as `ServerMigrationsManager.spec.ts` does. The assertions are unchanged: the en label is exactly "Tools updated", the zh-CN label exists, and the "Tools updated" card tests are untouched.
- Local validation and result: `evidence/ir-005-localization-guard-fix.log`. Each guard was run on its own with its own exit code: `guard:web-boundary` 0, `guard:localization-boundary` 0 (1 against the old file), `audit:localization-literals` 0 (zero unresolved findings). The spec passes 8/8. In the full web suite, Nuxt passed 668 files / 4,860 tests. Electron's first run had one failure in `PortOwnerInspectorFaults.spec.ts`: the deadline fixture's child was killed at 1000 ms before it wrote its pid file, because the machine was loaded. This ticket touches nothing under `electron/`. The file passed 11/11 alone, and the Electron re-run passed 279/279.

