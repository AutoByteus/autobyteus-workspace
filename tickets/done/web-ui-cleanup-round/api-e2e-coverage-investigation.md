# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results go in `api-e2e-execution-coverage-report.md`.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round/tickets/in-progress/web-ui-cleanup-round/` unless absolute.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001; DEC-001…003 by the user)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001; `Medium` / `Low`)
- Supplemental Task Artifacts: `icon-inventory.md` (user-approved, DEC-001)
- Design Review Report / Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct low-risk route)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation complete (IR-001), direct API/E2E route
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- AC-001/002 (REQ-001/002): the Settings menu is text-only; group A/B icons of `icon-inventory.md` are gone and group C stays.
- AC-003…005 (REQ-003): full runtime names everywhere (web views, server texts to agents and users), from one contract list (`agentRuntimeName`). AC-006: GLOSSARY.
- AC-007 (REQ-005): one "Waiting…" state. AC-008: Product Team record (`a938d892b3`, not API/E2E).
- AC-009 (REQ-007): skill-update notice paths literal. AC-010 (REQ-008): Depends-on Enter.
- AC-011 (REQ-009): voice input in Memory → Search, the existing component and behavior. It fills the box with no search until Search is pressed; it is hidden when voice is unavailable, disabled while search is not ready, and shows the existing mic-denied error.
- AC-012: existing suites pass; clean-clone proof (with delivery).
- Implementation: per-item commits (`4d0ce7095a` … `a3dbfcb495`), head `b34c2a36ea`. The Legacy check is clean (old maps and helpers removed, no aliases), and persisted data is `Not Affected` (kinds unchanged). Both match the diff.
- Deviations named by implementation (all under REQ-003 "every name" / AC-005 "one list"): application readiness reasons ("Codex App Server authentication is unavailable: …"), work-journal header, materializer label, system-instruction labels, Token Statistics maps. Two further changes: the shared voice status texts are now neutral, and the Server Settings submenu indent is `ml-2`. All are within the approved requirement; accepted.

## Supported Scenarios And Real Usage

- SCN-001…006 as in the requirements.
- Added from investigation:
  - SCN-002b: a delegating agent's tool result carries the launch notes and model-availability reasons with the full names (`delegate_task` launch notes; the web probe `delegated-launch-defaults-probe.mjs` DLP-003/004/005 asserts these texts in the conversation).
  - SCN-006b: voice is an Electron-managed extension (`electron/extensions/voice-input`, IPC `voice-input:transcribe`, runtime and model downloaded from `AutoByteus/autobyteus-voice-runtime` v0.3.0, darwin-arm64 `whisper-small-mlx`). AC-011 can only be seen in the desktop app with the extension installed; in a browser the button is hidden (IMP-09).
