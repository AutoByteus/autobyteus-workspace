# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md`
- Current Review Round: 2
- Trigger: Revised design-impact package after API/E2E found live route-backed Claude `send_message_to` delivery and canonical stream events working, but sender raw runtime-memory traces empty.
- Prior Review Round Reviewed: Round 1 in this report.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Revised requirements/investigation/design, design-impact reroute and responses, prior implementation/code/API-E2E artifacts, and direct code reads of Claude materializer/event paths, `AgentRunMemoryRecorder`, `RuntimeMemoryEventAccumulator`, `AgentMemoryLocationService`, `MemoryViewResolver`, `MixedTeamRunBackendFactory`, `TeamRunMetadataMapper`, `MixedTeamMemberRegistry`, `MixedAgentMemberHandle`, and the updated live Claude E2E file.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review | N/A | No | Pass | No | Approved Claude Agent SDK materializer design with residual attention to real SDK behavior and descriptor expiry. |
| 2 | Design-impact rework after empty raw memory traces in live route-backed Claude E2E | Round 1 had no unresolved findings; residual real-SDK behavior was exercised enough to expose the memory trace invariant. | No blocking findings | Pass | Yes | Revised design cleanly integrates memory/run-history spine and memoryDir ownership without legacy fallback. |

## Reviewed Design Spec

