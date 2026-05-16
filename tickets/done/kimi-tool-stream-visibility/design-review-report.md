# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility/tickets/done/kimi-tool-stream-visibility/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility/tickets/done/kimi-tool-stream-visibility/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility/tickets/done/kimi-tool-stream-visibility/design-spec.md`
- Current Review Round: `4`
- Trigger: Review of superseding revision `canonical-invocation-identity-refactor` after user direction on `2026-05-14` to remove all invocation alias legacy.
- Prior Review Round Reviewed: `3`
- Latest Authoritative Round: `4`
- Current-State Evidence Basis:
  - Re-read the revised requirements, investigation notes, and design spec for the exact-only identity revision.
  - Rechecked prior Round 3 pass context and confirmed the narrowed-alias design is explicitly superseded.
  - Inspected current source locations referenced by the design: web alias consumers, server file-change alias helpers/context store, Codex approval record/request handler, and Codex event payload parser.
  - Verified the revised design names concrete removal points, exact-only replacement ownership, Codex approval metadata separation, tests/docs updates, and final source-audit expectations.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | None blocking | Pass | No | Superseded by later design changes. |
| 2 | Narrowed-alias addendum review | Round 1 had no unresolved findings | DR-001 | Fail | No | Stale implementation guidance contradicted narrowed allowlist. |
| 3 | Narrowed-alias rework response | DR-001 resolved | None | Pass | No | Superseded by user-directed exact-only refactor revision. |
| 4 | Exact-only canonical invocation identity refactor review | Prior narrowed-alias findings obsolete/superseded | None | Pass | Yes | Design is ready for implementation. |

## Reviewed Design Spec

The revised design replaces the previous narrowed-alias policy with a clean-cut exact canonical invocation identity invariant. It deletes web/server alias helpers rather than narrowing them, moves identity correctness to runtime/adapter/protocol boundaries, keeps approval and provider details as separate metadata, and requires frontend/server projection to correlate only by exact id equality.

