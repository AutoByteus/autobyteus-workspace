# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-focused-member-messages/tickets/done/task-team-focused-member-messages/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-focused-member-messages/tickets/done/task-team-focused-member-messages/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-focused-member-messages/tickets/done/task-team-focused-member-messages/design-spec.md`
- Current Review Round: 2
- Trigger: Corrected architecture review after user rejected runtime/read-time compatibility for old flat Team Communication projection data; app-data migration is now in scope.
- Prior Review Round Reviewed: Round 1 in this report path.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Re-read architecture-reviewer skill, shared design principles, and report template; read corrected requirements, investigation notes, and design spec; inspected current app-data migration registry/runner/types/example migration and Team Communication runtime code paths. Current worktree inspection found WIP runtime fallback helper `legacyAddressFromFlatParticipant` in `team-communication-normalizer.ts`; the corrected design explicitly requires removing/moving that old-shape knowledge to migration-only code. No runtime tests were run during architecture review.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Revised address-first design review | N/A | None | Pass | No | Superseded by Round 2 because Round 1 allowed bounded old-flat/read-time conversion as a residual risk. |
| 2 | Corrected no-backward-compatibility + app-data-migration design review | No prior blocking findings; Round 1 compatibility residual rechecked | None | Pass | Yes | Design now cleanly separates runtime current-shape ownership from migration-only legacy conversion. |

## Reviewed Design Spec

