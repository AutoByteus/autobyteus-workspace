# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (after ARCH-REV-003; SR-003 after ARCH-REV-002; SR-002 after ARCH-REV-001)
- Approved requirements baseline: `requirements-doc.md`, approved by the user on 2026-10-29 at SR-001 (DEC-001 (a) automatic reopen; DEC-004 build Codex without a real run). SR-002 adds DEC-006, DEC-007 and the AC-007 detail, within the direction (user informed)
- Behavior-defining supplements: none
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/live-tool-list-updates/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (this conversation, 2026-10-29)
- Project design-principle conflicts: none

## SR-002…SR-004 Revision Summary (ARCH-REV-001…ARCH-REV-003)

| Finding | Resolution | Where |
| --- | --- | --- |
| AR-001 Codex/Grok reopen vs activation | The run's Agent Tools session is activated once and never re-activated by a reopen. Backends read the **current** descriptor through a new `describeForRun`. The reopen sequence is measured (E-13, E-14). Codex: `thread/unsubscribe` + `thread/resume` with the rebuilt config on the same client; the lease, skills and thread object are kept (a thread with no history gets a fresh `thread/start`). Grok: a new process with `session/load`, swapped in by the backend; skills kept | DS-004, Codex/Grok reopen sequences |
| AR-002 append vs start_turn | `takePreface` gets the dispatch kind. The backend reopens only inside a `start_turn` dispatch, and an append passes through unchanged. The tool source hands its notice to a run that waits for a reopen only on `start_turn` | DS-004, DS-005, Interface table |
| AR-003 runs with no session | Every external run always has an Agent Tools session, possibly with zero tools; `not_exposed` is removed. Measured: Claude and AGY accept a zero-tool server and take the first tool added later (E-15). A change that removes every tool keeps the session with an empty list. Claude's later CLI process generations read the current exposure and descriptor | DS-002, DS-003, Removal plan |
| AR-004 single preface/observer slot | A new composite `AgentRunPlatformNotices` holds the ordered sources (tool-list updates, then skill notices). It hands at most one source's preface per dispatch (DEC-006), routes settle to that source, and fans out lifecycle calls. Wired in both compositions; the standalone host gets tool updates too | DS-005, Ownership, mapping |
| AR-005 seen record | `<memoryDir>/seen_tool_names.json`, built like `seen_skill_versions.json`; `Directly Usable — No Migration` | Persisted-data decision |
| AR-006 change kinds | One `AgentDefinitionChangeSignal` with three sources. (1) The reloader publisher: any package reload, including team-local and org-owned agents in their team/org folders. (2) Application-owned agent edits (no reload). (3) Application package import, reload and remove. On a signal, the service re-reads each tracked run's own definition by ID, so no folder-to-ID mapping is needed | DS-001 |
| AR-007 dead Codex dynamic-tool path | Follow-up FU-002; this change adds no use of it | Change Scope |
| DS-002 owner wording; scoped authority; streams in the host | Restated; added to the mapping | DS-002, mapping |
| ARCH-REV-002, AR-001 (Grok) | SR-003: the Grok reopen follows the measured order. The old process ends first (detached from the failure sink, skills kept), then the new one spawns and loads. A failed reopen leaves no runtime session: the run is active and idle, `reopenPending` is kept, and the next `start_turn` retries. Every backend operation is specified without a session. Recommendation adopted: `reopenPending` is recomputed on success (Codex and Grok) | Grok and Codex reopen sequences |
| ARCH-REV-003, AR-008 (Grok process ownership) | SR-004: the run's `AcpPreparationOwner` is the single holder of its process, connection and session across creation, restore and reopen. `AcpSessionLauncher` opens into it; the backend reads its handles from it; a reopen clears it (step 2), fills it (step 4) and empties it on failure (step 6). The unchanged `releaseResources` therefore ends the current process. Tests are named | Grok reopen sequence (owner paragraph, steps 2, 4, 5, 6, 8) |

## Current-State Read

A run's tools are resolved once, when its runtime session starts. External runtimes get them through `resolveRuntimeAgentToolExposure(definition, member)` (`agent-execution/shared/runtime-agent-tool-exposure.ts:46`); the native runtime through `resolveAutoByteusRuntimeAgentToolExposure` plus `resolveApplicationAwareAgentTools` (`autobyteus-agent-run-backend-factory.ts:323-337`).

External runtimes get an Agent Tools MCP session, activated once with fixed `enabledTools`/`toolRoutes`. A second activation throws, and an empty list yields `not_exposed`, which means no server at all (E-02; `agent-tool-mcp-session-service.ts:64-66`). The native runtime gets `state.toolInstances`, fixed at agent creation (E-08).

The MCP server cannot announce a change. It has no lasting GET stream (E-03) and declares `listChanged: false` (E-01). For AGY a header turns the stream off entirely (E-06).

Each runtime's restore path reopens a conversation with the current definition's tools. Codex resumes with config (`codex-thread-manager.ts:205-229`); Grok spawns a new process and calls `session/load` (`acp-agent-run-backend-factory.ts:155-205`). The skill notice (`skill-update-notices/`, E-09) already provides the lifecycle observer, the next-input preface, busy delivery and the card. The preface port and observer are a single slot per run (E-16).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale:
  - a new server capability area;
  - the Agent Tools MCP transport (a held GET stream, `listChanged`, the session always active, exposure replaceable);
  - one new run/backend operation on five runtimes, with Codex/Grok reopen sequences;
  - a composite notice port in both compositions;
  - one `autobyteus-ts` API;
  - a per-run record;
  - a web card with a button.

  About 35 to 45 files.
