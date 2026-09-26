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

AGY is a supported Agent runtime at direct and Team-nested member addresses;
the Org's native execution tree and public member projection keep the exact
root/address/member identities. See [Antigravity CLI Runtime](./antigravity_cli_runtime.md)
for its provider binding, run capsule, and permission/trace semantics.
For AGY Org creation, all root, Team, and Agent placements are validated in
one ordered request-local model-selection batch. Equivalent runtime/workspace
contexts share fresh catalog evidence for that launch only; failures retain
the first affected placement address and a safe discovery reason when the CLI
catalog probe fails. A valid catalog missing the selected model remains a
distinct model-unavailable error. The bounded asynchronous AGY probe does not
block unrelated backend health requests while it is pending. Creating the
Org persists its configured tree without eagerly opening every member's
provider conversation.

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

The example is canonical output. Normal Org reads permit omitted `avatarUrl`,
normalizing it to null without source writes; explicit null means the same thing.
A supplied string is preserved and malformed non-null values remain rejected.
The same input reader serves the provider, admission and owned-source index, so
an omitted parent image does not hide otherwise valid owned Agents or Teams.
Only this optional field is defaulted: unknown Org keys and missing required
`defaultLaunchConfig` remain invalid. Builders/transaction validation stay strict.
Agent inputs already normalize omitted/null avatars, including their supported
owned placements; their existing non-string-to-null policy is unchanged rather
than tightened to match Team/Org validation.


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

## Exact Org-Owned Team And Team-Local Agent Reads

A self-contained Org can keep its Team definition beneath the Org package and
that Team's local Agents beneath its own `agents/` directory. Exact reads use
`findTeamSourcePaths` with the registered Org read roots as well as Team and
application source context. An Org-owned Team ID is only a family discriminator;
the exact owned-source index, not a decoded name or guessed path, establishes
its owner and physical directory. Missing indexed owners return no definition
rather than borrowing a same-named shared Team. The Agent provider supplies the
same Org-root context when reading a Team-local Agent.

The Team cache delegates Org-owned exact IDs directly to persistence without
inserting them into the public catalog snapshot. Exact readability and shared
catalog visibility are separate facts: valid self-contained packages need no
extraction, publication, copying or migration. Reads leave authored files intact.
Existing source writability and mutation boundaries are unchanged.

