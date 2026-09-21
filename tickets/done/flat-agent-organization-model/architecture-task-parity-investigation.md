# Task Workflow Parity — Read-Only Architecture Comparison

**Current disposition (AD-REV-019):** Requirements re-entry RER-028 approved the
parity correction. The gap below is historical and closed at Requirements;
DS-028–030 now specify the architecture response, pending independent review.
No implementation or expanded validation pass is implied.

- Stable package: `AORG-FLAT-TEAM-001`.
- Date: 2026-09-11.
- Trigger: the user asks whether a direct Agent in an Org can delegate to a
  mounted Team, creating a fresh task Team, and inspect the same task/messages
  experience as the earlier nested-Team implementation.
- Earlier immutable Team baseline: `5fb16658e7bd2aefd750f99eb596a17382e161ac`.
  This is the previously pinned `origin/personal` experience, not the currently
  advanced ref (`5645b49d6f51faa60bd3545bc8e3f0e7e3f96793`).
- Current inspected task-worktree HEAD:
  `22a2d9eba959310b8bbc3eb96c0f767608786b69`; source artifact remains
  `6ef456e0a3fd568e732bafbd79c5f9abb2aed1f4` with subsequent documentation only.
- Requirements authority: RER-027; completed design/review: AD-REV-018 /
  ARCH-REV-016 Pass. AAV-001 is resolved and is not reopened by this comparison.
- Original outcome: requested source comparison, with a separate architecture-owned
  direct-delegator Tasks presentation gap identified. This is not a completed
  design revision, implementation assignment, browser validation, or delivery
  result. No source/test/requirements/design-spec change was made.

## Supported scenario and three distinct presentation paths

The user supplies an ordinary task-delegation scenario: an Org contains direct
Agent A and a configured flat Team T. A delegates work to T. The system creates
a fresh task-Team execution with fresh runtime identities, not another
configured Team and not reuse of T's already-mounted execution as the assignee.
The task remains in A's exact owning Org runtime scope. The user selects A to
inspect its delegated work and accepted messages/results. After acceptance and
settlement, the task leaves active execution while retained task records and
accepted A conversation input remain inspectable.

Do not conflate these three paths:

1. **Task lifecycle:** delegation tool -> owning root task engine -> fresh task
   preparation/commit -> task sidecar/event -> selected participant's Tasks
   list/detail with assignment, submissions, reviews, references and status.
2. **Task result notification:** assignee `submit_task_result` -> durable task
   submission -> system input to the exact original delegator -> its normal
   processing/conversation/history. A saved result is not proof that its
   notification was delivered; an unsuccessful notification is reported.
3. **Ordinary task communication:** an executing task Agent's `send_message_to`
   -> root message authority -> accepted receiver input -> conversation event
   and selected-participant Messages perspective. This is separate from formal
   task submission and the Tasks list.

## Earlier Team evidence

Paths below are read with `git show 5fb16658:<path>`; no checkout or mutation.

- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts:134-190,318-324`:
  resolves the target and exact host, materializes a fresh task Agent/Team,
  commits activation, and returns the fresh Agent or Team coordinator run ID.
- Same file `333-385`: stores submission/review records, notifies the original
  delegator through a separate task system-input path, and schedules settlement
  after acceptance. `443-477` finishes settlement and unregisters terminated
  task execution handles without erasing the task record.
- `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue:42-62,84-110`:
  displays both Messages and Tasks using the focused Agent's identity.
- `autobyteus-web/utils/teamDelegatedTaskEntries.ts:126-136`:
  task visibility includes the delegator, a task Agent assignee, and Agents
  inside the fresh task Team. Task list/detail is not a raw message ledger.
- `autobyteus-server-ts/src/services/team-communication/team-communication-message-append-plan.ts:75-95`:
  accepted durable messages publish both root communication and receiver input;
  this publication has no configured-pair-only gate.
- `autobyteus-web/utils/teamCommunication/teamCommunicationPerspective.ts:12-46`:
  filters by exact selected sender/receiver and resolves the counterpart through
  the task-inclusive execution view, rather than excluding task endpoints.

## Current Org comparison

### Preserved backend task creation and result path

`autobyteus-server-ts/src/agent-org-execution/services/agent-org-task-lifecycle-adapter.ts:62-113`
resolves the configured source, takes the originating Agent's exact host,
materializes fresh task identities, and prepares a root-hosted task Team for a
direct Org Agent or a Team-hosted task for an Agent inside a mounted Team.

`autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-lifecycle-engine.ts:174-192,335-338`
stores the formal submission and separately delivers a system notification to
the exact delegator, with an explicit warning if notification is not accepted.
These match the relevant earlier workflow. This read does not claim the whole
workflow passed current browser testing.

### Direct originating Agent has no right-side Tasks section

The current source establishes a deterministic composition gap:

- `autobyteus-web/types/workspace/activeAgentWorkspaceTarget.ts`: the direct Org
  Agent target has `collaborationMessages`, but no delegated-task view; task
  presentation remains part of `TeamWorkspaceContextView`.
- `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts:142-186,426-455`:
  direct Agent targets receive Messages only. Mounted-Team targets additionally
  receive `teamView`, which supplies `listDelegatedTaskEntries`.
- `autobyteus-web/components/layout/RightSideTabs.vue:110-116`: `activeTeamView`
  is null for a direct Org Agent.
- `autobyteus-web/components/workspace/collaboration/CollaborationOverviewPanel.vue:9-20,40`:
  Tasks is guarded by `v-if="team"`; task entries come only from that Team view.
- `autobyteus-web/services/agentOrgExecution/agentOrgTeamPresentation.ts:117-143`:
  the current task projector also requires a configured Team and builds its
  delegator identity lookup only from that Team's configured members.

Thus, successful task creation does not imply A can inspect it in the requested
right-side Tasks surface. This is a frontend ownership/composition gap, not a
reason to create a fake Team parent or a second task store. It is traceable to
DS-028's direct-target Messages-only composition and the file mapping in
`design-spec.md`, as well as VAL-040's direct-versus-mounted composition note.
Architecture owns correcting that design boundary; implementation should not
be told to guess a new UI or treat a direct Agent as a Team.

### Ordinary live task-message visibility remains deliberately narrower

AD-REV-018 and the current Org endpoint classifier/communication projector
permit only configured-to-configured pairs in the added live receiver event
and configured Messages view. The earlier Team behavior is broader. This
restriction does not suppress formal task-sidecar submissions or authorize
deletion of accepted input from retained conversation history.

RER-027 resolved retained history only; it did not authorize expansion of the
scoped live view. The user's desired full task-workflow parity and the current
scoped exclusion must not be described as already equivalent. Before changing
that live-view boundary, reconcile it with Requirements Engineering; component
and identity ownership remain Architecture's responsibility, not Product UI
invention. No such design or requirements change is made by this read-only
comparison.

## Conclusions for the user discussion

- The user's delegation example is the same supported product workflow that
  existed with nested configured Teams; changing the root to AgentOrg does not
  require different task controls or message presentation.
- Fresh task execution must remain distinct from its configured source Team.
- The task itself, formal task submissions/reviews, system result notifications,
  ordinary task messages, and retained conversation are related but distinct
  records/paths. A blanket claim that task results are excluded is incorrect.
- Two separate presentation discrepancies are now explicit: direct Org
  delegators lack the Tasks composition, and task ordinary messages are excluded
  from the scoped live communication view. Task-Agent and task-Team participant
  navigation must also be traced in a subsequent parity design/validation round;
  this investigation does not claim its completeness.
- No new runtime/persistence architecture is inferred from the UI gap. No
  implementation or new AD revision is authorized by this investigation alone.

## User-directed Requirements re-entry — 2026-09-11

After receiving this source comparison, the user explicitly requested routing
to Requirements Engineering because the current requirement changes the earlier
task-message experience without justification. Their intended workflow is to
carry the earlier Team task experience into AgentOrg: an originating Agent can
delegate to a referenced Team, creating a fresh task Team, and inspect its tasks
and task messages with the familiar presentation. Changing the containing root
does not justify excluding task communication.

**Historical outcome before RER-028: Requirement Gap — user-directed correction of the scoped
task-presentation boundary.** RER-027 explicitly retained the configured-only
live event/Messages restriction while resolving retained history. That
restriction conflicts with the user's now-explicit task-message parity request.
AAV-001's history interpretation remains resolved; this is a distinct request,
not retraction of its valid exclusion-assertion disposition.

Requirements Engineering should reconcile the canonical task communication and
selected-participant presentation requirements against the supported earlier
workflow and this user direction. Cover task Agents and task Teams, ordinary
accepted task messages, formal task submissions/reviews and accepted result
notifications, the original delegator's Tasks view, and retained history after
settlement/Restore. Keep these separate record/acceptance paths explicit; do not
infer a delivered notification from a saved submission. The earlier participant
filter and task-inclusive identity lookup provide comparison evidence, not a
requirement to copy their implementation.

The direct Org delegator's missing Tasks section is an architecture-owned
composition gap under the intended workflow. Requirements does not need to
prescribe components, ports, filters, storage or a new visual design to fix it.
Architecture will own the technical revision after the canonical behavioral
correction returns. No Product prototype is requested by this re-entry.

Preserve the already-approved root model: coordinator-free AgentOrg with direct
Agents and referenced flat Teams; fresh task-scoped executions under their exact
host; no configured Team nesting, synthetic coordinator/Team, second task/message
ledger, or independent mounted-Team lifecycle. Preserve settled-task history
without restarting the task. Root-model differences are real, but do not by
themselves require a different user-facing task workflow.

- Current cumulative classification remains `task_size=Large` /
  `architectural_risk=High`; no new implementation scope is assigned here.
- Last completed design/review remains AD-REV-018 / ARCH-REV-016 Pass. No new
  design round is completed and no AD-REV-019 is created by this handoff.
- Next action: Requirements Engineer records/reconciles the user's explicit
  parity direction and returns the approved cumulative package to Architecture
  for technical design, self-validation and applicable independent review.
- Existing API/E2E evidence and the RER-027 assertion disposition remain valid
  for their recorded scope; they are not proof that this expanded task parity
  has been implemented or validated. No cumulative pass or delivery readiness
  is claimed. Source, tests, upstream artifacts and other owners' dirty files
  remain untouched.


## AD-REV-019 — Architecture Response To Approved RER-028

RER-028 (`fadfb3c0`) is the current authority and expressly supersedes RER-026/027
configured-only event/Messages behavior. `design-spec.md` DS-028–030 and
`architecture-design-self-validation.md` VAL-038–045 now own the technical answer:

- Remove the configured-pair gate and task-message filtering. Preserve one Org
  communication authority, exact-ID admission, ordered receiver publication and
  truthful retained provider input.
- Extract participant Tasks as a separate root read facet; reuse established
  Team components/semantics without manufacturing a Team parent for direct A.
- Add exact task selection and one retained view index; correlate task IDs,
  actual run/provider/physical identity and captured source configuration.
- Distinguish saved task records, ordinary messages and actual accepted system
  input; rejected notification stays warning, never an invented delivered input.
- Retain settled task identity/history through readonly inspection in the same
  Org context; do not activate/restore a task merely to read it.

Additional read-only source evidence during this round:

| File / path (under server or web as named) | Observed boundary | Design response |
| --- | --- | --- |
| server `agent-org-execution/services/agent-org-execution-tree-location-service.ts`; `run-history/services/agent-org-member-run-view-projection-service.ts` | Exact task directory is found, but metadata uses the configured source's platform binding | Actual task node owns binding/location; source owns only frozen launch/definition fields |
| web `agentOrgContextHydration.ts` | Task seeds use placeholder definition/root defaults; fetch failure becomes null | Resolve captured source precisely; distinguish unavailable projection from genuine empty history |
| web `WorkspaceAgentOrgHistoryCollection.vue`; `agentOrgExecutionContext.ts`; `agentOrgStreamingService.ts` | Task rows nonselectable; authoritative/pending/recovery focus uses address | Exact execution selection through route/action/context; no source fallback |
| web `CollaborationOverviewPanel.vue`; `agentOrgTeamPresentation.ts`; `teamDelegatedTaskEntries.ts` | Tasks requires Team context/local mapping and shared row misnames Org identity as teamRunId | Independent Tasks facet, exact participant projector and root-tagged row types |
| server `root-task-lifecycle-input.ts`; `root-task-lifecycle-engine.ts`; `configured-agent-execution-handle.ts`; shared presentation adapter | Task commit and notification acceptance are separate; accepted SYSTEM currently passes generic user-member builder | Mark task provenance in known input builders and publish one existing system-input presentation only after acceptance |
| server `agent-org-run-manager.ts`; `agent-org-execution-view-projector.ts` | Manager owns stores/transition scope; active-only view constructor requires run | Service-owned readonly inspection with strict existing DTO projection, no fake live object or second store |

The prior four-file Team comparison is retained. No source, tests, browser or
provider was run/changed for this architecture round. The design remains
`Architecture Design Complete` pending independent review, not a delivery result.
