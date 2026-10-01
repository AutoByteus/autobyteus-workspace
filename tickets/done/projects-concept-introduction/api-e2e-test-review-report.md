# API/E2E Test Review Report

Package `PROJ-CONCEPT-20260926-001` — `projects-concept-introduction` (slice 1: Projects only, behind `ENABLE_PROJECTS`).

## Review Meta

- Review Round: `1`
- Trigger: `/api_e2e_engineer` reports that API/E2E passed, round 2 (`API-REV-002`), after `IR-002` (`63e6fb0e4`) and `CRR-003`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, `SR-001`)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (`SR-003`)
- Supplemental Task Artifacts Reviewed As Context: `handoff-to-architecture-review-sr-003.md`
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (`ARCH-REV-002`)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (`IR-001`, `IR-002`)
- Original Code Review Report: `code-review-report.md` (latest `CRR-003`, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (authoritative, round 2)
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (`API-REV-001`, `API-REV-002`)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
  - Browser probe: 12/12 on the full run and on the confirmation run, then 13/13 on the final run with E2E-013.
  - Server API e2e: 6/6.
  - Shared `SearchableSelect` consumers: 71 files / 414 tests.
- Final Validation Confidence: 95% (reported by API/E2E)
- Prior unresolved test-review findings rechecked: None (first test review).
- Supported Product Scenario Basis Confirmed: `Yes`. Every case maps to an approved AC, scenario or QR (see the table below). No case creates its own scenario.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` | Added (untracked; 389 lines) | API-001 → AC-001/002/010 (capability); API-002 → AC-003/004; API-003 → AC-005/006, REQ-005; API-004 → AC-007; API-005 → AC-008; API-006 → AC-009 / REQ-010 | The Projects GraphQL boundary, run un-mocked (resolver → service → JSON store, with the real `WorkspaceManager` registry and settings) in an isolated app data dir | The only emulation is `AgentRunManager` / `AgentTeamRunManager.getInstance` returning no active runs, so the unchanged removal guard can run outside a full server. Justified and documented in the header comment. |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | Added (untracked; 1006 lines, E2E-001 to E2E-013) | E2E-001/002/009 → AC-001/002; 003 → AC-003/004; 004 → AC-005; 005 → AC-007; 006 → AC-008; 007 → AC-011 / QR-003; 008 → AC-012 / REQ-012; 010/011 → AC-009; 012 → AC-010; 013 → requirements UI section ("desktop responsive behavior") | A browser-level journey probe for the Projects feature against two isolated live nodes and a dev frontend | Follows the repo's probe pattern (`provider-api-key-save-probe.mjs`; `__vue_app__` / Pinia access as in `existing-run-model-config-probe.mjs`). Per-case evidence, an `--only` filter, and full cleanup in `finally`. |
| `autobyteus-web/package.json` | Updated (+1 line) | — | The `test:e2e:projects` script | Placed with the sibling `test:e2e:*` probe scripts. |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case ids and titles carry the approved intent (for example "API-004: keeps a link as UNREGISTERED after real workspace removal and restores it on re-registration", and "E2E-007 Keyboard-only journey…"). Comments cite AC and REQ IDs where the intent is not obvious. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Assertions check observable outcomes: GraphQL error `extensions.code`, persisted `.env` / `projects.json` / `workspaces.json` content (byte equality for AC-008 and restart), availability transitions, nav labels, redirects, focus location, and persisted links. The E2E-007 change from round 1 to round 2 was reviewed specifically: see the note below. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | The server test has shared `exec` / `execOk` / `expectErrorCode` / `registerWorkspace` / `createProject` / `addLink` helpers and one `PROJECT_FIELDS` fragment. The probe has shared `api`, `waitFor`, `tabUntil`, `activeInfo`, `runCase`, `gotoAndSettle` and `openProjectDetail`. Non-blocking note: `resetWorkspaceRegistryForTest` duplicates the private-field reset in `tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`. It follows an existing convention; extracting it to `tests/e2e/helpers/` is an optional later cleanup. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Server: a fresh `mkdtemp` app data dir per test, config/registry/singleton reset, restored env and mocks, and temp removal. Probe: owned temp root, dynamic ports, `ENABLE_*` scrubbed from the environment, two isolated nodes, and a `finally` that stops the browser, frontend and both nodes and removes the temp root (a cleanup error fails the run). A few fixed `sleep(200)` waits remain in E2E-007 after Escape and typing. The subsequent state is asserted, and the case was stable over 3 full runs, so this is acceptable for a live browser probe. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The probe is 1006 lines, but it covers one feature surface. It is sectioned into shared helpers, a case runner, and 13 self-contained `runCase` blocks. The server test is 389 lines for one GraphQL boundary. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | There are no skipped or disabled cases. The E2E-009 `catch` branch gathers extra diagnostics, restores the flag and rethrows, so it cannot mask a failure. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | The case IDs match the execution coverage report and ledger (E2E-001 to 013, API-001 to 006). E2E-013 was added in round 2 as reported, and the results match `/tmp/proj-e2e-logs/r2-final/result.json` as reported. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every case reproduces an approved SCN/AC path through real product surfaces (UI, GraphQL). The only emulation (no active runs) supports the approved SCN-004 precondition, "removal blocked only by active runs". It does not invent a scenario. |

### Note on the E2E-007 assertion change (round 1 → round 2)

- Round 1 asserted "focus stays inside the `[role=dialog]` DOM while the list is open". That assertion correctly detected the real defect (`CR-001`).
- Round 2 asserts the following instead:
  1. Focus in the open list is the `role="combobox"` whose `aria-controls` equals the in-dialog trigger's `aria-controls`.
  2. Focus is never in the page behind the modal: neither `document.body` nor anything inside `#__nuxt`. Both the dialog and the popover are teleported outside `#__nuxt`.
  3. Tab and Shift+Tab close the list and return focus to the trigger (`aria-expanded=false`).
  4. The first Escape closes only the list, and the second Escape closes the dialog with focus returned to "Add workspace".
  5. A keyboard-only selection and link persists as expected.
- This matches the combobox/teleported-popup contract accepted in `CRR-003`, and it still enforces AC-011's user-visible outcome: keyboard operability, and no escape to the background. The change is a correct tightening to the approved behavior, not a weakening that would hide a defect.

## Findings

None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` (added)
  - `autobyteus-web/tests/e2e/projects-feature-probe.mjs` (added)
  - `autobyteus-web/package.json` (the `test:e2e:projects` script)
- Unresolved finding IDs: None
- Recommended Recipient: `/delivery_engineer`
- Notes:
  - All three changes are uncommitted in the worktree. Delivery should commit them with the package.
  - Optional non-blocking cleanups:
    - extract the shared workspace-registry reset into `tests/e2e/helpers/`;
    - replace the E2E-007 `sleep(200)` waits with state polling.
  - Task size `Large` and architectural risk `High` are preserved.
  - Residual risks carried from API/E2E:
    - screen-reader exposure of the teleported listbox outside the `aria-modal` subtree was not exercised;
    - the "registration failed" path is covered by spec only;
    - Electron window creation was not executed;
    - the pre-existing English `WorkspaceSelector` literals show in zh-CN;
    - the branch is 15+ commits behind `origin/personal`.
