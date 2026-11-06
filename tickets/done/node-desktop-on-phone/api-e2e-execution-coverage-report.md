# API/E2E Execution Coverage Report — S3: Node desktop on the phone and in a desktop browser (autobyteus-407)

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone/tickets/in-progress/node-desktop-on-phone/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; code review CRR-002 Pass (Large / High)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - **API-08 (browser tabs):**
    - Two attempts stopped at tab 2 because of probe navigation: `/mobile/?screen=desktop` carries no run, and a draft run is not in the run list. Each tab now starts its own draft run (`API-08/README-attempts.txt`).
    - For the 5th node-wide stream, 2 raw trusted-network viewers filled the node (`filler.mjs`). The limit counts every kind of viewer.
  - **API-05 (keyboard):**
    - Gboard's auto-correction does not run in this input. The bridge's textarea sets `autocorrect="off" spellcheck="false"`, so "teh" stays "teh"; that is the designed input. Gboard's suggestion and correction taps were run instead.
    - Only Gboard is installed (`ime list -a`: Gboard + Google voice typing), so no second keyboard was available.
  - **API-09 (CR-001):**
    - A fully unreachable node cannot be reached from a freshly loaded page, because the New run form needs the node's model options.
    - With an answer already cached, an outage does not hide the entry: the answer is kept for the page's life, by design.
    - So the outage was narrowed to the availability request: the access proxy answers `GET /rest/node-desktop` with 502 while it forwards everything else, on a page that had not asked yet.
    - Attempt 1 is annotated (`API-09a-…`): its menu read did not open the menu, and a system Back left the WebView.
  - **API-10:** the implementation's `browser-probe.mjs` was rerun with one change: model search `lmstudio` → `qwen3-max` (catalog model; the run is a draft and no model is called).
  - **Clipboard:** `navigator.permissions` is undefined in the Android WebView, so noVNC's async clipboard is off in the app. No clipboard guard was needed, and the emulator's (host-shared) clipboard was never read or written.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone/tickets/in-progress/node-desktop-on-phone/evidence/` (files `API-*`, folders `API-08/`, `API-10/`)

## Routing Classification

- Task size: `Large`; Architectural risk: `High`; Input route: `Reviewed`; Successful-output route: `Code Review` (proportional test-code review), then delivery
- Proportional test-code review decision: `Required`. Its scope is small: no durable test code was added, updated or removed. The only new code is temporary probes, kept as evidence.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime / Build | Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `165de82af4` (source `0baf15a981`) | macOS 26.5.2 arm64 | Node 22.23.1, pnpm 10.28.2 | worktree (server suite) |
| ENV-2 | `165de82af4` fresh clone (removed) | macOS arm64 | buildx `server-package` (linux/arm64; carries the `/mobile` bundle); `AutoByteus.app` 1.5.12-beta.5 personal, unsigned | API-03 |
| ENV-3 | ENV-2's server package | test node `abx407-api-node` | `autobyteus/autobyteus-server:beta` `9c5aa01bb2fc` + the package read-only over `/opt/autobyteus/server-package`, fresh volumes, `127.0.0.1:56465:8000` | Phone Access on; the emulator reaches it only through a test-owned access proxy `127.0.0.1:56466` (logs every request; a fault switch for API-09) |
| ENV-4 | app debug APK (Android unchanged since `9d5da23341`) | emulator `autobyteus277_api35` (Pixel 7, 1080x2400, API 35, Gboard) | `-wipe-data`; the only adb device | paired over trusted private HTTP to `http://10.0.2.2:56466/mobile` |
| ENV-5 | ENV-3 | headless system Chrome (playwright-core 1.58.2), 1280x800 | `--host-resolver-rules=MAP abx407-node.lan 127.0.0.1` (a trusted private HTTP host for pairing) | device A, device B = separate browser contexts |
| ENV-6 | ENV-2's app | isolated desktop instance `iso-59382-850c` | own data root and ports, CDP | node added as `http://127.0.0.1:56465` |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-012, 021 (server/E2E/units), AC-S3-2 (specs), AC-S3-3, gates | server, web | Reused IMP-S3-01, 03, 05, 22, 30, 31, MP-001 | — | Pass | (implementation handoff rows) | (handoff rows) | Server unchanged since `4f11061ecf`; web rerun on `0baf15a981` (IMP-S3-30/31) |
| API-02 | green server suite | server | `pnpm -C autobyteus-server-ts test:unit` | ENV-1 | Pass | `API-02-server-unit-suite.log` | `Test Files  938 passed | 5 skipped (943)`, `Tests  8030 passed | 9 skipped (8039)` | IMP-S3-02 kept no output |
| API-03 | builds (not a required fresh-start: no build input changed, no new cross-package import) | fresh clone | `API-03-build.sh` | ENV-2 | Pass | `API-03-builds-from-fresh-clone.txt` | `exit=0` ×3; `dist/node-desktop/*`; `[typecheck] PASS`; DMG built | — |
| API-04 | AC-017, REQ-014, 015, S3-1, S3-3; SCN-004c | emulator | draft run → ⋮ (entry "VNC Viewer") → real tap; View only taps + swipe; pinch (CDP touch) / pan (adb swipe) / Fit / double tap; rotate and back; full screen + tap + Back; zoom → Control (real tap) → aimed taps; full screen Control → handle | ENV-3, ENV-4 | Pass | `API-04-ac017-emulator.txt`, `API-04-1…7-*.png`, `API-04-cdp407.mjs`, `API-04-tapsel.sh`, `API-04-node.sh` | View only: node mouse `x:300 y:300` after taps, swipe, pinch, pan, double tap; `scale(2.75)` → Fit `scale(1)`; landscape `863x360`, `Connected · View only`, node-desktop upgrades still `1`; full screen `barVisible:false`, tap → `true`, Back → `?screen=desktop`; Control after zoom `transform: none`; aimed 1600,800 → `x:1598 y:799`, aimed 400,250 → `x:399 y:248`; handle → bars back, mouse unchanged `x:399 y:248` | — |
| API-05 | AC-S3-1, REQ-S3-2, SCN-004b | emulator + Gboard keys | Control → Keyboard; Gboard on-screen keys tapped (`API-05-gboard.sh`); node capture terminal (`cat > file`) | ENV-3, ENV-4 | Pass | `API-05-keyboard-gboard.txt`, `API-05-1…3-*.png`, `API-05-strip-*.png` | node file `a b \n t e h ␠ \n h e l l o ␠ \n w o r l d ␠ \n`: `abc`+Backspace+Enter → `ab`; suggestion "hello" after `hel` → `hello ` once; correction "world" for `wrold` → `world ` once | Tab not on Gboard (unit-tested); no other keyboard installed |
| API-06 | AC-019, REQ-016 | emulator lifecycle | Control stream; Home; sample upstream; return | ENV-3, ENV-4 | Pass | `API-06-ac019-background.txt`, `API-06-after-return.png` | upstream `0` at +1.21 s; `stream ended mode=control viewer=mobile … reason=viewer-closed`; same pid `4335`; return → `Connected · View only`, up `1` | — |
| API-07 | AC-012, REQ-009, SCN-009a | emulator + owner routes | (a) Phone Access off while streaming, reopen, on, reopen; (b) revoke while streaming, reopen (`API-07-ac012.sh`) | ENV-3, ENV-4 | Pass | `API-07a-phone-access-off.txt`, `API-07b-revoke.txt`, `API-07-off/revoke-not-allowed.png` | (a) `+4.8s status=This viewer is not allowed on this node up=0`, `reason=node-closed close=PHONE_ACCESS_DISABLED`; reopen (upgrade 23:24:36Z) still not allowed, up 0; on again → `Connected · View only`. (b) `+15.6s … not allowed up=0`, `close=REMOTE_ACCESS_DEVICE_REVOKED`; reopen (upgrade 23:29:51Z) refused | Phone Access off was not run on a device before |
| API-08 | AC-021, REQ-019, SCN-006a | browser (one device, 3 tabs; device B), raw filler viewers, desktop app tile | `API-08/AC021-browser-tabs.mjs`; tile: 4 fillers → node window VNC Viewer → stop fillers → Retry | ENV-3, ENV-5, ENV-6 | Pass | `API-08/AC021-results.json`, `API-08/AC021-1…3-*.png`, `API-08/API-08-desktop-tile-too-many-retry.txt`, `API-08/API-08-tile-*.png` | tab 3: `"status":"Too many viewers on this node right now","offer":"Retry","upstream":"2"`; tab 1 closed → tab 3 Retry `Connected · View only`; 2 fillers → up `4`; device B: `Too many viewers…`, `Retry`, up `4`; fillers closed → B Retry connected; tile with 4 streams: `Too many viewers on this node right now`, buttons `Retry`, up `4`; after fillers stop, Retry → `Connected · View only`, up `1` | Refused streams opened no upstream (counts unchanged) |
| API-09 | CR-001, REQ-S3-4 | emulator, availability | `API-09-cr001.sh`: fresh page; availability answers 502 (fault switch); draft run → ⋮; fault off; Back to runs → draft run → ⋮ | ENV-3, ENV-4 | Pass | `API-09-cr001-availability-error-then-back.txt`, `API-09-1-error-menu.png`, `API-09-2-back-menu.png`, `API-09-access-proxy.mjs`, `API-09a-…` (annotated) | first run screen: `injected-502` 23:28:39Z, menu `["Artifacts","Files","Activity"]`; next run screen: app's `GET /rest/node-desktop` 23:28:56Z, menu `[…,"VNC Viewer"]`, same pid `5511` | — |
| API-10 | AC-018 | browser | rerun of `evidence/browser-probe.mjs` (search term changed) | ENV-3, ENV-5 | Pass | `API-10-ac018-browser-rerun.txt`, `API-10/*` | `"mouseOnNode":"x:300 y:300"` in View only; zoom `scale(4)`, pan, Fit, double click → `scale(1)`; full screen both modes; Control click `x:959 y:540`; `{"result":"done","error":null}` | — |
| API-11 | QR-S3-3 privacy | logs | grep docker logs + supervisor logs + data-dir logs | ENV-3 | Pass | `API-11-log-scan.txt` | `access_token=` values, `mra_`, `pairing=eyJ`, `pairingCode`, typed markers: all `0`; 5 metadata-only `[node-desktop]` line shapes | — |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-017 phone view, View only, rotate, pinch/pan/double tap, full screen, no input until Control | Yes | API-04, IMP-S3-10…15 | Proven | A physical phone ("optional, by the user" in the AC); emulator used per the team rule |
| AC-018 desktop browser with mouse / Ctrl+wheel | Yes | API-10, IMP-S3-21 | Proven | — |
| AC-019 background ends the stream, return reconnects View only | Yes | API-06, IMP-S3-19, MP-001 | Proven | — |
| AC-012 revoke / Phone Access off ends the stream ≤ 30 s, reconnect refused | Yes | API-07 (4.8 s off, 15.6 s revoke), IMP-S3-01 route E2E | Proven | — |
| AC-021 5th node-wide or 3rd per phone refused before upstream; both clients show it | Yes | API-08 (phone view ×2 paths + desktop tile), IMP-S3-01 | Proven | — |
| AC-S3-1 keyboard: characters, Backspace, Enter arrive | Yes | API-05, IMP-S3-17 | Proven | — |
| AC-S3-2 no entry without a node desktop / remote run | Yes | IMP-S3-30 (`MobileRunScreen.spec.ts` availability × remote), API-09 (entry hidden while availability errors, shown when available) | Proven (UI tests, as the AC specifies) | — |
| AC-S3-3 docs | No | IMP handoff / CRR-002 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | all AC rows | — | — |
| Changed-boundary execution directness | 85% | 96% | real WebView touch/keys through the system, node-side pointer/keys/upstream truth, real owner routes | — | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | emulator app ↔ real node, two real browser devices, the desktop app, raw viewers | CR-001 outage narrowed to a 502 on one route (API-09 reasoning) | a listed run with a message (needs a model call) |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | fresh-clone package and app; real pairing per device; the only installed keyboard | the physical phone is user-only (AC-017), excluded per the gate | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 96% | background, Phone Access off, revoke, refusals and Retry on both clients, availability error recovery, rotation | — | — |
| User-surface, browser, and desktop-shell confidence | 80% | 95% | screenshots of every state on phone, browser, desktop tile | — | — |
| Durable regression coverage quality and relevance | 92% | 92% | 132 server node-desktop tests, 8030 server unit, 1182 web specs incl. CR-001 | the device and multi-client journeys have no durable suite | a gated emulator/browser suite (outside this ticket) |

