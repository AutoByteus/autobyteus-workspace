# AgentOrg

## Scope

AgentOrg is the coordinator-free persistent composition root for multiple
independent Agents and reusable flat AgentTeams. The configured topology has one
fixed shape:

```text
AgentOrg
├── Agent
└── AgentTeam
    └── Agent
```

An AgentTeam contains Agents only. AgentOrg cannot contain another AgentOrg, and
configured Team-within-Team nesting is rejected. Task-scoped delegation to a
flat Team remains supported and is not configured membership.

## Definition Contract

A normal AgentOrg definition uses
`agent-orgs/<org-definition-id>/org-config.json` with one strict current shape
and **no authored `schemaVersion` field**:

```json
{
  "members": [
    {
      "memberName": "software_engineering_team",
      "ref": "software-engineering-team",
      "refType": "agent_team",
      "refScope": "shared"
    }
  ],
  "handoffs": [],
  "avatarUrl": null,
  "defaultLaunchConfig": null
}
```

The adjacent `org.md` owns authored name, description, category, and
instructions.

- `refType` is exactly `agent` or `agent_team`.
- Authored `refScope` is `shared`, `org_local`, or `application_owned` when
  valid for the source owner. Internal source tags remain `agent_org_owned`,
  and GraphQL retains `AGENT_ORG_OWNED`; these are not authored values. Unknown
  values are rejected rather than falling through to another source family.
- An Org has no `coordinatorMemberName`, initial recipient, focus, or fallback
  field.
- Referenced Teams must be admitted current field-free flat Team definitions.
- Any authored `schemaVersion`, unknown/missing keys, unresolved references, deeper configured composition, and
  unavailable external dependencies fail target admission without mutation or
  legacy fallback.

## Addresses And Handoffs

Configured placement addresses are root-relative and exact:

- direct Org Agent: `/concierge`
- Team placement: `/software_engineering_team`
- Agent inside a mounted Team: `/software_engineering_team/code_reviewer`

AgentOrg handoff sources are Agent addresses. Destinations may be Agent or Team
addresses. A Team destination resolves to that mounted Team's direct coordinator
ingress. Handoff rules remain ordered natural-language guidance. The compiler
rejects invalid/self-resolving endpoints and duplicate effective pairs.

Runtime collaboration tools operate only inside the active root scope.
`get_handoff_rules` exposes the current Agent's eligible rules,
`send_message_to` targets an already existing execution, and
`delegate_task` creates a separately tracked task execution. Logical addresses
never discover unrelated roots.

## Launch Configuration And Admission

AgentOrg Run opens one configuration surface for the complete mounted scope.
The root configuration supplies required runtime/model/tool/skill/workspace
values, while sparse Team and Agent placement overrides add only local intent:

```text
direct Org Agent: exact Agent override -> Org root
mounted Team Agent: exact Agent override -> Team placement override -> Org root
```

Definition defaults continue to seed standalone Agent or Team launches; merely
referencing a definition does not make its default replace the active Org
configuration.

All exact root, Team, and Agent scopes must have resolved valid runtime/model
schema state before launch. Pending, invalid, or unavailable catalog/schema
state blocks Run with an exact diagnostic. A failed Agent runtime choice remains
visible and retryable but is not committed; returning to the actual current or
global-default choice abandons the failed operation, restores readiness, and
cannot leave a stale override in the launch payload.

Server-side projection and validation remain authoritative. The browser does not
allocate run IDs, infer missing settings, mutate referenced definitions, or
supply a recipient.

## Runtime And Focus

`AgentOrgRunService` plans and validates the fixed-depth definition,
`AgentOrgRunManager` owns root lifecycle, and `AgentOrgRun` owns the
coordinator-free root scope. Direct Agents use configured-Agent execution
handles. Each mounted Team uses the same flat Team execution machinery as a
standalone Team while keeping its definition identity, direct coordinator,
Team-local handoffs, and independent launchability.

