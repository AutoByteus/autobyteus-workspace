# API/E2E Execution Coverage Report — autobyteus-434

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (round 1; it lists the upstream documents)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2: test-code review CRR-002, finding TR-001 (`Local Fix`, API/E2E): MSP-21(c) counted every stream on the phone, so the agent phone's count was its Team stream. Round 1: code review pass CRR-001 (Medium / High)
- Prior round reviewed: round 1 (`API-REV-001`); rerun delta in `api-e2e-revision-record.md` `API-REV-002`
- Deviations from the investigation's plan, and why:
  - MSP-20 also asserts the **collaboration stream** (delegated copies) reconnects after the outage: the phone keeps one for a top-level agent run, so the probe exercises that owner too (the investigation had it as unit-only).
  - MSP-22 taps again once, only after the pre-existing open race FU-004 (found during this round; outside this change).
  - API-09 needed harness corrections before its evidence run (`run-0-*` folders keep each attempt; none is a product result, see API-09 Notes).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the changed durable test code)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | source `feb69495a5` (HEAD `d5f0735904` adds ticket documents) + this round's test changes | macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2 | Google Chrome 156.0.8078.80 headless; server `dist` and phone bundle built from `feb69495a5` (IMP-13; verified: 0 bundle files with `Max reconnection attempts`, 1 with `re-synchronizing`, no source newer than the bundle) | Probe-owned nodes alpha, beta, gamma (temp data roots and HOME); scripted AGY (gamma: `interrupt_resend`); phone 390×844 `isMobile`; gamma's phone at `http://192.168.77.20:<proxy port>` through a probe-owned TCP proxy |
