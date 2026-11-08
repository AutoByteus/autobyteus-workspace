# API/E2E Coverage Investigation — small-follow-ups-batch-426, round 1

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. The results, the confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/requirements-doc.md` (SR-006, round-1 rows)
- Investigation Notes: `…/small-follow-ups-batch-426/investigation-notes.md`
- Solution Revision Record: `…/small-follow-ups-batch-426/solution-revision-record.md` (SR-001…SR-006)
- Design Spec: `…/small-follow-ups-batch-426/design-spec.md` (D-01…D-19)
- Supplemental Task Artifacts: Product spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-setup-remote-node-wording/ui-ux-spec.md` (VIS-001…009); `product-design-request.md`; `follow-ups.md` (FU-001, FU-002)
- Design Review Report: `…/small-follow-ups-batch-426/design-review-report.md` (ARCH-REV-002…004 Pass; RR-01…RR-03)
- Architecture Review Revision Record: `…/small-follow-ups-batch-426/architecture-review-revision-record.md`
- Implementation Handoff: `…/small-follow-ups-batch-426/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `…/small-follow-ups-batch-426/implementation-revision-record.md`
- Code Review Report: `…/small-follow-ups-batch-426/code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `…/small-follow-ups-batch-426/code-review-revision-record.md`
- Delivery Revision Record: N/A (no delivery re-entry)
- API/E2E Revision Record: `…/small-follow-ups-batch-426/api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-002` (round 2 rerun; API-REV-001 was round 1)
- Current Investigation Round: 2 (rerun after F-API-001 / F-API-002)
- Trigger: code reviewer's CRR-005 Pass, 2026-11-08; head `d115f1601d` (last code commit `c8b4b659cd`); SR-008 (D-02 credential check, D-03 share re-run rule; AC-004 split into AC-004a now and AC-004b in round 2)
- Prior Investigation Reviewed: round 1 (API-REV-001, Fail)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

Round 1 of autobyteus-426 has 16 items (D-01, 02, 03, 05, 06, 07, 08, 10, 11, 12, 13, 14, 16, 17, 18, 19). Items 4 and 15 were dropped and item 9 is in round 2. Classification: Medium / High (D-07 WebView navigation rule; D-02 credential drop). What must be proven:

- **Phone web shell** (phone bundle `/mobile`):
  - AC-001: the package-definitions feed opens only while the phone is paired.
  - AC-002: a revoked phone gets the pairing screen.
  - AC-003: with Phone Access off, the bar and banner change, the session is kept, and the runs load again once it is back on. Off → unreachable shows "Can’t reach".
  - AC-008: the "Open a folder by path" field gives the refusal reason.
  - AC-019: a read-only conversation shows the file status line.
  - AC-005: the clipboard sheet in Control mode.
- **Android app**:
  - AC-004: process-death restore of the open page, and the removed-node case.
  - AC-007: a same-origin `blob:` subframe loads, sandboxed and without `AutoByteusShell`. Main-frame blob, foreign blob, `file:` and `javascript:` stay blocked (RR-01; escalation trigger (b)).
  - QR-001: no new permission.
- **Server**:
  - AC-008: an unregistered path must be an existing absolute folder, refused with `WORKSPACE_PATH_REFUSED`. Registered paths still load. RR-03: server-internal launches are refused too.
  - AC-006: one log line per 4429 refusal.
  - AC-018: address kinds `public`, no link-local.
  - AC-014: the four server E2E tests.
- **Tests and docs**: AC-010 (B04), AC-011 (NVP-05), AC-012 and AC-013 (docs).
- **Web**: AC-016 (remote Phone Setup wording) and AC-017 (app UI locale, plus the guard).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, 002, 003, 004, 005, 006, 007, 008, 011, 012, 013, 014.
- Real-use scenarios added from the implementation:
  - SCN-A1: **A phone page opened from a pairing link, then unpaired by the user** (trigger: "Unpair from `<node>`"). The feed must close and not retry. AC-001 names it; the case adds the paired → unpaired transition on the real bundle.
  - SCN-A2: **The read-only phone conversation is an Org's delegated task agent after the Org run was stopped** (trigger: Org run terminated on the node, then the user opens the task agent's row). Read-only phone targets exist only for Org task agents and task-team members; `teamExecutionViewState` always returns `live` and only `agentOrgExecutionContext` / `agentOrgContextsStore` produce `read_only`.
  - SCN-A3: **The phone's HTML preview without a workspace file is a message reference to an `.html` file** (Messages view → reference). `CollaborationMessageReferenceViewer` → `FileViewer` without `relativeResourceContext` → `HtmlPreviewer` builds a `blob:` URL. Artifacts use the same path.
  - SCN-A4: **Desktop New chat with a typed folder in a browser window** (`ChatWorkspaceMenu` → `resolveRunWorkspaceChoice`): the desktop half of AC-008.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 feed only while paired (phone) | Changed | D-01; `app.vue` | Phone-bundle case for unpaired, paired and unpaired; remove the probe's known-line exemption |
