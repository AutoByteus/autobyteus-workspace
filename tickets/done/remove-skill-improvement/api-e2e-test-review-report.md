# API/E2E Test Review Report

Ticket `remove-skill-improvement` (autobyteus-205). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-improvement`, branch `codex/remove-skill-improvement`, head `4b12567b9a`. The test code is in `d21842c77b`.

## Review Meta

- Review Round: 1
- Trigger: API/E2E pass (API-REV-001) from `/software_engineering_team/api_e2e_engineer`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (BEH-001..005, AC-003, AC-004)
- Investigation Notes Reviewed As Context: not reopened
- Solution Revision Record Reviewed As Context: via the design spec (SR-004)
- Design Spec Reviewed As Context: `design-spec.md` (DS-001, DS-003; shape inventory F-1..F-8b)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-004 and FU-005, added by API/E2E)
- Architecture Review Revision Record Reviewed As Context: N/A for this bounded review
- Implementation Revision Record Reviewed As Context: IR-001 (no source change since CRR-001)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass. The SIR cases pass. The full probe regression passes 19/20, with DCP-003 recorded as FU-005. `projects-feature-probe` passes 17/17.
- Final Validation Confidence: 95.0%
- Prior unresolved test-review findings rechecked: none
- Project testing guideline applied: `TESTING.md`, sections "Browser probes" and "Environments, credentials and data". The changed tests follow it:
  - the probe owns its stack, data root and HOME;
  - runtimes are scripted;
  - the data is synthesized, using the server fixture module's shapes;
  - assertions are on DOM, state, API and file contents, with screenshots only as support.

  No conflicts were found.
- Supported Product Scenario Basis Confirmed: `Yes`. SC-1 (upgrade start, BEH-005), SC-2 (`send_message_to`, BEH-003) and SC-3 (no feature UI, BEH-001/002/004), as established in CRR-001.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs` | Added | SIR-001 (BEH-003), SIR-002 (AC-003, AC-004; BEH-001, 002, 004, 005) | Browser journeys for the removal: messaging by run ID and the upgrade around real runs | 357 lines, one coherent surface; the header documents both cases |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated | — | Registers the module; adds a `restartBackend(label, between)` hook and header lines | No existing case changed |
| `autobyteus-web/package.json` | Updated | — | `test:e2e:skill-improvement-removal` | Matches sibling scripts |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Two cases with titles stating the BEH/AC and the expected outcome. Step comments name the fixture shapes (F-1..F-6) |
| Assertions prove approved requirements | Pass | <ul><li>SIR-001 checks the exact result codes (`DELIVERED`, `TARGET_AGENT_RUN_NOT_ACTIVE`, `TARGET_IS_TEAM_RUN` naming the coordinator) and receipt in the target's stored traces and projection.</li><li>SIR-002 checks the ledger (`SUCCEEDED`, attempts 1), that every feature path is gone, that every other file under the data root is byte-identical, that the real history rows are unchanged and the helper rows gone, and that `.env` returns to its exact bytes.</li><li>A second start writes nothing.</li><li>The UI checks: the Agents page keeps the Self-Evolver, the Memory page has no helper, Basics has no card, Advanced has no retired key and refuses re-adding one, and the existing run's and Team member's composers have no CTA.</li><li>Both runs resume on their own conversation (scripted `--conversation`).</li></ul> |
| Fixtures and helpers reuse meaningful repetition | Pass | SIR-002 imports the server's `skill-improvement-data-fixtures.ts` (`put`, `historyRow`, `snapshot`, `without`, run ids), so the probe writes the same shapes the migration's unit and e2e suites use. Local helpers (`startChat`, `startTeamRun`, `receivedBy`, `featureTraces`) remove repetition |
| Isolation and determinism | Pass | Uniquely tagged definitions per case; condition-based waits; writes happen only while the backend is down (`restartBackend`); the data root and database belong to the probe |
| Large files coherent and navigable | Pass | Two cases on one surface |
| No stale, duplicated, disabled or compatibility-only tests | Pass | Nothing disabled; no existing case changed |
| Coverage agrees with the investigation and evidence | Pass | Cases API-15..API-17 match the investigation. `API-15-17-probe-evidence.json` holds the recorded `r.*` fields; `API-17-SIR-002-data-root-after.json` holds the deleted, changed and counts lists |
| Callers and fixtures exercise an established scenario | Pass | BEH-003 and BEH-005 come from the approved requirements; the probe reproduces them |
| Each test enters through the real trigger and the actor's steps | Pass | Real runs are made in the UI. Messages are real `send_message_to` / `delegate_task` calls typed in the composer. The upgrade state is the real pre-upgrade state: the old build's data shapes are written with the backend stopped, and the 20261020 ledger row is removed because an older build never ran it. Settings are edited through the Settings UI. The UI selectors are real hooks: sidebar rows carry `data-run-id`, and the removed CTA used `data-test="skill-improvement-composer-cta"`, so the absence checks are not vacuous |

