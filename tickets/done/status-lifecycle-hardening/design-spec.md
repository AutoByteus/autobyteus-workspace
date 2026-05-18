# Design Spec

## Current-State Read

The merged early-initializing behavior exists, but its lifecycle policy is spread across several owners:

- `CodexTeamManager` and `ClaudeTeamManager` own `commandStatusByMemberRouteKey`, call helper functions from `team-member-command-start-status-overlays.ts`, and clear pending overlays on member `AGENT_STATUS` events.
- `AutoByteusTeamRunBackend` owns command orchestration plus native member status projection, `pendingRootCommandStartStatus`, `pendingCommandStartStatusByRunId`, `lastMemberStatusByRunId`, overlay application, replacement clearing, and same-batch aggregate derivation.
- `AutoByteusTeamRunEventProcessor` independently resolves native member identity from native agent id, configured member run id, member name, route key, and runtime context, duplicating backend identity/projection logic.
- `MixedAgentMemberHandle` and `MixedSubTeamMemberHandle` each own local `commandStatusOverride` state and duplicate the offline/idle gate, publish, clear, and failure-replacement lifecycle.
- `team-member-command-start-status-events.ts` is already the right shared builder for command-start `TeamRunEvent`/`AgentStatusPayload` shapes.
- `deriveTeamApiStatus` is already the right aggregate-status owner and should receive overlay-adjusted status inputs rather than being replaced.

The target design must preserve existing behavior: command owners publish early `initializing` from the backend side, only for offline/idle effective status, before slow runtime/native/child send work completes; replacement runtime/native/team status events clear the pending overlay; failure replaces pending status with `error`.

## Intended Change

Introduce two explicit owners and migrate all current team command-start overlay copies to them:

1. `TeamCommandStatusOverlayStore`: a per-manager/backend/handle bounded lifecycle owner for pending command-start overlays. It supports member overlays and team/source-path overlays, publishes existing event shapes, applies overlays to snapshots/aggregate inputs, clears overlays on matching replacement events, replaces failures, and clears all state on dispose/terminate.
2. `AutoByteusTeamMemberStatusProjector`: a native AutoByteus identity/status projection owner. It canonicalizes native agent id, configured member run id, runtime member context, member name, route key, and path for both backend snapshots and native event processing. It also owns native observed-member status cache used for same-batch aggregate derivation; the overlay store remains limited to pending command-start overlays.

This is a clean-cut refactor. Old helper functions, caller-owned overlay maps, native backend overlay/cache fields, and mixed local `commandStatusOverride` fields are removed instead of retained behind compatibility wrappers.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / architecture hardening.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination; Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Shared Structure Looseness.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: Current code has multiple overlay lifecycle implementations; native identity policy appears in both backend and event processor; native backend combines command orchestration with projection, pending overlays, observed status cache, and aggregate overlay application.
- Design response: Extract the pending overlay lifecycle into `TeamCommandStatusOverlayStore`; extract native identity/status projection into `AutoByteusTeamMemberStatusProjector`; keep command owners and aggregate/event builders in their existing authority.
- Refactor rationale: Adding more status behavior to current files would increase responsibility drift and preserve duplicated lifecycle policy. The follow-up is worthwhile only if it removes those duplicates cleanly.
- Intentional deferrals and residual risk, if any: Command-start leases/tokens are deferred because no verified stale/duplicate overlay defect is in scope. Residual risk is that concurrent duplicate commands can still be last-write-wins/idempotent; this matches current behavior and should be revisited only with a reproduced defect.

## Terminology

- `Member overlay`: pending command-start `AgentStatusPayload` for one team member identity.
- `Team/source-path overlay`: pending command-start team status for a `TeamRunEventSourceType.TEAM` source path. Root team status uses `[]`; mixed sub-team represented status uses the sub-team member path.
- `Native member identity`: canonical tuple used by native AutoByteus paths: configured member run id, member name, member route key, member path, and optional native agent id.

## Design Reading Order

1. Data-flow spine and owners.
2. Overlay store and native projector allocation.
3. File responsibilities and removals.
4. Migration/refactor sequence and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: replace old helper functions and local overlay state with direct use of the new owner.
- Obsolete in scope: `getCommandStatusSnapshot`, `publishTeamMemberCommandStatus`, `commandStatusByMemberRouteKey` maps, native pending overlay fields, native backend status cache fields, and mixed local `commandStatusOverride` fields.
- No compatibility wrapper may keep old maps in sync with the new store.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User/inter-agent command targeting a managed member | Member runtime send and replacement status reflection | Existing command owner (`CodexTeamManager`, `ClaudeTeamManager`, `MixedAgentMemberHandle`) | Preserves early member `initializing` without moving runtime startup/send ownership |
| DS-002 | Primary End-to-End | Native AutoByteus member-targeted command | Native `team.postMessage` and replacement status reflection | `AutoByteusTeamRunBackend` | Native member identity/projection is the highest-risk path |
| DS-003 | Primary End-to-End | Root/no-target native command or mixed sub-team command | Native/child-team send and matching team-source status reflection | Existing command owner (`AutoByteusTeamRunBackend`, `MixedSubTeamMemberHandle`) | Requires team/source-path overlay support, not only member overlays |
| DS-004 | Return-Event | Runtime/native/child status event | Snapshot and aggregate team status after overlay replacement | Runtime manager/backend/handle event path | Replacement events must clear pending overlays consistently |
| DS-005 | Bounded Local | Native member inputs/events | Canonical native member identity/status payload | `AutoByteusTeamMemberStatusProjector` | Prevents duplicated native identity policy |

## Primary Execution Spine(s)