| BEH-002 revoked → pairing; off → banner, session kept | Changed | D-02 / SR-005 | Phone-bundle cases on a real node (403 bodies through Apollo) |
| BEH-003 Android open-page restore | Added | D-03 | Emulator process death + unit (IMP-12) |
| BEH-005 phone clipboard sheet | Added | D-05 | Emulator + Docker node desktop; specs (IMP-09) |
| BEH-006 4429 log line | Added | D-06 | Route E2E (IMP-07) + full suite |
| BEH-007 same-origin blob subframe allowed | Changed (security boundary) | D-07 | Emulator, product path; policy unit (IMP-12) |
| BEH-008 folder check for unregistered paths | Added (contract `WORKSPACE_PATH_REFUSED`) | D-08; RR-03 | Server E2E (IMP-07) + full suite (145 of 236 E2E files register workspaces); phone field case; desktop journey |
| BEH-010/011 probes | Changed (tests) | D-10, D-11 | Run B04, NVP |
| BEH-012/013 docs | Changed | D-12, D-13 | Doc read |
| BEH-014 four E2E tests | Changed (tests) | D-14 | IMP-07 + full suite |
| BEH-016 remote Phone Setup text | Changed | D-16 | IMP-13 (rendered) + specs |
| BEH-017 app locale everywhere + guard | Changed | D-17 | Specs + guard (IMP-09, 10, 14); full web suite; fresh-start build (guard script is a build input) |
| BEH-018 address kinds | Changed | D-18 | Unit + E2E (IMP-06, 07) |
| BEH-019 status on read-only conversations | Changed | D-19 | Spec (IMP-09) + phone-bundle case |
| Removed: `isRemoteAccessAuthFailure`, `recordAuthorizedApiReachability`, `connected` prop, deprecated `shouldOverrideUrlLoading(view,url)`, `isLanIp`/`isTailnetLikeIp` | Removed | Legacy Removal Policy | Grep for leftovers is part of the code review; the probes exercise the replacements |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | folder check, address classification, viewer admission | unit IMP-06; E2E IMP-07 | 138 other E2E files register workspaces after D-08 | Full server E2E suite |
| API / transport / contract | Yes | `WORKSPACE_PATH_REFUSED` GraphQL error; 403 refusal bodies reaching Apollo | E2E IMP-07; Apollo shape IMP-02 | the phone's real client reading the node's real 403 | Phone-bundle probe on a real node |
| Frontend component / state | Yes | run list, shell, clipboard sheet, file status, Phone Setup, locale sites | 27 specs IMP-09/14; full suite was red at IMP-08 | full web suite not green on the final commit | Full `test:nuxt` run |
| Browser integration / user journey | Yes | phone bundle production build | none yet | phone routing and production build (TESTING's phone-bundle rule) | `test:e2e:mobile-shell` with new cases |
| Authentication / session / permissions | Yes | credential dropped on revoke; kept on off | specs with Apollo's shape | real node refusal → real bundle | phone-bundle probe |
| Desktop renderer / web-equivalent UI | Yes | desktop launch error (D-08), Phone Setup (D-16) | specs; IMP-13 rendered | desktop launch error rendered from a real node refusal | browser journey (`nuxt dev` + test-owned node) |
| Desktop shell / Electron-specific integration | No (only the build: guard script) | — | — | release-runner build | Fresh-start desktop build |
| Process / lifecycle | Yes | Android process death; Activity saved state | unit IMP-12 | real system kill and recreation | Emulator |
| Persisted-data transition | No (`Not Affected`) | registry read only | — | registered missing folder still loads (DEC-004) | Covered by IMP-07's E2E; rechecked in full suite |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Android WebView (`isForMainFrame`), noVNC clipboard | unit policy test; specs | WebView behavior; `execCommand('copy')` on `http://` (U-01) | Emulator + test-owned Docker node desktop |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426`, branch `codex/small-follow-ups-batch-426`, head `42a86a5e93`
- Project type: pnpm monorepo. Nuxt 3 web and Electron (`autobyteus-web`), a Node/TS server (`autobyteus-server-ts`), and an Android WebView app (`autobyteus-android`).
- Project testing guideline: `TESTING.md` (root only; no closer `TESTING*.md` on the changed paths)
- Conflicting, missing or unclear project instructions: none so far
- Changed build-input paths: `autobyteus-web/scripts/guard-localization-boundary.mjs` (`*/scripts/**`). The fresh-start desktop build case is API-11. No Android Gradle file changed, so the Android fresh-start build is not triggered.
- Required secrets: N/A. No real provider is needed; the probes use the scripted AGY CLI and the recorded Grok ACP replay.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers, § Choosing the path | layers and commands | `test:nuxt`, guards, `typecheck`; server E2E `pnpm test:e2e`; probes `pnpm -C autobyteus-web test:e2e:<name> --output-dir=<fresh>`; phone-bundle rule (renderer behavior the phone offers → a `test:e2e:mobile-shell` case) |
| `TESTING.md` § Rerun by impact | reuse | reuse IMP checks whose exercised files did not change since their commit (`git diff --name-only b1d92c7ced HEAD` = guard script, `runWorkspaceChoice.ts`, `remoteAccessReadRefusal.ts` + spec, `docs/design-cases.md`; all rerun in IMP-14) |
| `TESTING.md` § Fresh-start build | build proof | `git clone --no-local`, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` with the listed env, then the "Verify bundled Prisma" / "Verify packaged terminal runtime" steps of `.github/workflows/release-desktop.yml` |
| `TESTING.md` § Environments | isolation | one heavy run at a time; E2E with a clean env (`env -i PATH HOME=<resolved temp> TMPDIR`); Docker nodes: test-owned container on `127.0.0.1`, fresh volumes, worktree output mounted read-only; `docker rm -f -v` |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` header | phone probe | needs `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`; `--cases`, `--hold` (emulator pairing link `http://10.0.2.2:<port>`) |
| `fresh-run-auto-approval-probe.mjs`, `node-vocabulary-probe.mjs` headers | B04, NVP | NVP needs the server build, `sqlite3` and a LAN IPv4 address |
| `implementation-handoff.md` § Environment | Android | `ANDROID_HOME=$HOME/Library/Android/sdk`; JDK 21 |
| `autobyteus-server-ts/src/api/static/mobile-web.ts` | where a node serves `/mobile` from | `<appRoot>/mobile-web` (server package), else `../autobyteus-web/dist/public` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | before the probes | `dist/app.js` newer than the last server commit | — |
| Phone bundle | worktree | `pnpm -C autobyteus-web build:mobile-web` | served by probe nodes at `/mobile` | `dist/public/index.html` | — |
| Probe stacks | `autobyteus-web` | the probe scripts | probe-owned servers, `nuxt dev`, Chrome | each probe's own waits | the probe's `finally`; check the cleanup receipt |
| Android emulator | — | `emulator -avd autobyteus277_api35 -no-snapshot-save` | test-owned AVD from earlier tickets (no user data) | `adb wait-for-device`, `sys.boot_completed` | `adb emu kill` |
| Debug APK | `autobyteus-android` | `./gradlew :app:assembleDebug`, `adb install -r` | worktree build | `pm list packages` | `adb uninstall` at the end |
| Phone node for the emulator | `autobyteus-web` | `mobile-shell-probe.mjs --hold` (alpha on 127.0.0.1, which the emulator reaches as `10.0.2.2`) | probe-owned data root | `hold.json` | Ctrl+C (SIGINT) → the probe's cleanup |
| Docker node with desktop | worktree | `docker run` of `autobyteus/autobyteus-server:beta` on `127.0.0.1:<free>`, fresh volumes, this worktree's phone bundle mounted read-only over `/opt/autobyteus/server-package/mobile-web` | test-owned; never the user's `autobyteus-server-*` containers | `/rest/health` | `docker rm -f -v` |
| Server E2E | `autobyteus-server-ts` | `env -i PATH HOME=<temp> TMPDIR pnpm test:e2e` (root) | long; alone | vitest summary | temp HOME removed |
| Fresh clone | `/tmp/426-fresh-…` | see TESTING § Fresh-start build | alone; large | build exit code + verify steps | `rm -rf` of the clone |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Paired phone, runs, Org with a delegated task agent, a terminated Org run | mobile-shell probe `setUp` (public GraphQL/WS); new data through the same APIs | probe-owned temp data roots | removed by the probe |
| Revoked device, Phone Access off | `DELETE /rest/remote-access/devices`, `PUT /rest/remote-access/settings` on the probe's node | probe-owned node | removed by the probe |
| HTML message reference (emulator) | the Delivery Team lead's `send_message_to` with an `.html` reference, through the hold stack's public WS | probe-owned | removed with the hold stack |
| Removed-node case (emulator) | the debug app's saved-node store edited with `adb shell run-as` while the process is dead (the app offers no way to remove a node while it is not running) | test app data only | app uninstalled |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` (design spec § Persisted Data; handoff § Persisted Data Transition Check)
- Representative existing data and behavior: a registered workspace whose folder was deleted still loads and restores. That is AC-008's alternate, covered by the D-08 E2E in IMP-07 and rerun in the full suite.
- No migration; nothing more is planned.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related REQ / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` `KNOWN_BROWSER_LINES` (feed retry to `localhost:8000`) | exempts the unpaired feed's refused socket as pre-existing | REQ-001 / AC-001 | `Stale / Remove` | D-01 removes the retry | Remove; the new MSP-19 case and the probe's browser-error gate prove it is gone |
| same, MSP-13 revoked part | records whatever a revoked phone shows ("outside the 401 rule, FU-003") | REQ-002 / AC-002 | `Needs Update` | D-02: revoked → pairing screen, session removed | Assert the pairing screen and the removed session |
| same, MSP-07 bad path | types `/definitely/not/a/folder-277`, notes "the node registers any path (FU-004)", then reselects the probe folder | REQ-008 / AC-008 | `Needs Update` | D-08 refuses it | Assert the three refusals with their texts; nothing registered; then an existing folder registers |
| same, MSP-16 | writable conversation: file opens; outside file shows the status | REQ-019 (preserved writable side) | `Still Valid` | — | Keep; new MSP-17 covers the read-only side |
| same, MSP-09 | node down → bar "Not reachable" + "Can’t reach" banner; back → Retry clears | REQ-002 preserved network failure | `Still Valid` | `connection` replaces `connected`; same texts | Keep (it now runs through the three-state prop) |
| `fresh-run-auto-approval-probe.mjs` B04 | members line by the seeding rule (changed in D-10) | REQ-010 | `Still Valid` (new assertion) | D-10 | Run |
| `node-vocabulary-probe.mjs` NVP-05 + `fixtures/dev-server-ready.mjs` | waits for the dev server after the backend restart (D-11) | REQ-011 | `Still Valid` (new) | D-11 | Run |
| Server E2E: `workspaces-graphql`, `workspace-run-history-graphql`, `runtime-capability-graphql`, `agent-runtimes-graphql` | the four item-14 tests | REQ-014 | `Still Valid` (updated by implementation) | IMP-07 | Rerun inside the full suite |
| Server E2E: `workspace-path-refusal-run-launch.e2e.test.ts` (new), D-08 GraphQL refusal, D-06 route log, Memory Sync candidates | RR-03, AC-008, AC-006, AC-018 | — | `Still Valid` | IMP-07 | Rerun inside the full suite |
| Every other server E2E that registers a workspace (145 files reference `createWorkspace`/`workspaceRootPath`) | various | D-08 side effect | `Still Valid` after the run (API-05), except the row below | full suite: 112 passed; the only D-08 failure is API-AGG | Run the full suite (API-05) and the model-free gated suites (API-05b) |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` "API-AGG: public registration is not mkdir; …" | registered a **missing** folder (`createWorkspace` on `<root>/not-created-folder`) and expected it registered without a mkdir, then used it for the Project aggregate checks | REQ-008 / AC-008 / D-08 | `Needs Update` | API-05: `× API-AGG …` at `:301` (`gql` refused). REQ-008 now refuses an unregistered missing folder; the invariant the test names (registration never creates the folder) still holds | Updated: the missing path must be refused with `WORKSPACE_PATH_REFUSED` / `reason: missing` and is still not created; the aggregate part registers a real folder (`registered-folder`), the rest unchanged |
| `autobyteus-web/tests/e2e/fresh-run-auto-approval-probe.mjs` fixture | answered every GraphQL operation the fixture page made until the Projects list became always on (`0fd2656528`) | AC-010 (the probe that runs B04) | `Needs Update` (fixture gap, not this ticket) | API-02 run 1: every scenario passes, `Unexpected GraphQL operation GetProjects` ×16 | Baseline fix `023a9a3ff9`: the fixture answers `GetProjects` with no Project |
| `autobyteus-web/tests/e2e/node-vocabulary-probe.mjs` setup and Memory helper | the window on a LAN origin reaching beta; the Memory page's source select | AC-011 (the probe that runs NVP-05) | `Needs Update` (probe causes, not this ticket) | API-03 run 1: `REMOTE_ACCESS_ORIGIN_REFUSED` (autobyteus-403); run 2: the select exists only for more than one source (`44ac4d3344`) | Baseline fix `898fbd2a31`: both nodes get `AUTOBYTEUS_ALLOWED_ORIGINS=<window origin>`; a loaded Memory page without the select reads as `['local']` |
| Android `TrustedNavigationPolicyTest`, `OpenPageRestoreTest` | classify and restore decisions | AC-007, AC-004 (unit part) | `Still Valid` | IMP-12 | Reuse |
| Web specs (27 files, IMP-09; 4 files, IMP-14) | D-01, 02, 05, 08, 16, 17, 19 | AC-001…003, 005, 008, 016, 017, 019 | `Still Valid` | IMP-09, IMP-14 | Reuse; the full suite reruns them anyway |
| `tests/integration/localization-boundary-guard.integration.test.ts` | the guard fails on planted OS-locale calls | AC-017 | `Still Valid` | IMP-14 | Reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | REQ-006, 008, 018; AC-006, 008, 018 (unit part); RR-03 | server unit + architecture | Reused | IMP-03 + IMP-06 (full unit run, then its 11 failures fixed and rerun green), IMP-04 (server typecheck) | No server file changed after `85d26ed1e8`, the commit both ran on (`git log -1 -- autobyteus-server-ts`) |
| API-R2 | AC-001, 002, 003, 005, 008, 016, 017, 019 (spec part) | web specs, guards, typecheck | Reused | IMP-09, IMP-10, IMP-11, IMP-14 | IMP-14 reran everything changed after IMP-09's `b1d92c7ced` (the guard, `runWorkspaceChoice`, `remoteAccessReadRefusal` + spec) on `1d2cdd15ab`, the last code commit |
| API-R3 | AC-004, AC-007 (unit part); QR-001 | Android unit | Reused | IMP-12 | Android unchanged since `ea8897ee53` |
| API-R4 | AC-016 | rendered Phone Setup | Reused | IMP-13 | `PhoneWayTab`, `PhonesPanel`, `phoneSetupTextKey` and catalogs unchanged since `b1d92c7ced` |
| API-R5 | AC-014; R-01 | AR-14 timing | Reused | IMP-05 | measurement; the test itself reruns in API-05 |
| API-01 | all web items (regression) | whole web unit/component suite | Existing Test | `pnpm -C autobyteus-web test:nuxt --run` | IMP-08 (full) failed with 4 and was fixed and rerun only as touched specs; a full green run on the final commit is missing |
| API-02 | AC-010 | browser probe | Existing Test | `pnpm -C autobyteus-web test:e2e:fresh-run-auto-approval --output-dir=<fresh>` | Probe code changed (D-10); never run |
| API-03 | AC-011 | browser probe | Existing Test | `pnpm -C autobyteus-web test:e2e:node-vocabulary --output-dir=<fresh>` | Probe code changed (D-11); never run |
| API-04 | AC-001, 002, 003, 008 (phone), 019 (phone); REQ-002 preserved (401, network down) | phone production bundle on a probe-owned real node | Durable (updated probe) | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh>`, all cases, including updated MSP-07, MSP-13 and the new MSP-17, MSP-18 and MSP-19 | TESTING's phone-bundle rule; the 403 bodies reach the real Apollo client only here |
| API-05 | AC-006, 008, 014, 018; RR-03; regression of every E2E that registers a workspace | server E2E | Existing Test | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm test:e2e` | only 7 of 236 E2E files ran (IMP-07); D-08 refuses any unregistered missing folder |
| API-05b | RR-03; regression of the run-launching E2E files after D-08 | server E2E, gated but model-free (scripted AGY CLI) | Existing Test | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<tests/fixtures/agy-failure-cli.mjs> pnpm exec vitest run <the 57 files gated on RUN_AGY_FAILURE_E2E> --no-watch` | Added after API-05: these launch and delegate runs into workspaces, which is the server-internal registration D-08 now checks (RR-03), and the default suite skips them |
| API-06 | AC-008 (desktop half) | desktop renderer, `nuxt dev` against a test-owned node | Temporary Probe | New chat → typed folder `/definitely/not/a/folder`, `/etc/hosts`, `relative/dir` → launch error text; an existing folder launches | The desktop launch error is proven only by a spec with a mocked GraphQL error. Durable: no existing desktop probe owns the New-chat launch, and adding one is wider than this ticket |
| API-07 | AC-007; RR-01; escalation trigger (b) | Android WebView (emulator) | Journey | debug APK from the worktree on `autobyteus277_api35`, paired to the probe's `--hold` node: a message reference to an `.html` file → the preview loads in the page; inside the frame `typeof AutoByteusShell`; iframe `sandbox`; then a main-frame `blob:`, a foreign-origin `blob:` frame, `file:` and `javascript:` attempts through CDP → blocked | Only a real WebView reports `isForMainFrame` |
| API-08 | AC-004 | Android lifecycle (emulator) | Journey | a run's Files screen → Home → `adb shell am kill org.autobyteus.mobile` → recents → same node and URL; then the saved node removed while the process is dead → ordinary start | Real process death |
| API-09 | AC-005; U-01 | Android WebView + test-owned Docker node desktop | Journey | Control mode → Clipboard → Paste "Send to desktop" → text on the node desktop clipboard (`xclip` in the container); copy on the node desktop → Copy → phone clipboard (`adb shell` clipboard read via `cmd clipboard` or a paste into a field) or the selectable fallback; View only and not connected: no button | `execCommand('copy')` on `http://` is unmeasured (U-01) |
| API-10 | AC-012, AC-013 | docs | Existing Test (read) | read `autobyteus-web/docs/agent_artifacts.md`, `content_rendering.md`, `docs/design-cases.md`; `grep -rn TeamCommunicationReferenceViewer` | doc criteria |
| API-11 | build (guard script changed) | release desktop build | Existing Test | TESTING § Fresh-start build, macOS ARM64 | `*/scripts/**` changed |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-04 (MSP-17) | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | D-19 on the phone bundle (TESTING phone-bundle rule): a read-only Org task agent; tap a file outside the workspace → status line, no composer |
| API-04 (MSP-18) | same | D-02 Phone Access off on a real node: bar, banner, session kept, Check after on → runs; off → node stopped → "Can’t reach" |
| API-04 (MSP-19) | same | D-01 on the phone bundle: no WebSocket while unpaired for 30 s; one feed socket to the node with `access_token` after pairing; closed and not retried after unpair |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-04 (MSP-13) | `mobile-shell-probe.mjs` MSP-13 | revoked (403 `REMOTE_ACCESS_DEVICE_REVOKED`) → pairing screen, stored session removed | replaces "recorded as is" |
| API-04 (MSP-07) | `mobile-shell-probe.mjs` MSP-07 | `/definitely/not/a/folder…`, `/etc/hosts`, `relative/dir` → the three texts under the field, nothing registered (`workspaces` query); then an existing folder registers | replaces "the node registers any path (FU-004)" |
| API-04 | `mobile-shell-probe.mjs` header | the case list | — |
| API-04 | `mobile-shell-probe.mjs` browser-error rules | per-case expected lines (`EXPECTED_BY_CASE`) instead of an app-wide exemption; a `failedRequests` log naming the URL behind "Failed to load resource" lines; the pre-existing `localhost:8000/health` check (FU-003) counted known only against that exact failed request | found in API-04 run 1: the old exemption's `ERR_CONNECTION_REFUSED` alternative also hid an HTTP request |
| API-05 | `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` (API-AGG) | the missing path is refused (`WORKSPACE_PATH_REFUSED`, `missing`) and not created; the aggregate checks use a real registered folder | stale assertion against REQ-008 (see the inventory) |

## Durable Coverage To Remove

| Existing Path / Test | Obsolete Assertion And Why | REQ / AC / Design Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `mobile-shell-probe.mjs` `KNOWN_BROWSER_LINES` entry for `ws://localhost:8000/ws/agent-package-definitions` / `ERR_CONNECTION_REFUSED` | Exempted the unpaired phone's feed retries as pre-existing; D-01 removes them | REQ-001, AC-001, D-01 | The probe's browser-error gate (every unknown browser error fails the probe) plus MSP-19's socket log |

## Desktop Application Validation Plan

- Desktop framework: Electron + Nuxt. No Electron main, preload or IPC code changed.
- Web-equivalent behavior: the D-08 desktop launch error (API-06, `nuxt dev` against a test-owned node) and D-16 (IMP-13).
- Shell-specific: none changed. The build input changed, so API-11 is the fresh-start packaged build. No isolated instance is needed for behavior.
- The run never touches the user's running AutoByteus or its data. Every server is probe-owned on free ports.

## Live Environment And Fixture Plan

- Startup order:
  1. Server build, phone bundle build.
  2. API-01.
  3. Probe edits, then API-04, API-02 and API-03, one at a time.
  4. API-05, alone.
  5. API-06.
  6. Emulator: the APK, then the `--hold` stack → API-07 and API-08.
  7. The Docker node → API-09.
  8. API-11, alone.
- Environment choices: phone at 390×844 on a private-network origin (`http://192.168.77.10:<port>`) routed to the probe node, as the probe already does. The emulator reaches the hold node at `http://10.0.2.2:<port>`.
- Evidence: probe JSON receipts, screenshots, logs; for the emulator: uiautomator dumps, CDP outputs, screenshots and `adb logcat` excerpts; for the Docker node: `xclip` output.
- Owned processes to clean up: probe stacks (self-cleaning), the emulator, the hold stack, the Docker container and volumes, the fresh clone, temp HOMEs.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Signing, notarization, Windows/Linux desktop builds | need the release runner's secrets and OSes (TESTING) | low (guard script is plain Node) | No | none |
| D-13 Case 17 "fix" wording | Solution Designer's confirmation, not a test (code-review residual) | none | No | Solution Designer |

## Ambiguities Or Reroute Triggers

At planning time: if the WebView reports `isForMainFrame=true` for the preview frame, or the preview does not load, that is escalation trigger (b), a `Design Impact`.

Found during execution:

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| D-02: a Check on an open phone does not learn that its own history read failed. Revoked and Phone-Access-off phones stay "Connected" once their list has loaded, and off → node down ends "Connected". The cause is `useRunHistorySectionLoad.readHistory` returning `{ ok: true }` (the `listsAnyRun()` guard, and a quiet poll superseding the Check read) | `Design Impact` (preliminary) | `evidence/api-e2e/API-04-D02-failure-analysis.txt`; API-04 MSP-13, MSP-18 | failure-origin review (code reviewer) → Solution Designer |
| FU-003: every phone page start requests `http://localhost:8000/health` (serverStore browser health check) | follow-up, outside this ticket | `API-04-run2/mobile-shell-probe.json` `failedRequests` | Solution Designer (follow-ups.md) |

## Round 2 Rerun Plan (TESTING § Rerun by impact)

- Validated commit of round 1: product `42a86a5e93` (tests up to `c85e705719`). Now: `d115f1601d`.
- `git diff --name-only c85e705719 d115f1601d` outside `tickets/`:
  - Android `MainActivity.kt`, `shell/OpenPageRestore.kt` (+ test);
  - web `MobilePairedShell.vue`, `stores/mobileNodeSessionStore.ts`, `stores/runHistoryStore.ts`, `runHistoryLoadActions.ts`, `runHistorySelectionActions.ts`, `runHistoryTeamMemberInspectionActions.ts`, `composables/runHistory/useRunHistorySectionLoad.ts`, `utils/remoteAccess/remoteAccessReadRefusal.ts` (+ specs);
  - `docs/design-cases.md`.
- No server source, build input, lockfile or contract package changed.

| Case | Decision | Reason |
| --- | --- | --- |
| API-01 web suite | Rerun | web stores, shell and the history load changed |
| API-04 mobile-shell probe (all cases) | Rerun | the phone bundle changed (the shell check, the history load shared by every list case and by the desktop window in MSP-15). MSP-13 and MSP-18 are the F-API-001 cases. The probe also gains: operations named from the query text, MSP-12 asserting the poll sends no `PhoneCredentialCheck`, and MSP-13/18 recording each check's answer |
| API-02 B04, API-03 NVP | Rerun | B04's fixture page renders the desktop shell's run section (`useRunHistorySectionLoad` changed); NVP-04 opens the phone shell, whose check changed |
| API-08 emulator (AC-004a) | Rerun | `MainActivity`, `OpenPageRestore` changed. Plan: a launcher task and a share-started task, each on a node page → Home → `am kill` → Recents (the navigation entry equals the saved URL; the share-started task shows the node page); the alternates (node removed while dead → ordinary start; a new share while dead → connects) |
| API-05, API-05b server E2E | Still valid | no server change |
| API-06 desktop folder refusal | Still valid | `runWorkspaceChoice`, the workspace store and the chat launch are unchanged |
| API-07 WebView preview | Still valid | `TrustedNavigationPolicy` and `AutoByteusWebView` unchanged; the `MainActivity` change only affects which intent `onCreate` handles |
| API-09 clipboard | Still valid | `useVncSession`, `MobileNodeDesktop*` and noVNC unchanged |
| API-10 docs | Still valid for AC-012/013; the Case 5 SR-008 text is the Solution Designer's | — |
| API-11 fresh-start build | Still valid | no build input changed since `903387bc78` |
| API-R1…R5 | Still valid (R2/R3 superseded for D-02/D-03 by IMP-15/IMP-16 and the reruns) | — |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (`mobile-shell-probe.mjs`)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: one heavy run at a time; every case records its commit.

---

# Ticket Round 2 (items 9, 20, 21, 22, 23) — API/E2E investigation

- Trigger: code reviewer's CRR-007 Pass (Full Review of IR-005), 2026-11-08. Base `d785ded109` (round 1 finalized), head `a3bc0525cd`, last code commit `736b51f87a`. One commit per item: D-09 `06cc2aabad`, D-20 `094c896407`, D-23 `23483d0cf8`, D-22 `c4521d4402`, D-21 `736b51f87a`.
- Classification: Medium / High (the new status read on the 5 s poll of three surfaces; the store's states-only update path).
- Basis: `requirements-doc.md` REQ-009, 020, 021, 022, 023 and AC-009a…d, AC-020…023; `design-spec.md` D-09, D-20…D-23; `implementation-handoff.md` (round 2, IMP-R2-01…05); `code-review-report.md` CRR-007.
- Testing guideline: root `TESTING.md` (unchanged). Build input changed: `autobyteus-web/generated/graphql.ts` → fresh-start desktop build.

## What must be proven

- **D-09 (AC-009a…d):** the delegated rows of a listed, active standalone Agent run that is not open follow their children's states on each history poll. This holds on the desktop Runs view and Workspaces tree, and on the phone list while it polls. The poll reads only states (`GetAgentRunCollaborationStatuses`). There is no view read (`GetAgentRunCollaboration`) on a poll without a change. A new child, or the run stopping, causes exactly one view re-read. The open run is not in the read.
- **D-20 (AC-020):** `PEER_HOST_REFUSED {address, host}` from `addPeerNode` / change address / resolution, and the Nodes page's distinct text.
- **D-21 (AC-021):** the token-statistics probe on the 1st, 7th and 20th.
- **D-22 (AC-022):** the model-routing probe.
- **D-23 (AC-023):** origin parsing unchanged.

## Real-use scenarios

- SCN-009 as the requirements give it. Added from the code:
  - A child's state change alone (running ↔ idle) is applied without any view read (`applyStatuses`).
  - A task team's members and their delegated work under a listed run (the standalone root's snapshot includes `getLeafAgentStatusSnapshots`), as MSP-02's nested row shows.
- AC-020 (3), the connect flow trying a refused name, is not reachable in the real page. The window's own address for the node would have to be the refused name, and the window's row check (unchanged, DEC-017 / FU-004) is refused by the same Host gate before Connect is offered. It is covered by the web spec (`nodeConnectionErrorText.spec.ts`) and the server E2E's `host_refused` attempt.

## Existing coverage decisions

| Path / Test | Decision | Evidence | Action |
| --- | --- | --- | --- |
| `mobile-shell-probe.mjs` MSP-02 part (a), "under a root not open: the last-read state, updated once the root is opened (DEC-013 of 277)" | `Needs Update` | REQ-009 replaces that behavior. The nested row (`memberDelegated`, a task-team member's delegated run under the PTM) is in the standalone root's snapshot (`getLeafAgentStatusSnapshots`) | Assert that the dot follows on the poll without opening the root (D-09). Part (b) is unchanged |
| `mobile-shell-probe.mjs` MSP-12 (poll budget) | `Still Valid`, extended | the poll now also sends the status read | Also assert no status read on the run screen, on a view, or while hidden |
| `remote-nodes-page-probe.mjs` | `Still Valid` | — | Add NP-13: change address to `http://lvh.me:<port>` → the distinct text with the host; nothing saved |
| `run-history-read-budget-probe.mjs` | `Out Of Scope` | it times the two history reads over HTTP; the status read is a separate query | — |
| Server E2E `peer-host-refused.e2e.test.ts` | `Still Valid` | `lvh.me` resolves to 127.0.0.1 on this machine, so it runs (not skipped) | run in the full suite |

## Planned cases (ticket round 2)

| Case ID | Criteria | Surface | Kind | Command / Steps | Why |
| --- | --- | --- | --- | --- | --- |
| R2-R1 | AC-009d, AC-020 (1), AC-023 (unit/E2E focused) | server/web focused tests | Reused | IMP-R2-01 | code unchanged since `23483d0cf8` |
| R2-R2 | AC-022 | model-routing probe | Reused | IMP-R2-03 | `c4521d4402`; nothing it drives changed since |
| R2-R3 | all round-2 items | web suite, server unit, typechecks | Reused | IMP-R2-05 | ran at `736b51f87a`, the last code commit |
| R2-01 | AC-009a, b, c; AC-009d (runtime) | desktop Runs view + phone bundle on a probe-owned real node | Durable (new MSP-20 + updated MSP-02, MSP-12) | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh>` (all cases) | TESTING's phone-bundle rule; network log for bytes and view reads |
| R2-02 | AC-020 (2) | Nodes page, probe-owned servers | Durable (new NP-13) | `pnpm -C autobyteus-web test:e2e:remote-nodes-page --output-dir=<fresh>` | the page's change-address path with the real server error |
| R2-03 | AC-021 | token-statistics probe | Existing Test | `--day 2026-12-07`, `--day 2026-12-20`, and today (no `--day`) on head | IMP-R2-04 ran the 7th and 20th before the final tick-count change; only the 1st ran on the final code |
| R2-04 | AC-020 (1), AC-023, regression | server E2E | Existing Test | `env -i … pnpm test:e2e`; the model-free gated files (`RUN_AGY_FAILURE_E2E`) | D-09's server read in the standalone root manager; D-20's resolver; D-23's origin parser |
| R2-05 | build | release desktop build | Existing Test | TESTING § Fresh-start build | `autobyteus-web/generated/graphql.ts` changed |

- Test progress log: `Yes` (the same file; rows prefixed `T2-`)
- Proceed: `Yes`. Durable coverage changes: `Yes` (mobile-shell probe, remote-nodes-page probe). Reroute: `No`.