- Architectural risk: `High`
- Risk rationale: every external runtime's MCP connection changes (a held stream, always configured, no AGY header). The new operation crosses all runtime boundaries. The reopen replaces a live runtime session. A wrong removal path would break REQ-005
- Escalation trigger: a runtime that does not behave as measured returns to the Solution Designer. Examples: AGY rejecting the held stream from the product endpoint; Codex rejecting `enabled_tools: []`; Codex `thread/resume` after `thread/unsubscribe` not taking the config in the product client; Grok `session/load` in a new process losing history

## Architecture Investigation Evidence

| Source / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Probes | `evidence/probe/*` (E-probe table) | Claude and AGY (with a GET stream) re-read the list; Codex and Grok do not | Immediate (DS-003) versus reopen (DS-004) | R-01 |
| Probe | E-13 `codex-reopen-*` | Unsubscribe + resume with config gives a new MCP connection; resume of a subscribed thread does not; a thread with no history cannot be resumed | Codex reopen sequence | The model's use of the new tool (DEC-004) |
| Probe | E-14 `grok-reopen-*` | Same-process `session/load` does not reconnect; a new process with `session/load` does | Grok reopen = new process | — |
| Probe | E-15 `claude-empty-*`, `agy-empty-*` | A zero-tool server is accepted; the first tool added later is used | Always-active session (AR-003) | Codex `enabled_tools: []` (checked in the build, no model needed) |
| Code | E-16 | One preface/observer slot; no dispatch kind in `takePreface` | Composite; the port gets the kind | — |
| Code | E-17 | Edits reload their owning folder, then one publisher; application-owned edits and application packages take other paths | `AgentDefinitionChangeSignal` with three sources | — |
| Code | `agent-tool-mcp-session-registry.ts:33-62`; `claude-agent-tools-mcp-session-state.ts:21-24`; `claude-session-query-options.ts:21-36` | Single activation; Claude caches the activation and reads the start exposure per process generation | `describeForRun`; Claude reads the current one | — |
| Code | `codex-thread-manager.ts:78-113,115-160` | Release cleans up skills and the lease; start leases a client per working directory | The reopen keeps both and works on the same client | — |
| Code | `seen-skill-versions-store.ts` | Per-run record in the memory folder; tolerant reads; atomic writes; never creates the folder | `SeenToolNamesStore` built the same way | — |

## Intended Change

When a definition's tool list changes, AutoByteus asks each live run of it to take its definition's current tools. The run's backend resolves them for its runtime and applies them as its runtime can. Native, Claude and AGY apply them at once. Codex and Grok reopen their runtime session in their next turn-start dispatch. The server refuses removed tools at once. The agent gets a short notice, and the user sees a card.

## Change Scope (Mandatory)

- In scope:
  - UC-001…UC-004.
  - A new `tool-list-updates` capability area (server).
  - The Agent Tools MCP endpoint and session: a held GET stream, `listChanged: true`, the session always active, `replaceForRun`/`describeForRun`.
  - `AgentRun` and the five backends: `applyDefinitionTools`, `getToolNames`; the Codex/Grok reopen.
  - The preface port: dispatch kind, and the composite `AgentRunPlatformNotices`.
  - `autobyteus-ts`: `Agent.replaceTools`.
  - `AgentDefinitionChangeSignal` and its three sources.
  - The web card and the restart button.
  - Docs.
- Derived consumers:
  - The session record (`runtimeExposure`, `enabledTools`, `toolRoutes`, `configuredMcpToolSources`) is read by `tools/list`, `tools/call` (`resolveToolCallAvailability`) and the descriptor. All read the replaced record.
  - Start-time copies get a decision each:
    - Claude's `runtimeContext.runtimeToolExposure` is replaced in `applyDefinitionTools`.
    - Claude's cached activation is replaced by `describeForRun`.
    - Claude's `allowedTools` no longer lists Agent Tools tools; the coordinator checks the current descriptor.
    - Codex's `codexThreadConfig.appServerConfig` is rebuilt from the current descriptor at reopen.
    - The ACP `prepared.descriptor` is read again through `describeForRun` at reopen.
    - The AGY capsule `mcp_config.json` is unaffected: it holds only the stable server URL.
    - Native `toolInstances` are replaced.
- Deliberately left alone:
  - the MCP gateway (`mcp-gateway-method-dispatcher.ts`);
  - skill notices (only re-wired behind the composite);
  - team-derived tools;
  - deleted definitions (a run of a deleted definition keeps its tools);
  - which MCP servers Claude inherits (FU-001).
