# Design Review Report — delegated-copies-slow-open

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/requirements-doc.md` (SR-002, Approved)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed: `probes/open-cost-probe.test.ts`, `probes/probe-run1.txt` (`probes/shape.py` listed in the inventory; not material to the design)
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003, SR-004
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: revised `Architecture Design Complete` from `/software_engineering_team/solution_designer` (SR-004, answering ARCH-REV-001)
- Prior Review Round Reviewed: round 1 (ARCH-REV-001, Fail: AR-001, AR-002)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `codex/delegated-copies-slow-open` @ `5ceb43039a`. Files read: web `agentRunCollaborationHydration.ts`, `agentRunCollaborationContext.ts`, `agentRunCollaborationStreamingService.ts`, `stores/agentRunCollaborationStore.ts`, `runHydration/memberRunStateHydration.ts`, `runHydration/teamMemberProjectionHydrationService.ts`, `runSubmission/localUserSubmission.ts`, `eventMonitor/recentEventMonitorMutationCoordinator.ts`, `composables/agentCollaboration/useAgentRunCollaborationSync.ts`, `components/workspace/history/AgentRunTaskRows.vue`, `composables/projects/useTaskRootNavigation.ts`. Server `run-file-change-projection-service.ts`, `standalone-root-member-view-projection-service.ts`, `standalone-root-location-service.ts`, `collaboration-execution-location-service.ts`, `run-file-change-service.ts`, GraphQL `agent-run-collaboration.ts`, `run-file-changes.ts`. Also `DESIGN.md`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: about 9 production files in two existing subsystems, within their current owners (Medium). Child state loading moves from "complete before publish" to on-demand, which changes how loading interleaves with live events, submissions and republication. A public GraphQL query is added (High).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none. The code confirms that the child-hydration lifecycle is the material risk surface; AR-001 is in that surface.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: the copy rows come from the hub's view alone. One copy's details load on open, through a hub-scoped server read. Republication does not reload other copies. Status, Task summaries, closed-Task hiding and live updates stay as they are.
- Relevant existing behavior and evidence confirmed:
  - `stageAgentRunCollaborationContext` runs `Promise.all` over every indexed child, calling `fetchMemberRunState` (projection + `getRunFileChanges`) for each.
  - The store and the streaming service both publish only after that.
  - `checkpoint_required` reconnects and re-stages everything.
  - `listTaskRows` reads only the index and `currentStatus`.
  - `readProjectionContext` falls through to the unscoped `CollaborationExecutionLocationService.findAgent({agentRunId})` for hub children.
  - `requireLocation` in the member view service is hub-scoped.
- Scope guardrail confirmed: UC-001..UC-004 in scope. Out of scope: storage, team/org roots (FU-1), the hub message log (FU-2) and generic run-id file-change reads / the content route (FU-3). Preserved: BEH-001..BEH-005 preserved columns, REQ-005/006, AC-005/006. Review authority as stated.
- Approved change, preserved behavior, and outside scope understood: `Yes`
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (round 1: AR-001 → REQ-003, AC-004, AC-006, AC-007; round 2: no open findings)
- Remaining material ambiguity: none at the requirements level.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (`AgentRunTaskRows.loadStored` → `inspect` → staging fan-out) | Pass (DS-001: view → build → publish, no per-child I/O) | Confirmed | — |
| BEH-002 | User | Pass | Pass (`useAgentRunCollaborationSync` → `syncHost` → inspect/attach) | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass (`AgentRunTaskRows.select` / `useTaskRootNavigation` → `selectChild`) | Pass (SR-004: load bound to (published context, child); superseded loads end without commit; post-publication load for the new context) | Confirmed | — |
| BEH-004 | System | Pass | Pass (`applyEvent` → `checkpoint_required` → reconnect → snapshot) | Pass (SR-004 D-4/D-5: a fresh load against the new context, never joined to the old one) | Confirmed | — |
| BEH-005 | User | Pass | Pass (statuses and input states applied in the context constructor from the view; Task summaries batched) | Pass | Confirmed | — |

Round 2: the BEH-003/BEH-004 target-path coherence issue from round 1 (AR-001) is resolved in SR-004.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/open-cost-probe.test.ts` | Pass | Pass | Pass | Pass | Pass (evidence) | — |
| `probes/probe-run1.txt` | Pass | Pass | Pass | Pass | Pass (evidence) | — (R-A resolved in SR-004: `[host]` line added with its source run, the third run on the same `/tmp` copy) |
| `probes/shape.py` | Pass | Pass (investigation inventory) | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Performance bug fix; design issue found | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Boundary Or Ownership Issue`: structure publication owns child detail loading it does not use (`listTaskRows`), and the artifact read uses a bare run id while the client holds the compound identity. Matches code and probe | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Bounded refactor now; FU-1/FU-2/FU-3 deferred with residual risk | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | D-1..D-5, removal plan, file mapping | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Rows from view | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Child on demand | Pass | Pass | N/A | Pass | Pass (SR-004: the store is the single dedupe owner; the load holds no dedupe state) | Pass | Pass |
| DS-003 | Server scoped artifacts | Pass | Pass | Pass (resolver is a thin facade) | Pass | Pass | Pass | Pass |
| DS-004 | Republication | Pass | Pass | N/A | Pass | Pass (SR-004: the old load ends `superseded`; a fresh load starts for (new context, selected child)) | Pass | Pass |
| DS-005 | Hydration attempt | Pass | Pass (SR-004: steps 0–6; `isPublished` checked after the fetch and immediately before the synchronous commit; retry only on conflicts within the same context) | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agentRunCollaborationStore` | Pass | Pass | Pass | Pass | Components call `selectChild` only; the hydration service is not exported to UI |
| `StandaloneRootMemberViewProjectionService` | Pass | Pass | Pass | Pass | Resolver → service only; the unscoped location service is forbidden there |
| `RunFileChangeProjectionService` | Pass | Pass | Pass | Pass | The located-member branch is extracted once and reused by `readProjectionContext` |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Web store / child hydration / context | Pass | Pass | Pass | Pass | child hydration ↛ store; context ↛ GraphQL; streaming ↛ child hydration |
| Server member view → run-history file-change service | Pass | Pass | Pass | Pass | `run-file-change-projection-service.ts` already imports `standalone-root-location-service.ts`, and the member view service already imports run-history. No file-level cycle is introduced. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| GraphQL `agentRunCollaborationMemberFileChanges(hostRunId, memberAddress, agentRunId)` | Pass | Pass | Pass | Low | Pass |
| `StandaloneRootMemberViewProjectionService.getFileChanges` | Pass | Pass | Pass | Low | Pass |
| `RunFileChangeProjectionService.getLocatedCollaborationMemberProjection(location)` | Pass | Pass | Pass | Low | Pass |
| `buildAgentRunCollaborationContext({hostRunId, view})` | Pass | Pass | Pass | Low | Pass |
| `hydrateAgentRunCollaborationChild({ hostRunId, collaboration, agentRunId, isPublished, liveToolAuthority })` | Pass | Pass | Pass ((published context, child); outcomes `hydrated` / `superseded` / error) | Low | Pass |
| `fetchMemberRunState({fetchProjection, fetchFileChanges})` | Pass | Pass | Pass | Low | Pass. Explicit fetchers; hidden default rejected |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| On-demand member hydration policy | Pass | Pass | Pass | Pass | Team precedent is bound to `AgentTeamContext`. The shared core is deferred to FU-1 with a named residual (duplicated policy, two copies) |
| Member state fetch/commit | Pass | Pass | N/A | Pass | `memberRunStateHydration.ts` extended |
| Located member artifacts | Pass | Pass | N/A | Pass | Single implementation |
| Hub-scoped member read | Pass | Pass | N/A | Pass | `requireLocation` reused |
| Live tool reconciliation | Pass | Pass | N/A | Pass | `reconcileTeamMemberToolState` reused. Its team-specific name now misleads; optional rename, non-blocking |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentCollaboration` | Pass | Pass | Pass | Pass | — |
| `autobyteus-web/stores` | Pass | Pass | Pass | Pass | — |
| `autobyteus-web/services/runHydration` | Pass | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/standalone-agent-run-root/services` | Pass | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/run-history/services` | Pass | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/api/graphql/types` | Pass | Pass | Pass | Pass | `RunFileChangeEntryObject` is not exported today; implementation must export it for reuse |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| On-demand member hydration (team + Agent root) | Pass | N/A (deferred) | N/A | Pass | Deferral is explicit (FU-1) and proportionate. Changing team code is outside scope |
| Located member artifacts | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RunFileChangeEntryObject` (reused) | Pass | Pass | Pass | N/A | Pass | — |
| `fetchMemberRunState` input | Pass | Pass | Pass | N/A | Pass | `runId` replaced by an explicit fetcher |
| Hydrated set on `AgentRunCollaborationContext` | Pass | Pass | Pass | N/A | Pass | Per context. Not carried across adoption, by design (D-4) |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agentRunCollaborationHydration.ts` | Pass | Pass | Pass | Pass | Structure only |
| `agentRunCollaborationChildHydration.ts` (new) | Pass | Pass | N/A | Pass | No dedupe state (SR-004) |
| `agentRunCollaborationContext.ts` | Pass | Pass | N/A | Pass | — |
| `agentRunCollaborationStore.ts` | Pass | Pass | N/A | Pass | Single dedupe owner (`WeakMap<context, Map<child, Promise>>`) |
| `agentRunCollaborationStreamingService.ts` | Pass | Pass | N/A | Pass | — |
| `memberRunStateHydration.ts` + team/org callers | Pass | Pass | N/A | Pass | Mechanical |
| Server resolver / member view / file-change projection | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationChildHydration.ts` | Pass | Pass | Low | Pass | Next to staging/streaming |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Per-child staging loop, `stageAgentRunCollaborationContext` name, `activityRevisions`/`commit` | Pass | Pass | Pass | Pass | Confirmed in code (store L106–107, L55–63; streaming L182–187) |
| `commit` param of the store `publish` and the streaming `publish` option | Pass | Pass | Pass | Pass | — |
| Eager re-staging on `checkpoint_required` | Pass | Pass | Pass | Pass | Reconnect stays |
| `runId` input of `fetchMemberRunState` | Pass | Pass | Pass | Pass | — |
| Dead code in touched files | Pass | N/A | Pass | Pass | No additional dead code found in the touched files beyond the named items |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Eager staging | No (flag rejected) | Pass | Pass | — |
| `getRunFileChanges` optional `hostRunId` | No (rejected) | Pass | Pass | Generic query stays for other run kinds (FU-3); not a dual path for hub children once the client switches |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| All stored data | Not Affected | Pass | Pass | N/A | Pass | Reads only, through existing readers; no DTO change |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server first, then web query/codegen, then hydration, then staging replacement, then tests/docs | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Publication | Yes | Pass | Pass | Pass | — |
| Server read | Yes | Pass | Pass | Pass | — |
| Store `ensureChildHydrated` | Yes | Pass (SR-004 example plus the republication-during-load trace) | Pass ("trusting a load across a republication" rejected, D-4) | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A selected child's hydration is still in flight when the hub's collaboration context is republished

- Related approved requirement or established contract: REQ-003, AC-004 (the opened copy's full stored conversation, activities and artifact list show); AC-006; AC-007; R-001 (named by the design itself).
- Relevant behavior ID(s): BEH-003, BEH-004.
- Initiating basis kind: `User` (primary witness); `System` (second witness).
- Independent product-supported initiating trigger:
  - (a) In the Workspaces sidebar, the user clicks a copy row under a hub run that is not the currently selected run (SCN-003; the ordinary way to open a copy).
  - (b) Separately: on a running hub that the user is viewing, the user opens a copy and the hub delegates a new copy (`task_execution_started`) or the user saves copy settings (SCN-004).
- Support evidence: the copy rows in `AgentRunTaskRows.vue` are the exposed surface, and clicking a row is the supported action. `select(row)` calls `collaboration.selectChild(...)`, then `emit('select-run')`. For (b), the running hub's stream events are a supported system event.
- Forward path, witness (a):
  1. `AgentRunTaskRows.select` → `selectChild` → (D-5) `ensureChildHydrated` → `hydrateAgentRunCollaborationChild` on published context C1. The in-flight load is keyed by `AgentContext` A (D-2).
  2. `emit('select-run')` → the host run becomes the selected agent → `useAgentRunCollaborationSync`'s watch key (`runId:running:bindingRevision`) changes → `syncHost`. A stopped hub goes `detach` + `inspect`; no inspection is pending, because the sidebar's finished earlier, so a new view request is issued. A running hub goes to `attach` → connect → snapshot.
  3. `buildAgentRunCollaborationContext` → `publish(C2)`. `prepareLocalContextAdoption` retains the old `AgentContext` object A for child X (`this.contexts.set(agentRunId, old)`, store L219–223 of the context) and replaces `A.state`.
  4. (D-4/D-5) `ensureChildHydrated(selected)` on C2. C2 has not marked X hydrated, but the in-flight dedupe on A returns the C1 load.
  5. The C1 load reaches its commit check. `isCurrent` (`contextFor(host) === C1`) is false. Per D-2 it retries against the same captured C1 and `isCurrent`, which can never pass, so it fails. The team precedent's equivalent (`exactMountedContext`) throws.
  6. Witness (b) runs the same steps 3–5 from `checkpoint_required` → reconnect → snapshot.
- Lifecycle preconditions and material consequence: the click's hydration has not finished when the new view or snapshot is published. Both requests start from the same click. Which finishes first depends on the hub view (≈0.45 s server and 5 MB on the measured hub) versus one child's projection (54 ms average, larger for long histories) and server load. No artificial timing is needed. On a live hub the snapshot can arrive quickly. Consequence: X is never marked hydrated in C2. The selected copy shows an empty conversation (never-opened copy) or a stale one (carried), plus only live events. There is no error UI by design, and no further load until the user selects the row again. This contradicts AC-004 ("full stored conversation … show") and AC-006.
- Reachability: `Reachable` (witness a: normal user click; witness b: supported live system events).
- Review consequence / proportionate response: AR-001 (Design Impact), round 1. Resolved in SR-004 without new machinery: the design now defines supersession, the dedupe key and the post-publication load (D-2/D-4/D-5, DS-005, test (b)).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. Round 1 findings are resolved; see `ARCH-REV-002` in the revision record:

- AR-001 (High; Design Impact): resolved in SR-004.
  - D-2: a load is bound to (published context C, child X), and `isPublished()` is checked after every fetch and immediately before the synchronous commit.
  - When C is no longer published, the load ends `superseded`, with no retry and no commit. Retry applies only to conflicts within C.
  - D-5: the store is the single dedupe owner, keyed `WeakMap<context, Map<child, Promise>>`.
  - D-4: after every publication, a fresh load starts for the selected child against the new context.
  - DS-005 steps 0–6 and test (b) cover republication during a load (inspection and snapshot variants), one extra projection and one extra file-change request, and no duplicate request for the same (context, child).
  - Checked against code: `prepareLocalContextAdoption` hands the same `AgentContext` to C2. The superseded load L1 cannot write into it, because its check-then-commit runs synchronously in one step and `contextFor(host) !== C1` after `setContext(C2)`.
- AR-002 (Low): resolved. The pending-submission guard is removed. D-2 relies on the presentation revision, which `commitRecentEventMonitorEffect(…, 'STRUCTURAL')` bumps when a local message is shown.

## Classification

N/A — Pass (round 1: `Design Impact`, now resolved)

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (informational pass notice to `/software_engineering_team/solution_designer`)

## Residual Risks

- R-A: resolved (SR-004).
- R-B (observation, intended): the generic path (`RunFileChangeProjectionService` with a roots-less `StandaloneRootLocationService`) always reports a hub child as stored. The new scoped path uses the member view service's location service, which has active roots. For a live hub, children's artifacts will come from `getProjectionForCollaborationMember` (live), not `file_changes.json`. This matches team members and is covered by test (c). It is in the docs scope (SR-004).
- R-C: on the ordinary "click a copy row of a non-selected hub" path, the first open can load the child twice: once from the click, once after the republication the click causes (D-4 does not carry the hydrated mark). AC-004 allows this (a new inspection occurred). Accepted as R-004 in SR-004 (D-4).
- R-D: hydration policy is duplicated between `teamMemberProjectionHydrationService.ts` and the new Agent-root file until FU-1. The deferral is accepted.
- R-E: the requirements' "existing loading behavior of the center view" in practice means an empty or old conversation until loaded, as for team members (Key Tradeoffs). No spinner exists for this state. This is consistent with the Non-Goals; the implementation should not invent one.
- U-001 / ASM-001 (wall time in the app) and R-002 (hub message payload) remain validation items, as recorded upstream.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 Reachable; the in-scope supersession and dedupe rules address it; no machinery depends on an unsupported premise)
- Notes:
  - SR-004 resolves AR-001 and AR-002 with no new machinery beyond defining how the existing mechanisms interact.
  - Classification is `Medium`/`High`, and the requirements are unchanged (SR-002).
  - Implementation notes:
    - Export `RunFileChangeEntryObject` from `run-file-changes.ts` so the new query can reuse it.
    - Keep `isPublished` checked synchronously right before commit.
    - Re-check consumers of unhydrated children (R-003) with the planned search.
