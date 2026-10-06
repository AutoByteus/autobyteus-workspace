# API/E2E Test Review Report — run-settings-ui-unification

## Review Meta

- Review Round: 1
- Trigger: API/E2E round 3 **Pass** at head `a92004c9e` (IR-005), API-REV-003, 95% final confidence
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-006)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (navigation)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-010 slices S1–S6)
- Design Spec Reviewed As Context: `design-spec.md` (SR-010)
- Supplemental Task Artifacts Reviewed As Context: Product `ui-ux-spec.md` (VIS references named by the probes)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-004)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-005)
- Original Code Review Report: `code-review-report.md` (CRR-009 Pass, plus the CRR-006/CRR-008 failure origins)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-010`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (round 3)
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001..003)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: None (first test review)
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

The probe changes are in the working tree and not yet committed. Delivery should commit them with the ticket.

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/run-settings-live-probe.mjs` | Added (919 lines) | SCN-001..008; AC-003/004/006/008..011/017/019; DI-001, DI-004; VIS-014/017/020..028/042 | The live run-settings journeys, grouped by slices S1–S6 (R01–R13), on an owned real stack with GraphQL readback | Large, but one surface. The header comment maps each case to its slice and AC. Case dependencies are explicit (`PRODUCER`/`NEEDS`; `--cases` adds the producer cases). |
| `autobyteus-web/package.json` | Updated | — | `test:e2e:run-settings-live` script | — |
| `tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | Updated | REQ-011/012, AF-009, AR-001 (N02/N03); A01 F-04 | First-send mention admission for an Agent and a Team; draft `@` exclusions (target, members, built-ins, Orgs) | F-04 is aligned with base's mention-placeholder precedence, per CRR-006, with the reason in a comment |
| `tests/e2e/chat-entry-live-probe.mjs` | Updated | REQ-005/006/017/018, AR-003 | C05/C06/C08/C16/C18 migrated from the removed launch form/draft ⚙ to New chat and the saved-run view | The removed-UI assertions became positive checks of the replacement plus absence checks (`main select` count 0) |
| `tests/e2e/chat-composer-menus-open-upward-probe.mjs` | Updated | VIS-001, VIS-030 | Heading reference and composer-anchor rule for the new layout; U03 re-hover | The anchor relaxation is narrow: only `chat-composer`, and only when the box is inside the composer (VIS-030) |
| `tests/e2e/chat-composer-polish-probe.mjs` | Updated | REQ-022 | `pickModel` via `openRuntimeList` | — |
| `tests/e2e/fresh-run-auto-approval-probe.mjs` | Updated | REQ-021 approval default | Retries once only when a Nuxt dependency reload was recorded during the attempt | It keeps the failed attempt and a screenshot, and never relaxes assertions. Matches the TESTING.md caveat. |

- No durable test file changed: `No`
- Removed paths: none.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case titles carry the slice, AC, VIS and DI ids (e.g. `R10 … DI-004 …`). The file header lists all cases by slice. |
| Assertions prove approved requirements, not incidental details | Pass | Server-side readback for launch and save outcomes (`getTeamRunResumeConfig`, `getAgentRunResumeConfig`, `getAgentOrgRunConfig`, collaboration trees). The geometry checks assert REQ-001/022 (no overlap, inside the card). R04 also launches the copy and reads its `llmConfig` instead of trusting the chips. Exact spec copy is asserted for AC-003/014 states. |
| Fixtures, setup and helpers reuse meaningful repetition | Pass | Inside the new probe, `chooseModel`, `chooseThinking`, `footerOverlaps`/`cardOverlaps`, `newChatFor`, `openDrawer` and the GraphQL readers are shared by its cases. `openRuntimeList` is duplicated across four probes, which follows the repository's self-contained-probe convention (`pickModel`, `sel` and `delay` were already per probe; only two probes import local modules). Acceptable. |
| Isolation and determinism fit the boundary | Pass | Owned temp root, free ports, sanitized env, owned process cleanup in `finally`, and `--keep` for debugging. Shared state between cases is declared, not hidden. Live-LLM waits are bounded. The single reload retry keeps the failing attempt. |
| Large files stay coherent | Pass | The new 919-line probe covers one surface (run settings) and is navigable through the header map and per-case blocks |
| No stale, duplicated, disabled or compatibility-only tests | Pass | `chat-entry-live` cases that asserted removed UI were migrated, not disabled. No skipped cases. The F-04 tolerance is documented and scoped to an out-of-ticket product question. |
| Coverage agrees with the investigation and execution evidence | Pass | The execution report's R01–R13, N01–N03, A01 and probe counts match the cases present. The round-3 rerun scope (CSS-only IR-005) is justified in the report. |
| Callers and fixtures exercise an independently established scenario | Pass | Each case maps to an approved SCN/AC or SR-010 decision. R03 produces a real server rejection (a member definition deleted while the page is open) for the AC-003 failure outcome. R10 restarts the owned backend without Codex, matching the DI-004 "runtime uninstalled since the run" condition. |
| Each test enters through the real trigger and follows the real actor's steps | Pass | UI clicks for Run, "+", the heading switcher, the drawer, Send, Run, Stop and Save, with no store mutation to create state. `page.evaluate` is used only to measure geometry and read the focus/active element. |

## Findings

None.

### Product observations forwarded (not test-code findings; outside the approved spec, for user/Product decision at delivery)

- **O-1 (Requirement Gap candidate):** saved-run settings in a 390 px window. The panel card is about 224 px wide, and the locked values overflow its right edge by up to 19 px. This happens with short model names too. UIS-003 has no phone row and the desktop window has no minimum width. Evidence: `evidence/api-e2e/run-settings-live/R07-saved-run-running-long-model-390.png`.
- **O-2 (low):** an unknown or deleted Org shows the unavailable copy with an empty heading switcher (chevron only). VIS-014 shows a known Org. Evidence: `run-settings-live-R13/VIS-014-…png`.
- **O-3 (copy):** "All 1 members use these settings" for a single-member Team. REQ-002's copy template has no singular form.
- **Residual C05:** a server Codex client-cleanup failure in the oracle query (CRR-008). Candidate for a separate server ticket.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `tests/e2e/run-settings-live-probe.mjs` (added)
  - `package.json`
  - `tests/e2e/cross-scope-agent-mentions-live-probe.mjs`
  - `tests/e2e/chat-entry-live-probe.mjs`
  - `tests/e2e/chat-composer-menus-open-upward-probe.mjs`
  - `tests/e2e/chat-composer-polish-probe.mjs`
  - `tests/e2e/fresh-run-auto-approval-probe.mjs`
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - The probe changes are uncommitted in the worktree; include them in finalization.
  - Docs impact is Yes (code-review report §Docs-Impact).
  - Follow-ups FU-001..FU-004 and C05 are open.
  - O-1..O-3 need a user/Product decision: accept, or new ticket.