- Overall post-repository confidence: 84%
- Overall final confidence: 95.0% (simple average: 96, 96, 95, 95, 96, 95, 92)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  1. Physical phone: user-only, optional per AC-017.
  2. Only Gboard was available; CJK is not guaranteed (approved).
  3. CR-001 was proven on a dropped availability request, not a whole-node outage (not reachable from a fresh page).
  4. No durable device suite.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle` (emulator), `Browser` (multi-context Chrome), `Project Desktop Validation` (isolated instance), `Live API` (owner routes, raw viewers)
- Gap addressed: refusals rendered on real clients, Phone Access off on a device, the CR-001 path, Gboard suggestions and corrections, Control after zoom, and independent device reruns. Expected gain: 84% → 95.0%.

## Desktop Application Validation

- The tile's "Too many viewers" + Retry in an isolated instance of the fresh-clone build (API-08). Effect on any running desktop application: `None` (own instance, stopped, data root removed).

## Persisted-Data Transition Checks

- `Not Affected` (the viewer registry is in memory).

## Compatibility / Legacy Scope Check

- No compatibility scope; the removed `'vnc'` mobile gate and the Phase One text are gone; no compatibility-only coverage.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`

None.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Android phone | emulator | team rule | OEM devices |
| Other node viewers | raw trusted-network RFB clients (`filler.mjs`) | quick, deterministic way to reach the node-wide limit | they count like any viewer; not a UI |
| A dropped availability request | access proxy 502 for `GET /rest/node-desktop` only | a fresh page cannot reach a run with the node fully down | one route |
| Node access log | access-logging proxy | the node logs no requests | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Test node `abx407-api-node` + 5 volumes | Yes | `docker rm -f -v`, volume rm | Removed (`API-99-cleanup.txt`) |
| Access proxy, filler viewers | Yes | killed | Stopped |
| Emulator, app data, adb forwards | Yes | `pm clear`, `forward --remove-all`, `emu kill` | Done; `adb devices` empty |
| Isolated instance `iso-59382-850c` | Yes | `isolated-app stop` | Stopped, data root removed |
| Headless Chrome contexts | Yes | closed by the probes | Done |
| `/private/tmp/abx407-api` (fresh clone, builds, probes) | Yes | `rm -rf` after copying the evidence | Removed |
| User's nodes, phone, Mac clipboard | No | never addressed | `autobyteus-server-0/1/2` Up |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: AC-017 on a physical phone (optional, by the user)
- Notes:
  - **By design:** Gboard does not auto-correct in the keyboard bridge (`autocorrect="off"`). Suggestion and correction taps work and reach the desktop once.
  - **By design:** the availability answer stays cached for the page's life (handoff Known Risks); only an error is asked again (CR-001, proven).
  - **Observation:** a node-desktop refusal (4429) writes no log line. Only ended streams are logged.
