# API/E2E Execution Coverage Report — autobyteus-267 (Nodes → Remote Collaboration page)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-nodes-page/tickets/in-progress/remote-nodes-page`; evidence in `…/evidence/api-e2e/`.

## Report Meta

- Investigation: `…/api-e2e-coverage-investigation.md` (round 1)
- Progress log: `…/api-e2e-test-progress.md`
- Revision record: `…/api-e2e-revision-record.md`
- Revision: `API-REV-002` (round 2: rerun after the F-001 fix); round 1 was `API-REV-001`
- Trigger: IR-001 on the direct route (no code review). Code `3a21bcae44`, handoff `f684e1e368`. Classification: Medium / Low.
- **Result (round 2): Pass, final confidence 95% (94.9).** F-001 is resolved by `2a6053250a` (IR-002): the browser probe passes 9/9 twice, and the store spec passes.
- Round 1 result: Fail. There was one failure, F-001 (Low): a peer whose earlier query is still in flight is not asked again when the owner returns to the tab or turns the switch on again (AC-505, REQ-504; UI/UX spec "Re-asking on every open", TR-009). Everything else passes.
- Durable coverage changed: Yes. A new browser probe (`autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs`, `pnpm -C autobyteus-web test:e2e:remote-nodes-page`) and `peerNodeOffer` checks in the server two-server E2E.

## Round 2 (API-REV-002)

The fix commit is `2a6053250a` (handoff `169da29cdc`). `git diff 3a21bcae44..2a6053250a` touches only `autobyteus-web/stores/remoteCollaborationOffersStore.ts` (`context: { queryDeduplication: false }` on the `peerNodeOffer` query) and its spec. The server build and API-01 (29/29) still hold.

| Case | What runs | Result | Evidence and what to look for |
| --- | --- | --- | --- |
| API-R2 | `NUXT_TEST=true vitest run stores/__tests__/remoteCollaborationOffersStore.spec.ts` | Pass, 7/7 | `API-R2-store-spec-after-F-001.log`. IMP-14 also covers the card, disclosure and localization specs (62 tests) and the guards |
| API-02 run 5 | the browser probe, `nuxt dev` with the fixed store | **Pass, 9/9** | `API-02-run5/remote-nodes-page-probe.json`: RNP-06 `thetaAsked {onReturn: 1, onSwitchOnAgain: 1}`; theta settles 20 174 ms after the new ask; theta on open 20 206 ms; RNP-09 has 0 requests to peers; cleanup clean; no browser errors |
| API-02 run 6 | the same | **Pass, 9/9** | `API-02-run6/…`: `thetaAsked {1, 1}`, 20 147 ms; theta on open 20 219 ms |

F-001 is resolved.

## Environment

