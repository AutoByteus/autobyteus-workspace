# API/E2E Revision Record

Package `PROJ-CONCEPT-20260926-001` — `projects-concept-introduction`.

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md` (`CRR-001`), round 1 | `SR-001`, `SR-003`, `ARCH-REV-002`, `IR-001`, `CRR-001` | N/A | Fail / 83% |
| API-REV-002 | `/code_reviewer`, `code-review-report.md` (`CRR-003`, IR-002 delta), round 2 | `IR-002`, `CRR-002`, `CRR-003` (`CR-001`) | Fail / 83% | Pass / 95% |

## Revision Entries

### API-REV-001 — Initial API/E2E baseline: un-mocked GraphQL e2e + 12-journey browser probe; AC-011 keyboard failure

- Triggering role, report path, and round: `/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/code-review-report.md`, implementation review round 1 (Pass 9.3/10)
- Triggering finding or scenario IDs: none (initial). Reviewer-requested browser coverage: AC-001, AC-002, AC-005, AC-007, AC-009, AC-010, AC-011.
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: `SR-001`, `SR-003`, `ARCH-REV-002`, `IR-001`, `CRR-001`
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E validation result
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` (API-001…API-006).
  - Added `autobyteus-web/tests/e2e/projects-feature-probe.mjs` (E2E-001…E2E-012).
  - Added the `test:e2e:projects` script to `autobyteus-web/package.json`.
  - All existing coverage is still valid; nothing was removed.
- Scenarios added, changed, removed, or rechecked: API-001…API-006 and E2E-001…E2E-012 added
- Commands, environment, fixture, or broader-validation delta:
  - Broader validation was `Required` and executed: browser against two isolated live nodes with a real restart and in-page node rebinding.
  - Spawned processes have their `ENABLE_*` variables scrubbed.
  - Pre-existing failures were attributed through a temporary base worktree, since removed.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all sections), `api-e2e-execution-coverage-report.md` (created), `api-e2e-test-case-ledger.md` (sequences 1–20)
- Prior result and confidence (`N/A` for `API-REV-001`): N/A
- Current result and confidence: `Fail`, 83%. Post-repository confidence was 74%.
- New or remaining failure IDs:
  - `API-F-001` (E2E-007; AC-011, REQ-013, QR-003). A keyboard-only user cannot link an existing registered workspace from the Add-workspace dialog, and opening the reused `SearchableSelect` list moves focus outside the modal dialog.
  - Preliminary classification: `Local Fix` (implementation), with a possible reclassification to `Design Impact`.
- Recommended recipient: `/code_reviewer` (failure-origin review)
- Remaining risks, blocked evidence, or untested scope:
  - The "registration failed → nothing linked" branch is covered by spec only.
  - Electron window-per-node creation is unchanged code and was not executed.
  - QR-004 (200-Project performance) was not measured.

### API-REV-002 — Rerun after IR-002: API-F-001 resolved; E2E-007 contract refined; E2E-013 added

- Triggering role, report path, and round: `/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/code-review-report.md` (round 3 — IR-002 delta review, Pass 9.3/10)
- Triggering finding or scenario IDs: `CR-001` = `API-F-001` (E2E-007)
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: `IR-002` (commit `63e6fb0e4`), `CRR-002`, `CRR-003`
- Why this baseline or coverage/execution revision was recorded: rerun after the fix for the round-1 failure
- Coverage decisions or durable test paths changed:
  - In `autobyteus-web/tests/e2e/projects-feature-probe.mjs`:
    - E2E-007's link-existing step now asserts the combobox-popup contract. Focus may be in the popup owned by the dialog trigger, but never in the page behind the modal. Tab and Shift+Tab return to the trigger. The first Escape closes the list and the second closes the dialog. A keyboard selection is submitted and persisted.
    - E2E-013 added: 1024×700 layout.
  - The server test is unchanged.
- Scenarios added, changed, removed, or rechecked: E2E-007 rechecked first and changed; E2E-013 added; everything else re-executed
- Commands, environment, fixture, or broader-validation delta:
  - `--only=E2E-003,E2E-004,E2E-007` recheck.
  - `pnpm test:e2e:projects` full run, plus a confirmation run, plus the final 13-case run.
  - Server `tests/e2e/projects`.
  - Web consumer suites for the shared `SearchableSelect` (71 files / 414 tests).
  - Localization guards.
  - No server rebuild was needed (server unchanged).

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `API-F-001` / E2E-007 (AC-011, REQ-013, QR-003) | `Local Fix` (confirmed as `CR-001`) | Resolved by `IR-002`. A keyboard-only link of an existing workspace succeeds, and focus never reaches the page behind the modal. Escape works in two steps, and Tab returns focus to the trigger. | `/tmp/proj-e2e-logs/r2-e2e007/result.json`, `/tmp/proj-e2e-logs/r2-final/result.json`, `r2-final/E2E-007-keyboard-link-existing.png` |

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (meta, results, round-2 scorecard, coverage to update, decision), `api-e2e-execution-coverage-report.md` (round 2 authoritative), `api-e2e-test-case-ledger.md` (sequences 21–25)
- Prior result and confidence: Fail / 83%
- Current result and confidence: Pass / 95%. The round-2 post-repository score was 90%.
- New or remaining failure IDs: none
- Recommended recipient: `/code_reviewer` (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope:
  - Screen-reader exposure of the teleported listbox under `aria-modal` was not exercised; it is non-blocking.
  - The "registration failed → nothing linked" branch is covered by spec only.
  - Electron window creation is unchanged code and was not executed.
