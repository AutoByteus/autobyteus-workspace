# Code Review Report — autobyteus-572 (chat-media-path-playback)

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003, Approved by the user)
- Investigation Notes Reviewed As Context: not needed for this bounded review (the design spec's Current-State Read cites the paths)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (D-2, D-4, D-6, behavior map BEH-007, DS-002)
- Supplemental Task Artifacts Reviewed As Context: None
- Relevant Solution Revision IDs: SR-003
- Design Review Report Reviewed As Context: `N/A — not applicable` (direct route, Medium / Low)
- Architecture Review Revision Record Reviewed As Context: `N/A — not applicable`
- Relevant Architecture Review Revision IDs: N/A
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001)
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `N/A` (failure-origin round)
- Review Scope Evidence (round >1): N/A
- Trigger: API/E2E Engineer, API-REV-001 Fail (API-03)
- Prior Review Round Reviewed: N/A (no earlier code review; direct route)
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record Reviewed: N/A
- Relevant Delivery Revision IDs: N/A
- Failing Scenario IDs: API-03 (MSP-91, outside-the-folder step); AC-006, REQ-005
- Exact Failing Commands / Execution Mode: `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-91` (phone bundle, probe-owned nodes, ~9.7 MB video at 8 Mbit/s, the node killed mid-download and started again)
- Failure Evidence Paths: `evidence/api-e2e/API-03-msp91-outside-retry/mobile-shell-probe.json` (`"error": "REQ-005, AC-006 outside: the failure offers Retry (a plain message with Retry)"`, `outside.state.retry: false`), `MSP-91-outside-failed.png`, `MSP-91-inside-failed.png`, `MSP-91-inside-after-retry.png`
- Code under test: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-media-path-playback`, branch `codex/chat-media-path-playback`, `b856241b59` (server `02320583a5`, web `d165d3143a`); probe `4adbafdf4d`

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception`
- Classification evidence or correction required: None. The finding is a missing decision inside existing owners; it does not change the size or risk.

## Review Scope

- Changed implementation and behavior reviewed: only the failure path of the phone's two media routes:
  - workspace route: player, `VideoPlayer` / `AudioPlayer`;
  - node-file route: `useMobileNodeFile` → `MobileFileViewer`.
- Files / areas reviewed:
  - `autobyteus-web/components/mobile/views/MobileFileViewer.vue` (current and base `bfd95f73a9`);
  - `autobyteus-web/composables/mobile/useMobileNodeFile.ts` (diff);
  - `autobyteus-web/utils/fileExplorer/nodeFileContent.ts` (refusal keys);
  - the MSP-91 and MSP-90 assertions in `autobyteus-web/tests/e2e/mobile-file-open-cases.mjs`.
- Explicit exclusions: no full source audit or scorecard (failure-origin round). Nothing was rerun: the API/E2E evidence and the code settle the cause (`Read` for the code, `Reproduced` by API/E2E for the behavior).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes.
  - REQ-005: "A failure shows a plain message with Retry; no internal words".
  - AC-006: "A missing/refused file: plain message + Retry", verified by unit and probe.
  - REQ-002: covers both phone routes, inside and outside the run's folder.
  - UC-003: "the loading and failure states of video/audio viewers".
- Behavior-basis status: `Confirmed` (the failing test represents approved behavior)

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-007 (inside the folder) | Confirmed | Workspace route → `VideoPlayer` failure: "This video could not be played." + Retry → loads again and plays (MSP-91 `inside`) | — |
| BEH-007 / REQ-005 (outside the folder) | Contradicted (by the design, see below) | `useMobileNodeFile.load` turns any failed read into `{ isLoading: false, error }` (refusal key `failed` → "The file preview could not be opened."). `MobileFileViewer.vue:20` renders `viewerError` as a bare `<p role="alert">` with no Retry. That branch is unchanged from the base; the change added only the loading view (`:21-28`) | MSP-91 `outside.state`: `alert: "The file preview could not be opened."`, `retry: false` |