`/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-focused-member-messages/tickets/done/task-team-focused-member-messages/design-spec.md`

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design states Bug Fix / Behavior Change / Refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design classifies Shared Structure Looseness and Duplicated Policy Or Coordination, citing existing send/routing use of `ConversationTargetAddress` versus Team Communication flat fields. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says refactor needed now and rejects both `taskTeamScope` and runtime old-flat compatibility. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Canonical model, legacy removal policy, app-data migration spine, file mapping, dependency rules, and migration/refactor sequence all implement a clean-cut address-first refactor. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | None | N/A | No unresolved prior findings. | Round 1 report had `Findings: None`. | N/A |
| 1 | Compatibility residual, not formal finding | N/A | Superseded/corrected. | Requirements now include `REQ-TTFM-011` through `REQ-TTFM-013`; design Legacy Removal Policy forbids runtime/read-time conversion and moves old flat handling into app-data migration. | Recorded because the corrected user guidance changed the architecture constraint. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-TTFM-001 | Focus-to-message UI path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-TTFM-002 | Backend persistence path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-TTFM-003 | Live WebSocket path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-TTFM-004 | GraphQL hydration path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-TTFM-005 | Address equality helper | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-TTFM-006 | Startup app-data migration path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend communication delivery/event construction | Pass | Pass | Pass | Pass | Correctly owns sender/receiver address construction while runtime/task context is still available. |
| Backend Team Communication projection/runtime | Pass | Pass | Pass | Pass | Correctly owns only current address-first projection validation/read/write after refactor. |
| Backend WebSocket mapper | Pass | Pass | Pass | Pass | Correct owner for live address-first payload transport shape. |
| Backend GraphQL hydration | Pass | Pass | Pass | Pass | Correct owner for current address-first API shape; no old-flat reconstruction. |
| Frontend Team Communication store | Pass | Pass | Pass | Pass | Correct owner for normalized messages and exact address-based perspective matching. |
| Frontend Team view/panel | Pass | Pass | Pass | Pass | Kept thin; focus/rendering only. |
| App-data migrations | Pass | Pass | Pass | Pass | Correct owner for old flat projection conversion, backup, and failed/warning item reporting. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ConversationTargetAddress` identity | Pass | Pass | Pass | Pass | Existing frontend/backend address models are reused instead of inventing Team Communication-specific identity. |
| Address key/equality helper | Pass | Pass | Pass | Pass | Store/utility-owned pure helper is appropriate; exact key matching prevents duplicated selector policy. |
| Address-first message normalization | Pass | Pass | Pass | Pass | Belongs to Team Communication runtime and must accept current shape only. |
| Migration-only old-flat parser | Pass | Pass | Pass | Pass | Correctly isolated to `app-data-migrations/migrations/...`, not runtime normalizers/stores/API. |
| Reference file handling | Pass | N/A | Pass | Pass | Existing message-owned reference route remains valid. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TeamCommunicationProjection.teamRunId` | Pass | Pass | Pass | N/A | Pass | Owns root team run bucket once at file/projection level. |
| `TeamCommunicationMessage.senderAddress` / `receiverAddress` | Pass | Pass | Pass | Pass | Replaces flat participant/run/path/represented-subteam identity fields. |
| `ConversationTargetAddress.segments` | Pass | Pass | Pass | Pass | Existing compact segment model covers persistent members, static nested members, task agents, task-team roots, and task-team children. |
| `referenceFiles` | Pass | Pass | Pass | N/A | Pass | Remains message-owned and not part of participant identity. |
| Rejected labels / `updatedAt` / `version` / `taskTeamScope` | Pass | Pass | Pass | N/A | Pass | Design explicitly rejects speculative/default redundant fields and relies on migration records rather than projection versioning. |
| Old flat migration input shape | Pass | Pass | Pass | N/A | Pass | Treated as migration input only, not a shared runtime model. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Flat sender/receiver run/path/route/kind/name identity fields | Pass | Pass | Pass | Pass | Replaced by sender/receiver addresses in runtime/durable/API/store shape. |
| `senderRepresentedSubTeam` / `receiverRepresentedSubTeam` identity fields | Pass | Pass | Pass | Pass | Address segments become identity; display labels remain out of scope pending concrete UI need. |
| `taskTeamScope` patch proposal | Pass | Pass | Pass | Pass | Rejected in favor of `task_team` address segment identity. |
| Store participant selector matching | Pass | Pass | Pass | Pass | Replaced by `getPerspectiveForAddress(teamRunId, address)` exact equality. |
| Projection `version` and message `updatedAt` defaults | Pass | Pass | Pass | Pass | Projection is minimal; migration records own upgrade status. |
| Runtime/read-time old-flat fallback readers | Pass | Pass | Pass | Pass | Design explicitly forbids them and names `legacyAddressFromFlatParticipant`-style helpers as runtime code to remove/move. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/conversation-target-address.ts` | Pass | Pass | N/A | Pass | Backend canonical address type/normalizer; do not fork. |
| `autobyteus-web/types/agent/ConversationTargetAddress.ts` | Pass | Pass | N/A | Pass | Frontend canonical address type. |
| `autobyteus-web/utils/teamConversationTargetSegments.ts` | Pass | Pass | Pass | Pass | Focused-node address builder reuse/extraction point. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-member-delivery-coordinator.ts` or nearby helper | Pass | Pass | Pass | Pass | Address construction belongs at delivery/event boundary before context is lost. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/events/mixed-team-event-bridge.ts` | Pass | Pass | Pass | Pass | Correct place to preserve parent/root-context task-team addresses during republish. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-types.ts` | Pass | Pass | Pass | Pass | Runtime projection/message model should be address-first only. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-normalizer.ts` | Pass | Pass | Pass | Pass | Current-shape normalizer only; any old-flat helper in WIP must be removed from this runtime file. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-service.ts` / projection store/service | Pass | Pass | Pass | Pass | Persist/read current projection only; no repair or fallback at read time. |
| `autobyteus-server-ts/src/services/agent-streaming/team-communication-message-payload.ts` | Pass | Pass | Pass | Pass | Owns live address-first payload shape. |
| `autobyteus-server-ts/src/api/graphql/types/team-communication.ts` | Pass | Pass | Pass | Pass | Owns current address-first hydration API shape. |
| `autobyteus-web/stores/teamCommunicationTypes.ts` / `teamCommunicationStore.ts` | Pass | Pass | Pass | Pass | Own frontend message model and exact address perspective matching. |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` / `TeamCommunicationPanel.vue` | Pass | Pass | Pass | Pass | Kept as composition/presentation; identity policy moves out. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/team-communication-projection-address-migration.ts` | Pass | Pass | Pass | Pass | Correct migration-only home for old flat parser/conversion/backup/reporting. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | Pass | Pass | Pass | Pass | Correct registration point for startup-required migration. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend Team Communication store | Pass | Pass | Pass | Pass | May depend on pure address utilities/types; not components or old flat selectors. |
| TeamCommunicationPanel / TeamOverviewPanel | Pass | Pass | Pass | Pass | Must not recreate route/path/run matching. |
| Backend Team Communication projection/runtime | Pass | Pass | Pass | Pass | May depend on address domain normalizers; must not depend on migration-only old-shape parser. |
| Backend stream mapper/projection service | Pass | Pass | Pass | Pass | Shared current-shape normalization encouraged to prevent live/hydrated drift. |
| Workspaces selection | Pass | Pass | Pass | Pass | Owns focus only; must not inspect message internals. |
| App-data migration | Pass | Pass | Pass | Pass | May know old flat fields and current address shape; runtime must not call migration parser as fallback. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ConversationTargetAddress` | Pass | Pass | Pass | Pass | Authoritative participant identity shape for Team Communication. |
| Backend Team Communication service/projection | Pass | Pass | Pass | Pass | Owns current persistence; callers should not write or parse flat participant fields. |
| App-data migration subsystem | Pass | Pass | Pass | Pass | Owns one-time old app-data transformation and logs; not a runtime compatibility service. |
| Frontend Team Communication store | Pass | Pass | Pass | Pass | Owns exact address matching and perspective grouping. |
| Team view components | Pass | Pass | Pass | Pass | Presentation does not bypass store-owned matching. |
| GraphQL/WebSocket boundaries | Pass | Pass | Pass | Pass | Transport exposes address-first message shape rather than reconstructing UI-specific or legacy identity. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `TeamCommunicationMessage` | Pass | Pass | Pass | Low | Pass |
| `getTeamCommunicationMessages(teamRunId)` | Pass | Pass | Pass | Low | Pass |
| `TEAM_COMMUNICATION_MESSAGE` live payload | Pass | Pass | Pass | Low | Pass |
| `teamCommunicationStore.getPerspectiveForAddress(teamRunId, address)` | Pass | Pass | Pass | Low | Pass |
| `buildConversationTargetAddressForNode(node)` | Pass | Pass | Pass | Low | Pass |
| `TeamCommunicationProjectionAddressMigration.execute()` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend `services/team-communication` | Pass | Pass | Low | Pass | Correct folder for current projection/persistence/read model only. |
| Backend `agent-team-execution/domain` address type | Pass | Pass | Low | Pass | Domain address type already exists and should not be forked. |
| Backend `services/agent-streaming` payload builder | Pass | Pass | Low | Pass | Correct transport adapter boundary. |
| Frontend `stores/teamCommunicationStore.ts` | Pass | Pass | Low | Pass | Correct state/perspective owner. |
| Frontend address utilities under `utils/` and types under `types/agent/` | Pass | Pass | Low | Pass | Existing focused-send address owner remains reused. |
| Vue components under workspace/team | Pass | Pass | Low | Pass | Thin composition/presentation placement is appropriate. |
| Backend `app-data-migrations/migrations` | Pass | Pass | Low | Pass | Correct folder for old app-data upgrade logic; prevents legacy parser leakage into runtime. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Focused target address derivation | Pass | Pass | N/A | Pass | Reuses existing send-target utilities. |
| Backend address validation/routing semantics | Pass | Pass | N/A | Pass | Reuses existing backend address domain and router semantics. |
| Live Team Communication event | Pass | Pass | N/A | Pass | Existing event type is refactored rather than creating a parallel stream. |
| Projection persistence | Pass | Pass | N/A | Pass | Existing projection owner remains correct after removing old-shape fallback. |
| Reference file content | Pass | Pass | N/A | Pass | Existing reference route remains message-owned. |
| Historical flat projection conversion | Pass | Pass | Pass | Pass | Existing app-data migration runner/registry/types/example migration are an appropriate capability area. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Flat sender/receiver participant fields in runtime model | No target retention | Pass | Pass | Removed from durable/API/store identity; allowed only in migration code/tests as legacy input. |
| Runtime/read-time old-flat fallback readers | No target retention | Pass | Pass | Corrected design explicitly forbids fallback in normalizer/service/store/GraphQL/WebSocket/frontend. |
| `taskTeamScope` | No | Pass | Pass | Explicitly rejected. |
| Labels/display snapshots | No target default | Pass | Pass | Add only if implementation proves a UI need. |
| Historical flat projection files | Migration-only handling | Pass | Pass | Backup/rewrite/report through app-data migration; no runtime compatibility. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| App-data migration addition/registration | Pass | Pass | Pass | Pass |
| Backend type/projection refactor | Pass | Pass | Pass | Pass |
| Backend communication address construction and bridge preservation | Pass | Pass | Pass | Pass |
| GraphQL/WebSocket API updates | Pass | Pass | Pass | Pass |
| Frontend store/types/component migration | Pass | Pass | Pass | Pass |
| Runtime legacy parser/fallback removal | Pass | Pass | Pass | Pass |
| Test and check sequence | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Task-team child stored projection | Yes | Pass | Pass | Pass | Good concrete example of `member -> task_team -> member` identity. |
| Flat-field anti-example | Yes | Pass | Pass | Pass | Clearly explains why old shape is avoided. |
| Address examples across target categories | Yes | Pass | N/A | Pass | Requirements and design cover persistent, nested, task-agent, task-team, and nested task-agent cases. |
| App-data migration path | Yes | Pass | Pass | Pass | Startup spine and sequence explain current skip, old flat conversion, backup/temp write, and failed-item reporting. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | Corrected package covers persistent members, static nested members, task agents, task-team roots/children, nested task agents, concurrent task-team isolation, hydration, and old flat projection migration. | N/A | Closed for design review. |

## Review Decision

- `Pass`: the corrected design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking design findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Current implementation WIP already contains runtime old-flat fallback (`legacyAddressFromFlatParticipant` in `team-communication-normalizer.ts`); implementation must remove it from runtime code and move any necessary old-shape parsing into the migration-only file/tests.
- Backend implementation must construct sender/receiver `ConversationTargetAddress` early enough that task-agent and task-team context is not lost, especially around task-team event republishing.
- Some historical old flat rows may be unconvertible; the migration must report those through item details/logs and must not hide them through runtime fallback.
- GraphQL schema/generated-client updates may require repository-specific codegen.
- UI display from addresses may be sparse for counterpart labels/team badges; the design intentionally defers labels unless implementation proves a concrete rendering need.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 2 supersedes Round 1. The corrected architecture now satisfies the no-backward-compatibility principle by keeping normal Team Communication runtime strictly address-first and isolating old flat projection conversion inside the app-data migration subsystem.
