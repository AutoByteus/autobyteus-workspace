# API/E2E Coverage Investigation — S3: Node desktop on the phone and in a desktop browser (autobyteus-407)

The plan. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone/tickets/in-progress/node-desktop-on-phone/requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `.../investigation-notes.md` (S3-01…S3-12)
- Solution Revision Record: `.../solution-revision-record.md` (SR-001, SR-002)
- Design Spec: `.../design-spec.md` (SR-002; Large / High)
- Supplemental Task Artifacts: `pre-001-delivery-receipt-verification.md` (PRE-001, autobyteus-415 delivered)
- Design Review Report: `.../design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Implementation Handoff: `.../implementation-handoff.md` (IR-002)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `.../code-review-report.md` (CRR-002, Pass, 9.5/10)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code_reviewer, CRR-002 Pass (2026-11-06)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

Code under test: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone`, branch `codex/node-desktop-on-phone`, reviewed at `165de82af4` (source `0baf15a981`; `git diff --name-only 0baf15a981 165de82af4` outside `tickets/` is empty), base `origin/personal` @ `e427a0c9cf`.

## Current Requirement And Design Basis

The `/mobile` shell (Android app and desktop browser) gets a **VNC Viewer** entry in a run's ⋮ menu. It appears only when the paired node has a node desktop and the run is on it. It opens a full-screen view: View only and fitted first, zoom/pan/Fit in View only, Control through a deliberate switch, a Keyboard bridge in Control, an in-page full screen with a handle in Control, and Back leaving full screen first. The stream ends when the page is hidden and reconnects in View only.

The node allows at most 4 streams, at most 2 per paired phone; a further one gets 4429 `NODE_DESKTOP_TOO_MANY_VIEWERS` before any upstream connection, and both clients show "Too many viewers" with Retry. An open phone stream is re-checked every 20 s (5 s timeout) and closed with the shared policy's code when the phone is revoked or Phone Access is off (≤ 30 s). CR-001: an availability error is not cached.

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-004 (Android phone), SCN-005 (desktop browser), SCN-006 (limits), SCN-007 (Control deliberately), SCN-009 (background, revoke, disable).
- Added from the implemented behavior, with real triggers:
  - **SCN-006a — one device, several tabs.** One paired browser opens the view in three tabs; the tabs share one device credential, so the third is "too many". Several real viewers fill the node to 4, and the fifth viewer (the phone or the desktop app) is refused. Retry succeeds once a viewer leaves.
  - **SCN-009a — Phone Access switched off by the owner while the phone streams.** The owner uses the settings route; the phone's open stream ends within 30 s.
  - **SCN-004a — the node is unreachable when the user opens a run, then comes back (CR-001).** The ⋮ entry appears on the next run screen without restarting the app.
  - **SCN-004b — Gboard with suggestions and auto-correction.** A word that the keyboard corrects or completes reaches the desktop as the corrected word, once.
  - **SCN-004c — Control after zooming in View only.** Taps land at the intended desktop point.
- Contrived / unsupported: none.

## Changed Behavior Summary

| Behavior | Change | Coverage consequence |
| --- | --- | --- |
| BEH-003 phone view (REQ-014, 015, S3-1, S3-3) | Added | emulator rerun (AC-017), browser rerun (AC-018) |
| REQ-S3-2 keyboard bridge | Added | emulator: Gboard with suggestions / correction; another IME if one is installed |
| REQ-016 background | Added | emulator rerun (AC-019) |
| BEH-008 live revocation / Phone Access off (REQ-009) | Added | emulator: revoke rerun + Phone Access off (new) |
| BEH-S3-1 limits (REQ-019) | Added | rendered in a browser (3 tabs, 5th node-wide) and in the desktop app tile |
| BEH-S3-2 entry rule (REQ-S3-4) + CR-001 | Added / fixed | specs (reused); CR-001 path on the emulator through a proxy outage |
| Desktop app tile (S1) | Preserved, + "too many viewers" + Retry, policy moved to `useNodeDesktopConnection` | isolated desktop instance |

## Changed Surface And Boundary Classification

| Surface | Affected | Repository evidence | Not exercised by it | Broader mode |
| --- | --- | --- | --- | --- |
| Server route / registry / re-check | Yes | unit + route E2E (IMP-S3-01) | — | reused; device-level outcomes in journeys |
| `/mobile` view (renderer) | Yes | specs (IMP-S3-30) | real touch, real keyboard, visibility | emulator + browser |
| Android WebView shell | Behavior (lifecycle, IME) | — | Gboard behavior, background | emulator |
| Desktop app tile | Yes (small) | specs | rendered Retry | isolated desktop instance |
| Auth / Phone Access | Yes (re-check) | route E2E | the phone's UI after Phone Access off | emulator |

## Project Execution Discovery

