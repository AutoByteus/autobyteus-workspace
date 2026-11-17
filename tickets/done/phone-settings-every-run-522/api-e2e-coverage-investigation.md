# API/E2E Coverage Investigation — phone-settings-every-run-522 (autobyteus-522): phone Settings for every run

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001; REQ-001…006, AC-001…007, BEH-001…006, DEC-001…004)
- Behavior-defining supplement: the 506/458 phone specification (UIS-003), `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-conversation-readability-506/ui-ux-spec.md`
- Design Spec: `design-spec.md`; Investigation Notes: `investigation-notes.md` (R1, R2, U-002); Solution Revision Record: `solution-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001; direct route, Small / Low)
- Code Review: N/A (direct route)
- API/E2E Revision Record: `api-e2e-revision-record.md`; current revision `API-REV-001`; round 1
- Trigger: Implementation Engineer IR-001; code `ce61209db1` + `4e9d7c4067` (a spec move), documents `d0ad333141`; base `origin/personal` @ `3722dbb1d8` (13 commits behind `origin/personal` @ `ff13782f36` at the start: autobyteus-515 and a TESTING.md note; delivery integrates)
- Note: the Solution Designer's documents are untracked in the worktree (not API/E2E's; left as they are)

## Current Requirement And Design Basis

Phone shell only. Settings is decided by the run that holds the opened agent (`target.browse`): `run` → the agent run; `teamMember` → that member's address in its Team run (standalone Team or task team); `agentOrgMember` → its address in the Org run; `peerRun` → `remote`. Every run's ⋮ menu has Settings after Activity. A run on another node shows its name, status line and "This run is on {node}. Its runtime and model can be changed only on that node." with no rows, Save or stop. The stop stops the run that holds the agent (never its delegator). BEH-005 fixed (a Team member's task agent saves its own settings). No server, store or stop-action change.

## Supported Scenarios And Real Usage

- From the requirements: SCN-001…006.
- Real-use scenarios added:
  - RU-01: the founder's case in the Android app: a PTM's task team member, live → stop → change → Save → a message continues it.
  - RU-02: a task team delegated by a standalone Team's member (the design's table row; the handoff's hint): its member's Settings change that member in the task team run only, and its stop stops the task team, not the Team.
  - RU-03: a peer run's Settings opened, then the phone reloads on it (the screen restores before the run tree's peer row arrives): the sentence must not show an empty node name once loaded (R-001; the handoff's hint).
- Technically possible but unsupported: none recorded.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Repository Evidence | Material Risk Not Exercised | Candidate Broader Validation |
| --- | --- | --- | --- | --- |
| Phone UI (menu, Settings, remote sentence) | Yes | specs; MSP-67…72 (Chrome) | the Android WebView; a reload on a peer run's Settings; a Team member's task team | emulator; temporary probe |
| Phone → node (reads, stop, stopped-run updates on delegated runs) | Yes (new callers of existing calls) | MSP-67…71 | — | full probe |
| Desktop | No (no shared file changed) | — | — | the probe's desktop-window cases |
| Server, Android shell | No | — | — | — |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-settings-every-run-522`, branch `codex/phone-settings-every-run-522`
- Testing guideline: `TESTING.md` (browser probes, Android emulators: own AVD and port, headless, deleted afterwards; one heavy run at a time; clean env). `origin/personal` adds a note on file watching with a busy `fseventsd` (`327566836a`), relevant to MSP-41.
- Changed build-input paths: `None` → no fresh-start case
- Secrets: none (scripted runtimes only)

| Component | Start / Setup | Stop |
| --- | --- | --- |
| Phone bundle; server `dist` (no server change); debug APK of this branch | `build:mobile-web`; `assembleDebug` | — |
| Host node with scripted AGY and Grok Build, a PTM-like agent, Delivery Team, Org | 458's `node-458.mjs` adapted (`scripts/node-522.mjs`) | `/tmp/abtest522/stop` |
| Emulator | own AVD (android-35), port 5640, `adb root` | killed, AVD deleted |

## Existing Durable Coverage Inventory

| Path / Test | Decision | Action |
| --- | --- | --- |
| the 522 specs (`mobileRunSettingsScope`, `MobileRunSettings`, `MobileRunMenu`, `MobileRunScreen`, Text size) | Still Valid | Reuse (IMP-522-*) |
| MSP-67…72 (`mobile-every-run-settings-cases.mjs`) | Still Valid | Reuse; rerun in the full probe |
| MSP-60…66 (458) | Still Valid (AC-007) | full probe |
| the other MSP cases | Still Valid | full probe |

## Planned Cases

| Case ID | Criteria | Kind | Planned Steps |
| --- | --- | --- | --- |
| R-IMP | AC-001…007 unit and Chrome parts | Reused | IMP-522-* (on `ce61209db1`; `4e9d7c4067` only moves specs) |
| API-01 | AC-001…007 | Existing Test | the full `test:e2e:mobile-shell` (clean env) on a rebuilt bundle |
| API-02 | AC-001 (RU-01) | Temporary Probe | emulator, the branch's APK, a host node: a PTM-like agent delegates the Delivery Team (`CALL_TOOL` `delegate_task`), its lead held live; in the app: the PTM row → the task team → the lead → ⋮ → Settings → stop icon → one tap (the task team stops, the delegator stays as it was) → Grok Build / Grok 4.7 → Save → reopen → a message from the app continues the lead |
| API-03 | REQ-002, 003 (RU-02) | Temporary Probe | the same app and node: a standalone Team's lead delegates the Delivery Team; in the app, the task team's member under the Team's tree → Settings (its own values) → live: stop stops the task team, not the Team; stopped: Save changes that member only |
| API-04 | REQ-004, R-001 (RU-03) | Temporary Probe | phone bundle in Chrome on the probe's stack (alpha + beta): MSP-72's peer run → Settings → reload → the sentence's node name, as soon as the screen shows and once loaded |
| API-05 | AC-007 | Existing Test | the probe's desktop-window cases in API-01; the diff touches no shared file |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None planned (the emulator journeys are machine-specific). API-04 is decided after its result.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`; reroute required: `No`
