# API/E2E Execution Coverage Report — standalone-run-messages-565 (autobyteus-565)

## Round

- Coverage investigation: `tickets/in-progress/standalone-run-messages-565/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; code reviewer's CRR-001 Pass (code `56e39312b0`, `ffec4d785d`, `143edb93f8`; documents up to `5b45e9222b`)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - Found by reading, beyond the handoff's list: the two-server suite's RC-05 (solo's view now carries form 5), RC-47 (492's G-1 expectations, narrowed by DEC-005), `assertBothLogs`/`assertLocalLogs` (lines now carry `counterpart`), RC-20 (answers carry `receiverAddress`), and `mobile-shell` MSP-08 ("no Messages for a standalone agent"). All rewritten to the new behaviour.
  - `delegated-copies-large-hub` L-012 was updated but could not run: the probe's seed reads a view field removed by autobyteus-461 before this ticket (FU-003). `cross-scope-agent-mentions` was updated but not run (needs a signed-in Claude/Codex runtime).
  - The phone's "Load more" was added to MSP-08 after its first pass (TESTING.md: phone behaviour on the phone bundle).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-run-messages-565/tickets/in-progress/standalone-run-messages-565/evidence/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | code `5b45e9222b` (implementation `ffec4d785d` + `143edb93f8`; nothing in `src` after); tests as committed in `bae91e808f` | macOS 26 (Darwin 25.5.0), arm64 | Node 22.23.1; this worktree's `autobyteus-server-ts/dist` (`pnpm -C autobyteus-server-ts build`, exit 0), Brief Studio package (`test:integration:prepare`), phone bundle (`build:mobile-web`, `dist/public` and `dist-mobile/public`) | Scripted AGY CLI, no provider keys; `env -i` for E2E; test-owned data roots, ports, HOMEs; probe stacks with their own Nuxt dev and Chrome (playwright-core); machine shared with other worktrees (load 55–75), macOS file events slow or absent (FSEvents probe: none / 2.0 s / 2.8 s) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | all (unit) | server, web, contracts unit; mutation | Reused: IMP-03, IMP-04, IMP-05, IMP-06, IMP-07, IMP-08, IMP-10 | — | Pass (reused) | implementation handoff § Checks Run | — | No `src` change since `ffec4d785d`/`143edb93f8`. IMP-03/IMP-04 failures there are explained (FU-001, FU-002; fixed and rerun in IMP-05). |
| API-02 | — | server and web typechecks (my E2E/probe edits included) | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | ENV-1 | Pass | `API-02-typechecks.log` | `production errors: 0; test-file errors: 1006 in 315 files (baseline 1006 in 315 files)`; web `87 in 37 files (baseline 87 in 37 files)`; `[typecheck] PASS` ×2 | — |
| API-04 | REQ-006 (shared read), all | whole server integration suite | `pnpm -C autobyteus-server-ts test:integration` | ENV-1 | Pass for the change; 8 environment failures | `API-04-excerpt.log`, `API-04-server-integration.log.gz` | `Tests  8 failed \| 506 passed \| 69 skipped (583)`; every failure reads `ENVIRONMENT: the OS delivered no file event within 10 s` or `INCONCLUSIVE: the watcher saw no change; a fresh fs.watch stream did` (or a 60 s hook in `package-auto-refresh`) | The 8 are in `file-system-watcher` (7) and `package-auto-refresh` (1), which report their own cause (macOS FSEvents under load); neither reaches the changed code (handoff FU-002 records the same machine state). |
| API-05 | all | whole ungated server E2E | `env -i PATH="$PATH" HOME=<fresh temp> TMPDIR="$TMPDIR" pnpm test:e2e`; the 21 failed files rerun together (API-05b) | ENV-1 (`bae91e808f`) | Pass for the change; environment failures outside it remain | `API-05-excerpt.log`, `API-05-server-e2e.log.gz`, `API-05b-rerun.log.gz` | Whole run `Tests  16 failed \| 547 passed \| 729 skipped (1292)`; rerun `Tests  13 failed \| 104 passed`, 7 of the 21 files pass alone; every failure is `Test timed out in 5000ms`, `Hook timed out in 10000ms`, a file-event wait (`Timed out waiting for FILE_SYSTEM_CHANGE`, `invalid Team diagnostic: not met within 30000 ms`), E-008's 10 s stop bound, a CLI probe answering `UNKNOWN`/`null` late, or a count that follows a timed-out test in the same file (`request-origin` 20 vs 14) | Load 51–57 during the run, 66–89 during the rerun; FSEvents `close()` 1.8–2.0 s. No failing file reaches participant messages, message logs, counterparts or cross-node messages (searched). The same files failed the same ways on autobyteus-492's branch, which lacks this change (`tickets/done/list-running-agents/follow-ups.md` FU-005, open). `node-access-model` (its `sender.address` body) passed here; the gated suites I edited or whose helper I changed ran in API-11. `agent-initiated-collaborators` (reads participant lists; not edited) is gated on real runtimes and was not run. |
| API-06 | AC-002, AC-003, AC-004, AC-005, AC-006, REQ-002 … REQ-007, forms 1–7, RU-1 … RU-4 | two built servers (alpha, beta) through capturing proxies, plus gamma/delta/epsilon and zeta; scripted AGY agents calling the real tools; run-view WebSockets; GraphQL stored reads; message logs on disk | `env -i PATH="$PATH" HOME=<fresh temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs REMOTE_E2E_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-06/API-06-vitest.log`, `API-06/API-06-receipt.json`, `API-06/remote-two-server-beta-server.log`, `API-06/remote-two-server-alpha-server.log.gz` | `Tests  50 passed (50)`. Receipt: `cases["RC-05 565"]` (counterparts `{"beta": {"address": "/delegator", "nodeId": <alpha>}, "alpha": {"address": "/publisher", "nodeId": <beta>}}`, live parties with `"nodeName": "beta-node"`, stored `{"kind": "remote", …, "address": "/publisher", "nodeName": "beta-node"}` on alpha and `"nodeName": "alpha-node"` on beta); `cases["RC-48"].ru1Counterparts`, `.scoutCounterparts`, `.pmCounterparts` (form 6 both ways); `cases["RC-47"].g1.logs.live` `{"teamViewUnrelated": 0, "otherViewUnrelated": 1, "soloViewUnrelated": 1, "workerViewUnrelated": 1, "g1ViewUnrelated": 0, "g1ViewRelated": 1}` and `.stored` (same rule); `cases["RC-50"]` `ownPages [{"size": 50, "hasMore": true}, {"size": 9, "hasMore": false}]`, `ownLog: 59`, `matePages [50/true, 6/false]`, `elderCounterparts [{"kind": "run", …, "address": null}]`, `linkerCounterparts [{"kind": "remote", …, "address": "/publisher", "nodeName": "beta-node"}]`; `cases["RC-20"].counts.receiverAddress: 34`; `cleanup` all clean | First run passed. Rewritten to the new behaviour (not loosened): every forged/expected cross-node body carries `sender.address` (RC-01/03/08/48, RC-06's expected body and its answer's `receiverAddress`); both log helpers require the `counterpart` record on unrelated and cross-node lines (exact keys); RC-47's G-1 expectations follow DEC-005 (own views and own stored reads show form 4; the Team view and the ancestor `g1` view do not); `teamTab` reads the page shape. Added: RC-05/RC-48 live and stored checks, RC-48's form-7 check on beta's Team view (live and stored), RC-50. |
| API-07 | AC-001 (desktop), AC-002, AC-003, AC-004 | desktop window: probe-owned alpha + beta (built `dist`), `nuxt dev`, Chrome 1440 px | `pnpm -C autobyteus-web test:e2e:standalone-messages --output-dir=<dir>` (new probe) | ENV-1 | Pass | `API-07/API-07-probe.log`, `API-07/standalone-messages-probe.json`, `API-07/SMP-01-quiet-messages-empty.png`, `SMP-02-first-page.png`, `SMP-02-all-loaded.png`, `SMP-02-remote-detail.png`, `SMP-03-live.png`, `SMP-04-load-more-with-live.png`; run 1: `API-07/run1/` | `SMP-01: Pass` … `SMP-04: Pass`, `standalone-messages probe: Pass`, `browserErrors: []`; SMP-01 `tabsAtOpen` "Messages" present, "Activity" selected, "No messages yet"; SMP-02 `firstPage: 50`, `total: 58`, remote row chip `beta-node`, detail "Address: /project_task_manager … Node: beta-node"; SMP-03 `before: 58, after: 60` (reply with chip, local without); SMP-04 `reloadFirst: 50, total: 61, rows: 61`; `SMP-03-live.png`: the Messages tab with direction icons and the chip | Run 1: SMP-01 and SMP-04 passed; SMP-02/03 failed in the probe. It clicked a tab before the newly selected run's own tab (each standalone run keeps its own choice, default Activity: handoff deviation 8) had settled (`run1/SMP-02-fail.png`: the PM selected, Activity shown). The probe now waits for the URL to name the run and for the tab to be selected. Run 2: all pass. |
| API-08 | AC-001 (phone), AC-002, AC-004 (phone) | phone bundle served by alpha at `/mobile`, Phone Access pairing, 390×844 | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<dir> --cases=MSP-08` | ENV-1 | Pass | `API-08/API-08-mobile-shell.log`, `API-08/mobile-shell-probe.json`, `API-08/MSP-08-standalone-messages-first-page.png`, `API-08/MSP-08-standalone-messages.png` | `[mobile-shell] MSP-08 Pass`; `plainItems ["Artifacts", "Files", "Messages", "Activity", "Settings"]`, `plainFirst: 50`, `plainMoreShown: true`, `rowCount: 57`; rows `To publisher beta-node … PEER-NOTE-565` (chip `beta-node`) and `From fact checker … PLAIN-NOTE-565` (no chip) | Replaces "no Messages for a standalone agent" (DEC-001). The phone pages too: 50, Load more, the rest, newest first. |
| API-09 | REQ-006, AC-005 (Team/Org Messages), BEH-006 | desktop window and phone on a probe-owned stack (scripted AGY) | `pnpm -C autobyteus-web test:e2e:large-runs-load-less --output-dir <dir>`; seed of `test:e2e:delegated-copies-large-hub --seed-to <dir> --teams 12 --unrelated 0` | ENV-1 | Pass (LRL); L-012 Not Tested; cross-scope Not Tested | `API-09/API-09-large-runs-load-less.log`, `API-09/*.png`; `API-09-large-hub-seed.log` | `Summary: 5 Pass, 0 Fail` (LRL-003: "a message sent while the Team tab loads, and while the stream is down, appears once; the list equals the stored log"); seed `SEED Fail: Cannot read properties of undefined (reading 'filter')` | The Team tab still equals the stored list, live and after reload (with the new assertion that the list fits one page). L-012 (the hub's Messages tab, first page plus the live report) cannot run: the probe's seed reads `view.execution_tree.taskExecutions`, removed by 461 before this ticket (FU-003). `cross-scope-agent-mentions` (page-aware host read) needs a signed-in Claude/Codex runtime; its edit is the same paging loop that ran in API-06 and API-07. |
| API-10 | — | tracked imports | `python3 scripts/check_repository_artifact_hygiene.py --only tracked-imports` | ENV-1 (`bae91e808f`) | Pass | `API-10-tracked-imports.log` | `Tracked-import check passed. Tracked files scanned: 100135` | — |
| API-11 | REQ-006 (past participants as `counterparts` `kind: "past"`), the changed helper | built servers, scripted AGY (gated `RUN_AGY_FAILURE_E2E`) | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts tests/e2e/projects/closed-run-attachments.e2e.test.ts --no-watch` | ENV-1 (`bae91e808f`) | Pass | `API-11-gated-helper-suites.log` | `✓ OT-1 …`, `✓ OT-2 …`, `✓ OT-3 …`, `✓ CRA-1 …`, `Tests  4 passed (4)` | Skipped in API-05 (gated); run here because I rewrote OT's `pastParticipants` assertions and the `managerTab` helper both read. |
| API-12 | build (fresh start) | fresh clone; the desktop job's install and TypeScript steps; the tracked contracts `dist/` | `git clone --no-local`, `git checkout bae91e808f`, `pnpm install --frozen-lockfile`, `cd autobyteus-web && pnpm typecheck && pnpm prepare-server`, then `pnpm -C autobyteus-collaboration-stream-contracts build` and `git status` | ENV-1 | Pass | `API-12-fresh-start.log`, `API-12-fresh-start-full.log.gz` | `[typecheck] production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)`, `[typecheck] PASS`, `Server files prepared successfully!`; the contract packages' `git status` empty after a fresh build | The contracts package, `autobyteus-web/generated/graphql.ts` and `autobyteus-web/package.json` are build inputs. The committed contracts `dist/` equals a build of its source. Guards, `generate:electron`, packaging, signing and other OSes were not run (they read nothing more of this change). The clone was removed. |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-07 SMP-01 (a run that never delegated: "Messages" offered, opens on Activity, "No messages yet"); API-08 (phone ⋮ Messages for a plain standalone run); API-06 (every standalone root in RC-47/48/50 answers a stored read); application-owned run without the entry: API-01 (IMP-06 `MobileRunScreen.spec`: application-owned → no Messages; design DS-004: no collaboration view exists) | Proven | — |
| AC-002 | Yes | API-06 RC-05 (form 5), RC-48 (form 6), RC-47 (form 4, task agent's own), RC-50; API-07 SMP-02 (task agent report, unrelated run, beta's PM with chip, direction icons, details); API-08 (phone chip) | Proven | Founder's own PM (2,506 messages, `ryan-ai-linux`): his data and nodes, not testable here |
| AC-003 | Yes | API-06 RC-05, RC-47, RC-48, RC-50 (each live message once in each own view, with parties); API-07 SMP-03 (rendered, no reload, once, remote with chip) | Proven | — |
| AC-004 | Yes | API-06 RC-50 (50 + rest, newest first, no repeat, live during Load more not in the older page); API-07 SMP-02, SMP-04 (rendered paging, reload brings the newest page, live during Load more once); API-08 (phone); API-01 IMP-10 (2,500-message first page 50 rows, 5.5–9.3 ms) | Proven | — |
| AC-005 | Yes | API-06 RC-50 (Team member over 50: its rows unchanged, form 7 absent), RC-48 (beta's Team view and stored read without remote messages), RC-06/RC-07/RC-22 Team and Org views; API-09 LRL-001…005; API-01 (step-1 pins) | Proven | — |
| AC-006 | Yes | API-06 RC-05/RC-48 (`counterpart {address, nodeId}` on both nodes' lines; rows named with chip), RC-50 (older unlinked line: run ID, `address: null`, `kind: "run"`, no chip; older linked line: `/publisher` on `beta-node` from the Task entry), RC-20 (`sender.address` on every message, `receiverAddress` on 34 accepted answers) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 96% | API-06 (every form, both nodes, live and stored, paging, older lines), API-07, API-08, API-09, API-01 | The application-owned run's absent entry is proven at unit level and by the design's path (no collaboration view exists), not on a real stack | An application-owned run in a browser probe |
| Changed-boundary execution directness | 95% | 96% | Built servers over real HTTP between processes; the real run-view sockets, GraphQL page reads, the logs on disk; the rendered desktop panel and phone view on real data | — | — |
| Cross-boundary integration realism and mock gap | 95% | 96% | Two and up to five server processes, scripted AGY processes over Agent Tools MCP; the browser against a probe-owned two-node stack; only inference scripted | Real paired user nodes not used (TESTING.md rule) | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 95% | Built `dist`, phone bundle, Node 22, clean env, pairing by invite, owner and peer credentials, fresh-start build with the contracts `dist/` reproduced; older-release lines synthesized in the released shape in test-owned logs | The machine's load made suites that do not reach the change time out (492 FU-005) | Rerun those suites on a quiet machine (not evidence about this change) |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | Live during Load more, reload to the newest page, ties ordered by one rule (unit), older unlinked/linked lines, form 7 exclusion, every refusal and restart case of the suite still green with the new fields | A failed page in a real browser (unit-covered: the store's error and retry) | — |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | API-07 desktop (tab, default Activity, empty state, chip, details with node, Load more, live once, reload), API-08 phone bundle (⋮ Messages, chip, Load more), API-09 Team tab unchanged; screenshots reviewed | The Electron shell itself not opened (the panel is renderer code; no shell change) | — |
| Durable regression coverage quality and relevance | 95% | 95% | RC-05/47/48/50 and RC-20 assertions, the new desktop probe, MSP-08, page-aware probe reads; all assert exact shapes, rewritten not loosened | L-012 and the mentions probe's edits could not run (FU-003; real runtime) | — |

- Overall post-repository confidence: 94.6% (before the browser journeys and API-12)
- Overall final confidence: 95.4%
- Calculation method: simple average of the seven categories.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: suites outside the change could not be shown green on this loaded machine (492 FU-005); the large-hub probe's L-012 cannot run until FU-003.

## Broader Validation Decision (Mandatory)

- Decision: `Required` → done (API-07, API-08, API-09)
- Execution mode: `Browser` (desktop window and phone bundle against probe-owned two-node stacks) and `Worker or Distributed` (API-06)
- Confidence gap it addresses: the rendered tab, chip, Load more and live rows on real data; two-node behaviour over real HTTP (UNK-001).
- If `Blocked`: N/A

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No` (peers run one release, DESIGN.md rule 9: every cross-node body now requires `sender.address`, and the suite's forged bodies were updated rather than tolerated)
- Legacy retention observed: `No` (`pastParticipants` is gone from every read the suites make; `publishToViews` behaviour replaced by the scope rule, as RC-47 shows)
- Coverage kept only for compatibility: `No`

## Persisted-Data Transition Checks

- Approved decision: `Directly Usable — No Migration`
- Representative existing data: two lines in the released seven-field shape (no `counterpart`), appended to the logs of two stopped, test-owned runs (RC-50).
- Followed without migration: `Yes`. The new reader reads them; the unlinked one by run ID without a chip, the linked one named from its Task entry. New lines carry `counterpart` exactly as the design says (RC-05, RC-47, RC-48 exact keys).
- Version-specific branch or fallback: `No`

## Durable Coverage Changed In The Codebase

- Added, updated or removed: `Yes` (commit `bae91e808f`)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`: RC-50; RC-05 and RC-48 live/stored/counterpart checks; RC-48 form 7 | Added | API-06 | — |
| same file: wire bodies with `sender.address` (RC-01/03/06/08/48), `assertBothLogs`/`assertLocalLogs` (`counterpart`), RC-47 G-1 (DEC-005), RC-20 (`sender.address`, `receiverAddress`), `teamTab`/`allPages` (page shape), header | Updated | API-06 | RC-47's "unrelated messages in no run view" for the own views is replaced by "in each own view once" (DEC-005, REQ-002/004); the Team and ancestor expectations stay |
| `autobyteus-server-ts/tests/e2e/node-access/node-access-model.e2e.test.ts`, `run-history/open-task-tree-upgrade-startup.e2e.test.ts`, `helpers/built-studio-roots.ts` | Updated | API-05, API-11 | `pastParticipants` → `counterparts` with `kind: "past"` |
| `autobyteus-web/tests/e2e/standalone-messages-probe.mjs` (+ `package.json` script `test:e2e:standalone-messages`) | Added | API-07 | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` MSP-08 | Updated | API-08 | "no Messages for a standalone agent" removed (DEC-001); replaced by Messages present, rows, chip, Load more |
| `autobyteus-web/tests/e2e/large-runs-load-less-cases.mjs`, `cross-scope-agent-mentions-live-probe.mjs`, `delegated-copies-large-hub-probe.mjs` | Updated | API-09 | — |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model inference | Scripted AGY CLI (`CALL_TOOL`, `CALL_TOOLS`) | TESTING.md: no provider credits for a transport change | The agents' choices are scripted |
| The founder's PM and `ryan-ai-linux` | Test-owned nodes and runs | TESTING.md: never the user's data or nodes | His real 2,506-message list is his to look at |
| Older-release message lines | Synthesized in the released shape in test-owned logs | No released build runs here; TESTING.md: small synthesized data | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Two-server suite stacks | Yes | suite `afterAll` | `rootRemoved: true`, `serversStopped: true`, `leftoverAgy: []`, `errors: []` |
| Probe stacks (standalone-messages, mobile-shell, large-runs-load-less, large-hub seed) | Yes | each probe's `finally` | `frontendExited: true`, `serversLeft: 0`, `rootRemoved: true`; the failed seed's data removed (`/tmp/api565/hub-seed`) |
| Fresh clone | Yes | `rm -rf` | removed |
| Untracked `*/dist/` build outputs | No | left alone | — |
| Architecture reviewer's uncommitted edits | No | left alone, not staged | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: AC-002's look on the founder's own PM and node (his data; TESTING.md forbids testing on it). Everything else proven.
- Next recipient: code reviewer (proportional test-code review on the reviewed route).
- Notes: no product defect found. Test-side corrections: the old-shape assertions listed in the handoff and those found by reading (RC-05, RC-47, RC-20, the log helpers, MSP-08), and my own probe's tab timing (run 1 of API-07). Environment-only failures are recorded with their measured causes (FSEvents, load) and 492's FU-005; FU-003 records the large-hub probe's stale seed.
