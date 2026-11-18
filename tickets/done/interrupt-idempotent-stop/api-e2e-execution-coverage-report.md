# API/E2E Execution Coverage Report — autobyteus-533 (interrupt-idempotent-stop)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1; CRR-002 Pass from the Code Reviewer (code `a0d81bbe18`, code through `71f9a5d13e`).
- Prior round reviewed: None.
- Deviations from the investigation's plan, and why:
  - The probes' wire carries every `/ws/` socket of the page, not only the run streams: a run's status also reaches the page through `/ws/run-status`, and a path that slowed or dropped only the run streams let it through (API-07 run 1). Planned as run streams only.
  - "Not connected" also covers opening a working run while the path is down (SGD-07/08 `a2`): after a drop, a standalone run's composer sometimes stops offering Stop, so a drop alone does not always give a press.
  - A refusal is emulated by the wire answering the page's Stop with the node's failed-answer shape (the Stop never reaches the node): no scripted runtime refuses an interrupt. First tried by rewriting the node's real `accepted` answer; that races with the real stop's status (the run stops anyway), so it could not show "Stop offered again".
  - API-09 ran the whole `test:e2e:mobile-shell` (79 cases), not only MSP-75…79, because the phone's socket route that every phone case uses now passes the wire.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop/tickets/in-progress/interrupt-idempotent-stop/evidence/api-e2e/` (index: `evidence/api-e2e/README.md`).

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | code `a0d81bbe18`; worktree HEAD `6b433e538d` (docs) | macOS 26.5.2, Node v22.23.1 | server test suites (vitest) | shared machine, load average 50–80, `fseventsd` 140–160 % CPU |
| ENV-2 | code `a0d81bbe18`; probe commits per case | macOS 26.5.2, Node v22.23.1, headless Chrome (playwright-core 1.58.2) | built server `dist` of this worktree + `nuxt dev` (desktop renderer), scripted AGY CLI | en-US, 1440×1000, temp data root and HOME, probe owner credential |
| ENV-3 | code `a0d81bbe18`; probe `6744d786c6` | as ENV-2 | two built servers (alpha, beta) paired by invite; phone bundle `build:mobile-web` served by alpha at `/mobile`; desktop window `nuxt dev` | phone 390×844 touch, paired through Phone Access on a private-network origin |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-003…AC-005, AC-011 | Server unit | Reused IMP-03 + IMP-11 | — | Pass | — | — | Server code changed since IMP-03 only in the native backend and its test, which IMP-11 reran at `71f9a5d13e` (`git diff --name-only ff16e5de85 HEAD -- autobyteus-server-ts`). IMP-03's five unrelated failures are four folder-watcher timeouts with their FSEvents measurement (as API-05b finds again) and one migration timeout under load that passes alone |
| API-02 | AC-006…AC-009, QR-001 | Web unit | Reused IMP-07; `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run stores/__tests__/agentOrgRetainedRecovery.spec.ts` (changed after IMP-07) | ENV-1 | Pass | `API-02-web-org-retained-recovery-spec.log` | `Tests  20 passed (20)` | Web source unchanged since `1f92302096`; IMP-07's one unrelated timeout is FU-004 |
| API-03 | — | Both typechecks | Reused IMP-11 | — | Pass | — | — | No source change since; the new `.mjs` probe files are in no typecheck include (`autobyteus-web/tsconfig*.json`, no `allowJs`) |
| API-04 | AC-006…AC-009, QR-003 | Fixture browser probe | Reused IMP-08 | — | Pass | — | — | Web code unchanged since `45cae5ebd2` |
| API-05 | AC-001, AC-003, AC-004, AC-011 | Server integration (whole) | `pnpm -C autobyteus-server-ts test:integration:prepare && pnpm -C autobyteus-server-ts test:integration` | ENV-1 | Pass for the changed scope; 16 failures in 2 folder-watcher files, cause: FSEvents (API-05b) | `API-05-server-integration.log` | `Test Files  2 failed \| 86 passed \| 20 skipped (108)`; `Tests  16 failed \| 490 passed \| 69 skipped (575)`; the 16 are all in `package-auto-refresh.integration.test.ts` and `file-system-watcher.integration.test.ts` | Every Stop-related integration file passed (`agent-websocket`, Team stream files). The diff touches no watcher code (`git diff --name-only bd2053ee51 HEAD -- autobyteus-server-ts/src` has no watch/package path) |
| API-05b | — | FSEvents measurement (cause of API-05's 16 and of API-06's watcher files) | `node /tmp/api533/fsevents-measure.mjs` (write a file in a watched temp folder; time to the event; time `close()` of the recursive watcher blocks), twice | ENV-1 | Pass (cause measured); the watcher files' rerun Not Tested | `API-05b-fsevents-and-watcher-rerun.log` | 12:12 UTC `[{"writeToEventMs":"none in 10000 ms","closeBlockMs":1203},{"writeToEventMs":6182,"closeBlockMs":4819},{"writeToEventMs":"none in 10000 ms","closeBlockMs":3566}]`, `fseventsd` `143.3` %; 17:06 UTC `"none in 10000 ms"` twice, `fseventsd` `167.4` % | TESTING.md "File watching on a busy Mac". FSEvents stayed broken all day (other agents' load), so a rerun of the watcher files cannot pass here; they do not touch this ticket's code. Rerun them on a quiet machine |
| API-06 | AC-001…AC-004, AC-011 | Server E2E (whole, scripted AGY gate) | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm test:e2e` | ENV-1 | Pass for the changed scope; 21 files failed on the environment (API-06b…e) | `API-06-server-e2e-whole.excerpt.log` (full: `.log.gz`) | `Test Files  21 failed \| 175 passed \| 80 skipped (276)`; `Tests  16 failed \| 866 passed \| 389 skipped (1271)`; `✓ tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts (3 tests)`; most failures `AgyDiscoveryError: Antigravity model discovery timed out` or `Hook timed out in 10000ms` | 1 h 54 min, ~80 files in parallel at load 70–80. `stop-nothing-to-stop` failed only at its run's creation (`AgyDiscoveryError`, line 111), before any Stop; its Team member test passed. Every suite that sends a Stop and passed asserts `accepted` (searched: none asserts a non-accepted Stop answer) |
| API-06b | AC-001…AC-004, AC-011 | The 21 failed files, one at a time | same env, `pnpm -C autobyteus-server-ts exec vitest run --fileParallelism=false <21 files>` | ENV-1 | 13 pass; 8 fail on the environment | `API-06b-server-e2e-failed-files-rerun.excerpt.log` (full: `.log.gz`) | `Test Files  8 failed \| 13 passed (21)`; `✓ tests/e2e/agent-run/stop-nothing-to-stop.e2e.test.ts (2 tests)` | The 8: AGY discovery or hook timeouts (`agy-background-task-transport`, `work-journal-restore-transport`, `task-copy-idle-lifetime`, `runtime-switch-members-extended` EX-05 `MODEL_LIST_UNAVAILABLE`), a 5 s timeout (`project-task-search`), FSEvents (`agent-package-definitions-live-refresh`, `registered-package-definition-edit`: watcher waits and a reload's `DEFINITION_REVISION_CONFLICT`), and `open-task-tree-upgrade-startup` OT-2 (see API-06d) |
| API-06c | AC-011 | The 6 non-watcher files still failing, at load ~40 | same, 6 files | ENV-1 | 3 pass; 3 fail | `API-06c-server-e2e-load-bound-rerun.log` | `Test Files  3 failed \| 3 passed (6)`; `✓ … task-copy-idle-lifetime …`, `✓ … runtime-switch-members-extended-built-server …`, `✓ … project-task-search …` | The 3 that pass confirm load as their cause |
| API-06d | AC-011 | The 3 still failing, at load ~20 | same, 3 files | ENV-1 | 3 fail (causes outside this ticket) | `API-06d-server-e2e-quiet-rerun.log` | `agy-background-task-transport`, `work-journal-restore-transport`: `Hook timed out in 10000ms` (the `afterAll` closing an in-process server); `open-task-tree-upgrade-startup` OT-2 `reading the trees wrote nothing: expected { …(122) } to deeply equal { …(118) }` (the extra files are `episodic/*/catalog.md`) | OT-2 is stale on the base: another ticket found it failing on base `0570c47fd9` and fixed the test in `8d14de45e3` ("leaves 493's derived episodic catalog out"), on `codex/follow-ups-of-461-500`, not in this base (`git merge-base --is-ancestor 8d14de45e3 HEAD` → not an ancestor); OT-3 follows in the same server. The two `afterAll` timeouts were also recorded today on `codex/follow-ups-of-461-500`, which has no autobyteus-533 change (that run's journal: `agy-background-task-transport … -> Error: Hook timed out in 10000ms.`, `work-journal-restore-transport … (1 test \| 1 failed)`) |
| API-06e | AC-011 (AGY daemon turn Stop) | `agy-background-task-transport`'s Stop test alone | same env, `vitest run tests/e2e/runtime/agy-background-task-transport.e2e.test.ts -t 'keeps Stop during a daemon turn' --reporter=verbose` | ENV-1 | Pass | `API-06e-agy-background-stop-test.log` | `✓ … keeps Stop during a daemon turn as an interruption, never a background success`; `Tests  1 passed \| 1 skipped (2)` | The one failing file that sends a Stop: its Stop test (`state: "accepted"`, `TURN_INTERRUPTED`) passes; its other test fails only on AGY discovery |
| API-07 | AC-002, AC-006, AC-007, AC-008, AC-009, AC-010, QR-001, QR-003 | Desktop renderer, real stack, loopback; standalone run + Team member | `pnpm -C autobyteus-web test:e2e:stop-generation --output-dir <evidence>/API-07-desktop-loopback` (gaps 0,60,150,300,600) | ENV-2, probe `ed921d57c6` | Pass | `API-07-desktop-loopback/evidence.json`, `SGD-0*.png`, `backend.log` | `"result": "Pass"`; each `SGD-01`/`SGD-02` round `"stops": 1`, `"acks": ["accepted"]`, `"toasts": []`, a `["…", "Stopping…", true, false]` entry; `SGD-03`/`SGD-04` `"nodeAnswers": ["accepted"]` with `"labelWhenPressed": "Stop generation"`; `SGD-07` `"Could not stop Stopper a202. Please try again."`, `SGD-08` `"Could not stop lead. Please try again."`; `"sends": 20`, `"sendStalls": []`; cleanup `"dataRootRemoved": true` | Run 1 at `f8fad0fc6a` (kept, `API-07-desktop-loopback-run1-harness-gap/`) failed SGD-03 and SGD-05: the status reached the page through the unrouted `/ws/run-status` and the page closed the offline run's stream before my delayed answer arrived. Fixed in the wire (`ed921d57c6`); the page's behavior was correct in both (no toast; Stopping ended with the status) |
| API-08 | AC-008, AC-010 (remote path) | As API-07, 150 ms each way | same `--latency-ms 150 --gaps 0,150,300,450,700,1000` | ENV-2, probe `28de6a0ee9` | Pass | `API-08-desktop-latency-150ms/evidence.json`, `console.log`, screenshots | `"result": "Pass"`, `"latencyMs": 150`; `SGD-05`/`SGD-06` `a.stoppingAcrossDrop: true`; `SGD-01` 3 of 6 second presses on `"Stopping…"`; no toast in SGD-01…06 | Run 1 at `ed921d57c6` (kept, `API-08-desktop-latency-150ms-run1/`): SGD-06 the Team stream entered its explicit recovery after a path blip (FU-005), so Stop answered "Stop was not sent…" (correct for a closed stream); SGD-07 the probe pressed a button that had just turned disabled (harness; guarded in `28de6a0ee9`); SGD-08 followed from SGD-06. Two further 150 ms trial runs and this rerun passed |
| API-09 | AC-003, AC-004, AC-006, AC-007, AC-009, AC-010, QR-001, QR-003 | Phone bundle on alpha + beta: standalone run, Team member, Org member, Org Team member, delegated agent, delegated Team member, peer run; and every other phone case | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-09-mobile-shell` | ENV-3 | Pass (79/79 cases); probe verdict Fail on one browser error in MSP-50 (FU-007) | `API-09-mobile-shell/mobile-shell-probe.json`, `MSP-7*-*.png` | `"MSP-75"…"MSP-79"` `"result": "Pass"`; per kind `rounds.gap0`/`gap150` `"stops": 1`, `"acks": ["accepted"]`, `"toasts": []`; `stale.nodeAnswers` `["accepted"]`; refusals `"Could not stop Fact Checker. …"`, `lead`, `planner`, `reviewer` (Org Team), `release notes writer`, `reviewer` (task team), `publisher`, each the name the phone's run screen shows (`screen.name`); not connected `"Stop was not sent: not connected to the node. Check the connection and try again."` (standalone, Team member, peer); Org member `notConnected.pressable: false`, `toasts: []`; MSP-79 `betaDown.screen.subtitle: "Not reachable"`, `tapped: false` | The one unexpected browser error: MSP-50 desktop window "Failed to open run: … changed before projection commit." (run-open race guard, not in the diff, FU-007); MSP-50 itself passed and API-09b passes alone |
| API-09b | — | MSP-50…52 alone | `… test:e2e:mobile-shell --cases=MSP-50,MSP-51,MSP-52` | ENV-3 | Pass | `API-09b-mobile-shell-code-wrap-rerun/mobile-shell-probe.json` | `"result": "Pass"`, no unknown browser error | Rule 9 rerun of the case whose browser error failed API-09's verdict |
| API-10 | REQ-007 (CG-07); AC-002, AC-006 (80 rounds) | Desktop real stack, loopback: 40 Stop rounds per kind, each followed by the next send | `… test:e2e:stop-generation --gaps <0,60,150,300,600 ×8> --cases SGD-01,SGD-02` | ENV-2, probe `6744d786c6` | Pass (CG-07 reproduced, cause found) | `API-10-cg07-send-after-stop/evidence.json`, `stall-agent-SGD-01-gap60#21-1.png` | 80 rounds, each `"stops": 1`, `"toasts": []`; 30 second presses landed on `"Stopping…"`; `sendStalls[0].frames`: `380 L27 up … SEND_MESSAGE`, `412 L27 down … ERROR … SESSION_NOT_READY "Session is not ready yet. Retry after CONNECTED message."`, `507 L27 down … CONNECTED`; `"draft": ""` | 1 of 80 sends: the page sent on a just-opened stream before the node's `CONNECTED`; the node refused it and the page dropped it silently. `ensureAgentStreamConnected` waits for the socket, not the session, on the base too: FU-006. The send after a Stop opens a new stream, which is why CG-07 met it there |
| API-11 | — | Scratch removal | `git rm autobyteus-web/tests/e2e/interrupt-twice-repro-scratch.mjs` | — | Pass | commit `f8fad0fc6a` | the file is gone | Replaced by `stop-generation-probe.mjs`; the server scratch `interrupt-twice-repro.e2e.test.ts` was already replaced by `stop-nothing-to-stop.e2e.test.ts` in implementation |
| API-12 | — | Web guards with the new files | `pnpm -C autobyteus-web guard:web-boundary`; `guard:localization-boundary` | ENV-1 | Pass | `API-12-web-guards.log` | `[guard:web-boundary] Passed.`; `[guard:localization-boundary] Passed.` | |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-06b (`stop-nothing-to-stop`, idle run, 2/2), API-01, API-05 | Proven | — |
| AC-002 | Yes | API-06b (Stops at 0, 50 and 250 ms: both `accepted`, one turn end); API-07/08/10 (one Stop sent per double press, node answers `accepted`, the turn ends; 102 desktop rounds) | Proven | — |
| AC-003 | Yes | API-06b (a Stop to an AGY run the first Stop took offline); API-07/08 SGD-03/04, API-09 stale cases (`nodeAnswers: ["accepted"]` for a run with nothing to stop); API-01 | Proven | — |
| AC-004 | Yes | API-09: Team member, Org member, Org Team member, delegated agent, delegated Team member, peer run on beta — stale Stop `nodeAnswers: ["accepted"]` on `/ws/agent`, `/ws/agent-team`, `/ws/agent-org`, `/ws/peer-run`; API-06; API-01 (collaboration stream unit) | Proven | — |
| AC-005 | Yes | API-01 (IMP-03, IMP-11: Claude, Codex, native turn-gone answers through the real interrupt state) | Proven (unit; live paid runtimes not run) | — |
| AC-006 | Yes | API-07, API-08, API-09, API-10 (Stopping seen, `aria-busy`, disabled; one Stop; Send afterwards), API-04 | Proven | — |
| AC-007 | Yes | API-07/08 SGD-03/04, API-09 stale cases (no toast; "Stopping…" ≈1.4 s until the status) | Proven | — |
| AC-008 | Yes | API-07/08 SGD-05/06 (a) Stop delivered then the path drops: Stopping across the reconnect, then Send; (b) Stop lost: Stop offered again after the rebind; no toast | Proven | — |
| AC-009 | Yes | API-07/08 SGD-07/08, API-09 (every kind): refusal → one "Could not stop <shown name>. Please try again."; not connected → one "Stop was not sent: …"; no run id or internal word (`internalWords`); API-02/API-04 for zh-CN | Proven (the refusal is emulated at the page's socket in the node's own answer shape; zh-CN by unit) | — |
| AC-010 | Yes | API-07, API-08, API-10 (desktop), API-09 MSP-75, MSP-76 (phone: standalone, Team member) | Proven | — |
| AC-011 | Yes | API-05, API-06…06e (every Stop-sending suite that runs here passes; `agy-interrupt-resend-transport`, the daemon Stop test), API-09 (79 phone cases), API-01, API-02 | Proven for the changed scope (the environment-bound files above do not exercise the changed code) | — |
| QR-001 | Yes | API-07/08/09 message texts checked for run ids and internal words | Proven | — |
| QR-003 | Yes | API-07/08/09/10 button traces: `["…", "Stopping…", true, false]` (aria-busy, disabled, label) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | every AC with a direct case (Acceptance-Criteria Proof) | AC-005 by unit only (live Claude/Codex/native); the refusal emulated at the page's socket | A live runtime turn-gone race (paid, artificial timing) |
| Changed-boundary execution directness | 80% | 95% | API-07…10 drive the composer through real `/ws/agent`, `/ws/agent-team`, `/ws/agent-org`, `/ws/peer-run` on built nodes; API-06b the node | `/ws/agent-collaboration`'s Stop has no web sender, so only its unit test drives it | — |
| Cross-boundary integration realism and mock gap | 75% | 94% | two paired nodes, the phone bundle, the desktop renderer, the scripted AGY runtime | the refusal is the wire's answer in the node's shape (the node's own refusal is unit- and integration-proven, IMP-03, IMP-04); HTTP is not slowed or dropped by the wire | A scripted runtime that can refuse an interrupt |
| Environment, configuration, identity, and fixture fidelity | 85% | 93% | built `dist` of this worktree, owner credentials, Phone Access pairing, temp data roots; Node 22 | the machine's load (40–80) and broken FSEvents left 5 unrelated E2E files (2 package-watcher, 2 in-process AGY suites, OT-2 stale on the base) and 2 integration watcher files not green here (causes found, outside the change) | Rerun those files on a quiet machine |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 95% | API-07/08 SGD-05…08 (loss with the Stop delivered or lost, not connected, refusal), API-09 not connected per kind and beta down, API-10 (80 rounds), CG-07 cause found | FU-005's recovery state seen once | — |
| User-surface, browser, and desktop-shell confidence | 70% | 96% | desktop renderer and phone bundle, every run kind, en; Stopping's `aria-busy`/disabled/label in the traces | zh-CN rendered only by unit (catalog spec); Electron shell unchanged | — |
| Durable regression coverage quality and relevance | 85% | 94% | `stop-generation-probe.mjs`, MSP-75…79, the wire fixture, `stop-nothing-to-stop` | the real-stack probes need a built server and ~6 min; their timings depend on machine load | — |

- Overall post-repository confidence: 79% (before the browser and two-node runs)
- Overall final confidence: 94.6%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94.6%). The gap is the environment: the unrelated E2E and integration files that this machine's load and FSEvents kept from passing. I reran them serially and again at lower load (API-06b…e); what still fails has a cause outside the change, and no further validation in scope can make FSEvents or other agents' load go away. Every Stop-related check passes.
- Confidence-limiting residual risks: CG-06 (a Stop that meets the next turn's start is accepted and does not stop it, by design); R-3/R-4 (Stopping lasts while a node is unreachable, by design; at 150 ms with the path down ~6 s, the page's reconnect backoff took ~31 s); FU-005; FU-006.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (real stack: built nodes, desktop renderer and the phone bundle) and `Worker or Distributed` (two nodes, peer relay)
- Confidence gap it addresses: repository evidence for UC-004's Org, delegated and peer kinds and for the phone was unit-only; the connection-loss lifecycle and the refused / not-sent presentation were proven against fixture pages only.
- Browser validation needed: yes — the changed boundary is the composer's state across real streams, statuses and reconnects.

## Desktop Application Validation

- Approach executed: web-equivalent desktop renderer (`nuxt dev`) against probe-owned built nodes; no Electron-specific code changed.
- Effect on any already-running desktop application: `None` (own ports, data roots and HOMEs; the user's AutoByteus untouched).
- Behavior not directly proven: none in the shell (not changed).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce or tolerate backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/stop-generation-probe.mjs` (+ `package.json` `test:e2e:stop-generation`) | Added | API-07, API-08, API-10 | — |
| `autobyteus-web/tests/e2e/mobile-stop-generation-cases.mjs` | Added | API-09 | — |
| `autobyteus-web/tests/e2e/fixtures/stop-generation-wire.mjs` | Added | API-07…API-10 | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (imports and runs MSP-75…79; the phone's socket route passes the wire, pass-through by default) | API-09 | — |
| `autobyteus-web/tests/e2e/interrupt-twice-repro-scratch.mjs` | Removed | API-11 | Obsolete: a hand-over reproduction with no assertion (design Removal Plan; requirements "replaced by the durable probe"). Replacement: `stop-generation-probe.mjs` |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff for the removed path: `git show f8fad0fc6a -- autobyteus-web/tests/e2e/interrupt-twice-repro-scratch.mjs`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model runtime | Scripted AGY CLI (`HOLD_TURN`) | No provider cost; deterministic turns | AGY's own interrupt only; Claude/Codex/native turn-gone answers proven by unit (AC-005) |
| A runtime that refuses a Stop | The wire answers the page's Stop with the node's failed answer for that stream (`INTERRUPT_EXECUTION_FAILED`, raw run id) | No scripted runtime refuses an interrupt | The node-side refusal path is unit-tested (IMP-03); the page's presentation is proven real-stack |
| Network path (latency, drops) | Playwright `routeWebSocket` + `ws` upstream (`stop-generation-wire.mjs`) | A real flaky network is not reproducible | HTTP requests are not delayed or dropped |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe nodes, Nuxt dev, Chrome, temp data roots | Yes | each probe's `finally` | every receipt: `"frontend":"stopped","backend":"stopped","dataRootRemoved":true` (desktop), `"frontendExited":true,"serversLeft":0,"rootRemoved":true` (phone) |
| The API-10 run cut by the app restart (13:19 UTC) | Yes | its temp data root `stop-generation-UVwaVZ` removed; partial evidence moved out of the ticket | Done |
| `/tmp/api533/` (trial runs, FSEvents script) | Yes | kept outside the ticket as scratch; not evidence | — |
| Server E2E temp HOMEs (`mktemp -d`) | Yes | left in `$TMPDIR` (empty test homes; the suites remove their own data roots) | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Next recipient from `get_handoff_rules`: the Code Reviewer, for proportional test-code review (`Medium` / `High`, reviewed route).
- Notes:
  - CG-07 is reproduced and explained: 1 of 80 sends after a Stop was sent on a just-opened stream before the node's `CONNECTED`, refused `SESSION_NOT_READY` and dropped silently. The wait in `ensureAgentStreamConnected` is the same on the base; this diff does not touch the send path (FU-006, urgent).
  - New follow-ups: FU-005 (Team stream recovery after a blip), FU-006, FU-007 (run-open race guard error).
  - The phone's "Not reachable" screen leaves nothing to press when the peer node is down; an Org member's Stop is disabled while its Org stream is not ready. In both cases nothing is shown, which is correct: there is no Stop to answer.
