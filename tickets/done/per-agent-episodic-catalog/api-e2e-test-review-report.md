# API/E2E Test Review Report

## Latest Round (CRR-006, test review round 2)

- Trigger: API-REV-003 `Pass` (95%), on code `1324c3e8f4` (IR-003, the TR-001 fix). The test change and evidence are in `393cf79297`.
- Changed durable test: `tests/e2e/memory/episodic-catalog.e2e.test.ts`. Only EC-06's `it` title and the comment at lines 649-650 changed (`git diff 63fa073eb8 393cf79297`, 5 lines). No assertion, setup or helper changed. No source changed after `1324c3e8f4`.
- Prior unresolved test-review findings rechecked:
  - TR-001: **resolved**. The implementation fix was verified in CRR-005. API/E2E's rerun confirms the real outcome: run A, with damaged `run_metadata.json`, is left out with `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE` naming `run_metadata.json` (`evidence/API-04-10-r3-excerpt.md`). The docs now state that outcome.
  - Non-blocking title and comment note: **resolved**. EC-06's title and comment now name the full damage set: team and org trees, run metadata, a non-JSON manifest.
- Rerun plan judged: rerunning by impact is sound. The delta changes only which definition `agentRuns` gives a standalone run.
  - API-00: build.
  - API-04…API-10: the E2E file, 7/7 pass (`evidence/API-04-10-episodic-catalog-e2e.log`, exit 0).
  - API-17: the remaining unit files that reach discovery, 34/34.
  - API-16: typecheck at baseline.
  - IMP-16…IMP-18 reused on the same commit.
  - The round-2 suites carried forward: none of their files reads discovery's attribution output.
- Proportional checks: unchanged from round 1. The checks below all still `Pass`.
- Result: **`Pass`**. Unresolved finding IDs: none.

## Review Meta (round 1, CRR-004)

