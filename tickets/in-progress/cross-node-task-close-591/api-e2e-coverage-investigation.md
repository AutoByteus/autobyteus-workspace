# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/cross-node-task-close-591/requirements-doc.md`
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001 … SR-009)
- Design Spec (required on every route): `design-spec.md`
- Supplemental Task Artifacts: `handoff-architecture-review-sr006.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-003, ARCH-REV-004 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `N/A` (first round)
- Current Investigation Round: 1
- Trigger: CRR-001 Pass, head `dd5b230e7e` (code `9abe7086fd`)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- **REQ-001 / AC-001 … AC-003:** closing a Task (DONE / CANCELLED) on A stops each run of it on peer B that has no other open Task, through B's ordinary Stop (an agent, or a whole Team with a working member), within 30 s while B is reachable. A run with another open Task is not stopped and nothing is sent (DN-1).
- **REQ-002 / AC-004:** when B is unreachable, the notice is owed (`peerNoticeOwed: true` on A's entry, `TASK_PEER_NOTICE_OWED` logged once per reason) and delivered within 30 s of A seeing B again, also after A or B restarted (DN-3, DN-4, S-3). A follow-up Task given before B is back makes the owed notice "open" (nothing stops).
- **REQ-003 / AC-005:** B stops only runs the requesting node's delegation started; another paired node is refused `REMOTE_TARGET_NOT_PERMITTED` (S-6).
- **REQ-004:** the stopped run keeps its memory, log and history on both nodes; a later message wakes it; A's child row shows it offline.
- **REQ-005 / AC-006:** on B the run leaves the run list (desktop and phone) within the existing live-update time (the 5 s list re-read, DN-6, handoff deviation 3), stays listed on A under its delegating run and on the Task page, and returns after a re-delegation. A reopen alone changes nothing on B.
- **REQ-006 / AC-007:** `delegate_task` with the run's ID and `task_id` gives a saved or reopened Task to an existing remote run (agent and team): local checks (last assigner, reopen rules); a Task with files is refused (attachments text); B is told "open" first (record cleared, listed again), then the work goes over the link and wakes the run; B unreachable: "not delivered" and "open" stays owed. A plain message to the closed run stays refused on A (`TASK_AGENT_RESOURCE_CLOSED`).
- Persisted data: `Directly Usable — No Migration` (A's optional field; B's new file).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (close, agent and team, DONE and CANCELLED; another open Task), SCN-002 (B unreachable, A or B restarted), SCN-003 (a third paired node), SCN-004 (B's run list, desktop and phone), SCN-005 (reopen and give the Task again).
- Real-use scenarios added from the implementation:
  - a task agent's sub-work run on B (RC-10's shape: a task agent on a Project Task delegates to beta), stopped when its Task closes;
  - B restarted while a busy run's notice is owed: the run resumes (restart-resume), then the retry stops it (design walk);
  - an older B without the route (HTTP 404): the notice stays owed, the reason logged once (handoff Important Assumptions; optional per code review);
  - B's owner messages a stopped closed run from B's window: it wakes (REQ-004 "a later message wakes it").
- `Technically Possible but Unsupported/Contrived`: none recorded by the designer.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 close → B stops the run | Added (replaces the `FENCED_REMOTE` skip) | DN-1, DN-2, S-1 | RC-10, RC-11, RC-23 now expect the stop; two built nodes |
| BEH-002 owed notice, retry, restarts | Added | DN-3, DN-4, S-2, S-3 | new RC-52 (B stopped, A and B restarts, the alternate, an older B) |
| BEH-003 link check on the new route | Added | DN-2, S-6 | RC-35 (a registered peer that did not start the run), RC-20 audit |
| BEH-004 B's list leaves out recorded runs | Added | DN-5, DN-6 | RC-11/RC-23 over GraphQL; new phone/desktop case MSP-78 |
| BEH-005 memory and history kept; later message wakes | Preserved | REQ-004 | RC-11 |
| BEH-006 re-delegation to an existing remote run | Added (the `:370` refusal removed for an existing run) | DN-8, S-4 | RC-09 updated (files), new RC-51 (agent), RC-23/RC-53 (team) |
| `RemoteDelegation` saved-Task refusal for a *new* peer run | Preserved | handoff Legacy check | RC-09, RC-23 keep asserting it |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | notices, owed mark, release, re-delegation | IMP-03 units and in-process two-node suites | real processes, timing, restarts | Two built nodes |
| API / transport / contract | Yes | `POST /rest/remote/delegated-run-states` | IMP-03 gateway tests | real signed HTTP between processes, proxies | Two built nodes, RC-20 audit |
| Frontend component / state | No | none (the web's 5 s re-read is unchanged) | — | — | — |
| Browser integration / user journey | Yes (indirect) | B's run list rows (desktop, phone) through the server list | IMP-05 (list unchanged when nothing is closed) | the row leaving and returning in the real windows | Phone probe (production phone bundle) + desktop window |
| Authentication / session / permissions | Yes | peer admission and the stored link check | IMP-03 | a real third node | RC-35 |
| Desktop renderer / web-equivalent UI | Yes (indirect) | as browser | — | as browser | desktop window in the phone probe |
| Desktop shell | No | — | — | — | — |
| Process / lifecycle | Yes | B's Stop of an agent and a whole Team; restarts of A and B | in-process with fake runtimes | real runtime processes ending; restart-resume | Two built nodes, scripted AGY processes |
| Persisted-data transition | Yes (direct use) | `peerNoticeOwed`, `closed-delegations.json` | IMP-03 schema tests | files on real nodes across restarts | RC-11, RC-52 |
| Worker / queue / distributed coordination | Yes | per-peer 30 s retry, per-run ordering | IMP-03 | real 30 s timer against a real stopped peer | RC-52 |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned worktree: `~/autobyteus_org/autobyteus-worktrees/cross-node-task-close-591`
- Stack: TypeScript (Node 22) server `autobyteus-server-ts`, Nuxt web `autobyteus-web`, scripted AGY CLI for runtimes.
- Testing guideline: `TESTING.md` (root): node credentials (built nodes via `builtServerLaunchEnvironment()`, pairing by invite, never print credentials or peer secrets), never the user's nodes or data, phone-visible behavior proven on the phone bundle (`test:e2e:mobile-shell`), clean environment for E2E (`env -i`), Node 22.
- Conflicting or unclear instructions: TESTING.md names no "two-node surface" section; the established surface is the gated `remote-delegation-two-server.e2e.test.ts` (built `dist/app.js` nodes through capturing proxies), used here.
- Changed build-input paths: none (no manifest, lockfile, workflow or build configuration changed: `git diff --name-only fa63874115..HEAD`); no fresh-start build case.
- Secrets: none needed (scripted AGY, no provider keys).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | project testing guideline | credentials, pairing, phone bundle rule, `env -i` E2E, Node 22 |
| `remote-delegation-two-server.e2e.test.ts` header | the two-node suite | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<server>/tests/fixtures/agy-failure-cli.mjs`; prerequisites `build`, `test:integration:prepare`; `REMOTE_E2E_EVIDENCE_DIR` |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` header | phone and desktop probe | `build:mobile-web` first; `--cases=…`, `--output-dir` |
| `tests/fixtures/agy-failure-cli.mjs` | scripted runtime | `CALL_TOOL:{…}`, `HOLD_TURN` (a member mid-turn) |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built nodes alpha, beta (+ gamma, zeta) | `autobyteus-server-ts` | the suite's `NodeServer` | test-owned roots, ports, HOME | `/rest/health` | suite `afterAll` |
| Phone probe stack (alpha, beta, nuxt dev, Chrome) | `autobyteus-web` | `pnpm test:e2e:mobile-shell --cases=… --output-dir=…` | probe-owned | the probe's own checks | the probe's `finally` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Projects, Tasks, Task files, delegations | public GraphQL/REST and the agents' own tool calls | test-owned data roots only | removed with the roots |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Directly Usable — No Migration` (A: optional `peerNoticeOwed`; B: new `closed-delegations.json`).
- References: design-spec § Persisted Data; DN-3, DN-5; handoff § Persisted Data Transition Check.
- Evidence planned: the files on real nodes: A's entry has the mark while owed and none after confirmation, also across A's restart (RC-52); B's file names the closed run and drops it on "open" (RC-11, RC-51, RC-52).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| RC suite header (`:52`), `:756` comment, alpha at INFO "for the fence" | describes the fenced remote run | DN-7 | Needs Update | handoff § Still Required | reword to the notice |
| RC-09 existingCopy (`:1279`, `:1292-1294`) | a saved Task to an existing remote run refused "can't be given to an agent on another node" | REQ-006 | Needs Update | DN-8, BEH-006 | a Task with files → the attachments refusal; the new-run refusal stays |
| RC-10 | after DONE the sub-work run's messages are not delivered | REQ-001 | Needs Update | the run now stops (fire-and-forget close: `release()` does not wait) | wait for the stop, then the message checks; assert the stop |
| RC-11 | after DONE messages both ways refused, "nothing says stopped" | REQ-001, REQ-004, AC-001 | Needs Update | as RC-10 | becomes AC-001's case |
| RC-23 (`:2061`, `:2074`, `:2097-2098`) | saved Task to a remote Team refused; `FENCED_REMOTE` log; Team keeps running | REQ-006, REQ-001, AC-002, AC-003 | Needs Update | DN-1, DN-7, DN-8 | AC-003 then AC-002 (CANCELLED, a member mid-turn) |
| RC-20 audit | allowed paths and exact fields | REQ-003 | Needs Update | new route | allow it with its fields and answer |
| RC-35 | a registered peer that did not start the run is refused on every route | REQ-003 | Needs Update (extend) | S-6 | add the new route (AC-005) |
| Other RC cases, contract stories, CPW | unaffected | — | Still Valid | — | run in the whole file |
| IMP-01 … IMP-06 | typecheck, units, in-process two-node, run-history E2E, architecture | all | Still Valid | handoff Checks Run; code unchanged since `9abe7086fd` (`dd5b230e7e` adds only docs) | Reused |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| REUSE-IMP | all (unit, in-process) | units, in-process two-node | Reused | IMP-01, IMP-03, IMP-04, IMP-05, IMP-06 | ran on `9abe7086fd`; `git diff 9abe7086fd dd5b230e7e -- autobyteus-server-ts autobyteus-web` is empty |
| RC-09 | REQ-006 (files) | link, Task side | Existing Test (updated) | RC suite | a Task with files to an existing remote run: attachments refusal, nothing sent |
| RC-10 | REQ-001 (sub-work) | close → B Stop | Existing Test (updated) | RC suite | — |
| RC-11 | AC-001, REQ-004, AC-006 (server) | close → B Stop, record, owed mark, log, B list, A tree/Task, conversation | Existing Test (updated) | RC suite | — |
| RC-51 | AC-007 (agent), AC-006 (return, server) | reopen, re-delegation | Durable (new) | RC suite | — |
| RC-23 | AC-003, AC-002, AC-007 (team: saved Task to a running Team) | Team | Existing Test (updated) | RC suite | — |
| RC-53 | AC-007 (team re-delegation after the close) | Team | Durable (new) | RC suite | — |
| RC-35 | AC-005 | third node | Existing Test (extended) | RC suite | — |
| RC-52 | AC-004 (+ alternate), mixed versions | B stopped, A/B restarts, 30 s retry, proxy 404 | Durable (new) | RC suite | — |
| RC-20 | REQ-003 audit | every captured request | Existing Test (updated) | RC suite | — |
| RC-ALL | regression | the whole two-server file | Existing Test | `env -i … RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | the cases share state and run in order |
| MSP-78 | AC-006 (desktop and phone) | phone bundle and desktop window on the node running the delegated run | Durable (new probe case) | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-78` | TESTING.md: phone behavior on the phone bundle |
| E2E-NEIGHBOURS | regression | suites that build the Task side or the run list | Existing Test | collaboration-contract-stories, collaboration-prompt-wording, project-task E2E touching closure | the release and list changed |

