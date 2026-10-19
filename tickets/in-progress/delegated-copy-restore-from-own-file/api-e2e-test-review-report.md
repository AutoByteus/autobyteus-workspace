# API/E2E Test Review Report

Ticket `delegated-copy-restore-from-own-file` (autobyteus-197). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-restore-from-own-file`, branch `codex/delegated-copy-restore-from-own-file`, head `41285241ae`. The test code is in `d2a711721d`.

## Review Meta

- Review Round: 1
- Trigger: API/E2E pass (API-REV-001, round 1) from `/software_engineering_team/api_e2e_engineer`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (AC-001..AC-004, AC-011)
- Investigation Notes Reviewed As Context: not reopened (no test depends on new investigation facts)
- Solution Revision Record Reviewed As Context: via the design spec (SR-008)
- Design Spec Reviewed As Context: `design-spec.md` (D-5, D-6, D-7)
- Supplemental Task Artifacts Reviewed As Context: none needed
- Architecture Review Revision Record Reviewed As Context: N/A for this bounded review
- Implementation Revision Record Reviewed As Context: IR-002 (no source change since CRR-002)
- Original Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass. Full probe 18/18, startup and upgrade e2e 9/9, server integration 419.
- Final Validation Confidence: 95.1%
- Prior unresolved test-review findings rechecked: none
- Project testing guideline applied: `TESTING.md`, sections "Choosing the path" and "Browser probes". The changed tests follow it:
  - a probe-owned stack and data root;
  - scripted runtimes;
  - assertions on DOM, state and API results, with screenshots only as support;
  - synthesized data, seeded through the product's GraphQL API.

  No conflicts were found.
- Supported Product Scenario Basis Confirmed: `Yes`. SCN-001..SCN-004 and AC-011(a), as established in the requirements.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs` | Added | DCR-001 (AC-001..AC-004, Team root), DCR-002 (AC-001..AC-004, Org root), DCR-003 (AC-011(a), AC-002) | Browser journeys for copies of configured placements restoring from their own files | 496 lines and one coherent surface. Shared readback helpers sit at the top |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated | — | Registers the case module and lists it in the header | No existing case changed. Unlike the SSR module, registration is unconditional, so the default full run includes DCR-001..003 (18 cases); harmless |
| `autobyteus-web/package.json` | Updated | — | `test:e2e:delegated-copy-own-file` script | Matches the sibling scripts |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One case per root or AC. Case titles state the AC and the expected outcome; step comments name SCN-003, AC-001..AC-004. One stale header line is noted under Findings (non-blocking) |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Each case asserts the product consequence: <ul><li>own-file key set, `launchSource.origin: configured` and no `taskAgent.origin` (AC-002);</li><li>the slot edited while the copy's snapshot is unchanged (AC-003);</li><li>scripted-runtime argv: the restored copy's `--model` and `--conversation` equal its own model and session, not the slot's (AC-001);</li><li>the new copy starts on the edit (AC-003);</li><li>Settings rows "As configured in this run" per copy, the app's per-agent context model and name, and the run-view projection's own conversation (AC-004, D-7);</li><li>`followsTeam` with the own auto-approve kept, and a Team-level choice reaching the follower on resume (AC-011(a))</li></ul> |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Reuses the probe's harness (`callFromComposer`, `delegatedRows`, `openMember`, `agyLaunchDetailsOf`, `teamTree`, …). Local helpers `ownFile`, `assertAgentOwnFile`, `configuredRows`, `seedOrg`, `launchOrg` remove repetition |
| Test isolation and determinism are appropriate for the boundary | Pass | Each case seeds uniquely tagged definitions through GraphQL. Waits are condition-based (`waitFor` with timeouts), not fixed sleeps, apart from short UI settles. `ownFile` asserts exactly one match in the owned data root. The probe owns its stack and data root (cleanup receipt in API-10-13 log) |
| Large files remain coherent and navigable | Pass | Three cases on one surface; the header documents each |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | No existing case changed; nothing disabled |
| Coverage agrees with the coverage investigation and execution evidence | Pass | Investigation rows API-11..API-13 match the cases. The `API-10-13-probe-evidence.json` keys for DCR-001..003 match the recorded `r.*` fields, and all three show Pass |
| Test callers and fixtures exercise an independently established scenario | Pass | SCN-001..SCN-004 and AC-011(a) come from the approved requirements; the probe reproduces them |
| Each test enters through the real trigger and follows the real actor's steps | Pass | Every action uses a real entry point: <ul><li>delegation through `delegate_task` from a coordinator's composer; in DCR-001 from a catalog copy, because CM-1 refuses root members (a real constraint);</li><li>the stop and the slot edit through the run's Settings UI;</li><li>restore through `send_message_to` by run ID;</li><li>the auto-approve override on the Org launch page.</li></ul> No hidden state is mutated. DCR-003 splits AC-011(a) across two Teams because of documented runtime constraints (Antigravity locks auto-approve; the Grok replay offers one model). Restore decides following from `followsTeam` alone (D-5, code-reviewed), so the two parts together prove the criterion |

## Findings

No blocking findings.

Non-blocking observation:

| ID | Test Path / Scenario | Evidence | Suggested Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TO-001 | `delegated-copy-own-file-cases.mjs:12`, DCR-001 header | The header still says `"+" from each copy prefills its own model`. That check was replaced by the per-agent store context during the trial runs (execution report line 14; investigation line 160), and the case has no "+" step | When convenient, change the line to describe the context check, or delete it. Comment only; nothing needs rerunning | Not a finding: it does not affect what the case proves, and the execution report records the replacement. Left to delivery's discretion at finalization |

## Follow-ups

None. The two observations in the execution report concern existing behavior outside this ticket's Scope Guardrail, and they are recorded there:
- "+" in a Team run opens a New chat for the whole Team;
- Settings row names use underscores while the sidebar uses spaces.

- Sent to: `None`

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs`
  - `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs`
  - `autobyteus-web/package.json`
- Unresolved finding IDs: none (TO-001 is a non-blocking observation)
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: `CRR-003`. The classification Large / High is preserved. The CRR-002 edits to `code-review-report.md` and `code-review-revision-record.md`, and this report, are not yet committed.
