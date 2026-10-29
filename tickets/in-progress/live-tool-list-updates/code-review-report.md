# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (approved SR-001; SR-002 additions within the direction)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (E-12, E-13 for Codex `thread/unsubscribe` statuses and the reopen)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-004)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004, plus the step-5 clarification in `119bf31636`)
- Supplemental Task Artifacts Reviewed As Context: `evidence/probe/*` (names and the Codex reopen drivers), `evidence/real-runs/README.md`, `evidence/local-checks.log`
- Relevant Solution Revision IDs: SR-001…SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-004, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001…ARCH-REV-004
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation complete (IR-001), `Large`/`High` → source review
- Prior Review Round Reviewed: none
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record: N/A
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. The change spans 82 source files (excluding tests) across `agent-tools/mcp`, five backends, `agent-execution` domain, `autobyteus-ts` and the web. It changes every external runtime's MCP connection and adds a reopen of live runtime sessions.

## Review Scope

- Changed implementation and behavior reviewed: `git diff 9f7c9c10a6 5f3923c4cd` (the code), DS-001…DS-006. `f8affdd0fe` adds only ticket files.
- Files / areas reviewed:
  - **Server, new:**
    - `tool-list-updates/**` (service, diff, notice builder, seen store, composition);
    - `agent-run-platform-notices.ts`;
    - `agent-definition-change-signal.ts`;
    - `agent-tools-mcp-session-streams.ts`;
    - `acp-session-launcher.ts`;
    - `runtime-session-reopen.ts`.
  - **Server, changed:**
    - `agent-tools/mcp/*` (session, registry, service, authority, scoped authority, host, routes, http gate, dispatcher);
    - Claude (session state, backend, run context, session, query and tooling options, tool-use coordinator, MCP server builders);
    - AGY (backend, factory, MCP materializer, capsule);
    - native (backend, factory);
    - Codex (backend, factory, run context, bootstrapper, thread manager);
    - ACP/Grok (backend, factory, session profile);
    - `agent-run.ts`, the preface port and dispatch, the backend contract, `runtime-agent-tool-exposure.ts`;
    - the three signal sources and both compositions;
    - the memory accumulator.
  - **autobyteus-ts:** `agent.ts` (`replaceTools`), `agent-tool-instances.ts`, `agent-factory.ts`, `llm-phase-tools.ts`, `tool-cleanup-step.ts`.
  - **Web:** `SystemTaskNotificationSegment.vue`, `AIMessage.vue`, `agentRunStore.restartRunWithNewTools`, payload and segment `action`, localization.
  - **Tests:** the new and changed suites listed in the handoff (read for the behaviors they claim).
  - **Docs:** `tool_list_updates.md`.
