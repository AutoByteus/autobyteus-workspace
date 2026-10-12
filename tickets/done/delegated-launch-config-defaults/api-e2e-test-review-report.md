# API/E2E Test Review Report

## Review Meta

- Review Round: 3 (targeted: extended browser probe, API-REV-003)
- Trigger: API/E2E pass (API-REV-002, TR-001 fix) from `/software_engineering_team/api_e2e_engineer`. Round 1 trigger: API-REV-001
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002 baseline)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-004)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: N/A — not applicable
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-002)
- Original Code Review Report: `code-review-report.md` (CRR-002, `Pass`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002, API-REV-003)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 96% (API-REV-003)
- Prior unresolved test-review findings rechecked: TR-001 (resolved in round 2; the spec is unchanged since checkpoint `a33d8ad66`)
- Project testing guideline(s) applied: root `TESTING.md` (recorded by the coverage investigation). Known discrepancy: line 105 says SDK `dist/` is untracked, but the stream-contract `dist/` is tracked; this was already recorded. No conflict with this skill's rules.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-007; the mobile stale-seed guard serves the supported "user switches Team while seeding loads" action accepted in ARCH-REV-002)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts` | Added (uncommitted) | SCN-001..SCN-004, SCN-006; AC-001..AC-009, AC-015 shape; AR-002 | Server E2E of delegation/bring-in launch resolution in Agent, Team and Org roots through real HTTP/GraphQL/WS and scoped MCP tools | Gated (`RUN_AGY_FAILURE_E2E`); one coherent surface; 642 lines are acceptable |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Added (checkpoint `a33d8ad66`); extended in round 3 (uncommitted, +431/−169) | SCN-001..SCN-007; AC-001, AC-003..AC-013; AR-002 (DLP-001..007) | Browser probe that owns its stack. Every run is started, driven, stopped and reopened through the UI; readback through GraphQL is used for assertions only | Header lists the cases. Round 3: runs 8 and 9 each pass 7/7 with no browser errors and a cleanup receipt (reviewer-checked: run-9 evidence summary 7/0, `browserErrors` 0, temp root removed). `node --check` OK |
| `autobyteus-web/package.json` (`test:e2e:delegated-launch-defaults`) | Updated (uncommitted) | — | Probe entry point | Follows the existing `test:e2e:*` pattern |
| `autobyteus-web/components/mobile/__tests__/MobileRunSetupMemberSeeding.spec.ts` | Added (uncommitted) | SCN-005 (mobile), AC-011; DS-006 mobile guard | Mobile setup controller seeding and the stale-seed drop | See TR-001 |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs (DLC-001..008, DLP-001..004, MOB-001) map to the ACs in the headers and the `it` titles |
| Assertions prove approved requirements instead of incidental implementation details | Pass (with a note) | Server: exact recorded launches and sources, exact `launch_notes` text, runtime proof by Grok session and AGY `--model`. Probe: DOM, data attributes and a server readback of the launched run. Minor: the probe identifies member rows by the `pl-9` CSS class (incidental; non-blocking) |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Shared helpers (`startRoot`, `delegateTeam`, `squadFallbacks`, `noteText`, `assertSquadRows`); existing E2E helpers reused |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Server and probe own their temp data, HOME and ports and clean up; runs were 3/3 and 4/4 ×2. The three server roots run in parallel; Grok attribution is backed by the per-member conversation marker (`alpha.txt`) and the AGY argv run IDs. MOB-001: round 2 gate releases every held load; `beforeEach` resets it |
| Large files remain coherent and navigable | Pass | Each file covers one surface |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests | Pass | The suite gate skip is explicit and documented |
| Coverage agrees with the coverage investigation and execution evidence | Pass | Round 2 mutations M0..M3 (API-REV-002): removing both stale-seed guards fails the switch case. The two guards are redundant, so removing only one is not detected; recorded by API/E2E, and acceptable because the behavior (the drop) is proven |
| Test callers and fixtures exercise an independently established supported scenario | Pass | DLC-006's model retirement (fixture catalog change) is a supported operational event that makes the inherited layer unusable (AC-006). DLC-008 strips its own test-owned saved tree to the pre-change shape, which is the AC-009 verification intent ("fixture of the current shape") |
| Each test enters through its scenario's real trigger and follows the real actor's steps | Pass | Agents call the real `delegate_task`/`send_message_to` via the scripted CLI; the probe drives the real UI; the mobile spec mounts `MobileRunSetup` and selects Teams through its controls |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 (**Resolved, round 2**) | `MobileRunSetupMemberSeeding.spec.ts`, case 2 "a seed that resolves after the user switched to another Team is not applied to it" (MOB-001) | The `startModelCatalog` mock keeps a single `catalogGate.release`. Software Team has two members with complete defaults (reviewer `model-b`, unoffered `not-offered`). `usableStartCandidate` therefore calls `ensureCatalog` twice while the gate is held: the second call overwrites the first resolver, and the first promise never settles. `seedMemberLaunchDefaults` awaits both (`Promise.all`), so the seed never resolves, and the assertion "no overrides on team-2" holds whether or not any stale-seed guard exists. Reviewer probe (a temporary copy of the spec, removed afterwards): same held gate, `release()` **without** switching Teams → team-1 draft overrides stayed `{}`. The seed never applies, so case 2 is vacuous | 1. Make the gate release every held `ensureCatalog` call (for example, collect the resolvers in an array and release all).<br>2. Prove the gate works by a positive control: the same held-then-released path without a switch applies the reviewer seed. This can be a separate case or an assertion.<br>3. Keep the switch case, so the drop is shown for a seed that actually resolves.<br>4. Re-run the spec. Optionally re-check by removing the stale-seed guard in `useMobileRunSetupController.seedTeamMembers` together with the `applySeededMemberDefaults` draft check: the switch case should then fail. Restore both afterwards.<br>**Round 2 resolution:**<br>- The gate collects all held resolvers (`pending`) and `releaseAll()` settles them.<br>- New positive control: held, nothing applied, released while the same Team is selected, then `model-b` is applied.<br>- The switch case asserts `pending.length > 0`, then switches, then releases, and team-2 has no overrides.<br>- M3 (both guards removed) fails the switch case.<br>- Reviewer re-run: 3/3 pass | `Local Fix` / `/software_engineering_team/api_e2e_engineer` |

