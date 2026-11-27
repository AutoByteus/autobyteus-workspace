# Handoff Summary

## Summary Meta

- Ticket: `team-stream-recovery-541` (Project Task `autobyteus-541`; requested by `/project_task_manager` for the founder: "small follow-ups should be merged into one", 2026-11-26)
- Date: `2026-11-27`
- Classification: `task_size: Large`, `architectural_risk: High`; route: reviewed (architecture review ARCH-REV-001, which led to the revised design SR-002; source review CRR-001 `Pass`, CRR-002 `Fail` (CR-001: a member navigation during a recovery was undone at the commit), CRR-003 `Pass`; API/E2E `API-REV-001` `Fail` (F-1), `API-REV-002` `Pass`, final confidence 94 %, no category below 90 %; test-code review CRR-004 `Pass`).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/team-stream-recovery-541`, base `origin/personal` `80420a8bf6` at bootstrap; integrated once with `origin/personal` `ff912496ff` (the v1.5.15-beta.3 release record, one non-ticket file: the version string; merge `122cfdbcd3`, no conflict).
- Delivery rounds: `DR-001` delivered (`delivery-revision-record.md`).

## Delivery Summary

- Delivered scope (web, plus three server files):
  - **A. A Team stream recovers by itself** (REQ-001, REQ-002, DEC-001): a Team whose stream loses order or its connection no longer waits for the user to select the member again, on desktop and phone. One owner (`teamStreamAutoRecovery`, started by a client plugin) watches the state the Team store publishes (`teamStreamRecoveryStore`: `required`, `recovering`, `exhausted`) and runs one recovery per Team on the shared reconnect cadence (1, 2, 4, 8, 16, 30 s, none while the page is hidden). Each attempt is the verified replacement a reselect always ran. A user's reselect during a recovery joins it (single-flight), and a member the user moved to meanwhile, by any path, stays focused. The members keep their last status; Stop answers "not sent"; a send waits up to 10 s for the replacement, follows its member and, past 10 s, comes back with the not-sent notice and its text. The page's own state (the draft, a returned draft and its notice, a send waiting) is carried across the commit. After the fifth consecutive failure the view says so in a localized notice (desktop and phone); the attempts go on.
  - **B. Opening a run** (REQ-004, REQ-005): a live run opens with the status the Runs row already showed (else `Initializing` until the stream's first status), never the old `Running` placeholder; an open that meets a context built meanwhile reads once more and, if it changed again, shows the context the page holds instead of throwing "changed before projection commit".
  - **C. A history refresh writes no status** (REQ-003): an existing run's or Team member's context keeps its last status until its stream's snapshot; the `Initializing` placeholder that disabled Send for nothing is gone, for a standalone run and a Team member alike.
  - **D and E** (REQ-006, REQ-007): the composer's "Send message" and "Stop generation" are localized (en, zh-CN); the Team tool-approval handler's unreachable null-run branch is removed (server, no behavior change); `CollaborationMessagesOrgRoot.integration.spec.ts` has a 20 s timeout sized for 42,000 references; the Org context store and streaming service are each under 500 lines (482 and 446) after splits by owned concern; `agentOrgConnectionLostError.ts` is `agentOrgCommandFailures.ts`.
  - **The probe wire keeps frame order** (REQ-008): the stop-generation probe's wire kept one FIFO queue per link and direction, so a probe no longer reorders frames. That reordering is what had made autobyteus-533 see a "gap" that was not real.
  - **Found after the first pass, fixed:** the architecture review found the design would drop the page's own state at the replacement and made the store start work it published (the two design cases 32 and 33); API/E2E found that a member navigation during a recovery was undone at the commit (F-1, CR-001; the commit now keeps the member the user moved to).
- Docs synced (`docs-sync-report.md`): `autobyteus-web/docs/agent_execution_architecture.md` (the Team recovery rules replace "an explicit history-selection workflow"; the reconnection section's Team rule; the refresh and open-status rules); kept from the ticket: `docs/design-cases.md` cases 32 and 33.
- Durable coverage: probe cases SDD-07, 09, 12 to 17 (a Team gap recovered, recovery failing five times, a link or a run-tree click during a recovery, the old-versus-new status cases) in `send-delivery-probe.mjs`; MSP-119 and MSP-120 on the phone (`mobile-team-stream-recovery-cases.mjs`); `fixtures/team-stream-gap.mjs` (a probe wire that withholds one numbered frame); the fixed `fixtures/stop-generation-wire.mjs`; web specs for the recovery owner, the store, the coordinator (single-flight, focus kept), the carry-over, the retargeted send, the open's status and races, the refresh, and the labels; a server unit spec for the tool-approval handler.

## Delivery's round

- **DR-001** merged the base, reran what the Team stream, the open path, the refresh and the three server files could affect (both unit suites, the server integration suite, three whole probes, both rebuilds), read the evidence, wrote the docs the ticket had not touched and finalized. It found no defect. Two failures appeared and were checked, not ignored: the web suite's one failure is the base's (FU-001), and the server unit suite's one timeout in an agent-execution file this ticket does not touch did not repeat on a second run.

## Verification Summary

- Verified from evidence by delivery. Every critical acceptance criterion (AC-001 to AC-006, AC-009, AC-010) is directly proven, AC-005 by a web spec only (below); nothing needs the user's check. No evidence decision (`DEC-*`) accepted an unverified risk.
- Final confidence 94 % (the 95 % default target is not met: the report bounds it by FU-002 and by the failure-and-recovery category at 90 %; no category below 90 %).
- Key evidence opened by delivery (details in `release-deployment-report.md`):
  - AC-001: a withheld `TURN_COMPLETED` frame: the view recovers 46 ms (desktop, API/E2E) and 47 ms (delivery) after the gap, 0 failed attempts, the lead `Idle`, no notice, the next send on the replacement link; the phone 354 ms and 28 ms.
  - AC-002: the localized notice at the fifth failure after about 15 s, the member `Idle` and Send enabled throughout, the send's not-sent notice at 10 s with its text back in the box (both screenshots opened), recovered at about 31 s with the notice gone.
  - AC-003 and AC-010: a member chosen by a run-tree click (SDD-17) or an execution link (SDD-16) during the recovery's hydration is the focused member after the commit.
  - AC-004: the same cases fail on the base (`Initializing` at 3.3 s and Send disabled) and pass on the branch (the status stays what it was).
  - AC-009: the wire prototype 548 out-of-order deliveries in 8,000 frames on the base, 0 on the branch.
- Integrated-state checks by delivery (`evidence/delivery/`): both typechecks at baseline (server 972 in 299 files, web 85 in 35 files, 0 production errors); `check:contract-dist` `PASS`; the whole server unit suite `1099 files`, `9167 tests` on the second run; the whole server integration suite `93 files`, `534 tests`; the whole web suite `817 files`, `6372 tests` with only the base's font audit failing; server and phone bundle rebuilt; the whole send-delivery probe SDD-01 to SDD-17 `Pass`; MSP-119 and MSP-120 `Pass`; the whole stop-generation probe SGD-01 to SGD-08 `Pass`. No build input and no iOS or Android file changed, so no fresh-start build and no build-only release run apply.

## Residual Risks For The User

- **FU-002 (held by the code reviewer, measured by API/E2E in SDD-93):** a Project Task link, or another in-app execution link, whose member is still loading when a recovery commits is rejected ("Team context … changed before selection commit", a console error) and the earlier member stays focused. It is a narrow window (about 100 to 500 ms of hydration), the click can be repeated and nothing is lost. The suggested fix is to retry the inspection on the new context.
- **A long turn delays recovery, and the notice can show first (an observation of the implementation):** the verified replacement refuses to commit while the Team has open work, so a gap in the middle of a long turn recovers only after the turn ends; the fifth failure (about 15 s) shows the notice first, and the attempts go on.
- **A live Team stream's invalid snapshot never enters `reopen_required`** (an observation of the implementation, outside this ticket): a snapshot that fails validation is not recovered by this mechanism.
- **AC-005 is proven by a web spec only.** The requirement named a probe sampling the button from the click; implementation and API/E2E record that a browser cannot reach the open path that takes the status deterministically (a loaded page's history refresh builds a live run's context first). The spec is a decision table with the run-status store mocked; delivery judged it sufficient (one lookup that the Runs row already makes, traced by the code reviewer, and the old `Running` placeholder is gone from the code). A defect would show as an idle run's Stop button for a moment at open.
- **Not tested:** a Team archived and reopened in one page session (CRR-001's C-1): the web UI has no unarchive; a real network loss (the probes withhold a frame at the page's edge and refuse the recovery's reads); a packaged desktop window or the phone apps (the change is in the web page and three server files).
- **Environment (outside this ticket):** the whole web suite has one failure on the base, the fixed-px font audit naming `NodeRow.vue:39` (FU-001, autobyteus-581); the whole server unit suite can time out one agent-execution test under heavy machine load (once in delivery's first run; the file passes alone and the second run was clean).

## Follow-ups

`follow-ups.md` lists, for the Solution Designer to send (none sent yet; none urgent):

- **FU-001:** the web's fixed-px font audit (`tests/integration/app-font-size-fixed-px-audit.integration.test.ts`) fails on `components/settings/nodes/NodeRow.vue:39` (`text-[11px]`), a base file from autobyteus-581; the whole web suite is red on the base until it is fixed.
- **FU-002:** a Project Task link still loading its member when a recovery commits is rejected and the earlier focus stays (above); retry the inspection on the new context.
- The implementation's two observations above (the invalid snapshot that never enters `reopen_required`; a long turn delaying recovery) are for the Solution Designer to decide on.

## Release

- No release: no release was asked for and `RELEASE.md` makes none the default. A release is available: `release-notes.md` holds the user-facing notes (no `## What you need to do`). The change is in the web page, so it reaches every client with the node and the desktop app.