- Contrived scenarios: none recorded.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Frontend component / state | Yes | many components (icons, names, Waiting, picker, voice) | IMP-05 full web suite, IMP-00 | rendered pages | Browser probe; desktop instance |
| Browser integration / user journey | Yes | Settings, tools, chat footer and model menu, Run Settings, Model Routing, Memory | IMP-07 probe (Agent Runtimes), IMP-09 own look | group B pages; names in live run views | Probes + desktop journey |
| Desktop shell / Electron-specific | Yes (voice extension IPC drives the new button) | `VoiceInputButton` in Memory search via the extension | component test only | the real extension, transcription, permission paths | Isolated desktop instance with the extension installed (microphone emulated) |
| Domain / backend logic | Yes (texts) | server runtime names, notice builder | IMP-03, IMP-04, IMP-08 | probes that read those texts in the web | Browser probes |
| API / transport / contract | Yes (contract package) | `agentRuntimeName` | IMP-01 | — | — |
| Persistence, auth, workers | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round`, branch `codex/web-ui-cleanup-round` @ `b34c2a36ea`
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round/TESTING.md`. Renderer → web unit tests + a browser probe. A desktop-shell or full product journey → an isolated instance of a worktree build. Probes need a current server build.
- Discrepancy: the server build in the worktree (16:42) predated the item-4 server commit `f9c1a8d5e3`; rebuilt (`pnpm -C autobyteus-server-ts build`, exit 0) before any probe.
- Secrets: none for the probes (scripted CLIs). The desktop journey uses no provider credentials. The voice extension needs a network download only.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| New/changed web specs (sidebar, ToolCard, McpServerCard, ProjectIndexesCard, TaskDependencyPicker, MemorySearchPanel, name callers) | as the ACs | AC-001…003, 007, 009…011 | Still Valid | IMP-00, IMP-05 | Keep |
| Server units / e2e with names (IMP-03/04/08) | full names in server texts | AC-004 | Still Valid | IMP-03/04/08 | Keep |
| `autobyteus-web/tests/e2e/agent-runtimes-settings-probe.mjs` (updated) | Settings sidebar, Agent Runtimes names | AC-001, AC-003 | Still Valid | IMP-07 | Keep |
| `autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs`, `system-instruction-activity-probe.mjs` (updated, not run) | names in Model Routing, system-instruction labels | AC-003 | Still Valid (to run) | — | Run (API-10, API-11) |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` (not updated) | DLP-003/004/005 expect launch notes and model-availability reasons built with runtime **kinds** (`noteText`, `runtime: AGY`, "is not available on ${AGY}", lines 234-244, 559-584, 660, 677) | AC-004 (SCN-002b) | Needs Update (confirmed by API-09 run 1: actual "Antigravity CLI", expected "antigravity_cli") | API-09 | Updated through the contract's `agentRuntimeName` (`bacc8f51fd`); launch values keep kinds |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01…API-08 | as IMP-00…IMP-08 | contract, server, web suites, guards, Agent Runtimes probe, server e2e | Reused | IMP-00 … IMP-08 | Code unchanged since. IMP-07 ran on web `51a0aec3ac`; the later web commit `a3dbfcb495` touches only Token Statistics, which the probe does not open. IMP-08 ran on the item-2 server code; the later server commit `f9c1a8d5e3` (notice builder) is not exercised by those e2e |
| API-09 | AC-004 (SCN-002b), AC-003 | real stack: delegation tool results with launch notes in the conversation | Existing Test | `node tests/e2e/delegated-launch-defaults-probe.mjs --output-dir <fresh> --ledger-file <ledger> --cases DLP-003,DLP-004,DLP-005` (cwd `autobyteus-web`) | The probe's expectations encode the old texts |
| API-10 | AC-003 | system-instruction labels | Existing Test | `node tests/e2e/system-instruction-activity-probe.mjs --output-dir <fresh>` | Updated by implementation, not run |
| API-11 | AC-003 | Model Routing names (two nodes, scripted AGY) | Existing Test | `node tests/e2e/model-routing-decisions-probe.mjs --output-dir <fresh>` | Updated by implementation, not run |
| API-12 | AC-001, AC-002 (all group A/B pages), AC-003 (chat footer, model menu, Run Settings, member rows, Agent Runtimes, Model Routing, Token Statistics), AC-007 (if reachable), AC-010, AC-011 | isolated desktop instance of this worktree | Journey | `pnpm --silent isolated-app start --build`; drive the window over CDP; DOM checks per page (no group A/B `svg`, group C present), names in the views; Settings → Extensions → install the voice extension; Memory → Search: the button's look, Tab/Enter/Space, recording, transcript into the box with no search, no-speech, failure, mic denied, language. The microphone is emulated in the renderer (`getUserMedia` returns a stream played from a WAV made with macOS `say`; silence for no-speech; a rejection with `NotAllowedError` for denied); the extension's real transcription runs on that audio | The only surface that has the voice extension; the full product look |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

- Updated: `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` launch-note expectations through `agentRuntimeName` (`bacc8f51fd`); `autobyteus-web/tests/e2e/system-instruction-activity-probe.mjs` baseline fix (`a26305a2a7`: the app shell's WebSockets and run-history/Org fields, drift that predates this ticket, TESTING Rule 9).
- Add / Remove: none.

## Desktop Application Validation Plan

- Shell: Electron; the voice extension runs in the main process (managed extension service, IPC)
- Web-equivalent behavior: icons, names, Waiting, picker; also seen in the desktop window
- Shell-specific: voice extension install, settings, transcription IPC
- Approach: isolated instance (`isolated-app start --build`), CDP control; microphone emulated in the renderer only
- Running app: the user's AutoByteus and its data are not touched; the extension installs into the instance's data root

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| A real microphone and real speech | No speaker at the test machine; the OS microphone prompt for a new app bundle | Low (the emulated stream enters through the same `getUserMedia` the button calls) | Yes (optional) | Delivery may offer it |
| AC-012 clean clone | Delivery's step | — | No | Delivery |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (two probes updated)
- Reroute Required Before Validation Execution: `No`
