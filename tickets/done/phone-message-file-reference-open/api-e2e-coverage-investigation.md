# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/phone-message-file-reference-open/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `tickets/in-progress/phone-message-file-reference-open/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/phone-message-file-reference-open/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/phone-message-file-reference-open/design-spec.md` (SR-001, Ready)
- Supplemental Task Artifacts: `probes/probe427.mobileFileOpen.spec.ts` (reproduction), `follow-ups.md` (FU-001)
- Design Review Report: `N/A — not applicable` (direct Small/Low route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/phone-message-file-reference-open/implementation-handoff.md` (IR-001, code commit `61c886c0fe`)
- Implementation Revision Record: `tickets/in-progress/phone-message-file-reference-open/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `tickets/in-progress/phone-message-file-reference-open/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (direct Small/Low route)
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

On the phone (`/mobile`, the node-served phone bundle), a tap on a file link in a run's conversation must open the file on the phone's Files screen as a history entry (`screen=files&workspace=<id>&file=<relative path>`), with Back returning to the conversation (REQ-001, AC-001, AC-002). A path outside the open run's workspace, or a remote run, opens nothing and shows the existing status line (REQ-002, AC-003, QR-001). The desktop open is unchanged (REQ-003, AC-004). REQ-004 asks for a real-router test (AC-002) and a phone browser-probe case on an isolated node (AC-001).

The fix (design DS-001): `AgentEventMonitor` takes `useMobileNavigation()` in setup when `isMobileRemoteAccessRuntime()` and passes it as the required `mobileNavigation` option to the lazily created opener; the opener no longer calls the inject-based composable. Design Guidance also assigns the API/E2E engineer a TESTING.md rule for the stage that let the bug through.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (phone tap, inside workspace → viewer → Back), SCN-002 (phone tap, path outside the workspace → status line), SCN-003 (desktop click → Files tab).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-001 with the file in a sub-folder of the workspace (`drafts/draft-v3.txt`), so the URL's relative path is a mapped path, not just a file name. Trigger: the same tap.
  - SCN-001 with a Markdown link whose label is the file name (`[draft-v3.txt](<absolute path>)`), the shape ASM-001 says the user's message had.
  - SCN-001: the system Back key (history Back, as the Android WebView maps it) after the open.
  - SCN-001 from a conversation loaded from the node (the message arrived before the phone opened the run), which is how a user returning to a run sees it.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 phone tap opens the Files viewer | Changed | Requirements BEH-001; investigation R-01/R-02; IMP-02/IMP-03 | Component-level proof exists (IMP-03, real router). Needs the phone bundle in a browser against a real node: the production build, real GraphQL metadata, real file read, real history (AC-001) |
| BEH-002 outside path → status line, no navigation | Preserved | BEH-002; boundary spec; IMP-03 case 2 | Unit + component proof exists; one browser check on the phone bundle (AC-003) |
| BEH-003 desktop open | Preserved | BEH-003; IMP-04 | Unit proof exists; desktop `event-monitor-file-preview-probe` (packaged Electron) must stay green (AC-004) |
| `useMobileNavigation` (setup-only composable) | Preserved | design Dependency Rules | Covered by the phone screens' suites (IMP-04) and MSP-08/MSP-16 in the browser |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | GraphQL `workspaceMetadata` and the file read are used, not changed | — | The viewer's file read under a Phone Access credential (277/403) on this path | Phone browser probe (real node) |
| Frontend component / state | Yes | `AgentEventMonitor` setup capture; opener options | IMP-03 (real monitor/feed/renderer/opener/router), IMP-04 | Nuxt production build (Vue warnings stripped, tree-shaking, lazy chunk) | Phone browser probe |
| Browser integration / user journey | Yes | Tap → history push → Files viewer → Back | IMP-03 in happy-dom with a memory router | Real browser history, the phone shell's routing, the real Files viewer reading the file | `mobile-shell-probe` MSP-16 |
| Authentication / session / permissions | Indirect | Phone Access credential reads the file (403 route guard) | MSP-08 opens files from the Files screen | The same read reached from the conversation path | MSP-16 |
| Desktop renderer / web-equivalent UI | Yes (preserved) | Desktop passes `mobileNavigation: null` | IMP-04 | Real lazy chunk in the packaged renderer | `event-monitor-file-preview-probe` |
| Desktop shell / Electron-specific integration | No change | Native file bytes path untouched | — | — | Desktop probe exercises it anyway |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-message-file-reference-open`, branch `codex/phone-message-file-reference-open`
- Project type and runtime stack: pnpm monorepo; Nuxt 3 web app (desktop renderer + phone bundle `build:mobile-web`), Node server `autobyteus-server-ts`, Electron shell
- Project testing guideline path(s): `TESTING.md` (repository root). No closer `TESTING*.md` under `autobyteus-web/`.
- Conflicting, missing, or unclear project instructions: none. The probe header (`mobile-shell-probe.mjs` l.78-80) gives prerequisites and command.
- Changed build-input paths: `None` (`git diff --name-only 6225a734a3...HEAD`: web components/composables/specs, `docs/design-cases.md`, ticket files; no manifest, lockfile, config, workflow or new cross-package import). No fresh-start build case.
- Required environment variables or secrets available: `N/A` (scripted AGY CLI; no provider keys)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers, Choosing the path | Layers | Renderer change → web unit tests + a browser probe; `pnpm -C autobyteus-web test:nuxt`; browser probes `pnpm -C autobyteus-web test:e2e:<name>` |
| `TESTING.md` § Browser probes | Probe rules | Probe owns its stack; fresh `--output-dir`; fails on browser errors; assert DOM/state |
| `TESTING.md` § Environments | Build first | `pnpm -C autobyteus-server-ts build` before probes that run `dist/app.js`; one heavy run at a time; serialize builds |
| `TESTING.md` § Rules 1-5 | Desktop | Isolated instance only; stop what you started (the desktop probe drives `isolated-app` itself) |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` header | Phone probe | Prereqs `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web`; `--cases=`, `--output-dir=` |
| `autobyteus-web/tests/e2e/event-monitor-file-preview-probe.mjs` header | Desktop probe | Packaged Electron through `isolated-app start --build`; `--output-dir <fresh>` |
| `autobyteus-web/package.json` | Scripts | `test:e2e:mobile-shell`, `test:e2e:event-monitor-file-preview`, `build:mobile-web`, `test:nuxt` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | Untracked `dist/` | `dist/app.js` exists | Left as build output (untracked) |
| Phone bundle | worktree | `pnpm -C autobyteus-web build:mobile-web` | `autobyteus-web/dist/public` | `index.html` exists | Untracked build output |
| alpha/beta nodes, `nuxt dev`, headless Chrome | probe-owned temp root | started by `mobile-shell-probe.mjs` | free ports, temp HOME/data | `/rest/health` | probe `finally`; cleanup receipt in `mobile-shell-probe.json` |
| Packaged Electron isolated instance | worktree | started by `event-monitor-file-preview-probe.mjs` (`isolated-app start --build`) | own profile/ports | probe N-001 | probe stops it; `isolated-app list` afterwards |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Team run "Delivery Team" with a workspace on alpha | probe `setUp` (public GraphQL/WebSocket) | synthetic | probe temp root removed |
| A lead's message naming `drafts/draft-v3.txt` and an outside file by absolute path | MSP-16: probe writes the two files, sends `ECHO_INPUT …` to the lead over the run's WebSocket; the scripted AGY CLI replies with the text (a real AI message through the real runtime/stream/projection) | synthetic; outside file in the probe's temp root, not user data | probe temp root removed |
| Phone credential | Phone Access pairing through REST, as in every MSP case | probe-owned node | removed with the node |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `components/workspace/agent/__tests__/AgentEventMonitor.mobileFileOpen.spec.ts` (new, IR-001) | Real monitor/feed/renderer/opener/router: tap → Files route, Back; outside path → status | AC-002, AC-003 | Still Valid | IMP-02 fails on base, IMP-03 passes | Reuse IMP-02/IMP-03 |
| `composables/__tests__/useEventMonitorFilePreview.spec.ts`, `.mobileBoundary.spec.ts` | Opener desktop path and phone containment, navigation passed as option | AC-003, AC-004 | Still Valid (updated in IR-001: dead module mock removed) | IMP-04 | Reuse |
| `components/workspace/agent/__tests__/AgentEventMonitor.spec.ts` | Lazy opener; `mobileNavigation: null` off the phone | AC-004 | Still Valid | IMP-04 | Reuse |
| `components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts`, `WorkspaceToolShell.spec.ts` | Desktop open into the Files tab | AC-004 | Still Valid | IMP-04 | Reuse |
| `tests/e2e/mobile-shell-probe.mjs` MSP-01…MSP-15 | Phone shell journeys; MSP-08 opens files from Files and Messages | Preserved boundary (requirements) | Still Valid; no case taps a conversation file link (the gap that let the bug ship) | probe header l.27-77 | Add MSP-16; run MSP-08 alongside |
| `tests/e2e/event-monitor-file-preview-probe.mjs` | Packaged desktop: real Markdown action → lazy monitor → Files tab, native bytes | AC-004 | Assertions Still Valid; its saved-Org fixture Needs Update (found in API-07 runs 1-2) | header; API-07 | Baseline fix of the fixture, then run |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-002, AC-003 (component) | Component with real router | Reused | IMP-02 (fails on base) and IMP-03 (passes at `61c886c0fe`) | Ran on the commit under test; no code changed since (`git diff --name-only 61c886c0fe HEAD` touches only the ticket folder); logs have headers and look-for lines |
| API-02 | AC-003, AC-004 (unit) | Touched suites | Reused | IMP-04 | Same commit, same reasons |
| API-03 | — | Typecheck | Reused | IMP-05 | Same commit; the probe file added here is `.mjs` and outside the typecheck |
| API-04 | Regression across the web app | All web unit/component suites | Existing Test | `pnpm -C autobyteus-web test:nuxt` | Not run by implementation; the opener and monitor are shared by desktop and phone |
| API-05 | AC-001, AC-003, REQ-004 (fails on base) | Phone bundle in a browser, real node | Durable (new MSP-16) | Phone bundle built with the three production files at base `6225a734a3`; `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-16 --output-dir=<fresh>` | Shows the new browser case catches the shipped bug (expected `Fail`) |
| API-06 | AC-001, AC-003, REQ-004; preserved MSP-08 | Phone bundle in a browser, real node | Durable (new MSP-16) + Existing Test (MSP-08) | Phone bundle rebuilt at HEAD; `… --cases=MSP-08,MSP-16 --output-dir=<fresh>` | The direct proof of AC-001/AC-003 |
| API-07 | AC-004 | Packaged desktop renderer + shell | Existing Test | `pnpm -C autobyteus-web test:e2e:event-monitor-file-preview --output-dir <fresh>` | The desktop's real lazy chunk with `mobileNavigation: null` |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-05/API-06 (MSP-16) | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`, new case MSP-16 | REQ-004; no browser case taps a conversation file link on the phone bundle, which is how the bug shipped |
| — | `TESTING.md` rule (Design Guidance) | The rule for the stage that let it through (`project-documents.md`, "When a later stage catches a problem") |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| MSP-16 | `mobile-shell-probe.mjs` header | List MSP-16 among the cases | — |
| API-07 | `event-monitor-file-preview-probe.mjs` GraphQL fixture | Answer `GetAgentOrgMemberFileChanges`; give the selected delegated copy's launch snapshot the workspace root | Found during execution: the probe failed in its setup (N-001) on every branch since `03f2d4da05`/`7d689455ad` (2026-10-19). Cause in the test (TESTING.md Rule 9), so a baseline fix in this branch, its own commit |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron with Nuxt renderer
- Testing guideline used: `TESTING.md` (Browser probes, Packaged Electron, Rules 1-5)
- Web-equivalent behavior: the phone bundle (not Electron) carries the change; desktop behavior is preserved
- Shell-specific behavior: none changed; the desktop probe exercises the real preload/native bytes path anyway
- Chosen approach: packaged `event-monitor-file-preview-probe` (isolated instance it owns)
- How the run avoids disturbing the user's app: the probe uses `isolated-app` (own profile, ports, data); the user's running app is not touched

## Live Environment And Fixture Plan

- Startup order: server build → phone bundle build → probe (owns alpha, beta, `nuxt dev`, Chrome) → probe cleanup; later the desktop probe alone (one heavy run at a time)
- Environment choices: phone at 390×844 with touch; the phone reaches alpha through the private address `192.168.77.10` as the probe emulates
- Readiness: probe `/rest/health`; `/mobile` serves the bundle
- Seed data: probe `setUp`; MSP-16 adds `drafts/draft-v3.txt` in the workspace and `outside-427/private.txt` beside it (outside the workspace)
- Journeys: open the Delivery Team (its lead) → tap `draft-v3.txt` → viewer shows its text, URL `screen=files&workspace=<alpha's id for the folder>&file=drafts/draft-v3.txt` → system Back → conversation with composer; tap `private.txt` → URL unchanged, no viewer, status line text, the outside text nowhere on the page
- Evidence: `mobile-shell-probe.json` case details (URLs, texts, console lines), screenshots, the probe's browser-error list, server logs
- Cleanup: the probe's `finally` (receipt `cleanup`); output folders kept as evidence (excerpts copied into `evidence/`)

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| The Android APK's WebView on a physical phone | The probe loads the same node-served phone bundle in headless Chrome with a touch phone context; the APK is a WebView shell around it with no change here | Low | No (an emulator is possible but adds nothing the change touches) | None |
| Remote-run variant of AC-003 (status line for a run on another node) | Unchanged code path (`handleFilePathAction` short-circuit); covered by the boundary spec (IMP-04) | Low | No | None |
| Read-only conversation hides the status line | Out of scope, FU-001 | — | No | FU-001 |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (MSP-16 in `mobile-shell-probe.mjs`; TESTING.md rule)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the design's escalation trigger (the Files viewer cannot read the mapped file on the phone) is watched by MSP-16.
