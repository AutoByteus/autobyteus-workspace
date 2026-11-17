# API/E2E Coverage Investigation — phone-run-model-runtime-458 (autobyteus-458, with autobyteus-506's build items): a readable phone conversation, Text size, the composer corners, Settings for a run's runtime and model, and a stop that reports success

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-006; REQ-001…011, AC-001…009; PRE-001 taken in as REQ-011)
- Behavior-defining supplement: the approved UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-conversation-readability-506/ui-ux-spec.md` (VIS-001…VIS-019)
- Design Spec: `design-spec.md`; Investigation Notes: `investigation-notes.md`; Solution Revision Record: `solution-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001, direct route, Medium / Low)
- Code Review: N/A (direct route)
- API/E2E Revision Record: `api-e2e-revision-record.md`; current revision `API-REV-001`; round 1
- Trigger: Implementation Engineer IR-001; code `ec5b81f912`, documents `075c7274f0`, base `origin/personal` @ `3b59ef0be1`
- Note: the worktree held uncommitted edits to `design-spec.md`, `handoff-implementation.md`, `requirements-doc.md` and `solution-revision-record.md` when this round started (not API/E2E's; left as they are)

## Current Requirement And Design Basis

Phone runtime only: the conversation's layout and type (12 px margins, a 22 px avatar and the speaker's name once per turn, 17 px / 1.5), another agent's message unchanged from the desktop, a four-step Text size kept in `autobyteus.phone.textSize`, 8 px under the composer; the composer's rounded lower corners on desktop and phone; ⋮ → Settings for an agent run, a Team member or an Org member, with New run's Runtime and Model rows on `useExistingRunConfigStore`: Save for a stopped run's changed selection, the node's refusal in a red card, and for a live run (idle or working) the desktop's red stop icon (one tap stops the run, or the Team/Org run). Step 0: the shared agent and Team stop report success when the node stopped the run although the input instance was unknown at the start (desktop run tree, desktop Settings, phone).

## Supported Scenarios And Real Usage

- From the requirements: UC-001…UC-006.
- Real-use scenarios added:
  - RU-01: the founder's Android app: open a stopped Team member, change its runtime and model in Settings, send "continue".
  - RU-02: in the app, a live agent (idle after its answer) and a working one (a turn running): Settings → stop icon → one tap.
  - RU-03: Text size chosen in the app, kept after the app is closed and reopened.
  - RU-04: an Org member's Settings (an Org's direct agent, an Org Team member): change and Save; the stop stops the Org run.
  - RU-05: a model the phone listed is no longer offered by the node when Save is tapped (the node restarted without it).
- Technically possible but unsupported: none recorded.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Repository Evidence | Material Risk Not Exercised | Candidate Broader Validation |
| --- | --- | --- | --- | --- |
| Web stores (stop ownership) | Yes | unit tests; desktop probe DCP-001/003, AFS-001 | a working Team's stop from the desktop run tree | desktop probe or browser window |
| Phone UI (conversation, Text size, Settings) | Yes | specs; MSP-59…64 (Chrome) | the Android app's WebView; an app restart; an Org member; a "not offered" refusal | emulator; phone probe |
| Desktop conversation / composer | Yes (composer corner; the phone rules scoped) | specs | the desktop rendering | desktop probes |
| Server, Android shell | No | — | — | — |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-model-runtime-458`, branch `codex/phone-run-model-runtime-458`
- Testing guideline: `TESTING.md` (Android emulators: own AVD, own port, headless, deleted afterwards; browser probes; one heavy run at a time; clean env)
- Changed build-input paths (TESTING.md's list): `None` (web sources, specs, probes, CSS, catalogs) → no fresh-start case
- Secrets: none (scripted runtimes only)

| Component | Start / Setup | Stop |
| --- | --- | --- |
| Phone bundle, server `dist`, debug APK of this branch | `build:mobile-web`, server build if stale, `assembleDebug` | — |
| The phone probe's stack in `--hold` mode (alpha with the scripted AGY and Grok Build runtimes, its Teams, Orgs and runs; an emulator pairing link for `10.0.2.2`) | `pnpm -C autobyteus-web test:e2e:mobile-shell --hold --output-dir=…` | SIGTERM; its cleanup receipt |
| A host node for RU-05 (scripted AGY with `AGY_FAKE_EXTRA_MODELS`, restarted without it on the same port and data) | `dist/app.js`, temp root | SIGTERM, removed |
| Emulator | own AVD (android-35), port 5640, `adb root` | killed, AVD deleted |

## Existing Durable Coverage Inventory

| Path / Test | Decision | Action |
| --- | --- | --- |
| the 458 specs (stores, Settings, menu, conversation, catalog, scope) | Still Valid | Reuse (IMP-458-web-unit) |
| MSP-59…64 (`mobile-run-settings-cases.mjs`) | Still Valid | Reuse; rerun in the full probe |
| `delegated-launch-defaults-probe.mjs` DCP-001/003, AFS-001 | Still Valid | Reuse (IMP-458-desktop-stops) |
| the other MSP cases; desktop composer probes | Still Valid | Run (AC-008) |

## Planned Cases

| Case ID | Criteria | Kind | Planned Steps |
| --- | --- | --- | --- |
| R-IMP | AC-001…009 unit and Chrome parts; AC-009 desktop agent/Org stops | Reused | IMP-458-* |
| API-01 | AC-001, 002, 004, 005, 006, 008 | Existing Test | the full `test:e2e:mobile-shell` (clean env) |
| API-02 | AC-004, AC-006, AC-002 (kept across an app restart) | Temporary Probe | emulator, the branch's APK, the probe's stack held (`--hold`): a stopped Team member → Settings → Runtime Grok Build, Model grok-4.7 → Save → reopen → "continue" from the phone; a live idle agent and a working one (`HOLD_TURN`) → stop icon → one tap → rows open → Save; Text size Large → app force-stopped and reopened → still Large |
| API-03 | AC-004 (Org), REQ-008 (Org stop) | Temporary Probe | same stack: an Org's direct agent and an Org Team member → Settings → change → Save; a live Org member → stop icon → one tap → the Org run stopped |
| API-04 | AC-005 | Temporary Probe | a host node with `AGY_FAKE_EXTRA_MODELS`: a stopped run; the phone picks the extra model; the node restarted without it; Save → the node's message in the red card; nothing changed |
| API-05 | AC-003, AC-008, AC-009 (desktop Team) | Existing Test / Temporary Probe | desktop composer probes (`chat-composer-polish`, `chat-composer-menus-open-upward`); a working Team's stop from the desktop run tree (an existing probe case if one covers it, else a temporary one) |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None planned (the emulator journeys and the restart of a node are machine-specific). Added during execution: MSP-65 (a live Org member's Settings stop, F-1); updated: MSP-08 (Settings in the menu); baseline fix: MSP-50/51's copy shortcut. See the report's "Durable Coverage Changed".

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`; reroute required: `No`