- Follow-ups: FU-001, FU-002.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior And Evidence | Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001…003, 006…009; AC-001, 002, 004…006, 008 | Definition saved / package reloaded / application package changed | Fixed at start (E-01…E-08) | Re-resolved and applied per run | DS-001, DS-003, DS-004, DS-005, DS-006 |
| BEH-002 | Contract | REQ-004, 005; AC-003, 004 | The same | Removed tools still callable (E-02) | Refused from the save on | DS-002 |
| BEH-003 | User | preserved | Skill change | E-09 | Unchanged; now behind the composite (tools first per dispatch, DEC-006) | DS-005 |
| BEH-004 | User | REQ-010; AC-007 | Stop and resume | Keeps the conversation | Unchanged; reused by the restart button | DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `evidence/probe/*` | Measurements; reproduction | REQ-002, 003; AR-001, AR-003 | The build's real-run checks reuse the drivers' turn script; the reopen drivers are the integration reference | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes`
- Structural triggers:
  - *One lifecycle split across places*: five backends resolve the exposure at their own start, and no owner holds "the run's current tools".
  - *Missing invariant*: "the session's tools are the definition's tools" holds only at start.
  - *A required behavior decided by absence*: `not_exposed` means "no server", so a run cannot gain its first tool.
  - *A single-slot port* now has a second source.
- Root cause classification: `Missing Invariant`
- Refactor needed now: `Yes` (bounded):
  - one run operation, with the backend as the per-runtime owner;
  - a replaceable, always-present session exposure;
  - a composite notice port.
- Evidence: E-02, E-04, E-05, E-08, E-16.
- Design response: `AgentRun.applyDefinitionTools(definition)` is the single operation, and `ToolListUpdateService` its single caller. Each backend owns how its runtime takes the tools. `AgentRunPlatformNotices` owns combining the notice sources.
- Refactor rationale: without one operation, every runtime would grow its own change listener (duplicated coordination). Without the composite, the second source would need a second slot on `AgentRun`, the manager and the supervisor.
- Intentional deferrals: FU-002 (dead Codex dynamic-tool path).

## Terminology

- **Tool exposure**: the resolved set of tools a run may use (`RuntimeAgentToolExposure`), from its definition and its team membership.
- **Reopen**: ending a run's runtime session and opening it again on the same conversation, without stopping the run. Codex: unsubscribe and resume the thread. Grok: a new process with `session/load`.
- **Turn-start dispatch**: an input dispatched as `start_turn` (not `append_to_active_turn`).

## Legacy Removal Policy (Mandatory)

- Obsolete paths in this scope:
  - the AGY header `X-Autobyteus-MCP-Transport` and its GET 405 branch;
  - `sendSseCompatibilityResponse`;
  - `listChanged: false`;
  - `not_exposed` and every `descriptor === null` branch it feeds;
  - Claude's start-time Agent Tools names in `allowedTools`;
  - Claude's cached activation;
  - the docs' "long-lived SSE server push" out-of-scope note.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- Stored subject, location and shape: the tool names a run was last given, at `<memoryDir>/seen_tool_names.json`, shaped `{ "version": 1, "toolNames": ["get_project_task", "read_file", …] }`. One small file per run that has a memory folder; runs without one keep the record in memory only, as the skill record does.
- Change: new additive file. Nothing existing changes.
- Normal reader and writer: `SeenToolNamesStore`, a copy of the `SeenSkillVersionsStore` rules. Reads are tolerant: missing, unreadable or invalid all mean "no record". Writes are atomic and never create or re-create the memory folder (a folder that is still missing is retried later, and a write for a released run is aborted).
- Invariants:
  - Written when a new run is published (its current names).
  - Written when a tool notice is delivered (the names it announced).
  - Written when a restored run without a record is published (its current names, with no notice).
  - Deleted with the run's memory.
- Decision: `Directly Usable — No Migration`.
- Rationale: runs from before this change have no record. "No record" is defined as "has seen the current list", so they get no false notice and no migration is needed.
- Supports: REQ-009, AC-006.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 002 | A change signal | Each tracked run has been asked to take its definition's tools | `ToolListUpdateService` | The one path for all runtimes and change sources |
| DS-002 | Bounded Local | BEH-002 | `replaceForRun` | `tools/list`/`tools/call` answer from the new record; `list_changed` sent on the session's GET streams | `AgentToolMcpSessionService` (it calls the registry, then the streams) | Removal enforcement and the signal |
| DS-003 | Primary End-to-End | BEH-001 | `applyDefinitionTools` on native, Claude or AGY | The runtime's next model call has the list | each backend | Immediate runtimes |
| DS-004 | Primary End-to-End | BEH-001, 004 | `applyDefinitionTools` on Codex or Grok | The runtime session is reopened inside the next turn-start dispatch, then the input is sent | the Codex / Grok backend | Reopen runtimes |
| DS-005 | Return-Event | BEH-001, 003 | Applied, or a restored run published | The notice reaches the agent, and the card reaches the user | `ToolListUpdateService`, behind `AgentRunPlatformNotices` | REQ-006, 007, 009 |
| DS-006 | Bounded Local | BEH-001 | A save / reload / application package change | `AgentDefinitionChangeSignal` listeners called | `AgentDefinitionChangeSignal` | REQ-001 (UC-003) |

## Primary Execution Spine(s)

- DS-006:
  - `AgentPackageDefinitionReloader publisher (feed composition) -> AgentDefinitionChangeSignal.notifyChanged`;
  - `AgentDefinitionService.updateAgentDefinition (application-owned ID) -> notifyChanged`;
  - `ApplicationPackageCommandService (after commit) -> notifyChanged`.
- DS-001: `AgentDefinitionChangeSignal -> ToolListUpdateService.onDefinitionsChanged (coalesced) -> for each tracked run: AgentDefinitionService.getAgentDefinitionById(run.config.agentDefinitionId) -> AgentRun.applyDefinitionTools(definition) -> AgentRunBackend.applyDefinitionTools -> result { kind, toolNames } -> diff with seen -> mark pending`.
- DS-002: `backend -> AgentToolMcpRunSessionAuthority.replaceForRun({ runId, runtimeExposure }) -> AgentToolMcpSessionService (catalog re-resolution) -> AgentToolMcpSessionRegistry.replaceToolExposure (one frozen record) -> AgentToolsMcpSessionStreams.notifyToolsChanged(sessionId) -> current descriptor returned`.
- DS-003:
  - Claude: `backend -> replaceForRun -> runtimeContext.runtimeToolExposure replaced -> (the runtime re-lists over its GET stream)`. Later process generations read `runtimeToolExposure` and `describeForRun`.
  - AGY: `backend -> replaceForRun -> (the runtime re-lists)`.
  - Native: `backend -> resolve exposure + resolveApplicationAwareAgentTools -> Agent.replaceTools(tools) -> AgentRuntimeState.toolInstances swapped before the next LLM call; removed instances cleaned up`.
- DS-004:
  - On apply: `backend -> replaceForRun (removal at once) -> reopenPending = (current descriptor ≠ the one the runtime session was opened with)`.
  - On dispatch: `AgentRun.dispatch(start_turn) -> backend.dispatchUserInput -> (reopenPending) reopen -> send`, or a failure notice and a failed dispatch. An `append_to_active_turn` is sent on the current session unchanged.
- DS-005: `AgentRun.dispatch -> AgentRunPrefaceDispatch.take(kind) -> AgentRunPlatformNotices.takePreface(run, { dispatchKind }) -> sources in order (ToolListUpdateService, SkillUpdateNoticeService) -> first non-null -> combinePreface -> backend -> settle -> the owning source's prefaceDelivered / prefaceReturned`. Busy immediate runs: `ToolListUpdateService -> AgentRun.postUserMessage` (as skills do).

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-006 | Every way a definition changes ends in one signal. The signal carries no IDs: definitions are read on demand by ID, so the service re-reads each tracked run's own definition. That covers shared, team-local, org-owned and application-owned agents alike | signal | `AgentDefinitionChangeSignal` | none |
| DS-001 | Signals are coalesced: one pass at a time, plus one trailing pass if more signals arrived. Each tracked run's definition is re-read. A missing definition is skipped. The backend says whether anything changed and which tool names the agent has (or will have at its next turn start). The service diffs those names with the seen record | definition, run | `ToolListUpdateService` | diff, coalescing |
| DS-002 | The service re-resolves the exposure through the catalog, as activation does. The registry replaces the session's record as one frozen object, so a `tools/call` sees the old set or the new one, never a mix. The session's open GET streams then get `notifications/tools/list_changed`. An empty list is a valid record | session, stream | `AgentToolMcpSessionService` | keepalive; streams closed at deactivation |
| DS-003 | The immediate runtimes take the change from their next model call. Claude's coordinator auto-allows a tool that is in the current descriptor's enabled list, as `allowedTools` did before. Any other tool goes through the existing approval logic | — | backend | Claude approval check |
| DS-004 | A reopen happens only inside a turn-start dispatch, when no turn is active. If it fails, the dispatch fails: the input is not sent (DEC-007), the failure notice with the restart button is published, and `reopenPending` stays set, so the next turn-start tries again. A change reverted before the next turn start clears `reopenPending` | — | backend | restart button |
| DS-005 | The composite asks the tool source first, then the skill source, and hands the first preface it gets, so one notice per dispatch (DEC-006). It remembers which source gave which preface and settles only that source. The tool source returns its notice for a run waiting for a reopen only on `start_turn`; otherwise on any external input. A restored run whose record differs from its current names gets the notice on its first input. Lifecycle calls go to each source in order, each guarded | notice | `AgentRunPlatformNotices`; `ToolListUpdateService` | localization |

