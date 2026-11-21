# API/E2E — immediate managed Ubuntu restart

**API-REV-001: Pass.** The signed app restarted without waiting for the working agent or recent keyboard input. The **same run** received a notice naming the new version, resumed and completed a further user turn. Intentional Quit stayed closed in both timing cases, with the expected version on disk.

## Round, routing and environments

First independent round, direct **Medium / Low**, IR-001 (product 2d26c0fb6a4a, clean implementation receipt edbbe874603a). SR-001/003 [requirements](requirements-doc.md), SR-002 [design](design-spec.md), [implementation handoff](implementation-handoff.md). The designer clarified AC-003 at ee3d156bf2 while the independent checks continued: no unverified install before admission; install and stay closed after admission. No intended-behavior change, risk waiver or product revision. See [plan](api-e2e-coverage-investigation.md), [progress](api-e2e-test-progress.md), [history](api-e2e-revision-record.md). Success route: Delivery Engineer; no independent QA test-code review required by direct-route policy.

- **R:** repository worktree and built server, Linux x64, Node 22.23.2, pnpm 10.28.2. Private test data/home, synthetic launch credentials, scripted inference, no live-provider gate.
- **G:** disposable Canonical Ubuntu 24.04.5 GNOME/X11 x64/KVM guest. Fresh test-user installation via real standard graphical consent and policy authorization. Full **1.5.18 → 1.5.19** branch packages: build-only disposable signing trust, bound loopback verification origin, normal protected writer/launcher, candidate downloaded from a loopback update feed. No runtime trust or sandbox bypass. Real packaged server, run, store, WebSocket and renderer. Test launch profile isolates data/updates. GUI UID's new non-loopback connections denied. [Package digests and verifications](evidence/API-02-packages.txt).
- **Evidence folder:** `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/managed-ubuntu-immediate-restart/tickets/in-progress/managed-ubuntu-immediate-restart/evidence/`. Guest snapshot restoration rewinds its clock: compare UTC times **within** each scenario.

## Executed cases

| Case | Criteria / surface | Steps, result, and what the evidence proves |
|---|---|---|
| API-01a — R | AC-001/003–006; Electron main, session, updater, row/About, native/disabled controls | **Pass:** 195 Electron and 46 renderer tests; 96 server restart/resume and architecture tests. Includes switch/channel/block/restart-channel eligibility, single admission, delayed-stop installing state, duplicate events, Quit and failures. Native-only guarantees tested at prescribed owner surfaces, not on a new Mac/Windows install. [Commands/results](evidence/API-01-results.txt). |
| API-01b — R | AC-002; two real built-server processes, native run and event stream | **Pass:** RR-04 stops a running turn with a background task, reads the update notice at model input after restart, sends a fresh follow-up to the original run, waits for completion and checks its specific assistant answer in the run projection. Built-server fixture uses a stamped previous release; it does not substitute for the guest. [RR-04 evidence](evidence/API-01-continued-turn.json). |
| API-02a — G | AC-001/005/007; signed package, actual working run, user input, immediate transition | **Pass:** N healthy with automatic updates enabled. Briefly held only the startup feed response while creating a real native run. Unreleased inference request plus the recorder's **running, v1.5.18** entry proved it was busy; no removed count endpoint. Sent a real mouse/key event to the focused application at 16:21:07 and released the feed. Verified stage published at 16:21:15.526; installing at 16:21:15.530, before inference disconnected at 16:21:16.334. **No install or restart click.** About actually rendered “Restarting to install the downloaded update.” [Old processes/recorder](evidence/API-02-before.log), [renderer transitions](evidence/API-02-states.jsonl), [About during stop](evidence/API-02-installing.png). |
| API-02b — G | AC-001/002/007; handback, run notice, subsequent turn | **Pass:** protected bytes changed to signed N+1; original main/server 10547/10656 replaced by 11220/11318. Exactly one successor server, sandboxed renderer, unchanged synthetic work hash. “Updated automatically to 1.5.19” visible. The local model **received** “reason: an update to v1.5.19” with interrupted-turn guidance; it answered. Opened the original run in the successor GUI and sent “QA16-FURTHER Continue the same run.” It displayed “QA16 further turn complete.” and Idle. No manual reopen, injected update stamp or forced shutdown. [Next processes/notification](evidence/API-02-after.log), [run ID](evidence/API-02-run.json), [model events](evidence/API-02-real-inference.jsonl), [notification](evidence/API-02-notification.png), [original turn, notice and continued conversation](evidence/API-02-continued.png). |
| API-03a — G | AC-003/007 before verification | **Pass:** restored N baseline, held N+1 signature response, waited for actual signature request, closed last application window with GNOME Alt+F4, allowed response. No server or app reopened; installed hash stayed **N**. Next manual launch actually checked again. [Quit chronology, feed requests and digests](evidence/API-03-quit.txt). |
| API-03b — G | AC-003/007 after admission | **Pass:** on that next launch, observed the verified-stage/installing event, sent actual OS Alt+F4 during restart. Installed hash **N+1**, no auto-reopen/second server; monitored closed state for 25 s and checked protected bytes and work. Same evidence as API-03a. The app was not required to install an unverified stage. |
| API-03c — G | AC-004/005; opt-out/enable with manual stage, copy | **Pass:** switched off before startup check completed. Signed update available but not staged; clicked **Download** and verified stage remained pending with automation off. Opened the real Chinese notification row, then turned the switch **on**: immediate installing and healthy N+1. Row displayed “正在重启以安装…”. The prior manual-download toast was created before the locale change; it is not the installing row. Actual switch copy in both locales, no earlier five-minute/idle wording. [Off, stage, rendered state and successor](evidence/API-03-manual-and-enable.txt), [Chinese row](evidence/API-03-row-zh.png), [English switch](evidence/API-02-switch-en.png), [Chinese switch](evidence/API-02-switch-zh.png). |

