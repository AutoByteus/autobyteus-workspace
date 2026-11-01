# API/E2E Test Review Report

## Review Meta

- Review Round: 2
- Trigger: round 1 — API/E2E round 3 (API-REV-003) `Pass`, 94%, covering durable test changes from rounds 1–3 (head `393d78cf2a`). Round 2 — API-REV-004 `Pass`, 94%: the CR-T-001 fix (`d8d99351b3`; docs `4d83c0b7b6`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (AC-002, AC-003, AC-006, AC-007; QR-005)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as read for CRR-001…CRR-007)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-004…SR-008: the reload rule)
- Design Spec Reviewed As Context: `design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001…FU-006)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (through ARCH-REV-008, as of CRR-007)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (through IR-006)
- Original Code Review Report: `code-review-report.md` (round 7, `Pass`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-009` (round 1: `CRR-008`)
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md`
- Delivery Revision Record Reviewed As Context (delivery re-entry only): N/A
- API/E2E Result: `Pass` (API-REV-004)
- Final Validation Confidence: 94%
- Prior unresolved test-review findings rechecked: CR-T-001 (round 2: Resolved)
- Project testing guideline(s) applied: `TESTING.md`, as the coverage investigation records it. Relevant rule: "Assertions first. Prove behavior with assertions, API results and DOM/state checks", and screenshots support the evidence but do not prove it. No conflicts with this skill.
- Supported Product Scenario Basis Confirmed: `Yes`. Every case starts from an approved scenario: SCN-002b/c, SCN-007, AC-003's cold open of a stopped Team or Org run, and the SR-004…SR-008 reload counts.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/large-runs-load-less-cases.mjs` | Added (505 lines) | LRL-001/002 AC-003, QR-005; LRL-003 AC-002 (SCN-002b/c); LRL-004 AC-006 (SCN-007); LRL-005 REQ-002, SR-004…SR-006 | One ticket's browser journeys on the shared probe stack | Registered like the other `*-cases.mjs` modules. The size is acceptable for tests. |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated (+8) | — | Case registry and header | Passes `restartBackend` (stop, edit while down, start) and `backendUrl`/`dataRoot`/`outDir`. |
| `autobyteus-web/package.json` | Updated (+1) | — | `test:e2e:large-runs-load-less` | Lists the five case IDs. |
| `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` | Updated (+100/−12 across `ceb5e2d972`, `161913c003`, `59f4604da5`, `e78f587a28`) | AC-007 (L-010 display); SR-004 (L-001/L-002 participant counts); SR-007 (L-012); the baseline fix | Large-hub probe | The hub's messages are now read with `collaborationParticipantMessages`, since views carry no log. The `isChildHydrated` check is now `copyLoadedInPage` through MemberLoader. `errorDetails` records each error's time and stack. |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each case's header line names its AC/SR and its steps. Case titles state the expected counts. `defineRecordedCase` keeps the recorded state on failure. |
| Assertions prove approved requirements instead of incidental implementation details | Pass (round 2; round 1 Fail, CR-T-001) | Request counts are asserted per operation and per participant. Team-tab rows must equal the stored log, and each marker must appear exactly once. LRL-003 proves the race window: the held response did not contain M2. L-010 asserts wrapping, selection, find-in-page and scroll position. L-012 asserts the report is shown once and the list matches the store. **Gap:** in LRL-004, the clause "with the reason" (AC-006) is recorded but never asserted, either on the desktop Team tab or on the phone. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Shared helpers: `createAgent`/`createTeam`/`createOrg`, `watchOps`/`countBy`/`quiet`, `sendNote`/`waitStored`, `assertTabEqualsStored`, `stopTeamRun`. The hub probe adds `hostMessagesFor`, `hubMessageCount`, `participantOps` and `copyLoadedInPage`, and uses them at every former call site. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Each case uses its own tag, definitions and runs. The probe owns the data root, HOME and stack. Each journey opens a fresh page, and the phone gets its own context. Network emulation is limited to the probe's route and WebSocket handlers. Waits mostly use `waitFor`/`waitStored`/`quiet`. A few fixed `delay`s remain; see the notes under Findings (non-blocking). FU-006 (the xterm error) can mark a full hub-probe run `Fail` even when every case passes. It is recorded and outside this ticket. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The 505-line cases file covers one ticket, with five cases in AC order. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Every hub-probe read of the removed `communication_messages` and of `contextFor(host).isChildHydrated` was replaced (`ceb5e2d972`). `grep` finds no view field read and no `isChildHydrated`; the remaining `communication_messages` matches are the stored log's file names, read from disk on purpose. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | API-03…API-09 map to LRL-001…005 and L-001/L-002/L-010/L-012. The evidence JSON (`API-03-06-09-r3-lrl-browser-probe.json`, `API-07-08-r3-hub-probe-live.json`) matches the asserted fields. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | LRL-004 damages the stored log while the backend is down, the case SCN-007 approved. The second client in LRL-003 sends over the run's Team WebSocket, as a phone would (SCN-002b). |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps | Pass | Runs start from the Agent Teams and Org pages. Opens go through the Workspaces tree in a fresh page, and member switches through member rows. The Team tab opens through its tab, and the resume goes through the composer. The phone pairs through Phone Access. Only setup and the second client use GraphQL or WebSocket directly. |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| CR-T-001 | `large-runs-load-less-cases.mjs` LRL-004 (AC-006, SCN-007) | AC-006: "The Team tab shows the run's messages as unavailable, **with the reason**". The case asserts the unavailable state, no partial list, the server's refusal (`serverReason`), the restore refusal and the stopped state. It never asserts that the user sees the reason. `r.reasonShown` (line 390) is only a length check, recorded but not asserted. `r.phoneText` (line 449) is recorded but not asserted. The r1–r3 evidence shows the reason today (`teamTabText`/`phoneText`: "These messages can't be shown team_communication_messages_active.jsonl:line 2 is not valid JSON."), so the API/E2E result stands. But if the reason were dropped from either screen, the durable test would still pass, leaving the requirement's distinguishing clause unprotected. TESTING.md: "Assertions first … DOM/state checks". | Assert that the desktop Team tab's unavailable text and the phone's unavailable text both contain the server's reason, for example the `… is not valid JSON` message from `serverReason`, or `r.damaged.file` and the line number. Drop or replace the length-only `reasonShown`. Rerun LRL-004 (`--cases LRL-004` is enough) and update the evidence. | `Local Fix` / `api_e2e_engineer`. **Resolved in round 2** |