- Managed member command: `Command surface -> Codex/Claude/Mixed command owner -> target/member context -> TeamCommandStatusOverlayStore member overlay -> AgentRun create/restore/send -> AgentRun status event -> overlay clear -> snapshot/aggregate publish`.
- Native member command: `Command surface -> AutoByteusTeamRunBackend -> target member context -> AutoByteusTeamMemberStatusProjector current status -> TeamCommandStatusOverlayStore member overlay -> native team.postMessage -> native event processor -> projector/store replacement -> aggregate publish`.
- Team/source-path command: `Command surface -> native backend or mixed sub-team handle -> TeamCommandStatusOverlayStore team/source-path overlay -> native/child team send -> matching TEAM status event -> overlay clear -> aggregate/status snapshot publish`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A member-targeted command is accepted by an existing manager/handle. The owner resolves the member and tells the overlay store to publish pending `initializing` if the effective member status is offline/idle. Runtime creation/send remains in the owner. Later member events clear the pending overlay. | Command owner, member runtime, overlay store | Existing manager/handle | Event builders, aggregate derivation |
| DS-002 | Native backend resolves the target member, asks the native projector for canonical identity/current status, publishes a pending member overlay, sends to native team, and later processes native events through the same identity owner before clearing overlays and deriving aggregate status. | AutoByteus backend, native projector, overlay store, native team | `AutoByteusTeamRunBackend` for command sequencing; projector for identity | Native event processor, event builders, aggregate derivation |
| DS-003 | A no-target/native-root or mixed sub-team command publishes a pending team/source-path overlay keyed by explicit source path. Matching team status events clear the source-path overlay. | Command owner, overlay store, native/child team | Existing backend/handle | Source-path key normalization, event builders |
| DS-004 | Runtime/native/child events travel back through existing event subscriptions/processors. Status events update the native projector when applicable and clear overlays in the store before aggregate status is computed. | Event processor/subscription, projector, overlay store, aggregate owner | Existing event path owner | Status event extraction and source-path matching |
| DS-005 | Native status inputs are resolved against runtime contexts, native ids, configured run ids, names, route keys, and paths by one projector. Backend snapshots and processor event identity use this same API. | Native projector | `AutoByteusTeamMemberStatusProjector` | Existing low-level `projectAutoByteusAgentStatus` |

## Spine Actors / Main-Line Nodes

- Command owners: `CodexTeamManager`, `ClaudeTeamManager`, `AutoByteusTeamRunBackend`, `MixedAgentMemberHandle`, `MixedSubTeamMemberHandle`.
- `TeamCommandStatusOverlayStore`.
- `AutoByteusTeamMemberStatusProjector`.
- Runtime/native/child team send targets: `AgentRun`, native `AutoByteusTeamLike`, child `TeamRun`.
- Event return owners: member run subscriptions, native `AutoByteusTeamRunEventProcessor`, child team subscriptions.
- Aggregate owner: `deriveTeamApiStatus`.

## Ownership Map

| Node | Owns |
| --- | --- |
| Command owners | Target resolution, command-start timing, runtime/native/child creation, provider/native/child send, command result shaping |
| `TeamCommandStatusOverlayStore` | Pending command-start overlay state, offline/idle gate, event publishing for command-start status, failure replacement, matching replacement clearing, overlay application to snapshots/aggregate inputs |
| `AutoByteusTeamMemberStatusProjector` | Native AutoByteus member identity canonicalization, native member snapshot projection, native observed status cache for event-based aggregate derivation, native id backfill into runtime context |
| `AutoByteusTeamRunEventProcessor` | Native event translation into `TeamRunEvent`; uses projector for identity rather than owning identity policy |
| `team-member-command-start-status-events.ts` | Construction of existing member and team command-start event/payload shapes |
| `deriveTeamApiStatus` | Aggregate status derivation from already-prepared member/team status inputs |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamManager` / `TeamRunBackend` interface methods | Concrete manager/backend/handle | Public runtime command contract | Pending overlay maps or native identity projection |
| `AutoByteusTeamRunEventProcessor.buildProcessedTeamEvents` | Event processor + native projector | Native stream translation boundary | Canonical native member identity policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `getCommandStatusSnapshot` helper | Store owns snapshot overlay lookup/application | `TeamCommandStatusOverlayStore.getMemberStatusSnapshot` / `applyMemberStatusOverlays` | In This Change | No wrapper export retained |
| `publishTeamMemberCommandStatus` helper | Store owns publishing + pending member state | `TeamCommandStatusOverlayStore.publishMemberCommandStatus` | In This Change | Reuse existing event builders |
| `commandStatusByMemberRouteKey` in Codex/Claude managers | Caller-owned map duplicates store state | Per-manager `TeamCommandStatusOverlayStore` | In This Change | Clear via store on member event |
| `pendingRootCommandStartStatus` in native backend | Store owns team/source-path pending overlay | `TeamCommandStatusOverlayStore` | In This Change | Root key is `[]` |
| `pendingCommandStartStatusByRunId` in native backend | Store owns pending member overlays | `TeamCommandStatusOverlayStore` | In This Change | Prefer route-key/full identity key, not raw run-id-only policy |
| `lastMemberStatusByRunId` in native backend | Native projector owns observed native status cache | `AutoByteusTeamMemberStatusProjector` | In This Change | Keeps overlay store from becoming runtime status authority |
| `getMemberStatusSnapshotFor` native backend method as identity/projection blob | Projection belongs in projector | `AutoByteusTeamMemberStatusProjector.projectMemberStatusSnapshot` | In This Change | Backend may keep a thin delegating private only if needed during migration, removed before handoff |
| Native event processor identity helpers duplicated from backend | Identity policy centralizes in projector | `AutoByteusTeamMemberStatusProjector.resolve...` methods | In This Change | Processor remains event translator |
| `commandStatusOverride` in mixed leaf/sub-team handles | Local lifecycle duplicates store behavior | Per-handle `TeamCommandStatusOverlayStore` | In This Change | Sub-team uses team/source-path overlay |

## Return Or Event Spine(s) (If Applicable)

- Managed member event return: `AgentRun event -> manager/handle subscription -> store.recordReplacementEvents / clear member overlay -> publish member event -> publish aggregate if changed`.
- Native event return: `AgentTeamEventStream -> AutoByteusTeamRunEventProcessor -> native projector identity/status record -> store.recordReplacementEvents -> withTeamStatusUpdate -> listeners`.
- Mixed sub-team event return: `Child TeamRun event -> prefixMixedSubTeamEvent -> store.recordReplacementEvents / clear source-path overlay -> publish prefixed event -> notify aggregate status change`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TeamCommandStatusOverlayStore`.
  - `publish command status -> normalize effective status -> gate initializing -> write pending overlay -> build event -> publish event -> notify status change`.
  - This matters because all duplicated lifecycle branches should collapse into this one local flow.