Launching makes the full Org scope available with no focused recipient. Unused
configured Agents, both direct and inside mounted Teams, remain genuinely
unstarted and provider-unbound with Offline status. Fresh creation publishes
their exact handles and placements without calling configured activation
preparation; root availability does not imply that every worker has started.
Restore likewise reconstructs the full direct-Agent and mounted-Team scope
without preparing any configured runtime. Retained history and bindings remain
intact; only supported first work readies the addressed execution, preserving
restore mode and exact conversation identity. Later human or peer work can ready
another member while unrelated members remain Offline. Binding adoption or
verified no-conversation replacement commits through
`AgentOrgRun.commitAgentPlatformBindingChange` against its current durable tree
before cache update, runtime publication or accepted input. Expected-old
replacement checks and indeterminate/nonretryable failure semantics are retained.
Task-execution preparation still stages its assigned execution before durable
publication and work release; settled tasks are not relaunched by scope restore.

Org message receiver admission checks exact published membership, allowing an
unused configured recipient to receive its first work. Sender and task-origin
authentication still require the active/current exact Agent identity; published
membership is not a replacement for origin authorization.

The user must
select an exact Agent or Team before a recipient-requiring interaction. Selecting
a Team focuses its direct coordinator; there is no first-member or Org
coordinator fallback.

The shared collaboration stream uses `root_subject_kind: "agent_org"` and
`root_run_id`. Commands carry one exact member execution identity. Supported
client commands are `SEND_MESSAGE`, `INTERRUPT_GENERATION`,
`APPROVE_TOOL`, and `DENY_TOOL`. Unknown roots, stale run IDs, incomplete
task lineage, and cross-root targets fail closed.

The AgentOrg communication sidecar remains the single root message authority.
After an inter-Agent append is durable, the root stream publishes that message.
For every admitted ordinary endpoint pair, the same commit also presents exactly
one `MEMBER_INPUT_MESSAGE` to the receiving Agent before releasing its reserved
input. Configured direct/mounted Agents, task Agents, and task-Team Agents all
use this path. Presentation correlates retained exact identities; it does not
re-admit a committed message against later liveness or a configured-only gate.
The presentation preserves canonical sender address, content, reference context,
parent message id, origin, and committed time.
Rejected, failed, self-targeted, cross-root, or uncommitted sends publish no
receiver input event.

Task-system notification presentation is separate from ordinary communication.
The shared `task-system-input-presentation.ts` helper marks genuine SYSTEM
notification provenance, display content, and backend-response suppression.
Existing execution-handle acceptance controls recipient presentation; task
records do not fabricate accepted inputs. A committed task update remains durable
if its notification is rejected, with an explicit warning rather than a false
receipt. There is no additional notification ledger, retry queue, or provider
failure inferred from a controlled notification rejection.

## Tasks, Status, And Lifecycle

- Direct Org Agents and mounted-Team Agents can message and delegate through
  canonical addresses.
- Task Agents and task Teams are transient execution projections with durable
  task records; they do not alter configured topology.
- Each Agent owns its exact five-state runtime status.
- Status snapshots start only from structural Org execution roots: direct Org
  Agent handles, directly mounted configured TeamRuns, and unsettled root-hosted
  task TeamRuns. Each TeamRun recursively projects its own descendants. The flat
  Team execution directory remains an exact lookup/lifecycle index and is not
  walked as a second set of recursive roots, preventing duplicate Agent status
  identities for nested task Teams.
- A mounted Team row may show a presentation-only aggregate over its descendant
  Agent statuses with precedence
  `running > initializing > error > idle > offline`. The aggregate is not a
  persisted Team status or lifecycle authority.
- Root lifecycle, WebSocket connection, Agent status, task status, and command
  overlays are separate facts.
- Stop Org fences new work, drains or interrupts admitted work according to the
  root shutdown contract, terminates the entire materialized scope, and retains
  durable history. Restore uses stored run identities and provider bindings,
  not mutable current definitions.

## Persistence And History

AgentOrg has its own durable family:

