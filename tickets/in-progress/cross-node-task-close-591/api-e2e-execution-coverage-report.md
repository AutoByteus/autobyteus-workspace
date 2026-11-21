# API/E2E Execution Coverage Report

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, on CRR-001 Pass (head `dd5b230e7e`; code `9abe7086fd`, IR-001).
- Prior round reviewed: none.
- Deviations from the investigation's plan, and why:
  - RC-49 (492 rows 13/14) was also made untrue by this ticket (the handoff did not list it): its row 14 expected agents of beta and of a third node to reach the closed Task's run "while it runs"; the run now stops. Updated to the not-running refusal (492 REQ-010), the run not woken.
  - RC-51, RC-52 and MSP-93 give a remote run a saved Project Task: an ad-hoc delegation's Task is not a saved Task (`delegate_task` with its ID: "must identify exactly one current node-local Task (found 0)"), local and remote alike.
  - AC-002's real-runtime variant: not run; the scripted AGY run held mid-turn (`HOLD_TURN`) is the working member (see Not Tested).
  - The contract stories stop at a base-side fixture gap (FU-591-01) before their remote-closure steps; the RC suite covers those.
- Evidence folder: `~/autobyteus_org/autobyteus-worktrees/cross-node-task-close-591/tickets/in-progress/cross-node-task-close-591/evidence/api-e2e/` (the handoff message gives the commit).

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (after the failures are resolved); this round's result is `Fail` → failure-origin review.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `dd5b230e7e` (code `9abe7086fd`) + this round's test changes | macOS 26 (Darwin 25.5.0) arm64, load 24–31 | Node 22; `autobyteus-ts` and server `dist` built from the worktree; Brief Studio package (`test:integration:prepare`); scripted AGY CLI | `env -i PATH HOME=<fresh temp> TMPDIR`, `RUN_AGY_FAILURE_E2E=1`; test-owned roots, ports, HOMEs; alpha at LOG_LEVEL INFO; idle grace 60 s on both nodes |
| ENV-2 | as ENV-1 | as ENV-1 | the phone probe: built alpha and beta, the production phone bundle (`build:mobile-web`), `nuxt dev` desktop window against alpha, headless Chrome | phone paired with alpha through Phone Access on a private host (192.168.77.40 → 127.0.0.1) |
| ENV-B | base `7591aa307f` (merge base) | as ENV-1 | its own worktree `591-base-7591aa30`, install and build; removed after | comparisons only (contract stories) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REUSE-IMP | all (unit, in-process two-node) | units, in-process suites, typecheck, run-history E2E, architecture | Reused: IMP-01, IMP-03, IMP-04, IMP-05, IMP-06 | — | Pass (reused) | implementation handoff § Checks Run | — | `git diff --name-only 9abe7086fd dd5b230e7e` lists only ticket docs and evidence |
| TYPECHECK | — | server `src` + tests (my edits) | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-r1-runs.txt` §1 | `production errors: 0; test-file errors: 1002 in 314 files (baseline 1002 in 314 files)` | |
| RC-09 | REQ-006 (files) | link, Task side | RC suite (whole file) | ENV-1 | Pass | §2; `API-r1-rc-receipt.json` `cases["RC-09"]` | `existingCopy`: "Files (reference_files) can't be sent to an agent on another node yet, so nothing was sent." | A saved Task to a *new* remote run keeps its refusal |
| RC-10 | REQ-001 (sub-work run) | close → beta Stop | RC suite | ENV-1 | Pass | §2; receipt `RC-10.stoppedMs` | `stoppedMs` 329 | then the owner's message on beta wakes it; its message refused CLOSED |
| RC-11 | AC-001, REQ-004, AC-006 (beta's list) | close → beta Stop, record, owed mark, log, beta's list, alpha's status, conversation | RC suite | ENV-1 | Pass (the tree row recorded: F-1) | §2; receipt `RC-11` | `stoppedMs` 315; `closedRecord` `{kind:"agent", nodeId:<alpha>}`; one notice `{open:false}` answered `{accepted:true, nodeId, open:false}`; `confirmed` `open: false`; owed marks `[null]`; beta's list drops it; alpha reads it `offline`; `peerRow: null` | `peerRow: null` is F-1 |
| RC-51 | AC-007 (agent), AC-006 (return, Task page) | saved Task to the stopped run; close; reopen; re-delegation | RC suite | ENV-1 | Fail (F-2) | §2, §3 | the saved Task: open notice then the work, record cleared, listed, woken; DONE: stopped again, Task page `{status:"DONE", root:{ingressAgentRunId, closed:true}}`; reopen: nothing sent, still recorded and off the list; message `TASK_AGENT_RESOURCE_CLOSED`; another root refused; then `delegate_task(r4, task_id)` → "This task agent already has Task 591-project-1. To continue it, set Task 591-project-1 to TODO or IN_PROGRESS, then message the task agent's run id …" | everything before the last step passes |
| RC-23 | AC-003, AC-002, REQ-006 (saved Task to a running Team) | Team | RC suite | ENV-1 | Pass | §2; receipt `RC-23` | AC-003: no `delegated-run-states` request in 5 s after DONE, coordinator live, listed; AC-002: coordinator `running` (HOLD_TURN), CANCELLED → coordinator and checker processes gone in `stoppedMs` 329, Team inactive, record `{kind:"agent_team"}`, `TASK_PEER_NOTICE_CONFIRMED … open: false`, off beta's list | |
| RC-53 | AC-007 (Team) | reopen + re-delegation of the Team's own Task | RC suite | ENV-1 | Fail (F-2) | §3 | "This task agent already has Task rc-23-project-1. To continue it, set Task rc-23-project-1 to TODO or IN_PROGRESS, then message …" | the reopen itself sends nothing and the Team stays off beta's list (passed) |
| RC-35 | AC-005 | third node, stored link check | RC suite | ENV-1 | Pass | §2; receipt `RC-35.runStates` | both answers `{accepted:false, code:"REMOTE_TARGET_NOT_PERMITTED"}`; nothing recorded; beta's own run keeps running; list unchanged | gamma (paired with beta only) for alpha's run; alpha for beta's own run |
| RC-49 | REQ-001 vs 492 rows 13/14 | closed run's messages | RC suite | ENV-1 | Pass | §2; receipt `RC-49` | `stoppedMs` 308; rows 13 CLOSED; row 14: `notRunningRefusal` and the peer variant, not woken | updated: made untrue by this ticket |
| RC-52 | AC-004, REQ-002, mixed versions | beta stopped; alpha restarted; beta restarted alone; 30 s retry; proxy 404 | `… -t "RC-(01|03|52) "`; also the final whole run | ENV-1 | Pass | §4; `API-r1-rc52-receipt.json` | `owedLog` `code: 'PEER_UNREACHABLE'` once per run over a retry; marks survive alpha's stop; `deliveredMs` 28014 (alpha restarted), `rdDeliveredMs` 28252 (beta alone); rc (another open Task while down): "… was given to the task agent, but the message with its work was not delivered …", then `open: true` confirmed, never recorded, listed; older beta: "could not be reached (it answered HTTP 404)" logged once, owed, then delivered once the route answers | `rbResumed`/`rdResumed`: false (sampled right after beta's start; not asserted). `rfOutcome` (reopened alone while down): `recordedClosed: true`, stopped (F-2 b) |
| RC-20 | REQ-003 (audit) | every captured request | RC suite | ENV-1 | Pass | §2 | the new route signed, body `["fromNodeId","open","run","toNodeId"]`, accepted answer `["accepted","nodeId","open"]`, `counts.runStatesConfirmed` > 0 | |
| RC-ALL | regression | the whole two-server file | `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<server>/tests/fixtures/agy-failure-cli.mjs REMOTE_E2E_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch` | ENV-1 | Fail (F-2 only) | §2; `API-r1-rc-receipt.json` | final run r4: `Tests  2 failed | 51 passed (53)`; the two are RC-51 and RC-53 (F-2) | rounds r1 … r3 and their fixes: §2 |
| MSP-93 | AC-006 (desktop and phone) | phone bundle and desktop window on the node running the delegated run | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-93 --output-dir=<dir>` | ENV-2 | Pass | §6; `MSP-93-*.png`; `API-r1-msp93.json` | `listAfterCloseMs` 919, `phoneAfterListMs` 4148, `desktopAfterListMs` 4177; `afterReopen` `{recorded:true, listed:false, phone:false, desktop:false}`; `backMs` 1345 (a new saved Task) | roles reversed: beta delegates onto alpha (the phone's node) |
| CPW | regression | prompt wording, refusals | `vitest run tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` (gated) | ENV-1 | Pass | §5 | 14 CPW cases ✓ | |
| STORIES | regression | the 461 contract stories | `vitest run tests/e2e/projects/collaboration-contract-stories.e2e.test.ts` (gated) | ENV-1, ENV-B | Fail on the base too (FU-591-01) | §5 | branch and base: S18 and U9 `…counterpart: not in the contract ({…})`; §5.3 ✓ | the stories stop there on both, before their remote-closure steps |

### Findings

| ID | What | Expected (approved artifacts) | Observed | Base | Preliminary classification |
| --- | --- | --- | --- | --- | --- |
| F-1 | After the close, the run's row on alpha | AC-006: "stays listed on A under its delegating run and on the Task's page"; AC-001/REQ-004: "A's child row shows it offline" | The Task page names it (`root.closed: true`), and its status by run ID reads `offline`; the delegator's tree (`runTree`) has no row for it (`peerRow: null`): the tree lists open delegated runs only (`run-tree-view.ts:105`, 461/469), as for a local closed Task's run (`task-reactivation-root-visibility.e2e.test.ts:315` "A closed Task's run leaves" the tree) | unchanged by this ticket (`git diff 7591aa307f HEAD` of `run-tree-view.ts` is empty): the closed remote run's row left the tree before too (it only kept running) | `Requirement Gap`: the AC asks for a row the existing rule (local and remote) removes; DEC-004 says "as a local one" |
| F-2 | Continuing a closed remote run on its own reopened Task (the PM's case, REQ-006 / AC-007) | AC-007: after a reopen, a message is refused (`TASK_AGENT_RESOURCE_CLOSED`) and `delegate_task` with the run's ID and `task_id` wakes it; REQ-002: a close is never delivered for a run whose Task was reopened before delivery | (a) `delegate_task(run, its reopened Task)` is refused "already has Task … set it to TODO or IN_PROGRESS, then message the task agent's run id" (`task-execution-resources.ts:208`), for an agent and a Team; the message is refused CLOSED, so the run cannot be continued (the PM's dead end stays). (b) A Task reopened alone while beta is down: the owed "closed" is still delivered and the run stopped (RC-52 `rfOutcome`). Giving the run a *different* saved Task works (RC-51, RC-52, MSP-93). | `cross-run-message-delivery.ts` and the eligibility rule (`task-execution-resources.ts:186-215`) are unchanged by this ticket. Locally, the reopened Task is continued by the assigner's **message** (the reopen happens in `cross-run-message-delivery.ts:205-218`; `project-change-feed.e2e.test.ts:421-426` AC-023 "… continues with its conversation."); for the remote run the message is refused | `Requirement Gap` (or `Design Impact`): SR-005 / AC-007 read local behavior as "a message is refused; `delegate_task` reopens", the reverse of the code; the design built `toExistingRun` for the remote run, and the message path refuses it |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | RC-11, RC-10, RC-49; REUSE-IMP | Not Proven (one clause): stop within 30 s, record, no owed mark, CONFIRMED, conversation kept, alpha's status `offline` are proven; "A's child row shows it offline" has no row (F-1) | — |
| AC-002 | Yes | RC-23 (scripted AGY member mid-turn); REUSE-IMP | Proven | Real runtime mid-turn: Not Tested (below) |
| AC-003 | Yes | RC-23; REUSE-IMP | Proven | — |
| AC-004 | Yes | RC-52 | Proven for the close, the restarts, the other-open-Task alternate and an older beta; Not Proven for "If the Task is reopened before B is reachable, nothing is stopped" (F-2 b) | — |
| AC-005 | Yes | RC-35; REUSE-IMP | Proven | — |
| AC-006 | Yes | RC-11 (beta's list over GraphQL), RC-51 (Task page), MSP-93 (desktop and phone) | Not Proven (one clause): beta's lists drop and restore it in one re-read; the Task page keeps it; "under its delegating run" on alpha: no row (F-1) | — |
| AC-007 | Yes | RC-51, RC-53, RC-52 (B unreachable), RC-09 (files) | Not Proven: the reopened own Task can't be given again (F-2 a); a different saved Task, B unreachable ("not delivered", open owed), another root refused, files refused, a reopen alone changing nothing on B are proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 70% | REUSE-IMP; RC cases; MSP-93 | F-1 and F-2 leave AC-001, AC-004, AC-006 and AC-007 clauses unmet | decisions on F-1 and F-2 |
| Changed-boundary execution directness | 90% | 95% | two built nodes over signed HTTP through capturing proxies; real restarts; the phone bundle | — | — |
| Cross-boundary integration realism and mock gap | 85% | 92% | real processes, real pairing; only inference scripted | no real runtime mid-turn | a real runtime member |
| Environment, configuration, identity, and fixture fidelity | 90% | 92% | built dist, Node 22, clean env, test-owned roots | the contract stories stop at a base-side fixture gap (FU-591-01) | fix the fixture, rerun |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | beta down, alpha restart, beta restart alone, 30 s retry, 404, another open Task, third node | busy runs did not resume at the sample (not asserted) | — |
| User-surface, browser, and desktop-shell confidence | N/A | 92% | MSP-93 desktop window and phone bundle | alpha's side of F-1 not rendered | after F-1's decision |
| Durable regression coverage quality and relevance | 85% | 90% | RC-09/10/11/23/35/49/20 updated, RC-51/52/53 and MSP-93 added | RC-51/RC-53 assert the AC text that F-2 contests | adjust after the decision |

- Overall post-repository confidence: 85%
- Overall final confidence: 89% (simple average of the applicable categories)
- Every critical acceptance criterion directly proven: `No` (F-1, F-2)
- Any final applicable category below `90%`: `Yes` — requirement and acceptance-criteria proof 70%
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1, F-2; FU-591-01 (stories stop early).

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed.
- Execution mode: `Worker or Distributed` (two built nodes, restarts) and `Browser` (phone bundle and desktop window).
- Gap addressed: real cross-process sequencing, restarts and the 30 s retry; the rendered lists on the node that runs the delegated run.
- Browser validation: needed for AC-006 (desktop and phone); run as MSP-93.

## Persisted-Data Transition Checks (When Applicable)

- Approved decision: `Directly Usable — No Migration`.
- Representative data: alpha's Task entries with `peerNoticeOwed: true` across alpha's stop and start (RC-52); beta's `closed-delegations.json` written, cleared and read after restarts (RC-11, RC-51, RC-52).
- Approved transition followed: `Yes`. Compatibility fallback observed: `No`.

## Compatibility / Legacy Scope Check

- Compatibility in scope: `No`. Compatibility-only behavior observed: `No` (an older peer is treated as unreachable, by design). Durable coverage for compatibility only: `No`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`: header; RC-09, RC-10, RC-11, RC-23, RC-35, RC-49, RC-20; `CapturingProxy.answerWith`; 591 helpers | Updated | RC-09 … RC-49, RC-20 | RC-23's `TASK_AGENT_RESOURCE_FENCED_REMOTE` log check and "keeps running on beta", RC-09/RC-23's saved-Task refusal for an existing run, RC-49's row-14 delivery: replaced by the stop, the record and `TASK_PEER_NOTICE_CONFIRMED` (DN-7), REQ-006's acceptance or attachments refusal, and the not-running refusal |
| same file: RC-51, RC-52, RC-53 | Added | RC-51, RC-52, RC-53 | — |
| `autobyteus-web/tests/e2e/mobile-closed-delegation-cases.mjs`; `mobile-shell-probe.mjs` (header, import, call) | Added / Updated | MSP-93 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` this round (`Fail`).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model inference | scripted AGY CLI (`CALL_TOOL`, `HOLD_TURN`) | deterministic, no provider credits (TESTING.md) | a real runtime's mid-turn Stop is not exercised |
| An older peer node | the capturing proxy answers the new route 404 | no older build to run | the rest of the older node is the current build |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| RC suite nodes, proxies, roots, AGY processes | Yes | suite `afterAll` | receipts: `rootRemoved`, `serversStopped` |
| Phone probe stack | Yes | the probe's `finally` | `{frontendExited: true, serversLeft: 0, rootRemoved: true}` |
| Base worktree `591-base-7591aa30` | Yes | `git worktree remove --force` | Removed |
| `/tmp/api591` logs and outputs | Yes | kept; extracts committed | Kept |

## Preliminary Classification (On `Fail`)

- F-1 `Requirement Gap`: AC-006/AC-001 ask for a row on A that the existing tree rule (local and remote) removes on close; decide whether the AC changes or the tree should keep a closed remote run.
- F-2 `Requirement Gap` (possibly `Design Impact`): AC-007/SR-005/REQ-002 assume the wrong local continuation path; locally a reopened Task is continued by the assigner's message. Decide the remote continuation path (the message reactivating the remote run, as locally, or `delegate_task` for the run's own reopened Task) and what a reopen before delivery means.
- Recommended owner: the Code Reviewer's failure-origin review, then the Solution Designer.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-001 (child row clause, F-1), AC-004 (reopened-before-delivery clause, F-2 b), AC-006 (A's row under its delegating run, F-1), AC-007 (the reopened own Task, F-2 a).
- Evidence decisions requested: `None`.
- Preliminary classification and recommended owner: F-1 and F-2 `Requirement Gap` → the Code Reviewer (failure-origin review).
- Next recipient from `get_handoff_rules`: `/code_reviewer`.
- Notes:
  - Not Tested: a real (non-scripted) runtime as the mid-turn member (AC-002 "if possible"): the Stop is the existing closure Stop for every runtime; the scripted process held mid-turn shows the working member is interrupted and its process ends.
  - Out of scope: FU-591-01 (the contract stories' fixture lacks 565's `counterpart`; the same on base).
  - The unit test title `team-remote-delegation.test.ts` "AC-305: closing the Task on A fences the remote Team both ways (fenced_remote)" still says "fences" (implementation's test; noted for code review).