Reviewed the revised `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md` plus the supporting design-impact artifacts. The design now keeps the Claude Agent SDK cutover route-backed through `autobyteus_agent_tools` and adds the missing runtime-memory/run-history trace spine as first-class design, not an appendix-only note.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Revised spec classifies the work as feature plus targeted refactor, with the design-impact rework adding a Missing Invariant for executable team-member memory roots. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Reroute evidence shows route-backed delivery and canonical stream lifecycle worked while raw traces were empty; code confirms `AgentRunMemoryRecorder` skips runs without `memoryDir` and `RuntimeMemoryEventAccumulator` already records canonical tool events. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Spec keeps the Claude materializer refactor and adds explicit memoryDir/root invariant enforcement while continuing to defer Codex App Server, Claude Code CLI, and Antigravity materializers. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | DS-RMCP-007/008, ownership boundaries, dependency rules, proposed file-level changes, implementation sequence, and acceptance coverage all reflect the rework. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | No unresolved prior findings | Round 1 findings were `None`; the revised design preserves the approved Claude cutover while extending the memory trace spine. | Residual real-SDK concern became concrete API/E2E evidence and is now integrated into design. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-RMCP-001 | Claude runtime session materializes Agent Tools MCP | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-002 | Claude remote MCP tool call executes through server-owned path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-003 | MCP server map merge | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-004 | Allowed tools and tool-name normalization | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-RMCP-005 | Session lifetime, cleanup, and secret handling | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-006 | Non-target runtime deferrals | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-007 | Route-backed tool lifecycle persists through canonical AgentRun memory spine | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RMCP-008 | Executable team-member `memoryDir` invariant | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP route/dispatcher/executor | Pass | Pass | Pass | Pass | Remains transport/tool execution only; explicitly forbidden from raw-trace persistence. |
| Claude Agent SDK materializer/session | Pass | Pass | Pass | Pass | Existing approved route-backed materializer remains intact. |
| Claude event converter/tool-use coordinator | Pass | Pass | Pass | Pass | Correct owner for provider lifecycle to canonical AgentRun events. |
| AgentRun memory recorder / runtime memory accumulator | Pass | Pass | Pass | Pass | Correct owner for canonical event to raw trace persistence under supplied memoryDir. |
| Mixed team fresh member identity | Pass | Pass | Pass | Pass | `MixedTeamRunBackendFactory` is the right owner for standard fresh member memoryDir materialization. |
| Mixed team restore mapping | Pass | Pass | Pass | Pass | `TeamRunMetadataMapper` is the right owner for restore-time memoryDir reconstruction from metadata/current root. |
| Task-agent activation/recovery | Pass | Pass | Pass | Pass | `MixedTeamMemberRegistry` is the right owner for task-agent memoryDir derivation. |
| Mixed member handle | Pass | Pass | Pass | Pass | Properly limited to consume/assert; no fallback derivation. |
| App memory-root lifecycle/test bootstrap | Pass | Pass | Pass | Pass | Conditional path is identified for evidence-driven fix if write/read root mismatch is proven. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpDescriptor` | Pass | Pass | Pass | Pass | Still the single secret descriptor consumed by Claude; no registry bypass. |
| Claude provider wire-name normalization | Pass | Pass | Pass | Pass | Backend-local helper remains appropriate. |
| Team/member memory location derivation | Pass | Pass | Pass | Pass | Design reuses `AgentMemoryLocationService` through owning team boundaries rather than duplicating path logic in the handle. |
| Canonical event-to-raw trace accumulation | Pass | Pass | Pass | Pass | Reuses existing `RuntimeMemoryEventAccumulator`; no route-specific writer introduced. |
| Old Claude handler lifecycle emission | Pass | N/A | N/A | Pass | Correctly rejected as obsolete duplicate behavior rather than standardized. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentToolMcpDescriptor` / redacted descriptor | Pass | Pass | Pass | Pass | No Claude-only fields or persistable bearer data are added. |
| `AgentRunConfig.memoryDir` | Pass | Pass | Pass | Pass | Nullable at broad type boundary, but required by invariant before recordable non-AutoByteus executable team-member runs. |
| Team/task memory location shapes | Pass | Pass | Pass | Pass | Standard member and task-agent locations remain distinct and derived by existing service methods. |
| Raw tool trace payload | Pass | Pass | Pass | Pass | Canonical `toolName`, invocation id, args, result/error are the contract; design rejects old handler `{ accepted: true }` coercion. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Old Claude send-message handler/definition | Pass | Pass | Pass | Pass | Still removed; route-backed Agent Tools MCP path remains the only Claude send-message execution path. |
| Old `mcp__autobyteus_team__send_message_to` fallback | Pass | Pass | Pass | Pass | No compatibility fallback. |
| Route-side raw-trace writer | Pass | Pass | Pass | Pass | Explicitly rejected; raw traces come from canonical AgentRun events. |
| `MixedAgentMemberHandle` fallback memoryDir derivation | Pass | Pass | Pass | Pass | Explicitly rejected; handle may fail fast only. |
| Old handler result-shape expectation | Pass | Pass | Pass | Pass | Design rejects converting route-backed MCP result into `{ accepted: true }`. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/agent-execution/backends/claude/agent-tools-mcp/*` | Pass | Pass | N/A | Pass | Claude-specific materializer/name/session-state only. |
| `src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Pass | Pass | Pass | Pass | Lifecycle projection; no execution or memory writing. |
| `src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Pass | Pass | Pass | Pass | Provider-to-application conversion and canonicalization. |
| `src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | Pass | Pass | Pass | Pass | Fresh mixed-team context/member memoryDir materialization. |
| `src/agent-team-execution/services/team-run-metadata-mapper.ts` | Pass | Pass | Pass | Pass | Restore metadata to config, including memoryDir reconstruction. |
| `src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts` | Pass | Pass | Pass | Pass | Task-agent config and memoryDir derivation. |
| `src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Pass | Pass | Pass | Pass | Member run consumer/start boundary; assertion-only change is appropriate. |
| `src/agent-memory/services/agent-run-memory-recorder.ts` / accumulator | Pass | Pass | Pass | Pass | Persistence subscriber/accumulator only; no memory location invention. |
| `tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` | Pass | Pass | Pass | Pass | Durable route-backed live assertion should be updated to memory trace presence and MCP content result shape. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude session/backend -> Agent Tools MCP session service | Pass | Pass | Pass | Pass | No registry/token bypass. |
| MCP route/executor -> send-message dispatcher | Pass | Pass | Pass | Pass | Execution remains server-owned; route must not persist memory. |
| Claude coordinator/converter -> canonical AgentRun events | Pass | Pass | Pass | Pass | Correct return/event spine for memory. |
| Mixed team owners -> `AgentMemoryLocationService` | Pass | Pass | Pass | Pass | Path derivation belongs upstream, not in the handle fallback. |
| Handle -> assertion-only memoryDir invariant | Pass | Pass | Pass | Pass | Consumes supplied config and can fail fast. |
| Recorder/accumulator -> supplied `memoryDir` writer | Pass | Pass | Pass | Pass | Recorder remains defensive subscriber, not location owner. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP session boundary | Pass | Pass | Pass | Pass | Descriptor/service remain authoritative for Claude materialization. |
| Agent Tools MCP execution boundary | Pass | Pass | Pass | Pass | Route/dispatcher/executor execute tool but do not write memory. |
| Claude application event boundary | Pass | Pass | Pass | Pass | Provider wire name normalized before application events/memory. |
| Mixed-team runtime identity boundary | Pass | Pass | Pass | Pass | Fresh/restore/task owners are named; handle fallback is forbidden. |
| AgentRun memory persistence boundary | Pass | Pass | Pass | Pass | Memory persistence attaches through `AgentRunManager`/recorder. |
| App memory-root read/write boundary | Pass | Pass | Pass | Pass | If implicated, fix belongs at service lifecycle/test bootstrap, not route/member fallback. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService.createAgentToolMcpSession(input)` | Pass | Pass | Pass | Low | Pass |
| `materializeClaudeAgentToolsMcpServers(descriptor)` | Pass | Pass | Pass | Low | Pass |
| `normalizeClaudeToolNameForEvent(name)` | Pass | Pass | Pass | Low | Pass |
| `MixedTeamRunBackendFactory` member materialization | Pass | Pass | Pass | Low | Pass |
| `TeamRunMetadataMapper.memberMetadataToRunConfig(...)` | Pass | Pass | Pass | Low | Pass |
| `MixedTeamMemberRegistry` task-agent config builder | Pass | Pass | Pass | Low | Pass |
| `MixedAgentMemberHandle.buildMemberRunConfig()` | Pass | Pass | Pass | Low | Pass |
| `AgentRunMemoryRecorder.attach(run)` | Pass | Pass | Pass | Low | Pass |
| `getTeamMemberRunMemoryView` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/agent-execution/backends/claude/agent-tools-mcp/` | Pass | Pass | Low | Pass | Backend-local materializer placement remains sound. |
| `src/agent-tools/mcp/**` | Pass | Pass | Low | Pass | No memory persistence additions should go here. |
| `src/agent-team-execution/backends/mixed/**` | Pass | Pass | Medium | Pass | Correct runtime/team owner for member memoryDir invariants; avoid fallback in leaf handle. |
| `src/agent-team-execution/services/team-run-metadata-mapper.ts` | Pass | Pass | Low | Pass | Restore-specific mapper ownership. |
| `src/agent-memory/**` | Pass | Pass | Low | Pass | Event persistence and layout service stay under memory capability. |
| `tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` | Pass | Pass | Medium | Pass | Durable live coverage belongs in API/E2E suite; current design correctly updates it rather than removing it. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Route-backed send-message execution | Pass | Pass | N/A | Pass | Reuses Agent Tools MCP executor and `SendMessageToDispatcher`. |
| Canonical runtime events | Pass | Pass | N/A | Pass | Reuses Claude coordinator/converter and AgentRun events. |
| Raw trace persistence | Pass | Pass | N/A | Pass | Reuses `AgentRunMemoryRecorder` and accumulator; no duplicate writer. |
| Standard/team/task memory locations | Pass | Pass | N/A | Pass | Reuses `AgentMemoryLocationService` owners already present. |
| Live E2E coverage | Pass | Pass | Pass | Pass | Existing scenario remains valuable; stale assertions are updated. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Old Claude `autobyteus_team` send-message path | No | Pass | Pass | No fallback or alias. |
| Old handler synthetic memory lifecycle | No | Pass | Pass | Design preserves invariant through generic lifecycle, not old handler. |
| Route-side trace persistence | No | Pass | Pass | Explicitly rejected. |
| Member-handle fallback memoryDir derivation | No | Pass | Pass | Explicitly rejected; assertion-only. |
| Old `{ accepted: true }` route-backed assertion | No | Pass | Pass | E2E should preserve MCP content result shape. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Resume Claude materializer implementation | Pass | Pass | Pass | Pass |
| Add/lock standard member memoryDir invariant coverage | Pass | Pass | Pass | Pass |
| Add handle fail-fast assertion | Pass | Pass | Pass | Pass |
| Add/lock restore and task-agent memoryDir coverage | Pass | Pass | Pass | Pass |
| Add canonical event-to-memory coverage | Pass | Pass | Pass | Pass |
| Update live E2E raw trace/result-shape assertions | Pass | Pass | Pass | Pass |
| Conditional stale memory-root fix | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude descriptor-to-SDK config | Yes | Pass | Pass | Pass | Existing concrete object shape remains. |
| Route-backed memory spine | Yes | Pass | Pass | Pass | DS-RMCP-007 is sufficiently stretched from SDK chunks to memory readback. |
| Executable member memoryDir invariant | Yes | Pass | Pass | Pass | DS-RMCP-008 covers fresh, restore, and task-agent variants. |
| Route-backed memory result shape | Yes | Pass | Pass | Pass | Design rejects legacy `{ accepted: true }`; implementation should preserve actual MCP content shape observed by Claude. |
| Rejected fallback shapes | Yes | Pass | Pass | Pass | Backward-compatibility rejection log is explicit. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Exact cause of empty raw traces: missing memoryDir vs stale app-memory-root vs event-shape edge | Implementation needs evidence before final fix. | Follow design sequence: add focused invariant/event-to-memory tests, fail-fast assertion, and if root mismatch is proven fix service lifecycle/test bootstrap rather than member fallback. | Residual implementation investigation; not design-blocking. |
| Exact route-backed raw trace result container (`content` object vs content array) | Avoid stale old-handler expectations and avoid unnecessary coercion. | Preserve the actual MCP content result shape emitted through canonical events; tests should assert canonical identity/invocation and content-style result, not `{ accepted: true }`. | Residual test-shape attention; not design-blocking. |
| Durable E2E coverage changed after initial code review | Workflow requires re-review before delivery after successful API/E2E. | After implementation and API/E2E pass, route package back through `code_reviewer` before delivery. | Workflow note. |

## Review Decision

- `Pass`: the revised design is ready for implementation to resume.

## Findings

None.

## Classification

N/A — no required upstream design rework.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must prove whether the live empty traces were due to missing `memoryDir`, stale app-memory-root service lifecycle, or an event/result-shape edge before selecting the final code fix.
- Keep the fix at the named owners: fresh standard member memoryDir in `MixedTeamRunBackendFactory`, restore in `TeamRunMetadataMapper`, task-agent in `MixedTeamMemberRegistry`, assertion only in `MixedAgentMemberHandle`, and canonical event persistence in `AgentRunMemoryRecorder` / `RuntimeMemoryEventAccumulator`.
- Do not add Agent Tools MCP route-side raw trace writes or resurrect the old Claude handler/fallback.
- The acceptance/test-plan numbering is dense after rework; implementation should follow the named behavior rows, especially the no-route-persistence check and MCP content result-shape assertion.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The revised design is clean enough under the shared design principles. It integrates the runtime-memory/run-history trace spine into the main design, names the correct owners for memoryDir derivation and raw trace persistence, rejects legacy/fallback paths, and gives an actionable implementation sequence for resuming work.
