# Universal Task Delegation Behavior Contract

## Status

- Artifact type: Intended-behavior supplement
- Status: `User Approved — Exact Run-ID/Execution-Tree Model; SR-009 Settlement Semantics Reconciled`
- Scope: Agent-facing logical targeting, concrete host selection, task lifecycle, projection, persistence, and failure behavior
- Related requirements: R-001–R-024, R-032–R-045
- Related acceptance criteria: AC-001–AC-024, AC-033–AC-050

## Purpose

Define the exact observable behavior when `delegate_task` broadens from immediate-Team children to any mounted same-root Agent or AgentTeam, and align that behavior with the target execution-tree/run-ID model. Exact persistence keys belong to `team-run-persistence-architecture-contract.md`.

## Governing Model

Five authorities answer five different questions:

| Authority | Question | Canonical Fact |
| --- | --- | --- |
| Rooted configured topology | Which logical Agent or AgentTeam placement was selected? | canonical absolute `address` |
| Execution tree | Which exact AgentRuns/TeamRuns existed and where were they contained? | `agentRunId`, `teamRunId`, tree parentage |
| Task records | Who delegated which work to which fresh execution, and what is its formal state? | `taskId`, delegator AgentRun, recipient address, task execution reference, status/updates |
| Communication records | Which exact AgentRun sent an ordinary message to which exact AgentRun? | message ID and two AgentRun IDs |
| Derived indexes/views | How is current state looked up or shown? | rebuildable run/address/parent/task/message indexes |

A message creates no structural or task edge. A task relationship may cross execution containment. Neither belongs in the execution tree.

## Agent-Facing Address Contract

`recipient_address` is one canonical absolute logical address:

```text
/engineering/backend_team/backend_engineer
```

Accepted:

- an exact non-root mounted Agent address;
- an exact non-root mounted AgentTeam address.

Rejected without normalization:

- relative or bare names (`./backend_engineer`, `backend_engineer`);
- `/`;
- traversal, backslashes, repeated/trailing separators, or whitespace variants;
- a missing node or traversal through an Agent;
- a placement in another root.

For an AgentTeam address, logical messaging enters its applicable existing coordinator AgentRun. Task delegation first creates a fresh AgentTeam execution and returns that execution's coordinator AgentRun ID.

## Shared Concrete Execution-Scope Selection

Logical resolution is operation-neutral. Concrete messaging/tasking then chooses one exact TeamRun containing the applicable configured endpoint. Messaging reads the existing endpoint from that TeamRun; tasking hosts a fresh execution there.

For any selected Agent or AgentTeam placement:

1. Determine the logical parent Team address of the final Agent endpoint:
   - Agent target: parent of the Agent address;
   - AgentTeam message: the addressed Team, because its coordinator is a direct Agent there;
   - AgentTeam task: parent of the addressed Team, because the fresh Team execution becomes its child.
2. Resolve the caller's exact AgentRun and derive its concrete Team ancestry from execution-tree containment, deepest first.
3. Select the first ancestor TeamRun whose canonical address is a segment-aware ancestor-or-self of the required parent Team address. Structural root `/` matches every target parent.
4. Starting at that exact ancestor TeamRun, follow configured Team-member edges only until the exact TeamRun at the required parent address is reached. Do not traverse `taskExecutions` while descending.
5. Fail if the selected subtree or exact parent TeamRun is absent, foreign, inactive, ambiguous, or contradictory. Do not retry from an outer scope after inconsistency.
6. Message the applicable configured AgentRun/coordinator in that scope or create the fresh task execution beneath that exact parent TeamRun.

No task-Team chain, local route key, or parent path is accepted as input or stored as an exact identity.

## Truthful Task Execution Construction

### Agent task

```text
logical task recipient: selected Agent address
host execution:         exact parent TeamRun chosen above
fresh execution:        one AgentRun node under host.taskExecutions
record reference:       {agentRunId: <fresh>}
returned ingress:       the same fresh AgentRun ID
```

### AgentTeam task

```text
logical task recipient: selected AgentTeam address
host execution:         exact parent TeamRun chosen above
fresh execution:        one TeamRun subtree under host.taskExecutions
record reference:       {teamRunId: <fresh TeamRun>}
returned ingress:       configured coordinator AgentRun inside the fresh TeamRun
```

All task definition, role, coordinator, and launch facts derive from the selected configured placement. Task nodes persist only fresh bindings, concrete containment, and timestamps.

## Scenario Matrix