- Parent owner: `AutoByteusTeamMemberStatusProjector`.
  - `native event/member snapshot input -> resolve runtime context/native id/member name -> canonical identity -> project status payload -> cache observed status when event-based`.
  - This matters because native identity is currently the loosest structure.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Command-start event builders | DS-001, DS-002, DS-003 | Overlay store | Build existing `TeamRunEvent` and `AgentStatusPayload` shapes | Avoid event-shape duplication | Store or command owners would handcraft inconsistent payloads |
| Aggregate derivation | DS-001, DS-002, DS-003, DS-004 | Command owners/event paths | Derive team status from member statuses and native/team status | Existing correct aggregate owner | Overlay store becomes a global status manager |
| Native agent status projection | DS-002, DS-005 | Native projector | Convert native current status + active turn into `AgentStatusPayload` | Existing low-level converter | Backend/event processor duplicate projection |
| Member selector resolution | DS-001, DS-002 | Command owners | Resolve target selectors to runtime contexts | Targeting remains command-owner responsibility | Overlay store starts routing commands |
| Source-path key normalization | DS-003, DS-004 | Overlay store | Match root/team/sub-team `TEAM` overlays by source path | Needed for root `[]` and mixed sub-team member path | Root-only store cannot replace mixed sub-team lifecycle |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Command-start event construction | `agent-team-execution/services/team-member-command-start-status-events.ts` | Reuse | Already centralizes payload/event shapes | N/A |
| Pending overlay lifecycle | `agent-team-execution/services/team-member-command-start-status-overlays.ts` | Extend/replace | Existing file is the right capability area but the wrong abstraction | N/A; replace helper with owner |
| Native status projection | `agent-execution/backends/autobyteus/events/autobyteus-status-projector.ts` | Reuse inside new owner | Low-level agent projection exists but lacks team member identity | New team-level projector needed for team member identity |
| Team aggregate status | `agent-team-execution/domain/team-status-aggregation.ts` | Reuse | Already owns aggregate rules | N/A |
| Native identity resolution | `backends/autobyteus` | Create new file in existing subsystem | Native-team-specific identity requires backend runtime context and native team contract | Shared services would be too generic and would know native internals |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/services` | Generic team command-start overlay lifecycle and event builders | DS-001, DS-002, DS-003, DS-004 | Runtime managers/backends/handles | Extend | Store stays generic to team overlays, not native-specific |
| `agent-team-execution/backends/autobyteus` | Native member identity and status projection | DS-002, DS-005 | Native backend/event processor | Create file in existing subsystem | Native-specific because it depends on native agent ids/context shape |
| `agent-team-execution/domain` | Aggregate status derivation and member identity selector helpers | DS-001-DS-004 | Command owners | Reuse | Do not move these into store |
| Mixed backend member handles | Command sequencing for mixed leaf/sub-team members | DS-001, DS-003 | Mixed manager | Modify | Handles instantiate/use store but do not own lifecycle internals |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `services/team-command-status-overlay-store.ts` | Team execution services | `TeamCommandStatusOverlayStore` | Pending member and team/source-path overlay lifecycle | Member/root/source-path overlays are one tight lifecycle concern | Uses event builders and `AgentStatusPayload` |
| `services/team-member-command-start-status-overlays.ts` | Team execution services | Obsolete helper file | Current helper functions | Becomes unnecessary after store replacement | N/A |
| `backends/autobyteus/autobyteus-team-member-status-projector.ts` | Native AutoByteus backend | Native projector | Canonical native member identity, snapshot projection, observed status cache | Native-specific identity should not live in generic store | Uses low-level native status projector |
| `backends/autobyteus/autobyteus-team-run-backend.ts` | Native backend | Command/event orchestration owner | Calls projector/store; no raw overlay maps | Keeps backend focused on command/event sequencing | Uses store/projector |
| `backends/autobyteus/autobyteus-team-run-event-processor.ts` | Native backend | Event translator | Delegates identity resolution to projector | Keeps event processing without identity duplication | Uses projector API |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Member command status identity (`memberName`, `memberRunId`, `memberPath`, `memberRouteKey`) | `services/team-command-status-overlay-store.ts` exported type | Team execution services | Store/event builders need the same explicit member identity | Yes | Yes | Generic selector that resolves targets |
| Team/source-path overlay key | `services/team-command-status-overlay-store.ts` internal normalizer | Team execution services | Root/native and mixed sub-team overlays share source-path lifecycle | Yes | Yes | Ambiguous global team id key |
| Native member identity resolution | `backends/autobyteus/autobyteus-team-member-status-projector.ts` | Native AutoByteus backend | Backend and processor currently duplicate it | Yes | Yes | Loose DTO with multiple authoritative ids |
| Pending overlay lifecycle state | `TeamCommandStatusOverlayStore` | Team execution services | Multiple managers/handles duplicate it | Yes | Yes | Global status source of truth |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamCommandStatusMemberIdentity` | Yes | Yes | Low | Require full member identity; store keys internally by canonical route key/source path |
| `TeamCommandStatusTeamTarget` / source path | Yes | Yes | Low | Root is `[]`; represented sub-team is explicit member path |
| `AutoByteusMemberStatusIdentity` | Yes, if canonical id roles are named | Yes | Medium | Distinguish configured `memberRunId` from optional `nativeAgentId`; do not expose both as competing `agent_id` values |
| `AgentStatusPayload` | Existing stable shape | N/A | Low | Reuse builder and ensure canonical member run id is the outward `agent_id` |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/team-command-status-overlay-store.ts` | Team execution services | `TeamCommandStatusOverlayStore` | Pending command-start overlay lifecycle for members and team/source paths | One lifecycle owner for store/publish/apply/clear/failure replacement | Event builders, `AgentStatusPayload`, `TeamRunEvent` |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-events.ts` | Team execution services | Event builder | Existing event/payload construction | Keep separate because it owns wire/event shape, not lifecycle state | `AgentStatusPayload`, `TeamRunEvent` |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-member-status-projector.ts` | Native AutoByteus backend | Native projector | Native identity canonicalization, native member snapshots, observed status cache | Native-specific identity/projection is cohesive | Low-level `projectAutoByteusAgentStatus` |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts` | Codex backend | Command owner | Instantiate/use overlay store; preserve target/runtime/send sequencing | Removes local overlay map | Store |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts` | Claude backend | Command owner | Instantiate/use overlay store; preserve target/runtime/send sequencing | Removes local overlay map | Store |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Native backend | Command/event owner | Use projector and store; preserve native command/event sequencing | Removes projection/overlay blobs | Store + projector |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-event-processor.ts` | Native backend | Event translator | Use projector for identity; keep native event conversion | Removes duplicate identity helpers | Projector |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Mixed backend | Leaf command owner | Use member overlay store; preserve agent run creation/send | Removes local `commandStatusOverride` | Store |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | Mixed backend | Sub-team command owner | Use team/source-path overlay store; preserve child run creation/send | Removes local `commandStatusOverride` | Store |