- Unchanged context read:
  - the Codex thread router (`codex-client-thread-router.ts:41-56`: routing by the run context's current thread ID);
  - `codex-thread.ts:160,230-233`;
  - the native tool lookup (`agent-context.ts:121`);
  - the dispatch path of the ACP factory release (`acp-agent-run-backend-factory.ts:70-92`);
  - `agentTeamRunStore` (no single-member stop or restore);
  - GraphQL `restoreAgentRun`.
- Explicit exclusions: FU-001 and FU-002 (recorded follow-ups); real Codex and Grok model runs (DEC-004; owed by API/E2E).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001…REQ-010 and AC-001…AC-008, with DEC-001 (automatic reopen), DEC-004, DEC-006 (one notice per input, tools first) and DEC-007 (a failed reopen does not send the message). Preserved: BEH-003, BEH-004, and the invariant "never offered a tool the definition does not list".
- Design-spec behavior map verified against the implementation: DS-001…DS-006 are implemented as specified (traces below). The SR-004 Grok owner model and the step-5 clarification (keep the existing instance of every name that stays) are followed.
- Design review report and round confirmed: ARCH-REV-004 Pass. AR-001…AR-008 resolutions are present in the code.
- Behavior-basis status: `Confirmed`, except BEH-004/REQ-010 for a Team member run, which is `Unclear` (CR-001).
- Changed or newly discovered behavior: the restart action for a Team member stops the whole Team. That behavior is not in the approved requirements or the design (CR-001).
- Remaining material ambiguity: what "Restart this run with the new tools" does for a Team member (CR-001).

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 (DS-001, DS-003, DS-004, DS-005, DS-006) | Confirmed | **Signal sources.** `AgentDefinitionChangeSignal` is fed by the reloader publisher (`agent-package-definition-feed-composition.ts:36-39`), the application-owned save (`agent-definition-service.ts:364-365`) and the committed package commands (`application-package-command-service.ts` after each `runPackageTransition`). **Service.** `ToolListUpdateService.onDefinitionsChanged` runs coalesced passes and re-reads each run's definition by ID, then calls `run.applyDefinitionTools`. It diffs against the seen record and marks the run dirty. **Delivery.** A busy run on an immediate runtime gets the notice by post. Other runs get it as a preface on the next input, which on Codex/Grok waits for a `start_turn`. **Backends.** Claude replaces the run context exposure and the session. AGY replaces the session. Native compares names first, then `Agent.replaceTools`. Codex and Grok replace the session and set `reopenPending`; the reopen runs inside `start_turn` only (`codex-agent-run-backend.ts:147-150`, `acp-agent-run-backend.ts:136-140`) | — |
| BEH-002 (DS-002) | Confirmed | `replaceForRun` re-resolves through the catalog and replaces one frozen record (`agent-tool-mcp-session-registry.ts`, `replaceToolExposure`), then notifies the held GET streams. `tools/call` reads the record per request. Native looks up the instance at execution (`agent-context.ts:121`), and `resolveTurnToolNames` treats an empty instance set as "no tools" (`llm-phase-tools.ts:6-8`). Claude's approval checks the current descriptor per call, and `allowedTools` no longer lists Agent Tools | — |
| BEH-003 | Confirmed | The skill service sits behind `AgentRunPlatformNotices`, second in order, and ignores the dispatch kind. Integration "keeps the skill notice unchanged behind the composite" | — |
| BEH-004 / REQ-010 (single run) | Confirmed | Failure notice `{ sender_id, content, action: "restart_run" }`. On the web, the button runs `terminateRun` + `RestoreAgentRun` + reconnect (`agentRunStore.ts:430-452`) | — |
| BEH-004 / REQ-010 (Team member) | **Unclear** | `restartRunWithNewTools` finds the member's Team and calls `terminateTeamRun(rootTeamRunId)`; there is no restore (`agentRunStore.ts:431-433`) | REQ-010 asks for "a one-click 'Restart this run with the new tools' that keeps the conversation". AC-007 says "the button restarts it with the new tools and the conversation". The product has no single-member stop or restore (`agentTeamRunStore` offers only `terminateTeamRun`; GraphQL has only `restoreAgentRun` for single runs). The design's spine ("the existing stop + restore of the same run") does not exist for a member. The handoff records the Team stop as an assumption, and `tool_list_updates.md:86-88` documents it, but no upstream artifact approves it (CR-001) |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001…SCN-003, SCN-005 | BEH-001…BEH-003 | User | The user | Change a running agent's tools | Definition edit, package reload, application package command; restore | Normal | DS-001…DS-006 | As AC-001…AC-006 and AC-008 | Requirements; probes; real runs (native, Claude, AGY) | Supported Normal Scenario | Use |
| SCN-004 (single run) | REQ-010, AC-007 | User | The user | Recover from a failed reopen | Failure card button | Explicit Edge | Codex/Grok reopen fails → notice → stop + restore | Run restarted with the new tools | Requirements SCN-004 | Supported Explicit Edge Scenario | Use |
| SCN-004-TEAM | REQ-010, AC-007, REQ-001 ("alone or as a team member") | User | The user | Recover a Team member's failed reopen (for example the PM in a Team, the user's own case) | Failure card button in the member's conversation | Explicit Edge | Member run on Codex/Grok → reopen fails → button → `terminateTeamRun` | Approved: "restarts it". Implemented: the whole Team is stopped (other members too, including any mid-turn) and nothing is restored | REQ-001 and UC-001 include Team members. The problem statement's PM use case. Handoff Downstream Hints (Team member runs on Codex/Grok) | Supported Explicit Edge Scenario | Use |
| MP-CODEX-RETRY | DS-004 step 6 | Contract | Codex app-server | Retry after `thread/unsubscribe` succeeded and `thread/resume` failed | Next `start_turn` | Explicit Edge | The retry sends `thread/unsubscribe` on an already-unsubscribed thread | Must not error | `thread/unsubscribe` statuses `notLoaded`/`notSubscribed`/`unsubscribed` (investigation E-12, generated types 0.165) | Supported | Use (premise confirmed) |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The restart button for a Team member stops the whole Team and restores nothing | SCN-004-TEAM; REQ-010, AC-007 | Reopen failure for a member run | Every member of the Team stops, including any mid-turn. The label says "Restart this run"; the run is only restored by the user's next message | `agentRunStore.ts:431-433`; no member restart in the product; docs `tool_list_updates.md:86-88` | Promote → **CR-001** | This ticket (Design Impact) | The approved outcome cannot be built for a member without a product decision. The design assumed a stop + restore of the same run, which exists only for single runs. The Solution Designer decides (see Classification) |
| C-02 | `claude-session.ts` crosses the 500-line limit | Size rule | — | 487 → 501 effective lines; the added `getAgentToolNames`/`applyToolExposure` | Line count | Promote → **CR-002** | This ticket | The change takes the file over the limit. Place the added logic in its owner. `ClaudeAgentToolsMcpSessionState` already owns `replaceExposure` and has the run context, so it can also set `runtimeContext.runtimeToolExposure`. Keep `ClaudeSession` to a one-line forward, or let the backend reach the state through an existing accessor |
| C-03 | ACP reopen spawns into `context.runtimeContext.workingDirectory ?? "."` | DS-004 (Grok) | — | `AcpAgentRunContext.workingDirectory` is `string \| null`, but `bindBackend` always sets it (`acp-agent-run-backend-factory.ts:157-159`), so the fallback is unreachable. If it were ever hit, it would silently spawn Grok in the server's working directory | `acp-agent-run-backend.ts` (`reopenWithCurrentTools`); `acp-agent-run-context.ts:4-5` | Promote → **CR-003** | This ticket | An unreachable defensive fallback with a wrong outcome (Principles 7, 13). Give the backend the non-null directory the run was opened in (for example in `AcpAgentRunBackendInput`), with no fallback |
| C-04 | Retry of a Codex reopen after a partly-failed reopen (unsubscribed, resume failed) | MP-CODEX-RETRY | — | The retry repeats `thread/unsubscribe` | E-12: `notSubscribed` is a status, not an error | Reject | — | The premise holds |
| C-05 | A Codex no-history reopen sets `runtimeContext.threadId` directly instead of `CodexThread.setThreadId` (which also clears the background-task view) | DS-004 step 4 | — | Only a thread with no started turn reaches this branch, so it has no background tasks to clear. Routing reads the run context (`codex-client-thread-router.ts:47-49`, `codex-thread.ts:160`) | Code read | Reject | — | No observable consequence |
| C-06 | Stop pressed while a Grok reopen is in flight | — | Two concurrent user actions | `launcher.open` sets the owner's handles synchronously, so release closes them. A spurious failure notice may follow | Code read | Reject | — | A concurrent action with no product contract (Principle 6); no leak |
| C-07 | Claude asks the user to approve a removed tool that the CLI still calls from its cached list, before the server refuses it | REQ-004 | Claude calls a removed tool in the window before it re-lists | `canUseTool` → not in descriptor → normal approval → user prompt → server refuses | `claude-session-query-options.ts`; design DS-003 ("any other tool goes through the existing approval logic") | Reject | — | The design accepts it, removal is still enforced, and the window is brief (Claude re-lists on notification). Recorded as a residual risk for API/E2E |
| C-08 | `getToolNames()` on Claude activates the session if it is not yet active | — | Run publish (`trackRun`) | Activation happens a little earlier than the first query, with the same inputs; once only | `claude-session.ts` `getAgentToolNames` | Reject | — | Idempotent and harmless. A side effect in a getter is noted, not a defect |
| C-09 | Native `replaceTools` cleans up a removed tool while a call to it may be running | REQ-004 | Removing a tool the agent is using at that moment | The running call may fail | `agent.ts` `replaceTools` | Reject | — | REQ-004 makes a removed tool unavailable from the save, so a failing in-flight call of a removed tool fits the requirement |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | One run operation (`applyDefinitionTools`) with one caller. A replaceable, always-present session. The composite notice port. `tool-list-updates` imports no backend and no `agent-tools` | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None behavior-defining; probes followed (Codex sequence, Grok end-then-load) | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-006 map to code one to one | — |
| Ownership boundary preservation and clarity | Pass | Only the session service changes exposure. Only the streams owner writes streams. Backends never diff or notify (except the reopen-failure event, as designed). The Grok owner is the single holder of the process | — |
| Off-spine concern clarity | Pass | Diff, notice builder and seen store sit beside the service; keepalive and close sit in the streams owner | — |
| Existing capability/subsystem reuse | Pass | Skill-notice ports, the store rules (copied, as designed), the exposure resolver, Codex `resumeRemoteThread`; ACP launch extracted, not duplicated | — |
| Reusable owned structures | Pass | `agent-tool-instances.ts` shared by the factory, shutdown and `replaceTools`; `runtime-session-reopen.ts` shared by Codex and ACP | — |
| Shared-structure/data-model tightness | Pass | `AgentRunToolListApplyResult` has three kinds with one meaning each. `AgentToolMcpSessionToolExposureRecord` is a tight subset | — |
| Repeated coordination ownership | Pass | No per-runtime listeners; one service drives all | — |
| Empty indirection | Pass | `AgentRun.applyDefinitionTools`/`getToolNames` are the designed thin boundary (an active check) | — |
| Separation of concerns and file responsibility | Fail | CR-002: `claude-session.ts` goes over 500 | CR-002 |
| Ownership-driven dependency check | Pass | Directions as designed; backends depend on the authority only | — |
| Authoritative Boundary Rule | Pass | Backends use `AgentToolMcpRunSessionAuthority` (replace/describe), never the registry or streams. The scoped authority checks ownership (`assertOwnsRun`) | — |
| File placement | Pass | New files in the designed folders | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | `takePreface(run, { dispatchKind })`; `replaceForRun({ runId, runtimeExposure })`; `describeForRun(runId)`; `reopenThread(runContext, appServerConfig)`; `AcpSessionLauncher.open({ owner, mode, … })` | — |
| Naming quality / one vocabulary | Pass | "Tools updated", "reopen", "turn start" as in the design's Terminology | — |
| No unjustified duplication | Pass | Codex and ACP share the reopen notice and result helpers. The two `applyDefinitionTools` bodies have the same shape but different owners, as designed | — |
| Patch-on-patch complexity control | Pass | Clean replacements (no `not_exposed` remnants) | — |
| Dead code removed in touched files | Fail (minor) | All designed removals were made: the AGY header and its 405 branch, `sendSseCompatibilityResponse`, `listChanged: false`, `not_exposed` and its null branches, the Claude cached activation, `allowedTools` Agent Tools names, the `DeferredEventSink`. CR-003 remains as an unreachable fallback | CR-003 |
| Test scenarios and assertions are clear and requirement-aligned | Pass | **Integration** (11 tool-list cases), named by AC: AC-005 revert, AC-006 restore, DEC-006 one notice, the busy post, turn-start gating. **Codex** reopen: 8 cases, including the retry, a revert, a change during the reopen and an append while pending. **ACP**: 5 cases, including the three ownership tests. **Routes**: held stream frames, removal refused at once, the official SDK client receiving `list_changed` | — |
| Test fixtures/helpers reusable, structure coherent | Pass | The shared `agent-tool-mcp-run-sessions-stub.ts` and `agent-tools-mcp-test-host.ts` | — |
| No stale, duplicated, or compatibility-only tests | Pass | `allowedTools` assertions updated to the design; no tests remain for `not_exposed` | — |
| API/E2E readiness | Pass | All suites green; gated e2e `live-tool-list-updates.e2e.test.ts` present for Codex/Grok when credit returns | — |

