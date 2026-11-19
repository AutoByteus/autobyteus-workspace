# API/E2E Execution Coverage Report — autobyteus-540 (send-on-unbound-stream)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1; CRR-001 Pass (code `f70d3cb968` server, `49ed8967f0` web).
- Prior round reviewed: None.
- Deviations from the investigation's plan, and why:
  - SDD-11 added. A message to a run that a Stop took offline, with its answer lost, can be decided either way. If the rebind's first snapshot comes before the node made the run active again, it carries no input state and the page shows (b), then the message appears (the design's residual risk). If it comes after, the message is found. The case checks the branch the page took.
  - SDD-12 added: a no-send control for SDD-09 (below).
  - The phone cases are MSP-85…88: MSP-80…84 already belong to autobyteus-533's Stop cases on this base.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream/tickets/in-progress/send-on-unbound-stream/evidence/api-e2e/` (index `README.md`).

## Routing Classification

- Task size: `Medium`; Architectural risk: `High`; Input route: `Reviewed`; Successful-output route: `Code Review`; Test-code review: `Required`.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | code `49ed8967f0`; worktree `41bba2c734` (tests) | macOS 26.5.2, Node v22.23.1 | server suites (vitest) | shared machine, load 30–60, `fseventsd` ~150–170 % CPU |
| ENV-2 | as ENV-1 | as ENV-1, headless Chrome (playwright-core 1.58.2) | built `dist` of this worktree + `nuxt dev`, scripted AGY | en-US, 1440×1000, temp data root and HOME |
| ENV-3 | as ENV-1 | as ENV-2 | alpha + beta built servers paired by invite; phone bundle (`build:mobile-web`) served by alpha | phone 390×844 touch, Phone Access pairing |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-003…AC-005, QR-001, QR-002 | Web unit (whole) | Reused IMP-07 | — | Pass | — | — | Web source unchanged since `49ed8967f0` |
| API-02 | AC-003 (server), AC-007 | Server unit, typechecks | Reused IMP-02…IMP-06 | — | Pass | — | — | Server code unchanged since `f70d3cb968`; the new `.mjs` probes are in no typecheck include |
| API-03 | AC-004 rendered | Notice on a fixture page | Reused IMP-09 | — | Pass | — | — | Unchanged |
| API-04 | AC-007 | Server integration (whole) | `pnpm -C autobyteus-server-ts test:integration:prepare && … test:integration` | ENV-1 | Pass for the changed scope; 4 failures in `file-system-watcher` (FSEvents) | `API-04-server-integration.log` | `Test Files  1 failed \| 88 passed \| 20 skipped (109)`; `Tests  4 failed \| 510 passed \| 69 skipped (583)`; the 4 all in `tests/integration/file-explorer/file-system-watcher.integration.test.ts` | The diff touches no file-explorer code (`git diff --stat 914eb36577 HEAD -- autobyteus-server-ts/src/file-explorer` is empty); the agent websocket integration files with the new snapshot field pass |
| API-04b | — | FSEvents measurement | `node /tmp/api540/fsevents-measure.mjs` (text in the log) | ENV-1 | Pass (cause measured) | `API-04b-fsevents.log` | `[{"writeToEventMs":"none in 10000 ms","closeBlockMs":1},{"writeToEventMs":4201,…},{"writeToEventMs":2714,…}]`; `fseventsd` `157.9` % | TESTING.md "File watching on a busy Mac"; same as autobyteus-533's API-05b |
| API-05 | AC-007 | Server E2E (whole, scripted AGY gate) | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm test:e2e` | ENV-1 | Pass for the changed scope; 8 files failed on load (API-05b) | `API-05-server-e2e-whole.excerpt.log` (full: `.log.gz`) | `Test Files  8 failed \| 193 passed \| 81 skipped (282)`; `Tests  8 failed \| 901 passed \| 381 skipped (1290)`; failures `Test timed out in 5000ms`, `Hook timed out in 10000ms`, `AgyDiscoveryError: Antigravity model discovery timed out` (`stop-nothing-to-stop` at its run's creation), a Grok catalog read, a temp-folder `ENOTEMPTY` | 1 h 48 min, ~80 files in parallel |
| API-05b | AC-007 | The 8 failed files, one at a time | same env, `pnpm -C autobyteus-server-ts exec vitest run --fileParallelism=false <8 files>` | ENV-1 | Pass | `API-05b-server-e2e-failed-files-rerun.log` | `Test Files  8 passed (8)`; `Tests  62 passed (62)` | Each whole-run failure was the parallel load |
| API-06 | AC-002, AC-006 | Desktop: 80 messages right after a Stop took the AGY run offline (40 standalone, 40 Team member) | `pnpm -C autobyteus-web test:e2e:stop-generation --output-dir <evidence>/API-06-sends-after-stops --gaps <0,60,150,300,600 ×8> --cases SGD-01,SGD-02` | ENV-2 | Pass | `API-06-sends-after-stops/evidence.json` | `"sends": 80`, `"sendStalls": []`; no `ERROR` `SESSION_NOT_READY` in `wireLog`; `SGD-01`/`SGD-02` `"result": "Pass"` | The same run found 1 lost of 80 on autobyteus-533's code (533 API-10). `holdTurn` now fails at once on a lost send (D-7) |
| API-07 | AC-002, AC-003, AC-004, REQ-003, QR-001 | Desktop real stack, standalone run and Team member (`send-delivery-probe.mjs`, SDD-01…SDD-12) | `pnpm -C autobyteus-web test:e2e:send-delivery --output-dir <evidence>/API-07-desktop-send-delivery` (rounds 20) | ENV-2 | Pass (12/12) | `API-07-desktop-send-delivery/evidence.json`, `SDD-*.png`, `console.log`, `backend.log` | `"notReadyErrors": 0`; SDD-01/02 `"rounds": 20` each, every send `"bound": true`; SDD-03 `count: 1`, no notice; SDD-04 `snapshotInputState.entries` `"queued:client_…"`, `count: 1`, no notice; SDD-05 `"not_sent"`, `count: 0`, draft back, `Idle` → `Idle`; SDD-06 `"unknown"`, snapshot `input_state` `null`; SDD-07 `"not_sent"` after `10009` ms; SDD-08 `"unknown"`, `Offline` → `Offline`; SDD-09 `"not_sent"` after `10031` ms; SDD-10 `answers: ["accepted"]`, `started: true`, `sentOn` = `refused` (one new run); SDD-11 branch `"input state at the rebind"`, `count: 1`; cleanup `"dataRootRemoved": true` | SDD-09/SDD-12: see Notes below the table (FU-003) |
| API-08 | AC-002, AC-004, AC-007 | Phone bundle on alpha + beta: MSP-85 (10 messages after Stops, 5 after reconnects), MSP-86 lost send (a), MSP-87 Org member, MSP-88 peer run on beta; every other phone case | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-08-mobile-shell` | ENV-3 | Pass for MSP-85…88 and 86 of 87 cases; probe verdict Fail on MSP-41 (known, autobyteus-458 FU-003) | `API-08-mobile-shell/mobile-shell-probe.json`, `MSP-8[5-8]-*.png` | MSP-85 `"rounds": 15`; MSP-86 `"not_sent"`, draft back, `Idle` → `Idle`; MSP-87 `"unknown"`, status `"Idle · in Delivery Org"` before and after, path down: Send disabled (`offered.enabled: false`); MSP-88 path down `"not_sent"` after `10010` ms with the text kept, lost `"unknown"` with the text kept; MSP-80…84 (533's Stop cases, sends after Stops) `"sendStalls"` empty | MSP-41: an own save read back twice (`readsAfterSave: 2`). The file explorer's watcher, not changed here. The same failure is recorded on autobyteus-458 as its FU-003 (Solution Designer journal, 2026-11-17: "The probe's overall Fail is MSP-41 (458 FU-003)") |
| API-08b | — | MSP-39…42 alone | `… test:e2e:mobile-shell --cases=MSP-39,MSP-40,MSP-41,MSP-42` | ENV-3 | MSP-39, 40, 42 Pass; MSP-41 Fail (known) | `API-08b-live-file-refresh-rerun/mobile-shell-probe.json` | MSP-41 `readsAfterSave: 2` again | Rule 9 rerun; the cause is outside this ticket (above) |
| API-09 | AC-007 | Web guards | `pnpm -C autobyteus-web guard:web-boundary`; `guard:localization-boundary` | ENV-1 | Pass | `API-09-web-guards.log` | `[guard:web-boundary] Passed.`, `[guard:localization-boundary] Passed.` | |

Notes:
- SDD-09 and SDD-12 (FU-003): when the desktop page's path is down, an active Team's member shows "Initializing" within about 1 s. That happens with no send at all (SDD-12: `Offline` → `Initializing` at 820 ms, back to `Offline` after the rebind). It comes from the history refresh's placeholder for an active Team whose stream is not connected; the send path's refresh only brings it sooner (SDD-09 at 204 ms). The send's own outcome leaves the status as it is, so AC-004's "status unchanged" holds.
- What the user sees: after text (a), "send it again" cannot be done while the path stays down (`sendAfterNotice.enabled: false`); it can after the rebind (`afterUp.enabled: true`). The same holds for an Org member whose Org stream is not ready (MSP-87). Recorded as FU-003; outside this ticket.

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (fake socket, each kind); API-07 SDD-01/02 and API-08 MSP-85: every `SEND_MESSAGE` left after its link's `CONNECTED` (Team: its tree snapshot) | Proven | — |
| AC-002 | Yes | API-06 (80 after Stops), API-07 SDD-01/02 (40 after reconnects), API-08 MSP-85 (10 after Stops, 5 after reconnects) and MSP-80…84 (533's phone Stop cases): every send started its turn, 0 `SESSION_NOT_READY`, no retry | Proven | — |
| AC-003 | Yes | API-07 SDD-03 (answer lost: shown once), SDD-04 (queued while another window's turn ran: found through the snapshot's `input_state`), SDD-05 (missing, live run: (a)), SDD-06 (missing, stopped run: (b)), SDD-11; API-02 (server: the active run's snapshot carries its input state) | Proven | — |
| AC-004 | Yes | API-07 SDD-05, SDD-07 (standalone (a)), SDD-06 (b), SDD-08 (Team (b)), SDD-09 (Team timeout (a)), SDD-10; API-08 MSP-86 (phone (a)), MSP-87 (Org (b)), MSP-88 (peer: (a) with the 10 s wait, (b)); every text checked for run ids and internal words; zh-CN by API-01 | Proven | — |
| AC-005 | Yes | API-01 (unit); API-07 SDD-05/06 and API-08 MSP-86…88: the notice and the text stay after the rebind's snapshot replaced the conversation | Proven | — |
| AC-006 | Yes | API-06, API-08 MSP-80…84: `holdTurn` fails at once on a lost send (no second send); code read of both probes | Proven | — |
| AC-007 | Yes | API-04 (all but the FSEvents-bound watcher file), API-05 + API-05b (every E2E file passes), API-08 (86 of 87 phone cases; MSP-41 known), API-02 | Proven | — |
| QR-001 | Yes | API-07, API-08 notice texts checked | Proven | — |
| QR-002 | No | API-01 (unit); API-06: sends after Stops on bound streams went at once | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 85% | 96% | every AC by a real-stack case (AC proof table) | the queued case ran on AGY only (native, ACP share the AgentRun admission) | a native run with a model |
| Changed-boundary directness | 80% | 96% | API-06/07/08 drive the composer over real `/ws/agent`, `/ws/agent-team`, `/ws/agent-org`, `/ws/peer-run` on built nodes, the node's snapshot `input_state` observed on the wire | — | — |
| Cross-boundary realism / mock gap | 75% | 94% | two paired nodes, phone bundle, desktop renderer | the wire stands in for a real network (losses at exact moments); HTTP not delayed | — |
| Environment / fixture fidelity | 85% | 94% | built `dist` and phone bundle of this worktree; owner credentials, pairing | 4 integration watcher tests not green here (FSEvents, measured); E2E green only serially | a quiet machine |
| Failure / lifecycle / recovery | 75% | 96% | not bound (10 s), lost on the way, answer lost, queued, stopped run, Team timeout, new run's first message, peer | FU-003: a Team member's Send disabled during an outage | — |
| User surface | 70% | 96% | desktop and phone notices, texts verbatim, draft and status checked | zh-CN rendered by unit and IMP-09 only | — |
| Durable regression coverage | 85% | 95% | `send-delivery-probe.mjs`, MSP-85…88; the Stop probes' fail-at-once | the probes need a built server and ~10 min | — |

- Overall post-repository confidence: 79%
- Overall final confidence: 95.3%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven: `Yes`
- Any final category below `90%`: `No`
- Default target of 95% met: `Yes`
- Confidence-limiting residual risks: R-2 (no answer on a bound stream: no timer, by design); R-4 (a peer run answers (b) for a missing message, by design; MSP-88); a (b) message may still appear after its draft came back (by design; seen in SDD-11's other branch in trials); FU-003.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed). Mode: `Browser` (built nodes, desktop renderer, phone bundle) and `Worker or Distributed` (alpha + beta, peer relay).
- Gap it addressed: the send's readiness, its outcome across reconnects, and the notice per run kind were proven only with fake sockets and a fixture page.

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`. Compatibility-only coverage: `No`.

## Durable Coverage Changed In The Codebase

| Path | Change | Cases |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/send-delivery-probe.mjs` (+ `package.json` `test:e2e:send-delivery`) | Added | API-07 |
| `autobyteus-web/tests/e2e/mobile-send-delivery-cases.mjs` (MSP-85…88) | Added | API-08 |
| `autobyteus-web/tests/e2e/fixtures/stop-generation-wire.mjs` | Updated (`loseNextSend`, `dropAfterNextSend`; the snapshot's `input_state` in the log) | API-07, API-08 |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (runs MSP-85…88; MSP-86's expected console line) | API-08 |

- Test commit: `41bba2c734`. Attached for test-code review: `Yes`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model runtime | Scripted AGY | No provider cost | The queueing case (SDD-04) runs on AGY; native and ACP share the same AgentRun input admission but were not run |
| Network path | `routeWebSocket` + `ws` upstream (the wire) | Reproducible losses | HTTP is not delayed or dropped |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe nodes, Nuxt, Chrome, temp data roots | Yes | each probe's `finally` | receipts: desktop `"dataRootRemoved": true`; phone `"serversLeft":0,"rootRemoved":true` |
| `/tmp/api540/` (trial runs, the phone build log) | Yes | to remove when the ticket closes | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Next recipient: the Code Reviewer (proportional test-code review; `Medium` / `High`).
- Notes:
  - autobyteus-533's CG-07 is gone: 80 sends right after Stops (API-06), 40 after forced reconnects (API-07) and 15 on the phone (MSP-85), all started their turns, with no `SESSION_NOT_READY` on the wire (533 lost 1 of 80 at its API-10).
  - New follow-up: FU-003 (during an outage an active Team's member shows Initializing and its Send is disabled, from the history placeholder; it happens with or without a send).
  - A standalone run's not-delivered send still logs `console.error('Error sending user input: …')` (handoff Known Risks); the phone probe lists it as MSP-86's expected line.
