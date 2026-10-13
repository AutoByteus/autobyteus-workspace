# API/E2E Test Review Report — delegated-copy-model-change

## Review Meta

- Review Round: 2 (targeted: API-REV-002, per-member choice in a Team copy)
- Trigger: API/E2E pass (API-REV-002, commit `15cc9632d4`) after a delivery evidence gap. Round 1 trigger: API-REV-001
- Requirements Doc / Investigation Notes / Solution Revision Record / Design Spec Reviewed As Context: `requirements-doc.md` (SR-007), `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md` (SR-007)
- Supplemental Task Artifacts: N/A — not applicable
- Architecture Review Revision Record: ARCH-REV-003
- Implementation Revision Record: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-002, `Pass`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation / Execution Coverage Report: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- API/E2E Result: `Pass`
- Final Validation Confidence: 95%
- Prior unresolved test-review findings: None. Round 1 non-blocking note: the probe header now lists DCP-002..005, so it is addressed
- Project testing guideline applied: root `TESTING.md`. Known discrepancy: line 105 on `dist/`, recorded in the earlier ticket.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-006; REQ-008 is a supported explicit edge per the requirements)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` | Updated (committed `aaf6f010f1`, baseline fix) | SR-011 guard (not this ticket) | Architecture guard | Verified: base commit `9777af682c` (an ancestor of base `a609de982a`) changed `team-run-history-index-v2-migration.ts` and `agent-package-service.ts`. The guard's intent is kept: migrations read definitions from files and never call `DefinitionService.getInstance(`. Reviewer re-run: 20/20 |
| `autobyteus-server-ts/tests/e2e/projects/delegated-copy-model-change.e2e.test.ts` | Updated (uncommitted, +DCM-005..007) | AC-002..AC-007, AC-011, REQ-006, REQ-008, DEC-001, DEC-008 | Gated server E2E of Stop, choose and resume across roots | Header lists the new cases and the run command |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated (uncommitted, +DCP-002..004) | AC-002, AC-003, AC-005, AC-011, IR-002 (live view and "+") | Browser probe through the UI | `node --check` OK. Evidence: full run 14/14, 0 browser errors (`browser-probe-full-run-1`). An earlier run had DCP-002/004 fail and was fixed on the test side only; `git status` shows no product source change |
| `autobyteus-web/package.json` | Updated (uncommitted) | — | `test:e2e:delegated-copy-model-change` runs DCP-001..004 | — |

- No durable test file changed: `No`

### Round 2 delta (`15cc9632d4`)

| Durable Test Path | Change | Related | Notes |
| --- | --- | --- | --- |
| `delegated-copy-model-change.e2e.test.ts` | +DCM-008, +`trio` Team | REQ-001 ("any member"), REQ-002, REQ-004, REQ-005, AC-010 scenario | The reviewer runs on MODEL, then only the reviewer is set to ALT2. The record is checked exactly (team null; only the reviewer chosen). The reviewer resumes with its own `--conversation` on ALT2, the lead stays on MODEL, and the never-started tester starts on MODEL. A combined Team ALT + reviewer ALT2 Save: the lead and the follower tester go to ALT, and the reviewer stays on ALT2 in the same conversation. Header updated. Evidence: 6/6, twice |
| `delegated-launch-defaults-probe.mjs` | +DCP-005, +`agyLaunchDetailsOf`, header entry | Same, through the UI (Team root) | Stop from the Settings row; only the member edited and saved. The other rows' summaries are identical before and after. The member shows the new model with no origin attribute, and the record is on the member only. Its next turn resumes its conversation on MODEL. `node --check` OK. Evidence: 2/2 targeted runs and the full run 15/15, 0 browser errors |
| `autobyteus-web/package.json` | Script runs DCP-001..005 | — | — |

Round 2 notes (non-blocking):
- DCP-005's coordinator check (`leadResume.every(model === ALT)`) would pass even if the lead never relaunched. In this flow the lead must restore to send the message, and DCM-008 asserts the coordinator's relaunch model exactly.
- API/E2E O-4 (product): after a user choice, a Team copy member's row still shows its started default's fallback note, "Agent default … was not used: …", as in the screenshot `r2-browser-probe-run-2/DCP-005-team-copy-card-member-saved.png`. The note stays true; it does not claim the member runs on the started value. REQ-005 removes only the origin text, so this is a UX follow-up candidate for the Solution Designer, not a test issue.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass (with a note) | `it` / `defineCase` titles name the ACs. The server E2E header lists DCM-005..007. The probe header's Cases list still ends at DCP-001 (see the notes below) |
| Assertions prove approved requirements | Pass | AC-002: `session/cancel` recorded and process liveness checked per run (the crew and its nested copy stop; the other copy keeps running). AC-003/AC-004: follower lead and never-started follower on the choice, the own-default member on its own model. REQ-006: nested copy on its started model. AC-007: a later copy on normal resolution. AC-011: `COPY_RUNNING` with no recorded choice. AC-006: `VALIDATION_FAILED`. IR-002: published events on the Team and Org views; "+" prefill without a reload. REQ-008: refusal, no launch, history kept, then the same `--conversation` on a new choice. AC-005: choice shown and used after a backend restart |
| Fixtures and helpers reuse meaningful repetition | Pass | `startRoot` generalized to three kinds; `callsFrom` / `memberCalls`; shared `chooseCopyModel` / `saveSettings` / `modelLocked` |
| Isolation and determinism | Pass | Test-owned data, HOME, fake-Grok directory and env are restored in `finally`/`afterAll`. Liveness uses `pgrep`/`lsof` filtered by run-ID paths. Server suite passed twice (5/5); probe passed 14/14 |
| Large files coherent | Pass | Each file covers one surface |
| No stale or disabled tests | Pass | — |
| Coverage agrees with the investigation and evidence | Pass | Matches the execution coverage report and ledger |
| Test fixtures exercise established scenarios | Pass | The fake Grok `cancel.jsonl` holds a real turn open (AC-002 mid-turn). `AGY_FAKE_EXTRA_MODELS` models a provider dropping a model, an operational event and the REQ-008 premise. The backend restart stands in for an app restart (AC-005) |
| Real triggers and steps | Pass | Real GraphQL Stop and Save, agents' real tool calls, a UI-driven Stop from the sidebar and Settings, the Save bar. The delegating agent's wake in DCP-004 goes through the scripted tool call over the run's WebSocket, as in earlier probes |

## Findings

None.

Non-blocking notes (no action required for this pass):
- The probe's file header `Cases:` list still ends at DCP-001. TESTING.md asks for the cases in the file header, so add one line each for DCP-002..004 when the file is staged.
- REQ-008 is proven through an agent-sent message: the refusal goes to the delegating agent's tool result and the copy's history is kept. The user-sent path ("visible in that agent's conversation") is not a durable case. The Codex resume in ISO-001 used a user message, but on the success path.
- API/E2E observations O-1..O-3 are product follow-up candidates, not test issues.

## Latest Authoritative Result

- Result: `Pass` (round 2)
- Changed durable test paths reviewed: round 1 (the baseline guard, DCM-005..007, DCP-002..004, the script) and round 2 (DCM-008, DCP-005, `agyLaunchDetailsOf`, the script)
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - Round 2 is committed in `15cc9632d4`.
  - It closes delivery's evidence gap: a per-member choice inside a Team copy, through the server E2E, the UI probe and a real Codex member (ISO-002).