| Scenario ID | Caller | Target | Exact Host | Required Outcome |
| --- | --- | --- | --- | --- |
| UTD-001 | Persistent Agent | same-Team Agent | caller's persistent TeamRun | fresh task AgentRun under that TeamRun |
| UTD-002 | Persistent Agent | deep Agent | configured descendant TeamRun in the nearest enclosing persistent subtree | fresh task AgentRun under exact descendant TeamRun |
| UTD-003 | Persistent Agent | sibling/cross-branch Agent | persistent TeamRun at target Agent's logical parent | fresh cross-branch task AgentRun |
| UTD-004 | Persistent Agent | any non-root AgentTeam | persistent TeamRun at target Team's logical parent | fresh task TeamRun subtree; coordinator ingress returned |
| UTD-005 | Any Agent | its exact logical Agent placement | none | reject self before active allocation |
| UTD-006 | Agent inside task Team `A` | Agent whose parent Team is `A` | exact task TeamRun `A` | fresh task AgentRun under `A` |
| UTD-007 | Agent inside nested task TeamRuns `[A,B]` | Agent whose parent Team is `A` | nearest ancestor TeamRun `A` whose subtree contains the parent | fresh task AgentRun under `A`, not `B` |
| UTD-008 | Agent inside task Team `A` | Agent outside `A` | persistent target-parent TeamRun | fresh task AgentRun there; task edge crosses branches |
| UTD-009 | Agent inside task Team `A` | Agent/Team whose logical parent is a configured descendant of `A` | exact descendant TeamRun reached inside task subtree `A` | fresh task execution stays in task subtree `A` |
| UTD-010 | Agent inside task Team `A` | Team outside `A` | persistent parent of target Team | fresh independent task TeamRun; no false containment under `A` |
| UTD-011 | Agent inside task Team `A` | Team `A` itself or an ancestor Team | exact TeamRun for target Team's logical parent, often persistent root | fresh independent Team execution, never recursive self-containment |
| UTD-012 | Task Agent | any valid target | same nearest-containing-subtree algorithm | child task edge belongs to caller task; containment remains independent |
| UTD-013 | Same delegator repeats one address | same Agent/Team | resolved independently each call | distinct task IDs and distinct fresh AgentRun/TeamRun IDs |
| UTD-014 | Cross-scope child task | parent later accepted | root task ledger | parent settlement waits for open child task even though tree branches differ |
| UTD-015 | Omitted/empty handoffs | any valid target | normal selection | identical success; handoffs are not authorization |
| UTD-016 | Team target with invalid coordinator mapping | Team | none | reject before active record/execution/work release |
| UTD-017 | Precommit preparation/registration/event-seal failure or `not_renamed` write | any | prepared, unreleased host | abort prepared work; return `not_started`; no exposed active task/event |
| UTD-018 | Supported predecessor root | previous persistent/task/message data | migration boundary | migrate independently to an exact three-file package; failed roots remain excluded/retryable and normal runtime has no dual reader |
| UTD-019 | Relative/root-only/malformed address | any | none | deterministic failure and zero mutation |
| UTD-020 | Provider runtime | any | server-owned owners | identical AutoByteus/Codex/Claude semantics and result envelope |
| UTD-021 | Terminal task becomes locally idle | exact task Agent or task Team | current execution owner TeamRun | prepare reversible quiescence; commit only tree `settledAt`; destroy/unregister locally only after durable tree commit |

## Concrete Examples

### Nested task caller selects an ancestor Team execution

```text
execution ancestry (deepest first):
  TeamRun field-task-B    at /research/field
  TeamRun research-task-A at /research
  TeamRun root            at structural /

target: /research/researcher
target parent Team: /research
selected host: research-task-A
fresh task AgentRun: researcher-task-run-C
```

There is no persisted `[A,B]` chain on the new Agent. Its placement under TeamRun `research-task-A` is the ancestry.

### Task-Team caller selects a configured descendant in the same task subtree

```text
execution ancestry (deepest first):
  TeamRun qa-task-A at /qa
  TeamRun root      at structural /

target:                    /qa/automation/tester
required parent Team:      /qa/automation
nearest containing scope:  qa-task-A at /qa
configured descent:        qa-task-A.members -> /qa/automation TeamRun
selected host:             that task subtree's /qa/automation TeamRun
```

The persistent `/qa/automation` TeamRun and other `/qa` task executions are not candidates because scope selection starts from the caller's exact containment and descent follows configured members only.

### Task-Team caller delegates outside its subtree

```text
caller AgentRun:  research-task-agent-A
caller contained by task TeamRun at /research
target:           /operations/operator
target parent:    /operations
nearest containing scope: structural root /
configured descent: root.members -> persistent /operations
selected host:    persistent operations TeamRun
fresh AgentRun:   operations-task-agent-B
```

The task record connects `research-task-agent-A` to `{agentRunId: operations-task-agent-B}`. The execution tree does not pretend Operations is inside Research.

### Task-Team caller delegates to an external Team

```text
caller contained by: research-task-TeamRun-A at /research
target Team:         /qa
target parent Team:  structural root
selected host:       persistent root TeamRun
fresh TeamRun:       qa-task-TeamRun-C
returned AgentRun:   configured /qa coordinator inside C
```

### Exact activation commit boundary

