# Implementation Revision Record — standalone-agent-run-root

The current code and `implementation-handoff.md` are authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer`, `design-review-report.md`, ARCH-REV-003 (round 3, Pass) | N/A | `Initial Baseline` | SR-005 (requirements SR-002); ARCH-REV-003; CRR N/A; API-REV N/A; DR N/A | Implementation complete for REQ-001–REQ-010; ready for code review |
| IR-002 | `/code_reviewer`, `code-review-report.md`, CRR-001 (round 1, Fail) | CR-001 | `Local Fix` | SR-005; ARCH-REV-003; CRR-001; API-REV N/A; DR N/A | Child commands no longer restart a crashed host; back to code review |
| IR-003 | `/code_reviewer`, `code-review-report.md`, CRR-003 (round 3, failure-origin review of API/E2E F-01) | CR-002 (API/E2E F-01, AE-10) | `Local Fix` | SR-005; ARCH-REV-003; CRR-003; API-REV-001; DR N/A | Standalone children's earlier-events pages use the member query; back to code review |
| IR-004 | `/architecture_reviewer`, `design-review-report.md`, ARCH-REV-004 (round 4, Pass on SR-006, from CRR-005 / API/E2E F-02) | F-02 (no source finding) | `Design Impact` (implemented SR-006 § 11) | SR-006; ARCH-REV-004; CRR-005; API-REV-002; DR N/A | Root shutdown fence waits for quiescence after a rejected interrupt and retries per attempt; to code review |
| IR-005 | `/delivery_engineer`, `release-deployment-report.md`, DR-001 (Blocked, Local Fix) | DR-001 native-input-history import | `Local Fix` | SR-006; ARCH-REV-004; CRR-006; API-REV-003; DR-001 | Workspace harness imports the moved root fixture; `pnpm test:native-input-history` 2/2 |

## Revision Entries

### IR-001 — Complete implementation of SR-005 on base `b37d7a934`

- Triggering role, report path, and round: `/architecture_reviewer`,
  `tickets/in-progress/standalone-agent-run-root/design-review-report.md`, ARCH-REV-003 (delta review of the SR-005 base refresh, Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A. No implementation handoff existed. The branch held the in-progress checkpoint `9c3080a20` (E-21).
- Current authoritative result: all REQ-001–REQ-010 implemented; branch head `bccb1c095` (plus this ticket-artifact commit).
- Related solution revision IDs: SR-005 (design), SR-002 (requirements).
- Related architecture-review revision IDs: ARCH-REV-003 (and ARCH-REV-002 for the SR-004 substance).
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the first implementation handoff. It covers the checkpoint work (E-21 "present") and the remaining E-21 work completed in this round.
- Approved behavior or requirement IDs affected: REQ-001–REQ-010, BEH-001–BEH-010, AC-001–AC-010.
- Implementation delta:
  - Checkpoint `9c3080a20` (before the rebase, carried by SR-005):
    - REQ-001: module move to `src/standalone-agent-run-root/`; root, host handle, manager; ports; binding removed.
    - REQ-002: `TeamRootCollaboratorAgentRegistry`.
    - REQ-003: Org delivery extraction.
    - REQ-004: self-target rejection.
    - REQ-009 (original scope): catalog injection and the model-save fixture.
  - This round, commit `bccb1c095`:
    - REQ-009 / D-R3: two guard inventory edits.
    - REQ-003: size target. Child-command routing moved into the standalone and Org delivery owners; stopped-run model-settings save extracted to `standalone-stopped-run-model-config-updater.ts`.
    - REQ-005: header in three builders, web parser, frozen migration header.
    - REQ-006: summary service, store, repository, GraphQL query and web Token Meter.
    - REQ-007: active-trace page inter-agent visual, server and web.
    - REQ-008: host label.
    - Docs.
    - One test-wiring fix: `agent-run-prompt-fallback.integration.test.ts` now gets the roots fixture.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result:
  - Server typecheck clean (TS6059 noise excepted); web `tsc` error set identical to base.
  - Full server and web suites compared with clean `b37d7a934` by test name and message:
    - server: 0 new, 0 changed; 38 fixed;
    - web: 0 new; 3 apparent message differences resolved as base flakiness.
  - Live checks on the dev stack with General Agent (Claude SDK and Codex).
- Next recipient or routing: `get_handoff_rules` (Large/High → code review).
- Remaining limitations or risks: see `implementation-handoff.md` § Known Risks.

### IR-002 — Collaboration-stream child commands use the active root (CR-001)

- Triggering role, report path, and round: `/code_reviewer`,
  `tickets/in-progress/standalone-agent-run-root/code-review-report.md`, CRR-001 (round 1, Fail, Local Fix).
- Triggering finding IDs: CR-001 (Medium).
- Classification: `Local Fix`.
- Prior authoritative result: IR-001. `AgentCollaborationStreamHandler.handleMessage` resolved the root and ran `root.ensureHostReady()` before every child command, so:
  - a crashed host was restored first;
  - a failed restore acked the child command `failed` (`AGENT_ROOT_COMMAND_FAILED`) without reaching the collaborator.
- Current authoritative result: child commands (send, interrupt, approve/deny) use `manager.getActive(hostRunId)` as is, with no host readiness.
  - Only when no root is active do they fall back to `resolveRoot` + `ensureHostReady`, as the base did with `getActive ?? resolveCommandReadyRoot`.
  - `connect` is unchanged (AR-001).
- Related solution revision IDs: SR-005.
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: CRR-001.
- Related API/E2E and delivery revision IDs: N/A.
- Why recorded: the reviewer's Local Fix. Design §1 says "Child commands are unchanged"; REQ-001 and AC-010 require no visible change.
- Approved behavior or requirement IDs affected: REQ-001, AC-001 (host crash), AC-010; BEH-002 and BEH-003 context.
- Implementation delta:
  - The handler constructor now takes `Pick<StandaloneAgentRunRootManager, "resolveRoot" | "getActive">`.
  - `handleMessage` uses `getActive(...) ?? readyRoot(...)`.
  - `api/websocket/index.ts` injects `getActive`.
  - The module doc's "Root lifetime" and stream wording are updated.
- Changed files or areas:
  - `autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-stream-handler.ts`
  - `autobyteus-server-ts/src/api/websocket/index.ts`
  - `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-collaboration-stream-handler.test.ts`
  - `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md`
  - Commit `c0e8ce7fd`.
- Local validation and result:
  - New test: with an active root whose host is offline and whose restore would fail, a child SEND_MESSAGE and an INTERRUPT_GENERATION are accepted, reach `executeAgentCommand`, and `ensureHostReady` is not called. It fails against the IR-001 code and passes now.
  - New test: with no active root, a command resolves the root and makes its host ready once.
  - The handler, standalone root, root integration and architecture suites pass (90/90).
  - `tests/unit/services/agent-streaming` and `tests/unit/agent-execution`: 1279 passed; the 26 failures are the known base set, none new.
  - Server tsc is clean.
- Next recipient or routing: `get_handoff_rules`, Large/High Local Fix → `/code_reviewer`.
- Remaining limitations or risks: unchanged from IR-001, except that the CR-001 host-crash child-command path is now covered by a unit test. It was not re-checked live.

### IR-003 — Standalone children read earlier events from the host package (CR-002)

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` § "API/E2E Failure-Origin Review (Round 3, F-01)", CRR-003.
  - It originates from API/E2E F-01 (AE-10, AC-007; API-REV-001).
