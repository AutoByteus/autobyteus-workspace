# API/E2E Coverage Investigation — delegated-copy-project-workspace (autobyteus-97)

## Investigation Meta

- Requirements Doc: `…/requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `…/investigation-notes.md` (E-001…E-012)
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec: `…/design-spec.md` (SR-002; Medium / High)
- Supplemental Task Artifacts: `follow-ups.md` (FU-001)
- Design Review Report: `…/design-review-report.md` (ARCH-REV-001 Pass)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report / Revision Record: `…/code-review-report.md`, `…/code-review-revision-record.md` (CRR-001 Pass)
- API/E2E Revision Record: `…/api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: CRR-001 pass; code `8959bc507a`
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this round

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace`.)

## Current Requirement And Design Basis

A new local copy whose Task's Project has a linked folder runs in the first link (Agent and Team copies, saved Tasks and sub-work, from Agent, Team and Org roots, catalog copies and configured placements). No link or no Project inherits the top-level run's folder. A first link that is not an existing folder refuses with `TASK_PROJECT_FOLDER_UNAVAILABLE` before anything starts. Existing copies keep their folder, including across a restart. No web, tool-schema, snapshot-shape or restore change.

Open at this boundary:
- the design's escalation trigger ("a runtime that ignores the recorded folder"), unread on a real external runtime;
- AC-007 with a real process restart;
- real delegation on Team and Org roots;
- AC-009 in the packaged app and for a Team member.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001…SCN-006.
- Real-use scenarios added:
  - RU-01: a copy running in F whose root runs in G survives a process restart and wakes in F. AGY's restore compares the capsule's folder with the run's selected folder and refuses a mismatch (`AGY_WORKSPACE_CHANGED`), so this is new ground for a restore path that had only seen one folder per root.
  - RU-02: a real Codex and a real Claude worker, given a saved Task by a scripted manager in G. The worker itself writes `pwd` into a file.
- Contrived scenarios: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 folder of a new copy | Changed | REQ-001…004 | Server E2E on all roots; real runtime `pwd` |
| BEH-002 refusal | Added | REQ-005 | Server E2E on the real tool path, stored Task files read |
| BEH-003 Files, Terminal, nesting | Preserved, newly visible | REQ-008 | Browser and packaged app, Agent and Team member |
| BEH-004 existing copies, restart | Preserved | REQ-007 | Server E2E with a real process restart |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | rule, placement step | IMP-01, IMP-03 | Org and Agent roots use in-memory ports at unit level | Gated server E2E |
| API / transport / contract | Yes (one error code) | tool result | IMP-03, IMP-05 | — | Gated server E2E |
| Frontend component / state | No code; new data shape in practice | a copy's folder differs from the root's | IMP-05 | Team member focus | Browser |
| Browser integration / user journey | Yes | Files, Terminal, tree | IMP-05 (Agent root) | Team member | Browser |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | same renderer | IMP-05 | — | Browser |
| Desktop shell / Electron-specific | No code | packaged journey asked by AC-009 | none | Packaged build | Isolated desktop instance |
| Process / lifecycle | Yes | restore of copies in another folder | IMP-04 `delegation-forest-restore` (same folder) | Real restart with two folders | Built-server E2E |
| Persisted-data transition | `Not Affected` | existing fields | IMP-03 | — | Same restart case |
| Worker / queue / distributed | No (remote returns before the step) | — | IMP-01 | — | — |
| External integration | Yes | real runtimes' working directory | Native real `pwd` (IMP-05); AGY launch inputs | Codex, Claude | Live gated cases (test-owned Codex home; signed-in CLIs) |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace`, branch `codex/delegated-copy-project-workspace`.
- Testing guideline: `TESTING.md`. It settles:
  - gates and `env -i`;
  - real-provider runs only when the change needs real-provider proof (it does: the design's escalation trigger);
  - the live Codex model `gpt-6.1-terra` at `medium`;
  - a throwaway `CODEX_HOME` with a symlink to `auth.json`;
  - a signed-in CLI needs the real `HOME`, `USER` and `LOGNAME`.
- Secrets: no key values read. Codex and Claude use their signed-in CLIs. One small turn each.
- The user's Claude history gains the live run's conversation (no isolated recipe uses a signed-in `claude` without the real `HOME`); to be stated in the report.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | strategy | above |
| `tests/e2e/helpers/collaboration-root-harness.ts` | real roots | `startRoot`, `calls`, `liveTree` |
| `tests/e2e/projects/unclean-shutdown-delegated-team-restore.e2e.test.ts` | real process restart | spawn `dist/app.js` on a test root |
| `evidence/implementation/new-copy-folder-proof.mjs` | IMP-05 browser driver | Files and Terminal helpers |
| `tickets/done/projects-tree-one-place/evidence/api-e2e/API-04-desktop-journey.mjs` | packaged driver | CDP on an isolated instance, scripted AGY through the data root's `.env` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | `autobyteus-server-ts` | `pnpm prebuild && pnpm build` | — | smoke line | — |
| Durable E2E | `autobyteus-server-ts` | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> vitest run …` | in-process and built servers | suite | suite cleanup |
| Isolated instance | repo root | `isolated-app start --build --data-root <own>` | packaged build | start JSON | `isolated-app stop` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Definitions, Projects with links, Tasks, folders | Public GraphQL | test-owned roots | removed |

## Persisted Data Transition Coverage Basis

`Not Affected`: new copies write existing fields with another value. The restart case reads the stored tree of old-rule and new-rule copies side by side.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| IMP-01 unit and IMP-03 integration additions | Rule, placement, Team root real tool | AC-001…008 | Still Valid | handoff | Reuse |
| Gated `tests/e2e/projects`, `agent-team-runs`, `agent-org-runs`, `agent`, `run-history`, `remote-collaboration` | Delegation, restore, closure with Projects with no links | Preserved | Still Valid | — | Run; `EXC-E2E-004` is FU-001 if it recurs |
| `new-copy-folder-proof.mjs` (IMP-05) | Agent root browser proof | AC-009 | Still Valid (not durable) | — | Reuse; a Team member case is added in a browser case here |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001…008 units; typecheck; line counts | repository | Reused | IMP-01, IMP-02, IMP-03, IMP-06 | `git diff --name-only 8959bc507a HEAD` outside `tickets/` is empty |
| API-R02 | AC-001…006, AC-009 Agent root | proof on a dev stack | Reused | IMP-05 | Same commit |
| API-01 | AC-001…007; RU-01; REQ-003 on Agent, Team and Org roots | real HTTP/WS/GraphQL, scoped MCP, Projects files, AGY launch inputs, built server restart | Durable | `tests/e2e/projects/delegated-copy-project-folder.e2e.test.ts` (gated `RUN_AGY_FAILURE_E2E`) | No durable E2E proves these on all roots; IMP-05 is not durable |
| API-02 | AC-001 "actual working directory"; escalation trigger; RU-02 | real Codex and Claude workers | Durable (gated `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`) | same file, live cases | Only the worker spends provider credits; the manager is scripted |
| API-03 | Preserved delegation, restore, closure, remote | gated folders | Existing Test | `vitest run tests/e2e/projects tests/e2e/agent-team-runs tests/e2e/agent-org-runs tests/e2e/agent tests/e2e/run-history tests/e2e/remote-collaboration` | Placement path changed on all roots |
| API-04 | AC-009 packaged, Agent copy and Team member | isolated desktop instance | Journey | `isolated-app start --build`, CDP driver in the evidence folder | AC-009 names the packaged journey; a Team member's focus is checked here too |

- Test progress log needed: Yes.

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-01, API-02 | `autobyteus-server-ts/tests/e2e/projects/delegated-copy-project-folder.e2e.test.ts` | Folder rule on every root through the real tool, with a real restart and real runtime working directories |

## Durable Coverage To Update / Remove

None.

## Desktop Application Validation Plan

No shell change. The packaged journey runs because AC-009 asks for it. Own data root, scripted AGY in `server-data/.env`, driven over CDP, stopped afterwards. The user's running app is untouched.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| A folder-scoped model catalog on a configured placement (C-07) | Only Codex reads its catalog per folder. No repository fixture narrows a catalog per folder, and a real narrowing needs a Codex config that hides a model in one folder, which is not a setup real use produces on this node. In-run placements have no launch check by design (REQ-006), unchanged here. An unavailable model reaches the runtime's normal start failure | Low | No | None; stated in the report |
| Grok (ACP) and AGY real CLIs' working directory | One real external runtime was asked for; Codex and Claude cover the two runtime families with a process cwd. ACP receives the same config field. Real AGY's cwd is the capsule by design and its folder arrives as `--add-dir` (asserted) | Low | No | None |

## Ambiguities Or Reroute Triggers

None before execution. If a real runtime ignores the recorded folder, that is the design's escalation trigger: route as a failure, naming it.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable Coverage Will Be Added: `Yes`
- Reroute Required: `No`
