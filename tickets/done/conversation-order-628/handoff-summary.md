# Handoff Summary

## Summary Meta

- Ticket: `conversation-order-628` (Project Task `autobyteus-628`)
- Date: `2026-11-24`
- Classification: `task_size: Large`, `architectural_risk: High`; route: reviewed (architecture review ARCH-REV-001 `Fail` (Design Impact and Requirement Gap, resolved by SR-004 and SR-005), ARCH-REV-002, 003 and 004 `Pass`; source review CRR-001 `Fail` (one Local Fix, CR-001), CRR-002 `Pass`, CRR-004 `Pass` on IR-003; API/E2E `API-REV-001` and `API-REV-002` `Pass`, final confidence 95.1 %, no category below 90 %; test-code review CRR-003 `Pass`, CRR-005 `Not Applicable`).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/conversation-order-628`, base `origin/personal` `1f761bc8db` at bootstrap. Integrated twice with the base, no conflict either time: `e5d878832b` (35 commits, merge `54cee15c8e`, round DR-001) and `2a8d5bf8c3` (4 commits, merge `061498f684`, round DR-002; the beta.10 release's version bump and its tickets).
- Delivery rounds: `DR-001` `Blocked` (two findings, both fixed); `DR-002` delivered (`delivery-revision-record.md`).

## Delivery Summary

- Delivered scope:
  - **D-1 (the founder's bug):** the conversation window keeps the conversation's own order and no longer sorts messages by their times. A phone whose clock ran behind the node's no longer shows a message it just sent after the platform's notice or the agent's reply. A compaction row is still placed by time, between the messages that keep their order.
  - **D-2:** after a reload, a platform notice reads right after the input it was delivered with (You, notice, reply), as it does live. The replay builder orders it (`orderPrefaceNoticesAfterTheirInput`); the stored traces do not change.
  - **D-3 (the user's rule: the server records every time, the app only shows it):** `AgentRun` stamps each event once (`stampForDelivery`); every timed message carries `occurred_at`, and every pending input `accepted_at`, on `/ws/agent`, `/ws/agent-team` and the Org and collaboration streams. The web stamps nothing: an own send has no time until the node confirms it, and a timed frame without `occurred_at` is refused.
  - **SR-006:** an external runtime's user trace is stored at the input's admission time (`acceptedAt`), so a reload orders it before its notice.
  - **SR-007 (from DR-001's Finding 2):** every other stored trace keeps its write time, as before the ticket. The recorder does not read the event's time; only the user trace takes `acceptedAt`.
  - **Contract fixtures (from DR-001's Finding 1):** the three contract packages' own suites carry `occurred_at` and `accepted_at` and pass.
- Docs synced (`docs-sync-report.md`): `agent_websocket_streaming_protocol.md` (new "Row Times"), `agent_streaming.md`, `agent_execution.md` (new "The Node's Time Of An Event", corrected for SR-007 in DR-002), `run_history.md`, `autobyteus-web/docs/agent_execution_architecture.md`; `docs/design-cases.md` by the ticket.
- Durable coverage: phone cases MSP-105 (scripted: phone clock 2 s behind sending, 2 s ahead, 2 s behind watching), MSP-106 (live Claude Team `/lead`) and MSP-107 (live native standalone with a skill update), the last two gated by `RUN_MOBILE_SHELL_LIVE_ORDER=1` and the test vault; server, web and contract unit specs for each rule, including the accumulator's tests now stamping distinct event times.

## Delivery's two rounds

- **DR-001 found two defects and sent the ticket back** (`Blocked`; evidence `evidence/delivery/DEL-BLOCK-*`):
  1. the three contract packages' own suites failed (2 of 23, 4 of 39, 2 of 14): the required `occurred_at` / `accepted_at` were missing from their fixtures, and nobody had run `pnpm -C <package> test`;
  2. the recorder, reading the event's own time, changed the stored order of reasoning and tool traces when event times differ (7 of 25 accumulator tests fail with distinct times; one failed once in the whole server unit run).
  Classified `Local Fix` and `Design Impact`; the Solution Designer decided SR-007 (stored traces keep their write time), the Architecture Reviewer passed it (ARCH-REV-004), implementation fixed both (IR-003), code review passed (CRR-004) and API/E2E rounded 2 on the merged tree.
- **DR-002** re-integrated the base, reran the suites that had failed and the whole of the others on the merged tree, corrected the two `agent_execution.md` sentences to SR-007, and finalized.

## Verification Summary

- Verified from evidence by delivery. Every critical acceptance criterion (AC-001…AC-006) is directly proven; nothing needs the user's check. No evidence decision accepted an unverified risk (no `DEC-*` with an unverified part); DEC-005 is a design decision (below), not an accepted risk.
- Final confidence 95.1 % (target 95 % met).
- Key evidence opened by delivery (details in `release-deployment-report.md`):
  - AC-001/002/003/006: `R2-MSP-105-107-live/mobile-shell-probe.json`: `result: Pass`, MSP-105, MSP-106 (Claude Team `/lead`, 3 rounds) and MSP-107 (native standalone, 2 rounds) `Pass`, `browserErrors: 0`; each round `live.ok` and `reopened.ok` true; the node's entries read `["message:user","system_task_notification","message:assistant"]`; the phone's state times are the node's (live within 11 ms of the stored write time, reopened equal) with the phone clock 2 s off.
  - AC-005: whole server integration `92 passed | 21 skipped (113)`, `523 passed`; whole phone probe 103 cases, 97 `Pass`, MSP-105, 99, 66, 75, 76 and 77 `Pass`, the six failures outside the ticket (below); whole server E2E: only RRB-1 and SID-2 fail, both on the base.
  - The fresh-start build (R2-FS-1, a new clone of `2d3f46b223`): `build exit 0`, `verify prisma exit 0`, `node-pty spawn probe` ok, `stampForDelivery` in the packaged server, the web's refusal text in `app.asar`.
- Integrated-state checks by delivery (`evidence/delivery/dr-002/`): both typechecks at baseline (server 972 in 299 files, web 86 in 36 files, 0 production errors); `check:contract-dist` `PASS`; the three contract packages' own suites `24`, `39` and `14` passed (DR-001: failing); whole server unit suite `1081 files passed`, `9028 tests passed` (DR-001: one failure); whole web suite `803 files`, `6124 tests` passed; the accumulator's test file alone with its distinct event times 25 of 25 passed (DR-001's reproduction failed 7); whole server integration `92 passed | 21 skipped (113)`, `523 passed | 71 skipped`; server and phone bundle rebuilt (`exit 0` each); phone cases MSP-66, 75, 76, 77, 99 and 105 `Pass`, `unknownBrowserErrors: 0`, cleanup `serversLeft: 0` (MSP-105's three rounds, phone clock 2 s behind sending, 2 s ahead and 2 s behind watching, `live.ok` and `reopened.ok` true). The base's four new commits changed one non-ticket file, `autobyteus-web/package.json` (the version, `1.5.14-beta.9` to `1.5.14-beta.10`): no build input of this ticket's own changes and no overlap with its files, so the fresh-start build and the build-only release run stay as API/E2E ran them.

## Residual Risks For The User

- **Not tested live:** Codex (it shares the external writer Claude uses; MSP-106 ran on Claude), a message appended into a notice's own turn (N-5: covered by unit tests on the real writers only), the desktop window's rendering of the order (the same builder as the phone's), a physical phone (a headless 390×844 browser with the phone's clock offset by 2 s), signing and notarization (the release runner).
- **Same release for the app and every node (DESIGN.md rule 9):** a node on an earlier release sends no `occurred_at`, and this release's app refuses a timed frame without it. `release-notes.md` says so under "What you need to do".
- **A live row's time and its reloaded time differ by a few ms** (both the node's): the live time is stamped when `AgentRun` delivers the event, the stored time is when the trace was written. The order is the same. The user's principle of one stamp per event is DEC-005's follow-up (below).
- **Environment (outside this ticket):** the whole phone probe is red on MSP-17, 58, 65, 82, 87 (FU-002: they fail the same way on the base) and MSP-61 (autobyteus-609's FU-006); the whole server E2E has RRB-1 and SID-2 failing (autobyteus-609's FU-007, a short-`TMPDIR` effect on the base).

## Follow-ups

`follow-ups.md` lists, for the Solution Designer to send (none sent yet; none urgent):

- **FU-002:** the Org member and root-view phone cases MSP-17, 58, 65, 82, 87 fail on the base and on this ticket alike.
- **FU-004 (the code reviewer's, CG-07):** the run list's live activity time comes from the viewer's clock (`conversationMutationEffects` defaults `occurredAt` to `new Date()`), so the run list can order runs by two clocks.
- **FU-004 again (DEC-005's follow-up, the Solution Designer's row):** one server timestamp per event for every runtime, live and stored. **The file holds two rows with the ID FU-004**; the design documents (`solution-revision-record.md`, DEC-005) cite the second, the code-review documents the first. Delivery did not renumber them (the Solution Designer's file, cited by ID in several documents).
- **FU-005:** `runProjectionActivityHydration.ts` `toDate` falls back to the viewer's clock for an activity with no `ts` (never reached today).
- FU-001 (a compaction row's place) is resolved by the ticket for message order; FU-003 was withdrawn by its finder.
- Not ours, outside the ticket: autobyteus-609's FU-006 (MSP-61) and FU-007 (RRB-1, SID-2).

## Release

- No release: the user did not ask for one and `RELEASE.md` makes none the default. A release is available: `release-notes.md` holds the user-facing notes, with a `## What you need to do` section (update the app and every node together).
