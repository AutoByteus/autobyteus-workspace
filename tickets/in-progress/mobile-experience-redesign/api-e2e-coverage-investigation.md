# API/E2E Coverage Investigation — mobile-experience-redesign (autobyteus-277)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence and the broader-validation decision are in [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md).

## Investigation Meta

- Requirements Doc: [requirements-doc.md](requirements-doc.md), SR-003 (Approved)
- Investigation Notes: [investigation-notes.md](investigation-notes.md), E-01…E-32
- Solution Revision Record: [solution-revision-record.md](solution-revision-record.md)
- Design Spec: [design-spec.md](design-spec.md), SR-004 (with the `45fbb2ceee` editorial fixes)
- Supplemental Task Artifacts: the Product UI/UX spec and VIS-001…029, `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/ui-ux-spec.md` at `e6ca7b6098` (normative); [follow-ups.md](follow-ups.md)
- Design Review Report: [design-review-report.md](design-review-report.md), round 2, Pass
- Architecture Review Revision Record: [architecture-review-revision-record.md](architecture-review-revision-record.md), ARCH-REV-002
- Implementation Handoff: [implementation-handoff.md](implementation-handoff.md), IR-002
- Implementation Revision Record: [implementation-revision-record.md](implementation-revision-record.md)
- Code Review Report: [code-review-report.md](code-review-report.md), CRR-002 Pass (round 2, targeted delta)
- Code Review Revision Record: [code-review-revision-record.md](code-review-revision-record.md)
- Delivery Revision Record: N/A (first API/E2E entry)
- API/E2E Revision Record: [api-e2e-revision-record.md](api-e2e-revision-record.md)
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: 2
- Trigger:
  - round 1: CRR-002 Pass, code `f2816cc7c1`, base `407f0ee8e9`;
  - round 2: CRR-005 Pass, HEAD `3e3ce3961b` (then `23c0c35395`, documents only), code `400457d5f7`.
  - The basis moved to requirements SR-005 (REQ-002a, REQ-003a, REQ-011; AC-002a, AC-003a, AC-011; DEC-009…015) and design SR-006 (ARCH-REV-004).
- Prior Investigation Reviewed: round 1 (this file at `ccf43b875c`)
- Latest Authoritative Investigation: round 2 (section "Round 2 Plan")

## Current Requirement And Design Basis

- The `/mobile` shell is rebuilt on the desktop's owners (design SR-004). One run list (the desktop Runs view's runs and order, with each run's delegation tree, local and remote), a slim run screen ("Opening…" while attaching, never the previous target), a ⋮ menu with Artifacts, Files, Messages (members only), Activity, an agent-only New run, and a connection sheet with read-only peers (REQ-001…REQ-009, AC-001…AC-010).
- The screen state is `/mobile`'s route query, written only by `useMobileNavigation`; the system Back key walks file/reference → view → run → list (AC-005); the Org keys stay on the list entry (AR-003).
- `MobilePairedShell` owns the complete history load (window `null`), the 5 s poll (list shown and page visible only), the 401 rule (no second read) and the collaboration sync (DS-001, AR-008).
- Shared owners changed for the desktop too (history load, conversation binding, collaboration row rules, open actions, disclosure default, route Org); the desktop must stay unchanged (AC-010).
- Code review residuals to watch: C-06 (poll lists runs while the bar keeps "Not reachable" until a check; as designed), C-04 (a failed open with an earlier target may flash that target before Back lands). Known: the shared composer's Upload (28px) and Send (36px) are below 44px; the composer is out of scope.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001…SCN-006 (requirements), plus the code review's SCN-007 (cold open with the node down, then Retry), SCN-008 (a failed open), SCN-009 (a second tap while an open is in flight).
- Real-use scenarios added from the implementation, each with its real trigger:
  - RU-01 Browser Back/Forward from the run screen and the views (the phone's system Back key and the WebView's history are the same `history` stack): the conversation re-attaches without buttons (REQ-003).
  - RU-02 The phone in the background or asleep (page hidden), then in front again: no poll while hidden, one read at once when back (R-002, design assumption 4).
  - RU-03 A paired phone whose device is revoked on the node (the user removes the phone in Phone Access on the desktop): the next read returns 401 and the phone lands on pairing (E-27, AR-008).
  - RU-04 A delegated child's Task closes (DONE) while the list is shown: the row leaves live (AC-002 alternate).
  - RU-05 The paired node goes down and comes back while the list is shown (C-06 residual; VIS-024).
  - RU-06 A reload of `/mobile?screen=run` or a view (no target): the list (DS-004).
