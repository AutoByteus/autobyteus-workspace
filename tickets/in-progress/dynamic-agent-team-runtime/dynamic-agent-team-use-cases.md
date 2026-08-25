# Dynamic AgentTeam Runtime — Use Cases And System Behavior

## Status

`Draft — prerequisite satisfied; approval requested` — intended-behavior supplement to `requirements.md`.

## Purpose And Authority

This supplement makes each supported case concrete enough to audit the later design's data-flow spines. It clarifies R-001–R-034 and AC-001–AC-030 but does not replace the requirements document.

## Common Terms

- **Root TeamRun:** The persisted rooted execution package and public runtime boundary selected by the caller.
- **Configured placement:** An Agent or nested AgentTeam node from the root definition graph.
- **Task execution:** A transient Agent or Team execution created through delegation; it is not a configured placement.
- **Containing TeamRun default:** The complete persisted `defaultLaunchConfiguration` of the direct parent TeamRun.
- **Current definition graph:** The graph visible through the explicitly updated/refreshed definition catalog when reconciliation begins.
- **Retained placement:** Same canonical address, same node kind, and same referenced Agent/AgentTeam definition ID.
- **Replacement:** Same canonical address but a changed node kind or referenced definition ID; runtime effect is retirement plus addition.

## UC-001 — Explicitly Reconcile One Active Root

**Trigger:** A caller has updated/refreshed definitions and invokes the supported reconcile operation with one active root TeamRun ID.

**Required behavior:**

1. Resolve the root definition ID from the current persisted TeamRun, not from arbitrary caller input.
2. Resolve and validate the complete current definition graph.
3. Compare configured placements and handoffs with the root's current V2 tree.
4. Serialize the operation with other mutations of the same root.
5. Return `applied`, `no_change`, or structured rejection.

**Non-behavior:** Updating a file, definition, package, or catalog does not itself reconcile any run. Reconciliation does not automatically fan out to every active run using the same definition.

## UC-002 — Identity-Preserving No-Op

**Precondition:** The current definition graph has the same configured addresses, kinds, referenced definition IDs, coordinator addresses, and compiled handoffs as the active tree.

**Required behavior:** Return `no_change`; allocate no run IDs; terminate/materialize no members; write no execution-tree file; send no handoff notification.

## UC-003 — Add A Direct Agent

**Example:** The current root tree has `/planner` and `/builder`; the refreshed root definition also adds `/reviewer`.

**Required behavior:**

1. Validate `/reviewer` and the complete candidate graph.
2. Allocate one new AgentRun ID.
3. Clone `/`'s current persisted TeamRun default into `/reviewer`'s complete Agent launch snapshot.
4. Prepare the Agent placement without admitting normal work.
5. Durably commit the new V2 tree.
6. Publish the current runtime/index so `/reviewer` becomes routable.
7. Preserve `/planner` and `/builder` run IDs and conversations.

**Nested example:** Adding `/software/tester` uses `/software`'s current default, not `/`'s default and not a newly reread definition default.

## UC-004 — Add A Nested AgentTeam Subtree

**Example:** The current root definition adds `/research`, whose definition contains `/research/lead` (coordinator), `/research/researcher`, and child Team `/research/verification`.

**Required behavior:**

1. Allocate one child TeamRun ID for `/research` and all descendant TeamRun/AgentRun IDs.
2. Set `/research`'s complete default to a clone of its parent TeamRun's current default.
3. Set every newly added nested Team's default to a clone of its immediate parent's effective default.
4. Set every new Agent's complete launch snapshot from its nearest containing TeamRun default.
5. Prepare and publish the subtree as one unit; partial subtree routing is forbidden.
6. Enforce exactly one direct Agent coordinator in every added Team.

The reconcile request carries no per-addition launch overrides in this version.

## UC-005 — Remove A Direct Agent

**Example:** `/writer` exists in the active tree but not in the current definition graph.

**Required behavior:**

1. Close new direct user, inter-agent, and task admission to `/writer`.
2. Reuse `AgentRun.prepareTermination()` and its native input lifecycle:
   - accepted-but-not-forwarded inputs are cancelled with `AGENT_RUN_TERMINATED_BEFORE_INPUT_FORWARD`;
   - forwarded/active work reaches completion, interruption, or failure before termination finishes.
3. Commit the active tree without `/writer` and remove the address from current routing.
4. Dispose the live AgentRun only after its native termination contract completes.
5. Do not delete its Agent memory, task records, or communication records.
6. Do not restart unaffected members.

**Timing:** There is no new arbitrary retirement timeout. A reconcile operation can remain pending while already-forwarded provider work settles.

## UC-006 — Remove A Nested AgentTeam Recursively

**Example:** `/research` and every configured descendant disappear from the current graph.

