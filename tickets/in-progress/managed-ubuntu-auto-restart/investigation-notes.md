# Investigation Notes — managed Ubuntu automatic install and restart (autobyteus-15)

## Investigation Meta

- Package identifier: `managed-ubuntu-auto-restart` (Project Task autobyteus-15)
- Request / ticket: autobyteus-15 "Install and restart automatically for opted-in Ubuntu desktop updates", Project `project_de48ed0e-f4a2-43d7-b22a-4c162c9b1dda`
- Workspace root: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/managed-ubuntu-auto-restart`
- Repository mode: `Git`
- Task worktree / branch: the path above, branch `feature/managed-ubuntu-auto-restart` (no upstream yet)
- Resolved base remote / branch / revision: `origin/personal` at `7591aa307fac13c7ca8d2bdf8059054e22cf597a` (fetched 2026-11-21; includes the v1.5.14-beta.5 release record)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from refreshed `origin/personal`; ticket folder `tickets/in-progress/managed-ubuntu-auto-restart/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read (requirements reading gate; 2026-11-21): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; repository `AGENTS.md`
- Investigation status: requirements-phase investigation complete; architecture investigation to extend these notes

## Initial Request And Clarifications

- Original request (Task description): choosing **Update automatically** is consent to download, install and reopen the updated managed Ubuntu desktop without clicking Install and restart or quitting first. Today beta.3 offers beta.4 as "ready for next quit". Deliver that unattended behavior when safe without interrupting active work; do not reopen after an intentional user Quit, change opt-out behavior, or weaken signing and sandbox checks. Align notification copy with behavior. Solution Designer determines safe timing and failure handling. Verify a signed update with old and new app versions on managed Ubuntu, including deferral during work and the following no-click relaunch. Merge, verify, clean up; no release, no change to the user's installation.
- Clarification (user comment on the Task, 2026-11-21): "make the behavior consistent. Use existing Mac automatic install/restart as the user-facing reference; change managed Ubuntu rather than removing Mac functionality. Verify no second click is needed after deferral, and that an intentional Quit still stays closed."
- User-supplied facts and constraints: Mac keeps its behavior; deferral during work is expected; Quit stays closed; signing and sandbox checks unchanged; no release.
- Initial ambiguity: what "active work" is and how long to wait (delegated to the Solution Designer); how this differs from Mac, which restarts at once (see F-03, DEC-005).

## Product And Domain Understanding

