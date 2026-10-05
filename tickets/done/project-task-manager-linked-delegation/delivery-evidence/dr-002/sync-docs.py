import pathlib,json,hashlib,shutil
w=pathlib.Path(__file__).resolve().parents[5]; e=pathlib.Path(__file__).resolve().parent
changes={}
def update(rel, edits):
 p=w/rel; before=p.read_text(); after=before
 for old,new in edits:
  assert after.count(old)==1,(rel,old[:90],after.count(old))
  after=after.replace(old,new,1)
 assert before!=after
 q=e/'prior-docs'/rel; q.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(p,q)
 p.write_text(after)
 changes[rel]={'beforeSha256':hashlib.sha256(before.encode()).hexdigest(),'afterSha256':hashlib.sha256(after.encode()).hexdigest(),'priorSnapshot':str(q)}
update('autobyteus-server-ts/docs/modules/projects.md',[(
'''Project Tasks are **not** delegated execution children. `projects/**` and
agent-execution/task-delegation subsystems do not import each other. A status
write does not launch/delegate/stop an execution, associate a run, assess work,
or release resources. `DONE` is business metadata, not engineering acceptance.
The caller owns reasoning and ordering; no scheduler, automatic status flow,
Manager/team package, new client/script/skill or runtime stopping is provided.''',
'''A Project Task is a **business record**, not an execution child. Optional
saved-ID delegation links fresh Agent/Team copies to a Task execution lifetime.
The Task service owns business status and durable link/closure facts; the shared
root lifecycle and runtime owners perform dispatch, admission and scoped release.
Explicit `DONE` atomically closes that Task's lifetimes and initiates release of
only their owned executions. It is neither engineering acceptance nor proof that
physical cleanup has finished. Other status writes do not start work.

The shipped **Project Task Manager** is an ordinary reusable Agent, invoked
through existing Chat or `@`, not a Project-page panel or scheduler. Its template
is `src/built-in-agents/templates/project-task-manager/` (definition ID
`autobyteus-project-task-manager`). It selects/reuses/creates real Tasks, discovers
an Agent/Team, delegates saved work, follows the returned exact ingress run ID,
then explicitly sets IN_PROGRESS or DONE from available business information.
Its selected tools are the three Project tools plus `list_available_agents`,
`delegate_task`, `send_message_to` and `read_file`. It has no resource-inspection
or cleanup-retry duty. Worker completion reporting, automatic DONE, scheduling
and a new worker self-update convention are not guaranteed by this feature.'''),(
'''- `src/projects/stores/project-store.ts`''',
'''- `src/projects/stores/{project-store,project-metadata-schema,project-state-schema}.ts`
- `src/projects/domain/project-task-execution{,-state}.ts`
- `src/projects/runtime/project-task-runtime-release.ts`
- `src/agent-collaboration/execution/task/` (root-neutral lifetime/dispatch boundary)'''),(
'''Missing file means no Projects. Updates use the existing per-file lock and
atomic rename. Tasks share the Project lock and metadata deletion boundary.''',
'''Missing file means empty state. Updates use the existing per-file lock and
atomic rename. Tasks share the Project lock and metadata deletion boundary.
Ordinary Project rows retain their current shape. When lifetime facts exist,
the same array also contains one node-owned `{ "taskLifetimes": [...] }` record;
it has no Project identity and is never a Project/UI row. Absence means no
linked lifetime facts, not inferred historical ownership. `ProjectStore`
projects the array into logical Projects and lifetimes and preserves both on
normal writes, including deletion of the last Project. No object envelope,
schema version, startup converter, history scan or migration is introduced.
Malformed critical lifetime facts or a non-array authority fail scoped operations
with `PROJECT_STATE_UNAVAILABLE`; they are not silently reset to empty.'''),(
'''Tool Task results contain projectId, taskId, full description, status and
contextFiles; no timestamps. Each file exposes saved metadata and a relative''',
'''`list_project_tasks` returns projectId, taskId, full description, status,
contextFiles and `assignments`; no timestamps or raw lifetime/cleanup diagnostics.
Each assignment carries the root kind/ID, exact AgentRun or TeamRun identity,
its `ingressAgentRunId`, and dispatchOutcome (`accepted`, `not_confirmed` or
`failed`). Helpers are not business assignments; acceptance is not completion.
`create_or_update_task` returns only `{task: {projectId, taskId, status}}` as a
recorded-business acknowledgement, not a fabricated assessment or release proof.
Each listed file exposes saved metadata and a relative'''),(
'''Session/local-admission failures remain transport-owned.
See [Agent Tools MCP](agent_tools_mcp_server.md) for session lifecycle/access.''',
'''Session/local-admission failures remain transport-owned. If a mutation's result
cannot be confirmed, `PROJECT_OPERATION_UNCONFIRMED` asks the caller to inspect
the saved Task before repeating; an exception is not proof of rollback.
See [Agent Tools MCP](agent_tools_mcp_server.md) for session lifecycle/access.

## Saved-ID Delegation And Execution Lifetimes

`delegate_task` has two strict, coequal input modes:

- Described work: `{recipient_address, description, reference_files?}`.
- Linked saved work: `{recipient_address, task_id}` only. No `project_id`,
  description or reference_files override is accepted. Blank/unknown/ambiguous
  Task IDs, DONE Tasks or unavailable saved bytes fail without fallback spawning.

Linked dispatch resolves the unique current node-local Task and snapshots its
saved description and context bytes into the ordinary work packet. Later Task
edits do not rewrite already-delivered work. Each call allocates a fresh copy;
TeamRun identity and coordinator ingress AgentRun identity remain distinct.
Follow-up uses the exact returned `target_agent_run_id`, not the definition address.

Identity-only planning and registered private preparation precede durable link
reservation and resource acquisition. Stamped execution-tree durability and
lifetime admission precede work release. Reserved/admitted/failed attempts remain
truthful facts, not successful assignments; indeterminate dispatch must be
inspected rather than blindly repeated.

A lifetime owns its linked copies, their configured Team members, recursively
created helpers and further delegations, even when a helper is physically hosted
as a sibling in the enclosing root. A linked worker's no-ID delegation inherits
its lifetime. Address messaging first respects the sender's own Team instance,
then its lifetime helper, then an existing unowned outside placement; an absent
catalog helper is a fresh copy shared only within that lifetime. Already-existing
unowned advisers are borrowed, not adopted; another Task's owned run is not a
shared helper. Definition/address equality is not execution ownership.

Explicit DONE writes business status and permanent lifetime closure in the same
atomic array replacement. It immediately fences new owned input/materialization,
cancels registered preparations and initiates exact-root release of the owned
forest without waiting for work to become idle. Failed or uncertain cleanup stays
closed with retained receipts; repeated explicit DONE can retry outstanding
cleanup, never re-acquire already released resources. An unavailable root leaves
cleanup pending, not a false success or automatic restore. This retry boundary
belongs to the platform, not the Manager prompt or a background scheduler.

TODO/IN_PROGRESS reopening does not reopen an old lifetime or start a runtime.
A later deliberate delegation creates a new lifetime/copy. Restart/history reads
retain closed stamps and cannot wake old work. Task/Project Delete still removes
only business metadata and owned context, not execution history or runtime work;
node lifetime facts survive deletion. DONE never deletes outputs, conversations,
workspaces, Git worktrees, uploaded originals, the Manager, unrelated roots or
another Task's live executions.

See [Team delegation](agent_team_execution.md#server-owned-task-delegation),
[message resolution](agent_communication.md#task-linked-message-scope) and
[public history](run_history.md#task-linked-history-and-public-projection).''')])
update('autobyteus-web/docs/projects.md',[(
'''selected agent tools can create or change text/status. Status does not launch,
assign, stop or assess an execution. Project Tasks are not delegated children.''',
'''selected agent tools can create or change text/status. Project Tasks remain
business records, distinct from execution children. Optional saved-ID delegation
links fresh copies to a Task lifetime; explicit DONE closes/releases only its
owned work through the platform. Other status writes do not start work, and DONE
is not engineering acceptance or proof that physical cleanup is finished.'''),(
'''are available; omitted fields/files persist. No batch or Task attachment mutation
tool.''',
'''are available from listing, with exact assignment/ingress identities and dispatch
outcomes for follow-up; omitted fields/files persist. Mutation returns a compact
recorded-status acknowledgement, not raw resource diagnostics or work assessment.
No batch or Task attachment mutation tool.'''),(
'''Manager/team definition remains user-owned externally. No scheduler, assignment/
run linkage, automatic completion assessment, sidebar/run-history changes,
resource stopping, new client/scripts/skills, mobile delivery or feature-default
change is part of this module's current slice.''',
'''The shipped Project Task Manager is an ordinary reusable Agent available through
existing Chat/`@`; no Project-page chat or assignment panel is added. It selects
real saved Tasks, delegates with `{recipient_address, task_id}`, follows the exact
returned ingress run ID and explicitly updates status from available results or
user instructions. It does not supervise physical resources or guarantee worker
completion reports. Linked dispatch loads saved Task text/context internally;
caller description/reference overrides are rejected, and later edits do not
rewrite delivered work. See the server's
[saved-ID/lifetime contract](../../autobyteus-server-ts/docs/modules/projects.md#saved-id-delegation-and-execution-lifetimes).

Manual Refresh and existing concrete worker/history surfaces remain the visibility
paths; no automatic board synchronization, scheduler, auto-DONE, new status UI,
mobile delivery, client/script/skill or feature-default change is introduced.
Reopening TODO/IN_PROGRESS starts nothing; a later deliberate delegation gets a
fresh lifetime. Existing Task/Project Delete is metadata/context deletion, not
cancel-as-delete, and retains recorded runtime/history/lifetime facts.''')])
update('autobyteus-server-ts/docs/modules/agent_team_execution.md',[(
'''spawn: it starts a fresh child and hands back its run ID. There is no task
record, task status, submission, review, or settlement; the retired''',
'''spawn: it starts a fresh child and hands back its ingress run ID. It creates no
separate delegation task-record/submission/review/settlement subsystem. Optional
Project Task linkage uses the existing business Task authority; the retired'''),(
'''task GraphQL/REST APIs, and the task UI no longer exist.''',
'''delegation task GraphQL/REST APIs, and their task UI no longer exist. The current
Projects APIs/UI are separate and are not retired.'''),(
'''The address uses the same canonical absolute non-root `/...` grammar as''',
'''Alternatively, `{recipient_address, task_id}` selects saved Project Task work.
The parser rejects mixed description/reference overrides or caller `project_id`;
no-ID described delegation retains the contract above. Saved text/context,
exact assignment and permanent DONE closure belong to the
[Project lifetime contract](projects.md#saved-id-delegation-and-execution-lifetimes).

The address uses the same canonical absolute non-root `/...` grammar as'''),(
'''Delegated children (task executions: a task Agent or a task Team) are managed
as resources, not as tasks.''',
'''Delegated children (task executions: a task Agent or a task Team) are managed
as execution resources, distinct from business Tasks. An optional immutable
`taskLifetime` stamp associates a copy and its Team members/recursive helpers
with a Project Task lifetime. Exact lifetime ownership, not physical subtree or
logical definition/address, determines completion-driven release. The Manager,
borrowed unowned runs and other Tasks remain outside that release set.

The idle/wake rules below apply only while any linked lifetime is open. Explicit
DONE permanently fences owned input, wake, restore and late publication, cancels
registered private preparations and force-releases its owned forest. Failure or
uncertainty retains exact cleanup authority for platform retry; it is not false
terminal success or whole-root termination. History remains inspectable. Business
reopen starts nothing and does not revive old copies.'''),(
'''starts shut down and is wakeable. There is no reopen repair.''',
'''starts shut down. Unlinked/open-lifetime children are wakeable; closed-lifetime
  children remain fenced. There is no reopen repair.'''),(
'''after reopen they start shut down and are woken on demand.''',
'''after reopen they start shut down and are woken on demand only when unlinked
  or their linked lifetime is still open. Optional lifetime stamps are retained;
  absent stamps mean unlinked, not inferred historical ownership.'''),(
'''for restore; delegated children come back shut down and wakeable, with no
repair step.''',
'''for restore; delegated children come back shut down, with no repair step.
Closed Task lifetimes remain permanently non-wakeable.''')])
update('autobyteus-server-ts/docs/modules/agent_orgs.md',[(
'''lifecycle); they do not alter configured topology. There are no task records.''',
'''lifecycle); they do not alter configured topology or create a separate
  delegation task-record subsystem. Optional Project Task links/lifetime stamps
  preserve exact assignment and completion ownership through the shared
  [Task lifetime contract](projects.md#saved-id-delegation-and-execution-lifetimes).'''),(
'''- Each Agent owns its exact five-state runtime status.''',
'''- For Task-owned workers, address resolution retains own-Team-instance priority,
  then reuses that lifetime's helper or borrows an existing unowned outside run.
  New catalog helpers and further delegations belong to the same lifetime, even
  when hosted at the Org top level. Another Task's same-address owned helper is
  not reused. Explicit DONE releases only this owned forest; closed copies cannot
  wake after restore, and history is retained. Ordinary unlinked run-wide
  collaborator behavior is unchanged. See
  [Task-linked message scope](agent_communication.md#task-linked-message-scope).
- Each Agent owns its exact five-state runtime status.''')])
update('autobyteus-server-ts/docs/modules/standalone_agent_run_root.md',[(
'''## Package\n''',
'''## Project Task-Linked Copies

The host and children use the same strict saved-ID/described `delegate_task`
variants as Team/Org roots. A linked copy's optional lifetime stamp is preserved
in the private tree; its business authority remains the Project Task service.
Owned helper copies and recursive delegations inherit that lifetime even when
hosted as root-level siblings. Existing unowned collaborators are borrowed, not
adopted. Explicit DONE fences/releases the exact owned forest, not the host or
unrelated collaborators, and never deletes history. Closed copies cannot be
woken after root restore; business reopening does not restart them.

See [Project lifetimes](projects.md#saved-id-delegation-and-execution-lifetimes),
[message scope](agent_communication.md#task-linked-message-scope) and
[public projection](run_history.md#task-linked-history-and-public-projection).

## Package
''')])
update('autobyteus-server-ts/docs/modules/agent_communication.md',[(
'''### Address resolution order (`MessageRecipientResolution`)''',
'''### Task-linked message scope

The ordinary one-instance/run-wide behavior below is unchanged for unlinked
senders. A Task-owned sender retains deepest own-Team-instance resolution first,
with no miss fall-through. Outside that instance it resolves its lifetime's
existing helper, then an existing **unowned** configured/collaborator placement.
Such an adviser is borrowed, not adopted into Task cleanup. Otherwise a catalog
address produces one helper copy within that lifetime, not a shared run-wide
bring-in; concurrent same-lifetime requests reuse it, while independent Task
lifetimes receive distinct copies. Another Task's owned run is not borrowable.
Exact run-ID follow-up still does not create a copy. Both sender/receiver input
and deferred publication consult the permanent lifetime fence before wake or
acceptance. See [Project lifetimes](projects.md#saved-id-delegation-and-execution-lifetimes).

### Address resolution order (`MessageRecipientResolution`)''')])
update('autobyteus-server-ts/docs/modules/run_history.md',[(
'''   are shut down and wake on the next same-root message.''',
'''   are shut down and wake on the next same-root message only when unlinked or
   their optional Project Task lifetime remains open. Closed stamps remain fenced.'''),(
'''For both families, `platformAgentRunId` identifies only the exact external''',
'''### Task-linked history and public projection

Private current execution trees retain optional `taskLifetime` ownership stamps;
absence means unlinked. Project lifetime facts remain in the node's Projects
array independently of business metadata deletion. Neither metadata Delete nor
DONE removes conversations, concrete child identities or retained execution
history, and reading inactive history does not authorize closed-work wake.

Agent-root and Org public tree facades use the shared recursive
`services/agent-streaming/collaboration-execution-tree-dto-projection.ts` mapper.
Live/inspection/resume and mixed list/scoped Org history must project every
concrete Agent/Team copy, nested Team member, collaborator and task descendant
through the corresponding strict public DTO, not pass a private stamped tree
through or drop children to make schema parsing succeed. Internal lifetime stamps
are omitted, while run IDs, source/configuration and delegator identities remain.
This is a visibility/projection contract, not standalone privacy certification.

For both families, `platformAgentRunId` identifies only the exact external''')])
update('TESTING.md',[(
'''### GitHub Skill Sources Regression''',
'''### Project Task-Linked Lifetime Regressions

Use the current worktree and the smallest relevant server layer first:

```bash
pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-collaboration tests/unit/agent-tools/project-tasks tests/unit/agent-tools/task-delegation --no-watch
pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/integration/standalone-agent-run-root/native-root-termination.integration.test.ts --no-watch
```

The Project tests cover current-array/no-migration state, saved-ID payload and
compact business results, permanent DONE closure, failed/pending cleanup retry,
reopen and deletion preservation. Actual RootTeam/catalog/ProjectStore helper
integration covers same-address Agent/Team helpers isolated by A/B lifetime,
borrowed-adviser non-adoption, exact stop sets and closed ingress. Native hosted
children cover their own admission/termination boundary. These controlled
model/backend checks do not certify paid inference or universal OS teardown.
The current Native fixture lives under `standalone-agent-run-root/`, not the
retired `agent-run-collaboration/` test location.

Production `tsc`, the scoped Org/publication checks above, recursive public-tree
projection tests and existing web history consumers close separate contract gaps.
Public HTTP/WS/scoped MCP tests, controlled SDK real-child exit/IO tests, actual
model execution and whole-app same-profile restart are distinct evidence layers;
a business DONE acknowledgement or Offline row is not exact physical proof.
A full product journey requires a newly built isolated desktop app and owned
Project/context/workspace data. Do not treat an older asar as proof of a refreshed
source state. Record exact build/IDs/checks and limitations, stop only the owned
instance, and keep Delivery-owned rerun evidence separate from the API-owner
ledger. Agent-run testing is not explicit user verification for finalization.

### GitHub Skill Sources Regression''')])
(e/'docs-change-provenance.json').write_text(json.dumps(changes,indent=2)+'\n')
print('Updated',len(changes),'long-lived docs; prior bytes archived.')