**Required behavior:** Apply UC-005 admission and native termination semantics recursively to the child TeamRun, its configured Agent descendants, materialized child TeamRuns, and locally owned runtime descendants. Publish removal as one configured-topology change. Task-created placements are not treated as definition diff entries.

## UC-007 — Replace A Placement At The Same Address

**Agent example:** `/writer` still exists but now references Agent definition `writer-v2` instead of `writer-v1`.

**Team example:** `/research` still exists but now references a different AgentTeam definition ID.

**Required behavior:** Treat the old placement as removed and the new placement as added. Preserve the canonical address but allocate new run identity/identities. Never mutate one AgentRun or TeamRun into a different definition identity.

## UC-008 — Update Handoffs

**Handoff-only case:** Topology is unchanged but one or more compiled natural-language edges differ.

**Required behavior:**

1. Commit the new root handoff snapshot without restarting retained Agents.
2. `get_handoff_rules` reads the committed snapshot at invocation time and returns only the caller's outgoing sender-perspective rules.
3. Send one lightweight system notification to each retained Agent whose outgoing rule set changed; the notification tells it to call `get_handoff_rules` when handoff is needed and does not duplicate the full rules.
4. Do not notify unaffected Agents.
5. Current `send_message_to` and task routing use the new root index, so removed targets fail and added targets succeed after publication.

## UC-009 — Reject A Candidate Without Partial Application

**Examples:** Missing referenced definition; cycle; case-insensitive sibling collision; invalid canonical address; missing direct Agent coordinator; invalid handoff endpoint; identity-allocation/preparation failure.

**Required behavior:** Reject before durable replacement/live publication, clean staged additions, cancel cancelable retirement preparation, retain the prior tree/index/routing view, and return a stable code plus message.

If durable finalization is indeterminate, or an unexpected live-finalization failure occurs after durable replacement, use the existing root fail-stop policy rather than serving split state.

## UC-010 — Restore And Preserve Durable Records

After successful reconciliation and process/root restart:

- the V2 execution tree reconstructs the latest active configured topology and handoffs;
- retained placements keep their original run IDs and snapshots;
- added placements keep the new run IDs and inherited snapshots committed during reconciliation;
- removed placements are absent from the active tree/routing view;
- Agent memory, task records, and communication records are not deleted by reconciliation;
- task-created executions remain governed by their own records and are not diffed as configured members.

This ticket does not add a retired-placement navigation UI.

## System Behavior Matrix

| Candidate Difference | Existing Placement | New Placement | Required Runtime Effect |
| --- | --- | --- | --- |
| None | Retain exact run/default/launch identity | None | `no_change` |
| Handoffs only | Retain all runs | None | Commit handoffs; notify affected senders |
| New Agent address | Retain siblings | New AgentRun | Inherit containing TeamRun default; prepare/commit/publish |
| New Team address | Retain siblings | New child TeamRun and descendants | Recursively inherit parent defaults; publish subtree atomically |
| Address removed | Gracefully retire old run/subtree | None | Close admission, settle native input lifecycle, detach from active routing |
| Same address, different kind or definition ID | Retire old generation | Create new generation | Replacement with new run identity |
| Definition metadata/default changes only | Retain existing run/default/launch snapshots | None | No topology change; no live reconfiguration |
| Invalid candidate | Retain prior topology | None | Reject and clean up |

## Use-Case-To-Behavior Coverage

| Use Case | Behavior IDs |
| --- | --- |
| UC-001, UC-002 | BEH-001, BEH-007, BEH-008, BEH-009 |
| UC-003, UC-004 | BEH-002, BEH-003, BEH-006, BEH-007 |
| UC-005, UC-006, UC-007 | BEH-004, BEH-006, BEH-007 |
| UC-008 | BEH-005, BEH-007 |
| UC-009 | BEH-007, BEH-008 |
| UC-010 | BEH-002, BEH-004, BEH-006, BEH-007 |

## Later Design Spine Audit

The design must trace these primary or bounded-local spines before architecture review:

1. Explicit GraphQL/service request → root selection → serialized reconcile result/event.
2. Current definition graph resolution/validation → identity-preserving configured-topology diff.
3. Direct Agent addition → containing-Team default inheritance → staged runtime → durable commit → routing publication.
4. Nested Team addition → recursive parent-default inheritance → subtree staging/publication.
5. Direct Agent removal → admission close → native input quiescence → durable removal → termination/disposal.
6. Nested Team removal → recursive TeamRun retirement while task-created topology remains separately governed.
7. Same-address replacement → coordinated retirement plus staged addition with a new run identity.
8. Handoff snapshot replacement → dynamic sender-rule lookup → affected-sender system notification.
9. Pre-durability failure rollback and post-durability fail-stop behavior.
10. Restore from the reconciled V2 tree with durable records preserved.

Every UC-001–UC-010 row must map to at least one of these spines, its governing owner, its return/event path, and relevant off-spine concerns in the design spec.
