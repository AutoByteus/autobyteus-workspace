# Target Contract: A Delegated Run Is An Ordinary Run

- Status: `Proposed` (2026-11-10, SR-005). Behavior-defining supplement of `requirements-doc.md`; it needs the user's approval. Once approved it becomes the change to `autobyteus-server-ts/docs/design/collaboration_model.md` and `GLOSSARY.md`, made in the same change as the code.
- Owner: Solution Designer. Package: `delegated-copies-outlive-delegator-461` (Task `autobyteus-461`).
- Direction (the user, 2026-11-10): a delegated agent run or agent team run is its own, normal run; it is started and stopped like any other; its life depends on its Task; the relationship to the run that delegated stays and is shown in the UI. The contract is put into the right shape first; the code then reflects it.
- Evidence for every "today" statement: `investigation-notes.md` (source log; "Stored shapes read for DEC-010").

## 1. The contract in one paragraph

Delegation creates a **relationship** and a **Task ownership**, never containment. A delegated run is an ordinary Agent run or Team run of the node that runs it. It carries one back-link that says who delegated it. The run that delegated keeps one link per run it delegated to. Each run owns its own life. A Task owns the work: closing the Task ends the work of the runs working on it. This is what already holds for a run delegated to another node; it becomes the one rule for every delegated run.

## 2. Words

| Word | Today | Target |
| --- | --- | --- |
| **Delegated run** | An independent run started by `delegate_task` (CM-2). Locally it is nevertheless held by another run | Unchanged meaning, now true everywhere: an ordinary run with a back-link |
| **Coordinating run** | The topmost run of a delegation chain; it "records the link, hosts, idles, wakes and stops" every delegated run in the chain (CM-7) | **Removed.** Nothing hosts or coordinates another run |
| **Delegating run** | — | The run whose agent called `delegate_task`. It keeps the link. One hop: a run delegated by an agent of a delegated run links to that delegated run, not to the top of the chain |
| **Delegator** | The agent that delegated | Unchanged |
| **Link** | What two nodes keep of a remote delegated run | What the two runs keep of any delegated run: the delegating run's record of it, and the delegated run's back-link |

## 3. Rules (changes to the Collaboration Model)

| Rule | Today | Target |
| --- | --- | --- |
| CM-5 | A delegated run is reached by its run ID, both ways; its members may message the coordinating run's standing instances by address | Unchanged, with "the **delegating** run's standing instances" |
| CM-6 | Every delegated run belongs to open Tasks; closing a Task stops its runs that have no other open Task | Unchanged. The Task records each run by the run's own identity |
| CM-7 | The coordinating run coordinates its delegated runs' lifecycle; local runs are hosted in its process | **Every run owns its own lifecycle:** start, the user's Stop, wake on a message, archive, delete. A delegated run is also shut down when it is quiet for the idle grace period and woken by its next message, as today. Stopping, archiving or deleting a run acts on that run only. A message wakes its receiver, whoever sends it |
| CM-8 | The coordinating run keeps links, not content | Unchanged, with "delegating run"; now also true of the running process |
| CM-10 | A run on a peer is owned by its node; the delegating node keeps the link | The same statement for every delegated run; the link names the node (this node or a peer) |
| CM-11 | Across nodes, messages go by run ID through the link; the delegating node shows the remote run as a child of its delegator's run | The same on one node: messages by run ID through the link; every delegated run is shown as a child of its delegating run |
| Message scope | Two delegated runs of different Tasks cannot message each other by run ID; messages to and from delegators work; a closed Task's runs take no input except the assigner's reactivation | Unchanged |

## 4. Stored shapes (the data contract)