## Ownership Boundaries

Command owners remain authoritative for command sequencing. The overlay store is not allowed to resolve targets, create runtime runs, send messages, or decide whether a command should be issued. It only records and publishes the status overlay after the command owner has decided a command starts.

The native projector is authoritative for native member identity/status projection. Native backend and event processor must call it instead of each reimplementing native id/name/run-id matching.

Aggregate status derivation remains in `deriveTeamApiStatus`. The overlay store prepares member/team status inputs; it does not own aggregate rules.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamCommandStatusOverlayStore` | pending member overlays, pending team/source-path overlays, clear/apply/failure replacement | Codex/Claude managers, native backend, mixed handles | Caller owns a parallel map/override and also calls store | Add explicit store method for needed lifecycle action |
| `AutoByteusTeamMemberStatusProjector` | native id/name/run-id/context resolution, native member snapshot projection, observed status cache | Native backend and event processor | Backend/processor reimplement native member matching | Add identity-specific projector method |
| `deriveTeamApiStatus` | aggregate status rules | Managers/backends deriving team status | Store or projector hardcodes aggregate precedence | Extend aggregate owner only if aggregate semantics change |

## Dependency Rules

Allowed:

- Command owners may depend on `TeamCommandStatusOverlayStore`, event builders indirectly through the store, existing selector resolution, runtime managers, and aggregate derivation.
- Native backend and processor may depend on `AutoByteusTeamMemberStatusProjector`.
- `TeamCommandStatusOverlayStore` may depend on event builders and domain payload/event types.
- `AutoByteusTeamMemberStatusProjector` may depend on `projectAutoByteusAgentStatus`, native backend contracts/context types, and payload/event types needed for observed status cache.

Forbidden:

- Overlay store must not depend on Codex/Claude/native/mixed concrete command owners.
- Overlay store must not create/restore runtimes, route commands, or own native identity projection.
- Native event processor must not duplicate projector identity matching after projector extraction.
- Command owners must not keep raw pending overlay maps/local overrides beside the store.
- No frontend optimistic fallback, global status manager, or compatibility wrapper around old overlay helpers.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamCommandStatusOverlayStore.publishMemberCommandStatus` | Member command overlay | Gate, store, publish member command-start status | Full member identity: `memberName`, `memberRunId`, `memberRouteKey`, `memberPath`; current effective status callback/value | Returns whether it published |
| `TeamCommandStatusOverlayStore.publishTeamCommandStatus` | Team/source-path command overlay | Gate, store, publish team/root/source-path command-start status | Explicit `sourcePath`; current effective team/source status | Root is `[]` |
| `TeamCommandStatusOverlayStore.getMemberStatusSnapshot` | Member overlay snapshot | Return overlay or fallback snapshot with canonical member identity | Full member identity + fallback | Used by Codex/Claude/mixed leaf |
| `TeamCommandStatusOverlayStore.applyMemberStatusOverlays` | Member overlay collection | Overlay/append pending member payloads to snapshot arrays | Snapshot array keyed by member route key or agent id derived from full identity | Used by native backend/projector integration |
| `TeamCommandStatusOverlayStore.recordReplacementEvents` | Overlay replacement clearing | Clear member/team overlays for matching status events | `TeamRunEvent[]` with member identity or team source path | Called before aggregate derivation |
| `TeamCommandStatusOverlayStore.clear` | Overlay lifecycle | Dispose all pending overlays | None | Used on terminate/dispose |
| `AutoByteusTeamMemberStatusProjector.projectMemberStatusSnapshot` | Native member status | Build canonical member `AgentStatusPayload` | Member run id/name/context or canonical identity | Outward `agent_id` is configured member run id |
| `AutoByteusTeamMemberStatusProjector.projectMemberStatusSnapshots` | Native member statuses | Build all current member snapshots | Runtime context + native team state | Applies observed native status cache, not pending command overlays |
| `AutoByteusTeamMemberStatusProjector.resolveAgentEventMember` | Native event identity | Resolve native agent event to canonical member identity | Native agent id, native member name, extracted/configured run id | Used by event processor |
| `AutoByteusTeamMemberStatusProjector.recordStatusEvents` | Native observed statuses | Cache latest native member status payloads for same-batch/future snapshot derivation | Processed member `AGENT_STATUS` events | Separate from pending command overlay store |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Store member publish | Yes | Yes | Low | Do not accept generic selector; command owner resolves first |
| Store team publish | Yes | Yes | Low | Key by source path, not implicit root-only boolean |
| Store replacement events | Yes | Yes | Medium | Implementation must document matching rules for member and source path |
| Native projector event identity | Yes | Yes | Medium | Explicitly name native id vs configured member run id |
| Native projector snapshot projection | Yes | Yes | Medium | Ensure no duplicate native/configured snapshot entries |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Pending overlay lifecycle owner | `TeamCommandStatusOverlayStore` | Yes | Low | Use “Store” because it owns state lifecycle, not a generic helper |
| Native identity/status projection owner | `AutoByteusTeamMemberStatusProjector` | Yes | Medium | Keep “TeamMember” to distinguish from lower-level native agent projector |
| Existing event builders | `team-member-command-start-status-events.ts` | Yes | Low | Keep unless implementation chooses a clearer matching filename |
| Existing managers/backends | `CodexTeamManager`, `ClaudeTeamManager`, `AutoByteusTeamRunBackend` | Yes | Low | Keep as command owners |

