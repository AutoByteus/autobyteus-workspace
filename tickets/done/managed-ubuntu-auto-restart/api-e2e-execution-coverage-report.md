# Independent API/E2E — managed Ubuntu automatic restart

**API-REV-001: Pass.** On a disposable Ubuntu 24.04.5 GNOME desktop, signed N (1.5.16) kept running with a signed N+1 (1.5.17) staged while an actual agent was busy. After real input in a secondary window and completion of the turn, it reopened unaided on N+1. Closing the last window in a separate run did **not** reopen it. No production signer, feed, host installation or real work was used.

## Round and routing

First independent round following CRR-002: SR-001 / SR-004, ARCH-REV-002, IR-002. Reviewed **Medium / High**. Next: Code Reviewer, proportional review of the durable QA delta (not delivery). See [investigation](api-e2e-coverage-investigation.md), [run progress](api-e2e-test-progress.md), [history](api-e2e-revision-record.md). Evidence directory: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/managed-ubuntu-auto-restart/tickets/in-progress/managed-ubuntu-auto-restart/evidence/`. FU-001 is outside this ticket.

- **R — repository:** f369d87e013b product at review HEAD 23ce81353b, Linux x64, Node 22.23.2; isolated server launch owner, temporary DB/workspace, loopback inference. The new case runs the built dist, not a mocked status provider.
- **G — desktop:** disposable KVM Ubuntu 24.04.5 amd64 GNOME 46/X11. Normal UID 1000, GNOME policy prompt, unchanged AppArmor userns restriction and sandbox. Protected per-user installation (not a Nuxt dev server); separate test data and loopback update feed. Both signed packages built from the reviewed source with only the two test versions and supported build-time origin/test trust. [Build identities](evidence/API-02-packages.txt). OS time rolls back on snapshot restoration; compare times **within** a case, not across independent restored branches.
- **Dependencies:** scripted LM Studio-compatible endpoint substitutes only inference; actual agent definition, turn, model transport, database, counts, shutdown, writer, supervisor and successor are real in G. It had no tools or real provider keys. Writer/IPC failure injection and other-platform policies remain bounded repository controls by design. No production signing/publication is needed to prove this behavior.

## Cases and results

| Case | Criteria | Actual execution / result | Evidence |
|---|---|---|---|
| API-01a, R | AC-001–010 | Pass: 17 Electron suites / 200 tests; four renderer/store suites / 71 tests. Includes native/disabled policy, re-checks, cancellation, ordinary quit, unknown/refused activation, fixed blocked-version copy even when a manual failure masks the automatic one. Reused IMP-12 only for controlled en/zh blocked-vs-eligible rendering at identical product source, **not** guest proof. | [Commands and counts](evidence/API-01-runs.txt), [controlled bilingual inspection](evidence/IR-002-checks.txt) |
| API-01b, R | AC-002 | Pass: production server executable, GraphQL + WS real native turn held at an inference barrier; authenticated aggregate 0→1→0 busy, unknown 0. Fresh launch probe returned 200 with synthetic launch owner and 401 without it. Nine busy-count and seven recorder cases passed. Initial missing SDK dist, overlapping SQLite reset and one recorder timing miss are documented separately, not reported as product failures. | [Runs](evidence/API-01-runs.txt), [auth](evidence/API-01-auth.log) |
| API-01c, R | AC-007/009 | Pass: existing Go native suites (`go test -count=1 ./...`, Linux x64, Go 1.27.4) including acquisition, signature, writer and supervisor; no native policy diff from reviewed prior implementation. No real OS root change in host tests. | [Native packages](evidence/API-01-native.log) |
| API-02a, G | AC-003 | Pass: compiled UserInputActivity on two actual Electron 42.11.16 BrowserWindows. OS key and mouse moves in **each** window advanced the sampled activity timestamp. This isolated seam does not stand in for the installed-app journey. | [Event trace](evidence/API-02-input.log) |
| API-02b, G | AC-001–003/011 | Pass: N enrolled via graphical consent/auth; enabled saved preference, real startup check, fully verified stage while real agent busy=1. Two real app windows. N remained staged at 11:03:25 and 11:09:16 UTC, with the same GUI and server PIDs; no interaction for more than five minutes. Brief host CDP-relay gap did not affect those guest processes. | [Enrollment](evidence/API-02-enrolled.log), [counts](evidence/API-02-safe-gates.json), [busy watch](evidence/API-02-busy-watch.log) |
| API-03a, G | AC-001–003/008/011 | Pass: focused QA15 secondary node window, sent OS pointer movement and Shift at 11:09:30, released inference; idle confirmed by 11:09:51. N still staged at 11:14:20. Automatic outcome recorded 11:14:34, 304 seconds after input. **No install or launch action.** Prior main 12815/server 12928 gone; same supervisor handed off to main 14117/server 14163. Exactly one successor server, healthy, renderer seccomp=2/no-new-privs=1, canonical installed SHA=N+1. Same workspace hash and saved conversation. Visible app with “1 updated,” then opened the notification center to read “Updated automatically to 1.5.17.” | [Quiet watch](evidence/API-03-quiet-watch.log), [PIDs, protected bytes, work, outcome](evidence/API-03-lifecycle.txt), [untouched successor](evidence/API-03-auto-desktop.png), [notification](evidence/API-03-auto-notification.png) |
| API-03b, G | AC-004/008/011 | Pass: separate N snapshot, one window, staged signed release, Alt+F4 (Linux last-window quit). Protected image changed to N+1. No GUI, supervisor or embedded server on exit or during independent 70 s observation. Only then launched by hand: N+1 healthy with automatic success notice. Verified actual waiting About copy in English and Chinese. | [Quit chronology](evidence/API-03-quit.txt), [manual launch notification](evidence/API-03-quit-next-launch.png), [English](evidence/API-02-ready-en.png), [简体中文](evidence/API-03-ready-zh.png) |
| API-03c, G | AC-005/007/009 | Pass: truncated **served copy** while retaining original manifest; then good asset with mismatched disposable signature. Both refused, neither staged/restarted; N stayed healthy, no automatic success. On verification failure, notification reason: “The downloaded release could not be verified.” Restored genuine signed feed; next Settings check staged successfully. Switched automatic off during wait: verified stage invalidated, manual Download Update enabled. Manual redownload and explicit restart ran N+1, one server, unchanged synthetic work. | [States, hashes and PIDs](evidence/API-03-refusal-retry.txt), [truncated](evidence/API-03-truncated.png), [verification](evidence/API-03-verification-refused.png), [manual ready](evidence/API-03-manual-ready.png), [successor](evidence/API-03-manual-successor.png) |
| API-03d, G | AC-006/008 | Pass: independent signed-pair snapshot, automatic **on**, stage waiting. Opened “1 update,” clicked **Install and restart** on the notification row well before quiet timeout. N+1 became healthy with one server and preserved work. | [Ready row](evidence/API-03-waiting-row.png), [explicit restart](evidence/API-03-explicit-restart.txt) |

**Observation limits:** The supervisor deliberately did not forward the optional CDP argument to the automatically reopened GUI. A lost CDP connection is not failure or success evidence. We switched to the guest framebuffer, actual window, process identities, server health, protected image and saved notification. A minimal guest initially lacked CJK glyphs; installed the Ubuntu CJK font and captured the real readable Chinese UI in a fresh process. No product change. Enrollment used a normal guest profile; private data/feed used the project's supported isolated launch profile. No host desktop used.

## Acceptance proof

| AC | Critical | Result / proof |
|---|---|---|
| 001 | Yes | Proven — API-02b/03a, signed startup-to-success journey |
| 002 | Yes | Proven — API-01a/b, 02b/03a; real busy turn held beyond the quiet period |
| 003 | Yes | Proven — API-02a and 03a; two-window physical input, genuine timed deferral |
| 004 | Yes | Proven — API-03b (intentional close), 01a (concurrent quit intent) |
| 005 | Yes | Proven — API-03c plus 01a for channel change/in-flight cancellation |
| 006 | Yes | Proven — API-03d; 03c for manual control |
| 007 | Yes | Proven — API-03c and 01a: guest download/signature refusal and retry; deterministic writer cases for confirmed-old/unknown/no-channel, without forcing real ambiguous disk commits |
| 008 | Yes | Proven — API-01a/03a–d. Actual eligible and success surfaces, bilingual switch/About, controlled capability and masked-block rows |
| 009 | Yes | Proven — API-01c/03a/03c: integrity, policy and sandbox; older/wrong-channel paths at writer layer |
| 010 | Yes | Proven at specified surface — API-01a unchanged platform-policy suites, not a Mac/Windows machine or release claim |
| 011 | Yes | Proven — API-02b/03a/03b executed on approved signed pair in isolated GNOME |

## Confidence and broader validation

Broader validation **required and executed**: project desktop / live API / lifecycle. Source-level clocks, components and writer doubles alone cannot prove real app input, busy service wiring, autonomous handback or user-visible results. The scores below are engineering judgment, not line coverage or probabilities.

| Category | Post-repository | Final | Evidence / remaining limit |
|---|---:|---:|---|
| Requirements/criteria | 75% | 97% | All AC above; no claim for rollout outside scope |
| Changed-boundary directness | 82% | 97% | API-02/03 real input, HTTP, writer and GUI/server transitions |
| Cross-boundary realism | 72% | 96% | Actual installed lifecycle; only inference output scripted |
| Environment/config/identity/fixture | 70% | 96% | Ubuntu 24.04 x64 GNOME and ordinary user; test signing/feed rather than production |
| Failure/edge/lifecycle/recovery | 82% | 94% | Real refusals + recovery/quit; ambiguous outcomes deliberately covered with deterministic writer controls |
| User surface/browser/desktop | 72% | 96% | OS-level GNOME, screenshots, English and Chinese; injected masked-block cases remain component-level |
| Durable regression quality | 92% | 96% | Reusable authenticated built-server busy→idle case plus owner suites; packaged guest remains opt-in evidence |
| **Overall** | **78%** | **96%** | Clean scoped target met; no unproven critical criterion |

No evidence waiver/decision, material unsafe dependency, unresolved failure or user-only criterion. No persisted schema transition; direct reuse of existing settings, workspace and conversation. No compatibility-only design or tests. Unchanged non-Linux contracts are control cases, not new supported behavior.

## Durable change, cleanup and handoff

**Updated test file only:** `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` — deferrable scripted inference in the existing gated server test; assert the real authenticated REST count before/during/after the native turn. No product source, CI, workflow or policy change; no removal. Re-run in prepared server worktree: `RUN_RESTART_REMINDER_E2E=1 pnpm exec vitest run tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts -t 'reports a native turn'`, isolated HOME and no live-provider gates. Type-shape refinement (standard Promise gate) independently rerun. Shared test DB resets must be serialized.

All VM, build clone, loopback servers/relay, disposable SSH/signing trust, signed packages, snapshots, and generated untracked SDK dist directories were QA-owned and removed after capturing the evidence. Only scoped evidence/test and ticket records retained. No target push, merge, production provisioning, publication or release. **Pass → Code Reviewer** for proportional QA test review.