```text
fallible preparation + sealed execution/event/registration reservations
  -> enqueue immutable activation proposal in the one root task-command queue
  -> at queue head, revalidate current root/tree/tasks and derive next snapshots
  -> durably replace execution tree
  -> durably replace task records
  -> both writer results are committed: COMMIT POINT
  -> synchronous no-throw memory/registration/event enqueue
  -> synchronous no-throw work-gate release
  -> active result
```

Every recoverable activation or publication-setup failure is forced before the first write. A writer `not_renamed` result is a known clean abort; a `renamed_finalization_indeterminate` result fail-stops the root with no normal task result and leaves strict reload to determine which final path survived. The prepared Agent or Team subtree is unable to run provider work before its gate opens. Event subscriber callbacks are not part of the commit: the publisher drains them after enqueue and isolates each subscriber exception. A provider failure after release is an active task runtime failure, not an activation rejection. A process loss after the commit point returns no public result; reload preserves the durable truth by interrupting and settling the task rather than inventing `not_started`.

## Root Task Lifecycle Invariants

- Exactly one root task service owns the live ledger and one private FIFO command queue for activation, submit, review, interruption, and settlement.
- Every command authorizes/revalidates and derives from the latest committed task/tree state at queue head; different-task changes accumulate, while only the first valid same-task source-state transition succeeds.
- Every Agent and Team preparation is sealed and commit-ready before the first file write; every post-durable commit step is synchronous no-throw.
- Task IDs and records are root-scoped.
- `delegatorAgentRunId` is the exact review owner and may itself be task-scoped.
- A nonterminal child record whose delegator belongs to another task execution blocks that parent task's settlement.
- Submit is authorized only for the exact task AgentRun or fresh task Team coordinator AgentRun.
- Review is authorized only for the exact `delegatorAgentRunId`.
- Acceptance persists before asynchronous safe settlement. `accepted` may briefly coexist with `settledAt: null` while open-work gates finish.
- Interruption first appends exactly one terminal task transition; the later settlement command changes only execution-tree `settledAt` after reversible local quiescence.
- Settlement preparation waits every earlier AgentRun message reservation/dispatch and is non-destructive. `not_renamed` restores the same execution; `committed` makes it non-routable before post-lock provider/handle cleanup.
- Root teardown disposes only that root's live owners after recursive local execution termination.

## Frontend And History Invariants

- Immutable configured topology remains the logical placement/configuration source.
- The concrete execution view uses exact AgentRun/TeamRun IDs and tree parentage.
- Repeated task executions at one logical address are independent nodes.
- Tasks and ordinary messages are joined by exact run IDs through selectors; they are not copied into execution nodes or independently materialized into another tree.
- Initial snapshot and live delta use the same backend projector and one frontend reducer.
- Settled task nodes remain durable history but are omitted from the live execution tree.
- Focus/open/history/status/timeline consumers never parse serialized composite keys.

## Preserved Rejections

| Condition | Required Result |
| --- | --- |
| Invalid/noncanonical/relative/root-only address | collaboration address failure before lookup/mutation |
| Missing target or Agent traversal | existing target-not-found/traversal code |
| Exact logical Agent self-target | `TASK_DELEGATION_SELF_TARGET_NOT_ALLOWED` |
| Foreign/forged/inactive/settled caller AgentRun | exact authorization/context failure |
| Missing/inconsistent Team coordinator | exact Team ingress/configuration failure |
| Missing/duplicate/contradictory run identity in current tree | exact execution invariant failure |
| Submit/review by wrong AgentRun | operation-owned authorization failure |
| Activation preparation failure or `not_renamed` write | `not_started`, no ingress ID, no released execution |
| Settlement execution-tree `not_renamed` | terminal task remains durable; cancel quiescence; same exact execution remains live/routable; no settlement event |
| Task/message `renamed_finalization_indeterminate` | no normal domain result; affected root fail-stops and requires strict reload |
| Settlement cleanup rejection after committed tree | keep durable `settledAt`; lifecycle-fail-stop and close the affected root; never report persistence rollback |
| Ambiguous predecessor evidence | root-local migration failure; source bytes preserved; root excluded/retryable while target runtime continues |

`TASK_DELEGATION_TARGET_NOT_ELIGIBLE` is removed because adjacency is no longer eligibility.

## Provider-Neutral Instruction Delta

> Copy the recipient's exact canonical absolute address. `send_message_to` contacts that mounted Agent or AgentTeam; `delegate_task` may create a fresh task execution for any mounted Agent or AgentTeam in the same rooted AgentTeam.

The complete exact wording is authoritative in `agent-team-collaboration-system-instruction.md`.

## Persistence Outcome

The broader exact-run identity refactor supersedes the SR-001 no-migration posture. Supported framework-owned predecessor data requires the isolated migration defined in the persistence contract and design spec. Migration may retry and may omit a failed predecessor root from the current catalog, but current runtime accepts only the new three-file/run-ID model and never reads or adapts that predecessor root. Application data is discarded/rebuilt rather than adapted.

## Approval State

The logical universal-target, interaction, and exact execution-tree/run-ID persistence behavior is user-approved and self-validated for architecture review.