Non-blocking notes (no action required for this ticket; worth fixing alongside CR-T-001 since the case is reopened):

- LRL-004 waits for the restore response with a fixed `delay(8000)` (line 399). `waitFor(() => restores.length > 0)` would remove the timing dependency.
- LRL-002 stops the Org run and then waits a fixed `delay(3000)` without confirming the run is inactive. The Team cases do confirm this through `stopTeamRun`. If the stop is slow, the "stopped Org run" open could see a running run.
- LRL-002 asserts "at most one" member load at open, where the Team case asserts exactly one. This is acceptable because the opened writer is asserted exactly. It is the weaker of the two, though, and the report should not present it as identical to LRL-001.
- `copyLoadedInPage` imports the app's MemberLoader module through the Nuxt dev server. That works in the dev-server mode the live cases use, and its comment says the `--desktop-instance` build cannot use it. `--desktop-instance` has only been used for the `S` cold-open cases (delegated-copies-slow-open API-11), not for the L-00x cases that call this.
- LRL-005 asserts `>= 1` reloads after the resume. The rule's expected count is one reload. `=== 1` would also catch a repeated reload, the issue CRR-001 missed in source.

## Round 2 Recheck (CRR-009)

Scope: `d8d99351b3` (`large-runs-load-less-cases.mjs`, +15/−8) and the round-4 evidence. This round rechecks only CR-T-001 and the notes acted on.

| Item | Result | Evidence |
| --- | --- | --- |
| CR-T-001: LRL-004 asserts the reason | Resolved | `r.expectedReason` = `<damaged file basename>:line <damaged line> is not valid JSON`, built from the damage the test itself wrote (`r.damaged`), not from the app's output. It is asserted in four places: the server error, the desktop Team tab's unavailable text, the phone's unavailable text and the refused restore response. The length-only `reasonShown` is removed. Evidence `API-04-06-09-r4-lrl-browser-probe.json`: `expectedReason` "team_communication_messages_active.jsonl:line 2 is not valid JSON", and `phoneText` contains it. Screenshots `API-06-r4-LRL-004-{team-tab,phone}-unavailable.png`. |
| Note: LRL-004 fixed wait | Acted on | `waitFor(restores.length > 0)`. A short `delay(1500)` remains after the wait so the console error can arrive. That is acceptable, because the assertions rest on the response, not on the console. |
| Note: LRL-002 Org stop | Acted on | `waitFor` until `getAgentOrgRootHistory.is_active === false`, a real query (`collaboration-root-history.ts:40`). |
| Note: LRL-002 wording | Acted on | The header and title now say "at most the focused member (none with no selection)". The evidence JSON still has the old title, as the engineer noted. |
| Note: LRL-005 reload count | Acted on | The test now asserts exactly one reload, for the focused member, and none for any other participant. Evidence: `resumeParticipantOps` has one entry, for the lead (`1`). |
| Rerun | Pass | LRL-002, LRL-004 and LRL-005 all Pass, with `browserErrors` `[]`. |

## Follow-ups

- Follow-ups this review added: None. FU-006 (the intermittent xterm `dimensions` error that fails full hub-probe runs) and FU-001 are already recorded.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-web/tests/e2e/large-runs-load-less-cases.mjs`, `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs`, `autobyteus-web/package.json`, `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs`
- Unresolved finding IDs: None (CR-T-001 resolved in round 2)
- Recommended Recipient: `delivery_engineer`
- Notes:
  - The `copyLoadedInPage` dev-server-only note stands, as documented in the probe; the cases that use it do not run in desktop-instance mode.
  - Residuals for delivery:
    - the reload branch for a message inside the window is covered only by unit and mutation tests, not the browser;
    - FU-001 (6 base integration failures);
    - FU-004 (the composer only logs send errors);
    - FU-005 (stale interrupt-result probe);
    - FU-006 (intermittent xterm `dimensions` error; about 2 of 5 full large-hub probe runs end `Fail` although every case passes).