- Product area: Electron desktop app updates, the protected ("managed") Ubuntu installation from autobyteus-5.
- Affected actors: the desktop user with Update automatically on; the agents running in the embedded server.
- Existing purpose: keep the app current without passwords, with signed, verified, strictly newer releases.
- Terminology: *managed install* = `/opt/autobyteus-desktop/<uid>/app/AutoByteus.AppImage`, updated by the nonroot writer; *stage* = verified downloaded release waiting for activation; *restart channel* = FD 4 socket to the original launcher, which reopens the fixed AppImage after the app exits with status 76; *busy run* = an agent run mid-turn (initializing/running) or idle with a running background task (autobyteus-285/448 definition).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-21 | User | `get_project_task autobyteus-15` | Direction | Description and comment above | — |
| 2026-11-21 | Code | `autobyteus-web/electron/updater/appUpdater.ts` (555 lines) | Update owner | `activationMode` is `managed-quit` with a managed session; `update-downloaded` hands the file to the session; `ready` event → status `downloaded`, message "Ready for your next quit."; `installUpdateAndRestart` calls `managedSession.requestRestart()` | File already over 500 lines (design must not grow it) |
| 2026-11-21 | Code | `electron/updater/appUpdateAutomaticPolicy.ts` | Automatic policy | `installWhenReady` and `downloaded` return early for `managed-quit`: managed mode never installs automatically while running | F-01 |
| 2026-11-21 | Code | `electron/application/managedUpdateSession.ts` | Managed quit/restart owner | `willQuit`: activates the stage at an ordinary quit only when the switch is on, then quits (no reopen). `requestRestart`: stops the server, activates, writes the reopen indication, exits 76; manual only (`automatic=false`) | F-02 |
| 2026-11-21 | Code | `electron/launch-profile/managedRestartChannel.ts` | Reopen mechanism | Restart channel exists only when launched by the original launcher (FD 4 socket with matching inode); else `requestReopen` is null and restart is "unavailable" | F-06 |
| 2026-11-21 | Doc | `tickets/done/ubuntu-appimage-sandbox-startup/design-spec.md` DS-002 | Why quit-only | "Conservative rule ... activate only as part of an independently requested normal quit ... No new end-user clicks or active-work tracking" — a design choice of autobyteus-5, not a user decision | F-04 |
| 2026-11-21 | Doc | `tickets/done/automatic-app-node-updates/requirements-doc.md` (autobyteus-356) REQ-002/004/005, AC-002/003/005, DEC-001 | Mac reference | Mac/native: installs and restarts as soon as the download is done, also on a busy machine; busy agents resume after (285); failures: "Automatic update failed. Nothing was changed.", failed install not retried for that version; outcome "Updated automatically to <version>" | F-03 |
| 2026-11-21 | Code | `autobyteus-server-ts/src/restart-resume/busy-run-recorder.ts` | Busy definition | Busy = status initializing/running, or idle with running background tasks; recorder covers collaboration-root runs, not application-owned runs | F-05 |
| 2026-11-21 | Code | `autobyteus-server-ts/src/compositions/agent-runtime-status-composition.ts` | Product precedent for "no agent running" | Runtime auto-update waits "once no agent is running"; counts every live run (idle loaded runs included) plus application runs | F-07 |
| 2026-11-21 | Code | `autobyteus-web/localization/messages/{en,zh-CN}/updateNotifications.ts`; `components/notifications/NotificationRow.vue:41,98,160`; `components/settings/AboutSettingsManager.vue:257`; `components/notifications/AutoUpdateSwitch.vue:91` | Copy | Managed copy promises "install when you next quit ... will not close or reopen by itself"; the downloaded row keeps the Install and restart button | F-08 |
| 2026-11-21 | Code | `grep localStorage` over web stores/composables/components | Draft safety | No composer draft persistence found: a restart while the user is typing loses the unsent text | F-09 |
| 2026-11-21 | Contract | Electron 42 typings (`node_modules/.pnpm/electron@42.4.1/.../electron.d.ts:17011`) | Input activity signal | `webContents.on('input-event')` exists (in-app keyboard/mouse input, independent of the compositor); `powerMonitor.getSystemIdleTime()` also exists but depends on X11 idle reporting | ASM-001 |
| 2026-11-21 | Doc | `autobyteus-web/docs/linux-managed-desktop.md` "Files and updates" | User doc | Documents quit-only automatic activation; must be updated | Docs sync |
| 2026-11-21 | Doc | `tickets/done/ubuntu-appimage-sandbox-startup/api-e2e-execution-coverage-report.md` API-05* | Verification feasibility | Real Ubuntu 24.04.5 guest, two genuine signed higher-version builds, disposable trust, loopback feed, menu launch and restart evidence were achieved before | Verification Intent |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Check finds a newer release, managed install, switch on | Download → writer verifies and stages → "Ready for your next quit." | Never stops or reopens the app by itself | F-01, F-02 | High (Read) |
| BEH-002 | User | Ordinary Quit with a verified stage, switch on | Server stops once, writer activates, app stays closed; next launch runs the new version, "Updated automatically to X" | Quit stays closed | F-02; autobyteus-5 API-05f | High (Read; verified in autobyteus-5) |
| BEH-003 | User | Click Install and restart | Server stops, writer activates, launcher reopens new version; confirmed-old failure reopens old version | Manual consent | F-02, F-06 | High |
| BEH-004 | User | Switch off or channel change | Pending stage discarded; manual Download/Install offered | Opt-out | `managedUpdateSession.settingsChanged` | High |
| BEH-005 | System | Mac/portable, switch on | Installs and restarts as soon as the download is done | No deferral | F-03 | High |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `managedUpdateSession.ts` | Sole managed quit/restart owner; generation, stage, intent | Automatic restart must reuse its restart path and its re-checks before dispatch (switch, channel, block) | How an automatic restart enters `finish` with `automatic=true` reporting and a reopen; how a Quit during an automatic restart turns it into quit |
| `appUpdateAutomaticPolicy.ts` | When automatic installs happen (native) | Managed mode needs a "when safe" trigger instead of "at once" | Where the safe-timing gate lives (new owner vs policy) |
| `appUpdater.ts` (555 lines) | State, events, IPC | Must not grow | Put new logic in its own file |
| Embedded server restart-resume (`busy-run-recorder.ts`) | Busy-run definition, live record | Defines "agent working" | How Electron main learns busy state (API vs record file) |
| `electronApplication.ts` (500 lines) | Composition | At the size limit | Wiring must stay minimal |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces
- Localization catalogs `en` and `zh-CN` (`updateNotifications.ts`, About messages); `docs/linux-managed-desktop.md`, `docs/settings.md`.
### Structural Surfaces
- Electron main updater/session lifecycle; embedded server (read-only busy-state signal); renderer copy.
- Existing surfaces that support the behavior: restart channel and writer activation (autobyteus-5), notification record outcomes (automatic install, automatic failure, block), busy-run definition (285/448).
### Potential Structural Impacts To Investigate
- API: possibly a read-only busy-state query from Electron main to the embedded server (architecture).
- Persistence: none expected (notification record already stores automatic outcomes and blocks).
- Security: writer, signing, AppArmor, sandbox unchanged; no new privilege; the restart channel stays launcher-owned.
- Concurrency/lifecycle: new automatic trigger racing with Quit, switch-off, channel change, a new download, a click.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Established | Requirement Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| Code reading | Managed auto on, stage ready | Policy returns early for `managed-quit`; only `willQuit` activates | Read | Root cause of "ready for next quit": deliberate design rule DS-002 of autobyteus-5 | F-01, F-04 |