## Applied Patterns (If Any)

- Store: used locally for pending command-start overlay lifecycle. It is not global and not persistent.
- Projector: used for native identity/status projection and observed event status cache.
- Adapter/event translator: existing native event processor remains a native-to-team event adapter.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/team-command-status-overlay-store.ts` | File | Overlay store | Pending command-start overlay lifecycle for team execution | Generic across team backends/handles | Target resolution, runtime creation, native-specific identity |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-events.ts` | File | Event builder | Existing event/payload builders | Shared service already owns this construction | Pending lifecycle state |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-overlays.ts` | File | Obsolete | Remove or replace by new store file | Old helper is superseded | Compatibility forwarding |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-member-status-projector.ts` | File | Native projector | Native identity/status projection | Native-specific backend concern | Command send sequencing or generic overlay lifecycle |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | File | Native command/event owner | Delegate projection/overlay lifecycle; keep command/event orchestration | Existing backend authority | Raw overlay maps, duplicated identity matching |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-event-processor.ts` | File | Native event translator | Use projector for identity and keep event conversion | Existing native event processing owner | Independent native identity policy |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts` | File | Codex command owner | Use store and preserve sequencing | Existing concrete manager | Raw overlay map |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts` | File | Claude command owner | Use store and preserve sequencing | Existing concrete manager | Raw overlay map |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | File | Mixed leaf command owner | Use member overlay store | Existing handle owner | Local command override field |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | File | Mixed sub-team command owner | Use team/source-path overlay store | Existing handle owner | Local command override field |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-command-start-status.test.ts` | File | Unit tests | Managed/mixed command-start behavior and store coverage | Existing behavior tests | Weakened expectations |
| `autobyteus-server-ts/tests/unit/agent-team-execution/autobyteus-team-run-backend.test.ts` | File | Unit tests | Native backend/projector behavior | Existing native behavior tests | Test-only reliance on old private fields |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-team-execution/services` | Off-Spine Concern | Yes | Low | Shared team-execution service is appropriate for generic overlay store/event builders |
| `backends/autobyteus` | Persistence-Provider / adapter-specific backend | Yes | Low | Native identity/projector depends on native backend contracts and should stay here |
| `backends/mixed/members` | Main-Line Domain-Control | Yes | Low | Handles stay command owners but no longer own overlay lifecycle internals |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Member command start | `member = resolveTarget(...); overlayStore.publishMemberCommandStatus({ member, currentStatus: () => memberRun?.getStatusSnapshot().status ?? "offline", status: "initializing" }); await ensure/send` | `overlayStore.resolveTargetAndStartRuntime(...)` | Store must not take command sequencing authority |
| Team/source-path overlay | `overlayStore.publishTeamCommandStatus({ sourcePath: [], currentStatus: () => getStatusSnapshot().status, status: "initializing" })` and mixed sub-team uses `sourcePath: context.memberPath` | Root-only `pendingRootStatus` plus separate mixed `commandStatusOverride` | One source-path model covers root and represented sub-teams |
| Native identity | `projector.resolveAgentEventMember({ nativeAgentId, memberName, extractedRunId })` | Backend and processor each search by name/native id/run id independently | Prevents divergent identity canonicalization |
| Compatibility | Remove old helper exports after call sites migrate | Old helper calls new store while callers keep old maps | Dual paths would hide whether lifecycle is truly centralized |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `team-member-command-start-status-overlays.ts` helper exports as wrappers | Could reduce call-site churn | Rejected | Migrate call sites to store and remove wrappers |
| Keep Codex/Claude local maps and let store read them | Could minimize manager edits | Rejected | Store owns pending member overlay state |
| Keep native backend pending fields while adding projector | Could reduce native refactor risk | Rejected | Store owns pending overlays; projector owns observed native status cache |
| Keep mixed `commandStatusOverride` fields | Could defer mixed path | Rejected | Include mixed paths so lifecycle is truly centralized |
| Add frontend optimistic fallback | Could mask backend timing issues | Rejected | Backend remains status source of truth |
| Add command-start leases/tokens | Could guard hypothetical stale duplicates | Rejected for this scope | Defer until a verified stale/duplicate defect exists |

## Derived Layering (If Useful)

Layering is secondary here. The useful shape is ownership-led:

- Command owners remain main-line control nodes.
- Overlay store and event builders are off-spine team-execution services.
- Native projector is an AutoByteus backend-specific off-spine concern serving native backend/processor.
- Aggregate derivation stays in the domain layer.

## Migration / Refactor Sequence

1. Add focused unit tests for `TeamCommandStatusOverlayStore` behavior: member gate/store/apply/clear/failure, team/source-path gate/store/clear, and clear-all.
2. Implement `TeamCommandStatusOverlayStore` by moving/replacing the existing helper functionality and reusing `team-member-command-start-status-events.ts`.
3. Migrate Codex and Claude managers from `commandStatusByMemberRouteKey` and helper functions to per-manager store instances; clear overlays through `recordReplacementEvents` or explicit member-event clear API when member status events arrive.
4. Migrate `MixedAgentMemberHandle` and `MixedSubTeamMemberHandle` from local `commandStatusOverride` to per-handle store instances; mixed sub-team must use team/source-path overlay keyed by `context.memberPath`.
5. Add `AutoByteusTeamMemberStatusProjector` with tests for runtime context, native agent id, configured member run id, member name, route key/path, no-duplicate snapshots, and observed status cache.
6. Update `AutoByteusTeamRunEventProcessor` to use the projector for member identity resolution and native id backfill.
7. Update `AutoByteusTeamRunBackend` to use the projector for member snapshots/observed status cache and the store for pending member/root overlays; remove local pending/cache fields and helper methods.
8. Remove obsolete helper exports/file or leave only the new store file with a clear filename; update imports.
9. Run TypeScript typecheck/build and focused unit tests. If dependencies are missing, run the repository’s documented prepare/install step or record the exact blocker in the validation artifact.
10. Verify no old overlay maps/local overrides remain with `rg "commandStatusByMemberRouteKey|pendingRootCommandStartStatus|pendingCommandStartStatusByRunId|lastMemberStatusByRunId|commandStatusOverride|getCommandStatusSnapshot|publishTeamMemberCommandStatus"`.

## Key Tradeoffs

- Include mixed paths now vs. defer: include now because mixed handles duplicate the exact lifecycle and the store needs source-path support anyway.
- One store for member and team/source-path overlays vs. two stores: one store is acceptable because lifecycle is the same and identity is explicit; split only if implementation starts accumulating unrelated optional fields.
- Native observed status cache in store vs. projector: keep it in the projector so the overlay store does not become runtime status authority.
- Rename helper file vs. modify in place: prefer a clear `team-command-status-overlay-store.ts` name. If implementation keeps the old filename, it must not keep old helper API wrappers.

## Risks

- The store could become a global status manager if it starts owning routing, runtime state, or aggregate rules. Guard with dependency rules and tests.
- Native identity extraction could preserve overlapping ID fields without clarifying authority. Guard by naming configured member run id as outward `agent_id` and optional native agent id as a lookup/backfill field only.
- Source-path matching could accidentally clear root overlays from sub-team events or vice versa. Guard with explicit source-path key tests.
- Local validation is currently blocked by missing `vitest`; implementation/validation must prepare dependencies or record the blocker.

## Guidance For Implementation

- Keep API calls identity-specific; do not pass generic `TeamMemberSelector` into the overlay store.
- Store methods should return whether they published/changed state so command owners can keep current no-op behavior for running members.
- The store should copy arrays (`memberPath`, `sourcePath`) when storing/publishing to avoid mutation leaks.
- Match member replacement by canonical member route key when available; support agent id/member run id as secondary matching only if needed for current event shapes.
- Match team replacement by normalized source-path key; root is the empty path.
- Preserve existing event payloads and status strings.
- Add tests before removing old fields where practical, then remove old fields in the same change.

## Design Rework Addendum — Native AutoByteus Live-Idle Status Flow (2026-05-18)

### Rework Classification

- Trigger: User verification found native AutoByteus professor/student members dropping from `Running` to `Offline` after response completion while the agents remain live.
- Classification: `Design Impact`.
- Root design gap: The original design did not include a dedicated spine for native status event payload precedence and live-idle steady state after a turn completes.
- Refactor posture: Keep the current store/projector boundaries, but strengthen the native status event conversion/projector contract.

### Added Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-006 | Primary End-to-End | Native member `TURN_STARTED` / active lifecycle event | Frontend member shows `running` | `AutoByteusTeamRunEventProcessor` + `AutoByteusStreamEventConverter` + projector | Running projection must not depend on stale native snapshot status |
| DS-007 | Primary End-to-End | Native member `AGENT_STATUS` with explicit payload status | Frontend member shows the explicit live status, usually `idle` after completion | `AutoByteusStreamEventConverter` with `AutoByteusTeamMemberStatusProjector` | Explicit native status events are authoritative status edges |
| DS-008 | Return-Event / Steady-State | Native member turn completion while backend remains active | Snapshot and live UI keep member `idle`, not `offline` | `AutoByteusTeamMemberStatusProjector` | Separates live-but-idle from absent/offline |
| DS-009 | Bounded Local | Projector direct single-member snapshot provider | Canonical status payload for converter and backend snapshots | `AutoByteusTeamMemberStatusProjector` | The converter uses single-member snapshots, so observed status fallback must work there too |

### Added Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-006 | Native active lifecycle event enters the team event stream. Converter marks the turn active and the default lifecycle pipeline derives/keeps a `running` member status even if the native snapshot lags at `idle`. | Native stream event, converter, event pipeline, team event, frontend member context | Event processor/converter | Lifecycle status processor, projector identity enrichment |
| DS-007 | Native status event carries canonical `status`. Converter must use that event payload as primary status, then canonicalize identity via the projector. Snapshot lookup may enrich can-interrupt but cannot turn the explicit status into `offline`. | Native status event, converter, projector, team event | Converter for event status; projector for identity/status payload shaping | Status normalization, active-turn stale-idle correction |
| DS-008 | After turn completion, the native member is still live but idle. Projector records/retains observed live status and backend snapshots use that observed status if the mutable native member list is temporarily missing/stale. | Native event return, projector observed cache, backend snapshot, frontend status | Projector | Explicit termination/offline cleanup remains separate |
| DS-009 | The converter's single-member status provider must be as safe as collection projection. It cannot bypass observed status fallback and emit `offline` just because `team.context.agents` lookup misses. | Converter status provider, projector single snapshot | Projector | Observed status cache, native snapshot fallback |

### Revised Native Status Ownership Rules

- `AutoByteusStreamEventConverter` owns event-type conversion and active-turn correction, but must not derive `AGENT_STATUS` primarily from mutable snapshots when the native event itself carries status.
- `AutoByteusTeamMemberStatusProjector` owns canonical identity and status payload shaping for native team members.
- For `AGENT_STATUS`:
  1. Read explicit event payload `status` first.
  2. Normalize/project that status into the canonical API status.
  3. Apply active-turn correction only to prevent stale idle/offline/initializing while the converter knows a turn is active.
  4. Attach canonical configured member run id, member name, route key, and path through the projector.
  5. Use mutable native snapshots only as fallback when the event has no status and as can-interrupt/context enrichment.
- A missing native member in `team.context.agents` is not enough evidence to emit `offline` for a known observed member while the backend remains active.
- `offline` remains valid when the backend/team is inactive, after explicit termination/offline events, or for members that have never been observed and have no live native snapshot.

### Revised Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity / Status Shape | Notes |
| --- | --- | --- | --- | --- |
| `AutoByteusTeamMemberStatusProjector.projectAgentStatusEventPayload` (new or equivalent) | Native status event projection | Build canonical `AgentStatusPayload` from explicit native status event payload plus identity | Canonical member identity + raw event payload + optional active-turn flag | Name may vary; boundary must exist explicitly |
| `AutoByteusTeamMemberStatusProjector.projectMemberStatusSnapshot` | Native snapshot projection | Return current member status for backend/converter fallback | Member run id/name/context | Must apply observed fallback for known live members before returning `offline` |
| `AutoByteusStreamEventConverter.convert(AGENT_STATUS)` | Native status event conversion | Use explicit event status payload before snapshot fallback | Native `StreamEvent.data` payload | Do not ignore explicit `status` |
| `AutoByteusTeamMemberStatusProjector.recordStatusEvents` | Observed status cache | Record canonical live/terminal status events for future snapshots | Processed `TeamRunEvent[]` | Must not be poisoned by false offline from stale snapshot |

### Revised Removal / Decommission Plan

No removed boundary should be restored. Specifically:

- Do not bring back `lastMemberStatusByRunId` in `AutoByteusTeamRunBackend`.
- Do not put steady-state status fallback into `TeamCommandStatusOverlayStore`; it is not a pending command overlay concern.
- Do not add frontend optimistic repair for this regression.

The correction belongs in the native converter/projector path.

### Required Implementation Shape

The implementation must follow this shape:

1. `autobyteus-ts` emits `StreamEventType.AGENT_STATUS` with canonical payload field `status`.
2. `AutoByteusStreamEventConverter` converts only that canonical status event to `AgentRunEventType.AGENT_STATUS`.
3. The converter/projector path reads explicit `status` from the event payload before consulting snapshots.
4. Snapshot lookup may enrich identity/can-interrupt or provide fallback only when no explicit status exists; it must not turn an explicit live status into `offline`.
5. `projectMemberStatusSnapshot` must not bypass observed live status fallback when called as the converter's status provider.
6. `AGENT_STATUS_UPDATED`, `new_status`, `old_status`, and dual-read compatibility branches are removed from the target status path.

### Concrete Good / Bad Shape

| Topic | Good Example | Bad / Avoided Shape | Why It Matters |
| --- | --- | --- | --- |
| Native idle after completion | `AGENT_STATUS { status: "idle" } -> converter reads "idle" -> projector adds memberRunId/route/path -> frontend shows Idle` | `AGENT_STATUS -> converter ignores data -> projector cannot find native member -> emits Offline` | This is the reported bug |
| Missing native snapshot for known member | `observedStatusByMemberRunId[student-run] = idle; projectMemberStatusSnapshot(student-run) returns idle when nativeMember missing and backend active` | Missing nativeMember always returns offline | Live native members can be absent from the mutable snapshot during/after turns |
| Status source ownership | Native status event payload first; snapshot fallback second; inactive/terminal cleanup explicit | Mutable snapshot is always authoritative | Snapshot-first projection is fragile for the native runtime |

### Revised Validation Guidance

Add tests before finalization:

- `AutoByteusStreamEventConverter` or `AutoByteusTeamRunEventProcessor` test for `AGENT_STATUS { status: "idle" }` with no current native member snapshot: processed member status is `idle`.
- Native projector test where observed status is `running` or `idle`, native member disappears from `team.context.agents`, backend remains active: single snapshot and collection snapshot remain live (`running`/`idle`) instead of `offline`.
- Native backend integration-style test for a classroom sequence with `Professor` and `Student`: each member can run then settle idle independently; neither drops offline after `ASSISTANT_COMPLETE`/`TURN_COMPLETED`/status update.
- Termination/inactive test confirming real offline cleanup still works.

## Design Rework Addendum — Single Canonical Status Event (2026-05-18)

### Design Decision
Adopt one canonical agent status event concept: `AGENT_STATUS`. Remove `AGENT_STATUS_UPDATED` from the AutoByteus runtime-to-product status spine. This is a clean-cut replacement with no legacy alias, no compatibility wrapper, and no dual status event path.

### Rationale
The product does not need two event names for the same business fact. `AGENT_STATUS` already means "the agent's current status is X". The `UPDATED` suffix adds no distinct product behavior and makes the codebase less robust by forcing adapter special cases and parallel payload semantics (`new_status`/`old_status` versus `status`). The current native AutoByteus regression is an example of that ambiguity: the converter treats `AGENT_STATUS_UPDATED` specially and replaces its explicit event payload with a mutable snapshot-derived payload.

### Revised Status Event Spine
`AutoByteus AgentStatusManager -> autobyteus-ts StreamEventType.AGENT_STATUS { status } -> AutoByteusStreamEventConverter -> AgentRunEventType.AGENT_STATUS { status } -> ServerMessageType.AGENT_STATUS -> frontend runtime status state`

### Target Ownership Changes
- `autobyteus-ts` owns native runtime status emission and should emit `StreamEventType.AGENT_STATUS` with `status` as the current native status token. Optional previous-status information should be named as metadata, for example `previous_status`, and should not be authoritative for display.
- `AutoByteusStreamEventConverter` owns translation from native streamed status events to server-domain `AgentRunEventType.AGENT_STATUS`; it must consume the explicit status event payload first.
- `autobyteus-status-projector.ts` owns fine-grained AutoByteus-status-to-app-status projection. It must map native processing states to `running`, startup states to `initializing`, idle to `idle`, shutdown-complete to `offline`, and error to `error`.
- Snapshot projection remains a fallback/enrichment path, not the primary source for explicit status event conversion.

### Change Inventory Delta
- Rename/remove `EventType.AGENT_STATUS_UPDATED` in `autobyteus-ts/src/events/event-types.ts` in favor of `EventType.AGENT_STATUS`.
- Rename/remove `StreamEventType.AGENT_STATUS_UPDATED` in `autobyteus-ts/src/agent/streaming/events/stream-events.ts` in favor of `StreamEventType.AGENT_STATUS`.
- Replace `AgentStatusUpdateData`/`createAgentStatusUpdateData` with a current-status payload shape, for example `AgentStatusData`/`createAgentStatusData`, using `status` as the canonical field.
- Update AutoByteus CLI consumers and tests to consume `StreamEventType.AGENT_STATUS` and `status`.
- Update `AutoByteusStreamEventConverter` and team event processing tests to map `StreamEventType.AGENT_STATUS` to `AgentRunEventType.AGENT_STATUS` directly.
- Remove canonical-path references to `AGENT_STATUS_UPDATED`; do not retain an inbound compatibility alias, wrapper, or dual-read path for the in-repository product path.

### Migration Boundary
This ticket treats `autobyteus-ts` as part of the in-repository product workspace. The migration is therefore a clean-cut replacement: update the workspace consumers together, remove the old event name, and do not preserve dual status concepts.

### Supersession Note — No Legacy Status Event Path

This addendum supersedes earlier implementation-shape wording that referred to `AGENT_STATUS_UPDATED` as an accepted target event. `AGENT_STATUS_UPDATED` is current-state evidence only. The target architecture has one status event name, `AGENT_STATUS`, and one authoritative current-status payload field, `status`. No compatibility alias, wrapper, or dual path is permitted.

## Design Rework Addendum — Internal Fine-Grained Status Boundary (2026-05-18)

### Non-Negotiable Clarification
The single event-name decision removes `AGENT_STATUS_UPDATED`; it does **not** remove AutoByteus's fine-grained internal status model.

The target has one canonical event name, `AGENT_STATUS`, but two explicit boundary-owned status vocabularies:

| Boundary | Owner | Event Name | Payload Field | Status Vocabulary | Purpose |
| --- | --- | --- | --- | --- | --- |
| AutoByteus runtime/internal stream | `autobyteus-ts` status manager / event stream | `AGENT_STATUS` | `status` | Fine-grained `AgentStatus` (`processing_user_input`, `awaiting_llm_response`, `executing_tool`, etc.) | Runtime lifecycle, internal consumers, CLI/internal diagnostics |
| Server domain / websocket / frontend | `autobyteus-server-ts` projector + streaming boundary | `AGENT_STATUS` | `status` | Coarse `AgentApiStatus` (`offline`, `initializing`, `idle`, `running`, `error`) | Product UI readiness/liveness display |

This means event-name unification is not enum unification. The boundary type names and projector ownership must make that impossible to misread.

### Status Projection Data-Flow Spine

`AutoByteus StatusManager updates fine-grained AgentStatus -> autobyteus-ts EventNotifier emits AGENT_STATUS { status: AgentStatus } -> AgentEventStream carries fine-grained status -> AutoByteusStreamEventConverter receives explicit status -> autobyteus-status-projector maps AgentStatus to AgentApiStatus -> AgentRunEventType.AGENT_STATUS { status: AgentApiStatus } -> ServerMessageType.AGENT_STATUS -> frontend displays coarse status`

### Projection Ownership Rules

- `autobyteus-ts` owns fine-grained status truth and must not flatten it for the sake of frontend display.
- `AutoByteusStreamEventConverter` owns event-type conversion and must pass explicit fine-grained status into the projector before snapshot fallback.
- `autobyteus-status-projector.ts` owns the fine-grained-to-public status mapping.
- `AgentRunEventType.AGENT_STATUS` / `ServerMessageType.AGENT_STATUS` own only public/product status payloads.
- The frontend must not import or reason over AutoByteus fine-grained `AgentStatus` for normal liveness display.

### Required Mapping

| Internal AutoByteus Status Group | Public/Product Status |
| --- | --- |
| `uninitialized`, `bootstrapping` | `initializing` |
| `idle` | `idle` |
| `processing_user_input`, `awaiting_llm_response`, `analyzing_llm_response`, `awaiting_tool_approval`, `tool_denied`, `executing_tool`, `processing_tool_result`, `interrupting` | `running` |
| `shutting_down`, `shutdown_complete` | `offline` |
| `error` | `error` |

### Ambiguity Rejection

Do not implement the cleanup by replacing the internal fine-grained `AgentStatus` enum with public statuses. That would lose useful runtime semantics and would put frontend concerns below the runtime boundary. The correct cleanup is narrower and cleaner:

1. Rename/remove the event concept `AGENT_STATUS_UPDATED` in favor of `AGENT_STATUS`.
2. Replace `new_status`/`old_status` as canonical event fields with `status` plus optional non-authoritative metadata if needed.
3. Preserve fine-grained internal `AgentStatus` at the AutoByteus runtime boundary.
4. Project to public `AgentApiStatus` only at the server adapter/projector boundary.