## Spine Actors / Main-Line Nodes

`AgentDefinitionChangeSignal`, `ToolListUpdateService`, `AgentRunPlatformNotices`, `AgentRun`, `AgentRunBackend` (×5), `AgentToolMcpSessionService` (behind the run-session authority, including its scoped form), `AgentToolMcpSessionRegistry`, `AgentToolsMcpSessionStreams`, `CodexThreadManager`, `AcpSessionLauncher`, the `autobyteus-ts` `Agent`.

## Ownership Map

- `AgentDefinitionChangeSignal`: owns listeners and calls them; nothing else.
- `ToolListUpdateService`:
  - which runs are tracked;
  - each run's seen names (through `SeenToolNamesStore`);
  - whether a run's notice waits for a turn start;
  - the delivery state (dirty/inFlight, as the skill notice has);
  - coalescing passes.
- `AgentRunPlatformNotices`: the order of sources, which source owns which preface in flight, and lifecycle fan-out.
- `AgentRunBackend.applyDefinitionTools`: resolving its runtime's tools from the definition, comparing them with what its runtime has, applying them, and `reopenPending` (Codex/Grok).
- `AgentToolMcpSessionService`: re-resolving and replacing a session's exposure, and describing it.
- `AgentToolMcpSessionRegistry`: the session record.
- `AgentToolsMcpSessionStreams`: open GET streams per session, keepalives, notifications, closing.
- `CodexThreadManager.reopenThread`: the Codex reopen on the run's existing preparation (client, lease, skills, thread object).
- `AcpSessionLauncher`: spawning a process, connection and session and opening it (`new` / `load`), for creation, restore and reopen.
- `AgentRun.applyDefinitionTools`, `AgentRun.getToolNames`: thin boundaries to the backend.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentRun.applyDefinitionTools` / `getToolNames` | backend | Callers use the run, never the backend | Diffing, notices |
| `AgentToolMcpRunSessionAuthority.replaceForRun` / `describeForRun` (and the scoped authority) | `AgentToolMcpSessionService` | Backends hold the authority, not the service | Policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `X-Autobyteus-MCP-Transport` in `agy-mcp-config-materializer.ts`; the 405 branch in `agent-tools-mcp-routes.ts:95-98` | AGY 1.4.10 works with a held GET stream (probe) | The held GET stream | 1.2.10 workaround |
| `sendSseCompatibilityResponse` (`agent-tools-mcp-http-gate.ts:36-41`) | GET becomes a real stream | `AgentToolsMcpSessionStreams.open` | — |
| `listChanged: false` (`agent-tools-mcp-method-dispatcher.ts:93`) | The server notifies | `listChanged: true` | — |
| `not_exposed` (`agent-tool-mcp-session-authority.ts:29-31`, `agent-tool-mcp-session-service.ts:64-66`) and the null-descriptor branches in Claude (`claude-session-query-options.ts:28-33`, session state), AGY (`agy-agent-run-backend-factory.ts:~134`), Codex (`codex-thread-bootstrapper.ts:345-347`), ACP (`acp-agent-run-backend-factory.ts:188,235`, `grok-build-session-profile.ts` null cases) | Every external run has a session (AR-003) | `activateForRun` returns the active session always | An empty list is a valid record |
| Claude's cached activation (`claude-agent-tools-mcp-session-state.ts:21-48`) | The descriptor changes during the run | `ensureActive` once, then `describeForRun` per read | — |
| Agent Tools names in Claude's `allowedTools` (`claude-session-tooling-options.ts:151-154`) | The list can change during the run | The coordinator's current-descriptor check | `Skill` stays |

## Return Or Event Spine(s) (If Applicable)

- DS-005 (above).
- Failure: `Codex/Grok backend reopen fails -> backend emits SYSTEM_TASK_NOTIFICATION { sender_id: TOOL_LIST_UPDATE_NOTICE_SENDER_ID, content: "Couldn't give this run its new tools.", action: "restart_run" } through its event path -> the run's event stream -> the web card with the "Restart this run with the new tools" button -> the existing stop + restore of the same run`.