## Source File Size And Structure Audit

Changed source files over 220 effective non-empty lines (others are under 220):

| Source File | Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `backends/claude/session/claude-session.ts` | 487 | 501 | **Fail — this change takes it over** | +14 | The added logic belongs to `ClaudeAgentToolsMcpSessionState` | Pass | Local Fix | CR-002 |
| `backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | 468 | 494 | Pass | +26 (tool build closure) | Pass (the factory owns how tools are built at activation; reused) | Pass | — | — |
| `backends/claude/session/claude-session-tool-use-coordinator.ts` | 480 | 490 | Pass | +10 | Pass | Pass | — | — |
| `agent-execution/domain/agent-run.ts` | 459 | 470 | Pass | +11 | Pass | Pass | — | — |
| `compositions/build-studio-server.ts` | 419 | 439 | Pass | +20 wiring | Pass | Pass | — | — |
| `standalone-application-host/start-standalone-application-host.ts` | 358 | 368 | Pass | +10 | Pass | Pass | — | — |
| `agent-definition/services/agent-definition-service.ts` | 356 | 363 | Pass | +7 | Pass | Pass | — | — |
| `backends/codex/backend/codex-agent-run-backend.ts` | 256 | 341 | Pass | +85 (apply + reopen) | Pass (the backend owns `reopenPending`, as designed) | Pass | — | — |
| `backends/autobyteus/autobyteus-agent-run-backend.ts` | 299 | 344 | Pass | +45 | Pass | Pass | — | — |
| `tool-list-updates/services/tool-list-update-service.ts` | new | 307 | Pass | new | Pass (one owner: tracking, passes, delivery, seen writes, as designed) | Pass | — | — |
| `backends/codex/thread/codex-thread-manager.ts` | 234 | 269 | Pass | +35 | Pass | Pass | — | — |
| `agent-tools/mcp/scoped-agent-tool-mcp-session-authority.ts` | 227 | 262 | Pass | +35 | Pass | Pass | — | — |
| `backends/acp/backend/acp-agent-run-backend.ts` | 120 | 250 | Pass | +130 (reopen, no-session operations) | Pass (the backend owns the reopen; the launcher owns spawning) | Pass | — | — |
| `autobyteus-web/stores/agentRunStore.ts` | 456 | 488 | Pass | +32 | See CR-001 (behavior) | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The AGY header and the one-shot SSE are removed outright |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files | Fail (minor) | CR-003 |
| Persisted-data transition decision followed | Pass | `seen_tool_names.json` is additive; "no record" means "has seen the current list" (`trackRun`); store rules copied (tolerant read, atomic `wx` write, never creates the folder) |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why | Required Action |
| --- | --- | --- | --- | --- |
| `?? "."` in `AcpAgentRunBackend.reopenWithCurrentTools` (`acp-agent-run-backend.ts`) | `DormantPath` | `bindBackend` always passes `prepared.workingDirectory` | An unreachable fallback with a wrong outcome | CR-003 |

## Docs-Impact Verdict

- Docs impact: `Yes`, done in the change (step 7).
- Files: `tool_list_updates.md` (new), `agent_tools_mcp_server.md`, `agent_execution.md`, `skill_update_notices.md`, `grok_build_runtime.md`, `antigravity_cli_runtime.md`, web `agent_execution_architecture.md`.
- The Team-member restart wording in `tool_list_updates.md:86-88` follows whatever CR-001 decides.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| ARCH-REV-001…004 premises (Codex reopen, Grok end-then-load, zero-tool sessions, owner model) | Confirmed | Implemented as designed. Live model proof for Codex/Grok is still owed (DEC-004, credit) |

### `MP-CODEX-RETRY` — a Codex reopen retried after a partly-failed reopen

- Origin: `New`
- Related approved requirement or established contract: DS-004 step 6 ("the next `start_turn` repeats from step 2"); AC-007 ("until then, the next message tries the reopen again")
- Relevant behavior ID(s): BEH-001, BEH-004
- Coherent product goal or governing event: the user sends again after a failed reopen
- Scenario validity: `Supported Explicit Edge Scenario`
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: the next message after the failure card
- Support evidence: AC-007
- Forward production path: `dispatchUserInput(start_turn)` → `reopenWithCurrentTools` → `reopenThread` → `thread/unsubscribe` (thread already unsubscribed) → `thread/resume`
- Lifecycle preconditions and material consequence at the claimed point: an error here would make every retry fail until a restart
- Reachability: `Reachable`
- Review consequence / proportionate response: no finding. Codex 0.165 reports `notSubscribed` as a status of `thread/unsubscribe` (investigation E-12)

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.2
- Score calculation note: simple average of the ten categories, for trend visibility only.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001…DS-006 are each readable in code with one governing owner | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | The design's ownership rules hold; the Grok owner is the single holder; backends use only the authority | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Small, explicit interfaces; the dispatch kind is explicit; the result kinds have one meaning each | `getToolNames` on Claude activates lazily (C-08, rejected) | — |
| 4 | Separation of Concerns and File Placement | 8.9 | Placement as designed; new capability area mirrors skill notices | CR-002: `claude-session.ts` > 500 | Move the added logic to `ClaudeAgentToolsMcpSessionState` |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.4 | Tight exposure record; shared helpers extracted (`agent-tool-instances`, `runtime-session-reopen`) | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Clear names and comments that state why; vocabulary consistent with the design | — | — |
| 7 | API/E2E Readiness | 9.3 | All suites green; three runtimes proven in real runs; gated e2e ready | Codex/Grok live proof owed (DEC-004, accepted) | API/E2E runs them when credit returns |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.6 | Removal, notice, reopen, retry and revert paths traced and correct | CR-001: the Team-member restart contradicts REQ-010/AC-007's "restarts it", and stops other members | Upstream decision, then implement it |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Every designed legacy path removed; no wrappers | — | — |
| 10 | Cleanup Completeness | 9.0 | The removal plan was applied fully | CR-003: an unreachable `?? "."` fallback | Pass the non-null working directory |

## Findings

| ID | Severity | Location | Problem | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| CR-001 | Blocking | `autobyteus-web/stores/agentRunStore.ts:424-452` (`restartRunWithNewTools`); `autobyteus-server-ts/docs/modules/tool_list_updates.md:86-88` | For a Team member run, "Restart this run with the new tools" calls `terminateTeamRun` on the member's Team: every member stops (one mid-turn loses its turn), and nothing is restored. REQ-010 and AC-007 require the button to restart *the run* with the new tools and the conversation. The design's restart spine ("the existing stop + restore of the same run") does not exist for a Team member: the product has no single-member stop or restore. The implementation chose the Team stop on its own (handoff "Important Assumptions"), and no requirement or design revision approves it. This is a supported path, because REQ-001 covers Team members and the user's own case (the PM) is a Team | The Solution Designer decides the member behavior and revises the design (and, if the outcome changes, the requirements with the user). Options: (a) the button stops **and restores** the Team (the existing Team restore), with a label that says so; (b) accept "stop the Team; your next message restores it", with the wording and the user informed; (c) add a member-level restart (new capability; likely out of scope). Implementation then follows the decision | `Design Impact` → Solution Designer |
| CR-002 | Required | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` (`getAgentToolNames`, `applyToolExposure`) | The change takes the file from 487 to 501 effective lines, over the 500 limit | Put the added logic in its owner, `ClaudeAgentToolsMcpSessionState` (it already owns `replaceExposure` and has the run context, so it can set `runtimeContext.runtimeToolExposure` too). Keep `ClaudeSession` at or below 500 | `Local Fix` → Implementation (after CR-001's decision, in the same round) |
| CR-003 | Minor | `autobyteus-server-ts/src/agent-execution/backends/acp/backend/acp-agent-run-backend.ts` (`reopenWithCurrentTools`: `workingDirectory ?? "."`) | An unreachable fallback (the factory always sets the directory) that, if hit, would spawn Grok in the server's working directory | Pass the run's working directory to the backend as a non-null value (for example in `AcpAgentRunBackendInput`) and use it without a fallback | `Local Fix` → Implementation (with CR-002) |

## Follow-ups

- Follow-ups this review added: None.

## Classification

- `Design Impact` (CR-001), owned by the Solution Designer. The design's REQ-010 spine is incomplete for a supported path (Team members), and the implementation filled the gap with unapproved behavior. If the decision changes the approved outcome, it is a Requirement Gap for the Solution Designer to take to the user.
- CR-002 and CR-003 are implementation `Local Fix` items. I route them through the Solution Designer with CR-001, so that one revision round covers all three. They need no design change.
- The task size and risk classification stands.

## Recommended Recipient

- Solution Designer (rule: Design Impact). After the decision: implementation (CR-001 as decided, CR-002, CR-003), then source review again (`Targeted Delta Review` if the changes stay in these files), then API/E2E.

## Residual Risks

- Codex and Grok live model runs are owed (DEC-004; credit). The reopen is proven by the protocol probes and fake-agent tests only.
- C-07: Claude may show an approval prompt for a removed tool in the brief window before it re-lists, when auto-execute is off. The server still refuses the call. API/E2E may observe this in the real Claude run.
- Claude now emits the approved event for every Agent Tools call (`agent_tools_enabled`). API/E2E should check that the run view shows no new noise for collaboration tools.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass` (SCN-004-TEAM is supported and promoted)
- Material-Premise Gate: `Pass`
- Score Summary: 9.2/10. Below 9.2: Runtime Correctness 8.6 (CR-001), Separation of Concerns 8.9 (CR-002), Cleanup 9.0 (CR-003)
- Failure Origin: N/A
- Recommended Recipient: Solution Designer
- Notes: Otherwise a strong implementation. Every designed removal was made. The Codex and Grok reopen sequences, the Grok single owner, coalescing, revert handling and turn-start gating were all traced and found correct. The checks in `evidence/local-checks.log` ran on code commit `5f3923c4cd` and were not rerun.
