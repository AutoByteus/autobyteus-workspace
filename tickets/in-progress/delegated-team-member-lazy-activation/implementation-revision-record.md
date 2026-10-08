# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record indexes the initial baseline and any later implementation deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / `handoff-architecture-design-complete.md` / initial | N/A | `Initial Baseline` | `SR-002` | Implementation complete; direct API/E2E route (Small/Low) |
| IR-003 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-002 (SR-004 over SR-003); trigger CRR-002 | CR-FO-001/002/003; AR-NB-001..003; DI-001 (resolved by SR-004 option A) | `Design Revision Implementation` (supersedes IR-002) | `SR-003`, `SR-004`, `ARCH-REV-001`, `ARCH-REV-002`, `CRR-002` | One shared member start-failure step (`startForInput`) for `reserveInput` and `postMessage`; `readiness_failure` kept as the conversation card, with an explicit adapter branch |
| IR-002 | Code Reviewer / `code-review-report.md` / CRR-001 (API/E2E failure-origin review of API-REV-001 DTL-003) | CR-FO-001 (fixed); CR-FO-002 (design-spec note, not implementation) | `Local Fix` | `SR-002`, `CRR-001`, `API-REV-001` | Teammate delivery to a not-started member that cannot start returns a rejected reservation naming the cause, and the member shows `error` |

## Revision Entries

### IR-001 — Delegated Team copies prepare scope only; members start on first work

