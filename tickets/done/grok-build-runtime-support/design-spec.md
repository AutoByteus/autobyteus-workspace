# Design Spec — Grok Build Runtime on a Reusable ACP Layer

## Solution And Approval Basis

- Current solution revision ID: `SR-011` (design revision after failure-origin review CRR-002; earlier: SR-008 after ARCH-REV-001, SR-007 initial)
- Approved requirements baseline and user-approval reference: `requirements-doc.md` at SR-005, approved 2026-09-26 ("do you think building a reusable ACP layer is better, if yes. then approved"); SR-006 wording change (DSH instead of Gemini CLI) directed by the user; SR-008 clarifications (REQ-011/AC-009 per-call records, REQ-016/AC-013 `workflow` + `ask_user_question`, AC-004 canonical name) — see requirements approval note.
- Behavior-defining supplements: none (probe evidence only).
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md` (sections "Architecture Investigation Findings" ARC-01..ARC-19, "Runtime, Probe, Or Reproduction Findings", "ACP Ecosystem Evidence", "Precedent-Based Decisions").
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support`, branch `codex/grok-build-runtime-support`, base `origin/personal` @ `e06080b00` (fast-forwarded in SR-008; delta checked, ARC-25); finalization target `origin/personal`.
- Review history: ARCH-REV-001 (Fail — AR-001, AR-002 blocking; AR-003, AR-004 non-blocking) → all four addressed in SR-008 (see "SR-008 Review Resolution" at the end).

## Current-State Read

Four runtimes exist (`autobyteus`, `codex_app_server`, `claude_agent_sdk`, `antigravity_cli`). Each external runtime is a self-contained backend family behind `AgentRunBackendFactory`/`AgentRunBackend`, registered explicitly in `AgentProviderFactoryBuilder` (both General Process and Application execution scopes), resolved by `AgentRunManager`, and bound to a durable provider id (`platformAgentRunId`) before candidate publication (ARC-01). Shared services already own everything runtime-neutral: prompt composition (`composeSharedCarpenterPrompt`), tool exposure, Agent Tools MCP sessions, skill materialization profiles, system-instruction capture, the event pipeline (file-change derivation), raw-trace memory recording, token-usage pricing through `LLMFactory`, run-model selection, run history. No ACP code exists; the closest transport (Codex client) is Codex-owned (ARC-03). The Antigravity backend is the freshest precedent for a per-run CLI process; Claude is the precedent for interactive approvals, HTTP MCP and skill symlinks.

There is no current structural defect to fix. The change is additive: a new runtime-neutral ACP backend family plus a Grok profile, registration in the existing seams, and an `autobyteus-ts` catalog row update.

## Task Size And Architectural Risk (Mandatory)

- Task size: **Large**
- Size rationale: a new runtime owner spanning a new external protocol client (ACP over stdio via a new dependency), a generic ACP backend (process, session state machine, permission bridge, event conversion, prompt building), a Grok profile (launch, session meta, MCP readiness, tool projection, usage, model normalization, skills), catalog/availability/selection wiring, restore/resume/history wiring, application-scope wiring, frontend label maps, `autobyteus-ts` catalog row, plus unit/integration/gated-live tests. ~25 new server files and ~20 modified files across server, web and `autobyteus-ts`.
- Architectural risk: **High**
- Risk rationale: new external protocol and dependency; high-trust permission mapping (always-approve vs per-call approvals); exact provider-id binding persisted in run metadata; concurrent child processes with bidirectional JSON-RPC and cancellation; a new shared subsystem (ACP layer) whose boundary must stay runtime-neutral (REQ-018); team-tool reachability through Grok's MCP indirection.
- Escalation trigger: (a) any required change to an approved behavior (e.g. Grok cannot restrict `ask_user_question`, cannot resume, or requires a different approval mapping) → `Requirement Gap`; (b) a provider/protocol fact contradicting ARC-01..ARC-19 (e.g. `_x.ai/session_notification{response_completed}` usage absent, SDK rejecting new Grok traffic, MCP readiness notification missing) → `Design Impact`; (c) any need to modify Codex/Claude/AGY behavior → stop and return (REQ-014).

## Architecture Investigation Evidence

| Source / Probe | Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Manager/lifecycle | ARC-01 | Provider id required before publication; exact restore by id | `createBackend` completes `session/new`; `restoreBackend` requires `session/load` of the stored id | None |
| Codex client | ARC-03 | Codex-owned JSON-RPC client | Do not reuse; ACP layer owns its own connection | None |
| ACP SDK | ARC-04, ARC-05 | SDK 1.5.0 accepts all recorded Grok traffic; ext hooks | Build shared layer on `@agentclientprotocol/sdk` | Future Grok versions; mitigated by extension isolation |
| AGY backend | ARC-06 | Robustness pattern | Startup/idle timeouts, `fail()` semantics, ordered publish queue | None |
| Claude approvals | ARC-07 | Approval event contract | Permission bridge keyed by `toolCallId` | None |
| File-change processor | ARC-08, ARC-09 | Canonical names drive artifacts | Grok `write`/`search_replace` → `write_file`/`edit_file` | `search_replace` argument field names unrecorded → fall back to ACP `locations` |
| Tool-name normalizer | ARC-10 | Existing helper handles `autobyteus_agent_tools__x` | Reuse for `use_tool` canonicalization | None |
| Per-call usage | ARC-20, ARC-21, ARC-22, ARC-23 | One `response_completed` per model call; per-call input excludes cache; sums equal turn totals; pricing tiers per record from input + cache; cancelled in-flight call unreported; load replay contains usage frames | Per-call `TOKEN_USAGE_UPDATED` from `response_completed`, `base_excludes_cache`, replay-suppressed | None |
| Restore identity | ARC-13 | Injected rules persist through `session/load` | No re-injection on restore | None |
| Built-in tools | ARC-14, ARC-24 | `task`, `workflow` (child agents), `ask_user_question` (blocks ≤30 min) present by default; documented env switches `GROK_SUBAGENTS`, `GROK_WORKFLOWS`, `GROK_ASK_USER_QUESTION`; `agentProfile` would replace the default agent | Launch env switches; no `_meta.agentProfile` | Env switch effect confirmed at implementation (step 5, stop-and-return on failure) |
| MCP readiness | ARC-17, probe `mcp.log` | Readiness only via `_x.ai/mcp/server_status`; unreachable server degrades silently | Grok profile readiness gate registered before `session/new` | None |
| DSH contract | ACP Ecosystem Evidence | No load, no MCP, text only | Capability-driven shared layer (AC-016) | DSH not live-probed |

## Intended Change