## Bounded Local / Internal Spines (If Applicable)

- Parent `ToolListUpdateService`, per run: `signal -> apply -> diff -> dirty -> (busy and immediate) post now | (idle, or the run waits for a turn start) preface -> delivered -> record seen | returned -> dirty again`. This is the skill notice's state machine, plus the `waitForTurnStart` flag.
- Parent Codex/Grok backend: `open -> (apply, changed) reopenPending -> (start_turn) reopening -> open (send; reopenPending recomputed) | failed (failure notice, the input fails, reopenPending stays; Grok: no runtime session until the next start_turn)`. An append never enters `reopening`.

### Codex reopen sequence (`CodexThreadManager.reopenThread(runContext)`, called by the backend inside a `start_turn` dispatch)

1. Precondition: no active turn (`runtimeContext.activeTurnId === null`). The thread object, client, lease and materialized skills stay as they are.
2. `codexThreadConfig.appServerConfig = materializeCodexAgentToolsMcpThreadConfig(runSessions.describeForRun(runId))`. No activation.
3. If the thread has history: `thread/unsubscribe { threadId }` on the same client, then `thread/resume { threadId, config: … }` (`resumeRemoteThread` with the rebuilt config). The thread ID is unchanged; the router binding and listeners are kept. Measured to reconnect the MCP server with the new list (E-13).
4. If the thread has no history (no completed turn; there is no rollout to resume, E-13): `thread/unsubscribe`, then `thread/start` with the rebuilt config. Store the new thread ID and re-register it with the router. There is no conversation to keep.
5. On success:
   - remember the descriptor the thread was resumed with;
   - recompute `reopenPending` as (current descriptor ≠ that descriptor), so a save during the reopen is not lost (SR-003);
   - `turn/start` as usual.
6. On failure: emit the failure notice, keep `reopenPending`, and fail the dispatch with `RUNTIME_SESSION_REOPEN_FAILED`. The next `start_turn` repeats from step 2.
7. Removal is enforced by the server during the whole sequence, because the session is never deactivated.

### Grok reopen sequence (`AcpAgentRunBackend`, inside a `start_turn` dispatch) — SR-003: end first, then load

This is the measured order (E-14: `drive-grok-reopen.mjs` ends the first process before the second loads), and it is the product's restore order. Two live Grok processes never hold one session.

**One owner of the run's ACP process (SR-004, ARCH-REV-003 AR-008).** The run's `AcpPreparationOwner` (`acp-agent-run-backend-factory.ts:79`, the `{ process, connection, session, skills }` record) is the single holder of the run's process, connection and session. That holds for creation, restore and reopen alike:
- `AcpSessionLauncher.open({ owner, mode, sessionId?, descriptor, sinks })` records each handle in the owner as soon as it exists: the process at spawn, then the connection, then the session. So a half-opened process is always held by the owner.
- `AcpAgentRunBackend` does not keep its own copies of the connection and session. It reads them from the owner (`owner.session`, `owner.connection`). "No runtime session" is exactly `owner.session === null`.
- The factory's `releaseResources` (`:84-94`) is unchanged and already null-safe. It closes what the owner holds **now**, so stop or the restart button after a reopen ends the reopened process, and after a failed reopen closes nothing and only releases the skills.

1. Precondition: no active turn. `dispatchUserInput` already refuses a `start_turn` while `session.activeTurnId` is set (`acp-agent-run-backend.ts:91-92`), and ACP refuses appends (`:88-89`). The materialized skills stay, because they belong to the run's `cleanup`, not to the process.
2. If a runtime session is open, end it **as a reopen**:
   - detach its failure and event sinks first, so the exit does not reach `handleSessionFailure` (`:82-85`), which would shut the run down and release its skills;
   - `owner.session.close()`, then `owner.connection.close()` (or `owner.process.stop()`);
   - set `owner.session`, `owner.connection` and `owner.process` to `null`;
   - do not call `cleanup`.
3. `descriptor = runSessions.describeForRun(runId)`.
4. `AcpSessionLauncher.open({ owner, mode: "load", sessionId, descriptor, sinks })`: spawn a new process and connection **into the owner**, `initialize`, `session/load` with `mcpServers` from the descriptor, and await MCP readiness. This is restore's code, extracted from `acp-agent-run-backend-factory.ts:155-205` and shared by the factory and the backend. Measured to reconnect (E-14). The sinks target the backend, the same `DeferredEventSink` role as at creation.
5. On success:
   - the owner already holds the new process, connection and session, and the sinks are bound to them;
   - recompute `reopenPending` as (current descriptor ≠ the descriptor this session was opened with), so a save during the reopen is not lost;
   - `session/prompt` as usual. If a save did arrive, the reopen runs again at the next `start_turn`; the server already enforces removal.