## Supported Product Scenario And Reachability Gate

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-F1 | REQ-005, AC-006, REQ-002 | User / network | Phone user | Watch a video whose download fails | Tap a path outside the run's folder in chat (phone) | Normal | `openMobileFilePath` → `useMobileNodeFile` → `loadNodeFileFromUrl` fails (the connection to the node breaks, or the file is missing/refused) → `MobileFileViewer` failure branch | A plain message with Retry | AC-006 names missing/refused files; a phone losing its node mid-download is the case the 533/540 precedent covers | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FO-01 | The phone's node-file route shows its failure with no Retry | SCN-F1; REQ-005, AC-006 | Tap an outside-folder video; the node goes away mid-download (or the file is missing) | Failure text with nothing to press. The user must go back and tap the link again (API/E2E: that plays it) | MSP-91 evidence; `MobileFileViewer.vue:20`; design D-4 / D-6 / behavior map | Promote | This ticket | An in-scope acceptance criterion fails. The cause is the design's failure decisions, not the code (below) |
| FO-02 | Was the test invalid or the environment at fault? | — | — | Killing the node is a real loss of the node; the inside step under the same trigger shows Retry, so the trigger reaches both routes alike | MSP-91 `inside` | Reject | — | The test is valid |
| FO-03 | A missing file outside the folder: AC-006's other trigger on this route | AC-006 "missing/refused" | Tap an outside-folder path that does not exist | `NODE_FILE_REFUSAL_MESSAGE_KEYS['not-found']` → the same `MobileFileViewer.vue:20` branch, no Retry | `Read` (not run: MSP-90's `missing` case taps an inside-folder path, which passes through the player) | Promote (same finding) | This ticket | Same cause and same decision. The designer should cover both triggers, and API/E2E should add an outside missing-file case |

## Failure Classification

- **Origin: `Design Impact`.**
  - The design decided the failure state of the players only. D-2 gives the players "failure (plain text + Retry) → loading → …", D-6 gives audio the same, and the behavior map row BEH-007 reads "video and audio: plain text + Retry".
  - For the phone's node-file route, D-4 changes only the loading view ("shows `MediaLoadingState` … instead of the bare 'Opening…'"). DS-002 downloads the file in `useMobileNodeFile`, before any player exists, so a failed download never reaches the player's Retry. That failure stays in `MobileFileViewer`'s pre-existing text-only branch.
  - The design names both phone routes under "Several kinds", but its failure decision does not trace the second route, so REQ-005 / AC-006 has no owner there.
- **Not an implementation defect.**
  - The implementation follows D-4 exactly: loading view and progress added, failure branch untouched.
  - No design decision asked for a Retry on that route, and adding one needs choices the design has not made (below).
- **Not an earlier review gap.** The route was direct and no source or architecture review was selected, so no review saw it.
- **Not a test, fixture or environment problem** (FO-02).
- **Prerequisite?** No. It is in the functionality this ticket changes (the phone's media viewers, UC-003).

## Decisions The Design Needs To Make

The decisions, not the mechanism:

1. **Scope of Retry.** Does the node-file failure show Retry for media only (video and audio, UC-003), or for every node file `MobileFileViewer` opens (text, PDF, image)?
   - The branch is shared by all file types.
   - Only media is in this ticket's use cases; the others would be a behavior change outside UC-003 unless the designer decides otherwise.
2. **Which failures get Retry.** A broken download (`failed`) clearly gets it. AC-006 also names "missing/refused", which covers `not-found` and `folder`; say whether those get Retry too, or whether AC-006 is narrowed for them (a `Requirement Gap` with renewed approval if so).
3. **Who reloads.** `useMobileNodeFile` loads on a change of `source` only, so a Retry needs a reload entry on the owner of the download.
4. **Coverage.** Add an outside-folder missing-file case (FO-03) and keep MSP-91's outside Retry assertion.

## Follow-ups

- Follow-ups this review added: None (FU-004, MSP-59 under load, was recorded by API/E2E).

## Recommended Recipient

- Owner: Solution Designer (`/solution_designer`), for a `Design Impact`.
- After the design revision: implementation, then source or API/E2E per the revised route. The API/E2E rerun includes the server suites marked Next Round.

## Residual Risks

- The whole server `test:integration` and `pnpm test:e2e` have not run (API/E2E: Next Round). The failing path is web-only.
- FU-004 (MSP-59 under load) is unrelated to this diff.

## Latest Authoritative Result

- Review Decision: `Fail` (failure origin confirmed)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: N/A (failure-origin round)
- Failure Origin: `Design Impact`. The phone's node-file route (D-4, one of REQ-002's two routes) has no failure decision; REQ-005 / AC-006's Retry was designed for the players only (D-2, D-6, BEH-007).
- Recommended Recipient: `/solution_designer`
- Notes: API/E2E's preliminary classification is confirmed.
