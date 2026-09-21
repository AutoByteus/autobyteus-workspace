# History Selection Versus Runtime Restore — HIST-INSPECT-001

- Package: AORG-FLAT-TEAM-001; date: 2026-09-11.
- Outcome: confirmed Architecture-owned Design Impact in the configured Org
  member history-selection/continuation boundary, not a missing Product decision.
- Authority: approved RER-032; latest completed design remains AD-REV-022.
- This is an investigation, not a completed replacement design or AD revision.
- Workspace: /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model
- Branch: requirements/flat-agent-organization-model.
- Initial inspected source: af2d6a046633edf8f98f83aca58e3697ee009197.
- Final source checkpoint: 25436ef4d3d0ed94e1389e9619d17f68e5126067.
  The concurrent composer correction changed none of the compared history
  action, Team hydration/open, Org status-row or Org manager files.
- Read-only comparison: local origin/personal at
  5645b49d6f51faa60bd3545bc8e3f0e7e3f96793 and immutable earlier Team baseline
  5fb16658e7bd2aefd750f99eb596a17382e161ac. No fetch was performed.

## Supported User Scenario

The user stops and restarts the server, then clicks a previously run Team Agent
to inspect its retained conversation. It remains Offline. Clicking a configured
Agent in an old Org instead makes that Org and its configured Agents green/Idle,
even though the user sends no new message and requests no resume. The supplied
DR-009 screenshots show this contrast. The user explicitly expects the earlier
nested-Team history-browsing behavior, not activation on focus.

## Evidence And Causal Path

All relative paths below are under the canonical worktree.