```text
memory/agent_org_run_history_index.json
memory/agent_orgs/<org-run-id>/
  agent_org_run_execution_tree.json
  agent_org_task_delegation_records.json
  agent_org_communication_messages.json
  <rooted member memory...>
```

`AgentOrgRunExecutionTreeFileV1` has `schemaVersion: 1`,
`subjectKind: "agent_org"`, and a coordinator-free `rootOrg`. It stores
direct Agent placements, direct mounted-Team placements with their Agent
members, compiled handoffs, effective launch configurations, concrete local and
provider identities, application binding, timestamps, and task snapshots.

Native standalone Teams remain byte/path native Team V2 under
`memory/agent_teams/<team-run-id>/team_run_execution_tree.json`. Generic
history uses an explicit `agent_team | agent_org` root union; it does not force
both families into one persisted generic root. `listCollaborationRootHistory`
exposes the two root kinds while family-specific loaders retain strict package
validation.

An AgentOrg history row starts with an empty `summary`, displayed by clients as
`New - <AgentOrg name>`. The first successfully accepted external
`SEND_MESSAGE` whose compacted content is non-empty and whose exact target is a
configured direct Org Agent or an Agent inside a directly mounted Team becomes
the durable summary. Whitespace sequences collapse to one space; values longer
than 100 characters use the first 97 characters plus `...`. Task-scoped
recipients, rejected or failed sends, later user messages, inter-Agent traffic,
task/system input, and approval or interrupt commands never set or replace the
summary.

The command boundary identifies configured versus task-scoped execution from
the strict execution tree. After configured Agent admission succeeds, the
AgentOrg history catalog serializes summary attempts, commits the first
non-empty value through the shared atomic JSON writer, strictly rereads the
index, and only then returns the truthful accepted command acknowledgement.
History-write failure is derived-metadata failure: it is logged without
replaying or relabelling the accepted Agent input. The per-path writer retains
a handled settlement tail, so one caller-visible write rejection cannot escape
as an unhandled rejection, poison later same-path writes, or retain stale queue
ownership.

### Retained Execution Inspection

`getAgentOrgRunInspection` returns the existing execution-view DTO through the
run service and manager's existing per-root transition lane. For an active root,
the manager captures and closes a coherent package snapshot connection. For an
inactive root, it strictly reads and jointly validates the execution tree, task
records, and communication sidecar. Missing or unreadable families fail instead
of becoming empty history. Inactive views have no live statuses; retained client
contexts initialize offline.

Inspection does not activate providers, Restore, rewrite packages, migrate, or
repair data. Exact retained task Agent/Team identity survives settlement and
distinguishes repeated runs at one logical address. Member projections use the
actual retained physical execution/provider binding, not the configured source's
memory directory or an Org-root fallback. Configuration derives from captured
launch data rather than current mutable definitions. The existing tree and task
record families are sufficient; this inspection query adds no persisted family
or migration. Live settlement publishes the complete updated view, retiring live
task rows without discarding retained inspection or introducing a second cache.

## Migration And External Publication

Required startup migration
`20260901_agent_org_flat_team_families_v1` performs the approved fixed-depth
cutover for software-owned memory run packages and history only. It
preflights candidates before writes, uses atomic replacement or same-root
family rename, rereads and validates target families, updates the two history
indexes, and reports per-item failures for restart Retry. Normal readers admit only the current family shape; no retired-shape decoder,
dual write, or request-time migration fallback is available.

The later required startup migration
`20260905_agent_org_history_first_message_summary_v1` reconciles only empty
AgentOrg summary metadata. It preserves every existing non-empty summary and
backfills an empty row only when strict current Org packages, configured-member
trace corpora, and root sidecar exclusion evidence establish one uniquely
earliest qualifying external user message. Missing, invalid, contradictory, or
ambiguous evidence leaves the valid empty summary unchanged and reports a
bounded `SUCCEEDED_WITH_WARNINGS`; required current-structure or selected
write/reread failure is `FAILED`. Normal runtime never infers titles from trace
files or performs backfill on read.