Round 3 probe review (API-REV-003), by check:
- **Real trigger.** Runs start from New chat and the Org launch page. The user types the scripted `CALL_TOOL` into the composer, which stands in for a model's tool call, as TESTING.md describes for the scripted AGY. Copy members are opened from the sidebar. The default edit (DLP-007) goes through the Agents editor, and the stop goes through Settings.
- **Valid premises.**
  - DLP-005 retires the root model through a probe-owned `agy models` file. A provider retiring a model is a supported operational event, and it is the AC-006 premise; this mirrors DLC-006.
  - DLP-006 stops the backend, strips its own probe-owned saved trees to the pre-change shape, and restarts on the same data root. That is the AC-009 upgrade path, and the verification intent is a "fixture of the current shape".
- **Requirement proof.**
  - The five `launch_notes` strings and the bring-in notes match the server renderer exactly.
  - The no-repeat checks cover the extra copy, the teammate and the reused helper (AR-002).
  - The runtime is proven by the Grok `alpha.txt` reply plus an empty AGY argv for that run.
  - The Settings rows cover all seven Squad members, including the badsettings and incomplete reasons.
  - DLP-007 checks recorded values before and after the reopen.
- **Ordering.** DLP-007, which edits a definition, runs last. DLP-005 restores the model list. DLP-006 replaces the `backend` handle, and both processes are in `owned` for cleanup.
- **Note (non-blocking).** In the conversation, AC-005 is observed through the scripted actor's `CALLED:<result>` echo. That proves the delegating agent received the notes and that they render in the conversation. The real tool card's Result showing `launch_notes` is covered by the ISO-001 desktop journey (O-1: collapsed raw JSON), so no change is needed.
- **Note (non-blocking).** `callFromComposer` picks the newest `CALLED:` segment by index across all `main` regions. A mis-split would make the probe fail, not pass falsely, so this is acceptable.

Non-blocking notes (no action required):
- The probe treats `pl-9` as the "member row" signal. A data attribute would be sturdier if the probe is touched again.
- Probe DLP-002 reads the Org run ID from one of three URL parameters (`runId ?? rootRunId ?? orgRunId`). This is tolerant but slightly imprecise.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `delegated-launch-config-defaults.e2e.test.ts` (unchanged since round 1), `delegated-launch-defaults-probe.mjs` (round 3 extension), `autobyteus-web/package.json` (script), `MobileRunSetupMemberSeeding.spec.ts` (round 2)
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - The round 3 probe extension passes the proportional checks.
  - The probe changes are uncommitted on top of checkpoint `a33d8ad66`; delivery must stage them explicitly.
  - Earlier non-blocking notes (`pl-9` rows, the Org run ID read from URL parameters) remain as they are.