Frontend catalog getters likewise describe only the current public inventory.
Org detail/editor, owned Team detail and enclosing Org launch use the selected
Org's exact reference reader, including Team-local Agents. Launch must resolve
that graph independently; visiting detail first is not a prerequisite. The
selected-key loading/ready/unavailable snapshot blocks Create until complete and
rejects stale completions without replacing another selection's draft. Runtime,
model, Workspace and override validation still apply afterward. See the
[frontend read contract](../../../autobyteus-web/docs/agent_orgs.md#catalog-lookups-versus-exact-org-references).

This does not grant independent Run/Edit permissions for owned Teams, add a
global recursive inventory, or change configured topology, runtime identity,
provider behavior or schema. Ordinary enclosing Org execution retains the exact
Agent and enclosing Team instruction sources.

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

### Stopped History Archive And Delete

Stopped top-level AgentOrg history roots support two subject-explicit commands:

- `archiveStoredAgentOrgRun(orgRunId)` records one canonical archive timestamp
  in the V1 execution tree and projects it into the AgentOrg history index. The
  complete package remains on disk and the inactive row leaves the default
  history view.
- `deleteStoredAgentOrgRun(orgRunId)` permanently removes only the confirmed
  exact AgentOrg package and its index row.

Both commands execute inside the manager's exact-root lifecycle transition and
reject an active or otherwise managed root without restoring it or starting any
provider. The catalog remains the only tree/index/package mutation and
compensation owner. Delete does not remove the AgentOrg definition, referenced
Agent/Team definitions, workspace registration, sibling roots, or external
state. There is no unarchive/trash UI or data migration in this capability.

## Migration And External Publication

Required startup migration
`20260901_agent_org_flat_team_families_v1` performs the fixed-depth cutover for
software-owned memory run packages, history and token ownership. This remains
one unreleased migration identity, not a follow-up repair migration. The existing
token source-shaping chain and `20260819_token_usage_run_records_v1` run before
it; both current token materialization and Team execution-tree V2 are declared
prerequisites. Authored definitions are not migration inputs.

One metadata-only plan selects nested-Team sources, partial Org targets retaining
retired Team authorities, and exact pending history-index transfers. Root directory
enumeration, execution trees, index metadata and source-marker existence checks
are allowed. Standalone histories are not inventoried. Once a Team is classified
as flat, its member traces, archives, attachments and sidecars are not traversed.
A flat configured Team with delegated task Teams remains a non-candidate.

That plan governs locator conversion, runtime package conversion, selected index
updates and cleanup. Index files are atomic whole-file stores: unselected rows
remain semantically unchanged, unchanged indexes are not rewritten, and no
candidate means no history-content work or global Org-index rebuild. Invalid
metadata is diagnosed rather than guessed into a conversion candidate.

The migration preflights selected references, uses atomic replacement or same-root
family rename, and rereads target packages. It retains source authorities through
token correction, paired index publication/reread and candidate-dependency
validation, retiring the Team execution tree last. Per-root SQL transactions and
staged filesystem/index commits are distinct recovery boundaries, not one
cross-store transaction. Failures remain truthful and ordinary retries finish
remaining source work without duplicating accounting.

Token candidates are discovered independently from history candidates using
bounded SQL root selection and exact Org execution-tree membership. An ordinary
invocation with no history source can still correct stale token ownership without
history traversal. Only the three ownership fields change; counts, costs,
checkpoints, identities and analytics facets are preserved. See
[Token usage — Org family ownership](token_usage.md#org-family-ownership).
Successful migration ledger records retain ordinary skip semantics: no version
marker, successful-record detection/reopening hook or automatic ledger reset was
added. Normal readers remain current-only, with no repair on access.

Two root-local conditions are terminal warning items. First, a legacy Team root
that lacks its required `team_run_execution_tree.json` before a candidate plan
exists produces no target, token or index effect and its source directory remains
unchanged. Second, explicitly classified malformed or conflicting legacy token
attribution data rolls back that root's SQL transaction; the root is not reported
as token-migrated and remains locally unavailable through
`AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY`. Both remain failed item details and
contribute to `failedCount`. If these are the only failures, the migration returns
`SUCCEEDED_WITH_WARNINGS` and the shared startup runner skips the terminal record
on later launches. Unrelated roots remain usable.

All root/family/tree structural failures, SQL query/update failures, changed
update preconditions, strict reread failures, dependency failures, and other
locator, writer, commit, index, cleanup, concurrency, postcondition or unknown
failures remain `FAILED` and retryable. Global token discovery remains
attempt-fatal, and any fatal failure dominates root-local warnings. Warning
classification comes from the migration repository's typed data check, never
from a root key or error-message string.

Before restoring an Org runtime, `TokenUsageRunStore.assertAgentOrgRecordsReady`
checks existing records for the exact tree Agent IDs, in batches, before scope
construction/provider startup. Incompatible ownership is rejected with
`AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY`; absent usage records are not fabricated.
Normal root-package readiness remains strict for current family, manifest,
tree, task and message authorities, but does not repeat the migration's
whole-history attachment-locator audit or read raw-trace payloads. Candidate-only
migration I/O remains owned by the one-time transition.

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
runtime family ID remains unchanged; token prerequisite ordering and
candidate-scoped history behavior are described above.

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
transition within selected candidates. Its typed JSON/JSONL visitor covers
recognized attachment fields in selected traces and complete archived segments,
preserving unrelated values, lines and file bytes. An exact current-Org owner
referenced from a candidate permits owner-tree metadata and attachment stat
checks, not enumeration or rewriting of that owner's history. No global
cross-cohort reference repair is promised. Strict source/target package and unique physical-file
proof precede writes. Committed atomic writes, strict reread, root move and
cleanup must succeed; current packages are zero-write. Normal readiness checks
structural authorities without opening saved traces or checking every referenced
file. Exact current attachment access instead resolves the requested root and
AgentRun, validates the safe stored filename/path, and checks that one file.
Missing bytes return a request-scoped `404` and do not hide the otherwise valid
Org root. No second cache, legacy parser, repair path or backfill of absent
associations is introduced.

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
- `archiveStoredAgentOrgRun`, `deleteStoredAgentOrgRun` (stopped exact root)
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

## Stopped AgentOrg Run Configuration

`AgentOrgRunService.getRunConfig`, `runModelOptions`, and
`updateStoppedRunConfig` use one exact `orgRunId` subject. The GraphQL mutation
`updateStoppedAgentOrgRunConfig` carries independent `modelPatches` and
`teamWorkspacePatches` in one command. The manager owns the same root transition
lane as restore and resolves explicit Org, mounted-Team, and configured-Agent
scope addresses before validating any selection. Managed roots (including
fail-stopped), archived/unadmitted roots and application bindings cannot be
edited. Runtime, topology, handoffs, tasks, application/archive metadata and
identities are not patched.

A workspace patch may target only an exact configured mounted-Team address. Its
path is canonicalized and admitted through the workspace service, then applied
to the Team default and every directly configured child, including a child with
a previously distinct path or model/runtime override. The Org root, direct Org
Agents, sibling Teams, historical task snapshots and project files remain
unchanged. Workspace registration is a non-destructive registry side effect
outside the execution-tree commit: a descriptor admitted before a later failed
tree write may remain registered, but that does not represent partial run
configuration success and never moves or deletes files.

The injected `RunModelSelectionService` enforces same-runtime catalog membership
and schema-valid settings. AutoByteus replacements additionally require verified
positive, non-decreasing context capacity; Claude Agent SDK, Codex App Server,
and Antigravity CLI replacements have no platform capacity gate. For Claude,
a proven redundant `default` is omitted from new offers, while a scope already
saved as exact `default` retains a separately resolved current descriptor for
same-model settings and unaffected-scope continuity. Model options
and Save validation use each scope's effective workspace after the submitted
Team workspace patches, so workspace-contextual catalogs cannot be validated
against the old path. Same-model settings need no native replacement-capacity
comparison. No Agent/provider activation occurs during read/save. Every requested model scope
is validated through one request-local `validateMany` operation before the
workspace and model changes are composed into one immutable tree and written
once.

The strict execution-tree writer is unchanged: no-op writes are skipped,
not-renamed failure remains failed, and post-rename/unreadable/mismatched
readback remains indeterminate. `UPDATED` requires strict readback equal to the
expected whole tree; unknown canonical values are null, never echoed request
values. No persisted-schema migration, repair, mutation replay, provider-session
reset or separate standalone Agent/Team writer is introduced. Ordinary restore
reads the updated canonical root under the same lane and retains the existing
run and provider identities while using the saved child workspace.
