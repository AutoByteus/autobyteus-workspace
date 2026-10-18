# API/E2E Execution Coverage Report — `link-existing-run-to-task`, Withdraw Adoption (SR-018)

The record and the result of the current round. The adoption rounds (API-REV-001..004) are summarized in `api-e2e-revision-record.md`; their full reports are in the branch history (merge `4e738acc66`).

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-005`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 5, the first of the withdrawal; implementation IR-005 ready for direct API/E2E validation
- Prior round reviewed: API-REV-004 (adoption, Pass, then withdrawn by the user)
- Deviations from the investigation's plan, and why: None
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/withdraw-adoption/tickets/in-progress/link-existing-run-to-task/evidence/api-e2e/withdraw/` (the commit holding it is given in the handoff)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `ffeea43dac` (implementation checks) | macOS 26.5.2, node v22.23.1 | repository suites | see the implementation handoff |
| ENV-2 | `1005f9eaaf` (product content = `ffeea43dac`) + uncommitted WDR-1 test | macOS 26.5, node v22.21.1 | server e2e in-process; scripted AGY CLI (`RUN_AGY_FAILURE_E2E=1`, `tests/fixtures/agy-failure-cli.mjs`) | `env -i`, resolved temp `HOME`, `TMPDIR`; vitest runs serialized in the worktree |
| ENV-3 | `1005f9eaaf` | macOS 26.5 | isolated desktop instance `iso-65199-3241` of the branch build (`isolated-app start --build`), owned data root | PM on Claude Agent SDK `haiku` (Haiku 5.5); hand-started writer and team on AutoByteus `deepseek-v4-flash`; provider keys imported by `pnpm secrets:import` (values never printed); hand-built definitions, Project with 4 Tasks, runs (`desktop/WDR-3-setup.json`) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WDR-R01 | RM-001, RM-002 | server types | Reused: IMP-01 | — | Pass | (implementation handoff) | (IMP-01 row) | same commit `ffeea43dac`; nothing outside `tickets/` changed since |
| WDR-R02 | RM-001, RM-002 | server unit | Reused: IMP-02 | — | Pass | | | same commit |
| WDR-R03 | RM-002 | server integration | Reused: IMP-03 | — | Pass | | | same commit |
| WDR-R04 | RM-001 | refusal pins (CPW-R3, other root's copy), copy follow-up, reactivation e2e | Reused: IMP-04 | — | Pass | | | same commit; the three files also ran inside WDR-2 |
| WDR-R05 | RM-001, RM-002 | web unit | Reused: IMP-05 | — | Pass | | | same commit |
| WDR-R06 | RM-002 | web guards | Reused: IMP-06 | — | Pass | | | same commit |
| WDR-R07 | RM-001 | web types parity | Reused: IMP-07 | — | Pass | | | same commit |
| WDR-R08 | RM-006 kept fix 2 | token accumulator with / without the fix | Reused: IMP-08 | — | Pass | | | same commit; fails without the fix, as it should |
| WDR-R09 | RM-001 | adoption identifiers search | Reused: IMP-09 | — | Pass | | | same commit |
| WDR-R10 | RM-006 kept fix 1 | sidebar rule 2 unit cases | Reused: IMP-10 | — | Pass | | | same commit |
| WDR-1 | RM-001 | the PM's real `delegate_task` on an idle agent run and team run the user started in its workspace | `env -i PATH HOME=<resolved temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/hand-started-run-refusal.e2e.test.ts --no-watch` | ENV-2 | Pass | `WDR-1-hand-started-run-refusal.log` | `✓ WDR-1 delegate_task on an agent run and a team run the user started is refused with the pre-adoption text, and nothing is written`; `Tests  1 passed (1)` | The test asserts: the exact text `<id> is not one of your task agents. Use a run id that delegate_task returned to you, or delegate to a new task agent with recipient_address.`; the PM's tree, the Task's entries, the run's own files and history row unchanged; no `taskAgent`; the run answers its own user again; no Task message delivered |
| WDR-2 | AC-006, RM-002 | whole server e2e | `env -i PATH HOME=<resolved temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e --no-watch`; then the three failing files alone, on base `2b04a9971d`, and again with the baseline fix | ENV-2 | Pass | `WDR-2-server-e2e.excerpt.log`, `WDR-2-server-e2e.full.log`, `WDR-2-rerun-failing-alone.log`, `WDR-2-classify-run-projection-on-base.log`, `WDR-2-classify-agy-team-on-base.log`, `WDR-2-baseline-fix-on-base.log`, `WDR-2-baseline-fixes-rerun.log` | full run: `Test Files  3 failed \| 114 passed \| 49 skipped (166)`; the same 3 fail on base (`Tests  2 failed \| 5 passed (7)`, and `TypeError: Cannot read properties of undefined (reading 'runtimeKind')`); with the fix: `Test Files  3 passed (3)`, `Tests  13 passed (13)`; the withdrawal's own files ✓ (`hand-started-run-refusal`, `collaboration-prompt-wording`, `task-existing-copy-assignment`, `task-reactivation-root-visibility`) | Rule 9: the 3 failures predate this ticket (they fail on base) and are stale tests. `run-projection-toolcalls-graphql` passed `runContext: {} as never`, but rejection logging reads `config.runtimeKind` since `f4490d258a`. `agy-context-files-transport` E2E-CF-005 and `agy-interrupt-resend-transport` AC-006 read only `SEGMENT_CONTENT`, while Team sockets batch as `SEGMENT_CONTENT_BATCH` since autobyteus-139. Fixed in a separate commit, `43aa0bcb36` "(baseline fix)". The 49 skips are live-provider gates |
| WDR-3 | RM-001 | real app: the user asks the PM (composer) to give Task 1 to the writer run and Task 2 to the team run, both started by the user with one real-model turn each | 1. Each run answered the user through its composer. 2. PM asked in its composer. 3. History read (`fetchTree()`). 4. GraphQL and file checks | ENV-3 | Pass | `desktop/WDR-3-pm-refused.png`, `desktop/WDR-3-nothing-written.txt`, `desktop/WDR-3-sidebar-before.txt`, `desktop/WDR-3-sidebar-after.txt` | Screenshot: both `{"delegated":false,"message":"… is not one of your task agents. Use a run id that delegate_task returned to you, or delegate to a new task agent with recipient_address."}`; `writer in tree: False \| team in tree: False`; `files:        0`; `taskAgent` counts `0` and `0`; `writer: True \| team: True`; sidebar after: both still in ADO Writer and TEAMS, nothing under the PM | The PM explained the refusal and offered new task agents |
| WDR-4 | RM-006 kept fix 1 | real app sidebar: open runs archived / deleted from outside this window | `terminateAgentRun` + `archiveStoredRun` (writer), `terminateAgentTeamRun` + `deleteStoredTeamRun` (team) over GraphQL, as another client calls them; sidebar sampled each second | ENV-3 | Pass | `desktop/WDR-4-sidebar-samples.txt`, `desktop/WDR-4-retired-state.json`, `desktop/WDR-4-after-external-archive-delete.png` | four `"success": true`; `t+1s … ADO Project Manager\|(1)\|<PM run>\|…\|ado writer\|…\|Settings\|` (ADO Writer group and TEAMS gone); `"departed":["ado_writer_e5253…","ado_review_team_c47c…"]`, `"writerContextStill":true` | rule 2 retired them; the window still held the writer's context, so without the fix its row would have stayed; the PM and its own copy stay |
| WDR-5 | AC-006, RM-006 kept fix 2 | real app: the PM delegates Task 3 to a new task agent (real model, token usage), DONE, reopen plus message | composer messages to the PM; sidebar samples; GraphQL | ENV-3 | Pass | `desktop/WDR-5-delegate-samples.txt`, `desktop/WDR-5-done-reopen-samples.txt`, `desktop/WDR-5-app-log-checks.txt` | `ado writer\|Write a one-line motto…` under the PM; `"Every day, neatly planned."`; after DONE no `ado writer` row and `closed after DONE: [{'agentRunId': 'ado_writer_a1b0…'}]`; after reopen the row is back and `"Plan your days."`; `usage rejections / listener failures / fail-stop: 0`, `token usage events observed …: 19` | |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| RM-001 (adoption removed; pre-adoption refusal; nothing written) | Yes | WDR-1, WDR-3, WDR-R04, WDR-R09, WDR-R01/R02/R05/R07 | Proven | — |
| RM-002 (later tickets' changes intact) | Yes | WDR-R02, WDR-R03, WDR-R05, WDR-R06, WDR-2 | Proven | — |
| RM-003 (no migration) | No | none needed (nothing written; investigation) | Proven | — |
| RM-004 (ticket record; release notes say withdrawn) | No | — | Not Proven here (delivery) | delivery-owned docs |
| RM-005 (new beta) | No | — | Not Proven here (delivery) | delivery-owned release |
| RM-006 (kept fixes work) | Yes | WDR-4 and WDR-R10 (fix 1), WDR-5 and WDR-R08 (fix 2), WDR-1/WDR-2 run under the TESTING.md rule (fix 3) | Proven | — |
| AC-006 (existing suites; copies' behavior unchanged) | Yes | WDR-2, WDR-5, WDR-R02..R06 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 96% | RM-001: WDR-1, WDR-3, WDR-R04, WDR-R09; RM-002: WDR-R02/R03/R05/R06, WDR-2; RM-006: WDR-4, WDR-5, WDR-R08, WDR-R10 | RM-004/RM-005 are delivery-owned | — |
| Changed-boundary execution directness | 95% | 96% | WDR-1 through the PM's real `delegate_task`; WDR-3 from the real composer | none material | — |
| Cross-boundary integration realism and mock gap | 88% | 95% | scripted AGY in WDR-1/2; real models in WDR-3..5 | the second client in WDR-4 is the same GraphQL API, not a second device | a phone client; not needed, since the server API is the boundary |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | clean env with a resolved `HOME`; isolated branch build; imported credentials; hand-built data | none material | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | refusal for an agent and a team run; DONE and reopen (WDR-5); external archive and delete (WDR-4); the window case reused from IMP-10 | kept fix 2 on real mixed-root data proven only in a unit test (IMP-08) | fabricated legacy data (not worth it: identical output for normal data) |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | WDR-3..WDR-5 on the real app | no shell change, so none | — |
| Durable regression coverage quality and relevance | 92% | 95% | WDR-1 added; the ADO file correctly removed; three stale tests fixed (`43aa0bcb36`) | none material | — |

- Overall post-repository confidence: 89% (simple average)
- Overall final confidence: 95% (simple average: 96, 96, 95, 95, 95, 95, 95)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: kept fix 2 on legacy mixed-root data (unit-proven, IMP-08).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed: WDR-3..WDR-5)
- Execution mode: `Project Desktop Validation`
- Gap addressed: the rendered refusal with real models, the sidebar's kept rule 2 when another client removes an open run, and copy lifecycle with real token usage. Repository tests cover these only through scripted runtimes or unit stores.
- Browser validation needed: the desktop renderer was used (web-equivalent surface of the real app).

## Desktop Application Validation

- Approach executed: an isolated instance of the branch build on an owned data root, driven over CDP; real models.
- Web-equivalent cases: WDR-3, WDR-4, WDR-5. Shell-specific: none changed.
- Effect on the user's running app: None (own ports and data root; the user's app and `~/.autobyteus` untouched; only `.env` was read, by the importer).
- Behavior not directly proven: kept fix 2 on real mixed-root (legacy) data, which needs fabricated data; IMP-08 proves it in a unit test.

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated in scope: `No`
- Compatibility-only or legacy-retention behavior observed: `No` (the identifiers search matches the pre-merge tree, WDR-R09; the store no longer has rule 1's state, `desktop/WDR-4-retired-state.json` `stateKeys`)
- Durable coverage retained only for compatibility: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/hand-started-run-refusal.e2e.test.ts` | Added | WDR-1 | — |
| `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | Updated (baseline fix `43aa0bcb36`) | WDR-2 | — |
| `autobyteus-server-ts/tests/e2e/runtime/agy-context-files-transport.e2e.test.ts` | Updated (baseline fix `43aa0bcb36`) | WDR-2 | — |
| `autobyteus-server-ts/tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts` | Updated (baseline fix `43aa0bcb36`) | WDR-2 | — |
| `autobyteus-server-ts/tests/e2e/projects/hand-started-run-adoption.e2e.test.ts` | Removed (by the implementation, `ffeea43dac`) | — | Asserted adoption, which is withdrawn (RM-001); replaced by WDR-1, which asserts the refusal; ADO-4's concern stays covered by kept fix 2 (IMP-08) |

- Added paths attached for test-code review: `Not Applicable` (direct low-risk route)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI (WDR-1, WDR-2) | scripted fixture `tests/fixtures/agy-failure-cli.mjs` | the project's e2e standard | none for the refusal path; real models covered by WDR-3..5 |
| Another client removing a run (WDR-4) | the same GraphQL mutations, called from outside the window | no second device needed; the server API is the boundary | none material |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instance `iso-65199-3241` | Yes | `isolated-app stop` | stopped; record removed |
| Data root `wdr-desktop-root-BBVP5h` (with the test vault) | Yes | deleted | gone; no database in the evidence |
| Temp `HOME`s for e2e | Yes | removed after each run | removed |
| Temporary base worktree `_tmp-wdr-base-check` (`2b04a9971d`), used to classify WDR-2's failures | Yes | `git worktree remove --force` | removed |
| Desktop helper scripts (`desktop/b.sh`, `gq.sh`, `ui.sh`, `type.js`, `mk.py`, `pm-send.mjs`), `import-secrets.exp` | Yes | kept as evidence of the method | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: RM-004 and RM-005 belong to delivery (release notes saying adoption was withdrawn; a new beta). None is only the user's to check.
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/delivery_engineer` (direct low-risk route)
- Notes:
  - Durable coverage added: `tests/e2e/projects/hand-started-run-refusal.e2e.test.ts` (WDR-1). Test-code review: `Not Required — direct low-risk route`.
  - Baseline fix `43aa0bcb36` updates three stale e2e tests from earlier tickets. They predate this ticket; delivery may want them noted when merging.