| What | Today | Target |
| --- | --- | --- |
| A delegated Agent run's own file (`memory/agents/<id>/run_metadata.json`) | Local: a special shape with a `taskAgent` section: `coordinatingRun` (the top of the chain), `delegatorAgentRunId`, `address`, plus launch-edit fields. Started by a peer: an ordinary run file with `delegatedFrom { nodeId, coordinatingRun, delegatorAgentRunId }` | One shape: an ordinary run file with `delegatedFrom { nodeId, delegatingRun { kind, runId }, delegatorAgentRunId, address }`. Its settings are the run's own settings, as for any run |
| A delegated Team run's own file (`memory/agent_teams/<id>/team_run_execution_tree.json`) | Local: `taskAgent` section. Started by a peer: `delegatedFrom` | One shape: `delegatedFrom` as above |
| The delegating run's record | One stored list of links (`taskExecutions`; an entry with `nodeId` is remote), loaded into two lists; local entries are composed with the delegated run's whole record so the delegating run can host it; older data nests local entries under Team nodes | One list of links, each `{ kind, run ID, nodeId, delegatorAgentRunId, address, startedAt }` and, for a Team, its coordinator's and members' addresses and run IDs. No content of the delegated run |
| A Task's record of a run (`agent_run_resources.json`) | `hostRoot` (the run that hosts it) + the run's reference + role, assigner, start state, `closedAt` | The run's own identity (and node) + role, assigner, start state, `closedAt`. No `hostRoot` |
| Message logs, memory, run folders | Per run already (CM-8, CM-9) | Unchanged |

Stored names that change meaning are renamed by a migration (`DESIGN.md` rule 10): `taskAgent` → `delegatedFrom`, `coordinatingRun` → `delegatingRun`, `hostRoot` removed. Existing delegated runs (the Project Task Manager's run alone has 144 links) keep their conversations, logs and Tasks; the design decides the migration with the project's Data Migration Guideline.

## 5. What the user sees

1. **Stop** on any run (Agent, Team, Org; started by the user or delegated) stops that run and nothing else.
2. **A message wakes** a stopped or idle run: the user's, its delegator's, or a delegated run's report.
3. **Closing a Task** stops every run working on it, as today.
4. **The tree** shows each delegated run under the run that delegated it, with its own status and its own Stop; it is not listed a second time among the top-level runs.
5. A delegated run is **opened, watched, messaged, configured while stopped, archived and deleted like any run**. Features that exist today in a separate form for copies (Stop of one copy, the model of a stopped copy, a copy's files and conversation) become the ordinary run features.
6. **A quiet delegated run** is still shut down after the idle grace period and woken by its next message.
7. **Server shutdown or restart:** everything ends; each run keeps its conversation and continues on its next message; an update restart resumes busy runs.
8. **A run on another node:** the same rules (they already hold there).

## 6. Decisions

| ID | Question | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| TC-1 | Does Stop of a delegated run still stop the runs it delegated to (today's rule for one copy)? | With independent runs, a cascade would be a special rule against the contract. The Task already owns "end this work": closing it stops every run working on it, sub-work included. **Recommendation: no cascade. Stop stops exactly the run you clicked; to end a whole piece of work, close its Task.** This replaces requirements DEC-003 ("as today"). | The user | Needs user |
| TC-2 | Archive or delete of a run that delegated, while its delegated runs are working? | Refused with the reason, as decided before (requirements DEC-004): a history action must not end running work, and a report must have a receiver. When none is working it proceeds; the delegated runs of Project Tasks stay as runs of their own, and the Tasks with no Project that the deleted run created are deleted with it, which closes their runs, as today. | Solution Designer | Decided |
| TC-3 | Where is a delegated run listed? | Under its delegating run only (the user, 2026-11-10: "the relationship is displayed on the UI"). If its delegating run was deleted, it is listed as a run of its own. | Solution Designer | Decided |
| TC-4 | How is the change delivered? | It replaces the hosting of delegated runs for three kinds of delegating run, the clients' reading of delegated runs, and migrates stored data: too large for one safe step (`DESIGN.md`: large tickets need coherent functional slices). **Recommendation:** the contract above is approved once, for everything. **This ticket** builds it for delegations made from a standalone Agent run (the Project Task Manager's case), including the migration of those runs' data. **Next Tasks, in order:** delegations made from a Team run; from an Org run; then the removal of what is left of the hosting code and of the local/remote split. After each step the app works and no run kind is half-converted. Until a step lands, that kind keeps today's behavior. The order and the cut lines are confirmed by the design. | The user | Needs user |

## 7. What is not known yet

The code design is not done. Read so far: how a peer-started run works (an ordinary standalone run or top-level Team run with `delegatedFrom`, its own idle shutdown, woken by an inbound message), the hosting code's size and owners, and the stored shapes. Not yet designed: the migration, the Task side without `hostRoot`, the clients' tree through links, and the exact first step. Nothing here has been run.