6. On failure:
   - end the half-opened process the owner holds (session, connection or process, whichever exists), and set the owner's handles to `null`;
   - leave the backend with **no runtime session** (`owner.session === null`): the run stays active and idle, and is not failed;
   - keep `reopenPending`;
   - emit the failure notice;
   - return `{ forwarded: false, code: "RUNTIME_SESSION_REOPEN_FAILED" }`. The message is not sent (DEC-007).

   The next `start_turn` repeats from step 3. The restart button (stop, then restore) works too.
7. A backend with no runtime session (after step 2 or step 6) handles every operation:
   - `getLifecycleSnapshot`: availability `active`, phase `idle`, no current turn.
   - `dispatchUserInput(start_turn)`: `reopenPending` is set, so it reopens (from step 3). An append is refused as today.
   - `approveToolInvocation`: `{ accepted: false, code: "NO_PENDING_APPROVAL" }`. None can be pending, because the reopen ran with no active turn.
   - `interrupt`: `NO_ACTIVE_TURN`.
   - `terminate`: `cleanup()` as today. The owner holds no handles, so nothing is closed and the skills are released.
   - `getPlatformAgentRunId`: the unchanged `sessionId`.
8. Tests (with a fake launch profile):
   - stop after a successful reopen ends the **reopened** process and leaves no process alive;
   - stop after a failed reopen ends nothing and releases the skills;
   - a deliberate end in step 2 does not reach `handleSessionFailure`.

Codex needs no such change. Its reopen keeps the run's `ThreadPreparation` (client, lease, skills) and the same `CodexThread` object (`codex-thread-manager.ts:123-138`). In the no-history case, only `runtimeContext.threadId` and the router registration change, on that same object. `releasePreparation` (`:78-113`) therefore releases what the run holds now.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine | Serves | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Tool-name diff | DS-001 | service | added / removed names | REQ-008 | Noise or missed changes |
| Notice text and card event | DS-005 | service | short text; card payload | REQ-006, 007 | Wording spread over backends |
| Seen record | DS-005 | service | `SeenToolNamesStore` | REQ-009 | Restore misses changes |
| GET keepalive and close | DS-002 | streams | a comment every 15 s; closed on deactivation | Long-lived streams | Leaked sockets |
| Failure notice | DS-004 | backend | one event with `action: restart_run` | REQ-010 | — |
| Restart button | DS-004 | web | the existing stop + restore | REQ-010 | — |

## Ownership Boundaries

- The service never touches runtime details; it calls `AgentRun.applyDefinitionTools`.
- Backends never diff or notify the agent. Their only event is the reopen failure notice.
- Only the session service changes a session's exposure, and only the streams owner writes to GET streams.
- `AgentRun` knows only the composite port, never the sources.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Upstream Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `AgentRun.applyDefinitionTools` | backend runtime handling | `ToolListUpdateService` | The service reaching into a backend's runtime context | Extend the backend contract |
| `AgentToolMcpRunSessionAuthority` (`activateForRun`, `replaceForRun`, `describeForRun`, `deactivateForRun`; the scoped authority forwards and records) | catalog, registry, streams | backends | Backends writing the registry or streams | Add a parameter |
| `AgentRunPlatformNotices` | the sources | `AgentRun`, `AgentRunManager`, the supervisor | A second preface slot on `AgentRun` | Add a source |

## Dependency Rules

