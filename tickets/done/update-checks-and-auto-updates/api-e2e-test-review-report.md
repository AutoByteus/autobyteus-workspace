# API/E2E Test Review Report — update-checks-and-auto-updates

## Review Meta

- Review Round: 1
- Trigger: API/E2E engineer's pass of API-REV-001, 2026-10-24 (validated code `985246c53b`; test commits `821563587d`, `baff097813`, `5faba271f5`; reports and evidence `fe1fa411d3`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-005)
- Investigation Notes Reviewed As Context: as cited by the design spec (unchanged since CRR-001)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-005)
- Design Spec Reviewed As Context: `design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: UI/UX spec (`5f5fb4c`), as in CRR-001
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-002 (unchanged)
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 94.7% (no category below 93%; bounded gap as API/E2E records it: real git-endpoint throttling not inducible, the app schedule's busy/offline skips by Electron tests only, the skill-update notice after an automatic skill update not re-run live)
- Prior unresolved test-review findings rechecked: None (first test review of this ticket)
- Project testing guideline(s) applied: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/TESTING.md` (test layers; Rules 1–9, including Rule 9 for the baseline fix). No conflict with this skill's rules.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-011; RSC-001 for the wait read is covered by IMP-13 and API-36)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` | Updated (rewritten to SR-005) | SCN-001..009; REQ-001..009, 011, 017; AC-001..011, 017, 022 (node side) | The GitHub kinds' check and automatic-update lifecycle at the real server boundary | Same structure as 209's suite (one ordered journey, one data root); the type-graphql once-per-process schema build kept (FU-004 of 209) |
| `autobyteus-server-ts/tests/e2e/update-notifications/agent-runtime-update-notifications.e2e.test.ts` | Added | SCN-010, SCN-011; REQ-020..022; AC-018..020 | The runtime kind on the desktop's embedded node: background check, panel Update refusal/success/failure, automatic update waiting then applied | Scripted CLIs and controlled vendor sources; `Math.random` pinned to 0 only during server start |
| `autobyteus-server-ts/tests/e2e/helpers/github-head-read-stub.ts` | Added | REQ-002 transport | GitHub's answer shapes for the head read and the Codex release redirect, shared by six stubs | Matches `git-ls-refs.ts`' parsing and GitHub's real shape (AF-08) |
| `autobyteus-server-ts/tests/e2e/helpers/agent-runtimes-e2e-harness.ts` | Updated | REQ-020 | Codex source stub answers the release redirect | — |
| `.../agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts`, `.../agent-definitions/agent-packages-graphql.e2e.test.ts`, `.../skills/github-skill-sources-graphql.e2e.test.ts`, `.../skills/skill-name-catalog-graphql.e2e.test.ts` | Updated (stubs only) | Existing behavior under the new transport | Their stubs answer the head read; placeholder revisions became 40-hex SHAs | Assertions unchanged |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` | Updated (baseline fix `baff097813` plus the redirect stub) | Existing RA-04 | RA-04 presses Check again until the newer release shows | Cause stated: RA-03's post-update re-check (AR-006) stays checking until the sign-in is read; a Check meanwhile skips the row. Fails 2/5 on the base |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each case names its API ID, AC/REQ IDs and the behavior; headers say what is real and what is controlled, and give the run command |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Exact GitHub request lists per phase (one `POST … git-upload-pack` per due source, no REST, no codeload outside updates: REQ-002, QR-001); record states and outcomes (DS-008, REQ-008/009); installed file contents (local edit and added file gone: REQ-007/AC-008b); persisted `{ api, web }` gate and `githubWaitUntil` across a restart (REQ-004); refusal codes (AC-002, AC-019); no app-server start in background checks (AR-007) |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | New `github-head-read-stub.ts` replaces six copies of answer shapes; runtime harness reused; renderer documents loaded, not copied |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Temp data roots, env saved and restored, singletons and gate reset. Time bounds use the design's upper limits (36 min = 30 + 5 max spread; 19 min = 15 + 3 max). Pinning `Math.random` to 0 only while the server starts makes the first tick exactly 60 s so the fake clock never runs past the vendor commands' timeouts; the spreading rule itself is covered by `update-pass.test.ts`. Runs: 12/12 × 3 (live suite); runtime suite stable after the pin |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The live suite (≈570 lines) is one lifecycle of the GitHub kinds; the runtime kind has its own file because it needs the embedded-node process setting |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The stale 209 suite is rewritten (C-07 of CRR-001 resolved); the 209 `{ blockedUntil }` file is kept only as the API-12 input proving the tolerant reader |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Matches the execution report's case rows (API-02..12, 17, 18, 20..22) and API-01 for the existing suites; mutation controls recorded (pass ignoring the switch fails 10 cases; ignoring running agents fails API-21/22) |
| Test callers and fixtures exercise an independently established supported scenario | Pass | Every case follows a requirements scenario; the 503 + `retry-after` throttle is the design's `web` family rule (AC-004) |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps | Pass | Background passes fire from the real scheduler timer; user actions go through the renderer's GraphQL documents; the running agent is a real agent run on the scripted Codex app-server; restarts close the server and start a new one on the same data root |

Notes (not findings):
- RA-04's loop models a user pressing Check again; the pre-existing race it works around (a Check during a post-update re-check is skipped) is old product behavior outside this ticket and was not recorded as a follow-up by API/E2E; it is minor and unchanged by this ticket.
- The live suite's API-11 resets the package interval to 30 at its end, which later cases rely on; the dependence is in order and stated by the journey structure.

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the nine files listed above, at `5faba271f5` (with `821563587d`, `baff097813`)
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: no `src` file changed after the reviewed code `985246c53b`. Product observation from API/E2E (not a defect): a remote node's card keeps the line "Automatic updates: GitHub downloads and each runtime's own update command", as in the approved VIS-037.