- Testing guideline: root `TESTING.md` (Docker server nodes, isolated desktop instance, browser probes, fresh-start, one heavy run at a time). Android: `autobyteus-android/README.md` (emulator used per the team rule; no physical phone).
- Changed build-input paths: none (`git diff --name-only e427a0c9cf 165de82af4` matches no TESTING.md build input; no new cross-package import). Fresh-start: not required. The test environment's server package and desktop app are built from a fresh clone of `165de82af4` anyway (recorded as API-03).
- Environment: test node `abx407-api-node` = `autobyteus/autobyteus-server:beta` (`9c5aa01bb2fc`) + this commit's server package read-only over `/opt/autobyteus/server-package` (it carries the `/mobile` bundle), fresh volumes, `127.0.0.1:<P>:8000`; the emulator reaches it through a test-owned access-logging proxy (`10.0.2.2:<Q>`), which can also be stopped to make the node unreachable (SCN-004a). Emulator `autobyteus277_api35` (`-wipe-data`); headless system Chrome via `playwright-core` (worktree `node_modules`); an isolated desktop instance of the fresh-clone app.
- Node-side truth: `xdotool getmouselocation`, `xev` / a capture terminal for keys, `/proc/net/tcp` upstream count to :5900, the server log `[node-desktop]` lines.
- Secrets: none. No model is called (runs are created, no message is sent).

## Existing Durable Coverage Inventory

| Path / Test | Criteria | Validity | Action |
| --- | --- | --- | --- |
| server `tests/unit/node-desktop/node-desktop-viewers.test.ts` (12), `tests/unit/api/websocket/node-desktop.test.ts`, `tests/e2e/node-desktop/node-desktop-routes.e2e.test.ts` | AC-012, AC-021 | Still Valid | Reuse IMP-S3-01 |
| web `useVncSession`, `useNodeDesktopConnection`, `useNodeDesktopAvailability` (incl. CR-001), `useNodeDesktopZoom`, `useMobileNavigation`, `MobileNodeDesktop`, `NodeDesktopTile`, `VncViewer`, `MobileRunScreen` specs | AC-017…019, 021, S3-1, S3-2 (units) | Still Valid | Reuse IMP-S3-30 |
| `evidence/browser-probe.mjs` (temporary probe of the implementation) | AC-018 | Still Valid | Rerun independently (API-10) |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Planned Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-012, 021, S3-2, S3-3 (units/E2E, docs), gates | server, web | Reused | IMP-S3-01, IMP-S3-03, IMP-S3-05, IMP-S3-22, IMP-S3-30, IMP-S3-31, MP-001 | Ran on the code they exercise (server unchanged since `4f11061ecf`; web rerun on `0baf15a981`) |
| API-02 | green server suite | server | Existing Test (rerun) | `pnpm -C autobyteus-server-ts test:unit` | IMP-S3-02 kept no output |
| API-03 | build | test environment | Journey | fresh clone of `165de82af4`: buildx `server-package`, `pnpm install --frozen-lockfile`, `build:electron:mac --arm64` | Environment builds; not a required fresh-start |
| API-04 | AC-017, SCN-004c | emulator | Journey | pair; run → ⋮ → VNC Viewer; fitted View only; View only taps/drags → node pointer unchanged; rotate landscape → still connected; pinch, pan, double tap, Fit; full screen hides the bars, tap shows them, Back leaves; zoom in, switch to Control → fitted, tap → node pointer at the intended point; full screen Control → handle | Independent rerun + Control after zoom |
| API-05 | AC-S3-1, REQ-S3-2, SCN-004b | emulator + Gboard | Journey | Control → Keyboard; type `abc` Backspace Enter into a capture window (xev + text); Gboard suggestions/auto-correction: type a misspelled word + space (corrected), and pick a suggestion; another IME if installed | Rerun + suggestions |
| API-06 | AC-019 | emulator | Journey | Control stream; Home → node log `viewer-closed`, upstream 0; return → `Connected · View only`, upstream 1 | Rerun |
| API-07 | AC-012, SCN-009a | emulator + owner routes | Journey | (a) Phone Access off while streaming → closed ≤ 30 s, "not allowed", reopen refused; on again → reopen works; (b) revoke → same | New (Phone Access off) + rerun |
| API-08 | AC-021, SCN-006a | browser (one device, 3 tabs), raw filler viewers, emulator, desktop app tile | Journey | headless Chrome paired once: tab 1, 2 connected, tab 3 "Too many viewers…" + Retry; close tab 1 → Retry on tab 3 connects; node at 4 streams → the 5th (desktop app tile in the isolated instance) "Too many viewers" + Retry; free one → Retry connects; no upstream for refused streams | Rendered refusal on both clients |
| API-09 | CR-001, REQ-S3-4, SCN-004a | emulator through the proxy | Journey | stop the proxy; open a run (availability error); start the proxy; open the next run screen → ⋮ shows VNC Viewer without restarting | The fixed path |
| API-10 | AC-018 | headless Chrome | Journey | rerun `evidence/browser-probe.mjs` against this round's node | Independent rerun |
| API-11 | AC-014-style privacy (QR-S3-3) | logs | Journey | scan the node's logs for `access_token=` values, `mra_`, typed markers | All streams of this round |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None planned (device and multi-client journeys need the emulator, a real node and Chrome; the repository has no gated suite for them).

## Desktop Application Validation Plan

- Only the tile's rendered "Too many viewers" + Retry (API-08), in an isolated instance of the fresh-clone build, driven over CDP; nothing else of the desktop app changed beyond the moved policy (specs).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User Only? |
| --- | --- | --- | --- |
| Physical Android phone | team rule | Low | No |
| iOS | out of scope | — | — |
| CJK input | not guaranteed (approved) | — | — |
| A third-party keyboard (SwiftKey etc.) | not installable on the emulator without an account/store (checked: `ime list -a`) | Low | No |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed: `Yes`. Durable coverage changes: `No`. Reroute: `No`.
