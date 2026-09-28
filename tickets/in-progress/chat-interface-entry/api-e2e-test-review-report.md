# API/E2E Test Review Report — chat-interface-entry

## Review Meta

- Review Round: 1 (the first proportional test-code review for this ticket)
- Trigger: API/E2E Pass, API-REV-002 (api_e2e_engineer), at HEAD `e5eac067d` with uncommitted durable test changes
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003 intended behavior)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-010)
- Design Spec Reviewed As Context: `design-spec.md` (SR-010; D-13, D-14, D-15; validation cases V-A..V-E)
- Supplemental Task Artifacts Reviewed As Context: R2 `ui-ux-spec.md` (UXJ-007 for C05)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-006)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001..IR-003)
- Original Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md` (CRR-003, Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`, with the round-2 delta
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (round 2, authoritative)
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: None. CR-001 (a stale mock, originally a source-review cleanup) was checked here as a durable test change.
- Supported Product Scenario Basis Confirmed: `Yes`. Every probe case exercises a scenario already established upstream: SCN-001..SCN-009, D-04/D-13, D-08, D-14 (the resend path), D-15 V-A/V-B/V-D/V-E, RSK-005, and the REQ-007 seed lifecycle.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` | Added | AC-001..AC-013, AC-016/AC-017; D-08, D-13, D-15 (C14/C15); RSK-005; REQ-007 seeding (C13) | One live Chat-entry journey suite (C01–C15): real Chrome → Nuxt dev → built server → a real runtime | 586 lines; follows the existing `tests/e2e/*-probe.mjs` convention |
| `autobyteus-web/package.json` | Updated | — | Adds the `test:e2e:chat-entry-live` script | Matches the sibling `test:e2e:*` probe scripts |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Updated | Removal plan (CR-001) | Removes the stale `createDraftRun` mock of a removed API | One-line removal; the spec's 2 baseline failures are unchanged |

- No durable test file changed: `No`
- Removed paths: none.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | `defineCase(id, title, fn)` titles name the journey and the governing IDs (for example, "D-15 Rule 1 (V-D)…"). The D-15 helpers (`startChat`, `dispositionLogged`, `terminate`) are grouped with an explanatory comment. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Assertions target observable outcomes: URL shape (D-13), server-side content and summary (REQ-008, AR-005), resume config (D-08), the link realpath and holder lifetime (D-15), the user folder left intact (Rule 1), and uniform team config (REQ-010). See advisory A-1 for one weak spot. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `writeSkill`, `writeAgent`, `newChat`, `pickModel`, `openFolder`, `startChat` and `runConfig` are shared. The fixtures (global, bundled, disabled, and shadowing private skills) are built once. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Owned `mkdtemp` root, free ports, sanitized env, `prisma migrate deploy` on a private DB, and process-group teardown in `finally`, with the root removed unless `--keep`. Live LLM replies are waited on for exact markers with bounded timeouts. The fixed delays (C05 5 s, C15 V-E 2 s) are proportionate for a live probe. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | One surface (Chat entry), grouped as infrastructure, then page helpers, then cases, then the runner. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | CR-001 removed the stale mock. No skipped or disabled cases. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | C01–C15 match the coverage report (CE rows; the C14/C15 runtime matrix) and `round2/probe-*` evidence. `node --check` passes. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Fault injection in C07 (`PrepareAgentRun` rejected once) reproduces the design's supported D-04 alternate. The C14/C15 fixtures reproduce the design-listed D-15 cases. |

## Findings

None blocking.

Advisory notes (no action required for delivery; worth folding in the next time the probe is touched):
- **A-1 (C14, the strong side of V-D):** the configured-agent failure is asserted by the generic "An Error Occurred" text. `strongError` is captured in the evidence but not matched against the collision cause, so an unrelated failure would also pass that step. The deterministic proof exists in the server unit test "a configured request still fails fast on a user-owned entry (V-D)", and the recorded evidence shows the collision message. A later tightening would assert `/collision|already exists/` on `strongError`.
- **A-2:** the header comment (L13–L14) says C14/C15 need Codex/Claude only. The code also supports Grok (both cases) and AGY (C14). C05/C06/C09/C11 depend on state from C03/C04; the usage line could say so (the documented repro command already includes the prerequisites).
- **A-3:** inside C14, the local `owned` shadows the module-level `owned` process list. It is harmless (block scope), but renaming it (for example, `userSkillDir`) would read better.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` (Added), `autobyteus-web/package.json` (Updated), and `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` (Updated, CR-001)
- Unresolved finding IDs: None. A-1..A-3 are advisory.
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - The durable test changes are uncommitted in the worktree and must be committed at finalization.
  - Delivery note C-12 from CRR-003 still applies: after merging the advanced `origin/personal`, add `skillRequestStrength` to the `createAgyRunCapsule` call in the upstream `tests/e2e/runtime/agy-native-image-codex-skill.e2e.test.ts`.
