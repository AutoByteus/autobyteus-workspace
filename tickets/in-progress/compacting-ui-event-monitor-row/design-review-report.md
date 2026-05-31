# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row/tickets/in-progress/compacting-ui-event-monitor-row/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row/tickets/in-progress/compacting-ui-event-monitor-row/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row/tickets/in-progress/compacting-ui-event-monitor-row/design-spec.md`
- Current Review Round: 1
- Trigger: Initial design review requested by `solution_designer` after user-approved requirements on 2026-05-31.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Static review of the design package plus spot-checks of current code in `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row`, including `AgentEventMonitor.vue`, `agentActivityStore.ts`, `agentStatusHandler.ts`, `runProjectionActivityHydration.ts`, and server run-history projection transformers.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | No | Pass | Yes | Design is implementation-ready with residual risks documented below. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row/tickets/in-progress/compacting-ui-event-monitor-row/design-spec.md`.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the work as `Behavior Change / UX refinement` and names the approved Activity integration scope. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design classifies `Boundary Or Ownership Issue` and ties it to current banner ownership plus tool-only Activity state. Current code confirms top banner placement in `AgentEventMonitor.vue` and tool-only `ToolActivity[]` in `agentActivityStore.ts`. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says refactor needed now, specifically broadening Activity state and removing the banner path. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Removal plan, ownership boundaries, interface mapping, migration sequence, and rejected compatibility log all reflect the refactor decision. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-CUI-001 | Live compaction projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-CUI-002 | Mixed Activity rendering | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-CUI-003 | Historical hydration | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-CUI-004 | Shared monitor/focused-run rendering | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-CUI-005 | Tool-only mutation isolation | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend streaming handlers | Pass | Pass | Pass | Pass | New compaction projection beside, not inside, tool projection is the right split. |
| Frontend Activity state | Pass | Pass | Pass | Pass | Extending `AgentActivityStore` into run activity authority is sound for Activity plus monitor compaction rows. |
| Event monitor feed | Pass | Pass | Pass | Pass | Feed owns in-flow placement; monitor shell only bridges run id/store data. |
| Desktop/mobile Activity UI | Pass | Pass | Pass | Pass | Branching by `RunActivity.kind` avoids fake tool rows and separate sections. |
| Run projection / hydration | Pass | Pass | Pass | Pass | Durable evidence only; no frontend fabrication. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Compaction phase/presentation mapping | Pass | Pass | Pass | Pass | Design keeps presentation mapping separate from state normalization. |
| `RunActivity` / `ToolActivity` / `CompactionActivity` | Pass | Pass | Pass | Pass | Store-exported or typed file placement is acceptable; discriminant is required. |
| Compaction payload normalization | Pass | Pass | Pass | Pass | `compactionActivityProjection.ts` is the right owner. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RunActivity` | Pass | Pass | Pass | Pass | Discriminated union prevents optional-field kitchen sink. |
| `ToolActivity` | Pass | Pass | Pass | Pass | Tool-specific status/result/log fields stay under `kind: 'tool'`. |
| `CompactionActivity` | Pass | Pass | Pass | Pass | Uses compaction `phase`, not `ToolInvocationStatus`. |
| Projection activity entry | Pass | Pass | Pass | Pass | Discriminated projection entries are adequate over current GraphQL JSON arrays. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `CompactionStatusBanner` top UI | Pass | Pass | Pass | Pass | Clean-cut removal/no hidden fallback is explicit. |
| `compaction-status` monitor prop path | Pass | Pass | Pass | Pass | Parent shells stop passing it unless non-UI consumer remains. |
| Tool-only Activity model/actions | Pass | Pass | Pass | Pass | Generic reads plus tool-specific mutations are named. |
| `MobileToolActivityList` naming/labels | Pass | Pass | Pass | Pass | Rename/relabel is in scope. |
| Tool-only historical activity assumption | Pass | Pass | Pass | Pass | Server/frontend projection union is in scope. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentActivityStore.ts` | Pass | Pass | Pass | Pass | Owns run-scoped activity state and kind-specific mutations. |
| `compactionActivityProjection.ts` | Pass | Pass | Pass | Pass | Owns compaction identity/phase/timestamp/upsert policy. |
| `toolActivityProjection.ts` | Pass | Pass | N/A | Pass | Remains tool-only. |
| `AgentConversationFeed.vue` | Pass | Pass | Pass | Pass | Owns in-flow feed item composition/rendering. |
| `AgentEventMonitor.vue` | Pass | Pass | Pass | Pass | Shared shell/run-id bridge only; no banner policy. |
| `ActivityFeed.vue` and row components | Pass | Pass | Pass | Pass | List dispatch remains separate from row-specific renderers. |
| Mobile Activity components | Pass | Pass | Pass | Pass | Mixed mobile list naming/responsibility is clear. |
| Run projection/hydration files | Pass | Pass | Pass | Pass | Durable projection conversion stays in projection subsystem. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Compaction projection | Pass | Pass | Pass | Pass | Handler delegates; UI does not parse raw payload/latest status. |
| AgentActivityStore | Pass | Pass | Pass | Pass | Store is the authoritative run-activity source for both Activity and monitor compaction rows. |
| AgentConversationFeed | Pass | Pass | Pass | Pass | Top-banner bypass is forbidden. |
| Run projection service | Pass | Pass | Pass | Pass | Historical rows must come from durable projection data. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `compactionActivityProjection` | Pass | Pass | Pass | Pass | Single live projection owner is explicit. |
| `AgentActivityStore` | Pass | Pass | Pass | Pass | Generic `getActivities` plus `getCompactionActivities`/`getToolActivities` and tool-specific mutations control bleed. |
| `AgentConversationFeed` | Pass | Pass | Pass | Pass | Feed owns in-monitor placement; monitor shell cannot reintroduce banner. |
| Server run projection | Pass | Pass | Pass | Pass | Frontend fabrication is explicitly forbidden. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `handleCompactionStatus(payload, context)` | Pass | Pass | Pass | Low | Pass |
| `projectCompactionStatusToActivity(...)` | Pass | Pass | Pass | Medium | Pass |
| `getActivities(runId)` | Pass | Pass | Pass | Low | Pass |
| `getToolActivities(runId)` / tool mutations | Pass | Pass | Pass | Low | Pass |
| `getCompactionActivities(runId)` / `upsertCompactionActivity` | Pass | Pass | Pass | Low | Pass |
| `AgentConversationFeed` props | Pass | Pass | Pass | Low | Pass |
| `RunProjectionActivityEntry` union | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `services/agentStreaming/handlers` | Pass | Pass | Low | Pass | Existing handler/projection boundary. |
| `stores/agentActivityStore.ts` | Pass | Pass | Low | Pass | Sidecar activity state owner. |
| `components/workspace/agent` | Pass | Pass | Low | Pass | Monitor/feed presentation boundary. |
| `components/progress` | Pass | Pass | Low | Pass | Desktop Activity presentation. |
| `components/mobile` | Pass | Pass | Medium | Pass | Rename mitigates tool-only drift. |
| `autobyteus-server-ts/src/run-history/projection` | Pass | Pass | Low | Pass | Durable replay/projection owner. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Run activity storage | Pass | Pass | N/A | Pass | Existing Activity store should be extended, not duplicated. |
| Tool projection | Pass | Pass | N/A | Pass | Keep tool projection tool-only. |
| Compaction projection | Pass | Pass | Pass | Pass | Separate projection is justified because compaction is not a tool. |
| Event monitor row | Pass | Pass | N/A | Pass | Existing feed owns in-flow rows. |
| Historical hydration | Pass | Pass | N/A | Pass | Existing projection path owns reload behavior. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Top banner | No | Pass | Pass | Banner fallback rejected. |
| Fake tool row | No | Pass | Pass | Explicitly rejected. |
| Separate compaction Activity section | No | Pass | Pass | Explicitly rejected. |
| Historical fabrication | No | Pass | Pass | Explicitly rejected. |
| Tool-only action names | No steady-state retention | Pass | Pass | Ambiguous names are renamed/split where needed. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Activity store broadening | Pass | Pass | Pass | Pass |
| Live compaction projection | Pass | Pass | Pass | Pass |
| Monitor banner replacement | Pass | Pass | Pass | Pass |
| Desktop/mobile Activity rendering | Pass | Pass | Pass | Pass |
| Historical projection/hydration | Pass | Pass | Pass | Pass |
| Tests/docs update | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Activity model | Yes | Pass | Pass | Pass | Shows compaction vs fake tool row. |
| Event monitor placement | Yes | Pass | Pass | Pass | Shows row inside feed vs banner above feed. |
| Activity area | Yes | Pass | Pass | Pass | Shows one mixed feed vs separate section. |
| Tool updates | Yes | Pass | Pass | Pass | Shows `kind === 'tool'` guard. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Exact retention/collapse behavior for completed rows | Could affect visual density. | Accept current design guidance: completed rows remain a compact row unless implementation finds a product blocker; do not block implementation. | Residual risk only. |
| `compactionRunId` click behavior | Navigation ownership is not established. | Keep non-clickable unless existing navigation API is clearly owned; do not invent routing in this ticket. | Residual risk only. |
| Fine-grained placement inside an active AI message | Current feed groups by messages; row ordering uses placement timestamp. | Implement timestamp sort as designed; if segment-level interleaving becomes a product requirement, route a new design question. | Residual risk only. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must preserve tool-row identity stability while adding `activityId`; for tool rows, `activityId` should remain compatible with current invocation-id highlight flows unless explicitly migrated everywhere.
- Historical rows will remain incomplete for agent-based semantic compaction unless those events gain durable projection evidence later; this is an accepted scoped deferral.
- Provider-native compaction payloads need careful `status -> phase` normalization and should retain labels that make clear they are compaction boundary/activity rows, not tool invocations.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The reviewed design satisfies the approved scope, cleanly moves compaction UI into an in-flow monitor row, extends Activity through a typed `RunActivity` union, prevents tool/compaction boundary bleed, removes the obsolete banner path, and handles historical projection without frontend fabrication.