| ENV-2 | same | Android emulator `emulator-5584`: AVD `autobyteus277_api35` (read-only instance started for this run), `sdk_gphone64_arm64`, Android 15 (SDK 35), Android System WebView 124.0.6367.219 | Debug APK built from this worktree (`./gradlew :app:assembleDebug`, versionName 0.1.0); the app loads `/mobile` from the harness node (`dist` of `feb69495a5`) | Node reached as `10.0.2.2:<proxy port>` through a recording TCP proxy; scripted AGY `interrupt_resend`; the emulator `emulator-5570` that was running when this round started was not ours and was not touched |
| ENV-3 | same | as ENV-1 | vitest 4.1.12, in-process studio server (`tests/e2e/helpers/studio-runtime-test-server`) | `env -i PATH HOME=<temp> TMPDIR` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-005, persisted data | server recorder, writer, projection provider | Reused IMP-02 | — | Pass | (IMP-02 row) | `Tests  32 passed (32)`; "an older record without them still loads" | Ran on `feb69495a5`; no source change since |
| API-02 | AC-006 (route policy), REQ-004/005 | whole server unit suite | Reused IMP-03 | — | Pass | (IMP-03 row) | `Test Files  952 passed \| 5 skipped (957)` | same |
| API-03 | — | server and web typechecks | Reused IMP-04, IMP-05 | — | Pass | (rows) | `production errors: 0` | same; this round's test changes are `.mjs` probe files outside both typecheck configurations |
| API-04 | AC-001…004 (unit), AC-006 (4004 not retried) | web specs: scheduler, page signal, transport, four owners, store Connect Rule | Reused IMP-06; IMP-07 + IMP-08 | — | Pass | (rows) | IMP-06 `Tests  676 passed (676)`; `WebSocketClient.spec.ts` "reports a not-found (4004) or not-allowed (4005) close as not retryable", `TeamStreamingService.reconnect.spec.ts` "does not retry a non-retryable close (4004/4005)", `agentRunStreamReconnection.spec.ts` "a non-retryable close (4004/4005) is not retried", collaboration "does not retry a 4004 close" | Production web source unchanged since `108fcd0587` (`git diff --name-only 108fcd0587 feb69495a5` = five spec files, all green in IMP-06/IMP-08) |
| API-05 | — | web guards | Reused IMP-09 | — | Pass | (row) | `[guard:web-boundary] Passed.` | same |
| API-10 | AC-006 (BEH-001, BEH-002) | phone bundle, Team member | Reused IMP-12 R1, R2 | — | Pass | (row) | R1 40–47 ms; R2 caught up 7.2 s | same commit |
| API-06 | AC-006 / BEH-007 | route-policy unit test; server E2E of the node's request gate and phone WebSocket routes on the real studio server | `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/unit/remote-access/route-policy.test.ts tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts --no-watch` | ENV-3 | Pass | `API-06-route-policy-and-phone-routes.log` | `Test Files  2 passed (2)`, `Tests  26 passed (26)`; `✓ refuses a phone credential on WebSocket routes the phone does not offer (AC-004)` (`/ws/terminal/phone-probe`); `✓ accepts a phone credential on every phone WebSocket route (AC-005)` | 403/416 and `/ws/terminal` refusal unchanged |
| API-07 | regression (fixture changed in this ticket) | browser probe, Task Agent monitor with the fake stream fixture | `pnpm -C autobyteus-web test:e2e:task-agent-monitor-visibility --output-dir=<evidence>/API-07-task-agent-monitor-visibility` | ENV-1 | Pass | `API-07-task-agent-monitor-visibility/API-07-stdout.log`, `evidence.json`, screenshots | `Task Agent monitor visibility browser probe passed.`; `API-E2E-TMV-001` and `-002` `"result": "Pass"` | The fixture no longer emits a disconnect on an intentional close (as the real client never did) |
| API-08 | AC-006 (no list poll while hidden; phone shell regression) + the first run of MSP-20…22 | phone bundle on alpha/beta: all existing phone journeys | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-08-mobile-shell-probe` (all cases) | ENV-1 | Pass (MSP-01…19, 19/19; probe verdict `Fail` only on one line of the new cases' setup, see Notes) | `API-08-mobile-shell-probe/mobile-shell-probe.json`, screenshots, server logs | `"summary"`: every MSP case `"Pass"`; MSP-12 `"hidden": []` (no history read while hidden) and `"afterShown"` first read `"dt": 42`; `"cleanup": {"frontendExited": true, "serversLeft": 0, "rootRemoved": true}` | The one unknown line was `phone-team console: Failed to load resource: … 404` in gamma's setup: headless Chrome's own `/favicon.ico` request at the origin root (gamma access log `"url":"/favicon.ico","statusCode":404`). Not product behavior (the node serves the bundle under `/mobile`; the WebView asks for no favicon). The cases module now classifies exactly that line by its source location (verified: the console location is `…/favicon.ico`). The existing cases are not rerun (none changed) |
| MSP-20 | AC-001, AC-002, AC-006 (live delay) | phone bundle through a TCP proxy: Team member, top-level agent run, Org member; the agent run's collaboration stream | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-20 --output-dir=<evidence>/MSP-20-rerun` | ENV-1 | Pass | `MSP-20-rerun/mobile-shell-probe.json` (`cases.MSP-20`), `MSP-20-phone-*.png`, `live-reconnect-log.json`, `server-gamma.log` | `"shownAfterPathPassesMs": {"agent": 16176, "team": 16180, "org": 16329}` (≤ 35 000); `"nextMarkerDelayMs": {"team": 140, "agent": 146, "org": 10}` (≤ 1 000); `"agentMarkersWhileReconnecting": 15`, `"missingOnAgentPhone": []`; collaboration `"reopenedAfterPassMs": 16045, "attemptsDuringOutage": 5`; probe `Pass`, `"unknownBrowserErrors": 0` | Same numbers in two earlier runs (`API-08-mobile-shell-probe`, `MSP-20-22-live-reconnect`: 16.15–16.34 s, ≤ 149 ms, nothing missing). Socket timeline: attempts at +1, 3, 7, 15, 31 s refused, success at +61 s (16 s after the path passes): no give-up. The agent path makes no socket attempt while its catch-up read fails (load, then open). The rerun added the collaboration assertion |
| MSP-21 | AC-003, AC-004 | phone bundle, emulated visibility; WebSocket blackhole; refused path while hidden | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-21 --output-dir=<evidence>/MSP-21-rerun-tr001` (round 2, after TR-001) | ENV-1 | Pass | `MSP-21-rerun-tr001/mobile-shell-probe.json` (`cases.MSP-21`), `MSP-21-phone-*.png`; round 1: `MSP-20-22-live-reconnect/` | glance: `"newStreams": {"phone-team": 0, "phone-agent": 0}`; hidden 35 s dead path: `"webSocketsBlackholed": 11`, `"streamsOpenedWhileHidden": {… 0, … 0}`, `"shownAfterVisibleMs": {"team": 169, "agent": 169}` (≤ 5 000), `"nextMarkerDelayMs": {"team": 145, "agent": 147}`; hidden unreachable, **counted for each phone's own run**: `"attemptsWhileHidden": {"phone-team": [], "phone-agent": []}`, `"attemptsWithin2sOfVisible"`: phone-team `{"socket": "/ws/agent-team/…", "at": 7}`, phone-agent `{"read": "GetRunProjection", "at": 8}`; `"shownAfterPathPassesMs": {"agent": 3099, "team": 3250}`; probe `Pass`, `"unknownBrowserErrors": 0` | Round 2 (TR-001): part (c) counts only the shown run's attempts: the Team phone's `/ws/agent-team/<team run>`; the agent phone's catch-up reads (`GetRunProjection`, `runId` = the agent run; read before the stream opens, so a failed read opens no socket) and `/ws/agent/<agent run>`. Round 1 counted every agent/Team/Org stream on the phone, and the agent phone's `1` was its Team stream. Parts (a) and (b) are unchanged and give the same numbers as round 1 (159 ms; 0 while hidden)
| MSP-22 | AC-005, AC-006 (sending view) | phone composer → node → a second phone; the node's raw trace file | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-22 --output-dir=<evidence>/MSP-22-rerun` | ENV-1 | Pass | `MSP-22-rerun/mobile-shell-probe.json` (`cases.MSP-22`), `MSP-22-phone-second-*-during-turn.png`, `…-after-turn.png` | `sendingView`, `duringTurn`, `afterTurn`, `sendingAfter`: `"copies": 1, "toolCallAfterMessage": true` for `team` and `agent`; `"duringTurnElapsedMs": 8947` (< 30 000); `"stored"`: `"hasMessageId": true, "hasDedupeKey": true` for `LONG-T-1 HOLD_MS:30000` and `LONG-A-1 HOLD_MS:30000`; `"secondPhoneOpenRetriesFU004": {"team": 0, "agent": 0}`; probe `Pass` | The first evidence run (`MSP-20-22-live-reconnect`) failed MSP-22 on a pre-existing open race, not on AC-005: the second phone's tap on the Team failed with `Team context '…' became mounted while it was loading.` (the phone's first history read mounts active Teams in the background, `reconcileDiscoveredActiveRuns` → `openTeamRun`, while the tap opens the same Team; neither file is changed by this ticket) → FU-004. In the debug run and in API-08 the same case passed without it |
| API-09 | AC-003 / ASM-001; FU-003 watch | the real Android app (debug APK of this worktree) in an emulator: app to background, screen off 150 s, markers meanwhile, back to front via the launcher; a cycle with Doze forced | `node evidence/API-09-emulator/emulator-background-harness.mjs --serial=emulator-5584 --apk=autobyteus-android/app/build/outputs/apk/debug/app-debug.apk --output-dir=evidence/API-09-emulator/run-6` | ENV-2 | Pass | `API-09-emulator/run-7/API-09-emulator-summary.json`, `run-7/API-09-logcat.txt`, `run-7/API-09-<cycle>-a-open.png`, `…-b-after-foreground.png` and `.txt` (the WebView's UI tree after foreground); supporting: `run-5/` (an earlier complete run), `logcat-runs-5-6.txt`; the harness `emulator-background-harness.mjs` | run-7 per cycle (team / agent / agent-doze): `"sameActivityAndTask": true`, `"screenWakefulnessAfterSleep": "Asleep"`, `"backgroundMs": 150038 / 150001 / 150058`, `"streamConnectionsWhileInBackground": []`, `logcat` `"teamConnectedAfterResumeMs": 3997 / 546 / 1221`, `"agentConnectedAfterResumeMs": 4011 / 698 / 1221` (≤ 5 000); `…-b-after-foreground.txt` lists `REPLY:EMU-T-2…4` / `REPLY:EMU-A-7…9` / `REPLY:EMU-A-12…14` at the first look (`"looks": 1`); next marker live (`"noLaterThanMs": 2110` including a 2 s UI dump, `"notBeforeMs": 47`); `"doze"` `"Now forced in to deep idle mode"`; `"error": null`, `"cleanup": {"serverExited": true, "rootRemoved": true}` | ASM-001 holds: the WebView reports hidden (streams hold; logcat `"Agent WebSocket disconnected"` ~5 s after `wm_on_stop_called`, then no connection for 150 s) and visible (`wm_on_resume_called` → both streams connected; the agent stream opens only after its catch-up commit, the Team snapshot follows its connect). FU-003 not seen: the agent catch-up read completed after Doze in 1.2 s. The first look waited 4.5 s on purpose (below), so display time is bounded by the stream times, not by the look. **Harness attempts kept, none a product result:** `run-0-anr` (an "isn't responding" dialog at first launch on a just-booted emulator, `am_anr … Waited 5068ms for FocusEvent`, load 5.26; the harness now answers it with Wait — none occurred later), `run-0-monkey` (`monkey` refuses without physical keys), `run-0-share-root` (the launcher intent started a new activity over the share-opened task), `run-0-reopen` (the app reopened the node page itself), `run-0-busy-dumps` (back-to-back UI dumps built the WebView's accessibility tree on the app's main thread and starved the page: both streams reconnected only ~64 s after resume, exactly when the dump loop ended; run-5, with pauses, reconnected 2.6–3.5 s after resume, `logcat-runs-5-6.txt`). run-7 leaves the app alone 4.5 s after foreground and pauses 1 s between looks |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | MSP-20 (Team member: 16.2 s after the path passes ≤ 35 s; next 140 ms ≤ 1 s); API-04 (scheduler unit) | Proven | — |
| AC-002 | Yes | MSP-20 (top-level agent run 16.2 s / 146 ms; Org member 16.3 s / 10 ms; the agent run's collaboration stream reopened 16.0 s after, 5 attempts during the outage); API-04 (unit per owner, collaboration included) | Proven | — |
| AC-003 | Yes | MSP-21 (hidden 35 s with dead WebSockets: no stream opened while hidden; shown 159 ms after visible; next ≤ 150 ms; glance: no new stream); API-09 (real Android app, background + screen off 150 s, three cycles incl. Doze: no connection in the background, streams reconnected with catch-up 0.55–4.01 s after resume, markers shown, next live) | Proven | — |
| AC-004 | Yes | MSP-21 (hidden while refused, each phone's own run: no Team socket and no agent catch-up read or socket while hidden; within 2 s of visible the Team socket at +7 ms and the agent catch-up read `GetRunProjection` at +8 ms); API-04 (unit, fake timers) | Proven | — |
| AC-005 | Yes | MSP-22 (Team member and agent run: one copy before the tool call in a second phone during and after the turn; stored records have `message_id` and `dedupe_key`); API-01 (server unit, old record still loads) | Proven | — |
| AC-006 | Yes | API-10 (R1 live delay, R2 short outage), MSP-20/21 (next-marker delays ≤ 150 ms), MSP-22 (sending view one copy), API-06 (`/ws/terminal` refused for a phone credential; phone routes open; 403/416), API-08 MSP-12 (no list poll while hidden), API-04 (4004 not retried), API-02, API-08 (phone shell regression, 19 cases) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

Post-repository = after API-01…07 and API-10 (reused unit/integration, server E2E, the changed fixture's probe); final = after the phone-bundle cases (API-08, MSP-20…22) and the emulator journey (API-09).

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 97% | Every AC directly proven on a real surface: AC-001/002 MSP-20; AC-003 MSP-21 + API-09; AC-004 MSP-21; AC-005 MSP-22; AC-006 API-06, API-08 (MSP-12), API-10, MSP-20…22 | Delegated copy's *conversation* after an outage is shown only at the stream level (its collaboration stream reconnects, MSP-20) plus unit tests | A delegated copy opened on the phone during an outage (needs a delegating scripted runtime mode) |
| Changed-boundary execution directness | 70% | 96% | Real sockets refused / black-holed at TCP level (MSP-20/21), real visibility lifecycle on Android (API-09), real AGY run's raw trace file (MSP-22) | Visibility is emulated in the browser cases (the emulator covers the real one) | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | Production phone bundle served by a real node, Phone Access credential, Host/Origin of a private address (MSP-20…22); the real Android shell and WebView (API-09) | Scripted runtime instead of a model (transport-equivalent per TESTING.md) | — |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | Test-owned nodes, pairing through the public API; debug APK of this worktree on Android 15 / WebView 124 | One emulator image; no physical phone or real Wi-Fi/LTE switch | A physical phone (not required by any AC) |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 95% | 45 s refused path with no give-up (5 failed attempts, then success at +61 s), dead WebSockets while hidden, refused while hidden (no attempt), short glance (no reconnect), Doze, 15 agent replies during reconnect with none lost (read-to-open window not hit), 4004 (unit) | The agent read-to-open window is narrow (one round trip); not hit in 3 × 15 tries, not proven impossible (accepted by design) | — |
| User-surface, browser, and desktop-shell confidence | 60% | 95% | Phone bundle in Chrome (22 MSP cases) and the real Android app (API-09) | Desktop renderer not exercised for DEC-003's re-sync cost (same code; not an AC); Electron shell unchanged | A desktop window hidden ≥ 30 s with several kept runs (optional) |
| Durable regression coverage quality and relevance | 80% | 95% | MSP-20…22 in `test:e2e:mobile-shell` assert each AC on the phone bundle; unit specs per owner (implementation) | The emulator journey stays a ticket-owned harness (device journeys have no package command) | — |

- Overall post-repository confidence: 73% (simple average)
- Overall final confidence: 95.4% (simple average of 97, 96, 95, 95, 95, 95, 95)
- Calculation method: simple average; no category below 95% in the final scores.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - Agent read-to-open window (design-accepted): 45 agent replies produced during reconnects across three MSP-20 runs, none lost; the window is not proven absent.
  - On the emulator the first resume after launch took 4.0 s to reconnect (later ones 0.55–1.22 s): within AC-003's 5 s, little margin on a slow device's first wake. The page acts on `visibilitychange` at once; the time is the WebView's resume.
  - FU-004 (pre-existing): a tap on an active Team while the phone's first history read mounts it fails the open; a second tap opens it.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (phone bundle on probe-owned nodes, `test:e2e:mobile-shell`) and `Lifecycle` (Android emulator journey)
- Confidence gap or residual risk it addresses, and the expected gain: unit specs use fake sockets and fake visibility; the stream lifecycle, catch-up reads, the phone's real routing/bundle and the Android WebView's visibility (ASM-001) are only provable on real surfaces. Gain: 73% → 95.4%.
- Browser validation needed, and why: yes; WebSockets, page visibility and catch-up rendering are browser behavior, and TESTING.md requires phone behavior to be proven by a `test:e2e:mobile-shell` case.

## Desktop Application Validation (When Applicable)

- Approach executed: none on Electron. The change is in the shared web client (web-equivalent renderer behavior); no Electron main, preload or packaging change. The phone bundle in Chrome proves the renderer behavior; the Android emulator proves the WebView shell's lifecycle.
- Effect on any already-running desktop application: `None` (no isolated or user instance started; the running emulators `emulator-5570`/`emulator-5590` were not ours and not touched).
- Behavior not directly proven: a desktop window hidden ≥ 30 s (DEC-003 cost); same code path as the phone; not an acceptance criterion.

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: IMP-02's identity-less record in the user's real shape (API-01), next to new records written by a real AGY run through the node (MSP-22: one raw trace file per run, `"rawTraceFiles": 3`).
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: API-01 (old record loads), MSP-22 (new records carry `message_id`/`dedupe_key`, read back through the projection by a second phone).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the probes see no give-up; the bundle has no `Max reconnection attempts`)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-live-reconnect-cases.mjs` | Added (round 2: MSP-21(c) counts each phone's own run; the phones record their GraphQL reads; MSP-20's collaboration `reopenedAfterPassMs` is `null`, not `NaN`, when none reopened) | MSP-20, MSP-21, MSP-22 | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (header lists MSP-20…22; `runCases` calls the cases module last; runtime note) | MSP-20…22 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (none removed)
- Temporary, not durable: `evidence/API-09-emulator/emulator-background-harness.mjs` (device journey; kept as evidence of what ran).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model provider | Scripted AGY CLI (`agy-failure-cli.mjs`, `interrupt_resend` / `linked_skills`) | No provider needed to prove streams and storage (TESTING.md) | None for this change (the AGY runtime's recording path is the real one) |
| The phone's network path | TCP proxy (refuse; blackhole of open WebSockets) | Deterministic outages | A real network may fail differently (e.g. half-open HTTP pooling: FU-003, not seen) |
| Page visibility in the browser cases | `document.visibilityState` override + `visibilitychange` | Headless Chrome has no app lifecycle | Covered for real by API-09 on Android |
| A phone | Android emulator (Android 15, WebView 124) | No physical device needed | Device-specific WebView builds untested |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks (alpha, beta, gamma, nuxt dev, Chrome, TCP proxy) | Yes | probe `finally` | `"cleanup": {"frontendExited": true, "serversLeft": 0, "rootRemoved": true}` in every run |
| `/tmp/api434-dev-1` (debug run, not evidence) | Yes | removed after the round | removed |
| Emulator instance `emulator-5584` (`autobyteus277_api35 -read-only`) | Yes | `adb -s emulator-5584 emu kill` | `OK: killing emulator, bye bye`; not listed afterwards |
| Harness nodes and temp roots (`api434-emulator-*`), incl. those of the stopped attempts | Yes | harness `finally`; for stopped attempts killed and removed by hand | 0 processes, 0 folders left |
| Debug APK `autobyteus-android/app/build/` | Yes | untracked build output, left in the worktree | — |
| `emulator-5570`, `emulator-5590` | No | not touched | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: code reviewer (proportional test-code review, reviewed route; round 2 after TR-001)
- Notes: final confidence 95.4%; no category below 95%. New follow-up FU-004 (pre-existing Team open race, not this change). FU-003 not observed on the realistic emulator case (incl. Doze).
