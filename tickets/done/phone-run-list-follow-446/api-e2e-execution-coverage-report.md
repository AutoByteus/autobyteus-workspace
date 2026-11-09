# API/E2E Execution Coverage Report — autobyteus-446

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (round 1)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (Medium / Low, direct API/E2E)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - **AC-003's reopen path.** On the node, a Task set back to TODO keeps its copy closed. The copy reopens (`task_executions_reopened`, `root-task-execution-lifecycle.ts` `reactivateClosedTarget`) when its delegator reactivates it. In the product this is a message to the copy, or the copy's ID given back with `delegate_task`. MSP-24 therefore:
    - sets Task A back to TODO and checks that both phones agree with the node (the row stays hidden on both; the node still lists the copy as closed);
    - then the PM messages the copy, and the row returns on both phones.
    
    The requirement's scenario row names only `update_task` to TODO/IN_PROGRESS; the lists follow the node in both windows either way. This is noted for the Solution Designer (Notes of MSP-24), not a failure.
  - **Closed by the user** is not a scenario: `updateProjectTask` carries no status (only agents change it, `task-status.ts`).
  - **API-09**, a diagnosis of the full probe's verdict (pre-existing 401 lines, FU-003), was added.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-list-follow-446/tickets/in-progress/phone-run-list-follow-446/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | source `ff9a0c7b0c` (HEAD `c8620f1dac` adds ticket documents) + this round's test files | macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2 | Google Chrome headless; server `dist` and phone bundle of IMP-11 (`8e686b7f36`; later commits change a contracts doc comment and documents only); bundle files with `closedTaskExecutionsDigest`: 1 | Probe-owned nodes alpha, beta, gamma (434's cases) and delta (these cases), temp data roots and HOME, the probe's owner credential (autobyteus-437); scripted AGY `linked_skills`; phones 390×844 `isMobile` (delta's at `http://192.168.77.30:<port>`); desktop window 1440×1400 on `nuxt dev` against alpha |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-005 (digest determinism) | contracts | Reused IMP-02 | — | Pass | (IMP-02 row) | `# tests 48`, `# pass 48` | `8e686b7f36`; since then only the doc comment changed |
| API-02 | REQ-001, REQ-002, ASM-001 | server field, real root close/reopen | Reused IMP-03 | — | Pass | (IMP-03 row) | `Test Files  10 passed (10)`, `Tests  59 passed (59)` | ran on `ff9a0c7b0c` |
| API-03 | REQ-003 | server unit suite; web full suite (+ baseline fix) | Reused IMP-10; IMP-08 + IMP-09 | — | Pass | (rows) | `Tests  8202 passed`; IMP-08 `1 failed \| 726 passed` → IMP-09 `Tests  2 passed (2)` | IMP-08's one failure is `mobile-root-shell.spec.ts` expecting 433's removed node address; fixed in the spec (baseline commit `e8270ed84e`) |
| API-04 | AC-002 (shared store), AC-005 | web collaboration specs | Reused IMP-12 | — | Pass | (row) | `Tests  108 passed (108)` | ran on `ff9a0c7b0c` |
| API-05 | — | typechecks, codegen | Reused IMP-04, IMP-05, IMP-06 | — | Pass | (rows) | `production errors: 0`; `closedTaskExecutionsDigest?: Maybe<…>` | the new probe module is `.mjs`, outside both typecheck configurations |
| API-06 | release build (contracts changed) | fresh-start build | Reused IMP-13 | — | Pass | (row) | `install=0`, `build=0`, `PRISMA_OK`, `TERMINAL_OK` | ran on `ff9a0c7b0c`; no build input changed since |
| API-07 | BEH-003 (reload) | phone bundle | Reused IMP-07 | — | Pass | (row) | `otherAfterReload: []` | same source |
| MSP-24 | AC-001, AC-003, AC-004, AC-005 | phone bundle on delta: phone-host (open run = the PTM), phone-other (open run = "Other") | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-08-mobile-shell-probe` (full probe) | ENV-1 | Pass | `API-08-mobile-shell-probe/mobile-shell-probe.json` (`cases.MSP-24`, `closedTaskRows`), `MSP-24-phone-*.png`, `server-delta.log` | quiet 50 s: `"history": 10, "statuses": 10, "statusesNamingPtm": 10, "ptmViewReads": 0`; `"goneAfterCloseMs": {"otherA": 4279, "otherB": 3368, "hostA": -495, "hostB": -480}`; `"viewReadsAfterClose": 1`, `"viewReadsInThe15sAfterGone": 0`; `"afterTodoOnly": {"phoneHost": false, "phoneOther": false, "nodeStillClosed": true}`; `"rowBackAfterReactivationMs": {"other": 950, "host": -486}` | Negative host values: the row left before the PM's tool call result was stored (the live stream is faster than the probe's read of the call). AC-003: see Round; the requirement's scenario row names `update_task` only, while the node reopens the copy on its reactivation; both windows follow the node (for the Solution Designer) |
| MSP-25 | AC-006 | phone-other hidden (visibility emulated) when the PM closes Task A, then shown | full probe | ENV-1 | Pass | `cases.MSP-25`, `MSP-25-phone-other-shown.png` | `"whileHidden": {"history": 0, "statuses": 0, "views": 0, …}`; `"rowListedWhenShown": true`; `"goneAfterShownMs": 102`; `"firstHistoryReadAfterShownMs": 3` | The only reads while hidden: `GetTaskWorkerTasks` at +2.36/+2.40 s, the Projects change feed's push of the close (`taskWorkerTaskStore`, untouched by this ticket), not the list's refresh |
| MSP-26 | REQ-001 Team host (design Risks) | phone bundle on delta: the Live Team's lead closes its own delegated Task C while phone-other shows "Other" | full probe | ENV-1 | Pass | `cases.MSP-26`, `MSP-26-phone-other-before.png`, `…-after.png` | `"listedBefore": true`, `"goneAfterCloseMs": -499` | A Team host's rows follow its mounted Team context's live stream (the phone mounts active Teams); no gap, as the design read |
| MSP-27 | AC-002, AC-005 (desktop) | desktop window (`nuxt dev` on alpha), open run = a plain run; the PTM active and read active first | full probe | ENV-1 | Pass | `cases.MSP-27`, `MSP-27-desktop-before.png`, `…-after.png` | `"openRun"` = `"openRunAtEnd"` = a `fact_checker_…` run; `"quietViewReads": 0, "quietStatusReads": 2`; `"goneAfterCloseMs": 1345`; `"viewReadsAfterClose": 1` | Task B's Team row is identified by `data-transient-kind="task_team"` + `data-member-address="/docs_review_team"` (it carries the host's ID); the PTM row is unfolded with its disclosure only (a click on a row opens it) |
| API-08 | REQ-003, AC-004 (MSP-14), phone shell regression | the full phone probe | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-08-mobile-shell-probe` | ENV-1 | Pass (cases: 27/27); probe verdict `Fail` on 48 pre-existing lines (API-09) | `API-08-mobile-shell-probe/mobile-shell-probe.json`, screenshots, server logs | `"summary"`: every case `"Pass"` (MSP-01…27); MSP-14 `"gone": true, "reloaded": false`; MSP-12 `"hidden": []`; `"cleanup": {"frontendExited": true, "serversLeft": 0, "rootRemoved": true}`; `"unknownBrowserErrors": 48` | The 48 unknown lines are all `phone console: Failed to load resource: … 401 (Unauthorized)` from the probe's main phone in MSP-21…26, after MSP-13 revoked its credential: see API-09 |
| API-09 | — (verdict diagnosis) | the probe's main phone after MSP-13 | Temporary copy of `mobile-shell-probe.mjs` adding each console line's source URL and recording every 401 GraphQL answer; `node tests/e2e/.tmp-401-source-probe.mjs --cases=MSP-13,MSP-21 --output-dir=…` (copy removed) | ENV-1 | Pass (cause found: pre-existing) | `API-09-unauthorized-reads/API-09-unauthorized-reads.json` | `{"case": "MSP-21", "label": "phone", "op": "GetRunProjection", "count": 15}`, `{… "op": "GetRunFileChanges", "count": 15}` (in 46 s) | Cause: the node closes a revoked client's sockets with 4403 (autobyteus-437) and the web client ends retrying only on 4004/4005, so the revoked phone's run streams retry for ever, and each agent attempt's catch-up read (autobyteus-434) is refused. Untouched by this ticket → FU-003. Every full probe run on this base ends `Fail` until it is fixed |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | MSP-24 (phone-other: agent row 4.3 s, Team row 3.4 s after each close; ≤ 10 s); API-07 (repro, 3.2 s) | Proven | — |
| AC-002 | Yes | MSP-27 (desktop window, open run a plain run: Team row gone 1.3 s after the close, through one view re-read); API-04 (shared store) | Proven | — |
| AC-003 | Yes | MSP-24 (the PM reopens Task A and reactivates its copy: row back on phone-other in 0.95 s and on phone-host; after TODO alone both phones agree with the node); API-02 (server digest returns after a reopen), API-04 (store) | Proven | — |
| AC-004 | Yes | MSP-24 (phone-host: both rows gone before the PM's call result was stored); MSP-14 (existing) | Proven | — |
| AC-005 | Yes | MSP-24 (50 s: 10 statuses reads, 0 view reads; 1 view re-read per change, 0 after); MSP-27 (desktop: 0 view reads in 12 s); API-04 (ten refreshes, no view read) | Proven | — |
| AC-006 | Yes | MSP-25 (no history, statuses or view read while hidden; row gone 102 ms after shown) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

Post-repository = after API-01…07 (reused unit, suites, fresh-start build, the implementation's repro); final = after MSP-24…27, the full probe (API-08) and API-09.

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 97% | Every AC on a real surface: AC-001/003/004/005 MSP-24, AC-006 MSP-25, AC-002 MSP-27; Team host MSP-26 | AC-003's trigger wording vs the node's reopen (noted) | — |
| Changed-boundary execution directness | 85% | 96% | The digest crosses node → GraphQL → browser in real runs; the store's re-read observed in the network log (1 per change) | — | — |
| Cross-boundary integration realism and mock gap | 75% | 96% | Production phone bundle on a real node, Phone Access, real PTM tool calls (`delegate_task`, `update_task`, `send_message_to`) | Scripted runtime instead of a model | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Probe-owned nodes with the owner credential; paired phones; desktop `nuxt dev` | One desktop window kind (`nuxt dev`, not the packaged app) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | 95% | Hidden phone, reopen, Team host, the open host, quiet periods; inactive hosts are FU-001 (out of scope) | — | — |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | Phone list (two phones), desktop sidebar | Electron shell not exercised (no shell change; same renderer) | — |
| Durable regression coverage quality and relevance | 80% | 95% | MSP-24…27 in `test:e2e:mobile-shell` assert each AC; unit tests per layer | The full probe's verdict is red until FU-003 is fixed, so the new cases' results must be read per case | FU-003 |

- Overall post-repository confidence: 78% (simple average)
- Overall final confidence: 95.6% (simple average of 97, 96, 96, 95, 95, 95, 95)
- Calculation method: simple average; no final category below 95%.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - FU-003 (pre-existing, 434 × 437): the full phone probe ends `Fail` on 48 refused reads of the revoked main phone; every case passes. Until it is fixed, the probe's verdict cannot gate a ticket by itself.
  - FU-001 (inactive hosts) unchanged, out of scope.
  - AC-003's scenario names `update_task` alone; the node reopens a copy when it is reactivated. Lists follow the node in every window either way.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (phone bundle on probe-owned nodes; desktop renderer through `nuxt dev`)
- Confidence gap or residual risk it addresses: the unit tests use mocks for the poll, the GraphQL answer and rendering. The fix's behavior is the list's refresh across processes (node → statuses read → store → rows) in two surfaces. Gain: 78% → 95.6%.
- Browser validation needed: yes; TESTING.md requires phone behavior to be proven by a `test:e2e:mobile-shell` case, and the desktop sidebar is the same renderer path.

## Desktop Application Validation (When Applicable)

- Approach: the desktop renderer in a browser window on `nuxt dev` (the probe's desktop window); no Electron change, so the shell is not part of the changed boundary.
- Effect on any running desktop application: `None`.
- Not directly proven: the packaged Electron window (same renderer code; no shell change).

## Compatibility / Legacy Scope Check

- Requirements/design introduce or tolerate backward compatibility in scope: `No` (the design rejects treating a missing digest as unchanged).
- Compatibility-only or legacy-retention behavior observed: `No`.
- Durable coverage only for compatibility-only behavior: `No`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-closed-task-rows-cases.mjs` | Added | MSP-24, MSP-25, MSP-26, MSP-27 | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (imports and calls the module after the 434 cases; header lines for MSP-24…27; the 434 line no longer says "they run last"; runtime note) | MSP-24…27 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model provider | Scripted AGY CLI (`linked_skills`: `CALL_TOOL:` makes the agent call the real tool) | No provider needed: the Task tools, the node's closure and the lists are real | None for this change |
| Phone background | `document.visibilityState` + `visibilitychange` | Headless Chrome has no app lifecycle | The real WebView's visibility was proven in autobyteus-434 (emulator) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks (alpha, beta, gamma, delta, nuxt dev, Chrome) | Yes | probe `finally` | `"serversLeft": 0, "rootRemoved": true` |
| Debug runs (`/tmp/api446-dev-1…4`) | Yes | removed | removed |
| Temporary probe copy `tests/e2e/.tmp-401-source-probe.mjs` and its outputs | Yes | removed after API-09 | removed (its summary kept as evidence) |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Next recipient from `get_handoff_rules`: delivery engineer (direct route: Medium / Low)
- Notes: final confidence 95.6%. New follow-up FU-003 (pre-existing: a revoked phone's run streams retry for ever; it makes the full phone probe's verdict `Fail` on every run of this base). AC-003's reopen path noted for the Solution Designer.