| Boundary | Evidence | Observed source behavior |
| --- | --- | --- |
| Earlier Team history open | `origin/personal:autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts:34-79` | Hydrates the requested retained context. Connects a stream only if the root is already active; otherwise disconnects it. No restore mutation. |
| Earlier Team history hydration | `origin/personal:autobyteus-web/services/runHydration/teamRunContextHydrationService.ts:215-309`; `teamExecution/teamExecutionContextFactory.ts:71-78` | Queries resume configuration and member projections, preserves server isActive, and initializes Agent contexts Offline. Despite the helper name hydrateLiveTeamRunContext, this is not a runtime restore. Both open/hydration files are unchanged between the pinned earlier baseline and local origin/personal. |
| Earlier Team deliberate continuation | `origin/personal:autobyteus-web/stores/agentTeamRunStore.ts:250-264` | RestoreAgentTeamRun is called when sending to an inactive selected Team, followed by exact target hydration and submission. Clicking history and sending are separate triggers. |
| Org root-row history open | `autobyteus-web/composables/useWorkspaceHistorySubjectActions.ts:52-65` | Correctly uses inspect for inactive roots and navigates in history mode. |
| Org retained task inspection | Same action owner, lines 68-78 | Also uses inspection rather than restore for inactive roots. |
| Defective configured Org selection | Same action owner, lines 81-91 | For an inactive run, select explicitly awaits orgRunStore.restore, connects a stream, refreshes history, and navigates in active mode. Both configured Agent and mounted-Team row clicks enter this selection action. |
| Actual runtime consequence | `autobyteus-web/stores/agentOrgRunStore.ts:30-39`; server `agent-org-run-service.ts:133-141`; `agent-org-run-manager.ts:91-106,186-224` | Executes RestoreAgentOrgRun, materializes the root runtime and registers it active. This is not only loading display data. |
| Full-scope consequence | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-execution-scope-builder.ts:119-139,164-179` | Prepares configured direct Agents and mounted flat Teams, commits the plans and activates the Org. Thus one row click can activate the complete configured Org. Green Idle is not proof of a new provider turn, but the root has actually been reactivated. |
| Status presentation | `autobyteus-web/utils/agentOrgHistoryRows.ts:44-75` | Reads exact Agent status only when history and matching context are active/live; otherwise projects historical Offline. The observed active/Idle signals follow the unwanted restore trigger, not merely a hard-coded green dot. |
| Existing read-only alternative | `autobyteus-web/stores/agentOrgContextsStore.ts:69-101`; server `agent-org-run-manager.ts:132-161` | Loads a strict inspection snapshot and member history without constructing a runtime; inactive inspection has no live status entries. |
| Test preserving the divergence | `autobyteus-web/composables/__tests__/useWorkspaceHistorySubjectActions.spec.ts:71-97` | Explicitly expects a stopped root to be restored when a member is selected. Passing this assertion would preserve the user's reported regression. |

## Architecture Responsibility And Recovery Boundary

Unlike COMPOSER-001's omitted existing submission step, this path was retained
in design: `design-spec.md:2258-2268` introduces historical read-only contexts but
expressly preserves the existing configured-Agent restore journey. It did not
separate ordinary configured-member inspection from deliberate continuation.
Architecture therefore owns removing that retained assumption; recoloring the
dots or changing only the test is not a sufficient correction.

Required recovery direction is the established Team distinction: root/member/
mounted-Team history navigation reads and selects retained history without
activation; deliberate continuation restores through the existing Org root
owner and then submits to the exact intended Agent. Existing full-scope Org
activation, no initial fallback, settled-task read-only behavior, root identity,
message/task persistence and actual Agent status sources remain unchanged.

The completed correction must also specify continuation from an inactive
configured-Agent context. Current historical Org targets are read_only and have
no interaction port. Simply replacing restore with inspect in one click handler
would leave that continuation path incomplete. Keep retained settled tasks
non-resumable, preserve exact target/draft across hydration, and coordinate with
the separate COMPOSER-001 submission fix rather than reverting it. Do not create
a new lifecycle owner, fake Team root, auto-resume on mount/reconnect, or false
Offline display for a genuinely active runtime.

Validation must distinguish no-input inspection from explicit send: after a
supported server restart, click root/direct Agent/mounted Team/member and retained
task links; assert history is visible, no restore mutation/provider activation or
active-registry change occurs, and status remains truthful. Then deliberately
continue an eligible configured Agent and verify exact one-submission behavior,
real status changes, failure handling and focus-switch isolation. Repeat the
Team control. Existing root/task inspection-only checks do not cover configured
row selection. Broader independent design routing follows the completed impact
revision; this investigation is not an implementation assignment or new pass.

## Evidence Limits And Preservation

This round inspected code, existing test assertions and the user's screenshots.
It did not restart the live server, click the app, execute provider/browser tests,
change source/tests, modify Requirements, or verify a fix. Delivery-owned dirty
documents and the concurrent implementation work were preserved. The user has
provided the intended behavior; no new visual prototype is needed to explain it.

Screenshot directory:
/home/autobyteus/data/memory/agent_teams/software_development_department_d2b93633ad6b4d969e6e0d776dda7721/software_engineering_team_570be46d520142849ac61785be03dca1/architecture_designer_6b8b3019214246e086957b3f395901bb/context_files/

Files: ctx_6f27f0dafc4c__image.png; ctx_224155d0014a__image.png;
ctx_575becb8b204__image.png; ctx_f7211ebc5911__image.png.

## Related Terminate-To-Configuration Finding — HIST-INSPECT-002

The user additionally reports that terminating the selected Org replaces the
event monitor with the new-Org launch form, unlike Team termination. Read-only
source inspection at 00c3aeea7f6cb4fc22ee57e8c47c9a993f249aa4 confirms why:

- `autobyteus-web/composables/useWorkspaceHistorySubjectActions.ts:37-49`
  awaits successful root termination, disconnects/removes the Org context, then
  replaces the current matching active route with `mode: configuration`. The
  replacement keeps only the definition ID and drops the run/member identity.
- `autobyteus-web/stores/agentOrgContextsStore.ts:49-62` removes the disconnected
  run's context and pending focus. Thus retaining just the old center route
  without providing stopped history would not be sufficient either.
- `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue:18-19,185-187`
  displays AgentOrgRunConfigPanel for that configuration route instead of the
  retained execution workspace.
- `autobyteus-web/components/workspace/config/AgentOrgRunConfigPanel.vue:109-113,343-394`
  calls launch only through runOrg, wired to the Run button. Mounting the form
  fetches definitions/workspaces and applies defaults; it does not create an Org
  runtime. The observed screen therefore suggests a new run but does not itself
  start one. This differs from HIST-INSPECT-001's actual restore-on-click.
- `autobyteus-web/stores/agentTeamRunStore.ts:200-218` terminates, disconnects,
  marks the existing context/history inactive and cleans up Agent runtime status
  without removing the selected Team context or navigating to launch. This method
  is byte-identical to local origin/personal at the pinned comparison revision.
  `useWorkspaceHistoryMutations.ts:59-75` adds pending/error handling, not a new
  route. The selected conversation is retained rather than replaced by a form.
- `useWorkspaceHistorySubjectActions.spec.ts:125-142` explicitly expects the
  Org stop-to-configuration redirect. This assertion protects the divergence;
  it is not independent evidence of intended Team-equivalent behavior.

Include this in the same history/lifecycle recovery: successful stop of the
selected Org should retain the same run and exact selected Agent's conversation
with truthful stopped/Offline status; stop of another root must not hijack the
current workspace. Terminate is not New Run. New configuration remains an
explicit user action; later deliberate continuation remains distinct from
history inspection. Preserve stop failure/pending handling and root ownership.
Provide the stopped inspection context safely rather than merely removing the
redirect and leaving the center without data, or retaining stale live ports.

This is another implementation divergence requiring coordinated presentation
boundary correction, not a request to alter backend termination, invent a new
Product screen, or restart the stopped Org. Add selected direct/mounted/task
conversation retention, no create/restore mutation, other-root selection, and
failed-stop checks to recovery validation. No source/test change or live
termination was performed in this investigation; no fix/pass is claimed.

## Completed Design Resolution — AD-REV-023

The user explicitly requested the design update after both investigations.
DS-035–037 in design-spec.md now remove configured restore-on-click and the
terminate-to-configuration redirect, and complete deliberate Send continuation
plus exact retained conversation/status publication. VAL-054–058 cover the
supported positive/negative paths. The context store owns browser operations,
not backend lifecycle; the IR-044 composer correction is preserved. No upstream
artifact/schema/migration/task-policy change. Focused Medium/High, cumulative
Large/High; independent review is the next gate. Earlier “not a completed design”
statements describe the investigation stage, not the current design authority.
This resolution does not claim source implementation or executable validation.


## AD-REV-027 — Original Team Status Comparison And Read-Client Recovery

### Entry, Authority And Investigation Limits

Completed architecture comparison following user direction via Code Reviewer
CRR-089 / CR-FIND046 / API-FIND039, 2026-09-12. Earlier sections retain their
AD023 chronology; the current recovery decision is AD027 in design-spec.md.
Approved RER033 and Product status supplement are unchanged. This round does not
revise requirements, restore old Team semantics or declare source readiness.

- Assigned worktree/branch: `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model`,
  `requirements/flat-agent-organization-model`; HEAD at entry
  `d76731eaa3260a123f1ce8c6ace0e14994fddcde`; source
  `bbdea002ee59da87cc7174bfc2924888c0bb38f7`.
- Reconfirmed both local personal AND origin/personal at
  `5645b49d6f51faa60bd3545bc8e3f0e7e3f96793`. Read with `git show <pin>:<path>`;
  no fetch, checkout, branch reset or baseline execution. Original comparisons
  below use this one pin, not current branch files with similar names.
- `git diff f84c5299f10898f49acff6a0e481d1cd61c769a9 --stat --` the four upstream
  requirements-doc, investigation-notes, requirements-revision-record and
  agent-org-contract files returned no difference. Their approval/behavior
  authority was read, including REQ028/031, AC023/026 and Product status contract.
- A 31,987 tracked-regular-file SHA256 entry baseline includes other owners'
  dirty bytes. Only selected Architecture artifacts may change this round;
  implementation/API/Reviewer/Delivery records and three API test deltas remain
  theirs. No API/browser/provider/root command or persistence operation was run.
- Incoming source proof and API37 observations remain attributed to CRR089/API37.
  Architecture read the actual source and installed-client proof, not an invented
  reconstruction of browser subscribers or original API36 WS timing.

### Pinned Original Production-Path Evidence

Paths in this table are relative to `autobyteus-web/` at the immutable pin.
Ranges identify inspected source; the files remain available through git show.

| Source | Observed ownership and implication |
| --- | --- |
| `stores/agentTeamRunStore.ts:200–218` | Exact root termination requires successful GraphQL result; disconnects stream, sets view root inactive, performs per-Agent cleanup, marks history inactive and refreshes quietly. Pending/failed termination is not success. Retains context/selection. |
| `stores/runHistoryStore.ts:255–285` | `markTeamAsInactive` maps the exact root/member activity, invalidates resume editability for refresh, and immediately refreshes navigation topology; active action similarly publishes. Explicit source-to-navigation publication matters. |
| `stores/runHistoryTeamRows.ts` (`projectConfiguredRows`, history/context builders) | Configured Team containers have no Agent status; exact AgentRun-keyed context status is used for live context rows, history member status for history rows. No root activity computed from aggregate. |
| `stores/runHistoryTeamHelpers.ts:88–174` | Build history nodes then overlay existing loaded Team contexts, including root isActive at 152/163 and exact Agent rows at 143. This is original precedence, not merely a component style. |
| `stores/runHistoryTeamExecutionRows.ts` | Stable configured identities and exact transient AgentRun IDs/depth determine navigation rows; task Agent status remains an Agent fact, not Team root status. |
| `components/workspace/history/workspaceHistoryNestedTeamStatus.ts` | Five-state rank fold scans descendant Agent rows bounded by exact Team row/depth, includes task descendants and excludes containers/outside branches; no lifecycle side effect. |
| `components/workspace/history/NestedTeamAggregateStatusDot.vue` and `__tests__/workspaceHistoryNestedTeamStatus.spec.ts` | Passive dot exposes localized title/name; source tests cover precedence, empty/missing and recursive task descendants/branch isolation. Tests read, not executed this round. |
| `services/teamExecution/teamExecutionContextFactory.ts:62–78` | Newly hydrated configured AgentContext starts Offline, not invented Initializing. |
| `services/teamExecution/teamExecutionViewState.ts:230–280` | Snapshot validates exact root, ID/address, uniqueness and canonical status coverage before setting exact AgentContext currentStatus; emits navigation/projection reconciliation effects. |
| `services/agentStreaming/TeamStreamingService.ts:252–293` | CONNECTED/snapshot/ready phase validation; root lifecycle event explicitly updates view activity and history navigation. Context/view event processing and leaf status are separate from root lifecycle. |
| `services/runHydration/teamRunContextHydrationService.ts` and `services/runOpen/teamRunOpenCoordinator.ts:34–79` | Observational resume/tree/member hydration validates identities and root activity, commits context/projections, and attaches stream only if active. Inactive inspection does not restore. |
| `services/runHydration/teamMemberProjectionHydrationService.ts` | Exact root/context/Agent/address and presentation/activity revisions protect conversation hydration; recorded conversation is not a runtime-status authority. |
| `stores/agentTeamContextsStore.ts`, `stores/runHistoryNavigationProjection.ts` | Context replacement verifies identity, changes observable store and explicitly reconciles navigation; projection is a derived view, not an independent root lifecycle. |
| `stores/runHistoryLoadActions.ts` (fetch and `reconcileDiscoveredActiveRuns`) | Original network-only history read has no observed freshness generation. Reconciliation can set existing Team root active from returned active IDs and attach; inactive path disconnects and cleans statuses. Thus context overlay alone is NOT proof against a delayed active history result. |

Original stream `applyEffects` (`TeamStreamingService.ts:297–333`) dispatches
Agent events into the exact context selected by effect.agentRunId, with root and
member address. Current Org `AgentOrgExecutionContext.applyEvent:149–171` likewise
checks sequence and exact ID/address before shared Agent presentation dispatch.
This is concrete shared status-event handling, not merely similarly named stores.

Original reusable pattern: authoritative root lifecycle → immediate read-model
publication; exact execution-context Agent status → leaf; descendant-Agent fold →
Team dot. Original configured recursion/coordinator and its history freshness
assumptions are not reusable Org contracts. Current approved Org fixed depth,
unfocused launch, no Org coordinator and mounted-Team lifecycle non-effects win.

### Current Production-Path Evidence And Difference

Paths are relative to the assigned worktree at the recorded source/current bytes.

| Source | Evidence / decision |
| --- | --- |
| `autobyteus-web/stores/runHistoryLoadActions.ts:68–185` | Full and focused readers allocate existing Org family generation then issue the same network-only query; latest logical check precedes commit, but neither operation disables deduplication. Full reader isolates workspace and Org results with allSettled. |
| `autobyteus-web/stores/runHistoryStore.ts:241–246` | Activity action increments family generation, updates exact row, synchronously refreshes cached navigation and starts focused refresh. IR058 effect is correct and retained. |
| `autobyteus-web/stores/agentOrgContextsStore.ts:35–81,112–144,238–250` | Publish and markHistorical call activity action. Stop invalidates old inspection, awaits successful terminate, marks historical and reads inspection. Inspection has Symbol checks but same network-only query can join a prior in-flight physical operation. onInactive redundantly refreshes again after the action-owned refresh. |
| `autobyteus-web/stores/agentOrgRunStore.ts` | Thin GraphQL command adapter validates successful termination; context store owns UI transition. No server lifecycle policy should move here. |
| `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts:42–82,202–210` | Exact ID/address contexts receive snapshot statuses, root activity is distinct; inactive transition cleans Agent runtime state and retains historical context. |
| `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts:230–317`, `agentOrgContextHydration.ts` | Existing strict root/sequence/generation/staged-publication barriers and correlated inactive callback; no new protocol needed. Context status authority is not a history-response-derived Agent status. |
| `autobyteus-web/stores/runHistoryNavigationProjection.ts`, `components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue:31–46` | Org navigation takes history rows, not Team-style context overlay. Root dot and Stop read run.isActive; merely correct selected Agent Offline cannot repair stale root navigation. |
| `autobyteus-web/utils/agentOrgHistoryRows.ts`, `services/agentOrgExecution/agentOrgTeamBranchStatus.ts`, `utils/workspaceTeamAggregateStatus.ts` | Leaf status is exact live AgentContext when root/context authority permits; mounted aggregate folds own configured/task Agents independent of collapse. Pure presentation, no runtime registration/commands. Keep this separation. |
| `autobyteus-web/plugins/30.apollo.client.ts:19–76` | Production bound client composes error/auth/HttpLink and normal cache; no dedup override. Preserve binding, credentials and global defaults. |
| Installed `node_modules/.pnpm/@apollo+client@3.14.0_*/node_modules/@apollo/client/core/ApolloClient.js:62,83` and `QueryManager.js:720–762,1159` | Default dedup true. Per-operation context.queryDeduplication overrides it. Dedup key is printed server query plus canonical variables; network-only still uses Link acquisition. No-cache alone also does not establish independent physical observations. Exact installed path is retained in CRR089/installed-apollo-boundaries.txt. |
| `autobyteus-server-ts/src/run-history/services/collaboration-root-history-service.ts:28–56` and GraphQL `types/collaboration-root-history.ts` | Read-only facade gets current root from orgRuns.getActive; is_active is Boolean(active), not a task/Agent aggregate. Stored tree remains separate. No server/API change selected. |

Search of current web named-query uses found two production history invocations
and one inspection invocation, plus definitions/generated artifacts/tests. No
additional raw-cache watcher for these named queries was identified. Shared
network-only policy can remain when all authority publication occurs through the
existing guarded owners. This is a scoped consumer search, not a whole-client audit.

### Confirmed Failure Versus Adjacent Risk

CRR089's recorded actual-loader/parser/query/action + installed-Apollo experiment
(`read-client-composition-result.json`) shows one Link for two logical calls;
latest generation 3 was inactive before release and active after old-body release.
Fresh controlled rejection retained active. That is a composition counterexample,
not a mocked implementation fix or full Pinia/hosted experiment. API37 establishes
the supported normal path in four actual Workspaces cases. IR058 pending-only
publication remains execution-resolved; old API36 gaps remain missing.

An adjacent source-supported path is active history selection → outstanding
inspection → root Stop → post-Stop inspection. Root Stop exists before inspection
completion; the new Symbol would otherwise still accept the old deduplicated
physical query. This round records the risk and applies the same invariant to
that sole activity-bearing inspection reader. No fifth API37 failure or observed
inspection resurrection is claimed. AD027 excluded member projection content reads;
AR-FIND-009 subsequently established that exclusion as too narrow for DS037.
Current AD028 includes the exact staged member reader as detailed below. Unrelated
Team paths and hypothetical replica protocols remain outside this correction.

### Bounded Installed-Client Operation Experiment

Architecture ran a memory-only diagnostic with installed Apollo core 3.14.0,
InMemoryCache and a controlled Link. Two simultaneous `client.query` calls used
the same literal `query ArchitectureReadFreshness { activity }`, no variables,
network-only policy. Baseline produced ONE Link and results `[true,true]` from
one old response. Adding per-operation `context:{queryDeduplication:false}`
produced TWO Links and `[true,false]` from separately released responses. Strict
Node assertions on Link count and results passed, with no backend/network/root
operation. Client instances were stopped afterward.

Reproduction structure (resolve Apollo from the recorded installed package):

```js
const pending = [];
const client = new ApolloClient({ cache: new InMemoryCache(),
  link: new ApolloLink(() => new Observable(observer => { pending.push(observer); })) });