Authored definition packages are maintainer-owned inputs, including definitions
stored under server-data paths. The family migration no longer converts, moves,
or cleans Team/Org definitions. The former definition-only authoring migration
is unregistered and removed; existing ledger rows remain inert, without reset,
replay, reversal, or automatic repair of partial authored conversions. The
runtime family ID, prerequisite order, context locators, sidecar validation and
history transfer remain unchanged.

Team readers accept unused metadata and omitted package launch defaults while
preserving required-field and real scoped Agent admission. Org input validation
and strict canonical writes remain unchanged. An incompatible definition becomes
individually unavailable; it does not require startup to rewrite authoring data.
Stored Org root restore uses persisted execution state rather than fresh enclosing
Org instructions; individual Agent restoration still needs the appropriate Agent
definition. Ordinary explicit authoring saves and transaction recovery remain
separate supported operations.

## Exact Context Files And Saved References

Org draft and final attachment owners include both `orgRunId` and the exact
`agentRunId`. The strict stored execution tree proves membership and resolves
the physical directory; logical address alone cannot distinguish repeated task
executions. Draft/final owner equality is checked before file movement. The
current context-file routes include:

```text
/drafts/agent-org-runs/:orgRunId/agent-runs/:agentRunId/context-files/:storedFilename
/agent-org-runs/:orgRunId/agent-runs/:agentRunId/context-files/:storedFilename
```

These are context-file paths, distinct from message/task-owned reference routes.
Ordinary readers do not accept retired address-only Org locators, activate a
runtime, guess a configured source at the same address, or migrate on access.
Missing/invalid ownership and internal failures retain distinct error outcomes.
Native Team attachment ownership and physical layout remain native Team paths.

The existing initial family migration owns the bounded saved-reference
transition. Its typed JSON/JSONL visitor covers recognized attachment fields in
current traces and complete archived segments, preserving unrelated values,
lines and file bytes. Strict source/target package and unique physical-file
proof precede writes. Committed atomic writes, strict reread, root move and
cleanup must succeed; current packages are zero-write. Readiness checks saved
context references before admitting the affected package, without a second
cache, legacy parser, repair path or backfill of absent associations.

**Before actual installation cutover:** Architecture must adjudicate the real
installation inventory and any already-completed/intermediate migration state
(IR049). Local branch/test exposure is not proof of public deployment or global
absence of saved locators. Preserve originals and existing completion status;
do not reset/replay a migration or invent another migration to bypass this gate.
This operational decision does not block source-branch finalization.

## API Surface

Definition GraphQL operations:

- `agentOrgDefinitions`, `agentOrgDefinition`,
  `agentOrgEndpointCatalog`
- `createAgentOrgDefinition`, `updateAgentOrgDefinition`,
  `deleteAgentOrgDefinition`

Run GraphQL operations:

- `createAgentOrgRun`, `restoreAgentOrgRun`, `terminateAgentOrgRun`
- `getAgentOrgRunInspection` (read-only retained package, distinct from Restore)
- `getAgentOrgMemberRunProjection`
- `getAgentOrgMemberEventMonitorActiveTracePage`
- `getAgentOrgExecutionCheckpoint`
- `getAgentOrgMemberTokenUsageSummary`
- `listCollaborationRootHistory`

Reference-content REST routes are rooted below
`/agent-org-runs/:orgRunId/communication/messages/...` and
`/agent-org-runs/:orgRunId/task-delegations/...`.

## Key Source

- `src/agent-org-definition`
- `src/agent-org-execution`
- `src/agent-collaboration`
- `src/api/graphql/types/agent-org-definition.ts`
- `src/api/graphql/types/agent-org-run.ts`
- `src/api/graphql/types/collaboration-root-history.ts`
- `src/api/rest/agent-org-references.ts`
- `src/run-history/store/agent-org-*`
- `src/run-history/services/agent-org-*`
- `src/app-data-migrations/migrations/agent-org-flat-team-families-v1`
- `src/app-data-migrations/migrations/agent-org-history-first-message-summary-v1`
- `@autobyteus/collaboration-stream-contracts`