- Contrived scenarios not tested: none recorded by the designer.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 run list = desktop Runs view with the tree | Changed | REQ-001/002, DS-001/002 | Real stack: same runs and order as the desktop window against the same node; tree rows per kind; fold; live states; Task DONE leaves |
| BEH-002 tap opens any agent; Team/Org opens its coordinator | Changed | REQ-003, DS-003 | Real stack: open each kind; message reaches the run on the server; approval; "Opening…" only; Back/Forward; first-message id change |
| BEH-003 route-driven screens, ⋮ views, Back walk | Changed | REQ-005/007/009, DS-004/005/008 | Real stack + Android WebView system Back; views per kind; absence checks |
| BEH-004 New run, agent only | Changed | REQ-006, DS-006 | Real stack: preselection rule twice, sheets, reasons, bad path, create → Chat → first message → top of list |
| BEH-005 remote runs | Added | REQ-004, DS-002/003 | Two servers: chip, open, text message reaches the peer, text-only composer; peer down: red dot, "Not reachable", notice, Retry |
| BEH-006 connection sheet | Changed | REQ-008, DS-007 | Real stack: name, URL, state, check, peers with offers, unpair; paired node down: bar and banner |
| BEH-007 no row actions | Preserved (as absence) | REQ-009 | Absence checks on the real list |
| Pairing, unpair, unsupported notice, 401 rule | Preserved | AC-010, E-27 | Real stack + Android shell + iOS Safari |
| Desktop Runs view, Workspaces tree, Org opening, surfaces | Preserved (shared owners changed) | AC-010; design Change Scope | Unit suite (reused) + existing desktop real-stack and fixture probes |
| History poll on the phone | Added | DS-001, R-001, R-002 | Network log: poll only on the list and page visible; resume read; payload size |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No (consumer side only) | The phone's GraphQL reads and streams through the paired node | Mocked in specs | Real payloads, Phone Access credential on reads and streams | Real stack probe |
| Frontend component / state | Yes | Phone shell, shared stores and composables | IMP-01, IMP-06 (5190 + 83 tests) | Store wiring with real data, timing of open/commit | Real stack probe |
| Browser integration / user journey | Yes | Route query history, Back/Forward, visibility, viewport | Component tests with a memory router | Real `history` stack, real viewports, real touch | Browser probe at 390×844 and 360×800 |
| Authentication / session / permissions | Yes | 401 rule moved to the paired shell | Shell spec | A real revoked credential | Real stack probe |
| Desktop renderer / web-equivalent UI | Yes | Shared owners used by the desktop | Desktop specs of every touched file | Real desktop tree with delegated, remote and Org runs | Existing desktop probes (real stack and fixture) |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes (phone) | Page hidden/visible, WebView in background | Spec of the poll pause | Real WebView lifecycle | Android emulator |
| Persisted-data transition | No (`Not Affected`) | URL query and memory only; pairing key unchanged | — | An existing paired session must still open | Real stack (stored session) + Android pairing |
| Worker / queue / distributed coordination | Yes | Remote runs through the paired node (278 relay) | Mocked | Two real servers | Two-server probe |
| External integration | Yes | Android WebView, iOS WKWebView/Safari | None | Rendering, system Back, safe area | Android emulator; iOS simulator Safari; WebKit |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign`, branch `codex/mobile-experience-redesign`.
- Project type: pnpm monorepo; `autobyteus-web` (Nuxt 3 + Pinia), `autobyteus-server-ts` (Fastify, GraphQL, WebSocket), `autobyteus-android` (WebView shell), `autobyteus-ios` (WKWebView shell).
- Testing guideline: `TESTING.md` (repository root). No closer `TESTING*.md` under `autobyteus-web`.
- Conflicting or unclear instructions: none. TESTING.md names no Android-emulator layer; the Android shell's README gives its build, and this validation uses a ticket-owned emulator (TESTING.md: "Temporary ticket-owned automation does not require a new global package command").
- Changed build-input paths: none. The diff (`git diff --name-only 407f0ee8e9...HEAD`) is `autobyteus-web` sources, specs, probe fixtures and docs, plus ticket files; no manifest, lockfile, build config or workflow. This round adds one `package.json` script (`test:e2e:mobile-shell`), which is a test entry, not a build input. No fresh-start build proof.
- Secrets: none needed (scripted AGY and recorded Grok replay; no provider keys).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing rules | Layers and commands; browser probes own their stack; one heavy run at a time; assertions first; never the user's app or data; rerun by impact |
| `AGENTS.md`, `autobyteus-web/AGENTS.md` | Repository and web rules | `test:nuxt --run`; never `git add -A` |
| `autobyteus-web/package.json` | Probe scripts | `test:e2e:<name>` per probe |
| `autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs` | 278's two-server probe | Two servers from `dist/app.js`, scripted AGY, peers both ways, `nuxt dev` against alpha |
| `autobyteus-web/tests/e2e/node-vocabulary-probe.mjs`, `large-runs-load-less-cases.mjs` | Phone pairing on a real server | `PUT /rest/remote-access/settings`, `POST /rest/remote-access/pairing-sessions` (non-loopback URL), `/mobile?pairing=…` |
| `autobyteus-server-ts/tests/e2e/helpers/grok-fake-cli.ts`, `tests/fixtures/grok-acp/` | Recorded Grok ACP replay | `GROK_BUILD_COMMAND`, `FAKE_ACP_FIXTURE=permission.jsonl` gives a real `run_bash` approval request, no credits |
| `autobyteus-android/README.md` | Android shell build | `ANDROID_HOME=… ./gradlew :app:assembleDebug` |
| `autobyteus-ios/README.md` | iOS shell | Simulator smoke uses a fake node; Safari on the simulator shares WebKit with WKWebView |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server alpha (paired node) and beta (peer) | `autobyteus-server-ts` | `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <temp>` (probe-owned) | Own temp data root and HOME; scripted AGY; fake Grok on alpha | `/rest/health` | SIGTERM, temp root removed |
| Nuxt dev | `autobyteus-web` | `pnpm dev --host <LAN IP> --port <free>`, `BACKEND_NODE_BASE_URL=alpha` | A pairing needs a non-loopback URL | page answers | process group SIGTERM |
| Headless Chrome / WebKit | — | playwright-core | Fresh contexts | — | closed |
| Android emulator | `~/Library/Android/sdk` | A ticket-owned AVD from `system-images;android-35;google_apis;arm64-v8a`; debug APK of this worktree | Never the existing AVDs (owned by others) | `adb wait-for-device`, boot completed | `adb emu kill`, AVD deleted |
| iOS simulator | Xcode 26 | `xcrun simctl boot` an available iPhone; Safari | Shared simulator: shut down after | booted | `xcrun simctl shutdown` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agents, Team, Org, delegations, Tasks | Public GraphQL + WebSocket `CALL_TOOL` (scripted AGY), as `task-closure-tree` and 278 | Test-owned data roots only | Temp roots removed |
| Remote runs | `delegate_task` with `node:` to beta | Two test-owned servers | Removed |
| A pending approval | Grok runtime on alpha with the recorded `permission` replay, `autoExecuteTools: false` | No credits | Removed |
| Phone Access session | Real pairing (pairing session + `/mobile?pairing=…` + Pair) | Credential redacted in evidence (`mra_…`) | Revoked/removed with the root |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` (design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check").
- Required: an existing paired session (`autobyteus.remote_access.mobile_session`) opens the new shell paired; the screen state lives in the URL only. Evidence: NVP-04 (updated) opens the new shell from a stored session; the Android emulator keeps its session across an app restart.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| Web unit/component suite (`pnpm -C autobyteus-web test:nuxt --run`) | Phone and desktop specs of every touched file | All, component level | Still Valid | IMP-01 (599002ecbf), IMP-06 (f2816cc7c1); delta 599002ecbf..f2816cc7c1 touches only phone files (IMP-06) and the removed `useTeamRunRuntimeCatalogSync` (IMP-05) | Reuse |
| `tests/e2e/fresh-run-auto-approval-probe.mjs` B08 | Phone New run defaults auto approve and opts out (agent only now) | REQ-006 | Still Valid (updated by implementation) | Handoff "rerun it" | Rerun |
| `tests/e2e/node-vocabulary-probe.mjs` NVP-04 | The phone opens paired from the released session: waits for `mobile-home` | AC-010 (pairing preserved), persisted session | Needs Update | `mobile-home` no longer exists; the paired screen is `mobile-run-list` | Wait for the run list; run NVP-04 |
| `tests/e2e/large-runs-load-less-cases.mjs` LRL-004 (phone step) | Phone shows the Team messages unavailable reason through Home → Choose work → Activity tab → Team messages | Preserved: Messages loading/unavailable (autobyteus-358) | Needs Update | `mobile-home`, `mobile-work-shell`, `mobile-tab-activity`, `mobile-context-*` are removed | List → tap the Team run (coordinator) → ⋮ → Messages → unavailable; run LRL-004 |
| `tests/e2e/workspace-views-chooser-cases.mjs` WVC-004 | The phone reads the history with window 5 while the desktop keeps null | DS-001 now says the phone reads the complete window (`null`) | Needs Update | Design DS-001, E-25; `mobile-home`, "Choose work" removed | Assert the phone's reads are `null` and the desktop's stay `null`; land on the run list; run WVC-004 |
| `tests/e2e/owner-scoped-file-reads-probe.mjs` B-006/B-007 | Phone Artifacts of an agent run and a Team member read through the owner route | REQ-007 (Artifacts on the phone) | Needs Update | Work picker and tabs removed | List → row (agent run; Team member under its Team) → ⋮ → Artifacts → (row when several) → viewer; run B-006/B-007 |
| `tests/e2e/workspace-responsive-probe.mjs` `/mobile` case | `/mobile` renders the shell (unpaired → pairing text) | Pairing unchanged | Still Valid | Asserts the pairing text, which is unchanged | Not rerun (pairing screens untouched) |
| `tests/e2e/remote-runs-in-tree-probe.mjs` (278) | Desktop tree: remote rows per family, open, text message, Stop, unreachable and Retry | AC-010 desktop unchanged; shared open actions, `useRunStopAction` (subject actions), collaboration rows | Still Valid | Desktop surfaces adopt the changed owners | Rerun as desktop regression |
| `tests/e2e/agent-org-task-team-disclosure-probe.mjs` | Org task-team disclosure in the desktop tree | `useRunListDisclosure` default unchanged | Still Valid | Disclosure gained `defaultExpansion` | Rerun |
| `tests/e2e/task-agent-sibling-sidebar-probe.mjs` (+ fixture changed) | Desktop history selection of task-agent siblings | `onOpenAgentRun`, `startPresetChat` removed from the fixture | Still Valid | Fixture changed in this ticket | Rerun |
| `tests/e2e/standalone-agent-error-stop-probe.mjs` (+ fixture changed) | Desktop stop of an errored standalone run | Fixture gained `onOpenAgentRun` | Still Valid | Fixture changed | Rerun |
| `tests/e2e/team-activity-presentation-probe.mjs` (+ fixture changed) | Team activity presentation | Fixture gained a member | Still Valid | Fixture changed | Rerun |
| `tests/e2e/task-closure-tree-probe.mjs` | Desktop Task closure tree | `AgentRunTaskRows` adopts `ensureStoredView`/`selectTaskRow` | Still Valid | Shared rule moved | Rerun BR-001 (Agent root closure) as desktop regression |
| Other phone-specific probes | — | — | Out Of Scope | No other probe drives `/mobile` | — |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | All (component level); AC-010 desktop | Web unit/component suite | Reused | IMP-01 (`599002ecbf`) | Delta to `f2816cc7c1` touches only phone files (covered by IMP-06) and the removed `useTeamRunRuntimeCatalogSync` (IMP-05); nothing else it exercises changed |
| API-02 | AC-001, AC-008 (CR-001…003) | Phone specs | Reused | IMP-06 (`f2816cc7c1`) | Ran on the commit under test |
| API-03 | — | Team run store after the removal | Reused | IMP-05 (`b2d7a084dd`) | Nothing it exercises changed after |
| API-04 | — | Typecheck and guards | Existing Test | `pnpm -C autobyteus-web typecheck`; `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` on the final commit | This round changes probe files and `package.json` |
| API-05 | REQ-006 (B08) | Fixture browser probe | Existing Test | `pnpm -C autobyteus-web test:e2e:fresh-run-auto-approval --output-dir <fresh>` | Handoff asks for the rerun |
| MSP-01 | AC-001 | Real stack, phone + desktop window | Durable | `pnpm -C autobyteus-web test:e2e:mobile-shell` | Same runs and order as the desktop Runs view against the same node; newest 5, "Show older (N)", "Show fewer"; ages |
| MSP-02 | AC-002 | Real stack + desktop window | Durable | same | Delegated task agent and task team under a PTM run; team folded with members; a member's delegated work under it (compared with the desktop Runs view of the same node); delegated rows' Task line; live state: a delegated run stopped on the node while its root is open (and, recorded, while it is not) |
| MSP-03 | AC-003 | Real stack | Durable | same | Tap a task agent, a task-team member, a Team run (coordinator), an Org run (first member) and an Org member: each conversation, a message from the phone reaches the run on the node (read back through its own projection), ← to the same scroll with the open row marked; a secure-context control for a failed send |
| MSP-04 | AC-003 (approve) | Real stack, Grok replay | Durable | same | A pending tool approval on a run opened from the phone is approved from the phone; the server records it |
| MSP-05 | AC-003 alternates, RU-01, RU-06, SCN-009 | Real stack | Durable | same | "Opening…" only during attach (no previous target ever rendered); browser Back/Forward re-attach; reload of a run entry → list; a second tap during an open |
| MSP-06 | AC-004 | Two servers | Durable | same | Remote rows (chip, title, state); open: live conversation; a text message reaches beta; no attachments, no `@`; beta down: red dot, "Not reachable", notice, Retry; other runs work |
| MSP-07 | AC-006, TR-014, AR-003 | Real stack | Durable | same | "+" with nothing opened (PTM preselected) and after an Org open then ← (its agent, row still marked); sheets; disabled with reason; bad folder path error; Create run → Chat; first message (id promotion) keeps the screen; new run at the top |
| MSP-08 | AC-007 | Real stack | Durable | same | On a team member: Artifacts, Files (tree, search over the workspace, no filters, open file without Attach), Messages (with a reference that opens the file), Activity; Messages absent for a standalone agent; empty states; a remote run's "on that node" wording |
| MSP-09 | AC-008, SCN-007, RU-05 (C-06) | Real stack | Durable | same | Sheet: name, URL, state, Check connection, peers with reachability and offers; paired node down: bar and banner; node back: Retry/Check; unpair → confirm → pairing |
| MSP-10 | AC-009, unsupported notice | Real stack | Durable | same | None of the "Not on the phone" items; `?unsupported=desktopWorkspace` notice above the list |
| MSP-11 | AC-005, QR-001 | Real stack, both viewports | Durable | same | Every phone-owned control ≥ 44×44, no horizontal scroll at 390×844 and 360×800 on every screen; Back walk file → view → run → list and reference → Messages; screenshots for VIS comparison |
| MSP-14 | AC-002 alternate, RU-04 | Real stack | Durable | same | Task A DONE: the task agent's row leaves the list live |
| MSP-12 | DS-001, R-001, R-002, QR-003 | Real stack, network log | Durable | same | Reads with window `null`; poll every 5 s only on the list; none on the run screen or a view; none while hidden; one read on return; payload bytes; first-render time |
| MSP-13 | RU-03, AR-008 | Real stack | Durable | same | A credential the node does not know (401): the next start reads once and lands on pairing. Recorded: a device revoked on the node (403, outside the 401 rule as at base) |
| UPD-NVP-04 | AC-010, persisted session | Real stack | Durable (updated) | `pnpm -C autobyteus-web test:e2e:node-vocabulary` (NVP-04 needs the whole probe) | Stale wait target |
| UPD-LRL-004 | Preserved Messages unavailable | Real stack | Durable (updated) | `node tests/e2e/delegated-launch-defaults-probe.mjs --cases LRL-004` | Stale phone path |
| UPD-WVC-004 | DS-001 (window `null`) | Real stack | Durable (updated) | `node tests/e2e/delegated-launch-defaults-probe.mjs --cases WVC-004` | Stale assertion (window 5) |
| UPD-OSR | REQ-007 Artifacts | Real stack | Durable (updated) | `test:e2e:owner-scoped-file-reads --seed-to …` then `--from-seed … --cases B-006,B-007` | Stale phone path |
| DSK-01 | AC-010 | Desktop, two servers | Existing Test | `pnpm -C autobyteus-web test:e2e:remote-runs-in-tree` | Desktop regression of shared owners with real remote, Team and Org runs |
| DSK-02 | AC-010 | Desktop, fixture | Existing Test | `test:e2e:agent-org-task-team-disclosure`, `node tests/e2e/task-agent-sibling-sidebar-probe.mjs`, `test:e2e:standalone-agent-error-stop`, `node tests/e2e/team-activity-presentation-probe.mjs` | Fixtures changed in this ticket or disclosure default |
| DSK-03 | AC-010 | Desktop, real stack | Existing Test | `test:e2e:task-closure-tree --cases BR-001` | `AgentRunTaskRows` adopted the moved rules |
| ADR-01 | AC-010 (pairing on Android), QR-004 | Android emulator, this worktree's debug APK | Journey (temporary) | Ticket-owned AVD; pair through the Android shell's connection screen with the pairing link; the run list renders | Device layer; no durable Android harness in the repository |
| ADR-02 | AC-005 (system Back) | Android emulator | Journey (temporary) | `adb shell input keyevent KEYCODE_BACK`: file → Files → run → list; reference → Messages → run → list; DOM via WebView DevTools | — |
| ADR-03 | AC-010 (notice, unpair), persisted session | Android emulator | Journey (temporary) | Notice route; app restart keeps pairing; unpair → pairing | — |
| ADR-04 | R-002, poll pause in background, QR-003 (emulator) | Android emulator | Journey (temporary) | Home key → a probe-owned counting proxy between the emulator and alpha shows no history reads; a run created meanwhile; back in front → a read at once and the new run listed | The node's log has no request lines at WARN, so the network log is the proxy |
| ADR-05 | AC-005, QR-001 (Android 15) | Android emulator | Journey (temporary) | The run screen's ⋮ under Android 15's edge-to-edge status bar: a tap at its centre, and one below the status bar | Found while running ADR-02 |
| IOS-01 | QR-004, AC-010 | iOS simulator Safari | Journey (temporary) | iOS 26.1 Safari opens the production `/mobile` bundle served by the node (unpaired: pairing needs a tap the simulator tooling cannot script) | Real iOS WebKit rendering; IOS-02 covers the paired screens |
| IOS-02 | QR-004 | Playwright WebKit 26.0, iPhone 13 profile | Journey (temporary) | Pair; list, run (a message), ⋮, Files, a file, Messages, New run, connection sheet; page errors and horizontal scroll recorded | WKWebView's engine with assertions; Playwright's matching WebKit installed into a private temporary browsers path |

- Test progress log needed: `Yes` ([api-e2e-test-progress.md](api-e2e-test-progress.md)).

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| MSP-01…MSP-13 | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`, script `test:e2e:mobile-shell` | No repository coverage drives the new phone shell against real servers; the open sequence, the route history, the poll and the remote relay are only mocked in specs. It also gives a `--hold` mode that keeps the stack up for device checks |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| UPD-NVP-04 | `tests/e2e/node-vocabulary-probe.mjs` | Wait for `mobile-run-list` (the paired screen) instead of `mobile-home`; header text | Behavior asserted is unchanged (stays paired) |
| UPD-LRL-004 | `tests/e2e/large-runs-load-less-cases.mjs` | Phone path: list → the Team run row → ⋮ → Messages | Asserted reason unchanged |
| UPD-WVC-004 | `tests/e2e/workspace-views-chooser-cases.mjs` | The phone reads with `null` (DS-001); wait for the run list; header and case title | The desktop part unchanged |
| UPD-OSR | `tests/e2e/owner-scoped-file-reads-probe.mjs` | Phone path: list → row → ⋮ → Artifacts; one artifact shows directly | Owner-route assertion unchanged |

## Durable Coverage To Remove

None. The specs of removed code were removed by implementation (reviewed in CRR-001).

## Live Environment And Fixture Plan

- Startup order: `pnpm -C autobyteus-server-ts build` (done, `evidence/api-e2e/server-build.log`, exit 0) → the probe starts alpha and beta, configures peers, creates definitions and runs through public APIs, starts `nuxt dev` on the LAN address against alpha, pairs the phone, runs the cases, then cleans up.
- Environment: alpha with `ANTIGRAVITY_CLI_COMMAND` (scripted AGY), `GROK_BUILD_COMMAND` (recorded Grok replay, `permission`), `HTTP_ACCESS_LOG_MODE` on for the poll count; beta with the scripted AGY.
- Seed data: a "Project Task Manager" agent with a Project and two Tasks (task agent, task team whose coordinator delegates further), remote delegations to beta (`/publisher`, `/studio_team`), a Team run, an Org run, extra agent runs to pass 5 top-level runs, one Grok run waiting for approval.
- Identities: one Phone Access pairing per phone context; credentials redacted.
- Evidence: per case JSON in the probe's evidence file, screenshots at both viewports, the network log of history reads, server logs, `frontend.log`.
- Cleanup: browser, Nuxt process group, servers, temp roots; the probe writes a cleanup receipt.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| QR-003's 2 s on the user's phone over Tailscale with his real history | His phone, his network and his history; never test against the user's node (TESTING.md Rule 2) | First render on cellular | Yes | Measured on the probe stack and the emulator as a proxy |
| AC-005's confirmation on his phone, AC-002 "device by the user" | User acceptance by definition | — | Yes | — |
| R-001 cellular cost on his history | His history | Data use | Yes (his history); bytes per poll measured on the probe stack | — |
| iOS WKWebView in the iOS shell app | The iOS shell is paused and out of scope; Safari on the simulator and WebKit are the same engine | Shell-specific WKWebView settings | No | — |

## Ambiguities Or Reroute Triggers

Found during execution (details and evidence in the execution report):

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| A member's delegated task agent sits beside the member (shared row sources lift task-agent leaves; the desktop shows the same), where REQ-002 and VIS-002 nest it under the member | Design Impact (the user may need to choose desktop parity or VIS-002) | MSP-02 | Solution Designer |
| A delegated run's state on the list is live only while its root is the open run; under other roots it stays as first loaded | Design Impact | MSP-02 (recorded) | Solution Designer |
| The top bar runs under Android 15's status bar (the Android shell, targetSdk 35, applies no insets) | Requirement Gap — prerequisite candidate (Android shell, out of this ticket's scope) | ADR-05 | Solution Designer |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (one probe added, four updated)
- Reroute Required Before Validation Execution: `No`
- Notes: the four stale probes were left by the implementation round; their updates are test-only and go to code review's test review with the new probe. Execution found implementation defects and design questions; see the execution report's Preliminary Classification.

## Round 2 Plan

**What changed** (`git diff --name-only f2816cc7c1 400457d5f7`, code only):
- the id helper `utils/randomId.ts` at ten call sites in shared stores and streams;
- the Task lines (`useTaskWorkerTasks`, the projection, `useMobileRunTree`);
- the Org first member (`agentOrgHistoryRows.ts`, `useMobileRunOpening`);
- the unpair sheet (`MobilePairedShell`), the reference header (`CollaborationMessageReferenceViewer`, `MobileTeamReferenceViewer`), the path targets (`MobileFiles`);
- the Android shell's insets (`SystemBarInsets.kt`, `WebShellScreen.kt`, `ConnectionScreen.kt`).
- No server change: the round-1 server build stays valid. The phone bundle is rebuilt; the APK is up to date with the sources (Gradle: all tasks up to date).

**Basis changes for the probe's expectations:**
- DEC-009: a member's task agent stays beside the member, as on the desktop.
- DEC-010: second lines are the Task's summary or the remote title; members show one line.
- DEC-013: a delegated row under a run that is not open shows its last-read state, and updates when that run is opened.
- REQ-003a: an Org run opens its first configured member, or that Team's coordinator; every send works over plain HTTP.
- REQ-011 / AC-011: on Android 15, nothing sits under the system bars, and a centre tap on ⋮ works.

| Case ID | Decision | Reason |
| --- | --- | --- |
| MSP-01…14 | Rerun (whole probe) | Phone and shared stores changed; the probe's expectations updated for DEC-009, DEC-010, DEC-013 and AC-003a (a second Org whose first member is a Team) |
| ADR-01…05 | Rerun on API 35 | Android shell changed (REQ-011) |
| ADR-06 (new) | Run on API 35 | AC-003a on Android: a message to a delegated child typed and sent over HTTP |
| ADR-07 (new) | Run on API 35 and API 34 | CRR-004 residual C-12: typing with the keyboard open (double padding) |
| IOS-02 | Rerun | Phone web code changed |
| DSK-01, DSK-02, DSK-03 | Rerun | Shared stores and streams (id helper), Task lines, Org rows |
| UPD-LRL-004 | Rerun | Team streaming changed (id helper) |
| UPD-WVC-004, UPD-OSR, UPD-NVP, IOS-01, API-05 (B08) | Still valid | They exercise the history load, the Artifacts view, the paired session's opening and the New run setup; none of those files changed (`MobilePairedShell`'s change is the unpair handler only) |
| API-01…04 | Reused: IMP-09 (full web suite), IMP-02, IMP-03 at `400457d5f7`; IMP-08 (Android instrumented tests on API 35 and 34) | Ran on the code under test |

`TESTING.md`: the design's "phone rule" item is not added, at the user's direction. The project documents hold only what every future change follows; the durable probe and its header carry the phone specifics. In the same session, at the user's request, `TESTING.md` was trimmed of one-suite details (`c5319f0bf4`, `dce25fdd50`).