- `tool-list-updates` depends on `agent-execution` (run, ports), `agent-definition` (service, signal), and `skill-update-notices`' store pattern (copied, not imported); never on backends or `agent-tools`.
- Backends depend on the run-session authority; never on `tool-list-updates`.
- `AgentRunPlatformNotices` lives in `agent-execution/domain` and knows only the port interfaces.
- The MCP routes depend on the streams owner; the dispatcher does not.
- The compositions build the composite with the two services and pass it as the single slot.

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `AgentRun.applyDefinitionTools(definition): Promise<{ kind: "unchanged" \| "applied" \| "on_next_turn"; toolNames: readonly string[] }>` | run | the backend resolves its runtime's tools from the definition and applies them | the run | `toolNames`: the names the agent calls (without the MCP prefix), now or at the next turn start. Rejected on a stopped run |
| `AgentRun.getToolNames(): readonly string[]` | run | the names the runtime has now | the run | For the seen record at publish |
| `AgentToolMcpRunSessionAuthority.replaceForRun({ runId, runtimeExposure }): AgentToolMcpDescriptor` | session | re-resolve, replace, notify | runId | The session exists for every external run |
| `AgentToolMcpRunSessionAuthority.describeForRun(runId): AgentToolMcpDescriptor` | session | current descriptor | runId | Throws for an unknown run |
| `AgentToolMcpSessionRegistry.replaceToolExposure(sessionId, record)` | session | atomic replace | sessionId | — |
| `AgentToolsMcpSessionStreams.open(sessionId, reply)` / `notifyToolsChanged(sessionId)` / `closeSession(sessionId)` | GET streams | hold, notify, close | sessionId | Built in `agent-tools-mcp-host.ts` beside the registry |
| `AgentRunInputPreface.takePreface(run, context: { dispatchKind: "start_turn" \| "append_to_active_turn" })` | preface | hand a pending notice | run + kind | The skill service ignores the kind |
| `AgentRunPlatformNotices(sources: readonly (AgentRunInputPreface & AgentRunLifecycleObserver)[])` | composite | order, routing, fan-out | — | Order: tool-list updates, then skill notices |
| `Agent.replaceTools(tools: BaseTool[])` (`autobyteus-ts`) | native tools | swap before the next LLM call; clean up removed instances | the agent | — |
| `AgentDefinitionChangeSignal.notifyChanged()` / `subscribe(listener): () => void` | definitions | one signal for every change path | — | No IDs (DS-006) |
| `CodexThreadManager.reopenThread(runContext)` | Codex thread | the reopen sequence | runId | — |
| `AcpSessionLauncher.open({ owner, mode, sessionId?, descriptor, sinks })` | ACP process | spawn and open into the run's `AcpPreparationOwner` | the owner | Shared by the factory (create, restore) and the backend (reopen); the owner is the single holder of the handles |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `applyDefinitionTools` | Yes | Yes | Low | — |
| `replaceForRun` / `describeForRun` | Yes | Yes | Low | The absence case is removed (always active) |
| `takePreface(run, { dispatchKind })` | Yes | Yes | Low | — |
| `AgentDefinitionChangeSignal` | Yes | N/A | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Glossary-Consistent? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| capability area | `tool-list-updates` | Yes | Yes ("tool", "run", "agent definition") | Low | — |
| card | "Tools updated" | Yes | Yes (mirrors "Skill updated") | Low | — |
| composite | `AgentRunPlatformNotices` | Yes | Yes (the "platform notice" of the preface tag) | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why | If New, Why |
| --- | --- | --- | --- | --- |
| Run lifecycle, preface, busy post, card | `AgentRunLifecycleObserver`, `AgentRunInputPreface`, the system-task notification card | Reuse (ports), Extend (dispatch kind) | Same delivery | — |
| Two notice sources | — | Create New (`AgentRunPlatformNotices`) | A single slot today (E-16) | A second slot would spread through three owners |
| Seen record | `SeenSkillVersionsStore` rules | Copy (a separate store) | Different shape; the same rules | — |
| Exposure resolution | `runtime-agent-tool-exposure.ts`, native resolver | Reuse | One builder | — |
| Reopen | Codex `resumeRemoteThread`; ACP launch | Reuse / Extract (`AcpSessionLauncher`) | Same conversation | — |
| Restart button | the existing stop + restore | Reuse | BEH-004 | — |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/tool-list-updates/` | tracking, diff, seen record, notice | DS-001, DS-005 | Create New |
| `agent-definition/` | change signal | DS-006 | Extend |
| `agent-tools/mcp/` | always-active session; replace/describe; GET streams | DS-002 | Extend |
| `agent-execution/` (domain, input, the five backends) | `applyDefinitionTools`; composite; preface kind; reopen | DS-003, DS-004, DS-005 | Extend |
| `autobyteus-ts/src/agent/` | `replaceTools` | DS-003 | Extend |
| compositions (`build-studio-server.ts`, `start-standalone-application-host.ts`, `agent-package-definition-feed-composition.ts`) | wiring | all | Extend |
| `autobyteus-web` | card, failure button | DS-004, DS-005 | Extend |

## Final File Responsibility Mapping

| File | Owner | Concern |
| --- | --- | --- |
| `src/tool-list-updates/services/tool-list-update-service.ts` (new) | service | tracking, coalesced passes, apply, delivery state, the `AgentRunInputPreface` and observer side |
| `src/tool-list-updates/services/tool-list-diff.ts` (new) | service | added / removed names |
| `src/tool-list-updates/services/tool-list-update-notice-builder.ts` (new) | service | notice text; card event; post message |
| `src/tool-list-updates/providers/seen-tool-names-store.ts` (new) | service | `<memoryDir>/seen_tool_names.json` |
| `src/tool-list-updates/tool-list-updates.ts` (new) | composition | create and close, as `skill-update-notices.ts` |
| `src/agent-definition/services/agent-definition-change-signal.ts` (new) | definitions | the signal |
| `agent-definition-service.ts` | definitions | `notifyChanged` after an application-owned update |
| `compositions/agent-package-definition-feed-composition.ts` | wiring | the reloader publisher also calls the signal |
| `application-packages/services/application-package-command-service.ts` | application packages | `notifyChanged` after a committed import / reload / remove |
| `src/agent-execution/domain/agent-run-platform-notices.ts` (new) | composite | order, routing, fan-out |
| `agent-run-input-preface.ts`, `agent-run-input-preface-dispatch.ts`, `agent-run.ts` | run | `takePreface(run, { dispatchKind })`; `applyDefinitionTools`, `getToolNames` |
| the backend contract (`agent-run-backend.ts`) | run | the two operations |
| `agent-execution/domain/system-task-notification-senders.ts` | notices | `TOOL_LIST_UPDATE_NOTICE_SENDER_ID` |
| `compositions/build-studio-server.ts`, `standalone-application-host/start-standalone-application-host.ts` | wiring | create tool-list updates; pass `new AgentRunPlatformNotices([toolListUpdates.service, skillUpdateNotices.service])`; close order |
| `agent-tools/mcp/agent-tools-mcp-session-streams.ts` (new) | streams | held GET streams |
| `agent-tools-mcp-routes.ts`, `agent-tools-mcp-http-gate.ts`, `agent-tools-mcp-method-dispatcher.ts`, `agent-tools-mcp-host.ts` | MCP endpoint | GET stream; `listChanged: true`; removals; the streams built in the host |
| `agent-tool-mcp-session.ts`, `agent-tool-mcp-session-registry.ts`, `agent-tool-mcp-session-service.ts`, `agent-tool-mcp-session-authority.ts`, `scoped-agent-tool-mcp-session-authority.ts` | session | always active; `replaceForRun`, `describeForRun`; streams closed at deactivation |
| Claude: `claude-agent-run-backend.ts`, `claude-agent-run-context.ts`, `claude-agent-tools-mcp-session-state.ts`, `claude-session-query-options.ts`, `claude-session-tooling-options.ts`, `claude-session-tool-use-coordinator.ts` | Claude | current exposure and descriptor; approval check |
| AGY: `agy-agent-run-backend.ts`, `agy-agent-run-backend-factory.ts`, `agy-mcp-config-materializer.ts` | AGY | apply; always configured; header removed |
| Native: `autobyteus-agent-run-backend.ts`; `autobyteus-ts/src/agent/agent.ts`, `agent/context/agent-runtime-state.ts` | native | `replaceTools` |
| Codex: `codex-agent-run-backend.ts`, `codex-thread-manager.ts`, `codex-thread-bootstrapper.ts`, `codex-agent-run-context.ts` | Codex | `reopenPending`; `reopenThread`; config from the descriptor; always configured |
| Grok / ACP: `acp-agent-run-backend.ts`, `acp-agent-run-backend-factory.ts`, new `acp-session-launcher.ts`, `grok-build-session-profile.ts` | Grok | `reopenPending`; the launcher; always configured |
| web: `SystemTaskNotificationSegment.vue`, `localization/messages/*/workspace.ts` | web | "Tools updated" card; failure card with the button |
| docs: `agent_tools_mcp_server.md`, new `tool_list_updates.md`, `agent_execution.md`, `skill_update_notices.md` (the composite), web `agent_execution_architecture.md` | docs | — |

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/tool-list-updates/` | Folder | `ToolListUpdateService` | definition change → run tools → notice | Runtime-specific code |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-session-streams.ts` | File | streams | GET streams | Exposure resolution |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-platform-notices.ts` | File | composite | sources | Notice content |
| `autobyteus-server-ts/src/agent-execution/backends/acp/session/acp-session-launcher.ts` | File | launcher | spawn and open | Turn handling |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `src/tool-list-updates/` | Off-Spine Concern | Yes | Low | Mirrors `skill-update-notices/` |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Removal | The registry replaces one frozen record; `tools/call` reads it per call | Each backend filtering calls itself | One place enforces REQ-004 |
| Notice | "Your tools changed. Now available: get_project_task. No longer available: search_memory." | A list of every tool | Short (REQ-006) |
| Codex busy | Notice and reopen wait for the next `start_turn`; a `turn/steer` append goes to the current thread unchanged | Posting "now available" mid-turn | A truthful notice (AR-002) |
| Zero tools | A session with `enabledTools: []`, configured on the runtime | No server until restart | First tool reachable (AR-003) |
| Two notices | Tools this message, skills next message | Two prefaces in one message with one sender tag | Contracts unchanged (DEC-006) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Plan |
| --- | --- | --- | --- |
| Keep the AGY header for old AGY | AGY 1.2.10 | Rejected | Remove; installed AGY 1.4.10 measured |
| Keep the one-shot SSE GET for some clients | Today's clients | Rejected | One held stream for all |
| Keep start-time `allowedTools` beside the coordinator check | Smaller change | Rejected | Coordinator checks the current descriptor |
| Keep `not_exposed` and reopen runs that gain their first tool | Fewer servers configured | Rejected | Always-active session (E-15) |
| A second preface slot on `AgentRun` | Simple wiring | Rejected | The composite |

## Change / Refactor Sequence

1. **Server, Agent Tools endpoint:**
   - the session always active (`not_exposed` and the null branches removed);
   - `replaceForRun`/`describeForRun`;
   - `AgentToolsMcpSessionStreams` with the held GET stream;
   - `listChanged: true`;
   - the header branch and the compatibility response removed.

   Tests: removal refused at once; notification on GET; an empty list. Check, without a model, that Codex accepts `enabled_tools: []` (the escalation trigger applies).
2. **The signal and its three sources.**
3. **The run side:**
   - the preface kind;
   - `AgentRunPlatformNotices`, wired in both compositions;
   - `AgentRun.applyDefinitionTools`/`getToolNames` in the backend contract;
   - `ToolListUpdateService` with `SeenToolNamesStore`, the notice and the card (sender ID, web card).

   Integration tests: the skill notice is unchanged behind the composite.
4. **Claude and AGY backends** (coordinator check; current exposure and descriptor; header removed from the AGY materializer). Real runs on isolated data.
5. **Native:** `Agent.replaceTools`; the native backend. Real run.
6. **Codex and Grok:**
   - `reopenPending`;
   - the reopen sequences, with `AcpSessionLauncher` extracted;
   - the failure notice and the button.

   Integration tests against the protocol (the reopen drivers are the reference), including a failing reopen and an append while pending. Real run: Grok now. Codex: a real run if the limit is back before merge (DEC-004).
7. **Docs; e2e on isolated data from a clean clone; merge into `personal`.**

## Key Tradeoffs

- **Reopen versus a notification for Codex/Grok:** neither runtime re-reads its tool list. A reopen is the only way that keeps the conversation without involving the user. It costs the prompt cache once.
- **An always-present server:** one more MCP connection for runs with no Agent Tools tools. In return there is one path and no "first tool" special case.
- **One notice per message (DEC-006):** a skill notice may arrive one message later when both are pending. The existing contracts stay unchanged.
- **Re-reading every tracked run on any signal:** cheap, because definitions are in-memory store reads and runs number in the tens. It avoids mapping folders to definition IDs.

## Risks

- R-01: runtime versions change. The server enforces removal on any version, and the e2e names the versions it proved.
- Codex may reject `enabled_tools: []`. This is checked in step 1 without a model; the escalation trigger applies.
- An external runtime that keeps offering a removed tool from its own cache (Grok's `search_tool`; Codex/Grok mid-turn) gets a refusal, which REQ-004 accepts.
- A held GET stream behind a slow client: writes are fire-and-forget, and the stream closes on error.
- AGY without the header against the product endpoint has only been measured against the probe. The build confirms it.

## Guidance For Implementation

- Reproduction to start from: `evidence/probe/`. The turn script is: call alpha; add beta; call beta; remove alpha; call alpha. It is the real-run check per runtime against an isolated server instance. `drive-codex-reopen.mjs` and `drive-grok-reopen.mjs` show the reopen protocol sequences without a model.