The design is actionable in the current codebase: it names the web projection files, server file-change files, Codex thread/request/parser files, tests, docs, and final audits that must change. It also rejects hidden compatibility paths, replacement suffix parsers, dual-key approval storage, and historical alias replay compatibility.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the task as `Refactor` plus `Bug Fix` and `Behavior Change`. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Requirements/investigation cite Kimi live repro, web/server alias helpers, git history, Codex MCP exact-id traces, Claude exact-id traces, and Codex approval adapter code. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor is `Yes`; narrowed allowlist and all alias legacy are explicitly rejected. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, dependency rules, file mapping, migration sequence, tests/docs guidance, and backward-compatibility rejection log all reflect exact-only identity. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 2 | DR-001 | Blocking | Obsolete / superseded | Round 2 finding concerned inconsistency in narrowed alias allowlist guidance. The current revision rejects all aliases and deletes the helper. | No carryover finding. |
| 3 | N/A | N/A | Superseded | Round 3 passed the narrowed-alias design, but requirements now explicitly supersede it. | Review resets to exact-only invariant. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Runtime/provider event to frontend transcript and Activity | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Frontend approve/deny return path to provider/client approval response | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Tool/file-change event to run file-change projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Web local segment/lifecycle/activity exact update | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Codex app-server approval request to exact approval record lifecycle | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Web agent streaming projection | Pass | Pass | Pass | Pass | Existing handlers remain owners; alias utility is removed. |
| Server runtime adapter/converter layer | Pass | Pass | Pass | Pass | Correct owner for public id canonicalization and provider metadata separation. |
| Codex thread approval state | Pass | Pass | Pass | Pass | Correct owner for requestId/approvalId/response metadata and exact record lookup. |
| Server file-change projection | Pass | Pass | Pass | Pass | Exact context store belongs here; no shared alias policy. |
| Documentation and tests | Pass | Pass | Pass | Pass | Old alias positives become negative unsupported cases. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Generic invocation aliasing | Pass | N/A | N/A | Pass | Correctly rejected/deleted as a reusable concern. |
| Exact id equality | Pass | Pass | Pass | Pass | Inline equality or tightly local exact predicates are sufficient; no shared matcher. |
| Codex approval record shape | Pass | Pass | Pass | Pass | Shared only inside Codex approval/thread boundary. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CodexApprovalRecord` | Pass | Pass | Pass | Pass | Pass | `invocationId` is canonical public id; `approvalId`/`requestId` remain metadata. Implementation should preserve the correct response-mode semantics when tightening the type. |
| Agent stream tool lifecycle payload ids | Pass | Pass | Pass | N/A | Pass | Same logical invocation uses the same exact public id. |
| File-change payload `sourceInvocationId` | Pass | Pass | Pass | N/A | Pass | Exact optional source id only; no context alias field. |
| Activity/transcript `invocationId` | Pass | Pass | Pass | N/A | Pass | Exact row/segment identity; alias-shaped ids are distinct. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/invocationAliases.ts` | Pass | Pass | Pass | Pass | Delete, no replacement allowlist. |
| Web invocation alias tests | Pass | Pass | Pass | Pass | Delete/replace with exact negative projection tests. |
| Server file-change alias helpers/reexports | Pass | Pass | Pass | Pass | Remove from domain and facade exports. |
| `FileChangeInvocationContext.aliases` and multi-key storage | Pass | Pass | Pass | Pass | Exact context key only. |
| `toolLifecycleHandler.resolveToolSegmentByAlias()` | Pass | Pass | Pass | Pass | Rename or inline exact resolver; old alias name must disappear. |
| Activity alias expansion/update | Pass | Pass | Pass | Pass | Exact upsert/update one row. |
| Codex combined `itemId:approvalId` public ids | Pass | Pass | Pass | Pass | Public id remains item/call id; approval id metadata stays internal. |
| Codex approval alias record storage/split fallback/dual delete | Pass | Pass | Pass | Pass | Exact map key only. |
| Codex parser approval-id append | Pass | Pass | Pass | Pass | Return provider/item/call id exactly. |
| Alias-positive docs/examples | Pass | Pass | Pass | Pass | Exact-only docs required. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Pass | Pass | Pass | Pass | Exact segment lookup/update only. |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Pass | Pass | Pass | Pass | Exact lifecycle segment resolution/creation only. |
| `autobyteus-web/services/agentStreaming/handlers/toolActivityProjection.ts` | Pass | Pass | Pass | Pass | Exact Activity upsert/update/log/result. |
| `autobyteus-web/utils/invocationAliases.ts` | Pass | Pass | N/A | Pass | Deleted; no target responsibility. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-change.ts` | Pass | Pass | Pass | Pass | File-change domain helpers only. |
| `autobyteus-server-ts/src/agent-execution/events/processors/file-change/file-change-invocation-context-store.ts` | Pass | Pass | Pass | Pass | Exact context lifecycle only. |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-types.ts` | Pass | Pass | Pass | Pass | Reexport facade only; no alias helpers. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts` | Pass | Pass | Pass | Pass | Resolve canonical approval identity and metadata. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Pass | Pass | Pass | Pass | Exact approval record Map operations. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-approval-record.ts` | Pass | Pass | Pass | Pass | Tight Codex-local approval record. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | Pass | Pass | Pass | Pass | Resolve public ids without appending approval metadata. |
| Exact-identity docs | Pass | Pass | N/A | Pass | Existing docs locations are appropriate. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime adapters/converters | Pass | Pass | Pass | Pass | Own provider id extraction and metadata mapping. |
| Web projection handlers | Pass | Pass | Pass | Pass | May compare ids exactly; must not parse suffixes. |
| Codex approval owner | Pass | Pass | Pass | Pass | Owns approval metadata and exact record lifecycle. |
| File-change context store | Pass | Pass | Pass | Pass | Exact context key; no repair of mismatched producer ids. |
| Docs/tests | Pass | Pass | Pass | Pass | Must encode aliases as unsupported. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime adapter/converter public event boundary | Pass | Pass | Pass | Pass | Fix producer output or add metadata fields; projection must not infer suffix semantics. |
| `CodexThread` approval owner | Pass | Pass | Pass | Pass | Higher layers use exact invocation id; requestId/approvalId stay internal. |
| File-change context store | Pass | Pass | Pass | Pass | Exact Map lifecycle only. |
| Web streaming handlers | Pass | Pass | Pass | Pass | Components/renderers do not compensate for id mismatches. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `SEGMENT_START.payload.id` / `SEGMENT_END.payload.id` | Pass | Pass | Pass | Low | Pass |
| `TOOL_EXECUTION_* payload.invocation_id` | Pass | Pass | Pass | Low | Pass |
| `TOOL_LOG.payload.tool_invocation_id` | Pass | Pass | Pass | Low | Pass |
| `TOOL_APPROVAL_REQUESTED.payload.invocation_id` | Pass | Pass | Pass | Low | Pass |
| Frontend `approveTool(invocationId, ...)` / `denyTool(invocationId, ...)` | Pass | Pass | Pass | Low | Pass |
| `CodexApprovalRecord.invocationId` | Pass | Pass | Pass | Low | Pass |
| `FileChangeInvocationContextStore.record/find/consume` | Pass | Pass | Pass | Low | Pass |
| `AgentRunFileChangePayload.sourceInvocationId` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/handlers` | Pass | Pass | Low | Pass | Existing frontend projection boundary. |
| `autobyteus-web/utils` alias helper removal | Pass | Pass | Low after deletion | Pass | Exact equality does not justify shared utility. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread` | Pass | Pass | Low after refactor | Pass | Correct Codex approval state owner. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events` | Pass | Pass | Low | Pass | Correct parser/converter boundary. |
| `autobyteus-server-ts/src/agent-execution/events/processors/file-change` | Pass | Pass | Low | Pass | Correct file-change projection owner. |
| Docs paths | Pass | Pass | Low | Pass | Existing durable documentation locations. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Transcript projection | Pass | Pass | N/A | Pass | Reuse handler, remove alias helper. |
| Lifecycle projection | Pass | Pass | N/A | Pass | Reuse handler, exact resolver. |
| Activity projection | Pass | Pass | N/A | Pass | Reuse projection owner, exact row operations. |
| File-change context | Pass | Pass | N/A | Pass | Reuse local store, exact key only. |
| Codex approval metadata | Pass | Pass | N/A | Pass | Reuse Codex thread/request/record files. |
| Shared invocation matcher | Pass | Pass | N/A | Pass | Correctly not created. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Web alias helper/allowlist | No planned retention | Pass | Pass | Delete. |
| Server file-change alias helper | No planned retention | Pass | Pass | Remove exports and store aliases. |
| Codex `itemId:approvalId` public ids | No planned retention | Pass | Pass | Public id stays item/call id. |
| Codex approval dual-key/fallback lookup | No planned retention | Pass | Pass | Exact record operations. |
| Historical alias-shaped run replay | No planned retention | Pass | Pass | Explicitly out of scope. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Web alias cleanup and exact projection | Pass | Pass | Pass | Pass |
| Frontend exact/negative tests | Pass | Pass | Pass | Pass |
| Server file-change exact context | Pass | Pass | Pass | Pass |
| Codex approval identity refactor | Pass | Pass | Pass | Pass |
| Codex event parser refactor | Pass | Pass | Pass | Pass |
| Docs and final source audit | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Kimi ids | Yes | Pass | Pass | Pass | Directly covers original bug. |
| File-write ids | Yes | Pass | Pass | Pass | Producer canonicalization vs frontend repair is clear. |
| Approval ids | Yes | Pass | Pass | Pass | Separates public id from approval metadata. |
| Context store exact lookup | Yes | Pass | Pass | Pass | Shows old alias lookup is unsupported. |
| Old alias negative tests | Yes | Pass | Pass | Pass | Guidance includes concrete negative assertions. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Codex terminal approval with non-null `approvalId` | Investigation notes say the live trace did not exercise a non-null approval id even though code supports it. | Add focused Codex approval tests covering separate `approvalId` metadata, exact public `itemId`, exact lookup, and no fallback from `itemId:approvalId`. | Implementation/validation risk, not design blocker. |
| Codex `responseMode` string semantics | The design correctly owns response mode inside Codex approval metadata; implementation must not confuse `_meta.codex_approval_kind = mcp_tool_call` with the existing MCP elicitation response mode payload shape. | Preserve or update `approveTool()` response-mode handling in lockstep with the tightened `CodexApprovalRecord` type. | Implementation note. |
| Hidden future producers with mismatched segment/lifecycle ids | Exact-only refactor will surface mismatches instead of repairing them. | Treat as producer bugs and fix at adapter/protocol boundary. | Accepted behavior. |
| Historical run replay mismatch | Old alias-shaped historical runs may render as separate items. | No hidden compatibility in this ticket; separate migration/reporting feature only if later requested. | Accepted out of scope. |

## Review Decision

`Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking finding.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must delete alias helpers and not recreate them under names like `canonicalizeInvocationId`, `normalizeInvocationId`, or `idsMatch` if they parse suffixes or support compatibility.
- The current worktree contains uncommitted narrowed-alias changes; implementation must remove/replace them rather than layer exact-only logic on top.
- Codex approval refactor must keep `approvalId`, `requestId`, method, tool name, and response mode as metadata while preserving the correct provider response payload shape.
- Final source audits should review active production references, not only tests/docs, and should separately review Codex paths for hidden colon-split or approval-id concatenation.

## Latest Authoritative Result

- Review Decision: `Pass`
- Notes: The `canonical-invocation-identity-refactor` revision supersedes the narrowed-alias design. Exact canonical invocation identity, alias deletion, exact file-change context storage, and Codex approval metadata separation are architecture-approved for implementation.
