# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/requirements-doc.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/design-spec.md`
- Current Review Round: 1
- Trigger: `solution_designer` handoff on 2026-06-14 for runtime Agent Tools MCP unification.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Read the upstream artifacts plus current code in `autobyteus-server-ts/src/agent-tools/mcp/**`, `agent-execution/shared/configured-agent-tool-exposure.ts`, Claude session/materializer/tooling files, Codex bootstrap/materializer/team strategy files, browser/media/task-delegation/published-artifact manifests/services/contracts, and stale runtime-specific exposure/test inventories.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review handoff | N/A | None | Pass | Yes | Design is ready for implementation with residual risks carried as implementation/API-E2E validation items. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/design-spec.md` against the shared design principles, with focus on spine completeness, authoritative boundary use, adapter/provider ownership, removal completeness, session execution context placement, runtime materialization, and event/history no-leak behavior.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design lines 64-73 classify the work as feature plus architecture refactor/cleanup. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design lines 68-70 cite duplicated policy/coordination, boundary/ownership issue, responsibility drift, and legacy pressure with current-code examples: send-message-only catalog/executor plus duplicated Claude/Codex family projections. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design line 69 says refactor needed now; lines 71-72 explain adapter/session/materializer/name-normalization/removal response. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Adapter model, ownership map, removal plan, file mapping, dependency rules, and migration sequence all reflect the refactor decision. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | Initial review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-UATM-001 | Configured names -> descriptor | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-UATM-002 | Claude materialization | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-UATM-003 | Codex materialization | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-UATM-004 | Tool execution | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-UATM-005 | Runtime event/history normalization | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-UATM-006 | JSON-RPC bounded loop | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-UATM-007 | Adapter bounded execution | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP | Pass | Pass | Pass | Pass | Correct authoritative boundary for external-runtime MCP catalog/session/execution. |
| Browser tools | Pass | Pass | Pass | Pass | Existing manifest/service remain behavior owners; support gate stays with catalog/adapter. |
| Media tools | Pass | Pass | Pass | Pass | Existing manifest/service remain behavior owners; focused execution context avoids runtime imports. |
| Task delegation tools | Pass | Pass | Pass | Pass | Existing manifest/service/context builder remain behavior owners; session sender member context is correct gate. |
| Published artifacts | Pass | Pass | Pass | Pass | Publication service remains durable artifact owner; schema helper extraction avoids duplication. |
| Claude runtime backend | Pass | Pass | Pass | Pass | Owns SDK materialization/allowed tools/event conversion only. |
| Codex runtime backend | Pass | Pass | Pass | Pass | Owns thread config/approval bridge/event-history conversion only. |
| AutoByteus native runtime | Pass | Pass | Pass | Pass | Explicitly reused unchanged and kept out of HTTP MCP migration. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| MCP definition + availability + execution contract | Pass | Pass | Pass | Pass | `agent-tools/mcp/agent-tool-mcp-adapter.ts` aligns catalog and executor without switch growth. |
| Agent Tools MCP wire-name helpers | Pass | Pass | Pass | Pass | Shared helper under `agent-tools/mcp` is the right owner for cross-runtime canonicalization. |
| Published-artifact argument schema | Pass | Pass | Pass | Pass | Extraction from existing publish artifact owner is preferable to duplicating schema in MCP adapter. |
| Family result JSON/error wrapping | Pass | Pass | Pass | Pass | Design keeps serialization in family subsystems instead of one generic catch-all. |
| Session execution context | Pass | Pass | Pass | Pass | Focused context is needed for workspace-dependent adapters; design warns against full runtime context dumps. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentToolMcpSessionOwnerIdentity` | Pass | Pass | Pass | N/A | Pass | Run/team/member identity remains singular and not overloaded with execution config. |
| `AgentToolMcpExecutionContext` | Pass | Pass | Pass | Pass | Pass | Design limits it to workspace/run execution data and forbids secret-bearing runtime config dumps. |
| `AgentToolMcpDescriptor.enabledTools` | Pass | Pass | Pass | N/A | Pass | Canonical tool-name list is already the right descriptor shape. |
| Adapter contract | Pass | Pass | Pass | Pass | Pass | Explicit definition/availability/execute methods avoid optional kitchen-sink fields. |
| Published-artifact schema helper | Pass | Pass | Pass | N/A | Pass | Owner remains the published-artifact contract/tool area. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude browser local MCP builders | Pass | Pass | Pass | Pass | `autobyteus_browser` path is explicitly removed/replaced by browser MCP adapter. |
| Claude media local MCP builders | Pass | Pass | Pass | Pass | `autobyteus_image_audio` path is explicitly removed; result normalizer may stay only if route-backed. |
| Claude published-artifacts local MCP builder/definition | Pass | Pass | Pass | Pass | `autobyteus_published_artifacts` path is explicitly removed. |
| Claude task/team local MCP builder | Pass | Pass | Pass | Pass | `autobyteus_team` migrated task exposure is explicitly removed when no other tools remain. |
| Codex browser/media/published-artifacts/task dynamic builders | Pass | Pass | Pass | Pass | Production imports/builders are explicitly removed; generic dynamic infrastructure may remain only for unrelated code. |
| Stale tests asserting old projections | Pass | Pass | Pass | Pass | Design requires rewrite/removal rather than compatibility assertions. |
| Send-message-specific Agent Tools MCP helpers | Pass | Pass | Pass | Pass | Generalized helper replaces send-message-only runtime helpers. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-adapter.ts` | Pass | Pass | Pass | Pass | One contract file for adapter definition/availability/execution. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | Pass | Pass | Pass | Pass | Catalog owns registry, supported names, availability, and tool definitions. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-executor.ts` | Pass | Pass | Pass | Pass | Generic lifecycle + adapter lookup; no family switch. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | Pass | Pass | Pass | Pass | Focused session/execution context is appropriate. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-result-mapper.ts` | Pass | Pass | Pass | Pass | Shared MCP mapping only; family-specific serialization remains outside. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-tool-name.ts` | Pass | Pass | Pass | Pass | Correct shared owner for generic MCP provider prefix normalization. |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/*` | Pass | Pass | Pass | Pass | One family projection provider per family; projection only, not behavior. |
| Claude/Codex materializer/session/bootstrap files | Pass | Pass | Pass | Pass | Runtime materialization remains runtime-owned and family-free. |
| Event/history sanitizer files | Pass | Pass | Pass | Pass | Runtime backends keep canonical app-facing event ownership. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP adapters | Pass | Pass | Pass | Pass | May import family owners; must not import Claude/Codex runtime classes. |
| Agent Tools MCP session service/catalog | Pass | Pass | Pass | Pass | Runtime materializers must not generate bearer/session descriptor internals directly. |
| Claude/Codex runtime materializers | Pass | Pass | Pass | Pass | Accept descriptors and tool-name helpers only; no direct family execution imports. |
| Runtime event/history converters | Pass | Pass | Pass | Pass | May import generic canonicalization/redaction helper; route/executor must not write run history directly. |
| Migrated tool exposure | Pass | Pass | Pass | Pass | Explicitly forbids dual active old/new execution paths. |
| Descriptor secrecy | Pass | Pass | Pass | Pass | Explicitly forbids raw descriptors in config files, logs, history, serialized runtime contexts. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService` | Pass | Pass | Pass | Pass | Encapsulates session registry/token/descriptor/enablement; callers use service methods. |
| `AgentToolMcpCatalog` | Pass | Pass | Pass | Pass | Runtime backends must not import providers/family services for enablement. |
| Family manifests/services | Pass | Pass | Pass | Pass | Adapters call family owners; no schema/business duplication in runtimes. |
| ClaudeSession | Pass | Pass | Pass | Pass | SDK query lifecycle stays in Claude runtime. |
| CodexThreadBootstrapper | Pass | Pass | Pass | Pass | Thread config lifecycle stays in Codex runtime. |
| Runtime event/history converters | Pass | Pass | Pass | Pass | Route/executor does not become application history owner. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService.createAgentToolMcpSession(...)` | Pass | Pass | Pass | Medium | Pass |
| `AgentToolMcpCatalog.resolveConfiguredSupportedToolNames(...)` | Pass | Pass | Pass | Medium | Pass |
| `AgentToolMcpToolAdapter.execute(...)` | Pass | Pass | Pass | Low | Pass |
| `materializeClaudeAgentToolsMcpServers(descriptor)` | Pass | Pass | Pass | Low | Pass |
| `materializeCodexAgentToolsMcpThreadConfig(descriptor)` | Pass | Pass | Pass | Low | Pass |
| `normalizeAgentToolsMcpToolNameForEvent(value)` | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/` | Pass | Pass | Medium | Pass | Mixed transport/projection is acceptable because route/session/catalog/executor are the existing Agent Tools MCP boundary. |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/` | Pass | Pass | Low | Pass | Projection providers serve the MCP boundary. |
| `autobyteus-server-ts/src/agent-tools/browser/` | Pass | Pass | Low | Pass | Family behavior stays in existing family folder. |
| `autobyteus-server-ts/src/agent-tools/media/` | Pass | Pass | Low | Pass | Family behavior stays in existing family folder. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/` | Pass | Pass | Low | Pass | Family behavior stays in existing family folder. |
| `autobyteus-server-ts/src/services/published-artifacts/` | Pass | Pass | Low | Pass | Publication behavior/projection stays service-owned. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/` | Pass | Pass | Low | Pass | Claude-specific descriptor materialization and event helper placement is appropriate. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/` | Pass | Pass | Low | Pass | Codex-specific app-server config and sanitizer placement is appropriate. |
| Old Claude/Codex family projection folders | Pass | Pass | Low | Pass | Marked obsolete for migrated tool exposure. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| HTTP MCP route/session/descriptor | Pass | Pass | N/A | Pass | Existing `agent-tools/mcp` route is extended, not replaced. |
| Tool schemas/parsers/execution | Pass | Pass | N/A | Pass | Existing family manifests/services are reused. |
| Send-message dispatch | Pass | Pass | N/A | Pass | Existing `SendMessageToDispatcher` remains owner. |
| Runtime materialization | Pass | Pass | N/A | Pass | Existing Claude/Codex Agent Tools MCP materializers are extended. |
| Adapter registry | Pass | Pass | Pass | Pass | New support piece is justified by current one-definition/no-execution provider shape. |
| Published-artifact schema helper | Pass | Pass | Pass | Pass | Extraction from existing owner avoids duplication. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Claude `autobyteus_browser` | No target-state retention | Pass | Pass | Rejected and removed for migrated browser tools. |
| Claude `autobyteus_image_audio` | No target-state retention | Pass | Pass | Rejected and removed for migrated media tools. |
| Claude `autobyteus_team` task delegation | No target-state retention for migrated task tools | Pass | Pass | Remove builder if no non-migrated tools remain. |
| Claude `autobyteus_published_artifacts` | No target-state retention | Pass | Pass | Rejected and removed. |
| Codex dynamic browser/media/task/publish | No target-state retention for migrated tools | Pass | Pass | Generic infrastructure may remain only if unrelated code still owns it. |
| Persisted MCP bearer configs | No | Pass | Pass | Explicitly rejected. |
| Per-family MCP servers | No | Pass | Pass | One `autobyteus_agent_tools` server is the clean-cut replacement. |
| AutoByteus native HTTP unification | No | Pass | Pass | Correctly rejected/out of scope. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Adapter conversion and send-message preservation | Pass | Pass | Pass | Pass |
| Session execution context threading | Pass | Pass | Pass | Pass |
| Provider family additions | Pass | Pass | Pass | Pass |
| Claude materializer/allowed-tools cutover | Pass | Pass | Pass | Pass |
| Codex thread config/dynamic-tool cutover | Pass | Pass | Pass | Pass |
| Event/history/no-leak normalization | Pass | Pass | Pass | Pass |
| Test and stale-path removal updates | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool execution ownership | Yes | Pass | Pass | Pass | Shows executor -> adapter -> family service, avoiding runtime-specific handlers. |
| Enabled tools descriptor | Yes | Pass | Pass | Pass | Shows one `autobyteus_agent_tools` descriptor with multiple tool families. |
| Task delegation gating | Yes | Pass | Pass | Pass | Shows catalog/session-level absence for standalone runs. |
| Event normalization | Yes | Pass | Pass | Pass | Shows provider wire name -> canonical tool name. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Claude SDK allowed-tool exact names for multiple remote MCP tools | Allowed-tool mismatch could block tool calls even with correct MCP descriptor. | Implementation must confirm current SDK behavior through unit/integration tests; do not reintroduce old local servers as a workaround. | Residual risk, not design blocker. |
| Codex app-server non-send-message MCP event payload shape | Event/history canonicalization currently has send-message-heavy coverage. | Implementation/API-E2E must test at least one non-send family through route-backed MCP event/history path. | Residual risk, not design blocker. |
| Browser/media live environment availability | Browser bridge and media credentials may be unavailable in default CI. | API/E2E coverage investigation should separate mockable route tests from live-gated evidence. | Residual risk, not design blocker. |
| Published-artifact route-backed active-run context | Artifact publication depends on active run memory/workspace context and event projection. | Implementation and API/E2E should prove `publish_artifacts` uses active run id and persists/emits artifacts correctly. | Residual risk, not design blocker. |

## Review Decision

- `Pass`: the design is ready for implementation.

The design is actionable in the current codebase. It identifies the real external-runtime MCP exposure spines, keeps the Agent Tools MCP subsystem as the authoritative catalog/session/execution boundary, keeps family manifests/services as behavior owners, rejects compatibility paths, and provides a realistic migration/removal sequence.

## Findings

None.

## Classification

N/A — no blocking `Design Impact`, `Requirement Gap`, or `Unclear` findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Confirm Claude allowed-tool naming for multi-tool remote MCP descriptors during implementation/testing.
- Confirm Codex app-server event/history payload normalization for at least one non-send-message Agent Tools MCP call.
- Ensure `AgentToolMcpExecutionContext` stays focused on workspace/run execution data and does not become a full runtime-context dump or secret carrier.
- Ensure the final implementation leaves no active migrated tool exposure through old Claude local MCP servers or Codex `dynamicTools` registrations.
- Ensure published-artifact adapter preserves active-run durable projection/event behavior and no-leak guarantees.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Approved for implementation. No architecture rework is required before coding; downstream implementation and API/E2E should carry the residual validation risks above.