- Temporary diagnostics: None.
- Reproduction for implementation to start from: None yet; the current behavior is by design (owner tests in `electron/application/__tests__` and `electron/updater/__tests__` assert it and must be rewritten to the approved behavior).

## Stakeholder And User Evidence

| Source | Need | Strength | Implication | Open Question |
| --- | --- | --- | --- | --- |
| User, Task comment 2026-11-21 | No second click after deferral; Quit stays closed; Mac as reference; keep Mac | Explicit | REQ-001..REQ-006 | Mac timing difference (DEC-005, FU-001) |

## External Contracts, Standards, And Dependencies

| Contract | Version | Relevant Behavior | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Electron | 42.x | `webContents` `input-event`; `app.exit(76)` handback | typings | Whether every kind of window/view the app opens is covered (ASM-001) |
| Original launcher restart channel (autobyteus-5) | current | Reopens after `R` + exit 76 | `managedRestartChannel.ts` | Unavailable when not launched by the launcher (F-06) |
| Nonroot writer | current | Signed, strictly newer, channel-matched activation | `linuxManagedInstall.ts` | Unchanged |

## Persisted Data And State Facts

- Affected: the existing update notification record (automatic install / failure / block) — no new data; user profile, server data, settings unchanged.
- Acceptable loss: none beyond today's restart (an unsent composer draft is the reason for the quiet period).

## Product Design Request Context

- Product Design request in the current input: `Not stated`. Copy changes are decided in the requirements (DEC-006).

## Product Design Findings

N/A — no Product Design request.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | In-app keyboard and mouse input (all app windows and embedded views) is observable from Electron main on Ubuntu Wayland and X11 | Quiet-period signal (REQ-002) | Architecture verifies; validation on Ubuntu Wayland | Open |
| UNK-001 | Unknown | How Electron main reads the embedded server's busy state | REQ-002 | Architecture: `GET /rest/busy-runs` (A-F03..A-F06) | Resolved |
| RSK-001 | Risk | Long-running agent work can defer the update for a long time | Update may wait until the next quit | Accepted by DEC-002 (no forced restart) | Accepted |
| RSK-002 | Risk | Mac restarts immediately, Ubuntu waits: a platform difference in timing | User asked for consistency | DEC-005; FU-001 | Recorded |