Add a **runtime-neutral ACP backend family** (`runtime-management/acp`, `agent-execution/backends/acp`) that drives any ACP agent over stdio through the official SDK, checks the agent's advertised capabilities against what the product requires, and converts standard ACP traffic into the existing AutoByteus event spine. Add a **Grok profile** (`runtime-management/grok`, `agent-execution/backends/grok`) that supplies everything xAI-specific. Register `grok_build` as the fifth runtime kind in the existing seams. Replace the `autobyteus-ts` `grok-4.6` row with `grok-4.7`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Approved Trigger | Existing Evidence | Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001/002, AC-001 | Runtime picker | ARC-19, availability service | New `grok_build` row with safe reason | DS-007 |
| BEH-002 | User | REQ-003, AC-002 | Model selector | Probe 0 | Models from Grok handshake, `reasoning_effort` schema | DS-007 |
| BEH-003 | User | REQ-004/009/016, AC-003/007/013 | Chat input | Probes 1, ARC-09 | Normalized stream; noise ignored | DS-002, DS-003 |
| BEH-004 | User | REQ-005, AC-004 | Tool request with `autoExecuteTools=false` | Probe 2, ARC-07 | Approval bridge; yolo when true | DS-004 |
| BEH-005 | User/System | REQ-006/007, AC-005 | Team/org member | Probe 3, ARC-10/16/17 | Injected prompt, HTTP MCP, readiness gate, canonical names | DS-001, DS-003 |
| BEH-006 | User | REQ-008, AC-006 | Reopen run | Probe 4, ARC-01/13 | Exact `session/load`, replay suppressed | DS-006 |
| BEH-007 | System | REQ-011, AC-009 | Each model call completion within a turn | ARC-20..23 | One per-call usage record per Grok model call, priced by catalog tier per request | DS-002, DS-003 |
| BEH-008 | System | REQ-012, AC-010 | Bootstrap with skills | Shared materializer | `.grok/skills/<name>` symlinks | DS-001 |
| BEH-009 | User | REQ-009, AC-007 | Context files | Probe 0 | Text reference block; images only if capability | DS-002 |
| BEH-010 | User | REQ-013, AC-011 | `autobyteus` model picker | xAI snapshot | `grok-4.7` row replaces `grok-4.6` | DS-009 |
| BEH-011 | Operational | REQ-015, AC-012 | Start / turn | README, probe stderr | Provider errors surfaced; no login UI | DS-001, DS-002 |
| BEH-012 | User | REQ-010, AC-008 | Interrupt | Probe 5 | `session/cancel`; run stays active | DS-005 |
| BEH-013 | User | REQ-017, AC-015 | Application launch | ARC-18 | Both scopes wired; preflight via catalog. **Known gap (SR-009):** credential authority `unsupported` (copied from AGY) makes `getReadiness` return `configured:false`, so the validator always adds a blocking `RUNTIME_AUTHENTICATION_UNAVAILABLE` issue — Grok (and AGY) application launches cannot become RUNNABLE. Application launch is deferred by the user to a future ticket | DS-001, DS-007 |
| (REQ-018) | Structural | REQ-018, AC-016 | Code structure | ACP evidence | Shared ACP layer + Grok profile, capability-driven | All |
| (REQ-014) | Preserved | REQ-014, AC-014 | Existing runtimes | — | No behavior change | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/grok-acp-probes/*.log.jsonl` | Real Grok ACP wire traffic | REQ-003..REQ-011 | **Converter/profile unit-test fixtures** (copy into server test fixtures) | Evidence only |
| `evidence/grok-acp-probes/acp-client.mjs`, `mcp-server.mjs` | Probe harness | REQ-006/007 | Starting point for gated live E2E | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: every integration seam already exists and is runtime-keyed (ARC-01, ARC-02, ARC-16, ARC-18); shared services own prompt, tools, MCP sessions, skills, events, memory, pricing.
- Design response: add a new bounded subsystem (ACP layer) and a profile; extend seams by one branch each.
- Refactor rationale: extracting a generic "CLI JSON-RPC client" out of Codex, or generalizing the AGY discovery-diagnostic branches, would change existing runtimes (forbidden by REQ-014) and is not needed for this delta.
- Intentional deferrals and residual risk: (0) the session profile has no prompt-delivery hook other than `newSessionMeta`; sufficient for Grok, but a future DSH profile has no system-prompt injection (DSH ACP contract) and would need its own delivery strategy or a Requirement Gap (review AR-004.4). (1) AGY and Grok factories reuse the Claude-named `ClaudeWorkspaceResolver` (ARC-18) — naming drift, no behavior risk; rename to a shared resolver in a follow-up. (2) Runtime-specific discovery-diagnostic branches in `run-model-selection-service.ts` and `application-launch-host-capability-validator.ts` grow from one (AGY) to two (Grok); a shared "runtime discovery diagnostic" type is a follow-up candidate. (3) AGY could later move onto the ACP layer (registry lists `antigravity-acp`) — separate ticket.

## Terminology

- **ACP layer**: runtime-neutral modules that speak ACP; must contain no xAI/Grok names or `_x.ai` handling.
- **Launch profile**: per-agent process concerns (command, args, env, required capabilities, model discovery normalization). Lives in `runtime-management/<agent>/`.
- **Session profile**: per-agent session concerns (session `_meta`, MCP server entry + readiness, tool projection, per-call usage interpretation, extension-notification handling). Lives in `agent-execution/backends/<agent>/`.
- **Replay suppression**: ignoring `session/update` notifications that `session/load` emits before its response.

## Design Reading Order

Follows the template order.

## Legacy Removal Policy (Mandatory)

- Policy: no backward compatibility; remove legacy paths.
- In scope: remove the `grok-4.6` row (no alias), its schema description text naming 4.6, and test pins to `grok-4.6`/`grok-4.5`. Nothing else is replaced.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subjects: run metadata / team execution trees (`runtimeKind`, `platformAgentRunId`), token-usage records, persisted launch/preset model selections, per-run memory dirs (raw traces, system-instruction traces).
- Change: new enum value `grok_build`; Grok `sessionId` stored in the existing `platformAgentRunId`; new `ingestion_kind` string; `grok-4.6` removed from the `autobyteus` catalog.
- Readers/writers: launch validation is enum-driven (`Object.values(RuntimeKind)`); token-usage kinds are open strings; model selection rejects retired IDs by existing policy.
- Decision: **`Directly Usable — No Migration`** for all existing data (no existing record contains `grok_build`; existing `grok-4.6` selections follow the approved reselection policy through the existing unavailable-model path). Grok's own `~/.grok/sessions` data is provider-owned and untouched.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001/005/008/011/013 | Launch (standalone/team/org/app) | Published run bound to Grok `sessionId` | `AcpAgentRunBackendFactory` | Create path, identity, prompt injection, MCP, skills |
| DS-002 | Primary | BEH-003/007/009/011 | User message | Turn completed (usage recorded per model call during the turn) | `AcpAgentRunBackend` → `AcpAgentSession` | Turn lifecycle |
| DS-003 | Return-Event | BEH-003/005 | Grok stdout frame | AgentRunEvents to websocket/memory | `AcpAgentSession` + `AcpSessionUpdateConverter` | Stream normalization |
| DS-004 | Primary | BEH-004 | `session/request_permission` | Tool approved/denied | `AcpPermissionBridge` | Approval authority |
| DS-005 | Primary | BEH-012 | Interrupt | Turn interrupted, run idle | `AcpAgentSession` | Cancellation |
| DS-006 | Primary | BEH-006 | Reopen stopped run | Restored run on same session | `AcpAgentRunBackendFactory.restoreBackend` | Exact resume |
| DS-007 | Primary | BEH-001/002/013 | Availability/model query, app preflight | Availability row / ModelInfo[] | `GrokBuildCapability` + `GrokBuildModelCatalog` | Catalog without inference |
| DS-008 | Bounded Local | BEH-003/006/012 | Session state events | State transitions | `AcpAgentSession` | Replay suppression, idle timer, cancel/close |
| DS-009 | Primary | BEH-010 | `autobyteus` catalog listing | `grok-4.7` ModelInfo | `supportedModelDefinitions` | Catalog refresh |

## Primary Execution Spine(s)

- DS-001: `Launch UI/GraphQL/App → Lifecycle service / team activation → AgentRunManager.prepareCandidate → AcpAgentRunBackendFactory.createBackend → [workspace, definition, Carpenter prompt, skills, MCP session] → AcpAgentProcess.spawn(grok agent --model M --reasoning-effort E stdio) → AcpClientConnection.initialize (capability check) → AcpAgentSession.open(new: cwd, mcpServers, profile _meta) → Grok MCP readiness gate → AcpAgentRunBackend → candidate publish (platformAgentRunId = sessionId)`
- DS-002: `Websocket input → AgentRun.postUserMessage → AcpAgentRunBackend.dispatchUserInput(start_turn) → AcpPromptBuilder → AcpAgentSession.prompt(turnId) → session/prompt → (DS-003 events, incl. one TOKEN_USAGE_UPDATED per model call from the session profile) → prompt result → TURN_COMPLETED`
- DS-004: `session/request_permission → session-profile tool projection of request.toolCall (same canonical name/arguments as the tool card) → AcpPermissionBridge.pend → TOOL_APPROVAL_REQUESTED → UI approve/deny → AcpAgentRunBackend.approveToolInvocation → bridge answers allow_once/reject_once → TOOL_APPROVED/TOOL_DENIED`
- DS-005: `UI interrupt → AcpAgentRunBackend.interrupt(turnId) → AcpAgentSession.cancel → bridge cancels pendings (outcome cancelled) → session/cancel → prompt result stopReason=cancelled → TURN_INTERRUPTED (run stays active)`
- DS-006: `Reopen → lifecycle.restoreStarted → AgentRunManager.prepareRestoreAgentRunFromPlatformState(sessionId) → AcpAgentRunBackendFactory.restoreBackend → spawn → initialize (require loadSession) → AcpAgentSession.open(load: sessionId, cwd, mcpServers; replay suppressed) → readiness gate → backend (same sessionId)`
- DS-007: `GraphQL runtimeAvailabilities / model catalog / app preflight → RuntimeAvailabilityService / ModelCatalogService / RunModelSelectionService → GrokBuildCapability (version probe) / GrokBuildModelCatalog → short-lived AcpAgentProcess + initialize → GrokBuildLaunchProfile.normalizeModels → ModelInfo[]`
- DS-009: `LLMFactory.listAvailableModels → supportedModelDefinitions (grok-4.7) → ModelInfo`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The factory prepares everything AutoByteus owns (workspace, definition, composed prompt, skill links, MCP session), then spawns one Grok process for the run (`--no-leader`), verifies the ACP capabilities the product needs, opens a new session whose `_meta.rules` carries the composed prompt, waits until Grok reports the Agent Tools MCP server ready (when tools are exposed), captures the supplied instructions, and returns a backend whose platform id is the Grok `sessionId`. Any failure kills the process and deactivates nothing it did not activate. **A provider JSON-RPC error from `initialize`, `session/new` or `session/load` (e.g. Grok `-32000 "Authentication required"`, data "no auth method id provided") and the shared safe ACP errors are thrown as `AgentCreationError` carrying the provider message + string data, so `createAgentRun`/restore show the provider text instead of the manager's generic wrapper (CR-004, AC-012).** | Run config, process, connection, session | Factory | Capability check, readiness gate, skill materializer, instruction capture, start-time error surfacing |
| DS-002 | A start-turn dispatch builds ACP prompt blocks (text + reference-files block; no image blocks for Grok), allocates a turn id, resets the per-turn call ordinal and the per-turn "user denied" flag, emits TURN_STARTED, sends `session/prompt`; streamed updates flow through DS-003, where each Grok `response_completed` becomes one per-call usage record. The prompt result closes open segments, then: `end_turn` (or other normal stop) → TURN_COMPLETED; JSON-RPC error → one turn-terminal `ERROR` that closes the turn (no extra TURN_COMPLETED, Claude/AGY precedent); `cancelled` while `cancelling` (user interrupt) → TURN_INTERRUPTED; **`cancelled` while `prompting` after the user denied a permission in this turn → TURN_COMPLETED** (Grok ends its turn after reject-once, ARC-28; the tool is already shown denied; AC-004 as amended in SR-011); `cancelled` while `prompting` with no denial → TURN_INTERRUPTED. No turn-level usage record is emitted. | Turn, prompt, result | Backend → Session | Prompt builder, per-call usage, turn-end classification |
| DS-003 | Every agent→client frame is routed by `sessionId` to its session (frames for a session still being opened are buffered by the connection until it registers); standard updates go to the converter (reasoning/text segment lifecycle, tool card + lifecycle via the session profile's tool projection); extension notifications go to the session profile's `interpretExtNotification`, which returns typed effects (per-call usage, MCP status) or `ignore`; while `opening(load)` all `session/update` **and** extension usage frames are dropped. | Update, segment, tool call, usage | Session + Converter | Tool projection, MCP-result projection, usage interpretation, noise filtering |
| DS-004 | The session projects `request.toolCall` through the same session-profile tool projection as `tool_call` updates (Grok: stable name from `_meta["x.ai/tool"].name`, never the display `title`), the bridge holds the JSON-RPC permission request open, publishes an approval request under the tool call id with the canonical name/arguments, and answers with the agent-offered `allow_once`/`reject_once` option when the user decides; on cancel/close it answers `cancelled`. | Pending permission | Permission bridge | Tool projection |
| DS-005 | Interrupt cancels pending permissions, sends `session/cancel`, and lets the prompt result (`cancelled`) end the turn as interrupted; the process and session remain usable. | Turn | Session | — |
| DS-006 | Restore spawns a process, requires `loadSession`, loads the stored id with the same working directory and a fresh MCP descriptor, discards replayed history (UI history comes from local raw traces), re-gates MCP readiness, and returns a backend with the identical id; missing capability, load error or id mismatch is terminal. | Session id | Factory | Replay suppression |
| DS-007 | Availability runs a bounded version probe (no ACP session). Model discovery spawns a short-lived process, runs `initialize` only (no session, no prompt), normalizes the agent's model state into `ModelInfo` with a `reasoning_effort` schema, and kills the process; failures become safe classified diagnostics. | Capability, catalog | Capability + catalog | Safe diagnostics |

## Spine Actors / Main-Line Nodes

`AcpAgentRunBackendFactory`, `AcpAgentProcess`, `AcpClientConnection`, `AcpAgentSession`, `AcpAgentRunBackend`, `AcpSessionUpdateConverter`, `AcpPermissionBridge`, `GrokBuildCapability`, `GrokBuildModelCatalog`.

## Ownership Map

| Node | Owns |
| --- | --- |
| `AcpAgentRunBackendFactory` (shared, parameterized by launch + session profile) | Create/restore sequencing; resource acquisition order and rollback (process kill, skill release on failure); MCP session activation; capability requirement check (product needs: `loadSession` for restore, HTTP MCP when tools are exposed); instruction capture on create; **conversion of provider `RequestError`s and safe ACP errors into `AgentCreationError` with provider message/data (runtime-neutral, CR-004)** |
| `AcpAgentProcess` (shared) | Child lifecycle: spawn with profile command/args/env/cwd, Node↔Web stream bridging for the SDK, bounded stderr tail (diagnostics only, never user-facing raw), exit detection, `stop()` (close stdin, SIGTERM, SIGKILL after grace) |
| `AcpClientConnection` (shared) | One SDK `ClientSideConnection` per process; `initialize` with client capabilities `{fs:false, terminal:false}`; request timeouts; routes client callbacks (`sessionUpdate`, `requestPermission`, `extNotification`, `extMethod`) to the registered session by `sessionId`; **buffers frames for a session id not yet registered (session being opened) and flushes them on registration** (ARC-17); answers unsupported client methods with method-not-found |
| `AcpAgentCapabilities` (shared) | Normalized view of the **standard** `initialize` result (`loadSession`, prompt image support, MCP http, auth methods, standard `agentInfo` when present) and `require(needs)` → explicit missing-capability error. Agent versions from `_meta` are not read here (Grok's version gate belongs to `GrokBuildCapability`) |
| `AcpAgentSession` (shared) | Session state machine (DS-008), `open(new|load)`, `prompt`, `cancel`, `close`, replay suppression, turn idle timer, ordering of converter output |
| `AcpSessionUpdateConverter` (shared) | Standard `session/update` → `AgentRunEvent`: reasoning/text segment open/append/close rules, tool card and lifecycle state per `toolCallId`, delegating tool naming/args/result to the session profile |
| `AcpPermissionBridge` (shared) | Pending permission requests keyed by `toolCallId`; option selection by `kind`; cancellation answers; reports to the session when the user answered `reject_once` in the current turn (input to turn-end classification) |
| `AcpPromptBuilder` (shared) | `AgentInputUserMessage` → ACP `ContentBlock[]` (text with the shared reference-files section). No image blocks are built (REQ-009; Grok advertises `image:false`); a capability-gated image branch is deferred until an agent needs it |
| `AcpAgentRunBackend` (shared) | `AgentRunBackend` contract; lifecycle snapshot; turn id allocation; ordered publish queue; `fail()` semantics |
| Grok launch profile (`runtime-management/grok`) | Command resolution (`GROK_BUILD_COMMAND`, default `grok`), args `agent --no-leader --model <m> [--reasoning-effort <e>] stdio`, env = inherited server env + `GROK_SUBAGENTS=0`, `GROK_WORKFLOWS=0`, `GROK_ASK_USER_QUESTION=0` (per-process; user config untouched), model-state normalization (reads `initialize._meta.modelState`). The Grok minimum-version gate lives in `GrokBuildCapability` and runs on every availability, catalog and launch-preflight path |
| Grok session profile (`backends/grok`) | `session/new` `_meta` (`rules`, `yoloMode` only — no `agentProfile`), MCP server entry, `interpretExtNotification` (per-call usage from `_x.ai/session_notification{response_completed}`, MCP status from `_x.ai/mcp/server_status`, everything else `ignore`), tool projection for `tool_call`, `tool_call_update` and permission `toolCall` (built-ins, `use_tool`/`search_tool`) |
| `GrokBuildCapability` | Bounded version probe + safe diagnostics (AGY pattern) |
| `GrokBuildModelCatalog` | Discovery handshake → `ModelInfo[]`; per-request freshness (no process-global cache) |

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `createGrokBuildAgentRunBackendFactory(...)` (in `backends/grok`) | `AcpAgentRunBackendFactory` | Binds the shared factory to the Grok profiles for wiring | Any session/process logic |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `grok-4.6` definition in `autobyteus-ts/src/llm/supported-model-definitions.ts` | Superseded by `grok-4.7` (REQ-013) | `grok-4.7` row | In This Change | No alias |
| `grokReasoningSchema` description "Controls Grok 4.6 reasoning effort…" | Version-specific text | Version-neutral description | In This Change | Same enum/default |
| Test pins to `grok-4.6` / stale `grok-4.5` | Obsolete | `grok-4.7` expectations | In This Change | Files listed in the mapping |

## Return Or Event Spine(s)

DS-003 (above). Event ordering guarantees: within a session, converter output is published in frame order through the backend's publish queue; a reasoning or text segment is always closed (`SEGMENT_END`) before a tool card starts, a different segment kind starts, usage is emitted, or the turn ends (Codex rule in `codex_integration.md`).

## Bounded Local / Internal Spines

`AcpAgentSession` (DS-008):

`created → opening(new|load) → ready → prompting → ready`, with `prompting → cancelling → ready` (stopReason `cancelled` → TURN_INTERRUPTED), `prompting → ready` on a provider-ended `cancelled` (TURN_COMPLETED if the user denied a permission in this turn, else TURN_INTERRUPTED), any state `→ failed` (process exit, JSON-RPC transport error, idle timeout) and any state `→ closed` (terminate).

- `opening(load)`: all `session/update` for this session and all extension **usage** effects before the load response are **dropped** (replay suppression; ARC-23); MCP-status effects are still consumed.
- `prompting`: idle timer = 5 minutes without any frame for this session **and** no tool call in `pending/in_progress` (a `tool_call` without `status` counts as `pending`, the ACP default — this covers user deliberation on an approval, review P-04); expiry → `failed` with `ACP_TURN_IDLE_TIMEOUT`.
- Per-call usage effects are applied only in `prompting`/`cancelling`; outside a turn they are ignored.
- `ready` + update arrival outside a prompt: ignored with a debug log (Grok emits bookkeeping updates between turns).
- `failed`: emits `ERROR` (+ `TURN_INTERRUPTED` if a turn was active), marks backend inactive, stops the process (AGY semantics).

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Spines | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Capability requirement check | DS-001/006 | Factory | Protocol-level `requiredFor({restore, exposesTools})` in the shared layer: `loadSession` for restore, `mcpCapabilities.http` when tools are exposed; list missing | REQ-018/AC-016 capability-driven (product needs, not per-agent declarations) | Hidden Grok assumptions in shared code |
| Grok MCP readiness gate | DS-001/006 | Session profile | Wait (≤15 s) for `_x.ai/mcp/server_status{name:"autobyteus_agent_tools", status:"ready"}`; `unavailable` or timeout → activation error | REQ-007 | Silent loss of team tools |
| Grok tool projection | DS-003 | Converter | Map Grok tool updates to canonical names/args/results | ARC-08/10 | Grok names leaking into shared converter |
| MCP result projection | DS-003 | Tool projection | Wrap Grok `rawOutput.output` text into an MCP-style `{content:[{type:"text",text}]}` and reuse `projectMcpToolResultForApplication` for known families (browser/media) | Codex/Claude family result contracts | Browser `open_tab` without `tab_id` |
| Per-call usage | DS-002/003 | Session profile | Each `_x.ai/session_notification{response_completed}` → one `TOKEN_USAGE_UPDATED` (`per_call`, `base_excludes_cache`, key `grok_build:<sessionId>:<turnId>:<ordinal>`, model = session model); dropped during load replay; no turn-level record | ARC-20..23, REQ-011 | Aggregate records mis-select price tiers (AR-002) |
| Skill materialization | DS-001 | Factory | Shared `WorkspaceSkillMaterializer` with Grok profile `.grok/skills` | REQ-012 | — |
| System instruction capture | DS-001 | Factory | `SystemInstructionCaptureService.capture` + event | ARC-15 | — |
| Safe diagnostics | DS-007 | Capability/catalog | Classified codes/messages; no raw stderr/paths/credentials | QR-001 | Secret/path leakage |

## Ownership Boundaries

- Only `AcpClientConnection` touches the SDK connection; only `AcpAgentProcess` touches the child process.
- Only agent profiles (launch and session) may read `_x.ai/*` or `_meta` extension fields (the launch profile reads `initialize._meta.modelState`; the session profile reads notification and tool `_meta`); the shared layer passes them through opaquely.
- The backend is the only public boundary for the manager; the session, bridge and converter are internal to the ACP backend family.
- Pricing stays in the existing token-usage subsystem; the profile only reports tokens and `model_provider: "GROK"`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Upstream Callers | Forbidden Bypass | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AcpAgentRunBackend` | Session, bridge, converter, prompt builder | `AgentRunManager`/`AgentRun` | Callers reaching `AcpAgentSession` or the SDK | Add backend method |
| `AcpAgentRunBackendFactory` | Process, connection, capability check, profile hooks | Provider factory builder | Wiring code spawning processes directly | Add factory option |
| `GrokBuildModelCatalog` | Discovery handshake | `ModelCatalogService` | Catalog service spawning `grok` | Extend catalog API |
| `GrokBuildCapability` | Version probe | Availability service, catalog, factory | Ad-hoc `spawnSync("grok")` elsewhere | Extend capability API |

## Dependency Rules

- Allowed: `agent-execution/backends/grok` → `agent-execution/backends/acp` → `runtime-management/acp` → `@agentclientprotocol/sdk`; `runtime-management/grok` → `runtime-management/acp`; `llm-management/services/grok-build-model-catalog` → `runtime-management/grok`; shared ACP modules → existing shared services (tool-name normalizer, MCP result projector, skill materializer, instruction capture, token-usage payload builder).
- Forbidden: anything under `acp/` importing from `grok/` or containing `grok`, `xai`, `_x.ai` literals (AC-016); `backends/grok` importing Codex/Claude/AGY internals (except the already-shared `ClaudeWorkspaceResolver`, per AGY precedent, ARC-18); other runtimes importing ACP modules.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `AcpAgentLaunchProfile` | Agent process | `command()`, `args({model, reasoningEffort})`, `env(base)`, `normalizeModels(initializeResult)`. Required capabilities are computed by the shared layer from product needs; per-agent version gates live in the agent's capability module | model id string | runtime-management |
| `AcpAgentSessionProfile` | Agent session | `newSessionMeta({composedPrompt, autoExecuteTools})`, `mcpServers(descriptor)`, `mcpReadiness()` (declares how readiness is recognized; the shared session owns waiting: 15 s, unavailable/timeout errors), `projectToolCall(toolCallLike)` (used for `tool_call`, `tool_call_update` and permission `toolCall`), `interpretExtNotification(method, params, {sessionId, turnId, callOrdinal, model}) → AcpExtEffect[]` where `AcpExtEffect = {kind:"usage", payload} | {kind:"mcp_status", server, status, detail} ` | `sessionId`, `toolCallId`, `turnId` | backends |
| `AcpAgentRunBackendFactory.createBackend(config, runId)` / `restoreBackend(context)` | Run | Existing contract | runId + sessionId | — |
| `AcpAgentRunBackend.approveToolInvocation(invocationId, approved, reason)` | Tool call | Answer pending permission | `invocationId` = ACP `toolCallId` | — |
| `GrokBuildModelCatalog.listModels()` / `findExactCurrent(id)` | Catalog | Discovery | model id | per request |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| Launch profile | Yes | Yes | Low | — |
| Session profile | Yes (session-scoped only) | Yes | Low | Keep hooks pure; the session owns ordinals, replay suppression and when effects apply |
| Backend approval | Yes | Yes | Low | Reject unknown invocation ids |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Runtime kind | `grok_build` / "Grok Build" | Yes (vendor + registry id) | Low | — |
| Shared layer | `acp` / `Acp*` | Yes (protocol name) | Low | — |
| Session profile | `GrokBuildSessionProfile` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Prompt composition | `prompt/carpenter-prompt-composer` | Reuse | Single owner |
| Tool exposure / MCP session | `shared/runtime-agent-tool-exposure`, `agent-tools/mcp` | Reuse | ARC-16 |
| MCP tool-name canonicalization | `agent-tools-mcp-tool-name.ts` | Reuse | ARC-10 |
| MCP result family projection | `mcp-effective-tool-result-projector.ts` | Reuse | Browser/media contracts |
| Skills | `shared/workspace-skill-materializer.ts` | Extend (new profile constant) | REQ-012 |
| Workspace path | `ClaudeWorkspaceResolver` | Reuse (AGY precedent) | Deferred rename |
| Instruction capture | `SystemInstructionCaptureService` | Reuse | ARC-15 |
| Context-file reference text | `autobyteus-ts appendContextFileReferenceSection` | Reuse | Same as Claude |
| Token usage payload + pricing | `createTokenUsageUpdatedPayload`, `token-price-config-provider` | Reuse | DEC-009 |
| JSON-RPC stdio transport | Codex client | Create New (ACP layer on SDK) | Codex-owned; ARC-03 |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `runtime-management/acp` | Process, connection, capabilities, launch-profile contract | DS-001/006/007 | Create New |
| `runtime-management/grok` | Grok launch profile, command/version capability, diagnostics | DS-001/007 | Create New |
| `agent-execution/backends/acp` | Factory, backend, session, bridge, converter, prompt builder, session-profile contract | DS-001..006 | Create New |
| `agent-execution/backends/grok` | Grok session profile, tool projection, usage, MCP readiness, skill profile, factory binding | DS-001..006 | Create New |
| `llm-management/services` | `grok-build-model-catalog.ts`; catalog/selection branches | DS-007 | Extend |
| Existing seams (manager, providers, lifecycle, restore, resume, context union, app launch, token usage types) | One `grok_build` branch each | DS-001/006/007 | Extend |
| `autobyteus-web` | Label/help/source-key/token-usage maps | — | Extend |
| `autobyteus-ts` | Grok catalog row | DS-009 | Extend |

## Draft File Responsibility Mapping

See Final mapping (no reusable structures beyond the two profile contracts and the tool-projection result type emerged during drafting).

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Launch profile contract | `runtime-management/acp/acp-agent-launch-profile.ts` | ACP layer | Used by factory, capability, catalog | Yes | Yes | A config bag of Grok fields |
| Session profile contract + `AcpToolCallProjection` (`{toolName, segmentType, arguments, result?, error?}`) + `AcpExtEffect` | `agent-execution/backends/acp/acp-agent-session-profile.ts` | ACP layer | Used by converter/session/bridge | Yes | Yes | Place for event emission or ordering logic |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `AcpAgentRunContext {sessionId, workingDirectory}` | Yes | Yes | Low | Model/effort stay in `AgentRunConfig` |
| `AcpToolCallProjection` | Yes | Yes | Low | `segmentType` restricted to `AGENT_SEGMENT_TYPES` |

## Final File Responsibility Mapping

All server paths under `autobyteus-server-ts/src/`.

| File | Area | Owner / Boundary | Concern |
| --- | --- | --- | --- |
| `runtime-management/acp/acp-agent-process.ts` | ACP | Process | Spawn, Node↔Web streams, stderr tail, exit, stop |
| `runtime-management/acp/acp-client-connection.ts` | ACP | Connection | SDK connection, initialize, timeouts, per-session callback routing, unsupported client methods |
| `runtime-management/acp/acp-agent-capabilities.ts` | ACP | Capabilities | Normalize + `require()` with missing list |
| `runtime-management/acp/acp-agent-launch-profile.ts` | ACP | Contract | Launch profile type |
| `runtime-management/acp/acp-discovery-handshake.ts` | ACP | Discovery | Short-lived process + `initialize` only, bounded, returns initialize result |
| `runtime-management/grok/grok-build-launch-profile.ts` | Grok | Launch profile | Command/args/env/min version/required capabilities/model normalization |
| `runtime-management/grok/grok-build-capability.ts` | Grok | Capability | Version probe, safe diagnostic codes (`GROK_CLI_UNAVAILABLE`, `GROK_CLI_UNSUPPORTED`, `GROK_MODEL_DISCOVERY_TIMEOUT`, `GROK_MODEL_DISCOVERY_FAILED`, `GROK_MODEL_CATALOG_INVALID`) |
| `agent-execution/backends/acp/acp-agent-session-profile.ts` | ACP | Contract | Session profile type + `AcpToolCallProjection` |
| `agent-execution/backends/acp/backend/acp-agent-run-backend-factory.ts` | ACP | Factory | DS-001/006 sequencing |
| `agent-execution/backends/acp/backend/acp-agent-run-backend.ts` | ACP | Backend | `AgentRunBackend` |
| `agent-execution/backends/acp/backend/acp-agent-run-context.ts` | ACP | Context | `{sessionId, workingDirectory}` |
| `agent-execution/backends/acp/session/acp-agent-session.ts` | ACP | Session | DS-008 state machine |
| `agent-execution/backends/acp/session/acp-permission-bridge.ts` | ACP | Bridge | DS-004 |
| `agent-execution/backends/acp/events/acp-session-update-converter.ts` | ACP | Converter | DS-003 |
| `agent-execution/backends/acp/input/acp-prompt-builder.ts` | ACP | Prompt | Content blocks |
| `agent-execution/backends/grok/grok-build-session-profile.ts` | Grok | Session profile | `_meta` (`rules`, `yoloMode`), MCP entry, `interpretExtNotification` routing; composes the three files below |
| `agent-execution/backends/grok/grok-build-tool-projection.ts` | Grok | Projection | Built-in + `use_tool`/`search_tool` mapping |
| `agent-execution/backends/grok/grok-build-call-usage.ts` | Grok | Usage | `response_completed` usage → per-call `TOKEN_USAGE_UPDATED` payload |
| `agent-execution/backends/grok/grok-build-mcp-readiness.ts` | Grok | Readiness | `_x.ai/mcp/server_status` watcher |
| `agent-execution/backends/grok/grok-workspace-skill-materializer.ts` | Grok | Skills | `.grok/skills` profile singleton |
| `agent-execution/backends/grok/grok-build-agent-run-backend-factory.ts` | Grok | Facade | Binds shared factory + Grok profiles |
| `llm-management/services/grok-build-model-catalog.ts` | Catalog | Catalog | Discovery → `ModelInfo[]` |

Modified: `runtime-management/runtime-kind-enum.ts`, `runtime-management/runtime-availability-service.ts`, `agent-execution/providers/agent-provider-factory-builder.ts`, `compositions/create-process-agent-provider-factory-builder.ts`, `agent-execution/runtime/general-process-run-supervisor.ts`, `application-platform/execution/application-execution-scope-kernel-builder.ts`, `agent-execution/services/agent-run-manager.ts`, `agent-execution/services/agent-run-restore-context-factory.ts`, `agent-execution/domain/agent-run-context.ts`, `agent-execution/domain/agent-run-token-usage.ts` (type unions), `run-history/services/agent-run-resume-config-service.ts` (`sessionId` reference), `llm-management/services/model-catalog-service.ts`, `llm-management/services/run-model-selection-service.ts` (Grok diagnostic), `application-platform/launch-configuration/application-launch-host-capability-validator.ts` (Grok diagnostic), `application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts` (`GROK_BUILD` → `unsupported`, AGY precedent — blocks application launch; see BEH-013 known gap, SR-009), `autobyteus-server-ts/package.json` (`@agentclientprotocol/sdk` pinned `1.5.0`).

Web (`autobyteus-web/`): `types/agent/AgentRunConfig.ts` (label), `utils/existingRunModelHelp.ts` (external help), `services/activity/runActivityPresentation.ts` (`'grok'` source key) + `localization/messages/{en,zh-CN}/…` source label, `components/settings/token-usage/tokenUsageStatisticsUi.ts`, `analytics/TokenUsageAnalyticsControls.vue`, `analytics/TokenUsageBreakdown.vue` (label "Grok Build"), `test-support/currentTeamTestFixtures.ts` (type union).

`autobyteus-ts/`: `src/llm/supported-model-definitions.ts` (row + schema text), `docs/provider_model_catalogs.md`, `tests/unit/llm/supported-model-definitions.test.ts`, `tests/integration/llm/llm-factory-metadata-resolution.test.ts`; server tests pinning `grok-4.6`: `tests/unit/application-orchestration/application-run-binding-launch-service.test.ts`, `tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`.

## Applied Patterns

- **Strategy (profiles)**: shared ACP owners call launch/session profile hooks; one owner stays in control of sequencing.
- **State machine**: `AcpAgentSession` (DS-008).
- **Adapter**: session update converter and tool projection translate ACP/Grok contracts to AutoByteus events.
- **Factory**: shared factory with a thin Grok binding facade.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/acp/` | Folder | ACP layer | Process/connection/capabilities/launch contract/discovery | Grok/xAI names, event conversion |
| `autobyteus-server-ts/src/runtime-management/grok/` | Folder | Grok | Launch profile, capability | Session/event logic |
| `autobyteus-server-ts/src/agent-execution/backends/acp/{backend,session,events,input}/` | Folder | ACP layer | Backend family | Grok/xAI names |
| `autobyteus-server-ts/src/agent-execution/backends/grok/` | Folder | Grok | Session profile + helpers + factory binding | Generic ACP mechanics |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/acp/`, `.../grok/`, `tests/unit/runtime-management/acp/`, `.../grok/` | Folder | Tests | Unit tests; Grok wire-log fixtures under `tests/fixtures/grok-acp/` | — |
| `autobyteus-server-ts/tests/e2e/runtime/grok-build-*.e2e.test.ts` | File | Tests | Gated live (`RUN_GROK_E2E=1` + binary) | Default-CI dependence |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | Doc | Delivery (docs sync) | Runtime + ACP layer doc | — |

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `runtime-management/acp` | Persistence-Provider (external process/protocol) | Yes | Low | Mirrors `runtime-management/codex/client` |
| `backends/acp/*` | Main-Line Domain-Control | Yes | Low | Sub-folders mirror Claude/AGY backends |
| `backends/grok` | Off-Spine (profile) | Yes | Low | Flat: 6 small files |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| `session/new` for a Grok team member | `{cwd:"/ws", mcpServers:[{type:"http", name:"autobyteus_agent_tools", url, headers:[]}], _meta:{rules:"<composed Carpenter prompt>", yoloMode:false}}` | Shared session code building `_meta.rules`; any `_meta.agentProfile` (replaces the default agent) | `_meta` keys are xAI extensions (session profile) |
| Team tool call | Grok `tool_call{title:"use_tool", rawInput:{tool_name:"autobyteus_agent_tools__send_message_to", tool_input:{…}}}` → `SEGMENT_START{segment_type:"tool_call", tool_name:"send_message_to", arguments:{…}}` + `TOOL_EXECUTION_STARTED{invocation_id:toolCallId, tool_name:"send_message_to"}` | Card titled `use_tool` | Canonical routing/history (REQ-006) |
| Built-in shell | `run_terminal_command{command}` → `tool_name:"run_bash"`, `arguments:{command, cwd?}`; result from `rawOutput.output_for_prompt`/`exit_code`; non-zero exit → `TOOL_EXECUTION_FAILED` with output + `Exit code: n` | Raw Grok names in memory | Matches Codex `run_bash` projection |
| Edit | `search_replace` → `tool_name:"edit_file"`, `arguments.path` from rawInput path field or `locations[0].path` | No path → no artifact | FILE_CHANGE derivation (ARC-08) |
| Usage (probe 1, 2 calls) | Call 1: `{runtime_kind:"grok_build", ingestion_kind:"grok_acp_call", usage_scope:"per_call", idempotency_key:"grok_build:<sessionId>:<turnId>:1", model_provider:"GROK", model_identifier:"grok-4.7", reported_input_tokens:15788, cache_read_input_tokens:1152, cache_creation_input_tokens:0, reported_output_tokens:108, reasoning_output_tokens:84, input_token_semantic:"base_excludes_cache", raw_usage_json:{…}}`; call 2: input 183, cache read 16896, output 38, reasoning 25, ordinal 2. Sum = turn usage 34019/18048/146/109 | One `per_turn` record from prompt-result `_meta.usage` (aggregate gross input picks the >200k tier for ordinary multi-call turns); summing `response_completed` and `turn_completed` | ARC-20..22, AR-002 |
| Launch args | `grok agent --no-leader --model grok-4.7 --reasoning-effort high stdio`; env adds `GROK_SUBAGENTS=0`, `GROK_WORKFLOWS=0`, `GROK_ASK_USER_QUESTION=0` | Mutating `~/.grok/config.toml`; `_meta.agentProfile`; shared leader process | Provider config stays user-owned (DEC-006); harness guidance intact (DEC-005); process per run |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Alias `grok-4.6` → `grok-4.7` | Keep old selections working | Rejected | Existing reselection path (DEC-004) |
| Grok via headless `grok -p` as fallback when ACP fails | Resilience | Rejected | Explicit error; one path |
| Re-inject rules on `session/load` | Refresh identity | Rejected | Run-start identity persists (ARC-13) |

## Derived Layering

`AgentRunManager → AcpAgentRunBackend(Factory) → AcpAgentSession → AcpClientConnection → AcpAgentProcess → grok`, with profiles consulted by the factory/session/converter only.

## Change / Refactor Sequence

1. `autobyteus-ts`: `grok-4.7` row, schema text, tests, catalog doc (independent).
2. Server dependency `@agentclientprotocol/sdk@1.5.0`; `runtime-management/acp` (process, connection, capabilities, launch contract, discovery handshake) with unit tests using a fake agent stream.
3. `backends/acp` (context, prompt builder, converter, bridge, session, backend, factory) with unit tests replaying `tests/fixtures/grok-acp/*.jsonl` through a Grok session profile.
4. Grok launch/session profiles, capability, model catalog, skill profile, factory binding.
5. **Implementation confirmation (one small paid turn, budget ≤ US$0.05)**: with the launch env switches set, confirm the session's `tool_definitions.json` contains no `task`, `workflow` or `ask_user_question`, and record the `search_replace`/`write` `rawInput` path field names. **Failure branch:** if `workflow` (or `task`/`ask_user_question`) cannot be removed by the documented switches, stop and return to the Solution Designer (escalation trigger (a)); do not ship with it enabled.
6. Seams: enum/predicate, availability, factory builder + both scopes, manager, restore context, context union, resume reference, catalog/selection/app-launch diagnostics, credential authority, token-usage types.
7. Frontend maps and i18n.
8. Tests: capability GraphQL e2e (5 kinds), gated live standalone + team roundtrip (`RUN_GROK_E2E=1`), existing suites unchanged (AC-014).
9. Docs sync (delivery-owned): `grok_build_runtime.md`, `llm_management.md` curated list, `prompt_engineering.md` runtime table row, `agent_execution.md` runtime list.

## Key Tradeoffs

- **Official SDK vs own client**: SDK adds a dependency but gives maintained protocol types/versions for every future ACP agent (REQ-018) and passed the Grok replay; own client would duplicate Codex code. Chosen: SDK, pinned.
- **Process per run vs shared process**: per run isolates crashes/cancellation and matches AGY; costs one Grok process per active run (native binary, acceptable). Grok "leader" mode out of scope.
- **Model/effort via launch flags vs `session/set_config_option`**: flags are verified and apply to create and restore; model switching on stopped runs already restarts the backend in AutoByteus.
- **Keep `search_tool` cards visible**: honest trace vs a little noise; chosen visible (Codex precedent of showing provider tools).

## Risks

- Grok CLI auto-update changes `_x.ai` shapes → isolated in the Grok session profile; minimum version gate; unknown notifications ignored (QR-005).
- MCP discovery indirection may occasionally fail to find a team tool → gated live team E2E (AC-005).
- Env-switch effect on the tool set confirmed in step 5 (documented switches; failure → stop and return).
- A cancelled in-flight model call is not reported by Grok (ARC-22); its tokens cannot be recorded (REQ-011 states this).
- Free-tier 429s → provider errors surfaced (AC-012).
- Long-running shell commands vs idle timer → timer suspended while a tool call is in progress.

## Guidance For Implementation

- Keep `acp/` free of `grok|xai|_x.ai` (add a unit test grepping module sources for these tokens — cheap guard for AC-016).
- Convert via frames, not via Grok's persisted files; never read `~/.grok/sessions`.
- Always answer `session/request_permission` (approve/deny/cancel) — an unanswered request blocks the Grok turn.
- Emit `SEGMENT_END` for open reasoning/text before tool cards, usage and turn end.
- Treat a `tool_call` without `status` as `pending` (ACP default).
- Never derive usage from the prompt result or `turn_completed`; they are cross-check data only (keep them out of the ledger).
- Never pass the vault's `provider.grok.api-key` to the child; inherit the server environment as-is except the added `GROK_SUBAGENTS=0`, `GROK_WORKFLOWS=0`, `GROK_ASK_USER_QUESTION=0`.
- Use the probe logs as fixtures; do not spend Grok credits in unit tests. Live E2E is opt-in.

## SR-008 Review Resolution (ARCH-REV-001)

| Finding | Resolution | Where |
| --- | --- | --- |
| AR-001 (High) tool restriction | Built-ins disabled by documented per-process env switches `GROK_SUBAGENTS=0`, `GROK_WORKFLOWS=0`, `GROK_ASK_USER_QUESTION=0` (ARC-24); `_meta.agentProfile` removed; step 5 is a confirmation whose failure is stop-and-return. Basis for `ask_user_question`: Claude precedent (`claude-ask-user-question-disallow`, interruptive clarification UI; `AskUserQuestion` in Claude's disallowed list) applied under the user's standing 2026-09-26 direction to resolve such decisions from existing runtimes; plus AutoByteus has no question-card bridge and the tool would block a turn up to 1800 s. Recorded in REQ-016/AC-013/DEC-006 and reported to the user | Ownership map (launch profile), examples, step 5, requirements SR-008 |
| AR-002 (High) usage tiers | One `per_call` record per Grok `response_completed` (`base_excludes_cache`, key `grok_build:<sessionId>:<turnId>:<ordinal>`, session model, replay-suppressed); no turn-level record; P-05 settled (completed calls recorded; in-flight aborted call unreported by Grok). REQ-011/AC-009 wording clarified (same totals, per-request pricing) | DS-002/003/008, off-spine, interface, examples, ARC-20..23 |
| AR-003 approval projection | Permission `toolCall` goes through the same projection (stable `_meta["x.ai/tool"].name`); AC-004 now names `run_bash` | DS-004, interface, AC-004 |
| AR-004 neutrality details | Capabilities read only standard fields (`agentInfo`); "agent profiles" wording; connection buffers frames for sessions being opened; DSH prompt-delivery limit recorded | Ownership map/boundaries, health deferrals |
| Residual: base moved | Fast-forwarded to `e06080b00`; delta reviewed, no design change (ARC-25) | Solution basis |

## SR-011 Revision (failure-origin review CRR-002)

| Item | Resolution | Where |
| --- | --- | --- |
| CR-006 deny (Requirement Gap) | User approved 2026-09-26: after a user denial Grok ends its turn; AutoByteus shows the tool denied and the turn **completed**, not interrupted; the run stays idle and the next message continues. The session classifies `cancelled` by state: `cancelling` → interrupted; `prompting` after a `reject_once` in this turn → completed; `prompting` without denial → interrupted. No synthetic follow-up prompt | DS-002, DS-008, permission bridge; requirements AC-004 |
| CR-004 start-time errors (Local Fix) | The shared factory converts provider `RequestError`s from `initialize`/`session/new`/`session/load` and the safe ACP errors into `AgentCreationError` with provider message + data; unit tests for create and restore | DS-001, factory ownership |
| CR-007 approval rationale | REQ-005 rationale clarified by precedent (Codex `on-request`+sandbox, Claude `default`): AutoByteus shows every approval request Grok raises and never grants on the user's behalf; Grok's own policy decides which calls need approval. No design change | Requirements REQ-005 |
| CR-005 app launch | Deferred by the user (SR-009, STC-002); `unsupported` authority unchanged in this ticket | BEH-013 row |
| CR-002 design-text sync | Required capabilities computed by the shared layer (`requiredFor`), Grok version gate in `GrokBuildCapability`; `mcpReadiness()` hook with session-owned waiting; turn-terminal `ERROR` without extra TURN_COMPLETED; no image blocks; `--no-leader`. Also accepted implementation decisions: responses to ids the client never sent are dropped; `grok_build` added to the team-stream and collaboration-stream contract enums | Ownership, interfaces, DS-002, examples, file mapping note below |

Additional modified files accepted in implementation (sync): the team-stream and collaboration-stream contract enums (`autobyteus-team-stream-contracts`, `autobyteus-collaboration-stream-contracts`, including regenerated `dist/`) gain `grok_build` (AGY precedent `97f881366`).
