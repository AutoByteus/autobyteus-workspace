# Handoff Summary

## Summary Meta

- Ticket: `send-on-unbound-stream` (Project Task `autobyteus-540`, follow-up FU-006 of autobyteus-533)
- Date: `2026-11-19`
- Classification: `task_size: Medium`, `architectural_risk: High`; route: reviewed (architecture review ARCH-REV-002 Pass; source review CRR-001 Pass; API/E2E `API-REV-001` Pass, final confidence 95.3 %, target met, no category below 90 %; test-code review CRR-002 Pass, no findings).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/send-on-unbound-stream`, base `origin/personal` `914eb36577` at bootstrap and at delivery (the base did not move: no integration merge was needed). Code `f70d3cb968` (server D-8), `49ed8967f0` (web); tests `41bba2c734`.

## Delivery Summary

- Delivered scope:
  - **A message is never lost silently.** A standalone, delegated or peer agent's `SEND_MESSAGE` leaves the page only after the node's `CONNECTED` on the current connection (`whenBound`, 10 s), and every agent send waits for the node's `AGENT_COMMAND_ACK`. Team and Org keep waiting for their ready view. The refusal this removes (`SESSION_NOT_READY`) was seen on 1 of 80 sends right after a Stop in autobyteus-533.
  - **A send lost with its connection is decided from the reconnect snapshot**, which now carries `input_state` (server D-8: the active run's queued, forwarded and held input; `null` for a stopped run and a peer's relay). Found (stored, live turn or queued) → shown once, no notice; missing with an `input_state` → not sent; missing without one → unknown.
  - **A message that is not delivered comes back**: the message leaves the conversation (for "not sent"), the text, attachments, mentions and skill tags return to the message box (a draft typed meanwhile is kept), and one plain notice appears above the box (en, zh-CN; desktop and phone; every run kind): (a) "Your message was not sent: not connected to the node. It is back in the message box; send it again." or (b) "The connection to the node was lost while sending. Your message is back in the message box; if it does not appear in the conversation, send it again." The status is unchanged; the next send or the dismiss button clears the notice.
  - **A new run's first message that is not delivered keeps its prepared run**, so sending it again works (an implementation decision outside the design text; the Code Reviewer confirmed it).
  - **The probes treat a lost send as a failure** (no second send): `stop-generation-probe.mjs` and `mobile-stop-generation-cases.mjs` `holdTurn`.
- Docs synced (`docs-sync-report.md`): `autobyteus-web/docs/agent_execution_architecture.md` (by the ticket; one stale class name corrected by delivery) and `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` (added by delivery: the snapshot's `input_state` and the readiness rule), `docs/design-cases.md` (one case bullet). `DESIGN.md`, `TESTING.md`, `RELEASE.md`: no change.
- Durable coverage: `send-delivery-probe.mjs` (`pnpm -C autobyteus-web test:e2e:send-delivery`: SDD-01…12, desktop real stack, standalone run and Team member), phone cases `MSP-85…88` in `test:e2e:mobile-shell` (`mobile-send-delivery-cases.mjs`), the wire fixture's `loseNextSend` / `dropAfterNextSend`, unit tests per run kind, the notice, the snapshot and `HeldUntilRebind`.

## Verification Summary

- Verified from evidence by delivery. Every critical acceptance criterion (AC-001…AC-007, QR-001) and QR-002 is directly proven; nothing needs the user's check.
- Final confidence 95.3 % (target 95 % met).
- Key evidence opened by delivery (details in `release-deployment-report.md`):
  - AC-002: `API-06` 80 sends right after Stops took the AGY run offline (40 standalone, 40 Team member): `"sends": 80`, `"sendStalls": []`, 0 `SESSION_NOT_READY` in the wire log. `API-07` SDD-01/02: 40 sends after forced reconnects, each on a bound link, all started their turn. `API-08` MSP-85: 15 phone sends, `notReady: 0`.
  - AC-003/AC-004: `API-07` SDD-03 (answer lost → shown once, no notice), SDD-04 (queued behind another window's turn → found through `input_state`, no notice), SDD-05 (missing, live run → text (a), draft back), SDD-06 (missing, stopped run → text (b)), SDD-07/09 (not bound in 10 s → (a) after 10 009 ms / 10 031 ms), SDD-08 (Team lost → (b)), SDD-10 (a new run's first message refused → draft back; the resend `accepted`, one new run), SDD-11. Phone: MSP-86 (a), MSP-87 Org member (b), MSP-88 peer run on a second node ((a) after 10 132 ms, (b)). Notice texts verbatim, no run id or internal word.
  - AC-005: the notice and the draft stay after the rebind's snapshot replaced the conversation (SDD-05/06, MSP-86…88).
  - AC-007: server integration 510 passed with 4 FSEvents-bound watcher failures (`API-04`/`API-04b`); server E2E whole 8 failed on load and all 8 pass serially (`API-05`/`API-05b`); phone probe 86 of 87 cases pass (`API-08`).
- No integrated-state rerun was needed: `origin/personal` had not moved since the branch's base, and nothing but documents changed after the tested commits.

## Residual Risks For The User

- **R-2 (by design):** an answer that never comes on a bound stream leaves the send pending until a loss; no timer.
- **R-4 (by design):** a peer run answers "unknown" (b) for a missing message, because the observing node cannot read the run's input state.
- **With (b), the message may still appear after its draft came back**: the page said so ("if it does not appear in the conversation, send it again"). A user who sends the draft again then sends it twice.
- **FU-003:** while the desktop page's path to its node is down, an active Team's or Org member's Send is disabled (Team shows "Initializing" from the history placeholder, with or without a send), so after the Team's not-sent notice "send it again" cannot be done until the stream rebinds.
- **Version coupling (DESIGN.md rule 9):** the snapshot's new `input_state` is a clean cut: a page of this release rejects the snapshot of a node of an earlier release. The release notes say the node must be on the same release.
- **Not tested:** the queued case (SDD-04) ran on the scripted AGY runtime only (native and ACP share the same admission, not run); a real network (the wire stands in for it; HTTP is not delayed); zh-CN rendered (unit only); a physical phone; the Electron shell (unchanged).
- **Environment:** the phone probe's overall verdict is Fail on MSP-41 (the desktop Files editor's own save read twice). It also failed alone, and the code of this diff does not touch the file editor or watcher; autobyteus-458 recorded the same intermittent failure on its base (its FU-003: failing with the base's own web sources too, and alone). 4 `file-system-watcher` integration tests fail on FSEvents (measured: no event in 10 s); 8 E2E files time out under parallel load and pass serially.

## Follow-ups

- `follow-ups.md` lists FU-001…FU-003 for the Solution Designer to send (none sent yet): FU-001 the two Org files at 506 lines (`agentOrgContextsStore.ts`, `agentOrgStreamingService.ts`; over the limit before this change); FU-002 rename `agentOrgConnectionLostError.ts`, which now also holds `orgCommandFailure`; FU-003 the Send disabled during an outage (above). None is urgent.
- Also open, from autobyteus-533 and not repeated: its FU-008 (whether a `package.json` change that only adds a `test:e2e:*` script triggers TESTING.md's Fresh-start build). This ticket adds one such line too (`test:e2e:send-delivery`); delivery handled it the same way (lockfile consistency and artifact hygiene checks instead of the build).

## Release

- No release: the user did not ask for one and `RELEASE.md` makes none the default. A release is available: `release-notes.md` holds the user-facing notes (no `## What you need to do`: no user action, no migration).