## Findings

None.

Minor, non-blocking observations (no action required):
- SIR-001 asserts `accepted` for the Team-copy coordinator and the Team member, and records their result codes in `r.toCopyLeadCode` and `r.toMemberCode` without asserting `DELIVERED`. Receipt in the target's traces is asserted, which proves delivery.
- SIR-002 inserts the three `.env` keys between the first three lines of the probe's own `.env`, assuming it has at least three lines. That holds for the probe-owned file.

## Follow-ups

None added by this review.

FU-004 (six stale fixture-page probes) and FU-005 (intermittent DCP-003 re-read after Save, root cause not established) were added by API/E2E. I checked both against ticket scope:
- **FU-004:** each cause is pinned to a later product change in other features; the failing fixtures and product code are not in this ticket's diff. This ticket's edits to those probes only removed dead mock handlers. Its own signal from them holds: the recorded traffic has no request for the removed query.
- **FU-005:** the failing path (`existingRunConfigEditActions` → `agentOrgContextsStore.readRunConfig`) is not in this ticket's diff. It passed in three reproductions, two of them with error logging. No acceptance criterion depends on it.

Both are follow-ups, not this ticket. Following the updated skill, they are recorded in `follow-ups.md`, not sent by this role.

- Sent to: `None` (the Solution Designer sends the ticket's follow-ups)

## Round 2 (API-REV-002, after the INT-001 merge)

- Trigger: API/E2E round 2 on merge `5cfccd66c7` and Secret Gate entry `bda3731947`; head `8d2dba3b72` (API-REV-002, Pass, confidence 95.0%).
- Changed durable test scope: none. `git diff --name-only 2147206408..8d2dba3b72` lists only `tickets/` files. The round reran the existing suites and the full browser regression. SIR-001 and SIR-002 pass with the same values, and Basics shows base's Update checks card with no Skill Improvement trace.
- No durable test file changed: `Yes`. Review result: `Not Applicable`.
- Follow-ups updated by API/E2E in `follow-ups.md`, each checked against ticket scope:
  - **FU-005** now has an established cause (`API-15-r2-org-save-reread-cause.txt`). Right after `UpdateDelegatedLaunchSelections` returns, the Org stream reconnects (`CONNECTED`, then `ROOT_EXECUTION_VIEW_SNAPSHOT`, which replaces the Org view) while the post-save `AgentOrgRunConfig` read is in flight. `readRunConfig` then reports "stale; refresh required". The Save itself is stored.
    - The path (`agentOrgContextsStore`, `existingRunConfig*`, the Org stream and the delegated-launch command) is not in this ticket's diff, and no acceptance criterion depends on it, so it is a follow-up.
    - Note for the Solution Designer when sending: it is user-visible ("Settings were saved, but could not be refreshed") in the delegated-copy Settings flow. It was seen 1 in 4 runs in round 1 and 3 in 6 now, and it also hits DCR-003. Not urgent by the definition (no data loss or security), but worth an early slot.
  - **FU-006:** `projects-feature-probe` PT-E2E-013 expects no match, but base's meaning-search tier now returns similar tasks. A stale expectation from a base feature; follow-up.
  - **FU-004:** the same causes as before, plus base's new `/ws/update-notifications`, which the fixtures don't serve.

## Latest Authoritative Result

- Result: `Not Applicable` (round 2: no durable test changed). Round 1: `Pass`.
- Changed durable test paths reviewed: none this round. Round 1 reviewed `skill-improvement-removal-cases.mjs`, `delegated-launch-defaults-probe.mjs` and `autobyteus-web/package.json`.
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: `CRR-004`. The classification Large / High is preserved. Source review is current at CRR-003 (merge `5cfccd66c7`).
