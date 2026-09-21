# Design Spec

## Document Status

- Package: `AORG-FLAT-TEAM-001`
- Approved requirements revision: `RER-033`
- Normative supplement: `AORG-CONTRACT-001`
- Normative Product UI revisions: `RV-012` / `VIS-001`-`VIS-020`; focused
  mounted-Team status supplement `AORG-FLAT-TEAM-STATUS-001` /
  `VIS-STATUS-001`-`VIS-STATUS-003`; focused mounted-Team launch-override
  supplement `AORG-TEAM-OVERRIDES-001` / `VIS-OVR-001`-`VIS-OVR-006`, which
  supersedes only RV-012 Placement Overrides lines 89-95 and `VIS-015`
- Architecture result: `Architecture Design Complete`
- Architecture revision: `AD-REV-028`
- Architecture review: Pending for AD-REV-028 after ARCH-REV-024 Fail / AR-FIND-009 on AD-REV-027. ARCH-REV-023 Pass remains scoped to AD-REV-026. Valid DS-047 history/root-inspection decisions are retained; final staged member reads are now included. API-REV-037 remains Fail.
- Date: 2026-09-12
- Workspace: `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model`
- Branch / approved revision commit: `requirements/flat-agent-organization-model` / `f84c5299f10898f49acff6a0e481d1cd61c769a9`

## Current-State Read

**Current impact round (AD-REV-028):** ARCH-REV-024 / AR-FIND-009 identifies
one omitted dependency inside DS-037 final retained inspection: after the old
root query completes, a delayed exact member projection can be shared with the
new post-Stop stage. The new Symbol and activity-revision check do not establish
physical response freshness. Complete DS-047 at the existing shared hydration
reader and add deterministic child-read overlap coverage; retain all accepted
history/root-inspection, status ownership and IR058 publication decisions.
No Requirement/Product change. Entry review/HEAD
eeffdd437246f8c4f538752041764b67702872a0; source remains
bbdea002ee59da87cc7174bfc2924888c0bb38f7. Focused Medium/High, cumulative
Large/High; independent revised-impact review required. This is stale retained
presentation, not durable loss, reactivation or a fifth observed API37 failure.

**Prior impact round (AD-REV-027), reviewed ARCH-REV-024 Fail:** the user-directed comparison of original
personal/origin-personal Team and nested-Team status ownership is complete at the
source/design boundary. CRR-089 / CR-FIND046 / API-FIND039 confirms an old physical
history response being accepted by a newer logical refresh through installed
Apollo deduplication. IR058 immediate inactive publication is working in the four
API37 cases; it must be retained. DS-037 is strengthened by DS-047 physical-read
freshness, including the analogous inspection publisher. Existing Org owners,
exact Agent status and branch aggregates remain. No Requirement/Product change.
Source bbdea002ee59da87cc7174bfc2924888c0bb38f7; incoming artifact/HEAD
d76731eaa3260a123f1ce8c6ace0e14994fddcde; original read-only pin
5645b49d6f51faa60bd3545bc8e3f0e7e3f96793. Focused Medium/High, cumulative
Large/High; Architecture Design Complete, independent review required. This is
not implementation readiness or a repaired API37 result.

**Prior impact round (AD-REV-026), passed ARCH-REV-023:** CRR-081 / CR-FIND042 confirms API33
loses accepted non-media attachment associations during recording, before cold
projection. DS-044–046 completes the native/external input → same user trace →
conversation/page → Open lifetime under unchanged RER-033. Current source
3d9a019d320878c421429f27c0f074f9a4c4c2f5; artifact
f8a3f37af0969748f05f0605e5fae1a1cc77f10f. Focused Medium/High, cumulative
Large/High; subsequently passed ARCH-REV-023. Known historical missing associations
are not fabricated. IR049 actual-installation cutover is not a blanket coding hold.

**Prior impact round (AD-REV-025), passed ARCH-REV-022:** IR048-DI-001 exposes address-only Org
attachment ownership after supported same-address task retention. DS-041–043
carry exact AgentRun identity through draft/final/read and preserve saved links
at the existing initial family cutover. Original CRR-072 upload omission remains
correctly classified separately. Approved RER-033 unchanged; no Product gap.
IR-048 source checkpoint 6d77b3c8b / result 5636a1f3a is not a completed implementation.
Focused Medium/High; cumulative Large/High; independent re-review required.

**Prior impact round (AD-REV-024), passed ARCH-REV-021:** approved RER-033 changes authored Org
refScope to `org_local`. DS-038–040 govern strict normal authoring/resolution,
separate internal ownership/API mapping and the existing unreleased migration's
final output. The user explicitly clarified first-run production rollout: edit
existing migration code directly, do not add another migration for intermediate
branch formats. Test database completion is not production deployment evidence.
AD-REV-023 / ARCH-REV-020 passed; IR-047 and downstream work retain their scope.
Focused Medium/High; cumulative Large/High; independent review is required.

**Prior impact round (AD-REV-023):** HIST-INSPECT-001/002 correct configured
history selection that restores runtime and termination that redirects to launch.
DS-035–037 below govern observational inspection, deliberate Send continuation
and same-conversation stopped presentation. Approved RER-032 and the user's
explicit instruction to repair the design remain the behavior basis; no upstream
artifact changes. IR-044's separate composer fix is preserved. Focused Medium/High;
cumulative Large/High. Independent review precedes this changed browser boundary.

**Prior impact round (AD-REV-022):** approved RER-032 changes only the
history collection heading to plural `Orgs` below unchanged `Teams`. The
inspected IR-040 source at `06d020da3` still uses singular Org in
`localization/messages/en/workspace.ts:58` and matching tests. Change that
localized value and affected expectations, not the key, collection component,
main navigation, right collaboration tab, group order, tree state or domain/API.
DS-034's remaining reviewed UI mechanism is unchanged. AD-REV-021 passed
ARCH-REV-019@be6b20f4a988eabbeb797a70af1b9cb0091c2f64; that review is not
reopened by this one-word correction. No new Product gate or whole-package hold.

**Prior impact round (AD-REV-021):** RER-031 resolves UI-CLEAN-001 with
three presentation-only corrections: the history heading follows DS-034; Messages
retains the compact earlier Team list without permanent address/Task-ID metadata;
and task detail loses its additional participant strip. DS-034 governs the
replacement and exact on-demand identity/navigation. Source read at IR-039
checkpoint `932c81b22`; requirements at `3b8c18a28`. AD-REV-020 passed
ARCH-REV-018@dc831aa5acec2796ec14bdd0f9f8b0847f857f66; its authoring transition
and every runtime/task/message contract are unchanged. No Product gate or
source implementation is part of this architecture-only round.

**Prior impact round (AD-REV-020):** approved RER-029 removes authored
schemaVersion from both Team/Org configs. DS-031–033 own the strict current
codec, diagnostic and definition-only transition response; PKG-AUTH-001 is
resolved at Requirements. AD-REV-019 / ARCH-REV-017 passed, followed by IR-038,
CRR-058/059 and API-REV-024. DR-008's checked native build is the pre-RER-029
candidate and is not acceptance evidence for this delta. Current source is
preserved by `14a94fc45`; the Requirements re-entry is `0f5014405`. See the
package-authoring investigation for precise source/owned-data probes. Earlier
source pins below are chronological evidence, not current missing-feature claims.
Only architecture-owned files change in this round; other owners' work remains.

Before this ticket, the product used one recursively composable
`AgentTeamDefinition` and one recursively shaped Team execution family.
`AgentTeamDefinition.nodes` accepted both Agent and AgentTeam refs;
`TeamDefinitionGraphResolver` recursively loaded them; `TeamHandoffCompiler`
recursively rebased handoffs; and `TeamDefinitionTopologyPlanner` could allocate
configured child TeamRuns at arbitrary depth. `RootTeamRun`,
`TeamExecutionIndex`, the mixed Team backend, GraphQL, the Team WebSocket
contract, and the web workspace all encoded the root as a Team. The earlier
`8e680617c` implementation baseline performed the approved split/extraction;
this cumulative paragraph remains the pre-change architecture evidence rather
than a claim that configured recursion is still current.

The durable TeamRun V2 topology is nevertheless the right native contract for a
standalone flat Team. It already persists the coordinator, direct Agents,
launch settings, handoffs, application binding, timestamps, task executions,
and package identity under
`$MEMORY_ROOT/agent_teams/<rootTeamRunId>/team_run_execution_tree.json`. An
Agent-only root already satisfies the approved target without a version, key,
file, path, or byte-shape rewrite. The model defect is configured ownership:
an organization-like root is forced to be a Team with a coordinator while a
Team may contain a Team.

The target therefore uses two truthful root subjects and two strict durable
families:

- a standalone `AgentTeam` keeps native `TeamRunExecutionTreeFileV2`, a required
  direct-Agent coordinator, and Agent-only configured membership;
- an `AgentOrg` gains `AgentOrgRunExecutionTreeFileV1` under the separate
  `agent_orgs` package family, has no coordinator, and contains direct Agents
  and direct flat Teams;
- common configured Agent/Team, handoff, launch, binding/timestamp, and task
  records are reused as tight shared record modules without creating a generic
  persisted root union; and
- mixed history, stream, GraphQL, and workspace projections carry the explicit
  logical discriminator `root_subject_kind: "agent_team" | "agent_org"` and
  select the corresponding strict family before decoding.

The supplied workspace is an isolated git worktree at `RER-026@16b560f82`,
with downstream-owned dirty/untracked API/test/review evidence left untouched.
The current reviewed implementation result is
`IR-028` source `4d378df9cba56bd1b9ebf20d9b055f964398f642`, artifact
`100e2c82cb948e1cbef4026ab6f74ab815285a34`, passed by cumulative source review
`CRR-036`, real-system `API-REV-010`, and proportional test-code review
`CRR-037`. Delivery `DR-004` is the latest downstream evidence round. The
earlier `DR-003` Electron user-verification gate exposed the launch/shell/default
defects subsequently corrected through IR-028. Historical Code Review
`CRR-021` returned
`CR-FIND-020`, which AD-REV-012 and IR-018 resolved. Its separate
`CR-FIND-019` local fix was also implemented in IR-018 and remains a distinct
regression obligation rather than part of this new architecture correction. Approved
`RER-019@f3035a2d5` changed only Product baseline activation/provenance;
RER-020/021 now add the mounted-Team status behavior and approved focused Product
evidence without changing RER-018's durable/runtime/schema authority. The chronological architecture record begins with `AD-REV-001` at
`36bc02deca363798b6eda878e5eb4850e624da6f`; `AD-REV-002` is the architecture
impact revision that integrates approved Product `RV-012`, the RER-013
configuration/focus behavior, and the later user-approved Team-V2/Org-V1 durable
correction. `ARCH-REV-001@899c60a70` failed on the definition-file transition
and effective handoff ordering. Approved RER-018 originally resolved the former with numeric Team V2 / Org V1
definition admission (authored numeric fields now superseded by RER-029) and
a read-only external-project boundary. `AD-REV-003` resolves that approved
impact plus the remaining root-first ordering correction. The user then pointed
to the canonical production data-migration convention. Inspection found that
AD-REV-003's bespoke journal/staging/backup recovery plan contradicted its
proportionate-recovery rules and the current runner. `AD-REV-004` replaces only
those architecture-owned mechanics with one registered, forward-only,
capability-scoped migration using ordinary startup retry; the approved target
behavior and file families do not change. `ARCH-REV-002@614f705ff` then passed
the cumulative design and routed it to Implementation. Initial implementation
`IR-001` stopped with `IDI-001`: the supposedly lower-level Agent/Team runtime
path is statically owned by `RootTeamRun`, `TeamRunContext`, Team identities,
Team physical paths, and Team-only task/message/event callbacks, so it cannot
materialize an Org without a forbidden synthetic Team root. `AD-REV-005`
resolves that architecture-owned impact with a root-neutral internal configured-
Agent/flat-Team execution plane beneath two still-distinct public root
aggregates, explicit Org sidecars and memory placement, subject adapters for
tasks/messages/events/persistence, and defined construction/restore/shutdown
order. The separate `architecture-design-self-validation.md` walks the revised
design through supported use cases and dependency/boundary checks. Architecture
Review `ARCH-REV-003@ae61ecd38` passed AD-REV-005. Implementation then completed
`IR-002/IR-003` at `8e680617c`, and Code Review `CRR-003` passed. A real
API/E2E browser run subsequently exposed `ADI-007`: the production Org workspace
bypasses the accepted Agent/Team presentation stack, stores raw root events, and
renders them through `JSON.stringify` plus a bespoke composer and member-header
`Stop Org` action. AD-REV-006 corrects that production-surface boundary by
making AgentOrg transport emit a strict Agent presentation stream, hydrating the
same `AgentContext` read model, and routing exact Org focus through reusable
Agent/Team workspace surfaces and the existing active-context command boundary.
The implementation and API/E2E worktree changes remain downstream-owned evidence
and are not modified or claimed by this design round. Architecture Review
`ARCH-REV-004@2ae61a11f` passed AD-REV-006. Later API/E2E evidence
`API-FIND-007` and the user's original Team-tree screenshot exposed a separate
Product baseline omission: a mounted Team row had lost the established aggregate
status signal. Code Review `CRR-009` correctly classified that as upstream
`CR-FIND-011`, not a defect against the then-approved RV-012 package. Requirements
`RER-020` approved `BEH-011` / `REQ-028` / `AC-023` / `SCN-012`; Product then
completed the explicitly user-approved focused `AORG-FLAT-TEAM-STATUS-001`
supplement, and `RER-021@ed236a63e` returned the closed package to Architecture.
AD-REV-007 maps that behavior to the existing production five-state Team-branch
status policy and strict AgentOrg context without changing any server, durable,
transport, lifecycle, focus, routing, or migration contract.

Implementation subsequently completed through `IR-012@73a2c06eb` and Code
Review `CRR-013` passed the cumulative source while holding API/E2E on
`API-FIND-008`. The first isolated same-task revision/resubmission probe and
direct graceful shutdown passed. The later exact two-task correlation proved a
technical queue/termination coupling, but its long wait was created by an
unsupported verifier self-review call deliberately left awaiting approval.
`ARCH-REV-006@2ad4bcc06` therefore blocked `AD-REV-008` as Unclear under
`AR-FIND-003`: that invalid action cannot establish a supported production
premise for a new settlement coordinator, token lifecycle, or shared shutdown
machinery.

`AD-REV-009` reconciles the design with independently supported production
paths. A normal task submission returns its tool result before the assignee's
canonical provider turn terminates, so a different delegator Agent can validly
accept the task during that interval. Settlement must inspect quiescence
without waiting at the root FIFO head and retry on the established idle event.
Separately, application-owned SIGTERM may reach an active task Agent waiting on
a legitimate approval-gated tool; each Team/Org root must freeze and interrupt
its owned Agent scope before draining task work so shutdown itself can release
that wait. The blocked AD-REV-008 coordinator, passive/committed token split,
independent cleanup jobs, and new dependency graph are withdrawn. Existing
task records, `settledAt`, prepared settlement transaction, one root mutation
FIFO, deepest-first sweep, fail-stop policy, and tool/API behavior remain.

Architecture Review `ARCH-REV-007@6cec1ee1b` accepted that supported basis and
the narrow settlement direction, resolving `AR-FIND-003`, but failed the
complete-scope shutdown target on `AR-FIND-004`. A normally delegated task can
durably activate and asynchronously release its first message; `AgentRun` can
admit/claim or begin provider dispatch before canonical `TURN_STARTED` exists.
The AD-REV-009 active-turn-only phase then accepts `NO_ACTIVE_TURN` as success,
allowing provider work to begin after the root believes interruption is done.

`AD-REV-010` closes that exact supported race at the existing `AgentRun`
input/lifecycle owner. Each frozen Team/Org scope invokes one idempotent,
irreversible per-Agent root-shutdown fence. The fence closes input admission,
cancels admitted-but-not-provider-started input through the existing
`cancelled / AGENT_RUN_TERMINATED_BEFORE_INPUT_FORWARD` lifecycle, and joins any
provider start that already won serialization. If that start has not yet
published `TURN_STARTED`, shutdown intent remains armed; canonical turn start
immediately reserves the existing interrupt, and the phase does not complete
until the input/turn is terminal. Claim-to-provider-start registration is made
atomic under the AgentRun dispatch queue, so a provider start is either tracked
before the fence or rejected after it—never untracked across it. Ordinary
non-root `prepareTermination()` keeps its established FIFO-drain semantics;
the new cancellation rule applies only to irreversible root shutdown. No new
persisted state, public API, provider timeout, replay, force-kill, settlement
coordinator, token/job graph, or Product policy is introduced.

Architecture Review `ARCH-REV-008@a6f712265` independently verified that
AD-REV-010 resolves `AR-FIND-004` and found no defect in the core design. It
identified one stale affirmative statement in the Architecture-owned
self-validation: VAL-006 still described AD-REV-008's withdrawn independent
cleanup jobs and concurrent cleanup outside the root FIFO. `AD-REV-011` makes
only that coherence correction. Recursive task-Team terminal settlement now
states the same authoritative path as DS-022 and VAL-026/029: deepest-first leaf
eligibility through the existing root FIFO; immediate `null` deferral and FIFO
release for a non-quiescent leaf; existing prepared settlement/finish for a
quiescent leaf; parent eligibility only after settled children. No source, API,
schema, Product, migration, or AD-REV-009/010 core-design change is introduced.

Architecture Review `ARCH-REV-009@f9b7fff0d` passed cumulative AD-REV-011 and
Implementation later integrated through `IR-017@b2c96d6b0`. During the requested
fresh comparison, Code Review `CRR-021` established `CR-FIND-020`: production
`AgentOrgRunConfigPanel -> AgentOrgPlacementOverrideRow` substantially follows
the formerly approved `VIS-015`, but that denser always-exposed Team-child
hierarchy is now superseded by direct user authority. Requirements Engineering
recorded the behavior in RER-022 and returned the explicitly user-approved
focused Product package as `RER-023@c4f39b02e`. `AD-REV-012` maps that approved
presentation correction to the already production-tested Team launch
components. It does not create a generic Team/Org configuration owner: the
AgentOrg draft, effective precedence, payload split, launch service, and
coordinator-free domain remain Org-owned, while `TeamScopeConfigEditor`,
`TeamMemberConfigTree`, `MemberOverrideItem`, and the compact outer disclosure
are reused strictly as presentation/edit-command boundaries. The focused change
is frontend-only: the existing AgentOrg GraphQL placement patch already carries
the required runtime/model/tool/workspace fields, and server resolution remains
authoritative. The separate `CR-FIND-019` local fix is not redesigned here.

After `ARCH-REV-010` passed AD-REV-012, implementation/review/validation advanced
through IR-026, CRR-032, API-REV-008 and the DR-003 Electron user-verification
gate. The user then found three connected production-path failures in the
AgentOrg launch experience: an exact Agent runtime/model override previews as
cleared locally but reaches the server without the required explicit
`llmConfig:null`; entering the Org configuration route replaces the established
Workspace/history left panel with an Org-only panel; and a new Org root does not
select the same default temporary workspace as the established Team root, so an
expanded inherited Team can truthfully project an empty workspace and Run stays
blocked. Source inspection confirms all three are design/implementation boundary
defects now explicitly clarified by approved RER-024, not missing Product intent.
`AD-REV-013` corrects them through one canonical Org launch-patch mapper, one
route-stable mixed Workspace/history projection, and the established root
workspace-default policy. `ARCH-REV-011` passed DS-024 and DS-026 but found one
Architecture-owned DS-025 wording contradiction: two passages assigned
expansion/selection/scroll continuity to the read model while the ownership map
and validation correctly assigned it to the always-mounted panel. `AD-REV-014`
makes that narrow ownership correction: the mixed read model owns only history
loading, strict subject projection, workspace grouping, category order, and
family-scoped errors; the one panel-scoped `useWorkspaceHistoryTreeState`
instance owns tree expansion/reveal/highlight continuity, and the mounted panel
owns its scroll surface. It adds no mechanism, requirement, Product, GraphQL,
server, durable, migration, lifecycle, focus, or Team/Org ownership change.


Approved `RER-025@58925d043` adds one focused parity correction over the
reviewed AD-REV-014 baseline. AgentOrg history rows already carry and render a
`summary`, but the Org WebSocket command path never records accepted external
user content. Consequently active and historical Org rows remain on the
existing `New - <AgentOrg name>` fallback even when configured Agents have
conversation traces. AD-REV-015 closes that missing derived-metadata spine: the
first accepted non-empty external user message to an exact configured direct or
mounted-Team Agent is normalized through the established Team helper, serialized
once by the AgentOrg history catalog through a shared summary writer, and exposed by an authoritative quiet
history refresh after the accepted acknowledgement. It adds a registered,
forward-only migration that may backfill an existing empty row only from one
uniquely earliest configured-member trace. It does not change the existing row
component, AgentOrg V1 tree, task/message/trace sidecars, focus, routing,
command admission, or lifecycle ownership.

Architecture Review `ARCH-REV-014@567663894` passed cumulative AD-REV-016,
and the downstream implementation/delivery path subsequently made the
first-message history summary observable. Post-pass user verification then
exposed `API-FIND-019`: an AgentOrg communication record and recipient input
are durably accepted, but the Org-private commit adapter publishes only the
root communication event. Unlike the established Team append plan, it omits
the receiver `member_input` presentation event. In the web client the strict
Org snapshot already contains the authoritative communication sidecar, but
`ActiveAgentWorkspaceTarget` exposes collaboration presentation only through
`TeamWorkspaceContextView`; direct Org Agents therefore have no right-side
Messages surface. The mounted-Team projector compounds the gap by resolving
counterparts only from the selected Team, hiding valid direct/cross-Team Org
messages. Approved `RER-026@16b560f82` makes the observable parity explicit.
AD-REV-017 corrects the event-publication defect and moves Messages projection
to one root-scoped collaboration presentation view composed by both Team and
Org focused targets. It adds no message store, wire schema, route, Team root,
or custom Org dashboard.

Architecture Review `ARCH-REV-015@920240026` independently accepted that
one-authority/read-facet structure but found `AR-FIND-008`: AD-REV-017 gated the
new receiver-center event by the receiver's configured kind alone. The
preserved exact-run-ID route also supports task Agents, including the ordinary
task-to-configured return path, so receiver-only qualification would expose
task-scoped traffic as a new configured-member event. AD-REV-018 corrects the
predicate at the AgentOrgRun owner: only a committed configured-to-configured
endpoint pair gets the new receiver event and configured Messages perspective;
every pair containing a known task execution keeps its existing delivery and
sidecar behavior without either new configured-member consequence. That was
the approved RER-026 boundary, not earlier Team task parity. RER-028 now
expressly supersedes it; AD-REV-019 removes that gate and restores supported
all-participant presentation, exact Tasks relevance and retained task inspection.

## AD-REV-028 — Complete Final Inspection's Member-Read Freshness

### Current-State Read, Evidence And Supported Behavior

ARCH-REV-024@eeffdd437246f8c4f538752041764b67702872a0 returned the sole new
finding AR-FIND-009 (Medium) / Design Impact on AD027. Approved RER033 and the
assigned isolated branch/worktree are unchanged. Four upstream artifacts still
match f84c5299f10898f49acff6a0e481d1cd61c769a9. No behavior-defining supplement,
Product decision or approval is missing. The original pinned Team comparison
remains valid; it is not repeated or discarded by this bounded revision.

| Authority / scenario | Current path and evidence | Required preserved outcome / spine |
| --- | --- | --- |
| BEH-004/006, REQ-016/031, AC-011/026; HIST-INSPECT-001/002; AR-PREM-013 | User reopens an already-running offscreen Org, then Stops it to inspect final output while first member hydration is pending. Root query completed, exact member response sampled earlier is delayed, and ordinary Agent output is durably recorded before Stop completes. `readInspection → stageAgentOrgExecutionContext → fetchProjection` is the exposed selection path; root Stop remains available during loading. | Final stopped content must not inherit the earlier physical member sample. Preserve same root/exact Agent, draft, selection, navigation, inactive controls and latest committed content on error. DS-035/037/047-I/M. |
| Existing source ownership / response provenance | `agentOrgContextHydration.ts:112–129,138–209` uses network-only same query and {orgRunId, memberAddress, agentRunId}. `isCurrent` is checked after children settle; activity revision is captured after response resolution. `agentOrgExecutionContext.ts:130–146` adopts conversation-bearing state. | Subject identity and local activity conflict guards remain necessary but are not freshness proofs. Independently acquire each staged member projection under DS-047; never fix this by weakening identity/staging or overwriting failures. |
| Exact retained-content read contract | `runHistoryQueries.ts:241–258` and server `agent-org-member-run-view-projection-service.ts:49–67` select exact retained conversation/activities separately from root inspection. No observed response revision binds the physical sample to the root read. | Keep existing query, result shape and retained reader. No server snapshot protocol, schema change, content timestamp heuristic, merge or migration is required. |

The reviewer diagnostic used AST-extracted unchanged fetchProjection, the actual
query and installed Apollo3.14, with synthetic content, controlled Link and a
simplified newest-token publisher: one Link/old content versus two Links/final
content with the scoped option. This is read evidence, not a production stage/
Pinia/browser/server test or an additional API37 observation. Architecture read
the script/log and source; it did not execute a fresh diagnostic or live scenario.
Details and source/probe provenance are appended to the existing history
investigation, including the four disclosed library diagnostics.

### Design Health, Ownership And Bounded Resolution

- Change posture: bounded Bug Fix / design completeness correction.
- Issue: **Missing Invariant coverage**, not a new root lifecycle or status owner.
  AD027 scoped physical freshness to root activity queries while DS037 commits a
  composite final view that also depends on member conversation/activities.
- Refactor posture: no additional owner extraction or broad refactor is needed.
  Retain AD027's private history-operation consolidation and redundant inactive
  callback removal. Extend the existing semantically tight `fetchProjection`
  acquisition itself; do not add another reader, scheduler or source-kind fork.
- Root inspection owner remains `agentOrgContextsStore`; staging and exact member
  read ownership remain `agentOrgContextHydration`. The context object is adopted
  only after successful staging/current-generation/activity-conflict checks.
  Components continue to call the store, not the child reader or Apollo directly.

**DS-047 completion:** the independent physical-observation rule covers both
activity-bearing root reads AND every exact member projection fetched by
`stageAgentOrgExecutionContext` for candidate publication. In the existing shared
`fetchProjection`, use `fetchPolicy: 'network-only'` plus
`context: { queryDeduplication: false }` on `GetAgentOrgMemberRunProjection`, with
unchanged exact variables, current result validation and bound client. Apply this
uniformly to that existing staging reader's inspection and stream callers, so a
post-Stop stage cannot borrow a pre-Stop inspection OR stream-hydration sample.
No new option distinguishing caller kinds or conditional legacy path is needed.

A stage invalidated by Stop may finish its reads, but cannot publish. A new stage
must receive independently initiated member observations and still pass its own
existing checks; an independent request is not permission to bypass any guard.
If a member read errors, returns null/wrong identity, or staging/activity commit
conflicts, do not publish a partially hydrated candidate or partially replace
activities. Retain the latest committed conversation with truthful inactive/error
state through the current publication owner. No stale-response merge, extra retry,
second Stop or forced cold reopen substitutes for correct acquisition.

This ensures the post-Stop final read does not inherit a pre-Stop client operation.
It does NOT introduce atomic multi-query snapshot isolation during live execution,
a durable sequence watermark, or a promise of cross-replica consistency. Ordinary
live stream sequencing/readiness and local activity conflict handling remain.
If no prior context was published, the defect is omission of newer final content;
where a matching prior context exists, adoption may replace newer visible content.
Neither is evidence of durable data loss. A subsequent historical fast-path open
may legitimately reuse the now-correct committed context; do not disable that
optimization to conceal the stale acquisition.

### Spine, File Mapping, Removal And Implementation Sequence

| Spine / scope / owner | Main line and meaningful result | Off-spine concerns and restrictions |
| --- | --- | --- |
| DS-035/037 / Primary End-to-End / context operation and server lifecycle | Workspaces reopen → independent active root inspection → member staging pending → ordinary backend output → user Stop → accepted server termination → immediate inactive publication → independent inactive root inspection → independent final member reads → validated candidate/activities → retained final conversation. | Status aggregate never controls lifecycle; selected/draft state remains at its existing owners; no reactivation. |
| DS-047-M / Bounded Local within DS-047-I / hydration owner | Exact seed → bound Apollo independent member request → existing GraphQL/member projection service → exact retained reader response → local candidate projection → current generation + activity conflict checks → single publication boundary. | Exact-ID/error validation and projection conversion serve staging; no per-member incremental context publication, parallel cache or new request registry. |

| Path / action | Final responsibility | Removal / boundary |
| --- | --- | --- |
| `autobyteus-web/services/agentOrgExecution/agentOrgContextHydration.ts` — modify | Existing typed fetchProjection independently acquires the exact member observation for all current staging callers. Keep current candidate construction, identity, isCurrent and deferred activity commit. | Remove the implicit default-dedup reliance for this operation only; no duplicate fresh/stale reader or new folder. |
| `autobyteus-web/stores/__tests__/agentOrgInspectionApollo.spec.ts` — add focused composition coverage | Real installed Apollo/controlled Link and actual root/member documents, context store, staging and publication. Cover root-complete/child-pending overlap and final retained content, not just newest-token simulation. | No global dedup disable, AST-only publisher substitute or fabricated hosted acceptance. Reuse valid existing fixtures and Pinia setup. |
| Existing hydration/context/inspection tests and history publication tests — extend/retain | Projection failure/identity, staging cancellation, activity conflict, adoption/draft/selection and live/Team controls. Retain VAL076–078 regressions. | Do not edit API-owned pending tests as an ownership shortcut or remove negative assertions. |
| `agentOrgContextsStore.ts`, `runHistoryLoadActions.ts` — retain AD027 target changes | Independent root/history acquisition, logical guards, immediate history navigation and bounded callback cleanup. | No restart of valid DS047 work; no context/adoption/lifecycle rewrite for this finding. |

Current recovery now spans two history entry paths, one root-inspection query and
one member-projection query in **three existing production files**. The sole new
production delta from AD027 is the acquisition option in the existing hydration
reader; the new test belongs beside current store tests. Public interfaces,
queries, exact identities and dependency directions do not change.

Remove/qualify AD027's member-read exclusion and two-file-only mapping in this
canonical package; the AD027 revision entry remains unchanged as history. No
compatibility shim or per-source fallback is retained. First characterize the
child-only overlap with durable actual-client/staging coverage (old root read
already completed), then apply the scoped member acquisition, then verify failure/
identity/selection controls and the existing root-read tests. No runtime/backend
refactor, original-Team port or separate new migration is justified.

### Validation, State Transition, Risks And Routing

VAL-079 adds the explicit deterministic child-read overlap and final conversation/
activities oracle, including root inactive before release, old-before-new and
new-before-old completion, new child failure, exact identity, multi-child atomic
publication, no prior context and matched-context adoption, and subsequent
historical reuse. VAL-058/077/078 remain and now point to the composite-read case.
Repository tests must exercise the real production staging/publication boundary;
the reviewer's AST/newest-token diagnostic is mechanism evidence, not a replacement.

Persisted data: **Not Affected**. Retained output already exists under current
readers; this changes client acquisition, not recording, tree/config/catalog,
archive, schema, stored references or migration. Do not backfill or manufacture
content, replay providers or touch API37 roots. IR049 installation disposition
remains separately Architecture-owned before actual cutover, not a coding hold.

Residual risk/tradeoff: concurrent stages issue separate member requests rather
than sharing an obsolete observation; added request work is bounded by existing
stage/candidate members and callers. Existing generation checks still reject
out-of-order candidates; activity checks still protect local interleaving. This
is not a new performance scheduler or broad pagination/query-policy change.

Result: **Architecture Design Complete** for AR-FIND-009 recovery; independent
review remains pending. `task_size=Large` / `architectural_risk=High` cumulative,
focused `Medium/High` retained. Structural concurrency/retained-state publication,
not response/probe/doc volume, is the risk basis. No Requirement/Product gap.
Return through the revised-impact Architecture Review rule; do not forward directly
to implementation. Source review, FULL cumulative API/E2E, successful proportional
API test-code review and applicable Delivery gates remain. API37 Fail69.3 and all
AD027-listed missing evidence/native/installation limits remain unchanged.

## AD-REV-027 — Root Status Authority And Physical Read Freshness

### Readiness, Evidence And Recovery Classification

Approved RER-033 and all four upstream artifacts remain unchanged at
f84c5299f10898f49acff6a0e481d1cd61c769a9. The assigned isolated branch/worktree
and prior reviewed design remain authoritative. No new intended-behavior or
Product approval gate is needed. The trigger is CRR-089, not a new local-fix
assignment; the requested original-branch investigation precedes this decision.
The detailed, pinned comparison and bounded installed-client experiment are in
`architecture-history-inspection-investigation.md`, AD-REV-027 section. Incoming
cumulative evidence is indexed by `code-review-evidence/CRR-089/handoff-reference-files.txt`.

- **Confirmed failure:** after normal successful Stop, all four API37 direct/
  mounted × 1502/390 cases publish inactive correctly while old history is held;
  release of the unchanged old active body restores root Running/Stop despite
  backend inactivity and exact Agent/center Offline. A later failed fresh read
  preserves that stale activity. Only `lateReadCannotUndo` fails in these cases.
- **Confirmed cause:** the full/focused history readers share identical query
  and variables through the production bound Apollo client. Its installed 3.14.0
  default in-flight deduplication allows a new logical generation to subscribe
  to the pre-Stop physical request. The existing generation guard can reject the
  old caller correctly while accepting the same bytes for the new caller.
- **Review gap:** CRR088's separately resolved mocked promises did not exercise
  this client composition. CRR089's actual-client/actual-loader probe establishes
  it; it is not a blanket failure of generation guards or IR057/058 regression.
- **Recovery result:** incoming Unclear design scope resolves to **Design Impact**,
  a bounded missing read-freshness invariant. Failure origin remains the confirmed
  implementation composition defect with the specified review gap. No whole-Org
  redesign, new product semantics, migration or filesystem cause is established.

### Original Ownership Reuse / Adaptation Decision

| Concern | Original Team at pinned personal / origin-personal | Current Org and selected decision |
| --- | --- | --- |
| Root activity / Stop | `agentTeamRunStore.terminateTeamRun` requires successful mutation, sets root inactive, cleans exact Agent contexts, immediately calls `markTeamAsInactive` and publishes navigation before quiet refresh. Root activity is not the nested aggregate. | Retain `agentOrgRunStore` as command adapter and `agentOrgContextsStore.stopAndInspect/markHistorical` as browser transition owner. Retain `runHistoryStore.applyAgentOrgActivity` synchronous exact-row publication. Pending/failed Stop cannot fabricate inactive. |
| Exact Agent truth | Team view snapshot validates AgentRun ID plus member address before updating that exact AgentContext. Context-backed Team rows read these states; projection hydration does not manufacture runtime activity. | Reuse the same ownership pattern already implemented by Org context/index, strict staged snapshot, stream and exact AgentContext. Direct and mounted Agents use identical exact-ID authority; no status inferred from coordinator, name, selection or root dot. |
| Nested / mounted aggregate | Original depth-bounded descendant-Agent fold, including task Agents, uses running > initializing > error > idle > offline; containers, ancestors and sibling branches do not contribute. | Keep current `projectAgentOrgTeamBranchStatus` and shared fold. Fixed-depth configured Org Teams plus their legitimate task descendants are the scope, regardless of collapse. Presentation only; no mounted root, Stop or lifecycle registration. |
| Hydration / streams | Original open observes resume/tree/member projections, attaches only if active; Team stream owns snapshot/sequence barrier and lifecycle events. | Keep DS-035 observational inspection, DS-036 explicit continuation, exact staged hydration and current stream-generation barriers. Apply independent physical reads to inspection because it can publish root activity, not because history reads should activate anything. |
| History precedence | Original `buildTeamNodes` overlays loaded Team contexts over history rows, including root active and exact leaf states; however the original history reconciler itself can set those contexts active from a history response. Its network-only loader has no demonstrated physical-freshness barrier. | Do not clone context-over-history precedence as a purported race fix. Org history owns root navigation facts; exact execution context owns Agent and command readiness. Correct the freshness of root facts at the read boundary. A retained historical context must not permanently veto a genuinely newer active observation. |
| Navigation publication | Original command/lifecycle/context changes explicitly refresh navigation topology; merely mutating a source row is insufficient for a cached projection. | Preserve IR058 immediate topology publication and normal guarded refresh publication. No UI-only invalidation workaround, duplicate activity map or permanent stopped overlay. |

The original branch is a source comparison, not an executed defect-free baseline.
Its recursive configured-Team topology and root coordinator are explicitly NOT
adopted by coordinator-free fixed-depth Orgs. Product's illustrative historical
status mixtures are not new persisted runtime facts; existing truthful terminal
status policy remains, with no invented live state or blanket active greying.

### Relevant Behavior, Supported Scenarios And Production Paths

| Behavior / authority | Supported trigger and goal | Preserved outcome | Production path / spines |
| --- | --- | --- | --- |
| BEH-014, REQ-031, AC-026; HIST-INSPECT-002; DS-037 | User Stops an active Org in ordinary Workspaces while a normal history read is outstanding. Network completion may be delayed or fail. | Root becomes inactive only on confirmed authority; remains inactive after old response and later read failure; selection, conversation, expansion and draft remain. | Workspaces root action → context operation → command adapter → server root manager/termination → confirmed response or correlated inactive stream → context transition → history publication → same visible tree. DS-037; DS-047. |
| HIST-INSPECT-001; DS-035/037 | User opens an active exact Agent then Stops that same root while its observational inspection is still in flight. Root Stop is exposed independently of inspection completion. | Superseded inspection cannot re-publish its old active snapshot as a new post-Stop observation. Failed post-Stop inspection retains last committed content. | Exact selection → context inspection owner → bound client → strict root inspection/staged projections → generation-guarded context commit → history activity and selected center. DS-035 with DS-047 read invariant. |
| BEH-011, REQ-028, AC-023, ORG-CASE-056–058 | User expands/collapses a mounted Team and views individual Agent statuses during active or retained history. | Exact leaf status and branch-only aggregate coexist; aggregate remains visible collapsed and never grants root activity/Stop. | Execution view → exact context index → Agent rows/Team branch fold → approved status presentation. Existing status spine retained. |
| REQ-004/011; DS-035/036 | Normal active control, failed/pending Stop, later deliberate supported continuation, standalone Team history use. | Valid active roots keep Stop; newer actual active evidence is accepted without granting an unready command port. No restore-on-read, duplicate Send or independent mounted lifecycle. | Existing command/inspection/readiness paths unchanged apart from freshness of observational requests. |

The inspection overlap is a source-supported adjacent contract risk, not a fifth
observed API37 failure. Controlled timing in tests reproduces these independent
normal workflows; it does not authorize replaying old API roots, changing real
response bodies or inventing new concurrent product workflows.

### Design Health, Refactor Posture And Ownership

Change posture: Bug Fix / bounded contract clarification. Current design issue:
Yes — DS-037 named logical invalidation without specifying physical response
provenance across the client boundary. Governing owners and data shapes are
otherwise suitable for this scope. Refactor needed now: **Yes, bounded local
consolidation only** of the duplicated Org history query/strict parse operation;
remove the redundant onInactive-triggered refresh already owned by the activity
action. This is not an extraction of a new status subsystem or generic read manager.

- Context store owns operation sequencing, inspection generation and committed
  exact contexts. Stream service owns live connection/snapshot/sequence validity.
- History store owns the Org history slice, existing family generation and its
  synchronous navigation publication. Load actions own its physical read contract.
- Apollo is a transport dependency, not root activity authority; cache delivery
  policy and in-flight deduplication are separate mechanisms.
- Server `CollaborationRootHistoryService.list` samples `orgRuns.getActive` for
  `is_active`; it does not infer activity from descendants. Client requests begun
  after confirmed Stop must not reuse the earlier client operation's observation.
- Components, route actions and projection utilities remain thin consumers;
  they cannot repair freshness by hiding Stop or overriding the store.

### DS-047 — Independent Physical Observations Under Existing Generations

Current contract includes the AD-REV-028 / AR-FIND-009 member-read completion.

This strengthens DS-035/037; it introduces no new wire field, app flag, epoch,
request ledger or persistent activity cache.

**Invariant:** a generation eligible to publish an Org root activity observation
or staged exact member content must obtain each required response from a physical
request initiated for that read, not inherit an older in-flight request. Root
inspection alone is not sufficient: its staged member projections also qualify. Logical latest-generation checks still guard commit after
all relevant asynchronous work. Neither rule alone replaces the other.

1. Both Org-family reads in `runHistoryLoadActions.ts` call one private typed
   `readAgentOrgHistory(client)` operation. It issues the existing exact
   `ListCollaborationRootHistory` query with `fetchPolicy: 'network-only'` and
   **`context: { queryDeduplication: false }`**, checks GraphQL errors and returns
   the existing strictly parsed `AgentOrgRunHistoryItem[]`. Reuse the bound client;
   do not make a new Apollo instance or change auth/readiness/error handling.
2. Full and focused callers retain the existing shared `agentOrgRequestGeneration`:
   allocate before awaiting backend readiness; check latest immediately before
   assigning rows/errors. The full reader's workspace results stay independently
   governed and are not erased or discarded merely because the Org read is stale.
   Obsolete requests may finish; their success/failure cannot overwrite current
   Org rows/error. No cancellation layer is needed for correctness.
3. `applyAgentOrgActivity` retains its existing order: invalidate older family
   reads → patch only the exact root's activity fact → synchronously refresh
   navigation topology → request normal Org history refresh. Do not wait for a
   network response to expose confirmed inactive, and do not synthesize a summary,
   execution tree or new root row. Its callers provide validated lifecycle facts.
4. `agentOrgContextsStore.readInspection` uses the same per-operation
   `queryDeduplication: false` with its existing `network-only` query, exact root
   variables/schema, Symbol generation and staging/commit checks. Its existing
   `inspections` map may coalesce an ordinary duplicate open of the SAME current
   inspection; it must not be used to reuse an invalidated pre-Stop observation
   for the post-Stop read. Stop's new inspection must originate independently.
   Late old inspection/staging callbacks cannot attach a stream or publish activity.
5. `agentOrgContextHydration.fetchProjection` independently acquires each exact
   `GetAgentOrgMemberRunProjection` using network-only plus per-operation
   `queryDeduplication: false`, with existing exact root/address/AgentRun variables.
   This one reader serves both inspection and stream staging; keep identity/error
   validation, current-generation checks and deferred all-candidate publication.
   Activity expectedRevision, captured after response resolution, is a local
   conflict guard, NOT proof of a fresh physical sample. Retaining AgentContext
   identity through adoption likewise does not preserve newer conversation state
   when the candidate contains an old sample. See DS-047-M / VAL-079.
6. Remove the second `refreshAgentOrgHistory()` from the stream `onInactive`
   callback: `markHistorical → applyAgentOrgActivity` already performs that request.
   Keep the accepted-message refresh, which serves summary updates. Different
   validated publishers may still each refresh; do not add debounce/coalescing
   machinery to reduce traffic at the expense of freshness.
7. Read failure (including any staged member dependency) retains the last committed
   exact row/activity and conversation;
   report the existing appropriate error, without a second Stop or forced route
   change. A truly newer independent active observation may update root activity
   after supported activation; no permanent tombstone. Root active alone never
   supplies an Agent's ready stream, status or command capability.

The library operation option is a supported transport contract at installed
Apollo 3.14.0 (`QueryManager.getObservableFromLink`), not an arbitrary application
state flag. `network-only` alone, or changing to `no-cache` alone, does not disable
in-flight sharing. Keep network-only: current named query consumers publish only
through guarded promises; no new cache watcher/presentation read is introduced.
Do not change global Apollo defaults, query variables/names, HTTP headers, schemas,
server consistency protocol, or unrelated Team/Agent reads. A future additional
consumer of these root-authority or staged-member queries must preserve this contract.

### Spine Inventory, Narrative And Off-Spine Concerns

| Spine | Scope / owner | Main line and meaningful result | Off-spine concerns |
| --- | --- | --- | --- |
| DS-037 | Primary End-to-End / context operation, then root lifecycle owner | Workspaces Stop → context operation latch → command adapter → root manager termination → successful result → historical context + exact inactive history publication → retained center/root controls. Pending/rejected commands do not take the success transition. | Error presentation, exact selection, per-Agent cleanup; no status aggregate on command line. |
| DS-047 | Return-Event / history store | Lifecycle fact or normal refresh → existing family generation → bound backend readiness → private query operation → independent Apollo Link request → read-only history service/current root activity → strict parser/latest generation → slice + navigation topology → rendered root controls. | Parser and navigation projection serve this read owner; Apollo handles transport, not lifecycle. |
| DS-047-H | Bounded Local / history load actions | Allocate logical generation → initiate independent request → complete/parse → compare current generation → publish or discard. | Full-reader workspace family isolation, family errors, existing quiet/loading semantics. |
| DS-035 / DS-047-I | Primary inspection plus bounded local / context store | Exact history click or post-Stop inspection → current Symbol → independent root inspection → independently acquired staged exact member projections → re-check current Symbol → commit candidate/activities → publish activity and observational view; attach only on valid active observation. | Root/Agent ID checks, conversation retention, stream generation and selection preservation. |

Allowed dependencies remain components/actions → stores → existing typed client/
stream/domain services. History's private reader does not import context store or
router; contexts update activity through history's public action, never internal
loader mutation. No component watches raw Apollo cache to set status. Fold and row
projection remain pure and never call transport or lifecycle APIs.

### File Responsibilities, Reuse, Removals And Change Sequence

| Path / action | Final responsibility | Explicit removal / restriction |
| --- | --- | --- |
| `autobyteus-web/stores/runHistoryLoadActions.ts` — modify | One private typed Org query/error/parse operation reused by full/focused readers; independent physical requests with existing logical guards. | Remove duplicated Org query option/parsing blocks. No generic framework, new folder or parallel read owner. |
| `autobyteus-web/stores/agentOrgContextsStore.ts` — modify | Independent activity-bearing inspection; preserve generation/strict staging and all Stop/continuation sequencing. | Remove only redundant onInactive history refresh. Do not replace context store, latch, selection, draft or pending-command ownership. |
| `autobyteus-web/services/agentOrgExecution/agentOrgContextHydration.ts` — modify under AD028 | Existing exact member acquisition independently originates for both inspection/stream stages. | No default-dedup child dependency, per-source fork or new reader; preserve staging/identity/conflict guards. |
| `autobyteus-web/stores/runHistoryStore.ts` — retain/test | One activity slice and immediate topology publication before guarded refresh. | No new activity map/overlay; no reverting IR058. A source change here requires a specific newly demonstrated need. |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`, `agentOrgContextsStore.spec.ts`, `agentOrgInspection.spec.ts`; `components/workspace/history/__tests__/WorkspaceAgentOrgActivityPublication.spec.ts` — extend | Durable installed-Apollo controlled-Link overlap tests with real query/loader/Pinia publication, plus exact inspection overlap. | Mocking independent client promises is not the stale physical-read regression. Preserve API-owned test deltas. |
| Org/Team status context, branch fold, navigation projection, Apollo plugin, server/runtime/persistence — retain/test relevant controls | Existing separate status and lifecycle authorities; global bound transport unchanged. | No original recursive configured topology, coordinator default, hidden-Stop workaround, global dedup disable or migration. |

Draft responsibilities now span three existing production files under AD028,
including the staged member read in agentOrgContextHydration.ts. The only
reusable extraction is the semantically tight typed history operation; generation
and publication do not move into it. Thus there is no new owned structure with
redundant root/status fields and no folder movement. Existing API surfaces, DTOs,
errors and provider behavior are unchanged. No legacy compatibility branch is
retained: duplicate operation construction is removed, not wrapped twice.

Sequence: (1) retain and characterize the installed-client failure with durable
negative baseline, (2) implement the private read contract and inspection option,
remove the redundant callback refresh, (3) prove immediate and late publication
with real stores/navigation and active/failed Stop controls, (4) implementation
validation and selected source review, then **full cumulative API/E2E**, then
successful proportional test-code review and applicable downstream delivery gates.
Each completed stage determines its next recipient by fresh team rules.

### Alternatives, Data Decision, Risks And Validation Gate

Rejected: permanent context-over-history overlay (can mask newer real activity
and does not solve original reconciler freshness), always hiding Stop (false
active behavior), removing immediate publication (regresses API038), removing
generations (out-of-order fresh requests still race), no-cache alone (still shares
Link), global dedup disable (unrelated blast radius), new epoch/tombstone/server
protocol (not justified), wholesale original Team port (wrong configured topology).

Persisted data: **Not Affected**. Existing response fields and their meaning are
unchanged; only the client's acquisition/commit contract changes. No raw-record,
execution-tree, stored locator, config, catalog, schema or migration change; no
runtime fixture modification, backfill, migration ID or rollout action authorized.
IR049 actual installation decision remains separately Architecture-owned BEFORE
cutover and is not a blanket coding hold.

Residual risk: independent concurrent reads increase requests by the number of
real callers previously coalesced; removing the duplicate inactive callback bounds
avoidable traffic without new scheduling policy. More than one independent request
can finish out of order, so generation checks remain essential. This design does
not claim cross-process/replica consistency beyond the existing current backend
contract, nor fix unrelated original-Team or old API gaps. New contradictory
post-Stop backend observations require evidence and a fresh ownership assessment,
not a compensating client flag.

VAL-058 is strengthened; VAL-076–078 specify physical overlap, inspection overlap
and truthful positive/negative controls. AD028 adds VAL-079 for the root-complete/
member-pending final-content overlap; the complete staged read is in scope. Required executable evidence includes
real-client overlap regression for full/focused combinations, old response release
before/after the new request, new read rejection, preservation of other roots and
workspace family, valid fresh active acceptance, direct/mounted selected Agents at
1502/390, genuine pending and rejected Stop, and unchanged selection/draft/content.
Unit Link controls are not hosted/browser/backend proof. Renew normal hosted cases
with new owned roots rather than replaying API37 roots, and run the FULL cumulative
API scope; four focused status cases cannot waive the other groups.

API37 remains Fail69.3 (41 groups: 2 Pass, 37 Not Tested with partial evidence,
1 Fail, 1 N/A); its 33 passing repository commands/434 distinct main files/2645
tests are not architecture-run checks or cumulative acceptance. Prior API36
35-Pass history does not become current. API36 missing narrow/post-consumption
proof, API35 missing Restore body, API33 lost associations and CRR059/067, IR041,
API27/29, DR007/009, API20/unknown-stall/native-worker limits remain unfilled.
API37 POSIX copyback metadata disclosures remain separate, not this UI cause.
The three API-owned unstaged tests still require successful proportional review
after eventual cumulative API Pass. AAV002 complete-package-only limits and
AAV003 upload-label/association distinctions remain unchanged. No reset, provider
replay, native shell/AppImage, release, user acceptance or Delivery readiness.

### Current Classification And Completion

- Result: **Architecture Design Complete**, recovery **Design Impact resolved in
  revised design**; source repair and all executable gates still pending.
- `task_size=Large`, `architectural_risk=High` cumulative; focused `Medium/High`.
- Structural scope: existing history and inspection acquisition/commit seams,
  concurrency provenance and navigation publication tests; no new subsystem.
- Payload/evidence volume: 2169 incoming references, pinned source excerpts and
  fixture bodies do not determine size/risk. High risk comes from asynchronous
  root lifecycle controls across client/store boundaries, not Markdown volume.
- Route: independent Architecture Review of this revised impact before source
  implementation. Escalate new authority/protocol/persistence/product needs rather
  than silently broadening or downgrading. Prior ARCH023 Pass is not approval of
  this new DS-037/047 clarification.

## AD-REV-026 — Durable Non-Media User Attachments (DS-044–046)

### Trigger, Approved Scope And Design Health

CRR-081 / CR-FIND042 promotes API-FIND035 after a supported chooser → one Send
→ provider reply → Accepted task or normal Stop → cold exact Tasks participant
journey. Source `3d9a019d320878c421429f27c0f074f9a4c4c2f5`, inspected artifact
`f8a3f37af0969748f05f0605e5fae1a1cc77f10f`. The text and image both open immediately;
after hydration the image remains but the text label/Open disappears. Actual
files and final GET bytes remain correct. Two real user trace records and both
initial/retained projections contain image/audio/video only. This is a missing
message-association invariant, not wrong ownership, deletion, failed task
settlement or a provider stall. Architecture independently read those two
records; evidence details are in the context-file investigation supplement.

Behavior basis: existing shared context-file/conversation continuity under
REQ-014–016/034–036, AC-010/011/029–031/034 and DS-042/VAL-066. No new intended
behavior or Product gate is required. RER-033, exact root/AgentRun file locators,
org_local authoring, first-rollout migration policy and compact UI remain intact.
CR-FIND041's execution-resolved status correction is not reopened. AAV-002 is
still only a bounded package-roundtrip clarification.

Change posture: Bug Fix; root cause: Missing Invariant / Shared Structure
Looseness. Refactor needed now, narrowly: remove the assumption that a user
attachment is necessarily image/audio/video from recording and projection.
Keep media semantics, native/external recorder ownership and physical file
ownership separate. No replacement conversation store, attachment ledger,
provider-history scraper, queue, retry system or root lifecycle is justified.
The existing input/recording/history capability absorbs this extension.

Focused task_size=Medium / architectural_risk=High: bounded existing input,
shared trace, projection and renderer files, but a durable representation and
read-API contract change. Cumulative task_size=Large / architectural_risk=High.
File/fixture volume is not the classification basis. Independent revised-impact
Architecture Review precedes implementation; current API33 remains Fail and
all outstanding cumulative validation/proportional-review limits remain.

### Supported Behavior And Spine Inventory

| Spine | Kind / supported trigger | Main line through governing owners to meaningful outcome | Invariant |
| --- | --- | --- | --- |
| CF-07 | Primary / user chooses files and Sends to an exact active configured/task Agent, direct or Team-hosted | Shared composer/submission → existing finalization → AgentRun admission/provider dispatch → original forwarded-message observer OR native input/MemoryManager → one user raw trace in exact Agent memory directory → cold projection and file click | The recorded user row owns the association; URI still names original file owner |
| CF-08 | Primary return / cold selection, deliberate Restore, retained Tasks participant, or supported active-trace browsing | Existing inspection/history service → exact stored memory source → normal raw normalizer/replay → conversation or active-trace-page projection → shared attachment hydration/UserMessage → existing authorized file read/Open | Same file label/type/locator survives without activation or provider fallback |
| CF-09 | Bounded local / normal provider adaptation and recording | Capture accepted ContextFile reference values → provider-local copy or native input clone → disjoint media/file partition → one existing writer append | Provider path and recorded locator have distinct meanings; no competing writer |
| CF-10 | Operational / normal rotation, restart, and existing initial cutover | Existing raw store/archive → typed record read/write preserving optional attachment facts → existing locator visitor/readiness or pending family transformation → strict reread | Preserve recorded associations; never synthesize associations absent from history |

Unrelated stream retry/corruption, guessed file-directory reconstruction, new
Org-only package eligibility and a new rollout for IR049's sampled installation
are not initiating scenarios for this revision. IR049's positive cutover finding
remains installation-specific, not a whole-code or disposable-test hold.

### DS-044 — One User Trace With Disjoint Media And File References

**Representation.** Extend the existing versionless RawTraceItem, not its file
family or a second record. Retain `media.images/audio/video` exactly as media
URI arrays. Add optional `file_attachments` for **non-media** ContextFiles on
`trace_type: user` only. Internal TypeScript property is `fileAttachments`.
Each element preserves `{uri, file_type, file_name}` from accepted input;
`file_type` is an existing ContextFileType other than image/audio/video,
including unknown, and `file_name` is the accepted nullable string. URI is
non-empty and preserved byte-for-byte. No MIME guess, binary data, arbitrary
metadata, file content, provider path or repeated root/Agent ID is needed in
this value. Exact file ownership remains in the URI; exact message ownership
remains the trace's existing run directory/id/turn/seq.

```json
{
  "trace_type": "user",
  "content": "Please review these files.",
  "media": {"images": ["/rest/agent-org-runs/org-1/agent-runs/agent-9/context-files/ctx_i__diagram.png"]},
  "file_attachments": [
    {"uri": "/rest/agent-org-runs/org-1/agent-runs/agent-9/context-files/ctx_t__notes.txt", "file_type": "text", "file_name": "notes.txt"}
  ]
}
```

This is an attachment excerpt, not a replacement for required raw trace IDs,
turn, time, seq or source_event. Media and non-media are non-overlapping facts,
not legacy/current alternatives. Each accepted input item goes to exactly one
partition, preserving order within that partition and never collapsing distinct
locators by name/content. Existing media grouping remains; the file group keeps
its input order. This revision does not promise a new cross-media ordering UI.
Empty/no non-media associations serialize without the field. Absence/null/empty
means no recorded non-media association, **not proof none was originally sent**.
Readers use the same version-agnostic optional-fact contract for old and new
rows. Present malformed entries or a media type in file_attachments are diagnosed
through the existing owning read/write error boundary, not silently dropped or
converted from filenames. Non-user raw entries do not acquire file attachments.

**Reusable value.** Add `agent/message/context-file-reference.ts` in the core
library: immutable `ContextFileReference {uri, fileType, fileName}`, capture from
ContextFile, and explicit snake-case serialization/validation. It is a small
value, not a locator resolver or store. The memory-owned
`memory/models/raw-trace-attachments.ts` partitions references into existing
RawTraceMedia and validated non-media `fileAttachments`; both recorder paths
reuse it. RawTraceItem owns roundtrip serialization. Do not persist a parallel
all-attachments copy beside the media/file partitions.

**External runtime producer.** AgentRun's existing forwarded fact and original
message remain authoritative. `RuntimeMemoryEventAccumulator` captures/partitions
that message's ContextFiles and gives both partitions to
ExternalRuntimeMemoryWriter in the same user append. Split the user input arm
from assistant/reasoning in RuntimeMemoryTraceInput so non-user records cannot
accidentally receive this field. Retain turn/correlation/time and existing
acceptance, observer dispatch, recorder FIFO, shutdown drain and error behavior.
No record at upload, reservation or rejected/non-forwarded send; no second row
on provider completion, focus, restore or click. A provider reply/immediate
optimistic display is not proof that this append preserved all fields. Retain
current recording failure diagnostics; no new ACK durability or crash guarantee
is introduced by this representation change.

**Native producer is not an unexamined exception.** The native MemoryIngestInputProcessor
also reduces input to LLMUserMessage today; that has no non-media file field.
Moreover the server normalizes ContextFile.uri before native backend dispatch.
Use a typed **in-process recording snapshot**, not a provider-path guess:

- Add `recordingFileAttachments: readonly ContextFileReference[] | null` to
  AgentInputUserMessage (default null; optional final constructor argument).
  The normalizer sets it on the provider-facing copy from the non-media
  partition of the original input's ContextFiles **before** path replacement. It ignores any caller-supplied
  recording snapshot at this authoritative server adaptation boundary. The
  original forwarded message stays untouched and external recording uses that
  original, not the provider copy.
- Preserve the typed snapshot through AgentInputUserMessage.toDict/fromDict
  under `recording_file_attachments`, because the core input pipeline clones through
  those methods. This is an internal value carried by the clone, not a new
  REST/GraphQL input, persisted sidecar, provider API field, or metadata cache.
  Do not encode this contract inside an untyped metadata key. Native direct
  core inputs without a server adaptation snapshot capture the triggering
  event's original non-media ContextFiles, not the processed LLM body or
  mutated processor output. Null here means no adaptation was performed, not a historical version.
- MemoryIngestInputProcessor uses the triggering event's recording snapshot (or
  its unadapted original input references) and passes it explicitly to
  MemoryManager.ingestUserMessage alongside the existing processed LLM message.
  The MemoryManager validates the non-media references and appends one raw user
  row alongside its existing processed LLM media. Native media arrays continue
  to come from LLMUserMessage exactly as before; do not change their values or
  working-context media/provenance semantics as a side effect of this non-media
  correction. Existing processed text and TOOL-continuation exclusion remain.
  Internal no-context callers pass an empty reference collection. Update all
  callers/tests coherently; do not add a server-side second native recorder.
- Provider consumers still receive their normalized ContextFiles and existing
  LLM content/media. They do not serialize the recording snapshot into provider
  requests. This snapshot separates two real meanings (recorded user locator
  versus provider-local input); it is not a second durable attachment authority.

The shared native and external paths serve standalone Agents/Teams as well as
Org configured/task executions. Keep them root-neutral; no Org conditional in
raw trace serialization. Regression tests must cover those existing consumers;
no standalone owner/URL redesign is included.

### DS-045 — Complete Cold Projection And Existing Open Experience

AgentMemory's raw normalizer/domain carries typed fileAttachments from the
single trace. HistoricalReplayMessageEvent carries it only for user messages;
RunProjectionConversationEntry exposes optional `fileAttachments` with camel-case
reference keys `{uri,fileType,fileName}` beside unchanged media. Both the initial
and cold GraphQL conversation JSON use this same projection. The typed Memory
view also exposes the nullable collection through its existing GraphQL object.
No new query, provider-history source or server attachment lookup occurs during
projection. Existing exact memory-source location, recent window, pagination,
revision/cache invalidation and status/read_only rules remain authoritative.

The second read surface must not remain media-only: replace the user
`EventMonitorActiveTraceAttachment.mediaType` field with `fileType` using the
existing ContextFileType vocabulary and nullable `fileName`. Keep attachmentId
and locator. Update the typed GraphQL object, page projection, web query/DTO and
browse presentation together; retain no attachment-field alias. **Media visuals**
(assistant media segments) retain mediaType unchanged. User media and file
attachments use the same existing UserMessage controls; no new card/tab.
Use stable eventId + partition + ordinal for attachment IDs; retain existing
media IDs and add a distinct file partition. The same shared hydration maps
file type/displayName and passes the original URI to existing Open. Identity is
never reconstructed from selected participant or visible title.

Include fileAttachments in existing browser projectionEntryKey/merge so identical
text/time with different files cannot collapse or lose the collection. Where a
raw record already has an ID, preserve the replay ID. Extend the existing
no-ID content fingerprint with a file-reference contribution only when present,
leaving previous empty-file fingerprints unchanged. No global deduplication,
new sequence, or persisted replay ID. Recent-presentation witnesses must include
the resulting attachment facts; existing active-trace IDs/cursors/window semantics
remain. Do not merge a media-only provider row into a falsely complete message.

`buildConversationFromProjection` and active-trace browse presentation both call
hydrateContextAttachment for file references using captured type/name and the
original locator. Keep existing media handling and image decode/open. Do not
parse prose, resolve filesystem names, fetch attachments just to build a history
row, replace cold history with an optimistic cache, or attach files from adjacent
messages/tasks. The user sees the familiar label and Open action, including at
390px and on retained Offline/read_only task participants. Viewing/opening never
activates a run or adds a composer to a settled task.

### DS-046 — Existing Data, Rotation And Initial Locator Cutover

| Data cohort | Disposition | Required preservation / limitation |
| --- | --- | --- |
| Existing valid user traces with media only or no attachments | Directly Usable — No Migration | Same current optional-fact reader; preserve every existing content/ID/media fact and bytes; no rewrite to add empty fields |
| API33's two user rows missing the sent text association | No recoverable association in these authoritative rows; preserve source, no inferred backfill | Files and known cross-view refs remain readable. Captured API Send evidence proves the defect but is not application migration input. Do not claim these old conversations repaired |
| New user rows with non-media associations | Current writes/reads in existing raw files | Same-row atomic append through existing writer, exact fromDict/toDict and normalizer; no new record file, ledger, schemaVersion or migration ID |
| Existing final attachment bytes, Org/Team trees, task/communication sidecars, provider history and working-context snapshots | Not Affected by representation extension | No file relocation/deletion, root version, task state, provider-history rewrite or native working-context snapshot version change |
| Normal raw-trace archive/rotation | Directly Usable with extended RawTraceItem roundtrip | Preserve field through current active/archive movement and compaction; no new retention policy or manifest/version change |
| Proven structured locators subject to DS-043's initial family conversion | Existing transition, extended known field visitor | Visit file_attachments[].uri as well as media and formal sidecar refs; transform only proven locator values under the existing owner-correlation plan |

No old authoritative text association is discovered by the read-only evidence.
It is incorrect to say a migration can recover a field the recorder never saved.
Document this historical evidence limit in implementation/validation/delivery;
retain all available bytes, do not mark legacy loss as a successful retained-click
test. If an independently authoritative association source or a requirement to
recover those specific lost links is later established, return that evidence
before designing a separate recovery. No user-data scan/reset/replay is required
to implement or validate this forward recording correction on disposable data.

Extend `context-file-record-locators.ts`'s explicit visitor with the validated
user file_attachments[].uri path; it must not skip file-only rows just because
media is absent. The visitor serves existing read-only readiness and the
migration-only transformation, not a normal URI rewriter. Reuse the actual raw
store/archive manifest paths to enumerate complete archived segments as well as
active files (not only root-level raw_traces_N names); preserve existing archive
membership/status/IDs/counts/times. In the initial family transition, only URI
values may change; record metadata/name/type/other JSON keys and unaffected
lines/terminators stay intact, with existing atomic file commit/strict reread.
Current exact URIs are zero-write. Absent fields create no fabricated data;
invalid present fields use bounded source/field diagnostics. DS-043's completed
family-record/old-locator installation return condition remains separate; do not
reset/replay or introduce another migration ID to bypass it.

### File Responsibilities, Dependency Direction And Removal

All server paths below are under `autobyteus-server-ts/src/` unless prefixed.

| File / capability owner | Target responsibility / permitted dependency | Removal or forbidden bypass |
| --- | --- | --- |
| `autobyteus-ts/src/agent/message/context-file-reference.ts` (new) | Small immutable reference value and exact codec/capture from ContextFile | No filesystem, root identity lookup, arbitrary metadata or state |
| `autobyteus-ts/src/agent/message/agent-input-user-message.ts` | Carry typed provider-copy recording snapshot through clone serialization | No public transport/metadata alias or durable parallel snapshot |
| `agent-execution/input/agent-run-provider-input-normalizer.ts` | Capture original non-media refs then independently resolve provider-copy paths | Never derive history from the normalized physical path |
| `autobyteus-ts/src/memory/models/raw-trace-attachments.ts` (new), `raw-trace-item.ts` | One shared partition/validation and same-row file_attachments roundtrip | Media-only user record assumption removed; no duplicate all-files field |
| `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts`, `memory/memory-manager.ts` | Native recording passes canonical original refs through existing ingest boundary | No new server native observer/writer or LLM field stuffing |
| `agent-memory/services/runtime-memory-event-payload.ts`, `runtime-memory-event-accumulator.ts` | External original-message capture and shared partition, one forwarded user append | Replace media-only extraction call; no focus or provider-output reconstruction |
| `agent-memory/domain/memory-recording-models.ts`, `store/external-runtime-memory-writer.ts` | User-only typed input and complete single RawTraceItem construction | No sidecar, additional queue or changed acceptance fact |
| `agent-memory/domain/models.ts`, `services/raw-trace-record-normalizer.ts` | Typed read of stored optional non-media facts through shared codec | No guessing missing fields or silently dropping invalid present entries |
| `run-history/projection/historical-replay-event-types.ts`, both raw-to-replay and replay-to-conversation transformers, `run-projection-types.ts` | Preserve association through existing read spine | No provider replay or second history source |
| `run-history/projection/historical-replay-event-identity.ts` | Preserve ID-led replay; extend existing no-ID fingerprint for present file facts | No old-row ID rewrite or file-name identity |
| `api/graphql/types/memory-view.ts` | Expose typed nullable file reference facts in existing read object | No query/command/lifecycle change |
| `run-history/projection/event-monitor-active-trace-page-types.ts`, `event-monitor-active-trace-page-projection.ts`, `api/graphql/types/event-monitor-active-trace-page.ts` | General fileType/fileName in existing user attachment object and stable derived attachment IDs | Remove user-attachment mediaType; keep actual media visuals unchanged |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | Hydrate media plus file facts; preserve collection in equality/merge | Remove media-only user hydration; no viewer-based rebind |
| `autobyteus-web/services/eventMonitor/eventMonitorActiveTracePageService.ts`, `eventMonitorActiveTraceBrowsePresentation.ts`, `graphql/queries/runHistoryQueries.ts` | Synchronized page DTO/query/file type mapping into shared UserMessage | No stale three-media-only attachment branch |
| `autobyteus-web/utils/contextFiles/contextAttachmentModel.ts`, `components/conversation/UserMessage.vue` | Existing shared type/name/locator hydration and Open/preview remain final consumer | Reuse, do not fork Org/task renderer or broaden URL permissions |
| `context-files/services/context-file-record-locators.ts`, existing family transition and readiness consumers | Recognize explicit stored user file refs, including current complete archive paths; validate/transform URI only | No prose, directory-based association, general repair or normal migration call |
| Existing raw store/archive, local projection provider and recent witness | Preserve extended values under existing lifecycle; focused tests where no source changes are needed | No new cache/rotation owner or history-source fallback |

Native/core code must not import server ContextFile services. Server adapters
supply values; core memory owns serialization; read projections depend on the
memory read boundary, never both it and an independently scanned attachment
directory. Web depends on projection and shared file-resource actions, not raw
files or runtime managers. Add no empty facade: two small value/partition files
are semantically owned, with all state remaining in existing owners.

### Implementation Sequence, Validation And Residual Risks

1. Implement the reference codec/partition and RawTraceItem roundtrip first;
   verify missing/empty/current/invalid payload behavior and old-media stability.
2. Wire external and native producers, capturing before provider mutation,
   preserving native TOOL exclusions and all command/recording lifecycle rules.
3. Extend memory normalization, replay/conversation and typed page/GraphQL/web
   consumers together; remove obsolete media-only user assumptions/field aliases.
4. Extend the explicit locator visitor/readiness/initial transformation for
   non-media fields and real archive layout. Do not execute it on actual user
   roots during implementation. Test old-current zero writes and supported
   pending first-rollout transforms separately from IR049 installation readiness.
5. Prove complete lifetimes with real file storage and normal HTTP/GraphQL:
   new Send → recorded user row → cold read → actual label/Open → original bytes.
   Cover text+image and representative other non-media types, no-context/media-only
   controls, configured/task direct/Team-hosted, Accepted/Interrupted, and native
   plus external producers. Include active-trace page/rotation/restart, exact
   same-address/different-AgentRun isolation and cross-view file-owner continuity.
6. Then selected independent source review and renewed cumulative API/E2E;
   successful API test-code review remains pending, followed by Delivery-owned
   docs/build/user verification. No prior partial result is promoted.

VAL-070–075 below bound those checks; VAL-066 is strengthened from a saved-file
assumption to recorded-message lifetime evidence. Risks: clone drops canonical
snapshot; one producer remains media-only; malformed file type silently omitted;
page DTO diverges from conversation JSON; dedup collapses same-text/different-file
rows; archive rewrite drops associations; normal read repairs old locators; tests
mistake GET200/optimistic state for durable association. Historical lost metadata
is a disclosed evidence limit, not fixed by this design. All prior API33 held
readiness/restart/Restore/compaction/reconnect/Stop/finalUI work and proportional
review remain required; no executable or delivery pass is claimed here.


## AD-REV-025 — Exact Org Attachment Ownership And Saved Locators (DS-041–043)

### Authority, evidence and design-health assessment

IR048-DI-001 is a **Design Impact**, distinct from the correctly attributed
CRR-072/API-FIND-031 frontend upload omission. RER-033 remains approved and
unchanged. REQ-003/014–016/034–036, AC-003/009–011/029–031/034 and the existing
shared composer/attachment contract govern; the user explicitly confirmed exact
AgentRun identity and requested revision/re-review. No new Product decision.

Source baseline: IR-048 checkpoint 6d77b3c8b / result 5636a1f3a, following
AD-REV-024 / ARCH-REV-021 Pass. The actual-owner observation uses a strict saved
Org tree, real tree store/location service and real final-owner resolver. Direct
and mounted configured owners resolve before task retention; after supported
same-address tasks are retained, address-only resolution fails while exact-ID
resolution succeeds. It proves an identity-contract defect, not a real user-file
loss or a successful end-to-end upload. The mocked renderer's 16 observations
cannot validate this boundary.

`architecture-context-file-ownership-investigation.md` records source witnesses,
read-only stored-data samples, original Team comparison and evidence limits.
In local origin/personal@5645b49d6, Team attachment ownership uses **containing
TeamRun ID + address**, not exact AgentRun ID. Fresh task Teams have distinct
containing IDs; task Agents sharing a host/address can still be ambiguous. Do not
claim the earlier Team contract universally solved this problem. This round
corrects Org ownership, not unrelated Team authoring/draft/route contracts.

Refactor posture: **Refactor needed now — bounded existing capability extension**.
The attachment subsystem owns file identity and movement; the existing strict
execution location service owns execution membership/physical ancestry. The
frontend already knows the exact AgentRun but drops it at the attachment API.
No new runtime owner, registry, ledger, queue or cache is needed. Address is a
placement/navigation value, not an execution discriminator.

| Supported behavior / trigger | Complete target path | Invariant / validation |
| --- | --- | --- |
| Select configured or live task Agent, choose/drop/paste file, open/remove draft | Shared input → captured ActiveAgentWorkspaceTarget → attachment composer/upload store → Context Files API/services → exact Org owner validation → draft bytes/locator → captured AgentContext and established preview | Exact root/AgentRun throughout; no focus-derived reassignment, no activation on preparation/open; VAL-064/067 |
| Send prepared files, including after supported task retention or configured history selection | Org submission owner → deliberate continuation only if required → captured exact draft/final descriptors → finalization service → stored-only location → exact physical directory → finalized attachments → existing exact SEND_MESSAGE | Same captured execution; no message dispatch on finalization failure; existing local-submission recovery remains; VAL-065/067 |
| Click a sent/retained attachment, including a reference shown in another participant's view | Conversation/Messages/Tasks reference → saved locator → existing authorized resource handling → file-read service → strict root + AgentRun lookup → exact bytes | File owner comes from locator, never viewer; no restore or task reactivation; VAL-066/068 |
| Initial family cutover with existing saved attachment references | Existing startup migration → strict source/target tree plan → migration-only locator transform → committed record writes/reread → existing root move/cleanup → current history projection/GET | Preserve file identity/content and structured references; no runtime old-route reader or second migration; VAL-069 |

| Spine ID | Kind / governing owner | Start → main-line nodes → end | Purpose |
| --- | --- | --- | --- |
| CF-01 | Primary / ContextFileUploadService | File chooser → captured composer target → upload store/API → upload service/owner validation → exact draft layout → returned attachment | Preparation and preview without runtime start |
| CF-02 | Primary / Org submission + ContextFileFinalizationService at their respective boundaries | Send → exact submission/continuation owner → finalize API/service → owner resolver/location → physical move → current locator → SEND_MESSAGE/provider path normalization → original-reference recording under CF-07/09 | No ownership loss across finalization or durable message association |
| CF-03 | Primary / ContextFileReadService | Saved attachment click → authorized resource request → read API/service → owner resolver/strict location → physical file → image/text/download surface | Retained exact read independent of current focus/status |
| CF-04 | Return / captured composer and submission owners | Upload/finalize result → captured target/key → existing attachment hydration/submission reconciliation → correct draft/conversation | No new pending-owner cache; preserve later edits and switched focus |
| CF-05 | Bounded local / finalization service | Validate owner pair → validate descriptor list → per-file draft/final existence and existing move semantics → current locators → prune consumed draft dirs | Retain existing partial-batch retry/idempotence, not a transaction/queue redesign |
| CF-06 | Primary / existing family migration | Startup inventory → complete strict tree/record/file plan → migration-owned URI transformation → atomic commit/reread → family rename/cleanup → readiness | Preserve known saved links during first rollout |

### DS-041 — Exact Org Attachment Contract

Keep the existing discriminated owner union. Replace **only** the Org variants:

```ts
type OrgMemberDraftOwner = Readonly<{
  kind: 'org_member_draft'; orgRunId: string; agentRunId: string;
}>;
type OrgMemberFinalOwner = Readonly<{
  kind: 'org_member_final'; orgRunId: string; agentRunId: string;
}>;
```

`agentRunId` is the exact canonical execution-tree AgentRun ID, not an Agent
Definition ID, provider/platform session ID, task ID, address or display suffix.
`orgRunId` is retained to validate root membership, not as a substitute for Agent
identity. Org selection occurs after root creation; there is no prelaunch Org
Agent composer. Remove the misleading Org `orgDraftId` and redundant authored
`memberAddress` from this contract. Standalone Agent and Team variants remain
unchanged. Do not introduce an optional AgentRun ID or an old/new shape union.

The existing ContextFileOwnerResolver owns validation of Org draft/final
identity through the stored-only CollaborationExecutionLocationService:
`findAgent({rootSubjectKind:'agent_org', rootRunId:orgRunId, agentRunId})` and the
sync equivalent. Require one exact correlated result. Derive address, Team
ancestry and `memoryDir` from that result. Do not accept caller-supplied ancestry,
configured-placement identity or a containing-Team substitute. Keep the location
service's strict uniqueness rule; do not modify its configured/task admission.

Use the same owner resolver for Org draft upload, draft read/delete and
finalization. This validates an existing retained execution, not live readiness:
inactive configured Agents can prepare drafts without activation; retained task
history can be read without becoming writable in the UI. Existing active-target
access/command policy remains authoritative for sending. IDs are not credentials;
existing REST authentication and filename/path safety remain in force.

| Surface | Exact current Org shape |
| --- | --- |
| Multipart POST `/rest/context-files/upload` | `owner` is the new Org draft descriptor; existing file/result fields unchanged |
| POST `/rest/context-files/finalize` | Exact Org draft/final pair plus existing storedFilename/displayName array |
| Draft GET and DELETE | `/rest/drafts/agent-org-runs/:orgRunId/agent-runs/:agentRunId/context-files/:storedFilename` |
| Final GET | `/rest/agent-org-runs/:orgRunId/agent-runs/:agentRunId/context-files/:storedFilename` |
| Draft physical directory | `$APP_DATA/draft_context_files/agent-org-runs/<orgRunId>/agent-runs/<agentRunId>/context_files/` |
| Final physical directory | Existing exact `LocatedAgent.memoryDir/context_files/`; no new hierarchy or file-byte move for already-current Org final files |

All ID/path segments are encoded once by builders and decoded/validated once by
routes. Require exact Org descriptor keys and non-empty safe ID segments; reject
retired `orgDraftId`/`memberAddress`, missing AgentRun ID and mixed-family pairs.
The resolved Agent must belong to the stated Org. Never search other roots or
pick the first/configured/live address match. Existing POST/DELETE error shape
remains400; validly shaped GET with absent owner/file returns 404, invalid shape
returns 400. The resolver may expose a bounded Org-owner-not-found error from its existing
file so the REST adapter can distinguish 404 from invalid 400 without parsing
error strings. Do not mask filesystem/internal failures as successful empty files.
DELETE keeps existing idempotent 204 semantics after valid owner resolution.

For Org finalization, validate matching `orgRunId` **and** `agentRunId` on the
captured draft/final descriptors before directory creation/moves. Reject any
cross-root/cross-Agent or Org/non-Org pair. Reuse current per-file move, existing
final-file retry and cleanup rules; do not add a second completion journal.
A finalization error prevents SEND_MESSAGE and follows the established guarded
submission restoration; it does not move an attachment into whichever Agent is
now focused. A finalized attachment subsequently referenced by another Agent
keeps its original owner/locator and is not re-finalized or relabeled for the
recipient. This is not a new communication/admission restriction.

### DS-042 — Reuse, Publication, Removal And File Ownership

The shared input and attachment composer depend only on the exact active-target
boundary. The Org submission owner supplies its captured root/AgentRun to draft
and final builders before awaiting work. `sameDraftOwner`, remove/clear, parser,
hydration and click/open must use this same pair. Existing request placeholders,
AgentContext draft state and local-submission guards remain the only frontend
state owners. Preserve typed edits, typed-then-cleared intent, focus switching
and context replacement fixes from CRR-068/IR-048.

Server current locator builders, REST registration and local-path normalization
must agree with frontend builders/recognizers. Provider input normalization must
resolve a current final Org locator to the exact physical file, preserving the
original accepted attachment URI for normal history recording. DS-044–046
completes that producer/representation/projection contract for non-media files
as well as media; same-row association must exist before claiming a retained
click is covered. No local-path
resolver fallback may select another execution. Read/open uses the locator owner
when the viewer is a different sender, receiver or task participant.

Add the missing Org draft DELETE route through the existing read/delete service;
this is part of existing remove/clear parity, not a new retention policy. Final
files remain retained when a UI reference is removed. Keep existing MIME/size
checks, 24-hour draft TTL, filename construction and authorized blob/preview
lifecycle. Use existing desktop/narrow image/text/file presentation; no UI redesign.

| Final file / owner | Responsibility and allowed dependencies | Removal / forbidden shortcut |
| --- | --- | --- |
| `autobyteus-server-ts/src/context-files/domain/context-file-owner-types.ts` | Tight Org descriptors, parsers and current locator builders; no lookup or migration knowledge | Address-only Org variants/builders and orgDraftId removed |
| `.../context-files/services/context-file-owner-resolver.ts` | Org draft/final correlation via exact stored-only collaboration location; one membership boundary, sync twin for local-path reads | No active manager, address ranking, extra identity index or caller bypass |
| `.../context-files/store/context-file-layout.ts` | Exact Org draft path; unchanged resolved final directory; existing safe-child rules | Address-shared Org draft directory no longer written/read by current services |
| `.../context-files/services/context-file-upload-service.ts`, `context-file-read-service.ts`, `context-file-finalization-service.ts` | Reuse owner validation; upload/read/delete/pair-checked movement within existing owners | No duplicate route-level filesystem resolver or new lifecycle owner |
| `.../context-files/services/context-file-local-path-resolver.ts` | Recognize only current exact Org routes and pass exact identity to owner resolver; other families unchanged | Old Org regex/descriptor branch removed |
| `.../api/rest/context-files.ts` | Compose existing services; strict Org GET/DELETE/POST decoding/error adaptation | Old address-only Org GET routes removed, no redirect/alias |
| `autobyteus-web/utils/contextFiles/contextFileOwner.ts`, `contextAttachmentModel.ts` | Matching current closed types/builders/locator parsing/hydration | No address-only Org parser or silent old locator normalization |
| `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | Derive root + canonical AgentRun from captured exact active target; retain null/read-only guards | No fake Agent/Team context or independent target store |
| `autobyteus-web/composables/useContextAttachmentComposer.ts`, `stores/contextFileUploadStore.ts` | Exact owner equality, captured upload results, open/remove/clear, established transport/results | No focus-at-completion reassignment or second attachment cache |
| `autobyteus-web/stores/agentOrgContextsStore.ts` | Captured exact owner pair in the existing deliberate submission/continuation path | No new submission owner or restore on choose/open |
| Existing strict Org tree/index/location, execution/task/communication records | Derive all retained configured/task physical locations unchanged | No tree version, ID, path ancestry, task settlement, routing or ack schema change |

Placement stays inside existing capability folders. Route/type adapters are thin;
services retain the actual invariants and lifecycle. No empty facade is added.
The shared atomic package writer may gain a serialized-text entrypoint for
migration JSONL bytes; one commit implementation must serve JSON and text, not
a competing writer or a JSON string double-encoding. Record-shape transformation
belongs only in the migration helper specified below.

### DS-043 — Evidence-Based Saved-Reference Transition And Readiness

The physical final file already lives under an exact AgentRun directory. The
problem is the locator, not the file contents. Read-only evidence on 2026-09-12:
166 structured Team final attachment URIs in `media.images[]` under
`/home/autobyteus/data/memory`; 97 are in nested roots and 69 in flat roots. All 166
correlate to one physical context file and its owning trace Agent directory.
They occur in 77 trace files totaling 92,559,674 bytes (largest 7,852,024 bytes),
which justifies file-bounded transformation rather than rewriting all history.
The sampled `/root/.autobyteus/server-data` and DR009 server-data roots contain 4
and 2 Org trees respectively and no context files. Text mentions of Org routes
inside conversation prose were excluded. These are bounded samples, not a
universal inventory or a never-deployed claim. IR-048's hash inventory, mocked
renderer and expected-rejection test are not saved-attachment evidence.

Thus **migration is required for affected saved locators**, independently of
PKG-AUTH-002 spelling/definition migration. Extend the existing first-rollout
`20260901_agent_org_flat_team_families_v1` migration to produce final usable
attachment references as part of its target package. Do not add a migration for
an intermediate branch shape, reset an existing migration record, or replay
runtime migration solely to change authoring. Existing AD-REV-024 scope/naming
instructions remain unchanged. This decision rests on actual saved Team links
and known attachment writers/readers, not on assuming Org attachment data empty.

| Data surface | Decision | Exact treatment |
| --- | --- | --- |
| Current execution trees, AgentRun identity/ancestry, task/message semantics | Directly Usable — No Migration for this identity correction | Schema/IDs/structure/status unchanged; preserve established family cutover separately |
| Final file bytes within already-current Org physical directories | Directly Usable — No Migration | Exact lookup reaches existing file; do not copy/re-key by address |
| Saved structured locators whose owning Team root converts to Org | Migration Required in existing family transform | Rewrite only locator values to exact Org root + AgentRun using the proven source owner; preserve bytes and all unrelated record fields |
| Saved address-only Org final locators found in the owned cutover inventory | Same bounded locator transform, only when actual records establish this cohort | Known writer shape 37d05c7f; derive exact owner from strict tree + physical file. No claim that a sample proves deployment or absence |
| Existing exact Org locators | Directly Usable — No Migration | Validate correlation; no rewrite/timestamp update |
| New process-local Org drafts | Current shape from creation | Exact draft pair/path, no persisted browser draft-owner schema or extra draft ledger |
| Any pre-existing address-only Org draft bytes/references | Inventory-dependent; never guess execution ownership | Record separately before cutover; see readiness rule below. Do not discard unexpired files or map ambiguous drafts to configured Agents |
| External repository/package files and unrelated arbitrary text/URLs | Not Affected | No repository writes or global string replacement |

**One migration-owned transform.** Add
`app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-context-file-locator-transition.ts`
as an internal concern of the existing family migration, not a separately
registered migration, runtime adapter or generic URI-repair service:

1. Before writes, inventory the actual configured server memory/app-data roots,
   all relevant strict source/target execution packages and structured attachment
   fields. Keep temporary generated evidence/test fixtures separate. Build one
   ephemeral old-owner→exact-target plan from strict trees, never live focus.
   Include retained tasks. Read archived and active raw-trace files; current
   record readers preserve `media.images/audio/video` and DS-044 user
   `file_attachments[].uri` facts. Inspect
   communication `referenceFiles`, task `referenceFiles` and submission/review
   `updates[].referenceFiles` as separate known typed fields. No rewrite of prose,
   instructions, tool payload text, provider-owned history or arbitrary workspace
   paths is authorized.
2. Parse only the known local attachment locator grammars: server-relative, or
   absolute HTTP(S) with the configured installation origin/loopback under the
   existing local-path resolver trust rule. Do not classify a foreign URL as
   local merely because its pathname resembles an owned route. For old Team locators,
   correlate their **containing** TeamRun ID and address to the source tree; for
   old Org locators use root/address. Filter indexed candidates first, then
   require exactly one candidate with the named physical file. File presence
   disambiguates this migration's known old selector; it is never a normal lookup
   fallback. Do not equate the containing record/viewer with the file owner.
   Zero or multiple valid owners, mismatched roots, missing referenced bytes or
   unsupported structured source shape fail with bounded file/field diagnostics.
   Preserve the source instead of selecting configured/live/first candidate.
3. Build the current locator with target OrgRun ID and canonical AgentRun ID,
   keeping storedFilename, display/reference meaning and existing URL origin
   form; change only the owned route path, not arbitrary URL authorities. Source
   URI grammar and ownership/filesystem proof must establish a local owned
   attachment; unrelated remote URLs remain unchanged. Preserve record ordering,
   timestamps, correlation/turn/sequence IDs and all non-locator values.
4. Finish and validate the locator/physical-owner plan before record writes.
   Transform and commit one affected file at a time; do not hold the entire
   history corpus in memory. Use the existing atomic commit boundary for JSON
   sidecars and serialized UTF-8 JSONL;
   preserve nonchanged lines/bytes, line order and archived/active filenames.
   Require committed outcome and a strict reread/value comparison. Prospective
   target locator validation before the family rename uses the planned target
   tree and the corresponding source physical directory; after rename it uses
   the current stored-only resolver and canonical physical path. Do not require
   a not-yet-published target directory to exist prematurely.
5. Complete the existing whole-root move, current package validation and retired
   authority cleanup. Extend target-only cleanup/idempotence to validate/finish
   this same known locator transformation after an ordinary interrupted attempt.
   Already-current records are zero-write. Original attachment bytes/hash remain
   unchanged; no second backup/journal/recovery state machine. Rebuild derived
   history/projection state through existing startup ownership after completion.
   Persisted trace IDs remain unchanged; legacy derived fingerprints that include
   media URIs are recomputed normally, never backfilled as new persisted IDs or
   appended as duplicate conversation records.
6. Only records with a locator into an affected root may change. Flat Team V2
   execution trees/paths always remain byte-identical; flat/standalone records
   without such a reference remain zero-write. If an actual structured reference
   in another owned history record points into a converted root, update that
   value from the same proven plan, not by rebinding to its enclosing Agent.
   This is a locator-preservation exception to earlier blanket package-byte
   wording, not a flat Team runtime migration or new cross-root routing policy.

**Draft and deployment readiness is explicit, not an empty-inventory assumption.**
Existing frontend Org draft state is process-local; current source has no durable
browser draft-owner registry. The bounded samples contain no Org draft bytes,
and prior real failed chooser attempts issued no upload. Before a real cutover,
record the selected app-data roots and any actual old Org draft files or saved
draft references. A positive cohort must prove one exact execution from independent
retained owner evidence before moving bytes/changing a reference; address alone
on a repeated-address tree is insufficient. If that evidence is absent, preserve
those files and return the concrete unresolved data condition to Architecture;
do not silently delete, infer disposability from TTL, or create a normal alias.
No hypothetical draft migration or new journal is authorized by this design.
Normal existing expiry continues to own genuinely expired orphan drafts.

The recorded first-production-rollout premise selects the **existing pending
family migration**. Source introduction, IR048 mocks and local test DB records do
not prove deployment. Inventory the actual migration status before execution. If
an installation already has terminal family migration success **and** locators
that require transformation, do not reset/replay it or claim readiness: return
that concrete deployment-state evidence for a separate transition decision.
This is an explicit unsupported cutover precondition, not an assumed absence or
an approved post-deployment migration. Do not mutate live user data for probes.

The family migration retains **no warning success** for required locator mapping,
write/reread or cleanup failure: `FAILED` prevents current admission, with existing
ordinary startup retry. Summary migration's separately scoped valid-empty
`SUCCEEDED_WITH_WARNINGS` remains unchanged. Counts/concise result in the existing
runner; bounded diagnostics in its attempt log, no attachment content/credentials
in status. Use normal storage assumptions from the production migration convention.

### Implementation sequence, risks and completion evidence

1. Preserve/reconcile IR-048's Org-local/first-run code and original frontend
   upload fix. Change only the attachment contract/consumers described above.
2. Implement closed exact Org types, owner resolver and current routes/layout;
   wire existing upload/read/finalization services, including Org draft DELETE.
3. Update captured frontend ownership and all current locator parsers/builders;
   keep submission, continuation, task access and retained inspection unchanged.
4. Extend the existing initial family transform and its current-readiness check
   for demonstrated saved locator preservation; inventory deployment/draft
   preconditions without guessing. Remove old normal Org route/parser branches.
5. Require real-filesystem + actual service/REST tests for repeated addresses,
   exact byte reads, finalization, removal, provider normalization and restart.
   Browser mocks alone are insufficient. Verify desktop/narrow chooser, text/image
   opening, sent/retained opening and exact focus/async behavior with real HTTP.
6. Return one completed cumulative Implementation package through source review,
   renewed API/E2E and Delivery. Naming-only partial advancement is not selected.

Residual risks: saved-locator inventory may expose unsupported/ambiguous old
ownership or a different deployment status; do not report those as migrated.
Provider-owned arbitrary history/prose is not rewritten. Existing Team owner
contract is preserved and not proclaimed universally ambiguity-free. Native
shell and real-provider evidence remain downstream-owned. All API29 held groups
remain held until actually rerun; no new executable or delivery pass follows from
this design's self-validation.


## AD-REV-024 — Org Local Authoring And First-Run Migration Target (DS-038–040)

### Authority, Evidence And Deployment Premise

Approved `RER-033@f84c5299f10898f49acff6a0e481d1cd61c769a9` resolves
PKG-AUTH-002. REQ-037 / AC-035–036 / SCN-023–024 / DEC-025 and
ORG-CASE-064–066 govern the authored `org_local` name. The four upstream
artifacts are unchanged. Latest prior design/review is AD-REV-023 / ARCH-REV-020
Pass; inspected implementation is IR-047 artifact `56fb8983fba0fb6a35b031aa6124f9ca07b0aab1`.
Earlier source/API passes retain their recorded scope, not this new contract.
No Product gate or UI redesign applies.

**First-run premise, explicitly clarified by the user on 2026-09-12:** this
unreleased ticket's migration must be treated as not yet run in production.
Update its existing code directly to the final target. Test-run completion
records and saved intermediate branch output are not evidence of a deployed
migration. The preliminary proposal for another spelling migration is withdrawn;
no new migration ID, registry entry or production upgrade chain is added for
PKG-AUTH-002. DS-039 supersedes AD-REV-020's assumption that the ticket's family
writer must remain frozen at numeric definition intermediates. Earlier already
released migrations outside this ticket remain untouched.

**Current code evidence:** normal Org codec/domain and the owned-source index
still use authored `agent_org_owned`. The same index also returns an internal
`kind: agent_org_owned`, which is a different contract. GraphQL maps the member
scope to `AGENT_ORG_OWNED`; exact child IDs use `agent-org-owned-agent/team`
prefixes. The existing family migration still generates numeric definition
versions and the old authored scope, then the existing authoring-shape pass
removes versions. Update the original generators, not just the last parser.
Evidence paths, provenance and bounded inventory are recorded in
`architecture-package-authoring-investigation.md`.

**Design health:** approved contract change, not a source failure against RER-032.
Existing definition, source/admission and migration owners absorb it. A bounded
refactor is needed now: tighten the Org authored type/mapping and replace the
unreleased migration's obsolete output/validation assumptions. No additional
service, format registry, runtime owner, alias parser or recovery framework.
Focused `task_size=Medium`, `architectural_risk=High` reflects strict package
admission and owned persistence—not file count. Cumulative `Large/High` and
independent Architecture Review remain applicable.

### DS-038 — One Authored Vocabulary, Separate Identity Contracts

| Spine ID / kind | Supported start → authoritative owner → mechanism → meaningful outcome | Owner |
| --- | --- | --- |
| DS-038a / Primary | User authors or edits Org → subject DefinitionService → current codec and ref/handoff validation → provider package transaction → canonical config/read/catalog with org_local | Org DefinitionService; provider owns publication |
| DS-038b / Primary | User registers/reloads package → AgentPackageService/source descriptor → DefinitionAdmissionService/current Org codec → owned-source index and exact referenced definition → available Org or contextual diagnostic | Admission owns availability; index owns ID-to-path discovery |
| DS-038r / Return | Validated Org domain → GraphQL projection or canonical file serializer → existing UI/read or supported file-copy/export/reimport → identical member reference meaning | Existing API mapper and subject serializer |
| DS-039 / Operational | First startup of this release → existing runPending sequence → updated family/authoring code → current-only definition admission → available new work or bounded unavailable item | Existing runner and registered migrations, then admission |
| DS-039l / Bounded local | Owned package candidate → known source validation → exact final candidate → atomic write if changed → strict reread/equality → existing result counts | Existing definition migration, no new state owner |
| DS-040r / Return | Migration result → existing runner record/log → Settings restart guidance and strict catalog availability | Existing migration runner/status projection |

The normal domain member scope and JSON codec use exactly
`shared | org_local | application_owned`. Build/read/update/default-save paths
use that same codec; no normal lowercase `agent_org_owned` acceptance, coercion
or retry. Team's `shared | team_local | application_owned`, its lack of member
refType, and all other fields/default/null/coordinator/handoff rules stay exact.

The Org owned-source index changes its **authored member filter** to `org_local`.
It still correlates the exact `ref` with the existing opaque ID builder and
physical owned Agent/flat-Team package. Never infer a new ref from a basename,
rewrite a prefix, scan arbitrary recursive Teams, or fall back to a shared source.
An unmatched or unavailable ref remains a normal admission/dependency failure.
Internal `ownershipScope`, descriptor `kind: agent_org_owned`, source ownership,
root/child paths and opaque definition identities remain unchanged.

**API choice:** retain the existing GraphQL enum spellings. The explicit
exhaustive boundary mapping is `SHARED ↔ shared`,
`AGENT_ORG_OWNED ↔ org_local`, `APPLICATION_OWNED ↔ application_owned`.
This is a transport mapping, not two admitted JSON spellings. Add no `ORG_LOCAL`
alias or broad ownership rename. Unsupported domain/API values fail rather than
fall through to application ownership. Existing web enum consumers stay valid;
read/edit/save roundtrips must nevertheless persist the new lowercase spelling.

Example of a current authored member (unchanged opaque ref):

```json
{
  "memberName": "research",
  "ref": "agent-org-owned-team:example-org:research",
  "refType": "agent_team",
  "refScope": "org_local"
}
```

**Diagnostics:** `AgentOrgDefinitionConfigParseError` retains
`DEFINITION_CONTRACT_INVALID` and identifies `members[index].refScope`, the
rejected value and the allowed replacement. Provider/admission attaches known
package root, definition ID/path and member context without inventing a valid
identity. Rejected `team_local`, unknown scopes, unknown fields, authored
schemaVersion, wrong family, invalid refs or topology remain errors. External
owner action requests a current package; it never edits that repository.

Package registration checks structure, not all semantic definitions. Keep the
existing registered-source availability boundary: one incompatible Org and its
dependents may be unavailable while unrelated valid definitions remain available.
No new export API is needed: provider files and existing supported file/package
copy/reimport must agree with normal create/read/save. Managed downloaded
external packages are still separate-owner/read-only for content migration.

### DS-039 — Update The Unreleased Migration In Place

**Data decision:** genuine pre-ticket zero/one-level Team definitions still need
the already-approved family transformation. Otherwise-current owned definitions
with a superseded authored version/scope need the bounded preservation required
by REQ-012/037. Current unversioned/new-scope definitions are directly usable,
zero-write. Repository examples/bundles are source/build updates. External
content is not an in-ticket writable cohort. Runtime trees, messages, tasks,
identity prefixes and paths are not changed by the naming delta; the original
family runtime conversion remains exactly as approved.

Use the existing `20260901_agent_org_flat_team_families_v1` and
`20260911_collaboration_definition_authoring_shape` code/IDs. **Add no migration.**
The latter is an existing bounded definition inventory in this unreleased
pipeline, not a new upgrade for a presumed deployed branch version. Its scope
already preserves otherwise-current owned packages and can be updated directly.
Registry order, runtime prerequisites and runner persistence policy stay as they
are. No manual status reset or replay of runtime work in user data is authorized.

1. Change the family migration's `teamTarget` to emit the exact final unversioned
   Team config directly. Keep its approved removal of redundant Agent refType.
2. Change its `orgTarget` to emit the final unversioned Org config directly;
   the established released `team_local` source mapping now writes `org_local`.
   Keep `buildAgentOrgOwnedDefinitionId`, all actual refs, member order, handoffs,
   defaults and root-family transformation unchanged. Do not touch
   `orgTreeTarget`'s runtime schemaVersion or runtime/sidecar codecs.
3. Use strict normal target codecs for every generated target and final reread,
   including direct owned Team children, prospective Org configs and cleanup.
   Never claim a version-bearing or retired-scope config is a current terminal
   target merely because a migration-only source reader accepts it.
4. Update the existing authoring-shape pass to select a final candidate in one
   operation: Team removes only the exact known authored version; Org also
   replaces exact former local member scope with `org_local`. When a file needs
   both corrections, publish once, not a version-then-scope pair of writes.
   If raw JSON already equals its strictly valid final candidate, skip without
   writing. This fulfills the explicit owned-preservation requirement without
   a separate spelling migration or a new normal reader.

**Migration-local structure:** rename the narrowly version-only helper to
`app-data-migrations/legacy/collaboration-definition-authoring-transition.ts`
and remove the old helper path/exports, without a compatibility wrapper.
Its family-specific pure functions accept the exact known source/current family,
return the final raw-value candidate, and validate using the current codec.
Recognize only numeric Team 2 / Org 1 when an authored version is present; remove
that key. For Org, map only `members[*].refScope === agent_org_owned` to
`org_local`. Reject unknown versions, fields, scopes or malformed structures.
Do not rebuild the payload from the normal codec's normalized return object:
all non-authorized JSON values, including handoff order/content, remain equal.
Older Team refType/topology decoding stays in the family migration; it is not
added to normal admission or this otherwise-current-shape helper.

Both existing migrations may reuse that pure candidate selection at source
validation, but only strict final shape plus committed/reread equality establishes
completion. Family preflight uses candidate equality to detect a conflicting
prospective target; if a supported source config needs the authorized field
correction, mark it write-required and publish the final candidate before rename
or cleanup. A same-attempt current prospective child/config is a zero-write skip.
No frozen historical intermediate, multi-release version ladder or semantic
comparison that allows an old on-disk target to masquerade as final is retained.

**Inventory and mutation owner:** reuse `listOwnedDefinitionPackages` and
`readOwnedDefinitionPackage`, with AppConfig's server-owned direct Team/Org
roots and one physical Org-owned Team level. Discover children before requiring
normal parent admission, deduplicate canonical paths and enforce ownership-root
containment. Missing optional roots are empty; required present-root read failure
is not empty success. Resolve any existing ordinary authoring transaction through
its existing package read/validator before selecting bytes; exclude its stage/
backup directories from independent definitions. No new journal, backup, database
schema or recovery action. Do not scan runtime directories to find definitions.

**Per-file postcondition:** use the existing atomic file writer; require committed
outcome, strict target reread and equality with the selected candidate. Verify
that removing the permitted version and mapping the permitted scope are the only
JSON differences. Preserve Markdown, Agent/assets/child files and IDs; a changed
config's normal content-derived revision hash may change. Actual dependency
resolution remains the admission owner's responsibility; conversion cannot invent
missing references. Genuine pre-ticket topology conversion retains its distinct
approved package rename/ref-rebasing rules, not this scope-only allowance.

**First-run and retry checks:**

| Supported starting state | Required outcome |
| --- | --- |
| Pre-ticket flat Team definition | Existing family migration writes final unversioned Team directly; authoring pass skips |
| Pre-ticket one-level organization-like Team | Existing family migration writes final org_local Org and unversioned owned Teams directly, validates, then performs the approved package move/cleanup |
| Otherwise-current owned Org with old scope, with/without known authored version | Existing definition transformation writes one final config; refs/meaning preserved |
| Already-final owned definition | Strict validation, zero write; normal resolution unchanged |
| Ordinary interrupted first attempt | Existing runner retries pending/failed entry; current files skip, exact source transforms; no fabricated release-version history |
| Unsupported owned source or target/read/write failure | Preserve source or committed final file, report FAILED and bounded unavailable state; independently valid items can complete |

Old development test databases containing SUCCEEDED entries remain historical
evidence, not production rollout authority. Downstream validates the release on
fresh isolated **pre-ticket** fixtures and then tests ordinary restart/idempotence
of that same implementation. Do not mutate other owners' retained fixtures or
user migration records to force tests. If a genuinely deployed completion were
later established, it would change this explicit premise and require reassessment;
it is not a reason to implement a speculative additional migration now.

### DS-040 — Status, Implementation Mapping And Review Obligations

Existing runner owns attempts/logs/restart guidance. The definition-only pass
reports `MIGRATED_AUTHORING_CONFIG` for a committed/reread changed final config,
`SKIPPED_CURRENT_DEFINITION` for current zero-write, and its existing failure
categories for invalid items/inventory. Aggregate bounded reason counts (version,
scope or both) may explain changes without per-item database payloads or content.
At most five sorted path examples per reason; no message/config body logging.

For the existing 20260911 definition entry: complete valid conversion/skips yield
`SUCCEEDED`; any required item/inventory failure yields `FAILED`, never
`SUCCEEDED_WITH_WARNINGS`. Old spelling/version is not a valid empty-metadata
exception. Preserve 20260901's no-warning cleanup rule and the separate 20260905
summary entry's valid-empty warning. No new status/API/Settings mechanism.

| Change | Existing or target path (relative to repository) | One responsibility |
| --- | --- | --- |
| Modify | `autobyteus-server-ts/src/agent-org-definition/domain/agent-org-definition.ts`; `providers/agent-org-definition-config.ts` under that subsystem | Tight authored type/current codec and actionable member-field reason |
| Modify | `autobyteus-server-ts/src/agent-org-definition/providers/agent-org-owned-definition-source-index.ts` | New authored filter; retain internal descriptor kind and exact ID/path correlation |
| Modify | `autobyteus-server-ts/src/api/graphql/types/agent-org-definition.ts` | Exhaustive existing-enum/current-domain mapping; no wire rename |
| Modify / verify | Org file provider, definition-admission service/source registry and package-service integration | Current read/write/error paths; no second codec or external mutation |
| Rename / tighten | `autobyteus-server-ts/src/app-data-migrations/legacy/collaboration-definition-versioned-config.ts` → `collaboration-definition-authoring-transition.ts` in the same directory | Pure bounded source-to-final authoring candidate; remove old helper imports/exports |
| Modify | `autobyteus-server-ts/src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.ts` | Initial final definition output, preflight/retry/cleanup checks; runtime transform unchanged |
| Modify | `autobyteus-server-ts/src/app-data-migrations/migrations/collaboration-definition-authoring-shape-app-data-migration.ts` | Existing one-pass owned inventory/transformation/reread/result; same ID/order |
| Verify unchanged | Registry, runner, owned-package inventory, transaction/atomic writer, runtime schemas, opaque-ID builders and Team scope | Reuse existing sequencing/recovery/identity mechanisms; add no migration |
| Modify | Focused codec/provider/index/admission/GraphQL and migration/registry tests; maintained current fixtures/packages and affected docs | Final normal authoring and first-run/restart controls; prior raw evidence remains immutable |

**Sequence:** current Org type/codec and exhaustive API mapping → index/diagnostic
consumers → update both existing migration implementations and shared candidate
helper together → current source fixtures/docs → deterministic real filesystem,
first-run/partial-retry/idempotence and authoring roundtrip validation → source
review, renewed executable validation and Delivery. This architecture round
changes documents only and claims no new executable or delivery pass.

**Risks and rejected shortcuts:** blind global replacement would corrupt internal
ownership; accepting both normal spellings hides invalid external packages;
freezing unreleased writers creates an unnecessary upgrade chain; normalizing
whole payloads can alter handoffs/defaults; migration-local acceptance must not
substitute for final target validation. VAL-059–063 cover each boundary. No
material Requirements/Product question remains under the clarified first-run
premise. Independent Architecture Review is selected before implementation.


## AD-REV-023 — Separate Org Inspection, Continuation And Stop (DS-035–037)

**Authority and supported scenario.** Approved RER-032 remains canonical;
REQ-004/016/019/025/031/034–036, AC-011/026/029–031 and SCN-012/015/018–020
supply the existing history/status/retained-participant behavior. The user supplied
DR-009 restart/history screenshots, identified terminate-to-launch divergence,
and explicitly asked to update this design. This repairs our realization of the
established Team experience; no Requirements edit, new Product screen, or runtime
policy decision is needed. `architecture-history-inspection-investigation.md`
records HIST-INSPECT-001/002 and the exact source comparison. Earlier source at
`5fb16658e` and local `origin/personal@5645b49d6` opens Team history without restore,
restores on Send, and keeps the selected conversation after successful stop.

Current source at `00c3aeea7` has two contrary branches in
`useWorkspaceHistorySubjectActions.ts`: configured selection calls restore at
line 83; successful selected-root stop redirects to configuration at lines 37–49.
Tests explicitly expect both. `AgentOrgExecutionContext.setActive(false)` also
clears selection and closes the context. Changing only route literals or colors
would leave continuation or stopped conversation access incomplete. The existing
Org inspection API already returns strict inactive snapshots without constructing
runtimes. IR-044 / `25436ef4d` fixes live Org draft submission and must be preserved.

**Design health.** Bug correction; root cause is a boundary/ownership error plus
a missing invariant: presentation selection was treated as lifecycle intent.
Refactor needed now, bounded to browser context/interaction integration: give the
existing `agentOrgContextsStore` one coherent browser operation boundary and keep
`agentOrgRunStore` as its thin server command adapter. Reuse the existing context,
inspection, streaming, local submission and shared surfaces. No generic lifecycle
coordinator, parallel Org state store, queue, provider abstraction or backend
rewrite. No deferred competing restore-on-click path is allowed.

### Spines And Governing Owners

| Spine | Supported trigger | Main line through meaningful outcome | Governing owner |
| --- | --- | --- | --- |
| DS-035 inspection | After a normal server restart or stop, user opens a root or selects a configured direct/mounted Agent, Team or retained task | History/route -> typed subject action -> Org context store -> existing strict inspection query/service/manager -> retained member projections -> atomic Org context -> same conversation and truthful status, no activation | Context store owns browser publication; server manager owns coherent package reads |
| DS-036 continuation | User types and presses Send for an eligible inactive configured Agent | Shared composer -> exact continuation port -> Org context store local submission -> existing restore mutation/service/manager/full-scope builder if inactive -> ready correlated stream -> exact SEND_MESSAGE -> canonical ACK/event -> same conversation with draft cleared | Context store owns browser submission/transition; existing Org root owns runtime activation and command admission |
| DS-037 stop | User presses an existing active Org root's terminate button | Root row -> typed action -> context store stop operation -> existing terminate mutation/service/manager -> authoritative inactive fact -> retire transport -> retained historical context -> same selected conversation Offline | Existing server root terminates; context store transitions presentation without new-run navigation |
| DS-035r / DS-037r | Coherent inspection completes, or root reports inactive | Strict candidate/inactive fact -> context publication -> history activity projection + exact Agent status + mounted-Team aggregate + conditional route mode synchronization | Context publication owns data; existing selection/router and panel retain their separate presentation responsibilities |
| DS-036l | A deliberate send waits for restoration/snapshot while the user changes focus or edits a draft | Capture root/Agent/context/payload -> one local submission -> root operation latch -> fully correlated candidate -> exact prepared transport send -> release/failure | Bounded operation inside the context store, not a runtime job or new FIFO |

The initiating scenarios are supported normal product actions, witnessed by the
user and earlier Team source. Multi-click, focus switching and editing during an
await are normal consequences of those visible controls. They justify only local
pending/identity guards. Corrupt files, forced process kills and test-only state
mutation do not justify additional migration/replay/recovery machinery here.

### DS-035 — History Is Observation, Not Activation

All Org root/member/Team history navigation enters `openForInspection(orgRunId)`
on the existing context store and selects the exact requested execution. It may
reuse a coherent context or issue `GetAgentOrgRunInspection`; authoritative active
results attach to the existing live stream, inactive results hydrate history.
A stale row's `isActive` or URL `mode` is not permission to restore.
Remove the current inspect early-return merely because a service object exists:
only a coherent ready context is reusable. A stale/reopen-required service is
retired or reconciled through existing checkpoint/inspection ownership before
publication. During this store's pending continuation/stop, browsing may change
selection in the retained context but cannot start a competing candidate commit.
Existing stream loss/checkpoint recovery may read/reconnect, never call restore. Configured Team
selection still resolves its captured coordinator for display only; fresh launch
remains unfocused. Exact task links never resolve by basename or configured source.

`AgentOrgExecutionContext` remains the sole context/index/facet aggregate; it does
not import Pinia/router/API clients. Keep identity/projection selection there;
compose command capabilities at `agentOrgContextsStore.activeTargetFor(orgRunId)`.
Replace callers of the context's old combined `activeTarget()` with that boundary;
its projection-only selection method returns the exact context/facets, not a raw
transport send port. Remove the aggregate transport field/constructor requirement
if it exists only for that former command factory; live state truth comes from
the validated snapshot, while live command availability is composed by the store.
No caller bypasses the submission owner by taking a stream interaction directly.

Add one browser-only access variant to the existing target union:

```ts
type WorkspaceAccess =
  | { access: 'live'; interaction: AgentInteractionPort }
  | { access: 'continuable'; continuation: Pick<AgentInteractionPort, 'send'> }
  | { access: 'read_only' };
```

`continuable` means a validated inactive Org's exact **configured** Agent can
receive a deliberate new user input after root restoration. It is not a runtime
status and has no interrupt/approval/configuration-write capability. Selected
mounted-Team coordinators are eligible only as their exact configured Agent.
Stopped/settled task executions remain `read_only`, including task Agents whose
address equals a configured Agent. Live eligible task inputs retain current
server admission. Reopen-required/unknown authority never fabricates live or
continuable capability. Shared composer renders for live/continuable targets;
true read-only targets retain existing read-only controls. Standalone Agent/Team
adapters and their resume policy are unchanged. No extra Resume button/dashboard
or label is required: use the established Send interaction.

The route keeps the same OrgRun ID and exact member/Agent identity. Mode reflects
observed active/history state; it does not control activation. Same-root mode
changes must not unmount the workspace or disconnect/reconnect its stream. The
workspace watcher opens/attaches on root changes and applies selection separately.
Browse actions cannot be disabled merely because the old global restoring flag
is true. A missing/invalid target yields existing unavailable/error presentation,
not activation or automatic selection of a different Agent.

### DS-036 — Deliberate Send Owns Continuation

Use one Org browser submission entry inside `agentOrgContextsStore` for both live
and continuable ports, with explicit `{orgRunId, agentRunId, memberAddress}` and
the captured `AgentContext`. Check the current exact identity/capability and root
operation state before consuming any draft. Capture text/attachment values; do
not re-resolve the currently focused Agent after an await.

Move the IR-044 local-submission portion from `AgentOrgStreamingService` into this
existing context owner, preserving `beginLocalUserSubmission`, null navigation
side effects, messageId/dedupeKey, edit tracking and failure behavior. It runs
exactly once, before waiting for restoration, so the submitted draft clears and
pending state is visible immediately. The stream becomes the strict transport
for that **prepared** message identity/payload; it must not call begin again.
This is relocation of the implemented composer fix, not its removal. Use the
existing helper handle as the operation's in-memory submission handle; add only
exact Org/Agent correlation and generated message identity needed by transport.
No persisted draft/job/token, optimistic Org summary or fake Team navigation.

For inactive roots, the context owner holds one per-root in-flight continuation
latch and invokes the existing `agentOrgRunStore.restore` once. A second conflicting
continuation or stop while this operation is pending is disabled/rejected with
existing busy/error feedback, not silently queued or replayed; its draft is not
consumed. Do not serialize independent ordinary live Agent sends under a new root
queue. Per-Agent submissionPending continues to guard duplicate live submissions.
After restore succeeds, attach the stream and await its **existing validated
CONNECTED/snapshot publication barrier**, exposed as a readiness promise instead
of polling or sleep. Reconcile the ready context before sending. If an inspection
has already established that another supported caller made this root active,
attach without another restore. Do not turn arbitrary restore errors into a
silent retry; existing server transition/admission remains authoritative.

At publication, preserve exact matching `AgentContext` object identity for local
composer state: after full candidate validation, adopt candidate config/runtime/
conversation projections into each matched old context, leaving its local draft
and attachments intact. Correlate by root + AgentRun ID + address, not address
alone. Carry the in-flight local submission into the candidate conversation using
existing messageId/dedupeKey upsert; it is local pending presentation, not an
accepted message or history-summary fact. Perform this commit synchronously with
candidate registration so delayed textarea edits still target the same context.
Do not merge unrelated old runtime state or partial/unvalidated projections.
Use the same commit boundary for inspection/stop candidates; new identities get
new contexts. Tests must exercise Vue reactivity and pending debounce, not only
plain-object equality.

Then send the prepared text/references to the captured AgentRun ID once through
the ready stream. Current focus may now be another Agent or another root; it is
not changed back to the send target. Route mode may be synchronized only if still
viewing this root, preserving the latest selection. Same-root publication/mode
change cannot retire the transport needed by the pending send. If the view leaves
this root during the operation, defer its normal transport disposal until that
explicit operation finishes; completion must not navigate the user back.

On preparation/restore/readiness failure, retain the conversation and use the
existing local failure presentation. Restore the submitted draft only when no
newer draft edit occurred; never overwrite another Agent's draft. A restore that
succeeded before readiness failed may have made the runtime active: show unknown/
recovery truth and inspect/reconnect, not a fabricated successful send or rollback.
Never automatically replay SEND_MESSAGE after an ACK timeout/disconnect. The
accepted ACK still drives the DS-027 authoritative Org summary refresh; canonical
message echo reconciles the same ID once. History read, status changes and model
reply are not input-clearing triggers.

### DS-037 — Stop Retains The Conversation

Typed stop delegates to `agentOrgContextsStore.stopAndInspect(orgRunId)`, which
uses the existing command adapter and row pending/error handling. The context
store owns browser transition/cancellation, not server shutdown. No change to
AgentRun fences, task drain, root registration, mounted-Team ownership or runtime
restore cohorts. On confirmed success, retire the stream/recovery timers and
pending commands **without deleting the context or selection**. Replace the
current `setActive(false) -> clear selection/closed` presentation path with an
idempotent transition to `historical`: same root and exact selection, no live
command port, configured Agents continuable, tasks read-only, current statuses
Offline and pending runtime controls cleared. Apply the same transition on a
correlated root-inactive stream event; stale retired-generation callbacks cannot
reopen/republish it. Explicit view disposal is separate from root inactivity.

Retain the last committed conversation while fetching the existing strict stopped
inspection snapshot for final task/message/projection truth. A failed refresh
shows an error/last-known content without erasing the conversation, inventing
terminal task records, returning to launch, or leaving stale live controls. Only
successful termination or authoritative inactive evidence changes runtime status;
a failed terminate request does not optimistically mark the root stopped.

Synchronize the selected route to `mode: history` with the **same** orgRunId and
latest exact selection; do so only if the user still views that root. Stopping a
background root must not hijack a different workspace. Preserve the current
center conversation, panel expansion and left-tree state. New configuration is
reachable only by the existing explicit new-run/catalog Run action, not by Stop.
The familiar conversation/new-input surface stays; no bespoke stopped dashboard
is introduced for a selected Agent. Unfocused roots keep their existing prompt.

The existing `runHistoryStore` remains the single history read owner. A confirmed
stop/active snapshot may update only that row's activity fact through a named
method, invalidate older in-flight family refresh generations, and synchronously
publish navigation before refreshing normally. Under AD-REV-028 / DS-047, every
activity-bearing history/root inspection read AND each member projection acquired
for the staged final context must originate independently at the physical Apollo
request boundary; a newer logical token cannot inherit an old in-flight response.
Both full/focused history reads, root inspection and the existing shared staged
member reader use network-only plus per-operation queryDeduplication false,
retaining exact identity, current-generation, activity-conflict and candidate
commit guards. Independent root acquisition alone does not make its child reads
fresh; neither adoption nor a post-response local revision closes that gap. This is an authoritative command/snapshot fact, not optimistic
runtime status or summary. A failed fresh read retains that fact; do not invent
per-Agent statuses or a second activity cache. Existing
Agent status/Team aggregate functions continue to read exact live context truth
or historical Offline. Never paint a genuinely active runtime grey to hide a
restore bug.

### Interfaces, File Mapping, Removal And Change Sequence

| Action | File / boundary | Responsibility and forbidden shortcut |
| --- | --- | --- |
| Modify | `autobyteus-web/stores/agentOrgContextsStore.ts` | Public inspection, target composition, live/continuable submission, stop-to-history and candidate commit; bounded operation latch and selection-safe release. Calls command store and transport, never server internals. |
| Modify | `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts` | Exact projection/facet selection, historical transition, preserve selected identity and matched AgentContexts; no store/router imports or raw public send bypass. |
| Modify | `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts` | Prepared-send transport, existing correlation/ACK/recovery, readiness promise and inactive notification; retire transport without destroying retained presentation; local submission moves out, not duplicated. |
| Modify | `autobyteus-web/services/agentOrgExecution/agentOrgContextHydration.ts` | Stage strict projections as today; collaborate with the single commit boundary for matched-context/pending-message preservation. No restore or mutation in read hydration. |
| Modify | `autobyteus-web/composables/useWorkspaceHistorySubjectActions.ts` | All browse actions inspect/select; stop delegates to context operation; selection/router conditional synchronization only. Remove direct restore-on-select and stop-to-configuration. |
| Modify | `autobyteus-web/types/workspace/activeAgentWorkspaceTarget.ts`; `stores/activeContextStore.ts` | Explicit continuable send-only capability; dispatch to one Org submission boundary; interrupt/approval require live access. Do not fake live access to enable a button. |
| Modify | `components/workspace/org/AgentOrgWorkspaceView.vue`; shared Agent/Team workspace surfaces and composer access consumers | Preserve same-root center across mode changes, existing input/edit pending semantics and read-only task controls. No automatic restore in route/mount/reconnect watchers. |
| Modify | `stores/runHistoryStore.ts`; `components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` and existing history action tests | Activity fact stays with one read owner; browsing is not gated as restoration; truthful root/Agent status and no stale-generation regression. |
| Preserve / reuse | `stores/agentOrgRunStore.ts`; `services/runSubmission/localUserSubmission.ts`; member-input upsert; status fold; exact browse/facet DTOs | Existing command APIs, null-navigation local submission, deduplication, status and identity semantics; no Team-only history effects or new persistence. |
| Modify tests | Subject actions; Org context/stream/hydration/composer tests; workspace/history integration; API/browser journeys | Replace tests endorsing wrong routes; cover VAL-054–058 and preserve COMPOSER-001 tests. |

Sequence: add target capability and owner/transport separation; implement atomic
context/pending-message preservation and readiness; connect deliberate continuation;
replace configured browse and stop branches; reconcile mode watchers, history
activity and error behavior; remove obsolete direct transport/restore paths and
contrary tests; validate shared Team controls and full user journeys. No redundant
new file/module/store is required: the existing Org context subsystem is the
semantically appropriate browser owner. Server command store remains reusable
without becoming another context owner.

**Review and evidence inventory.** Canonical inquiry:
`architecture-history-inspection-investigation.md`; separate live-composer
finding: `architecture-composer-submission-investigation.md`. Both remain source
evidence rather than competing design authority. Preserve the approved requirements,
contract, all three Product specifications/manifests and earlier architecture
review records in the cumulative handoff. No new Product artifact applies.

**Persistence transition:** Not Affected. This round changes when existing restore
and terminate commands are deliberately invoked, not the authored/runtime schema,
package readers/writers, sidecars or stored interpretation. Existing strict Org
inspection already reads these packages without materialization. Normal deliberate
restore may perform its already-approved repair/binding work; do not replay a
migration, backfill histories, or alter runtime versions for this UI correction.

**Risks / validation:** accidental restore from any browse/watch entry; stale
transport publishing after stop; mismatched configured/task identity; duplicate
local/echo input; lost newer draft during hydration; successful restore plus failed
readiness misreported as stopped; history refresh resurrecting a stopped badge;
background stop/completion stealing selection. VAL-054–058 specify deterministic
barriers plus real restart/stop/continuation journeys. No new timeout, retry queue,
force kill, replay, Product gate or Requirements revision is authorized. Prior
schemaVersion removal, task presentation, full-scope activation and shutdown
mechanisms remain unchanged. This is a completed design, not an executable pass.

## Task Size And Architectural Risk (Mandatory)

Current AD-REV-028: task_size=Large / architectural_risk=High cumulative; focused Medium/High. AR-FIND-009 completes DS-037/047 for the exact member projections consumed by final staged inspection. History/root-read correction and exact status/publication owners remain. Concurrency and retained-state correctness, not content volume, require independent revised-impact Architecture Review. ARCH-REV-024 failed AD027 only on this omitted dependency; prior AD026 / ARCH023 Pass remains scoped history.

### Prior AD-REV-025 Result — Exact Attachment Ownership / Saved References

- task_size: `Large` cumulative; focused `Medium`.
- architectural_risk: `High`, focused and cumulative.
- Selected route: independent Architecture Review under the revised-impact rule.
- Structural surface: closed attachment owner/URL contract, exact physical draft
  scope, shared client/service consumers and migration-owned saved locator values.
  These change API/persistence/correlation boundaries despite a compact UI effect.
- Payload surface: source fixtures, known structured URI fields and docs. Their
  count (including the 166 observed URIs) does not determine size/risk.
- Reuse: current context-file services, stored-only location, AgentContext,
  submission/preview owners and initial migration. No new runtime subsystem,
  migration ID or presentation dashboard.
- Runtime ownership/definition naming remain reviewed; AD-REV-024 is passed.
  IR-048 is a combined blocked checkpoint, not a partial implementation handoff.
- New self-validation VAL-064–069 is design-level only. Independent review,
  actual filesystem/REST and fresh API/E2E/user verification remain required.

### Prior AD-REV-024 Result — Org Local Authoring / First-Run Output

- task_size: `Large` cumulative; focused `Medium`.
- architectural_risk: `High`, focused and cumulative.
- Selected route: independent Architecture Review under the revised-impact rule.
- Structural evidence: strict authored type/codec, provider/source discovery,
  API-domain mapping and existing owned-definition transition change together.
  Normal data must retain exact reference semantics after first startup. No new
  runtime subsystem or migration entry is justified.
- Payload evidence: current examples/fixtures/docs need targeted spelling edits;
  their count does not drive size/risk. Saved test-output configs are historical
  evidence, not deployed-installation inventory or editable current fixtures.
- The house test is not content-only: current structural readers reject the new
  literal. High reflects contract/persistence impact, not broad parent history.
- Prior source/API/review passes retain recorded scope. No retroactive failure or
  new executable/delivery pass is inferred by this approved change.

### Prior AD-REV-023 Result — History / Continuation / Stop Recovery

- task_size: `Large` (cumulative); focused correction `Medium`.
- architectural_risk: `High` (focused and cumulative).
- Selected route: independent Architecture Review under the revised-impact rule.
- Evidence: browser lifecycle triggers, command-capability union, submission and
  context-publication ordering span several frontend boundaries. High reflects
  inadvertent activation, exact recipient/draft loss and stale live controls;
  no content-count rationale or backend/persistence rewrite is asserted.
- Prior passes retain recorded scope. The copy-only direct route does not cover
  this new impact; implementation of DS-035–037 waits for independent review.

### Prior AD-REV-022 Result — Copy-Only Re-entry

- task_size: `Small`.
- architectural_risk: `Low`.
- Selected route: `Implementation Engineer` under the Small/Low rule.
- Evidence: one English localization value plus affected copy assertions;
  existing renderer, read models, keys and runtime consume it unchanged. The
  structural-versus-payload and target-versus-delta checks find no ownership,
  interface, persistence, security, concurrency, route or lifecycle alteration.
  No additional independent architecture review is warranted for this literal.
- The prior cumulative parent classification remains Large/High, with its
  selected architecture review already passed for AD-REV-021. This is an
  explicit scoped routing decision, not a downgrade of that parent or exemption
  from the active source/API/Delivery gates. The user already requested this
  one-word change from the existing Implementation Engineer; the formal package
  below synchronizes authority, not a second implementation task.

### Parent Package Classification And Prior-Round Rationale (Unchanged)

- Parent package task size: `Large`
- Size rationale and supporting evidence: The payload population is only 23
  external definition roots used as topology evidence, three observed
  server-owned definition sources, and 43 execution trees at the RER-017 probe,
  but the cumulative code delta changes definition ownership/admission, flatness
  validators, a new AgentOrg
  runtime aggregate and durable store, root-neutral Agent/flat-Team execution
  extraction, private Team/Org task-message-event adapters, process lifecycle,
  migration authority, launch/configuration APIs, history/stream/workspace
  discriminated projections, task host ownership,
  atomic handoff authoring, separate frontend definition/configuration
  surfaces, the concrete Agent presentation stream/context/workspace extraction
  required to reuse the accepted live conversation surface, and the shared
  presentation-only mounted-Team status projection reconciled by AD-REV-007.
  AD-REV-012 also replaces the bespoke AgentOrg mounted-Team override tree with
  the established Team launch disclosure/editing components while retaining a
  separately owned Org draft and launch serializer. AD-REV-013 tightens that
  serializer into the single canonical frontend patch boundary, restores the
  Team-equivalent root workspace default, and replaces route-selected competing
  history panels with one tagged mixed Workspace read model.
  AD-REV-009 additionally tightens the shared task-settlement admission check,
  both Team/Org local task registries, and both root shutdown sequences so an
  active provider turn is never awaited by a settlement attempt at the root
  mutation FIFO head. AD-REV-010 completes that sequence by fencing accepted and
  provider-start-pending Agent input at the AgentRun boundary and threading the
  phase through every direct, mounted, task-Agent, and recursive task-Team scope.
  The focused AD-REV-007 delta is a bounded frontend projection/refactor and
  would be `Medium / Low` in isolation; it adds no backend contract or durable
  field. The focused AD-REV-009/010 recovery is `Medium / High` in isolation because it
  is a bounded internal concurrency/shutdown correction across the shared task
  engine, AgentRun input owner, and both root subjects. The cumulative package remains Large because all prior
  structural work remains the implementation/review scope. A repository scan found
  207 consumers of Team-root field names and
  11 direct configured-definition recursion consumers before tests and generated
  transport code. Those structural surfaces, not record count, make the task
  Large.
- AD-REV-011 delta classification: `Small / Low` in isolation because the
  revision corrects one contradictory Architecture-owned validation statement
  and introduces no implementation surface. It does not lower the cumulative
  `Large / High` classification or bypass the selected Architecture Review
  route.
- AD-REV-012 delta classification: `Medium / Low` in isolation. It is a bounded
  frontend presentation/state refactor across the existing AgentOrg run-config
  panel/store/projector and the already accepted Team launch components. It
  changes no server API, launch precedence, durable schema, migration,
  lifecycle, transport, or runtime owner. It is Medium rather than Small because
  exact Team/Agent override maps, Team workspace draft selection, shared
  disclosure state, serialization and desktop/narrow accessibility tests must
  remain coherent. The cumulative ticket remains `Large / High`.
- AD-REV-013 delta classification: `Medium / High` in isolation. It changes no
  public API or persistence, but it corrects a cross-layer launch-patch
  invariant and consolidates a shell-wide Workspace/history projection owner.
  The source delta is bounded to frontend configuration, navigation/history and
  tests. High reflects the risk of silently launching a different effective
  provider configuration or exposing competing history/lifecycle authorities.
  The cumulative ticket remains `Large / High`.
- AD-REV-014 delta classification: `Small / Low` in isolation. It changes only
  Architecture-owned responsibility wording and file allocation for DS-025:
  the mixed read model owns history data/projection, while the always-mounted
  panel plus its single tree-state composable owns presentation continuity. No
  source mechanism, interface, API, persistence, concurrency, lifecycle, or
  Product behavior changes. The cumulative ticket remains `Large / High`.
- AD-REV-015 delta classification: `Medium / High` in isolation. The visible
  presentation already exists, but the correction crosses the Org WebSocket
  command boundary, exact execution-kind observation/eligibility filtering, serialized derived
  history mutation, authoritative live read refresh, and one registered
  historical metadata migration over Org packages and complete Agent trace
  corpora. No public or durable run schema changes. High reflects the
  first-writer concurrency and persisted-data recovery boundary, not UI volume.
  The cumulative ticket remains `Large / High`.
- AD-REV-016 delta classification: `Small / Low` in isolation. It is an
  Architecture-document-only correction that scopes migration completion
  statuses by migration ID and updates current downstream navigation. It adds
  no source mechanism, behavior, interface, schema, persistence, concurrency,
  lifecycle, or rollout change. The cumulative ticket remains `Large / High`.
- AD-REV-017 delta classification: `Medium / High` in isolation. The durable
  message record and strict Org presentation contracts already exist, but the
  correction crosses post-durable AgentOrg event ordering, configured-member
  identity admission, active-target composition, root-wide perspective
  projection, contextual right-tool selection, reconnect/restore hydration,
  and desktop/narrow accessible presentation. High reflects the consequence of
  making an accepted message disappear or duplicate while its sidecar remains
  correct. It changes no public schema, persistence format, routing, command
  acknowledgement, or lifecycle authority. The cumulative ticket remains
  `Large / High`.
- AD-REV-018 delta classification: `Small / Low` in isolation. It tightens the
  already-designed post-commit eligibility predicate from receiver-only to the
  committed sender/receiver execution-kind pair and expands deterministic
  validation. It adds no source owner, persistence, schema, event, route, queue,
  lifecycle, or Product behavior. The cumulative ticket remains `Large / High`
  and therefore still requires independent Architecture Review.
- AD-REV-021 focused classification: `Small / Low`: bounded copy and display/
  interaction adjustments in existing shared presentation, its read-only task
  adapters, and focused tests. No new runtime/API/persistence/security/concurrency
  owner or contract. It is not made High by old record volume. Cumulative
  `task_size=Large` / `architectural_risk=High` remains for this unfinalized parent
  package; dynamic routing therefore selects independent Architecture Review
  with a focused review of DS-034 and preserved cumulative authority.
- AD-REV-020 focused classification: `Medium / High`: authored definition
  serialization/admission, public diagnostic shape and startup stored-definition
  transition change across existing owners. Runtime versions are not changed;
  cumulative Large/High still selects independent Architecture Review.
- AD-REV-019 focused classification: `Medium / High`: existing root/task/message
  authorities remain, but exact task selection, participant read facets, accepted
  system-input projection and an Org inspection query cross frontend/API read
  boundaries. The content inventory is not the risk driver. Cumulative
  `Large / High` selects independent Architecture Review.
- Parent package architectural risk: `High`
- Risk rationale and supporting evidence: The work changes public contracts,
  persistence family and sidecar selection, Agent/Team/Org lifecycle and tagged
  identity ownership, full-scope candidate publication/fail-stop ordering, startup
  migration, definition transaction semantics, and frontend/runtime projection across
  multiple repositories. A wrong family classification or partial cutover can
  make run history, tasks, memory, or packages unreachable or create two
  canonical authorities for one identity. Incorrect external admission can
  either activate retired packages or strand compatible definitions globally.
  Source and the correlated `API-FIND-008` evidence prove that current settlement
  calls provider quiescence at the shared task FIFO head. `ARCH-REV-006` correctly
  rejected the unsupported self-review as a behavioral premise; AD-REV-009 is
  instead grounded in normal submit/independent-accept overlap and application
  shutdown of a task Agent waiting on a legitimate approval-gated tool. The
  `ARCH-REV-007 / AR-FIND-004` trace additionally proves a supported normal
  task's accepted initial input can sit between AgentRun admission/provider
  dispatch and canonical turn start when SIGTERM arrives. AD-REV-010 makes
  provider-start admission and the irreversible root-shutdown fence one
  AgentRun-owned serialization contract. The correction changes shared
  concurrency and shutdown ordering, so risk remains High even without a schema
  or public API change. AD-REV-015 adds a separate persisted-derived-data risk:
  live title selection must follow accepted-result order without changing task
  command admission, stale browser reads must not replace the catalog winner,
  and historical recovery must refuse ambiguous chronology rather than fabricate
  user content. The registered migration and exact owner/test boundaries contain
  that impact without changing the run or transport schemas.
- Parent route: `Architecture Review`, satisfied through ARCH-REV-019 for AD-REV-021; current AD-REV-022 copy-only routing is stated above.
- Escalation trigger if implementation or validation discovers new impact:
  `IDI-001` is resolved by AD-REV-005, `ADI-007` is resolved by AD-REV-006,
  and `API-FIND-007` / `CR-FIND-011` is resolved at the design boundary by
  AD-REV-007. `API-FIND-008` / `CR-CAND-020` / `AR-FIND-003` is resolved at the
  design boundary by AD-REV-009; `AR-FIND-004` is resolved by AD-REV-010 without changing the approved durable boundary,
  and `AR-FIND-005` is resolved by AD-REV-011 by removing the stale contradictory
  validation statement without changing the core design, task record shape,
  tool contract, or user-visible task state machine. `CR-FIND-020` is resolved
  at the design boundary by AD-REV-012 under approved RER-023; the already
  implemented `CR-FIND-019` behavior remains a separate regression obligation.
  The user-reported Electron launch/shell/default defects are resolved at the
  design boundary by AD-REV-013 under approved RER-024, and
  `ARCH-REV-011 / AR-FIND-006` is resolved by AD-REV-014's exact history-data
  versus tree-presentation state ownership split. RER-025's missing Org title
  lifecycle is resolved at the design boundary by AD-REV-015: exact configured
  external-message qualification, catalog-owned first-write serialization,
  authoritative live refresh, and deterministic migration-only trace recovery. Return
  `Design Impact` if RER-026 parity cannot be implemented by publishing the
  already-defined receiver member-input event after the existing durable Org
  commit, or if the existing Org sidecar/context cannot project one root-wide
  selected-Agent Messages perspective without another store/schema or a
  mounted-Team root. AD-REV-018 resolved AR-FIND-008 under RER-026. RER-028
  supersedes its configured-only restriction; AD-REV-019 now requires every
  admitted same-root pair, exact task participant identity/Tasks relevance and
  truthful accepted system-input history. Review and expanded implementation/
  source/API validation remain required; prior scoped passes are not new proof. Return
  another `Design Impact` if a non-quiescent execution cannot be detected without
  waiting at the task FIFO head, if idle/status events cannot retry deferred
  settlement, if a root cannot freeze a stable complete scope before task
  drain, or if any accepted/provider-start-pending input can start provider work
  after its AgentRun root-shutdown fence completes. Also return
  `Design Impact` if implementation cannot realize the
  specified root-neutral internal capability plane while preserving both public
  subject owners, or if it needs to change the approved exact
  Team V2 or AgentOrg V1 schema/file/path boundary, needs a generic persisted
  root file, cannot preserve Team-only wire compatibility where retained, needs
  configured depth beyond Org -> Team -> Agent, requires a new cross-run route,
  or changes launch/focus/handoff semantics. Return `Requirement Gap` if any
  approved definition config version/member shape/admission policy or durable
  key/version/path/discriminator must change, a Product decision is required,
  or evidence contradicts `PRE-001`-`PRE-005`.

### Structural Versus Payload Classification

- Payload surfaces: 23 read-only external definition packages used as evidence,
  the cutover inventory of server-owned definitions, 43 current Team V2 trees,
  their Markdown/JSON bodies, derived catalogs/indexes, fixtures, generated
  code, and Product reference assets.
- Structural surfaces: domain subjects and validators; definition source
  ownership; root run owners; strict readers/writers and two physical package
  families; fixed-depth migration; history/stream/GraphQL unions; launch and
  focus semantics; address/handoff/task ownership; frontend stores/routes;
  AgentOrg launch-draft projection/shared Team presentation, canonical sparse
  patch serialization, route-stable mixed Workspace/history data projection plus
  one mounted tree-state presentation owner, and root workspace default
  selection; and
  the shared task mutation/terminal-settlement/shutdown concurrency boundary;
  and the AgentOrg accepted-message/history-summary write, live refresh, and
  migration-only legacy recovery boundary; and the AgentOrg post-durable
  all-participant receiver presentation, independent root Messages/Tasks read
  facets, exact task selection and stopped-root inspection boundaries (DS-028–030).
- House test: the existing structure cannot expose coordinator-free AgentOrg
  truthfully, because normal roots are `RootTeamRun`, strict storage requires
  `rootTeam.coordinatorAddress`, configured Team recursion is legal, and mixed
  transport has no root-kind discriminator. Conversely, it already consumes a
  flat Team correctly and must not be rewritten.
- Target-versus-delta result: the separate AgentOrg root/runtime/store, preserved
  Team V2 family, mixed projections, fixed-depth conversion of only the
  organization-like cohort, recursive configured-Team removal, and approved UI
  are in this round. AD-REV-009/010 also correct idle-gated terminal-task settlement,
  interrupt-before-drain root shutdown, and the pre-turn-start Agent input fence
  while preserving the approved task states, records,
  tools, and outcomes. AD-REV-012 is the bounded frontend-only delta: it reuses
  the accepted Team launch presentation beneath an Org-owned draft/projector and
  unchanged Org command. AD-REV-013 remains within that approved behavior: it
  aligns client preview with server resolution, keeps the left Workspace shell
  stable across route changes, and applies the existing Team root workspace
  policy to Org roots. AD-REV-017/018 is likewise bounded: it completes the
  already stored Org message's established receiver and selected-member
  presentation. AD-REV-019 removes its superseded kind restriction and completes
  task selection, Tasks relevance and retained history using existing records.
  No task lifecycle or message delivery route is redesigned. Dynamic membership,
  cross-run routing, shared Agent
  instances, and new product-visible task semantics are not.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Approved requirements package | requirements-doc.md; investigation-notes.md; requirements-revision-record.md; RER-029@0f5014405 | Explicit both-family removal of authored schemaVersion; preserve other fields, source ownership and runtime versions. | DS-031–033, AC-021/032/033 and SCN-021/022. | No Product/Requirements gap; independent engineering validation remains. |
| Approved RER-025 summary parity | `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/requirements-doc.md`; `investigation-notes.md`; `requirements-revision-record.md` | `BEH-016` / `REQ-033` / `AC-028` / `SCN-017` approve the first accepted non-empty external user message to an exact configured direct or mounted-Team Agent as the stable Org summary, define exact Team normalization/exclusions/live update, and permit conservative unique-earliest trace backfill only. No Product or durable run-contract change remains open. | Add one derived-history write/read/recovery spine without reopening AgentOrg execution, focus, routing, or UI layout. | None. |
| Current Org summary write gap | `autobyteus-server-ts/src/services/agent-streaming/agent-org-stream-handler.ts`; `run-history/services/agent-org-run-history-catalog-service.ts`; established Team handler/catalog/helper | Team records only after exact Agent acceptance and catalog serializes first non-empty summary; Org executes and acknowledges but has no corresponding mutation. Org index/GraphQL/web decoder and row already carry/render `summary`. | Mirror the established Team normalization/write rule at the Org service/catalog boundary; add exact configured-recipient qualification because the Org execution index also contains task Agents. | Implementation must preserve truthful accepted command acknowledgement if a separate derived-index write reports an operational error. |
| Earlier test-application title evidence | `/root/.autobyteus/server-data/memory/agent_org_run_history_index.json`; configured-member raw trace beneath `agent_orgs/aorg_e2e_direct_agents_org_e6a704d1e8734870b8d0a4f425010ced`; `/root/.autobyteus/server-data/memory/team_run_history_index.json`; user screenshots `ctx_f1133d7d05d9__image.png` and `ctx_9b7731d65643__image.png` | Three observed test-app Org rows are empty while one has the accepted user trace `test your handoff rules please`; six observed test-app Team rows are non-empty and the existing Org row falls back to `New - ...`. | The defect is missing derived metadata plus live invalidation and legacy recovery, not a new component or execution-tree field. | Exact executable migration outcome remains downstream validation. |
| Current trace and physical-location boundary | `agent-org-execution/services/agent-org-execution-index.ts`; `agent-org-execution/services/agent-org-execution-tree-location-service.ts`; `agent-memory/store/agent-memory-layout.ts`; `agent-memory/store/memory-file-store.ts`; `agent-memory/services/runtime-memory-event-accumulator.ts`; Org communication/task sidecars and their deterministic input builders | The strict Org tree distinguishes `executionKind:'configured'` from task executions and derives exact direct/mounted physical scopes. Complete raw-trace corpus reading includes archived plus active records; forwarded user traces carry `trace_type:user`, content, timestamp and `source_event:AgentRun.postUserMessage`, but intentionally omit `input_origin`. Root communication/task records retain the facts needed to identify their deterministic internal input envelopes. | Migration enumerates only configured Agent nodes from the strict Org V1 tree, reads their complete exact corpora, and consults root sidecars only as negative provenance evidence. Equal earliest chronology, a nonqualifying match, missing evidence, or invalid candidate/exclusion evidence remains unresolved/fallback. | A raw user trace alone does not prove external origin; the migration must require a complete, contradiction-free causal prefix and never promote a later trace after excluding an earlier one. |
| Current live history read owner | `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts`; `stores/agentOrgContextsStore.ts`; `stores/runHistoryLoadActions.ts`; `WorkspaceAgentOrgHistoryCollection.vue` | Accepted Org command ACKs currently resolve without invalidating the strict `ListCollaborationRootHistory` slice. The row component already observes `run.summary`; no reload is technically necessary if the read owner refreshes its immutable slice. | On accepted `SEND_MESSAGE` ACK, invoke an injected quiet AgentOrg-family refresh owned by the existing mixed history store. Share one monotonic family request generation so an older in-flight response cannot overwrite the post-commit summary. | No optimistic client summary and no stream-contract field. |
| Normative contract | `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/agent-org-contract.md` | Exact current Team Definition Config, current Org Definition Config, Team run V2, Org run V1, source classes, admission diagnostics, transition, and mixed-reader rules are approved. | Treat two field-free definition shapes and two versioned runtime families plus ownership/admission as upstream constraints. | Internal modules and rollout mechanics remain architecture-owned. |
| Worktree verification | git worktree list --porcelain; git rev-parse HEAD; git status --short | Isolated requirements/flat-agent-organization-model, RER-029@0f5014405; other-owner dirty delivery evidence/docs present. | Architecture files only; no source/external/release mutation. | No competing worktree created. |
| Current downstream baseline | IR-038; source checkpoint 14a94fc45; ARCH-REV-017, CRR-058/059, API-REV-024; DR-008 | Task-inclusive parity passed its recorded scope; built candidate still has prior numeric definition formats. | Definition-only impact, no old task/UI finding reopened. | Fresh RER-029 source/API/Delivery checks required. |
| AgentOrg versus Team durable-commit event path | `agent-org-execution/services/agent-org-communication-adapter.ts`; `domain/agent-org-run.ts`; earlier Team `services/team-communication/team-communication-message-append-plan.ts` at `5fb16658` | Earlier Team publishes receiver input for accepted task endpoints too; current Org post-commit path gates both endpoints as configured. | Remove Org kind gate; keep exact index validation, one record and root-before-member-before-release order. | Four-direction exact-once tests required. |
| Earlier Team task parity | `architecture-task-parity-investigation.md`; baseline `5fb16658e7bd2aefd750f99eb596a17382e161ac`; local `origin/personal@5645b49d` | Four core publication/task/message files are unchanged across the earlier pins. Tasks relevance is exact delegator, assigned Agent or members of assigned fresh Team; ordinary messages include task locations. | Reuse accepted components/selector semantics; no claim of legacy configured-only parity. | Read-only comparison, not old-branch runtime validation. |
| Accepted task system input | `root-task-lifecycle-engine.ts:174-192,335+`; `configured-agent-execution-handle.ts:118-136`; `task-agent-execution-registry.ts`; existing `task-delegation-system-message-visibility.ts` | Task save precedes separate notify; handle publishes only on accepted input. Current generic member input mislabels SYSTEM as user; suppression helper exists but is unused. | Keep engine commit/warning semantics; one shared accepted system-input presentation using existing type and suppression convention. | Runtime-specific duplicate/accepted-rejected controls required. |
| Exact retained task projection | `agent-org-execution-tree-location-service.ts`; `agent-org-member-run-view-projection-service.ts`; `agentOrgContextHydration.ts`; shared run-tree records | Nodes retain actual task run/platform IDs and host, but projector borrows source binding and web seeds placeholder definition/root launch. | Frozen source supplies config only; actual task node supplies binding/physical identity; no migration. | Missing projection must not masquerade as empty. |
| Stopped inspection boundary | `agent-org-run-manager.ts:90-149,209+`; `agent-org-execution-view-projector.ts`; Org GraphQL and workspace view | Manager owns strict stores/transition queue; current full checkpoint query is active-only and stopped workspace lacks task inspection. | Add service-owned readonly query and reuse strict view decoder/context with no activation. Serialize inactive package read against manager lifecycle transitions. | See DS-029 explicit lock scope; no new task/shutdown algorithm. |
| Supported task-to-configured exact-ID path | `root-task-lifecycle-input.ts`; `send-message-to-dispatcher.ts`; `global-agent-run-message-router.ts`; `root-communication-engine.ts`; Org execution index | Normal work packet gives delegator AgentRun ID; supported exact-ID send records both endpoints, including task-Team Agents. | Present every admitted pair without changing admission; resolve both exact identities. | No logical task alias or fallback is introduced. |
| AgentOrg selected-member projection gap | `agentOrgExecutionContext.ts`; `agentOrgCommunicationPerspective.ts`; `agentOrgTeamPresentation.ts`; `activeAgentWorkspaceTarget.ts`; `CollaborationOverviewPanel.vue`; `WorkspaceAgentOrgHistoryCollection.vue` | Current Org Messages excludes tasks; Tasks depends on Team view/local lookup; task rows cannot select; focus address cannot distinguish a task from its configured source. | One retained execution index, exact selection and independent Messages/Tasks facets under Org context. | DS-029 and VAL-041–045 specify reconciliation. |
| API-FIND-019 real product witness | `api-e2e-evidence/API-REV-013/post-pass-user-discovery/API-FIND-019-agentorg-communication-visibility-gap.md`; four user screenshots attached to RER-026 | Direct `/lead` to `/verifier` delivery and reply succeed. AgentOrg lacks receiver-center inbound presentation and a right Messages surface; standalone Team shows both inbound/outbound selected-member perspectives and Activity. | Treat as a supported normal user scenario and mixed root-presentation Design Impact, not a new delivery mechanism or bespoke UI request. | Renewed real-browser validation must cover the full RER-026 matrix. |
| Architecture Review round 15 (historical) | `ARCH-REV-015@920240026`; AD-REV-018 / ARCH-REV-016 Pass | AR-FIND-008 was resolved by a configured-pair predicate under RER-026. | RER-028 expressly supersedes that behavior; keep prior record for audit, remove predicate now rather than supporting two policies. | A fresh review of AD-REV-019 is required. |
| Architecture Review round 13 | `design-review-report.md`; `architecture-review-revision-record.md`; `ARCH-REV-013@d9baab112` | DS-027's live path and historical mechanism pass, but AR-FIND-007 identifies contradictory terminal-status authority because one combined convention table mixes the family migration's no-warning rule with the summary migration's bounded-warning rule. | Qualify every convention and outcome row by migration ID: family cleanup/unsupported-source failures remain `FAILED` with no warning disposition; independently valid empty summary rows without unique evidence contribute `SUCCEEDED_WITH_WARNINGS`, while required current-structure and selected-value write/reread failures remain `FAILED`. | None after AD-REV-016 documentation reconciliation; another independent review is required. |
| User Electron launch evidence | Supplied screenshots `ctx_d447ee010eb5__image.png`, `ctx_21d6681af54c__image.png`, `ctx_b956b806fc6f__image.png`, `ctx_fcf2f19f0f06__image.png`, and `ctx_02bf252bf8a2__image.png`; current delivered Electron build | Exact Agent override selects AutoByteus + DeepSeek Flash but launch fails; entering Org config replaces the populated Workspace/history shell; a new Org root and inherited mounted Team expose an empty workspace and disabled Run. The user confirms the established Team path does not behave this way. | Treat the three observations as connected architecture/implementation defects under accepted Team-equivalent launch behavior; do not require a Product supplement to prescribe component defaults or serialization. | Executable reproduction and fix validation remain downstream work. |
| Frontend effective-config versus wire serialization | `autobyteus-web/utils/teamRunConfigUtils.ts:39-45`; `components/workspace/config/MemberOverrideItem.vue:450-460`; `AgentOrgRunConfigPanel.vue:338-360`; current AgentOrg config tests | The UI's effective-config helper clears model config when runtime or model identity changes, but `MemberOverrideItem` emits no owned `llmConfig` on a changed model and the Org serializer therefore omits the field. Existing tests accept that sparse shape without comparing it to server resolution. | Add one canonical Org launch-patch mapper that preserves sparse inheritance but emits explicit `llmConfig:null` whenever runtime/model identity changes without an explicit compatible config; test client/server equivalence. | No GraphQL field is missing. |
| Server launch resolution | `autobyteus-server-ts/src/agent-collaboration/services/collaboration-launch-configuration-resolver.ts:24-37,71-100`; `agent-org-run-service.ts` complete validation | The authoritative resolver is field-wise: omitted `llmConfig` inherits, while an owned `null` clears. Thus the current Org wire patch can inherit root Codex/GPT reasoning config into an AutoByteus/DeepSeek placement even though the browser preview shows null. | Keep the server contract and validation authoritative; correct the frontend command boundary rather than adding a second server inference rule. | None after cross-boundary golden tests. |
| Route-selected left-panel ownership | `autobyteus-web/components/AppLeftPanel.vue:77-93,137-142`; pre-AgentOrg `origin/personal@5fb16658` AppLeftPanel | Current code switches from `WorkspaceAgentRunsTreePanel` to `AgentOrgRunHistoryPanel` solely when `/workspace?rootSubjectKind=agent_org`; the accepted earlier shell always mounted the Workspace tree. Route transition therefore swaps state owners and visual/history surfaces. | Keep one route-stable Workspace/history component and one tagged mixed read model; integrate Org roots into it and delegate root-specific actions through typed ports. Remove the route-selected competing panel. | Exact row extraction is implementation detail within the prescribed boundary. |
| Root workspace-default divergence | `AgentOrgRunConfigPanel.vue:25-31`; `TeamScopeConfigEditor.vue:49-68`; `WorkspaceSelector.vue`; current root/mounted-Team config flow | Team root explicitly enables `auto-select-default`; Org root explicitly disables it. Mounted Team scope correctly avoids an independent default, but with an empty Org root it inherits nothing and the run is blocked. | Apply the established default-selection policy once at the AgentOrg root. Mounted Team and Agent rows project root inheritance unless their exact scope owns a workspace override. | No API or persistence change. |
| Architecture Review round 1 | `design-review-report.md`; `architecture-review-revision-record.md`; `ARCH-REV-001@899c60a70` | Major design passed; AR-FIND-001 exposed the definition format/scope boundary and AR-FIND-002 exposed reversed handoff order. The user clarification converted AR-FIND-001 into the RER-018 requirement revision. | Implement RER-018 admission/ownership exactly and preserve current root-owned-before-Team-local effective order. | None. |
| Canonical production migration convention | `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`; server README `Production migration practice` | Requires known-source/fixed-target transformation, forward-only runtime, existing-runner retry, narrow final-state classification, bounded diagnostics, and no bespoke journal/restoration/crash matrix absent a separate reachable contract. | Replace AD-REV-003's custom journal/staging/backup protocol with atomic current-file writes, one package rename, ordinary startup retry, capability-scoped exclusion, runner-owned status/log/recovery action, and one interruption/idempotence test. | None. |
| Existing app-data runner and startup | `autobyteus-server-ts/src/app-data-migrations/app-data-migration-runner.ts`; `domain/app-data-migration-types.ts`; `app-data-migration-registry.ts`; `migrations/team-run-execution-tree-v2-app-data-migration.ts`; `autobyteus-server-ts/src/server-runtime.ts` | Runner owns record/attempt/log, ordered prerequisites, `STARTUP_ONLY` `RESTART_TO_RETRY`, and aggregate status; server continues through capability-scoped migration failures and rebuilds strict catalogs. The prior Team Run V2 migration uses exact old/current classification, the established atomic writer, strict reread, sorted disposition counts, and at most five examples. | Register one startup-only definition after Team Run V2 and follow that migration's bounded result shape; do not add runner/ledger/Settings recovery machinery or a blanket fatal gate. | Exact root/definition readiness projection is new but bounded. |
| Architecture Review round 2 | `design-review-report.md`; `architecture-review-revision-record.md`; `ARCH-REV-002@614f705ff` | Independent review passed AD-REV-003/004, including strict target admission, root-first handoff order, split run families, and convention-compliant migration. | Preserve those passed decisions while revising only the implementation-proven internal execution composition gap. | AD-REV-005 requires another independent review before implementation resumes. |
| Implementation Design Impact `IDI-001` | `implementation-handoff.md`; `implementation-revision-record.md`; uncommitted draft under `autobyteus-server-ts/src/agent-org-execution/` | `IR-001` proves that an injected Org activator is not a production composition. The draft cannot create Org-direct AgentRuns, mounted Team executions, Org task hosts, root-owned sidecars, message/event routing, fail-stop persistence, or restore/shutdown without Team-root assumptions. | Replace the vague lower-level reuse statement with explicit internal contracts and composition; treat the draft as evidence only and leave it untouched. | None after AD-REV-005; implementation must rebase the draft onto the revised design. |
| Configured Agent coupling | `agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`; `services/member-team-context-builder.ts`; `domain/team-run-context.ts`; `domain/team-member-execution-identity.ts`; `domain/team-run-physical-scope.ts` | The handle consumes `TeamRunContext`, creates `TeamMemberExecutionIdentity`, resolves Team memory, emits Team events/bindings, and injects a resolver returning `RootTeamRun`. | Extract a root-neutral configured-Agent handle/context/identity/physical scope; keep Team and Org event/persistence translation above it. | None. |
| Task/message root coupling | `agent-tools/task-delegation/task-delegation-tool-*`; `agent-team-execution/task-delegation/task-delegation-service*.ts`; `services/team-communication/team-communication-service.ts`; Team task/message sidecar stores | The tool resolver returns `RootTeamRun`; the services accept Team tree/index/mutator/persistence types and sidecars correlate only by `rootTeamRunId`. Record bodies themselves do not contain a Team-root field. | Inject a selector-free `MemberTaskCommandCapability`, share only root-neutral record/FIFO engines behind subject adapters, and add strict Org sidecar envelopes while keeping Team sidecars exact. | None. |
| Team local execution coupling | `mixed-team-run-backend-factory.ts`; `mixed-sub-team-run-factory.ts`; `mixed-team-manager.ts`; `domain/team-run.ts` | A useful local Team execution exists, but its factory creates Team-root scope and its configured registry still materializes configured child Teams. Task-Team materialization is a separate valid recursive mechanism. | Extract `FlatTeamExecutionFactory` that accepts an explicit root host/scope, owns direct Agent handles plus task descendants, and never creates a root package; remove configured-child materialization. | None. |
| Memory/location evidence | `agent-memory/store/agent-memory-layout.ts`; `agent-memory/services/agent-memory-location-service.ts`; representative Org-like package directory listing | Relative paths are already `<root>/<teamRunId...>/<agentRunId>`; a whole-package family rename preserves direct root Agent directories and Team/task lineage directories. | Use tagged root physical scope plus unchanged relative TeamRun lineage; Org direct Agents use zero Team ancestors and mounted Team Agents include the mounted Team run ID. | None. |
| Process composition evidence | `agent-execution/runtime/general-process-run-supervisor.ts`; `application-platform/execution/application-execution-scope-kernel-builder.ts`; `application-execution-shutdown-coordinator.ts`; `global-agent-run-message-router.ts` | General and application scopes construct AgentRun then Team manager; shutdown stops Team then Agent; global same-root routing hard-codes `AgentTeamRunManager`. | General scope constructs shared execution factories/directory, then Team and Org managers; closes Org before Team before Agent. Application scope remains Team-only but uses the extracted factories. Global same-root delivery dispatches by tagged active-root directory. | None. |
| Code Review re-entry | `code-review-report.md`; `code-review-revision-record.md`; `CRR-013` | IR-012 passes cumulative source review, CR-FIND-012/013/014 are resolved, and API-FIND-008 / CR-CAND-020 is held without speculative implementation attribution. | Preserve the source-pass baseline, classify only supported reachability at Architecture, and require review before task-lifecycle source changes. | None after AD-REV-009; implementation reconciliation and renewed validation remain required. |
| API-FIND-008 clean control | `api-e2e-evidence/API-REV-002/followup-api-find008/correlated-rerun-observed-boundaries.md` | One isolated request-revision/resubmission crosses provider, MCP, root queue, durability, publication, notification, and provider result in 14 ms; direct application-owned shutdown exits 0. | Preserve the supported task states/tool results and reject timeout/replay machinery; the defect requires concurrent terminal settlement, not ordinary resubmission. | None. |
| API-FIND-008 exact reproduction | `api-e2e-evidence/API-REV-002/followup-api-find008-settlement/settlement-correlation-observed-boundaries.md`; `boundary-evidence-assertions.log`; `run3-*-excerpt.jsonl` | Accepted verifier settlement becomes FIFO head and `prepareTerminationOnce` waits on a live provider turn; an unrelated analyst command queues and SIGTERM cannot complete. The retained long wait, however, was induced by an unsupported verifier self-review approval. | Use this only as technical evidence for the queue/termination coupling. It does not establish supported behavior and does not justify a coordinator, replay, timeout, or new persisted state. | Supported reachability is established separately below. |
| Architecture Review round 6 | `design-review-report.md`; `architecture-review-revision-record.md`; `ARCH-REV-006@2ad4bcc06` | AR-FIND-003 blocks AD-REV-008 because VAL-026/027 treated the unsupported self-review wait as a supported BEH-009 trigger. AR-PREM-004/005 are Unclear; no Requirement or Product gap exists. | Reclassify the invalid run, establish independent supported paths, and remove disproportionate AD-REV-008 machinery before another review. | None after AD-REV-009 evidence and scope reconciliation. |
| Supported submit/accept overlap | Verifier trace `api-e2e-evidence/API-REV-002/live/server-data/memory/agent_teams/aorg_e2e_research_squad_406e38c2bf72449ea5685e1489282463/aorg_e2e_verifier_e8de47b91a8243b2ab2ecea5c39552f6/raw_traces_active.jsonl`; delegator trace in sibling `aorg_e2e_lead_ba085468b828408abb166692912680fc/raw_traces_active.jsonl`; `codex-thread-event-name.ts`; `agent-run.ts`; `root-task-lifecycle-engine.ts` | The supported assignee `submit_task_result` returned at `1788292703.598`; the different authorized delegator received the notification and accepted at `1788292706.652`; the assignee's same canonical turn had not terminated. Source confirms local MCP tool completion and canonical `turn/completed` are distinct, and submission commits/notifies before returning. Events after `1788292709.932` are unsupported self-review and are excluded. | A terminal settlement attempt may validly overlap the assignee's normal final provider-turn interval. It must perform a non-waiting quiescence check and defer/retry on the existing idle event; unrelated root task commands remain runnable. | Deterministic controlled-backend coverage is required; no invalid tool call may be used. |
| Supported approval-wait shutdown | Product `ui-ux-spec.md` (`Auto approve tools`); `server-runtime.ts`; `general-process-run-supervisor.ts`; `root-task-lifecycle-engine.ts`; `root-team-run.ts`; `agent-org-run.ts`; `agent-run.ts`; `agent-run-input-admission-state.ts`; `node_modules/autobyteus-ts/tests/integration/agent/runtime/agent-runtime.test.ts` approval-interrupt case | A supported task Agent may wait on a legitimate approval-gated tool when auto-approve is off. Application SIGTERM is a supported operational trigger. Agent input remains non-quiescent until canonical completion/interruption; the accepted runtime test proves interrupt terminalizes pending approval. Current Org shutdown invokes task settlement before Agent/Team interruption, and Team awaits an initial task drain before its interrupt phase. | Both root subjects must close/freeze and interrupt the exact owned scope before task drain/settlement. Shutdown-created interrupted task records then settle through the existing transaction after AgentRuns are quiescent. | Exact Team and Org phase-order tests plus one real application-handler shutdown are required. |
| Current task/shutdown source | `agent-collaboration/execution/task/root-task-lifecycle-engine.ts`; `root-task-lifecycle-command-queue.ts`; Team/Org task adapters; task Agent/Team registries; `root-team-run.ts`; `agent-org-run.ts`; `agent-run.ts` | `settleAtHead` awaits adapter settlement; registries call `prepareTermination()` before proving provider/input quiescence; AgentRun preparation waits unresolved input. The existing idle events already reschedule terminal sweeps. Team and Org roots already own the exact scope needed to interrupt before task drain. | Add one non-waiting AgentRun/local-execution `tryPrepareTerminationIfQuiescent` boundary, defer settlement when it returns null, retain the existing prepared settlement/one FIFO/deepest-first sweep, and reorder root shutdown to interrupt before task drain. | None after the target contract below. |
| Architecture Review round 7 | `design-review-report.md`; `architecture-review-revision-record.md`; `ARCH-REV-007@6cec1ee1b` | AR-FIND-003 is resolved and AD-REV-009's one-FIFO prepared-or-null direction is proportionate. AR-FIND-004 identifies one supported shutdown race: normal task `releaseWork()` may admit or begin provider input before canonical `TURN_STARTED`; active-turn-only interruption then accepts `NO_ACTIVE_TURN` and can finish before that provider start. | Preserve AD-REV-009 and add one bounded AgentRun-owned root-shutdown fence covering reserved/committed/queued/claimed/provider-start-pending input plus active turns. | None after AD-REV-010; independent review and executable validation remain required. |
| AgentRun admission/dispatch race source | `agent-execution/domain/agent-run.ts`; `input/agent-run-input-admission-state.ts`; `input/agent-run-input-contract.ts`; `configured-agent-execution-handle.ts`; `flat-team-agent-execution-handle.ts`; `frozen-team-run-termination-scope.ts` | `postUserMessage` claims under `dispatchQueue` but calls `startInputDispatch` after the queue closure; `interrupt` rejects `activeTurn=NONE`; the root wrapper maps that result to success. Admission already defines `cancelled / AGENT_RUN_TERMINATED_BEFORE_INPUT_FORWARD`, but the state owner never emits it. | Serialize claim-to-provider-start registration with the shutdown fence, use the existing cancellation lifecycle for pre-forward entries, arm interrupt intent for provider-started/pre-`TURN_STARTED` input, and keep the phase open until terminal. | No public/durable contract uncertainty. |
| Root scope stability source | Team `root-team-run-materialization-gate.ts`, `flat-team-execution-manager.ts`, task Agent/Team registries; Org root-Agent registry, Team directory, task adapter and `agent-org-run.ts` | Team's root operation gate already tracks admitted operations and frozen local scope already captures active/prepared Agent handles plus recursive task Teams. Org owns the equivalent direct-Agent/mounted-Team/task registries but currently has no composed frozen termination scope. | Close and drain only the admitted operation/materialization publication gate needed to establish a stable handle set; then compose direct Org handles and every mounted/task Team frozen scope and invoke the per-Agent fence before general task drain. | Implementation must not drain terminal settlement before this phase. |
| Origin/personal shutdown history | `git show origin/personal@773bce779:.../agent-run.ts`; same root/registry files; AgentRun test `drains claimed and queued inputs in FIFO order before provider termination`; commits `1e7837929` and `f7d65ad75` | Origin/personal has the same claim-then-start gap and active-turn-only root interruption. Its normal termination intentionally drains admitted FIFO input, and its Stop Team regression began with an already-active approval wait. Root tests mocked interruption and never placed a barrier between input admission/provider dispatch and `TURN_STARTED`. | Treat AR-FIND-004 as a latent shared AgentRun/root-shutdown gap, not an AgentOrg-specific regression. Add a distinct irreversible root-shutdown fence while preserving ordinary prepared-termination drain semantics. | None; this historical explanation is evidence, not a requirement change. |
| Architecture Review round 8 | `design-review-report.md`; `architecture-review-revision-record.md`; `ARCH-REV-008@a6f712265` | AR-FIND-004 is resolved and the AD-REV-009/010 core design passes, but AR-FIND-005 identifies one stale VAL-006 sentence that still prescribes withdrawn AD-REV-008 cleanup jobs/concurrent work outside the root FIFO. | Correct only VAL-006 to deepest-first leaf eligibility through the existing FIFO, prepared-or-null quiescence, idle-event retry, and parent eligibility after settled children; retain all core design boundaries. | None after AD-REV-011; another independent review is required. |
| Architecture self-validation | architecture-design-self-validation.md | 50 walkthroughs; VAL-046–050 add current authoring, transition, inventory, failure and runtime-preservation checks. | DS-031–033 follow actual current owners and existing runner. | Design walkthroughs only, not executable passes. |
| Code Review CR-FIND-020 | `code-review-report.md`; `code-review-revision-record.md`; `CRR-021`; current `AgentOrgRunConfigPanel.vue` and `AgentOrgPlacementOverrideRow.vue` | The production Org panel follows the old VIS-015 interaction: opening the outer section exposes every mounted Team's Agent children, Team inherited state is implicit, and one component fabricates an Agent-shaped form node even for a Team row. The user selected full AgentTeam launch-hierarchy parity, not a badge-only patch. | Treat this as approved Product/design impact, remove the bespoke Team branch, and reuse the established Team scope/tree/editor presentation contract behind an Org-specific projector and command adapter. | None after RER-023 and the focused design below. |
| Accepted Team launch implementation | `origin/personal@5fb16658e`; current `TeamRunConfigForm.vue`, `TeamMemberConfigTree.vue`, `TeamScopeConfigEditor.vue`, `MemberOverrideItem.vue`; `git diff origin/personal -- <four paths>` | The four current production components are byte-identical to origin/personal and already own outer progressive disclosure, independently collapsed Team scope rows, explicit inherited/customized state, coordinator-on-Agent identity, Team fields, Agent fields, draft-preserving `v-show`, keyboard semantics and narrow-safe layout. | Reuse these components directly; do not create a second Org-specific Team editor or duplicate the styling/state policy. Keep Team and Org state/projectors separate above the view-model boundary. | The compact outer disclosure markup is still embedded in TeamRunConfigForm; extract only that small stateless/shared disclosure shell if needed to guarantee parity. |
| Approved override Product package | `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/AORG-TEAM-OVERRIDES-001/ui-ux-spec.md`; `user-decision-record.md`; manifest; `VIS-OVR-001`-`VIS-OVR-006` | User-approved states cover initial outer collapse, outer-open/all-Teams-collapsed, one inherited Team expanded, Team customization retained after collapse/reopen, exact-Agent customization, and `390x844`; Product explicitly preserves direct Agent behavior and all runtime/domain boundaries. | Use the reference set as the visible/browser authority and keep prototype local state/services non-authoritative. | None. |
| Current Org draft and launch API | `agentOrgRunConfigStore.ts`; `agentOrgRunStore.ts`; `agent-org-run.ts`; `agent-org-run-service.ts`; `collaboration-launch-configuration-resolver.ts` | The server/API already accepts separate sparse Team and Agent placement patches, including `workspaceRootPath`, and authoritatively resolves root -> Team -> Agent. The web store currently collapses Team/Agent patches into one `AgentConfigOverride` map and its serializer omits Team workspace, even though the accepted Team scope editor exposes it. | Split the web draft into exact `teamOverrides` and `agentOverrides`; map Team workspace selection to the existing placement `workspaceRootPath`; do not change GraphQL/server types or resolution. | Implementation must verify current runtime/model-catalog and workspace operation adapters used by Team editing can be supplied without importing `teamRunConfigStore` into the Org owner. |
| Definition model/codec | `agent-team-definition/providers/agent-team-definition-config-v2.ts`; `agent-org-definition/providers/agent-org-definition-config-v1.ts` at source `14a94fc45` | Prior numeric fields are required/serialized; older Team refType remains migration-only. | DS-031 renames/tightens current codecs; DS-032 isolates prior numeric validation and preserves existing migration outputs. | No runtime version change. |
| Recursive resolution/compiler | `autobyteus-server-ts/src/agent-team-definition/services/team-definition-graph-resolver.ts`; `team-handoff-compiler.ts` | Configured Teams are traversed recursively and local handoffs are recursively rebased. | Replace normal configured recursion with explicit Team-local and fixed-depth Org compilers; preserve recursive task traversal separately. | None. |
| Persistence-before-validation pressure | `autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts`; `file-agent-team-definition-provider.ts` | Create can write before full graph validation/rollback; `team.md` and config files are not one crash-safe parent transaction. | Validate a complete candidate first and use a revisioned, journaled definition-package commit. | None. |
| Planner/config | `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts`; `services/team-definition-topology-planner.ts` | Root is always a Team node and planner/index construction is recursive. | Keep a flat Team planner/service and add a fixed-depth Org planner/service; share only tight placement/config primitives. | None. |
| Existing configuration precedence | `autobyteus-web/types/agent/TeamRunConfig.ts`; `utils/teamRunLaunchHierarchy.ts`; `stores/teamRunConfigStore.ts`; server `team-definition-topology-planner.ts` | Root, Team-placement, and Agent-placement overrides already exist conceptually and are expanded before activation. | Extract a server-authoritative fixed-depth resolver for Org and root->Agent specialization for Team; web preview mirrors the pure merge vocabulary. | Workspace creation stays separate from focus. |
| Team runtime | `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts`; `domain/team-run.ts`; `backends/mixed/mixed-team-manager.ts` | `RootTeamRun` correctly owns standalone Team lifecycle; useful AgentRun candidate and local Team/task mechanics exist, but their current constructors, contexts, callbacks, and paths assume a Team root. | Retain Team aggregate/service/manager for standalone Team; extract the explicit root-neutral configured-Agent handle and rootless flat-Team local factory specified by AD-REV-005, then compose them under separate Team and Org root adapters. | None at the architecture boundary; a different ownership/interface split requires another Design Impact. |
| Recipient resolution | `autobyteus-server-ts/src/agent-team-execution/services/team-recipient-resolver.ts`; `services/team-execution-index.ts` | `/` is rejected; Agent resolves directly; Team resolves through coordinator; current traversal is recursively generic. | Give Team and Org aggregates explicit same-root resolver methods over a shared canonical address parser and exact execution index. | None. |
| Web focus | `autobyteus-web/services/teamExecution/teamExecutionViewState.ts`; `stores/agentTeamContextsStore.ts`; `stores/agentSelectionStore.ts`; `stores/runHistorySelectionActions.ts` | Current Team focus is non-null and repaired to coordinator/first Agent. | Preserve coordinator-first standalone Team behavior; add nullable Org focus and remove fallback from the mixed Org view path. | None. |
| Task lineage | `autobyteus-server-ts/src/agent-team-execution/task-delegation/**`; `domain/team-run-execution-tree.ts` | Task Agent/Team records attach to an exact host; task Team recursion is distinct from configured membership. | Reuse task record shapes and lifecycle services; add Org root as a legal host without adding configured members. | No unmounted/global task selector is authorized. |
| Native Team V2 | `autobyteus-server-ts/src/run-history/store/team-run-execution-tree-schema.ts`; `team-run-execution-tree-path.ts`; `team-run-execution-tree-store.ts`; `agent-memory-layout.ts` | Exact schema 2/rootTeam/file/path is already authoritative and strict. | Keep current store/path and exact serialized keys; narrow configured `rootTeam.members` validation to Agents. | Existing organization-like roots must be converted before normal flat-Team restore. |
| New Org V1 need | Same Team V2 sources plus approved `AORG-CONTRACT-001` | Team V2 cannot encode `rootOrg` or omit root coordinator under exact validation. | Add separate strict AgentOrg V1 domain/schema/path/store under `$MEMORY_ROOT/agent_orgs`. | None. |
| Mixed stream/API truth | `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`; server team execution projector; current GraphQL history types | Current external shape is Team-only. | Retain Team-only DTOs/endpoints where useful and compatible; add discriminated mixed-root contracts with `root_subject_kind`; never guess a family from payload shape. | Generated clients must be regenerated for new mixed/Org surfaces. |
| Current definition UI/API | `autobyteus-web/components/agentTeams/**`; `useAgentTeamDefinitionFormState.ts`; `agentTeamDefinitionStore.ts`; server GraphQL `agent-team-definition.ts` | Team form offers nested Teams; complete handoff authoring is absent; parent mutation already exists. | Separate Org and Team drafts; add owner-scoped From/To/When editing; save the complete parent candidate with CAS. | None. |
| Approved Product UI | `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/AORG-FLAT-TEAM-001/ui-ux-spec.md`; `user-decision-record.md`; `visual-references/visual-reference-manifest.json`; `VIS-001`-`VIS-020` | RV-012 is approved and normative for distinct surfaces, direct-to-config Org Run, full-scope/no-focus activation, exact focus, task lineage, desktop and narrow views. | Map normative UI state to production owners without adopting mocked persistence/orchestration. | None. |
| Product validation | `browser-validation-rv-012.json`; `validation/final-package/final-package-validation.json` | 59/59 browser checks, 6/6 package checks, and 20/20 image hashes/dimensions pass. | Product gate is closed. | Production correctness remains downstream engineering work. |
| Definition ownership/inventory | `team-definition-source-paths.ts`; `app-config.ts`; `git ls-files '*team-config.json'`; source scan | The 23 public/private roots are read-only external evidence (3 organization-like). Observed server-owned sources are one writable data-root Team and two built-in application Teams, all current legacy flat configs. | Inventory source classes separately; migrate only server-owned sources; never derive write permission from definition ID or runtime history. | Cutover inventory, not observed count, is authoritative. |
| Run inventory | Python/`jq` re-probe of `/home/autobyteus/data/memory/agent_teams/*/team_run_execution_tree.json` | 43 readable V2 trees; 27 Agent-only; 16 one-level organization-like; none deeper. Runtime ownership is server-side regardless of definition origin. | Flat Team packages are no-op; convert every cutover-time organization-like package to Org V1. | Cutover inventory supersedes historical count 41. |
| Representative Org-like V2 | `/home/autobyteus/data/memory/agent_teams/software_development_department_09e8e85e26524e7d9dd869866c27496b/team_run_execution_tree.json` | Root coordinator plus direct Agent/Team records; child Teams are Agent-only and coordinator-led. | Project only root subject/identity/coordinator semantics and package family; preserve direct records and task hosts. | Definition snapshot may differ from current package, so migrate run snapshots independently of mutable definitions. |
| Requirements baseline promotion | `requirements-doc.md`; `requirements-revision-record.md`; `RER-019@f3035a2d5` | RER-019 records Product baseline activation only; BEH/REQ/AC/SCN and RV-012 behavior are unchanged. | Synchronize current authority to RER-019 without reopening prior durable/runtime decisions. | None. |
| Approved active-workspace visuals | Product `ui-ux-spec.md`; VIS-016, VIS-017, VIS-018; baseline supplements VIS-PROMOTE-002/003/004 | The approved Org has a prompt-only unfocused center; direct Agent focus is the accepted Agent header/conversation/composer; Team focus is the accepted Team-member header/conversation/composer. There is no custom dashboard or focused-member `Stop Org` button. | Reuse concrete accepted Agent/Team surfaces through an Org focus adapter; root stop remains outside member header. | Header action commands must use subject ports while preserving visible accepted chrome. |
| API/E2E real-browser Design Impact | `api-e2e-coverage-investigation.md`; `api-e2e-evidence/API-REV-001/screenshots/02-org-active-unfocused-desktop.png`; `03-org-live-raw-events-defect.png`; user VNC image `ctx_f8a08ac8c866__image.png` | Real imported definition/full stack/Codex launch and exact focus passed, but a real prompt rendered large raw AGENT RUN JSON and bespoke MEMBER INPUT cards; source fallback is `JSON.stringify(item.event)`. | Classify `ADI-007` as a presentation-contract/ownership defect and revise transport, browser state, component reuse, command parity and stop placement before testing resumes. | No Requirement/Product gap; executable validation must resume only after revised design review and implementation. |
| Defective Org workspace source | `autobyteus-web/components/workspace/org/AgentOrgWorkspaceView.vue`; `stores/rootExecutionViewStore.ts`; `services/rootExecution/rootExecutionViewState.ts`; `@autobyteus/collaboration-stream-contracts/root-execution-view-dtos.ts` | One component owns header/raw events/composer/termination; store retains opaque events; live DTO uses `z.unknown`; client supports only SEND_MESSAGE. | Remove the parallel presentation path; strict typed event union, Org execution context, interaction port and thin focus adapter are required. | None. |
| Accepted Team/Agent production presentation | `AgentWorkspaceView.vue`; `TeamWorkspaceView.vue`; `AgentTeamEventMonitor.vue`; `AgentEventMonitor.vue`; `AgentUserInputForm.vue`; `activeContextStore.ts`; `TeamStreamingService.ts`; `teamExecutionViewState.ts` | Mature path projects typed Team Agent messages into `AgentContext`, uses shared conversation/trace/composer, handles local submission, interrupt/tool approval, and supplies accepted headers/right tools. | Extract prop/port-driven surfaces and generalize the active-target facade; do not copy markup or register mounted Teams as standalone roots. | Team store dependencies inside accepted components must be removed from the reusable presentation core. |
| Accepted root termination evidence | `WorkspaceHistoryWorkspaceSection.vue`; `TeamMembersPanel.vue`; current `AgentOrgRunHistoryPanel.vue`; VIS-017/018 | Root lifecycle actions belong on root history rows; focused members and mounted Teams are not lifecycle owners. The Org root action currently lives inside the competing Org-only panel. | Move the already-correct Org root action with its row into the unified Workspace section through a typed subject action port; keep member/mounted-Team actions absent. | None. |
| Focused mounted-Team status authority | `requirements-doc.md` / `requirements-revision-record.md` at `RER-021@ed236a63e`; Product `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/AORG-FLAT-TEAM-STATUS-001/ui-ux-spec.md`, manifest, approval record, VIS-STATUS-001-003 | The user-approved correction requires one exact-branch five-state Team aggregate, visible collapsed and accessible, over configured plus task-scoped descendant Agent statuses; it explicitly adds no Team-root persistence, transport field, lifecycle, polling, focus, routing or command behavior. Product fixture status mixtures are illustrative. | Implement a browser-only branch projection over existing AgentOrg topology and AgentContext status truth; preserve every negative lifecycle/contract boundary and validate expanded, collapsed and stopped/history states. | None. |
| API/E2E and source-review origin evidence | `api-e2e-coverage-investigation.md`; current `ORG-005-direct-agent-conversation.png`; user image `ctx_8cd213e66142__image.png`; `code-review-report.md` `CRR-009` / `CR-FIND-011` | Current Org Team rows render disclosure/icon/name without Team status while the origin Team hierarchy has a Team aggregate beside individual Agent signals. Code Review correctly held source work until Product/Requirements authority existed. | Treat this round as upstream impact recovery; do not alter unrelated implementation/API findings or claim runtime validation. | Downstream API/E2E must revalidate after reviewed implementation. |
| Original-personal five-state Team aggregate policy | `git show origin/personal:autobyteus-web/components/workspace/history/workspaceHistoryNestedTeamStatus.ts`; the corresponding `NestedTeamAggregateStatusDot.vue` and `WorkspaceTeamExecutionTree.vue` at `origin/personal@773bce779`; current task-branch equivalents; focused tests; `StatusDot.vue` / `workspaceStatusDotPresentation.ts` | Direct inspection confirms the user's similarity assessment: original-personal already normalizes unknown/missing to offline, folds `running > initializing > error > idle > offline`, scans every deeper descendant row before the Team branch ends (including task Agents), isolates sibling branches, computes from complete execution rows rather than `visibleRows`, exposes `Team status: <State>`, and uses the established dot grammar. The current task branch retains the same implementation. | Preserve that behavior and algorithmic ownership: extract only the tight pure fold/normalizer and reuse one Team aggregate dot; add an AgentOrg-shaped exact branch/status adapter because its strict tree is not the old flat history-row array. Keep Team-history and AgentOrg traversal adapters subject-shaped rather than forcing dissimilar DTOs into a generic hierarchy. | Existing names are configured-nesting-oriented and should be neutralized without a compatibility wrapper; do not copy the original fold into the Org component or reintroduce configured Team nesting. |
| Current AgentOrg status/topology projection | `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts`; `agentOrgContextHydration.ts`; `stores/agentOrgContextsStore.ts`; `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts`; `root-execution-view-dtos.ts` | One strict active Org context already indexes every configured/live task Agent and owns reactive `AgentContext.state.currentStatus`; strict snapshots require exact status correlation for live AgentRuns. Historical Org history carries topology but no durable per-Agent status field, and missing status is approved as offline. | Derive active Team status only when `run.is_active`, the exact context is active, and stream phase is `live`; otherwise use the existing terminal/history status projection when present, normalize live-only/missing/unknown to offline, and add no query/field/polling. | None; illustrative historical error/idle fixtures do not require new production persistence. |
| Current AgentOrg hierarchy component | `autobyteus-web/components/workspace/history/AgentOrgRunHistoryPanel.vue`; focused component test | Team rows omit the aggregate; Agent rows hard-code green; child rows are materialized only when expanded. Computing from visible rows would therefore lose collapsed truth and could include/exclude the wrong branch. | Project each configured Team from its immutable Team node plus exact per-Agent source before visibility filtering; render the dot between disclosure and Team icon; make configured Agent dots use the same truthful source; keep expansion/focus/lifecycle separate. | That status-only round added no task interaction. RER-028 / DS-029 now explicitly requires exact task navigation and retained inspection. |
| Concurrent draft | `origin/codex/dynamic-agent-team-runtime@7d9b4ba69`; merge-base check | Draft is not integrated and its behavior is outside this approved package. | Do not import recursive configured mutation; re-evaluate any later source conflict under REQ-017. | Branch may evolve before implementation. |

## Intended Change

Introduce `AgentOrg` as the sole persistent multi-Team composition subject and
contract `AgentTeam` to an Agent-only coordinator-led unit. Preserve native
standalone TeamRun V2 state and its package path. Add a distinct AgentOrg run
aggregate plus strict V1 store/path over reused configured/member/handoff/task
records. Publish exact current Team Definition Config and current Org Definition Config
normal codecs; convert only server-owned legacy definitions, keep the two
external definition repositories read-only, and apply target-only per-definition
admission diagnostics without globally blocking compatible work or existing
history. Convert every server memory one-level organization-like runtime package
at cutover while leaving flat Team V2 packages byte/physically unchanged. Add a tagged root-neutral internal configured-Agent/flat-Team execution plane
with private Team/Org task/message/event/persistence adapters and strict Org
sidecars; add truthful mixed-root projections, subject-specific GraphQL and
definition/run services, configuration-first full-scope Org activation with nullable
post-launch focus, complete atomic From/To/When authoring, root-first effective
handoff ordering, and the approved separate Team/Org frontend journeys. For
an active AgentOrg, reuse the existing Agent conversation/event-monitor and Team
member workspace presentation through a strict Org focus adapter; do not create
an Org runtime dashboard, raw event cards, custom composer, or member-header root
lifecycle action. Add one presentation-only status projection to every direct mounted
Team row: traverse only that configured Team's configured and task-scoped Agent
identities, resolve their already-projected statuses under an explicit live or
historical authority, fold them through the shared five-state precedence, and
render the existing accessible Team status-dot grammar independently of
expansion. This creates no Team root state or API.

Preserve the existing task submission/review states, one root task FIFO,
prepared-settlement transaction, idle-event retry, and durable records. Before
settlement waits on termination, atomically test whether the exact task execution
is already quiescent; an active turn yields immediate deferral and FIFO release.
Root shutdown freezes and interrupts the complete owned execution scope before
it drains task commands/settlements. “Interrupts” means an AgentRun-owned
root-shutdown fence, not a one-shot active-turn query: admission closes,
pre-forward input is cancelled through the existing lifecycle, any provider
start that already won serialization stays tracked, and a pre-`TURN_STARTED`
start is interrupted as soon as its canonical turn becomes visible. The fence
does not resolve while provider work can still start after it. No coordinator,
token lifecycle, timeout, replay, new persisted `settling` state, task-recovery
path, or user-visible task contract is added.

### AD-REV-002 Product, Runtime, And Durable Impact Decision

| Impact ID | Approved Evidence | AD-REV-001 / Earlier Draft Position | AD-REV-002 Decision |
| --- | --- | --- | --- |
| ADI-001 | REQ-004, REQ-024, SCN-002, SCN-009, VIS-014-VIS-018 | Org launch accepted `entryAddress` and yielded a focused Agent. | Remove entry selection/input/result. Resolve full effective configuration, activate every mounted execution, return Org run identity, and initialize Org focus to `null`. |
| ADI-002 | REQ-024, AC-019, VIS-014, formerly VIS-015, VIS-020 | Configuration precedence had no single owner. | Add server-authoritative `CollaborationLaunchConfigurationResolver`: Org root -> Team placement -> exact Agent; root -> exact Agent for direct Org Agents/standalone Teams. Definitions stay immutable. RER-023 replaces only the presentation hierarchy, not this precedence owner. |
| ADI-003 | REQ-020-REQ-023, SCN-008, VIS-004, VIS-008, VIS-013, VIS-019 | Handoff compilation existed; authoring/save lifecycle was underspecified. | Add owner-scoped endpoint catalogs, reversible complete drafts, typed validation, optimistic revision checks, and one journaled atomic parent-definition commit. |
| ADI-004 | REQ-019, AC-014, RV-012, VIS-001-VIS-020 | UI layout was implementation-owned and had no approved prototype authority. | Treat `ui-ux-spec.md` and all non-fixture visible reference details as normative; validate desktop/narrow/accessibility behavior. |
| ADI-005 | REQ-012, REQ-014, REQ-025, AORG-CONTRACT-001@RER-016 | AD-REV-001 and the superseded RER-014 impact draft proposed one generic V3 root/store/path. | Preserve exact Team V2 and add separate AgentOrg V1. Share only tight child/handoff/launch/task record modules. Add `root_subject_kind` solely to mixed projections. Flat Team packages are no-op; one-level Org-like packages convert atomically to Org V1. |

All five impacts are resolved within the approved package. No requirement or
Product UI gap remains.

### AD-REV-003 Architecture Review And RER-018 Recovery Decisions

| Finding / Impact | Evidence | AD-REV-003 Decision | Downstream Consequence |
| --- | --- | --- | --- |
| `AR-FIND-001` / RER-017-018, updated by RER-029 | Earlier Team members persisted refType; external definition projects are out of scope. | DS-031 uses exact field-free Team/Org current shapes. Team members omit refType; Org members retain it. DS-032 isolates both prior numeric targets and older recursive Team decoding within migrations. | Ownership and per-definition availability remain; external packages are never rewritten. |
| `AR-FIND-002` | Current recursive compiler emits root definition handoffs before child-Team handoffs; real Agents receive both and rule lookup preserves array order. | `compileOrg` appends Org-owned handoffs in saved order first, then each direct Team's local handoffs in the stable relative order of Team placements in `AgentOrgDefinition.members`; each Team list and `rules[]` order remain unchanged. `compileTeam` emits Team-local saved order. | New Org snapshots, migrated unchanged snapshots, `get_handoff_rules`, owner-labeled effective projections, and tests share one preserved order. Duplicate/self validation does not reorder. |
| Navigation cleanup | RER-016 added `SCN-010`; RER-018 adds `SCN-011`. | AD-REV-003 navigation/traceability covers `SCN-001`-`SCN-011`. | No behavior change. |

Both review findings are resolved architecture-side under approved RER-018.
Classification remains Large/High and another independent review is required.

### AD-REV-004 Canonical Production Migration Convention Correction

Architecture impact ID: `ADI-006`.

| Impact | AD-REV-003 Position | AD-REV-004 Correction | Requirement/Product Effect |
| --- | --- | --- | --- |
| Recovery mechanism | Custom global plan, journal, protected backup, non-discoverable staging tree, restoration state machine, and fsync-boundary matrix. | Use the existing registered runner, atomic current-file replacement, one same-filesystem package rename, validation/reread, and ordinary later-startup idempotent retry. No custom journal, backup, staging or restore command. | None; logical target files/paths and preservation remain exact. |
| Failure scope | In-scope failure kept a blanket runtime/readiness gate closed. | Classify at the narrowest current owner. An invalid definition/root is unavailable; compatible definitions/runs and unrelated server capabilities start. Strict current catalogs never admit legacy/partial state. | Aligns REQ-027 non-blocking behavior and does not weaken REQ-012/013 item preservation. |
| Runner recovery | Offline/operator retry was architecture-specific. | Register `requiredOnStartup:true`, `STARTUP_ONLY`, Team Run V2 prerequisite; existing status/log and `RESTART_TO_RETRY`/disabled manual retry are authoritative. | No new Product UI or runner API. |
| Interruption coverage | Exhaustive crash/collision/fsync state testing. | One supported incomplete-attempt category plus relaunch/idempotence coverage; unsupported infrastructure/tampering premises add no machinery. | None. |
| Cleanup/result truth | Source/backup removal was required for success through a custom recovery protocol. | This migration defines no warning residue. A retry removes any retired file left after an interrupted rename; `SUCCEEDED` requires an independently valid current target and complete retired-file cleanup. Missing/invalid target, cleanup failure, or both family paths is `FAILED` and capability-scoped unavailable. | Preserves one semantic authority without inventing a product-approved residue exception. |

The user's convention pointer is architecture-owned Design Impact, not a
Requirement Gap: it changes rollout/recovery mechanics only. AD-REV-003's exact
definition/admission and handoff-order corrections remain intact. Classification
remains Large/High and the cumulative AD-REV-004 package requires re-review.

### AD-REV-005 Root-Neutral Execution Composition Recovery

Architecture impact ID: `IDI-001` from Implementation `IR-001`. It is an
architecture-owned boundary defect, not a Requirement Gap: RER-018 already fixes
the public Team V2 / Org V1 families and Product behavior, but AD-REV-004 did
not define a production-capable internal extraction.

| Impact Surface | Invalid Prior Assumption | AD-REV-005 Decision | Preserved Authority |
| --- | --- | --- | --- |
| Agent execution | `MixedAgentMemberHandle` could be reused beneath Org while it consumed `TeamRunContext`, Team identity, Team events/bindings, Team memory, and `RootTeamRun`. | Extract one root-neutral `ConfiguredAgentExecutionHandle` and factory. It consumes an explicit tagged root identity, physical scope, member identity/context, command callbacks, memory locator, and activation mode. It owns only AgentRun prepare/publish/abort/input/termination mechanics. | `RootTeamRun` and `AgentOrgRun` remain separate public aggregates; AgentRun remains the provider/runtime owner. |
| Member tools/context | A resolver returning `RootTeamRun` was acceptable shared context. | Replace `MemberTaskRootResolver` and `TeamMemberExecutionIdentity` in collaboration-bound AgentRun configuration with `MemberTaskCommandCapability` and `CollaborationMemberExecutionIdentity`. Tools invoke the bound capability directly; they never resolve or cast a root aggregate. | Same selector-free task tool inputs/results and same-root authorization semantics. |
| Flat Team materialization | Existing Team backend factory was already root-neutral. | Add `FlatTeamExecutionFactory.materialize(...)` over explicit root host/scope. A materialized `TeamRun` owns direct Agent handles and task Agent/Team descendants only; it cannot own a configured Team child, create a root package, register with `AgentTeamRunManager`, or choose persistence. | Standalone Team root still uses `RootTeamRun`; Org alone owns direct configured Team placements. Recursive task Teams remain valid. |
| Task lifecycle | Team-tree-specific `TaskDelegationService` could be injected unchanged. | Split the task subsystem into root-neutral record/FIFO lifecycle engine plus a subject-owned `TaskRootAdapter`. The adapter resolves exact hosts, mutates only its Team or Org tree, prepares local task executions through `TaskExecutionHostCapability`, commits its subject sidecars/tree, publishes subject events, and enters its root fail-stop. | Exact `TaskDelegationRecordV1` and nested task execution record shapes; no generic persisted tree/root. |
| Communication | Team-specific intent/identity/service could represent Org. | Use a tagged root-neutral delivery intent/participant identity and a shared accepted-message engine behind a subject-owned communication adapter. The owning root resolves and reserves the exact same-root Agent, persists its own sidecar, then publishes its own event. | Same message record fields, same-root isolation, Team coordinator ingress, and no global logical-address lookup. |
| Durability | Org could reuse Team sidecar envelopes after a directory rename. | Keep Team sidecars exact. Add strict Org task/message sidecars with `subjectKind:"agent_org"` and `orgRunId`; record arrays reuse exact current record shapes. `AgentOrgRunPersistenceCoordinator` serializes Org tree/task/message mutation and owns Org fail-stop. | Exact approved execution-tree files/paths remain unchanged; record bodies are reused, root envelope truth is not conflated. |
| Memory | An Org-specific shallow Agent path was enough. | Introduce tagged `RootExecutionPhysicalScope { root, ancestorTeamRunIds }`. Relative memory is `<family>/<rootRunId>/<ancestorTeamRunIds...>/<agentRunId>`. Direct Org Agents have no Team ancestors; mounted Team Agents include its TeamRun ID; task Team descendants append IDs. | Whole-package migration remains a direct family rename and preserves existing relative memory/content paths. |
| Events/global lookup | Team manager could remain the only same-root dispatcher. | Agent handles emit neutral agent-execution event bodies to their owning root adapter. Team and Org publishers wrap them in subject events. `ActiveCollaborationRootDirectory` maps explicit tagged root identity to a narrow message/query boundary; global AgentRun lookup compares tagged identities and dispatches to the owning root. | No public generic aggregate, no root-kind inference, no cross-root logical routing. |
| Assembly/lifecycle | An injected `AgentOrgExecutionActivator` could hide wiring. | Delete that abstraction. Subject managers build root composition explicitly from strict package state, persistence, publisher, task/message adapters, direct Agent handles, and flat Team executions. Root registration happens only after configured activation succeeds. General-process shutdown closes admission, stops Org roots, stops standalone Team roots, then stops remaining AgentRuns. | Full Org activation, fail-closed restore, subject registry ownership, and Team-only application scopes. |

`AD-REV-005` does not authorize a generic durable root, synthetic Team root,
independent Team-family roots inside an Org, or a public `RootRun` base. The
shared layer is deliberately a narrow internal execution/capability plane whose
fields are mandatory and semantically common. Subject-specific tree/index/
persistence/event adapters remain above it.

## Target Definition And Source Contracts

Authored definition files contain no schemaVersion (RER-029). Normal providers
admit exactly one current shape per known package family. Known superseded numeric
definition source shapes and older Teams are recognized only within migration code; saved
execution-tree versions remain independent and unchanged.

```ts
type AgentTeamDefinitionConfigMember = Readonly<{
  memberName: string;
  ref: string;
  refScope: "shared" | "team_local" | "application_owned";
  // No refType: every Team member is an Agent.
}>;

type AgentTeamDefinitionConfigFile = Readonly<{
  coordinatorMemberName: string;
  members: readonly AgentTeamDefinitionConfigMember[];
  handoffs: readonly CollaborationHandoff[];
  avatarUrl: string | null;
  defaultLaunchConfig: DefaultLaunchConfig | null;
}>;

type AgentOrgDefinitionConfigMember = Readonly<{
  memberName: string;
  ref: string;
  refType: "agent" | "agent_team";
  refScope: "shared" | "org_local" | "application_owned";
}>;

type AgentOrgDefinitionConfigFile = Readonly<{
  members: readonly AgentOrgDefinitionConfigMember[];
  handoffs: readonly CollaborationHandoff[];
  avatarUrl: string | null;
  defaultLaunchConfig: DefaultLaunchConfig | null;
  // No coordinator, recipient, or focus field.
}>;
```

The resolved domain remains subject-specific:

```ts
type AgentTeamDefinition = Readonly<{
  id: string;
  name: string;
  description: string;
  instructions: string;
  members: readonly AgentTeamDefinitionConfigMember[];
  coordinatorMemberName: string;
  handoffs: readonly CollaborationHandoff[];
  avatarUrl: string | null;
  defaultLaunchConfig: DefaultLaunchConfig | null;
  source: DefinitionSourceDescriptor;
}>;

type AgentOrgDefinition = Readonly<{
  id: string;
  name: string;
  description: string;
  instructions: string;
  members: readonly AgentOrgDefinitionConfigMember[];
  handoffs: readonly CollaborationHandoff[];
  avatarUrl: string | null;
  defaultLaunchConfig: DefaultLaunchConfig | null;
  source: DefinitionSourceDescriptor;
}>;

type DefinitionSourceDescriptor =
  | Readonly<{ sourceClass: "server_data";
      mutationOwner: "server_definition_migration_and_provider";
      packageRoot: string; definitionPath: string }>
  | Readonly<{ sourceClass: "implementation_repository";
      mutationOwner: "implementation_change";
      packageRoot: string; definitionPath: string }>
  | Readonly<{ sourceClass: "external_read_only";
      mutationOwner: "external_project";
      packageRoot: string; definitionPath: string }>;
```

- `agent-teams/<team-id>/team-config.json` uses the exact current Team shape,
  without schemaVersion or member refType. Team/Org refs, invalid scopes,
  unresolved refs and invalid direct-Agent coordinators are rejected.
- `agent-orgs/<org-id>/org-config.json` uses the exact current Org shape,
  without schemaVersion/coordinator/focus and with explicit Agent/Team member
  refType. Nested Orgs, Teams below configured Teams, invalid/unavailable
  references and unsupported keys are rejected. No normal field stripping.
- `team.md` / `org.md` retain name, description, category and instructions.
- `DefinitionSourceDescriptor` carries explicit source class, mutation owner,
  and canonical package root/path. `server_data` may be updated by the migration
  and normal provider, `implementation_repository` only by this implementation
  change/build, and `external_read_only` only by its external owner. Definition
  identity never implies write permission.
- In-scope definitions are writable data-root Teams/Orgs and Org-owned Teams,
  plus implementation-repository definitions (including built-in application
  Teams). DS-032 specifies the new definition-only startup pass for prior
  numeric targets and the source/build update for repository files. The older
  fixed-depth family migration remains isolated for earlier Team sources.
- `/home/autobyteus/workspace/autobyteus-agents` and
  `/home/autobyteus/workspace/autobyteus-private-agents` are
  `external_read_only`. This ticket may read them only with the target codecs;
  it must not stage, migrate, edit, commit, release, or report completion for
  their updates. Separate owners publish target packages.
- A target admission scan returns a record for every discovered package rather
  than throwing one global catalog exception:

```ts
type DefinitionAdmissionResult =
  | { status: "available"; subjectKind: "agent_team" | "agent_org";
      definitionId: string; definition: AgentTeamDefinition | AgentOrgDefinition }
  | { status: "unavailable"; sourceClass:
        "server_data" | "implementation_repository" | "external_read_only";
      packageRoot: string; definitionPath: string; definitionId?: string;
      expectedFamily: "agent_team" | "agent_org";
      code:
        "DEFINITION_FAMILY_MISMATCH" |
        "DEFINITION_CONTRACT_INVALID" |
        "DEFINITION_REFERENCE_UNRESOLVED" |
        "DEFINITION_DEPENDENCY_UNAVAILABLE";
      reason: string; dependencyChain: readonly string[];
      ownerAction: string };
```

- Normal catalog/launch/authoring indexes include only `available` definitions.
  A diagnostics query/admin projection exposes unavailable records. Dependency
  closure marks an otherwise valid Org unavailable when any referenced Team is
  unavailable, includes both Org and Team paths/IDs in the diagnostic, and does
  not partially admit the Org.
- Unavailability is definition-scoped: it does not fail server readiness,
  prevent compatible definition admission, block server memory runtime
  migration, or block history/inspection restored from immutable run snapshots.
  New-run launch/authoring always requires an available current-shape
  definition and never consults a retired parser.
- External incompatibility is never a migration item. A server-owned source that
  cannot convert/validate contributes a truthful migration `FAILED` disposition
  and makes that definition/dependent new work unavailable, while unrelated
  current capabilities start. It is not silently reclassified as an external
  owner follow-up and no legacy runtime reader is enabled.
- Cutover ordering is strict: install target codecs/diagnostics and the
  registered migration; ship repository-owned current definitions; run the
  startup migration attempt over data-root definitions/runtime; rebuild strict
  current catalogs; then expose available target definitions plus unavailable
  diagnostics. Retired external packages become unavailable only in that
  coordinated release, never before the replacement capability exists.
- Org-owned Agent or Team sources created in target packages remain distinct
  definitions under `agent-orgs/<org-id>/agents/<local-id>` or
  `agent-orgs/<org-id>/agent-teams/<local-id>`. Membership stores a reference,
  not an embedded/copy definition.
- Migrated server-owned local sources preserve their exact historical opaque
  canonical IDs. Target code does not parse historical `team-local-*` prefixes
  as topology. Newly created Org-owned sources use truthful opaque
  `agent-org-owned-agent:*` / `agent-org-owned-team:*` namespaces; the source
  index maps IDs directly without aliases.
- Adding an available Team reference or Org handoff never edits that Team. The
  same Team identity remains independently launchable and retains prior history.
- Definition query results include an opaque revision derived from canonical
  target-serialized package content. Update supplies `expectedRevision`; under a
  per-definition lock the provider re-reads it, stages a complete package, and
  commits through the journaled old-directory-to-backup/stage-to-canonical
  transaction. Readers/catalog publication share recovery/lock discipline and
  see the prior or complete next package. A mismatch returns
  `DEFINITION_REVISION_CONFLICT` with zero mutation.

Representative server-owned flat conversion (migration/build path only):

```jsonc
// Retired unversioned input, decoded only by the migration module.
{
  "coordinatorMemberName": "researcher",
  "members": [{
    "memberName": "researcher",
    "ref": "researcher",
    "refType": "agent",
    "refScope": "team_local"
  }],
  "handoffs": [],
  "avatarUrl": null,
  "defaultLaunchConfig": null
}
```

```jsonc
// Exact normal current Team Definition Config output.
{
  "coordinatorMemberName": "researcher",
  "members": [{
    "memberName": "researcher",
    "ref": "researcher",
    "refScope": "team_local"
  }],
  "handoffs": [],
  "avatarUrl": null,
  "defaultLaunchConfig": null
}
```

The transformer first proves `refType:"agent"` and reference/coordinator
validity, then emits the final current normal shape shown above directly.
DS-039 updates the existing unreleased writer; no numeric intermediate is emitted.
The same retired input in an `external_read_only` descriptor is **not**
transformed: target admission returns `DEFINITION_CONTRACT_INVALID`
and the external-owner action. This distinction closes AR-FIND-001 without a
dual normal parser.

### AD-REV-020 — Field-Free Definition Authoring, Strict Admission And Owned Transition

**Authority and scope.** RER-029@0f5014405eb028123afb37013b722acb2d12fe22
explicitly removes authored `schemaVersion` from both definition files. DS-031–033
supersede earlier numeric *definition* version requirements only. Runtime Team
V2 / Org V1, task/message sidecars, transaction journals and migration record
schemas retain their existing versions. No Product gate or UI redesign applies.
Approved basis: BEH-010, REQ-012/013/026/027, AC-021/022/032/033, SCN-021/022,
DEC-024; original authoring and flatness requirements remain.

**Current evidence.** Source baseline is the unchanged reviewed IR-038 source
behind checkpoint `14a94fc45` and inquiry `7ef792130`; completed ARCH-REV-017,
CRR-058/059 and API-REV-024 precede this delta. DR-008's native candidate is
RER-028 only. The two normal codecs require/emit numeric versions; Team and Org
providers, Org-owned source discovery, application bundle validation and
DefinitionAdmissionService consume them. Diagnostics expose
`expectedSchemaVersion` and a version-specific family/code. The existing
20260901 migration emits versioned definition targets and imports those normal
codecs. That was AD-REV-020's source evidence, not proof of production rollout.
The user has now clarified that this ticket's migration is unreleased and must
be treated as first-run. DS-039 updates its generators directly; the earlier
assumption of already-upgraded production installations is withdrawn. Saved
local/test status evidence remains recorded but cannot justify a new migration.

**Design health.** Behavior change, not a defect against the previously approved
contract. The unwanted author-facing discriminator is a shared-structure
concern; existing definition owners remain appropriate. Refactor needed now:
remove the field from normal owned structures/writers/diagnostics and isolate
previous target validation within migration code. No generic format registry,
new definition service, compatibility wrapper or runtime redesign is warranted.
Focused classification is Medium/High because stored-definition admission and
startup transition change; cumulative task_size=Large / architectural_risk=High.

#### DS-031 — One Current Definition Codec Per Known Package Family

Spines (all Supported Normal Scenario / governing authoring contract):

| Spine | Start → authoritative owner → mechanism → meaningful outcome | Governing owner |
| --- | --- | --- |
| DS-031a, author/save | Team/Org form or authored package → existing subject DefinitionService → current family codec plus existing ref/coordinator/handoff validation → provider's revisioned package transaction → reread/catalog with field-free config | Team or Org DefinitionService; provider owns file publication |
| DS-031b, package import/read | Local/GitHub package registration or reload → AgentPackageService → registered source descriptor → DefinitionAdmissionService plus subject provider/current codec → dependency-closed catalog or exact unavailable diagnostic → existing launch gate | PackageService owns source registration; admission owns availability, not package copying |
| DS-031c, return/roundtrip | Validated subject definition → existing provider serializer/canonical files → existing supported package copy/export path → same family admission on import → same authored meaning | Subject serializer; no new export API or alternate writer |
| DS-032, operational | Ordinary startup → existing runPending sequence → pending family migration then definition-only transition → strict per-definition read/dependency admission → available new work or bounded unavailable items | Existing migration runner then existing admission owner |

Package registration is not itself semantic definition admission. Its existing
`validatePackageRoot` checks physical package structure; an installed/registered
root may contain an individually unavailable definition. Do not move field
normalization into the GitHub installer or treat a root registration response
as proof that every definition launches. The current package source remains
read-only when registered externally, including managed downloaded copies.

Normal types are `AgentTeamDefinitionConfigFile` and
`AgentOrgDefinitionConfigFile`, with their same member records minus the type
name's version suffix. Move the existing codec files to
`agent-team-definition/providers/agent-team-definition-config.ts` and
`agent-org-definition/providers/agent-org-definition-config.ts`; export
`parse/buildAgentTeamDefinitionConfig` and `parse/buildAgentOrgDefinitionConfig`.
Retain distinct family types, not a loose shared optional-coordinator DTO.
Remove the old normal version constants/exports/files without alias wrappers.
These internal renames clarify the target; they do not change runtime types.

Exact normal top-level keys:
- Team: coordinatorMemberName, members, handoffs, avatarUrl, defaultLaunchConfig.
- Org: members, handoffs, avatarUrl, defaultLaunchConfig.
- Team member: memberName, ref, refScope (Agent only).
- Org member: memberName, ref, refType, refScope (Agent or direct flat Team).

All other current presence/null/default/value/reference rules remain unchanged.
Absence of schemaVersion is valid; presence with *any* value is an unsupported
key, not a hint to retry/strip/coerce. The known package family selects the
codec. Existing GraphQL create/update inputs and domain models already omit
schemaVersion: do not add another frontend draft field or wire alias. Provider
serialization constructs only the current keys, including on update/default
launch preference save. `team.md` / `org.md`, IDs, ownership metadata,
member/handoff order and nullable defaults are unchanged. RER-033 / DS-038 changes
only the Org authored local refScope spelling; reference strings stay exact.

Admission diagnostics retain source/path/identity, dependency chain and action.
Use `expectedFamily: "agent_team" | "agent_org"`; remove
`expectedSchemaVersion` and `DEFINITION_SCHEMA_VERSION_UNSUPPORTED` from the
internal result and GraphQL diagnostic projection. Invalid version-bearing
input uses `DEFINITION_CONTRACT_INVALID` and a reason naming the unsupported
key/current family shape. Other existing codes stay. Update any generated
query/test consumers together; do not return dummy version 0/null or infer
family from the removed field. External owner action asks for the *current
format*, not “add version 2”. No runtime API discriminator changes.

#### DS-032 — Existing Definition Transition, Revised For First Run

AD-REV-024 / DS-039 is the current detailed algorithm and supersedes this
section's former frozen-intermediate/two-release premise. Both migration files
already on this unreleased ticket are updated in place, under their existing IDs
and registration order. Add no new spelling migration and do not reset runtime
migration records.

- The existing family migration writes final unversioned Team/Org definitions
  directly, including `org_local`; runtime conversion remains unchanged.
- The existing definition-only authoring inventory preserves otherwise-current
  owned configs as required by REQ-012/037. A single final candidate removes the
  known authored version and, for Org, replaces only the known former scope.
- Current final configs validate/skip with zero writes. Repository packages are
  source/build updates; external registered roots remain read-only.
- Physical owned Team/Org and one Org-owned Team-level inventory, ordinary
  authoring transaction recovery, atomic file replacement, strict final reread,
  per-definition availability and bounded restart/status ownership are unchanged.
- Migration-only source knowledge is tightened in
  `legacy/collaboration-definition-authoring-transition.ts`; normal readers
  import neither old decoders nor aliases. Source acceptance is never a final
  current-target check. DS-039 defines exact preservation and failure semantics.
- First-run/restart validation uses isolated genuine pre-ticket fixtures. Earlier
  test databases with completed entries do not establish a shipped intermediate
  release. Retain their evidence without forcing replay or adding a new ID.

#### DS-033 — Status, Validation And Change Boundaries

| Definition migration item | Required terminal effect |
| --- | --- |
| Known owned authoring source; final target committed and reread | MIGRATED_AUTHORING_CONFIG; only approved version/scope changes, all other meaning unchanged |
| Exact current field-free/new-scope owned config | SKIPPED_CURRENT_DEFINITION; zero write |
| Unsupported old/malformed/family-incomplete owned source | FAILED_DEFINITION; source retained; unavailable per normal admission |
| Required inventory/read/write/reread fails | FAILED_DEFINITION or FAILED_INVENTORY; no false success/empty inventory |
| External package | Not a migration item; current admission succeeds or reports external owner action |
| Repository application package | Source/build update plus current-codec fixture assertion, not startup filesystem mutation |

For this **20260911 definition migration only**, all valid converted/skipped
items and complete inventory yield SUCCEEDED. Any required item failure yields
FAILED. There is no SUCCEEDED_WITH_WARNINGS branch: a remaining authored version
or retired Org scope is not a valid normal target. This does not change the 20260905 summary
migration's valid empty-summary warning or 20260901 family failure policy.
Return aggregate counts and at most five examples per reason using the existing
runner's opaque summary/attempt log; no per-file database/status schema.

Admission after the attempt gates only invalid definitions/dependent new work.
An aggregate migration FAILED verdict does not hide independently current
packages, stop compatible launches, or invalidate durable history. New runtime
starts/Restore do not run definition migration. Ordinary restart retry is enough;
no user-specific poweroff/kill branches, normal legacy parser or force cleanup.

**Ownership/file mapping and dependency direction:**

| Change | Concrete owner/file | Boundary |
| --- | --- | --- |
| Rename/tighten | Team/Org current config codec files named in DS-031 | Exact family field/value grammar; no historical imports |
| Modify | file-agent-team-definition-provider.ts, file-agent-org-definition-provider.ts, agent-org-owned-definition-source-index.ts, file-application-bundle-provider.ts | Consume one current codec; same discovery, identity and writer authority |
| Modify/remove fields | definition-admission-result.ts, definition-admission-service.ts, api/graphql/types/definition-admission.ts | One availability owner; current family/shape diagnostics, no expected numeric definition version |
| Rename/tighten | app-data-migrations/legacy/collaboration-definition-authoring-transition.ts (replaces versioned-config.ts) | Source-to-final candidate under DS-039, migration callers only |
| Modify existing | app-data-migrations/migrations/collaboration-definition-authoring-shape-app-data-migration.ts | Same ID; owned inventory and one final authoring write under DS-039, no runtime access |
| Verify / modify | Existing registry order / existing 20260901 family migration | No added registration; update unreleased generator to final output and strict target validation |
| Modify | applications/brief-studio/agent-teams/brief-studio-team/team-config.json; applications/socratic-math-teacher/agent-teams/socratic-math-team/team-config.json | Remove version only in implementation-owned source; source/build contract check |
| Modify | Existing codec/provider/admission/bundle/migration/registry tests and current package fixtures | Field-free successful authoring, exact rejected shapes, prior-target migration and no runtime changes |
| Sync downstream | Module/package authoring docs, examples and Delivery-built sample fixtures | Current examples omit version; retained historical evidence remains untouched |

Dependency chain stays `UI/API -> subject service -> provider/current codec` and
`PackageService -> source registry -> admission -> subject service`. Migration
may call current codecs/file writer and existing transaction recovery; normal
owners never call historical helpers. The migration's physical scan cannot use
normal decoded Org discovery to decide whether to inspect an owned child.
No new frontend state/renderer, provider abstraction, transport event, lifecycle
owner, definition ledger or generalized migration coordinator is introduced.

**Sequence and acceptance guidance.** Implement current codecs and all consumers
as one source cut, update existing migration generators/candidate selection under DS-039,
repository config/fixture updates, then diagnostics/docs consumers. Validate in
disposable data roots before any Delivery rebuild: current create/edit/read and
package roundtrip for both families, strict invalid-key negatives, version-bearing
owned roots/owned Teams, first-run final output and pending/failed ordering, one
ordinary retry/idempotence case, per-definition failure, external zero writes,
and unchanged runtime versions/files/hashes. Use production registry/runner and
real file writer for migration assertions, not only isolated transform mocks.
Do not rewrite captured API evidence to make old versioned fixtures look current.
VAL-046–050 carry detailed walkthroughs. Fresh source review, API validation and
Delivery build/user verification remain necessary; DR-008 is not RER-029 proof.


### AD-REV-006 Accepted Running-Workspace And Typed Presentation Recovery

Architecture impact ID: `ADI-007`, triggered by API/E2E real-browser scenario
`API-E2E-005` after `CRR-003` Pass. It is an architecture-owned boundary defect,
not a Requirement Gap: REQ-004/016/019/025, SCN-007/009, Product RV-012, and
VIS-016-VIS-018 already require exact member focus to reuse the accepted Agent
or Team workspace and explicitly reject a custom AgentOrg runtime dashboard.
RER-019 only promotes that already-approved experience to the Product baseline.

| Impact Surface | Observed Invalid Implementation / Missing Prior Design | AD-REV-006 Decision | Preserved Authority |
| --- | --- | --- | --- |
| Live Agent event projection | `AgentOrgRunEvent` carried raw `CollaborationAgentExecutionEvent`; `RootExecutionEventDto.event` was `unknown`; the web retained the envelope and rendered a `JSON.stringify` fallback. AD-REV-005 named a tagged stream but did not map it to the mature Agent presentation protocol. | Move the existing Team Agent-event admission logic into one root-neutral `CollaborationAgentPresentationAdapter`. Team and Org callbacks convert raw AgentRun/member-input/status/readiness events before publication. The Org wire branch is a strict discriminated presentation-event union; unsupported events are rejected and trigger stream recovery, never UI fallback rendering. | AgentRun remains runtime-event owner; Team and Org remain subject publishers; Team-only serialized messages remain wire compatible. |
| Browser execution read model | `RootExecutionViewState` owned an array of opaque root events rather than per-Agent conversation/status/tool state. | Add `AgentOrgExecutionViewState` and `AgentOrgExecutionContext`: strict tree/tasks/messages/status snapshot plus exact `agentRunId -> AgentContext` map and nullable focus. Apply typed Agent presentation messages through the existing `dispatchAgentStreamMessage` handlers. Root topology and Agent presentation state have one Org context authority. | Org V1 remains durable topology authority; `AgentContext` remains accepted browser conversation/presentation state. |
| Workspace component boundary | `AgentOrgWorkspaceView.vue` implemented a second header, event list, empty state, textarea and send button. Prior VIS mapping stopped at `RootExecutionViewStore`/focus and did not name reusable production components. | Extract prop/port-driven `AgentWorkspaceSurface` and `TeamWorkspaceSurface` from the accepted `AgentWorkspaceView`, `TeamWorkspaceView`, `AgentTeamEventMonitor`, and `AgentEventMonitor`. Existing standalone wrappers adapt their stores. `AgentOrgWorkspaceView` becomes only a three-branch focus adapter: no focus -> approved prompt; direct Agent -> Agent surface; mounted Team/Team Agent -> Team surface. It owns no event rendering, composer, or lifecycle action. | Accepted shell/header/conversation/composer/Team presentation in VIS-017/018; subject route and focus remain Org-owned. |
| Input and command parity | Org used a direct one-off `SEND_MESSAGE`; accepted composer/tool cards require context attachments, local submission, interrupt, and approval/denial commands. | Generalize `useActiveContextStore` behind an exact tagged `ActiveAgentWorkspaceTarget` plus `AgentInteractionPort`. Standalone Agent, standalone Team member, direct Org Agent, and mounted Org Team member provide subject adapters. Extend the strict Org client command union and acknowledgements for send, interrupt, approve, and deny; the server invokes the already-existing exact `AgentOrgRun.executeAgentCommand`. | Recipient and root validation remain subject-owned; UI components depend only on the active-target boundary, never on Org/Team managers or sockets. |
| Hydration and trace browse | The Org surface had no equivalent of Team member projection/hydration or active-trace browse. | Add Org-member run projection and active-trace queries keyed by `{orgRunId, memberAddress, agentRunId}` and backed by the strict Org execution location service. Org context hydration builds every configured/live AgentContext, starts focus `null`, hydrates current projection best-effort, and uses checkpointed replacement after a sequence gap. Add an `agentOrgMember` browse-subject branch to the existing event-monitor service. | Agent memory remains physically Org-owned; history is read from the run snapshot/location, never current definition or a synthetic Team root. |
| Contextual Team/right-tool surfaces | Existing right tabs and Team overview infer only global standalone selection; registering a mounted Team as standalone would create false authority. | Introduce a read-only `TeamWorkspaceContextView` port. Standalone `AgentTeamContext` and an Org-mounted-Team adapter implement it. Right tabs, Team overview, files/activity/token/artifact surfaces resolve from `ActiveAgentWorkspaceTarget`, so Team focus exposes accepted Team UI without registering in `AgentTeamContextsStore` or writing a Team package. Org token/history queries remain Org-tagged. | Mounted Team runtime ownership remains AgentOrg; Team presentation reuse does not create a Team root. |
| Headers and root stop | The bespoke focused-member header showed Org internals and placed `Stop Org` beside the member. Product images show the accepted member header/actions; established Team root termination is a root-level history action (and the separate Team members panel uses its existing confirmation). | Reuse the accepted member header and `WorkspaceHeaderActions` through subject action ports. Remove `Stop Org` from the member header. Put active Org termination on the AgentOrg history root-run row using the same stop-icon/pending/error interaction as the existing active Team history row. A mounted Team has no independent terminate action. Do not change the standalone Team panel confirmation behavior. | Root lifecycle remains AgentOrg-owned; member focus never masquerades as root ownership; no unrelated Team behavior change. |

This correction does not change Org launch, focus semantics, durable schemas,
memory paths, migration, handoff order, or accepted Product layout. It makes the
previous abstract “workspace projection” statement constructible and removes the
invalid parallel runtime presentation path.

### AD-REV-007 Mounted-Team Aggregate Status Projection Recovery

Architecture impact: `API-FIND-007` / `CR-FIND-011`, now closed upstream by
approved `RER-021` and the user-approved focused Product supplement
`AORG-FLAT-TEAM-STATUS-001`. The focused delta is presentation-only and reuses
existing status truth. It does not reopen AD-REV-005/006 execution or transport
architecture.

| Concern | Current Production Evidence | AD-REV-007 Decision | Explicit Non-Effect |
| --- | --- | --- | --- |
| Exact Team branch membership | `AgentOrgRunHistoryPanel.rowsFor` hides Team descendants when collapsed, while the strict Org tree retains configured members and recursive task executions under each direct configured Team. | `projectAgentOrgTeamBranchStatus` receives the exact configured Team node, recursively enumerates only its configured Agent members and every task-scoped Agent below `team.taskExecutions`, and ignores Team containers. Enumeration happens before/independently of visible-row filtering. | Direct Org Agents, root-owned tasks, ancestor/sibling Teams and outside rows never contribute. |
| Status authority | Active `AgentOrgExecutionContext` already owns correlated reactive `AgentContext.state.currentStatus` for all live configured/task Agents. Stopped history exposes topology without a new durable status record. | A source adapter is live only when the history row is active and the exact Org context is active in `phase === "live"`. Live reads use `agentRunId` from that context. Historical/terminal reads use only an already-available terminal status projection; missing/unknown is offline and running/initializing without live authority is normalized to offline. | No polling, GraphQL addition, WebSocket field, persisted Team status, cache sidecar or definition lookup. Product fixture mixtures are illustrative; the current missing historical source truthfully yields offline. |
| Five-state policy | `workspaceHistoryNestedTeamStatus.ts` already implements the approved precedence and branch isolation. | Extract one root-neutral pure `foldTeamAggregateStatus(statuses, authority)` concern. It normalizes values and folds `running > initializing > error > idle > offline`; empty/missing/unknown is offline. Team-history and AgentOrg adapters own their distinct traversal shapes and call the same fold. | No generic tree DTO, no status owner, no root lifecycle state machine. |
| Visual/a11y reuse | `NestedTeamAggregateStatusDot.vue` wraps the established `StatusDot` and already exposes Team status via role/title/accessible label. `TeamActivityDot.vue` is instead a binary standalone root-activity signal. | Clean-cut rename the reusable component to `TeamAggregateStatusDot.vue` and neutralize its localization/test names; both existing Team-history use and AgentOrg use it. Place it between Team disclosure and Team icon, with the established 8px solid dot and 6px trailing space. The tree item and dot expose `Team status: <State>`. | Do not replace `TeamActivityDot`, alter root-running semantics, add badge/count/legend, or create different Org styling. |
| Exact Agent signals and reactivity | Current Org Agent rows hard-code a green circle even when the context/history source differs. | Give configured/task Agent display rows their exact `agentRunId` and render the existing `StatusDot` from the same authority adapter. A reactive Agent status mutation recomputes the Team fold; collapse changes only descendant visibility and never the aggregate input. | The Team aggregate coexists with, and never overwrites, Agent signals; it cannot change focus, readiness, routing or commands. |
| Lifecycle boundary | Mounted Teams are local executions owned by AgentOrg and have no public root lifecycle. | Keep the existing Org root stop/restore owner and all AD-REV-006 active-target boundaries unchanged. The new projection is a pure read used only by the hierarchy row. | No mounted-Team Stop/restore/archive, standalone registration, root package, status endpoint, recipient fallback or command effect. |

Target presentation contract:

```ts
type TeamStatusAuthority = "live" | "historical";

// Pure shared policy; it owns normalization and precedence, not topology.
function foldTeamAggregateStatus(
  statuses: readonly (AgentStatus | string | null | undefined)[],
  authority: TeamStatusAuthority,
): AgentStatus;

// AgentOrg-shaped traversal; it owns exact branch membership, not status state.
function projectAgentOrgTeamBranchStatus(input: Readonly<{
  team: AgentOrgConfiguredTeamNode;
  authority: TeamStatusAuthority;
  statusForAgentRunId(agentRunId: string): AgentStatus | string | null | undefined;
}>): AgentStatus;
```

For `authority="historical"`, the fold accepts `idle`, `error`, and `offline` as
terminal projections and demotes `running`/`initializing` to `offline`; no live
pulse survives loss of live authority. For `authority="live"`, all five values
participate. Branch traversal includes configured members, task Agent executions,
task-Team members, nested task-Team members, and child task executions below the
selected configured Team; it excludes the configured Team container itself and
every Org-root/sibling branch. This is task-recursion traversal only and does not
reintroduce configured Team nesting.

The focused implementation posture is `Refactor needed now — bounded`: extract
one shared pure fold and one reusable dot instead of copying precedence/a11y
policy into the Org component. Keep the Team-history row traversal and Org-tree
traversal separate because their DTOs and lifecycle authorities differ. The
focused delta alone is `Medium / Low`; the cumulative ticket remains
`Large / High`, so independent Architecture Review is still selected.

### AD-REV-008 Review Disposition And AD-REV-009 Supported-Reachability Reconciliation

Architecture impact: `API-FIND-008` / `CR-CAND-020`, reviewed as
`ARCH-REV-006` / `AR-FIND-003`. AD-REV-008 is retained as revision history but
its new settlement coordinator, passive/committed token split, independent
cleanup jobs, task dependency graph, and cleanup-outside-FIFO contract are
withdrawn. The exact long stall was mechanically real but behaviorally
unsupported because verifier self-review created the approval wait. That action
remains rejected and cannot drive current architecture.

AD-REV-009 uses two independent supported production paths:

| Supported basis | Normal production path | Current coupling | AD-REV-009 decision |
| --- | --- | --- | --- |
| Normal task submission and independent review | Task assignee calls `submit_task_result`; the root FIFO durably records `awaiting_review`, notifies the delegator, and returns the MCP tool result. The assignee's canonical provider turn completes later. The different authorized delegator may receive the notification and call `review_task_result(accept)` during that interval. | Accept schedules settlement at the same FIFO. The subject registry calls `prepareTermination()` before proving the task execution is quiescent, so the FIFO can wait for the still-open assignee turn and delay an unrelated supported command. | Add a non-waiting `tryPrepareTerminationIfQuiescent` boundary. If input/provider execution is active, return `null` without quiescing admission or waiting; the settlement entry returns `false`, releases the FIFO, and the existing Agent idle/offline event reschedules the sweep. Once quiescent, the existing prepared-settlement transaction commits `settledAt` and finishes local teardown exactly as today. |
| Application graceful shutdown while a task Agent awaits a legitimate tool decision | With Auto approve tools disabled, a supported task Agent may be in the accepted approval-wait state. Application SIGTERM enters `server-runtime` and `GeneralProcessRunSupervisor`, then the exact Team/Org root. | Org currently executes task shutdown/settlement before terminating its Teams/root Agents; Team awaits an initial task drain before freezing/interruption. The root can therefore wait on task work before issuing the Agent interrupt that makes it quiescent. | Each root closes command/message/materialization admission, freezes the complete configured/mounted/task scope, interrupts every active Agent turn, and only then drains task commands, persists shutdown-created task interruptions, runs the existing deepest-first settlement sweep, drains persistence, and finishes/unregisters local executions. |
| Exact API-FIND-008 invalid self-review run | Invalid verifier self-review was held by provider approval; accepted verifier settlement then blocked the FIFO, an analyst command, and shutdown. | It precisely exposes where current code waits, but its initiating action is unsupported. | Retain only as technical boundary evidence and a negative validation. Do not support self-review and do not add timeout, replay, force-kill, persisted `settling`, coordinator, or token lifecycle for it. |

The target normal settlement sequence is deliberately small:

```text
accepted/interrupted task record
  -> existing terminal settlement sweep
  -> root task FIFO
       -> validate terminal record + no open child
       -> tryPrepareTerminationIfQuiescent(exact task execution)
          -> null: release FIFO; existing idle/offline event retries later
          -> prepared: existing durable settledAt transaction
             -> commit tree/index/event and local prepared termination
             -> finish backend/MCP/resources
  -> existing deepest-first parent resweep
```

`tryPrepareTerminationIfQuiescent` is owned by `AgentRun` and composed by the
existing configured-Agent/task-Team local handles. It checks canonical input
admission and runtime lifecycle under the AgentRun dispatch boundary. It has two
outcomes only:

- `null`: the execution is initializing, running, waiting on a tool decision, or
  otherwise has unresolved input/turn work; it performs no state change and does
  not wait;
- `PreparedAgentRunTermination`: the execution was atomically observed
  quiescent, input admission was closed, and the existing cancel/commit
  termination contract applies.

Task-Team preparation applies the same rule recursively: if any descendant has
open execution work, preparation returns `null` without partially quiescing the
subtree. If the entire subtree is quiescent, the existing prepared local
termination and settlement commit proceed. Parent task settlement remains
blocked by open/unsettled children through the existing deepest-first policy.
No new durable data, public interface, task state, root kind, or migration is
introduced.

This focused correction is `Medium / High`: it spans the shared AgentRun/task
settlement boundary and both root shutdown sequences, but it removes rather
than adds coordination machinery. The cumulative package remains `Large / High`
and requires independent Architecture Review before implementation or API/E2E
resumes.

### AD-REV-010 AgentRun Root-Shutdown Admission And Provider-Start Fence

Architecture impact: `ARCH-REV-007 / AR-FIND-004`, protecting the established
application graceful-shutdown contract and `BEH-009` / `REQ-015` / `AC-010`.
The supported path is ordinary `delegate_task -> durable activation ->
releaseWork -> task Agent input`, independently overlapped by application
SIGTERM. It requires no self-review, hidden-state mutation, process-group kill,
or artificial Product action.

#### Singular AgentRun boundary

Add one internal lifecycle method:

```ts
AgentRun.fenceInputAndInterruptForRootShutdown(): Promise<AgentOperationResult>
```

The method is idempotent and irreversible for that AgentRun. It is serialized
by the existing AgentRun dispatch queue and owns all of the following as one
phase:

1. latch `rootShutdownFenced` and close new input admission;
2. invalidate a never-admitted `reserved` entry without notifying an admission
   lifecycle, so its later reservation commit fails under the existing one-shot
   contract;
3. terminalize every admitted `committed`, `queued`, or claimed-but-not-started
   entry with the existing
   `{kind:"cancelled", code:"AGENT_RUN_TERMINATED_BEFORE_INPUT_FORWARD"}` fact;
4. coordinate the single input dispatch slot and canonical turn lifecycle;
5. reserve and execute the existing provider interrupt for an already-active
   turn or for a provider-started input immediately when its canonical
   `TURN_STARTED` arrives; and
6. resolve only after no input can still invoke the provider, every provider
   start that won serialization has reached failure/non-forwarding or canonical
   terminal interruption, the interrupt reservation has settled, and the
   AgentRun input state is quiescent.

The current gap between `claimNextInput()` and `startInputDispatch()` is removed.
Claiming creates the one local input-dispatch slot, and the transition from
`provider_start_pending` to `provider_started` is ordered by the same dispatch
queue as the shutdown fence. The backend call may run outside the queue, but it
may be invoked only after that transition wins. Therefore:

- start transition first: the fence observes a tracked provider start, arms
  shutdown interrupt intent, and awaits its terminal outcome;
- fence first: it cancels the pre-forward entry/slot, and the later start
  transition performs no backend call; or
- canonical active turn first: the fence joins/reserves the existing interrupt.

There is no fourth state in which the backend starts after the fence without a
tracked slot. The slot and shutdown latch are ephemeral AgentRun internals, not
a root task token, cleanup job, public contract, or persisted state.

| Input state when the fence wins | Required disposition | Observer / provider consequence |
| --- | --- | --- |
| `reserved` and not admitted | Remove/invalidate | No `admitted` or `cancelled` fact; later commit fails; provider is never called. |
| `committed` or `queued` | Cancel before forward | Existing `cancelled` fact exactly once; provider is never called. |
| Claimed, provider-start transition not committed | Revoke slot and cancel | Existing `cancelled` fact exactly once; queued start becomes a no-op. |
| Provider call registered/in flight, no `TURN_STARTED` yet | Keep shutdown intent armed | Do not misreport cancellation after provider side effects may have begun; failure/non-forwarding uses existing facts, while `TURN_STARTED` immediately triggers existing interrupt. |
| Forwarded/pending canonical start or active canonical turn | Interrupt and await terminal | Existing association/interrupted/error lifecycle remains authoritative. |
| No unresolved input/turn | Complete locally | No synthetic turn or event. |

Ordinary `AgentRun.prepareTermination()` remains intentionally different: away
from root shutdown it continues draining already-admitted FIFO input before
provider termination, preserving the origin/personal behavior and current unit
contract. `tryPrepareTerminationIfQuiescent()` also remains a non-mutating
`null` result for active work. Once the root-shutdown latch exists, cancellation
of a later prepared termination must not call `inputAdmissionState.reopen()`;
root-stop retry joins the same fenced state rather than reopening input.

#### Stable frozen Team and Org scopes

Before the per-Agent phase, each subject root synchronously closes external
task/message/command admission and closes the operation/materialization
publication gate. It awaits only already-admitted operations that can publish
an Agent/Team handle or commit a reserved recipient input, establishing a stable
active/prepared handle set. This prerequisite is not the general task-command or
terminal-settlement drain and cannot wait on provider quiescence.

- A standalone Team reuses its root operation gate, then
  `FlatTeamExecutionManager.freezeForRootTermination()` snapshots configured,
  task, and prepared Agent handles plus recursive task-Team scopes.
- An AgentOrg adds the equivalent private root-operation gate and one composed
  frozen Org scope: exact direct configured/task/prepared Agent handles from
  `AgentOrgRootAgentExecutionRegistry`, plus every mounted/root-task Team's
  `FrozenTeamRunTerminationScope` from `AgentOrgTeamExecutionDirectory`.
- A recursive task Team freezes its own direct/task/prepared Agents and child
  task Teams using the same Team scope contract. Mounted Teams do not gain a
  root, registry, stop action, package, or independent lifecycle.

`FrozenTeamRunTerminationScope.interruptActiveTurns()` is clean-cut replaced by
`fenceAgentRunsForRootShutdown()`. Direct configured-Agent handles expose the
same narrow forwarding method; the scope recursively invokes it for every
captured Agent. The frozen Org scope is private to `AgentOrgRun` and composes
root Agent handles with Team scopes rather than creating a generic public root.

#### Correct root sequence

```text
application SIGTERM / root stop
  -> subject root enters terminating and closes external admission
  -> close+drain admitted operation/materialization publication gate
  -> freeze exact direct/mounted/task/prepared execution scope
  -> fenceAgentRunsForRootShutdown across the full recursive scope
       -> close Agent input
       -> cancel pre-forward work OR track provider-started work
       -> interrupt canonical active/start-pending turn
       -> await terminal Agent input/turn state
  -> drain short task mutations
  -> durably interrupt remaining open task records
  -> existing deepest-first prepared-or-null settlement
  -> persistence drain
  -> finish local Team/Agent resources and unregister root
  -> process continues Org -> standalone Team -> residual Agent cleanup
```

An Agent fence error is a real root cleanup error and follows existing
Team/Org/process aggregation/fail-stop behavior; it is never converted to a
timeout, replay, force-kill, or successful `NO_ACTIVE_TURN`. A provider that has
already started but never produces either dispatch failure or canonical
lifecycle terminal may still delay graceful shutdown under the existing
provider contract; AD-REV-010 prevents false phase completion and post-phase
provider start, not an unapproved provider deadline policy.

The focused AD-REV-010 delta is `Medium / High`: it extends the existing
AgentRun input owner, root-neutral configured-Agent forwarding, recursive Team
termination scope, and the two subject root shutdown compositions. Cumulative
classification remains `Large / High`, and independent Architecture Review is
required before implementation or API/E2E resumes.

### AD-REV-012 Established AgentTeam Launch-Hierarchy Reuse

Architecture impact: `CRR-021 / CR-FIND-020` under approved `RER-023`, serving
`BEH-012`, `REQ-029`, `AC-024`, `SCN-013`, `QR-009`, and
`ORG-CASE-059`-`ORG-CASE-061`. This is an observable presentation correction,
not a new configuration architecture. The original/current AgentTeam launch
components are already the accepted owner of the relevant visual and
progressive-disclosure language; the AgentOrg form must adapt its distinct
fixed-depth draft into that presentation instead of maintaining a parallel Team
editor.

#### Tight reuse boundary

| Concern | Authoritative owner | Reuse / change | Explicit non-owner |
| --- | --- | --- | --- |
| AgentOrg root and sparse placement draft | `agentOrgRunConfigStore` | Split its current mixed `memberOverrides` record into exact `teamOverrides: Record<Address, TeamScopeConfigOverride>` and `agentOverrides: Record<Address, AgentConfigOverride>`, plus Team-scope workspace-selection/operation state needed by the accepted Team editor. | `teamRunConfigStore`; mounted Team definitions; Vue disclosure components. |
| Fixed-depth form projection | New pure `projectEditableAgentOrgRunFormModel` | Resolve the Org root baseline, direct Agent presentation nodes, mounted Team scope nodes, exact direct-Agent child nodes, exact coordinator address, and exact configurable-Agent count. It emits only view models consumed by the established components; it cannot write either store or launch a run. | GraphQL, server resolution, Team definition mutation, configured recursion. |
| Outer Member-overrides disclosure | Extract the compact accessible disclosure shell already embedded in `TeamRunConfigForm` into `MemberOverridesDisclosure` and use it from both Team and Org forms. | Own label/count, adjacent chevron, `aria-expanded`/`aria-controls`, local default-collapsed state, and visibility-preserving content slot. | Override maps, effective settings, validation, launch, member traversal. |
| Mounted Team row and editor | Existing `TeamMemberConfigTree -> TeamScopeConfigEditor` | Consume only direct mounted-Team nodes. Keep every Team's internal disclosure independently collapsed; render Team name, `TEAM`, exact address, exact Team-scope state, Team fields, reset, and Agent child slot exactly as AgentTeam launch does. An optional presentation string may supply the approved flat-Team helper copy. | Org coordinator, root lifecycle, payload serialization, nested configured Team creation. |
| Exact Agent editor | Existing `MemberOverrideItem` | Render the coordinator badge from exact Team coordinator membership and the Agent's own inherited/overridden state. Direct Org Agents keep their current compact Org placement row and behavior; that row becomes Agent-only. | Containing Team customization; Team/Org ownership. |
| Launch command | `AgentOrgRunConfigPanel` command adapter -> `agentOrgRunStore.launch` | Serialize the two exact sparse maps into the already existing `teamOverrides` and `agentOverrides` GraphQL fields. Team workspace selection maps to the existing placement `workspaceRootPath`; server `AgentOrgRunService` still canonicalizes workspaces, validates all effective configurations, and resolves root -> Team -> Agent. | Shared Team payload/store, new API, client-authoritative effective configuration. |

No generic Team/Org run-config store, payload, root form, or recursive definition
model is introduced. Reusing `EditableTeamScopeFormModel`,
`EditableTeamFormTeamNode`, `EditableTeamFormAgentNode`, and the three existing
editing components is valid because they are presentation models for a real
Team placement and its direct Agents. The Org projector may construct exactly
one Team node level from the strict admitted Org definition. A missing referenced
Team, missing coordinator/member correlation, duplicate exact address, or other
projection inconsistency is a fail-closed unavailable configuration state that
disables Run and identifies the affected address; it is never silently removed
with `flatMap`, repaired in the browser, or represented as an empty Team. Target
definition admission makes configured deeper Team shape impossible. The
AgentOrg domain and launch command remain separate above this view boundary.

#### Exact state and command rules

1. A new Org draft sets the outer disclosure closed. Opening it does not change
   any override and every Team editor retains its own default-closed state.
2. `Member overrides (N)` counts direct configured Org Agent placements plus
   every direct Agent placement in each mounted Team. Team containers do not
   increment `N`; task-scoped runtime Agents are not configuration placements.
3. Team state uses only `hasMeaningfulLaunchOverride(teamOverrides[address])`.
   Agent state uses only its exact `agentOverrides[address]`. An Agent-only edit
   therefore cannot mark its Team `Customized`.
4. The Team baseline is the current Org root draft. Each Team Agent baseline is
   that Team's effective presentation config. These previews explain current
   values, but the server remains authoritative and repeats complete resolution
   and validation before allocating/activating the run.
5. `Reset` at a Team deletes only that Team patch and Team workspace selection;
   it retains every exact Agent patch. Agent reset deletes only that Agent patch.
6. Collapse uses `v-show` or equivalently preserves the store-backed draft; it
   never destroys/recreates the draft or resets local runtime/model/workspace
   field state. Reopening projects the same exact values and state labels.
7. Coordinator identity is derived from the referenced Team's exact
   `coordinatorMemberName`/member address and appears only on that Agent row. It
   does not become an Org coordinator, Team-row action, or launch target.
8. Sibling Team disclosure state is independent. Expanding one Team neither
   expands nor rewrites another; direct Org Agent behavior remains unchanged.
9. Team workspace edits serialize through the existing GraphQL
   `AgentOrgPlacementLaunchConfigurationInput.workspaceRootPath`. No schema,
   resolver, server service, durable tree, or migration change is permitted.

The clean-cut removal is limited to the obsolete Team branch of
`AgentOrgPlacementOverrideRow`. Rename/tighten that component to
`AgentOrgDirectAgentOverrideRow` (or delete it if the existing direct-Agent
primitive can be used without changing the approved compact direct-Agent
behavior). Do not retain the old Team-row path behind a flag, compatibility
prop, or alternate layout. `TeamMemberConfigTree` is the one mounted-Team
presentation path for both desktop and narrow layouts.

The focused AD-REV-012 delta is `Medium / Low`: a small set of frontend owners
and tests changes, but exact draft typing, Team workspace serialization,
progressive disclosure, accessibility, and standalone Team regression make it
larger than a styling-only patch. It adds no backend or persistence risk. The
cumulative package remains `Large / High`, so independent Architecture Review
is still required before Implementation resumes this correction.

### AD-REV-013 AgentOrg Launch-Configuration And Unified Workspace-Shell Recovery

Architecture impact: the user's Electron findings, now governed by approved
`RER-024` (`BEH-013`-`BEH-015`, `REQ-030`-`REQ-032`, `AC-025`-`AC-027`,
`SCN-014`-`SCN-016`, `QR-010`, and `DEC-017`-`DEC-019`). The target is not a
new AgentOrg experience. It is the smallest clean correction that makes the
AgentOrg form and shell obey the established AgentTeam behavior while retaining
the separate Org domain, payload, history identity, and lifecycle.

#### Root causes and owned corrections

| Finding | Root cause / design-health classification | Owning correction | Explicit non-change |
| --- | --- | --- | --- |
| Runtime/model choice previews successfully but launch fails or differs | `Duplicated Policy Or Coordination`: the client preview clears model config on an explicit runtime/model patch, while the Org serializer omits that clear and the server correctly interprets omission as inheritance. | Complete root setter commands plus one pure, idempotent `canonicalizeAgentOrgPlacementLaunchPatch` at the Org draft/command boundary. The same root/placement states feed preview, validation, serialization, and equivalence tests. | No sparse root blob, new GraphQL field, resolved-payload API, server inference rule, or model-catalog policy. |
| Clicking AgentOrg Run replaces the left Workspaces/history tree | `Boundary Or Ownership Issue`: `AppLeftPanel` uses route kind to swap between two components and two navigation/history state owners. | One always-mounted `WorkspaceAgentRunsTreePanel` backed by one mixed tagged workspace-history projection; add `Orgs` as the sibling category directly below `Teams`. | No flattening of Org roots into Teams, no mounted Team root, no history schema change, and no route-specific compatibility panel. |
| Fresh Org and inherited Team show no Workspace although Temp default exists | `Local Implementation Defect` at the root config boundary: Team root opts into the shared selector's available-default policy while Org root opts out; mounted Team correctly has no independent default. | AgentOrg root uses the same root `WorkspaceSelector` default-selection contract as Team. Team/Agent scopes receive the projected inherited root value unless an exact supported Team override exists. | No hard-coded path, definition mutation, focus, mounted-Team auto-default, or workspace persistence change. |

#### DS-024 — one effective launch configuration

The server remains the authoritative fixed-depth resolver. Its existing sparse
field semantics are retained: an omitted field inherits, while an owned
`llmConfig:null` explicitly clears model-specific configuration. The correction
is at the web command boundary because that boundary currently presents a
different meaning from the request it emits.

`canonicalizeAgentOrgPlacementLaunchPatch(patch)` applies these rules to both
Team and Agent placement patches:

1. Preserve exact owned `runtimeKind`, `llmModelIdentifier`,
   `autoExecuteTools`, workspace, and explicit `llmConfig` values.
2. If `runtimeKind` or `llmModelIdentifier` is explicitly owned and
   `llmConfig` is not owned, add `llmConfig:null`. This makes the already-shown
   reset of model-specific settings explicit rather than allowing the server to
   re-inherit a parent provider's settings.
3. If neither runtime nor model is owned and `llmConfig` is absent, keep it
   absent so ordinary inheritance remains sparse. Exact reset deletes the whole
   placement patch and therefore restores inheritance.
4. Normalize once when the Org store accepts a Team/Agent edit; serialization
   asserts or idempotently reapplies the same function. Do not maintain a raw
   patch beside a canonical patch.
5. The form projector computes its displayed effective value from these
   canonical patches and the same root -> Team -> Agent precedence. The server
   independently repeats authoritative resolution and complete validation.

The Org root is deliberately not forced into the sparse placement-patch type.
It remains one complete `AgentLaunchConfiguration`. The existing
`RuntimeModelConfigFields` behavior already emits a dependent `llmConfig:null`
when root runtime/model changes; AD-REV-013 routes those events through explicit
`agentOrgRunConfigStore.setRootRuntimeKind`, `setRootModel`, and
`setRootLlmConfig` commands rather than assigning refs in the panel. Each root
command makes the affected complete root tuple coherent before the next render,
and root launch serialization always includes `llmConfig` (including null).
Thus one invariant covers two truthful representations: complete root state and
canonical sparse placement intent. They are not collapsed into an optional-field
generic configuration blob.

Example: root `{runtimeKind: CODEX_APP_SERVER, model: gpt-5.6-sol,
llmConfig:{reasoning_effort:'low'}}` plus exact `/lead`
`{runtimeKind: AUTOBYTEUS, model: deepseek-v4-flash}` becomes the wire patch
`{runtimeKind: AUTOBYTEUS, model: deepseek-v4-flash, llmConfig:null}`. Client
preview, server resolver, validator, and persisted Agent snapshot therefore all
produce the same result. The rule applies identically to a direct Org Agent, a
mounted Team scope, and an Agent inside that Team.

The architecture requires a cross-layer fixture matrix, not duplicated
TypeScript implementations asserted only in isolation. Each fixture supplies
root/Team/Agent sparse intent and asserts: (a) browser projected effective
configuration; (b) exact GraphQL variables; (c) server resolver output; and
(d) stored run-tree placement configuration. Cover inherited, explicit config,
explicit null, runtime-only, model-only, runtime+model, Team+Agent precedence,
reset-to-inherit, incompatible-model rejection, workspace, and tool approval.

#### DS-025 — one route-stable Workspaces/history surface with non-overlapping owners

`AppLeftPanel` always mounts `WorkspaceAgentRunsTreePanel`; the current
`showAgentOrgRunHistory` route predicate and the alternate
`AgentOrgRunHistoryPanel` mount are removed. Route transitions change only the
center workspace target, never the left history owner. The unified panel reads
one workspace projection with ordered sibling collections:

1. existing standalone Agent collection(s), unchanged;
2. `Teams`, unchanged standalone Team roots;
3. `Orgs`, immediately below `Teams`, containing AgentOrg roots; and
4. any other already-established category in its existing relative position.

The exact presentation order is owned by the workspace-section projector, not
by the current route. Org rows reuse the passed AD-REV-006/007 hierarchy:
Org root -> direct Agents/direct mounted Teams -> Team Agents and task lineage,
including mounted-Team aggregate status. They remain tagged
`root_subject_kind:'agent_org'`. The projector must never insert an Org under
`Teams` or register a mounted Team as a Team root. The section's loading/error/
empty predicates count all three root collections; an Org-only workspace is not
rendered as empty, and the `Orgs` heading remains the sibling after the
Teams position even when that workspace has no Team roots.

The one web read owner fans out through the two already-implemented queries; it
does not require a new history API. `ListWorkspaceRunHistory` remains the source
for established standalone Agent and Team workspace groups.
`ListCollaborationRootHistory` is filtered by the explicit
`root_subject_kind:'agent_org'` branch and strictly parses each Org tree before
projecting its root Workspace. A non-empty root path joins the existing
normalized-path Workspace group (or its existing history-only projection when
the catalog no longer contains it); a legacy/null root path remains visible in
one localized read-only `No Workspace` history group and is never discarded or
turned into an invented path. The query's Team branch is not re-added to the
workspace store, so standalone Teams cannot be duplicated. Refresh commits each
valid family slice atomically and preserves the prior committed slice when the
other query fails, with a family-scoped error. No JSON-shape cast, bare-ID
inference, or route input participates in this merge.

The mixed history read model owns history loading, strict subject decoding,
family-scoped success/error slices, workspace grouping, stable row identity, and
explicit category/row order. It owns no expansion, reveal, selected-row
presentation, or scroll state. The one always-mounted
`WorkspaceAgentRunsTreePanel` creates exactly one
`useWorkspaceHistoryTreeState` instance; that panel-scoped controller owns
expanded keys, ancestor reveal, and selected-row highlight continuity while the
panel's persistent scroll container owns scroll position. The existing subject
selection store remains the authority for the selected root/member identity and
is injected as a signal; the tree-state controller owns only how that identity
is revealed/highlighted. Route changes do not recreate either the panel or this
controller. Subject stores retain commands only: their already-supported
actions are invoked through a discriminated `WorkspaceHistorySubjectActions`
port carrying explicit root kind and ID. Agent
and standalone-Team action sets remain unchanged. An Org root supports its
open/select inspection, deliberate-send restore, and stop-to-history paths
under DS-035–037; the consolidation does not
invent Org archive/delete. Org lifecycle still terminates/restores only the Org
root. The AgentOrg execution context continues to own active Org
topology/focus/stream; the unified history store consumes its public projection
and does not become a second runtime authority.

Consequently, `agentOrgRunStore.history`, `historyError`, and `fetchHistory`
are removed. Org launch/restore/terminate commands return their normal result
without mutating a parallel history cache. The launch caller and the typed
history subject-action adapter request a refresh from the unified read owner
after a successful command; active Org context/stream facts continue to overlay
live status through the existing context projection. Neither store imports the
other to perform lifecycle work.

Useful Org row/tree rendering currently inside `AgentOrgRunHistoryPanel` is
extracted into neutral workspace-section children or moved into
`WorkspaceHistoryWorkspaceSection`. The standalone panel is then deleted in the
same change. Do not retain it behind a route, flag, wrapper, or fallback. A
catalog -> config -> launch -> focus -> stopped/history route sequence must keep
the same component/store instance and existing Agent/Team/Org rows, expansion,
selection, and scroll unless the user changes them.

#### DS-026 — root workspace default and exact inheritance

The AgentOrg root uses the same existing `WorkspaceSelector` root policy as
`TeamScopeConfigEditor`'s Team root:

1. The Org config store tracks the root selection source as one of
   `untouched | defaulted | explicit`. On a fresh draft only, after the shared
   workspace catalog is available and while the source is `untouched`, select
   the actually available `Temp Workspace (Default)` record and mark it
   `defaulted`.
2. Never synthesize the label or path. If no eligible default exists or the
   catalog fails, keep the root unset, display the existing actionable error,
   and keep Run disabled.
3. Any user existing/new Workspace interaction marks the source `explicit`
   before applying its value. It wins and survives Team disclosure,
   route-preserving center transitions, catalog refresh, and validation errors.
   If its record/path later becomes unavailable, retain it with a scoped error;
   do not default over it.
4. Mounted Team and exact Agent editors do not auto-select another default.
   Their baseline projects the effective root workspace. Only a supported exact
   Team workspace patch replaces it for that Team branch; Agent workspace
   remains governed by the approved input shape.
5. Selecting a workspace changes configuration only. It never focuses a member,
   creates an Org coordinator, mutates a definition, or starts a run.

Freshness is an explicit launch-draft lifecycle, not a test that the definition
ID changed. The catalog/detail `Run` action begins a new Org draft (new draft
epoch) even when it targets the same definition as the previous completed run;
ordinary re-render, disclosure, model-catalog retry, or validation error stays in
the current epoch. A new epoch resets selection source to `untouched`, after
which the available-default rule may run once. This prevents both stale reuse and
the current store's same-definition early-return from defeating a genuinely
fresh launch.

The shared workspace store/catalog is the only source of workspace records.
The Org panel neither owns a second list nor refetches/resets the left history
tree. `WorkspaceSelector` remains a presentation/selection control; the Org
config store owns the chosen draft value and the existing launch command maps
it to `workspaceRootPath`.

#### Failure and lifecycle behavior

| Failure | Owner | Required result |
| --- | --- | --- |
| Runtime/model catalog selection is unavailable or invalid | Existing runtime/model selector plus Org config store | Retain exact draft and adjacent error; do not serialize a partial placement or launch. |
| Canonical patch and projected effective result disagree | Org launch command boundary | Fail closed before GraphQL with an invariant diagnostic; never guess or defer the disagreement to the server. |
| Server rejects the complete effective plan | Existing AgentOrgRunService | No Agent/run ID allocation or partial activation; return scoped validation and retain the browser draft. |
| Unified history query fails for one subject family | Mixed history projector/store | Keep already committed rows visible, show family-scoped refresh error, and do not replace the entire panel with another authority. |
| Org row identity/family mismatch | Mixed history projector | Reject the row; never place it under Teams or try another family reader. |
| Temp default is absent/unavailable | Shared workspace catalog + Org root draft | No invented path; root stays unset and Run stays blocked with existing error. |
| Exact Team workspace override becomes unavailable | Org config store/server validator | Preserve the exact Team patch and scoped error; do not fall back silently to root or mutate siblings. |

#### Scope, migration, and classification

AD-REV-013 affects frontend configuration and workspace/history composition
only; AD-REV-014 changes only the Architecture-owned allocation of DS-025
responsibilities. Existing GraphQL inputs, server resolution, Team V2/Org V1 run files,
sidecars, migration, streams, focus, task lifecycle, and root lifecycle remain
unchanged. Existing stored runs are directly usable; history indexes remain
derived and require no persisted-data migration. The obsolete alternate left
panel is source removal, not data migration.

The focused AD-REV-013 delta is `Medium / High`: implementation spans several
existing web owners and one cross-layer semantic invariant, while the history
surface is shell-wide. The AD-REV-014 document-only correction is `Small / Low`.
Cumulative classification remains `Large / High`, and independent Architecture
Review is required before implementation resumes.



### AD-REV-015 AgentOrg First Accepted External-Message History Summary

Architecture impact: approved `RER-025` (`BEH-016`, `UC-018`, `REQ-033`,
`AC-028`, `SCN-017`, `QR-011`, and `DEC-020`). The row/fallback and every
transport field required to read a summary already exist. The correction is one
missing derived-metadata lifecycle, not a new AgentOrg workspace design.

#### DS-027 — exact accepted-message qualification and first-write history

**Primary live spine**

`focused accepted Agent/Team workspace composer -> Org context-store submission (DS-036) -> AgentOrgStreamingService
SEND_MESSAGE -> AgentOrgStreamHandler -> AgentOrgRun exact command-with-execution-kind boundary -> direct Org, mounted-Team,
or task-scoped AgentRun admission unchanged -> accepted result plus exact kind ->
when kind is configured, AgentOrgRunService.recordRunActivity ->
AgentOrgRunHistoryCatalogService.recordRunSummary ->
AgentOrgRunHistorySummaryWriter.commitFirstNonEmpty -> compactSummary -> atomic
agent_org_run_history_index.json write -> accepted AGENT_COMMAND_ACK`.

`AgentOrgRun` adds an internal `executeAgentCommandWithExecutionKind` outcome
that resolves the exact indexed Agent once, delegates through the same current
direct/mounted/task handle path, and returns the unchanged operation result plus
that indexed execution kind. Existing `executeAgentCommand` delegates to it and
returns only the operation result, so external command admission—including a
supported SEND_MESSAGE to a task-scoped Agent—does not change. The Org stream
handler uses the enriched outcome only to decide whether an accepted SEND_MESSAGE
qualifies: `executionKind === 'configured'`. Qualification therefore comes from
the strict execution tree rather than rejection, address shape, UI focus, or a
filesystem lookup.

Only the `SEND_MESSAGE` branch creates an `AgentInputUserMessage` with external
`input_origin:'user_message'` and is eligible for summary filtering. The handler
calls history only when that exact command returns `accepted` and the captured
execution kind is `configured`. The shared summary writer alone compacts content
and performs no write for empty text. Rejected/failed sends, task-scoped recipients,
inter-Agent delivery, task or system input, interrupts, approvals and denials
never enter the catalog method; an accepted SEND_MESSAGE to a task-scoped Agent
still returns its normal command result.
The shared writer imports the established `compactSummary` helper; neither the
catalog nor migration reimplements truncation.

`recordRunSummary({orgRunId, summary})` executes inside the catalog's existing
serialized mutation queue and delegates the physical mutation to one injected
`AgentOrgRunHistorySummaryWriter`. Its `commitFirstNonEmpty({rows, orgRunId,
summary})` imports `compactSummary`, returns a closed disposition plus unchanged
rows without a write for empty text, a missing row, or an already non-empty
summary, and otherwise atomically writes and strictly rereads the same current
index shape. The catalog replaces its in-memory rows only from that successful
result.
`rowFromTree`, create, stop, restore and rebuild continue to preserve an existing
summary. No summary is stored in the Org tree, Agent trace, message sidecar,
task sidecar, or stream event.

```ts
type AgentOrgRunHistorySummaryCommitResult = Readonly<{
  disposition: "WRITTEN" | "UNCHANGED_EXISTING" | "SKIPPED_EMPTY" | "MISSING_ROW";
  rows: readonly AgentOrgRunIndexRowRecord[]; // strict reread on WRITTEN
  committedSummary: string | null;
}>;
```

The writer accepts an explicit strict row snapshot and index-store dependency;
it owns no singleton, queue, manager, package discovery, or trace access.
`MISSING_ROW` performs no write but is mapped by both the active-run catalog and
the migration to their existing operational/invariant failure paths; it is not
silently treated as a successful summary attempt.

For concurrent external sends, “first accepted” is the completion order of the
exact command results whose returned execution kind is configured in the server event loop. Each
handler continuation immediately enqueues `recordRunSummary` before any other
await; the catalog queue preserves that enqueue order and the first non-empty
mutation wins. Tests control two deferred Agent results, resolve them in both
orders, and prove the accepted completion—not socket arrival, target address,
or later write completion—selects the stable value. No new root message FIFO,
sequence field, lock file, or persisted arbitration state is introduced.

A derived-index I/O error after Agent acceptance must not relabel the already
accepted Agent command as rejected/failed or replay it. The handler preserves
the truthful accepted ACK and reports the metadata failure through existing
server error observability. Under the migration convention's normal storage
prerequisites the catalog commit precedes that ACK; no special journal, retry
protocol, or provider rollback is added for unsupported storage failure.

**Return/read spine**

`durable summary -> accepted SEND_MESSAGE ACK -> AgentOrgStreamingService
accepted-command callback -> agentOrgContextsStore-injected quiet history
refresh -> existing ListCollaborationRootHistory query -> strict AgentOrg-only
decoder -> mixed history read-owner Org slice -> stable Workspace/Orgs row
-> existing WorkspaceAgentOrgHistoryCollection summary rendering`.

The WebSocket contract is unchanged. `AgentOrgStreamingService` retains pending
command type/target, and after an accepted `SEND_MESSAGE` acknowledgement invokes
an injected `onAcceptedExternalUserMessage` callback. The callback asks the
existing mixed history owner—not the Org runtime context or command store—to
refresh only its AgentOrg family slice using `network-only`. Full history loads
and focused refreshes share one monotonic AgentOrg request generation; only the
latest initiated successful response may replace that slice. A failed refresh
retains the last committed slice and its existing family-scoped error. The
callback never patches the client with the submitted text, so concurrent tabs
observe the catalog winner rather than competing optimistic values. The row
component and tree-state owner remain presentation-only and unchanged.

**Historical recovery spine**

`startup AppDataMigrationRunner -> AgentOrg family/trace-layout prerequisites ->
current strict Org package catalog/index rebuild -> empty current Org row ->
strict AgentOrg V1 tree -> configured Agent placements only -> exact
AgentMemoryLayout direct/mounted paths -> complete archived+active raw-trace
corpora + root sidecar negative evidence -> migration-only provenance classifier
-> unique earliest candidate -> shared summary writer -> strict index reread/
validation -> bounded runner result/log`.

This is **Migration Required** for derived metadata even though the index schema
is unchanged. A registered startup-only
`20260905_agent_org_history_first_message_summary_v1` migration is placed after
`20260901_agent_org_flat_team_families_v1`, raw-trace rotation-layout, and
active-file-name migrations. It may reuse current strict target tree, package,
index, location, layout, complete-corpus and summary-writer services; every
legacy inference rule stays within the migration directory and is never called
by normal history reads/writes.

For each admitted current Org row, in deterministic root-ID order:

1. Preserve every non-empty current summary without reading traces.
2. For an empty row, traverse only configured Agent nodes in the strict V1 tree.
   Direct Agents use empty Team ancestry; mounted-Team Agents use that exact
   direct TeamRun ancestry. Never enumerate a directory or include root/task/
   task-Team Agents.
3. Read the complete current raw-trace corpus for every configured Agent and the
   root-owned communication/task records needed to test provenance. A raw-trace
   candidate must be an object with `trace_type:'user'`,
   `source_event:'AgentRun.postUserMessage'`, non-empty compacted string content,
   and a finite timestamp. The classifier may accept only the earliest such
   configured-scope fact when the strict passive-at-launch lifecycle and the
   retained root records prove that no inter-Agent, task/system, task-scoped, or
   other nonqualifying input could be that fact or precede it. In particular,
   deterministic communication/task input envelopes and their recipient/time
   evidence are exclusion evidence, never positive external-message evidence.
   The classifier derives every finite creation/transition timestamp capable of
   delivery to a configured Agent from the strict root sidecars. The candidate
   must be strictly earlier than all such facts and must not exactly match a
   deterministic internal envelope for that recipient. An earlier/equal sidecar
   fact, an envelope match, missing/unparseable required corpus, or any other
   contradiction in that causal prefix makes the row ambiguous. This deliberately
   skips rather than guessing when old sidecars cannot prove provenance. No later
   record is promoted merely because an earlier record was excluded.
4. Select only when one provenance-qualified candidate has a strictly earliest
   timestamp across the entire configured scope. Equal earliest timestamps,
   unreadable/invalid candidate or exclusion evidence, a nonqualifying earliest
   fact, no candidate, or any inability to prove the unique external origin is
   `SKIPPED_NO_UNIQUE_QUALIFYING_TRACE`; leave the summary empty and keep the
   approved `New - <AgentOrg name>` fallback. Do not break ties by address, path,
   file order, run ID, content, or heuristic parsing of user-visible prose.
5. Pass the unique content and strict current row set to the shared
   `AgentOrgRunHistorySummaryWriter`; its same compaction/first-write/atomic
   reread primitive used by the catalog must return the selected value while all
   pre-existing non-empty summaries remain semantically unchanged. The migration
   runs before supervisor/catalog construction and therefore never constructs a
   second runtime manager or catalog merely to perform this write.

`SKIPPED_EXISTING_SUMMARY` contributes an ordinary skip.
`SKIPPED_NO_UNIQUE_QUALIFYING_TRACE` is a bounded nonfatal reason and makes the
migration `SUCCEEDED_WITH_WARNINGS`; current data remains independently valid
because the empty string and existing localized fallback are the approved
truthful state. Failure to read current required package/index structure or to
atomically write/reread a selected value is `FAILED`, recorded by the existing
runner with restart recovery according to the canonical migration convention.
Diagnostics aggregate reason counts and cap examples; they do not log message
content. One ordinary interrupted-attempt/restart test proves idempotence. No
backup, custom journal, alternate index, runtime trace fallback, backfill-on-read,
or corruption/power-loss matrix is added.

#### Ownership, interfaces, and non-changes

| Boundary | Owns | Does not own |
| --- | --- | --- |
| `AgentOrgRun` command-with-kind outcome | Current tree/index identity, unchanged liveness/direct/mounted/task handle delegation, operation result plus exact execution kind | Summary normalization, history storage, UI or migration inference |
| `AgentOrgStreamHandler` | External command type, result ordering, history call before normal accepted ACK | First-write policy, history row state, task/system/inter-Agent inputs |
| `AgentOrgRunService` | Application-facing run lookup and `recordRunActivity` facade | Index file format or trace backfill |
| `AgentOrgRunHistoryCatalogService` | Serialize normal-runtime summary attempts, supply current rows, and replace in-memory rows only from the shared writer's committed result | Legacy trace interpretation, standalone physical writer policy, or client presentation |
| `AgentOrgRunHistorySummaryWriter` | Shared compaction, first-non-empty row transform, atomic index write, strict reread, and closed mutation disposition | Queue ownership, migration inference, live command qualification, manager/catalog construction, or client presentation |
| Mixed web history read owner | Authoritative query, strict decode, latest-generation Org slice commit | Optimistic summary, Org runtime state, tree presentation state |
| Registered migration | Fixed historical classifier and bounded recovery dispositions | Normal runtime reads, new trace/schema fields, UI fallback |

Production composition passes `generalProcessRunSupervisor.agentOrgRunService`
into the Org WebSocket handler through `build-studio-server ->
registerWebsocketRoutes -> registerAgentWebsocket`; no second manager/catalog
singleton is created. The handler depends only on the service's `getActive` and
`recordRunActivity` surface. Startup constructs the summary writer directly over
the strict index store before the supervisor exists; normal runtime injects that
writer into its single catalog. Existing Agent/Team handler injection stays exact.

No Product artifact, GraphQL field, collaboration-stream DTO, AgentOrg V1
execution-tree key, task/message/trace record, focus rule, recipient fallback,
routing rule, Agent lifecycle, or mounted-Team root authority changes. The
focused AD-REV-015 delta is `Medium / High`; cumulative classification remains
`Large / High` and requires independent Architecture Review.

### AD-REV-016 Migration-Status Authority Reconciliation

Architecture recovery: `ARCH-REV-013 / AR-FIND-007`. The DS-027 live spine,
historical classifier, writer, prerequisites, restart behavior, and every
approved outcome remain unchanged. The correction is solely to make the two
registered migrations' terminal-status contracts explicit and non-overlapping:

- `20260901_agent_org_flat_team_families_v1` has no
  `SUCCEEDED_WITH_WARNINGS` disposition. Unsupported in-scope source, invalid
  target/current structure, family conflict, or required retired-authority
  cleanup failure is `FAILED`; exact current/native items are ordinary skips.
- `20260905_agent_org_history_first_message_summary_v1` returns `SUCCEEDED`
  when all admitted rows are existing-summary skips or successful backfills
  with no warning skip. One or more independently valid empty rows classified
  `SKIPPED_NO_UNIQUE_QUALIFYING_TRACE` makes the migration
  `SUCCEEDED_WITH_WARNINGS`. Failure to read required current package/index
  structure, or to atomically write and strictly reread a selected value, is
  `FAILED`.

The family migration's cleanup rule cannot be borrowed as a warning exception
by the summary migration, and the summary migration's nullable-metadata warning
cannot weaken family migration admission or cleanup. The convention and outcome
tables below identify the owning migration for every row. Focused AD-REV-016 is
`Small / Low`; the cumulative package remains `Large / High` and requires
independent Architecture Review.

### AD-REV-019 — Preserve Task Workflow Across The AgentOrg Boundary

**Authority:** approved `RER-028@fadfb3c000d57df7efe42ed0e503d86057c0d713`;
REQ-034–036, AC-029–031, SCN-018–020. RER-028 expressly supersedes
AD-REV-018's configured-only communication presentation gate. AAV-001/RER-027
still protects genuine retained input. Earlier task-exclusion statements are
historical, not current implementation instructions. No Product gate is open.

**Current evidence:** `architecture-task-parity-investigation.md` compares the
immutable earlier Team baseline `5fb16658` with source artifact `6ef456e0`.
Further reads show that Org task rows are non-selectable, focus uses only an
address, task seeds use a placeholder definition/root launch, and task projection
metadata borrows a configured source's platform binding. These are material
identity/presentation gaps: two tasks and their configured source can share an
address but must not share conversations, controls, relevance, or provider IDs.
The current root task engine, fresh task preparation, retained execution nodes,
sidecars, exact-ID commands and physical memory layout already support the
underlying workflow. This is not a new task system.

**Design health:** refactor needed now at the read/presentation boundary.
Remove Team-only ownership of task UI and configured-only communication policy;
reuse accepted components with two independent root-scoped read facets. Preserve
all task admission, submission/review authorization, root shutdown and settlement
mechanisms. Focused delta is `Medium / High` (identity, read API, accepted-event
projection and frontend ownership); cumulative `Large / High` requires review.

#### DS-028 — One accepted ordinary message, every exact participant

`Agent tool -> existing global/root delivery authorization -> RootCommunicationEngine
-> exact receiver reservation -> one Org sidecar commit -> root communication
event -> exact receiver presentation -> input release -> Org context -> selected
participant Messages and receiver conversation`.

Keep the existing adapter order: commit engine/root message snapshot, commit
receiver reservation, publish root `communication`, invoke the Org-owned
presentation callback, then release input. The callback still receives only
`{message: CollaborationCommunicationMessageV1, receiverInput: AgentInputUserMessage}`.
It resolves **both** committed IDs through the existing retained
`AgentOrgExecutionIndex` (no second liveness check after acceptance) and publishes one existing `MEMBER_INPUT_MESSAGE` for the exact receiver, using
record `createdAt`, recipient input metadata/dedupe identity, sender ID and
`parentCommunicationMessageId`. All admitted pairs qualify: configured→configured,
configured→task, task→configured and task→task, with `task` including task-Team
Agents. Remove `OrgCommittedMessagePresentationEligibility`, its configured-only
identity cast and `preserved_task_pair` no-op branch. Keep exact root/identity
validation, not a replacement kind-based permission policy. Invalid/missing
committed identities follow existing fail-stop/reopen handling. Rejected or
uncommitted sends never enter this callback. Command results, logical/exact-ID
routing, allowed recipients, sidecar schema and provider delivery are unchanged.

`AgentOrgRun.presentCommittedCommunication` owns this publication;
`AgentOrgCommunicationAdapter` owns durability sequencing, not endpoint lookup.
The shared presentation adapter retains duplicate collaboration-event filtering.
Existing raw provider-event retirement after task settlement remains unchanged;
this committed-message consequence is validated against retained identities, not
reinterpreted as a new live-input request or a reason to reactivate an endpoint.
A publication error after durable acceptance must not masquerade as a rejected
send or cause replay. Existing root sequence/checkpoint recovery applies.

The Messages facet reads **ordinary communication records only**. Select by exact
AgentRun ID, require both endpoint identities in the complete retained Org view,
filter sender/receiver participation, then project direction, original message
ID, content/type/time and existing reference path. Never filter by containing
Team, configured source, address equality, or liveness. A settled counterpart
remains a valid historical identity. Unknown identity is a correlation error,
not a row silently dropped or relabeled with a definition. No task update or
system notification is synthesized as a communication row.

#### DS-029 — Exact execution selection and participant Tasks

Primary flow: `Workspace task row or Tasks participant navigation -> existing
root-tagged history action/router -> Org context selection -> exact retained
execution index + AgentContext -> root Tasks/Messages facets -> accepted
conversation/header and task list/detail/reference components`.

Return flow: `task engine committed activation/submission/review/settlement ->
Org sequenced task event/checkpoint -> one candidate view/index -> participant
Tasks projection -> existing count/disclosure/list/detail`. No task polling,
second store, or component-owned mutation is added.

**One retained identity index.** Add
`services/agentOrgExecution/agentOrgExecutionViewIndex.ts` under the existing
web Org context. It is an immutable derived index of that context's strict
execution tree and task records, not another state owner or server runtime
index. Replace the fragmented address/task-ID maps and the communication-only
configured-map/task-ID-set partition. Each exact AgentRun maps to its recorded
address, exact host (root or Team run), execution kind, frozen launch source,
actual execution platform binding, and, for task participants, exact enclosing
assignment/task ID and task execution root ID. Task records join to retained
executions by their AgentRun/TeamRun references; require unique matches and reject
contradictory roots, duplicate run IDs or missing retained task binding.

Configured source lookup by recorded address is permitted **only** to obtain
its frozen launch configuration/definition identity from this run tree (tasks
are created from that captured configuration). It cannot supply the task's run
ID, provider binding, physical host, status or selected identity. Source
configuration is not current catalog data. Nested task scopes recurse through
retained runtime nodes; configured structure stays fixed depth.

Task-Team participant enumeration follows the earlier selector: traverse the
assigned fresh Team's `members` (including represented nested Team members),
not independently delegated descendant `taskExecutions`. Descendant assignments
have their own exact participants. Task relevance is exactly:

- selected run is `task.delegatorAgentRunId`; or
- selected run is the assigned task AgentRun; or
- selected run is an Agent member of that **exact fresh task Team**.

A configured source Team's members and another task of the same definition do
not qualify. A task-origin delegator sees tasks it actually delegated. All
records remain available after settlement; active-tree visibility is a separate
projection over `settledAt` and ancestor settlement, not deletion from the index.

**Selection is identity, not address.** In the owning Org context replace
`focusAddress` as authoritative state with a strict value:

```ts
type OrgWorkspaceSelection =
  | Readonly<{ kind: 'agent_execution'; agentRunId: string }>
  | Readonly<{ kind: 'configured_team'; teamRunId: string }>;
// null is the intentional unfocused root. Address is derived from the index.
```

Existing configured-address UI entries resolve once into this value; they are
not task selectors. Task Agent rows pass exact AgentRun IDs. A task Team row
resolves its exact retained coordinator member from the task Team's members and
the frozen source coordinator address, then selects that **task** AgentRun;
never the configured coordinator. Tasks detail exposes the existing participant
navigation using exact assignment/run identity. Invalid selection stays
unavailable/unfocused, never first-member fallback. Store/router/pending focus,
reconnect restoration and selected-row highlighting carry the same selection.
Extend the existing Org navigation query with exact `agentRunId` when selecting
an Agent execution; `memberAddress` remains corroborating context, not identity.
No server command route is replaced: active interaction still sends its existing
exact `targetAgentRunId`; history selection never sends a command.

The context supplies the existing Agent/Team surfaces through explicit target
variants for Org task Agent and Org task-Team Agent. Task-Team roster comes from
its exact execution, not from configured T. Task badge/description/status reuse
the established Team header presentation, extracted into a shared header if
needed rather than inventing a fake Team for a task Agent. Configured Team focus
continues to enter its configured coordinator; fresh Org launch is still unfocused.
The unchanged complete-scope root shutdown remains the only Org stop authority.

**Two narrow read facets.** Add
`types/workspace/collaborationTasksContextView.ts`:

```ts
interface CollaborationTasksContextView {
  readonly rootKind: 'agent_team' | 'agent_org';
  readonly rootRunId: string;
  readonly focusedAgentRunId: string;
  listDelegatedTaskEntries(): readonly DelegatedTaskEntry[];
  taskReferenceContentPath(taskId: string, referenceId: string): string;
}
```

Expose `collaborationTasks` beside `collaborationMessages` on every selected
collaboration Agent target, including direct Org and task executions. The Team
adapter implements the facet using its existing task selector; the Org context
uses its retained index and one task sidecar. Remove those two methods from
`TeamWorkspaceContextView`; it retains only genuine Team roster/coordinator/
header context. No task UI consumer depends on both a root context and its
internal sidecar/projector.

Move `utils/teamDelegatedTaskEntries.ts`'s reusable row/lifecycle/participant
**types** to `types/workspace/collaborationTaskPresentation.ts`, leaving Team
wire conversion in the Team utility. Replace the misleading row
`teamRunId = orgRunId` with one explicit root-tagged identity shared by both
adapters. Keep taskId, exact assignee execution reference (Agent or Team), and
exact participant navigation identity; labels/address context are display, not
keys. Use a closed configured/task participant display shape for Messages as
well: existing counterpart run ID plus recorded address and optional *task
variant* carrying taskId/host/run context. DS-034 supersedes the former
always-visible Task badge/run discriminator: keep identity in the read projection
and expose it on demand, not as extra metadata lines in the Messages list.
No arbitrary same-name collapsing. Interruption remains a system lifecycle item, not a fake
Agent sender. No Team wire or durable DTO is renamed merely for presentation reuse.

Rename the Org `agentOrgTeamPresentation.ts` task projector to
`agentOrgTaskPresentation.ts`, remove its required `ConfiguredTeam` argument and
Team-local delegator lookup, and consume the single retained index. Resolve
submissions/reviews by recorded IDs, not array ordinal alone; ordinals are only
display. References use existing Org task routes, not communication routes.

`CollaborationOverviewPanel` receives Messages and Tasks facets; eliminate
`v-if="team"` as Tasks eligibility. Extract/rename `TeamDelegatedTasksSection`
to `collaboration/CollaborationDelegatedTasksSection.vue`, accepting the Tasks
facet. Reuse its existing navigator/detail/lifecycle components with root-neutral
row types. Keep the fine-tuned disclosure/count, empty state and auto-opening
of newly relevant tasks. Section state key includes root **and selected exact
AgentRun**, so another participant does not inherit an unrelated selection.
Desktop panel and narrow drawer consume the same composition. `Team`/`Org` tab
labels remain truthful; no separate task dashboard or new task action.

#### DS-030 — Task records and genuinely accepted system input

`assignee submit_task_result -> existing RootTaskLifecycleEngine commit ->
Tasks record/event -> deliverSystemMessage(exact delegator) -> existing AgentRun
acceptance -> existing accepted-input presentation -> recipient conversation`.
Review/revision uses the same current lifecycle and exact assignee notification.
The initial task work packet also reaches the existing accepted-input path after
activation publication. Do not make the Tasks UI infer notification delivery.

Current `ConfiguredAgentExecutionHandle.postMessage` already emits `member_input`
only when `AgentRun.postUserMessage` returns accepted. Preserve that ownership
and acknowledgement path; do not publish a second receiver input at task-engine
commit. The presentation adapter must distinguish `SenderType.SYSTEM` from an
external human. Reuse existing `SYSTEM_TASK_NOTIFICATION` presentation for
accepted task-system input and its established system sender rather than
labeling it as user-authored or ordinary inter-Agent communication. Mark task-system input in `buildTaskAssigneeWorkPacket` and the
notification-input construction used by `RootTaskLifecycleEngine.notify`, where its
task provenance is known. Retain message identity/content/reference context; use the existing
provider notification-suppression metadata convention to prevent a duplicate
backend SYSTEM_TASK_NOTIFICATION for that same input. Move the currently
Team-owned task-system visibility utility into shared collaboration/task
presentation ownership and update imports without aliases. The task input builders set the marker; the shared handle preserves its
existing accepted-result publication and the adapter recognizes the marker plus
SYSTEM sender. Arbitrary system/human/inter-Agent inputs are not reclassified.
The marker changes presentation ownership only, not delivery acceptance, routing
or durable schema; preserve the existing accepted/rejected result.

The shared accepted-input adapter selects one result (system notification or
ordinary member input); it must not emit both. Provider-origin notifications
unrelated to these marked inputs retain their current path. Strict root stream
sequence/reconnect dedupe remains the transport authority; do not dedupe separate
identical notifications by content. No synthetic task record, delivery receipt
store, outbox, retry/replay, or new notification-delivery API is introduced.

When notification is rejected, retain committed task status/submission/review
and its existing warning; emit no accepted input and no Messages row. Publication
failure after input acceptance uses the existing failure/recovery boundary, not
rollback of the task commit. Captured submission references remain in Tasks;
only references actually carried by the accepted input may appear with that
input. Do not fabricate reference attachments from the task record.

#### Exact history, settlement, and projection metadata

Ordinary messages, task records, execution nodes and real provider traces
already persist independently. **No migration is required:** existing current
records retain exact endpoint run IDs, task assignee/delegator references,
recorded address/host topology, actual task platform bindings and settledAt.
The meaning of these records is unchanged. Do not backfill undelivered system
notifications or delete task input; AAV-001's retained-provider-history ruling
stands. Older trace entries lacking structured source provenance are shown as
retained provider input, not falsely asserted to be human input or reconstructed
as delivered system events by matching task text.

Fix `AgentOrgExecutionTreeLocationService` / `AgentOrgMemberRunViewProjectionService`
metadata assembly: exact located execution supplies AgentRun/platform binding,
physical directory and enclosing task identity; frozen source supplies only
launch/definition fields. A nullable actual platform binding stays nullable; it
is never filled from the configured source. Projection liveness is exact
execution membership (`root active && index.isLiveAgent(actualRunId)`), not root
activity alone, so settled participants use retained history even in a live Org. Never pass configured T's provider binding to task
history. Resolve all selected task sources strictly from the captured tree;
unavailable projection is an explicit unavailable/error state, not an invented
empty conversation. Browser hydration must remove the `task-execution` definition
placeholder and root-default launch shortcut and resolve the same captured
source. Genuine empty trace is a distinct accepted empty projection.

For live roots retain the existing checkpoint/stream candidate flow. Activation
may require checkpoint refresh to obtain new task identities/contexts; buffer
subsequent events until the single candidate is correlated. Rebuild view index
and facets atomically on topology changes, and publish the context replacement
through the established shallow-reactive store boundary. Tasks count, message
rows and selected header must update without refocusing. On settlement mark
exact descendants terminal, retain their AgentContexts/identity/history, and
remove their active hierarchy rows. If selected, keep the exact conversation
read-only with settled task status; never silently select its configured source.

For stopped roots or retained-task inspection, add the read-only application
query `getAgentOrgRunInspection(orgRunId)` via `AgentOrgRunService` to the existing
manager/package read boundary. It returns the existing strict execution-view
shape, not a new persisted aggregate. The manager reuses `withTransition(orgRunId, ...)` for inspection and brings its
existing `terminate` entry under that same transition scope (create/restore
already use it; stopAll already calls terminate). Do not nest acquisition inside
a transition or hold it across provider work other than existing termination.
This serializes package reads against root publication/removal without changing
the task FIFO, Agent fence or shutdown order. Inactive reads load
and use the existing `validateAgentOrgStatePackage` over strict tree + task +
communication store reads (not `loadAndRepair` and not restore). Historical
Agent runtime statuses are offline/terminal truth; saved task statuses are read
unchanged, not repaired or relabeled completed merely because the root is inactive. Active reads use the existing coherent root snapshot path.
The inactive view's base sequence is the non-stream initial value (0), never a
live resume cursor. Extract the existing view projector's tight snapshot input from its live-run
wrapper so inactive data can be projected with explicit `orgRunId/isActive/base`
without constructing an AgentOrgRun. Reuse the existing strict DTO validation.
Add no second manager/catalog or activation side effect.
An active-query candidate is reconciled using existing stream/checkpoint rules;
it is not combined with an unrelated disk snapshot.

History navigation loads this read-only candidate into the same Org context
owner. Add `historical` context mode and an explicit target `access` discriminant (`live`, `continuable`, or `read_only`);
the shared composer/config/approval/interrupt controls check that discriminant,
and a read-only target has no interaction port. DS-035 adds a distinct
continuable, send-only capability for inactive configured Agents; it does not
make history live. Active-only callers must narrow before invoking controls;
no no-op/fake successful send or hidden transport exists. Use existing retained-task
navigation to reach settled Agents, not active hierarchy resurrection.
DS-035–037 supersede the former configured-selection restore journey: all history
selection is observational, deliberate Send may restore only the Org root, and
settled tasks never resume. Successful Stop preserves exact conversation and
selection rather than opening configuration. Root run selection, panel/tree UI state and data grouping retain their
DS-025 owners. No mounted-Team stop/restore/archive or configured nesting returns.

#### Concrete normal workflow and identity example

Configured `/assistant` has run `A`; configured Team `/research` has coordinator
run `C`. A delegates to `/research` and the current engine creates fresh Team
`T1` under the Org task host, with task coordinator `C1` and member `M1`. A,
C1 and M1 see the assignment in Tasks; C and unrelated direct Agent B do not.
A supported `C1 -> A` ordinary message creates one Org communication record,
A's receiver input and both selected Messages perspectives. C1 submitting a
result instead updates Tasks then attempts a separate system notification to A;
that notification never becomes a communication row. On accepted review and
settlement, T1 disappears from active hierarchy; A retains its conversation and
Tasks record, and task detail can inspect C1/M1 read-only. Repeating delegation
creates T2/C2/M2, which may have the same source addresses but never share
conversation keys, task relevance, provider binding or selection with T1.

#### Ownership, files, sequencing, and validation

| Owner / boundary | Concrete responsibility | Forbidden |
| --- | --- | --- |
| AgentOrgRun + existing communication adapter | One post-durable exact receiver event for every admitted endpoint pair | Presentation-kind admission policy, second message write, lifecycle changes |
| RootTaskLifecycleEngine + exact Agent handle | Current task commits and separate accepted/rejected system input consequences | Inferring delivery from task save, second task notification |
| Shared input presentation adapter | One provenance-correct existing input presentation, duplicate suppression | New delivery authority or content-based dedupe |
| AgentOrgRunService -> manager/package stores | Coherent read-only inspection and exact physical source/binding metadata | Resolver bypass, restore-on-read, configured provider substitution |
| AgentOrgExecutionContext + derived execution view index | One retained view, exact selection/identity, correlated candidate swaps, read-only/live targets | Another root state cache, address-only task focus, deleting settled identity |
| Messages / Tasks facets | Separate read projections over their actual root authorities and participant identities | Conflating records, Team membership as task relevance, UI mutation authority |
| Shared overview/task/message components | Established interaction/style/navigation and responsive presentation | Fake Team wrapper, new dashboard, root/lifecycle ownership |

Physical change map (in addition to cumulative mappings below):

- **Modify server:** `agent-org-execution/domain/agent-org-run.ts`, its communication
  adapter; `agent-collaboration/execution/backends/configured-agent-execution-handle.ts`
  and `events/collaboration-agent-presentation-event-adapter.ts` for one accepted
  system-input classification; existing `root-task-lifecycle-input.ts` and the
  `notify` input construction in `root-task-lifecycle-engine.ts` set presentation
  metadata only (no lifecycle/authorization/warning change); move the task-system visibility utility from
  `agent-team-execution/task-delegation/` to
  `agent-collaboration/execution/events/task-system-input-presentation.ts`.
- **Modify server reads:** `agent-org-execution/services/agent-org-run-service.ts`,
  `agent-org-run-manager.ts`, `agent-org-execution-tree-location-service.ts`,
  `run-history/services/agent-org-member-run-view-projection-service.ts`, existing
  `services/agent-streaming/agent-org-execution-view-projector.ts`, and
  `api/graphql/types/agent-org-run.ts`. Compose through the service boundary.
- **Add web:** `services/agentOrgExecution/agentOrgExecutionViewIndex.ts`,
  `types/workspace/collaborationTasksContextView.ts`,
  `types/workspace/collaborationTaskPresentation.ts`.
- **Modify/move web:** Org context/hydration/stream/store, Org history row/projector
  and root-tagged action contracts, active target and `activeContextStore`,
  Messages identity/perspective, task projector rename, shared overview/Tasks
  section extraction, accepted workspace headers/readonly controls, task detail
  participant navigation, `graphql/queries/runHistoryQueries.ts`, and Org
  workspace historical composition. Update all consumers; remove aliases and
  duplicated Team-local task filters. Team wire adapters remain Team-owned.
- **Tests:** server accepted-message four-direction matrix including task-Team
  Agents; accepted/rejected system inputs across supported runtimes; exact task
  projection binding; read-only inspection with no activation; web same-address
  task identity/relevance, task selection/settlement, UI parity/reactivity and
  standalone Team control. API/E2E must cover SCN-018–020, not recycle the now-
  superseded configured-only exclusions as a green baseline.

Implement in this order: establish exact retained projection/selection types and
server read metadata; remove communication kind gate; preserve one accepted
system-input projection; extract Tasks facet and update Team/Org adapters and
consumers together; wire exact live/history navigation and read-only targets;
prove activation/recovery/settlement reactivity and references; delete retired
maps/filters/types; run focused/source/rendered validation before downstream
cumulative validation. No release or implementation readiness is claimed here.

Self-validation VAL-041–045 below covers the complete paths. Prior VAL-038–040
is revised to all admitted participant pairs; prior runtime/migration checks
remain in force. No change to persisted families, record schemas, task command
permissions or root shutdown ordering is needed.


### AD-REV-021 — Compact Messages, Task Detail And History Copy

#### DS-034 — Presentation Cleanup With Exact Identity Retained

**Authority / supported scenarios.** Approved RER-031 (including RER-030),
REQ-031/034/035/036, AC-026/034 and SCN-015/018/019 govern UI-CLEAN-001. A user
reads an ordinary message, opens assignment/result/review/reference content,
inspects a counterpart or task participant, and switches among live/retained
runs in the familiar Workspace. These are supported normal product actions;
no synthetic lifecycle or new edge mechanism is needed. User screenshots and
pinned Team comparison are in `architecture-ui-cleanup-investigation.md`.

**Current evidence / root cause.** `CollaborationMessagesPanel.vue:50–57` adds
an address row and `Task · <last-six AgentRun ID>` badge absent from the pinned
`TeamCommunicationPanel.vue` at `5fb16658` (also unchanged at local
origin/personal `5645b49d6`). The Messages array still comes only from accepted
communication; the badge describes its counterpart, not a task record.
`CollaborationDelegatedTasksSection.vue:75–83` adds a flat participant-link strip
before `TeamDelegatedTaskDetailPane`. The original `TeamDelegatedTaskItemDetail`
header/body template is unchanged; the only baseline diff is its type import.
Thus this is excess presentation introduced by Architecture/Implementation,
not a missing backend capability or grounds to suppress accepted task messages.
`WorkspaceAgentOrgHistoryCollection.vue:3–4` owns the localized history heading.

**Design health / refactor posture.** Local refactor now: delete the two added
Messages list metadata rows and separate task navigation strip; retain the
existing projections, section/list/detail/reference components and selection
owners. Move identity inspection into collapsed detail-header disclosure and
navigation into existing task direction names. No new dashboard, wrapper,
controller/store, generic identity framework, or parallel old/new rendering path.

| Spine | Start / complete path / meaningful effect | Governing owner |
| --- | --- | --- |
| DS-034a — message read and inspect | User selects a message in the shared list -> Messages facet returns exact accepted row -> existing detail/reference selection -> compact detail with optional identity disclosure -> user reads content/reference or exact counterpart provenance | Existing Messages facet owns data; CollaborationMessagesPanel owns selection/disclosure only |
| DS-034b — task read and participant navigation | User selects assignment/submission/review in Tasks -> root task adapter supplies named direction plus exact navigation references -> existing detail pane -> participant-name action -> existing root-tagged inspect/router boundary -> exact live or retained Agent workspace | Existing root task adapter owns identity mapping; section owns navigation dispatch; item detail emits typed selection |
| DS-034c — history copy | Existing root history read/grouping -> unchanged ordered Workspace category -> localized collection heading -> Org directly beneath Teams with same rows/state/actions | Collection renderer/localization owns copy, existing read/tree-state/selection owners remain distinct |
| DS-034r — return/update | Existing accepted message/task/checkpoint publication -> same context/facet -> same keyed list/detail rendering; subject/item switch closes local identity disclosure | Existing context remains authoritative; no extra query, event, polling or write |

**Messages rendering.** Preserve original compact title/direction, counterpart
name, timestamp, actual content preview and existing reference rows. Remove the
permanent address line and Task/run-suffix badge from the LEFT list, not their
source identity fields. Do not parse content to detect tasks, filter by task
kind, or move ordinary task-Agent messages to Tasks. The existing right detail
keeps its normal title/direction/name/time and Markdown/reference content.
Move the extra right-detail address line into on-demand identity detail as well;
it must not become a replacement always-visible ID strip.

In the RIGHT detail header use one small localized identity-info disclosure
control alongside existing metadata. Initially closed; it reveals recorded
address and exact counterpart AgentRun ID, and, for a task counterpart, its
recorded task/host/execution identity from the existing row. Use existing Vue
local state/native disclosure and typography, not a new popup framework. Provide
an accessible name, expanded state, keyboard activation and touch operation;
native hover title may supplement but cannot be the only inspection path.
No new metadata controls or lines are added to the left message list. Close
identity detail on selected message/reference/root/focused-Agent change, not on
every same-item live update. Labels never become routing or deduplication keys.

**Task rendering and exact navigation.** Remove the separate top participant
nav entirely. Keep `TeamDelegatedTaskItemDetail`'s title, status, directed names,
time, Markdown content and the existing reference viewer. Names in an Agent
endpoint remain compact, keyboard-focusable actions using the existing exact
root-tagged Agent inspection path. The button label has no appended ID; optional
title plus on-demand detail carries full identity. Reading a task must not
navigate until an explicit participant action occurs.

Tighten the existing UI-only named-direction participant projection to carry
its navigation meaning explicitly: an exact Agent link `{agentRunId, address}`,
or an exact task-Team group `{teamRunId, participants}` using the existing
`CollaborationTaskParticipantLink` entries. A genuinely unavailable historical
fallback stays plain text with no fabricated target. Resolve delegator from the
recorded delegator AgentRun ID, task-Agent assignee from its exact task execution,
and task-Team group from that exact fresh Team's retained members. Never match
display names/addresses against the configured catalog, select the first member,
or substitute the mounted/configured Team execution. Assignment/review use the
recorded delegator-to-assignee direction; submission reverses those same
references. System interruption remains system text, not a fake Agent.

A task-Team name is a collective endpoint: activating it opens the on-demand
participant detail, where each actual member name opens its exact execution.
It does not pretend the Team is an Agent or choose a new coordinator fallback.
This preserves all former strip destinations, including non-coordinator members
and settled executions. The same small header disclosure also exposes exact
identity without navigating; for a system interruption it uses the selected
task's recorded assignment participants. Reuse the original link objects and
remove the obsolete flat `DelegatedTaskEntry.participants` strip-only projection
when its remaining callers have moved to the named direction/assignment links.
Do not remove `taskParticipants` or task relevance logic from the runtime view.

`TeamDelegatedTaskItemDetail` receives display/navigation references and emits
an exact Agent-link selection. `TeamDelegatedTaskDetailPane` passes the event;
`CollaborationDelegatedTasksSection` retains existing `selectParticipant` root
routing/inspection. The detail component must not import Org/Team runtime stores
or router services. Team and Org adapters produce the same tight UI shape;
wire/task records and root-context ownership are unchanged. Reference selection
still opens only its existing content viewer. No identity details are injected
into message/task content or saved in any sidecar.

**History copy (RER-032 / AD-REV-022 supersedes the singular RER-031 literal).** Set only `workspace.agentOrg.history.collectionLabel` to the
exact English `Orgs`; existing uppercase styling produces `ORGS`. Keep the key
and `WorkspaceAgentOrgHistoryCollection`, category order, source discriminator,
stable keys, collapse/selection/scroll and current no-workspace/empty handling.
Main navigation `Agent Orgs`, definition names and API/domain identifiers are
not renamed. Keep locale maps synchronized (Chinese heading `组织`, preserving
the same concise organization meaning); do not globally replace Org strings.

**Persisted data / dependency / removals.** `Not Affected`: all stored values,
IDs, message/task eligibility and histories are unchanged, read through the same
normal facets. This is display state only, initialized locally on mount; no
migration/backfill/serialization, hidden compatibility flag, backend/public API,
root/Team/Org lifecycle, task admission, or RER-029 transition change. DS-028–030
retain accepted input/history semantics; DS-025 retains data/state owners. DS-034
supersedes only their prior always-visible metadata and participant-strip layout,
not exact identity or retained task access. No new Product artifact is required.

| Existing file / owner | Bounded change and removal |
| --- | --- |
| `components/workspace/collaboration/CollaborationMessagesPanel.vue` / shared Messages UI | Remove permanent list address/badge; disclose existing exact identity in detail header, preserving list/content/reference behavior |
| `components/workspace/collaboration/CollaborationDelegatedTasksSection.vue` / task section | Delete nav strip; retain root-tagged exact navigation handler behind detail-emitted actions |
| `components/workspace/team/TeamDelegatedTaskDetailPane.vue`, `TeamDelegatedTaskItemDetail.vue` / pure detail presentation | Inline participant-name actions and closed identity/member disclosure; preserve original content/reference layout and event boundaries |
| `types/workspace/collaborationTaskPresentation.ts` / UI projection | Tight named participant navigation variants; retire the strip-only flat list, not runtime participation semantics |
| `services/agentOrgExecution/agentOrgTaskPresentation.ts`, `utils/teamDelegatedTaskEntries.ts` / existing root adapters | Populate exact named direction targets/groups from task records and retained execution view, preserving lifecycle content/relevance |
| `localization/messages/en/workspace.ts`, `zh-CN/workspace.ts` / UI copy | Change only history collection label; use existing locale pattern for identity-disclosure accessible text |
| Existing message/task component and adapter tests, history section/localization tests | Assert compact defaults, on-demand exact identity, no label-based lookup, task-Team all-member access, reference behavior, and exact Orgs heading/order |

**Sequence / checks / risk.** First tighten the UI-only projection and both
adapters, then move controls within existing components and delete superseded
markup/projection consumers; update localized copy/tests in the same cut. Run
focused component/adapter/localization tests and rendered desktop/narrow checks
for VAL-051–053, retaining existing source/API route rules. No new live model
turn is needed merely to verify static copy; accepted/retained fixtures and the
existing real application can prove the rendering/navigation delta. API/E2E owns
any broader cumulative rerun. Specific risks are losing a task-Team member link,
same-name wrong target, hover-only identity on touch, or state reset from a label
change; the walkthroughs test each. No speculative recovery machinery is added.


## Target Run-Tree And Launch Contracts

The two durable root families remain subject-owned. Reuse is by composition of
approved record shapes, not inheritance into an optional-field root blob and
not a generic persisted root union.

```ts
// Existing native Team authority. Serialized keys/file/path stay exact.
type TeamRunExecutionTreeFileV2 = Readonly<{
  schemaVersion: 2;
  createdAt: string;
  archivedAt: string | null;
  applicationBinding: ApplicationBinding | null;
  handoffs: readonly PersistedCollaborationHandoff[];
  rootTeam: PersistedFlatRootTeam; // coordinator required, Agent members only
}>;

type AgentOrgRunExecutionTreeFileV1 = Readonly<{
  schemaVersion: 1;
  subjectKind: "agent_org";
  createdAt: string;
  archivedAt: string | null;
  applicationBinding: ApplicationBinding | null;
  handoffs: readonly PersistedCollaborationHandoff[];
  rootOrg: Readonly<{
    address: "/";
    orgDefinitionId: string;
    orgDefinitionName: string;
    orgRunId: string;
    defaultLaunchConfiguration: LaunchConfiguration;
    members: readonly (PersistedConfiguredAgent | PersistedFlatConfiguredTeam)[];
    taskExecutions: readonly PersistedTaskExecution[];
  }>;
}>;

type RootExecutionTreeProjection =
  | Readonly<{
      root_subject_kind: "agent_team";
      execution_tree: TeamRunExecutionTreeDtoV2;
    }>
  | Readonly<{
      root_subject_kind: "agent_org";
      execution_tree: AgentOrgRunExecutionTreeDtoV1;
    }>;

type CreateAgentOrgRunCommand = Readonly<{
  agentOrgDefinitionId: string;
  rootConfiguration: LaunchConfiguration;
  teamOverrides: readonly PlacementLaunchOverride[];
  agentOverrides: readonly PlacementLaunchOverride[];
  applicationBinding?: ApplicationBinding | null;
}>;
```

- `TeamRunExecutionTreeFileV2` stays at
  `$MEMORY_ROOT/agent_teams/<rootTeamRunId>/team_run_execution_tree.json`. Its
  exact top-level/root keys and `schemaVersion: 2` stay unchanged. The only
  current-contract narrowing is that `rootTeam.members` accepts configured
  Agent records only, and `coordinatorAddress` must resolve to one of them.
- `AgentOrgRunExecutionTreeFileV1` is written only at
  `$MEMORY_ROOT/agent_orgs/<orgRunId>/agent_org_run_execution_tree.json`. Its
  strict validator requires the exact RER-018-preserved runtime keys,
  `subjectKind: "agent_org"`,
  coordinator-free `rootOrg`, fixed configured depth, and exact root ID/path
  correlation.
- `PersistedConfiguredAgent`, `PersistedFlatConfiguredTeam`, handoff,
  application-binding, timestamp, launch configuration, task Agent, task Team,
  and task-Team-member records are extracted from the current V2 code into
  persistence-owned shared record modules without changing their serialized
  keys. Team and Org schemas compose those modules independently.
- `AgentTeamRunService` and `AgentTeamRunManager` remain the authoritative public
  Team creation/restore/active registry. `RootTeamRun` remains the standalone
  Team aggregate, contracted to direct configured Agents. Team-only consumers
  may keep current identifiers and wire shapes.
- `AgentOrgRunService` and `AgentOrgRunManager` are new subject boundaries.
  `AgentOrgRun` owns direct Agent executions and direct flat `TeamRun` handles,
  the Org address/handoff/task/lifecycle scope, an Org execution index, Org V1
  persistence correlation, and Org events. It has no coordinator method.
- Reuse below the roots is limited to the AD-REV-005 internal execution plane:
  `ConfiguredAgentExecutionHandle`, `FlatTeamExecutionFactory`, tagged member/
  physical identities, task/message record engines, the AgentRun candidate
  protocol, atomic physical file writer, and address parsing. Team and Org own
  separate indexes, tree mutators, persistence coordinators, sidecar envelopes,
  event publishers, lifecycle registries, and public services. A single public
  generic root manager/aggregate is not introduced because it would erase the
  approved durable/lifecycle ownership split.
- `CollaborationLaunchConfigurationResolver` loads a fixed-depth immutable
  definition graph, validates unique exact override addresses, applies
  `Org root -> Team placement -> exact Agent placement` specificity (or Team
  root -> exact Agent for standalone Team), and produces complete settings for
  every mounted execution before any run ID, workspace, runtime, or tree write.
- AgentOrg launch returns `{agentOrgRunId}` only and activates the complete
  mounted scope. It persists no recipient or focus. Web/session focus is
  nullable; explicit Agent selection maps to that AgentRun and explicit direct
  Team selection maps through the Org snapshot/index to its coordinator AgentRun.
  Recipient-requiring actions fail before send when focus is absent/stale.
- Standalone Team launch and Team-only UI preserve coordinator-led initial
  focus. That is subject-specific preserved behavior, not a fallback applied to
  AgentOrg.
- Generic history/stream/workspace APIs select a family from an authoritative
  subject-tagged catalog/location, call that family's strict reader, and return
  the matching projection branch. Requested branch, package family, payload,
  and root identity must agree; mismatch fails closed.

### Internal Runtime Composition Contract (AD-REV-005)

The internal shared execution vocabulary is tagged and root-neutral. It is not a
serialized root union and is never accepted by Team/Org public APIs in place of
their subject-specific commands.

```ts
type RootExecutionIdentity =
  | Readonly<{ rootSubjectKind: "agent_team"; rootRunId: string }>
  | Readonly<{ rootSubjectKind: "agent_org"; rootRunId: string }>;

type CollaborationMemberExecutionIdentity = Readonly<{
  root: RootExecutionIdentity;
  memberAddress: AgentTeamAddress;
  agentRunId: string;
}>;

type RootExecutionPhysicalScope = Readonly<{
  root: RootExecutionIdentity;
  // Physical TeamRun lineage only. [] is direct to the root subject.
  ancestorTeamRunIds: readonly string[];
}>;

type TaskExecutionHostIdentity = Readonly<{
  root: RootExecutionIdentity;
  hostKind: "root" | "team";
  hostRunId: string;       // rootRunId for root; concrete TeamRun ID for team
  hostAddress: AgentTeamAddress; // "/" for root; exact Team address otherwise
}>;

type MemberTaskCommandCapability = Readonly<{
  root: RootExecutionIdentity;
  delegateTask(caller: CollaborationMemberExecutionIdentity,
               input: DelegateTaskInput): Promise<DelegateTaskResult>;
  submitTaskResult(caller: CollaborationMemberExecutionIdentity,
                   input: SubmitTaskResultInput): Promise<SubmitTaskResultResult>;
  reviewTaskResult(caller: CollaborationMemberExecutionIdentity,
                   input: ReviewTaskResultInput): Promise<ReviewTaskResultResult>;
}>;

type MemberLogicalMessageInput = Readonly<{
  recipientAddress: AgentTeamAddress;
  content: string;
  messageType?: string | null;
  referenceFiles?: readonly string[] | null;
}>;

type MemberExecutionContext = Readonly<{
  identity: CollaborationMemberExecutionIdentity;
  // Team instruction for a Team member; Org instruction for an Org-direct Agent.
  authoredEnclosingScopeInstruction: string | null;
  collaboration: Readonly<{
    outgoingHandoffs: readonly CollaborationHandoff[];
    deliverLogicalMessage(input: MemberLogicalMessageInput):
      Promise<AgentOperationResult>;
  }>;
  tasks: MemberTaskCommandCapability;
}>;

type RootAgentExecutionCallbacks = Readonly<{
  publishAgentEvent(
    member: CollaborationMemberExecutionIdentity,
    event: CollaborationAgentExecutionEvent,
  ): void;
  acceptPlatformBinding(
    member: CollaborationMemberExecutionIdentity,
    binding: CollaborationAgentPlatformBinding,
  ): Promise<void>;
}>;
```

Every constructor validates exact keys and clones/freezes its values. Equality
of roots means equality of both `rootSubjectKind` and `rootRunId`. No adapter may
compare the bare ID, infer kind from an address/payload, or translate an Org
identity into `rootTeamRunId`.

The member context is selector-free and sender-bound. Message and task inputs do
not carry a caller/root selector; the closure uses `identity`, and the owning
root revalidates that exact caller before resolution. A configured Agent under a
mounted Team receives that Team's authored instruction, while a direct Org Agent
receives the Org instruction. This preserves the current nearest-enclosing-Team
instruction behavior and gives an Org-direct Agent a truthful enclosing scope;
it does not concatenate mutable parent definition text into a run snapshot.
`RootAgentExecutionCallbacks` deliberately excludes recipient resolution,
stores, indexes, managers, and fail-stop mutation. Those remain private root
adapter responsibilities.

#### Configured Agent execution

`ConfiguredAgentExecutionHandle` is extracted from
`MixedAgentMemberHandle`. Its required construction input is:

- the exact configured/task Agent execution node and activation mode;
- `CollaborationMemberExecutionIdentity` and
  `RootExecutionPhysicalScope`;
- a prepared `MemberExecutionContext` containing authored enclosing-scope
  instruction, effective outgoing handoffs, root-neutral delivery callback, and
  `MemberTaskCommandCapability`;
- `AgentRunManager`, workspace resolver, conversation-activity inspector, and
  root-neutral Agent memory locator; and
- a `RootAgentExecutionCallbacks` port with `publishAgentEvent`,
  and `acceptPlatformBinding`; logical delivery is already sender-bound in the
  member context.

It owns provider selection, AgentRun candidate prepare/restore, input/command
reservation, event subscription, status overlay, publication/abort, and local
termination. It does **not** own a root tree, sidecar, subject event sequence,
recipient resolution, task policy, package path, root registry, or fail-stop
policy. It emits `CollaborationAgentExecutionEvent` and
`CollaborationAgentPlatformBinding` using the tagged member identity; the owning
root adapter converts those into Team or Org tree mutation/event contracts.

The AgentRun config field is renamed cleanly from `memberTeamContext` to
`memberExecutionContext`. `MemberTeamContext`, `TeamMemberExecutionIdentity`,
`MemberTaskRootResolver`, and Team-specific delivery-intent identity are removed
from the normal shared path. Team-only transport/projectors may translate their
subject event DTO at the root boundary; Agent tools and provider backends use
only `MemberExecutionContext`.

`prepareConfiguredActivation()` uses the existing AgentRun candidate protocol
and returns staged platform bindings plus `commitAfterDurability()` / `abort()`.
Org launch/restore invokes it for every configured Agent in stable canonical
address order. Standalone Team may preserve its current lazy direct-Agent
readiness, but it uses the same handle and its root-neutral inputs; task Agent
activation continues to use the same prepare-before-durability protocol.

#### Flat Team execution and task hosts

`FlatTeamExecutionFactory.materialize(input)` accepts an explicit
`RootExecutionIdentity`, physical scope, one concrete Agent-only Team node,
activation mode, root callbacks, and task-command capability. It returns the
existing local `TeamRun` facade backed by a narrowed mixed manager:

- configured registry: direct Agent handles only;
- task registry: direct task Agents and recursive task TeamRuns;
- local commands/status/termination: retained;
- configured child-Team registry and
  `getOrCreateConfiguredChildTeam`: removed.

The factory never writes a Team/Org execution tree, creates sidecars, registers a
root, or constructs `RootTeamRun`. Standalone `AgentTeamRunManager` uses it for
the root Team body with Team identity and empty Team ancestry. `AgentOrgRun`
uses it for every direct configured Team with Org identity and ancestry
`[mountedTeamRunId]`. Task Team materialization appends its fresh TeamRun ID to
the exact host's ancestry and retains recursion only in `taskExecutions`.

Both `TeamRun` and the new `AgentOrgRootTaskHost` implement the narrow
`TaskExecutionHostCapability` (`prepareTaskAgent`, `prepareTaskTeam`,
`prepareDirectTaskSettlement`, local termination). The Org root host is needed
for tasks delegated by a direct Org Agent; it owns only prepared/local task
handles. The `AgentOrgRun` aggregate still owns the durable root task array and
all persistence.

#### Root-neutral task engine with subject adapters

`RootTaskLifecycleEngine` remains the selector-free owner of the single task
mutation FIFO, task record lifecycle, authorization call order, notification
sequencing, terminal sweep, and exact `TaskDelegationRecordV1` bodies. The FIFO
continues to serialize activation, submit, review, interruption, and the existing
prepared settlement transaction. No second coordinator, queue, or durable state
is added.

The defect is narrowed to settlement eligibility. A settlement FIFO closure may
commit only when the exact task execution can be prepared without waiting. Its
one `TaskRootAdapter` port provides:

1. tagged root identity, open/fail-stop state, and exact member authorization;
2. same-root recipient resolution and task-source projection;
3. exact `TaskExecutionHostIdentity` plus its `TaskExecutionHostCapability`;
4. subject-specific activation/record/settlement mutations in the owning Team V2
   or Org V1 node, atomically coordinated with the matching task sidecar;
5. a non-waiting exact-execution preparation call returning the existing
   `PreparedTaskSettlement | null`;
6. root-neutral task-index queries used for ownership, review, child eligibility,
   and settlement;
7. system-message delivery and subject task-event publication; and
8. root fail-stop entry when a committed durable/publication/local-finalization
   outcome becomes indeterminate.

`TeamTaskRootAdapter` closes over `RootTeamRun` state, `TeamExecutionIndex`, Team
mutators and `TeamRunPersistenceCoordinator`. `AgentOrgTaskRootAdapter` closes
over `AgentOrgRun` state, `AgentOrgExecutionIndex`, Org mutators and
`AgentOrgRunPersistenceCoordinator`. No caller above either root aggregate may
hold an adapter or engine directly. Shared policy therefore remains root-neutral
without inventing a common stored tree.

The existing `PreparedTaskSettlement` retains its current prepare/cancel/commit
meaning. The local registry first calls
`tryPrepareTerminationIfQuiescent()` on the exact AgentRun or recursively on the
task Team. A `null` result is ordinary deferral: no input admission, registry,
tree, sidecar, or provider state changes, `settleAtHead` returns `false`, and the
FIFO releases. Existing Agent idle/offline publication invokes
`onExecutionBecameIdle()` and reschedules the terminal sweep. A prepared result
closes local admission, participates in the existing pre-durability cancellation
and post-durability commit, and finishes teardown only after the exact
`settledAt` mutation commits. The existing whole-root fail-stop remains the
post-durability failure owner.

The task tool binding stores `{identity, commands}`. It validates that
`identity.root === commands.root` and calls the bound methods; the router no
longer returns `RootTeamRun` or consults either subject manager. Unsupported
self-review remains rejected by the existing delegator authorization rule.

#### Communication, event routing, and active lookup

The accepted-message record is extracted as
`CollaborationCommunicationMessageV1` with the exact existing fields. A
`RootCommunicationEngine` owns reservation/dedupe/message-body construction and
same-root identity checks behind a `CommunicationRootAdapter`; the adapter owns
recipient/index lookup, exact Agent command endpoint, durable subject-sidecar
append, event wrapping, and fail-stop entry.

- Team wraps neutral Agent/task/communication/member-input event bodies as the
  existing compatible `TeamRunEvent`.
- Org wraps the same bodies as `AgentOrgRunEvent` and publishes through a
  separate `AgentOrgRunEventPublisher`/Org snapshot sequence.
- Mixed streams project either event branch with
  `root_subject_kind`; they do not expose the internal neutral callback type.

`ActiveCollaborationRootDirectory` is a process/scope-owned index from the
compound `RootExecutionIdentity` to a narrow
`ActiveRootMessageBoundary`. Subject managers reserve then commit/release their
own root registration; the directory owns no lifecycle or persistence. The
existing `AgentRunManager` remains the exact `agentRunId -> AgentRun` registry
for standalone and collaboration members. `GlobalAgentRunMessageRouter`:

1. loads exact sender/target AgentRuns;
2. if both have member contexts and the tagged roots are equal, resolves that
   compound root in `ActiveCollaborationRootDirectory` and calls
   `deliverExactAgentMessage`;
3. otherwise applies the existing explicit direct-message grant path.

A root directory entry can never authorize cross-root logical-address delivery,
and no bare run ID selects Team versus Org.

#### Org physical memory and strict sidecars

`AgentMemoryLayout.getRootedAgentRunDirPath(scope, agentRunId)` dispatches only
on `scope.root.rootSubjectKind`:

```text
Team direct Agent:
  $MEMORY_ROOT/agent_teams/<rootTeamRunId>/<agentRunId>/
Org direct Agent or root-hosted task Agent:
  $MEMORY_ROOT/agent_orgs/<orgRunId>/<agentRunId>/
Org mounted-Team Agent:
  $MEMORY_ROOT/agent_orgs/<orgRunId>/<teamRunId>/<agentRunId>/
Org mounted-Team task-Team Agent:
  $MEMORY_ROOT/agent_orgs/<orgRunId>/<teamRunId>/<taskTeamRunId>/.../<agentRunId>/
```

The same relative rule applies to Team task lineage. This exactly matches the
current package layout after the approved whole-directory family rename; it
adds no per-Agent data move. `CollaborationExecutionLocationService` composes
strict Team and Org location providers, accepts explicit compound root identity
for root queries, and enforces unique AgentRun correlation for global
Agent-owned services. Context-file ownership, run-file changes, token usage,
history, and identity allocation depend on that facade or on a subject-specific
provider, never on Team locations alone.

Team sidecars remain exact and unchanged:

- `task_delegation_records.json` /
  `{schemaVersion:1, rootTeamRunId, records}`;
- `team_communication_messages.json` /
  `{schemaVersion:1, rootTeamRunId, messages}`.

Org adds strict subject-owned equivalents:

```ts
type AgentOrgTaskDelegationRecordsFileV1 = Readonly<{
  schemaVersion: 1;
  subjectKind: "agent_org";
  orgRunId: string;
  records: readonly TaskDelegationRecordV1[];
}>; // agent_org_task_delegation_records.json

type AgentOrgCommunicationMessagesFileV1 = Readonly<{
  schemaVersion: 1;
  subjectKind: "agent_org";
  orgRunId: string;
  messages: readonly CollaborationCommunicationMessageV1[];
}>; // agent_org_communication_messages.json
```

`AgentOrgStatePackageLoader` requires the Org tree and both Org sidecars to
correlate by kind/ID. It reuses the existing root-neutral task-reopen policy
(active/awaiting tasks become interrupted and orphan task nodes settle) through
an Org tree adapter. It never accepts Team sidecar envelopes. The migration
transforms the two Team sidecar envelopes into these Org envelopes beside the
prospective Org tree, validates the entire prospective Org package, performs
the same direct package rename, then removes the three retired Team authority
files. Record arrays and all relative Agent memory/content files remain
unchanged.

`AtomicRunPackageFileCommitWriter` is the only shared physical writer: it owns
temp-write/fsync/rename outcome reporting and knows no root schema. Team and Org
stores supply subject-specific file roles. `TeamRunPersistenceCoordinator` and
`AgentOrgRunPersistenceCoordinator` remain distinct mutation serializers and
fail-stop owners.

#### AgentOrg construction, activation, restore, and termination

`AgentOrgRun` has lifecycle
`assembling -> activating -> active -> persistence_fail_stop|terminating -> terminated`.
`AgentOrgRunManager` performs one transition lane per Org ID:

**Fresh launch**

1. validate definition availability and complete configuration; allocate all
   IDs; build exact Org tree plus empty strict Org sidecars;
2. construct Org persistence coordinator, publisher, indexes, task/message
   engines with Org adapters, and an `AgentOrgRun` in `assembling` state;
3. construct direct Org Agent handles, one local flat Team execution per direct
   Team, and the Org root task host; attach that local execution scope exactly
   once to the aggregate;
4. prepare every configured Agent candidate in stable canonical-address order;
   collect any external platform bindings and apply them to the candidate Org
   tree in memory;
5. durably write the correlated initial Org tree/task/message package; if a
   pre-rename write fails, abort all candidates in reverse order and expose no
   root;
6. commit AgentRun publications, attach event subscriptions, and mark local
   executions active. If post-durability publication is indeterminate, enter
   Org fail-stop, terminate/abort the whole prepared scope, leave the strict
   package for later restore, and do not register an active root;
7. atomically register the root with `AgentOrgRunManager` and
   `ActiveCollaborationRootDirectory`, publish lifecycle/snapshot availability,
   and return only `{agentOrgRunId}`. Client focus remains `null`.

**Restore**

1. `RootRunPackageReadinessIndex` selects Org family, then
   `AgentOrgStatePackageLoader` strict-reads/correlates/repairs Org tree and
   sidecars before live construction;
2. reconstruct indexes, engines, physical scopes, direct handles, mounted flat
   Teams and task lineage from the persisted snapshot without consulting live
   definitions;
3. prepare all configured Agent candidates. Existing provider bindings restore
   exactly; any allowed new external binding for a no-activity execution is
   applied through one Org tree commit before publication;
4. publish the complete scope and register it only after preparation and
   durability succeed. Any failure aborts prepared candidates in reverse order
   and leaves no partial registry/directory entry.

**Runtime mutation/fail-stop**

All platform-binding, task, and accepted-message changes enter the Org
persistence coordinator. It writes strict Org files before live state/event
publication. Pre-rename failure cancels/reservations and keeps the root active
when safely retryable. Post-rename finalization uncertainty or post-durability
live-finalization failure closes root admission and starts whole-Org fail-stop;
no embedded Team can remain independently active or writable.

**Termination**

The root closes external message/task/command/materialization admission and
freezes the Org root host, direct Agent handles, mounted Teams and recursive
task descendants **before any task or settlement drain**. It interrupts every
active provider turn, then drains the task FIFO, durably interrupts remaining
open task records, runs the existing deepest-first settlement sweep now that
the scope is quiescent, and drains persistence. It next
prepares/finishes any remaining local execution handles in reverse
materialization order, unregisters the compound root directory and subject
manager entries, clears publishers, and becomes `terminated`. Existing prepared
handle termination is idempotent so root interruption and later settlement
cannot terminate one provider twice. A mounted Team never unregisters a
Team-family root because it was never registered as one.

#### Process and application-scope composition

`GeneralProcessRunSupervisor` construction order is:

1. `AgentRunManager` and shared Agent provider/resource/session services;
2. strict Team/Org stores and location providers, then
   `CollaborationExecutionLocationService` and memory/context-file services;
3. `ActiveCollaborationRootDirectory`, root-neutral configured-Agent factory,
   and flat-Team execution factory;
4. `AgentTeamRunManager` with Team adapters/stores, then
   `AgentOrgRunManager` with Org adapters/stores;
5. subject run services/history/stream sources and explicit mixed projection
   facades; finally bind process entry services.

On construction failure, release in the exact reverse order. Normal close first
closes new launch/stream admission, then calls `stopAllAgentOrgRuns()`, then
`stopAllTeamRuns()`, then `stopAllAgentRuns()`, releases Org/Team/services and
the active-root directory, and finally closes tool sessions/resources. Errors
are aggregated without skipping later cleanup steps.

Application execution scopes in this ticket still launch only application-owned
Agents/flat Teams. They use the extracted root-neutral Agent/flat-Team factories
with a Team identity, do not construct `AgentOrgRunManager`, and retain
`Team -> AgentRun` shutdown. This prevents an unapproved application-owned Org
surface while ensuring the shared extraction is production composition rather
than a general-process-only special case.

### AgentOrg Running-Workspace Projection And Reuse Contract (AD-REV-006)

#### Tight transport and presentation shapes

The shared element is an Agent presentation **message body**, not a Team/Org
root envelope. A small new workspace package
`@autobyteus/agent-presentation-contracts` owns strict Agent conversation,
status, tool, activity, artifact/file, member-input, external-input, error, and
token detail schemas without a root identifier or change sequence. Both subject
stream packages compose those schemas:

```ts
type AgentPresentationMessage =
  | { type: "SEGMENT_START"; payload: SegmentStartDetails }
  | { type: "SEGMENT_CONTENT"; payload: SegmentContentDetails }
  | { type: "SEGMENT_END"; payload: SegmentEndDetails }
  | { type: "MEMBER_INPUT_MESSAGE"; payload: MemberInputDetails }
  | { type: "AGENT_STATUS"; payload: AgentStatusDetails }
  | { type: "TOOL_APPROVAL_REQUESTED"; payload: ToolApprovalDetails }
  | { type: "TOKEN_USAGE_UPDATED"; payload: TokenUsageDetails }
  | /* every currently supported accepted Agent monitor message */
    { type: "ERROR"; payload: AgentPresentationErrorDetails };

type AgentOrgExecutionEventDto =
  | Readonly<{
      kind: "agent_presentation";
      member_address: AgentTeamAddress;
      agent_run_id: string;
      message: AgentPresentationMessage;
    }>
  | Readonly<{ kind: "task"; event: AgentOrgTaskEventDto }>
  | Readonly<{ kind: "communication"; message: AgentOrgCommunicationMessageDto }>;

type AgentOrgRootExecutionEventDto = Readonly<{
  root_subject_kind: "agent_org";
  root_run_id: string;
  change_sequence: number;
  event: AgentOrgExecutionEventDto;
}>;
```

- `CollaborationAgentPresentationAdapter` accepts the internal
  `CollaborationAgentExecutionEvent` plus exact tagged member identity, validates
  raw AgentRun payloads, filters the same collaboration duplicates as the Team
  path, and returns either one normalized presentation message, a filtered
  disposition, or a typed rejection. It subsumes the subject-neutral part of
  `TeamAgentEventAdapter`; Team callbacks and Team wire serializers keep their
  current outer message shape and field spellings.
- Token presentation uses a root-neutral internal summary plus subject-specific
  serializers. The Team serializer continues to emit the existing
  `root_team_run_id`; the Org serializer emits/correlates
  `root_subject_kind:"agent_org"` and `root_run_id`. An Org event must never
  carry a field whose semantics claim a Team root.
- `AgentOrgRootExecutionViewDto` replaces `unknown` members/handoffs/tasks/
  messages with exact Org V1 projection schemas and adds one exact status record
  for every live Agent execution. Snapshot root ID, every Agent address/run ID,
  task/message sidecar identity, and status identity must correlate before the
  browser can publish the candidate context.
- The browser parser has no `unknown`/`any` live-event branch. Invalid type,
  identity, sequence, or payload closes the candidate stream, marks it
  `reopen_required`, and preserves the last committed context until explicit
  checkpointed recovery. There is no text/JSON fallback.
- After Org envelope correlation, `AgentOrgStreamingService` composes the exact
  `agent_run_id` and `change_sequence` with the root-neutral message body into
  the existing internal Agent stream-presentation input expected by
  `dispatchAgentStreamMessage`. This is an internal adapter, not a fabricated
  Team envelope: it carries no `root_team_run_id`, Team root ID, or Team stream
  discriminator, and it selects the target AgentContext only from the correlated
  Org member index.

#### Org context, hydration, and stream state machine

`AgentOrgExecutionContext` is the sole live or historical browser aggregate for one Org run.
It owns a strict `AgentOrgExecutionViewState`, per-Agent `AgentContext`s,
read-only Team/task projections, nullable exact execution selection, and synchronization
phase. `rootExecutionViewStore` becomes a thin mixed-route/history facade over
subject contexts; it does not retain a second Org tree or raw event log.

Live attach after explicit launch/continuation follows (historical opening uses
DS-035 inspection without activation):

`AgentOrg history/route -> agentOrgRunContextHydrationService -> strict Org
resume/tree/tasks/messages -> Org member projection service + workspace
resolution -> AgentContext map with focus=null -> AgentOrgStreamingService
CONNECTED -> exact snapshot barrier -> atomic context registration -> typed
live messages -> dispatchAgentStreamMessage -> accepted conversation/event
monitor`.

The state machine mirrors the proven Team stream phases
`disconnected -> awaiting_connected_root -> awaiting_snapshot -> ready`, with
`reopen_required` on a schema/correlation/sequence failure. Recovery loads a
complete candidate context, verifies an Org execution checkpoint before/after
when open execution work permits, connects it at the expected base sequence,
and swaps contexts atomically. It never clears conversation state or continues
through an opaque raw event list; the previously committed context remains
visible with the recovery notice until the candidate is complete.

#### Exact focus and presentation targets (AD-REV-019, access revised AD-REV-023)

Use the DS-029 `OrgWorkspaceSelection` as authoritative identity. Configured
addresses resolve once to exact configured AgentRun or TeamRun; task Agent rows
and task detail participant links carry exact AgentRun IDs. A task Team row
resolves its exact fresh coordinator. Retained settled selection stays readonly;
invalid identity is unavailable, never remapped to a configured source.

Tighten the existing target type by composition:

```ts
type InteractionAccess =
  | { access: 'live'; interaction: AgentInteractionPort }
  | { access: 'continuable'; continuation: Pick<AgentInteractionPort, 'send'> }
  | { access: 'read_only' };
type CollaborationFacets = Readonly<{
  collaborationMessages: CollaborationMessagesContextView;
  collaborationTasks: CollaborationTasksContextView;
}>;
// Each variant keeps the existing AgentContext and exact browse identity.
// standalone_agent has no collaboration facets.
// standalone_team_member + both facets + genuine Team view.
// agent_org_direct_agent + both facets + Org identity.
// agent_org_team_member + both facets + Org identity + mounted Team view.
// agent_org_task_agent + both facets + Org/task identity + task header.
// agent_org_task_team_member + both facets + Org/task identity + fresh Team view.
// Intersect each selected target with InteractionAccess, never optional methods.
```

`ActiveAgentWorkspaceTarget` remains the single consumer boundary for composer,
tool cards, workspace and right tools. `TeamWorkspaceContextView` retains genuine
Team roster/coordinator/focused task header only; independent root Tasks and
Messages facets never depend on it. Both facets carry exact selected AgentRun
and root tag. Messages identity map includes all retained configured/task Agents,
with task context; a Team view cannot reduce its root scope.

Direct/task Agent focus reuses `AgentWorkspaceSurface`; configured/task Team
member focus reuses `TeamWorkspaceSurface`. Both use accepted event monitor,
conversation, reference and composer components. Extract the existing task header
presentation only as needed for task Agents, not a fake Team context. Live header
settings/new-run actions remain subject-owned; read-only target exposes no live
command capability. Stop remains root-owned. Do not add a task stop action or
change review/task tools. DS-029–030 specify hydration, inspection and notification
spines; UI reuse is structural, not a duplicated styling policy.

### Effective Handoff Ordering Contract

`CollaborationHandoffCompiler` produces one stable array and never relies on a
map/object traversal order:

1. `compileTeam` emits the Team-owned `handoffs` array in saved order and keeps
   the order of every handoff's `rules[]` unchanged.
2. `compileOrg` first emits the Org-owned `handoffs` array in saved order.
3. It then iterates only the direct `agent_team` placements in their stable
   relative order within `AgentOrgDefinition.members`. For each placement it
   appends that Team's local handoffs in saved order after rebasing each local
   address exactly once beneath the Team placement address; each `rules[]`
   remains unchanged.
4. Duplicate/self/endpoint validation reports errors without sorting,
   deduplicating, or otherwise rewriting the candidate. No later persistence,
   projection, filtering, or rendering step may reorder the compiled array.

The persisted run snapshot stores this effective compiled array. New Team and
Org launches therefore use the same root-first order as the current compiler.
Migration copies the already-compiled legacy snapshot array byte-equivalently;
it does not recompile from a mutable definition. `get_handoff_rules` performs a
stable filter over the snapshot and preserves the matched handoff order and
each rule order. Owner-labeled effective-definition/API/UI projections decorate
the same sequence rather than regrouping it. Golden tests cover an Agent that
has both Org-owned and Team-local routes, multiple Team placements, and multiple
rules per handoff.

Example: for Org members `[directAgent, teamB, peerAgent, teamA]`, Org handoffs
`[O1, O2]`, Team B locals `[B1, B2]`, and Team A local `[A1]`, the stored and
effective sequence is `[O1, O2, rebase(/teamB,B1), rebase(/teamB,B2),
rebase(/teamA,A1)]`. Filtering that sequence for one source Agent may remove
nonmatching entries but cannot change the relative order of matches.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Acceptance IDs | Trigger / Governing Contract | Existing Path | Approved Outcome | Target Production Path / Spine(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001, REQ-002, REQ-008, REQ-018, REQ-020-REQ-023, REQ-026; AC-001, AC-005, AC-013, AC-015-AC-018, AC-021 | Create/update/import AgentOrg or AgentTeam and scope-owned handoffs. | Recursive unversioned Team model/resolver, incomplete authoring, write-then-validate pressure. | Exact current Team or Org Definition Config; Org alone references Teams; Team contains Agents only; complete candidate/ordered handoffs validate before one revisioned atomic save; Org adoption does not copy/edit Team. | Target admission -> subject form/import -> subject GraphQL -> DefinitionService -> resolver/endpoint/handoff validation -> definition-package transaction -> catalog (DS-000, DS-001, DS-011). |
| BEH-002 | System | REQ-004, REQ-005, REQ-011, REQ-024, REQ-030, REQ-032; AC-002, AC-007, AC-019, AC-025, AC-027 | Configure, launch, or restore Org/Team. | Recursive Team planner -> Team manager -> RootTeamRun; Team UI coordinator-focused. | Org full configuration resolves and activates complete scope unfocused; standalone Team remains coordinator-led; preview/request/server/snapshot agree and a fresh Org uses the available Temp Workspace default. | Config UI/application -> canonical exact patch/default-selection boundary -> subject run service -> configuration resolver -> subject planner/manager -> subject aggregate/adapters -> root-neutral Agent/flat-Team candidates -> durable full active scope (DS-002, DS-003, DS-012, DS-014, DS-015, DS-024, DS-026). |
| BEH-003 | Contract | REQ-005-REQ-007, REQ-020-REQ-023, REQ-034; AC-003, AC-015-AC-018, AC-029 | Author/inspect handoffs or Agent calls collaboration tools. | Recursive compiler emits root-owned handoffs first, then child Teams in stable member order; rule lookup filters without reordering. Current Org durable delivery omits its receiver presentation consequence. | Preserve ordered Agent-sourced routes: Org-owned saved order first, then each direct Team's local saved order in stable Org member order; Team-local edges rebase once; exact same-root resolution fails closed; accepted Org communication is observable through established selected-member surfaces. | Definition candidate path (DS-011); fixed-depth ordered compilation (DS-009); member execution context -> bound owning-root message/task capability -> subject adapter/index -> AgentRun/coordinator and post-durable receiver/root presentation (DS-004, DS-014, DS-028). |
| BEH-004 | User / contract | REQ-003, REQ-004, REQ-024; AC-002, AC-003, AC-019 | Launch Org, select workspace member, or address Team. | Required/repaired Team focus. | No Org coordinator/initial focus/fallback; explicit Agent focus is exact; Team focus uses its exact coordinator; no-focus blocks only recipient-required action. | Org launch -> focus=null; sidebar selection -> Org context exact target -> accepted Agent/Team surface -> strict interaction port/transport (DS-003, DS-004, DS-013, DS-016-DS-018). |
| BEH-005 | System | REQ-012, REQ-014, REQ-016, REQ-025, REQ-027, REQ-034; AC-008, AC-009, AC-011, AC-020, AC-022, AC-029 | Persist/restore/stream/history/archive/stop a run. | Strict Team V2 everywhere, including organization-like Team roots. | Flat Team remains native V2; Org uses separate V1; every cutover-time server memory package remains in scope regardless of current definition availability; mixed projections preserve history and communication truth. | Subject aggregate -> subject tree/task/message persistence coordinator -> subject-tagged catalog -> strict subject projector/stream/context; restore selects/correlates the complete package/member projections by family; root stop stays on root history and Org Messages rehydrate from the sole sidecar plus member projections (DS-006T, DS-006O, DS-008, DS-014-DS-019, DS-028). |
| BEH-006 | User | REQ-001, REQ-002, REQ-004, REQ-011, REQ-016, REQ-018-REQ-034; AC-002, AC-007, AC-011, AC-013-AC-029 | Open catalog/authoring/detail/config/launch/history/workspace. | One Team catalog/form advertises nesting; shared runtime assumes Team root/non-null focus; discovery has no per-definition admission status; current Org route swaps the established history panel; Org focused targets incompletely expose communication. | Implement the approved Product packages plus RER-024/RER-026 parity for available target definitions and truthful runtime/history/communication; one familiar Workspace shell keeps Agents, Teams, and Org visible across route states. | Definition admission -> subject web/API; mixed durable history plus strict Org context -> one tagged Workspace projection and shared accepted Agent/Team surfaces, contextual tools, mounted-Team aggregate, established Team launch/config hierarchy, and owning-root Messages facet (DS-000-DS-003, DS-008, DS-011-DS-013, DS-016-DS-028). |
| BEH-007 | Operational | REQ-009, REQ-010, REQ-012, REQ-013, REQ-027; AC-004, AC-006, AC-008, AC-022 | Cut over server definitions/runtime while discovering external dependencies. | Unversioned recursive Team codec; 23 external evidence roots; 43 current server V2 trees; no deep topology. | Convert only server-owned definitions to target configs; never write external roots; flat runtime roots are no-op; one-level runtime roots convert to Org V1; unavailable external definitions do not block global readiness/history. | Existing startup migration runner -> separate definition/runtime inventories -> migration-owned atomic current-file writes and one direct package-family rename -> strict target admission/diagnostics -> per-item catalog rebuild/readiness (DS-000, DS-007, DS-010). |
| BEH-008 | Contract | REQ-014, REQ-025; AC-009, AC-020 | Native durable write/read and mixed projection. | Exact Team V2 only. | Exact Team V2 preserved; exact Org V1 added; child/task records reused; family/payload/projection mismatch fails. | Team planner/root -> exact Team V2 tree/sidecars (DS-006T); Org planner/root -> exact Org V1 tree/Org sidecars (DS-006O); generic facade -> tagged union (DS-008); root-neutral execution callbacks remain internal (DS-014). |
| BEH-009 | System | REQ-015; AC-010 | Delegate/submit/review/settle/restore task execution, including independent assignee/delegator turns and application root shutdown. | Task records attach recursively to exact Team host; current settlement calls waiting `prepareTermination()` at the single root FIFO head. Current roots can drain task work before interruption, and active-turn-only interruption can miss admitted/provider-start-pending input before `TURN_STARTED`. | Org root becomes a valid host; fresh task Team remains exact task lineage; a normal accept that overlaps the assignee's still-finishing provider turn defers settlement without holding the FIFO; supported SIGTERM freezes a stable scope and invokes an irreversible per-Agent input/provider-start/interrupt fence before task drain; task records/tools/results stay exact. | Agent tool -> bound member task command -> root FIFO -> private subject durable commit; terminal record -> non-waiting exact-execution quiescence check -> defer/retry on existing idle event or existing prepared `settledAt` transaction; root termination -> stable freeze -> AgentRun fence across direct/mounted/task scopes -> task drain (DS-005, DS-008, DS-014, DS-015, DS-022). |
| BEH-010 | Contract / operational | REQ-012/026/027/037; AC-021/022/032/033/035/036 | Author/import/update/reload and first startup of Team/Org packages. | Current Org reader uses old scope; unreleased generator still emits superseded authoring fields. | Strict unversioned configs with org_local; same refs/internal ownership; final first-run outputs and bounded owned preservation; external read-only admission. | DS-031–033 plus DS-038–040; SCN-021–024. |
| BEH-011 | User / presentation | REQ-028; AC-023 | Inspect an active, collapsed, or stopped AgentOrg mounted Team row while exact descendant Agent statuses change. | Current AgentOrg Team row omits Team status and current Agent rows use a hard-coded live-looking dot; a mature five-state Team branch fold/dot exists only in the Team history path. | One accessible Team-row aggregate folds exact configured and task-scoped descendant Agent status truth for that branch, stays visible collapsed, preserves exact Agent signals, and loses live-only states without live authority. | Strict Org tree + exact AgentOrgExecutionContext/history status source -> AgentOrg Team-branch projector -> shared five-state fold -> reusable Team status dot (DS-020, DS-021). |
| BEH-012 | User / presentation | REQ-029; AC-024 | Open a new AgentOrg launch draft, disclose Member overrides, inspect one mounted Team, make exact Team/Agent edits, collapse/reopen, and launch. | Current Org form uses a bespoke always-exposed Team-child hierarchy and implicit inherited state even though the accepted Team form already owns the desired progressive disclosure. | Outer and per-Team disclosures start collapsed; exact-Agent count, Team identity/address/state, coordinator Agent and exact local override state are explicit; one expanded Team uses the accepted Team controls; valid sparse draft survives collapse and launches through unchanged Org APIs. | AgentOrg detail -> Org config route -> Org draft/projector -> shared disclosure + Team scope/tree/Agent editors -> exact Org command adapter -> existing GraphQL `createAgentOrgRun` -> server complete resolution/validation (DS-023). |
| BEH-013 | User / contract | REQ-030; AC-025 | Change runtime/model/config at Org, Team, or exact Agent scope and launch. | Browser effective preview clears dependent config, but sparse Org serialization can omit the clear and the server then inherits a different parent config. | Preview, client validation, exact request semantics, server resolution, and stored snapshot are identical; an explicit runtime/model change without config clears incompatible inherited model config. | Team/Agent edit -> canonical Org placement patch -> form projection + GraphQL variables -> authoritative server fixed-depth resolver/validator -> exact run snapshot (DS-012, DS-024). |
| BEH-014 | User / presentation | REQ-031; AC-026 | Move catalog/detail -> Org config -> launch/focus -> stopped/history or switch subjects. | AppLeftPanel route predicate swaps the populated Workspace tree for a separate Org-only history owner. | One stable Workspaces surface retains existing categories/rows/state and adds `Orgs` directly below `Teams`; Org rows remain distinctly tagged and own Org hierarchy/actions. | Mixed history/context projection -> unified Workspace read model -> ordered workspace categories -> typed subject selection/lifecycle actions; route changes only center content (DS-008, DS-013, DS-019, DS-025). |
| BEH-015 | User | REQ-032; AC-027 | Open a fresh AgentOrg launch configuration. | Team root selects available Temp default; Org root disables default selection, leaving inherited Team workspace empty and Run blocked. | Fresh Org selects the actually available Temp Workspace default; exact placements inherit root unless a supported Team override applies; explicit choice wins. | Shared workspace catalog -> root default-selection policy -> Org draft -> Team/Agent inherited projection -> existing launch `workspaceRootPath` validation (DS-003, DS-012, DS-026). |
| BEH-016 | User / Derived History | REQ-033; AC-028 | First successfully accepted non-empty external `SEND_MESSAGE` reaches an exact configured direct or mounted-Team Agent in an AgentOrg. | Org stream command acceptance currently acknowledges the Agent but does not mutate Org history; the web does not refresh the Org history slice, and existing empty rows remain empty. | Normalize exactly like Team, commit only the first qualifying accepted input, expose the durable winner live, preserve it across later traffic/restore/rebuild, and backfill an empty legacy row only from one uniquely earliest configured-member trace candidate. | Composer -> strict Org command -> configured-Agent admission -> accepted result -> serialized Org catalog -> shared first-write summary writer -> accepted ACK -> authoritative Org-family refresh; startup migration -> strict Org tree/configured traces -> unique-earliest classifier -> same summary writer (DS-027). |
| BEH-017 | User / collaboration presentation | REQ-034; AC-029; SCN-018 | User selects sender/receiver of a supported accepted ordinary same-root message, including task Agent/Team participants. | Prior Org configured-only gate loses task visibility; address-only selection conflates executions. | One exact receiver input and same-record sent/received perspectives with exact retained identity/reference; unrelated/rejected/uncommitted sends excluded, not task kind. | Tool -> existing delivery -> sidecar -> root event -> exact receiver event -> context -> selected Messages; DS-028–029. |
| BEH-018 | Task workflow / participant presentation | REQ-035–036; AC-030–031; SCN-019–020 | Original or task Agent delegates, assignee submits, delegator reviews, task settles, user inspects history. | Org Tasks requires Team view; task nodes lack exact navigation; saved records and notifications can be conflated. | Relevant exact participants see Tasks; genuine accepted notifications appear once; settlement hides active execution but preserves retained results/history. | Existing root task engine -> records/event and separate notify -> accepted-input adapter -> Org retained index -> Tasks/conversation; DS-029–030. |

## Relevant Supplemental Task Artifacts

Current exact-attachment evidence map:
`architecture-context-file-ownership-investigation.md` (IR048-DI-001, pinned
original Team comparison, actual structured saved-URI samples and limits).
Canonical design DS-041–046 owns attachment decisions; the investigation
supplement now includes CRR-081/API33 retained-record evidence and both recorder
paths. No upstream investigation edit.

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/agent-org-contract.md` | Normative configured structure, exact definition and run families, source ownership/admission, task ownership, handoff authoring/order, launch/configuration/focus, mixed projections, and launch override hierarchy. | REQ-001–037; AC-001–036; ORG-CASE-001–066 | Governs fixed-depth invariants, unversioned Team/Org definitions and org_local, native Team Run V2 / Org Run V1, target-only admission, two-family reuse, no-focus activation, transition, failure-closed projection, and exact override disclosure/state semantics. | Approved through `RER-033`; authoritative. |
| `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/investigation-notes.md` | Requirements-owned evidence and current production-path inventory. | BEH-001–BEH-018; PRE-001-PRE-005 | Supplies approved behavior and inventory evidence, including the exact API-FIND-019 Team/Org adapter and selected-member projection comparison; architecture evidence above extends rather than rewrites it. | Current through `RER-033`; not behavior authority by itself. |
| `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/requirements-revision-record.md` | Cumulative approval/navigation history. | RER-001–RER-033 | Establishes progressive Team reuse, Product UI, configuration-first launch, Team-V2/Org-V1 runtime correction, external-definition scope/admission, override hierarchy, launch/shell/workspace parity, first-message history parity, and AgentOrg communication-observability parity. | Approved/cumulative. |
| `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/design-review-report.md` and `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/architecture-review-revision-record.md` | Independent review result and finding history through AD-REV-024. | Latest completed ARCH-REV-021 Pass on AD-REV-024; earlier rounds retained | Records prior findings; `ARCH-REV-014` passed cumulative AD-REV-016; `ARCH-REV-015` accepted AD-REV-017's core and returned `AR-FIND-008` for receiver-only eligibility. | AD-REV-025 pending independent review; prior passes retain recorded scope |
| `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/implementation-handoff.md` and `implementation-revision-record.md` | Implementation-owned history and recovery evidence. | IR-001–048; IDI-001; ADI-007; IR048-DI-001 | IR-001 proved Team-root coupling; later reviewed rounds implemented runtime/presentation/status/lifecycle, mounted-Team launch/status, localization, recovery, and bounded CRR/API fixes. | IR-048 checkpoint6d77b3c8b/result5636a1f3a; original upload Local Fix checkpointed, new exact-owner Design Impact held. AD-REV-024 passed ARCH-REV-021; AD-REV-025 requires re-review. |
| `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and `api-e2e-evidence/API-REV-002/followup-api-find008*` | Real-system evidence through API-FIND-008, including clean control, normal submit/independent-accept overlap, and the invalid-self-review settlement reproduction. | BEH-009; REQ-015; AC-010; API-FIND-008; CR-CAND-020 | Separates supported production reachability from technical coupling evidence; the invalid self-review tail is explicitly non-authoritative for behavior. | Retained downstream evidence only; AD-REV-011/ARCH-REV-009 closed that design path. Current reports remain independently owned and artifact-specific; no new AD-REV-024 executable pass is claimed. |
| `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/architecture-design-self-validation.md` | Architecture-owned use-case/data-flow self-validation requested by the user. | BEH-001-BEH-018; SCN-001–SCN-024; IDI-001; ADI-007; API-FIND-007/008/019; CR-FIND-020; AR-FIND-003-008 | Walks the cumulative runtime plus launch/config/history ownership and VAL-038-040's accepted-delivery event, four endpoint directions, complete-Org selected-member projection, restore, responsive, and negative-path boundaries. | AD-REV-025 including VAL-064–069; design validation only, not executable evidence. |
| `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-013/post-pass-user-discovery/API-FIND-019-agentorg-communication-visibility-gap.md` | Real post-pass communication-observability evidence and explicit API/E2E coverage correction. | BEH-017; REQ-034; AC-029; SCN-018 | Establishes the supported delivery-success/presentation-failure path and Team parity control; drives DS-028, not a new message schema or Product dashboard. | Architecture evidence input; cumulative API/E2E must be renewed after implementation/review. |
| `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-server-ts/docs/design/production_data_migration_conventions.md` | Canonical server convention for known-source/fixed-target transformation, forward-only runtime, reachability, failure scope, recovery, residue, summaries/logs, and review. | REQ-012, REQ-013, REQ-027; AC-008, AC-022; SCN-004, SCN-011 | Governs AD-REV-004 migration mechanics; requirements continue to govern target state and availability. | Current repository architecture authority; explicitly identified by the user. |
| `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/code-review-report.md` and `code-review-revision-record.md` | Failure-origin and cumulative source/test-code review authority through the pre-RER-026 path. | CR-FIND-011-026; API-FIND-008/016/017 | Prior reviews close their bounded findings; API-FIND-019 was discovered after the last pass and has separate RER-026 authority. | RER-028/AD-REV-019 govern the task-inclusive correction; a fresh cumulative source review remains downstream. |
| `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/AORG-FLAT-TEAM-STATUS-001/ui-ux-spec.md`, `user-decision-record.md`, manifest and VIS-STATUS-001-003 | Focused mounted-Team status Product authority. | BEH-011; REQ-028; AC-023; SCN-012; ORG-CASE-056-058 | Governs exact branch fold, dot placement, collapsed visibility, accessibility, terminal/history truth and lifecycle non-effects; fixture status mixtures remain illustrative. | Completed, explicitly user-approved, integrated by `RER-021`; authoritative only for the prior omission. |
| `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/AORG-TEAM-OVERRIDES-001/ui-ux-spec.md`, `user-decision-record.md`, manifest and VIS-OVR-001-006 | Focused AgentOrg launch override hierarchy Product authority. | BEH-012; REQ-029; AC-024; SCN-013; ORG-CASE-059-061 | Governs exact count/disclosure placement, independent Team collapse, Team/Agent local state, coordinator Agent placement, draft continuity, established Team control language, and narrow behavior. | Completed and explicitly user-approved; supersedes only RV-012 Placement Overrides lines 89-95 and VIS-015. |
| `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/AORG-FLAT-TEAM-001/ui-ux-spec.md` | Normative Product interaction, visual, responsive, and accessibility contract. | REQ-019-REQ-024; AC-014-AC-019; SCN-007-SCN-009 | Governs production UI structure and state meaning; mocked persistence/runtime are explicitly non-authoritative. | Approved `RV-012`; authoritative except the superseded Placement Overrides lines 89-95 / VIS-015 slice. |
| `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/AORG-FLAT-TEAM-001/visual-references/visual-reference-manifest.json` and sibling `VIS-001`-`VIS-020` images | Normative final visual references, routes, viewports, state descriptions, hashes, and fixture boundary. | REQ-019; AC-014 | Every visible non-fixture detail informs the file/component/state mapping and browser acceptance checks. | Approved after user review; authoritative. |
| `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/AORG-FLAT-TEAM-001/user-decision-record.md` | Explicit Product approval record. | RER-014; REQ-019; AC-014 | Closes the Product gate; RER-019 changes only baseline activation/provenance. | Approved 2026-08-31. |
| `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/BASELINE-PROMOTION-001/ui-ux-spec.md` and VIS-PROMOTE-001-004 | Clean-route/default-baseline activation supplement. | RER-019; SCN-007 | Confirms the same approved Team/Org runtime on normal routes; supplements but does not replace RV-012/VIS-001-020. | User-authorized and integrated; no behavior change. |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_d2b93633ad6b4d969e6e0d776dda7721/requirements_engineer_6568eac682114f2cb3ddb8f1d91d3c34/context_files/ctx_4cc02361f417__image.png` | Representative current hierarchy screenshot. | REQ-016; AC-011 | Current-state evidence only; it does not prescribe target layout/styling. | Evidence only; no separate approval. |
| `origin/codex/flat-agent-team-domain-simplification@c3a318812` (local `ca6d24dfa`) | Prior concept evidence. | BEH-001, BEH-004, BEH-009 | Its supported decisions are already incorporated upstream; it is not a competing design. | Superseded by approved package. |

Additional current supplement: `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/architecture-ui-cleanup-investigation.md`
records the UI-CLEAN-001 source/screenshots and RER-031 resolution. DS-034 is
the normative technical correction; this supplement is evidence, not another
Product or requirements authority.

## Approved Product UI To Production Mapping

| Normative References | Product Surface / State | Production State Owner | Production API / Domain Owner | Required Implementation Boundary And Validation |
| --- | --- | --- | --- | --- |
| VIS-001-VIS-008 | Baseline Team catalog, Agent-only builder/detail, coordinator, Team-local From/To/When, narrow builder | `agentTeamDefinitionStore` complete Team draft; Team subject components | AgentTeamDefinition GraphQL/Service + Team endpoint catalog + revisioned provider commit | Remove Team library/nesting; preserve baseline shell/cards; direct Agent endpoints only; one coordinator; inline reversible handoff editor; keyboard/click fallback. |
| VIS-009-VIS-013 | Org catalog, in-flow Agent/Team member authoring, clean detail, Org handoff detail, narrow authoring | `agentOrgDefinitionStore` complete Org draft; Org subject components | AgentOrgDefinition GraphQL/Service + Org endpoint catalog + revisioned provider commit | No Category/coordinator/overlay; referenced Team identity is query-only; Org From includes mounted Agents, To also direct Teams; exact addresses/coordinator metadata inspectable. |
| VIS-019 | Org handoff CRUD/reorder/atomic-save state | Org definition draft plus shared handoff view/editor primitives | Complete-candidate validation and one Org definition CAS | No per-handoff write. Preserve failed draft; stale endpoints remain visible; typed errors map adjacent to handoff/field; success updates canonical revision. |
| VIS-014, VIS-020 plus VIS-OVR-001-VIS-OVR-006; REQ-029-REQ-030, REQ-032; AC-024-AC-025, AC-027; SCN-013-SCN-014, SCN-016 (`VIS-015` historical only; RER-024 governs incidental empty-root depiction) | One Org configuration; exact-Agent count; outer and independent Team disclosures; exact local state; direct-Agent continuity; draft continuity; fresh available Temp Workspace default; one preview/request/resolution/snapshot result; narrow configuration | `agentOrgRunConfigStore` exact root draft plus canonical Team/Agent sparse maps; pure AgentOrg form projector; shared Team launch presentation and root workspace-selection components | Existing CreateAgentOrgRun GraphQL input -> CollaborationLaunchConfigurationResolver -> AgentOrgRunService | Reuse the established Team controls and root default policy; canonicalize dependent `llmConfig` clear before preview/serialization; keep Org draft/payload separate and server resolution authoritative. No recipient selector, hard-coded path, always-exposed child tree, Team-store import, resolved-payload API, or new field. |
| VIS-016-VIS-018 | Full scope active unfocused; exact direct-Agent focus; direct-Team coordinator focus and accepted live conversation/composer | `AgentOrgExecutionContext` + `CollaborationFocusController` + tagged `ActiveAgentWorkspaceTarget`; `AgentOrgWorkspaceView` is a thin router to shared `AgentWorkspaceSurface` / `TeamWorkspaceSurface` | Strict AgentOrg snapshot/event/command contract; root-neutral Agent presentation adapter; Org member projection/trace service; exact `AgentOrgRun.executeAgentCommand` | Org focus starts `null` and renders prompt only. Direct Agent and Team/coordinator focus structurally reuse `AgentEventMonitor`, accepted header/actions, composer, tool/activity/files/token surfaces. No raw event cards, `JSON.stringify`, custom composer, implicit fallback, standalone Team registration, or member-header Org stop. |
| VIS-016-VIS-018 and UI spec shared runtime/history, governed by RER-024 continuity and RER-032 REQ-031/AC-026/SCN-015 for current heading copy | Org root, direct sibling Agents/Teams, Team children, task lineage/rails/selection inside one familiar left Workspaces surface | One route-stable mixed Workspace/history read model; AgentOrgExecutionContext remains active Org runtime owner | Subject-tagged history/stream facade over strict Team V2 and Org V1 projectors; typed subject action ports | Preserve existing categories and add `Orgs` immediately below `Teams`; entering Org config/active/history never swaps the panel or hides prior rows. Configured depth is fixed; root kind/actions remain truthful. |
| VIS-PROMOTE-001-VIS-PROMOTE-004 | Normal-route activation supplement: standalone Team config/history and AgentOrg active hierarchy | Existing Team contexts/history plus Org context/history facade on clean routes | Unchanged Team run boundary plus strict Org run boundary | These four images prove normal-route/default-baseline availability and standalone Team preservation; they supplement, never replace, VIS-001-VIS-020. Shared-surface extraction must keep the standalone Team active/history experience exact. |
| VIS-STATUS-001-VIS-STATUS-003; REQ-028; AC-023; SCN-012 | Mounted Team status active/expanded, active/collapsed and stopped/history | Exact AgentOrg topology + `AgentOrgExecutionContext` live Agent statuses or existing terminal/history projection; shared pure fold and `TeamAggregateStatusDot` | No new server/API owner; AgentOrg history remains topology/lifecycle owner and AgentContext remains exact live status owner | Team dot appears between disclosure and Team icon; configured/task Agent signals remain exact; fold is branch-local and computed before collapse; `Team status: <State>` is accessible; historical missing/live-only inputs are offline; no mounted-Team lifecycle action or new transport. |
| REQ-026, REQ-027, AC-021, AC-022, SCN-011; RV-012 unchanged | New-work catalog/authoring/launch eligibility and separate operational definition diagnostics | Subject catalog stores consume only `available` admission rows; history store remains snapshot-backed | `DefinitionAdmissionService` plus dependency availability resolver and diagnostics query | Do not render an incompatible definition as launchable or silently normalize it. Keep compatible RV-012 cards/routes unchanged; an unavailable external definition/dependent Org is absent from new-work lists and queryable with package root, identity/path, expected family/version, reason, and owner action. Existing history remains reachable. |
| RER-025 BEH-016 / REQ-033 / AC-028 / SCN-017; user delivered-Electron Org-versus-Team screenshots | Existing AgentOrg row summary or `New - <name>` fallback; live row changes after first qualifying accepted prompt without route/reload | Existing `WorkspaceAgentOrgHistoryCollection` remains unchanged and reads only the mixed history owner | Accepted Org command -> serialized Org history catalog -> shared first-write summary writer -> existing AgentOrg history query; registered migration uses the same writer for existing empty rows | This is behavior parity, not a new visual layout. Never put submitted text directly into the row/context, title from task/inter-Agent traffic, or add a stream/GraphQL field. |
| RER-026 BEH-017 / REQ-034 / AC-029 / SCN-018; API-FIND-019 user Team/Org comparison | Receiver-center inbound message plus selected sender/receiver owning-root Messages perspective, live and after reconnect/restore | Existing `AgentOrgExecutionContext` and exact AgentContexts; explicit `CollaborationMessagesContextView` on active targets; established shared Messages section/panel | Existing Org communication sidecar/adapter/publisher plus strict root-neutral member-input presentation adapter; no new transport or persistence | Direct and mounted Org targets show the unchanged contextual `Org` (`Agent Org` accessible name) Messages using complete-Org exact identity projection. Standalone Team stays `Team`; no copied Org dashboard, same-Team-only filter, browser-fabricated event, or mounted-Team lifecycle. |

Implementation must use the accepted AutoByteus shell and visual vocabulary.
Prototype fixture names, messages, IDs, timestamps, paths, and record values are
illustrative; layout, hierarchy, labels, controls, validation/focus states,
responsive behavior, and interaction meanings are normative. Production code
must not import prototype local persistence, simulated streams, or mocked
orchestration.

## Task Design Health Assessment (Mandatory)

Current AD-REV-026: CR-FIND042 is a missing non-media recording/projection
invariant; DS-044–046 extends existing shared input/memory/history value owners
with no new lifecycle or ledger. Historical missing links are not reconstructed.

Prior AD-REV-025: exact attachment identity/locator gap; bounded refactor now
inside existing Context Files/active-target/location owners (DS-041/042). Saved
link transformation belongs in the existing initial family migration (DS-043),
not a current runtime fallback.

Prior AD-REV-024: authoring-contract change; existing definition/admission owners
remain correct. Refactor the tight scope type/mapping and existing unreleased
migration generators, not runtime ownership or the registry lifecycle. DS-038–040
state exact removals, first-run premise and preservation. No additional migration
is justified by intermediate development data.

Prior AD-REV-023: boundary error/missing observational invariant; bounded browser
refactor in DS-035–037. Root runtime, persistence and Team controls are unchanged.


AD-REV-021: DS-034 removes excess presentation within existing shared components; identity remains in existing root read projections, revealed on demand. No runtime refactor.


Prior AD-REV-020 focused assessment: user-approved authored-contract simplification;
shared-structure tightening and migration-only historical isolation, within
existing owners. Refactor now as DS-031–033; no runtime redesign.

- Change posture: `Larger Requirement` and `Refactor`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`, with
  `Duplicated Policy Or Coordination`, `Shared Structure Looseness`, and a
  `Concurrency / Lifecycle Ordering Defect` in the shared task boundary. The
  AD-REV-013 focused evidence adds a duplicated effective-configuration policy,
  a route-selected competing history owner, and one local root-default defect.
  RER-025 adds a missing derived-metadata lifecycle: Org command acceptance,
  history persistence, and live history projection have no coordinating path
  even though the value and renderer already exist. RER-026 adds one local
  post-durable event-publication defect plus a root-versus-Team presentation
  ownership issue: root communication is incorrectly bundled into a Team view.
- Refactor needed now: `Yes`
- Evidence: one Team definition/runtime subject owns ordinary Team and
  organization behavior; recursive graph/planner/transport/UI contracts legalize
  Team-in-Team; organization roots require a fake Team coordinator. `IDI-001`
  adds concrete evidence that even the local Agent/Team execution path depends
  on `RootTeamRun`, Team identity/physical scope, Team task/message sidecars, and
  Team event/persistence callbacks. Adding an Org activator around those internals
  would leave either a synthetic Team owner or an unowned Org execution graph.
  ADI-007 provides a second, distinct boundary witness: the Org wire contract
  admitted `unknown`, the browser root store retained opaque events, and the Org
  Vue component owned protocol formatting, conversation rendering, input, and
  root termination. That bypassed the accepted Agent presentation owner and
  created a parallel product runtime surface. API-FIND-007 adds a bounded
  presentation-policy witness: the Org history panel bypasses the established
  Team aggregate status concern, omits Team status, hard-codes Agent green, and
  ties branch construction to expansion. Copying another fold into that
  component would duplicate policy rather than restore the missing projection.
  API-FIND-008 and ARCH-REV-006 add the task-lifecycle boundary evidence and its
  necessary reachability correction. Source proves provider quiescence is awaited
  inside the record FIFO and roots can drain task work before interruption. The
  long exact stall used unsupported self-review and is technical evidence only.
  Independent supported paths are normal assignee-submit/delegator-accept overlap
  and application shutdown of an active task Agent at a legitimate tool approval.
  `ARCH-REV-007 / AR-FIND-004` adds the missing normal phase witness: durable
  task activation releases initial work asynchronously, and SIGTERM can enter
  after AgentRun admits/starts provider input but before canonical
  `TURN_STARTED`. Origin/personal has the same latent gap because normal
  termination intentionally drains admitted input and its stop regressions began
  only after an active approval wait. `CRR-021 / CR-FIND-020` adds a focused
  frontend `Duplicated Policy Or Coordination` witness: the Org form recreated
  the mounted-Team hierarchy, disclosure and state language in
  `AgentOrgPlacementOverrideRow` even though the accepted Team components are
  unchanged and already own those concerns. The old component also represents a
  Team scope by fabricating an Agent-shaped node, which loosens the presentation
  boundary and omits Team workspace editing. RER-024's Electron evidence adds
  three concrete design-health failures: `resolveOverrideLlmConfig` clears a
  dependent config that the Org serializer omits and the server re-inherits;
  `AppLeftPanel` swaps the established tree for `AgentOrgRunHistoryPanel` by
  route; and `AgentOrgRunConfigPanel` disables root default selection even
  though the Team root enables the shared policy. These are architecture-owned
  consistency defects, not evidence that the requirements should prescribe
  component implementation. RER-025 evidence adds a narrow cross-boundary gap:
  the Team handler calls a serialized first-write catalog after Agent acceptance,
  while the Org handler only acknowledges the command; the Org execution index
  mixes configured and task Agents, and the web ACK path does not invalidate the
  already-capable Org history row. A UI-only text patch would therefore create a
  second authority and still leave historical rows unresolved. API-FIND-019
  proves the next distinct gap: `AgentOrgCommunicationAdapter` commits the same
  root record/input as Team but publishes no receiver member-input event;
  `RightSideTabs` hides collaboration for direct Org targets; and
  `projectAgentOrgTeamMessages` drops counterparts outside the containing Team.
  The sole Org sidecar and strict Org context already contain the needed truth,
  so a new store, wire field, or dashboard would worsen ownership.
- Design response: separate AgentOrg and AgentTeam definition/run/persistence
  owners; keep native Team V2 and Team runtime intact where they are already
  truthful; add Org V1 and Org runtime; add exact subject definition codecs and
  a source-aware admission owner; extract only semantically tight shared
  Agent/Team/handoff/launch/task records and low-level execution mechanisms;
  replace configured recursion with fixed-depth validation and projection. Keep
  current source forward-only and isolate the known old-to-current transform in
  one registered migration that follows the existing runner/convention rather
  than adding a second recovery architecture. For ADI-007, move raw Agent event
  admission to one root-neutral presentation adapter, create a strict Org
  execution context/stream, extract reusable Agent/Team workspace surfaces and
  make the active-target/interaction facade the sole component command boundary;
  remove the bespoke Org runtime dashboard. For AD-REV-007, extract the existing
  five-state normalizer/fold and dot into neutral Team-branch presentation
  concerns, keep Team-history and AgentOrg traversal adapters subject-shaped,
  and make the Org hierarchy consume exact context/history Agent statuses before
  collapse. For AD-REV-009, retain the existing one-FIFO/prepared-settlement
  architecture but make task-execution preparation a non-waiting atomic
  quiescence attempt: active work defers and retries on the existing idle event.
  For AD-REV-010, add a distinct irreversible AgentRun root-shutdown fence,
  serialize claim/provider-start registration against it, reuse the existing
  pre-forward cancellation fact, and recursively invoke it through stable frozen
  Team/Org scopes before task drain. Keep ordinary AgentRun preparation's FIFO
  drain behavior. Withdraw AD-REV-008's coordinator/token/dependency machinery.
  For AD-REV-012, keep the AgentOrg draft and create-run command Org-owned,
  split exact Team/Agent override state, add one pure fixed-depth Org form
  projector, and route mounted Team nodes through the existing
  `TeamMemberConfigTree -> TeamScopeConfigEditor -> MemberOverrideItem`
  presentation/edit-command path. Extract only the compact outer disclosure
  shell needed by both root forms; remove the bespoke Org Team-row branch rather
  than keeping two visual policies. For AD-REV-013, canonicalize every Org Team/
  Agent patch at its one store/command boundary so explicit runtime/model edits
  carry an explicit dependent-config clear; keep one always-mounted mixed
  Workspace/history surface and delete the route-selected Org-only panel; and
  apply the existing root workspace-default selection policy to the AgentOrg
  root while leaving placement inheritance exact. For AD-REV-015, preserve
  existing Org command admission but return the exact indexed execution kind
  with the internal command outcome; only accepted configured external sends
  enter the Org history catalog's Team-identical serialized first write. Refresh
  the existing web history authority after ACK, and isolate uniquely provable
  historical trace inference in one registered startup migration. For
  AD-REV-017, preserve the one Org record and append the missing exact receiver
  presentation consequence in the Org-private post-durable flow through the
  AgentOrgRun presentation owner; split a
  root-neutral Messages facet from Team roster/header presentation; attach the
  owning Org facet to every selected Org Agent execution; and reuse the
  established Messages component. AD-REV-019 supersedes the AD-REV-018 gate:
  resolve every admitted endpoint pair, remove Team-only Tasks dependency, and
  make exact task selection/retained projection possible through DS-029–030.
- Refactor rationale: the durable correction specifically reduces the prior
  refactor: there is no justification to rename or replace the valid Team V2
  family. IDI-001 demonstrates that the runtime extraction cannot be deferred;
  it is required to make Org composition valid without weakening the two-family
  authority. Refactor remains required at configured Agent/Team execution
  context, task/message adapters, definition recursion, organization runtime
  ownership, mixed projection, and frontend boundaries. The AD-REV-012 frontend
  refactor is required now because a badge-only change would retain the
  superseded always-exposed hierarchy and duplicated Team editor; direct reuse is
  smaller and keeps standalone Team visual behavior as the regression oracle.
  The AD-REV-013 history consolidation is also required now: retaining both
  panels would preserve two navigation authorities and make continuity depend on
  route rather than state. The patch/default corrections are bounded local
  changes but must be specified with cross-layer equality tests because either
  silent drift can launch the wrong runtime configuration. AD-REV-015 reuses the
  current Org history/index/read contracts, so the correct refactor is a narrow
  service/catalog extension plus explicit command observation and migration
  isolation—not a new title store, API field, stream event, or UI state owner.
  AD-REV-017 requires the small boundary refactor now because retaining message
  lookup inside `TeamWorkspaceContextView` either excludes direct Agents or
  falsely grants a mounted Team root-message authority. The root-neutral facet
  is narrower than a generic Team/Org context and lets both subjects reuse one
  mature presentation without coupling their lifecycle or persistence owners.
  AD-REV-019 requires the additional bounded presentation refactor: one retained
  execution index replaces fragmented identity maps, Tasks is an independent
  root facet, and accepted system input is not inferred from task records.
  Current task engine/sidecars already represent the workflow; no redesign there.
- Intentional deferrals/residual risk: dynamic membership, distributed cross-run
  routing, shared Agent instances, new application-owned Org resources, and new
  product-visible task settlement semantics remain out of scope. Updating or releasing either
  external definition repository is separately owned; temporary unavailability
  is explicit, not architecture debt inside this ticket. Historical opaque
  `team-local-*` definition IDs may remain as identity strings; current code
  must never parse that prefix as configured nesting permission.

## Terminology

- **Standalone Team run:** native `RootTeamRun`/TeamRun aggregate persisted as
  exact `TeamRunExecutionTreeFileV2` under `agent_teams`.
- **AgentOrg run:** coordinator-free Org aggregate persisted as strict
  `AgentOrgRunExecutionTreeFileV1` under `agent_orgs`; it owns direct Agent and
  flat Team placements in one collaboration scope.
- **Current Team Definition Config:** exact normal `team-config.json` without
  schemaVersion, direct Agent members without `refType`, and one direct-Agent
  coordinator. It is independent of Team Run Execution Tree V2.
- **Current Org Definition Config:** exact normal `org-config.json` without
  schemaVersion, with explicit Agent/Team member kinds and no coordinator.
- **Definition admission:** source-aware target-codec validation and dependency
  closure that yields an available catalog row or an actionable unavailable
  diagnostic; it never invokes the migration-only decoder.
- **External read-only definition:** a package whose source project owns its
  format/update/release. This ticket may target-validate it but may not mutate
  it.
- **Root execution identity:** internal tagged compound identity
  `{rootSubjectKind, rootRunId}` used by shared execution capabilities; it is not
  a persisted generic root envelope.
- **Root execution physical scope:** tagged root identity plus physical TeamRun
  ancestry used only to locate Agent memory. Empty ancestry means direct to the
  Team/Org root; it does not invent a Team for an Org.
- **Member execution context:** AgentRun-injected collaboration identity,
  outgoing handoffs/delivery, enclosing authored instruction, and bound task
  command capability. It supersedes the Team-root-specific member context.
- **Flat Team execution:** one local `TeamRun` containing direct configured
  Agents and optional task descendants, materialized beneath either a standalone
  Team root or an Org root without owning a root package/registry.
- **Root execution projection:** non-authoritative mixed transport/history DTO
  tagged with `root_subject_kind`, containing either Team V2 or Org V1 view.
- **Configured scope:** standalone Team root, Org root, or direct Team placement
  that owns configured Agent executions. Only Org may own configured Teams.
- **Org-owned definition source:** a Team/Agent package physically owned under an
  Org source boundary for the migrated cohort. It remains a distinct reusable
  definition identity, not a Team nested in another Team.
- **Host scope:** exact Org root, Team, or task Team whose `taskExecutions` array
  owns a fresh task execution.
- **Task mutation FIFO:** the root-neutral queue that serializes task
  record/tree/sidecar durability, publication, and settlement of an execution
  already proven quiescent. A non-quiescent execution defers without waiting.
- **Non-waiting quiescence preparation:** atomic AgentRun/local-Team operation
  that returns `null` with no state change while any input/turn is unresolved,
  or returns the existing prepared termination after closing admission on a
  quiescent execution.
- **Activation:** create/restore complete configured scope; does not select a
  communication recipient.
- **Communication focus:** nullable client/session selection of an exact AgentRun
  (or Team row resolved to its coordinator); never persisted in either family.
- **Definition revision:** opaque provider-issued hash/token used only for one
  complete parent-definition compare-and-swap transaction.
- **AgentOrg form projector:** pure, fixed-depth web adapter from one admitted
  Org plus referenced flat Team definitions and the Org-owned sparse draft to
  existing Team presentation nodes, exact configurable-Agent count, and a
  closed success/diagnostic result. It owns neither state nor launch policy.
- **Canonical AgentOrg placement patch:** the single Org-owned Team/Agent sparse
  patch representation consumed by preview and request serialization. An owned
  runtime/model identity plus absent model config is materialized as explicit
  `llmConfig:null`; ordinary absent fields still inherit.
- **Unified Workspace/history read model:** one route-independent data
  projection that loads/strictly decodes tagged Agent, Team, and AgentOrg roots,
  groups them below one workspace, orders categories/rows, and retains
  family-scoped success/error slices. It owns no navigation presentation state,
  subject runtime, or lifecycle.
- **Workspace history tree-state presentation owner:** the single
  `useWorkspaceHistoryTreeState` instance created by the always-mounted
  `WorkspaceAgentRunsTreePanel`. It owns expanded/revealed/highlighted row state;
  the panel owns its persistent scroll container. It consumes stable row keys
  plus the existing selected-identity signal and owns neither history loading
  nor the selected subject/runtime identity.

### AD-REV-015 Derived-History Terms

- **Qualifying AgentOrg history input:** a non-empty external user
  `SEND_MESSAGE` whose exact target is a configured Agent in the current
  AgentOrg tree and whose Agent command result is `accepted`. Direct Org and
  direct mounted-Team configured Agents qualify identically; task-scoped,
  inter-Agent, system, approval, interrupt, rejected, failed, and empty inputs
  do not.
- **First accepted ordering:** server completion order of qualifying configured-
  Agent command results. The stream handler enqueues the history mutation
  immediately after that result and before its next await; the catalog's
  serialized first-write rule selects the first non-empty enqueue.
- **Authoritative AgentOrg history refresh:** a post-ACK network read of the
  existing strict AgentOrg history family whose newest request generation alone
  may replace that family slice. It is not an optimistic text mutation.
- **Unique earliest trace:** exactly one migration candidate with a finite
  timestamp strictly less than every other qualifying configured-member
  candidate in the complete archived-plus-active trace corpus. A tie, invalid
  required evidence, or absence is unresolved and preserves the empty-summary
  fallback.

### AD-REV-019 Communication And Task Presentation Terms

- **Owning-root Messages facet:** read-only exact selected-participant view of
  ordinary same-root communication. All admitted configured/task endpoint pairs
  qualify; retained counterpart identity survives settlement.
- **Receiver member input:** existing post-durable presentation for one exact
  ordinary-message receiver, correlated to the sole root communication record.
- **Participant Tasks facet:** view of task records relevant to exact delegator,
  assigned task Agent or members of assigned fresh Team. It is not a Team roster,
  another task engine or an independent task store.
- **Accepted task-system input:** actual input acceptance after a task lifecycle
  step; not equivalent to committed submission/review and not a Messages row.
- **Retained execution selection:** exact AgentRun identity, not source address;
  configured Team focus is an explicit separate value. See DS-029 for shape.
- **Team presentation view:** genuine Team roster/coordinator/header context;
  neither root Messages nor participant Tasks ownership is nested in it.

## Design Reading Order

1. Read `Intended Change`, `Target Definition And Source Contracts`, and
   `Target Run-Tree And Launch Contracts` for the solution boundary.
2. Read the behavior map, Product mapping, and supported-scenario table for the
   approved behavior witnesses.
3. Read DS-000-DS-028, especially the AD-REV-005 internal runtime composition,
   AD-REV-006 accepted-workspace projection, AD-REV-007 mounted-Team status, and
   AD-REV-009 supported idle-gated settlement contract plus AD-REV-010 AgentRun
   root-shutdown fence, AD-REV-012 established Team launch-hierarchy reuse, and
   AD-REV-013 configuration-equality/unified-shell/default recovery,
   AD-REV-015 history-summary recovery, and AD-REV-019 task-inclusive Messages, exact Tasks/selection and system-input
   presentation,
   then the ownership and dependency sections for implementation control flow
   and encapsulation.
4. Read the persisted-data decision/migration plan before changing any Team V2
   schema, history, or memory code; flat Team is deliberately a no-op cohort.
5. Use the final file mapping, removal plan, sequence, risks, implementation
   guidance, and separate `architecture-design-self-validation.md` use-case
   walkthrough as the implementation/review checklist.

## Legacy Removal Policy (Mandatory)

- Policy: clean-cut removal of recursive configured-Team behavior; no runtime
  compatibility branch for unsupported configured depth.
- Preserve (not compatibility): exact Team V2 normal store/path/schema and
  Team-only APIs/DTOs that remain semantically valid for flat Teams, as required
  by REQ-014/REQ-025.
- Remove from normal code: Team-member input beneath Team, recursive configured
  definition resolution/planning, configured-child Team materialization,
  `getOrCreateConfiguredChildTeam`, Team-root-specific member/tool identity and
  task-root resolution in shared AgentRun code, recursive Team selectors,
  Org-as-Team coordinator semantics, injected no-owner Org activator, Org entry
  selector/fallback focus, and mixed readers that infer root kind.
- Remove from the task lifecycle: any call that begins waiting
  `prepareTermination()` for a non-quiescent execution at the root mutation FIFO
  head, drain-before-fence root shutdown, and any root wrapper that treats
  active-turn-only `NO_ACTIVE_TURN` as complete while input may still start.
  Replace the wait with the
  AD-REV-009 non-waiting quiescence preparation plus established idle-event
  resweep, and use AD-REV-010's stable recursive scope plus AgentRun-owned input/
  provider-start/interrupt fence before task drain. Do not add the blocked
  AD-REV-008 coordinator/token path as a fallback.
- Definition cut: replace the retired recursive Team config parser with strict
  current Team Definition Config and current Org Definition Config codecs. Do not leave a
  normal dual parser, implicit `refType` insertion/removal, or retired external
  fallback. The unversioned recursive definition decoder exists only inside the
  named server-owned migration module; normal source discovery cannot import it.
- Historical boundary: the old organization-like Team Run V2
  decoder/transformer and unversioned definition decoder exist only inside the
  named migration module. Flat Team Run V2 is not historical and continues
  through the native store. External source owners update their own packages;
  this ticket retains no writer or converter for those roots.
- No dual authority: migrated organization-like roots cannot remain advertised
  under both `agent_teams` and `agent_orgs`; current services never auto-retype,
  auto-move, or try both validators.
- Presentation cut: remove the Team-kind branch and always-exposed mounted-Team
  child hierarchy from `AgentOrgPlacementOverrideRow`; use the existing Team
  form presentation through the Org projector. Do not retain a feature flag,
  alternate layout, Team store dependency, or mixed override-map authority.
- Communication presentation cut: remove root-message ownership from
  `TeamWorkspaceContextView`, the same-Team-only AgentOrg message projector, and
  Team-kind-only right-tab gating. Replace them with one explicit owning-root
  Messages facet and the shared Messages presentation. Do not retain aliases,
  a hidden Org ledger, browser event synthesis, or Team-root fallback.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

AD-REV-026 / DS-046: versionless optional non-media facts preserve existing
readable history without rewriting or inventing missing associations. Existing
locator transition/readiness extends its explicit visitor only; no new migration.

AD-REV-025 / DS-043 governs attachment bytes, draft scope and structured locator
values separately from definition authoring. Saved Team-to-Org attachment links
require transformation; current exact final bytes/trees do not. The known first
rollout extends the existing family migration, never resets a terminal record.
Actual draft/deployment inventory prerequisites are explicit; sample zero counts
are not a universal no-data assertion.

AD-REV-024 / DS-039 governs the current first-run definition target and bounded
owned preservation. Update existing unreleased migration code directly; do not
freeze intermediate branch outputs or add another migration. DS-032/033 are
synchronized with that algorithm. Runtime data is Not Affected by the authoring
delta; original approved family runtime migration remains unchanged.

The governing production convention is
`/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-server-ts/docs/design/production_data_migration_conventions.md`,
linked from the server README. This design applies that convention rather than
inventing a second recovery framework.

AD-REV-019 is `Directly Usable — No Migration`: strict current Org tree nodes,
task/communication records and exact Agent traces already encode the retained
meaning. Exact task IDs/platform binding/physical host come from actual retained
nodes; frozen source supplies configuration only. The change alters projection,
selection and a readonly query, not stored state. No kind-based compatibility
reader, rewrite, notification backfill or schema field is required. DS-028–030
specifies validation of correlation; it never fills missing facts heuristically.

- **Observed populations (evidence, not a frozen rollout plan):** 23 definition
  roots under the two external repositories are read-only topology evidence (20
  Agent-only and 3 organization-like); one writable server-data Team and two
  implementation-repository application Teams were observed in the approved
  probe, all in the retired unversioned flat shape. The authoritative definition
  inventory is the cutover scan by source class. The `RER-017` runtime re-probe
  found 43 readable Team Run V2 packages: 27 Agent-only and 16 one-level
  organization-like, with none deeper. The cutover runtime inventory, not the
  earlier 41-package count, is authoritative.
- **Fixed targets:** normal definition code accepts only field-free current Team
  or Org Definition Config (DS-031). Normal runtime code accepts only native Team
  Run V2 under `agent_teams` or Org Run V1 under `agent_orgs`. There is no
  current-runtime legacy definition/run decoder, dual reader/writer, lazy
  conversion, or path fallback.
- **Required preserved semantics:** definition/run IDs, canonical member
  addresses, direct Team coordinators, launch configuration, effective handoff
  array/rule order, application binding, timestamps, tasks and exact task hosts,
  memory/messages/content/history, and standalone Team history. A migrated root
  coordinator remains an ordinary direct Org Agent but loses root coordinator
  and default-recipient meaning.
- **Normal operating assumptions:** one startup migration writer, stable process
  and power for an attempt, normal filesystem behavior, and readable/writable
  same-filesystem server data. The two runtime family directories are children
  of one configured memory root. These prerequisites do not justify custom
  journals, restoration state machines, per-syscall branches, or exhaustive
  power/kernel/device failure tests.
- **AD-REV-009 runtime-state decision:** `Directly Usable — No Migration`.
  Terminal task records already use `accepted`/`interrupted`, and execution
  nodes already own `settledAt`. The correction changes only in-process
  settlement eligibility and shutdown ordering. Existing strict readers preserve
  the same meaning; no file, schema, sidecar, history, or migration change is
  authorized.
- **AD-REV-010 runtime-state decision:** `Not Affected`. The AgentRun
  root-shutdown latch, input-dispatch slot phase, and pending interrupt intent
  are process-local lifecycle state. Pre-forward cancellation already exists in
  `AgentRunInputLifecycle`; no durable task/run field is added or reinterpreted.
  Existing Team V2 and Org V1 packages remain directly usable under the
  AD-REV-009 decision and require no additional migration.
- **AD-REV-013 frontend-state decision:** `Not Affected`. Canonical web launch
  patches exist only before create; root workspace selection maps to the
  existing launch field; and the unified history surface consumes the same
  tagged derived rows and strict run snapshots. No stored Team V2/Org V1 file,
  sidecar, index schema, migration cohort, or existing run is rewritten. The
  alternate Org-only Vue panel is source code, not persisted user data.

| Cohort | Transition Decision | Required Outcome |
| --- | --- | --- |
| Implementation-repository server-owned definitions | `Migration Required — source/build change` | Commit exact field-free configs and current fixture checks (DS-032); deployed runtime never rewrites repository or application bundles. |
| Writable server-data definitions | `Migration Required` for approved old authoring/family sources; final unversioned/new-scope config `Directly Usable` | DS-039 updates existing first-run generators and owned authoring pass in place. Final targets directly, no additional migration or runtime replay. |
| External definition roots | `External Dependency — no in-ticket migration` | Perform target-only admission. Compatible packages admit; incompatible packages and dependent Orgs are capability-scoped unavailable with diagnostics. Record owner action but make no write/SCM/release claim. |
| Agent-only Team Run V2 packages | `Directly Usable — No Migration` | Validate exact V2/root/path/coordinator/Agent-only membership and record `SKIPPED_ALREADY_CURRENT`; perform no execution-tree/path write; unaffected records remain zero-write. DS-043 permits only proven structured locator references into converted roots to change. |
| One-level organization-like Team Run V2 packages | `Migration Required — registered startup migration` | Materialize and validate the complete Org V1 package (Org tree plus strict Org task/message sidecars) inside the source package, atomically rename that package to the Org family, then remove all retired Team authority files before success. Cleanup failure leaves that root unavailable and retryable. Definition-source availability never removes a runtime package from this cohort. |
| Root package-readiness catalogs and in-memory projection caches | `Discard or Rebuild` | Re-enumerate strict Team/Org packages and rebuild tagged projections; old/failed items do not enter current readiness. This never authorizes discarding stable history summaries. |
| Team and AgentOrg run history indexes | `Directly Usable — preserve derived values`; AgentOrg empty-summary cohort has `Migration Required` | Join strict current packages to current index rows while preserving every non-empty summary. AgentOrg create/stop/restore/rebuild never recomputes or replaces it. Only the registered AD-REV-015 migration may backfill an empty Org row from unique evidence; normal reads/rebuilds never scan traces. |

The Team definition file conversion is small; the runtime and cross-subsystem
cutover remain Large/High. Rewriting flat Team runtime packages adds risk with
no semantic benefit. Keeping a retired recursive or version-bearing normal definition parser would
violate the single field-free current shape required by RER-029.
Supported criteria are AC-004, AC-006, AC-008-AC-010, AC-020-AC-022;
QR-002-QR-005 and QR-007; PRE-001-PRE-005.

### AD-REV-015 Derived AgentOrg History Summary Transition

- **Decision:** `Migration Required — derived metadata, schema unchanged`.
  `agent_org_run_history_index.json` already contains the strict `summary`
  field and normal rows already preserve it; only the value lifecycle is
  missing. No AgentOrg tree, sidecar, trace, message, task, focus, or stream
  schema changes.
- **Current writes:** after exact configured-Agent `SEND_MESSAGE` acceptance,
  the normal runtime uses `AgentOrgRunHistoryCatalogService.recordRunSummary`.
  Its existing serialized queue invokes one stateless
  `AgentOrgRunHistorySummaryWriter` for shared compaction, first-write transform,
  atomic persistence and strict reread. Create/restore/stop/rebuild copy that
  value rather than deriving or replacing it.
- **Historical cohort:** every current strict AgentOrg V1 package whose current
  history row has an empty summary. Existing non-empty rows are immutable input
  to this migration. Team rows and Team packages are not in the cohort.
- **Prerequisites:** `20260901_agent_org_flat_team_families_v1`,
  `20260617_raw_trace_rotation_layout`, and
  `20260707_raw_trace_active_file_name` must complete before
  `20260905_agent_org_history_first_message_summary_v1`; this gives one strict
  Org family and one complete current trace layout before inference.
- **Transformation:** enumerate configured Agents from the strict V1 tree,
  derive exact direct/mounted physical locations through `AgentMemoryLayout`,
  read complete archived and active trace corpora plus root communication/task
  exclusion evidence, and select only one strictly earliest provenance-qualified
  trace. Use the same shared summary writer as the current catalog; never scan
  task nodes/directories, treat internal sidecars as positive evidence, or
  promote a later trace after an excluded earliest fact.
- **Validation/completion:** strict reread proves the selected row has the
  compacted value and every pre-existing non-empty row remains unchanged.
  Deterministic sorted disposition counts plus capped path/ID examples are
  recorded without message content.
- **Absent or ambiguous evidence:** leave the empty summary valid and record
  `SKIPPED_NO_UNIQUE_QUALIFYING_TRACE`; the approved `New - <AgentOrg name>`
  remains truthful. This yields `SUCCEEDED_WITH_WARNINGS`, not a fabricated
  value or startup-wide failure.
- **Restart/recovery:** use the existing startup-only runner, atomic catalog
  write, idempotent non-empty skip, and `RESTART_TO_RETRY`. There is no bespoke
  journal, backup, alternate index, trace-on-read fallback, or power/corruption
  matrix. A required current-structure read or selected-value write/reread
  failure is `FAILED` under the existing runner.
- **Rollback/retention:** runtime is forward-only; rollback does not re-enable an
  old writer or erase a committed derived summary. Retain the migration and its
  classifier for historical startup records; normal runtime must not import the
  classifier.


### Production Migration Convention Application

The rules are migration-specific. A status or residue policy in one row must not
be applied to another migration merely because they use the same runner.
The existing 20260911 definition migration is governed by DS-039/040: SUCCEEDED for
complete current conversion/skips, FAILED for any required item/inventory error,
no warning branch. It does not touch runtime or summary migration records.

#### `20260901_agent_org_flat_team_families_v1`

| Canonical Convention | Family Migration Application |
| --- | --- |
| Known released source to one fixed target | Migration-only codecs accept only the investigated released Team Run V2 envelope and approved zero/one-level retired server-owned definitions. The migration first tries the strict current flat-Team V2 validator; otherwise its isolated released-V2 classifier accepts only the proven one-level organization-like shape. Each item deterministically becomes the final unversioned Team/org_local Org definition directly, native Team Run V2 no-op, exact Org Run V1, or an explicit failure. Already final definitions are zero-write skips under DS-039. Existing code is updated before first deployment; no intermediate format is a fixed released output. No identity/topology guessing. |
| Forward-only current runtime | All retired definition decoding and Team-V2-to-Org-V1 transformation live under this registered migration folder. Target definition providers, run stores, history, launch, and admission never import them or try an old path/shape. |
| Validate before mutation/destructive cleanup | Preflight validates the complete affected definition/package, fixed depth, identity/ref mapping, destination absence, and target payload in memory before its first write. For Org packages, the new current authority is written and reread before the directory rename; the old authority is removed only after the renamed target validates. |
| Abrupt termination | Treat quit/kill/shutdown/power loss as one incomplete-attempt category. Atomic file replacement leaves old or current content; atomic directory rename leaves source or target. Ordinary later startup retry recognizes those deterministic states. No bespoke journal, backup, staging tree, rollback/restoration state machine, or boundary-by-boundary crash matrix. |
| Existing runner and recovery action | Register as `requiredOnStartup:true`, `executionPolicy:"STARTUP_ONLY"`, after the current Team Run V2 prerequisite. `AppDataMigrationRunner.runPending()` owns attempts/record/log. Failed/stale startup work exposes `RESTART_TO_RETRY`, `canRetry:false`; the Settings Retry mutation must not run it. |
| Narrow final-state classification | One invalid/unconverted definition or run makes only that definition/root and dependent new-work operation unavailable. Compatible definitions/runs and unrelated server capabilities start. A missing current platform/store would be critical, but no such change is introduced. External incompatibility is an admission result, not migration failure. |
| Truthful statuses | `SUCCEEDED` only when every supported in-scope item is independently current and required retired-file cleanup completes. This family migration has no `SUCCEEDED_WITH_WARNINGS` disposition. Any invalid target, cleanup failure, family conflict, or unsupported in-scope item yields migration `FAILED`; strict catalogs exclude the affected item and restart retries it. |
| Bounded diagnostics | Process one package at a time. Return aggregate disposition counts with at most five sorted relative-path examples per disposition. The runner persists only its canonical opaque summary sentence and writes detail to its existing attempt log. Do not add item arrays/alternate summaries to the database/API/UI. |
| Cleanup residue | After package rename, retry recognizes the exact target and removes any retired `team_run_execution_tree.json`, `task_delegation_records.json`, `team_communication_messages.json`, `team-config.json`, or `team.md` before declaring success. This family migration has no storage-residue warning exception: cleanup failure, source+target family paths, invalid target, or semantically selected residue is `FAILED`/capability-scoped unavailable. |
| Product reachability/proportionality | Supported triggers are server startup, normal process interruption followed by restart, and Settings inspection of server-owned status/restart guidance. Hostile tampering, arbitrary corruption, adversarial writers, restore commands, cross-device recovery, and manual migration-record edits are out of scope. |

#### `20260905_agent_org_history_first_message_summary_v1`

| Canonical Convention | Summary Migration Application |
| --- | --- |
| Known current source and fixed value lifecycle | Read only strict current AgentOrg V1 packages and current Org history-index rows after declared family/trace prerequisites. Preserve non-empty summaries. For an empty summary, either select one uniquely earliest provenance-qualified configured-member trace or retain the independently valid empty value; no legacy shape or heuristic origin is admitted. |
| Forward-only current runtime | Provenance inference exists only inside this registered migration. Normal history readers/writers consume the current index and never scan traces, retry inference, or enable an alternate summary authority. |
| Nullable derived metadata and truthful statuses | `BACKFILLED_AGENT_ORG_HISTORY_SUMMARY` and existing-summary skips contribute normal success. One or more `SKIPPED_NO_UNIQUE_QUALIFYING_TRACE` rows make the migration `SUCCEEDED_WITH_WARNINGS` because the empty value and `New - <name>` fallback remain independently valid. Failure to read required current package/index structure, or to atomically write and strictly reread a selected value, makes the migration `FAILED`. Family-migration cleanup or unsupported-source rules are not reclassified here. |
| Existing runner and recovery action | Register after `20260901_agent_org_flat_team_families_v1`, `20260617_raw_trace_rotation_layout`, and `20260707_raw_trace_active_file_name` as startup-only. The existing runner owns attempt/status/log; `FAILED` or interrupted/stale work exposes ordinary `RESTART_TO_RETRY`. No Settings retry path or new runner state is added. |
| Abrupt termination and idempotence | Atomic index replacement plus strict reread leaves either the old empty value or current committed summary. On restart, non-empty rows skip before trace read and empty rows are classified again. No journal, backup, rollback state machine, or trace-on-read fallback is added. |
| Bounded diagnostics | Return deterministic aggregate disposition counts with at most five sorted root/path examples per disposition and no message content. The warning identifies unavailable unique provenance, not invalid current metadata. |
| Product reachability/proportionality | Supported outcomes are startup backfill, truthful empty fallback with bounded warning, and ordinary restart after an interrupted/failed attempt. No migration outcome changes AgentOrg run availability when its current package/index remain valid and only unique historical provenance is absent. |

### Migration Plan

The following existing 20260901 family algorithm is updated directly for first
release under DS-039. Definition generators emit the final unversioned shape and
org_local directly. The existing authoring pass handles the approved otherwise-
current owned cohort, not a presumed deployed intermediate release. No new
migration ID or runtime replay is introduced. Runtime output is unchanged.

- **Definition and registration:** create
  `AgentOrgFlatTeamFamiliesV1AppDataMigration` under
  `autobyteus-server-ts/src/app-data-migrations/migrations/agent-org-flat-team-families-v1/`,
  register it after `TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID`, set
  `requiredOnStartup=true`, `executionPolicy="STARTUP_ONLY"`, and declare that
  prerequisite. Do not extend the runner, record repository, GraphQL recovery
  enum, or Settings retry behavior.
- **Capability-safe release:** ship exact definition/run codecs and stores,
  source-aware diagnostics, repository-owned definition conversions, and the
  registered migration together. `runPending()` executes before strict current
  catalogs/providers. After its attempt, current catalogs admit only independently
  validated targets; no legacy service path is enabled even when the migration
  reports `FAILED`.
- **Three independent inventories:** enumerate (1) repository/data-root
  server-owned definitions with explicit mutation owner, (2) registered external
  roots as read-only admission candidates, and (3) every runtime package below
  the server memory root regardless of definition origin. Sort identifiers for
  deterministic processing and do not use definition counts to select runtime.
- **Family-root preparation:** resolve each configured source/target family as
  siblings below its one owning data or memory root. After inventory validation,
  create a missing empty target-family parent with the normal directory helper;
  never create a per-item target directory. The one item rename is therefore
  within the same owning root and uses ordinary filesystem atomic-rename
  semantics rather than a cross-device fallback.
- **Preflight:** before any write to an affected item, decode its complete
  supported source, prove zero/one configured Team depth, direct coordinators,
  stable IDs/addresses/member order, ref/source mapping, target family/path
  absence, and target payload validity. Unexpected depth, unresolved semantic
  mapping, unsupported entry, or pre-existing source+target family conflict is
  recorded `FAILED` and left intact; migration continues to other independently
  owned items.
- **Repository-owned definitions:** the implementation/build transform rewrites
  registered source files and CI validates them using only target codecs. This is
  source evolution, not a runtime mutation or fabricated migration ledger item.
- **Writable flat Team definition:** transform the complete legacy candidate in
  memory, prove all member kinds are Agent, remove
  only proven redundant member `refType:"agent"`, emit no authored version,
  validate the exact current Team definition, atomically
  replace `team-config.json` using the established current-file writer, reread,
  and record migrated/current/failed disposition. The directory and `team.md`
  stay in place.
- **Writable organization-like definition:** validate the whole fixed-depth
  package before writes; atomically write/validate each direct owned flat Team's
  exact current unversioned config, then prospective `org.md` and unversioned
  Org config with org_local alongside the
  legacy root files. Reread the complete prospective target through exact target
  providers, then atomically rename the package directory from the server-data
  Team root to the server-data Org root. Reread at the canonical target before
  removing legacy `team.md`/`team-config.json`. Referenced shared/external Teams
  are not copied or edited. An external dependency may make the converted Org
  admission-unavailable without making the format migration fail.
- **Native flat Team runtime:** strict-validate the existing Team Run V2 file,
  direct Agent membership/coordinator, ID/path correlation, and family conflict
  absence; record current/failed. A successful no-op performs zero execution-tree/path mutations. Without an
  actually inventoried structured attachment reference into a converted Org root,
  it also performs zero record/timestamp/temp-file writes. DS-043 permits only
  that proven locator-value preservation exception, never a flat-tree rewrite.
- **Organization-like runtime:** read and validate the complete Team Run V2 state package; transform and
  target-validate the Org Run V1 tree plus `agent_org_task_delegation_records.json`
  and `agent_org_communication_messages.json` in memory; atomically write/reread
  those three prospective Org authorities beside the old Team authorities; then
  atomically rename the entire package directory from `agent_teams/<id>` to
  `agent_orgs/<id>`. Reread/correlate the complete canonical Org package before
  removing the old Team tree and Team task/message sidecars. Task/message record meaning and all relative Agent memory/content directories
  remain unchanged. Their strict root envelopes change; DS-043 additionally
  transforms proven structured attachment locator values in sidecars/raw traces
  to preserve the same exact file after the family move. The transform preserves the already-
  compiled handoff/rule order and never consults a live definition.
- **Ordinary relaunch/idempotence:** old-only source repeats transformation;
  source with a complete valid prospective Org tree/sidecar set revalidates and performs the same
  rename; an interrupted definition whose direct owned Teams are already exact
  current unversioned configs accepts those target children as completed transform output rather than
  applying the retired decoder to them again; valid target-only verifies the complete correlated current package and removes any known retired Team authority file before recording success; a
  pre-existing source+target family conflict fails without choosing a side.
  These are deterministic observations of one interrupted attempt, not a custom
  persisted state machine. No cleanup residue is treated as a warning in this
  migration.
- **External admission:** perform no external write, backup, chmod, rename, SCM,
  or release operation. Exact target codecs emit available/unavailable results.
  A rejected Team propagates `DEFINITION_DEPENDENCY_UNAVAILABLE` to dependent
  Orgs. Existing runtime/history selection remains based on strict snapshots,
  not live definition availability.
- **Derived current catalogs:** after `runPending()`, rebuild Team and Org package
  indexes through `RootRunPackageReadinessIndex`: classify family paths by name,
  reject duplicate IDs across families, call only the selected strict current
  store, and require the current package manifest to contain no retired root
  authority file. A root with no current target, cleanup residue, or a
  source+target conflict is capability-scoped unavailable and carries the
  migration log/restart guidance. Mixed history merges only independently valid
  tagged rows. Definition admission applies the analogous exact target-package
  manifest check before computing compatible and unavailable definitions. No
  readiness check decodes old content and no failure re-enables a legacy reader.
- **Retention:** keep the registered migration and its isolated legacy codecs for
  supported direct and skip-version upgrades. Native Team Run V2, Org Run V1,
  and both target definition codecs remain current. Removal requires a separate
  minimum-supported-version decision, not automatic cleanup after one success.

| Migration ID | Item Disposition | Current-State Test | Terminal Result Contribution | Product Disposition |
| --- | --- | --- | --- | --- |
| `20260901_agent_org_flat_team_families_v1` | `MIGRATED_DEFINITION` / `MIGRATED_ORG_RUN` | Exact canonical target definition or complete Org tree/task/message package rereads and validates; source authority is not discoverable | success item | Available subject/root. |
| `20260901_agent_org_flat_team_families_v1` | `SKIPPED_ALREADY_CURRENT` | Exact target definition/package already valid | success skip | Available subject/root. |
| `20260901_agent_org_flat_team_families_v1` | `SKIPPED_NATIVE_FLAT_TEAM_RUN` | Exact native flat Team Run V2 remains at the same path with zero writes | success skip | Available Team root. |
| admission, not a migration item | `UNAVAILABLE_EXTERNAL_DEFINITION` | Read-only package fails exact target admission or depends on unavailable Team | none | Omit only from new-work catalog/launch/authoring; actionable owner diagnostic. |
| `20260901_agent_org_flat_team_families_v1` | `FAILED_UNSUPPORTED_SOURCE` | Depth/shape/ref/identity cannot map deterministically before mutation | `FAILED` | Preserve source; affected definition/root unavailable; restart after corrected release/data. |
| `20260901_agent_org_flat_team_families_v1` | `FAILED_CURRENT_VALIDATION` | Exact current target absent/invalid after attempt | `FAILED` | Do not admit affected capability; preserve observable evidence; restart retries. |
| `20260901_agent_org_flat_team_families_v1` | `FAILED_FAMILY_CONFLICT` | Both source and target family paths are discoverable or target collision exists | `FAILED` | Admit neither identity; do not choose/delete/merge automatically. |
| `20260905_agent_org_history_first_message_summary_v1` | `BACKFILLED_AGENT_ORG_HISTORY_SUMMARY` | Empty current Org row has one strictly earliest provenance-qualified configured-member trace, a complete contradiction-free exclusion prefix, and strict reread matches the shared compacted value | success item | Existing Org row displays the stable derived summary. |
| `20260905_agent_org_history_first_message_summary_v1` | `SKIPPED_EXISTING_AGENT_ORG_HISTORY_SUMMARY` | Current Org row already has non-empty summary before any trace read | success skip | Preserve exact current summary; never overwrite/backfill. |
| `20260905_agent_org_history_first_message_summary_v1` | `SKIPPED_NO_UNIQUE_QUALIFYING_TRACE` | Empty current Org row has no candidate, a nonqualifying/equal earliest fact, or invalid/unreadable/ambiguous required candidate or exclusion evidence while required current structure remains valid | `SUCCEEDED_WITH_WARNINGS` when present | Preserve empty value and approved `New - <name>` fallback; current runtime remains available. |
| `20260905_agent_org_history_first_message_summary_v1` | `FAILED_CURRENT_VALIDATION` | Required strict current package/index structure cannot be read or validated | `FAILED` | Existing runner records `RESTART_TO_RETRY`; do not relabel invalid current structure as nullable metadata. |
| `20260905_agent_org_history_first_message_summary_v1` | `FAILED_AGENT_ORG_HISTORY_SUMMARY_WRITE` | Selected value cannot be atomically written and strictly reread through the shared current writer | `FAILED` | Existing runner records `RESTART_TO_RETRY`; do not create alternate summary authority or trace-on-read fallback. |

For the family migration, any failed item makes the migration `FAILED`; with no
failed item it is `SUCCEEDED`, and it has no warning terminal state. For the
summary migration, any failed item takes precedence and makes the migration
`FAILED`; otherwise any warning skip makes it `SUCCEEDED_WITH_WARNINGS`, and an
all-success/all-ordinary-skip attempt is `SUCCEEDED`.

Minimum migration tests use disposable roots and the real filesystem/current
providers: exact target codec negatives; server-owned flat definition atomic
conversion; one fixed-depth Org definition/package conversion; all current
runtime record/task/handoff mappings; native flat Team zero-write hashes/stats;
external zero-write/dependency unavailability; unsupported depth pre-mutation
preservation; target collision; target-only skip; one representative interrupted
attempt followed by ordinary startup retry and completed retired-file cleanup;
strict catalog exclusion of a failed item while compatible startup/history
continues; runner summary/log and `STARTUP_ONLY` `RESTART_TO_RETRY`/disabled
manual retry. Do not add per-fsync/per-syscall crash matrices, custom journal
fixtures, live-user-data tests, or infrastructure-corruption scenarios.

## Supported Scenario And Reachability Classification

| Scenario / Premise | Classification | Witness / Governing Basis | Design Consequence |
| --- | --- | --- | --- |
| Author AgentOrg with direct Agents/Teams, configure once, and launch the full scope unfocused | Supported Normal Scenario | SCN-001, SCN-002, SCN-009; AgentOrg web/GraphQL/package surfaces -> configuration resolver -> full activation | Provide separate AgentOrg definition/launch boundaries, sparse placement overrides, nullable focus, and no coordinator/fallback. |
| Launch/test flat Team, later reference same Team in Org | Supported Normal Scenario | SCN-006; Team catalog/launch history then Org member ref | Org stores only definition identity; no copy or mutation of Team source/history. |
| After Org launch, user explicitly selects a direct Agent, Team, or Team Agent | Supported Normal Scenario | REQ-004, AC-002, VIS-016-VIS-018 | Web focus is nullable and exact; Team row maps to stored coordinator; no first/name fallback or durable focus field. |
| Author/reorder/cancel/save Org-owned or Team-local From/To/When handoffs | Supported Normal Scenario | SCN-008; AC-015-AC-018; VIS-008, VIS-019 | One subject-owned definition draft validates all members/handoffs and commits atomically with revision protection. |
| Org Agent delegates to direct mounted Team | Supported Normal Scenario | AC-010, ORG-CASE-028; `/team` resolves to coordinator | Fresh task Team is stored at exact delegator host and has no configured membership/address effect. |
| Standalone Team Agent delegates to one of its mounted Agents | Supported Normal Scenario | REQ-015 preserved task behavior and current tool path | Task remains owned by standalone Team root. |
| Task assignee submits normally; its tool result returns; the different delegator accepts before the assignee's canonical provider turn completes; another supported task command arrives | Supported Concurrent Lifecycle Scenario | BEH-009 preserved submission/review behavior; separate MCP-tool-result/turn-terminal source events; TEAM-004 assignee/delegator trace through valid accept | The settlement attempt atomically checks quiescence without waiting. Active work returns `null`, releases the FIFO, and retries on the established idle event; the unrelated command can run. Later invalid self-review events are excluded and remain rejected. |
| Team or Org receives application SIGTERM while an active task Agent waits on a legitimate approval-gated tool | Supported Operational Scenario | Existing root shutdown contract; Product Auto approve tools control; server SIGTERM handler; accepted Agent approval/interrupt runtime test | Close/freeze and interrupt the full owned scope before draining task mutations or settlements; then persist interruptions, settle deepest-first, finish local resources, and complete root/process shutdown. Do not add a timeout or force-kill product path. |
| Normal delegated task commits and releases its initial input; application SIGTERM arrives after AgentRun admission/provider-start registration but before canonical `TURN_STARTED` | Supported Concurrent Operational Scenario | `BEH-009` / `REQ-015` / `AC-010`; task `releaseWork()` source; AgentRun claim/start source; server SIGTERM; `ARCH-REV-007 / AR-PREM-006` | The stable frozen scope invokes the AgentRun root-shutdown fence. A pre-forward start loses to cancellation, or a provider-started input remains tracked and is interrupted on canonical start. The phase cannot report success while a provider may still start afterward. |
| Terminal task settlement `settledAt` persistence fails before rename, or local cleanup fails after durability | Supported Explicit Failure Scenario | Existing prepared-settlement cancellation and post-durability root fail-stop contracts | Existing prepared termination cancellation leaves live/tree state unchanged before durability. After durable commit, cleanup failure fail-stops the owning root; it never reopens or resurrects the terminal task. |
| Terminal task provider wait caused only by verifier self-review deliberately held for approval | Technically Possible but Unsupported/Contrived | ARCH-REV-006 / AR-FIND-003; exact API-FIND-008 correlation | Retain as technical coupling evidence and negative coverage only. It cannot require coordinator/token/replay/timeout machinery or make self-review supported. |
| Standalone Team Agent delegates to an unrelated/unmounted Team by logical address | Technically Possible only if a new selector/global lookup were invented; unsupported/contrived | REQ-007, ORG-CASE-025, and current resolver prohibit cross-root discovery; no independent approved entry surface exists | Do not add definition-ID or global Team discovery to `delegate_task`. This premise cannot justify new API/security machinery. |
| Historical recursive task Team has another task Team below it | Supported Explicit Edge Scenario | PRE-005 and reused task record contract | Preserve recursive task lineage and its restore/index traversal even though configured Team depth is fixed. |
| Deep configured Team appears during migration | Supported Explicit Operational Failure | REQ-013, PRE-002, QR-003 | Fail that independently owned item before mutation, preserve it, report the invariant, keep it unavailable to strict current catalogs, and continue compatible capabilities; do not design deep conversion. |
| Process terminates during a migration attempt and the application later starts normally | Supported Operational Interruption Category | Canonical production migration convention plus existing stale-`RUNNING`/`runPending()` behavior | Atomic file replacement/direct rename leave a deterministic old, prospective-target, or target observation; the same startup-only migration revalidates and completes/idempotently skips. Cover this category once, not per shutdown label or syscall boundary. |
| Arbitrary filesystem corruption, hostile tampering, or an adversarial concurrent migration writer | Unsupported infrastructure/security premise | No approved product/security/operations contract makes it a supported trigger; canonical convention reachability gate | Add no backup format, repair command, alternate reader, custom journal, or failure matrix. Fail closed on any observed unsupported payload/conflict. |
| Full Org activation contains direct Agents and mounted Team Agents without a synthetic Team root | Supported Normal Scenario | SCN-002/009; REQ-004/024; AC-002/019; IDI-001 production path | Build one Org aggregate, prepare every configured Agent through the root-neutral handle, materialize each Team locally, persist the complete Org package, and register only the complete scope. |
| Direct Org Agent delegates a task while the exact host is the Org root | Supported Normal Scenario | REQ-015; AC-010; ORG-CASE-028 plus direct Org Agent membership | `AgentOrgRootTaskHost` prepares the task Agent/Team; Org task adapter mutates rootOrg.taskExecutions and Org sidecar. No fake Team host. |
| External provider binding is learned while an Org configured Agent is prepared | Supported Normal/Provider Scenario | Existing provider lifecycle and REQ-014 persisted binding reuse | Gather binding before publication, durably mutate Org V1 through Org coordinator, then publish; indeterminate durability fail-stops the whole Org. |
| Restore a stopped/migrated Org with direct/mounted Agent memory and historical task/message records | Supported Normal Scenario | SCN-002/004/010; REQ-012/014/016; AC-008/009/011/020 | Strict Org loader correlates tree plus Org sidecars, applies shared task reopen policy through Org adapter, reconstructs exact physical scopes, prepares all Agents, and registers only after success. |
| Persistence finalization becomes indeterminate after an Org tree/task/message rename | Supported Explicit Operational Edge | Existing Team fail-stop contract reused under Org owner; QR-004 durability | Close only that Org root, stop its embedded executions as one aggregate, leave strict package for restore; do not keep a mounted Team independently active. |
| General-process shutdown with active Org, standalone Team, standalone Agents, and task provider turns | Supported Operational Scenario | Existing supervisor lifecycle, server SIGTERM handler, approved Auto approve tools control, and accepted approval interruption semantics | Close process/root admission; within each root establish a stable frozen scope and complete every AgentRun input/provider-start/interrupt fence before task command/settlement drain; stop Org roots, then Team roots, then remaining AgentRuns; aggregate errors and release construction dependencies in reverse order. |
| Preserve native flat Team Run V2 and add strict AgentOrg Run V1 over reused records | Supported Governing Contract Scenario | SCN-010; REQ-014, REQ-025; AORG-CONTRACT-001@RER-018 | Implement separate subject-owned stores/paths and a discriminated mixed projection; this is the approved durable boundary, not an optional architecture choice. |
| Cut over with valid target definitions, incompatible external definitions, and a dependent Org | Supported Operational Scenario | SCN-011; REQ-026, REQ-027; AC-021, AC-022 | Admit only exact targets, exclude incompatible external/dependent definitions from new work, expose diagnostics, preserve compatible readiness/runtime migration/history, and prove external zero writes. |
| Scan both runtime families and infer root kind from whichever payload parser accepts | Technically Possible but Explicitly Rejected | SCN-010; REQ-025, AC-020 | Select family from authoritative tagged location and fail on family/payload/projection mismatch; no guessing or auto-retyping. |
| Retry the retired definition parser after target admission fails | Technically Possible but Explicitly Rejected | SCN-011; REQ-026, REQ-027; AC-021 | Return one unavailable diagnostic; do not normalize `refType`, construct a legacy definition, mutate the source, or activate it. |
| User sends a real prompt to a focused direct Org Agent and receives a normal streamed answer | Supported Normal Scenario | REQ-004/016/019/025; SCN-007/009; VIS-017; API-E2E-005 real full-stack witness | Strictly project the exact Org member event into AgentContext and render through the accepted Agent conversation/event-monitor/composer surface; raw envelopes and JSON fallback are forbidden. |
| User focuses a direct Team or Team Agent in an active Org and communicates through the accepted Team member workspace | Supported Normal Scenario | REQ-003/004/011/018; SCN-006/009; VIS-018 | Adapt the exact mounted Team scope to `TeamWorkspaceContextView`; Team selection maps to coordinator; reuse Team surface without standalone Team registration or independent termination. |
| Focused Org Agent is running and the user presses the accepted red composer stop control or responds to a tool approval | Supported Normal Scenario | Existing accepted Agent/Team interaction surface incorporated by RV-012; real Agent provider lifecycle | Org interaction port sends exact interrupt/approve/deny commands with acknowledgements to AgentOrgRun; no custom composer and no direct socket call from components. |
| Operator terminates an active AgentOrg | Supported Normal Lifecycle Scenario | REQ-016 launch/history/stop lifecycle; Product mock boundary names actual stop; existing Team root-row interaction | Stop is a root-run action in Org history with pending/error parity; it is not displayed as a focused member header action and cannot stop a mounted Team independently. |
| Org live stream contains an unknown, malformed, miscorrelated, or sequence-gapped event | Supported Explicit Contract Failure | REQ-025 fail-closed projection plus established Team stream recovery contract | Reject the candidate message, enter `reopen_required`, and checkpoint-hydrate a replacement context; never stringify or display the protocol envelope. |
| User inspects a mounted Team while configured or task-scoped Agent statuses change, collapses it, and later inspects the stopped run | Supported Normal Scenario | SCN-012; REQ-028; AC-023; user original/current screenshots and approved VIS-STATUS-001-003 | Resolve statuses from the exact current authority, traverse only that configured Team branch independently of expansion, fold the five states, keep the accessible dot visible collapsed, and normalize historical live-only/missing values without adding Team lifecycle. |
| User opens a new AgentOrg launch draft, expands Member overrides, opens only one mounted Team, edits exact Team/Agent placement values, collapses/reopens, and launches | Supported Normal Scenario | SCN-013; REQ-029; AC-024; CR-SCN-037; explicitly approved VIS-OVR-001-006 | Reuse the established AgentTeam disclosure, Team scope, and Agent row presentation under an Org-owned projector/draft. Preserve exact local sparse patches, independent disclosure state, coordinator-on-Agent identity, fail-closed projection, and the unchanged Org launch command/API. |
| User changes an exact Agent from root Codex/GPT to AutoByteus/DeepSeek Flash without supplying model config, then launches | Supported Normal Scenario | SCN-014; REQ-030; AC-025; Electron failure plus successful Team control | Canonical Org patch owns `llmConfig:null`; preview, variables, server effective plan, and stored snapshot agree. A missing clear is an invariant failure, not inheritance. |
| User enters AgentOrg config from a populated catalog, launches, focuses a member, switches away/back, and opens stopped history | Supported Normal Scenario | SCN-015; REQ-031; AC-026 | Keep one left Workspace/history panel and its one tree-state controller mounted; the read owner preserves stable-keyed rows/grouping/order while the presentation owner preserves expansion/reveal/highlight/scroll; add Orgs below Teams; only center target changes. |
| User opens a fresh AgentOrg while Temp Workspace is available, then inspects a mounted Team's inherited workspace and optionally selects an exact Team override | Supported Normal Scenario | SCN-016; REQ-032; AC-027 | Root applies the established available-default policy once; mounted placements inherit root; exact Team override wins; unavailable defaults remain unset/actionable; focus remains null. |
| First external message to a direct configured Org Agent is accepted | Supported Normal Scenario | SCN-017; REQ-033; AC-028 | Exact configured-Agent acceptance is followed by Team-identical normalization and serialized first-write history commit; accepted ACK then requests an authoritative Org-family refresh. |
| First external message to an Agent inside a directly mounted Team is accepted | Supported Normal Scenario | SCN-017; REQ-033; AC-028 | The unchanged command accepts the target and returns strict indexed kind `configured`; the same root history row wins regardless of direct-versus-mounted placement. No Team history/root is written. |
| Task/system/inter-Agent input, approval/interrupt command, task-scoped target, rejected/failed send, or empty compacted content occurs first | Supported Exclusion Scenario | REQ-033; AC-028 | The task-scoped command may still execute, but the path never calls `recordRunSummary`; a later first qualifying accepted external configured-member message may still set the Org summary. |
| Two qualifying configured-Agent sends complete acceptance concurrently | Supported Concurrency Scenario | QR-011; REQ-033; AC-028 | Handler continuations enqueue immediately in accepted-completion order; one serialized first-non-empty catalog mutation wins, and all later attempts are no-ops across restart/rebuild. |
| Existing empty-summary Org has one uniquely earliest provenance-qualified configured-member trace | Supported Startup Migration Scenario | SCN-017; REQ-033; AC-028; DEC-020 | Registered migration uses strict Org topology, exact complete trace corpora, and root communication/task records as exclusion-only evidence; it uses the catalog-shared summary writer directly before runtime composition, validates by strict reread, and is idempotent. |
| Existing empty-summary Org has no candidate, a nonqualifying/equal earliest fact, or invalid/unreadable/ambiguous required evidence | Supported Conservative Recovery Scenario | SCN-017; REQ-033; AC-028; DEC-020 | Migration records a bounded nonfatal skip/warning and preserves empty summary plus `New - <name>`; it never tie-breaks, promotes a later trace, or infers origin from task/directory/prose order. |
| Configured Org Agent sends to another configured Agent and the user selects sender or receiver, live or after reconnect/restore | Supported Normal Scenario | SCN-018; REQ-034; AC-029; DEC-021; API-FIND-019 Team control and explicit user approval | After one durable record/input commit, emit exactly one receiver member-input presentation and project the one sidecar row from each applicable selected-Agent perspective across the complete Org. Reuse the established Messages surface with truthful Org scope. |
| Same accepted Org message crosses direct/mounted Team placement boundaries or two Teams contain equal address basenames | Supported Normal Identity Scenario | SCN-018; REQ-034; AC-029; QR-012 | Resolve sender/receiver by full exact configured Org `agentRunId -> address`; containing Team and basename are presentation attributes only and cannot filter or identify the counterpart. |
| Same-root exact-ID Org communication has at least one task-scoped endpoint | Supported Normal Scenario | RER-028; REQ-034; AC-029; SCN-018 | Preserve existing delivery/sidecar/root event and add the same exact receiver input/participant Messages consequences as configured pairs; no kind gate. |
| Direct Org A delegates to flat T, selects A and fresh task participants, submits/reviews/settles and inspects history | Supported Normal Scenario | RER-028; SCN-019; REQ-035; AC-030 | Fresh runtime/host identity; exact relevance and shared Tasks without Team parent; settlement hides active execution, retains history. |
| Formal task submission commits but separate notification is rejected | Supported Explicit Edge Scenario | SCN-020; REQ-036; AC-031 | Saved task record and existing warning remain; no fabricated conversation input or ordinary Messages row. |
| Rejected, failed, self/out-of-root, unsupported logical task-recipient, reservation-conflict, or pre-durability-failed Org send | Supported Exclusion Scenario | REQ-034; AC-029 | Existing admission/commit rejects before presentation. Supported exact-ID task messages are not exclusions. |


## Data-Flow Spine Inventory

AD-REV-026 adds CF-07–10 in DS-044–046: accepted original input through both
recorders, durable association, both projection surfaces and actual file Open.

AD-REV-025 adds CF-01–06 in DS-041–043: preparation, finalization/send, retained read, captured return, local per-file movement and initial locator transformation.

AD-REV-021: DS-034a/b/c/r above enumerate message read/identity, exact task navigation, history copy and unchanged authoritative updates.


AD-REV-020 adds DS-031a author/save, DS-031b import/admission, DS-031c
roundtrip return and DS-032 startup transition. Their complete node/owner chains
are in DS-031; no local decoder is presented as the whole user path.

| Spine ID | Scope | Behavior(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-000 | Primary End-to-End | BEH-001, BEH-006, BEH-007, BEH-010 | Registered definition source inventory | Available target definitions plus actionable unavailable/dependency diagnostics | `DefinitionAdmissionService` | Enforces exact target formats and external ownership without a dual parser or global outage. |
| DS-001 | Primary End-to-End | BEH-001, BEH-006 | Definition author/import | Revisioned atomically persisted/cataloged Org or flat Team | Subject DefinitionService | Exclusive configured model and pre-write validation. |
| DS-002 | Primary End-to-End | BEH-002, BEH-004, BEH-006 | Standalone Team launch | Native Team scope active, coordinator ready/focused | `AgentTeamRunService` / `RootTeamRun` | Preserves independent Team behavior and V2 history. |
| DS-003 | Primary End-to-End | BEH-002, BEH-004, BEH-006 | Valid Org configuration | Complete Org scope active, focus absent | `AgentOrgRunService` / `AgentOrgRun` | Separates activation from communication target. |
| DS-004 | Primary End-to-End | BEH-003, BEH-004 | Mounted Agent handoff/message | Exact same-root AgentRun accepts or request fails closed | Subject root collaboration boundary | Preserves isolation and Team coordinator ingress. |
| DS-005 | Primary End-to-End | BEH-009 | Mounted Agent task command | Exact host task mutation is durably committed; a settlement overlapping active provider work defers without holding the FIFO | Subject root task boundary | Separates task lineage from configured topology and keeps supported task commands live. |
| DS-006T | Primary End-to-End | BEH-005, BEH-008 | Team root mutation/restore | Exact Team V2 package committed/restored | Team run persistence/history owner | Proves Team JSON/path remains native. |
| DS-006O | Primary End-to-End | BEH-005, BEH-008 | Org root mutation/restore | Exact Org V1 package committed/restored | Org run persistence/history owner | Gives Org truthful coordinator-free authority. |
| DS-007 | Primary End-to-End | BEH-007, BEH-008, BEH-010 | Required startup migration attempt | Independently valid current items cataloged; failed items unavailable with restart guidance | App-data migration subsystem + current catalog readiness | Forward-only cutover without a blanket outage or legacy fallback. |
| DS-008 | Return/Event | BEH-005, BEH-009 | Subject-root event/history query | Tagged mixed projection reaches web/history consumer | Subject event publisher + mixed projection facade | Mixed UI cannot infer family. |
| DS-009 | Bounded Local | BEH-003 | Fixed-depth definition graph | Stable root-owned-first compiled handoff snapshot | Collaboration handoff compiler | Preserves current effective order, one rebase, owner separation, and `rules[]` order. |
| DS-010 | Bounded Local | BEH-007 | One Org-like migration item | Valid Org file plus atomic package rename, or preserved failed source | Registered migration definition | Deterministic one-family cutover with ordinary relaunch idempotence. |
| DS-011 | Primary End-to-End | BEH-001, BEH-003, BEH-006 | Definition/handoff draft save | Complete candidate committed once or unchanged with precise errors | Subject DefinitionService / package transaction | Atomic owner-separated authoring. |
| DS-012 | Bounded Local | BEH-002, BEH-006 | Root choices + sparse overrides | Complete immutable settings for all placements | `CollaborationLaunchConfigurationResolver` | Owns fixed-depth precedence. |
| DS-013 | Primary End-to-End | BEH-004, BEH-006 | Exact post-launch row selection/send action | Exact Agent/coordinator focus or blocked no-focus state | AgentOrgExecutionContext / focus controller | Focus stays exact, local, non-durable, and bound to accepted presentation. |
| DS-014 | Bounded Local / Return | BEH-002, BEH-003, BEH-005, BEH-009 | Subject manager has a validated Team/Org package plan | Complete configured Agent/flat-Team scope prepared, durably bound, published, or wholly aborted/fail-stopped | Subject root aggregate over root-neutral execution capabilities | Resolves IDI-001 without a synthetic Team/public generic root. |
| DS-015 | Primary Operational | BEH-002, BEH-005, BEH-008, BEH-009 | General-process construction/restore/shutdown | Subject managers/services registered in order or every rooted Agent input/provider start is fenced, interrupted, settled and released safely | GeneralProcessRunSupervisor + subject roots + AgentRun | Makes stable scope freeze, per-Agent admission/provider-start fencing, interrupt-before-drain, and reverse cleanup explicit. |
| DS-016 | Return/Event | BEH-004, BEH-005, BEH-006 | Raw AgentRun/member input/status event inside AgentOrg | Typed Agent presentation mutates the exact AgentContext or stream enters recovery | Subject callback + `CollaborationAgentPresentationAdapter` + `AgentOrgStreamingService` | Makes the accepted conversation surface consume the same strict presentation semantics as Team. |
| DS-017 | Primary End-to-End | BEH-004, BEH-006 | User focuses an Org member and sends/interacts | Accepted Agent/Team workspace renders and exact Org Agent command is acknowledged | `AgentOrgExecutionContext` + active-target/interaction facade | Reuses production surfaces without a custom dashboard or standalone mounted root. |
| DS-018 | Primary Read/Hydration | BEH-005, BEH-006 | Open/restore/recover active AgentOrg workspace | Complete strict Org context with Agent conversations/statuses and nullable focus is atomically published | AgentOrg member projection/hydration service | Prevents empty/raw UI after restore and preserves trace browsing. |
| DS-019 | Primary Lifecycle/UI | BEH-005, BEH-006 | Operator activates stop on AgentOrg history root row | Whole Org terminates, UI marks root inactive, focus/contexts clean up | AgentOrg run store/service + root history action | Keeps root lifecycle control out of member presentation and forbids mounted-Team stop. |
| DS-020 | Primary Read/Projection | BEH-006, BEH-011 | AgentOrg hierarchy renders an active or historical direct configured Team row | Accessible five-state Team aggregate plus unchanged exact Agent signals | AgentOrg Team-branch presentation projector | Makes exact branch membership, live/history authority, collapsed visibility and lifecycle non-effects explicit. |
| DS-021 | Return/Event | BEH-011 | Strict Agent status snapshot/event mutates one exact AgentContext | Mounted Team aggregate reactively recomputes on the same Team row | AgentOrgExecutionContext + shared Team status fold | Reuses existing Agent truth instead of adding polling or Team status transport. |
| DS-022 | Bounded Local / Operational | BEH-009 | A task record becomes terminal while its execution may still own a provider turn | Settlement performs a non-waiting exact quiescence check; active work defers and retries on idle, while quiescent work uses the existing prepared durable settlement | `RootTaskLifecycleEngine` + subject adapter + AgentRun/local execution | Prevents a supported accept/turn-completion overlap from occupying the FIFO without adding a second lifecycle owner. |
| DS-023 | Primary End-to-End / UI Command | BEH-002, BEH-006, BEH-012 | User opens an admitted AgentOrg launch draft and selectively edits exact placement overrides | Existing AgentOrg launch command carries validated root, Team and Agent sparse patches after accepted progressive disclosure | `agentOrgRunConfigStore` + AgentOrg form projector/command adapter | Reuses the mature Team presentation without merging Team/Org state, payload, lifecycle, or configuration authority. |
| DS-024 | Primary End-to-End / Contract Equality | BEH-002, BEH-013 | User edits runtime/model/model-config at an exact Org placement | Browser preview, GraphQL variables, server effective plan and stored snapshot agree | Org canonical patch mapper + `CollaborationLaunchConfigurationResolver` | Closes omission-versus-null drift without adding API/server inference. |
| DS-025 | Primary Read/Navigation | BEH-005, BEH-006, BEH-014 | App starts or route changes across catalog/config/live/history | One stable Workspaces tree retains stable-keyed rows plus panel-owned expansion/reveal/highlight/scroll and shows Orgs directly below Teams | Mixed workspace-history read owner + always-mounted panel/tree-state owner | Removes competing route-owned panels while keeping read data, presentation continuity, subject identity, runtime, and lifecycle distinct. |
| DS-026 | Bounded Local / UI Command | BEH-002, BEH-015 | Fresh Org draft loads an available workspace catalog | Root selects actual Temp Workspace default; placements inherit or apply exact Team override | Shared workspace catalog + Org root config store | Reuses established Team default semantics without hard-coded paths or focus. |
| DS-027 | Primary End-to-End / Return / Migration | BEH-016 | First qualifying exact configured-Agent send is accepted, or startup examines an empty current Org history row | One stable compacted Org summary is durably committed and authoritatively projected, or conservative evidence leaves the valid fallback unchanged | AgentOrg configured-command boundary + AgentOrg history catalog + shared summary writer; mixed web history read owner; registered migration for legacy inference | Aligns Org history with Team semantics while isolating task exclusions, first-write concurrency, live invalidation, and historical inference. |
| DS-028 | Primary / Return | BEH-017 | Supported ordinary same-root message is accepted | One receiver input plus participant Messages | Org root + context/facet | All configured/task endpoints, exact IDs and durable ordering |
| DS-029 | Primary Read / Return | BEH-018 | Select participant or receive task event; inspect history | Relevant Tasks and exact live/readonly workspace | Org context/index + service/manager | No fake Team, source-binding substitution or activation-on-read |
| DS-030 | Return / Accepted Input | BEH-018 | Task transition commits and sends system notification | Saved Tasks record and separate accepted input/warning truth | Existing task engine + handle/adapter | No inferred delivery, duplicate input or ordinary Messages fabrication |
| DS-035 | Primary Read | BEH-005/014/018 | User browses inactive Org/member history | Retained exact conversation, no activation | Org context store / existing server inspection | Separates selection from resume. |
| DS-036 | Primary / Bounded Local | BEH-002/005/014 | User sends to an inactive configured Agent | Restore-ready exact submission once | Org context store / existing root commands | Preserves draft and identity without fake live access. |
| DS-037 | Primary / Return | BEH-005/014 | User stops an Org root | Same conversation/selection, historical Offline | Root lifecycle / Org context store | Removes terminate-to-launch and destructive presentation close. |
| DS-038 | Primary / Return | BEH-001/005/007/010 | Author/save/import Org local references | Current org_local config and exact reference resolution or contextual diagnostic | Definition service/provider/admission; API mapper | Authored spelling changes, internal ownership/IDs do not. |
| DS-039 | Primary Operational / Local | BEH-010; SCN-021–024 | First release startup or ordinary retry | Existing migrations publish final definitions directly and preserve owned meaning | Existing migration runner/family/authoring entries | No new migration or deployed-intermediate premise. |
| DS-040 | Return / Status | BEH-010 | Existing migration finishes attempt | Truthful status/log, narrow availability and restart guidance | Existing runner/admission | Keep migration-specific warning policies distinct. |

## Primary Execution Spine(s)

- **DS-000 definition admission:** `registered source roots -> DefinitionSourceRegistry ownership classification -> exact current unversioned Team/Org codec -> dependency availability closure -> available subject catalogs + unavailable diagnostics -> new-work gate`; history bypasses this spine and reads durable snapshots.
- **DS-001 Org definition:** `AgentOrg form/import -> AgentOrg GraphQL -> AgentOrgDefinitionService -> fixed-depth resolver + endpoint/handoff validator -> FileAgentOrgDefinitionProvider definition-package transaction -> Org catalog`.
- **DS-001 Team definition:** `AgentTeam form/import -> AgentTeam GraphQL -> AgentTeamDefinitionService -> Agent-only/coordinator/local-handoff validator -> FileAgentTeamDefinitionProvider definition-package transaction -> Team catalog`.
- **DS-002 standalone Team launch:** `Team Run action -> createAgentTeamRun -> AgentTeamRunService -> TeamLaunchConfigurationResolver -> FlatTeamTopologyPlanner -> AgentTeamRunManager -> RootTeamRun -> coordinator AgentRun -> Team V2 store/history`.
- **DS-003 Org launch:** `Org Run action -> Org configuration draft -> createAgentOrgRun(rootConfiguration, sparse overrides) -> AgentOrgRunService -> CollaborationLaunchConfigurationResolver -> AgentOrgTopologyPlanner -> AgentOrgRunManager/AgentOrgRun -> all direct Agent/Team executions -> Org V1 store; focus=null`.
- **DS-004 handoff/message:** `Mounted Agent tool -> MemberCollaborationContext -> owning RootTeamRun or AgentOrgRun -> subject execution index + recipient resolver -> exact AgentRun or Team coordinator AgentRun`.
- **DS-005 task lifecycle command:** `Mounted Agent tool -> bound root task capability -> RootTaskLifecycleEngine mutation FIFO -> exact subject adapter/host -> task record + tree/sidecar durable mutation -> immediate state/event publication -> FIFO release`; terminal settlement follows DS-022 and never waits for an active provider turn in this lane.
- **DS-006T Team persistence:** `RootTeamRun mutation/restore -> TeamRunPersistenceCoordinator -> strict TeamRunExecutionTreeStore V2 -> Team history/index -> AgentTeamRunManager`.
- **DS-006O Org persistence:** `AgentOrgRun mutation/restore -> AgentOrgRunPersistenceCoordinator -> strict AgentOrgRunExecutionTreeStore V1 -> Org history/index -> AgentOrgRunManager`.
- **DS-007 migration:** `Server startup -> AppDataMigrationRunner.runPending -> registered source-classified definition/runtime migration -> atomic current file/package transform + validation -> runner status/summary/log -> strict subject catalog rebuild -> per-item availability + target admission/dependency diagnostics -> compatible server startup`.
- **DS-008 mixed projection:** `Subject root event or history catalog row -> subject projector/store -> RootExecutionTreeProjection(root_subject_kind) -> strict subject stream/history GraphQL -> Team/Org context -> thin RootExecutionViewStore route/history facade -> workspace/history components`.
- **DS-011 definition/handoff save:** `Complete reversible draft -> update mutation(expectedRevision) -> subject service candidate validation -> per-definition package transaction -> refreshed canonical revision, or typed failure with draft retained`.
- **DS-012 configuration:** `Org definition launch defaults + root draft + exact Team/Agent patches -> fixed-depth address index -> specificity merge -> runtime/model/workspace validation -> complete plan`.
- **DS-013 focus:** `active Org context focus=null -> explicit Agent/Team sidebar row -> strict Org placement/index -> exact AgentRun or Team coordinator -> ActiveAgentWorkspaceTarget/shared surface -> recipient guard; absent/stale focus -> no send`.
- **DS-014 root-neutral execution composition:** `subject manager strict plan -> subject aggregate/adapters -> configured-Agent and flat-Team factories -> AgentRun candidates + staged provider bindings -> subject persistence coordinator -> AgentRun publication -> subject registry + active-root directory`; failure before durability aborts, indeterminate post-durability state fail-stops the subject root.
- **DS-015 process lifecycle:** `server/application scope construction -> AgentRun infrastructure -> explicit locations/directory/factories -> Team manager -> Org manager/general services -> open admission`; each root shutdown is `close external admission -> drain only admitted operation/materialization publication -> freeze stable complete scope -> AgentRun fence every direct/mounted/task Agent (cancel pre-forward or track+interrupt provider-started input through terminal) -> drain task mutations -> persist open-task interruptions -> run existing deepest-first quiescent settlement -> persistence drain -> local finish/unregister`, and process shutdown remains `Org roots -> standalone Team roots -> residual AgentRuns -> reverse release`.
- **DS-016 typed Org Agent event:** `AgentRun event -> root-neutral presentation admission -> AgentOrg subject envelope with exact member identity/sequence -> strict Org WebSocket parse -> AgentOrgExecutionViewState -> dispatchAgentStreamMessage -> AgentContext conversation/status/tool/activity mutation -> AgentEventMonitor`.
- **DS-017 focused interaction:** `Org sidebar exact address -> CollaborationFocusController -> ActiveAgentWorkspaceTarget -> shared AgentWorkspaceSurface or TeamWorkspaceSurface -> accepted AgentUserInputForm/tool card -> AgentInteractionPort -> strict Org command -> AgentOrgRun exact Agent handle -> command acknowledgement/presentation event`.
- **DS-018 Org hydration/recovery:** `active Org route/restore or sequence failure -> Org checkpoint + strict resume snapshot -> Org location-backed member projections/workspaces -> candidate AgentOrgExecutionContext -> expected-sequence stream handshake -> atomic context swap -> accepted workspace`.
- **DS-019 Org termination presentation:** `active Org history root row -> shared root stop action -> AgentOrgRunStore pending guard -> terminateAgentOrgRun -> AgentOrgRun whole-scope shutdown -> lifecycle event/history refresh -> active context cleanup`; no focused-member or mounted-Team stop path exists.
- **DS-020 mounted-Team status read:** `AgentOrg history render -> strict Org execution snapshot -> exact configured Team node -> live AgentOrgExecutionContext status source or existing terminal/history source -> branch-local configured/task Agent enumeration -> shared five-state fold -> TeamAggregateStatusDot + accessible tree item`; Team expansion is not an input.
- **DS-021 status update return:** `AgentRun status event -> root-neutral presentation admission -> strict Org event -> AgentOrgExecutionContext exact AgentContext mutation -> reactive branch fold -> mounted Team dot update`; no API request, Team lifecycle mutation, or focus/routing effect occurs.
- **DS-022 terminal task settlement:** `terminal task record -> existing settlement sweep -> mutation FIFO terminal-leaf revalidation -> tryPrepareTerminationIfQuiescent(exact Agent/task Team) -> active: return false + FIFO release + retry on idle; quiescent: existing prepared settlement -> subject tree/sidecar settledAt durability -> tree/index/event commit -> local finish -> parent resweep`. No settlement closure waits for an active provider turn.
- **DS-023 AgentOrg launch-override presentation:** `admitted AgentOrg detail -> agentOrgRunConfigStore root/team/agent sparse draft -> projectEditableAgentOrgRunFormModel strict fixed-depth projection -> MemberOverridesDisclosure -> TeamMemberConfigTree/TeamScopeConfigEditor/MemberOverrideItem edit commands -> Org command adapter -> existing createAgentOrgRun(rootConfiguration, teamOverrides, agentOverrides) -> server CollaborationLaunchConfigurationResolver`. Projection inconsistency disables Run with an exact error; collapse changes visibility only and never mutates the draft.
- **DS-024 effective configuration equality:** `typed Team/Agent edit -> canonicalizeAgentOrgPlacementLaunchPatch -> one canonical Org draft -> client projection/validation -> exact GraphQL variables -> CollaborationLaunchConfigurationResolver -> complete validation -> Org V1 placement snapshot`. Runtime/model ownership with no owned model config materializes `llmConfig:null`; ordinary omission remains inheritance.
- **DS-025 unified Workspace/history:** `subject-tagged Agent/Team/Org history and active-context rows -> mixed workspace-history projector -> stable workspace/category model -> always-mounted WorkspaceAgentRunsTreePanel -> typed subject browse/stop/archive/delete port -> exact subject store/service; Org restore is a separate deliberate-Send operation under DS-036`. Router changes only center content; left-tree identity and UI state remain.
- **DS-026 workspace default:** `fresh Org draft -> shared workspace catalog ready -> existing root default-selection policy -> actual Temp Workspace record -> Org root draft -> Team/Agent inherited form projection -> existing workspaceRootPath launch validation`. Exact user or Team override wins; missing default blocks without invention.
- **DS-027 AgentOrg history summary:** `external composer -> Org SEND_MESSAGE -> exact Agent command with execution-kind outcome -> accepted configured result -> AgentOrgRunService.recordRunActivity -> serialized Org history catalog -> shared first-write summary writer -> atomic index commit -> accepted ACK -> authoritative AgentOrg-family history refresh`. Historical recovery is the separate startup-only branch `strict Org V1 tree -> configured exact trace corpora + root sidecar negative evidence -> provenance-qualified unique-earliest classifier -> same shared summary writer`; task/system/inter-Agent/rejected/empty traffic never enters either live writer.
- **DS-028 accepted Org communication presentation:** `exact sender -> existing delivery -> RootCommunicationEngine -> receiver reservation -> one Org sidecar commit -> root communication -> exact receiver presentation -> input release -> context -> selected Messages`. Every admitted configured/task pair shares this spine; identities remain exact after settlement.
- **DS-029 participant Tasks/inspection:** `task activation/update or exact history selection -> coherent root view and retained index -> exact selected participant -> independent Tasks facet + exact AgentContext -> shared live/readonly workspace`. Inactive snapshot read is `GraphQL -> Org service -> manager transition boundary -> strict package stores/validator -> existing view projector`; no activation.
- **DS-030 genuine task-system input:** `existing task commit -> task event -> separate exact system-input admission -> accepted handle event -> shared system presentation -> recipient conversation`. Rejected notify retains record/warning, not input.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-000 | Registry classifies source ownership before exact target decoding; valid definitions flow to subject catalogs and invalid/dependent ones become diagnostics without fallback or source mutation. | SourceDescriptor; target codec; admission result; dependency closure | DefinitionAdmissionService | external owner action, diagnostic redaction, catalog invalidation |
| DS-001 | One subject-specific candidate is resolved/validated before a crash-recoverable package commit; only fully valid state enters its catalog. | Definition; DefinitionService; Provider | Subject DefinitionService | source discovery, codecs, revision lock, cache invalidation |
| DS-002 | Team launch validates one flat Team, allocates IDs after configuration coverage, creates native RootTeamRun, persists V2, then exposes coordinator-led interaction. | AgentTeamDefinition; Team plan; RootTeamRun; AgentRun | AgentTeamRunService | workspace prep, ID allocation, Team history |
| DS-003 | Org launch resolves referenced Teams without mutating them, computes full settings, creates one Org scope and all direct placements, persists V1, and returns without focus. | AgentOrgDefinition; Org plan; AgentOrgRun; TeamRun/AgentRun | AgentOrgRunService | Team definition query, workspace prep, activation rollback |
| DS-004 | The mounted Agent sees only its ordered outgoing rules; the owning subject aggregate resolves within its immutable snapshot and Team targets through exact coordinator. | Member context; RootTeamRun/AgentOrgRun; execution index; AgentRun | Subject root aggregate | address parser, instruction renderer, message persistence |
| DS-005 | Each delegate/submit/review/interrupt command authorizes the exact caller and serializes only its record/tree/sidecar mutation plus immediate publication; recursive task descendants stay task records and cleanup is delegated to DS-022. | Task engine; mutation FIFO; TaskRootAdapter; HostScope; TaskExecution | Subject root task boundary | run IDs, reference files, notification, settlement scheduling |
| DS-006T | Team mutations and restore pass only through strict V2 schema/store; flat Team snapshots never move or acquire Org fields. | Team V2 file; Team package; RootTeamRun | Team persistence coordinator | atomic writer, Team history, memory layout |
| DS-006O | Org mutations and restore pass only through strict V1 schema/store; root has no coordinator/focus and direct Teams remain flat. | Org V1 file; Org package; AgentOrgRun | Org persistence coordinator | atomic writer, Org history, memory layout |
| DS-007 | Startup deterministically classifies source ownership, converts only server-owned supported items, performs zero writes for flat runtime, records bounded runner dispositions, and rebuilds strict current catalogs; invalid items remain unavailable while compatible work starts. | RegisteredMigration; atomic writer/rename; runner result; strict catalog readiness | App-data migration subsystem | source ownership, capped diagnostics, restart guidance |
| DS-008 | Each subject publisher/projector preserves its native snapshot; a thin mixed facade attaches/checks root kind and clients reduce the correct union branch. | Subject event/snapshot; tagged DTO; web view | Subject publisher + projection facade | WebSocket recovery, generated clients, selectors |
| DS-011 | Save sends the whole draft and expected revision; current members and every ordered handoff validate under the owning subject before one normal-authoring package transaction. | Draft; candidate validator; definition revision | Subject DefinitionService | endpoint catalog, accessible reorder, atomic publication recovery |
| DS-012 | Resolver seeds root, overlays Team placement then exact Agent, validates all placements, and freezes plan before activation or IDs. | Root config; PlacementOverride; EffectivePlan | LaunchConfigurationResolver | runtime/model catalogs, workspace normalization |
| DS-013 | Org view begins unfocused; only explicit row action maps through the selected union branch to an AgentRun/coordinator; send stays blocked otherwise. | RootExecutionView; FocusTarget; AgentRun | Web focus controller | responsive sidebar, hydration, history row semantics |
| DS-014 | A subject root assembles strict state and adapters, prepares every required Agent/local Team without publication, commits its own package/bindings, then publishes/registers the complete scope or aborts/fail-stops it as one root. | Subject root; ConfiguredAgentExecutionHandle; Flat Team execution; subject persistence | RootTeamRun or AgentOrgRun | AgentRun candidates, memory locator, platform binding, active-root directory |
| DS-015 | Process composition constructs dependencies from provider/runtime infrastructure upward. On shutdown each subject root closes its operation/publication gate, freezes a stable complete scope, and invokes the AgentRun-owned input/provider-start/interrupt fence recursively before task drains; process teardown then proceeds in reverse root-ownership order so embedded Org Teams never appear in the Team root registry. | GeneralProcessRunSupervisor; subject roots; frozen Team/Org scopes; configured-Agent handles; AgentRun; task engines; subject managers; active-root directory | GeneralProcessRunSupervisor + subject root lifecycle owners + AgentRun input/lifecycle owner | application-scope Team-only specialization, idempotent fence, canonical input cancellation/interrupt facts, aggregate error collection |
| DS-016 | Every internal Org Agent event crosses one validating presentation adapter, one subject envelope and one strict web reducer before the existing Agent handlers mutate conversation/status/tool state. | AgentRun; presentation adapter; Org publisher/projector; Org stream state; AgentContext | AgentOrg subject event boundary | payload schemas, sequence recovery, token usage adapter |
| DS-017 | Exact Org focus creates one tagged active workspace target; shared Agent/Team surfaces and their composer/tool actions call only its subject interaction port. | Focus controller; ActiveAgentWorkspaceTarget; shared workspace surface; AgentInteractionPort; AgentOrgRun | AgentOrgExecutionContext / active-context facade | header action adapter, file/activity/token scopes, a11y |
| DS-018 | Open/restore/recovery hydrates a complete candidate Org context from strict snapshot locations and member projections, verifies checkpoint/stream base and swaps it atomically. | Org resume query; location service; member projections; context factory; candidate stream | AgentOrgRunContextHydrationService | workspace activation, active trace pages, recent-event baseline |
| DS-019 | Root history owns the visible Org stop action and pending/error state; server termination stops the entire aggregate and clears the active presentation target. | Org history row; AgentOrgRunStore; GraphQL service; AgentOrgRun; lifecycle reducer | AgentOrg lifecycle owner | toast/error, history refresh, focus cleanup |
| DS-020 | Org hierarchy projects one configured Team from the complete strict branch and exact live/history Agent statuses, folds them once, and renders one accessible dot independently of expansion. | Org snapshot; configured Team; Agent status source; branch adapter; shared fold/dot | AgentOrg Team-branch presentation projector | status normalization, localization/a11y, visual status grammar |
| DS-021 | An exact Agent status event mutates its AgentContext and Vue reactivity recomputes only the containing Team's display aggregate without a Team event or status request. | strict Org event; AgentOrgExecutionContext; exact AgentContext; branch fold; Team row | AgentOrgExecutionContext + Team branch presentation | stream sequence, render scheduling, collapse visibility |
| DS-022 | A terminal record schedules the existing sweep. The FIFO closure revalidates the leaf and asks the exact Agent/task Team to prepare only if already quiescent. `null` releases the FIFO and idle events retry; a prepared execution uses the existing durable settlement and cleanup transaction. | terminal record; mutation FIFO; subject adapter/persistence; AgentRun/task Team; idle event | RootTaskLifecycleEngine with subject TaskRootAdapter | atomic quiescence check, prepared cancellation, fail-stop, deepest-first child eligibility |
| DS-023 | The Org form owns its root and exact sparse patches, projects one strict Team level into the accepted Team launch view models, and translates edit commands back to the exact Org patch map before invoking the unchanged Org launch API. | Org route; Org config store; fixed-depth projector; shared disclosure/Team editors; Org command adapter; GraphQL launch | `agentOrgRunConfigStore` and `AgentOrgRunConfigPanel` command boundary | Team definition query, workspace selection, validation/error presentation, responsive/a11y state |
| DS-024 | One canonical placement patch gives browser preview and the existing server resolver the same omission/null semantics, so the validated request and stored execution cannot diverge. | Team/Agent edit; canonical patch; form projector; GraphQL variables; server resolver; run snapshot | AgentOrg config store/command boundary; server remains authoritative resolver | runtime/model catalog, config-schema compatibility, scoped errors |
| DS-025 | One mixed tagged workspace read model adds Orgs beneath Teams and drives the same mounted left tree through every route; the panel-scoped tree-state owner preserves presentation continuity and typed ports delegate commands to exact subject owners. | strict subject histories/contexts; mixed projector; workspace section model; stable panel/tree-state controller; subject action port | Mixed history read owner for data; always-mounted panel/tree-state owner for presentation continuity | stable row keys, selected-identity input, expansion/reveal/highlight/scroll, family-scoped error, root lifecycle delegation |
| DS-026 | A fresh Org root reuses the established Team root workspace selector policy; descendants project inheritance and exact Team overrides without choosing independent defaults. | workspace catalog; default policy; Org root draft; Team/Agent projection; launch command | shared workspace catalog + AgentOrg config store | unavailable default, explicit-choice stability, no-focus boundary |
| DS-027 | The Org command boundary proves exact configured membership; only an accepted external SEND_MESSAGE reaches the serialized catalog and shared first-write writer. The accepted ACK triggers an authoritative newest-generation Org history refresh. A startup-only migration may derive the same value solely from one provenance-qualified uniquely earliest configured-member trace; sidecars can disqualify, never qualify. | Composer; Org stream handler; AgentOrgRun/Service; Org history catalog; shared summary writer; mixed history read owner; registered migration | Org history catalog for normal-runtime sequencing; shared writer for physical first-write; migration only for historical inference | configured/task distinction, accepted-result ordering, atomic index write, stale-response suppression, redacted bounded diagnostics |
| DS-028 | One accepted ordinary same-root message commits once, publishes root communication then exact receiver input before release, and appears in selected sender/receiver Messages. | Existing engine; Org adapter/run/publisher; Org context; Messages facet; shared UI | AgentOrgRun for publication; Org context for read facet | Both exact IDs, retained counterpart, dedupe/time/references, recovery, no kind filter |
| DS-029 | Exact navigation/task event -> retained index and participant selector -> independent Tasks facet plus live/readonly conversation. | History action; service/manager inspection; context/index; shared UI | Org context read owner; service/manager package boundary | exact host/ID/binding, relevance, coherent hydration, no task reactivation |
| DS-030 | Task record commits, then separate system-input acceptance publishes once or preserves failed-notify warning. | Existing task engine; exact handle; shared adapter; AgentContext | Task engine for record, AgentRun for input, adapter for presentation | no save-as-receipt inference, duplicate backend input or Messages fabrication |

## Spine Actors / Main-Line Nodes

- `DefinitionSourceRegistry` / `DefinitionAdmissionService`: explicit source
  ownership, target-only codec dispatch, dependency closure, available catalog
  rows, and unavailable diagnostics for new work.
- `AgentOrgDefinitionService` / `AgentTeamDefinitionService`: authoritative
  candidate validation, mutation, and query boundaries for their subjects.
- `CollaborationLaunchConfigurationResolver`: authoritative fixed-depth effective
  setting computation; no focus or runtime activation.
- `AgentOrgTopologyPlanner` / `FlatTeamTopologyPlanner`: build immutable
  subject-specific run plans only after complete validation.
- `AgentOrgRunService` / `AgentTeamRunService`: explicit public launch/restore
  owners.
- `AgentOrgRunManager` / `AgentTeamRunManager`: separate active registries and
  root factories; each owns one durable family.
- `AgentOrgRun`: Org aggregate, direct Agent/Team execution handles, no
  coordinator, Org V1 correlation.
- `RootTeamRun`: native standalone Team aggregate, direct Agents/coordinator,
  Team V2 correlation.
- `TeamRun`: coordinator-led Team execution used as the standalone root body or
  direct Org Team placement; cannot own configured Teams.
- `ConfiguredAgentExecutionHandle` / factory: provider/local AgentRun candidate and command mechanics over explicit tagged root/member/physical inputs; no root authority.
- `AgentRun`: exact input admission, claim/provider-start serialization,
  canonical turn lifecycle, ordinary prepared termination, non-waiting
  quiescence preparation, and the irreversible root-shutdown fence.
- `FlatTeamExecutionFactory`: one local Agent-only Team plus task descendants beneath an explicit Team or Org root; no root package/registry.
- Frozen Team/Org termination scopes: immutable recursive enumeration of every
  direct/task/prepared Agent handle after materialization publication closes;
  they invoke but never implement the AgentRun fence.
- `RootTaskLifecycleEngine`: common task record policy, one mutation FIFO,
  terminal sweep, and existing deepest-first settlement policy. Settlement
  proceeds only after a non-waiting local quiescence preparation succeeds.
  `RootCommunicationEngine` retains message record/reservation policy.
- `ActiveCollaborationRootDirectory` / `CollaborationExecutionLocationService`: process-owned compound live capability lookup and strict two-family physical location projection; neither owns a root lifecycle.
- `GeneralProcessRunSupervisor`: explicit construction/admission/shutdown ordering across AgentRun, Team root and Org root managers.
- `TeamRunExecutionTreeStoreV2` / `AgentOrgRunExecutionTreeStoreV1`: strict
  subject stores over shared record validators.
- `RootRunPackageReadinessIndex`: current-only family/path/manifest inventory;
  rejects cross-family ID collisions and retired root-authority residue before a
  root can enter restore/history/stream catalogs, without decoding old content.
- `RootExecutionProjectionService`: thin explicit-kind read/projection facade for
  mixed history/stream/workspace; owns no lifecycle or persistence.
- `CollaborationAgentPresentationAdapter`: root-neutral validation and
  normalization of raw Agent callbacks; subject serializers retain root/sequence
  ownership.
- Web `AgentOrgExecutionContext` / `CollaborationFocusController`: one strict
  Org browser aggregate, per-Agent AgentContexts, mounted-Team presentation,
  owning-root Messages/Tasks facets, checkpoint recovery and nullable exact selection.
- `AgentOrgRun` / Org-private communication adapter: own the post-durable
  subject event sequence. The shared communication engine owns record and
  reservation policy but never selects the receiver presentation envelope.
- Web `CollaborationMessagesContextView` / Org perspective projector: one
  read-only owning-root selected-Agent message projection over the complete
  retained exact execution index and existing sidecar; no socket, store, route,
  lifecycle, or Team-root authority.
- Web `ActiveAgentWorkspaceTarget`, `AgentWorkspaceSurface` and
  `TeamWorkspaceSurface`: exact interaction/browse/action ports and accepted
  rendering shared across standalone and Org wrappers; no subject lifecycle.
- Web `AgentOrgTeamBranchStatusProjector` / `TeamAggregateStatusDot`: exact
  configured-Team branch traversal plus pure five-state fold/accessible rendering;
  no status, lifecycle, transport, polling or persistence authority.
- Web `agentOrgRunConfigStore` / `projectEditableAgentOrgRunFormModel`: sole
  AgentOrg launch-draft owner plus pure strict projection into the accepted Team
  presentation models; no Team store, effective server configuration, or
  definition mutation authority.
- Web `MemberOverridesDisclosure`, `TeamMemberConfigTree`,
  `TeamScopeConfigEditor`, and `MemberOverrideItem`: accepted presentation and
  edit-command components. They own disclosure/a11y/visual language only; the
  caller owns exact draft state and command translation.
- Web `RootExecutionViewStore`: thin mixed route/history facade over subject
  contexts; no raw event list or duplicate Org focus/tree.
- `AgentOrgFlatTeamFamiliesV1AppDataMigration`: exclusive server-owned retired
  definition and old organization-like Team Run conversion owner.

## Ownership Map

| Node | Owns | Does Not Own |
| --- | --- | --- |
| DefinitionSourceRegistry | Registered roots, source class, mutation owner, canonical package/definition paths | Decoding, definition identity inference, filesystem mutation |
| DefinitionAdmissionService | Exact target codec selection, admission result, dependency availability closure, available catalogs/unavailable diagnostics | Legacy decoding, source writes, runtime/history eligibility |
| AgentOrgDefinitionService | Direct Agent/Team refs, Org endpoint catalog/handoffs, complete candidate validation, definition transaction orchestration | Team-local edits, Team copies, runtime IDs, migration decoding |
| AgentTeamDefinitionService | Agent-only members, direct coordinator, Team-local endpoints/handoffs, complete candidate validation | Org membership/handoffs, child Team discovery |
| DefinitionPackageTransaction | Normal authoring only: per-definition lock, expected revision, complete staged package, atomic visibility/recovery, canonical revision publication | Domain validation, cross-definition policy, or data migration |
| CollaborationLaunchConfigurationResolver | Root/Team/Agent precedence, placement validation, complete effective plan | Focus, definition mutation, runtime activation |
| AgentOrgTopologyPlanner | Fixed Org -> direct Team -> Agent addresses/IDs/config snapshot | Filesystem writes or live lifecycle |
| FlatTeamTopologyPlanner | One Team -> Agents addresses/IDs/config snapshot | Org members or configured child Team |
| AgentOrgRunService / Manager | Org launch/restore/stop, active Org registry, Org V1 package correlation | Team-only registry, focus, definition mutation |
| AgentTeamRunService / Manager | Native Team launch/restore/stop, active Team registry, Team V2 package correlation | Org registry/configuration inheritance |
| AgentOrgRun | Org address/handoff/task/lifecycle scope, direct Agent/Team handles, Org execution index/events | Coordinator, configured Team below Team |
| RootTeamRun | Team address/handoff/task/lifecycle scope, direct Agents, coordinator, Team execution index/events | Org semantics or configured child Team |
| TeamRun | Direct Agents, exact coordinator, Team-local task host/task descendants | Configured Team children or Org-wide resolution |
| ConfiguredAgentExecutionHandle | AgentRun candidate prepare/restore/publish/abort, local commands/status/events/termination | Root tree/index/store/registry, subject event wrapping, address/task policy |
| FlatTeamExecutionFactory / local TeamRun | One Agent-only Team local plane and task descendants under supplied root/scope | Root package/persistence/registration, configured Team child, Org-wide routing |
| RootTaskLifecycleEngine | Task records, authorization/notification policy, one FIFO, terminal sweep, child eligibility, non-waiting settlement deferral and existing prepared settlement invocation | Waiting on non-quiescent provider turns, subject tree/index/store/event, root lifecycle/registry |
| AgentRun / local task execution | Atomic `tryPrepareTerminationIfQuiescent`; irreversible root-shutdown admission/provider-start/interrupt fence; existing prepared termination; exact input/provider/turn lifecycle | Task record state, subject persistence, root-scope enumeration or process shutdown policy |
| Frozen Team/Org termination scopes | Stable enumeration and recursive invocation of the AgentRun root-shutdown fence across direct, mounted, task, and prepared executions | Agent input state, provider interrupt implementation, task record persistence, mounted-Team root authority |
| RootCommunicationEngine | Same-root message record/reservation lifecycle | Subject address/index/sidecar/event owner |
| Team/Org private adapters | Translate engine/handle ports to exact index/tree/mutator/persistence/event and fail-stop; Org adapter preserves root event then exact receiver callback before release | Public API, cross-subject store, generic durable root, record duplication or endpoint-kind presentation policy |
| ActiveCollaborationRootDirectory | Compound tagged live-root narrow message/query capability | Root construction/restore/stop, concrete aggregate, bare-ID lookup |
| CollaborationExecutionLocationService | Explicit Team/Org Agent physical/history location composition | Root-kind inference, data transformation, lifecycle |
| GeneralProcessRunSupervisor | Dependency construction, service binding, admission close and Org->Team->Agent teardown order | Subject domain policy or embedded Team lifecycle |
| Subject tree/sidecar stores | Exact family schema/path/envelope/atomic file reads/writes | Trying the other validator, mixed kind inference, migration selection |
| RootRunPackageReadinessIndex | Sorted current family inventory, compound kind/ID readiness, cross-family ID exclusivity, exact target manifest readiness | Payload transformation, legacy decoding, lifecycle, history projection |
| RootExecutionProjectionService | Dispatch by explicit `root_subject_kind`, family/payload agreement, tagged union projection | Root lifecycle, file scanning/guessing, topology authority |
| Migration | Source-classified server-owned retired definition/Org-like Run V2 transformation, atomic current-file write/one direct rename, validation, cleanup, bounded dispositions | External writes, normal domain-update transaction as migration writer, custom runner/journal/recovery, normal target admission, feature behavior, deep conversion |
| Web subject authoring stores | Separate complete drafts, revision, endpoint choices/errors | Live run event state or other-subject edits |
| Web `agentOrgRunConfigStore` | AgentOrg root draft; exact Team/Agent sparse launch patches; Team workspace selections; validation/projection/launch error state | Team run draft/payload, effective server resolution, disclosure state, Team definition mutation |
| `projectEditableAgentOrgRunFormModel` | Pure fixed-depth admitted Org-to-Team-presentation projection, exact Agent count, coordinator correlation and projection diagnostics | Store writes, GraphQL serialization, override inheritance authority, nested configured Teams |
| `MemberOverridesDisclosure` + accepted Team editors | Disclosure/a11y/visual presentation and typed edit events over caller-provided Team/Agent form nodes | AgentOrg or Team store ownership, patch identity, API payloads, lifecycle |
| CollaborationAgentPresentationAdapter | Validate/normalize raw AgentRun/member-input/status/readiness into closed presentation or filter/reject | Subject root/sequence envelope, browser state, rendering |
| AgentOrgExecutionContext / context store | One strict view/index, exact AgentContexts and selection, Tasks/Messages facets, live/historical access, atomic candidate swap | Durable topology mutation, standalone Team registration, raw event journal, second cache |
| CollaborationTasksContextView / Org task projector | Exact relevant participant Tasks over retained task records and execution index | Team roster membership as relevance, task engine mutation, independent store |
| ActiveAgentWorkspaceTarget / AgentInteractionPort | Exact focused Agent context, subject command/browse/action adaptation | Implicit focus, root lifecycle, component socket access |
| TeamWorkspaceContextView | Genuine Team identity/coordinator/member/header presentation in standalone or Org host | Root Tasks/Messages authority, Team root persistence/restore/stop |
| CollaborationMessagesContextView | Exact selected participant ordinary-message read facet over owning root and retained execution identity | Store/socket/delivery/routing/task authority or kind-based exclusions |
| AgentWorkspaceSurface / TeamWorkspaceSurface | Accepted header/status/event monitor/composer rendering from explicit ports | Subject stores, GraphQL/WebSocket, protocol parsing, root lifecycle |
| AgentOrgTeamBranchStatusProjector | Exact one-Team configured/task Agent identity traversal and live/history status-source admission | Agent state, visible-row filtering, sibling/root topology, lifecycle, transport, polling, persistence |
| TeamAggregateStatusFold / Dot | Pure normalization/precedence and accessible five-state Team signal | Subject topology, store/context lookup, root activity/lifecycle, commands |
| Web RootExecutionViewStore | Tagged route/history subject delegation | Second Org tree/focus/events, direct Agent command, durable focus, family inference |
| AgentOrgRun configured-command boundary | Exact configured execution-kind qualification plus existing liveness/direct-or-mounted handle delegation for external SEND_MESSAGE | History normalization/storage, task inclusion, UI refresh or historical inference |
| AgentOrgStreamHandler / AgentOrgRunService activity facade | External command/result sequencing and service-level bridge to current Org history | Catalog first-write state, trace inference, client optimistic state |
| AgentOrgRunHistoryCatalogService | Normal-runtime serialization, current-row authority, shared-writer invocation and value preservation on normal rebuild | Legacy trace scanning, physical mutation duplication, execution command admission, UI presentation |
| AgentOrgRunHistorySummaryWriter | Team-identical compaction, first-non-empty row transform, atomic current-index write, strict reread and closed disposition | Runtime queue, migration inference, manager/catalog lifecycle or UI presentation |
| Web mixed AgentOrg history read owner | Strict existing query, family slice/error retention, monotonic request generation and authoritative refresh commit | Submitted-text optimism, Org runtime context, tree disclosure/scroll state |
| AgentOrg history-summary migration | Strict current Org cohort enumeration, configured-member trace qualification, root communication/task exclusion evidence, provenance-qualified unique-earliest inference, shared-writer invocation, bounded/redacted dispositions | Normal runtime writes/reads, task recovery, positive inference from sidecars, catalog/manager construction, schema changes or fallback rendering |
| AgentOrgRun communication presentation boundary | Resolve both exact committed endpoints and publish receiver input for every admitted pair after root communication | Admission/schema change, browser projection, replay, task-kind exclusion |
| Web AgentOrg message perspective projector | Retained exact Org identity, sender/receiver filter, direction/counterpart/reference and ordering | Same-Team/kind filtering, current definition identity, persistence or event synthesis |

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Definition catalog resolvers | DefinitionAdmissionService + subject query service | Return only available new-work definitions | Legacy retry, source mutation, history filtering |
| Definition admission diagnostics resolver | DefinitionAdmissionService | Actionable operational inspection | Make external incompatibility a global startup failure or expose raw secrets |
| GraphQL Org definition resolver | AgentOrgDefinitionService | Transport mapping/errors | Validation/filesystem writes |
| GraphQL Team definition resolver | AgentTeamDefinitionService | Transport mapping/errors | Org policy/provider access |
| GraphQL Org run resolver | AgentOrgRunService | Typed config/launch/restore/terminate | Focus or manager/store internals |
| GraphQL Team run resolver | AgentTeamRunService | Native Team launch/restore/terminate | Org semantics |
| Mixed history/query resolver | RootExecutionProjectionService | Explicit-kind union mapping | Guessing kind or mutating subject roots |
| Team-only stream handler | RootTeamRun publisher/projector | Preserve compatible Team stream surface | Org dispatch/lifecycle |
| Mixed/Org stream handler | Org projector/publisher + AgentOrgRun command boundary | Frame strict snapshots/events/acks and map exact commands | Raw payload pass-through, task/message state ownership, focus fallback |
| Agent definition tools | Subject DefinitionService | Agent-callable serialization | Alternate validation/compatibility parser |
| Web handoff primitives | Subject draft adapter | From/To/When presentation and reversible commands | Endpoint policy/persistence/cross-owner mutation |
| Web Org config/focus components | Org config store / AgentOrgExecutionContext | Approved interactions and exact shared-surface selection | Server precedence, durable focus, raw protocol rendering, fallback |
| Agent/Team workspace wrappers | ActiveAgentWorkspaceTarget + shared surfaces | Adapt standalone or Org subject context/actions without duplicate rendering | Subject-agnostic socket logic, root lifecycle, copied Org dashboard |
| AgentOrg history root row | AgentOrgRunStore/Service + Team-branch presentation projector | Present root stop plus exact Agent/Team hierarchy status/navigation | Own Agent status, mounted-Team lifecycle, status transport/polling or fold policy |
| TeamAggregateStatusDot | Pure shared fold/status-dot presentation | Reuse one visual/a11y contract in Team and Org rows | Traverse subject topology or resolve status state |
| AgentOrg launch-override form adapter | `agentOrgRunConfigStore` + strict Org form projector | Adapt an Org-owned sparse draft to accepted Team disclosure/edit components and back to exact Org launch fields | Import Team run store/payload, compute authoritative effective configuration, silently omit invalid Team refs, or clone Team definitions |

## Removal / Decommission Plan (Mandatory)

AD-REV-026 removes media-only user extraction/hydration and user-page attachment mediaType in one coherent producer/consumer change. Keep media visuals and old valid optional facts, not a compatibility alias. No filenames/prose repair path is introduced.

| Item To Remove / Decommission | Why | Replacement | Scope / Preservation Note |
| --- | --- | --- | --- |
| Normal `providers/team-definition-config.ts` unversioned recursive codec | Target admission has two exact field-free family shapes (DS-031). | `agent-team-definition-config.ts` + `agent-org-definition-config.ts`; copied legacy knowledge only in migration folder | Delete normal import/export paths; external rejection must not reach migration decoder. |
| `TeamMember.refType: agent_team` in Team inputs/config | Team is Agent-only. | Agent-only Team member type/schema/validator | Remove from current Team authoring/import/launch; old parser only migration. |
| Recursive configured Team graph resolver/validator | No current configured Team recursion. | AgentOrg fixed-depth resolver + flat Team resolver | Task recursion is separate and retained. |
| Recursive Team handoff compiler traversal | Team-local handoffs rebase once. | Explicit `compileTeam` / `compileOrg` methods | Preserve order, owner, duplicate/self checks. |
| Team-local Team source ownership under a Team | Team cannot own Team member. | Org-owned source discovery or shared Team reference | Team-local Agent sources remain. |
| Recursive configured planner/index/config types | Fixed configured depth. | Subject-specific Org/Team plan types plus shared placement records | Recursive task types remain. |
| `getOrCreateConfiguredChildTeam` on Team runtime/backend | A Team cannot materialize configured Team child. | `AgentOrgRun` direct Team materializer | Task Team preparation remains task-owned. |
| `MemberTaskRootResolver.resolveActiveRoot(): RootTeamRun` and Team-root task tool context | Cannot represent an Org and leaks aggregate type into Agent tools. | `MemberTaskCommandCapability` bound to tagged identity/root | No manager lookup/cast; selector-free inputs/results preserved. |
| `TeamMemberExecutionIdentity` / shared AgentRun `memberTeamContext` | Falsely asserts every collaboration member belongs to a Team root. | `CollaborationMemberExecutionIdentity` / `memberExecutionContext` | Team root adapters translate only at compatible Team event boundaries. |
| `MixedAgentMemberHandle` Team-root constructor | Couples provider/local mechanics to Team context/store/events/memory. | Root-neutral `ConfiguredAgentExecutionHandle` and factory | Preserve AgentRun candidate behavior; remove Team imports. |
| `MixedTeamRunBackendFactory` root creation and configured-child path | Cannot materialize a mounted Team without creating/assuming Team root. | `agent-team-execution/local/FlatTeamExecutionFactory` plus subject root assembly | Local Team owns direct Agents/task descendants only. |
| `FrozenTeamRunTerminationScope.interruptActiveTurns()` and `ConfiguredAgentExecutionHandle.interruptForRootTermination()` active-turn-only success wrapper | It treats pre-`TURN_STARTED` admitted/provider-started input as safely interrupted and can let work start after the phase. | `fenceAgentRunsForRootShutdown()` -> `AgentRun.fenceInputAndInterruptForRootShutdown()` | Clean-cut rename/replacement; ordinary user interrupt API remains unchanged. |
| Injected `AgentOrgExecutionActivator` / placeholder Org run | Hides missing root ownership and cannot prove production composition. | Explicit `AgentOrgExecutionScopeBuilder` and aggregate adapters | No catch-all activator remains. |
| Team-only task/message sidecar reuse for Org | Root identity/envelope would be false and fail-closed restore impossible. | Strict Org sidecars over identical record arrays | Team sidecars remain exact. |
| Treating `RootTeamRun`/`AgentTeamRunManager` as Org owner | Org is not Team. | New AgentOrgRun/Manager/Service | Preserve RootTeamRun/Team manager for native Team. |
| Root-generic V3 schema/store/path proposal | Superseded by RER-016 and violates native Team contract. | Exact Team V2 + exact Org V1 stores/paths | No `collaboration_runs` directory or Team rewrite. |
| Inferring root kind from coordinator/member/version | Two families must fail closed. | Explicit tagged catalog/location and strict store dispatch | No “try both” reader. |
| Recursive Team-specific LLM hierarchy prose | Agents must see Org/flat-Team truth. | Root-kind-aware renderer over canonical address parser | String address format stays unchanged. |
| Team UI Team selector/nested counts/warnings | Team authoring cannot advertise Teams. | Agent-only Team UI + separate Org UI | Task lineage still renders Team task nodes. |
| Org `entryAddress` selector/input/result and initial focus fallback | Activation and targeting are separate. | Org config command + full activation + nullable focus | No ignored compatibility field. |
| Org focus repair to coordinator/first Agent | Org has no default recipient. | Clear invalid focus and block recipient action | Standalone Team coordinator-first remains. |
| Raw AgentOrg `events[]`, opaque DTO event, `any` render casts and `JSON.stringify` event fallback | Protocol envelopes are not a conversation model and violate failure-closed projection. | Strict presentation admission/envelope + AgentOrgExecutionContext + AgentContext handlers | Reject/recover an unknown event; never retain a hidden diagnostic dashboard fallback. |
| Bespoke AgentOrg focused header/event cards/composer and direct send-only store call | Duplicates accepted Agent/Team ownership and loses context-file/interrupt/tool behavior. | Store-neutral Agent/Team surfaces + exact ActiveAgentWorkspaceTarget/AgentInteractionPort | Org view retains only null prompt and exact surface selection. |
| Member-header `Stop Org` and any mounted-Team terminate action | Focused member/Team is not the root lifecycle owner. | Active AgentOrg history root-row stop/pending/error | Standalone Team members-panel confirmation remains unchanged. |
| Duplicate Org tree/focus/raw-event state in RootExecutionViewStore | Creates two browser authorities and prevents atomic hydration/recovery. | AgentOrgExecutionContext + thin mixed route/history facade | Mixed store may hold route/connection handles only. |
| Configured-nesting-specific Team aggregate component/helper names and duplicated precedence ownership | The aggregate now serves retained Team history and direct Teams mounted under Org; copying it would drift. | `TeamAggregateStatusDot.vue`, `workspaceTeamAggregateStatus.ts`, subject-shaped traversal adapters | Clean rename/import/test/localization update; no alias wrapper or second fold. |
| Mounted-Team branch in `AgentOrgPlacementOverrideRow` and the always-exposed child hierarchy | It duplicates the accepted Team launch editor, represents a Team as a fabricated Agent-like node, hides inherited state, and violates approved progressive disclosure. | `projectEditableAgentOrgRunFormModel` -> `TeamMemberConfigTree` / `TeamScopeConfigEditor` / `MemberOverrideItem`; retain or rename the old component only as an Agent-only direct-Org row. | Remove the Team-kind prop/branch and old layout cleanly; no feature flag, alternate legacy layout, or compatibility wrapper. |
| `agentOrgRunStore.history`, `historyError`, and `fetchHistory` | A subject command store plus the route-selected panel currently form a second web history authority and duplicate the mixed Workspace owner's refresh/state. | `runHistoryStore` owns the strictly parsed Org history slice and family-scoped read errors; successful Org commands request its refresh through the caller/action adapter. | Keep Org launch/restore/terminate commands in `agentOrgRunStore`; remove only read-history state and internal refresh side effects. No store-to-store lifecycle import. |
| Nested configured-Team supported fixtures/docs | Assert rejected target model. | Org fixed-depth + negative Team nesting fixtures | Convert rather than keep as alternate mode. |
| Stale generated `.js` test/source mirrors, where repository convention confirms they are artifacts | Can retain obsolete inputs. | Canonical TypeScript sources/build output | Verify convention before deletion. |

## Return Or Event Spine(s)

- **DS-008 Team event:** `ConfiguredAgent/task/message neutral body -> private Team adapter -> RootTeamRun/Team
  projector -> compatible Team stream and/or tagged mixed adapter -> web reducer`.
- **DS-008/DS-016 Org event:** `ConfiguredAgent raw event -> CollaborationAgentPresentationAdapter -> private Org adapter/publisher -> strict AgentOrg presentation envelope -> AgentOrgStreamingService -> AgentOrgExecutionViewState -> dispatchAgentStreamMessage -> exact AgentContext`. Root task/message events update the strict Org view separately. No opaque event list reaches a component.
- **DS-021 Team aggregate update:** an already-admitted exact Agent status mutation returns into the mounted-Team presentation fold. The fold reads the full strict branch, so a hidden descendant can update a collapsed Team dot without materializing hidden rows or emitting a Team event.
- **DS-004 exact-Agent route:** `GlobalAgentRunMessageRouter -> sender/target MemberExecutionContext tagged-root comparison -> ActiveCollaborationRootDirectory -> owning root message boundary -> exact Agent reservation/sidecar/event result`.
- **History result:** `TeamHistoryStore + AgentOrgHistoryStore ->
  RootRunHistoryCatalogService merge/check -> tagged GraphQL result -> web
  history navigation`.
- **Definition result:** `DefinitionPackageTransaction commit -> DefinitionService
  -> GraphQL canonical result/revision -> subject store/form`.
- **Migration result:** `bounded dispositions -> existing runner summary/log/status
  -> strict current catalog availability -> RESTART_TO_RETRY for failed startup-only work`.
- **Focus result:** `explicit sidebar selection -> exact ActiveAgentWorkspaceTarget -> shared Agent/Team workspace and composer -> subject interaction port; clear/invalid focus -> prompt and blocked send without changing root lifecycle`.
- **Org command result:** `accepted composer/tool/interrupt action -> AgentInteractionPort -> strict Org client command -> exact AgentOrgRun member handle -> command acknowledgement plus typed presentation event -> existing UI state handlers`.
- **Org stream failure result:** `schema/correlation/sequence rejection -> reopen_required -> checkpointed complete context hydration -> candidate snapshot barrier -> atomic context swap`; raw payload is never displayed.
- **Org termination result:** `history root stop -> pending guard -> whole-root terminate -> lifecycle/history/context cleanup`; no member or mounted-Team terminate path.
- **DS-023 Org launch-draft result:** typed Team/Agent edit event -> exact Org patch mutation -> pure reprojection -> stable disclosure/state label; Run -> existing Org GraphQL result/error -> active unfocused Org or retained draft with scoped errors. No Team run draft or definition is mutated.
- **DS-024 launch result:** canonical GraphQL variables -> server resolution/validation -> success returns one Org ID and later strict snapshot shows the identical effective placement, or typed rejection returns to the exact draft field. No browser/server repair or alternate inheritance occurs.
- **DS-025 history update:** subject history/active-context update -> tagged row merge -> same workspace/category node updates reactively; the panel, expansion, selection and unrelated rows stay mounted. A family-scoped error decorates the retained model rather than replacing it.
- **DS-026 default result:** eligible catalog row -> root draft selection -> form reprojection shows the same inherited workspace at mounted scopes; explicit user edit returns through the same root/Team command path and never changes focus.
- **DS-027 current summary result:** `catalog atomic commit -> accepted Org SEND_MESSAGE ACK -> injected accepted-external-message callback -> newest-generation AgentOrg history query -> strict Org slice commit -> existing summary row rerender`. A failed refresh retains the prior slice/error state; no component receives submitted text as an optimistic summary.
- **DS-027 historical result:** `registered migration dispositions -> existing runner summary/log -> strict Org history reread`; one selected value becomes normal current data, while absent/ambiguous evidence retains the valid empty fallback with a bounded warning.
- **DS-028 accepted message result:** `Org durable commit -> root communication event -> exact receiver member-input presentation -> strict Org context`. The receiver event appears once in the receiver AgentContext; the same one durable sidecar row appears in sender and receiver Messages perspectives only when each is selected.
- **DS-028 focus/recovery result:** `exact configured/task Agent selection -> root Messages/Tasks facets -> retained execution identity -> established shared sections`. Direct and mounted targets use the same facet contract; reconnect/restore replaces a fully correlated candidate and never fabricates an event or message row.

## Bounded Local / Internal Spines

- **DS-014 configured scope activation:** `construct subject aggregate/adapters -> materialize root-direct handles and local flat Teams -> prepare configured AgentRun candidates in canonical address order -> collect/apply provider bindings to candidate tree -> strict subject package commit -> publish candidates -> register subject root/directory`; pre-durability failure aborts in reverse, post-durability indeterminacy fail-stops the whole root.
- **DS-005 root-neutral task command:** `bound member capability -> root-neutral mutation FIFO -> subject TaskRootAdapter authorize/resolve exact host -> prepare task mutation -> subject tree+sidecar durability -> immediate local state/event publication -> FIFO release`; no tool resolves a root aggregate and no provider-dependent cleanup runs in the command closure.
- **DS-022 terminal task settlement:** `terminal record -> existing sweep/leaf gate -> mutation FIFO -> tryPrepareTerminationIfQuiescent -> null and immediate FIFO release, or existing prepared settlement -> subject settledAt tree/sidecar durability -> tree/index/event commit -> local finish -> parent resweep`. A parent cannot settle before open children; active provider work is never awaited at the FIFO head.
- **DS-004/DS-028 root-neutral accepted message:** `bound delivery callback -> owning root authorization/address resolution -> exact receiver reservation -> subject message-sidecar durability -> input commit -> subject root communication event -> exact receiver member-input presentation -> input release`; Team and Org use distinct envelopes/publishers and one shared record lifecycle.
- **DS-015 root termination:** `close external task/message/command admission -> close+drain only admitted operation/materialization publication -> freeze root host/direct handles/mounted Teams/task/prepared descendants -> recursively fence every AgentRun -> cancel never-forwarded input or track provider-started input -> interrupt active or newly-started canonical turn -> require terminal fence completion -> drain task mutations -> durably interrupt remaining open task records -> run existing deepest-first quiescent settlement -> drain persistence -> finish remaining local teardown -> root directory/manager unregister -> publisher clear`. No general task FIFO/settlement drain precedes the Agent fence, and no provider start may cross a completed fence.
- **DS-016 presentation admission:** `CollaborationAgentExecutionEvent + exact tagged member identity -> validate/normalize raw AgentRun or member-input/status/readiness variant -> filter collaboration duplicate or return strict AgentPresentationMessage -> subject serializer`; rejection becomes one typed stream failure/recovery signal, never JSON text.
- **DS-017/DS-028 active workspace target:** `exact selection -> Org retained run lookup -> configured/task target -> AgentContext + explicit access + exact browse + Messages/Tasks facets + genuine Team view where applicable -> shared surfaces`; task settlement keeps selected retained execution read-only; DS-035–037 preserve exact selection and conversation after root stop, with send-only continuable configured targets and read-only retained task targets. No navigation back through a launch form or restore-on-click is permitted.
- **DS-018 candidate recovery:** `read Org checkpoint -> hydrate strict tree/tasks/messages/member projections -> create candidate contexts -> read checkpoint again -> require no open work/same sequence -> connect expected snapshot -> swap -> dispose failed stream/context`.
- **DS-009, `CollaborationHandoffCompiler`:** `validate Org-owned and Team-local
  candidates without mutation -> append Org-owned saved order -> visit direct Team placements in
  stable Org member order -> validate/rebase each Team-local list once -> append
  without sorting/deduplication -> freeze snapshot`; standalone Team emits only
  its local saved order.
- **DS-010, migration item:** `read/validate supported source -> transform and
  validate current payload -> atomic current-file write/reread -> one package
  rename when subject family changes -> target reread -> inert cleanup attempt ->
  bounded disposition`; interruption uses the same later-startup retry.
- **DS-006T Team commit:** `prepare RootTeamRun mutation -> strict affected Team tree/task/message authority write under Team coordinator -> commit live state -> publish Team event`.
- **DS-006O Org commit:** `prepare AgentOrgRun mutation -> strict affected Org tree/task/message authority write under Org coordinator -> commit live state -> publish Org event`; initial full activation commits the correlated three-file package before Agent publication.
- **DS-011 definition commit:** `exact candidate parse -> resolve -> endpoint/handoff validate
  -> lock -> compare revision -> stage full package -> journaled promote/recover
  -> cache publish`.
- **DS-012 configuration:** `seed Org root -> Team patch -> exact Agent patch ->
  validate all resolved records -> freeze plan`; no definition/focus mutation.
- **DS-023 form projection/edit loop:** `strict admitted Org + referenced flat Teams + Org draft -> project exact one-level Team/Agent view nodes and count -> render accepted disclosure/editor -> typed edit/reset -> mutate only exact teamOverrides[address] or agentOverrides[address] -> reproject`. Invalid reference/coordinator/address correlation returns a blocking projection diagnostic; it never omits a row.
- **DS-024 canonical patch:** `incoming typed patch -> preserve owned fields -> if runtime/model owned and llmConfig absent, own llmConfig:null -> freeze/store -> idempotent serialization assertion`. Reset removes the patch; no second raw representation exists.
- **DS-025 category projection:** `tagged rows grouped by workspace -> existing Agent categories -> Teams roots -> Orgs roots -> remaining established categories`. Category order is deterministic and independent of current route.
- **DS-026 fresh-root selection:** `catalog ready + fresh untouched Org draft -> find actual eligible default record -> set root selection once`, otherwise return no selection/actionable error. Descendant baselines read root plus exact Team override; no descendant default operation runs.
- **DS-027 live qualification/first write:** `Org SEND_MESSAGE command -> unchanged exact Agent command -> accepted result plus strict indexed kind -> configured-kind eligibility -> serialized catalog queue -> shared summary writer compact/first-write/atomic reread -> committed catalog rows or no-op`. The generic Agent command path remains unchanged for interrupts/tool decisions.
- **DS-027 migration classifier:** `strict V1 configured nodes -> exact AgentMemoryLayout paths -> complete trace corpora + root communication/task exclusion evidence -> validate user/source/content/timestamp candidate and contradiction-free causal prefix -> require one provenance-qualified strictly earliest -> shared summary writer -> strict reread`; any nonqualifying earliest fact, tie, absence, ambiguity, or invalid required evidence skips without promotion or deterministic tie-breaking.
- **DS-028 Org perspective projection:** `strict rootOrg configured nodes -> complete agentRunId/address/label index -> one Org sidecar snapshot -> selected Agent participant filter -> sent/received direction + exact counterpart/reference projection -> stable Team-equivalent sort -> shared Messages section`. Containing Team, visible rows and basename never participate.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why / Misplacement Risk |
| --- | --- | --- | --- | --- |
| Definition source discovery/codecs | DS-000, DS-001, DS-007 | Admission, definition services, migration | Classify source ownership; exact target decode/encode; migration-only legacy decode for server-owned sources | Prevents filesystem/write authority and compatibility leakage into domain. |
| App-data runner/status/log | DS-007, DS-010 | Registered migration and Settings status | Existing attempts, prerequisites, compact summary, detail log, `RESTART_TO_RETRY` | Prevents a ticket-specific ledger, recovery command, or unbounded status payload. |
| Current catalog readiness | DS-000, DS-006T/006O, DS-007/008 | Definition/run/history consumers | Admit independently valid current packages; exclude failed/conflicting IDs and expose bounded diagnostic linkage | Prevents blanket startup failure and legacy fallback. |
| Definition package transaction | DS-001, DS-011 | Definition services | Normal authoring revision lock, complete candidate staging, atomic publication/recovery | Prevents partial `md/config` visibility and lost updates; migration does not use it. |
| Canonical address parser | DS-003-DS-005, DS-009 | Resolvers/compilers | Rooted parse/build/rebase/depth checks | Avoids divergent fallback/depth policy. |
| Workspace/runtime catalog activation | DS-002, DS-003, DS-012 | Run services | Validate runtime/model/workspace and prepare resources before activation | Keeps external setup out of aggregate. |
| Identity allocators | DS-002, DS-003, DS-005 | Planner/task service | Allocate IDs after validation | Avoids validation side effects. |
| Configured Agent execution factory | DS-002-DS-005, DS-014 | Subject root aggregates | Provider/local AgentRun prepare/publish/abort/input/termination over explicit root-neutral context | Prevents Team context/persistence ownership leaking below roots. |
| Flat Team execution factory | DS-002, DS-003, DS-005, DS-014 | Subject root aggregates and task host | Materialize one Agent-only Team local plane without package/root registry | Prevents mounted Org Teams becoming standalone Team roots. |
| Active collaboration root directory | DS-004, DS-008, DS-014, DS-015 | Subject managers and global exact-Agent message router | Compound tagged-root lookup to narrow live message/query capability | Prevents Team-manager hard-coding and bare-ID kind inference; owns no lifecycle. |
| Collaboration execution location service | DS-006T, DS-006O, DS-008, DS-014 | Agent memory/context-file/run-file/history consumers | Compose explicit Team/Org locations and derive exact physical Agent paths | Prevents Org Agents from disappearing behind Team-only location services. |
| Shared persisted record schemas | DS-006T, DS-006O | Subject stores | Exact common Agent/Team/handoff/launch/task record keys | Reuse without root-family conflation. |
| History/index projectors | DS-006T, DS-006O, DS-008 | Subject persistence/web | Subject rows plus tagged mixed merge | Derived only; cannot reinterpret definitions. |
| Application-owned Team validation | DS-001, DS-002 | Team owner | Enforce Agent-only Team and standalone launch | Closes application recursion loophole. |
| LLM instruction renderer | DS-004, DS-005 | Member context | Explain actual root/address/tool semantics | Keeps prose out of resolver. |
| Agent presentation schemas/adapter | DS-008, DS-016-DS-018 | Team and Org subject publishers plus web stream reducers | Strict root-neutral presentation details, raw AgentRun admission, subject serialization | Prevents protocol envelopes/unknown payloads/JSON formatting from entering Vue components. |
| AgentOrg context hydration/recovery | DS-016-DS-018 | Org route/store and accepted event monitor | Strict resume/member projections, workspace resolution, checkpointed candidate context swap | Prevents tree, AgentContext and raw event arrays becoming competing browser authorities. |
| Active workspace target/interaction facade | DS-013, DS-017-DS-019 | Shared Agent/Team center and right-tool components | Exact AgentContext, optional Team presentation view, browse identity, command port | Prevents reusable components from reading both subject stores/sockets or registering mounted Teams as roots. |
| Root termination action | DS-019 | Org/Team history presentation | Root-row stop placement, pending guard, error presentation | Keeps lifecycle out of focused member header and mounted-Team scope. |
| Team aggregate status policy | DS-020, DS-021 | AgentOrg and retained Team hierarchy presentation | Normalize/fold five Agent states and render one accessible Team dot; subject adapters provide exact branch/status source | Prevents duplicated precedence/a11y policy and any temptation to persist/poll a Team status. |
| Terminal task settlement | DS-005, DS-015, DS-022 | Team/Org root task owners plus AgentRun/local execution | Atomically try to prepare only a quiescent exact execution; defer without side effects or waiting and retry on existing idle events; keep the existing durable prepared-settlement transaction | Prevents a supported provider-turn overlap from starving unrelated commands without creating a second cleanup owner; root interrupt releases legitimate approval waits before shutdown drain. |
| AgentOrg launch form projection | DS-003, DS-012, DS-023 | Org config store and accepted Team editor components | Convert strict fixed-depth Org/Team definitions plus exact sparse patches into Team presentation nodes/count/state and typed edit commands | Prevents a second Team editor while keeping Org state/API ownership distinct. |
| Canonical Org launch patch | DS-012, DS-023, DS-024 | Org config store/projector/command adapter | Preserve one sparse intent representation; materialize dependent config clear; assert client/server/snapshot equivalence | Prevents omission/null drift or duplicated resolver semantics. |
| Unified Workspace history | DS-008, DS-013, DS-019, DS-025 | Mixed history projector and stable left panel | Ordered tagged categories, retained UI state and typed root actions | Prevents route-specific competing history/runtime owners and false disappearance. |
| Root workspace selection | DS-003, DS-012, DS-026 | Shared workspace catalog/policy and Org root draft | Select actual available default once; preserve explicit choice and exact inheritance | Prevents hard-coded paths and descendant defaults. |
| UI accessibility/presentation | DS-001-DS-003, DS-008, DS-011-DS-013, DS-023-DS-026 | Web owners | Approved Product packages plus RER-024 continuity/default/equality, focus, narrow, keyboard, disclosure and validation | Prevents mock/prototype orchestration entering domain and preserves the established AgentTeam interaction grammar. |
| AgentOrg derived history summary | DS-027 | Org command, history catalog, mixed history read, startup migration | Qualify exact configured accepted SEND_MESSAGE, serialize first write, refresh authoritative family, conservatively infer only unique legacy evidence | Prevents task/system traffic, optimistic UI, trace fallback, and multiple summary owners. |

## Ownership Boundaries

AD-REV-026: typed immutable input reference values serve existing native/external memory writers; same-row raw facts serve existing history/page owners; file-resource ownership is unchanged. See DS-044–046 for the complete boundary contract.

AD-REV-025: Context Files owns attachment identity/movement, strict stored-only location owns membership/ancestry, and captured active-target/submission own frontend intent. DS-041/042 forbids address-ranking and lifecycle activation at file-read boundaries.

AD-REV-021: DS-034 keeps item detail pure, navigation at the existing section/root action boundary, data in existing facets/adapters, and disclosure state local.


AD-REV-020: DS-031–033 retain subject services/providers as normal definition
owners and admission as availability owner. Only registered migrations may
consume prior-format knowledge; data-root migration cannot rewrite external or
repository-owned packages. See its concrete file/dependency table.

Definition services return validated immutable definitions; planners never read
raw files/providers. Each run service calls only its own manager. Each manager
owns its own active registry, aggregate factory, and persistence coordinator.
Upstream callers do not call a subject manager and its store/index together.

Source discovery precedes subject decoding. `DefinitionSourceRegistry` supplies
the source class and path; `DefinitionAdmissionService` selects exactly one
target codec from registered family/path metadata and computes dependency
availability. Subject catalogs consume only its available results. Migration
uses the same source descriptors but a separate server-owned-only legacy
decoder; external descriptors are structurally incapable of reaching a writer.
Runtime restore/history bypass live definition admission and select their strict
store from the durable family identity.

`AgentOrgRun` and `RootTeamRun` are peers, not variants behind a shared public
aggregate. Both compose the AD-REV-005 internal execution plane through
root-specific adapters. `ConfiguredAgentExecutionHandle`,
`FlatTeamExecutionFactory`, task/message record engines, tagged identities and
the physical writer own only semantically common local mechanics; none can read
or mutate a root tree/store/registry. Team/Org adapters close over their exact
index, mutators, sidecars, persistence coordinator and publisher. No shared base
may expose optional coordinator/root fields. `AgentOrgRun` alone owns direct
configured TeamRun handles. `RootTeamRun`/`TeamRun` cannot. Above the root
boundary, callers use only the subject aggregate/service; they cannot acquire an
adapter, local TeamRun, Agent handle, engine or subject store.

`ActiveCollaborationRootDirectory` is below process composition and beside the
subject managers: managers register/unregister their already-owned roots by
compound identity; the global exact-Agent router may query only its narrow live
message boundary. The directory cannot create/restore/stop roots and cannot
return a concrete aggregate. `AgentRunManager` remains the exact AgentRun
registry. This two-index composition is intentional, not competing lifecycle
authority.

`AgentOrgExecutionContext` is the sole browser owner of one active Org
snapshot, its per-Agent `AgentContext` map, mounted-Team presentation adapters,
stream sequence/recovery and nullable focus. `rootExecutionViewStore` may expose
mixed route/history selectors over that context but cannot retain another Org
tree or opaque events. `useActiveContextStore` is the authoritative component
facade for the exact active presentation target and interaction port. Center and
right-side components cannot call subject stores, stream services or sockets
beside that facade. `AgentOrgWorkspaceView` is a thin focus router, not a
conversation/event/root-lifecycle owner.

The server Agent presentation boundary sits between raw Agent execution and
subject publication. The root-neutral adapter owns raw-event validation and
normalization; Team/Org serializers own outer root/sequence/identity fields.
Neither Vue nor a browser store accepts raw AgentRun domain objects. The Org
member projection service reads through exact Org locations; it never calls the
Team member service for a mounted Team.

Communication durability and presentation remain separate but correlated.
`RootCommunicationEngine` owns the one message/reservation lifecycle; the
subject adapter owns durable commit ordering; `AgentOrgRun` alone classifies
both committed endpoints and emits exact receiver presentation for every admitted
pair. In the browser,
`AgentOrgExecutionContext` owns the one Org sidecar snapshot and constructs a
read-only Messages and Tasks facets for the selected exact Agent execution. The shared Agent or
Team surface consumes that facet; `TeamWorkspaceContextView` supplies only
Team identity/roster/header presentation and cannot narrow root Messages or
participant Tasks.

The Team V2 store and Org V1 store are both current. A mixed projection facade
requires explicit kind and routes to the corresponding subject query/manager or
history store; it cannot scan paths, inspect coordinator presence, or try both
validators. The migration alone may decode organization-like Team Run V2 and
server-owned retired recursive definitions.

Configuration and focus are separate. The server resolver owns effective launch
settings and complete activation. Web focus is local, nullable for Org, exact,
and absent from both durable families. An exact member history row selection may
focus because the row click is explicit; a root open remains unfocused.

AgentOrg and AgentTeam launch drafts also remain separate even where their Team
presentation is identical. `agentOrgRunConfigStore` is the only owner of the Org
root draft and exact Team/Agent sparse maps. Its pure projector may read admitted
Team definitions and emit the existing Team form view models, but the shared
disclosure/edit components receive only values and typed commands. They cannot
import either run-config store. The Org command adapter alone translates those
commands and serializes the existing Org `teamOverrides` / `agentOverrides`
input. `teamRunConfigStore`, `TeamRunConfig`, and Team launch serialization are
not dependencies of the Org path.

Within that Org path, `agentOrgRunConfigStore` accepts only canonical placement
patches. `canonicalizeAgentOrgPlacementLaunchPatch` is the singular owner of the
dependent model-config clear rule; `AgentOrgRunConfigPanel` does not hand-roll
object spreading and the shared Team editor does not decide wire semantics.
The pure form projector and launch serializer consume the same canonical map.
The server resolver remains an independent authoritative validator, and
cross-layer fixtures prove semantic equality rather than coupling web code to a
server implementation.

Workspace/history has separate data-projection and presentation-state
boundaries. One mixed workspace-history read owner loads and strictly projects
subject rows, owns family-scoped errors, grouping, stable row keys, and explicit
category order. One always-mounted `WorkspaceAgentRunsTreePanel`, through its
single `useWorkspaceHistoryTreeState` instance, owns expansion/reveal/highlight
continuity; its persistent scroll container owns scroll position. The existing
selection store supplies selected identity but does not own tree presentation.
Subject histories and active contexts supply tagged rows, while typed action
ports delegate lifecycle back to Agent, Team, or Org stores. The unified read
model never owns an AgentOrg execution context or root lifecycle, and the router
never selects a different history owner. `AgentOrgRunHistoryPanel` is removed.

The workspace catalog owns available workspace records and default eligibility.
The AgentOrg config store owns the root's selected draft record/path. The shared
selector applies the existing root-only default policy; descendant Team/Agent
editors receive projected effective workspace and cannot independently default
or mutate the root.

Definition authoring and runtime compilation are separate. The subject service
validates and commits one complete candidate under expected revision. Runtime
compilers consume saved immutable snapshots and never repair/reorder/write
handoffs.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| DefinitionSourceRegistry | source root registration/class/mutation owner/path | admission, migration planner | infer writability from ID/refScope or scan arbitrary roots | Add typed descriptors and allowlisted root adapters. |
| DefinitionAdmissionService | target codec dispatch, stable diagnostics, dependency closure, available catalog projection | subject catalog resolvers, diagnostics API, launch/authoring gates | call legacy decoder, mutate source, filter runtime history | Add `scan()` / `requireAvailable(kind,id)` methods. |
| AgentOrgDefinitionService | Org resolver/provider/ref queries/candidate validation | GraphQL, tools, import/UI backend | Write Org files then validate/rollback | Add preview/validate/update method. |
| AgentTeamDefinitionService | Flat validator/provider/Agent resolver | GraphQL, tools, import/application | Accept child Team then rely on launch rejection | Strengthen typed candidate/input. |
| DefinitionPackageTransaction | Normal authoring lock/revision/complete package staging/atomic publication/recovery | Subject DefinitionServices only | Per-file writes, UI last-write-wins, or migration reuse | Add `commit(candidate, expectedRevision)`. |
| AgentOrgRunService | config resolver/Org planner/Org manager | GraphQL/application Org launch | Caller uses planner/manager/store directly | Add typed create/restore/stop method. |
| AgentTeamRunService | Team config/Team planner/Team manager | GraphQL/application Team launch | Caller uses manager/store directly | Add typed Team method. |
| AgentOrgRunManager / AgentTeamRunManager | subject registry/factory/package loader | Respective run service, explicit-kind projection adapter | One caller queries manager plus store | Add subject query/snapshot method. |
| AgentOrgRun / RootTeamRun | subject index/task/message/event/persistence coordination | tools/stream/live queries through subject boundary | Caller reaches inner TeamRun/AgentRun manager | Expose exact root operation. |
| ConfiguredAgentExecutionFactory | AgentRun candidate/local command/event mechanics over explicit tagged member/scope | Subject root assembly and local Team factory only | Handle imports RootTeamRun/AgentOrgRun, subject store/index/event, or infers root | Add a mandatory callback/capability input; keep subject translation above. |
| FlatTeamExecutionFactory | One Agent-only Team local plane plus task descendants | Subject root assembly and task-host capability | Create root package, register manager root, or materialize configured child Team | Accept explicit root identity/scope/callbacks; expose task/local facade only. |
| RootTaskLifecycleEngine / RootCommunicationEngine | Task mutation/settlement policy and message lifecycle policy | Subject adapters owned privately by root aggregate | Engine imports subject tree/store/manager; settlement waits on a non-quiescent execution; caller holds an internal owner beside root | Strengthen the subject adapter and AgentRun non-waiting preparation; never expose internal owners publicly. |
| ActiveCollaborationRootDirectory | compound live root -> narrow message/query capability | Subject managers register; global router reads | Directory creates/stops roots or returns concrete aggregate; bare ID lookup | Require `RootExecutionIdentity`; keep lifecycle in manager. |
| CollaborationExecutionLocationService | explicit Team/Org Agent location projection | memory/context/run-file/identity services | Try-both inference or direct Team-only scan for mixed Agent | Require compound root for root-scoped queries and enforce unique AgentRun result. |
| Team V2 store / Org V1 store | exact schema/path/atomic writer | Respective persistence coordinator, migration target validator | Runtime reads JSON or wrong family | Add strict subject method. |
| RootRunPackageReadinessIndex | family/path/target-manifest readiness and compound identity availability | subject run services, history/stream catalog rebuild | Decode legacy content, transform packages, or invoke both stores | Add `requireAvailable(kind,id)` and current-only rebuild methods. |
| RootExecutionProjectionService | explicit-kind dispatch and tagged DTO | mixed history/stream/GraphQL | Infer kind or mutate root | Add explicit compound identity/result branch. |
| CollaborationAgentPresentationAdapter | Validate raw AgentRun/member input/status/readiness and produce strict presentation message or rejection | Team/Org subject callback adapters | Subject/projector/component parses raw AgentRun payload independently | Extend one strict presentation type/adapter and subject serializer. |
| AgentOrgExecutionContext / AgentOrgStreamingService | Strict Org topology/tasks/messages/statuses, AgentContext map, sequence/recovery, nullable focus | Org route/history/focus and active-target resolver | Root store also retains tree/raw events; component owns socket/parser | Context owns selectors; context store composes interaction/continuation ports and candidate publication under DS-035–037; transport owns protocol only. |
| AgentOrg communication post-commit adapter / AgentOrgRun | One durable message plus root and exact receiver publication | RootCommunicationEngine through Org-private adapter | Duplicate/pre-commit event, task-kind filter, browser synthesis | Callback carries committed record/input; root resolves exact identities. |
| CollaborationMessagesContextView | Read-only selected participant over root sidecar/retained index | Exact workspace target and shared UI | Socket/store/delivery or Team/kind filter | Explicit root/run/selected ID, closed task identity shape. |
| ActiveAgentWorkspaceTarget / useActiveContextStore | Exact active AgentContext, interaction port, browse subject, optional Team presentation view and optional owning-root Messages facet | Agent/Team shared center and right-tool components | Component imports Org/Team run stores, contexts and stream directly | Strengthen subject adapters behind the facade. |
| Shared AgentWorkspaceSurface / TeamWorkspaceSurface | Accepted header/event monitor/composer presentation over explicit props/ports | Standalone wrappers and AgentOrg focus adapter | Surface reads global subject selection/store or renders raw payload | Add explicit presentation/action/interaction inputs. |
| AgentOrg history root stop action | Whole-root termination UI command/pending/error | Active Org root row | Focused member header or mounted Team action terminates root | Reuse history root action pattern and AgentOrgRunStore. |
| AgentOrgTeamBranchStatusProjector | Exact configured Team branch traversal plus live/history status-source admission | AgentOrg hierarchy row builder only | Component scans visible rows, includes sibling/root branches, reads stores directly, or invents Team status state | Require exact Team node and injected `statusForAgentRunId`; delegate normalization/precedence to shared fold. |
| TeamAggregateStatusDot / fold | Pure five-state normalization, precedence and accessible dot grammar | Team-history and AgentOrg branch adapters | Own topology, transport, polling, root lifecycle or subject-store lookup | Keep inputs to values + authority; subject adapters remain authoritative for membership/source. |
| `agentOrgRunConfigStore` + Org form command adapter | Org root/Team/Agent sparse draft, exact patch commands, existing GraphQL serialization and scoped errors | AgentOrg launch route and form | Import Team run store/payload, mutate Team definition, treat disclosure as state authority, or compute server-authoritative effective plan | Add exact address-scoped Team/Agent commands and one launch-input projection. |
| `projectEditableAgentOrgRunFormModel` | Strict one-level presentation projection, exact Agent count, Team/coordinator/member correlation and diagnostics | AgentOrgRunConfigPanel | Write a store, silently omit invalid references, create nested nodes, or serialize API payload | Return a closed success/diagnostic result over admitted definitions and current draft. |
| `MemberOverridesDisclosure` / Team form editors | Established disclosure, labels, responsive/a11y rendering and typed edit events | TeamRunConfigForm and AgentOrgRunConfigPanel | Read either store, decide patch identity/inheritance, launch, or own lifecycle | Keep props/view models explicit and emit commands to caller. |
| `canonicalizeAgentOrgPlacementLaunchPatch` | Canonical sparse Team/Agent patch, including explicit dependent model-config clear | AgentOrg config store, projector and launch mapper | Query catalogs, resolve server authority, retain a parallel raw patch, or mutate Team store | Pure/idempotent; omission stays inheritance except owned runtime/model without owned config becomes `llmConfig:null`. |
| Mixed workspace-history projector | Load/strictly decode tagged subject slices and group stable-keyed rows into one ordered workspace/category model | WorkspaceAgentRunsTreePanel | Own expansion/reveal/highlight/scroll, subject runtime/focus/lifecycle, infer root kind, or react to current route | Preserve stable row identity; Orgs is a distinct sibling directly below Teams. |
| `WorkspaceAgentRunsTreePanel` + one `useWorkspaceHistoryTreeState` instance | Expansion, ancestor reveal, selected-row highlight and scroll continuity for the mounted left tree | AppLeftPanel plus row/section components | Load/project history, own subject selection identity/runtime/lifecycle, or create a second instance per route | Keep one component/controller instance mounted; consume stable row keys and the existing selected-identity signal. |
| `WorkspaceHistorySubjectActions` | Typed subject browsing/stop/archive/delete delegation; Org continuation belongs to the context-store Send boundary | Unified Workspace history components | Expose concrete stores in row components or permit mounted-Team lifecycle | Require explicit subject kind/root ID and call only the matching subject store. |
| Shared root workspace-selection policy | Select actual available Temp default only for untouched fresh root drafts | Team/Org root config adapters | Hard-code a path/label, focus a member, or default descendant scopes | Workspace catalog supplies records; explicit user selection wins. |
| RootExecutionView facade (web) | mixed route/history selectors over subject context | workspace/history components | Own a second Org tree/raw event log or parse payload | Delegate to AgentOrgExecutionContext; no opaque events. |

## Dependency Rules

1. New-work definition catalog/launch/authoring -> DefinitionAdmissionService ->
   exact subject query/service. Definition writes -> subject service ->
   source-authorized provider. Mixed runtime/history read -> explicit-kind
   projection service -> subject query boundaries; it does not depend on
   definition admission.
2. AgentOrg definitions query AgentTeam identity/content through the public Team
   query boundary only; no mutation, clone, or Team provider dependency.
3. Collaboration address/handoff compilers depend on resolved topology records,
   not providers or GraphQL types.
4. AgentTeam definition/runtime code does not import Org member/root types to make
   Team generic. Both roots import only the tagged internal execution capabilities;
   AgentOrg composes `FlatTeamExecutionFactory`, never Team root manager/store.
5. Team V2 and Org V1 schemas compose common persisted-record validators but do
   not import each other's root schema/store/path.
6. `AgentOrgRun` may own direct configured `TeamRun`; `TeamRun` owns direct
   configured Agents and task TeamRun descendants only, never a configured
   TeamRun or root package.
7. Task/message engines and Agent tools use tagged root/member/host identities
   internally. Team and Org adapters alone see their tree/index/mutator/store;
   approved root-specific on-disk field spelling remains confined to each strict
   versioned sidecar/tree codec.
8. Mixed GraphQL/stream/web types require `root_subject_kind`; subject-only Team
   types may remain compatible. No client inference from tree shape.
9. History topology comes from persisted snapshot, never current mutable
   definition. Subject indexes are derived and rebuildable. Live restore,
   history, and stream discovery require `RootRunPackageReadinessIndex` before
   the already-selected strict subject store is called; no subject manager
   bypasses a cross-family conflict or retired-authority residue.
10. Migration may import its isolated legacy codecs, existing atomic current-file
    writer, and current target validators. No current service imports migration.
    Migration rejects `external_read_only` descriptors before any write and does
    not call the normal definition-package transaction or add a recovery owner.
11. Web preview may share pure merge functions; server recomputes/validates the
    authoritative effective plan.
12. Org and Team draft stores are separate. Shared handoff components accept an
    owner-provided endpoint catalog/commands only.
13. Focus is absent from launch commands, durable schemas, root lifecycle, and
    history authority.
14. Target definition codecs never call migration decoders or normalize unknown
    keys. Dependency unavailability is propagated as data, not a partial Org.
15. `ConfiguredAgentExecutionHandle` and `FlatTeamExecutionFactory` depend downward on AgentRun/workspace/memory capabilities and upward only through injected callback ports; they never import a root aggregate, subject manager/store/index/publisher, or GraphQL/stream type.
16. Subject managers alone register compound roots in `ActiveCollaborationRootDirectory`. The directory may expose only a narrow active message/query boundary; global routing cannot use it to create, restore, stop, or cross-address roots.
17. Root-neutral physical location dispatch requires the tagged root kind. Relative TeamRun ancestry is opaque physical lineage and cannot be used to infer configured topology.
18. General-process composition constructs AgentRun infrastructure -> locations/directory/factories -> Team manager -> Org manager -> services, and tears down Org -> Team -> Agent before reverse release. Application scopes remain Team-only in public capability.
19. Raw `AgentRunEvent`/`CollaborationAgentExecutionEvent` may flow only into `CollaborationAgentPresentationAdapter`; subject publishers and transport projectors consume the validated presentation result. Web contracts/components never import raw server domain events or accept `unknown` event payloads.
20. `@autobyteus/agent-presentation-contracts` is lower than both Team and collaboration stream packages. It owns message details only and cannot import root/team/org snapshots. Team and Org packages add their own root, sequence, member identity and token-root correlation without changing Team wire.
21. `AgentOrgExecutionContext` owns Org browser state. `rootExecutionViewStore`, history and workspace depend on its public selectors; none keeps a parallel Org tree/event array. The context depends on Org hydration/stream services, which depend on strict contracts and existing Agent message handlers.
22. Shared Agent/Team workspace surfaces depend on explicit presentation/action inputs and the active-context facade. Standalone wrappers and Org focus adapters may build those inputs; the surfaces cannot import selection, subject contexts, run stores or sockets.
23. Org member projection/trace/token queries require `{orgRunId, memberAddress, agentRunId}` and strict Org location correlation. A mounted Team never calls Team-root history/token APIs with its local TeamRun ID.
24. Root termination is available only through subject root services/stores. Mounted Team presentation exposes no terminate capability; focused member headers expose none.
25. AgentOrg Team-branch projection depends on the strict Org tree and public AgentOrgExecutionContext selectors; it must not import WebSocket/GraphQL clients, Team root stores, current definitions, or visible-row expansion state. The shared fold/dot depends only on AgentStatus/presentation utilities and localization.
26. Live status authority exists only for an active run with the exact Org context active in `phase=live`. Historical/terminal projection cannot retain running/initializing; absent or unrecognized values are offline. Neither adapter may request or persist a Team aggregate.
27. `RootTaskLifecycleCommandQueue` may invoke settlement only through a
    non-waiting adapter preparation. It must never call waiting
    `prepareTermination()` for an execution with unresolved input/provider work;
    `null` is normal deferral and releases the FIFO.
28. `AgentRun.tryPrepareTerminationIfQuiescent` owns the atomic lifecycle/input
    check and admission close. It returns no token/state on deferral and reuses
    the existing prepared termination on success. Subject adapters do not infer
    quiescence from a racy status read.
29. Existing Team/Org Agent idle/offline events reschedule terminal settlement.
    No polling, timeout, replay, second queue, or persisted settlement state may
    substitute for that event-driven retry.
30. Subject root shutdown must close/drain the admitted operation/materialization
    publication gate, freeze its stable complete owned scope, and complete each
    AgentRun input/provider-start/interrupt fence before it waits for general
    task mutation or settlement drains. Process-level order remains Org ->
    standalone Team -> residual Agent; neither process nor root shutdown may use
    a provider timeout, replay, force-kill policy, or new persisted task state.
31. AgentRun input claim/provider-start registration and
    `rootShutdownFenced` are serialized by the same dispatch owner. A start that
    loses the fence cannot call the backend; one that wins remains tracked until
    canonical failure/interruption/terminal state. No root, handle, status
    adapter, or task engine may infer this from `activeTurn` alone.
32. Root-shutdown cancellation reuses the current input lifecycle: never-admitted
    reservation invalidation is silent, admitted pre-forward work emits the
    existing cancellation fact once, and provider-started work is never
    mislabeled cancelled. Ordinary non-root preparation remains FIFO-draining;
    a later prepared cancellation cannot reopen root-fenced admission.
33. AgentOrg launch presentation depends `AgentOrgRunConfigPanel ->
    agentOrgRunConfigStore/projectEditableAgentOrgRunFormModel -> shared
    disclosure and Team presentation components`. Edit events return to the Org
    command adapter. No shared component imports an Org/Team store, and the Org
    path never imports `teamRunConfigStore` or Team launch payload serializers.
34. The Org projector accepts only the already-admitted fixed-depth Org plus
    referenced flat Team definitions and exact sparse draft. Missing or
    inconsistent reference/member/coordinator/address correlation returns one
    blocking typed diagnostic; it may not silently omit, normalize, clone, or
    synthesize a placement.
35. Team `Inherited`/`Customized` and mounted-Team Agent
    `Inherited`/`Overridden` labels are exact-scope-local; the direct Org Agent
    row preserves its already-approved behavior. The
    browser may project inherited values for explanation, but only the server
    `CollaborationLaunchConfigurationResolver` determines and validates the
    effective launch plan. Collapse state is presentation-only and cannot change
    sparse patches or the launch input.
36. `agentOrgRunConfigStore` canonicalizes Team/Agent patches before storing
    them. The form projector and `toAgentOrgRunLaunchInput` read that one map;
    neither reconstructs omission/null semantics. An owned runtime/model with no
    owned model config carries `llmConfig:null`. The server resolver remains
    independently authoritative and never imports web policy.
37. `AppLeftPanel` depends on exactly one `WorkspaceAgentRunsTreePanel`; it does
    not branch on route/root kind to select a history component. The mixed read
    owner depends on tagged subject histories and owns stable-keyed grouping/
    order only. The panel depends on that read model, its single tree-state
    controller, and typed subject actions. The controller depends only on stable
    row keys plus the existing selected-identity signal. None depends on concrete
    active-context internals or current route.
38. Workspace category projection preserves all existing categories and places
    `Orgs` immediately below `Teams`. An Org root remains tagged Org; a
    mounted Team remains a child presentation node and cannot enter the Teams
    root collection.
39. Root workspace default selection depends on the shared available workspace
    catalog and untouched-draft state. Descendant Team/Agent projection depends
    on the root value plus exact supported override; no descendant control owns
    default discovery or changes recipient focus.
40. The Org WebSocket handler depends on an injected narrow
    `AgentOrgRunService` surface (`getActive`, `recordRunActivity`), never a
    separately constructed manager/catalog. `AgentOrgRun` returns the unchanged
    command result with exact indexed execution kind; the handler filters only
    summary eligibility after acceptance; the catalog owns runtime sequencing
    and current rows, while the shared writer owns compaction and first-write
    persistence. Task-scoped command admission is unchanged.
41. Current Org history runtime and web reads must not import the migration
    classifier. The registered migration may depend on current strict tree,
    location, complete-trace, sidecar-read and shared summary-writer capabilities;
    those current owners do not depend on migration code.
42. The web command service emits only an accepted-message notification. The
    mixed history read owner performs the authoritative query and newest-
    generation slice commit; the Org context, command store, row component and
    tree-state controller may not own or optimistically synthesize summary text.
43. Live first-write order derives only from accepted-result completion followed
    by immediate catalog-queue enqueue. No socket-arrival timestamp, address,
    client text patch, trace timestamp, or second lock/sequence owner may decide
    the live winner.
44. `RootCommunicationEngine` depends only on its subject adapter. After the
    adapter's durable commit, `AgentOrgRun` owns both-endpoint identity
    correlation and all-admitted-pair root/member presentation publication;
    the engine and browser cannot classify, publish, or infer that effect.
45. An Org member-input presentation event must follow the corresponding root
    communication event and precede input release. Both events reference the
    same committed record/input identity but advance the Org sequence
    independently. Rejected or uncommitted attempts publish neither.
46. `ActiveAgentWorkspaceTarget` composes presentation facets explicitly.
    Every selected configured/task Org Agent carries root Messages and Tasks
    facets; actual Team members additionally carry their genuine Team view.
    Neither facet imports or owns the other.
47. The AgentOrg message projector depends only on the strict Org context's
    complete retained exact execution index and communication sidecar snapshot. It
    cannot depend on visible hierarchy rows, the selected Team, current
    definitions, Team stores, GraphQL/WebSocket clients, or address basenames.
48. `RightSideTabs`, desktop panels and narrow drawers depend on the target's
    Messages facet, not on Team target kind. The shared presentation may label
    the owning root truthfully, but it cannot add a route, ledger, store,
    lifecycle action, or browser-synthesized member event.

Forbidden shortcuts:

- No generic persisted root V3, `collaboration_runs` path, optional-coordinator
  root blob, or `AgentOrgDefinition extends AgentTeamDefinition`.
- No configured recursive `members` under Team, configured-child Team handle,
  injected synthetic Team context for Org Agents, or reuse of task factories for
  configured membership.
- No normal reader that tries both stores, scans both family paths for an ID,
  auto-moves/retypes payload, or infers kind.
- No caller depending on a subject service/manager and its provider/store at the
  same level; no caller above a root aggregate holds its task/message adapter,
  local TeamRun, configured-Agent handle, or lifecycle engine.
- No pre-launch Org entry/focus, fallback recipient, global logical-address lookup,
  bare-ID root-kind lookup, Team
  copy, client-authoritative launch plan, last-write-wins definition save,
  per-handoff write, or stale-handoff auto-repair.
- No `AgentOrgExecutionActivator` catch-all, fake `RootTeamRun`, Team-family
  sidecar/package for an Org, independent mounted-Team root registration, or
  direct Org Agent launched as a standalone AgentRun outside the Org aggregate.
- No `z.unknown`/`any` AgentOrg live event, opaque browser event list, `JSON.stringify`/generic object card, custom Org conversation/composer, or component-owned protocol formatting.
- No direct Org stream/store/socket call from `AgentOrgWorkspaceView`, input components, tool cards or right panels; all actions use the exact active-target interaction port.
- No mounted Team inserted into `AgentTeamContextsStore`, no Team-root trace/token API called for an Org member, no independent mounted-Team stop, and no `Stop Org` in a focused member header.
- No Team aggregate field in Org V1/sidecars/GraphQL/WebSocket, no status polling, no store-owned Team status cache, no fold over only visible rows, no sibling/direct-Org leakage, no stale historical running/initializing pulse, no replacement of exact Agent dots, and no reuse of binary `TeamActivityDot` as the five-state aggregate.
- No waiting provider quiescence preparation for a non-quiescent execution
  inside a task mutation FIFO closure; no racy status precheck outside AgentRun;
  and no root shutdown that drains task work before completing the frozen scope's
  AgentRun input/provider-start/interrupt fence.
- No timeout/replay/force-kill task recovery, new persisted `settling` status,
  reopening of a terminal task, support for self-review, or API/tool/result
  change. Do not implement the blocked AD-REV-008 coordinator/token/dependency
  design as an alternate path.
- No bespoke AgentOrg mounted-Team override editor, always-expanded Team child
  list, implicit inherited state, Team-as-Agent fabricated view node, Team run
  config-store import, generic Team/Org draft, or browser-authoritative effective
  configuration. No retention of the superseded layout behind a flag.
- No hand-written Org object spread that drops a dependent `llmConfig:null`, no
  parallel raw/canonical patch maps, no client preview semantics that differ
  from request semantics, and no server heuristic that guesses a clear from a
  changed model.
- No route-selected `AgentOrgRunHistoryPanel`, duplicate Org history state,
  whole-panel swap, Org roots under `Teams`, or mounted Teams registered as
  standalone history roots. Do not keep the obsolete panel as fallback.
- No hard-coded Temp Workspace path/label, Org-specific workspace catalog,
  descendant auto-default, silent unavailable-path fallback, or workspace
  selection that creates focus or mutates a definition.
- No AgentOrg communication copy under a mounted Team, same-Team-only
  counterpart filter, direct-Agent Messages omission, Team-kind-only tab gate,
  second Org message store/ledger, browser-fabricated MEMBER_INPUT_MESSAGE,
  or pre-durable presentation event.

### AD-REV-015 Dependency Direction

```text
AgentOrgStreamingService
  -> AgentOrg WebSocket handler
      -> AgentOrgRunService.getActive
          -> AgentOrgRun.executeAgentCommandWithExecutionKind
      -> AgentOrgRunService.recordRunActivity
          -> AgentOrgRunHistoryCatalogService.recordRunSummary
              -> shared AgentOrgRunHistorySummaryWriter
                  -> current atomic AgentOrg history index store

accepted SEND_MESSAGE ACK
  -> injected accepted-external-message callback
      -> mixed run-history read owner
          -> existing AgentOrg history query/strict decoder
              -> AgentOrg family slice
                  -> existing history row renderer

registered AD-REV-015 migration
  -> strict current Org tree/location/trace/sidecar readers
  -> migration-only provenance classifier
  -> shared AgentOrgRunHistorySummaryWriter before supervisor construction

current runtime/catalog/web read owners -X-> migration classifier
row components/tree-state owner -X-> submitted text or history mutation
```

### AD-REV-019 Dependency Direction

```text
RootCommunicationEngine -> Org-private durable adapter -> AgentOrgRun
  -> root communication event -> exact receiver presentation -> input release
RootTaskLifecycleEngine -> task record/event
  -> separate exact Agent input -> accepted-input adapter -> recipient presentation
Org API -> AgentOrgRunService -> manager coherent snapshot / strict stores
  -> execution-view projector -> one Org context and retained execution index
    -> Messages facet + Tasks facet -> active/readonly exact target -> shared UI
Team adapter -> existing Team selector -> same Tasks/Messages presentation facets

components -X-> sidecar/store/socket/command policy
Team view -X-> root Tasks or Messages ownership
source definition/address -X-> selected task identity/provider binding
Tasks record -X-> fabricated delivered notification/communication
```


## Interface Boundary Mapping

AD-REV-026 / DS-045 adds fileAttachments in existing conversation/memory reads and replaces user page-attachment mediaType with fileType/fileName. Request/ACK/root schemas do not change; genuine media visuals remain mediaType.

DS-041 defines the closed exact Org owner and current REST URL contract. Its root + AgentRun pair replaces Org address-only draft/final identity; no other family API changes.

AD-REV-021: DS-034 changes only UI projection/selection events; no public API or persistence contract.


AD-REV-020 removes expectedSchemaVersion from the existing definition diagnostic
DTO/GraphQL object and uses unversioned expectedFamily, as specified in DS-031.
Create/update domain inputs, execution APIs and runtime discriminators remain.

| Interface / Method | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `DefinitionSourceRegistry.list()` | Source ownership | Return allowlisted package roots with explicit source class/mutation owner | descriptor + canonical paths | No decoding and no ID-based write inference. |
| `DefinitionAdmissionService.scan/requireAvailable` | New-work admission | Exact target decode, stable rejection, dependency closure | subject kind + definition ID or source descriptor | No legacy retry/write; history does not call it. |
| GraphQL `definitionAdmissionDiagnostics` | Operations | Inspect unavailable packages/dependencies | source root + definition path/ID + expected family/version | Actionable owner message; external incompatibility is not readiness failure. |
| `AgentOrgDefinitionService.create/update/get/list` | Org definition | Complete Org/ref/handoff CRUD | Org definition ID; explicit Agent/Team refs; expected revision | No coordinator; typed candidate/conflict result. |
| `AgentTeamDefinitionService.create/update/get/list` | Team definition | Complete flat Team/local-handoff CRUD | Team definition ID; Agent refs only; expected revision | Coordinator is exact direct Agent. |
| `DefinitionEndpointCatalog.project(candidate)` | Handoff choices | Eligible exact From/To and Team coordinator metadata | subject kind + complete candidate | Server validator authoritative. |
| `CollaborationHandoffCompiler.compileOrg/compileTeam` | Runtime handoff snapshot | Fixed-depth effective ordered edges | resolved Org or flat Team | Org saved order first, then Team-local saved lists in stable Org member order; no later reorder. |
| `CollaborationLaunchConfigurationResolver.resolveOrg/resolveTeam` | Launch config | Produce complete effective settings | root config + unique exact patches | No focus/definition mutation. |
| `AgentOrgRunService.create(command)` | Org launch | Validate/activate full Org scope | `{agentOrgDefinitionId, rootConfiguration, teamOverrides, agentOverrides}` | Returns `{agentOrgRunId}` only. |
| `AgentTeamRunService.create(command)` | Team launch | Native coordinator-led flat Team | `{agentTeamDefinitionId, rootConfiguration, agentOverrides}` | Returns Team run ID; existing result naming may remain. |
| `AgentOrgRunManager.restore(orgRunId)` | Org runtime | Restore exact Org V1 | Org run ID already known as Org | Calls only Org store; no guessing. |
| `AgentTeamRunManager.restore(rootTeamRunId)` | Team runtime | Restore exact Team V2 | Team run ID already known as Team | Calls only Team store. |
| `ConfiguredAgentExecutionFactory.create(input)` | Internal Agent execution | Prepare/restore one configured or task Agent under its owning root | tagged member identity + physical scope + mandatory callbacks | Returns handle/candidate mechanics only; no root/store access. |
| `FlatTeamExecutionFactory.materialize(input)` | Internal Team local plane | Materialize one Agent-only Team below explicit root host | tagged root + Team node + physical ancestry | No root package/manager registration/configured Team child. |
| `MemberTaskCommandCapability.*` | Bound Agent tool command | Delegate/submit/review in exact owning root | tagged caller identity; capability carries same root | Tool never resolves `RootTeamRun` or manager. |
| `TaskRootAdapter` (private Team/Org implementations) | Subject task bridge | Resolve host, prepare/commit task mutations, atomically attempt quiescent local preparation, and commit existing `settledAt` transaction | tagged host/task identity and exact record commands | Only root aggregate constructs/owns; `null` preparation is normal deferral with no side effect. |
| `AgentRun.tryPrepareTerminationIfQuiescent()` | Local Agent lifecycle | Under AgentRun dispatch/input authority, return `null` immediately for unresolved work or the existing prepared termination after atomically closing admission | exact AgentRun | Never waits for an active turn and never infers quiescence from UI status. |
| `AgentRun.fenceInputAndInterruptForRootShutdown()` | Local Agent root shutdown | Irreversibly close admission, cancel admitted pre-forward input, serialize provider start, interrupt any provider-started canonical turn, and resolve only at terminal quiescence | exact AgentRun | Idempotent internal method; no task/root identity, timeout, persisted state, or ordinary-preparation behavior change. |
| `ConfiguredAgentExecutionHandle.fenceForRootShutdown()` | Root-neutral Agent forwarding | Await any admitted handle construction and invoke the exact AgentRun root-shutdown fence | exact configured/task Agent handle | Does not translate `NO_ACTIVE_TURN` into phase success; owns no root enumeration. |
| `FrozenTeamRunTerminationScope.fenceAgentRunsForRootShutdown()` | Recursive Team local shutdown | Invoke the configured-Agent fence for the immutable direct/task/prepared handle set and every child task-Team scope | one frozen local Team subtree | Clean-cut replaces `interruptActiveTurns()`; never creates a Team root/package. |
| private AgentOrg frozen termination scope | Org root shutdown composition | Combine exact direct configured/task/prepared Agent handles with mounted/root-task Team frozen scopes | exact AgentOrgRun | Private subject composition; no public generic root/scope API. |
| `RootTaskLifecycleEngine.settle(taskId)` / `onExecutionBecameIdle()` | Shared task settlement | Revalidate terminal leaf, call non-waiting preparation, defer or commit existing prepared settlement, and retry from established idle/offline events | exact task ID within bound root | One FIFO and current record/tree/event semantics remain; no coordinator/token lifecycle. |
| `ActiveCollaborationRootDirectory.get(root)` | Live compound lookup | Return narrow active message/query boundary | `{rootSubjectKind,rootRunId}` | No bare ID, no concrete aggregate, no lifecycle. |
| `CollaborationExecutionLocationService.findAgent(...)` | Mixed physical location | Locate exact Agent memory/history context across two families | compound root when scoped; unique agentRunId when global | Strict subject providers; no try-both payload inference. |
| `AgentOrgRun.resolveRecipient(address)` / `RootTeamRun.resolveRecipient(address)` | Active target | Same-root exact resolution | canonical non-root address | Team address uses coordinator in Org; Team root has Agent destinations. |
| subject root `delegateTask(caller,input)` | Task lifecycle | Authorize/prepare/commit/activate task | exact caller identity + mounted address | No global definition selector. |
| `TeamRunExecutionTreeStoreV2.read/write(rootTeamRunId)` | Team durability | Exact native Team V2 | Team package identity | Existing path/file/keys unchanged. |
| `AgentOrgRunExecutionTreeStoreV1.read/write(orgRunId)` | Org durability | Exact Org V1 | Org package identity | `subjectKind/rootOrg`, no coordinator. |
| `AgentOrgTaskDelegationRecordsStoreV1.read/write(orgRunId)` | Org task sidecar | Strict Org task envelope over exact records | Org package identity | `subjectKind/orgRunId`; Org-specific filename. |
| `AgentOrgCommunicationMessagesStoreV1.read/write(orgRunId)` | Org message sidecar | Strict Org message envelope over exact record bodies | Org package identity | `subjectKind/orgRunId`; no Team envelope reuse. |
| `AgentOrgCommunicationAdapter.commitAppend(...)` | Org message post-commit | Commit one strict snapshot/input, publish the existing root communication, pass the committed message plus receiver input to the Org-owned eligibility callback, and release input | Org run + message/input; exact sender/receiver AgentRun IDs are existing message fields | Called only after successful durable write; engine result/schema and exact-ID task behavior stay unchanged; no endpoint-kind inference, task normalization, address lookup, or duplicate record. |
| `AgentOrgRun.presentCommittedCommunication(...)` | Org receiver presentation | Resolve both committed IDs and publish exact receiver input for every admitted configured/task pair | `{message: CollaborationCommunicationMessageV1, receiverInput: AgentInputUserMessage}` | Existing timestamp/correlation; no second liveness/admission policy, browser synthesis or definition lookup. |
| `AgentOrgRunService.getAgentOrgRunInspection(orgRunId)` | Org retained inspection | Ask manager for one active snapshot or strict inactive package; project existing view DTO | exact OrgRun ID | Readonly; no repair/activation/provider startup. |
| `OrgWorkspaceSelection` | Org presentation selection | Identify exact selected Agent execution or configured Team focus | closed union in DS-029 | null unfocused; source address is not a task selector. |
| `CollaborationTasksContextView` | Root-scoped selected participant Tasks | Expose relevant task rows and existing reference location | root tag/run + exact selected AgentRun | Independent from Team view and Messages facet; no mutation. |
| `RootRunPackageReadinessIndex.requireAvailable({root_subject_kind,root_run_id})` | Current run admission | Enforce one family location, exact target manifest, and selected strict-store validation | compound kind + run ID | No old decode or try-both payload validation; history/live restore enters through this check. |
| `RootExecutionProjectionService.get({root_subject_kind, root_run_id})` | Mixed query | Explicit dispatch and union projection | compound kind + ID | Payload/family/result branch must agree. |
| GraphQL Org surfaces | Org external | Catalog/author/detail/config/launch | Org-specific inputs/results | No entry selector or per-handoff mutation. |
| GraphQL Team surfaces | Team external | Catalog/author/detail/standalone launch | Team-specific inputs/results | Agent-only members; Team-only compatibility where retained. |
| Mixed stream handshake | Mixed root view | Tagged snapshot/events | `{root_subject_kind, root_run_id}` | Team-only stream may remain compatible. |
| Existing application Team ref | Application launch | Continue flat Team resource launch | `{refType:'agent_team', definitionId}` | No application-owned Org surface this round. |
| `CollaborationAgentPresentationAdapter.adapt(identity,event)` | Agent presentation | Validate/normalize one raw collaboration Agent event | tagged member identity + internal event | Returns publish/filter/reject; subject serializer adds root/sequence. |
| `AgentOrgStreamingService.connect/replaceCandidate` | Org browser synchronization | Strict snapshot barrier, typed event reduction, command acks, recovery | exact Org run ID + AgentOrgExecutionContext | No raw event callback or direct component access; ready promise and prepared-send boundary under DS-036. |
| `AgentOrgMemberRunViewProjectionService.getProjection/getActiveTracePage` | Org member history | Hydrate accepted conversation/activity/trace from Org memory | `{orgRunId,memberAddress,agentRunId}` | Strict Org location/snapshot; no Team member service. |
| `ActiveAgentWorkspaceTarget` / `AgentInteractionPort` | Web active interaction | Expose exact context, browse, send/interrupt/tool decision, optional Team presentation, and optional owning-root Messages facet | tagged target branch | Components do not infer subject or call stores/sockets. |
| `TeamWorkspaceContextView` | Team presentation | Read focused member/roster/task-header/coordinator for accepted Team surface | standalone Team root or exact mounted Team adapter | Read-only presentation; messages come from the separate root facet; Org variant cannot terminate/register/persist Team. |
| `CollaborationMessagesContextView.listMessages()` | Root communication presentation | Return stable selected-Agent sent/received rows with exact counterpart/reference identity | `{rootKind,rootRunId,focusedAgentRunId,focusedMemberAddress}` | Team adapter reads Team sidecar; Org adapter reads complete Org snapshot/index; no store/socket/lifecycle method. |
| GraphQL `getAgentOrgMemberRunProjection/getAgentOrgMemberEventMonitorActiveTracePage/getAgentOrgExecutionCheckpoint` | Org workspace hydration/recovery | Subject-specific member projection and stable recovery barrier | Org run + exact address/AgentRun | Fails family/address/run mismatch. |
| Org stream client command union | Org interaction | SEND_MESSAGE, INTERRUPT_GENERATION, APPROVE_TOOL, DENY_TOOL plus typed ack | Org root + exact target AgentRun/command IDs | Dispatches only through AgentOrgRun.executeAgentCommand. |
| `AgentOrgRunStore.terminate(orgRunId)` + `WorkspaceHistorySubjectActions` | Org lifecycle UI | Pending-guarded whole-root termination; on success the caller asks the unified history read owner to refresh | exact Org run ID | The command store owns no history list; no focus/member/mounted Team input. |
| Web `CollaborationFocusController.select(addressOrNull)` | Local focus | Exact selection/send readiness | address in current tagged snapshot | Team row -> coordinator; null never persists. |
| `projectEditableAgentOrgRunFormModel(input)` | Web Org launch presentation | Project one admitted Org plus referenced flat Teams and current sparse draft into exact direct-Agent/Team form nodes, Agent count and blocking diagnostics | Org definition ID/revision + exact addresses | Pure closed result; no store writes, API payload, nested Team, or silent omission. |
| `agentOrgRunConfigStore.set/resetTeamOverride(address, patch)` / `set/resetAgentOverride(address, patch)` | Web Org launch draft | Mutate only one exact scope and preserve sibling/child patches according to approved reset rules | canonical Org member/Team-Agent address | Team reset preserves Agent patches; invalid address rejected. |
| `agentOrgRunConfigStore.setRootRuntimeKind/setRootModel/setRootLlmConfig` | Web Org root launch draft | Maintain one complete coherent root runtime/model/model-config tuple and clear dependent config on root runtime/model change | structural root `/` inside this Org draft | Panel binds events to commands, not writable refs; root launch always serializes owned `llmConfig`, including null. |
| `toAgentOrgRunLaunchInput(draft)` | Web Org launch command | Serialize root plus exact sparse Team/Agent maps to existing GraphQL input | AgentOrg definition ID + address-keyed patches | Includes existing Team `workspaceRootPath`; never serializes disclosure or computed effective values. |
| `canonicalizeAgentOrgPlacementLaunchPatch(patch)` | Web Org launch contract | Materialize the one canonical sparse patch used by preview and request | exact Team or Agent placement patch | Pure/idempotent; preserves owned null/config; owned runtime/model without owned config adds `llmConfig:null`. |
| `projectWorkspaceHistoryByWorkspace(rows)` | Web mixed history read | Strictly combine the existing Workspace Agent/Team result with only the explicit AgentOrg branch of collaboration-root history, then group stable-keyed roots under normalized workspaces and ordered categories | tagged root subject rows + normalized workspace path or explicit no-workspace identity | Orgs immediately follows Teams; legacy null-path Org rows remain in a read-only No Workspace group; no presentation state, duplicate collaboration-history Team rows, current-route input, unchecked JSON cast, or kind inference. |
| `useWorkspaceHistoryTreeState({rows,selectedIdentity})` | Web workspace-history presentation | Retain expansion, ancestor reveal, and selected-row highlight for stable keys during the lifetime of the one mounted panel; the panel retains scroll | ordered stable-keyed row model + existing selected-identity signal | Exactly one instance; no queries/grouping, subject identity mutation, runtime/lifecycle, or route-specific initialization. |
| `WorkspaceHistorySubjectActions.execute(action)` | Web history commands | Delegate an action valid for that exact root kind to its Agent, Team, or Org store | discriminated `{rootSubjectKind, rootRunId, action}` | Org open/select only inspects; deliberate Send owns restore; Stop retains history under DS-035–037. No Org archive/delete is invented. Mounted Team is not a root action target; row components never import all subject stores. |
| `selectDefaultWorkspaceForFreshRoot(catalog,draft)` | Web root config | Choose the actual eligible Temp Workspace only when the current launch-draft epoch is untouched | workspace record ID/path + `draftEpoch` + `untouched/defaulted/explicit` source | Shared Team/Org root policy; same-definition new Run begins a new epoch, retry/error does not; absent default returns none; no focus or path synthesis. |
| `MemberOverridesDisclosure` | Shared launch presentation | Render accessible label/count/adjacent disclosure and preserve slotted draft subtree while collapsed | caller-provided count/control id | Default collapsed; no store, traversal or patch policy. |
| `foldTeamAggregateStatus(statuses, authority)` | Shared web presentation | Normalize/fold five Agent status values under explicit live/history authority | value array + `live\|historical` | Pure; empty/unknown is offline; historical running/initializing is offline. |
| `projectAgentOrgTeamBranchStatus(input)` | AgentOrg hierarchy presentation | Enumerate exact configured/task Agent identities beneath one direct configured Team and resolve their status | configured Team node + authority + exact AgentRun status resolver | No visible-row, focus, store, socket, API, lifecycle or persistence dependency. |
| `TeamAggregateStatusDot` | Shared hierarchy presentation | Render established five-state status dot with accessible Team status name/title | one normalized AgentStatus | Replaces configured-nesting-specific component naming; not `TeamActivityDot`. |
| `AgentOrgRun.executeAgentCommandWithExecutionKind(agentRunId, command)` (internal) | Org exact Agent command observation | Resolve the indexed Agent once, delegate through the unchanged direct/mounted/task path, and return `{result, executionKind}` | Org run + exact AgentRun ID | Existing `executeAgentCommand` maps to `result`; SEND_MESSAGE uses the kind only after acceptance to filter summary eligibility. No command admission change. |
| `AgentOrgRunService.recordRunActivity(run, {summary})` | Org derived history facade | Mirror the established Team service boundary and request first-write summary mutation for the exact active run | exact service-owned AgentOrgRun + accepted external text | Called only after configured command acceptance; derives the history key from `run.orgRunId` and owns no normalization or trace inference. |
| `AgentOrgRunHistoryCatalogService.recordRunSummary(input)` | Org history authority | Under its existing serialized queue, pass current rows to the injected shared writer and replace memory only from the committed result | `{orgRunId, summary}` | Empty/already-set are no-op; missing active-run row is an observable invariant error; create/restore/stop/rebuild preserve value. |
| `AgentOrgRunHistorySummaryWriter.commitFirstNonEmpty(input)` | Shared current-index persistence primitive | Compact with the Team helper, transform only one empty row, atomically write, strictly reread, and return a closed disposition plus rows | strict current rows + `{orgRunId, summary}` | Stateless/no queue/manager/catalog; migration invokes it only before runtime construction. |
| `AgentOrgStreamingService.onAcceptedExternalUserMessage(event)` | Web history invalidation port | Notify the injected caller only after accepted SEND_MESSAGE ACK so it can request authoritative Org-family refresh | `{orgRunId, agentRunId, commandId}` without summary text | No optimistic update or stream-schema change; newest request generation owns commit. |
| `AgentOrgHistoryFirstMessageSummaryV1Migration.run()` | Historical derived-metadata transition | Enumerate strict current empty-summary Org rows, infer only a provenance-qualified unique earliest configured-member trace, invoke the shared summary writer before supervisor construction, and validate | current Org run ID + exact configured Agent physical scope + root communication/task exclusion records | Startup-only; bounded/redacted dispositions; no manager/catalog construction; sidecars never qualify, and there is no runtime import, task-node scan, later-trace promotion, tie-break, or schema change. |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Definition source registry/admission | Yes | Yes | Medium | Explicit source class, exact one-family codec, unavailable data result, no legacy retry. |
| Org definition API | Yes | Yes | Low | Reject coordinator/nested Org. |
| Team definition API | Yes | Yes | Low | Agent-only member input. |
| Definition transaction | Yes | Yes | Medium | Normal authoring uses one complete candidate + expected revision + atomic package publication; migration is separate. |
| Subject run services/managers | Yes | Yes | Low | No public generic create/restore guessing kind. |
| Configured Agent / flat Team internal factories | Yes | Yes | High | Mandatory tagged root/member/physical inputs; no root aggregate/store imports; configured-child Team API absent. |
| Bound task command capability | Yes | Yes | High | Carries exact root and caller; calls task engine through owning root adapter; returns no aggregate. |
| Task FIFO / non-waiting settlement preparation | Yes | Yes — exact root, task and execution | High | One FIFO retains durable ordering; AgentRun/local execution atomically returns prepared-or-deferred without awaiting active work. |
| AgentRun root-shutdown fence | Yes | Yes — exact AgentRun | High | Same dispatch owner serializes admission, claim/provider start, canonical turn and interrupt; no active-turn-only precheck or root-internal bypass. |
| Frozen Team/Org termination scopes | Yes | Yes — exact immutable subject subtree | High | Enumerate/invoke only; AgentRun owns input/turn decisions and subject roots own shutdown sequencing. |
| Existing PreparedTaskSettlement | Yes | Yes — exact execution binding | High | Existing cancel/commit/finish semantics remain; it is created only after quiescence succeeds and no new committed token type is added. |
| Active root directory | Yes | Yes | Medium | Compound root only; narrow live message/query capability; managers retain lifecycle. |
| Collaboration location facade | Yes | Yes | Medium | Explicit compound root for scoped queries; unique global AgentRun; strict subject providers. |
| Configuration resolver | Yes | Yes | Medium | Exact patches; server recomputes; all-or-nothing validation. |
| Subject tree stores | Yes | Yes | Low | Each path/store accepts one family/version/root only. |
| Root run package readiness | Yes | Yes | Medium | Family path supplies kind; reject duplicate IDs/residue, then invoke only that family's strict store. |
| Mixed projection | Yes | Yes | Medium | Compound kind+ID; verify family/payload/branch. |
| Recipient resolver | Yes | Yes | Low | Canonical parser/index; reject root/depth/unknown. |
| Application Team launch | Yes | Yes | Medium | Preserve explicit Team ref and Team service. |
| Agent presentation contract/adapter | Yes | Yes | High | Root-neutral strict message details; subject envelope supplies exact root/member/sequence; reject unknown/raw payload. |
| AgentOrg browser context/stream | Yes | Yes | High | One strict context owner, complete candidate hydration, sequence barrier and recovery; no parallel root store. |
| Active workspace target/interaction port | Yes | Yes | High | Tagged target branch carries exact context/commands/browse, optional Team view and optional owning-root Messages facet; shared surfaces cannot bypass. |
| AgentOrg post-commit receiver presentation | Yes | Yes — exact Org/sender/receiver/message | High | Subject root publishes after durability for every admitted pair, root before receiver, no duplicate or kind exclusion. |
| Owning-root Messages facet | Yes | Yes — exact root and selected configured Agent | High | Complete-root identity projection; direct/mounted symmetry; no same-Team filter, second store, socket, or lifecycle. |
| Org member projection/trace | Yes | Yes | Medium | Compound Org/member/run identity and strict location; no Team-root alias. |
| Org root stop | Yes | Yes | Medium | Exact Org root only, pending/error guard; no member/mounted Team action. |
| Team aggregate fold/dot | Yes | N/A — value-only | Low | One pure five-state policy and accessible component; no topology/state owner. |
| AgentOrg Team-branch projector | Yes | Yes — exact Team node and AgentRun IDs | Medium | Full branch before collapse; injected explicit live/history status source; no outside branch. |
| AgentOrg run-config store / launch adapter | Yes | Yes — exact Team/Agent addresses | Low | Separate sparse maps and exact commands; reuse existing GraphQL fields; no Team store/payload import. |
| AgentOrg canonical placement patch | Yes | Yes — exact Team/Agent address supplied by caller | High | One pure idempotent omission/null rule serves preview/request; cross-layer fixture proves server/snapshot equality. |
| Unified Workspace/history projection | Yes | Yes — tagged subject root + workspace | High | Read owner supplies stable-keyed grouping/category order; one mounted panel/tree-state owner preserves presentation continuity; typed actions delegate lifecycle and no second Org context exists. |
| Root workspace default policy | Yes | Yes — actual workspace record | Medium | Reuse existing Team root selector behavior; untouched fresh root only; no hard-coded path or descendant default. |
| AgentOrg fixed-depth form projector | Yes | Yes — admitted Org/ref/member/coordinator addresses | Low | Pure closed projection; blocking diagnostic on mismatch; no silent omission or browser repair. |
| Shared Member overrides / Team editors | Yes — presentation only | Yes — caller-provided form node/address | Low | Reuse established a11y/disclosure/edit grammar; typed events return to subject owner. |
| Web focus/send | Yes | Yes | Medium | Nullable for Org; exact mapping; never fallback. |

## Main Domain Subject Naming Check

| Subject | Current / Target Name | Natural? | Risk | Action |
| --- | --- | --- | --- | --- |
| Multi-Team composition | recursive `AgentTeamDefinition` / `AgentOrgDefinition` | Yes | Low | Delete recursive Team representation. |
| Flat unit | `AgentTeamDefinition` / same, Agent-only | Yes | Low | Never add `FlatTeam`. |
| Team root aggregate | `RootTeamRun` / same, flat | Yes | Low | Preserve native Team owner/name. |
| Org root aggregate | none / `AgentOrgRun` | Yes | Low | New subject; no generic root wrapper. |
| Team durable tree | `TeamRunExecutionTreeFileV2` / same | Yes | Low | Preserve exact contract. |
| Org durable tree | none / `AgentOrgRunExecutionTreeFileV1` | Yes | Low | Distinct exact contract. |
| Mixed read DTO | Team-only view / `RootExecutionTreeProjection` | Yes | Medium | Always require `root_subject_kind`. |
| Agent presentation message | Team-named payloads/raw Org event / `AgentPresentationMessage` | Yes | Medium | Root-neutral details only; Team/Org outer contracts remain subject-specific. |
| Browser Org runtime state | raw `RootExecutionViewState` / `AgentOrgExecutionContext` | Yes | Low | Own exact topology, AgentContexts, stream/recovery and nullable focus. |
| Mounted Team UI adapter | none / `TeamWorkspaceContextView` | Yes | Medium | Presentation view only; never call it a Team root/context authority. |
| Selected-member root messages | Team-bundled messages / `CollaborationMessagesContextView` | Yes | Medium | Tight read-only presentation facet shared by Team and Org; never call it a collaboration root context or store. |
| Logical address | `AgentTeamAddress` / `CollaborationAddress` | Yes | Low | String format unchanged; semantics span Org/Team. |
| Org authored / internal scope | authored `org_local`; internal `agent_org_owned` unchanged | Yes | Medium | Explicit DS-038 mapping; opaque ref prefix/path is not renamed. |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why / Boundary |
| --- | --- | --- | --- |
| Target definition admission | Existing source paths/providers and catalog scans | Create cross-subject admission capability over strict subject codecs | Source ownership and dependency availability span Team/Org, but the capability owns neither subject mutation nor runtime history. |
| Org definition | Team provider/package patterns | New subject; reuse Markdown/config/source/transaction primitives | Team owner cannot absorb coordinator-free direct Team refs. |
| Flat Team definition | AgentTeam definition | Refactor existing | Retain ID/source/catalog; remove Team member kind/recursion. |
| Addresses/handoffs | `agent-collaboration` and current compiler | Extend | Same canonical addresses/records; compiler becomes explicit fixed-depth. |
| Standalone Team runtime | `agent-team-execution` | Preserve/refactor locally | It already owns native Team lifecycle/V2; contract configured children out. |
| Org runtime | Team-root-coupled mixed backend plus AgentRun candidate protocol | New `agent-org-execution` over extracted root-neutral configured-Agent/flat-Team factories and private subject adapters | Separate aggregate/store is required; Team-root contexts/managers cannot be reused, while provider/local Agent execution and record/FIFO logic should not be duplicated. |
| Configured Agent execution | `MixedAgentMemberHandle` + AgentRun candidate API | Extract and replace | Activation mechanics are reusable only after removing Team context/identity/event/memory/task-root ownership. |
| Flat Team local execution | `TeamRun`/mixed manager/task registries | Extract and narrow | Reuse direct Agent/task mechanics under explicit root host; remove configured child Team and all root package behavior. |
| Task/message lifecycle | Team task/message services | Extract record/FIFO engines; add Team/Org adapters | Common lifecycle/records are tight; tree/index/persistence/event ownership is subject-specific. |
| Pending-input root shutdown | AgentRun admission/dispatch/lifecycle plus current frozen Team scope | Extend AgentRun with one irreversible fence; clean-cut rename the recursive frozen-scope method; compose a private Org frozen scope | The authoritative input owner can distinguish pre-forward cancellation from provider-started interruption. A root-level active-turn query cannot. |
| Live same-root lookup | Team manager hard-coded in global router | Add compound active-root directory | Supports Team and Org without public generic root or bare-ID guessing. |
| Persisted records | current Team tree domain/schema | Extract tight shared record types/validators | Reuse exact fields without generic root. |
| Team durability/history | current Team store/index/memory layout | Preserve and narrow | Byte/path compatibility is approved. |
| Org durability/history | current atomic store/index patterns | Create subject store/index | Separate family/path/root invariant. |
| Mixed projection | Team history/stream/projectors | Add thin explicit-kind facade; retain Team-only paths | Shared UI needs one union, but lifecycle/storage stay subject-owned. |
| Migration | app-data migrations | Extend | Reuse the existing runner/record/log/restart policy; isolate legacy codecs and add no lazy compatibility or bespoke recovery. |
| Agent event presentation | `TeamAgentEventAdapter`, Team projector, `dispatchAgentStreamMessage`, AgentContext handlers | Extract root-neutral presentation adapter/detail contract; compose current Team and strict Org envelopes | Mature Team validation/presentation is reusable; raw Org domain events and `unknown` transport are not. |
| Agent conversation workspace | `AgentWorkspaceView`, `TeamWorkspaceView`, `AgentTeamEventMonitor`, `AgentEventMonitor`, `AgentUserInputForm` | Extract prop/port-driven Agent/Team surfaces and keep standalone wrappers | Product explicitly requires reuse; global store reads must move behind active-target facade rather than duplicate markup. |
| Active interaction/right tools | `useActiveContextStore`, `RightSideTabs`, activity/token/file/artifact components | Generalize to exact tagged active target plus subject interaction/query adapters | Preserve accepted UI and commands without treating mounted Team/Org Agent as standalone. |
| Selected-member Messages | Team overview/communication panel plus Org sidecar/context | Extract one root-neutral Messages presentation facet and shared section/panel; implement Team and Org adapters | The mature Team interaction is reused, while the sidecar and complete identity scope remain with the owning Team or Org root. |
| Org member history/trace | Team member projection/hydration/active trace pattern | Add Org-specific location-backed projection and candidate recovery; reuse presentation builders | Persistence location/root semantics differ; visual conversation shape is shared. |
| Web workspace | Team execution view components/state | Refactor Org branch into AgentOrgExecutionContext plus shared presentation surfaces | One visual workspace; exact subject adapters and nullable Org focus. |
| Org authoring | Team form primitives | New subject-specific UI | Membership/coordinator semantics differ. |
| AgentOrg launch hierarchy presentation | `TeamRunConfigForm -> TeamMemberConfigTree -> TeamScopeConfigEditor -> MemberOverrideItem` from current/origin-personal | Reuse the accepted disclosure/row/editor chain through an Org-owned fixed-depth projector and typed command adapter | User-visible style/navigation/progressive disclosure should not be reinvented; the Org store, payload and coordinator-free domain remain distinct. |
| Launch precedence | current Team config hierarchy | Extract/extend | Existing root/placement logic; server authority is new. |
| Definition atomic save | parent mutations + atomic file writer | Extend with a normal-authoring package transaction | Multiple package files need revisioned all-or-complete publication; data migration remains separate. |
| Handoff UI | current record + Product design | Shared presentational primitives | Endpoint eligibility/persistence remain subject owners. |

AD-REV-007 capability check: reuse is mandatory. `StatusDot.vue` and
`workspaceStatusDotPresentation.ts` already own the palette/motion; the existing
nested-Team fold/dot already own the exact precedence and accessible Team label;
`AgentOrgExecutionContext` already owns live Agent status. The target extracts
only the pure shared fold and neutral dot, while the AgentOrg adapter supplies
its own exact tree traversal. `TeamActivityDot.vue` is deliberately not reused
because it is a binary root-activity indicator rather than a five-state branch
aggregate. No new backend status capability is allocated.

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Decision | Notes |
| --- | --- | --- | --- | --- |
| Agent Execution | Input admission, one dispatch slot, canonical turn lifecycle, ordinary preparation, non-waiting quiescence attempt, irreversible root-shutdown fence | DS-015, DS-022 | Extend | Root/task subjects receive results only; they cannot inspect active-turn/input internals. |
| Team/Org local termination scopes | Stable recursive enumeration of configured/task/prepared Agent handles and task Teams | DS-015 | Refactor/compose | Replaces active-turn-only traversal; Org composition remains private and creates no generic root. |
| Collaboration Definition Admission | Source registry, target-only decode result, dependency availability, diagnostics/new-work gate | DS-000, DS-007 | Create | External roots are read-only; runtime/history do not depend on live admission. |
| AgentOrg Definition | Org domain/config/source/ref/candidate/catalog | DS-001, DS-007, DS-011 | Create | Query Team definitions only. |
| AgentTeam Definition | Agent-only Team/coordinator/local source | DS-001, DS-002, DS-011 | Refactor | Remove Team-owned Team sources. |
| Agent Collaboration | address/handoff/endpoint catalog and tool contracts | DS-003-DS-005, DS-009 | Extend | Shared semantics, not generic root authority. |
| Collaboration Execution (internal) | Tagged root/member/host/physical identities, member context, configured-Agent factory, root-neutral task/message engines, active-root directory and location facade | DS-002-DS-006O, DS-008, DS-014, DS-015 | Create by extraction | Mandatory tight capabilities only; Team-local execution and subject adapters/trees/stores/events remain in their domain owners. |
| AgentTeam Execution | RootTeamRun/Team manager/service/V2 persistence, root-neutral flat-Team local factory, and Team task/message/event adapters | DS-002, DS-004-DS-006T, DS-014-DS-015 | Refactor/Preserve | Native Team family retained; local Team execution moves under an explicit `local/` boundary consumable by Org; configured child removed. |
| AgentOrg Execution | AgentOrgRun/manager/service/planner/index, Org task/message/event adapters, strict sidecars and V1 persistence coordination | DS-003-DS-006O, DS-014-DS-015 | Create | Composes direct Agent and flat Team mechanisms without Team root/package. |
| Run History/Persistence | strict subject schemas/stores/indexes and tagged mixed catalog | DS-006T, DS-006O, DS-008 | Extend | Two authorities; mixed derived facade. |
| App Data Migration | old config/Org-like V2 conversion, current-file writes, one direct family rename, cleanup, bounded dispositions | DS-007, DS-010 | Extend existing runner | Flat Team path is verification-only; no custom journal/staging/recovery owner. |
| GraphQL/Application | subject definition/run plus mixed read contracts | DS-001-DS-003, DS-008 | Extend | No bypass; Team application ref preserved. |
| Agent Presentation Contracts | Root-neutral strict Agent conversation/status/tool/activity/input/error/token detail schemas | DS-016-DS-018 | Create by extraction | Lower than Team/Org envelopes; no root snapshot or runtime logic. |
| Stream Contracts | compatible Team view + strict Org/tagged mixed view and command acks | DS-008, DS-016-DS-018 | Extend | Compose presentation details; no forced Team wire rewrite and no `unknown` Org live events. |
| Web Definition Authoring | separate Team/Org surfaces + shared handoff primitives | DS-001, DS-011 | Create/Refactor | RV-012 normative. |
| Web Launch Configuration | separate Team/Org drafts; shared disclosure/Team editors and root workspace policy; strict Org projector and canonical placement patch | DS-002, DS-003, DS-012, DS-023, DS-024, DS-026 | Refactor existing | Org no focus and retains Org payload ownership; preview/request/server/snapshot equality; Team coordinator-led; user-visible Team hierarchy/default stays established. |
| Web AgentOrg Execution Context | strict Org topology/tasks/messages/status, AgentContexts, stream/hydration/recovery, mounted-Team presentation adapters and Org-root selected-member Messages facets | DS-008, DS-013, DS-016-DS-018, DS-028 | Create/Refactor | One active Org browser authority; no raw event list, second ledger or standalone mounted root. |
| Web Shared Agent/Team Workspace | accepted member header/event monitor/composer and active target/interaction/right tools including owning-root Messages presentation | DS-013, DS-016-DS-019, DS-028 | Refactor existing | Standalone and Org wrappers reuse structurally identical surfaces while root adapters retain exact scope. |
| Web Root Workspace | one route-stable mixed history data projection, one mounted tree-state presentation owner, ordered Agent/Team/AgentOrg categories, exact focus and typed root lifecycle actions | DS-008, DS-013, DS-019, DS-025 | Refactor | Read owner and presentation-state owner do not overlap; Orgs follows Teams; subject identity/focus/lifecycle stay subject-owned. |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Concern | Why One File / Reuse |
| --- | --- | --- | --- |
| `collaboration-definition-admission/domain/definition-source-descriptor.ts` | Definition Admission | Explicit source class/mutation owner/path | One cross-subject ownership vocabulary. |
| `collaboration-definition-admission/domain/definition-admission-result.ts` | Definition Admission | Available/unavailable result and diagnostic codes | Data result shared by catalogs/operations. |
| `collaboration-definition-admission/providers/definition-source-registry.ts` | Definition Admission | Allowlisted registered roots/descriptors | Discovery only; no decode/write. |
| `collaboration-definition-admission/services/definition-admission-service.ts` | Definition Admission | Exact target codec dispatch/new-work gate | One target-only policy; no history/legacy dependency. |
| `collaboration-definition-admission/services/definition-dependency-availability.ts` | Definition Admission | Org→Team availability closure | One deterministic dependency diagnostic owner. |
| `agent-org-definition/domain/agent-org-definition.ts` | Org Definition | Org direct members/handoffs/defaults | One subject; reuse address/handoff types. |
| `agent-org-definition/providers/agent-org-definition-config.ts` | Org Definition | Exact field-free Org definition codec | No coordinator or legacy acceptance. |
| `agent-team-definition/domain/agent-team-definition.ts` | Team Definition | Agent-only members/coordinator | Existing subject narrowed. |
| `agent-team-definition/providers/agent-team-definition-config.ts` | Team Definition | Exact field-free Team definition codec | No member `refType` or legacy normalization. |
| `agent-collaboration/definition/resolved-collaboration-topology.ts` | Collaboration | Explicit Org and Team resolved variants | Shared compiler input, never recursive generic. |
| `agent-collaboration/definition/collaboration-handoff-compiler.ts` | Collaboration | `compileOrg`/`compileTeam` | One ordered endpoint policy. |
| `agent-collaboration/definition/definition-endpoint-catalog.ts` | Collaboration | From/To eligibility/coordinator metadata | One authoring vocabulary. |
| `agent-collaboration/services/collaboration-launch-configuration-resolver.ts` | Collaboration | Fixed-depth effective settings | One precedence owner. |
| `agent-collaboration/execution/domain/root-execution-identity.ts` | Collaboration Execution | Tight tagged root/member/host/physical identity constructors | Internal only; no persisted root union or bare-ID kind inference. |
| `agent-collaboration/execution/domain/member-execution-context.ts` | Collaboration Execution | AgentRun collaboration/tool context | Replaces Team-root-specific member context. |
| `agent-collaboration/execution/backends/configured-agent-execution-handle.ts` | Collaboration Execution | AgentRun candidate/local execution mechanics | Mandatory callbacks; no root/store/index imports. |
| `agent-team-execution/local/flat-team-execution-factory.ts` | Team Local Execution | One Agent-only local Team below explicit root host | No root package/registry/configured child Team. |
| `agent-collaboration/execution/task/root-task-lifecycle-engine.ts` | Collaboration Execution | Root-neutral task record policy, one FIFO, existing terminal sweep and non-waiting settlement deferral | Subject adapter owns tree/persistence/event; active provider work yields immediate deferral. |
| `agent-collaboration/execution/task/root-task-lifecycle-command-queue.ts` | Collaboration Execution | Admit/order/drain the existing task mutation/settlement closures | No direct provider/local execution dependency. |
| `agent-execution/domain/agent-run.ts` and `input/agent-run-input-admission-state.ts` | Agent Execution | Atomic `tryPrepareTerminationIfQuiescent` plus irreversible root-shutdown admission/provider-start/interrupt fence under canonical lifecycle/input authority | Deferral remains no-op; root fence uses existing cancellation/interrupt facts; no task/root/persistence knowledge. |
| `agent-collaboration/execution/communication/root-communication-engine.ts` | Collaboration Execution | Root-neutral accepted message lifecycle | Subject adapter owns exact receiver/persistence/event. |
| `agent-collaboration/execution/services/active-collaboration-root-directory.ts` | Collaboration Execution | Compound active-root narrow boundary | No lifecycle/concrete aggregate/bare-ID lookup. |
| `agent-collaboration/execution/services/collaboration-execution-location-service.ts` | Collaboration Execution | Explicit Team/Org physical Agent lookup | Composes strict subject location providers. |
| `run-history/domain/run-execution-tree-shared-records.ts` | Persistence | Exact shared envelope field/Agent/Team/task record types | No root union; both subject trees compose. |
| `run-history/store/run-execution-tree-shared-record-schemas.ts` | Persistence | Exact reusable zod schemas | Avoid duplicate field validators. |
| existing `agent-team-execution/domain/team-run-execution-tree.ts` | Team Execution | Exact Team V2 domain/root | Preserve native owner. |
| existing `run-history/store/team-run-execution-tree-*.ts` | Team Persistence | Exact V2 schema/path/store | Preserve file/path/keys; narrow configured members. |
| `agent-org-execution/domain/agent-org-run-execution-tree.ts` | Org Execution | Exact Org V1 domain/root | New subject contract. |
| `run-history/store/agent-org-run-execution-tree-*.ts` | Org Persistence | Exact V1 schema/path/store | New family-specific store. |
| `agent-org-execution/persistence/agent-org-*-sidecar-*.ts` | Org Persistence | Strict Org task/message envelopes, schemas and stores | Reuse exact record arrays; require `subjectKind/orgRunId`. |
| `agent-org-execution/persistence/agent-org-run-persistence-coordinator.ts` | Org Persistence | Serialize Org tree/task/message commits and fail-stop | No Team sidecar/store. |
| `agent-org-execution/task/agent-org-task-root-adapter.ts` and communication/event siblings | Org Execution | Translate shared engines into Org index/tree/persistence/event operations | Private to AgentOrgRun. |
| `agent-org-execution/services/agent-org-communication-adapter.ts` | Org Execution | After one durable append, commit input, publish root communication, and pass the committed message plus receiver input to the Org-owned exact receiver callback before release | No endpoint-kind/address lookup, shared-engine, schema or presentation-envelope ownership. |
| `agent-team-execution/task/team-task-root-adapter.ts` and communication/event siblings | Team Execution | Translate shared engines into Team index/tree/persistence/event operations | Private to RootTeamRun. |
| `agent-org-execution/domain/agent-org-run.ts` | Org Execution | Org aggregate/direct handles/index | No coordinator/generic root. |
| `agent-org-execution/services/agent-org-topology-planner.ts` | Org Execution | Fixed Org plan | Subject-specific IDs/placements. |
| `agent-org-execution/services/agent-org-run-manager.ts` | Org Execution | Active Org registry/restore | One family manager. |
| `run-history/services/root-execution-projection-service.ts` | Mixed Read | Explicit-kind dispatch/tagged DTO | Thin derived facade only. |
| `run-history/services/root-run-package-readiness-index.ts` | Current Run Readiness | Sorted family/path inventory, cross-family ID exclusivity, exact current manifest/store validation, unavailable diagnostic linkage | Never decodes or transforms legacy payloads and never guesses kind from content. |
| `app-data-migrations/.../legacy-team-definition-config.ts` | Migration | Retired unversioned server-owned decoder | Cannot be imported by normal admission. |
| `app-data-migrations/.../legacy-organization-like-team-run-v2.ts` | Migration | Strict released Team V2 organization-like classifier/decoder after current flat-V2 validation fails | Cannot be imported by current Team/Org stores or history. |
| `app-data-migrations/.../team-v2-to-agent-org-v1-transformer.ts` | Migration | Org-like Run V2 mapping | Old runtime knowledge isolated. |
| `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` | Agent Presentation | Strict root-neutral conversation/status/tool/activity/input/error detail union | Shared by subject serializers; owns no root identity or sequence. |
| `autobyteus-agent-presentation-contracts/src/token-usage-presentation-dto.ts` | Agent Presentation | Tight root-neutral token-usage detail | Team/Org serializers add their truthful outer identity fields. |
| `autobyteus-team-stream-contracts/...` | Team Stream | Existing Team-only contract | Keep compatible where still used. |
| `autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts` | Mixed/Org Stream | Strict Org snapshot/event/lifecycle and client-command unions plus tagged mixed root dispatch | Adds Org without retyping Team-only callers; no `z.unknown()` in the Org live/view branch. |
| `agent-collaboration/execution/events/collaboration-agent-presentation-adapter.ts` | Agent Presentation | Validate/normalize raw configured-Agent callbacks once for Team and Org | Returns publish/filter/reject; does not serialize a subject envelope. |
| `services/agent-streaming/agent-org-execution-view-projector.ts` and `agent-org-stream-handler.ts` | Org Stream | Strict Org envelope/status/snapshot projection and send/interrupt/tool command handling | Use AgentOrgRun/query boundaries only; never expose raw runtime events. |
| `run-history/services/agent-org-member-run-view-projection-service.ts` | Org Member Read | Conversation/activity projection for one exact Org member execution | Uses explicit Org location and compound identity, never a Team root lookup. |
| `autobyteus-web/stores/agentOrgDefinitionStore.ts` | Web Authoring | Org catalog/draft/revision/errors | Separate subject state. |
| `autobyteus-web/components/collaboration/handoffs/*` | Web Authoring | From/To/When cards/editor/reorder/errors | Shared presentation; owner supplies policy. |
| `autobyteus-web/stores/agentOrgRunConfigStore.ts` | Web Config | Org root/Team/Agent sparse overrides | Org-specific intent. |
| `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts` | Web Org Runtime | One Org topology/task/message/status, AgentContext, mounted-Team view, owning-root Messages facets and nullable-focus aggregate | Sole active Org browser authority. |
| `autobyteus-web/types/workspace/collaborationMessagesContextView.ts` | Web Shared Presentation | Tight root-kind/run/focused-Agent message perspective and reference path port | No transport, store, route or lifecycle. |
| `autobyteus-web/services/agentOrgExecution/agentOrgCommunicationPerspective.ts` | Web Org Presentation | Complete retained exact Org execution index and selected-participant perspective projection | Replaces same-Team message projection; no current definitions or visible-tree input. |
| `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContextHydrationService.ts` | Web Org Runtime | Strict candidate hydration, member projection and checkpoint verification | Publishes only a complete correlated context. |
| `autobyteus-web/services/agentOrgExecution/AgentOrgStreamingService.ts` | Web Org Runtime | CONNECTED/snapshot/sequence state machine and typed message dispatch | No raw event retention or component callbacks. |
| `autobyteus-web/stores/agentOrgContextsStore.ts` | Web Org Runtime | Active/historical publication, exact target capabilities and submission/stop operations (DS-035–037) | Does not register mounted Teams or duplicate server lifecycle. |
| `autobyteus-web/stores/rootExecutionViewStore.ts` | Web Workspace | Tagged route/history/transport facade | Delegates Org context; no second tree, focus, or event array. |
| `autobyteus-web/stores/activeContextStore.ts` | Web Interaction | Resolve exact active target and delegate send/interrupt/tool decisions | No direct selection-kind branching inside shared composer components. |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceSurface.vue` | Web Shared Workspace | Accepted Agent header, status, event monitor and composer from an explicit target/ports | No subject store imports. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceSurface.vue` | Web Shared Workspace | Accepted focused Team-member header, Team event monitor and composer from `TeamWorkspaceContextView` | No standalone Team registry assumption. |
| `autobyteus-web/components/workspace/org/AgentOrgWorkspaceView.vue` | Web Org Workspace | Null-focus prompt or exact Agent/Team surface selection | No protocol formatting, composer, raw-event list or lifecycle button. |
| `autobyteus-web/components/workspace/collaboration/CollaborationMessagesSection.vue` and `CollaborationCommunicationPanel.vue` | Web Shared Right Tool | Established empty/list/detail/reference Messages language over `CollaborationMessagesContextView` | Extracted from Team presentation without Team/Org store branches or copied Org dashboard. |
| `autobyteus-web/components/layout/RightSideTabs.vue` and `composables/useRightSideTabs.ts` | Web Right Tool | Expose contextual Messages from the facet with truthful Team/Org label on desktop and narrow paths | No Team-kind gate or lifecycle inference. |

### AD-REV-007 Focused File Responsibilities

| Change | Target File | Responsibility |
| --- | --- | --- |
| Add | `autobyteus-web/utils/workspaceTeamAggregateStatus.ts` | Pure normalize/fold policy with explicit live/history authority and approved precedence. |
| Add | `autobyteus-web/services/agentOrgExecution/agentOrgTeamBranchStatus.ts` | Exact configured-Team configured/task descendant AgentRun enumeration and status-source adapter; no UI/store/transport ownership. |
| Rename/Move | `autobyteus-web/components/workspace/history/NestedTeamAggregateStatusDot.vue` -> `TeamAggregateStatusDot.vue` | One accessible 8px five-state Team aggregate dot used by Team and Org hierarchy rows; update neutral localization/test contract, no wrapper. |
| Rename/Modify | `workspaceHistoryNestedTeamStatus.ts` -> `workspaceHistoryTeamBranchStatus.ts` | Retained Team-history row traversal only; import shared fold rather than own precedence/normalization. |
| Modify | `autobyteus-web/components/workspace/history/AgentOrgRunHistoryPanel.vue` | Build exact Agent/Team/task status rows from strict tree/context, project Team aggregate before collapse, render shared dot between disclosure/icon, keep focus/stop unchanged. |
| Modify | `autobyteus-web/components/workspace/history/WorkspaceTeamExecutionTree.vue`, `WorkspaceStableExecutionRow.vue` | Consume renamed neutral fold adapter/dot without changing retained Team behavior. |
| Modify | `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` | Neutral `team_status_*` accessible labels; exact meaning remains `Team status: <State>`. |
| Add/Modify tests | Org history, Team branch fold/dot and workspace hierarchy specs | Prove five-state precedence, exact task branch, sibling/direct-root exclusion, live reactive update, collapsed visibility, historical live-state demotion, a11y, exact Agent coexistence, and lifecycle non-effects. |

No server, schema, GraphQL, WebSocket, store persistence, migration, definition,
focus, command, or root-lifecycle file is in the AD-REV-007 delta. If source work
requires one, return `Design Impact` rather than broadening the focused correction.

### AD-REV-009 Focused File Responsibilities

| Change | Target File | Responsibility |
| --- | --- | --- |
| Modify | `autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts` | Expose an owner-internal atomic quiescence predicate/transition usable only under AgentRun dispatch sequencing; no public status inference. |
| Modify | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Add `tryPrepareTerminationIfQuiescent(): Promise<PreparedAgentRunTermination \| null>`; return null immediately for unresolved input/turn/provider work, otherwise reuse existing prepared cancellation/commit semantics. |
| Modify | `agent-collaboration/execution/backends/configured-agent-execution-handle.ts` and `agent-team-execution/local/flat-team-agent-execution-handle.ts` | Forward the non-waiting local lifecycle capability without adding root/task knowledge. |
| Modify | `agent-team-execution/local/flat-team-execution-manager.ts` | Recursively prepare a task-Team subtree only when every owned execution is quiescent; cancel any already-prepared children and return null if a later child is active. |
| Modify | `agent-team-execution/local/registries/task-agent-execution-registry.ts`, `task-team-execution-registry.ts`, `agent-org-execution/services/agent-org-root-agent-execution-registry.ts`, and `agent-org-team-execution-directory.ts` | Replace waiting `prepareTermination()` during settlement with exact non-waiting prepared-or-null delegation; retain current registry, binding, cancel/commit and teardown contract. |
| Modify | `agent-team-execution/task-delegation/team-task-lifecycle-adapter.ts` and `agent-org-execution/services/agent-org-task-lifecycle-adapter.ts` | Treat null preparation as ordinary `false`/deferred settlement; preserve existing `settledAt` durability, state/event commit, finish and fail-stop behavior. |
| Modify | `agent-collaboration/execution/task/root-task-lifecycle-engine.ts` | Retain one FIFO and terminal sweep; ensure deferred settlement releases the queue and existing idle/offline events schedule retry. No coordinator/token/job state. |
| Modify | `agent-team-execution/domain/root-team-run.ts` and `agent-org-execution/domain/agent-org-run.ts` | Close/freeze complete scope and invoke its root-shutdown AgentRun fence before awaiting task drain/shutdown settlement; preserve subject/process ownership and existing error handling. |
| Add/Modify tests | AgentRun input/lifecycle, task Agent/Team registries, shared task engine, Team root, Org root, process supervisor | Prove immediate deferral, valid submit/independent-accept overlap, unrelated command progress, idle retry, recursive all-or-none preparation, supported approval-wait SIGTERM, and invalid self-review rejection. |

No new coordinator, settlement contract/token type, durable schema/file, task
record/status, Agent tool/API/result, definition, migration, frontend, or Product
file is in the AD-REV-009 delta. Delete or leave unimplemented every AD-REV-008-
only coordinator/token/dependency artifact; do not keep it as dormant indirection.

### AD-REV-010 Focused File Responsibilities

| Change | Target File | Responsibility |
| --- | --- | --- |
| Modify | `autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts` | Add the owner-internal irreversible root-shutdown transition: close admission, silently invalidate never-admitted reservations, emit the existing cancellation fact once for admitted pre-forward entries, revoke a not-started claim, and expose exact terminal/quiescence notification. Do not change public lifecycle types. |
| Modify | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Add idempotent `fenceInputAndInterruptForRootShutdown`; serialize claim/provider-start registration with the fence, retain one tracked dispatch slot through pre-`TURN_STARTED`, arm existing interrupt on canonical start, await terminal state, and prevent prepared cancellation from reopening fenced admission. Ordinary `prepareTermination` and `tryPrepareTerminationIfQuiescent` retain their distinct semantics. |
| Modify | `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts` and `agent-team-execution/local/flat-team-agent-execution-handle.ts` | Forward the exact AgentRun root-shutdown fence after any admitted construction resolves; do not translate `NO_ACTIVE_TURN` into complete-scope success or own input policy. |
| Modify | `autobyteus-server-ts/src/agent-team-execution/domain/frozen-team-run-termination-scope.ts` | Clean-cut replace `interruptActiveTurns()` with `fenceAgentRunsForRootShutdown()`; keep immutable subtree enumeration, preparation, and finish responsibilities distinct. |
| Modify | `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-manager.ts` | Freeze configured/task/prepared Agent handles and recursive task-Team scopes, recursively invoke the Agent fence, then retain current prepared local finish. No configured child Team or root authority. |
| Add | `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run-operation-gate.ts` | Org-private admission counter/close-and-drain boundary for already-admitted operations that can publish prepared handles or commit reserved Agent input. It owns no task FIFO, provider wait, persistence policy, or settlement. |
| Add | `autobyteus-server-ts/src/agent-org-execution/domain/frozen-agent-org-termination-scope.ts` | Private immutable composition of direct configured/task/prepared Agent handles and mounted/root-task Team frozen scopes; invoke their fences and finish without creating a generic root or mounted-Team lifecycle. |
| Modify | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-root-agent-execution-registry.ts` and `agent-org-team-execution-directory.ts` | Close materialization, expose stable active/prepared handle and Team-scope snapshots to the Org frozen scope, and preserve current subject-private registry/binding/settlement semantics. |
| Modify | `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts` and `agent-org-execution/domain/agent-org-run.ts` | Close external admission, stabilize admitted handle/input publication, freeze the exact scope, await every Agent fence, and only then drain task commands/settlement and finish persistence/local cleanup. Preserve existing root/process error aggregation. |
| Modify | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` only if needed for the existing public manager boundary | Forward the AgentRun-owned fence/preparation without duplicating its state machine; do not expose root/task semantics. |
| Add/Modify tests | AgentRun admission/dispatch/interrupt, configured handle, recursive Team frozen scope, Org frozen scope/operation gate, Team/Org root and process SIGTERM | Cover every input-state disposition, claim/start/fence ordering, pre-`TURN_STARTED` barrier, active approval wait, direct/mounted/task/prepared recursion, no reopen, no post-fence provider call, task drain phase order, retry/idempotence, and ordinary termination FIFO-drain regression. |

No schema, file, sidecar, task status, API/tool result, provider timeout, replay,
force-kill, frontend, Product, or migration file belongs to AD-REV-010. No
`RootTaskSettlementCoordinator`, cleanup token/job/dependency graph, second FIFO,
or generic frozen-root abstraction may be added. If a correct Agent fence
requires observable input semantics beyond the existing cancellation fact, that
is a Requirement Gap rather than an implementation liberty.

### AD-REV-012 Focused File Responsibilities

| Change | Target File | Responsibility |
| --- | --- | --- |
| Add | `autobyteus-web/components/workspace/config/MemberOverridesDisclosure.vue` | Extract the accepted compact Member overrides shell: adjacent label/count/chevron, default-collapsed local disclosure, `aria-expanded`/`aria-controls`, keyboard behavior, and a `v-show`-equivalent content slot that does not destroy caller draft state. |
| Modify | `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Replace its inline outer disclosure markup with `MemberOverridesDisclosure`; retain Team draft/store/launch semantics byte-for-byte outside the presentation extraction. |
| Add | `autobyteus-web/utils/editableAgentOrgRunFormModel.ts` | Purely project one admitted Org, its referenced flat Team definitions and current Org draft into exact direct-Agent and one-level `EditableTeamFormTeamNode`/Agent child nodes, coordinator identity, configurable-Agent count and closed blocking diagnostics. Never silently omit a reference. |
| Modify | `autobyteus-web/stores/agentOrgRunConfigStore.ts` | Own separately typed `teamOverrides` and `agentOverrides`, Team workspace selection/operation state, exact address-scoped set/reset commands, draft preservation and launch/projection errors. Do not import `teamRunConfigStore`. |
| Modify | `autobyteus-web/components/workspace/config/AgentOrgRunConfigPanel.vue` | Compose `MemberOverridesDisclosure`; render direct Org Agents through the retained compact row and mounted Teams through `TeamMemberConfigTree`; map typed edit/reset/workspace events to exact Org store commands; disable Run on projection/validation failure; serialize through the unchanged Org launch adapter. |
| Rename/Modify | `autobyteus-web/components/workspace/config/AgentOrgPlacementOverrideRow.vue` -> `AgentOrgDirectAgentOverrideRow.vue` | Retain only the approved direct-Org-Agent row. Remove `kind='team'`, fabricated Team-as-Agent nodes, Team coordinator text and the superseded Team layout. Delete the file instead if an existing exact direct-Agent primitive preserves the approved compact behavior without branching. |
| Modify, only for presentation props | `autobyteus-web/components/workspace/config/TeamMemberConfigTree.vue`, `TeamScopeConfigEditor.vue` | Accept only narrowly required caller-provided helper copy/control IDs if the focused Org copy cannot be expressed today. Preserve established Team row/field/Agent behavior; add no Org/store/payload branch. |
| Modify | `autobyteus-web/stores/agentOrgRunStore.ts` or the existing Org launch-input mapper | Tighten the typed Org command mapping so root, Team and Agent sparse maps—including Team `workspaceRootPath`—reach the already generated GraphQL input. No server field or effective-resolution logic is added. |
| Add/Modify tests | `components/workspace/config/__tests__/AgentOrgRunConfigPanel.spec.ts`, `MemberOverridesDisclosure.spec.ts`, existing `TeamRunConfigForm.spec.ts`, `stores/__tests__/agentOrgRunConfigStore.spec.ts`, and `utils/__tests__/editableAgentOrgRunFormModel.spec.ts` | Prove SCN-013/VIS-OVR desktop+narrow hierarchy, default/independent disclosure, exact count, local state labels, coordinator Agent row, reset isolation, collapse persistence, workspace serialization, fail-closed projection, direct-Agent stability, and standalone Team regression. |

No server, GraphQL schema/generated contract, stream, durable tree/sidecar,
definition, runtime lifecycle, task, migration, history, or active-workspace file
belongs to AD-REV-012. `CR-FIND-019` remains a separate Implementation Local Fix
and may be implemented in the same downstream source round, but it does not
expand this design. If implementation cannot achieve the focused experience
without changing the existing Org API or Team/Org ownership, it must return a
new Design Impact rather than inventing a generic config owner.

### AD-REV-013 Source Responsibilities, Clarified By AD-REV-014

| Change | Target File | Responsibility |
| --- | --- | --- |
| Add | `autobyteus-web/utils/agentOrgLaunchPatch.ts` | Own pure/idempotent `canonicalizeAgentOrgPlacementLaunchPatch`; preserve sparse inheritance and materialize `llmConfig:null` for owned runtime/model without owned config. No catalog, store, GraphQL, or server imports. |
| Modify | `autobyteus-web/stores/agentOrgRunConfigStore.ts` | Own a launch-draft epoch and root workspace selection source (`untouched/defaulted/explicit`); own complete root runtime/model/config commands that clear dependent root config coherently; canonicalize every exact Team/Agent patch at set/edit time; retain only canonical maps. Same-definition new Run starts a fresh epoch; re-render/retry/error does not. |
| Modify | `autobyteus-web/utils/editableAgentOrgRunFormModel.ts` | Project preview from the canonical maps, including exact root -> Team -> Agent workspace/config inheritance; expose invariant diagnostic rather than compensating for raw patches. |
| Modify | `autobyteus-web/components/workspace/config/AgentOrgRunConfigPanel.vue` | Replace direct root runtime/model/config ref assignment with Org-store root commands; remove local `serializeOverride`; call the canonical launch-input mapper; enable the existing root default workspace policy; preserve explicit selection and all AD-REV-012 Team presentation behavior. |
| Modify, only if needed to expose the existing policy without duplication | `autobyteus-web/components/workspace/config/WorkspaceSelector.vue`, `TeamScopeConfigEditor.vue` | Keep one root-only available-default selection contract used by Team and Org. Descendant editors remain `auto-select-default=false`; no Org branch or hard-coded path. |
| Modify | `autobyteus-web/components/AppLeftPanel.vue` | Always mount `WorkspaceAgentRunsTreePanel`; remove `showAgentOrgRunHistory`, Org history import, and route-selected panel branch. Route continues to choose center content only. |
| Modify | `autobyteus-web/stores/runHistoryStore.ts`, `runHistoryLoadActions.ts`, `runHistoryStoreSupport.ts`, `runHistoryTypes.ts`, `utils/runTreeProjection.ts` | Own one refresh that combines existing `ListWorkspaceRunHistory` Agent/Team data with only the strictly parsed AgentOrg branch of existing `ListCollaborationRootHistory`; commit successful family slices without erasing the other on failure; expose stable-keyed ordered Agent/Team/AgentOrg collections with no presentation state, duplicate Team ingestion, kind inference, or lifecycle commands. |
| Modify | `autobyteus-web/stores/agentOrgRunStore.ts` | Retain launch/restore/terminate command state only; remove `history`, `historyError`, `fetchHistory`, and command-internal history refresh. Command callers/typed action adapter request the unified read-owner refresh after success. |
| Modify | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`, `WorkspaceHistoryWorkspaceSection.vue`, `workspaceHistorySectionContracts.ts`, and `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Render `Orgs` immediately below `Teams`; create exactly one panel-scoped tree-state controller; own expansion/ancestor-reveal/selected-row-highlight continuity and the persistent scroll surface; consume stable row keys plus existing selected identity; emit typed subject actions without loading/projecting history or owning subject identity/lifecycle. |
| Extract then delete | `autobyteus-web/components/workspace/history/AgentOrgRunHistoryPanel.vue` | Move reusable Org row/tree presentation into the unified workspace-section path, then delete this competing whole-panel owner. No wrapper, feature flag, or fallback remains. |
| Modify | Existing Org lifecycle/selection composables or add a narrow `useWorkspaceHistorySubjectActions.ts` | Dispatch `{rootSubjectKind,rootRunId,action}` to the matching existing Agent/Team/Org store; never expose mounted-Team lifecycle or make the unified read model a runtime owner. |
| Add/Modify tests | `utils/__tests__/agentOrgLaunchPatch.spec.ts`, `components/workspace/config/__tests__/AgentOrgRunConfigPanel.spec.ts`, `stores/__tests__/agentOrgRunConfigStore.spec.ts`, `components/__tests__/AppLeftPanel.spec.ts`, `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`, `stores/__tests__/runHistoryStore.spec.ts`, plus server resolver/run snapshot integration fixtures | Prove SCN-014-016: complete-root and sparse-placement explicit-clear/effective equality matrix, actual default/explicit choice/inheritance, one mounted panel across routes, category order and retained state, Org-only workspace non-empty rendering, strict Org-tree/family rejection, normalized/catalog-missing/null-workspace grouping, no duplicate Team rows across the two existing queries, partial-query failure retention, exact root actions/refresh, no Org-under-Team, no old Org-store history cache/panel, and standalone Team regression. |

No server implementation, GraphQL/generated type, persisted tree/sidecar,
migration, stream, AgentOrg runtime context, focus, task, provider lifecycle, or
Product file belongs to AD-REV-013/014. Server tests may consume shared JSON fixture
inputs but server source semantics remain unchanged. If implementation requires
a new field, resolved launch payload, history API/schema, or lifecycle owner, it
must return a Design Impact rather than broadening this correction.

### AD-REV-015 Focused File Responsibilities

| Change | Target File | Responsibility |
| --- | --- | --- |
| Modify | `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run.ts` | Add the internal command-with-execution-kind outcome using the current strict execution index and unchanged direct/mounted/task handle path; make existing generic command map to its result so all command admission remains unchanged. |
| Modify | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-service.ts` | Extend the injected history dependency and expose Team-parallel `recordRunActivity(run, {summary})` as the application service facade; derive the key from the exact active run and do not own compaction or migration inference. |
| Modify | `autobyteus-server-ts/src/run-history/services/agent-org-run-history-catalog-service.ts` | Add serialized `recordRunSummary`, delegate compaction/first-write/atomic reread to one injected shared writer, replace memory only from its result, and preserve summary across all normal row rebuilds. |
| Add | `autobyteus-server-ts/src/run-history/services/agent-org-run-history-summary-writer.ts` | Implement stateless `commitFirstNonEmpty` over a strict supplied current-row set and index store: shared compaction, closed no-op/write disposition, atomic write, strict reread, and semantic preservation. Normal catalog calls it under its queue; startup migration calls it before runtime composition. |
| Modify | `autobyteus-server-ts/src/services/agent-streaming/agent-org-stream-handler.ts` | Route SEND_MESSAGE through the unchanged exact Agent command path with returned execution kind; only after `accepted` plus kind `configured`, enqueue/await history commit before normal accepted ACK while preserving truthful acceptance on derived-index observability failure. Task-scoped sends still execute but do not qualify; exclude all other input classes. |
| Modify | `autobyteus-server-ts/src/compositions/build-studio-server.ts`, `src/api/websocket/index.ts`, and `src/api/websocket/agent.ts` | Construct and inject one Org stream handler backed by the supervisor's existing `AgentOrgRunService`; do not construct a second manager/catalog singleton. |
| Add | `autobyteus-server-ts/src/app-data-migrations/migrations/agent-org-history-first-message-summary-v1/agent-org-history-first-message-summary-v1-app-data-migration.ts` and a private classifier helper in the same folder | Register fixed-prerequisite current-cohort scan, strict configured-node/location/corpus qualification, root communication/task exclusion correlation, provenance-qualified unique-earliest inference, shared-writer invocation, and bounded/redacted dispositions. Legacy inference remains isolated here; the migration constructs no runtime manager/catalog. |
| Modify | `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | Register `20260905_agent_org_history_first_message_summary_v1` after AgentOrg-family and raw-trace-layout prerequisites. |
| Add/Modify tests | Org run/stream/history catalog, WebSocket composition, migration registry/classifier/integration suites | Prove direct and mounted configured paths, all exclusions, accepted-result concurrency in both orders, write/ACK truth, preservation, deterministic unique/no/tie/invalid migration results, restart idempotence, and zero Team/schema mutation. |
| Modify | `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts` | Retain pending command type/target and invoke an injected notification only for accepted SEND_MESSAGE ACK; never expose submitted summary text. |
| Modify | `autobyteus-web/stores/agentOrgContextsStore.ts` | Inject the accepted-message callback and delegate to the existing mixed history read action; retain Org runtime context ownership unchanged. |
| Modify | `autobyteus-web/stores/runHistoryLoadActions.ts` and narrowly related run-history store support | Add AgentOrg-family `network-only` quiet refresh with one monotonic request generation shared with full loads; commit only the latest successful strict slice and retain previous data on failure. |
| Add/Modify tests | Org streaming/context and mixed history store/component integration tests | Prove accepted-only refresh, no optimistic row text, stale-response suppression, live no-navigation update, refresh-error retention, existing fallback, and no tree-state/selection reset. The existing row component needs no behavior change. |

No Product artifact, GraphQL/generated field, WebSocket DTO, AgentOrg execution
V1 file, trace/message/task schema, focus/routing/lifecycle contract, Team runtime,
or row styling is added by AD-REV-015. `CR-FIND-019` remains a separate already-
tracked implementation regression obligation.

### AD-REV-019 Focused File Responsibilities

The concrete Add/Modify/Move/Remove map is in DS-028–030 above. It replaces
AD-REV-017/018's configured-pair mapping, not a parallel implementation path.
Keep shared Messages components and Org sidecar/event callback. Remove kind
filters, Team-bound task types/selectors and address-only task focus. Extract
only real shared presentation structures; Team/Org command/store/runtime owners
stay distinct. The new readonly Org inspection query uses existing view DTOs;
no durable schema, migration, delivery tool or root lifecycle algorithm changes.




## Reusable Owned Structures Check

| Structure / Logic | Shared Owner | Why Shared | Must Not Become |
| --- | --- | --- | --- |
| Definition source descriptor/admission result | collaboration-definition-admission | Team/Org catalogs need the same explicit source/availability semantics | Definition union that owns mutation/runtime |
| Canonical address | `agent-collaboration/domain/collaboration-address.ts` | Definition/runtime/transport share exact string rules | Global run locator |
| Resolved topology variants | `resolved-collaboration-topology.ts` | Compiler/endpoint/config use same fixed-depth placements | Recursive generic tree |
| Persisted Agent/Team/handoff/launch/task records | `run-history/domain` + `store` shared-record files | Keys/meaning are approved identical | Generic root schema or optional-field blob |
| Tagged root/member/host/physical identity | `agent-collaboration/execution/domain` | Both roots must bind common Agent/task/message mechanics without false Team ownership | Public generic root, optional kind, or persisted root envelope |
| Configured Agent execution handle | Collaboration execution backend | Provider/local AgentRun lifecycle is identical once root policy is injected | Root aggregate/store/event owner or union of subject state |
| Flat Team local execution | AgentTeam execution `local/` | One Agent-only Team and recursive task descendants run identically below Team/Org root | Standalone root aggregate, package writer, or configured Team recursion |
| Task lifecycle engine / message engine | Collaboration execution task/communication | Task record/FIFO/terminal-sweep and message reservation policy are common while subject adapters own exact durability | Subject tree/index/persistence/event union or waiting non-quiescent settlement |
| Non-waiting termination preparation | AgentRun plus local Team composition | Both roots settle the same Agent/task-Team mechanics and need one atomic prepared-or-deferred lifecycle result | Task state, root identity, polling, timeout, persisted settlement state, or second coordinator |
| Root-shutdown Agent fence | AgentRun, forwarded by configured handles and recursively invoked by frozen subject scopes | Every Team/Org placement shares the same input/provider/turn lifecycle and must close the same pre-turn-start gap | Root task coordinator, public shutdown token, persisted phase, subject-generic root, timeout, or active-turn-only wrapper |
| Atomic run-package file writer | run-history physical persistence | Temp-write/fsync/rename outcome reporting is subject-agnostic | Schema/path selection or root transaction owner |
| Launch configuration merge | Collaboration resolver + pure field merge module | Org and Team reuse field precedence | Focus/coordinator policy |
| Task delegation record/FIFO engine | Collaboration execution task owner | Both roots share record lifecycle/queue while adapters own exact host/tree commits | Root aggregate, subject tree union, or configured membership API |
| Handoff UI model | web collaboration components | Display/edit commands repeat | Endpoint/persistence owner |
| Mixed projection DTO | stream/history contract | Server/web share explicit union | Client-inferred kind |
| Agent presentation message | `@autobyteus/agent-presentation-contracts` | Team and Org deliver the same accepted Agent conversation/status/tool/activity semantics | Root envelope, sequence, subject-specific token root field, or runtime event union |
| `AgentOrgExecutionContext` | web AgentOrg execution | Org topology plus all derived live Agent/Team presentation must change as one candidate | Raw-event journal, durable focus, or second root authority |
| `ActiveAgentWorkspaceTarget` / `AgentInteractionPort` | web active-context boundary | Existing composer/tool/header/right surfaces need one exact focused Agent and command owner | Generic root selector, socket access, or implicit focus fallback |
| `TeamWorkspaceContextView` | web Team workspace presentation | Standalone and Org-mounted Teams share one accepted read-only view | Team lifecycle/store/registry interface or writable mounted root |
| `CollaborationMessagesContextView` | web root communication presentation | Standalone Team and AgentOrg selected members need the same narrow sent/received/reference interaction over different owning roots | Root context/store/socket/delivery API, Team roster/task union, or optional identity blob |
| Collaboration Messages section/panel | web shared presentation | Team and Org use the established list/detail/reference/empty-state language | Subject branch with store imports, custom Org dashboard, or lifecycle controls |
| `MemberOverridesDisclosure` | web launch presentation | Team and Org forms require the same approved outer disclosure/a11y/compact label grammar | Draft owner, member traversal, override policy, launch command, or subject switch |
| `EditableTeamScopeFormModel` / Team tree editors | web Team launch presentation | A mounted flat Team is a real Team placement with the same Team/Agent fields and row semantics | Generic Team/Org domain model, Team run store coupling, nested Team tree, or API payload |
| AgentOrg form projection | web AgentOrg launch owner | One pure boundary translates the distinct Org draft into the accepted Team view models | Second effective-config resolver, silent repair/omission, or writable Team definition adapter |
| Definition package transaction | definition provider utility | Org/Team normal multi-file save needs the same atomic visibility and revision control | Domain validator, global lock, or migration mechanism |

## Shared Structure / Data Model Tightness Check

AD-REV-026: media URI arrays and non-media file_attachments are disjoint; no duplicate all-file persisted copy. recordingFileAttachments is only a typed provider-copy input value, not another durable authority. See DS-044.

| Structure | Singular Meaning? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- |
| `DefinitionAdmissionResult` | Yes | Medium | Available branch contains one exact subject; unavailable branch is diagnostic data, never a fallback definition. |
| `AgentOrgDefinition` | Yes | Low | No coordinator/inherited Team fields. |
| `AgentTeamDefinition` | Yes | Low | Agent-only member record. |
| Shared persisted configured/task records | Yes | Medium | Exact current fields only; no root IDs/discriminator added. |
| `TeamRunExecutionTreeFileV2` | Yes | Low | Remains exact native Team family. |
| `AgentOrgRunExecutionTreeFileV1` | Yes | Low | Exact Org keys; no optional coordinator/focus. |
| `RootExecutionIdentity` | Yes | Medium | Mandatory discriminated two-branch identity; never serialized as the root tree. |
| `RootExecutionPhysicalScope` | Yes | Medium | Root identity plus TeamRun ancestry only; logical host/address remains separate. |
| `CollaborationMemberExecutionIdentity` | Yes | Medium | One root, exact canonical address, exact AgentRun; no duplicate `rootTeamRunId`. |
| `TaskExecutionHostIdentity` | Yes | Medium | Exact root/host kind/run/address; host adapter validates correlation. |
| `MemberExecutionContext` | Yes | Medium | Authored instruction, handoffs/delivery and task commands only; no root aggregate/context. |
| Org task/message sidecar envelopes | Yes per file | Medium | Mandatory `subjectKind/orgRunId`; record arrays exact; no Team field aliases. |
| `RootExecutionTreeProjection` | Yes | Medium | `root_subject_kind` selects exact DTO branch; projection only. |
| `DefinitionRevision` | Yes | Low | Opaque provider token only. |
| `PlacementLaunchOverride` | Yes | Medium | Exact address+subject kind; no focus. |
| Internal root/host identity vs approved old task field spellings | Yes per boundary | Medium | Map once in versioned codec; do not rename persisted shared records. |
| Migrated Org-owned definition ID | Yes, opaque | Medium | Source index owns mapping; never parse prefix. |
| `AgentPresentationMessage` | Yes | Medium | One strict event-type/detail pair; root, member, run and sequence identity live only in subject envelopes. |
| `AgentOrgExecutionContext` | Yes | Medium | One correlated Org view plus per-Agent presentation contexts; remove parallel root event arrays and duplicate focus. |
| `ActiveAgentWorkspaceTarget` | Yes | Medium | Four exact tagged branches with mandatory subject command/browse ports; no optional identifiers or inferred selection. |
| `TeamWorkspaceContextView` | Yes | Medium | Read-only Team identity/roster/task-header only; owning-root Tasks/Messages and root lifecycle/persistence are deliberately absent. |
| `CollaborationMessagesContextView` | Yes | Medium | Required root kind/run plus focused Agent identity; perspective rows are closed and read-only, with no optional store/socket/lifecycle capabilities. |
| `PreparedTaskSettlement` | Yes | High | Existing exact binding/handle prepared termination after proven quiescence; cancel/commit/finish and root fail-stop semantics remain unchanged. |
| Non-waiting quiescence result | Yes | High | `null` or existing prepared termination only; no parallel status, token, job, retry counter or persisted representation. |
| AgentRun root-shutdown fence state | Yes | High | One boolean/latch plus the existing single dispatch slot and interrupt reservation under AgentRun; no root/task identity, second queue, public token, or persistence. |
| Frozen subject termination scope | Yes per subject | Medium | Team scope is recursively reusable; Org scope composes direct handles and Team scopes privately instead of a mostly-optional generic root type. |
| AgentOrg Team/Agent sparse launch maps | Yes per exact placement kind | Medium | Split exact Team and Agent address maps; remove the current mixed map rather than retaining parallel authorities or reusing TeamRunConfig root shape. |
| `EditableTeamFormTeamNode` emitted by Org projector | Yes — presentation of one mounted flat Team | Medium | Populate only existing Team-scope fields, exact direct Agent children and coordinator identity; add no Org root/payload/lifecycle fields or nested Team children. |
| AgentOrg form projection result | Yes — complete success view or blocking diagnostic | Low | Use a closed discriminated result; success cannot silently omit invalid refs and failure cannot produce a launchable partial view. |

## Final File Responsibility Mapping

AD-REV-026 file responsibilities and removals are in DS-044–046 above: core reference/partition values, native and external recording, raw normalizer, both replay projections, synchronized GraphQL/web DTOs and existing locator visitor. No competing store or renderer.

DS-042 is the current attachment file/owner map; DS-043 adds the one migration-owned locator transform under the existing family migration. No competing service, registry or schema is added.

AD-REV-020 concrete add/modify/rename/remove mapping is the DS-033 table. The
normal versioned codec files disappear (no wrappers); their historical numeric
knowledge is confined to the migration helper. All provider/discovery/bundle
consumers and diagnostic clients move atomically to the current family codecs.

| File / Path | Owner | Concrete Responsibility | Dependency Rule |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/collaboration-definition-admission/domain/definition-source-descriptor.ts` | Definition Admission | Source class, mutation owner, canonical root/path | No codecs or filesystem mutation. |
| `.../collaboration-definition-admission/domain/definition-admission-result.ts` | Definition Admission | Available branch and stable unavailable diagnostic contract | No legacy payload/domain object. |
| `.../collaboration-definition-admission/providers/definition-source-registry.ts` | Definition Admission | Allowlisted server/repository/external root descriptors | No decoding; external descriptors cannot become writable. |
| `.../collaboration-definition-admission/services/definition-admission-service.ts` | Definition Admission | Select exact target codec, emit results, guard new work | No migration import, write, runtime/history filtering. |
| `.../collaboration-definition-admission/services/definition-dependency-availability.ts` | Definition Admission | Deterministic Org→Team unavailable closure/chain | No partial Org admission or Team mutation. |
| `autobyteus-server-ts/src/agent-org-definition/domain/agent-org-definition.ts` | Org Definition | Org metadata/direct member/handoff/default/source invariant | Imports public Agent/Team ref and collaboration types only. |
| `.../agent-org-definition/providers/agent-org-definition-config.ts` | Org Definition | Strict exact current Org Definition Config codec | No Team root alias, coordinator, unknown key, or legacy fallback. |
| `.../agent-org-definition/providers/file-agent-org-definition-provider.ts` | Org Definition | Org source reads + definition-package transaction adapter | Provider not called above service. |
| `.../agent-org-definition/services/agent-org-definition-resolver.ts` | Org Definition | Direct Agent/Team ref resolution/depth | Team query interface only. |
| `.../agent-org-definition/services/agent-org-definition-service.ts` | Org Definition | Authoritative validate-before-write CRUD/catalog | Encapsulates resolver/provider. |
| `.../agent-team-definition/domain/agent-team-definition.ts` | Team Definition | Agent-only Team/coordinator | No Org or Team member union. |
| `.../agent-team-definition/providers/agent-team-definition-config.ts` | Team Definition | Strict exact current Team Definition Config codec | No schemaVersion, member `refType`, unknown key, or legacy fallback. |
| `.../agent-team-definition/services/agent-team-definition-service.ts` | Team Definition | Flat validate-before-write CRUD/catalog | Encapsulates provider. |
| `.../agent-team-definition/providers/definition-package-transaction.ts` (or neutral sibling provider utility) | Definition persistence | Normal authoring revision lock, complete package staging, atomic publication/recovery | Used only by subject providers/services; migration must not call it. |
| `.../agent-collaboration/domain/collaboration-address.ts` | Collaboration | Parse/build/rebase/depth | Not a global locator. |
| `.../agent-collaboration/definition/collaboration-handoff-compiler.ts` | Collaboration | Explicit Team/Org compile | Resolved topology only. |
| `.../agent-collaboration/definition/definition-endpoint-catalog.ts` | Collaboration | Eligible endpoints/coordinator metadata | Candidate topology only. |
| `.../agent-collaboration/services/collaboration-launch-configuration-resolver.ts` | Collaboration | Org/Team effective launch settings | No activation/focus. |
| `.../agent-collaboration/execution/domain/root-execution-identity.ts` | Collaboration Execution | Construct/compare/clone tagged root, member, host and physical identities | No optional kind, persisted root, or bare-ID inference. |
| `.../agent-collaboration/execution/domain/member-execution-context.ts` | Collaboration Execution | AgentRun-bound authored instruction, handoff/delivery and task-command context | No `RootTeamRun`, subject manager/store/index. |
| `.../agent-collaboration/execution/backends/configured-agent-execution-handle.ts` | Collaboration Execution | AgentRun candidate prepare/restore/publish/abort, local commands/events/termination, narrow root-shutdown fence forwarding | Mandatory tagged identity/scope/callbacks; no root enumeration or input policy. |
| `.../agent-collaboration/execution/backends/configured-agent-execution-factory.ts` | Collaboration Execution | Controlled handle construction | No service locator or root selection. |
| `.../agent-collaboration/execution/task/root-task-lifecycle-engine.ts` | Collaboration Execution | Task record/review policy, one FIFO, terminal sweep, non-waiting settlement deferral and current deepest-first retry | Adapter only; no Team/Org tree/store/event and no wait on active provider work. |
| `.../agent-collaboration/execution/task/root-task-lifecycle-command-queue.ts` | Collaboration Execution | Serialize/admit/drain existing task mutation/settlement closures | No AgentRun/provider/Team/Org registry imports. |
| `.../agent-execution/domain/agent-run.ts` | Agent Execution | Atomic prepared-or-null termination eligibility, claim/provider-start serialization, irreversible root-shutdown fence, canonical interrupt/terminal completion, and existing lifecycle commit | No task/root/persistence knowledge; no racy external status check or timeout policy. |
| `.../agent-execution/input/agent-run-input-admission-state.ts` | Agent Execution | Canonical unresolved-input/quiescence plus root-fence invalidation/cancellation transition under AgentRun dispatch | Reuse exact lifecycle facts; not public status and no provider/task policy. |
| `.../agent-collaboration/execution/task/member-task-command-capability.ts` | Collaboration Execution | Selector-free Agent tool command boundary | Returns results, never root aggregate. |
| `.../agent-collaboration/execution/communication/root-communication-engine.ts` | Collaboration Execution | Accepted-message record/reservation lifecycle | Adapter only; no Team/Org envelope. |
| `.../agent-collaboration/execution/services/active-collaboration-root-directory.ts` | Collaboration Execution | Compound tagged root -> narrow live message/query capability | No lifecycle, concrete aggregate or bare-ID lookup. |
| `.../agent-collaboration/execution/services/collaboration-execution-location-service.ts` | Collaboration Execution | Compose strict Team/Org Agent locations for mixed consumers | Explicit kind/correlation; no payload guessing. |
| `.../run-history/domain/run-execution-tree-shared-records.ts` | Persistence | Shared exact record types | No root union. |
| `.../run-history/store/run-execution-tree-shared-record-schemas.ts` | Persistence | Shared exact record validators | No path/family selection. |
| existing `.../agent-team-execution/domain/team-run-execution-tree.ts` | Team Execution | Exact Team V2 domain/root | Compose shared records; Agent-only members. |
| `.../agent-team-execution/domain/frozen-team-run-termination-scope.ts` | Team Local Execution | Immutable recursive fence/prepare/finish contract for one Team subtree | No active-turn inference, root package, task record, or provider policy. |
| `.../agent-team-execution/local/flat-team-execution-manager.ts` | Team Local Execution | Freeze exact direct/task/prepared handles and child task Teams; invoke Agent fences recursively | No configured child Team, subject root persistence, or Agent input internals. |
| existing `.../run-history/store/team-run-execution-tree-schema.ts` | Team Persistence | Strict V2 exact keys/invariants | Never accept Org V1. |
| existing `.../run-history/store/team-run-execution-tree-path.ts` | Team Persistence | `$MEMORY_ROOT/agent_teams/<id>/team_run_execution_tree.json` | Unchanged. |
| existing `.../run-history/store/team-run-execution-tree-store.ts` | Team Persistence | Native V2 atomic read/write | No try-Org fallback. |
| `.../run-history/store/atomic-run-package-file-commit-writer.ts` (move/rename existing Team writer) | Physical Persistence | Subject-neutral temp-write/fsync/rename outcome reporting | No schema/path/root transaction policy; Team and Org stores supply strict file roles. |
| `.../agent-org-execution/domain/agent-org-run-execution-tree.ts` | Org Execution | Exact Org V1 domain/root | Compose shared records. |
| `.../agent-org-execution/domain/agent-org-run.ts` | Org Execution | Org aggregate/direct Agent/Team handles/index/events, unchanged exact command admission, both-endpoint exact identity resolution, all-participant post-commit receiver presentation, and root shutdown sequence | No coordinator; owns Org operations but delegates Agent input policy, message record lifecycle and history persistence. |
| `.../agent-org-execution/domain/agent-org-run-operation-gate.ts` | Org Execution | Close/admit/drain operations that can publish handles or commit reserved input before freeze | No task settlement FIFO, provider wait, or persistence policy. |
| `.../agent-org-execution/domain/frozen-agent-org-termination-scope.ts` | Org Execution | Private immutable composition of direct Agent handles and Team frozen scopes | No generic root, mounted-Team lifecycle, Agent input policy, or persistence. |
| `.../agent-org-execution/services/agent-org-topology-planner.ts` | Org Execution | Fixed-depth run plan/IDs | No raw provider reads. |
| `.../agent-org-execution/services/agent-org-run-manager.ts` | Org Execution | Org active registry/factory/restore | Calls Org store only. |
| `.../agent-org-execution/services/agent-org-run-service.ts` | Org Execution | Config-first full-scope create/restore/stop plus narrow accepted-activity history facade | Public Org boundary; no compaction, trace inference, or second catalog. |
| `.../agent-org-execution/services/agent-org-execution-scope-builder.ts` | Org Execution | Explicit aggregate/adapters/root-host/direct-handle/flat-Team assembly | Replaces catch-all activator; no Team root/package. |
| `.../agent-org-execution/services/agent-org-state-package-loader.ts` | Org Execution | Strict tree/task/message correlation and task reopen repair | No Team sidecar envelope or live definition lookup. |
| `.../agent-org-execution/task/agent-org-task-root-adapter.ts` | Org Execution | Host/index/tree/persistence/event bridge for shared task engine | Private to AgentOrgRun. |
| `.../agent-org-execution/communication/agent-org-communication-root-adapter.ts` | Org Execution | Exact receiver/sidecar/event bridge | Private to AgentOrgRun. |
| `.../agent-org-execution/services/agent-org-communication-adapter.ts` | Org Execution | Commit existing Org message/input snapshot, publish root communication, invoke the both-endpoint Org callback, and release input | No endpoint-kind, schema, shared-engine, Team, browser, or replay authority. |
| `.../agent-org-execution/events/agent-org-run-event*.ts` | Org Execution | Subject event contract/publisher/snapshot sequencing | Neutral handle events enter only through adapter. |
| `.../agent-team-execution/services/flat-team-topology-planner.ts` | Team Execution | Team->Agents plan | Replaces configured recursive planning. |
| `.../agent-team-execution/local/flat-team-execution-factory.ts` | Team Local Execution | Materialize one Agent-only Team beneath explicit root scope | No root package/registry or configured child Team. |
| `.../agent-team-execution/local/flat-team-execution-manager.ts` and `team-run.ts` | Team Local Execution | Direct configured Agent/task Agent/task Team commands/status/termination | Task Team recursion only; no root persistence. |
| `.../agent-team-execution/task/team-task-root-adapter.ts` | Team Execution | Team tree/index/persistence/event bridge for shared task engine | Private to RootTeamRun. |
| `.../agent-team-execution/communication/team-communication-root-adapter.ts` | Team Execution | Existing Team message envelope/event bridge | Private to RootTeamRun. |
| existing Team run manager/service/root files | Team Execution | Native Team lifecycle/registry/coordinator | Call Team V2 store only. |
| `.../run-history/store/agent-org-run-execution-tree-schema.ts` | Org Persistence | Strict Org V1 keys/invariants | Never accept Team V2. |
| `.../run-history/store/agent-org-run-execution-tree-path.ts` | Org Persistence | `$MEMORY_ROOT/agent_orgs/<id>/agent_org_run_execution_tree.json` | Exact approved path. |
| `.../run-history/store/agent-org-run-execution-tree-store.ts` | Org Persistence | Native Org V1 atomic read/write | No try-Team fallback. |
| `.../agent-org-execution/persistence/agent-org-task-delegation-records-v1-*.ts` | Org Persistence | `agent_org_task_delegation_records.json`, strict `subjectKind/orgRunId`, exact record array | Never accept `rootTeamRunId`. |
| `.../agent-org-execution/persistence/agent-org-communication-messages-v1-*.ts` | Org Persistence | `agent_org_communication_messages.json`, strict `subjectKind/orgRunId`, exact message array | Never accept Team filename/envelope. |
| `.../agent-org-execution/persistence/agent-org-run-persistence-coordinator.ts` | Org Persistence | Serialize Org tree/task/message mutation and latch Org fail-stop | No Team store/path/root. |
| `.../run-history/store/agent-org-run-file-commit-writer.ts` | Org Persistence | Correlated Org V1 tree/task/metadata commit sequence | Mirrors fail-stop mechanics, not Team root semantics. |
| existing `.../agent-memory/store/agent-memory-layout.ts` | Memory layout | Map tagged root + TeamRun ancestry + AgentRun to exact Team/Org path while preserving relative lineage | No shallow Org special case, logical topology inference, or flat-Team path rewrite. |
| `.../run-history/domain/agent-org-run-history-index.ts` + store, `agent-org-run-history-summary-writer.ts`, and `agent-org-run-history-catalog-service.ts` | Org History | Strict Org rows/index, shared stateless compaction/first-write persistence primitive, catalog-owned normal serialization, and normal value preservation | Subject-specific current authority; no trace inference or optimistic web state. |
| existing Team history index/store/service | Team History | Native Team history | Retained for Team. |
| `.../run-history/services/root-run-history-catalog-service.ts` | Mixed Read | Merge tagged Team/Org derived rows | Calls subject query boundaries. |
| `.../run-history/services/root-run-package-readiness-index.ts` | Current Run Readiness | Index family locations, reject duplicate IDs/retired authority residue, invoke selected strict store, link unavailable status to migration evidence | No legacy decode, family guessing, transform, or lifecycle ownership. |
| `.../run-history/services/root-execution-projection-service.ts` | Mixed Read | Explicit compound identity -> tagged tree DTO | No file scan/guess/lifecycle. |
| `.../app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.ts` | Migration | Deterministic definition/run inventory, fixed transforms, atomic current writes, one direct package rename, cleanup, verification, bounded dispositions | Uses existing runner contracts; only old-shape orchestration owner and no custom ledger/journal/recovery. |
| `.../app-data-migrations/migrations/agent-org-history-first-message-summary-v1/` | Migration | Empty-current-Org cohort, strict configured-member trace qualification, root communication/task exclusion evidence, provenance-qualified unique-earliest selection, shared summary-writer invocation and bounded redacted dispositions | Startup-only before supervisor/catalog; sidecars never qualify; no Team rows, task-node/directory scan, later-trace promotion, normal runtime import, tie-break, alternate index, or custom recovery. |
| `.../api/graphql/types/definition-admission.ts` | GraphQL Operations | Unavailable definition/dependency diagnostics query | Admission service only; does not make invalid definitions launchable. |
| `.../api/graphql/types/agent-org-definition.ts` | GraphQL | Org definitions/mutations | Org service only. |
| `.../api/graphql/types/agent-org-run.ts` | GraphQL | Org config launch/lifecycle | Org run service only. |
| `.../api/graphql/types/agent-org-member-run-view.ts` and existing active-trace type | GraphQL Org Read | Exact Org member conversation/activity/checkpoint and `agentOrgMember` trace browse | Require `{orgRunId,memberAddress,agentRunId}` and the Org projection service; never call Team member projection with an embedded Team ID. |
| existing Team GraphQL definition/run files | GraphQL | Flat Team authoring/native launch | Remove nested input; preserve compatible Team results where possible. |
| `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` | Agent Presentation Contract | Strict root-neutral Agent conversation/status/tool/activity/input/error schemas and parser | No root/member/run identity, sequence, subject snapshot or client command. |
| `.../token-usage-presentation-dto.ts` | Agent Presentation Contract | Root-neutral token detail shared by subject serializers | No Team-named root field. |
| `.../agent-collaboration/execution/events/collaboration-agent-presentation-adapter.ts` | Server Agent Presentation | Raw AgentRun/member-input/status/readiness admission into publish/filter/reject | No Team/Org envelope, broadcaster or persistence. |
| `.../agent-team-execution/services/team-flat-execution-callbacks.ts` and existing Team stream projector | Team Presentation Adapter | Use the shared admission result, then serialize the unchanged Team message/envelope | Team-only wire remains a compatibility golden; no Org branch. |
| existing Team stream contract/projector files | Team Stream | Team-only V2-compatible snapshot/events and current outer field spellings | Compose shared details internally; no Org payload or forced client migration. |
| `autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts` with package name `@autobyteus/collaboration-stream-contracts` | Mixed/Org Stream | Exact Org snapshot/event/lifecycle, send/interrupt/approve/deny commands and command acknowledgements; tagged Team/Org dispatch | No `z.unknown()`/`any` inside the Org snapshot/live branch; must not replace Team-only contract unless all consumers intentionally migrate. |
| `.../services/agent-streaming/agent-org-execution-view-projector.ts` | Org Stream Projection | Project correlated Org snapshot and strict Agent/task/communication event branches with one root sequence | Cannot pass through `AgentOrgRunEvent` or raw runtime payload. |
| `.../services/agent-streaming/agent-org-stream-handler.ts` | Org Stream Commands | Parse strict Org commands; preserve exact target admission; after accepted SEND_MESSAGE filter returned kind and invoke current history facade only for configured Agents before truthful typed ack/error | No task-send rejection, task/inter-Agent summary qualification, member fallback, second manager/catalog, or summary DTO. |
| `.../run-history/services/agent-org-member-run-view-projection-service.ts` | Org Member Projection | Hydration projection for exact Org direct/mounted/task Agent from Org location-backed traces | Explicit compound identity; no Team store/location/definition lookup. |
| `autobyteus-web/stores/agentOrgDefinitionStore.ts` | Web Authoring | Org catalog/draft/revision/errors | Org GraphQL only. |
| `autobyteus-web/stores/agentTeamDefinitionStore.ts` | Web Authoring | Flat Team draft/revision/errors | Team GraphQL only. |
| `autobyteus-web/components/collaboration/handoffs/HandoffList.vue` | Web UI | Ordered From/To/When display/read-only owner label | Presentation only. |
| `.../HandoffEditor.vue` | Web UI | Inline endpoint/condition CRUD/reorder/cancel/errors | Subject commands/catalog only. |
| `autobyteus-web/stores/agentOrgRunConfigStore.ts` | Web Org Config | Org root draft, canonical exact Team/Agent sparse patches, Team workspace selection/operation state, untouched/explicit root workspace state, exact commands and scoped errors | No focus, Team run draft/payload, disclosure state, or effective server resolution. |
| `autobyteus-web/utils/agentOrgLaunchPatch.ts` | Web Org Config Contract | Canonicalize sparse placement intent and explicit dependent `llmConfig:null` clear | Pure/idempotent; no store, catalog, GraphQL, or server import. |
| existing Team run config store (renamed only if repository convention demands) | Web Config | Simplified Team root/Agent overrides | Coordinator behavior retained. |
| `autobyteus-web/utils/editableAgentOrgRunFormModel.ts` | Web Org Config Projection | Strict admitted Org/flat-Team/draft to exact Team presentation nodes, configurable-Agent count and blocking diagnostic | Pure and fixed-depth; no store write, payload serialization, silent omission or repair. |
| `autobyteus-web/components/workspace/config/MemberOverridesDisclosure.vue` | Web Shared Config Presentation | Accepted label/count/adjacent-chevron disclosure, a11y and visibility-preserving slot | No draft, traversal, override or launch authority. |
| `autobyteus-web/components/workspace/config/AgentOrgRunConfigPanel.vue` | Web Org Config Adapter | Compose Org root inputs/default workspace policy, shared disclosure/Team editors, direct-Agent row and canonical exact Org edit/launch commands | No local object-spread serializer, bespoke mounted-Team editor, Team store import, effective resolver, or API field invention. |
| `autobyteus-web/components/workspace/config/TeamMemberConfigTree.vue`, `TeamScopeConfigEditor.vue`, `MemberOverrideItem.vue` | Web Team Config Presentation | Established Team row/scope/direct-Agent field and edit-event grammar reused for standalone and mounted Team presentation | No Org branch/store/payload/lifecycle and no configured Team recursion. |
| `autobyteus-web/components/workspace/config/AgentOrgDirectAgentOverrideRow.vue` | Web Org Direct-Agent Presentation | Retained compact direct Agent override row only | No Team kind, fabricated Team node, coordinator text or Team disclosure. |
| `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts` | Web Org Runtime | Correlated Org view/tasks/messages/status, per-Agent `AgentContext`s, mounted-Team views, root Messages/Tasks facets, exact nullable selection and live/historical phase | Sole Org read authority; no raw event array, second message cache or durable focus. |
| `autobyteus-web/services/agentOrgExecution/agentOrgExecutionViewIndex.ts` | Web Org Read Projection | Immutable exact configured/task/host/source/platform/task-assignment joins for context selectors | No store, command, current catalog or address-as-execution identity |
| `autobyteus-web/types/workspace/collaborationTasksContextView.ts`, `collaborationTaskPresentation.ts` | Web Participant Task Presentation | Tight root-tagged read facet, rows and exact participant references | No Team-root alias, runtime DTO generalization or optional identity blob |
| `autobyteus-web/services/agentOrgExecution/agentOrgTaskPresentation.ts` | Web Org Tasks Projection | Relevant delegator/assignee/fresh Team member task lifecycle/reference projection | No Team-local filter, store, mutation or fabricated notification |
| `autobyteus-web/components/workspace/collaboration/CollaborationDelegatedTasksSection.vue` | Web Shared Presentation | Established task section/navigation/detail over explicit Tasks facet | No Team store/roster dependency, root lifecycle or new dashboard |
| `autobyteus-web/services/agentOrgExecution/agentOrgCommunicationPerspective.ts` | Web Org Message Projection | Complete retained exact execution index plus selected sender/receiver perspective over the existing Org sidecar | No Team-local filter, current definitions, store/socket or lifecycle. |
| `.../agentOrgExecutionContextHydrationService.ts` | Web Org Runtime | Build candidate context from strict resume/member projections/workspace resolution and checkpoint barriers | Last committed context remains visible until atomic swap. |
| `.../AgentOrgStreamingService.ts` | Web Org Runtime | Strict handshake/snapshot/sequence recovery, exact `dispatchAgentStreamMessage` routing, and accepted-SEND_MESSAGE notification to an injected history-refresh port | Components never receive protocol envelopes or submitted summary text; invalid messages enter `reopen_required`. |
| `autobyteus-web/stores/agentOrgContextsStore.ts` | Web Org Runtime | Browser context publication, exact focus/capabilities, submission and retained-stop operations (DS-035–037) | No Team registration, duplicate server owner or raw transport send bypass. |
| `autobyteus-web/stores/rootExecutionViewStore.ts` | Web Workspace | Tagged route/history connection facade and subject delegation | Remove Org `events[]`, duplicate Org tree/focus and direct `sendAgentOrgMessage`. |
| `autobyteus-web/stores/activeContextStore.ts` plus `types/workspace/activeAgentWorkspaceTarget.ts` and `collaborationMessagesContextView.ts` | Web Interaction | Resolve four exact target branches and expose context, `AgentInteractionPort`, optional Team presentation, and optional owning-root Messages facet | Shared composer/tool components never switch on root stores/sockets; Team view never owns Org messages. |
| `autobyteus-web/services/eventMonitor/eventMonitorActiveTraceBrowse.ts` and page service | Web Trace Browse | Add strict `agentOrgMember` browse subject and Org projection query | No fake Team run ID or generic bare AgentRun lookup. |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceSurface.vue` | Web Shared Agent Surface | Accepted Agent header/status/event monitor/composer from explicit target/action props | No selection or subject store import. |
| existing `.../agent/AgentWorkspaceView.vue` | Web Standalone Agent Wrapper | Adapt standalone Agent stores/actions into `AgentWorkspaceSurface` | No duplicated workspace markup. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceSurface.vue` | Web Shared Team Surface | Accepted Team-member header/recovery/event monitor/composer from `TeamWorkspaceContextView` and action ports | No Team registry/root lifecycle assumption. |
| existing `.../team/TeamWorkspaceView.vue` | Web Standalone Team Wrapper | Adapt `AgentTeamContext` and standalone actions into Team surface | No duplicated workspace markup. |
| existing `.../team/AgentTeamEventMonitor.vue` and `.../agent/AgentEventMonitor.vue` | Web Accepted Event Presentation | Render exact focused `AgentContext` conversation/tool/activity and accepted composer | Consume active-target/context ports only; no root event formatting. |
| `autobyteus-web/components/workspace/org/AgentOrgWorkspaceView.vue` | Web Org Focus Adapter | Render approved null-focus prompt, Agent surface, or Team surface from exact Org target | Delete custom header/event cards/textarea/JSON fallback/Stop Org. |
| `autobyteus-web/components/workspace/collaboration/CollaborationMessagesSection.vue` and `CollaborationCommunicationPanel.vue` | Web Shared Messages | Established selected-member message list/detail/reference/empty-state presentation from the owning-root facet | No Team/Org store, transport, delivery or lifecycle branch. |
| `autobyteus-web/components/layout/RightSideTabs.vue`, `composables/useRightSideTabs.ts`, and Team overview/tool consumers | Web Contextual Tools | Resolve files/activity/token/artifact/Team presentation and owning-root Messages facet from `ActiveAgentWorkspaceTarget`; label Team/Org truthfully on desktop/narrow | No Team-kind-only Messages gate, global standalone-Team inference, copied Org dashboard, or wrong-family query. |
| `autobyteus-web/components/AppLeftPanel.vue` | Web Shell | Always mount one unified Workspace/history panel; route chooses center content only | No root-kind panel switch or Org history import. |
| `autobyteus-web/stores/runHistoryStore.ts`, `runHistoryLoadActions.ts`, `runHistoryStoreSupport.ts`, `runHistoryTypes.ts`, `utils/runTreeProjection.ts` | Web Mixed History Read | Own the established Workspace Agent/Team slice plus strictly parsed AgentOrg-only slice; retain per-family result/error state; use one AgentOrg request generation for full/focused authoritative refresh; merge explicit-kind roots into stable route-independent grouping/order | No optimistic summary, expansion/reveal/highlight/scroll state, duplicate Team ingestion, unchecked Org JSON cast, subject runtime/lifecycle ownership, kind inference, or current-route input. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`, `WorkspaceHistoryWorkspaceSection.vue`, `workspaceHistorySectionContracts.ts`, `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Web Workspace History Presentation | Own the one mounted tree-state controller, expanded/revealed/highlighted row presentation and persistent scroll surface; render the ordered read model and emit typed actions | No history loading/projection, subject selected-identity/runtime/lifecycle ownership, or route-specific second instance. |
| `autobyteus-web/stores/agentOrgRunStore.ts` | Web Org Commands | Launch, restore and terminate one exact Org and expose command pending/errors/results | No history rows/query/cache; successful callers invalidate/refresh the unified read owner. |
| `autobyteus-web/composables/useWorkspaceHistorySubjectActions.ts` (or tightened existing selection/mutation composables) | Web History Command Adapter | Dispatch explicit-kind root actions to existing Agent/Team/Org stores | No history-state ownership or mounted-Team lifecycle. |
| `autobyteus-web/utils/workspaceTeamAggregateStatus.ts` | Web Status Presentation | Pure five-state normalization/precedence with live/history authority | No topology, state, store, polling, transport or lifecycle. |
| `autobyteus-web/services/agentOrgExecution/agentOrgTeamBranchStatus.ts` | Web Org Hierarchy Projection | Exact one-Team branch AgentRun enumeration and status-source projection | Strict Team node and injected resolver only; includes task descendants, excludes outside branches. |
| `autobyteus-web/components/workspace/history/TeamAggregateStatusDot.vue` | Web Shared Hierarchy Presentation | Established dot grammar and accessible Team status label/title | Shared by retained Team history and AgentOrg; not a root activity indicator. |
| deleted `autobyteus-web/components/workspace/history/AgentOrgRunHistoryPanel.vue` | Removed competing Web history owner | Org row/tree concerns move into unified workspace-section components; file/import/tests removed atomically | No wrapper, flag, route fallback, or duplicate state remains. |
| approved Team/Org catalog/form/detail/config/workspace Vue components | Web UI | RV-012 states/layout/responsive/accessibility | Use production stores, never prototype mocks. |

## Applied Patterns

- **Subject-specific aggregates and stores:** Team and Org are peers with exact
  invariants; no optional-field generic root.
- **Ports/adapters below subject roots:** configured Agent, task and message engines own common local policy; private Team/Org adapters own tree/index/persistence/event translation.
- **Prepare-durability-publish activation:** every Org configured Agent candidate and provider binding is prepared before the correlated Org package commit; publication/registration follows durability or the entire root aborts/fail-stops.
- **Compound active-root directory:** live global routing uses explicit tagged root identity and a narrow capability, never a concrete aggregate or bare ID.
- **Composition of tight shared records:** approved child/handoff/launch/task
  shapes are shared without merging root schemas or paths.
- **Explicit discriminated projection:** `root_subject_kind` exists at mixed
  read/stream/workspace boundaries, never as a substitute persisted Team field.
- **Immutable topology snapshot:** launch snapshots definitions; restore never
  reinterprets topology from mutable definitions.
- **Validate-plan-commit:** validation completes before IDs/persistence/runtime.
- **Revisioned package transaction:** complete definition files commit/recover as
  one aggregate under lock and expected revision.
- **Most-specific configuration overlay:** root, Team placement, exact Agent.
- **Nullable client focus:** Org activation owns no recipient; explicit selection
  creates temporary exact focus.
- **Native current stores plus isolated migration:** Team V2 and Org V1 are both
  current; only organization-like old Team V2 is historical migration input.
- **Derived tagged catalog:** mixed history/stream projections are rebuildable from
  strict subject authorities and never topology authority; persisted history-index
  summaries are preserved rather than discarded during rebuild.
- **Serialized first-write derived metadata:** exact accepted configured input
  reaches one current Org history catalog queue and one shared physical summary
  writer; web rereads that authority, while historical trace inference remains
  isolated in one registered migration that uses the writer before runtime.
- **Pure branch aggregate projection:** subject-shaped traversal supplies only exact descendant Agent status values to one root-neutral five-state fold and one accessible dot; expansion and root lifecycle never become inputs.
- **Target-only admission result:** source classification and exact decoding
  produce available definitions or actionable data; there is no exception-driven
  fallback parse and live definition availability never reinterprets history.
- **Strict presentation admission:** one root-neutral adapter transforms raw
  Agent execution callbacks into a closed Agent presentation union before either
  subject stream serializes it; rejection is a recovery signal, never renderable
  content.
- **Candidate context swap:** Org hydration and stream recovery build and
  correlate an isolated `AgentOrgExecutionContext`, then publish it atomically;
  the accepted surface never observes half-hydrated AgentContexts.
- **Port-driven accepted workspace:** standalone Agent, standalone Team, Org
  direct Agent, and Org Team member targets adapt into the same Agent/Team
  surfaces and interaction ports. Reuse is structural, not copied markup.
- **Owning-root Messages facet:** Team and Org contexts adapt their one durable
  message authority into the same exact selected-Agent presentation port. Team
  identity/task presentation stays separate, so reuse does not grant a mounted
  Team ownership of Org messages.
- **Subject-owned draft, shared presentation:** Team and Org keep separate
  launch stores and payloads, while a pure Org projector adapts a real mounted
  flat Team into the accepted Team form view models and typed edit events. The
  UI is visually and behaviorally continuous without a generic domain owner.
- **Root lifecycle action placement:** root stop belongs to the subject history
  row; member focus and mounted-Team presentation cannot acquire root lifecycle
  authority.
- **Idle-gated existing settlement:** terminal task settlement tries to prepare
  the exact execution only if already quiescent. Active work defers without
  waiting and retries on the established idle event; prepared work uses the
  existing durable transaction. Root shutdown completes the stable frozen
  scope's AgentRun input/provider-start/interrupt fence before either general
  task-command or settlement drain.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/collaboration-definition-admission/` | New folder | Definition Admission | source registry, exact target admission/dependency closure, diagnostics/new-work gate | legacy decoder, definition writes, runtime/history policy |
| `autobyteus-server-ts/src/agent-org-definition/` | New folder | Org Definition | Org domain/provider/service/source ownership | runtime managers, Team mutation |
| `autobyteus-server-ts/src/agent-team-definition/` | Existing folder | Team Definition | Agent-only Team/coordinator/local Agents | Org members, recursive resolver |
| `autobyteus-server-ts/src/agent-collaboration/definition/` | Existing/extended | Collaboration | resolved variants, endpoint catalog, handoff compilation | file I/O, live runs |
| `autobyteus-server-ts/src/agent-collaboration/services/` | Existing/extended | Collaboration | configuration resolver | runtime root registry or persisted root union |
| `autobyteus-server-ts/src/agent-collaboration/execution/` | New extraction folder | Collaboration Execution | tagged identities/context, configured-Agent backend, one task lifecycle engine, message engine, active-root directory, mixed location facade | concrete RootTeamRun/AgentOrgRun, subject tree/store/event, waiting non-quiescent local settlement, GraphQL |
| `autobyteus-server-ts/src/agent-execution/{domain,input}/` | Existing folders | Agent Execution | canonical input/dispatch/turn lifecycle, ordinary termination, quiescent preparation, irreversible root-shutdown fence | task records, root enumeration, subject persistence, provider timeout/replay policy |
| `autobyteus-server-ts/src/agent-team-execution/` | Existing folder | Team Execution | native RootTeamRun/manager/service, flat planner, Team adapters; `local/` owns root-neutral flat-Team execution | Org root, configured Team children, Org persistence |
| `autobyteus-server-ts/src/agent-org-execution/` | New folder | Org Execution | AgentOrgRun/manager/service/planner/index, explicit scope builder, Org operation gate/frozen termination composition, adapters/events/sidecars/persistence | Team V2 authority, coordinator, catch-all activator, Agent input policy, generic root |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-communication-adapter.ts` | Existing/extended | Org Execution | post-durable root communication plus both-endpoint callback before input release | endpoint classification, second record/store, browser/UI logic, schema or replay policy |
| `autobyteus-agent-presentation-contracts/src/` | New workspace package | Agent Presentation Contract | strict root-neutral Agent presentation details and parsers | subject/root envelope, change sequence, stream socket or UI state |
| `autobyteus-server-ts/src/run-history/domain/` | Existing folder | Persistence contracts | shared exact records + subject history rows | generic persisted root |
| `autobyteus-server-ts/src/run-history/store/team-run-execution-tree-*.ts` | Existing files | Team Persistence | exact native V2 schema/path/store | Org keys or fallback |
| `autobyteus-server-ts/src/run-history/store/agent-org-run-execution-tree-*.ts` | New files | Org Persistence | exact V1 schema/path/store | Team root or try-both logic |
| `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts` and mixed location callers | Existing files | Memory layout | tagged family root plus unchanged relative TeamRun ancestry | shallow Org-only path, inferred kind, or flat-Team path rewrite |
| `autobyteus-server-ts/src/run-history/services/root-*-projection*.ts` | New files | Mixed Read | explicit-kind derived catalog/tree projection | lifecycle, kind inference |
| `autobyteus-server-ts/src/run-history/services/agent-org-run-history-catalog-service.ts` | Existing/extended | Org History | preserve rows, serialize normal summary attempts, and apply the shared writer result | trace inference, duplicated physical mutation, Agent admission, UI state, Team history |
| `autobyteus-server-ts/src/run-history/services/agent-org-run-history-summary-writer.ts` | New file | Org History Persistence | stateless shared Team-normalized first-write/atomic-reread primitive over strict current rows | queue ownership, migration inference, manager/catalog construction, UI state |
| `autobyteus-server-ts/src/run-history/services/agent-org-member-run-view-projection-service.ts` | New file | Org Member Read | exact Org member conversation/activity/checkpoint projection | Team-root location, current definition reinterpretation |
| `autobyteus-server-ts/src/run-history/services/root-run-package-readiness-index.ts` | New file | Current Run Readiness | family-path/target-manifest inventory and compound-kind readiness | legacy payload decoder, transformation, or try-both validation |
| `autobyteus-server-ts/src/app-data-migrations/migrations/agent-org-flat-team-families-v1/` | New folder | Migration | server-owned retired definition and Org-like Team Run conversion knowledge | current services importing old codecs; external writers/converters |
| `autobyteus-server-ts/src/app-data-migrations/migrations/agent-org-history-first-message-summary-v1/` | New folder | Migration | startup-only strict configured-member trace classifier, root communication/task exclusion correlation, and provenance-qualified unique-earliest Org history backfill | current runtime/web import, positive inference from sidecars, task-node scan, later-trace promotion, Team mutation, tie-break or alternate index |
| `autobyteus-server-ts/src/api/graphql/types/agent-org-*.ts` | New files | GraphQL Org adapter | Org definitions/run APIs | Team coordinator default/focus |
| `autobyteus-server-ts/src/api/graphql/types/definition-admission.ts` | New file | GraphQL Operations | actionable unavailable definition/dependency diagnostics | fallback activation or source mutation |
| existing `agent-team-*.ts` GraphQL files | Existing files | GraphQL Team adapter | flat Team APIs | Team member kind containing Team |
| `autobyteus-team-stream-contracts/` | Existing package | Team stream | compatible Team-only view/events | Org payload |
| `autobyteus-collaboration-stream-contracts/` | New package | Mixed/Org stream | tagged Team/Org dispatch plus strict Org snapshot/events/commands/acks | runtime logic, opaque payloads or inferred kind |
| `autobyteus-web/components/agentOrgs/` | New folder | Web Org | RV-012 catalog/detail/builder | coordinator/entry/copy Team |
| `autobyteus-web/components/agentTeams/` | Existing folder | Web Team | Agent-only Team authoring/detail | Team library/nesting UI |
| `autobyteus-web/components/collaboration/handoffs/` | New shared UI | Handoff presentation | From/To/When list/editor/reorder/errors | endpoint/persistence policy |
| `autobyteus-web/types/workspace/collaborationMessagesContextView.ts` and `components/workspace/collaboration/` | New extraction | Web shared communication presentation | tight owning-root selected-Agent facet and established Messages list/detail/reference components | subject store/socket/delivery/lifecycle, generic root context or custom Org dashboard |
| `autobyteus-web/services/agentOrgExecution/agentOrgCommunicationPerspective.ts` | New/split file | Web Org presentation | complete configured Org identity and selected-participant message projection | same-Team filter, current definition, visible-tree or transport dependency |
| `autobyteus-web/stores/{agentOrgRunConfigStore,teamRunConfigStore}.ts` | Existing/refactored | Web config subject owners | separate root/placement drafts; Org uses exact Team/Agent maps and existing Org payload | one conditional cross-subject blob or cross-store import |
| `autobyteus-web/utils/agentOrgLaunchPatch.ts` | New file | Web Org config contract | canonical sparse Team/Agent patches with explicit dependent config clear | store/API imports, parallel raw state, server policy |
| `autobyteus-web/utils/editableAgentOrgRunFormModel.ts` | New file | Web Org config projection | strict fixed-depth Org/Team definition + draft to accepted Team view models/count/diagnostics | store mutation, launch payload, silent omission/repair, nested Teams |
| `autobyteus-web/components/workspace/config/MemberOverridesDisclosure.vue` | New extracted file | Web shared config presentation | accepted compact outer disclosure/a11y/visibility-preserving slot | subject state, traversal, patches, API |
| `autobyteus-web/components/workspace/config/{TeamMemberConfigTree,TeamScopeConfigEditor,MemberOverrideItem}.vue` | Existing/reused | Web Team config presentation | accepted Team row/scope/Agent field and typed edit grammar | Org store/payload branches, lifecycle, configured Team recursion |
| `autobyteus-web/components/workspace/config/AgentOrgRunConfigPanel.vue` | Existing/refactored | Web Org config adapter | compose strict Org projection, shared root workspace default and canonical existing Org launch command | local serializer, bespoke mounted-Team hierarchy, Team run store/payload, effective server policy |
| `autobyteus-web/components/AppLeftPanel.vue` | Existing/simplified | Web shell | one always-mounted Workspace history surface | route/root-kind history component selection |
| `autobyteus-web/{stores/runHistoryStore.ts,stores/runHistoryLoadActions.ts,stores/runHistoryStoreSupport.ts,stores/runHistoryTypes.ts,utils/runTreeProjection.ts}` | Existing/refactored | Web mixed history read model | combine the existing Workspace Agent/Team query and only the strict AgentOrg branch of existing collaboration-root history; retain per-family results/errors, stable row keys, tagged grouping and ordered categories | presentation state, duplicate Team query rows, unchecked Org JSON, current route, subject runtime ownership, kind inference |
| `autobyteus-web/{components/workspace/history/WorkspaceAgentRunsTreePanel.vue,components/workspace/history/WorkspaceHistoryWorkspaceSection.vue,components/workspace/history/workspaceHistorySectionContracts.ts,composables/useWorkspaceHistoryTreeState.ts}` | Existing/refactored | Web workspace-history presentation state and rendering | one mounted controller for expansion/reveal/highlight plus the panel scroll surface; render existing rows plus Orgs directly below Teams; consume read-model keys/existing selection identity and emit typed actions | history fetching/grouping, selected subject identity, subject lifecycle/runtime, route-specific duplicate controller, mounted-Team root action, direct persistence |
| `autobyteus-web/stores/agentOrgRunStore.ts` | Existing/simplified | Web Org command adapter | exact launch/restore/terminate pending/error/result only | history list/query/cache or import of the unified history store |
| `autobyteus-web/services/rootExecution/` | New/refactored | Web mixed facade | tagged route/history dispatch | Org context duplication, raw event retention, definition policy, family guessing |
| `autobyteus-web/services/agentOrgExecution/` and `stores/agentOrgContextsStore.ts` | New/refactored | Web Org runtime | strict context hydration, streaming, AgentContexts, mounted-Team views, nullable focus/recovery, and accepted-SEND_MESSAGE notification to the mixed history read action | standalone-Team registration, protocol rendering, durable focus, optimistic summary or history ownership |
| `autobyteus-web/components/workspace/{agent,team}/*Surface.vue` | New by extraction | Web accepted workspace | store-neutral Agent/Team runtime presentation and action ports | root sockets, subject stores, copied Org markup |
| `autobyteus-web/components/workspace/org/AgentOrgWorkspaceView.vue` | Replace in place | Web Org focus | approved no-focus prompt and exact shared-surface selection | raw event list, custom composer/header, JSON fallback, lifecycle button |
| workspace collaboration/right-tool/history components | Existing/refactored | Web workspace | Product runtime hierarchy, context tools and root actions | recursive configured depth, persisted focus, mounted-Team root authority |
| package `agent-orgs/<id>/org.md`, `org-config.json`, optional `agents/`, `agent-teams/` | Physical source | Org provider | Org plus owned sources/references | nested Org or Team-under-Team |
| package `agent-teams/<id>/team.md`, `team-config.json`, optional `agents/` | Physical source | Team provider | reusable standalone Team | child `agent-teams/` source |
| `$MEMORY_ROOT/agent_teams/<rootTeamRunId>/team_run_execution_tree.json` | Exact physical authority | Team V2 store | native Team execution tree/package | `subjectKind`, Org root, path move |
| `$MEMORY_ROOT/agent_orgs/<orgRunId>/agent_org_run_execution_tree.json` | Exact physical authority | Org V1 store | native Org execution tree/package | coordinator/focus, Team root |
| `$MEMORY_ROOT/agent_orgs/<orgRunId>/agent_org_task_delegation_records.json` | Exact Org sidecar | Org task store | strict Org envelope + exact task records | `rootTeamRunId` or Team store fallback |
| `$MEMORY_ROOT/agent_orgs/<orgRunId>/agent_org_communication_messages.json` | Exact Org sidecar | Org communication store | strict Org envelope + exact message records | Team filename/envelope or cross-root messages |
| `$MEMORY_ROOT/<family>/<rootRunId>/<teamRunLineage...>/<agentRunId>/` | Physical Agent memory | Memory layout | direct/mounted/task Agent content under owning root family | synthetic Team segment for direct Org Agent or per-Agent migration |
| `$MEMORY_ROOT/team_run_history_index.json` | Existing derived file | Team History | native Team rows | Org rows after migration |
| `$MEMORY_ROOT/agent_org_run_history_index.json` | Derived file | Org History | strict Org rows plus the first stable normalized summary; existing shape reused | Team rows, execution topology, traces or multiple summary authorities |

### Files/Paths Deleted Or Renamed As A Unit

AD-REV-019 clean cut: remove `OrgCommittedMessagePresentationEligibility` and
`classifyCommittedMessageEndpoints` kind branches, the web configured-map/task-set
partition, Team-only task eligibility and address-only task focus. Rename Org
Team-bound task projector to `agentOrgTaskPresentation.ts`, extract task types
from `teamDelegatedTaskEntries.ts`, move the task section into collaboration UI,
and move the task-system visibility utility to its shared presentation owner.
Update all imports in the same change; retain no aliases or dual policies.
Remove placeholder task seed metadata and source platform-binding substitution.
Existing durable readers/records, Team adapters and migration history remain.


AD-REV-007 clean-cut presentation renames are included in the same implementation commit: `NestedTeamAggregateStatusDot.vue` -> `TeamAggregateStatusDot.vue` and `workspaceHistoryNestedTeamStatus.ts` -> `workspaceHistoryTeamBranchStatus.ts`, with all imports/tests/localization keys updated and no alias component/module left behind.

- Do **not** rename/move `agent-team-execution`, Team V2 store/path files,
  `autobyteus-team-stream-contracts`, or native flat Team runtime directories as
  a generic collaboration subsystem. RER-016 explicitly retains them.
- Delete configured-recursion owners after all callers move: recursive Team
  graph resolver/validator, Team-local Team discovery, recursive configured
  planner branches/types, configured-child-Team factory path, nested Team
  selectors/inputs, and Org-as-Team UI/API code.
- Replace/delete the normal retired recursive `team-definition-config.ts` codec and
  exports as one unit after the migration-only decoder and both strict target
  codecs are in place. No compatibility re-export or silent normalizer remains.
- Add `agent-org-execution` beside Team execution. Extract only concrete shared
  identities/context/configured-Agent/task/message mechanisms to
  `agent-collaboration/execution/`; move the one-Team local runtime into
  `agent-team-execution/local/`. Do not move the whole Team subsystem or create
  a public generic root.
- Move/rename `team-run-file-commit-writer.ts` to the subject-neutral physical
  `atomic-run-package-file-commit-writer.ts`; preserve its write semantics while
  moving Team/Org file-role selection to strict stores. Remove normal shared
  imports of `MemberTeamContext`, `TeamMemberExecutionIdentity`,
  `MemberTaskRootResolver`, `MixedAgentMemberHandle`, the root-creating mixed
  factory, and the placeholder `AgentOrgExecutionActivator` only after all
  callers use the replacement capabilities.
- Regenerate `autobyteus-web/generated/graphql.ts` and mixed stream generated
  types from new authoritative schemas. Do not hand-maintain compatibility
  aliases.
- Replace `AgentOrgWorkspaceView.vue` as a unit: delete its raw `events`/`focusedEvents`
  consumption, `eventLabel`/`eventText`, `JSON.stringify` fallback, bespoke
  textarea/send form, custom focused-member header and member-header `Stop Org`.
  Delete the direct `rootExecutionViewStore.sendAgentOrgMessage` component path
  and the Org `events[]` reducer state after the typed context/interaction path
  is live. Do not leave the raw dashboard hidden behind a feature flag or error
  fallback.
- Extract the accepted markup/behavior from `AgentWorkspaceView.vue` and
  `TeamWorkspaceView.vue` into their surface components, then keep the original
  files only as standalone subject adapters. Do not copy those components under
  `workspace/org`, and do not remove or reimplement `AgentEventMonitor`,
  `AgentConversationFeed`, `AgentUserInputForm`, or the existing standalone Team
  confirmation behavior.
- Remove every `z.unknown()`/opaque payload in the AgentOrg snapshot/live-event
  branch of `@autobyteus/collaboration-stream-contracts` and every `any` cast used
  to render Org events. The Team-only contract may remain separately compatible;
  no normal dual Org event parser or JSON text fallback survives.
- Keep Org root termination on its root row after moving that row into the
  unified `WorkspaceAgentRunsTreePanel`/workspace-section path; remove any
  terminate command from focused Agent/Team surfaces. A mounted Team receives no
  stop control and is never inserted into standalone Team stores.
- Replace `AgentOrgPlacementOverrideRow` as one clean unit: remove its Team-kind
  branch and the current always-exposed Team-child rendering. Rename the retained
  direct-Agent-only concern to `AgentOrgDirectAgentOverrideRow`, or delete it if
  an existing exact primitive preserves that row. Do not keep an alias, feature
  flag, compatibility prop, or historical layout.
- Extract only the compact outer disclosure shell from `TeamRunConfigForm`; both
  callers use `MemberOverridesDisclosure`, while existing Team tree/scope/Agent
  editors remain the single Team presentation. Remove duplicated Org Team-row
  markup and any mixed Org `memberOverrides` store shape once exact Team/Agent
  maps and launch serialization are live.
- Extract the exact Org root/tree/status row concerns from
  `AgentOrgRunHistoryPanel` into the unified workspace-section presentation,
  then delete `AgentOrgRunHistoryPanel`, its `AppLeftPanel` route branch, and its
  standalone tests/imports in one change. Preserve root actions through the
  typed subject-action adapter; leave no wrapper, flag, or fallback panel.
- Runtime migration atomically renames only organization-like package
  directories directly from `agent_teams/<id>` to `agent_orgs/<id>` after the
  prospective Org tree and Org task/message sidecars validate/correlate inside the source package; flat Team
  directories/files are untouched.
- No file/path under `/home/autobyteus/workspace/autobyteus-agents` or
  `/home/autobyteus/workspace/autobyteus-private-agents` is added, deleted,
  renamed, committed, or released by this ticket. They appear only in
  source-registry/admission and zero-write validation evidence.

## Folder Boundary Check

| Folder | Depth / Boundary | Clear? | Justification |
| --- | --- | --- | --- |
| `collaboration-definition-admission` | domain/providers/services | Yes | Cross-subject source/admission policy, no subject mutation or runtime authority. |
| `agent-org-definition` | Subject domain/services/providers | Yes | Org has independent authoring/source invariant. |
| `agent-team-definition` | Subject domain/services/providers | Yes | Flat Team remains independently launchable/reusable. |
| `agent-collaboration` | Shared address/handoff/config mechanisms | Yes | Tight cross-root semantics; no public root authority. |
| `agent-collaboration/execution` | Internal shared execution capabilities | Yes | Tagged mandatory identities/ports and record engines only; concrete subject state remains outside. |
| `agent-team-execution` | Team root plus `local/` one-Team mechanics | Yes | Root and local Team depths are explicit; local factory is Org-consumable but cannot own a root package. |
| `agent-org-execution` | Org root runtime/adapters/sidecars | Yes | New lifecycle/persistence subject; composes only the Team-local factory and shared execution ports. |
| `run-history/store` | Subject stores + tight record schemas | Yes | Two strict authorities remain visibly separate. |
| migration folder | Historical transformation boundary | Yes | Only place old organization-like Team V2 is valid. |
| `autobyteus-agent-presentation-contracts` | Root-neutral wire detail package | Yes | Closed Agent presentation bodies are reused below Team/Org envelopes; no runtime or root owner leaks inward. |
| Team vs collaboration stream packages | Subject-only vs mixed transport | Yes | Avoids breaking Team-only consumers or false package naming. |
| Web `agentOrgs` / `agentTeams` | Subject-specific presentation | Yes | Prevents conditional invalid form state. |
| Web `rootExecution` | Mixed route/history facade | Yes | Dispatches by explicit root kind without duplicating subject contexts. |
| Web `agentOrgExecution` | Org browser aggregate | Yes | Hydration, stream, AgentContexts, mounted-Team views and focus recover together under one owner. |
| Web Agent/Team surface components | Store-neutral presentation boundary | Yes | Accepted workspace reuse is structural while standalone/Org wrappers retain subject command ownership. |
| Web `workspace/config` shared presentation | Disclosure plus Team scope/tree/direct-Agent editors | Yes | Mature Team launch visual/interaction grammar is reused; subject stores and command adapters remain outside the folder's presentation components. |
| Web AgentOrg config store/projector | Subject draft owner plus pure fixed-depth projection | Yes | Keeps exact Org state/payload separate while adapting mounted Teams to accepted presentation models. |

## Concrete Examples / Shape Guidance

| Topic | Good Shape | Avoid | Why |
| --- | --- | --- | --- |
| Team reuse | Org member stores `{kind:'agent_team', ref:'software-engineering-team'}` and Org handoffs; Team source/ID/history unchanged | Copy/fork Team into Org subtype | REQ-018. |
| Team durable tree | Existing flat Team stays `schemaVersion:2`, `rootTeam`, same file/path | Add subjectKind/root rename or version bump | Approved native no-op. |
| Org durable tree | `schemaVersion:1`, `subjectKind:'agent_org'`, `rootOrg`, no coordinator, separate path | Generic root file with optional coordinator | Exact approved Org truth. |
| Org execution composition | `AgentOrgRun -> Org adapters -> ConfiguredAgentExecutionHandle + FlatTeamExecutionFactory`; mounted Team has no root registry/package | Synthetic RootTeamRun, standalone Team roots, or standalone direct Org Agents | One Org lifecycle/durability owner. |
| Tagged member context | `{root:{rootSubjectKind:'agent_org',rootRunId}, memberAddress, agentRunId}` plus bound task commands | `rootTeamRunId` alias or resolver returning RootTeamRun | Same Agent tools operate without false Team ownership. |
| Org memory | `agent_orgs/<org>/<teamRunLineage...>/<agent>`; direct Agent has empty lineage | shallow-only helper that loses mounted/task Team lineage or synthetic root segment | Preserves direct package rename and exact content. |
| Org sidecars | strict `subjectKind/orgRunId` envelopes over unchanged record semantics; only DS-043 proven attachment locator values change during cutover | reuse Team envelope/filename and reinterpret `rootTeamRunId` | Fail-closed subject truth. |
| Mixed projection | `{root_subject_kind:'agent_team', execution_tree: teamV2Dto}` or Org branch | Infer from missing coordinator/version/name | Fail-closed correctness. |
| Fixed depth | Org `/software_engineering_team/architecture_designer`; Team `/architecture_designer` | `/department/team/subteam/agent` | Explicit configured ownership. |
| Task host | Org Agent delegates to `/software_engineering_team`; fresh task Team lives in exact host `taskExecutions` | Add task Team to Org `members` | Configured vs task distinction. |
| Handoff compile | Org saved edges first; then each Team-local saved list in stable Org placement order, rebased once | Team-local-first, owner regrouping, sorting/deduping, or recursive indefinite compile | Preserves current observable rule lookup and owner separation. |
| Definition admission | exact current Team/Org configs -> available, or stable unavailable diagnostic | retry old parser, silently add/remove `refType`, or mutate external source | REQ-026/027 target-only boundary. |
| Definition save | Complete ordered candidate + expected revision -> validate -> normal-authoring atomic package commit | Per-handoff/per-file writes or silent stale repair | Atomicity/reversibility. |
| Org configuration | root choices + `/team` patch + `/team/agent` patch -> server complete plan | Trust client expansion or Team defaults silently win | Deterministic specificity. |
| Org launch hierarchy | Org-owned sparse maps -> strict fixed-depth projector -> shared collapsed Member overrides -> independently collapsed `TeamMemberConfigTree` -> exact Team/Agent edit commands -> unchanged Org launch input | Bespoke Org Team editor, always-exposed children, Team run store/payload reuse, or implicit inherited state | Same established user experience with distinct underlying ownership. |
| Org focus | launch returns Org run ID/focus null; explicit Team row maps to stored coordinator | pre-launch entry, first Agent, durable focus | Activation/target separation. |
| Org direct-Agent UI | strict Org event -> exact AgentContext -> `AgentWorkspaceSurface` -> accepted monitor/composer | raw root-event card or Org-specific textarea | VIS-017 is the accepted Agent conversation, not a dashboard. |
| Org Team UI | exact Team focus -> mounted `TeamWorkspaceContextView` -> `TeamWorkspaceSurface` -> coordinator/member AgentContext | register mounted Team as standalone or duplicate Team markup | VIS-018 reuses Team presentation without creating Team lifecycle authority. |
| Org Agent event | raw callback -> presentation adapter -> strict Org subject envelope -> stream reducer -> existing Agent handlers | `event: unknown`, component `any`, `JSON.stringify` | Protocol truth and UI state meet at one typed boundary. |
| Org commands | active target port -> strict send/interrupt/approve/deny command -> exact AgentOrgRun command -> typed ack | component-owned socket/send-only special case | Accepted composer and tool cards retain behavior parity. |
| Root stop | active Org history root-row action -> AgentOrgRunService termination | focused member header or mounted-Team terminate | Lifecycle action stays with its root owner. |
| Migration | existing startup runner + server-owned definition conversion + flat execution-tree hash/path unchanged + validated Org target with DS-043 locator preservation followed by one direct package rename; external roots zero-write | rewrite external projects, rewrite all runtime Teams, custom journal/staging/recovery, try-both reader, recursive flattening | Minimal in-scope change, forward-only runtime, and exact ownership/runtime contracts. |
| API split | explicit Org and Team create/restore plus compound mixed read identity | `createGroupRun(id)` or `getRun(id)` guesses kind | Subject authority. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Clean-Cut Replacement / Preservation |
| --- | --- | --- |
| Keep recursive Team definitions beside Org | Rejected | Convert known Org roots; all current Team inputs reject Team members. |
| Keep retired recursive/version-bearing Team config in normal admission | Rejected | Exact current Team Definition Config and current Org Definition Config; legacy decode only for server-owned migration. |
| Retry/normalize retired external config | Rejected | One target-only unavailable diagnostic; external owner publishes the exact target package. |
| Rewrite the two external definition repositories in this ticket | Rejected as out of scope | Read-only validation/dependency diagnostics and separate owner follow-up; never claim their delivery. |
| Make Team coordinator optional | Rejected | Separate coordinator-free AgentOrg subject/root. |
| Generic persisted V3/root union/store/path | Rejected and superseded | Exact Team V2 + exact Org V1. |
| Generic public root aggregate/base to solve IDI-001 | Rejected | Two subject aggregates over tagged internal capabilities and private adapters. |
| Synthetic Team root/coordinator for Org | Rejected | Native AgentOrgRun with direct root Agent handles and mounted local Teams. |
| Register mounted Org Teams in AgentTeamRunManager | Rejected | Org owns local Team executions; no Team root package/registry. |
| Launch direct Org Agent as standalone AgentRun | Rejected | Root-neutral configured-Agent handle remains owned by Org aggregate. |
| Keep `MemberTaskRootResolver` and cast/union return | Rejected | Bound `MemberTaskCommandCapability` exposes commands, not aggregate identity. |
| Reuse Team task/message envelopes inside Org | Rejected | Strict Org envelopes and stores over exact shared record bodies. |
| Rewrite/move flat Team V2 | Rejected | Leave file/path/bytes native; only stricter validation. |
| Normal reader tries Team then Org | Rejected | Explicit family/kind dispatch and strict one-family reader. |
| Leave migrated Org-like Team package in both paths | Rejected | Preflight destination absence, validate target in the source package, then one direct atomic source-to-target directory rename and strict reread. |
| Auto-retype/move wrong-family payload on restore | Rejected | Failure-closed mismatch; the registered startup migration is the sole old-shape boundary. |
| Recursively flatten unexpected depth | Rejected | PRE-002 failure before writes. |
| Copy Team on Org adoption | Rejected | Stable definition reference and Org-owned handoffs. |
| Global Team lookup in delegation | Rejected | Same-root mounted address only. |
| Keep ignored Org `entryAddress` | Rejected | Coordinated Org API/UI cut; full-scope no-focus launch. |
| Per-handoff mutations | Rejected | Complete revisioned parent candidate save. |
| Force old Team-only consumers onto mixed DTO | Rejected as unnecessary break | Retain compatible Team-only surface; add mixed/Org contracts. |
| Render raw AgentOrg events or keep a JSON fallback | Rejected | Strict Agent presentation admission, Org envelope, context reducer and accepted event monitor. |
| Maintain a separate AgentOrg runtime dashboard/composer/header | Rejected | Thin focus adapter over extracted Agent/Team workspace surfaces. |
| Register mounted Org Team in standalone Team stores to reuse UI | Rejected | Read-only `TeamWorkspaceContextView` adapter remains owned by `AgentOrgExecutionContext`. |
| Put Stop Org on a focused member surface | Rejected | Active Org history root-row lifecycle action; mounted Team has no independent stop. |
| Keep the superseded bespoke AgentOrg Team override layout beside the accepted Team editor | Rejected | One Org projector/command adapter drives the existing Team disclosure/scope/Agent components; remove the Team branch of `AgentOrgPlacementOverrideRow`. |
| Reuse `teamRunConfigStore` or Team launch payload to obtain UI parity | Rejected | Share presentation/view models only; Org draft maps and GraphQL launch input remain AgentOrg-owned. |
| Keep send-only Org socket commands | Rejected | Strict send/interrupt/approve/deny command and acknowledgement union behind `AgentInteractionPort`. |
| Treat `NO_ACTIVE_TURN` as complete root interruption while admitted/provider-start-pending input exists | Rejected | AgentRun-owned irreversible fence joins/cancels the exact input and resolves only when no post-phase provider start remains possible. |
| Change ordinary `prepareTermination()` to cancel all admitted input | Rejected as unnecessary behavior drift | Preserve its origin/personal FIFO-drain contract; cancellation is scoped to explicit root shutdown. |
| Add provider timeout, replay, force-kill, settlement coordinator/token/job, or persisted shutdown phase | Rejected as disproportionate | Existing AgentRun dispatch/admission/interrupt owner plus recursive frozen scopes close the supported race. |

## Derived Layering

Explanatory only:

1. **Presentation/transport:** root-neutral Agent presentation details,
   subject GraphQL, Team-only and mixed/Org streams, Agent tools, web
   authoring/config and shared Agent/Team workspace surfaces.
2. **Application boundaries:** subject definition/run services, definition
   transaction, configuration resolver, mixed projection service.
3. **Domain/control:** Org/Team definitions, resolved topology, endpoint/handoff
   policy, subject planners/aggregates/indexes/private adapters and task-host
   invariants.
4. **Internal execution capabilities:** tagged identities/context, configured-
   Agent handle, Team-local factory, task/message engines, active-root directory
   and location facade. Subject roots depend on these ports; they do not depend
   on each other's managers/stores.
5. **Providers/persistence:** AgentRun providers plus subject definition
   providers, Team V2 and Org V1 trees/sidecars/history/memory.
6. **Migration:** old configured recursion and organization-like Team V2 codecs,
   fixed transforms, atomic current-file writer, direct package rename, cleanup,
   and bounded dispositions behind the existing runner; no upward dependency
   from current code.

A caller may not use both an application boundary and its internal
provider/manager/store.

In the browser, `rootExecutionViewStore -> AgentOrgExecutionContext ->
ActiveAgentWorkspaceTarget -> Agent|TeamWorkspaceSurface` is the corresponding
authority chain. Components do not bypass the context to use the collaboration
socket, raw root events, standalone Team stores, or subject GraphQL clients.

## Change / Refactor Sequence

Execute the AD-REV-025 six-step sequence in DS-043 after independent review; reconcile rather than overwrite IR-048 and its preserved other-owner evidence.

For the latest RER-029 delta use DS-033 sequence: codecs/consumers, isolated
historical validation plus new registered pass, repository configs/fixtures,
diagnostics/docs, then source/API review and fresh Delivery. Previous steps
below retain cumulative obligations, not instructions to replay completed work.

1. **Refresh/freeze base.** Integrate the latest authorized implementation base,
   verify worktree isolation, inspect any evolved dynamic-Team branch, and reject
   recursive configured mutation under REQ-017.
2. **Add strict definition admission and converted repository sources.** Add
   source descriptors/registry, exact current Team and Org
   Definition Config codecs, stable admission diagnostics/dependency closure,
   and migration-only legacy decoder. Convert only implementation-repository
   server-owned definition files and make CI target-scan them. Publish each
   target-only catalog only after the startup runner attempt and strict
   per-item readiness rebuild.
3. **Add shared exact run-record modules and golden fixtures.** Extract current V2
   configured Agent/Team, handoff, launch, binding/timestamp, task Agent/Team
   field shapes without serialized change. Freeze byte-level native Team V2
   fixtures before modifying validators.
4. **Split definition subjects.** Add AgentOrg domain/config/provider/service;
   narrow AgentTeam to Agents; add fixed-depth resolved variants, endpoint
   catalog, explicit compiler methods, and full candidate typed errors.
5. **Fix and freeze effective handoff order.** Implement `compileTeam` and
   root-first `compileOrg`; prove Org saved order, stable Team placement order,
   each Team saved list, and `rules[]` order through snapshot, migration,
   `get_handoff_rules`, effective projection, and UI display.
6. **Add atomic definition aggregate save.** Implement the normal-authoring
   package transaction plus subject revision locks/adapters. Verify
   create/update/cancel/conflict and one interrupted-save recovery category with
   zero partial visibility; keep this mechanism out of data migration.
7. **Extract tagged collaboration execution identities/context first.** Add
   `RootExecutionIdentity`, member/host/physical identities,
   `MemberExecutionContext`, bound task command contract, and explicit Team/Org
   memory/location composition. Update AgentRun/tool/context-file/run-file/token
   consumers cleanly; remove `MemberTaskRootResolver` and Team-root identity from
   shared Agent paths. Prove existing standalone Team tools still pass through a
   Team adapter before adding Org activation.
8. **Extract configured Agent execution.** Move provider/local mechanics from
   `MixedAgentMemberHandle` to `ConfiguredAgentExecutionHandle`; require all
   root callbacks/identity/scope/memory explicitly. Add prepare-configured-
   activation and preserve task preparation, retry-safe failure, platform binding,
   event adaptation and termination tests under both tagged root kinds without
   constructing either aggregate.
9. **Narrow the local Team plane.** Move one-Team mechanics under
   `agent-team-execution/local/`; create `FlatTeamExecutionFactory`; delete
   configured-child registry/materialization while retaining direct configured
   Agents and recursive task Team registries. Prove the factory creates no root
   files/manager registrations and maps Team/Org physical scopes correctly.
10. **Rebuild native Team root over the extracted ports.** Keep `RootTeamRun`,
    Team manager/service, exact Team V2 tree/sidecars/path/history and current
    Team semantics. Add Team task/message/event/platform-binding adapters and
    use the local Team factory with Team identity. Run the full focused Team
    runtime/tool/task/message/restore/fail-stop suite before proceeding.
11. **Extract task/message engines and physical writer.** Split shared
    record/FIFO/reservation lifecycle from Team tree/index/persistence/event
    adapters; move the atomic physical writer to a subject-neutral file while
    preserving Team write outcomes. No engine accepts a subject tree/store or is
    exposed above a root aggregate.
12. **Add strict Org state ownership.** Implement Org V1 tree/index/mutators,
    strict Org task/message sidecars, Org state-package loader/reopen repair,
    Org persistence coordinator, task/message/event adapters, and root task host.
    Prove family/sidecar mismatch and root correlation fail before live assembly.
13. **Implement explicit Org scope assembly and full activation.** Replace the
    placeholder activator with `AgentOrgExecutionScopeBuilder`; construct direct
    Agent handles and mounted local Teams, prepare all configured Agent
    candidates, gather/persist provider bindings with the complete Org package,
    publish/register only the full scope, and implement whole-root fail-stop and
    reverse teardown. Test direct Org Agent, mounted Team Agent, Org-root task
    host, Team-host task, restore and partial-preparation abort.
14. **Wire process/global lifecycle.** Add `ActiveCollaborationRootDirectory`,
    make global exact-Agent same-root routing use tagged roots, construct general
    process dependencies in the specified order, and shut down Org -> Team ->
    Agent. Keep application execution scopes Team-only but move them to the same
    extracted factories. Add construction-abort and aggregate shutdown tests.
15. **Add configuration resolver.** Server-authoritative Org root->Team->Agent
    and Team root->Agent resolution; validate all settings/workspaces before IDs
    and activation. Org returns no focus/entry.
16. **Add explicit mixed projections.** Preserve Team-only endpoints/contracts;
    add tagged history/tree/stream GraphQL and contract package, with family-
    payload-sidecar-branch agreement and negative mismatch tests.
17. **Implement/register migration and admission cutover.** Place after prior V2
    prerequisites and before service admission. For Org-like packages write and
    validate the prospective Org tree plus Org task/message sidecars, direct-
    rename the package, then clean retired Team authorities; keep Agent memory
    relative paths unchanged. Test the current 27 no-op flat and 16 Org-like
    fixtures plus cutover-generated cases, sidecar correlation, task hosts,
    destination collision, target-only retry, one interruption/relaunch,
    PRE-002 zero-write failure, external zero-write/non-blocking diagnostics,
    bounded runner summary/log, restart guidance and inventory count drift.
18. **Cut definition/launch external contracts.** Add Org
    GraphQL/tools/package discovery and admission diagnostics; remove nested Team
    input; preserve compatible Team-only run DTOs; regenerate GraphQL/contracts.
19. **Implement web/Product cut.** Add separate Team/Org catalog/builder/detail,
    owner-scoped handoff drafts, Org config, tagged workspace/history, nullable
    Org focus, exact Team-coordinator mapping, availability-filtered new-work
    catalogs, and RV-012 desktop/narrow/a11y. Existing snapshot history remains
    visible even when a current definition is unavailable.
20. **Convert only owned examples and remove obsolete code.** Convert all
    implementation-repository/server-data definitions from the authoritative
    inventory. Use Software Development Department/Northstar external packages
    only as read-only admission/diagnostic fixtures until owners update. Delete
    current recursive configured owners/selectors/docs, normal retired recursive parser,
    Team-root shared member/task contexts, root-creating mixed factory,
    configured-child APIs, placeholder Org activator, and stale generated mirrors
    where repository convention permits.
21. **Validate in risk order.** Run the separate
   `architecture-design-self-validation.md` use-case matrix as the design/code
    trace checklist, then exact definition/run/sidecar schemas; source ownership;
    Team regression; root-neutral factory contract tests; Org full activation/
    task/message/platform binding/restore/fail-stop/shutdown; migration; mixed
    mismatch; GraphQL/streams; VIS-001-VIS-020, VIS-STATUS-001-003, and
    VIS-OVR-001-006 browser journeys; full builds/
   typechecks. No source-review handoff occurs until all partial-draft and
   obsolete-test failures are resolved.
22. **Freeze the API/E2E defect baseline before workspace recovery.** Preserve
   the real-browser `03-org-live-raw-events-defect.png` and its imported-package
   setup as failing evidence. Stop further API/E2E claims. Do not edit, reset,
   stage or merge downstream-owned partial tests/reports while applying this
   architecture revision.
23. **Establish strict Agent presentation admission first.** Extract the closed
   root-neutral Agent presentation schemas and server adapter from the accepted
   Team path. Make Team callbacks use the adapter while golden-testing every
   retained Team-only outer message. Replace the Org `unknown` event branch with
   strict Agent/task/communication branches and strict identity/sequence
   correlation before any Vue change.
24. **Complete the Org server projection and command boundary.** Project only
   admitted Agent presentation messages from Org callbacks; add exact Org member
   resume/conversation/activity/trace projection; extend Org streaming commands
   and acknowledgements for send, interrupt, approve and deny through
   `AgentOrgRun.executeAgentCommand`. Prove wrong root/member/run correlations,
   malformed messages and unsupported commands fail closed.
25. **Build one checkpointed Org browser context.** Add
   `AgentOrgExecutionContext`, hydration service, strict streaming state machine,
   per-Agent AgentContexts, mounted-Team presentation views and nullable exact
   focus. Candidate hydration/stream recovery must swap atomically. Reduce
   `rootExecutionViewStore` to route/history delegation and delete its duplicate
   Org tree/focus/raw-event authority.
26. **Extract and route through the accepted workspace surfaces.** Extract
   store-neutral `AgentWorkspaceSurface` and `TeamWorkspaceSurface` without
   changing accepted standalone rendering. Generalize the active-context target,
   interaction, trace, token/file/artifact and Team-view ports. Make the Org view
   select only prompt/Agent surface/Team surface; remove every custom Org event
   card, header, composer, JSON fallback and direct component socket call.
27. **Correct lifecycle-action placement.** Add active Org stop/pending/error to
   the Org history root row with established Team-history interaction placement;
   remove Stop Org from member focus and prove mounted Teams expose no terminate
   action. Retain the independent standalone Team members-panel confirmation
   behavior unchanged.
28. **Revalidate the accepted running experience before API/E2E resumes.** Run
   strict contract/parser and Team-wire golden tests; Org hydration/sequence-
   gap/reconnect tests; direct-Agent and mounted-Team conversation, context-file,
   interrupt and tool-decision component/integration tests; root-stop and
   mounted-Team negative tests; import-boundary scans; desktop/narrow/a11y
   screenshot comparison against VIS-016-VIS-018 and VIS-PROMOTE-002-004; then a
   real imported-package browser prompt that proves normal conversation/tool
   rendering and absence of raw JSON/custom Org controls. Source review and
   API/E2E may resume only after the revised independent Architecture Review
   passes and Implementation reconciles this sequence.
29. **Freeze the mounted-Team status gap evidence and authority.** Retain the user original-tree image, current `ORG-005` omission, CRR-009 failure-origin result, RER-021, focused Product spec/approval/manifest, and VIS-STATUS-001-003. Do not alter unrelated dirty API/E2E/test evidence.
30. **Extract the shared presentation policy cleanly.** Move five-state normalization/precedence into `workspaceTeamAggregateStatus.ts`; rename the reusable dot and Team-history adapter to neutral Team-branch names; update both locales/tests; leave no aliases or copied fold.
31. **Add the AgentOrg exact-branch adapter.** Traverse one configured Team node including recursive task-scoped Agent identities, inject status resolution from the exact Org context/history authority, exclude every outside branch, and normalize historical live-only/missing values as specified. Compute before collapse filtering.
32. **Wire the hierarchy without lifecycle changes.** Render the Team dot between disclosure and Team icon and exact Agent dots from the same authority. Preserve row focus, expansion, Org root stop, Team coordinator ingress, task interaction, and all backend/durable contracts.
33. **Revalidate the focused correction.** Run pure fold/traversal matrices, Team-history regressions, AgentOrg active reactive/expanded/collapsed/stopped component tests, a11y names/title, import/no-new-transport scans, and browser comparisons against VIS-STATUS-001-003 plus unchanged VIS-016-018. Then resume the normal Large/High source-review/API route only after Architecture Review passes.
34. **Freeze and classify API-FIND-008 evidence.** Retain the isolated passing
    control, the valid assignee-submit/delegator-accept prefix, the exact invalid-
    self-review reproduction, and ARCH-REV-006. Mark the invalid tail technical-
    only; never use it as a supported fixture or add timeout/replay machinery.
35. **Add the narrow AgentRun quiescence boundary.** Under AgentRun dispatch and
    input-admission ownership, implement `tryPrepareTerminationIfQuiescent` with
    immediate `null` for unresolved work and existing prepared termination for a
    quiescent run. Prove null has no admission/lifecycle side effect and no wait.
36. **Reconcile existing Team and Org settlement preparation.** Thread the new
    capability through configured Agent and task Team handles. A task-Team
    subtree prepares all-or-none; adapters treat null as existing deferred
    settlement, release the FIFO, and rely on existing idle/offline resweep.
    Preserve current `settledAt`, transaction, cancel/commit/finish, fail-stop,
    child eligibility, record, event and tool behavior. Add no coordinator/token.
37. **Add the irreversible AgentRun root-shutdown fence.** Serialize input claim
    and provider-start registration against `rootShutdownFenced`. Invalidate
    never-admitted reservations; emit the existing cancellation fact exactly
    once for admitted pre-forward entries; track provider-started/pre-turn work,
    interrupt on canonical start, and resolve only at terminal quiescence. Keep
    ordinary prepared termination's FIFO drain and make prepared cancellation
    unable to reopen a root-fenced run.
38. **Correct root shutdown composition in both families.** Root close first
    blocks every external/materialization/message admission and drains only
    already-admitted operations needed to stabilize active/prepared handle
    publication. Freeze the complete owned scope and recursively complete every
    AgentRun fence through direct Agents, mounted Teams, task Agents, prepared
    handles, and task Teams. Only then drain short task mutations, durably
    interrupt open task records, run deepest-first quiescent settlement, drain
    persistence, finish remaining local executions, and unregister. Preserve
    process Org -> standalone Team -> residual Agent order and aggregate real
    cleanup errors; do not introduce a timeout or force kill.
39. **Validate only supported liveness paths before API/E2E resumes.** Run the
    cumulative self-validation as a trace checklist. Deterministically hold a normal
    assignee provider turn open after successful submit while the different
    delegator accepts and an unrelated supported command completes; do not issue
    self-review. Separately hold a legitimate tool approval in an active task,
    enter Team/Org shutdown through the application handler, assert the full
    AgentRun fence precedes task drain, and complete. Retain current settlement failure and
    recursive task regressions. Then use normal task activation with a controlled provider barrier after
    input admission/provider-start registration but before `TURN_STARTED`, enter
    application SIGTERM, and prove either exact pre-forward cancellation or
    canonical start+interrupt; no provider call may occur after fence completion.
    Source review and cumulative API/E2E resume only after the coherent
    AD-REV-011 package independently passes and Implementation reconciles the
    reviewed AD-REV-009/010 mechanism.
40. **Freeze the superseded launch-override evidence and existing production
    reuse boundary.** Retain CRR-021/CR-FIND-020, RER-023, Product approval and
    VIS-OVR-001-006. Compare current `AgentOrgRunConfigPanel` and
    `AgentOrgPlacementOverrideRow` to the byte-identical current/origin-personal
    Team form chain. Do not edit Product artifacts or downstream-owned reports.
41. **Separate exact Org draft state before presentation reuse.** Replace the
    mixed Org override record with exact Team/Agent sparse maps and Team
    workspace selection/operation state. Add exact address-scoped commands and
    the unchanged Org launch-input mapper. Prove existing GraphQL
    `workspaceRootPath`, Team and Agent override fields are sufficient; make no
    server/schema change.
42. **Extract the accepted disclosure and add the strict Org projector.** Move
    only the compact outer shell from TeamRunConfigForm into
    `MemberOverridesDisclosure`; keep Team form behavior stable. Project the
    admitted Org plus real referenced flat Teams into one Team node level and
    exact Agent children. Fail closed with Run disabled on missing/inconsistent
    reference, member, coordinator, or address correlation.
43. **Replace the bespoke Org Team editor cleanly.** Compose
    `TeamMemberConfigTree -> TeamScopeConfigEditor -> MemberOverrideItem` from
    AgentOrgRunConfigPanel, route typed events back to the Org store, and retain
    the compact direct-Agent row as Agent-only. Delete the old Team-kind branch,
    always-exposed hierarchy, fabricated Team-as-Agent node, implicit inherited
    state, and any alternate layout.
44. **Revalidate UI parity and ownership together.** Execute projector/store/
    component tests for exact count, default and sibling-independent disclosure,
    Team `Inherited`/`Customized` and mounted-Team Agent
    `Inherited`/`Overridden` labels, coordinator Agent row, direct-Agent
    continuity, Team reset preserving
    Agent patches, collapse/reopen draft stability, Team workspace serialization,
    projection failure, direct Agent stability, and standalone Team regression.
    Render desktop and narrow production routes against VIS-OVR-001-006 and scan
    imports to prove no Org->Team store/payload dependency. Then route cumulative
    Large/High AD-REV-012 through independent Architecture Review before the
    downstream IR/CR/API route resumes.
45. **Freeze RER-024 evidence and canonicalize the Org launch patch.** Retain the
    Electron screenshots and exact frontend/server source trace. Add the pure
    idempotent patch canonicalizer, apply it at every Team/Agent store command,
    remove the panel-local serializer, and prove preview/variables/server/snapshot
    equality for the full SCN-014 matrix. Do not change the API or server merge.
46. **Restore the established root workspace policy.** Make fresh AgentOrg root
    configuration use the same actual-available Temp Workspace selection path as
    Team root. Keep descendant defaults disabled, project root inheritance and
    exact Team overrides, preserve explicit choices/errors, and prove workspace
    selection never changes focus.
47. **Consolidate the left Workspace/history owner.** Extend the mixed workspace
    read model by combining the existing Workspace Agent/Team query with only
    the strict AgentOrg branch of the existing collaboration-root query. Do not
    ingest its Team branch a second time. Add the ordered `Orgs` category
    directly below `Teams`; move Org root/hierarchy/status rendering and typed
    root actions into the unified workspace section. Remove the Org command
    store's parallel history cache/internal refresh, always mount the unified
    panel, then delete `AgentOrgRunHistoryPanel` and its route predicate without
    a wrapper or fallback.
48. **Self-validate and independently re-review AD-REV-013/014.** Run VAL-031-033 plus
    standalone Team/config/history regression, route-transition state retention,
    family/action negatives, absent-default failure, cross-layer configuration
    fixtures, desktop/narrow browser checks, and source scans proving no new API,
    persistence, lifecycle, second history owner, hard-coded workspace, or raw
    patch remains. Implementation resumes only after Architecture Review passes.

No temporary dual write, try-both runtime read, normal dual definition parser,
external-source writer, generic V3 root, public configured recursion, raw Org
event dashboard, JSON presentation fallback, duplicate Org composer, or
standalone registration of a mounted Team may survive the cutover. Neither may
waiting preparation of a non-quiescent task execution inside the mutation FIFO,
a drain-before-fence root shutdown, provider dispatch after a completed AgentRun
fence, any dormant AD-REV-008 coordinator/token/dependency path, or the
superseded bespoke AgentOrg mounted-Team override hierarchy.
The same clean-cut rule rejects a hand-written sparse Org serializer, a
route-selected Org-only history panel, and an Org-specific or hard-coded
workspace default path.

### AD-REV-015 Reconciliation Sequence

1. **Current history authority first:** add/test the stateless shared summary
   writer and the Org catalog's serialized invocation, including pre-existing
   value, missing-row, empty, atomic-write/reread failure, and rebuild-preservation
   cases.
2. **Exact command observation:** add the internal command-with-kind Org outcome while preserving admission,
   service activity facade, stream accepted-result ordering, and production
   composition injection. Prove direct and mounted Agents qualify while task,
   inter-Agent, system, approval/interrupt, rejected/failed and empty paths do
   not.
3. **Authoritative live projection:** wire the accepted-message notification to
   the existing mixed history owner, add one Org-family request generation, and
   prove the row changes without route/navigation while stale/failed responses
   cannot erase a newer committed slice.
4. **Historical migration:** implement/register the startup-only classifier
   after the named family/trace prerequisites; test unique direct/mounted
   evidence, sidecar negative correlation, nonqualifying earliest facts,
   existing non-empty, absent/tied/invalid evidence, deterministic warnings,
   interrupted retry/idempotence, and strict reread without constructing runtime.
5. **Cumulative regression/removal scan:** run Team summary, AgentOrg command,
   history, migration, WebSocket composition and web shell tests; assert no new
   durable/API schema, no normal migration-classifier import, no second Org
   manager/catalog, no optimistic summary, and no Team history write.

### AD-REV-019 Reconciliation Sequence

1. Establish exact retained identity/selection/read-facet types and actual-task
   source/binding metadata. Add readonly Org inspection through the owner.
2. Remove configured-only message predicates/maps; preserve existing durable
   order and exact IDs; add all-direction tests including task-Team Agents.
3. Classify genuinely accepted task-system input once using the shared existing
   presentation/suppression path; no task-engine notification synthesis.
4. Extract Tasks facet/types/section and adapt both Team and Org together.
5. Wire exact task rows/detail participant navigation, correlated hydration,
   settled readonly selection and responsive presentation.
6. Delete old aliases/maps, test Team regression and VAL-038–045. Full source and
   API/E2E review remain downstream; old configured-only passes do not suffice.

Earlier AD-REV-017/018 sequences remain in the revision record as history only.




## Key Tradeoffs

1. **Two subject aggregates/stores over a narrow internal execution plane.**
   Some adapter/orchestration code is duplicated, but it preserves exact Team V2
   and truthful Org V1 ownership. Tagged identities, configured-Agent mechanics,
   Team-local execution, task/message record engines and the physical writer keep
   provider/local duplication bounded without a public/durable generic root.
2. **No-op flat cohort.** It intentionally leaves Team-named paths/contracts
   because they remain accurate, avoiding unnecessary I/O and client breakage.
3. **Separate Org history/stream projection plus mixed facade.** More adapters
   than one generic store, but no false single authority or kind inference.
4. **Validated direct package rename.** Writing and rereading the target Org
   tree plus strict Org task/message sidecars in the source package before one
   same-filesystem atomic rename avoids copying large Agent memory/content and
   preserves one package identity without adding a
   second recovery framework. A later ordinary startup retries an interruption.
5. **Separate authoring UIs.** Wrapper duplication avoids invalid conditional
   state; handoff/config/workspace primitives are shared below subject owners.
6. **Opaque identity preservation.** Historical name prefixes may look stale but
   are not topology; changing them would break approved identity/history.
7. **Sparse client intent/server complete plan.** Adds mapping code but prevents
   drift and definition defaults from silently overriding Org choices.
8. **Revisioned parent save.** Larger payload and transaction machinery preserve
   member/handoff referential integrity and zero partial persistence.
9. **Strict target admission over temporary external unavailability.** It avoids
   permanent server compatibility debt and respects external ownership, at the
   cost that incompatible definitions and their dependent Orgs are unavailable
   for new work until separately released; compatible work and history remain.
10. **Explicit internal extraction over copied Org runtime.** The extraction touches existing Team/Agent tool paths, but one common provider/local implementation is safer than duplicating Agent activation/task/message behavior and letting them diverge. Subject adapters make the risk reviewable.
11. **Org-specific sidecar envelopes.** Two extra current codecs/files and a small migration envelope transform avoid reinterpreting `rootTeamRunId` inside an Org and permit strict family correlation. Record bodies and memory content do not move.
12. **Prepare all Org configured Agents before root registration.** Launch work is larger than lazy synthetic composition, but it implements approved full-scope activation and gives one failure/teardown boundary with no partial active Org.
13. **Root-neutral Agent presentation details, subject-specific envelopes.** A
    small additional contract package avoids copying the large accepted Team
    event mapping into Org while preserving the Team wire exactly. It is
    intentionally narrower than a generic collaboration stream: it owns only
    strict Agent-visible detail semantics, never root identity or sequencing.
14. **Structural surface extraction over Org-specific visual replication.**
    Extracting port-driven Agent/Team surfaces touches accepted components, but
    makes parity mechanically enforceable and keeps four execution target kinds
    from drifting into four dashboards. Standalone wrappers preserve their
    subject stores and actions.
15. **Hydrated context over append-only raw event inspection.** Building every
    configured/live Org AgentContext costs projection requests and context state,
    but supplies the accepted conversation/tool/activity model, truthful restore,
    and checkpoint recovery. Lazy presentation may be optimized later only
    behind the same context contract; an opaque raw-event fallback is not an
    allowed performance trade.
16. **Shared fold, subject-shaped traversal.** A single five-state policy/dot prevents Team/Org drift, while separate Team-history and AgentOrg traversal adapters avoid a loose generic hierarchy DTO or mixed authority.
17. **Missing historical status resolves offline instead of new persistence.** Production stopped Org history currently has topology but no durable per-Agent status field. The approved missing-value rule gives a truthful non-live result without creating transport/persistence solely to reproduce illustrative fixture mixtures.
18. **Idle-gated existing settlement over a second coordinator.** A terminal
    task whose Agent turn is still active defers immediately and retries from the
    established idle event. Once quiescent, the current prepared settlement keeps
    its persistence-before-finalization and whole-root fail-stop semantics. This
    removes the supported FIFO wait with the smallest new boundary and no new
    job/token/state lifecycle.
19. **Distinct irreversible root fence over changing ordinary termination.**
    Origin/personal intentionally drains already-admitted FIFO input during
    normal prepared termination. Root shutdown instead must prevent any new
    provider work after its phase. Keeping those operations distinct preserves
    ordinary behavior while making cancellation and interruption exact at the
    sole AgentRun input owner.
20. **Shared Team presentation over a generic configuration owner.** Reusing
    the existing disclosure, Team scope and Agent row components adds one pure
    Org view-model adapter and typed command translation, but preserves the
    user-visible origin/personal experience without coupling Org to Team run
    state or payloads. The small adapter cost is preferable to either copied UI
    drift or a loose cross-subject store.
21. **One canonical sparse Org patch over a new resolved launch payload.**
    Materializing the dependent `llmConfig:null` clear at the existing web
    command boundary adds a small pure normalization step, but keeps the
    approved sparse API and server-authoritative resolver while making preview,
    validation, request and snapshot semantics mechanically comparable. A
    second raw draft or a new server inference rule would be harder to reason
    about and would preserve the present disagreement.
22. **One mixed history data owner plus one mounted tree-state owner over
    route-selected subject panels.** Extracting Org rows/actions into the
    established Workspace tree touches a shell-wide component, but preserves the
    familiar navigation state and makes subject identity explicit through tagged
    rows and typed action ports. Reusing the two existing queries adds one
    bounded fan-out/filter step but avoids a new server contract; per-family
    atomic commits contain partial failure. The read owner handles rows,
    grouping, order, and errors; the single panel/controller handles expansion,
    reveal, highlight, and scroll. The alternative keeps two panels and makes
    route changes look like data loss.
23. **Catalog-backed root default over Org-specific initialization.** Reusing
    the existing root Workspace selection policy intentionally makes fresh Team
    and Org drafts behave alike. Descendant inheritance remains projected
    rather than independently defaulted, preventing a convenience default from
    becoming hidden placement state or communication focus.
24. **A tight root Messages facet over a generic Team/Org workspace context.**
    Extracting one selected-member read port and shared Messages presentation
    touches both target branches, but it preserves exact root ownership and lets
    direct Org Agents participate without pretending they belong to a Team. A
    generic workspace context would conflate Team roster, participant Tasks, Org scope,
    persistence and lifecycle; keeping those capabilities orthogonal is the
    smaller and safer abstraction.

## Risks

AD-REV-026 residual risks and mitigations are in DS-044–046 / VAL-070–075:
provider-copy snapshot loss, one producer or page remaining media-only, unsafe
normalization/dedup, archive omission and mistaken legacy repair. Historical
missing associations and IR049 actual cutover remain explicit limits, not a
blanket code hold.

AD-REV-025 risks are exact-ID loss at one remaining consumer, insufficient real-byte validation, and undiscovered saved-locator/draft/deployment cohorts. DS-041–043 and VAL-064–069 define strict failure/return boundaries; mocks and sample zero counts do not establish rollout safety.

AD-REV-020 risks: silently stripping versions in normal reads; hiding owned
Teams behind an undecodable Org parent; changing old migration outputs or
replaying completed runtime conversion; over-broad external writes; stale
numeric diagnostics. DS-031–033 and VAL-046–050 close those design paths.

| Risk | Likelihood / Impact | Control | Residual |
| --- | --- | --- | --- |
| Flat Team is accidentally rewritten/moved | Medium / Critical | Golden bytes/path/inode/mtime no-op tests; migration write audit | Validation code changes but serialized native contract stays. |
| Root misclassified | Low / Critical | Exhaustive preflight, direct configured-Team cohort rule, strict fixtures | Contradictory data blocks rollout. |
| Both families become canonical for one ID | Low / Critical | Preflight destination absence, one direct atomic rename, strict post-rename reread, and failure-closed source+target conflict | Unsupported/manual conflicts gate only that root and require corrected data/release followed by restart. |
| Definition/package ref breaks on Org conversion | Medium / High | Global server-owned ref plan, preserve IDs, exact target validation, dependency diagnostics | External owners must publish compatible targets separately. |
| In-ticket code writes or claims external repositories | Low / Critical | Typed source descriptors, external writer rejection, filesystem/SCM zero-write audit, scope review | Misconfigured source registration must fail safely. |
| Target admission silently falls back or globally blocks startup | Medium / Critical | One-family exact codecs, no migration imports, available/unavailable result, mixed compatibility scenario | Incompatible definitions remain intentionally unavailable. |
| Effective handoff order reverses or projections regroup owners | Medium / High | Root-first compiler contract, unchanged migration snapshots, stable-filter/projection golden tests | New ordering changes require requirements approval. |
| Task Team lineage removed with configured recursion | Medium / Critical | Separate types/folders/tests; recursive task records/factory retained | Future refactors need explicit distinction. |
| Root-neutral extraction remains Team-root-coupled by alias/cast | Medium / Critical | Exact tagged constructors, no Team imports in shared handle/engines, compile-time ports and Org-direct-Agent tests | Broad existing call-site migration is substantial. |
| Org full activation exposes a partial root | Medium / Critical | Prepare all candidates, commit strict package, publish/register last; reverse abort and no directory entry on failure | Post-durability publication uncertainty leaves a resumable package and fail-stopped non-active root. |
| Task/message engine becomes a generic root owner or bypass | Medium / High | Engine has one private subject adapter port; root aggregate constructs it; no tree/store/event imports or external getters | Adapter contracts must stay minimal as task features evolve. |
| Settlement still waits on a non-quiescent provider turn | Medium / Critical | AgentRun-owned atomic prepared-or-null test; controlled normal submit/accept overlap with unrelated command; assert no waiting call and idle-event retry | Final cleanup for an already-quiescent execution remains serialized by the existing FIFO. |
| Racy external status check falsely prepares an active execution | Medium / Critical | Quiescence check and input-admission close occur under AgentRun dispatch ownership; no UI/status snapshot eligibility | A newly supported input mode must extend AgentRun's canonical predicate. |
| Recursive task Team partially quiesces before discovering an active descendant | Medium / Critical | All-or-none recursive preparation with reverse cancel; active-descendant and parent/child tests | Large task subtrees may require repeated idle-event attempts, but no partial prepared state remains. |
| Existing prepared settlement fails before/after durability | Medium / Critical | Retain current cancel-before-durability and whole-root fail-stop after committed cleanup failure; injected outcome tests | Provider cleanup error can fail the owning root and is surfaced rather than replayed. |
| Root shutdown waits on a task drain before fencing/interruption can release provider work | Medium / Critical | Stable-scope root sequence, phase assertions for Team/Org, live-approval + queued-command tests, process graceful-shutdown correlation | External provider termination may still be slow after interrupt, but it no longer owns the mutation lane or forms this cycle. |
| Provider start crosses the completed root interrupt phase before `TURN_STARTED` | Medium / Critical | Same AgentRun dispatch owner for claim/start/fence; deterministic start-wins and fence-wins tests; terminal phase assertion | A provider call that already won may still take time to emit canonical lifecycle; the fence waits rather than fabricating success. |
| Root fence cancels input after provider side effects began or emits duplicate lifecycle facts | Medium / Critical | Explicit state table; cancel only pre-start/pre-forward slots; provider-started path uses existing failure/association/interrupt facts; observer exact-once tests | Provider protocol violations remain existing failures, not cancellation. |
| A prepared settlement cancel reopens a root-fenced AgentRun | Medium / Critical | Irreversible latch check around `reopen`; settlement/root race test; retry joins same fence | Ordinary non-root prepared cancellation still reopens by design. |
| Frozen scope misses a handle published by an admitted activation | Medium / Critical | Close/drain operation/materialization publication gate before snapshot; include active+prepared handles and recursive Team scopes; barrier test | New handle-producing operations must enter the subject gate or return Design Impact. |
| Root-wide fence and later quiescent settlement touch the same execution | Medium / High | Existing idempotent interrupt/prepared termination semantics plus exact registry tests | Duplicate lower-level callbacks must remain harmless and observable. |
| Org platform binding commits to Team tree or after Agent publication | Medium / Critical | Tagged binding, Org mutator/coordinator, initial binding batch before publication, fail-stop on indeterminate finalization | External provider cleanup may still quarantine and requires existing AgentRun controls. |
| Org direct/mounted/task Agent memory is misplaced | Medium / Critical | Tagged root scope + unchanged relative TeamRun lineage golden paths and migrated package content probes | Opaque historical IDs remain, intentionally. |
| Org state package accepts Team sidecars or mismatched IDs | Low / Critical | Strict Org filenames/envelopes, `subjectKind/orgRunId` correlation, full-package loader and migration reread | Manual corruption remains capability-scoped unavailable. |
| Global same-root router uses bare IDs or cross-routes Team/Org | Medium / Critical | Compare tagged member roots, compound active directory, cross-kind collision negatives | Direct grant path remains separately governed. |
| Shutdown leaves an embedded Org Team active | Medium / Critical | Org owns every local Team; freeze/teardown whole graph; process order Org->Team->Agent; active directory unregister assertion | Provider teardown errors are aggregated and surfaced. |
| Org code reaches Team root manager/store or local factory creates root authority | Medium / Critical | Explicit `local/FlatTeamExecutionFactory`, no root-file/registry dependencies, import-boundary and negative registration tests | Future Team local changes require both root adapters to remain compatible. |
| Wrong-family mixed restore/stream succeeds | Low / Critical | Compound kind+ID, subject location, strict store, mismatch tests | Corrupt/manual states remain blocked. |
| Org focus created on launch/recovery | Medium / High | No durable/input field; nullable view; negative fallback tests | Explicit member-row click may focus by design. |
| Config preview/server precedence drifts | Medium / High | Server authority + shared pure fixtures across web/server | Catalog evolution needs tests. |
| Concurrent definition edits partially apply | Medium / High | revision lock, full validation, directory journal/recovery | External file edits cause explicit conflict/refetch. |
| Shared Team is copied/mutated | Low / High | Query-only dependency and identity/coordinator/handoff/history regression tests | Org-owned migrated source remains physically Org-owned but distinct. |
| Runtime/durable state diverges | Low / Critical | prepare -> strict write -> live commit -> event sequence per subject | Existing indeterminate I/O remains operational risk. |
| Stale generated/external consumers | Medium / High | Preserve Team-only contract, regenerate mixed clients, coordinated release | Out-of-repo mixed consumers require release notes. |
| Dynamic Team work reintroduces recursion | Medium / High | REQ-017 dependency scan and reviews | Future approved behavior needs new design. |
| Team-only stream behavior drifts during shared presentation extraction | Medium / Critical | Golden every retained Team message/sequence/token/status shape before/after adapter extraction; full Team conversation/tool regression | Internal adapter placement changes, but public Team wire and surface must remain exact. |
| Org event schema still admits opaque/raw payloads | Medium / Critical | Closed zod discriminants, compile-time no-`unknown`/`any` scan, invalid-event and identity/sequence recovery tests | Future Agent event types require explicit presentation-contract addition. |
| Shared surface remains coupled to standalone stores | Medium / High | Surface import-boundary tests and required target/action props; standalone and Org wrapper tests | Some surrounding shell state remains shared through explicit ports. |
| Org command parity is incomplete | Medium / Critical | Send/context-file, interrupt, approve and deny strict command/ack integration plus real-browser prompt/tool flow | New Agent commands must extend the same port and subject parser deliberately. |
| Mounted Team presentation creates false Team root authority | Medium / Critical | Read-only TeamWorkspaceContextView, no Team-store registration/root APIs, negative stop/persistence/history tests | Team presentation evolves against two adapters. |
| Org member hydration or sequence recovery loses/duplicates conversation | Medium / High | Compound identity/checkpoint barriers, candidate atomic swap, gap/reconnect/projection equivalence tests | Projection availability failures remain visible recovery states. |
| Trace/token/file/tool queries use a Team family for an Org member | Medium / High | `agentOrgMember` compound query branch and Org location-backed service; cross-kind collision negatives | Cross-subject analytics facades require explicit tagged dispatch. |
| Root stop remains attached to member focus or exposes mounted-Team stop | Low / High | History-root action assertions, member-header absence, mounted-Team negative tests, standalone Team confirmation regression | Product fixture labels/icons may evolve without changing ownership. |
| Team aggregate includes the wrong branch or loses hidden task Agents | Medium / High | Exact configured Team node traversal, recursive task-only fixtures, direct-root/sibling exclusion matrices, compute before collapse | Future task DTO changes must update the subject adapter deliberately. |
| Historical Team dot retains a live pulse or fabricates state | Medium / High | Explicit live authority gate; historical running/initializing demotion; missing/unknown offline; stopped browser check | Historical error/idle can appear only if an existing truthful terminal projection supplies it. |
| Five-state policy/accessible label duplicates or drifts | Medium / Medium | One pure fold, one reusable Team dot, clean-cut neutral rename, both locale/a11y tests | Visual palette changes remain shared presentation work. |
| Presentation aggregate leaks into lifecycle/API | Low / Critical | No backend file mapping, import/no-new-field scans, mounted-Team action negatives, explicit Design Impact trigger | Later operational Team health would require separate approved behavior. |
| AgentOrg mounted-Team launch UI drifts from the established Team experience again | Medium / High | Direct reuse of the existing Team form chain, shared disclosure extraction, standalone Team regression, and VIS-OVR desktop/narrow browser comparison | Root-level Org copy/direct-Agent rows remain subject-specific by design. |
| Org projection silently omits an unavailable/inconsistent Team or coordinator | Medium / High | Closed success/diagnostic projector result, Run disabled, exact-address error tests; no `flatMap` omission or browser repair | Admission/source drift remains a visible unavailable state until corrected. |
| Collapse/reset loses or cross-mutates exact sparse patches | Medium / High | Store-owned draft, visibility-preserving collapse, Team-reset-preserves-Agent rule, sibling/direct-Agent isolation tests | Invalid field values remain in draft with adjacent error until corrected/reset. |
| Org preview and server launch disagree on model-specific config | Medium / Critical | One canonical patch map, explicit dependent `llmConfig:null`, exact GraphQL golden, server resolver and stored-snapshot equality matrix | Future model-config coupling changes require one deliberate canonicalizer/server-fixture update. |
| Direct root ref updates expose a transient or stale root model/config tuple | Medium / High | Complete root setter commands, dependent clear in the same Org store owner, owned-null root serialization, and root-level fixture parity | Runtime/model catalog work remains asynchronous but Run stays gated by the existing exact schema-readiness state. |
| Unified history accidentally becomes a second Org runtime/lifecycle owner | Medium / Critical | Read-only tagged projection, typed subject action ports, no AgentOrg context duplication, import scans and family/action negatives | Presentation grouping remains shared while each subject retains state and commands. |
| Existing two-query history refresh duplicates Team roots or erases a healthy family on partial failure | Medium / High | Ingest Agent/Team only from `ListWorkspaceRunHistory`, filter collaboration history to strict AgentOrg only, commit slices independently, retain prior successful slice, and test Org-only/null/catalog-missing workspaces | Two network reads remain, but no new API or duplicate read owner is introduced. |
| Route transition or refresh drops prior rows/expansion/selection/scroll | Medium / High | Stable-keyed route-independent read projection plus one always-mounted panel/`useWorkspaceHistoryTreeState` instance and persistent scroll container; catalog->config->live->history component test and real browser journey | Explicit user navigation may still change selected identity by design. |
| Root Temp default is synthesized, overwrites explicit choice, or defaults descendants independently | Medium / High | Actual catalog-record selection, untouched-draft gate, explicit-choice tests, absent-default negative and descendant inheritance matrix | Catalog outage remains actionable blocked configuration. |
| Same-definition early return reuses a completed launch draft or suppresses the next fresh default | Medium / High | Explicit new-launch draft epoch distinct from definition identity; retries/errors remain in-epoch; repeated Run and failed-validation regression tests | Route/controller must issue one begin-new-draft signal per deliberate new launch. |
| UI diverges from RV-012 or focused VIS-STATUS/VIS-OVR authority | Medium / High | Structural reuse plus VIS-016-VIS-018, VIS-STATUS-001-003, VIS-OVR-001-006 and VIS-PROMOTE-002-004 browser/a11y/narrow checks and real prompt evidence | Fixture values remain illustrative. |
| Task/system/inter-Agent or task-scoped traffic accidentally sets an Org title | High | Qualify through strict configured execution kind and only the external SEND_MESSAGE accepted branch; exhaustive exclusion tests | AgentOrgRun + stream handler |
| Concurrent accepted sends select a nondeterministic or wrong winner | High | Immediate post-result enqueue plus existing serialized catalog first-write; controlled deferred-result tests in both completion orders | Org stream handler + history catalog |
| Accepted Agent input is relabeled failed because derived history I/O fails | Medium | Preserve truthful accepted ACK/result; report metadata failure through existing observability and never replay the Agent input | Org stream handler/service |
| Older history response overwrites the committed live summary | Medium | One monotonic AgentOrg-family request generation shared by full/focused reads; only newest response may commit | Mixed web history read owner |
| Migration fabricates a title from internal/incomplete/equal chronology | High | Strict configured-only complete corpora plus root sidecar exclusion evidence; finite timestamps; require one provenance-qualified strictly earliest candidate; nonqualifying earliest/ambiguity cannot promote a later trace and yields redacted warning/fallback | Registered migration |
| Migration-only inference leaks into normal runtime or creates a dual backfill path | High | Folder isolation, dependency guard/test, one stateless summary writer shared with the catalog, no trace-on-read or lazy backfill | Migration registry/module boundaries |
| Existing non-empty summary or Team history is rewritten | High | Skip non-empty before trace reads, strict post-validation, Team cohort exclusion, invariant tests | Migration + Org history catalog |
| Accepted Org message is durable but receiver presentation is omitted or duplicated | Medium / Critical | Post-commit root/member event order, deterministic correlation, exact-once adapter/run tests, checkpoint replay equivalence and no browser synthesis | Post-durable publisher failure still uses existing fail-stop/reopen rather than record replay. |
| Task messages disappear or are attributed to configured source | High | Remove kind gate; exact retained index and all four direction/same-address tests | Org publication and context read owners; never substitute address/definition for task ID |
| Direct Org or task Agent has no relevant Tasks / another task leaks in | High | Root-independent Tasks facet + exact delegator/assignee/fresh-Team participant selector; VAL-041–042 | Org read index/projector, not Team membership |
| Task save is mistaken for delivered system input or duplicate backend event | High | Existing commit then separate acceptance, task-origin metadata/suppression, one adapter result; VAL-043 | Task engine record owner and shared input presentation boundary |
| Task history uses configured source provider binding or activates on read | High | Actual node supplies identity/physical binding; frozen source only config; explicit readonly query/target; VAL-044 | Org location/projection and service/manager read boundary |
| Cross-scope UI refactor regresses standalone Team behavior | High | Team-owned adapter into narrow shared Tasks/Messages types, full Team control and responsive checks; VAL-045 | Shared presentation owns no root state |

| Org Messages view hides a valid direct/cross-Team/task counterpart | High | Complete retained exact run index and participant-only filter across all four directions | Task/settled identity remains visible; containing Team is not scope. |
| Equal address basenames show the wrong counterpart | Medium / High | Key all perspective identity by exact AgentRun ID and canonical full address; basename-collision tests | Labels are presentation only and never identity. |
| Direct Org target or narrow layout loses the Messages tool | Medium / High | Gate one shared desktop/narrow tab definition on the explicit facet, not Team kind; component/browser assertions | Standalone Agent intentionally has no collaboration Messages facet. |
| Reconnect/restore duplicates or loses receiver/ledger presentation | Medium / Critical | One strict context candidate containing sidecar plus Agent projections, sequence barrier, atomic swap and live-versus-restored equivalence tests | Corrupt/miscorrelated current data enters existing reopen/unavailable handling. |
| Rejected/uncommitted send leaks into presentation | Low / Critical | Invoke both presentation consequences only from the successful durable-commit callback; rejection/failure injection tests | No optimistic client repair or rollback path is added. |

## Guidance For Implementation

Newest recovery: implement DS-044–046 only after AD-REV-026 review. CR-FIND042 requires complete original-input recording through cold/page Open, not a UI-only label fix. VAL-070–075 and strengthened VAL-066 require real persisted lifetime evidence; API33 remains Fail. IR049 installation cutover and all prior cumulative gates stay separately scoped.

Latest authoring delta: implement DS-038–040 under RER-033 and the explicit
first-run rollout premise. Normal Org files use org_local; internal ownership,
opaque IDs and existing GraphQL enum names retain their exact mapped meaning.
Update the existing unreleased migration output directly; no added spelling
migration or frozen intermediate branch format. DS-031–033 retains field-free
Team/Org authoring, now synchronized with DS-039. Runtime/sidecar/journal versions
stay unchanged. Validate first startup from pre-ticket fixtures and ordinary
retry/idempotence, normal package roundtrips and external zero writes. Preserve
other owners' work; old test output is not deployed-state or new acceptance proof.

- Implement the canonical DS-028–030 once: every admitted ordinary endpoint pair
  gets existing durable/root/exact receiver consequences; no configured-only
  policy remains. Do not change message tools, admission or sidecar schemas.
- Give each exact selected configured/task Agent both participant Tasks and
  Messages facets; Team view remains genuine roster/header context only.
- Retain one view/index under Org context, actual task binding and host, and
  exact selection through task activation/reconnect/settlement/history.
- Present task records and accepted system notification independently. Mark
  and publish once at the accepted-input boundary; never manufacture a delivered
  input or Messages row from a saved submission/review, even on warning.
- Share established Team UI components, not runtime/store ownership. Inspect
  inactive packages read-only through the service/manager boundary; no fake
  active Team, fallback focus, provider startup or historical task reactivation.
- Prove VAL-038–045 and standalone Team regression with focused source/rendered
  tests, then independent full source and renewed cumulative API/E2E. Historical
  configured-only assertions/passes do not validate RER-028.


- Implement DS-027 by extending the current Org history catalog and service and
  adding one stateless summary writer shared with pre-runtime migration; do not
  construct a manager/catalog during migration or add a summary field to the run
  tree, event stream, or command ACK.
- Reuse the exported Team `compactSummary` exactly. Do not copy the 100/97 rule
  into Org runtime, web code, or migration.
- Filter summary eligibility from `AgentOrgExecutionIndex.executionKind` after the unchanged command result, not
  from address depth/name or the currently focused row.
- Enqueue the first-write mutation immediately after the accepted Agent command
  result. Do not use socket arrival, trace timestamps, or client order for live
  arbitration.
- Keep acknowledgement semantically truthful: the Agent input has already been
  accepted even if derived index observability reports an operational failure;
  never retry/replay the input as metadata recovery.
- Web refreshes must query the current history authority and suppress stale
  response commits. Do not optimistically assign the submitted prompt to the
  row or put history state into AgentOrgExecutionContext/tree-state.
- Keep historical inference startup-only and fixed to strict current Org V1
  configured nodes, complete exact corpora, and root sidecars as exclusion-only
  evidence. A nonqualifying earliest fact, tie, missing/invalid/ambiguous evidence,
  or causal contradiction is a valid fallback, not permission to guess or
  promote a later trace.
- Validate direct/mounted symmetry, every exclusion, concurrency in both result
  orders, live no-navigation projection, restart/rebuild stability, and
  unique/ambiguous migration cases before requesting source review.

- Treat approved requirements, `AORG-CONTRACT-001`, `ui-ux-spec.md`, decision
  record, manifests, VIS-001-VIS-020, VIS-STATUS-001-003 and VIS-OVR-001-006 as read-only authorities. Prototype
  services/persistence are mocked and must not be imported.
- Preserve exact Team V2 `schemaVersion`, top/root keys, file name, package path,
  and existing Team-only wire surfaces selected for compatibility. Narrow only
  configured membership/coordinator validation. Add no `subjectKind` to Team.
- Implement exact Org V1 `schemaVersion:1`, `subjectKind:'agent_org'`, `rootOrg`,
  file/path, coordinator-free root, default configuration, direct Agent/flat
  Team members, and root task records. Add no persisted focus.
- Share exact child/handoff/launch/task record types/schemas, not root envelopes,
  stores, paths, or optional-field roots. No `FlatTeam` type.
- Implement the AD-REV-005 internal execution boundary before continuing the partial Org activator draft. Shared AgentRun/tool code uses `RootExecutionIdentity`, `CollaborationMemberExecutionIdentity`, `RootExecutionPhysicalScope`, `MemberExecutionContext`, and bound task commands; it must not retain a `rootTeamRunId` alias or cast a root aggregate.
- `ConfiguredAgentExecutionHandle` owns only AgentRun candidate/local mechanics. `FlatTeamExecutionFactory` owns one Agent-only local Team and task descendants. Neither may import a subject root/manager/store/index/publisher or create/register a root package.
- Keep task/message engines behind private Team/Org adapters. If a common interface starts carrying a Team/Org tree union, optional coordinator, store, or event, stop and tighten the port rather than growing a generic root.
- Team task/message sidecars remain exact. Org uses only `agent_org_task_delegation_records.json` and `agent_org_communication_messages.json` with strict `subjectKind/orgRunId`; record arrays retain exact fields.
- Use tagged root physical scope and unchanged relative TeamRun ancestry for all Agent memory, context-file, run-file and history locations. A direct Org Agent has empty Team ancestry; never synthesize a Team directory.
- Normal definition admission accepts only exact current Team Definition Config and
  current Org Definition Config. Keep the retired decoder under the server-owned
  migration module, never import it into target providers/catalogs, and never
  add/remove `refType` silently.
- Classify every definition source explicitly. Convert repository/data-root
  server-owned sources through their designed build/startup mechanisms. The two
  external repositories are read-only: no write, migration, commit, release, or
  completion claim belongs to this ticket. Surface actionable per-definition
  diagnostics and propagate unavailable Team dependencies to Orgs without
  filtering runtime history.
- Every mixed response/event requires `root_subject_kind`; dispatch from known
  subject/family and validate agreement. Never scan/guess/try both/auto-move.
- Validate complete definition and launch input before ID allocation or durable
  mutation. Errors include stable code, candidate path/address/handoff, and
  message. Expected revision comparison and package promotion occur under the
  same subject lock.
- Keep the revisioned package transaction limited to normal multi-file
  definition authoring. Migration instead uses the existing runner, the
  established atomic current-file writer, one direct package rename, strict
  rereads, cleanup, and ordinary startup retry; add no journal, backup, staging
  tree, restore command, runner redesign, or per-syscall failure matrix.
- Migration preflight must create nothing. For flat Team packages prove byte,
  path, mtime, and directory inventory unchanged. For an Org-like package,
  validate the prospective Org tree plus strict Org task/message sidecars inside
  the source package, rename that package directly to the Org family, reread/
  correlate the complete package, and remove retired Team authority files before
  success; never advertise both family paths.
- Preserve handoff sequence end to end: Org/root-owned saved order first, then
  each direct Team's local saved order in stable Org member order, with each
  rules array unchanged. Migration copies compiled runtime snapshots; it does
  not recompile. `get_handoff_rules` and effective/UI projections filter or
  decorate without sorting, regrouping, or deduplication.
- Org launch settings resolve server-side from root plus sparse exact Team/Agent
  patches. Construct one Org aggregate, prepare every configured Agent/direct
  Team placement, persist any provider bindings and all three Org authorities,
  then publish/register the complete scope. Return no entry/focus and never
  mutate referenced definitions. Pre-durability failure aborts every candidate;
  post-durability indeterminacy fail-stops the whole unregistered Org.
- Org web focus starts/clears to `null`; exact Agent focuses directly; exact Team
  maps through Org snapshot to stored coordinator. Recipient actions validate
  focus both client- and server-side; no fallback repair.
- Keep task Team creation in the root-neutral task engine plus subject host
  adapter. Task Teams may recurse only in `taskExecutions` at the exact Org root/
  Team/task-Team host and never configured `members`. Direct Org Agents use the
  `AgentOrgRootTaskHost`, not a fake Team.
- Keep `RootTaskLifecycleCommandQueue`, the terminal sweep, the existing
  `PreparedTaskSettlement`, and current record/tree/sidecar/event order. Do not
  add `RootTaskSettlementCoordinator`, committed cleanup tokens, a second drain,
  or in-memory settlement job/dependency state.
- Add `AgentRun.tryPrepareTerminationIfQuiescent` under canonical dispatch/input
  ownership. It returns `null` immediately and changes nothing for unresolved
  input/turn/provider work; otherwise it closes admission and returns the
  existing prepared termination. Do not approximate it with status polling or a
  precheck outside AgentRun.
- Add `AgentRun.fenceInputAndInterruptForRootShutdown` as a separate irreversible
  operation. Move claim/provider-start registration under the same dispatch
  serialization as the fence. Cancel only never-forwarded work through the
  existing lifecycle; if provider start already won, retain shutdown intent and
  interrupt on canonical start. Do not let a later prepared cancel reopen the
  latch, and do not change ordinary `prepareTermination` FIFO-drain behavior.
- Replace root `interruptActiveTurns` forwarding with recursive frozen-scope
  fence forwarding. Close and drain only admitted root operations needed to
  stabilize active/prepared handle publication before the snapshot; do not wait
  on the task settlement FIFO until every Agent fence is terminal. Compose Org
  direct handles and mounted/task Team scopes privately—never via a synthetic
  Team root or a generic root lifecycle object.
- Thread prepared-or-null through configured Agent, task Agent, task-Team,
  Team adapter and Org adapter boundaries. `null` makes settlement return false
  and release the FIFO; existing idle/offline events reschedule. Recursive task
  Team preparation is all-or-none and cancels already prepared descendants if a
  later descendant is active.
- Preserve existing settlement durability and fail-stop: prepared cancellation
  precedes durability; `settledAt`, tree/index/event and registry changes retain
  their current ordering; a post-durable local finalization failure fail-stops
  the root. Unsupported self-review remains rejected.
- General process assembly order is AgentRun infrastructure -> strict locations/directory/factories -> Team manager -> Org manager -> services. Within each Team/Org root, shutdown is close external admission -> drain admitted publication operations only -> freeze the stable complete owned scope -> complete every AgentRun input/provider-start/interrupt fence -> drain task mutations -> persist task interruptions -> run existing deepest-first quiescent settlement -> drain persistence -> finish/unregister. Process order remains Org -> Team -> Agent before reverse release. Application scopes remain publicly Team-only while using the same extracted factories.
- Global exact-Agent routing compares tagged member roots and uses `ActiveCollaborationRootDirectory`; no bare root ID or Team manager lookup may select an Org.
- Admit raw configured-Agent events exactly once through
  `CollaborationAgentPresentationAdapter`. Team and Org serializers may add only
  their subject identity/sequence fields. Do not publish `AgentOrgRunEvent` as
  an opaque value, add `unknown` to an Org stream schema, pass a protocol
  envelope into Vue, or stringify an unrecognized event.
- Preserve Team-only stream compatibility while extracting Agent presentation
  details. Use golden messages for every current event kind, including member
  input, status/readiness, errors and token usage; do not force Team consumers
  onto the mixed contract to obtain reuse.
- Build `AgentOrgExecutionContext` from strict snapshots and exact member
  projections before it becomes active. It owns the AgentContext map,
  mounted-Team presentation views, nullable focus and stream phase.
  `rootExecutionViewStore` remains only a mixed route/history facade and must not
  keep a second Org tree, event array, focus or command path.
- Implement the four-branch `ActiveAgentWorkspaceTarget` and
  `AgentInteractionPort`. The existing composer, tool cards, event monitor,
  files/activity/tokens/artifacts and trace browse consume those ports; they do
  not branch directly over standalone/Team/Org stores or open subject sockets.
- Extract `AgentWorkspaceSurface` and `TeamWorkspaceSurface` from the accepted
  production components. Standalone views become adapters and remain behavior-
  compatible. The Org view may render only the approved no-focus prompt or one
  of these surfaces. It must contain no event formatter, conversation card,
  textarea/send implementation, custom member header, JSON fallback or stop
  control.
- Treat `TeamWorkspaceContextView` as presentation-only. Its Org adapter is
  backed by the Org context and exact Team placement; never register that Team
  with `AgentTeamRunManager`, `agentTeamContextsStore`, Team history, Team
  persistence or Team termination.
- Extend the strict Org command union/ack path for send, interrupt, approve and
  deny and route each through the exact AgentOrgRun target. Context-file paths
  and media/message identity follow the accepted composer contract. Reject
  stale focus/root/member identities before execution; never fall back.
- Add `agentOrgMember` run projection/active-trace subject keyed by
  `{orgRunId,memberAddress,agentRunId}`. Files, traces, activity, token usage and
  artifacts for Org focus use Org physical location/subject dispatch; they do
  not manufacture a Team root ID from a mounted Team.
- Put Org termination only on the active AgentOrg history root row using the
  established root pending/error affordance. No focused member or mounted Team
  can terminate the Org. Preserve the separate standalone Team members-panel
  confirmation exactly.
- Historical topology comes from its subject snapshot, not current definitions.
  Definition edits/deletion cannot change old subject kind, coordinator, task
  host, or addresses.
- Separate Org and Team form/config state. Shared UI primitives accept explicit
  owner view models/commands and cannot query providers or mutate the other
  subject.
- Reuse the accepted `TeamRunConfigForm -> TeamMemberConfigTree ->
  TeamScopeConfigEditor -> MemberOverrideItem` presentation grammar. Extract
  only `MemberOverridesDisclosure`; do not copy Team row/editor markup into the
  Org form and do not import `teamRunConfigStore` or Team launch serialization.
- Keep AgentOrg root state and exact sparse patches in
  `agentOrgRunConfigStore`. Split Team and Agent maps, map Team workspace through
  existing `workspaceRootPath`, and route every typed Team/Agent edit/reset event
  back to its exact address. Team reset must preserve child Agent patches.
- `projectEditableAgentOrgRunFormModel` must return a complete one-level model or
  a blocking diagnostic. Count only configurable Agent placements; put Team
  customization on Team patches only; put coordinator identity only on the
  exact Agent row; never silently omit or repair an admitted-reference mismatch.
- Outer and per-Team disclosure state starts collapsed and changes presentation
  only. Use visibility-preserving rendering/store-backed state so collapse/
  reopen retains valid draft values. Keep sibling Team disclosure independent
  and direct Org Agent behavior unchanged.
- Canonicalize every AgentOrg Team/Agent patch before it enters store state.
  When runtime or model identity is owned and model config is not, own
  `llmConfig:null`. Preview and launch mapping consume the same canonical map;
  delete the panel-local object-spread serializer. Do not alter the server's
  omission-means-inherit / explicit-null-means-clear contract.
- Keep one `WorkspaceAgentRunsTreePanel` mounted from `AppLeftPanel` on every
  route. Extend the mixed workspace read model with explicit Org roots and render
  `Orgs` immediately below `Teams`; move existing Org row/status/action
  presentation into that path and delete `AgentOrgRunHistoryPanel`. Preserve
  existing Agent/Team rows and expansion/selection/scroll state across routes.
- Route history actions through explicit root-kind/ID commands. An Org root may
  be opened/selected, stopped, or restored through its existing store; Org
  archive/delete actions are not invented. A mounted Team never becomes a root
  action target. The unified tree does not own active Org focus, stream,
  topology, or lifecycle.
- Reuse the existing Team-root workspace selector default for a fresh untouched
  Org root. Select only an actually available Temp Workspace record; never
  synthesize its path. Preserve explicit selection, show absent/unavailable
  errors, project root inheritance into placements, and keep descendant auto-
  default and recipient focus disabled.
- Preserve handoff array/When order. Rename/removal keeps stale entries visible,
  blocks parent save, and requires explicit author resolution. Org never edits
  Team-local handoffs; effective combined view is labeled/read-only.
- Implement RV-012 desktop and `390x844`: no modal Org member/config picker, no
  document horizontal overflow, keyboard/click control access, position-aware
  reorder labels, visible focus, safe canonical addresses, and adjacent errors.
- Minimum implementation evidence: exact field-free current Team/Org definition
  codec golden/negative tests; target-only/no-normalization admission;
  source-owner enforcement and external zero-write/non-blocking/dependent-Org
  scenarios; Team Run V2 byte/path golden tests; standalone Team regression over
  the extracted handle/local-Team factory; Org Run V1 exact tree/task/message
  package schema/store/restore; family/sidecar mismatch negatives; root-neutral
  Agent handle import/contract tests; Org direct/mounted Agent full activation,
  root/Team task hosts, platform binding, message routing, partial-preparation
  abort, persistence fail-stop, exact memory paths and Org->Team->Agent shutdown; current-inventory and
  generated no-op/Org-like migration with one interruption/relaunch,
  destination-collision, target-only retry, and deep-precondition cases;
  runner summary/log/restart guidance; definition transaction conflict and one
  interrupted-save case; root-first effective
  handoff ordering through compilation/snapshot/migration/`get_handoff_rules`/
  projection; Org/Team GraphQL and streams; tasks/stop/restore/history; web
  From/To/When CRUD/order/cancel/save, config precedence, no-focus/exact focus,
  history/task lineage, strict Agent presentation parsing, Team-wire golden
  compatibility, Org member hydration/projection/checkpoint recovery,
  send/context-file/interrupt/tool-decision command parity, structural shared-
  surface reuse, raw-dashboard/JSON-fallback absence, root-stop placement,
  responsive/a11y, standalone Team create/launch/reuse, and a real imported-
  package prompt rendered through the accepted conversation/event monitor.
- AD-REV-009 minimum evidence additionally includes: AgentRun atomic
  prepared-or-null tests; a controlled normal submit/tool-result followed by
  independent delegator accept while the assignee turn is held open, with an
  unrelated supported command completing; idle-event resettlement; recursive
  task-Team all-or-none preparation; existing pre-/post-durability failure
  behavior; invalid self-review rejection; legitimate approval-wait interruption
  before Team/Org task drain; and direct application-handler graceful shutdown.
  Do not use the invalid self-review tail, a timing-only test, or a process-group
  kill as supported-liveness evidence.
- AD-REV-010 minimum evidence additionally includes: exact state-table tests for
  reserved, committed, queued, claimed-before-start, provider-started-before-
  turn, forwarded/pending-turn and active-turn input; deterministic ordering in
  which either provider start or root fence wins the same AgentRun queue; one
  task activation barrier after start registration but before canonical
  `TURN_STARTED`; Team and Org application-handler SIGTERM through direct,
  mounted, task-Agent and recursive task-Team scopes; exact cancellation versus
  interruption facts; ordinary preparation still draining FIFO; prepared cancel
  never reopening root-fenced admission; fence retry/idempotence; no backend call
  after fence completion; and no task drain before the full fence completes.
- Before implementation handoff, search current source excluding migration and
  immutable historical docs for configured Team member recursion,
  `getOrCreateConfiguredChildTeam`, `MemberTaskRootResolver`, shared
  `TeamMemberExecutionIdentity`/`memberTeamContext`, root-creating mixed factory,
  placeholder Org activator, Team-sidecar Org reuse, Org-as-RootTeam assumptions,
  Org `entryAddress`, required/fallback Org focus, root-kind inference, and generic
  V3/`collaboration_runs` artifacts. Also review every remaining `rootTeam`,
  `team_run_execution_tree.json`, and `agent_teams` occurrence: they are expected
  and correct in native Team code, but forbidden as Org/mixed authority.

- For REQ-028, reuse `StatusDot` visual grammar and one shared Team aggregate fold; do not use binary `TeamActivityDot`, hard-code colors, or duplicate precedence in the unified Org row renderer.
- Enumerate a mounted Team from its strict configured Team node, including configured Agents and recursive task-scoped Agents under that Team only. Do not derive aggregate membership from visible rows or canonical-address prefix scans.
- Treat live authority as exact active Org context in `phase=live`. On inactive/history/recovery-without-authority, retain only existing terminal idle/error/offline truth and normalize running/initializing/missing/unknown to offline. Add no status fetch or persistence.
- Render `TeamAggregateStatusDot` between disclosure and Team icon and preserve it while collapsed. Its role/title/accessible name is `Team status: <State>`; individual Agent dots remain present and truthful.
- Keep Org focus, Team coordinator mapping, root stop/restore and historical
  archive metadata, readiness, commands, task lifecycle and transport
  untouched. Do not invent an Org archive/delete command. Any implementation
  need for a new backend field, polling path, Team lifecycle owner or status
  cache is a Design Impact.
- Validate AD-REV-007 with the added VAL-023-025 self-validation witnesses, pure precedence/branch tests, live reactive and stopped-history component tests, accessibility assertions, no-new-contract/import scans, and browser comparison with VIS-STATUS-001-003.
- Validate cumulative AD-REV-009/010 with VAL-026-029 and the retained clean/trace evidence.
  Require deterministic evidence for normal submit result, independent accept,
  non-waiting deferred settlement, unrelated command completion, idle retry,
  exact durability, and root shutdown phases. Team and Org shutdown must
  establish a stable frozen scope and complete each AgentRun input/provider-
  start/interrupt fence before task drain, including the pre-`TURN_STARTED`
  barrier, and terminate through the application handler.
  Do not interpret source compilation, elapsed time, invalid self-review,
  process-group SIGKILL, or one non-reproduction as proof of supported liveness.
- Validate AD-REV-012 with VAL-030, exact projector/store/serializer unit tests,
  shared disclosure and AgentOrg form component tests, standalone Team form
  regression, accessible control names/focus, and rendered desktop/narrow
  comparisons against VIS-OVR-001-006. Include negative import/API/schema scans;
  no server, durable, stream, runtime, definition, migration, or Team lifecycle
  change is authorized by this focused correction.
- Validate cumulative AD-REV-013/014 with VAL-031-033. Use one root/Team/Agent configuration
  fixture matrix through browser effective projection, exact GraphQL variables,
  server resolver and stored Org snapshot; include the Codex/GPT-config to
  AutoByteus/DeepSeek-with-null case and reset/inheritance/tool/workspace cases.
  Prove the same left-panel instance retains existing rows/state across catalog,
  config, launch, focus and stopped/history; `Orgs` follows `Teams`; root
  actions dispatch to the correct subject and mounted Teams have none. Prove an
  actual available Temp default is selected once, explicit choice wins,
  descendant inheritance/Team override is exact, absent default blocks, and
  focus stays null. Scan for the removed route predicate/panel, parallel raw
  patches, local serializer, hard-coded workspace path, and any new API/schema/
  persistence/lifecycle field.
- Validate AD-REV-015/016 with VAL-034-037. In addition to exact configured
  qualification, first-write ordering, authoritative refresh, and conservative
  provenance tests, assert terminal status independently by migration ID.
  `20260901_agent_org_flat_team_families_v1` has no warning outcome;
  unsupported/current/cleanup failures make it `FAILED`.
  `20260905_agent_org_history_first_message_summary_v1` is
  `SUCCEEDED_WITH_WARNINGS` only when no failed item exists and at least one
  independently valid empty row lacks unique qualifying evidence; required
  current-structure read/validation or selected-value write/strict-reread
  failure makes it `FAILED`. Do not add runner state, a second recovery path, or
  a normal trace-reading fallback to implement this status matrix.
- Validate AD-REV-019 with VAL-038–045 as specified in DS-028–030. All admitted
  task endpoint pairs are included; message rejection and task-notify failure are
  separate negative paths. Assert exact identity/relevance/binding, retained
  history without activation, and shared desktop/narrow Team presentation.

- Verify the current AD-REV-024 authoring/migration target through VAL-046–050
  and VAL-059–063: no authored version, org_local only in current Org config,
  exact internal identity, contextual negatives, initial direct final outputs,
  owned-child inventory/preservation and one normal retry. Add no migration for
  intermediate branch states. The existing definition entry has no warning
  result; prior summary/family statuses retain their distinct authority.
- CRR-072 / API-FIND-031's original frontend upload omission remains local and
  checkpointed in IR-048. IR048-DI-001 is the separate returned ownership/locator
  Design Impact resolved by AD-REV-025 / DS-041–043, pending independent review.
- Require VAL-064–069 implementation/API evidence: actual files and REST on
  repeated-address trees, chooser/image/text opening, remove/clear/send,
  provider exact-path normalization, retained/cross-view click without activation,
  async focus/edit recovery and initial saved-locator preservation. Do not treat
  the old expected-rejection probe or mocked renderer as a successful file path.
- Do not add a migration ID or reset/replay existing migration status from an
  unsupported deployment assumption. Inventory actual stored locators/drafts;
  preserve unresolved data and return concrete evidence rather than guessing.
