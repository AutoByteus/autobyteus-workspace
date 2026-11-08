# API/E2E Test Review Report — small-follow-ups-batch-426 (autobyteus-426), round 1

## Review Meta

- Review Round: 1 (proportional test-code review after a passing API/E2E run)
- Trigger: API-REV-002 Pass (head `629be0a501`; product `d115f1601d`, last code commit `c8b4b659cd`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-008)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (E-03 corrected, SR-008)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-008)
- Design Spec Reviewed As Context: `design-spec.md` (SR-008)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001…FU-003)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-005)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-004)
- Original Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/code-review-report.md` (CRR-005 Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Coverage Investigation: `api-e2e-coverage-investigation.md` (§ Round 2 Rerun Plan)
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (Cases rows "(r2)", Acceptance-Criteria Proof)
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass (API-REV-002)
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline applied: `TESTING.md`. Applied here: § Test layers (renderer behavior the phone also offers is proven on the phone bundle with a `test:e2e:mobile-shell` case); § Rules 2 (isolated instances only), 6 (assertions first) and 9 (find the cause; a cause in the test is a labelled baseline-fix commit). No conflict with this skill, and no rule that no longer matches the repository.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (`903387bc78`, `629be0a501`) | MSP-19 (REQ-001/AC-001), MSP-13 (REQ-002/AC-002), MSP-18 (REQ-002/AC-003), MSP-07 (REQ-008/AC-008 phone), MSP-17 (REQ-019/AC-019), MSP-12 (SR-008: the poll sends no credential check); the browser-error policy | The phone bundle against a probe-owned node, one case per behavior | The app-wide `KNOWN_BROWSER_LINES` feed exemption is removed. It is replaced by per-case expected lines and an FU-003 exemption tied to the exact failed request. MSP-16 in the base diff is 427's (merged), not this ticket's |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` | Updated (`903387bc78`) | REQ-008 (API-AGG went stale against it) | Project Task HTTP boundaries | The missing unregistered path is now asserted refused (`WORKSPACE_PATH_REFUSED`, `missing`) and not created. The aggregate checks use a real folder, so the test's intent ("registration is not mkdir"; registry and records preserved) is kept |
| `autobyteus-web/tests/e2e/fresh-run-auto-approval-probe.mjs` | Updated (`023a9a3ff9`, baseline fix) | REQ-010 (B04 run) | Fixture GraphQL answers | Answers `GetProjects` (Projects always on since `0fd2656528`). Cause in the fixture |
| `autobyteus-web/tests/e2e/node-vocabulary-probe.mjs` | Updated (`898fbd2a31`, baseline fix) | REQ-011 (NVP-05 run) | Two-node vocabulary probe | Nodes are started with `AUTOBYTEUS_ALLOWED_ORIGINS=<window origin>` (the 403 origin gate, as a user allows such a window). The Memory page's one-source state (no select) reads as `['local']` |
| `autobyteus-server-ts/tests/e2e/runtime/agy-skill-update-notice-{roots,transport}.e2e.test.ts` | Updated (`0bce7bac01`, baseline fix) | none of this ticket's behavior; found in a gated run | Skill-update notice text | Expects 320's inline-code text. Cause in the tests |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each new case carries a header line (ID, ticket, decision) and a numbered step comment. Assertions are collected as `[ok, label]` pairs whose labels name the AC |
| Assertions prove approved requirements, not incidental details | Pass | MSP-13: pairing screen and stored session removed, on both the open phone's Check and a later start (AC-002). MSP-18: the exact bar text, banner text, `data-connection`, credential kept, the on-again rows and off → down "Can’t reach" (AC-003). MSP-19: zero sockets unpaired, one feed socket with `access_token` to the paired host, none after unpair, the desktop still opens it (AC-001). MSP-07: the three refusal texts and an unchanged registry, then an existing folder registers (AC-008). MSP-17: status text, no composer, nothing opened (AC-019). `credentialChecks` / `checksDuringPoll` record SR-008's mechanism as evidence |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | The cases reuse `openPhone`, `toList`, `openRow`, `rowsOf`, `pairingFor`, `phoneNet`; MSP-18's `check`, `state`, `startPhone` and `setPhoneAccess` serve its five steps |
| Isolation and determinism fit the boundary | Pass | A probe-owned node, temp folders and isolated contexts (TESTING rule 2). Waits are bounded and followed by explicit assertions, and MSP-13 replaces a fixed `sleep(10_000)` with a wait on the pairing screen. One non-blocking observation in the NVP baseline fix (below) |
| Large files remain coherent | Pass | `mobile-shell-probe.mjs` is one phone-bundle surface with one case per behavior |
| No stale, duplicated, disabled or compatibility-only tests | Pass | The stale app-wide feed exemption (FU-002 of 277) is removed now that D-01 fixes its cause. MSP-07's "the node registers any path" observation and MSP-13's "recorded, outside the 401 rule" note are replaced by assertions. API-AGG no longer asserts a missing path registers |
| Coverage agrees with the investigation and the evidence | Pass | Matches § Round 2 Rerun Plan and `API-04-r2-summary.txt` (19 cases, 0 unknown browser lines) |
| Callers and fixtures exercise an independently established scenario | Pass | SCN-001/002/003/008/014 from the requirements. The fixtures create only real states (a real pairing, a real Org run stopped on the node, real folders) |
| Each test enters through the real trigger and follows the actor's steps | Pass | The phone acts through its own controls (connection sheet ↻, banner Check, path field, unpair dialog, file links). The node-side triggers are the owner's real endpoints: `DELETE /remote-access/devices` (revoke) and `PUT /remote-access/settings` (the Phone Access switch). Node down/up uses the probe's stop/start. Nothing mutates hidden state |

Non-blocking observation (not a finding): `node-vocabulary-probe.mjs` `memorySources()` concludes "one source" from the select's absence after a 10 s wait plus 1.5 s. NVP-05 asserts exactly `['local']`, so a source list that rendered later than that would pass falsely. On a local two-node stack the list loads within the page's first read, so this is deterministic enough for this probe. If the Memory page ever exposes a "sources loaded" marker, waiting on it would remove the time bound.

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-003 (the phone bundle's `localhost:8000/health` check) was added by API/E2E and stands.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`; `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts`; baseline fixes in `autobyteus-web/tests/e2e/fresh-run-auto-approval-probe.mjs`, `autobyteus-web/tests/e2e/node-vocabulary-probe.mjs` and `autobyteus-server-ts/tests/e2e/runtime/agy-skill-update-notice-{roots,transport}.e2e.test.ts`
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: Medium / High is unchanged. Residuals for delivery: AC-004b (run screens) is round 2 (DEC-013, `Needs user`); the connection sheet reads "Not reachable" while the bar reads "Phone access off" (as designed); signing, notarization and other-OS builds need the release runner; FU-001…FU-003 stay outside the ticket.
