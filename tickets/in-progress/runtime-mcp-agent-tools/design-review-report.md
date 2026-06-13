# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md`
- Current Review Round: 3
- Trigger: Revised Requirement Gap / Codex scope-correction package after the user challenged Claude-only and Codex-dynamic validation. The design now requires both active external MCP-capable consumers, Claude Agent SDK and Codex App Server, to use Agent Tools MCP for `send_message_to`, while AutoByteus remains local and API/E2E must validate the all-active-runtime communication matrix.
- Prior Review Round Reviewed: Rounds 1 and 2 in this report.
- Latest Authoritative Round: 3
- Current-State Evidence Basis: Revised requirements/investigation/design, Codex MCP materializer correction, API/E2E runtime communication scope gap, requirement-gap matrix response, prior design-impact artifacts, prior implementation/code/API-E2E artifacts, upstream `streamable-mcp-runtime-tools` lineage, local Codex app-server thread-config probe result, generated Codex app-server protocol types showing `thread/start` and `thread/resume` `config`, and direct code reads of Agent Tools MCP session/executor, Claude materializer/event paths, Codex thread manager/bootstrap/dynamic tools/event/history paths, AutoByteus local send-message tool, `SendMessageToDispatcher`, mixed-team delivery, and memoryDir/memory-recorder owners.

Round rules:
- Reuse the same finding IDs across reruns for the same unresolved design-review issues.
- Create new finding IDs only for newly discovered issues.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review | N/A | No | Pass | No | Approved initial Claude Agent SDK materializer design with residual attention to real SDK behavior and descriptor expiry. |
| 2 | Design-impact rework after empty raw memory traces in live route-backed Claude E2E | Round 1 had no unresolved findings; residual real-SDK behavior was exercised enough to expose the memory trace invariant. | No blocking findings | Pass | No | Revised design cleanly integrated memory/run-history spine and memoryDir ownership without legacy fallback. |
| 3 | Requirement Gap and Codex MCP scope correction | Rounds 1-2 had no unresolved findings; checked that the new Codex scope and all-runtime matrix do not invalidate the approved Claude/memory boundaries. | No blocking findings | Pass | Yes | Corrected design is architecture-ready: Claude and Codex use separate backend-local Agent Tools MCP materializers, AutoByteus stays local, memory stays canonical-event-based, and API/E2E must refresh the runtime communication matrix. |

## Reviewed Design Spec

Reviewed the revised `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md` plus `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/codex-mcp-materializer-design-correction.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-runtime-communication-scope-gap.md`, and `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirement-gap-runtime-communication-matrix-response.md`.