- Triggering role, report path, and round: `/software_engineering_team/solution_designer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/handoff-architecture-design-complete.md`, initial round
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Flat Team preparation never activates members. Both task-Team preparation owners (`RootTeamExecutionDirectory.beginRootTaskTeam`, `TaskTeamExecutionRegistry.beginPreparation`) return `stagedPlatformBindings: []`. The coordinator activates through the delegated seed; other members activate when work reaches them and adopt their provider binding into the root tree at that point. The eager plumbing (`prepareConfiguredAgents`, `FlatTeamExecutionManager.prepareConfiguredActivation`, `prepare-flat-team-configured-activation.ts`, the staged-binding fields on `PreparedFlatTeamExecution`) is removed.
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: Initial implementation handoff baseline.
- Approved behavior or requirement IDs affected: BEH-001, BEH-005 (changed); BEH-004 (now also exercised by fresh copies); BEH-002/003/006 preserved. REQ-001..006 / AC-001..006 covered by executable tests; AC-007 is user verification.
- Implementation delta: see `implementation-handoff.md` "Key Files Or Areas". Source: 7 files modified, 1 deleted. Tests: 9 files updated (1 renamed), 1 new file (18 cases across the three root kinds).
- Changed files or areas: `autobyteus-server-ts/src/agent-team-execution/local/{flat-team-execution-factory,task-team-execution-factory,flat-team-execution-manager}.ts`, `.../local/registries/{task-team,collaborator-team}-execution-registry.ts`, `.../services/team-root-materializer.ts`, `src/agent-collaboration/execution/backends/root-team-execution-directory.ts`; deleted `.../local/prepare-flat-team-configured-activation.ts`; tests listed in the handoff.
- Local validation and result: `tsc -p tsconfig.build.json --noEmit` passes. Focused suites pass. The full server unit + integration run has 0 new failures compared with base `ace86bf1f` (155 failed after the change vs 172 on base; all 155 also fail on base).
- Next recipient or routing: per `get_handoff_rules` (Small/Low direct route → API/E2E).
- Remaining limitations or risks: R-001 (an unused member's start failure surfaces at first work), R-002 (copies already live keep eagerly started members until shutdown/restart). Docs sync for `docs/modules/agent_team_execution.md:248` is left to Delivery.

### IR-002 — Teammate delivery reports a member start failure instead of throwing

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/code-review-report.md`, CRR-001 (failure-origin review of API-REV-001, case DTL-003)
- Triggering finding IDs: CR-FO-001 (blocking, fixed). CR-FO-002 (design-spec DS-002 trace names `postMessage`, but teammate delivery actually goes through `reserveInput`) is for Solution Designer/Delivery, not an implementation change.
- Classification: `Local Fix`
- Prior authoritative result: IR-001. Teammate delivery (`RootCommunicationEngine.deliver` → root `reserveAgentInput` → `TeamRun.reserveDirectAgentInput`/`rootAgents.reserveInput` → `ConfiguredAgentExecutionHandle.reserveInput`) to a not-started member that cannot start threw out of `ensureReady()`. The sender got MCP `-32603 Internal error` and the member stayed `offline`.
- Current authoritative result: `ConfiguredAgentExecutionHandle.reserveInput` now handles failure the same way as `postMessage`. It publishes the `initializing` command status. If readiness fails while no run is active, it publishes the `error` overlay with the failure message and returns `{ reserved: false, code: "AGENT_RUN_ACTIVATION_FAILED", message: <cause> }`. If a run is active, it rethrows. The engine's existing `reserved: false` mapping carries the cause to the sender (for example `AGY_MODEL_UNAVAILABLE: <model>`).
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: Local Fix for CR-FO-001 (AC-004 / REQ-005, member branch).
- Approved behavior or requirement IDs affected: BEH-005, REQ-005, AC-004. This also makes configured members of UI-started Teams and Orgs report a start failure on teammate delivery as not-accepted plus `error`, instead of an internal error. That matches REQ-005's intent and is the reviewer's noted residual.
- Implementation delta:
  - `agent-execution/input/agent-run-input-contract.ts`: added one explicit rejection code, `AGENT_RUN_ACTIVATION_FAILED`, to the closed `AgentRunInputRejectionCode` union. The message carries the cause.
  - `agent-collaboration/execution/backends/configured-agent-execution-handle.ts`: `reserveInput` now handles failure as described above.
  - No `readiness_failure` consumer was added and no per-root try/catch: the shared handle remains the single owner.
- Changed files or areas: the two source files above. Tests: `tests/unit/agent-collaboration/delegated-team-lazy-member-activation.test.ts`. Added 2 reservation-path cases × 3 roots, gave the fake run `reserveUserMessage`, and made the controlled start failure use the real AGY error shape.
- Local validation and result:
  - `tsc -p tsconfig.build.json --noEmit` passes.
  - New file: 24/24.
  - The new failure case fails in all 3 roots without the fix and passes with it.
  - Affected suites (`tests/unit/{agent-collaboration,agent-team-execution,agent-org-execution,standalone-agent-run-root,agent-execution,agent-tools}`, `tests/integration/{agent-team-execution,collaboration-definition-admission,standalone-agent-run-root,agent-execution}`; 2374 tests) on HEAD `09cc6d5cc`, with and without the fix: 0 new failures. 25 fail with the fix, 28 without, and the 25 are all pre-existing in `tests/integration/agent-execution/*`.
  - Local run of the durable E2E (E-01 command from `api-e2e-execution-coverage-report.md`): 2/2 pass, including DTL-003. This is a local implementation check only, not API/E2E sign-off.
- Next recipient or routing: per `get_handoff_rules` (direct Small/Low Local Fix → API/E2E).
- Remaining limitations or risks: R-001/R-002 unchanged. A fenced or closed member now also returns a rejected reservation with `error` status on teammate delivery, instead of throwing. This is the same behavior as `postMessage` for that case.

### IR-003: One member start-failure step for both input entry points (SR-003 + SR-004; supersedes IR-002)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/design-review-report.md`, ARCH-REV-002 (Pass on SR-004 over SR-003). Root trigger: code review CRR-002.
- Triggering finding IDs:
  - CR-FO-001/002/003 (CRR-002);
  - AR-NB-001..003 (ARCH-REV-001);
  - DI-001 (this role; resolved by SR-004 option A).
- Classification: design revision implementation. It supersedes IR-002 in one commit on top of `d30c11204`, replacing it rather than extending it.
- Prior authoritative result: IR-002. `reserveInput` had its own copy of `postMessage`'s readiness try/catch. The two entry points used different codes: `postMessage` returned the underlying code.
- Intermediate (not committed): a first attempt at SR-003 removed `readiness_failure` and was stopped as Design Impact DI-001. The event feeds the member's conversation error card through the presentation adapter's implicit fall-through. See `implementation-design-impact-ir-003.md` and the saved `ir-003-wip-start-for-input.patch`. Both are historical and superseded by this entry.
- Current authoritative result:
  - `ConfiguredAgentExecutionHandle.startForInput()` (private) is the one step for "start this member for an input, or say why not". It is used by `reserveInput` and `postMessage`; neither keeps its own readiness try/catch.
    - A failure on a live run is rethrown.
    - Input closed now (re-checked with `assertInputAllowed()`, which also covers the root-shutdown fence) gives `AGENT_RUN_NOT_ACCEPTING_INPUT` with the fence message, no `error` status, and only our own `initializing` withdrawn.
    - Any other failure gives an `error` overlay plus `AGENT_RUN_ACTIVATION_FAILED`, with `message` = `<code>: <message>` of the underlying cause.
  - Both result shapes use the same codes.
  - `readiness_failure` stays as the member's conversation error card. It is emitted once per failed start in `initializeReady`, and not when input is closed at that point.
  - `CollaborationAgentPresentationEventAdapter.adapt` handles `readiness_failure` by name and ends with an exhaustive `never` check. The `ERROR` output is unchanged.
  - `readinessFailureCode()` is replaced by one module-private cause helper, `describeActivationFailure`. It serves the indeterminate wrapper (which now keeps the underlying code and appends the underlying message), the card, and `startForInput`.
  - `postMessage` after a successful start is unchanged (AR-NB-003).
- Related solution revision IDs: `SR-002`, `SR-003`, `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001`, `CRR-002`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: implementation of the reviewed SR-003/SR-004 design revision, replacing IR-002.
- Approved behavior or requirement IDs affected: REQ-005 / AC-004 (both entry points); REQ-003 (truthful status); BEH-002 / REQ-007 (conversation card preserved).
- Implementation delta:
  - `src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts`: as above. +37 effective lines, 470 total.
  - `src/agent-collaboration/execution/events/collaboration-agent-presentation-event-adapter.ts`: explicit `readiness_failure` branch plus a `never` check.
  - `src/agent-collaboration/execution/domain/collaboration-agent-execution-event.ts`: doc comment on the kept variant.
  - `src/agent-execution/input/agent-run-input-contract.ts`: doc comment saying the code covers both result shapes.
- Tests:
  - `tests/unit/agent-collaboration/configured-agent-execution-handle.test.ts`: optional input gate added to the fixture, plus 10 new cases.
    - For both entry points: activation failure (typed result with the cause, `error` status, exactly one card, later retry starts); closed-input race (`AGENT_RUN_NOT_ACCEPTING_INPUT`, `offline`, no card); an existing `error` is not withdrawn by a closed-input outcome; a failure on a live run is rethrown.
    - The indeterminate wrapper names the underlying cause.
    - An adapter explicit-branch regression test.
  - `tests/unit/agent-collaboration/configured-root-first-work.test.ts`: asserts `AGENT_RUN_ACTIVATION_FAILED` with the underlying code in `message`, for `COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING` / `..._STATE_UNREADABLE` / `..._BINDING_CACHE_COMMIT_FAILED`.
  - Unchanged: IR-002's reservation-path cases per root (`delegated-team-lazy-member-activation.test.ts`) and the existing `readiness_failure` assertions (`flat-team-member-release-independence.test.ts`, `task-agent-execution-registry-memory.test.ts`).
- Local validation and result:
  - `tsc -p tsconfig.build.json --noEmit` passes.
  - Handle test file: 31/31. `configured-root-first-work.test.ts`: 48/48.
  - Affected suites (`tests/unit/{agent-collaboration,agent-team-execution,agent-org-execution,standalone-agent-run-root,agent-execution,agent-tools,services}`, `tests/integration/{agent-team-execution,collaboration-definition-admission,standalone-agent-run-root,agent-execution,agent}`), compared with HEAD `d30c11204` (source and tests stashed): 0 new failures. 33 fail in both runs (2737 tests with the change, 2727 without). All 33 are pre-existing, in unrelated agent-execution, agent websocket, md-centric-provider and media-storage suites.
  - Local run of the durable `tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts` (E-01 command, with the API/E2E engineer's uncommitted edits to that file present): 2/2 pass, including DTL-003. This is a local check, not API/E2E sign-off.
- Next recipient or routing: per `get_handoff_rules`. The classification is now Small/High, so the change goes to independent code review first.
- Remaining limitations or risks:
  - The closed-input predicate runs in two catches a few awaits apart: `initializeReady`, which decides the card, and `startForInput`, which decides the result and status. In the Task DONE / reactivation race, the two could disagree once. I did not take the optional single-evaluation refinement: failures rejected at the top of `ensureReady` never reach `initializeReady`, so `startForInput` still needs its own check. The reviewer accepted this as designed.
  - Pre-existing and unchanged: a failed start's cleanup (`releaseRuntime(false)` → `dispose()`) clears the status overlay locally without publishing. A member that was already `error` and hits a closed-input race during a later start therefore reads `offline` from snapshots, while subscribers keep the last published `error`.
  - In the closed-input branch, withdrawing our own `initializing` clears only the local snapshot. Subscribers keep the published `initializing` until the member's next status. The design specifies this, and the branch only covers a race.
  - Pre-existing (ARCH-REV-002 residual): a throw from `FlatTeamAgentExecutionHandle.getHandle()` / `createHandle()`, before the configured handle exists, still escapes `reserveInput`.