The host observation relay briefly needed reconnecting after guest snapshot restoration. No application failure was inferred from it; the successful guest checks use actual process/file, model, framebuffer and user-interface observations. No host desktop, real user state, production credentials, publication or rollout.

## Acceptance proof

| AC | Critical | Result / cases |
|---|---|---|
| 001 | Yes | Proven — API-01a + API-02a/b: active input and busy run, unattended verified update |
| 002 | Yes | Proven — API-01b + API-02b: delivered notice naming update and new version, same run completes another turn |
| 003 | Yes | Proven — API-01a + API-03a/b, both SR-003 boundaries |
| 004 | Yes | Proven — API-01a + API-03c; refusal/unknown/channel/block/click/no-channel covered by unchanged/directed owner cases, not destructive guest injection |
| 005 | Yes | Proven — API-01a + API-02a/03c: bilingual switch, actual English About and Chinese row during restart, capability-specific controls |
| 006 | Yes | Proven at the specified existing native/portable test surface — API-01a |
| 007 | Yes | Proven — API-02a/b + API-03a/b on complete signed branch packages |

## Confidence and broader-validation decision

Broader **project desktop, live API and lifecycle execution required and completed**: doubles cannot distinguish a real update notice from a plain restart or prove a healthy continuing application. Confidence measures the exercised scope, not cross-platform release readiness.

| Category | After repository | Final | Support / residual limit |
|---|---:|---:|---|
| Requirements / acceptance criteria | 76% | 97% | AC table, actual signed app |
| Changed-boundary directness | 84% | 98% | API-02/03 verified receipt, installing, actual stop/reopen vs Quit |
| Cross-boundary realism | 71% | 97% | Actual desktop/agent/server/writer; only model output scripted |
| Environment, configuration, identity and fixtures | 72% | 96% | GNOME/Noble and production-shaped packaging with disposable rather than public trust |
| Failure, lifecycle and recovery | 84% | 95% | Independent Quit timings and continued turn; rare writer failure outcomes deterministic rather than guest fault injection |
| User surface, browser and desktop | 74% | 96% | Real en/zh surfaces, GNOME input, notification and same-run user reply |
| Durable regression relevance | 94% | 96% | Built-server RR-04 now checks a specific persisted reply after the update |
| **Overall** | **79%** | **96%** | Clean scoped gate met. No material missing evidence or accepted-unverified criterion. |

**Durable coverage:** updated only `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts`; a scoped continuation assertion, no product changes. Reproduce after server build with isolated HOME and `RUN_RESTART_REMINDER_E2E=1 node_modules/.bin/vitest run tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts -t 'RR-04:'` in the server package. Other scenarios remain selected by their usual gates.

**Data / compatibility / cleanup:** no persisted shape changes or legacy compatibility paths. Existing workspace and interrupted conversation were used directly by N+1. Model and update feed were local substitutes for external services; actual signatures, activation and release stamps were not mocked. Temporary build clone, generated SDK dist, VM/container, snapshots, signing and guest credentials and local server state removed after evidence capture. No merge, push, deployment or release. **Pass → Delivery Engineer** (direct route).