- Test progress log needed: `Yes`.

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| RC-51, RC-52, RC-53 | `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | the cross-node contract on real processes, restarts and the 30 s retry |
| MSP-78 | `autobyteus-web/tests/e2e/mobile-closed-delegation-cases.mjs`, registered in `mobile-shell-probe.mjs` | the rendered lists on B |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| RC-09, RC-10, RC-11, RC-23, RC-20, RC-35, header | the RC suite | as the inventory says | `CapturingProxy` gains an answer-with-status option for the older-B case |

## Durable Coverage To Remove

| Existing Path / Test | Obsolete Assertion And Why | Requirement / AC / Design Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| RC-23's `TASK_AGENT_RESOURCE_FENCED_REMOTE` log check and "keeps running on beta" | the fence is removed | DN-7, REQ-001 | the stop, B's record and `TASK_PEER_NOTICE_CONFIRMED` (RC-23) |
| RC-09 / RC-23 "a saved Task can't be given to an agent on another node" for an existing run | removed for existing runs | REQ-006, DN-8 | RC-51, RC-23, RC-53 (accepted); RC-09 (files refused) |

## Not Tested / Infeasible / Deferred

- A real (non-scripted) runtime mid-turn on B (AC-002 "a real runtime if possible"): B's Stop uses the existing closure Stop, the same for every runtime; the scripted AGY process with `HOLD_TURN` proves a working member is interrupted and its process ends. Decided after the main run.

## Ambiguities Or Reroute Triggers

- None at the start.

## Round 1 Updates (decisions made from the runs)

| Path / Test | Decision | Evidence | Action |
| --- | --- | --- | --- |
| RC-49 (492 rows 13/14) | Needs Update: made untrue by this ticket (row 14 expected the closed Task's run to be reached "while it runs"; it now stops) | r1 … r4 | wait for the stop; row 14 gets the not-running refusal (492 REQ-010), not woken |
| RC-51, RC-52 (alternate), MSP-93 | Planned steps revised: an ad-hoc delegation's Task is not a saved Task, so `delegate_task(run, task_id)` can't name it | r1: "must identify exactly one current node-local Task (found 0)" | give the remote run a saved Project Task (REQ-006) |
| RC-52 alternate | Revised to REQ-002's other clause (another open Task before delivery): the run's own reopened Task can't be given again (F-2) | r2 | a reopen alone is recorded, not asserted (`rfOutcome`, F-2 b) |
| RC-11 tree row | Recorded, not asserted, pending F-1 | r1 | assertions on the Task page (RC-51) and alpha's status by run ID |
| collaboration-contract-stories | Out Of Scope at S18/U9 (base-side) | base `7591aa307f`: identical failures | FU-591-01 |
