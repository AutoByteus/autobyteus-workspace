# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation (`api-e2e-coverage-investigation.md`) is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (Medium / Low, direct route)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - AC-003's busy-host run could not run here (the regime was absent); an evidence decision was requested and given (DEC-004: other evidence plus one calm whole E2E run; the busy regime is `Accepted Unverified Risk`).
  - The packaged probe (API-05) is broken on the base in two ways (below); a partial baseline fix made it run further but not to N-009, so it was reverted and recorded as FU-002.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-579/tickets/in-progress/small-follow-ups-579/evidence/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `b6b8020bf5` (code `4c77e3e78a`; TESTING.md commit on top) | macOS 26.5.2 ARM64, calm: load 4–42, `fseventsd` 0.1% CPU, 29 MB | Node v22.23.1; server `dist/` built at API-00 | `env -i PATH HOME=<temp> TMPDIR USER` |
| ENV-2 | same | same | rendered probe: built server, Nuxt dev, Chrome (Playwright) | probe-owned data |
| ENV-3 | same | same | packaged Electron (`electron-dist/mac-arm64`) through `isolated-app` | its own data root |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | server build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-server-build.log` | `exit 0` | — |
| API-01 | AC-001, AC-002, AC-004, AC-005 | the implementation's checks | Reused: IMP-01…IMP-12 (`02ee9c2237`/`4c77e3e78a`; the later commit changes no server code) | — | Pass (reused) | handoff IMP-01…IMP-12 | IMP-03 `Tests  8921 passed`; IMP-05 `Tests  6048 passed`; IMP-06 `18`/`19 passed`; IMP-07 UNR-001/002 `Pass`; IMP-10 race `2 passed` ×5 under spinners; IMP-12 each control fails | — |
| API-02 | **AC-007** | `TESTING.md` "Test-only runtime CLI settings" | the Claude test-owned home (HOME, `CLAUDE_CONFIG_DIR`, api-key mode with the test vault; built server `testVaultSetting`, in-process `initializeLiveServerVault`), and the CLI recorder rules (`.cjs` inside an ES-module package; Claude's `--version` check), citing `lost-session-renewal-live.e2e.test.ts` | — | Pass | commit `b6b8020bf5` (`docs(testing): …`, on its own) | the two new bullets | checked against the code: only `CLAUDE_CODE_EXECUTABLE_PATH` is probed with `--version` (`claude-sdk-executable-path.ts`); Codex and Grok use their command variables as given |
| API-03 | AC-004 (regression) | server integration (the watcher test now on the shared probe) | `test:integration:prepare`, `test:integration` | ENV-1 | Pass | `API-03-server-integration.log` | `Tests  517 passed`, `exit 0` | — |
| API-04 | AC-001 (S-1), AC-002 | rendered Memory page: a semantic memory link to a missing file | `node autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs --output-dir …` | ENV-2 | Pass | `API-04-rendered-probe.log`, `API-04-probe-rerun/evidence.json`, `API-04-probe-rerun/FU-002-relative-link-missing-file-1440x900.png` | rerun `Pass (41/41 checks)`; SMV-104 `Error!File not found: …/old-page.md` in the tab (the screenshot shows the red error state with the space) | first run: `page.waitForURL: Timeout 30000ms` in the CR-001 step on the new worktree's cold Vite cache (as 576 and 554's delivery saw); rerun passed |
| API-05 | AC-001 (S-2) | packaged app: `event-monitor-file-preview-probe.mjs` N-009 | `pnpm test:e2e:event-monitor-file-preview -- --output-dir …` (builds), then with a trial fix `--skip-build` | ENV-3 | **Not Tested** (probe broken on the base) | `API-05-packaged-probe.log`, `API-05-probe/evidence.json` | N-001 `ReferenceError: require is not defined` (line 129); with a sandbox `require` added, `TypeError: Cannot read properties of undefined (reading 'find')` at line 154 (`root.taskExecutions`) | the probe's fixture imports `~/test-support/runTreeFixtures` (on the base) and the tree no longer has `taskExecutions` (autobyteus-461); this ticket changed only N-009's assertion. The trial fix was reverted; the instance the crash left (`iso-60171-ce9e`) was stopped (data root removed, ports released). FU-002 |
| API-06 | AC-003 (DEC-004), AC-006 | the whole server E2E, calm host | root `env -i … pnpm test:e2e` | ENV-1 | Pass | `API-06-server-e2e-suite.log` | `Test Files  128 passed \| 160 skipped`, `Tests  575 passed`, `ENOTEMPTY occurrences: 0` | the run DEC-004 asks for |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Or Accepted-Risk Part: What You Tried And Why It Could Not Be Proven Here |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | IMP-05/06 (store, three refusals), IMP-04/06 (server query codes), IMP-07 (rendered missing file), API-04 (rendered semantic link) | Proven | — |
| AC-002 | Yes | IMP-06 (store), IMP-07 UNR-002 (`{"error":"x"}` in the editor) | Proven | — |
| AC-003 | Yes | IMP-08 (phases per test, calm and ~60% emulation, before and after; each change by DEC-002 reviewed in the handoff's I-2 table), IMP-12 (control), API-06 (calm whole E2E) | Proven by DEC-004's evidence; **`Accepted Unverified Risk (DEC-004)`** for the eight I-2 files in the stalled-`fseventsd` regime (99–170% CPU) | the regime was absent (`fseventsd` 0.1%), the implementation's emulation reached ~60%, a harder load would disturb other agents on the shared host, and host settings are out of scope; requested from the Solution Designer and decided (DEC-004) |
| AC-004 | Yes | IMP-09, IMP-12 (NC-I3b `INCONCLUSIVE:`), the helper's unit test, API-03 | Proven | — |
| AC-005 | Yes | IMP-10, IMP-03 | Proven | — |
| AC-006 | Yes | API-06 (`ENOTEMPTY` 0), IMP-11 | Proven | — |
| AC-007 | Yes | API-02 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | 95% | every criterion proven; AC-003's untested regime accepted (DEC-004) | — | — |
| Changed-boundary execution directness | 94% | 95% | real server, real page, whole suites | — | — |
| Cross-boundary integration realism and mock gap | 93% | 95% | the store against the real server's errors; two rendered paths | the packaged app path not runnable (FU-002; same renderer and store) | FU-002 |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | calm host, own data | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | refusals, error-shaped text, labels, cleanup, negative controls | — | — |
| User-surface, browser, and desktop-shell confidence | 94% | 95% | rendered error state twice (IMP-07, API-04), spacing visible | phone Files screens not rendered | — |
| Durable regression coverage quality and relevance | 95% | 95% | each change with a negative control; TESTING.md entry | — | — |

- Overall final confidence: 95.0% (simple average)
- Every critical acceptance criterion directly proven, apart from parts only the user can check or accepted as unverified risk: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed: rendered Memory page; packaged app attempted (FU-002)

## Persisted-Data Transition Checks

- `Not Affected`

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No` (no JSON error string kept beside the GraphQL error)
- Durable coverage only for compatibility: `No`

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `TESTING.md` "Test-only runtime CLI settings" | Updated (`b6b8020bf5`) | API-02 | — |

## Dependencies Mocked Or Emulated

None in this stage's cases.

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| trial fix of the packaged probe's fixture loader | Yes | `git checkout --` | reverted |
| isolated instance `iso-60171-ce9e` left by the probe's crash | Yes | `isolated-app stop` | stopped; data root removed; ports released; `list` shows none |
| scripts in `/tmp` | Yes | `rm` | removed |
| `electron-dist/` (the probe's build) | Yes (ignored build output) | left | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, parts only the user can check, or accepted as unverified risk (IDs, with `DEC-*`): AC-003's eight I-2 files in the stalled-`fseventsd` regime: `Accepted Unverified Risk (DEC-004)`
- Evidence decisions requested (criterion, date sent, `DEC-*` once decided): AC-003, 2026-11-22, DEC-004 (decided the same day)
- Next recipient from `get_handoff_rules`: `/delivery_engineer` (direct route, Medium / Low)
- Notes: follow-ups FU-001 (the implementation's: built-server stop time) and FU-002 (the packaged probe broken on the base).