- Triggering finding IDs: CR-002 (API/E2E F-01).
- Classification: `Local Fix` (implementation defect; no server change).
- Prior authoritative result: IR-002. `agentRunCollaborationStore.childTargetFor` gave standalone children `browse: { kind: 'run', runId: childRunId }`, so the "earlier events" page called `getRunEventMonitorActiveTracePage(childRunId)`.
  - The server rejects that ("Run package 'agent:<child>' is unavailable"), because a child is not a top-level run package.
  - The page never loaded, and Retry repeated the failure.
  - The defect predates this branch but was hidden behind the documented limit that IR-001 removed.
- Current authoritative result: a `standaloneMember` browse subject (`hostRunId`, `memberAddress`, `agentRunId`) calls the existing server query `agentRunCollaborationMemberEventMonitorActiveTracePage`.
  - Standalone task Agents, collaborators and collaborator-Team members use it.
  - The host keeps `{ kind: 'run' }` (from `activeContextStore`).
- Related solution revision IDs: SR-005.
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: CRR-003.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: N/A.
- Why recorded: the reviewer's Local Fix for an AC-007 failure found by API/E2E.
- Approved behavior or requirement IDs affected: REQ-007, AC-007, BEH-008, D-R6.
- Implementation delta:
  - New query `GetAgentRunCollaborationMemberEventMonitorActiveTracePage` (`graphql/queries/runHistoryQueries.ts`); `generated/graphql.ts` regenerated against the live server, additive only.
  - `eventMonitorActiveTracePageService.ts`: adds the `standaloneMember` subject. The four subjects are routed by one exhaustive switch through a shared query helper. Variables and error handling are unchanged for the existing subjects.
  - `eventMonitorActiveTraceBrowse.ts`: exhaustive `subjectKey`, with an `agent:<host>:member:<address>:run:<id>` key.
  - `stores/agentRunCollaborationStore.ts#childTargetFor`: uses the new subject.
