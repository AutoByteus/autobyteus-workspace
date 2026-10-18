# API/E2E Coverage Investigation — `link-existing-run-to-task`

## Investigation Meta
- Requirements Doc: `requirements-doc.md` (SR-008 cumulative, approved basis SR-003); Investigation Notes, Solution Revision Record; Design Spec (SR-008); supplement `implementation-design-impact.md` (DI-001, resolved).
- Design Review Report and Architecture Review Revision Record: ARCH-REV-004 Pass.
- Implementation Handoff and Revision Record: IR-001, IR-002.
- Code Review Report and Revision Record: CRR-001, CRR-002 Pass (9.3/10).
- Round 1. Trigger: CRR-002 Pass. Commits `ef807beb6d`, `4b0986363c`; base `origin/personal` `2f211340ee`.

## Routing Classification
Large / High, Reviewed. Successful route: Code Review (proportional test-code review); test-code review `Required`.

## Requirement Basis
`delegate_task {target_agent_run_id | target_team_run_id, task_id}` from a standalone agent run (the PM) adopts an idle hand-started run in its workspace:
- the run becomes the PM's delegated run for that Task (REQ-001, REQ-002);
- it is shown, coordinated and closed like any delegated run (REQ-003);
- nothing is copied or deleted (REQ-004);
- refusals change nothing (REQ-005, REQ-007).

ACs: AC-001 (team run), AC-002 (agent run), AC-003 (DONE → stopped and gone; reopen + PM message → reactivated), AC-004 (refusals), AC-006 (existing suites), AC-007 (the user's beta check).

## Supported Scenarios And Real Usage
- SCN-001..003, entered through the real trigger: the PM's own `delegate_task` call.
- Added from the implementation and the code-review hints:
  - the adopted team's members messaging each other and the PM at their new addresses (R-3);
  - what the user sees in the sidebar when the run leaves its group (R-1: no history push, so the row leaves on the next history read).
- Interrupted adoption (DEC-109) at real-app level: the trigger is a crash between internal steps, which no user action produces on demand. Covered by unit tests at every stop point. At e2e level, a server restart after a successful adoption is checked instead (the adopted run stays adopted).

## Changed Surface And Boundary Classification
| Surface | Affected | Repository evidence (implementer) | Gap | Mode |
| --- | --- | --- | --- | --- |
| Collaboration / tool contract | Yes | unit (refusals, steps, stops, undo), root-level with a real Agent root | the real tool through scoped MCP, real roots, the real Project/Task services | scripted-AGY e2e |
| Persistence: own file, link, Task resources, history index | Yes | unit, root-level | through the server and GraphQL | e2e |
| Web | no code change | — | rendering of an adopted run (sidebar, board), R-1 | desktop app |

## Project Execution Discovery
- TESTING.md: clean env for e2e; scripted AGY CLI (`RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND`); serialized vitest runs per worktree (shared test DB); rule 9; "Rerun by impact" (first round: the whole relevant set).
- Harness: `tests/e2e/helpers/collaboration-root-harness.ts` (roots, scripted tool calls, terminate and reopen).
- Desktop: isolated instance, `pnpm secrets:import`, the user's runtimes (Claude Agent SDK Haiku 5.5, AutoByteus deepseek-v4-flash).

## Existing Durable Coverage
| Path | Decision |
| --- | --- |
| new unit tests (adoption owner, root, shape, Task side) | Still Valid; run |
| e2e `task-existing-copy-assignment`, `task-reactivation-root-visibility`, `collaboration-prompt-wording` (the existing-run mode) | Still Valid; run with the gate on |
| whole server e2e | run once (first round) |

## Durable Coverage To Add
`tests/e2e/projects/hand-started-run-adoption.e2e.test.ts`:
- **ADO-1 (AC-002, AC-003):** an agent run.
  - Adopted through the PM's real `delegate_task`: delegated; the PM's tree links it; the Task entry is the PM's; it leaves the history; its conversation continues with the Task; every earlier file kept.
  - DONE closes it; reopen and the PM's message reactivate it.
- **ADO-2 (AC-001, R-3):** a team run.
  - Adopted; members message each other and the PM.
  - DONE closes it.
- **ADO-3 (AC-004):** refusals through the real tool (another workspace, busy, has its own delegated runs, archived). Each says why and changes nothing.
- **ADO-4 (added after the desktop check, F-001):** an adopted team whose own turns recorded token usage. Its members' usage under the PM's root must not fail-stop the root. Includes a control with a new task team.

## Broader Validation Decision
`Required`, Project Desktop Validation (AC-001..003 real-app check; R-1). Plan:
1. On an isolated branch build, a PM agent run and a hand-started team run and agent run in the same workspace, with a Project Task.
2. The user tells the PM to give the Task to each run id (real model).
3. Check:
   - the sidebar: when the row leaves its group, and that it appears under the PM with its Task line;
   - the board: the worker and its status;
   - DONE: stopped and gone;
   - reopen and the PM's message: reactivated.

## Not Tested / Deferred
- AC-007: beta and the user's check (delivery).
- A crash between adoption steps at real-app level: unit-covered at every step.