| ID | Code | Machine | Servers | Data |
| --- | --- | --- | --- | --- |
| ENV-1 | `3a21bcae44` (dist API-00) + the test changes | macOS 26.5.2, Node v22.23.1 | two-server E2E (alpha, beta behind capturing proxies; RC-27 adds gamma, delta, epsilon), scripted AGY CLI; Brief Studio package on beta | temp roots and HOMEs, `env -i`; removed |
| ENV-2 | as ENV-1 | as ENV-1; Chrome 1440×1000 (playwright-core, headless), `en-US` | the probe: nine `dist/app.js` servers (alpha; beta, gamma, delta, epsilon, zeta and zeta's replacement, eta, theta, iota) with their own temp data and HOMEs; theta's address is a TCP listener that never answers; `nuxt dev` against alpha | temp root removed after every run (`rootRemoved true, serversLeft 0, frontendExited true`) |

The user's AutoByteus, its data and Docker nodes were not used.

## Cases

| Case | Criteria | What runs | Env | Result | Evidence and what to look for |
| --- | --- | --- | --- | --- | --- |
| API-00 | all | server build, Brief Studio package | ENV-1 | Pass | `API-00-server-build.log`: `build exit=0`, `prepare exit=0` |
| API-R1 | unit, component, guards | IMP-01 … IMP-06 at `3a21bcae44` | — | Reused | The source is unchanged since then. IMP-03 has 61 focused web specs, IMP-06 the whole web suite (4641), IMP-02 the server remote suite (103), IMP-05 the server unit suite (6460) |
| API-01 | AC-502, AC-501, REQ-503/510, AC-507 | two-server E2E (`env -i … RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`) | ENV-1 | **Pass, 29/29** (299 s) | `API-01-run1.log`, `API-01-run1/remote-two-server-receipt.json`, keys below the table |
| API-02 | AC-501, AC-502, AC-504, AC-505, AC-507, QR-501/502 | browser probe (`node tests/e2e/remote-nodes-page-probe.mjs --output-dir=<dir>` in `autobyteus-web`) | ENV-2 | **8 of 9 cases pass; RNP-06 fails (F-001)** | Run 4: `API-02-run4/remote-nodes-page-probe.json`, `API-02-run4.log` and screenshots; cases below the table. Runs 1 and 2 stopped on my test's own comparison: Apollo's `__typename` on the window's entries; fixed |

**API-01 receipt keys:**
- **RC-26 `pageOffer`:** `peerNodeOffer(beta)` entries equal the Scout's `list_available_agents {node}` without addresses (12 entries); Plain Helper's `description` is `null`; `refusalCode: null`.
- **RC-27 `pageCodes`:** gamma `PEER_UNREACHABLE`, delta `REMOTE_COLLABORATION_OFF`, epsilon `PEER_NOT_REGISTERED`, each with `entries: null`.
- **RC-27 `heldPage`:** a black-holed beta gives `PEER_UNREACHABLE` in under 25 s.
- **RC-16:** `PEER_IDENTITY_MISMATCH`.
- **The 261 tool results:** unchanged (RC-26 … RC-29).

**API-02 cases (run 4):**
- **RNP-01 (AC-501).** The settled times after the tab opened: beta Available 219 ms, gamma Not reachable 221, delta Off there 223, epsilon Not registered there 224, zeta Different server 225, eta Available 227. Theta settled at 20 115 ms (run 3: 20 222).
  - While the others were settled, theta showed `Checking…`, "Waiting for theta… up to 20 seconds." and a disabled Refresh.
  - Each sentence is as the spec words it. Eta shows "eta shares no Agents or Agent Teams."
  - Each peer was asked exactly once on open.
- **RNP-02 (AC-502, AC-504).** All checked while theta was still Checking…, so the page stayed usable.
  - Beta's line reads "24 Agents · 6 Agent Teams" with the names, and the list starts closed.
  - Opened, the DOM's 30 entries equal alpha's `peerNodeOffer` answer and the window's own received answer. Plain Helper shows no description.
  - The window receives only `name, kind, description` (plus Apollo's `__typename`), never an address.
  - Search "copy" gives "3 of 24" and "1 of 6". "zzz" gives "No Agents or Agent Teams match “zzz”." with Clear search, and clearing shows all 30.
- **RNP-03.** Refresh on beta asks beta only (`{beta: 1, others: 0}`).
- **RNP-04.** Adding iota through the form asks iota once, and it shows "iota shares no Agents or Agent Teams."
- **RNP-05 (TR-008/009).**
  - Switch off: the exact notice, no chips, no Refresh buttons, 0 queries in 3 s, and alpha's switch off.
  - Switch on (with theta settled): every peer asked once.
- **RNP-06 — Fail, F-001.** Returning to the tab asked every settled peer once, but theta 0 times. Switch off then on, while theta's query was in flight, also asked theta 0 times. See Failures.
- **RNP-07 (AC-507).** Rename eta → `eta-renamed` is saved on alpha. Remove iota removes it, and nobody is asked.
- **RNP-08 (QR-502).** No query in a 30 s quiet period.
- **RNP-09 (REQ-503).** 86 window requests, all to the web server or alpha (`127.0.0.1:<alpha>`, `127.0.0.1:<nuxt>`). None went to any peer's port. Every `peerNodeOffer` went to alpha.
- **Browser errors:** none.

## Failures

| ID | Severity | Criteria | Observed | Expected | Evidence | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| F-001 (resolved in round 2 by `2a6053250a`) | Low (an edge: only a peer still being checked, and only within 20 s of its earlier ask; the page still shows Checking… and then an answer) | AC-505 "Returning to the tab asks again", REQ-504; UI/UX spec "Leaving the tab and returning asks every peer again … A peer that takes 20 s therefore shows Checking… again" and TR-009 "All asked" | When theta's query from the switch-on was 1.6 s old, the owner returned to the tab (or switched off and on), and no new `peerNodeOffer` was sent for theta (`thetaAsked {onReturn: 0, onSwitchOnAgain: 0}`). Theta settled 16.7 s after the new ask with the earlier answer. The other peers were asked again. If the peer's state had changed in between (for example the owner started it), the page would show the earlier, stale result | A new query for every peer on each return and switch-on | `F-001-in-flight-peer-not-asked-again.log`; `API-02-run3`, `API-02-run4` (`RNP-06`). Diagnostic, temporary and reverted: the same probe with `context: { queryDeduplication: false }` on the store's query passes all 9 cases (`API-02-diagnostic-dedup-off/`: `thetaAsked {1, 1}`, theta settled 20 167 ms after the new ask) | Preliminary: **Local Fix (Implementation Engineer).** `remoteCollaborationOffersStore.ask` queries with identical variables, and Apollo deduplicates an identical query that is in flight (on by default; the web's Apollo setup does not change it). `fetchPolicy: 'network-only'` does not prevent it. Fix: disable deduplication for this query (`context: { queryDeduplication: false }`), plus a store spec in which two asks of one peer while the first is pending send two queries. The probe's RNP-06 verifies it in the browser |

## Acceptance-Criteria Proof

| AC | Proven by | Status |
| --- | --- | --- |
| AC-501 | API-02 RNP-01 (seven peer states in a real browser, each at its own pace; theta at the 20 s bound; page usable); API-01 (codes) | Proven |
| AC-502 | API-02 RNP-02 and RNP-09 (DOM = window answer = alpha's answer; no address; no request to a peer), API-01 RC-26 (`peerNodeOffer` = `list_available_agents {node}`) | Proven |
| AC-504 | API-02 RNP-02 (30 entries, one line, narrowed, cleared) | Proven |
| AC-505 | API-02 RNP-05 (off: nobody asked, the notice; on: all asked), RNP-04 (add), RNP-06 (return, and switch off/on, while a peer's query is in flight) | Proven in round 2 (runs 5 and 6); it failed in round 1 (F-001) |
| AC-506 | — | Only the user can check (his desktop window and Docker node) |
| AC-507 | API-02 RNP-07, API-01 (the 261 tool results) | Proven |

## Validation Confidence Scorecard (Mandatory)

These are scored over what can be proven without the user; AC-506 is listed for delivery.

**Round 2.** The final scores after the fix:

| Category | Final (round 2) | Basis |
| --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | every AC proven (AC-506 is the user's) |
| Changed-boundary execution directness | 95% | real browser, real servers, request log |
| Cross-boundary integration realism and mock gap | 95% | nine processes, a black-holed peer, a replaced server; loopback only (the user's AC-506) |
| Environment, configuration, identity, and fixture fidelity | 95% | as round 1 |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | F-001's edge (an ask while one is in flight) now proven, twice |
| User-surface, browser, and desktop-shell confidence | 94% | my Chrome runs at 1440 px in English; the 390 px and Chinese rendering reused from IMP-12/IMP-13 (rendering is unchanged by the fix); there was no live keyboard walk-through (specs cover the native buttons and `aria-expanded`) |
| Durable regression coverage quality and relevance | 95% | the probe (9 cases) and the store spec that fails without the option |

- Overall final confidence: 95% (simple average 94.9%).
- No category is below 90%.
- Every critical AC is directly proven: `Yes`.
- Target met: `Yes`.
- Broader validation: `Required`, executed (API-02).

**Round 1** (kept as the record; a failing critical criterion blocked Pass):

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 90% | AC table; AC-505 fails in one edge (F-001) | F-001 | the fix, then RNP-06 |
| Changed-boundary execution directness | 90% | 95% | a real browser, real servers, the window's request log, `peerNodeOffer` over HTTP | — | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | nine server processes, a black-holed TCP peer, a replaced server for the identity mismatch | loopback (AC-506 is the user's) | AC-506 |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | clean data roots and HOMEs; a real catalog of 30 entries; a file-authored agent without a description | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 90% | peer states, the bound, switch off/on, add, Refresh, remove, return; F-001 found here | F-001 | the fix |
| User-surface, browser, and desktop-shell confidence | 85% | 92% | Chrome at 1440 px: states, sentences, search, notice, rename and remove; screenshots; VIS comparison reused from IMP-07 … IMP-13 (1440, 390, English, Chinese) | no own 390 px or Chinese run; the desktop shell is unchanged | — |
| Durable regression coverage quality and relevance | 90% | 95% | a new durable browser probe (9 cases, exact strings and counts); server E2E extended | the probe takes about 2.5 minutes | — |

- Overall post-repository confidence: 89%
- Overall final confidence: 93%
- Every critical acceptance criterion directly proven: `No` (AC-505, F-001)
- Any final applicable category below `90%`: `No`
- Default target of `95%` met: `No`
- Closing it needs the F-001 fix and a rerun of the probe; nothing else is known to be missing.

## Broader Validation Decision (Mandatory)

- **Decision:** `Required` (executed, API-02).
- **Mode:** `Browser` with multiple server processes.
- **What it addressed:** the triggers and states as the window performs them over HTTP, and whether the window ever contacts a peer. It found F-001.

## Durable Coverage Changes

- `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs` (new) and its script `test:e2e:remote-nodes-page` in `autobyteus-web/package.json`.
- `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`:
  - `peerNodeOffer` checks in RC-26 (equality with the tool's list), RC-27 (codes and the bound) and RC-16 (identity mismatch);
  - the header is updated.

## Decision

Round 2: **Pass.** On the direct route, test-code review is `Not Required — direct low-risk route`. This goes to delivery.

Round 1: Fail. This went to the code reviewer for failure-origin review of F-001 (preliminary: Local Fix, Implementation Engineer). After the fix, rerun the probe (all 9 cases) and the store's specs. API-01 stays valid if only the web store changes.
