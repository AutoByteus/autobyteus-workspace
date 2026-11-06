# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/left-panel-follow-ups/tickets/in-progress/left-panel-follow-ups/` unless absolute.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- Revision record and current ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, IR-001 (direct route)
- Prior round reviewed: none
- Deviations from the plan, and why: none
- Evidence folder: `evidence/api-e2e/`

## Routing Classification

- Task size `Small`; architectural risk `Low`; input route `Direct Low-Risk`; successful-output route `Delivery` (not reached: this round fails); test-code review `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `dda6ba59cf` (code `ee1178617c`, `2903fba48a`, `00339421ed`) plus PLN-11 | macOS 26.5.2, Node v22.23.1, pnpm 10.28.2 | `projects-left-navigation-probe.mjs`: headless Chrome → Nuxt dev → `autobyteus-server-ts/dist/app.js` (built after the last code commit; server source identical to the base), scripted AGY | Probe-owned data root, ports, processes; removed (`dataRootRemoved: true`); load average ~100 |
| ENV-2 | `dda6ba59cf` | same | Server vitest files | `env -i PATH HOME=<fresh temp> TMPDIR` |
| ENV-3 | `dda6ba59cf` | same | Fresh clone, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64`, verify steps (TESTING.md Fresh-start build) | No signing secrets; clone removed |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 (web), AC-002, AC-003 (store) | web | Reused: IMP-01…IMP-05 | — | Pass | `evidence/implementation/IMP-01*…IMP-05*` | (implementation rows) | Only ticket documents after `00339421ed` |
| API-02 | AC-001 (server) | server | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts tests/e2e/run-history/removed-remote-provider-saved-selection-graphql.e2e.test.ts tests/unit/agent-execution/agent-run-create-service.test.ts tests/unit/agent-execution/agent-run-create-undo.test.ts tests/integration/agent-execution/agent-run-service.integration.test.ts --no-watch` | ENV-2 | Pass | `evidence/api-e2e/API-02-server-createAgentRun.log` | `Test Files  5 passed (5)`, `Tests  23 passed (23)`, `exit=0` | The probes also call GraphQL `createAgentRun` live, dozens of times |
| API-03 | AC-003 (start elsewhere, view open), preserved Projects behavior, zh-CN after the rename | live browser | `pnpm -C autobyteus-web test:e2e:projects-left-navigation --output-dir <fresh>` | ENV-1 | Pass (PLN-01…PLN-10) | `evidence/api-e2e/API-03-04-pln/evidence.json`, `run.log`, `PLN-08*.png`, `PLN-10*.png` | PLN-01…10 `Pass`; PLN-08 `lateProjectListedMs: 4360` | PLN-09 (this window's archive, delete, stop) and PLN-10 (zh-CN, narrow) ran on this change for the first time |
| API-04 | AC-003 (removed elsewhere; hidden) | live browser | Same run, PLN-11 | ENV-1 | **Fail** | `API-03-04-pln/evidence.json` (`cases.PLN-11`), `PLN-11-unlisted-after-archive-elsewhere.png`, `PLN-11-older-run-archived-elsewhere.png` | Pass parts: `nListedMs` 3989, `nUnlistedMs` 4908, `readsWhileHidden` 0. Fail: `mUnlistedMs: false`, `readsAfterOlderArchive: 0` | Expected: the Project leaves within one poll. Observed: it stays listed and no Project is read for 12 s |
| API-05 | AC-004; fresh-start (`autobyteus-web/generated/**` changed) | release build | `evidence/api-e2e/API-05-fresh-start.sh`, then the job's verify steps | ENV-3 | Pass | `API-05-fresh-start.log`, `API-05-fresh-build.full.log.gz`, `API-05-fresh-verify.log` | `build exit=0`; `test-file errors: 99 in 43 files (baseline 99 in 43 files)`, `[typecheck] PASS`; dmg and zip; `prisma-verify=ok`, `ok: node-pty spawn probe`, `exit=0` | Signing and notarization: Not Tested (runner secrets) |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-001 | Yes | API-01 (IMP-04 grep and codegen), API-02, live `createAgentRun` use in API-03 | Proven |
| AC-002 | Yes | API-01 (IMP-02, IMP-03), grep outside ticket history, API-03 PLN-10 (zh-CN) | Proven |
| AC-003 | Yes | API-03 (start elsewhere), API-04 (removed elsewhere, hidden), API-01 (IMP-01), API-03 PLN-09 (own actions) | **Not Proven**: a run removed by another client does not leave its Project when it is older than the 6 newest runs of its agent in its folder |
| AC-004 | Yes | API-01, API-05; finalization is delivery's | Proven up to finalization |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 80% | 50% | AC-001, AC-002, AC-004; AC-003 start and hidden | AC-003 removal of an older run fails | A fix, then PLN-11 |
| Changed-boundary directness | 80% | 95% | Live view, real poll, requests counted | — | — |
| Integration realism and mock gap | 70% | 95% | Another client is the real API; the store spec mocks the history | — | — |
| Environment and fixture fidelity | 85% | 95% | Fresh-start build; probe-owned stack | Signing on the runner | — |
| Failure, edge-case, lifecycle | 70% | 90% | Restart (PLN-08), hidden, the window edge | — | — |
| User surface | 80% | 90% | Projects view in Chrome, zh-CN, narrow | Electron shell not run (same renderer) | — |
| Durable coverage | 85% | 95% | PLN-11 added | — | — |

- Overall post-repository: 77%; overall final: 87%; simple average
- Every critical AC directly proven: `No` (AC-003)
- Any final category below `90%`: `Yes`

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed. Mode: `Browser` on a live stack. The store spec mocks the history, so it cannot show which runs the real 6-per-agent poll contains.

## Persisted-Data Transition Checks

- `Not Affected`.

## Compatibility / Legacy Scope Check

- `No` compatibility scope. The web document is removed without a wrapper. The server mutation is unchanged, as required.

## Durable Coverage Changed In The Codebase

| Path | Change | Cases |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs` | PLN-11 added (388 AC-003): start and archive elsewhere with the view open, the hidden view, and a run older than its folder's 6 newest | API-04 |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Another client | the public GraphQL API (`createAgentRun`, `archiveStoredRun`) from the probe | It is how another window, the phone or an application reaches the server | — |
| Model provider | scripted AGY | No provider proof needed | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe stack | Yes | removed by the probe | Done |
| Fresh clone (incl. the unsigned dmg) | Yes | removed | Done |

## Preliminary Classification (On `Fail`)

- Failing case: API-04 (PLN-11, its last part), AC-003 / REQ-003.
- Command: `pnpm -C autobyteus-web test:e2e:projects-left-navigation --output-dir <fresh dir>` (or `--cases PLN-11`).
- Steps:
  1. With the Projects view open, Project M has one run R in folder `m-folder`.
  2. Through the API, the same agent gets 6 newer runs in that folder that are not under the Project.
  3. M stays listed.
  4. Another client archives R.
- Expected: M leaves within one poll.
- Observed: M stays listed for 12 s, with 0 `GetProjectRunHistory` requests.
- Cause found:
  - DEC-003 watches the set of root runs in `runHistoryStore`.
  - While the Projects view is shown, the run section reads the history with the Workspaces window, 6 newest runs per agent and folder (`RunSectionPanel.vue:120`, `historyWindowOf`).
  - R is the 7th newest of its agent in its folder, so it is not in the read. Archiving it does not change the watched set, and nothing is read again.
  - A run started elsewhere is always the newest, so start is always seen (PLN-08, PLN-11 first part). A removal is missed whenever the removed run is outside that window.
  - Team and Org runs are not capped, so their removals are seen.
- Preliminary classification: `Design Impact`. The design's signal, the windowed history set, cannot carry every removal. A fix needs a design choice, for example:
  - a signal that covers each loaded Project's own runs (compare the listed run IDs of the shown Projects with what the poll reports);
  - re-reading the shown Projects on each poll while the view is open;
  - a server change event, which is out of scope for this ticket.

  The failure-origin review decides.
- Recommended owner: code reviewer (failure-origin review), then the Solution Designer if it confirms `Design Impact`.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: AC-003 (Not Proven: removals outside the window). Nothing only the user can check.
- Test-code review: `Not Required — direct low-risk route`
- Next recipient: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes: everything else passes, including the fresh-start build. The implementer's known risk (one extra read on Runs → Projects) was not measured separately; it is bounded and not a criterion.