- Changed files or areas:
  - `autobyteus-web/graphql/queries/runHistoryQueries.ts`
  - `autobyteus-web/generated/graphql.ts`
  - `autobyteus-web/services/eventMonitor/eventMonitorActiveTracePageService.ts`
  - `autobyteus-web/services/eventMonitor/eventMonitorActiveTraceBrowse.ts`
  - `autobyteus-web/stores/agentRunCollaborationStore.ts`
  - Tests: `stores/__tests__/agentRunCollaborationStore.spec.ts`, `services/eventMonitor/__tests__/eventMonitorActiveTracePageService.spec.ts` (new), `components/workspace/agent/__tests__/EventMonitorBrowseAssistantRow.spec.ts`.
  - Commit `782ec9f11`.
- Local validation and result:
  - Store test: both a task-Team member (`/product_team/prototyper`) and a collaborator Agent (`/computer_use_agent`) get the `standaloneMember` subject. It fails against the IR-002 wiring and passes now.
  - Service test: the `standaloneMember` subject calls the member query with the exact variables; the run, Team-member and Org-member subjects keep their queries and variables; GraphQL errors surface.
  - Row test: an `inter_agent` page visual for a standalone child renders "From General Agent:" with the delivery body and no raw header.
  - Focused web specs: 64/64.
  - Full web suite: 3708 passed. The 45 failures are the same set as the clean base (0 new).
  - Web `tsc`: the 636 errors are identical to the base apart from absolute paths.
  - The codegen run validated the new document against the live schema.
- Next recipient or routing: `get_handoff_rules`, Large/High Local Fix → `/code_reviewer`. API/E2E then reruns AE-10.
- Remaining limitations or risks: the live "earlier events" page of a standalone child was not re-driven in the UI here, because it needs a long trace. API/E2E's AE-10 rerun covers it.

