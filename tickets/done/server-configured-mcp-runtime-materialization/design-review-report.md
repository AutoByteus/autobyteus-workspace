# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review request from `solution_designer` for approved ticket `server-configured-mcp-runtime-materialization` on 2026-06-16.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the upstream requirements, investigation notes, design spec, and supporting analysis summary. Spot-checked current code in `autobyteus-server-ts/src/agent-tools/mcp/*`, `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts`, Codex/Claude Agent Tools MCP bootstrapping/session files, `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts`, and core MCP registry/execution files in `autobyteus-ts/src/tools/mcp/*` and `autobyteus-ts/src/tools/registry/*`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | No | Pass | Yes | Design is actionable and follows the Agent Tools MCP boundary as the provider-runtime authority. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/design-spec.md` against the shared design principles, especially spine sufficiency, authoritative boundary ownership, reusable structure tightness, removal completeness, and migration safety.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design explicitly classifies this as a larger requirement / feature. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classifies the issue as a boundary/ownership issue with shared-structure looseness and cites the static catalog, built-in-only exposure, and result contract limitations. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says refactor is needed now inside Agent Tools MCP session/catalog/executor/result mapping; direct provider materialization is deferred. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping, dependency rules, migration sequence, and backward-compatibility rejection all reflect the refactor decision. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Provider tool call through Agent Tools MCP to configured external MCP execution | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Codex/Claude bootstrap materializes Agent Tools MCP descriptor and allowed tools | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Remote MCP result returns through MCP JSON-RPC and event naming | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Local dispatcher/executor call loop | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP | Pass | Pass | Pass | Pass | Correct authoritative provider-runtime boundary. |
| Configured MCP bridge under Agent Tools MCP | Pass | Pass | Pass | Pass | New grouping is justified and bounded. |
| Core MCP tools in `autobyteus-ts` | Pass | Pass | Pass | Pass | Existing `GenericMcpTool` / `McpServerProxy` ownership is preserved. |
| Codex backend | Pass | Pass | Pass | Pass | Remains descriptor-driven. |
| Claude backend | Pass | Pass | Pass | Pass | Design identifies the current pre-session gating issue and requires descriptor enabled names to drive allowed tools. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Configured MCP source snapshot | Pass | Pass | Pass | Pass | Compact snapshot avoids leaking config/secrets. |
| Agent Tools MCP execution result union | Pass | Pass | Pass | Pass | Needed to avoid flattening raw MCP results. |
| MCP tool result shape | Pass | Pass | Pass | Pass | Mapper remains the response-shape owner. |
| Execution agent identity resolver | Pass | Pass | Pass | Pass | Private function is acceptable unless logic becomes reused/non-trivial. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ConfiguredMcpAgentToolSource` | Pass | Pass | Pass | Pass | Pass | `{ kind, registeredToolName, mcpServerId }` is tight and redaction-safe. |
| `AgentToolMcpSessionToolExposure` | Pass | Pass | Pass | Pass | Pass | Keeps enabled names, source snapshots, and diagnostics under one exposure result. |
| `AgentToolMcpExecutionResult` | Pass | Pass | Pass | Pass | Pass | Discriminated union matches the two actual result families. |
| `McpToolResult` | Pass | Pass | Pass | Pass | Pass | Broadening content is necessary and scoped to MCP response shape. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Silent omission of selected MCP-origin tools | Pass | Pass | Pass | Pass | Design makes omission a testable failure condition. |
| Text-only Agent Tools MCP result assumption | Pass | Pass | Pass | Pass | Replaced by typed execution-result union and broadened mapper. |
| Provider-local built-in-only enabled-tool filtering | Pass | Pass | Pass | Pass | Descriptor/session enabled tools become authoritative. |
| Direct external MCP provider materializer candidate | Pass | Pass | Pass | Pass | Correctly rejected, not introduced as a parallel path. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tool-mcp-session.ts` | Pass | Pass | Pass | Pass | Session state is the right place for snapshots. |
| `agent-tool-mcp-session-registry.ts` | Pass | Pass | Pass | Pass | Registry owns session lifetime and clone/storage behavior. |
| `agent-tool-mcp-session-service.ts` | Pass | Pass | Pass | Pass | Session service remains descriptor creator, not registry/config parser. |
| `agent-tool-mcp-catalog.ts` | Pass | Pass | Pass | Pass | Catalog is the correct owner for tools/list and call availability. |
| `agent-tool-mcp-adapter.ts` | Pass | Pass | Pass | Pass | Contract refactor is localized and justified. |
| `agent-tool-mcp-tool-executor.ts` | Pass | Pass | Pass | Pass | Executor remains observer-sequencing owner. |
| `agent-tools-mcp-method-dispatcher.ts` | Pass | Pass | Pass | Pass | Dispatcher remains JSON-RPC local loop. |
| `agent-tools-mcp-result-mapper.ts` | Pass | Pass | Pass | Pass | Central response mapping remains coherent. |
| `configured-mcp/*` files | Pass | Pass | Pass | Pass | New subfolder has clear bridge-specific responsibilities. |
| Codex/Claude backend files | Pass | Pass | Pass | Pass | Design keeps them provider-specific descriptor consumers only. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex/Claude provider code | Pass | Pass | Pass | Pass | Must not read MCP config persistence or core MCP internals. |
| Agent Tools MCP catalog | Pass | Pass | Pass | Pass | May inspect registry/source metadata but must not execute transport itself. |
| Configured-MCP bridge adapter | Pass | Pass | Pass | Pass | Delegates through registry-created tool and `GenericMcpTool`. |
| Result mapper/executor | Pass | Pass | Pass | Pass | Shared typed result contract prevents adapter-specific response bodies. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService` / descriptor | Pass | Pass | Pass | Pass | Provider bootstrappers depend on session/descriptor, not direct MCP configs. |
| `AgentToolMcpCatalog` | Pass | Pass | Pass | Pass | Dispatcher/executor should use catalog availability, not manual source reads. |
| `GenericMcpTool` / `McpServerProxy` | Pass | Pass | Pass | Pass | Remote name, transport, and connection policy stay in core MCP execution. |
| `AgentToolsMcpResultMapper` | Pass | Pass | Pass | Pass | Adapters return typed results, not JSON-RPC envelopes. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpCatalog.resolveConfiguredSessionToolExposure(input)` | Pass | Pass | Pass | Low | Pass |
| `AgentToolMcpCatalog.resolveToolCallAvailability(session, toolName)` | Pass | Pass | Pass | Low | Pass |
| `ConfiguredMcpAgentToolSourceResolver.resolve(input)` | Pass | Pass | Pass | Low | Pass |
| `ConfiguredMcpRegistryToolAdapter.execute(input)` | Pass | Pass | Pass | Medium | Pass |
| `AgentToolsMcpResultMapper.toolResultFromExecutionResult(toolName, result)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/` | Pass | Pass | Low | Pass | Right-sized sub-area under Agent Tools MCP. |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/` | Pass | Pass | Low | Pass | Built-in adapter providers remain separate. |
| `autobyteus-server-ts/src/agent-tools/mcp/*` core files | Pass | Pass | Medium | Pass | Existing folder is mixed but design avoids worsening it. |
| Codex Agent Tools MCP backend files | Pass | Pass | Low | Pass | Provider-specific descriptor mapping only. |
| Claude Agent Tools MCP/session files | Pass | Pass | Low | Pass | Provider-specific session config and allowed-tool mapping only. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider-facing MCP session | Pass | Pass | N/A | Pass | Extend existing Agent Tools MCP. |
| External configured MCP execution | Pass | Pass | N/A | Pass | Reuse `autobyteus-ts` MCP execution. |
| Agent selected-name normalization | Pass | Pass | Pass | Pass | Reuse exposure shape with sibling source resolver. |
| Configured-MCP source snapshot model | Pass | Pass | Pass | Pass | New compact model is justified because persisted config DTOs are too broad/secret-bearing. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Built-in-only provider exposure | No intended retention | Pass | Pass | Replaced by catalog/session exposure including configured MCP-origin tools. |
| Text-only result path | No intended retention as the sole contract | Pass | Pass | Built-in results remain supported through a typed variant, not a compatibility bypass. |
| Direct provider external MCP materialization | No | Pass | Pass | Rejected as a separate future design, not parallel behavior. |
| String-only session exposure path | Limited test/internal convenience only if useful | Pass | Pass | Production session creation must not depend on it. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Shared types/source snapshots | Pass | Pass | Pass | Pass |
| Catalog/session exposure | Pass | Pass | Pass | Pass |
| Dynamic adapter and `tools/list` / `tools/call` support | Pass | Pass | Pass | Pass |
| Executor/dispatcher/result mapper refactor | Pass | Pass | Pass | Pass |
| Codex/Claude provider flow | Pass | Pass | Pass | Pass |
| Tests and documentation sync | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider config shape | Yes | Pass | Pass | Pass | Shows one `autobyteus_agent_tools` server, not copied external configs. |
| Execution path | Yes | Pass | Pass | Pass | Demonstrates registry-created `GenericMcpTool` delegation. |
| Source snapshot | Yes | Pass | Pass | Pass | Clarifies redaction-safe source identity. |
| Collision policy | Yes | Pass | Pass | Pass | Deterministic static-adapter precedence is clear. |
| Result mapping | Yes | Pass | Pass | Pass | Correctly preserves MCP `isError` result semantics. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | N/A | N/A | N/A |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no design-impact, requirement-gap, or unclear blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Claude session creation currently has a pre-session tooling request gate based on built-in Agent Tools MCP names. The design explicitly calls out that implementation must break this circular dependency so MCP-only configured tools still create an Agent Tools MCP session and enter `allowedTools`.
- Session snapshots intentionally store only registered name and MCP server ID. That keeps the snapshot redaction-safe and preserves `GenericMcpTool` as the remote-name owner, but implementation must honor the design's call-time stale-registry validation and fail closed for missing, non-MCP, or mismatched-server definitions.
- `GenericMcpTool.execute({ agentId }, args)` identity selection must be verified against native/team-member behavior; the design's `memberRunId ?? runId` guidance should be covered by tests.
- Broad MCP result preservation must remain protocol-compatible and redaction-safe; unknown shapes should degrade to safe text/JSON rather than leaking internal objects.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Proceed to implementation using Agent Tools MCP as the authoritative provider-runtime boundary. Do not introduce direct external MCP provider materialization, provider-local registry/config reads, or silent omission of selected MCP-origin tools.
