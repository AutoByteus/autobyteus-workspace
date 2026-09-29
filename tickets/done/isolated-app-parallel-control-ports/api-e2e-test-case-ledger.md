# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports`
- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/api-e2e-revision-record.md`
- Ledger scope and reason it is required: several independent real-process cases, including a long packaged-app probe (interruption risk)
- Last updated: 2026-09-29

## Planned Cases

| Case ID | Case / Journey | REQ/AC | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| UT-001 | Unit suites | AC-001, AC-003, AC-004 | Lifecycle (mocked process/ports) | `node --test autobyteus-web/scripts/isolated-app/__tests__/*.node-test.mjs autobyteus-web/scripts/electron-launch/__tests__/*.node-test.mjs` | 1 | |
| PRB-001 | Real packaged probe LC-001..LC-007 | AC-002, AC-003, AC-004, QR-001 | Real CLI + packaged Electron | `pnpm --dir autobyteus-web test:e2e:isolated-app --app /Applications/AutoByteus.app` | 2 | |
| LIVE-001 | 9333 held → default start elsewhere; browser-automation attach shows only this window; stop by id | AC-001, SCN-001 | Real CLI + app + browser-automation | temporary script | 3 | |
| LIVE-002 | 3 concurrent default starts from 3 worktree cwds; attach each | AC-002, SCN-002 | Real CLI + app + browser-automation | temporary script | 4 | |
| DOC-001 | Doc review + grep | AC-005 | Docs | read + grep | 5 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | UT-001 | 2026-09-29 | Completed | `node --test …` (Node v22.23.1, worktree root) | All pass | 51 tests, 51 pass, 0 fail | Pass | console | PRB-001 |
| 2 | PRB-001 | 2026-09-29T09:44:19Z–09:45:26Z | Completed | `pnpm --dir autobyteus-web test:e2e:isolated-app --app /Applications/AutoByteus.app` (probe TMPDIR `/tmp/abiso-NZ5WDR`) | LC-001..LC-007 pass; production listener unchanged | 7/7 pass, 0 failures; LC-007 control ports 49999/49997/50001 (distinct, none 9333), server 50000/49998/50003, one window each, distinct tab ids, stop by id released ports and removed roots; LC-002 conflict message has 'omit --control-port' + owner id; production listener pid 38852 before = after | Pass | `api-e2e-evidence/prb-001-isolated-app-lifecycle-evidence.json` | LIVE-001 |
| 3 | LIVE-001 | 2026-09-29T09:46Z | Completed | `api-e2e-evidence/live-001.sh`: node holder on 127.0.0.1:9333; private `TMPDIR=/tmp/abac1-9QNJ8Y`; `pnpm isolated-app start --app /Applications/AutoByteus.app`; installed browser-automation launcher attach-only `list-tabs`; `stop <id>` | Explicit 9333 → `CONTROL_PORT_IN_USE`/exit 3; default start succeeds on another port; list-tabs shows exactly this instance's window; stop by id frees everything | Explicit 9333 → `CONTROL_PORT_IN_USE`, exit 3, message 'already in use; omit --control-port to use a free port, or pass another port'. Default start exit 0 → `iso-50346-bf2c`, controlPort 50346, listener `127.0.0.1:50346` held by pid/pgid 88445 (instance leader). list-tabs ok: 1 tab `CCEBAE95…` `/renderer/index.html#/agents`, same as `/json/list`. `stop iso-50346-bf2c` → wasRunning true, ports released, root removed (`forced: true`, see note). Group gone, holder killed, 9333 released | Pass | `api-e2e-evidence/live-001.log` | LIVE-002. Note: stop escalated to force on this instance (pre-existing stop path, unchanged; not port-related) |
| 4 | LIVE-002 | 2026-09-29T09:48Z | Completed | `api-e2e-evidence/live-002.sh`: 3 concurrent `node <worktree cli> start --app /Applications/AutoByteus.app` with cwd/INIT_CWD in 3 different worktrees (`isolated-app-parallel-control-ports`, `add-blogs-module`, `agent-run-id-rename`), one shared private registry `TMPDIR=/tmp/abac2-ZxRT9a`; browser-automation attach-only `list-tabs` per port; stop each by id | 3 distinct control ports, one window each via browser-automation, distinct tab ids, stop by id | All 3 exit 0. Control ports 50496/50497/50498 and server ports 50499/50500/50501 (6 distinct, none 9333). Each listener is on `127.0.0.1:<port>` only, held by that instance's own leader pid=pgid (91471/91472/91473). Each list-tabs returned exactly 1 tab, with distinct tab ids C07F…/DD36…/2D20…. Registry listed 3 running. All 3 stops by id released ports and removed roots; 0 records remain | Pass | `api-e2e-evidence/live-002.log` | CTRL-001 (explain `forced`) |
| 5 | CTRL-001 | 2026-09-29T09:50Z | Completed | `api-e2e-evidence/ctrl-001.sh`: start with explicit free `--control-port` (unchanged path) then stop; start default then stop; same env | Determine whether the stop `forced: true` is related to the port change | Explicit path: forced true, stop 10 s. Auto path: forced false, stop 9 s. The packaged app's graceful quit takes ~9–10 s, at the 10 s `gracefulTimeoutMs` boundary, so the flag depends on timing and not on the port policy. Pre-existing and out of scope | Pass (control; non-blocking observation) | `api-e2e-evidence/ctrl-001.log` | DOC-001 |
| 6 | DOC-001 | 2026-09-29T09:52Z | Completed | Read diffs of `README.md`, `autobyteus-web/docs/electron_packaging.md`, `docs/isolated-app-instances.md`, `skills/autobyteus-isolated-app/SKILL.md`, and external `browser-automation/SKILL.md` (f400434). `grep -n 9333` on those files and `scripts/isolated-app/*.mjs`; `git grep 9333` in both repos and `autobyteus-agents` | Examples use `<controlPort>`/`<instanceId>`, parallel use is covered, no hardcoded 9333 | All examples use `<controlPort>`/`<instanceId>`, with a 'Parallel use'/'Parallel instances' section and recovery text for explicit-port-only `CONTROL_PORT_IN_USE`. The MCP config note says it is fixed to one instance's port. Zero 9333 hits in the target docs or non-test scripts. Remaining repo hits are arbitrary unit-test fixture values only; there is no consumer that depends on 9333 | Pass | this ledger + git diff `affe11bdf`, `f400434` | Reconcile into report |

## Re-entry And Reconciliation

- Last durably recorded event: 6
- Last completed case and result: DOC-001 Pass
- Cases still running, interrupted, or not started: None
- Next case or recovery action: None (all planned cases terminal)
- Interruption, context-compression, or rerun note: —
- Reconciled into execution coverage report: `Yes`. See `api-e2e-execution-coverage-report.md` → Test-Case Ledger Reconciliation
- Reconciliation note for any case missing a terminal result: None