const options = { query: gql`query ArchitectureReadFreshness { activity }`,
  fetchPolicy: 'network-only',
  ...(independent ? { context: { queryDeduplication: false } } : {}) };
const a = client.query(options), b = client.query(options);
await new Promise(resolve => setImmediate(resolve));
assert.equal(pending.length, independent ? 2 : 1);
pending[0].next({ data: { activity: true } }); pending[0].complete();
if (independent) {
  pending[1].next({ data: { activity: false } }); pending[1].complete();
}
assert.deepEqual((await Promise.all([a,b])).map(r => r.data.activity),
  independent ? [true,false] : [true,true]);
client.stop();
```

This is only verification of the installed library option, not production loader,
Pinia, schema, browser, API acceptance or an implemented repair. Four installed
Apollo `cache.diff/canonizeResults` deprecation diagnostics appeared in this
experiment and were not suppressed. During read-only discovery, two guessed
source locations did not exist (web-local Apollo node_modules and a top-level
server collaboration-root-history glob); resolved pnpm and run-history/services
paths were read successfully afterward. Neither diagnostic was treated as product
failure or erased. Existing Reviewer preparation errors remain in its evidence.

### Completed Design Decision And Boundaries

DS037/047 retains original-style separate authorities but corrects request
provenance, using one private typed history operation and one inspection option
at the existing owners, with logical guards retained and redundant onInactive
refresh removed. No UI status overlay, second activity cache, app epoch, migration,
global Apollo default or broad Team refactor. This is the smallest justified
cross-boundary correction given the confirmed history failure and sole analogous
inspection publisher. Independent fresh active evidence remains valid; pending/
failed Stop does not fake inactivity. Exact Agent readiness remains independent.

Self-validation VAL058/076–078 defines real-client/real-store tests and normal
hosted direct/mounted controls. Full cumulative API/E2E and successful proportional
API-test review remain required. API37 Fail69.3, incomplete groups, native and
historical evidence gaps are not upgraded; IR049 cutover remains a separate
Architecture decision. All incoming 2169 references remain linked, not claimed
independently re-audited here. Result: Architecture Design Complete; focused
Medium/High, cumulative Large/High; independent revised-impact review required.


## AD-REV-028 — Final Staged Member Projection Is A Required Read Dependency

- Trigger/authority: ARCH-REV-024 Fail / Design Impact, sole finding AR-FIND-009
  (Medium), AR-PREM-013; review/entry HEAD
  eeffdd437246f8c4f538752041764b67702872a0. Approved RER033 unchanged; source
  bbdea002ee59da87cc7174bfc2924888c0bb38f7. Four upstream artifacts rechecked
  against approved f84c5299f10898f49acff6a0e481d1cd61c769a9 with no diff.
- Workspace/branch remain the assigned isolated worktree and requirements branch
  stated above. Entry snapshot covers 31,976 tracked regular files (symlinks are
  excluded in this round), including 20 other-owner dirty tracked files. No
  application, tests, requirements, reviewer or API records may be changed here.
- Earlier AD027 clarification acknowledged this omitted dependency, with no
  interim edits or implementation routing. Formal ARCH024 now authorizes the
  bounded architecture revision; original Team comparison and valid DS047 stay.

### Supported Path And Source Recheck

Normal user goal: reopen an already-running offscreen Org, then Stop it while
initial member hydration is pending to inspect final work. Root inspection has
completed; its exact member request sampled earlier content and remains in flight.
Normal already-admitted execution records more output before successful Stop.
The fresh inactive root inspection stages the same member query. This is a
supported ordinary lifecycle path, not multi-tab/conflicting-edit behavior.

| Exact current source | Observation and consequence |
| --- | --- |
| `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue:36–46` and `composables/useWorkspaceHistorySubjectActions.ts` | Root Stop is exposed by active history independently of completion of initial selected-Agent hydration. Existing exact selection/open and Stop actions are the initiating surfaces. |
| `autobyteus-web/stores/agentOrgContextsStore.ts:112–136,238–250` | New root inspection Symbol protects its own staging/commit. Stop invalidates the old stage but starts a new one; it does not make that stage's separately issued child query physically new. |
| `autobyteus-web/services/agentOrgExecution/agentOrgContextHydration.ts:112–129` | Same GetAgentOrgMemberRunProjection document and exact root/address/AgentRun variables, network-only without dedup override. Correct identity does not attest when response content was sampled. |
| Same file `138–209` | applyProjection builds candidate conversation; captures activity expectedRevision after the child response. isCurrent is tested after children settle. Old stage can correctly fail while the new stage adopts the same old physical body. |
| `autobyteus-web/stores/agentActivityStore.ts:328–339` | Activity revision comparison protects against local changes after capture. With no such intervening change it may pass an old remote sample; it is not a physical-read or server revision guard. |
| `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts:130–146`; context store publish `36–54` | Matched-context adoption replaces old.state, including conversation, after activity commit. Object identity, pending-user-message reconciliation and retained draft/selection do not protect newer server output against an old projection candidate. |
| `autobyteus-web/graphql/queries/runHistoryQueries.ts:241–258`; server `src/run-history/services/agent-org-member-run-view-projection-service.ts:49–67` | Existing exact retained-content service returns conversation/activities separately from root inspection. No response-origin discriminator or shared atomic root/member snapshot is part of this contract. No server change is selected. |

A first hydration without a previously committed context omits newer final content;
a renewal with a matched context can replace displayed conversation. Subsequent
historical open may reuse the stale committed context. These are retained-view
correctness failures, not durable record loss or proof that the root becomes active.
API37 remains only the separately observed root-control failure; this is not its
fifth hosted case. The current investigation did not execute a live reproduction.

### Reviewer Diagnostic Provenance And Limits

Read-only inspection of the reviewer's supplied temporary script/log confirms the
reported diagnostic shape: AST extraction of unchanged fetchProjection; actual
GraphQL query; installed Apollo3.14; same-ID network-only reads; synthetic body,
controlled Link, simplified latest-token publication. One Link publishes pre-Stop
sampled content; diagnostic scoped query override yields two Links and final
retained content. It is not actual stage/context/Pinia/browser/backend execution,
a durable test or an implemented repair. Four cache.diff/canonizeResults library
diagnostics are in the log and are retained as disclosed diagnostics.

- `/tmp/aorg-arch024-member-read.cjs`, SHA256
  `5fbb069deee4fd5f3a5f87f07d4b262a05058563d686d369cd22a5d4cd449a6a`.
- `/tmp/aorg-arch024-member-read.log`, SHA256
  `2f6df9c0c2e97d48c6d2edb416c5e14d1be3897252eee3c75471920b3e2b24a1`.
- Durable review description/premise remains design-review-report.md and
  architecture-review-revision-record.md at eeffdd437246f8c4f538752041764b67702872a0.
  The temporary files are not claimed as repository acceptance evidence or rerun
  by Architecture in this revision.

### Completed Resolution

DS037/047 now includes the existing fetchProjection operation for all current
inspection/stream staging, uniformly using network-only and per-operation
queryDeduplication false with unchanged query/variables and identity/error checks.
No new read owner or caller-kind flag. Existing logical cancellation, activity
conflict and all-candidate publication, failure/draft/selection retention remain.
Do not clear/reload history repeatedly or merge stale bodies to conceal the gap.

The file map now covers three existing production files; only the hydration
reader is added to AD027's production scope. DS047-M extends the composite spine;
VAL079 requires actual-client/staging/store proof after the old root query is
complete but its child is pending. Old/new child completion orders, final content/
activities, new child rejection/identity failure, multi-child partial-stage
failure, no prior context/matched adoption and historical reuse are explicit.
Live/Team controls and root-status VAL058/076–078 remain required.

No live multi-query snapshot isolation, server/schema change, new epoch/queue/
cache/protocol, migration or backfill. Persisted data is Not Affected. Added
independent requests remain within current staging callers/members. Cumulative
Large/High, focused Medium/High; Architecture Design Complete, re-review pending.
API37 Fail69.3, FULL cumulative/source/proportional-review gates, all historic
missing/native/AAV002/003 limits and separate IR049 BEFORE-CUTOVER disposition
remain unchanged. No implementation, delivery or final acceptance is claimed.