- Review Round: 1
- Trigger: API-REV-002 `Pass` (95% confidence), with a request for proportional review of the changed durable test
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002; REQ-012, AC-003…AC-009, AC-013)
- Investigation Notes Reviewed As Context: through the design spec
- Solution Revision Record Reviewed As Context: SR-003 (design-only)
- Design Spec Reviewed As Context: `design-spec.md` § SR-003 Revision
- Supplemental Task Artifacts Reviewed As Context: `episodic-catalog-contract.md`, `follow-ups.md` (FU-003, FU-005)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-005
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-003 `Pass`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (Cases API-04…API-16, the API-15 docs note, Acceptance-Criteria Proof)
- API/E2E Revision Record Reviewed As Context: API-REV-002
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`, 7/7 E2E cases on `159286c1c1` (authoritative: round 2 run 4, `evidence/API-04-10-episodic-catalog-e2e.log`)
- Final Validation Confidence: 95% (API/E2E's figure)
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline applied: `TESTING.md` (§ Rules; § Environments, credentials and data: the real-data rule, respected; AC-010 timing reused from IMP-14). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001…SCN-004; EC-06's damaged records are a Supported Explicit Edge Scenario under REQ-012/AC-009 and DESIGN.md rule 7)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/memory/episodic-catalog.e2e.test.ts` | Added (round 1); EC-06 updated (round 2, commit `63fa073eb8`) | EC-01…EC-07 → AC-001…AC-009, AC-013, REQ-008, REQ-012 | Episodic catalogs on a real Studio server and memory folder, including restarts of the built server | 698 lines, one surface, seven ordered cases. Reviewed in full, because round 1 was never test-reviewed (it failed) |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The file header maps EC-01…EC-07 to their ACs. Each case is named by its outcome. Non-blocking: EC-06's `it` title still reads "…an older manifest and a damaged team record" and the comment at line 649 lists only T3. Since round 2, EC-06 also covers the damaged org tree, the damaged standalone metadata and the non-JSON manifest (the header comment at lines 29-35 is current). Tidy at the next touch. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Entries are compared with an `expectedEntry` built from the files on disk and the contract's rules (§2.2), not with the renderer's own output. Privacy is asserted with markers that are proven to reach the journals and the run-history summary (AC-003). Timing bounds are 60 s (QR-001). Writes are counted by inode, because each write is a rename. Warnings are matched on the code, the root or run, and the record, which is what rule 7 requires; the reason is matched only where it is stable (`is not JSON`). |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Reuses `startCollaborationHarness`, `callTool`, `segment`, `until` and `builtServerLaunchEnvironment`. Local helpers (`parseCatalog`, `listing`, `turn`, `expectedEntry`, `settled`, `warningsOf`) each serve several cases. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Disposable HOME and data folder; unique suffixes; `afterAll` restores permissions, HOME and the server. The cases are ordered and share runs on purpose: a user journey across restarts, stated in the header. Timing waits (`settled`, 40 s windows, a 2-rewrite cap for the burst) match the production debounce. `warningsOf` cuts at the first `}`, which is harmless here: the root and record print before the reason, and only stable prefixes are asserted. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | One surface, with sections for the helpers, the built-server process and the cases |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The suite skips only when its documented gate (`RUN_AGY_FAILURE_E2E=1` plus the scripted CLI) is off. Nothing duplicates the unit tests: these cases run through the real server. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | EC-06's added assertions match API-09 and the evidence excerpt `API-04-10-r2-excerpt.md` |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Each case realizes SCN-001…SCN-004. EC-06's damage (truncated tree, metadata and manifest files) is AC-009's own precondition. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Real Agent, Team and Org roots; delegation tools; Project Tasks; GraphQL archive and delete; built-server stop and start. Only the external AGY CLI is scripted. EC-06 asserts the *real* outcome for a standalone run with damaged metadata: it is left out with `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE`, because its history row is never offered (lines 32-33, 659-662, 682-684). |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 | EC-06 (damaged standalone metadata) shows a source branch that cannot be reached: `run-folder-discovery.ts` `agentRuns` attributes a run by its history row when its metadata is missing or unreadable. The comment at `:255`, the unit case `agents/row_only` (`run-folder-discovery.test.ts:151-154, 191, 244-245`) and `agent_episodic_catalog.md:81-82, 88` all present this as a behavior. | Rows reach discovery only through `AgentRunHistoryCatalogService.listCatalogRows`, which keeps only admitted runs (`agent-run-history-catalog-service.ts:141`). A standalone run is admitted only when `readMetadataState` is `present` (`root-run-package-current-validator.ts:146-154`), and present metadata always names `agentDefinitionId` (`agent-run-metadata-store.ts:118-127`). So `?? optional(row?.agentDefinitionId)` never decides anything. The `row_only` unit case fakes a row offered for an unadmitted run, a setup real use never produces. EC-06 shows the real outcome: run A, which has a history row, is left out. The docs, which REQ-013 makes the readers' source for these rules, tell agents the opposite. | Implementation: (1) in `agentRuns`, take the definition from the metadata only. Present metadata → `attributed`; unreadable → `unreadable`; missing → `unattributed`. Remove the row fallback for the definition and the `:255` comment. The row still supplies the name, workspace and created time for admitted runs. (2) Replace the `row_only` unit case with the real shape (no row offered for an unadmitted run) or drop it. (3) Correct `agent_episodic_catalog.md:81-82, 88`. (4) Record in the handoff that this departs from the SR-003 decision-1 wording, with the reason: unreachable, Principle 7. Observable behavior and memory search's `MemoryRun` do not change. | `Local Fix`: `implementation_engineer` (dead code and claims in files this change touched, made explicit by IR-002; Core Principle 7) |

The fallback itself predates this ticket (`memory-search/runs/memory-run-discovery.ts:131` at `2b73308ce5`). IR-002 turned it into a stated behavior, in the code comment, the docs and a unit test, so it belongs to this ticket (ticket-scope: dead code in touched files).

## Follow-ups

- Follow-ups this review added: None (FU-003 and FU-005 from API/E2E noted; unchanged)

## Latest Authoritative Result

- Result: `Pass` (CRR-006, test review round 2). Round 1 (CRR-004) was a `Fail` on TR-001, now resolved.
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/e2e/memory/episodic-catalog.e2e.test.ts` (in full in round 1; the round-2 delta is EC-06's title and comment)
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes: carried for delivery, not findings:
  - AC-010: a server start on the founder's real data is his check; TESTING.md's real-data rule and his approval plus a backup are delivery gates.
  - The cost of Task-title lookups on real data is not measured.
  - CF-14: the record label for package-level diagnostics.
  - CF-15: AC-010 timing measured under high load.
  - FU-003, FU-004 and FU-005 stay outside the ticket.