### IR-004 — Root shutdown fence: rejected interrupt awaits quiescence; per-attempt retry (SR-006 § 11)

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md`, ARCH-REV-004 (round 4, Pass on SR-006).
  - Chain: API/E2E F-02 (API-REV-002, `api-e2e-evidence/r2-o01-diag-le-o1-codex-4.log`) → CRR-005 failure-origin review (Design Impact) → SR-006 design § 11.
- Triggering finding IDs: F-02 (no source finding).
- Classification: `Design Impact`, resolved upstream by SR-006; this round implements it.
- Prior authoritative result: IR-003. `AgentRunRootShutdownFence` was a single, irreversible latch per AgentRun.
  - A rejected interrupt (for example Codex "no active turn" while the turn was finishing) settled the fence not-accepted at once, unless the run was already quiescent.
  - The latch kept that result for the run's lifetime, so a second Stop could never reach the AgentRun, and a busy Org root on Codex could not be stopped.
- Current authoritative result: rules F-1 to F-4 of design § 11.
- Related solution revision IDs: SR-006 (requirements SR-002 unchanged).
- Related architecture-review revision IDs: ARCH-REV-004 (non-blocking N-1, N-2).
- Related code-review revision IDs: CRR-005.
- Related API/E2E revision IDs: API-REV-002.
- Related delivery revision IDs: N/A.
- Why recorded: AC-001 (live gate) and AC-010 (preserved Stop) cannot pass reliably without it.
- Approved behavior or requirement IDs affected: AC-001, AC-010; BEH-003 (Stop / delete / archive / shutdown) for Team, Org and standalone roots through the existing chain.
- Implementation delta:
  - `agent-execution/domain/agent-run-root-shutdown-fence.ts` is now one attempt (`pending → accepted | ended`).
    - **F-1:** a rejected interrupt keeps the attempt open while the run is not quiescent. Every later `evaluate()` settles `{ accepted: true }` on quiescence. No second interrupt within the attempt. No error-text parsing; quiescence (`isRootShutdownQuiescent`, unchanged) is the only success signal.
    - **F-2:** `ROOT_SHUTDOWN_REJECTED_INTERRUPT_QUIESCENCE_TIMEOUT_MS = 5000`, injectable through the constructor options (`quiescenceTimeoutMs`, `timers`, `warn`). At expiry it evaluates once more: accepted if quiescent, otherwise the original rejected result. The timer is cleared on every settle and fail path and is `unref`'d.
    - **F-4:** warns at rejection and again at expiry, with the run ID, the local `activeTurn` (kind and turn ID), `hasPendingCommand`, and the interrupt code and message. The format lives in the fence; `AgentRun` supplies the state.
  - `agent-execution/domain/agent-run.ts` changes only attempt selection and diagnostics (F-3):
    - the fence field is `AgentRunRootShutdownFence | null`;
    - inside the serialized dispatch-queue step of `fenceInputAndInterruptForRootShutdown()`, the current attempt is reused while pending or accepted, and replaced when it ended not-accepted or failed;
    - concurrent callers share the pending attempt;
    - input admission stays fenced across attempts;
    - `createRootShutdownFence()` supplies the snapshot, interrupt and diagnostics callbacks.
  - Unchanged: `isRootShutdownQuiescent`, input admission, every runtime backend, and root-specific code.
  - `agent-run.ts` is 498 effective lines (was 490).
- Changed files or areas:
  - `autobyteus-server-ts/src/agent-execution/domain/agent-run-root-shutdown-fence.ts`
  - `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`
  - Tests: `tests/unit/agent-execution/agent-run-root-shutdown-fence.test.ts` (new); `tests/unit/agent-execution/agent-run.test.ts` (new describe block appended; existing tests untouched); `tests/unit/agent-org-execution/agent-org-run-termination.test.ts` (one new case).
  - Commit `eccea069b`.
- Local validation and result:
  - **Fence unit tests (7):**
    - F-1: a rejected interrupt while the turn is still active waits, with no second interrupt, and settles accepted on quiescence with the timer cleared;
    - F-2: the bound settles the original rejected result and the timer is gone;
    - N-2: quiescent at expiry without any dispatch settles accepted;
    - F-4: the exact warn text at rejection and at expiry, with the turn change visible;
    - an already-quiescent rejection settles accepted with no wait;
    - F-3: acceptance is latched; a throwing interrupt fails only its attempt;
    - the default timer is unref'd.
  - **AgentRun tests (4):**
    - a turn completes after a rejected interrupt → accepted, one interrupt;
    - with fake timers, a failed attempt at 5000 ms keeps input fenced, and the next call starts a new attempt that succeeds;
    - concurrent callers share one attempt, and acceptance stays latched;
    - an interrupt that throws fails only its attempt, and the next call interrupts again.
  - **Org test:** a first Stop fails on a rejected interrupt of a finishing turn (real AgentRun behind the member handle, frozen scope); after the turn completes, a second Stop reaches the AgentRun again and succeeds.
  - Three of the four AgentRun tests and the Org test fail against the IR-003 fence; the concurrency test passes on both (preserved behavior).
  - The required unchanged suites pass unchanged: `agent-run.test.ts` (including 779-903), `agent-run-compaction-races`, `frozen-root-termination-scope`, `configured-agent-execution-handle`, `agent-org-run-termination`, `root-team-run-termination`. 79/79, together with the new tests.
  - **Full server unit/integration/architecture suites:** 4597 passed. The 147 failures are identical by name and message to the clean base, with none new compared with the previous branch run.
  - Server tsc is clean.
- Next recipient or routing: `get_handoff_rules`, Large/High → `/code_reviewer`. Then API/E2E runs the N-1 live validation: LE-O1 on Codex at least 10 consecutive passes, plus the AC-001 suites on Claude and Codex.
- Remaining limitations or risks:
  - No live run was done in this round.
  - Per ARCH-REV-004 N-1: an EXPIRY warning that shows a local `IDENTIFIED` turn means stale state or a new turn (P-005/P-006). That must be escalated as a Design Impact, not answered by raising the bound or adding error-text recognition. `reconcileRuntimeSnapshot` does not clear a local `IDENTIFIED` turn.

### IR-005 — Workspace native-input-history harness imports the moved root fixture (DR-001)

- Triggering role, report path, and round: `/delivery_engineer`, `release-deployment-report.md` and `delivery-revision-record.md` (DR-001, Blocked, Local Fix). Evidence: `delivery-evidence/dr001-native-input-history.log`.
- Triggering finding IDs: the DR-001 native-input-history blocker.
- Classification: `Local Fix` (durable test code).
- Prior authoritative result: IR-004.
  - `test-support/native-input-history/native-accepted-input-history.integration.test.ts:10` still imported `../../autobyteus-server-ts/tests/integration/agent-run-collaboration/native-compaction-root-fixture`.
  - IR-001 had moved that folder to `tests/integration/standalone-agent-run-root/`.
  - `pnpm test:native-input-history` failed to resolve the import. That harness runs under its own Vitest config, outside the server and web sweeps, and it was not run in IR-001–IR-004.
- Current authoritative result: the import points at `../../autobyteus-server-ts/tests/integration/standalone-agent-run-root/native-compaction-root-fixture`.
- Related revision IDs: SR-006; ARCH-REV-004; CRR-006; API-REV-003; DR-001.
- Why recorded: a delivery-detected regression from the IR-001 module move.
- Approved behavior or requirement IDs affected: AC-001 (relocated fixtures), AC-010.
- Implementation delta: one import path. Commit `3c7b62f53`.
- Changed files or areas: `test-support/native-input-history/native-accepted-input-history.integration.test.ts`.
- **Search for other stale references:** `git grep` over tracked files, excluding `tickets/`, for `tests/integration/agent-run-collaboration`, `src/agent-run-collaboration` and `tests/unit/agent-run-collaboration`. Besides the fixed import, only two kinds of hit remain:
  - `TESTING.md:222`, left to delivery as requested;
  - `autobyteus-collaboration-stream-contracts/dist/*.map`, build output that points at `src/agent-run-collaboration-dtos.ts`. That contracts module and `api/graphql/types/agent-run-collaboration.ts` are current, unmoved files whose names are part of the wire and API contract; they were never in scope for the rename.
  - No workspace script or package config references the old paths.
- Local validation and result:
  - `pnpm test:native-input-history` passes 2/2. It first runs the web boundary guard, then the harness.
  - The same 12 "Failed to fold token usage event … TOKEN_USAGE_CURRENT_SCHEMA_REQUIRED" console warnings appear on the clean base (`b37d7a934`), which also passes 2/2. They are harness noise, not a regression.
- Next recipient or routing: `get_handoff_rules`, Large/High Local Fix requested by delivery → `/code_reviewer`.
- Remaining limitations or risks: none new. `TESTING.md` path sync stays with delivery.
