# Requirements Document

## Document Status

- Status: `Ready for Approval` (one `Needs user` decision: D-8, FU-020)
- Current solution revision ID: `SR-001`
- Package identifier: `follow-ups-of-461-500`
- Request / ticket: Project Task `autobyteus-500` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`: "All follow-ups of autobyteus-461 in one Task"
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), at the founder's word (2026-11-17)
- Requirements owner: Solution Designer (run `solution_designer_65a93db823284ad5b4e87726a5b250a2`)
- Date: 2026-11-17
- Approved by and reference: not yet
- Exact approved requirements baseline / solution revision: not yet
- Behavior-defining supplements: `source-follow-ups-461.md` (the Task's context file: the follow-up rows FU-*, as leads, not decisions)

## Problem And Desired Outcome

- **Problem:** the delivered autobyteus-461 (`v1.5.13-beta.7`) left 22 recorded follow-ups, in six groups:
  1. hosting-era names in the web (FU-019, FU-020);
  2. migration safety (FU-027, FU-032, FU-028, FU-029, FU-033);
  3. server naming and dependency cleanup (FU-006, FU-010, FU-007, FU-011, FU-018, FU-013, FU-002);
  4. refusal wording (FU-030);
  5. tests and tooling (FU-016, FU-021, FU-022, FU-023);
  6. new at delivery (FU-035 Grok's refused tool calls; FU-036 silent drop of an early command).
- **Desired outcome (the Task's goal):**
  - no behavior change, except where a name hid a bug or the founder decided otherwise;
  - green and reliable gates;
  - no silent loss;
  - clear refusals.
- **Done when:** each group is delivered or explicitly dropped with the founder's word, finalized on the base branch. A release happens only on his word.

## Constraints From The Task (the founder's rules)

- Any change to the founder's real data needs his approval and a backup first. No data migration by default.
- FU-027's scope is open with the founder: ask him directly before designing it.
- The Grok waiver rule stays: only the founder's own standing words apply to a Grok smoke case that fails solely on a usage limit.
- Follow `DESIGN.md` and `TESTING.md`.

## Open Decisions

| ID | Decision | Owner | Status |
| --- | --- | --- | --- |
| D-1 | FU-027's scope (the migration runner's order and late-run rules) | **The user**, 2026-11-17 | **Decided: option 1, guards only.** The user: "I feel like a simple guard would be enough … a guard which protects the current order so somebody can only put it in as the latest … being enough for migration." So: the released order is protected (learned from the latest release tag, not a hand-kept list), and a new migration can only be appended as the latest (its ID's date later than the last entry's), by test. The runner is unchanged. Late-running migrations stay handled per migration, by the guideline's rule (461's follow-up pattern). FU-028 and FU-029 are fixed individually. The minimum supported upgrade version (option 3) is not taken. |
| D-2 | Staging of the six groups into deliveries | Solution Designer (user informed) | proposed 2026-11-17 |

| D-2 | Staging: **delivery 1** = groups 1, 3, 4, 5, 6; **delivery 2** = group 2 | Solution Designer (user informed 2026-11-17) | Decided. Delivery 1 is mostly renames and local fixes, with no data. Delivery 2 depends on D-1 and touches the migration code |
| D-3 | FU-036: a command sent before a stream is ready | Solution Designer | **Refuse clearly:** the Org and agent-collaboration streams answer `SESSION_NOT_READY`, as the agent and Team streams already do (`api/websocket/agent.ts`, `attachRunStream`). No command is dropped. This is the existing pattern; queueing would add state |
| D-4 | FU-030's scope and style | Solution Designer | **Scope:** the five collected wordings, plus every refusal on the surfaces they come from: `delegate_task` / `send_message_to` results, archive and delete of a run, a delegated run's Settings save, and delegation launch notes. **Style:** say what happened and why, then what to do next, with the run named by its name (SR-091). Outcomes don't change |
| D-5 | FU-007: stored and code names differ behind a mapping | Solution Designer | **Rename the code to the stored names** (`agentRunResources`, `agentRun`, `coordinatorAgentRunId`), so the mapping goes with **no data migration** (the founder's rule). The glossary names the concept once ("delegated run"); code types say `DelegatedRun…` instead of `TaskExecution…` (with FU-010) |
| D-6 | FU-013: one ID for team and org token totals | Solution Designer | **The query states the run kind**, and the resolver stops guessing. The stored usage field (`root_team_run_id`) is left as it is: renaming it needs a data migration, which isn't worth it for a name. It's recorded as a known leftover in the glossary |
| D-7 | FU-002: two files over 500 lines | Solution Designer | **Already resolved by 461:** `standalone-agent-run-root.ts` is 323 lines and its manager 429. Nothing to do |
| D-8 | FU-020: attachments to a delegated child are named through its delegator | `Needs user` | The files already live in the child's own folder; only their **link** names the delegator (`/rest/agent-collaborations/<delegator>/agent-runs/<child>/…`). On the founder's data, 425 such links are stored in 143 message files (84 runs, read-only count). Options: (a) new attachments use the child's own link; old links keep working, resolved by the child's run ID, with no data change. (b) Also rewrite the 425 stored links (a data migration, with a backup and his approval). (c) Leave it: no bug hides behind the name. **Recommendation: (a)** |
| D-9 | FU-035: Grok's refused tool call reaches the agent only as "Tool execution failed." | Solution Designer | `Unclear` until reproduced. The text may be lost in our projection (`grok-build-tool-projection.ts:37`, which only affects what we display) or inside the Grok CLI (what the model sees, an external dependency). It is investigated with a live Grok run, under the Grok waiver rule: a usage limit alone is not a failure, only the founder's words decide |

## Requirements (delivery 1)

| ID | Requirement | Follow-ups |
| --- | --- | --- |
| REQ-001 | The web names a delegated run by what it is, a run of its own bound to its Task: no "transient execution" types, kinds or component names. No behavior change | FU-019 |
| REQ-002 | The server's run runtimes and their helpers are named for one run, not a hosted tree (no "root" meaning a host). The children of a run, local or on a peer, have one name per concept, and so does a delegated run, in code and in public result codes where a code names the old concept. No behavior change. `collaboration_model.md`, `GLOSSARY.md` and the module docs follow | FU-006, FU-010 |
| REQ-003 | The Task record's names are the same in code and on disk, with no mapping and no data migration (D-5) | FU-007 |
| REQ-004 | No owner is reached through a process-wide `bind*` / `find*` / `get*` lookup that silently does nothing when unbound. Required owners are passed in, and a missing one fails at composition | FU-011 |
| REQ-005 | No class decides behavior by whether an optional collaborator was passed in (`AgentRunService`, `TaskExecutionResourceRelease`). Each host states its stop and activation path explicitly | FU-018 |
| REQ-006 | Token totals are asked for with an explicit run kind (team or org), and no resolver guesses the kind of an ID (D-6) | FU-013 |
| REQ-007 | Refusals on the surfaces of D-4 are clear and consistent: what happened, why, and what to do. Outcomes are unchanged | FU-030 |
| REQ-008 | The gates are reliable: `mobile-shell-probe.mjs` has unique case IDs; `file-system-watcher.integration.test.ts` passes under load; `agent-runtime-names.test.mjs` covers every runtime (`deepseek_harness`); the web type gate counts each error once | FU-016, FU-021, FU-022, FU-023 |
| REQ-009 | A command sent to any stream before it is ready gets `SESSION_NOT_READY`. None is dropped silently (D-3) | FU-036 |
| REQ-010 | A refused tool call on `grok_build` reaches the agent with the server's reason and guidance, as on the other runtimes (D-9: the cause is investigated first) | FU-035 |
| REQ-011 | Attachments to a delegated child, per D-8 | FU-020 |

## Acceptance Criteria (delivery 1)

| ID | Requirement | Observable outcome |
| --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-003 | No current name in web or server source implies hosting ("transient execution", a "root" that hosts others, "copy", `TaskExecution` for a delegated run); the Task schema module has no name mapping. All tests pass, changed in names only |
| AC-002 | REQ-004, REQ-005 | A composition with a required owner missing fails at start, with the owner named; no class has an optional collaborator whose absence changes behavior |
| AC-003 | REQ-006 | A team's and an org's token totals are read through queries that state the kind; there is no kind guessing |
| AC-004 | REQ-007 | Each refusal of D-4's surfaces is listed with its new text; each says what happened, why and what to do; their outcomes are unchanged (the existing tests' outcome assertions pass) |
| AC-005 | REQ-008 | The four gates pass repeatedly: the probe guard, the watcher test under a loaded full suite, the runtime-names test, the web type gate at its baseline |
| AC-006 | REQ-009 | An integration test sends on open to `/ws/agent-org/:id` and to the agent-collaboration stream, and receives `SESSION_NOT_READY` |
| AC-007 | REQ-010 | A live Grok run shows the server's reason for a refused call, with a test (or, if the cause is in the Grok CLI, the founder decides, per D-9) |
| AC-008 | REQ-011 | Per D-8: under (a), a new attachment's link names the child's own run, and an old stored link still opens its file |

## Scope Guardrail

- **In scope (delivery 1):** groups 1, 3, 4, 5, 6 as above.
- **Delivery 2:** group 2 under D-1: the order guards (FU-027 option 1), FU-028, FU-029, FU-033, and FU-032 limited to an audit that finds the released pairs that touch the same data and fixes the harmful ones by a same-ID repair. **No reordering of released entries:** the user's "protect the current order". Its requirements are written when delivery 2 starts.
- **Out of scope:** the withdrawn and done follow-ups listed in the Task; any data migration without the founder's approval and a backup; a release without his word.
- **Preserved:** every behavior, except where a requirement above says otherwise.
