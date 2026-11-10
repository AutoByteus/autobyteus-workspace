# API/E2E Coverage Investigation — small-follow-ups-batch-435 (autobyteus-435)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-003, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-003, Ready; DS-006b)
- Supplemental Task Artifacts: `follow-ups.md` (FU-001…FU-004)
- Design Review Report: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass CRR-002 (message from `/software_engineering_team/code_reviewer`), head `d37397b40d`
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

All paths are in the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/`.

## Current Requirement And Design Basis

Twelve bounded fixes (REQ-001…REQ-012). Behavior that must be proven beyond implementation evidence:

- REQ-003 / AC-003-1: in the Electron window, a node whose Host gate refuses the typed name gives "Something answers at {{host}}, but it refuses this window…" on Add and on its row; a closed port keeps "No answer from that address." (DS-002, `utils/nodeIdentityProbe.ts`).
- REQ-004 / AC-004-1: Android viewer full screen lays out in the cutout in both landscape directions (page width = screen width); leaving full screen restores insets (DS-005).
- REQ-005: the phone route names the open agent/Team subject (`row`), from a tap or Create run (the route follows the draft's promotion, DS-006b); a reload or Android's process-death restore reopens it after "Opening…"; gone → list; a reload before the first send → list (AC-005-8). AC-005-2 (Android process death with the viewer in full screen), AC-005-6 (Create run, first message, reload/process death).
- REQ-006 / AC-006-1: Clipboard sheet Send visible and tappable in landscape full screen with the keyboard open (real taps; the node clipboard changes).
- REQ-007 / AC-007-1, REQ-008 / AC-008-1: Android overlay words for an HTTP error; Retry reloads a pending pairing link.
- REQ-010 / AC-010-3: full phone probe without the FU-003 health exemption and with MSP-32 (no refused request after revocation).
- REQ-011 / AC-011-1, AC-011-2: a Task closed/reopened while its listed host run is stopped: rows follow within one refresh on desktop and phone; at most one view re-read per digest value (DS-007).
- Build inputs changed (contracts `dist`, `generated/graphql.ts`, `typecheck-baseline.json`): fresh-start build.

Accepted limit (SR-003): an entry pushed before the first send and first visited only after a reload names the draft and shows the list. Not a failure.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001, SCN-002, SCN-004, SCN-005, SCN-006, SCN-007, SCN-008, SCN-009, SCN-010.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-002 row form: a node row added while its name was allowed, then the node restarted without that name in `AUTOBYTEUS_ALLOWED_HOSTS` (the user's `.local`/Tailscale name changes); trigger: the Nodes page asks the row again.
  - SCN-005 Create-run form with a view opened before the first message, then Forward to it after the send (DS-006b watch path); trigger: the user's Back/Forward and reload.
  - SCN-010 trigger: the host run is stopped by the user, then another Project Task Manager run (or agent) closes the Task with `update_task`; the user's Tasks have no status action (`updateProjectTask` carries none), so an agent's `update_task` is the real trigger.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 health request at page start | Changed | REQ-001; IMP-01 vs IMP-10/IMP-15 | Reuse IMP-15 (probe without exemption); Electron overlays preserved by unit specs (IMP-13) |
| BEH-002 Nodes page cause | Added | REQ-003, DEC-002 | Electron app check against a refusing node (API-13); unit specs reused |
| BEH-003 dead code | Removed | REQ-002 | Reuse IMP-13 (suite + typecheck) |
| BEH-004 cutout in full screen | Changed | REQ-004 | Emulator both directions (API-07); instrumented tests (API-06) |
| BEH-005 phone route `row` + restore | Added | REQ-005, DS-006/006b | Durable probe case MSP-33 (API-14); Android process death (API-09, API-10) |
| BEH-006 Clipboard Send layout | Changed | REQ-006 | Emulator real taps (API-08) |
| BEH-007 overlay words | Changed | REQ-007 | Emulator 502 through a proxy (API-12) |
| BEH-008 pairing Retry | Changed | REQ-008 | Emulator: proxy down at first load, Retry after it is back (API-11) |
| BEH-009 credential-refusal close / session teardown | Changed | REQ-010 | Reuse IMP-15 MSP-32, MSP-18; rerun in the final full probe (API-17) |
| BEH-010 stopped-host digest | Changed | REQ-011 | Durable probe cases MSP-34 (phones) and MSP-35 (desktop window) (API-15, API-16) |
| BEH-011 shared key | Changed (no behavior) | REQ-012 | Reuse IMP-06/IMP-08; fresh-start build (API-02) |
| BEH-012 guide note | Added | REQ-009 | Docs review (delivery) |
| Org route keys / Back order | Preserved | AC-005-4 | MSP-05 (label corrected) in the full probe |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `getAgentStatuses` inactive digest | IMP-07 (store spy) | live poll loop across GraphQL + client | Browser probe (MSP-34/35) |
| API / transport / contract | Yes | GraphQL field meaning; WebSocket close codes | IMP-07, IMP-13, IMP-15 | none beyond the probe | Probe |
| Frontend component / state | Yes | stores, phone shell, restore, sync | IMP-13 (5586 tests) | real bundle timing | Probe |
| Browser integration / user journey | Yes | phone route, reload, Back/Forward | IMP-11, IMP-14 (temporary scripts) | not durable | Durable probe case MSP-33 |
| Authentication / session / permissions | Yes | session-removal teardown | IMP-15 MSP-13/18/32 | — | Final full probe |
| Desktop renderer / web-equivalent UI | Yes | Nodes page words, desktop run list | unit specs | desktop list refresh for a stopped host | MSP-35 |
| Desktop shell / Electron-specific integration | Yes | `file://` window's `fetch` and opaque `no-cors` request | unit specs with a fake fetch | real Electron network stack and the node's Host gate | Isolated desktop instance of the fresh-clone build (API-13) |
| Process / lifecycle | Yes | Android process death restore, reload | none on Android | everything | Emulator (API-09, API-10) |
| Persisted-data transition | No (`Not Affected`) | Android saved URL read as before | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Android WebView, cutout, keyboard, VNC | Android units (IMP-09), instrumented compiled only | all device behavior | Emulator API 35 + test Docker node |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435`, branch `codex/small-follow-ups-batch-435`, head `d37397b40d` (code `f9cb6f7153`).
- Project type and runtime stack: pnpm monorepo; Nuxt web + Electron desktop, Node/TypeScript server, Android WebView shell (Kotlin), Docker node image.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/TESTING.md` (root; no closer `TESTING*.md` in the changed packages).
- Conflicting, missing, or unclear project instructions: TESTING.md § Android emulators asks for a ticket-owned AVD on its own port; existing AVDs belong to other tickets, so this run creates `abx435_api35`. The guideline's Docker Hub-dependent `# syntax` line is handled as 432 did (a copy without it) if Docker Hub is unreachable.
- Changed build-input paths: `autobyteus-collaboration-stream-contracts/{src,dist,tests}/…`, `autobyteus-web/generated/graphql.ts`, `autobyteus-web/typecheck-baseline.json` → fresh-start build case API-02 (desktop macOS ARM64 job). No Android build input (`*.gradle.kts`, `gradle/**`) changed: the Android job's empty-Gradle-home build is not required; the APK is built from the same fresh clone (API-05).
- Required environment variables or secrets available: `N/A` (no provider key: scripted AGY CLI in the probe; local LM Studio for the Docker node's runs).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | testing guideline | layers, rerun by impact, fresh-start build steps, Docker test node rules, Android emulator rules (own AVD, `-no-window`, no `uiautomator` in landscape), browser probe rules, one heavy run at a time |
| `RELEASE.md`, `.github/workflows/release-desktop.yml`, `release-server-docker.yml` | release jobs | desktop job: `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64`, Prisma and terminal-runtime verification; server job builds `Dockerfile.monorepo` |
| `docs/isolated-app-instances.md` | desktop instance | `pnpm --silent isolated-app start --app <AutoByteus.app>`; CDP at `controlPort`; `stop` |
| `docs/android_mobile_access.md`, `autobyteus-android/README.md` | Android | install, `pm clear`, share intent pairing, instrumented tests list |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` + case modules | phone probe | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<new> [--cases=…]`; needs `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web` |
| `autobyteus-web/tests/e2e/fixtures/probe-node-access.mjs` | node credentials | `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL` for test nodes; never written to evidence |
| `autobyteus-server-ts/src/api/security/remote-access-request-host.ts` | Host gate | IPs, `localhost`, dotless and local-suffix names are admitted; a public-style name such as `127.0.0.1.nip.io` (resolves to 127.0.0.1) is refused unless in `AUTOBYTEUS_ALLOWED_HOSTS` |
| tickets/done `phone-viewer-landscape-fullscreen` (432) API-07/API-08, `phone-node-name-privacy` (433) API-11 | prior device procedures | DevTools + `adb input tap` in landscape; pid-checked `am kill`; a TCP proxy in front of the node for first-load failures |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Fresh clone | `/private/tmp/abx435-api/fresh-clone` | `evidence/api-e2e/API-02-fresh-start-build.sh d37397b40d` | ~30 min | `ALL DONE`, exit codes 0 | `rm -rf` after the Electron check |
| Server package for the test node | fresh clone | `docker buildx build -f Dockerfile.monorepo --target server-package --output type=local,dest=/private/tmp/abx435-api/server-package .` | linux/arm64 | package folder present | `rm -rf` |
| Test Docker node `abx435-api-node` | — | `docker run` of `autobyteus/autobyteus-server:beta` + package mounted read-only, `127.0.0.1:<port>`, fresh volumes, launch owner credential, `LMSTUDIO_HOSTS=http://host.docker.internal:1234` | Xfce desktop, Chromium, noVNC | `/rest/health` 200 | `docker rm -f -v`, volumes removed |
| Emulator `abx435_api35` | — | `avdmanager create avd` (android-35 google_apis arm64, pixel_7), `emulator -avd abx435_api35 -port 5600 -no-window` | serial `emulator-5600` only | `sys.boot_completed=1` | `emu kill`, `avdmanager delete avd` |
| TCP proxy for pairing/502 cases | `/private/tmp/abx435-api` | `node API-11-proxy.mjs` (modes `pass`/`502`/`stopped`) | port in front of the test node | listening | process ends |
| Isolated desktop instance | worktree | `pnpm --silent isolated-app start --app <fresh-clone AutoByteus.app>` | own data root, free ports | `start` JSON | `isolated-app stop <id>` |
| Refusing node for AC-003-1 | worktree | `node autobyteus-server-ts/dist/app.js` on `127.0.0.1:<port>`, own data root/HOME, without/with `AUTOBYTEUS_ALLOWED_HOSTS=127.0.0.1.nip.io` | — | `/rest/health` | process killed, data removed |
| Phone probe stack | `autobyteus-web` | `pnpm -C autobyteus-web test:e2e:mobile-shell` | probe-owned nodes, Chrome | built-in | built-in cleanup receipt |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Paired phone (Android) | node REST `PUT /remote-access/settings`, `POST /remote-access/pairing-sessions` with the test credential; link shared into the app (`ACTION_SEND`) | pairing link and credential never written to evidence | container removed; `pm clear` |
| Runs with a message (Android restore) | phone New run → Create run → one message to the local LM Studio model | local model, one message per run; unloaded if loaded for this run | container removed |
| Desktop picture and clipboard | the image's own Xfce desktop, `xclip` | test container only | removed |
| Probe data | the probe's own scripted AGY runs, Projects, Tasks | probe-owned roots | probe cleanup receipt |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` MSP-01…MSP-20, MSP-32 | phone shell journeys; MSP-32 no refused request after revocation | AC-001-1, AC-010-3, preserved | Still Valid | IMP-15 Pass at `f9cb6f7153` | Run in the final full probe |
| same, MSP-05 "a reload of a run entry lands on the list" | after Forward to an **Org** entry, a reload lands on the list | AC-005-4 (Org unchanged); REQ-005 now reopens agent/Team subjects | Needs Update (label only) | the reloaded entry is the Org entry; assertion still true for Org | Message and comment say "Org entry" (AC-005-4) |
| same, MSP-07 Create run + first message | the screen stays, the run gets its permanent ID | REQ-005 entry form 2 | Still Valid | IMP-15 | Route and reload coverage added in MSP-33 instead of growing MSP-07 |
| `mobile-closed-task-rows-cases.mjs` MSP-24…27 | closed Task rows leave for active hosts | autobyteus-446; REQ-011 preserved active rule | Still Valid | IMP-15 | Run with MSP-34/35 |
| `mobile-live-reconnect-cases.mjs`, `mobile-file-open-cases.mjs` | reconnects; file open | preserved | Still Valid | IMP-15 | Final full probe |
| Web specs (`useMobileRouteRunSync.spec.ts`, `useMobileSubjectRestore.spec.ts`, `credentialRefusalClose.spec.ts`, `nodeIdentityProbe` specs, collaboration store specs …) | unit/component | all web AC | Still Valid | IMP-13 | Reused |
| Server `standalone-agent-run-root.test.ts`, `agent-run-collaboration-statuses.test.ts` | inactive digest from memory | AC-011-1 (server), QR-002 | Still Valid | IMP-07 | Reused |
| Android unit tests; instrumented `SystemBarInsetsTest`, `DesktopFullScreenWindowTest`, `WebShellWindowInsetsTest`, `AutoByteusMobileShellSmokeTest`, `MainActivityConfigurationChangeTest` | insets, full screen, shell | AC-004-1/2 | Still Valid; instrumented never run for this change | IMP-09 (compiled) | Run on the emulator (API-06) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001-2, AC-002-1, AC-003-2/3, AC-005-1…8 (units), AC-006-2, AC-010-1/2, AC-011-2, AC-012-1, AC-007-1, AC-008-1 (units), AC-004-2 (units) | web, server, contracts, Android units | Reused | IMP-13 (web typecheck + full suite, `f9cb6f7153`), IMP-06, IMP-07, IMP-08, IMP-09 | Only `docs/design-cases.md` and ticket files changed after `f9cb6f7153`; server, contracts and Android unchanged since `e5ca0e1da7`/`6ca743fee0` (`git diff --name-only`) |
| API-02 | build inputs | release desktop job | Durable (project rule) | `evidence/api-e2e/API-02-fresh-start-build.sh d37397b40d` | contracts `dist`, `generated/graphql.ts`, `typecheck-baseline.json` changed |
| API-03 | AC-003-1/2 (words), boundaries | web guards | Existing Test | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | IMP-05 ran before the rework's new files |
| API-04 | release server image build | server package (Dockerfile.monorepo `server-package`) | Existing build | buildx from the fresh clone | also the test node's server |
| API-05 | Android build | APK + test APK from the fresh clone | Existing build | `./gradlew :app:assembleDebug :app:assembleDebugAndroidTest` | device cases run the commit's build |
| API-06 | AC-004-2, AC-004-1 (window) | instrumented tests, API 35 | Existing Test | `am instrument -w org.autobyteus.mobile.test/androidx.test.runner.AndroidJUnitRunner` on `emulator-5600` | compiled only so far |
| API-07 | AC-004-1 | viewer full screen, both landscape directions | Journey | full screen on, rotation 90 and 270, page `innerWidth`×DPR vs screen width; Fill picture width; leave → insets back | device only |
| API-08 | AC-006-1 | Clipboard sheet with keyboard, landscape full screen | Journey | real `adb input tap` on the strip's Clipboard, the field, type, tap Send; node `xclip` | device only |
| API-09 | AC-005-2 | Android process death | Journey | a run with one message → VNC Viewer → full screen → Home → pid-checked `am kill` → launcher → same run's viewer in full screen, landscape | device only |
| API-10 | AC-005-6 (Android) | Create run → first message → process death | Journey | New run → Create run → message → (Activity) → Home → `am kill` → launcher → same run and screen | device only |
| API-11 | AC-008-1 | pairing link, node unreachable at first load, Retry | Journey | proxy stopped → share link → overlay → proxy `pass` → Retry → pairing page pairs | device only |
| API-12 | AC-007-1 | HTTP error overlay | Journey | proxy `502` on a saved node's page → overlay words, no address | cheap with the same proxy |
| API-13 | AC-003-1 | Electron window Nodes page ↔ real node Host gate | Journey | fresh-clone app as isolated instance; Add `http://127.0.0.1.nip.io:<port>` (refused) → words; a row whose node restarted without the name → words; closed port → "No answer from that address." | shell-specific `file://` fetch |
| API-14 | AC-005-1, -3, -6, -7, -8 | phone bundle reload restore | Durable | `test:e2e:mobile-shell --cases=MSP-33,…` (new MSP-33) | IMP-11/IMP-14 were temporary scripts; CR-001 shows the risk |
| API-15 | AC-011-1, AC-011-2 (phones) | stopped host, live node, phone lists | Durable | `--cases=MSP-24,MSP-25,MSP-26,MSP-34` (new MSP-34) | live run required by AC-011-1 |
| API-16 | AC-011-1 (desktop) | stopped host, desktop window | Durable | `--cases=MSP-27,MSP-35` (new MSP-35) | desktop list |
| API-17 | AC-001-1, AC-010-3, all MSP | full phone probe | Existing Test | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<new>` at the final commit (deferred to the rework round: F1/F2 need product changes) | the probe files changed; one full run proves the cases together |
| API-18 | REQ-004 (DS-005 API 28–34 branch) | viewer full screen on Android 14 | Journey (added during execution) | `probes/api18.sh` on a ticket-owned API 34 AVD, `dumpsys activity top` | the design's `SHORT_EDGES` branch for API 28–34 had only a unit test with a fake `Display` |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-14 | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` MSP-33 | REQ-005 restore and DS-006b had a review failure (CR-001); rendered proof was a temporary script |
| API-15 | `autobyteus-web/tests/e2e/mobile-closed-task-rows-cases.mjs` MSP-34 | AC-011-1 asks for a live run; no durable stopped-host case existed |
| API-16 | same, MSP-35 | the desktop list half of AC-011-1 |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-17 | `mobile-shell-probe.mjs` MSP-05 | assertion message and comment: "a reload of an Org entry lands on the list (AC-005-4)" | assertion unchanged; the reloaded entry is the Org entry |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron (`autobyteus-web/electron`), packaged macOS ARM64 build.
- Testing guideline, README, or development instructions used: TESTING.md (Isolated desktop instance), `docs/isolated-app-instances.md`.
- Web-equivalent behavior: run-list refresh (desktop window in the probe, MSP-35), Nodes page words in a browser window (unit, AC-003-2).
- Shell-specific or lifecycle behavior: the `file://` window's readable and opaque requests to a node's Host gate (AC-003-1).
- Chosen validation approach and why it fits the project: the fresh-clone packaged app (API-02's output) started as an isolated instance, driven over CDP; nodes are test-owned worktree servers.
- Server/frontend setup when browser validation is used: the probe's own `nuxt dev` against its node for MSP-35.
- How the run avoids disturbing an already-running desktop application: isolated instance with its own data root and ports; the user's app and `autobyteus-server-0/1/2` are not addressed.

## Live Environment And Fixture Plan

- Startup order and commands: (1) API-02 fresh clone build; (2) API-04 server package; (3) API-05 Android build; (4) test Docker node; (5) emulator; (6) device journeys; (7) refusing node + isolated instance; (8) probe runs (worktree `dist` and phone bundle rebuilt from `HEAD` first). One heavy run at a time.
- Environment choices that materially affect the run: emulator API 35 with a display cutout, gesture navigation, auto-rotate off; the emulator reaches the host at `10.0.2.2`; the Docker node's pairing URL `http://10.0.2.2:<port>`.
- Health / readiness checks: `/rest/health`; `sys.boot_completed`; DevTools socket `webview_devtools_remote_<pid>`.
- Seed data / fixtures: created through the phone UI and the node's public API only.
- Test identities, authentication, permissions, or session state: launch owner credential generated per run (never stored); phone credential from pairing.
- Requirement-linked journeys or scenarios: API-07…API-13 above.
- Evidence to capture: DevTools DOM/state lines, `dumpsys` lines, screenshots, node `xclip`, probe JSON.
- Owned processes and temporary state to clean up: container + volumes, emulator + AVD, proxy, refusing node + data root, isolated instance, fresh clone, `/private/tmp/abx435-api` temporary files (evidence copied first).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Signed/notarized desktop build, other OS builds, signed `assembleRelease` | need the runner's secrets/OS | low (no signing input changed) | No | release pipeline |
| Cutout on vendor devices other than the emulator's (UNK-001) | no physical phone (team rule) | low | Yes (a real phone) | delivery asks the user if wanted |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| F1: on Android 9–14 the window decor still insets the content by the cutout; `SHORT_EDGES` alone does not let the page use the strip (REQ-004) | `Design Impact` | API-18 (`android:id/content` at `136,0-2400,1080`, page 863 of 915 CSS px) | Solution Designer, through failure-origin review |
| F2: the Electron window reads the node's 403 (no CORS applied), so the new opaque request never runs and the row says "isn't an AutoByteus node" (AC-003-1, DEC-002) | `Design Impact` | API-13 (`{"status":403,"type":"basic"}` in the window; Chrome pages opaque) | Solution Designer, through failure-origin review |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (MSP-33, MSP-34, MSP-35 added; MSP-05 label updated)
- Reroute Required Before Validation Execution: `No` (found during execution: F1, F2 → failure-origin review)
- Recommended Owner If Reroute Required: Solution Designer (preliminary), confirmed by failure-origin review
- Notes: test-code review is requested on Pass (reviewed High route). HEAD moved to `432d1c3af2` (IR-003, items 13–14) during the round; those items are not in this round.