## Findings Index (requirements phase)

F-01 policy excludes managed mode; F-02 session quit/restart paths; F-03 Mac reference (autobyteus-356); F-04 DS-002 conservative rule of autobyteus-5; F-05 busy definition in the recorder; F-06 restart channel; F-07 runtime-update "no agent running" precedent; F-08 managed copy; F-09 no composer draft persistence. Each maps to the Source Log row naming it.

## Architecture Investigation Findings

Authorities read for this phase (2026-11-21): `references/architecture-design.md`, `references/design-principles.md`, `references/design-examples.md`, repository `DESIGN.md`, `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/docs/design/node_access_model.md`, `GLOSSARY.md`.

| ID | Source | Observation | Established | Design implication |
| --- | --- | --- | --- | --- |
| A-F01 | `electron/application/managedUpdateSession.ts:85-148` | `finish(stage, generation, automatic)`: `automatic` decides stop-failure tolerance (`:99`), the switch/block re-check (`:106`), the record kind (`:107,118,145`), quit vs reopen (`:127-137`) and exit 1 on unknown outcome (`:148`). True exactly for the quit path today. `willQuit` ignores a Quit while `intent === 'restart'` (`:85-86`) | Read | Split into consent and ending; Quit during restart ends closed |
| A-F02 | `electron/application/electronApplication.ts` (500 lines), `:89-97` | Managed session constructed in the root's constructor; the root is at the size limit | Read (`wc -l`) | Move managed composition to its own file |
| A-F03 | `electron/application/electronApplication.ts:424-428`; `electron/nodeAccess/nodeConnectService.ts:57-63` | Main holds the launch credential of its own node and attaches it by base URL | Read | Main can query its own node |
| A-F04 | `autobyteus-server-ts/src/api/rest/index.ts:30-70`; `compositions/build-studio-server.ts:366-410` | REST routes registered with explicit dependencies from the studio composition; runtime status already composes process + application run counts | Read | New route with a composed count dependency |
| A-F05 | `application-platform/execution/application-execution-scope-kernel-builder.ts:223`; `application-execution-scope.ts:125-131`; `runtime/application-platform-runtime-contracts.ts:72`; `runtime/build-application-platform-runtime.ts:312-314` | Application runs live in the scope's own `AgentRunManager`; contract exposes only `countByRuntimeKind` | Read | Add `countBusy` to the contract |
| A-F06 | `autobyteus-server-ts/docs/design/node_access_model.md` NA-1, NA-2, NA-6 | New endpoints are credentialed and open to owners and phones unless a permission row restricts them | Read | No permission row needed |
| A-F07 | Electron 42 typings `node_modules/.pnpm/electron@42.4.1/node_modules/electron/electron.d.ts:17007-17016`, `InputEvent.type` union | `webContents` `input-event` reports mouse, keyboard, wheel, touch and pointer events | Read (contract) | Input activity source; ASM-001 to observe on Wayland in the guest |
| A-F08 | `GLOSSARY.md:476-477` | "Busy run" defined only for the restart record | Read | Generalize the entry; add "Safe restart moment" |

Unknowns resolved: UNK-001 → read-only `GET /rest/busy-runs` with the launch credential (design DS-002). ASM-001 remains for validation.

## Requirement Implications

- The change is a policy change on a deliberately conservative path (F-04), not a bug fix; the safety machinery (writer, re-checks before dispatch, restart channel, confirmed-old recovery) already exists and must be reused unchanged.
- "Without interrupting active work" needs two signals because a restart loses both in-flight agent turns (resumed only by the 285 reminder) and unsent typing (F-09).
- Copy currently promises the opposite of the new behavior (F-08) and must change with it.

## Notes For Architecture Design

- Map SCN-001..SCN-006 onto `ManagedUpdateSession` and the automatic policy; keep `appUpdater.ts` from growing.
- Verify ASM-001 and decide UNK-001.
- Existing owner tests assert quit-only managed behavior; they are rewritten, not kept.