The current design supersedes the earlier Claude-only/Codex-dynamic package. It makes `send_message_to` route-backed for both Claude Agent SDK and Codex App Server, keeps AutoByteus native on its local in-process tool adapter, preserves the memory/run-history spine through canonical AgentRun events, and adds all-active-runtime API/E2E matrix validation before delivery.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Spec classifies the work as feature plus targeted refactor plus expanded API/E2E validation scope. It explicitly names the Codex correction and all-runtime matrix. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Spec names duplicated policy/coordination, boundary/ownership issue, legacy compatibility pressure, and missing invariant. Investigation ties those to the central Agent Tools MCP server, old Claude handler, Codex dynamic send-message registration, and raw trace `memoryDir` behavior. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor is required now for Claude materializer, Codex materializer, and memory invariant. Non-Claude/non-Codex production changes are explicitly limited to defects exposed by the matrix. Claude Code CLI and Antigravity remain deferred because their runtime backends are absent. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | DS-RMCP-001..011, ownership boundaries, dependency rules, deletion/gating plan, interface mapping, implementation sequence, and test plan all reflect the expanded scope. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | No unresolved prior findings | Round 1 findings were `None`; corrected design preserves the approved Claude Agent SDK route-backed materializer. | Claude remains backend-local with no old `autobyteus_team` send-message fallback. |
| 2 | N/A | N/A | No unresolved prior findings | Round 2 findings were `None`; corrected design preserves the approved memory/run-history ownership. | DS-RMCP-009/010 keep raw trace persistence on canonical AgentRun events and `memoryDir` owners, not route-side persistence or handle fallback. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-RMCP-001 | Claude runtime session materializes Agent Tools MCP | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-002 | Claude remote MCP tool call executes through server-owned path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-003 | Claude MCP server map merge | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-004 | Claude allowed tools and tool-name normalization | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-RMCP-005 | Session lifetime, cleanup, and secret handling | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-006 | Codex thread-scoped Agent Tools MCP materialization | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-007 | Codex remote MCP tool call executes through server-owned path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-008 | Non-target runtime deferrals | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-009 | Route-backed tool lifecycle persists through canonical AgentRun memory spine | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-010 | Executable team-member `memoryDir` invariant | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-011 | All active runtime communication matrix | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP route/dispatcher/executor | Pass | Pass | Pass | Pass | Reused as the external-runtime MCP transport/tool execution boundary; no runtime config or raw trace persistence. |
| Agent Tools MCP session service/descriptor | Pass | Pass | Pass | Pass | Correct single source for session URL/token/enabled tools; materializers consume descriptors only. |
| Claude Agent SDK backend/session/materializer | Pass | Pass | Pass | Pass | Backend-local programmatic SDK `mcpServers` and allowed-tool materialization; no file config. |
| Codex App Server backend/bootstrap/thread materializer | Pass | Pass | Pass | Pass | Backend-local thread-scoped `config.mcp_servers.autobyteus_agent_tools`; avoids cwd-keyed process-level config leakage. |
| AutoByteus native tool entry | Pass | Pass | Pass | Pass | Remains local `BaseTool` entry into `SendMessageToDispatcher`; no unnecessary HTTP self-call. |
| Agent communication dispatcher/team delivery | Pass | Pass | Pass | Pass | `SendMessageToDispatcher` and team delivery remain the shared behavior spine. |
| Runtime event/history conversion | Pass | Pass | Pass | Pass | Claude and Codex each own provider/app-server event normalization to canonical `send_message_to`. |
| AgentRun memory recorder / accumulator | Pass | Pass | Pass | Pass | Correct owner for canonical-event-to-raw-trace persistence under supplied `memoryDir`. |
| Mixed team memoryDir owners | Pass | Pass | Pass | Pass | Fresh/restore/task-agent owners remain `MixedTeamRunBackendFactory`, `TeamRunMetadataMapper`, and `MixedTeamMemberRegistry`; handle assertion only. |
| API/E2E runtime matrix | Pass | Pass | Pass | Pass | Correctly modeled as validation/coverage scope, not a production generic runtime abstraction. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpDescriptor` | Pass | Pass | Pass | Pass | Single secret-bearing descriptor for both Claude and Codex materializers; no runtime-specific fields added. |
| Claude MCP wire-name helper | Pass | Pass | Pass | Pass | Backend-local helper for `mcp__autobyteus_agent_tools__send_message_to` is appropriate. |
| Codex MCP config materializer | Pass | Pass | Pass | Pass | Backend-local materializer is appropriate; no generic all-runtime writer. |
| Runtime sender context / owner mapping | Pass | Pass | Pass | Pass | Design allows inline or small helper but keeps identity explicit: standalone agent id vs team member name/context. |
| `SendMessageToDispatcher` | Pass | Pass | Pass | Pass | Existing shared behavior owner reused by AutoByteus local tool and Agent Tools MCP executor. |
| Team/member memory location derivation | Pass | Pass | Pass | Pass | Reuses `AgentMemoryLocationService` through owning team boundaries, not duplicated in handle. |
| Canonical event-to-raw trace accumulation | Pass | Pass | Pass | Pass | Existing recorder/accumulator reused; no route-specific writer introduced. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentToolMcpDescriptor` / redacted descriptor | Pass | Pass | Pass | Pass | Descriptor fields remain transport/session/tool capability data only; redacted view remains separate. |
| Claude SDK MCP server map | Pass | Pass | Pass | Pass | Contains only `{ type: "http", url, headers }`; tool narrowing stays in allowed tools and server allowlist. |
| Codex app-server thread config | Pass | Pass | Pass | Pass | Snake_case Codex config object is runtime-local and thread-scoped; not mixed into shared descriptor. |
| `CodexThreadConfig` or transient thread payload | Pass | Pass | Pass | Pass | Design explicitly warns not to persist raw bearer config if runtime context serializes. |
| `AgentRunConfig.memoryDir` | Pass | Pass | Pass | Pass | Nullable broad type remains; invariant requires non-null before recordable non-AutoByteus team-member runs. |
| Raw tool trace payload | Pass | Pass | Pass | Pass | Canonical `toolName`, invocation id, args, result/error; route-backed MCP content shape preserved, no old handler/dynamic wrapper coercion. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Old Claude `send_message_to` handler/definition | Pass | Pass | Pass | Pass | Replacement is Claude Agent Tools MCP materializer + Agent Tools MCP executor + shared dispatcher. |
| Old `mcp__autobyteus_team__send_message_to` allowed tool/fallback | Pass | Pass | Pass | Pass | Explicitly forbidden; `autobyteus_team` remains task-delegation-only. |
| Codex dynamic `send_message_to` registration/fallback | Pass | Pass | Pass | Pass | Replacement is Codex thread-scoped Agent Tools MCP config; non-send-message dynamic tool families remain. |
| Codex process-level/file-backed bearer config shapes | Pass | Pass | Pass | Pass | `-c`, `CODEX_APP_SERVER_ARGS*`, and trusted `.codex/config.toml` bearer injection are explicitly forbidden. |
| Generic all-runtime materializer | Pass | Pass | Pass | Pass | Rejected because runtime config/process cleanup differs by backend. |
| Route-side raw-trace writer | Pass | Pass | Pass | Pass | Rejected; raw traces come from canonical AgentRun events. |
| `MixedAgentMemberHandle` fallback `memoryDir` derivation | Pass | Pass | Pass | Pass | Rejected; handle assertion only. |
| Old `{ accepted: true }` / Codex dynamic wrapper result expectation | Pass | Pass | Pass | Pass | Route-backed memory assertions preserve MCP content result shape. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/agent-execution/backends/claude/agent-tools-mcp/*` | Pass | Pass | Pass | Pass | Claude-specific descriptor-to-SDK config/name/session helpers only. |
| `src/agent-execution/backends/claude/session/*` | Pass | Pass | Pass | Pass | Claude session owns live descriptor state and query setup, not route internals. |
| `src/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.ts` | Pass | Pass | Pass | Pass | Task-delegation-only after cutover. |
| `src/agent-execution/backends/claude/events/*` and tool-use coordinator | Pass | Pass | Pass | Pass | Provider lifecycle/name normalization only. |
| `src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts` | Pass | Pass | N/A | Pass | Correct backend-local config-shape owner. |
| `src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Pass | Pass | Pass | Pass | Correct owner to resolve exposure and create session/config before thread start. |
| `src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Pass | Pass | Pass | Pass | Correct owner to pass thread-scoped app-server `config` through `thread/start`/`thread/resume`. |
| `src/agent-execution/backends/codex/*dynamic*` | Pass | Pass | Pass | Pass | Non-send-message dynamic tools remain; send-message dynamic registration removed/gated. |
| `src/agent-execution/backends/codex/events/*` / `history/*` | Pass | Pass | Pass | Pass | Correct owner for Codex MCP lifecycle/history canonicalization. |
| `src/agent-tools/mcp/**` | Pass | Pass | Pass | Pass | Existing session/catalog/route/executor owner; should not absorb runtime config or memory persistence. |
| `src/agent-tools/agent-communication/send-message-to.ts` | Pass | Pass | Pass | Pass | AutoByteus local entry only; shared delivery remains dispatcher. |
| `src/agent-communication/services/send-message-to-dispatcher.ts` | Pass | Pass | Pass | Pass | Shared behavior owner; no runtime config/memory details. |
| Mixed-team memory files | Pass | Pass | Pass | Pass | Fresh/restore/task owners and handle assertion are clear. |
| Runtime E2E files / possible `all-runtime-send-message-matrix.e2e.test.ts` | Pass | Pass | Pass | Pass | Durable validation scope, not production routing abstraction. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude backend -> Agent Tools MCP session service | Pass | Pass | Pass | Pass | No registry/token bypass. |
| Codex backend -> Agent Tools MCP session service | Pass | Pass | Pass | Pass | No route URL/token hand construction. |
| Claude materializer -> descriptor/constants | Pass | Pass | Pass | Pass | No file writing or route internals. |
| Codex materializer -> descriptor/constants | Pass | Pass | Pass | Pass | No process launch args, project files, or generic writer. |
| Codex thread manager -> app-server `config` | Pass | Pass | Pass | Pass | Thread-scoped config is the correct seam for shared cwd-keyed process safety. |
| MCP executor -> `SendMessageToDispatcher` | Pass | Pass | Pass | Pass | Execution uses one behavior owner. |
| Runtime entry adapters -> dispatcher only | Pass | Pass | Pass | Pass | Bypass to team delivery/recipient handles is forbidden. |
| Runtime event converters -> canonical AgentRun events | Pass | Pass | Pass | Pass | Correct return/event spine for history and memory. |
| Memory recorder -> supplied `memoryDir` writer | Pass | Pass | Pass | Pass | Recorder remains subscriber; no location invention. |
| API/E2E matrix -> test harnesses | Pass | Pass | Pass | Pass | Validation can compose runtime scenarios but must not introduce production routing shortcuts. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP session boundary | Pass | Pass | Pass | Pass | Runtime materializers consume service descriptor, not registry internals. |
| Agent Tools MCP execution boundary | Pass | Pass | Pass | Pass | Route/executor remain transport/tool adapter only and delegate behavior. |
| Claude runtime boundary | Pass | Pass | Pass | Pass | Claude-specific config and event policy stay backend-local. |
| Codex runtime boundary | Pass | Pass | Pass | Pass | Codex-specific config and thread manager behavior stay backend-local. |
| AutoByteus native runtime boundary | Pass | Pass | Pass | Pass | Local wrapper remains local and does not become fake HTTP client. |
| Shared communication delivery boundary | Pass | Pass | Pass | Pass | `SendMessageToDispatcher` and delivery coordinator own message behavior/projection. |
| Mixed-team runtime identity boundary | Pass | Pass | Pass | Pass | MemoryDir derivation owners are upstream; handle assertion guards invalid state. |
| AgentRun memory persistence boundary | Pass | Pass | Pass | Pass | Persistence attaches through AgentRun events and supplied memoryDir only. |
| API/E2E matrix boundary | Pass | Pass | Pass | Pass | Validation does not become a generic runtime abstraction or production coordination layer. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService.createAgentToolMcpSession(input)` | Pass | Pass | Pass | Low | Pass |
| `materializeClaudeAgentToolsMcpServers(descriptor)` | Pass | Pass | Pass | Low | Pass |
| `CLAUDE_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME` / Claude normalizer | Pass | Pass | Pass | Low | Pass |
| `materializeCodexAgentToolsMcpConfig(descriptor)` | Pass | Pass | Pass | Low | Pass |
| `CodexThreadConfig.agentToolsMcpConfig` or transient thread-start payload | Pass | Pass | Pass | Medium | Pass |
| `CodexThreadManager.startRemoteThread/resumeRemoteThread` payload | Pass | Pass | Pass | Low | Pass |
| Codex dynamic tool registration filtering | Pass | Pass | Pass | Low | Pass |
| Claude/Codex event/history normalizers | Pass | Pass | Pass | Low | Pass |
| `MixedAgentMemberHandle.buildMemberRunConfig()` | Pass | Pass | Pass | Low | Pass |
| Runtime E2E matrix harness | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/agent-execution/backends/claude/agent-tools-mcp/` | Pass | Pass | Low | Pass | Backend-local materializer placement remains sound. |
| `src/agent-execution/backends/codex/agent-tools-mcp/` | Pass | Pass | Low | Pass | Backend-local Codex materializer avoids generic shared config writer. |
| `src/agent-execution/backends/codex/backend/` and `thread/` | Pass | Pass | Medium | Pass | Correct owner for exposure resolution and app-server request config; watch serialization risk. |
| `src/agent-execution/backends/codex/agent-communication/` | Pass | Pass | Low | Pass | Existing dynamic send-message piece should be removed/gated, not reused. |
| `src/agent-tools/mcp/**` | Pass | Pass | Low | Pass | Central server stays transport/session/catalog/executor only. |
| `src/agent-communication/**` | Pass | Pass | Low | Pass | Shared dispatcher remains behavior owner. |
| `src/agent-team-execution/**` | Pass | Pass | Medium | Pass | Correct owner for mixed-team delivery and memoryDir invariants. |
| `src/agent-memory/**` | Pass | Pass | Low | Pass | Event persistence and location service stay under memory capability. |
| `tests/e2e/runtime/**` | Pass | Pass | Medium | Pass | Matrix coverage belongs in durable API/E2E files with environment gates. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Route-backed external tool execution | Pass | Pass | N/A | Pass | Reuses Agent Tools MCP executor and `SendMessageToDispatcher`. |
| Codex app-server MCP capability | Pass | Pass | Pass | Pass | Prior and refreshed probes justify thread-scoped config materializer. |
| Claude SDK MCP capability | Pass | Pass | Pass | Pass | Existing SDK query options justify programmatic materializer. |
| AutoByteus native local tool | Pass | Pass | N/A | Pass | Existing local path is appropriate for in-process runtime. |
| Canonical runtime events/history | Pass | Pass | N/A | Pass | Reuses backend converters; no route writer. |
| Raw trace persistence | Pass | Pass | N/A | Pass | Reuses `AgentRunMemoryRecorder` and accumulator. |
| Standard/team/task memory locations | Pass | Pass | N/A | Pass | Reuses `AgentMemoryLocationService` through owning boundaries. |
| Existing E2E coverage | Pass | Pass | Pass | Pass | Existing rows can be reused only when API/E2E maps directed pair and assertions exactly. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Old Claude `autobyteus_team` send-message path | No | Pass | Pass | No fallback or alias. |
| Old Claude synthetic lifecycle/result shape | No | Pass | Pass | Generic lifecycle plus MCP content result shape replaces it. |
| Codex dynamic `send_message_to` | No | Pass | Pass | No fallback after Agent Tools MCP cutover; other dynamic tools remain. |
| Codex process-level/file-backed bearer config | No | Pass | Pass | Explicitly forbidden. |
| Generic all-runtime materializer | No | Pass | Pass | Explicitly rejected. |
| Route-side trace persistence | No | Pass | Pass | Explicitly rejected. |
| Member-handle fallback `memoryDir` derivation | No | Pass | Pass | Explicitly rejected. |
| Deferring all-active-runtime E2E to follow-up | No | Pass | Pass | Matrix remains in this ticket. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Claude materializer and old handler removal | Pass | Pass | Pass | Pass |
| Codex thread-scoped materializer and dynamic send-message removal | Pass | Pass | Pass | Pass |
| Claude/Codex event/history canonicalization | Pass | Pass | Pass | Pass |
| Member memoryDir invariant and raw trace restoration | Pass | Pass | Pass | Pass |
| All-active-runtime E2E inventory and durable coverage updates | Pass | Pass | Pass | Pass |
| Conditional stale app-memory-root fix | Pass | Pass | Pass | Pass |
| Downstream workflow after E2E coverage edits | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude descriptor-to-SDK config | Yes | Pass | Pass | Pass | Concrete object shape is included. |
| Codex descriptor-to-thread config | Yes | Pass | Pass | Pass | Concrete snake_case object shape is included. |
| Codex safe vs unsafe config seam | Yes | Pass | Pass | Pass | Process `-c`, env args, and `.codex/config.toml` bearer shapes are explicitly rejected. |
| Runtime entry ownership | Yes | Pass | Pass | Pass | AutoByteus local, Codex MCP, Claude MCP are listed separately. |
| Route-backed memory spine | Yes | Pass | Pass | Pass | DS-RMCP-009 stretches from runtime chunks/items to raw trace readback. |
| Executable member memoryDir invariant | Yes | Pass | Pass | Pass | DS-RMCP-010 covers fresh, restore, and task-agent variants. |
| All-runtime matrix | Yes | Pass | Pass | Pass | DS-RMCP-011 names all directed rows and shared assertions. |
| Rejected fallback shapes | Yes | Pass | Pass | Pass | Backward-compatibility rejection log is explicit. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Codex installed app-server honoring `thread/resume` config with real Agent Tools MCP | Probe and generated types support the seam, but the durable product path must cover start and resume. | Implementation/API-E2E should add focused unit/protocol coverage and live smoke where available; if unsupported, route back to solution design before process/file config or dynamic fallback. | Residual implementation/API-E2E risk; not design-blocking. |
| Secret-bearing Codex thread config serialization | `CodexAgentRunContext` may be persisted/restored; raw bearer config must not be durable. | Keep config transient or prove the field is non-serialized and non-emitted. Code review should inspect this carefully. | Residual implementation risk; not design-blocking. |
| Exact Codex MCP lifecycle item shape | App-server MCP items may be named/server-qualified differently than current dynamic-tool items. | Implementation should normalize canonical `send_message_to` and preserve invocation/result/error; API/E2E should validate live items. | Residual implementation/API-E2E risk; not design-blocking. |
| Live all-runtime matrix environment availability | User expectation is all active runtime communication proof; local/default runs may skip due LM Studio/Codex/Claude availability. | API/E2E must record exactly which rows ran and which were unavailable; delivery must not claim all-runtime proof for unavailable rows and should seek user direction if release validation lacks required runtimes. | Workflow risk; not design-blocking. |
| Acceptance/test-plan numbering around memory rows | The requirements are clear, but the design test-plan rows for AC-RMCP-011..016 are dense and partly offset by behavior labels. | Implementation should follow the requirements and named behavior rows, especially task-agent derivation, no-route-persistence, and MCP content result-shape checks. | Non-blocking cleanliness note. |
| Durable E2E coverage changes after initial code review | Workflow requires re-review before delivery after successful API/E2E if repo-resident durable coverage changes. | After implementation/API-E2E adds or updates matrix coverage, route cumulative package through `code_reviewer` before delivery. | Workflow note. |

## Review Decision

- `Pass`: the revised design is ready for implementation to resume.

## Findings

None.

## Classification

N/A — no required upstream design or requirement rework.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Codex must use thread-scoped `thread/start` / `thread/resume` `config.mcp_servers.autobyteus_agent_tools`; process-level `-c`, `CODEX_APP_SERVER_ARGS*`, trusted `.codex/config.toml`, and dynamic `send_message_to` fallback remain forbidden.
- Keep Claude and Codex materializers backend-local. Do not create a generic all-runtime config writer or move config responsibility into Agent Tools MCP route/session internals.
- Preserve memory/run-history through canonical AgentRun lifecycle events and authoritative member `memoryDir`; do not add Agent Tools MCP route-side raw trace writes or `MixedAgentMemberHandle` fallback derivation.
- The all-active-runtime matrix is a validation scope. It should prove AutoByteus local, Codex Agent Tools MCP, and Claude Agent Tools MCP entries converging on `SendMessageToDispatcher`; it should not introduce production routing abstractions.
- If API/E2E adds, updates, or removes durable repository-resident coverage after implementation, route back through `code_reviewer` before delivery.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The corrected design is clean and implementable under the shared design principles. It selects the safe Codex thread-scoped MCP config spine, keeps runtime materializers backend-local, preserves the canonical memory spine and memoryDir ownership model, explicitly rejects legacy/fallback paths, and defines an actionable all-active-runtime API/E2E validation matrix before delivery.
