# Code Review Revision Record

Package `PROJ-TASKS-20260926-001` — `project-tasks`.

The latest `code-review-report.md` or `api-e2e-test-review-report.md` remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 — `IR-001` from `/implementation_engineer` | N/A | Pass (9.3/10) | None |
| CRR-002 | `api-e2e-test-review-report.md` | Proportional API/E2E Test-Code Review, round 1 — `API-REV-001` pass from `/api_e2e_engineer` | N/A (first test review) | Pass | None |
| CRR-003 | `code-review-report.md` | Implementation Review, round 2 — `IR-002` (`ae0cd4755`) Rework after `DR-001` rejection; `SR-008` / `ARCH-REV-003` | Pass (`CRR-001`, now superseded for the web UI) | Pass (9.3/10) | None |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional API/E2E Test-Code Review, round 2 — `API-REV-002` pass from `/api_e2e_engineer` | Pass (`CRR-002`, superseded probe) | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review of description-only Project Tasks

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/code-review-report.md`
- Review entry point and round: Implementation Review, round 1.
- Triggering role, report path, and finding or scenario IDs:
  - Role: `/implementation_engineer`.
  - Report: `implementation-handoff.md` (`IR-001`), covering commits `8d3de39a6` and `e8fca7771` on base `e06080b00`.
  - Scenarios: `SCN-001` to `SCN-008`.
- Relevant solution revision IDs: `SR-003`, `SR-004`
- Relevant architecture-review revision IDs: `ARCH-REV-001`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - This is the initial baseline.
  - The full diff was reviewed against the approved `SR-003` requirements, the `SR-004` design, and the `ARCH-REV-001` residual notes 1–6. Every note is resolved or accepted as designed.
  - The reviewer ran the tests:
    - Server changed-area suites: 66/66.
    - The released server `tests/e2e/projects`: 6/6, with `ENABLE_*` unset.
    - Web: 408/408 across 62 files.
    - Both localisation guards pass.
- Supported product scenario / material-premise basis changes: None. `P-001` is confirmed. Candidates C-01 to C-10 were rejected with reasons; `SCN-X01` is confirmed absent from the code.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A (baseline). Task size `Medium` and architectural risk `High` are confirmed.
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - The delete count uses `openTaskCount`, and the admission ticket must revisit it.
  - Dates follow the browser locale.
  - The narrow layout and the new Task journeys are for API/E2E.
  - `ENABLE_*` environment leakage affects the released e2e run.
  - Single-file lock contention is deferred.

### CRR-002 — Proportional test-code review after the API/E2E pass (API-REV-001)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/api-e2e-test-review-report.md` (new). `code-review-report.md` is unchanged and remains at `CRR-001` Pass.
- Review entry point and round: Proportional API/E2E Test-Code Review, round 1.
- Triggering role, report path, and finding or scenario IDs:
  - Role: `/api_e2e_engineer`.
  - Report: `api-e2e-execution-coverage-report.md` (`API-REV-001`, Pass, 95%).
  - Scenarios: API-001–009 and E2E-001–026.
- Relevant solution revision IDs: `SR-003`, `SR-004`
- Relevant architecture-review revision IDs: `ARCH-REV-001`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A for test review; the source review was `CRR-001` Pass.
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - Two durable test updates were reviewed proportionately: the server GraphQL e2e (API-007 to API-009, the Task in API-006, and the hermetic `ENABLE_*` handling) and the browser probe (E2E-014 to E2E-026, plus the node C lifecycle).
  - Both are scenario-aligned, isolated, deterministic across three runs, and fully cleaned up.
  - The E2E-026 hand-seeded mixed-status fixture proves only approved rendering contracts. It records the unreachable delete-count behavior without asserting it.
  - No rerun was needed.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None. No test-review findings were open.

- New or remaining finding IDs: None
- Material score or classification changes: None. Task size `Medium` and architectural risk `High` are preserved.
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty:
  - Optional polish: focus after deleting a Task; a cosmetic blank line; a possible probe split later.
  - Carry to the admission ticket: the delete confirmation counts open Tasks, not the total.
  - The tests are uncommitted and delivery should commit them; `test-results/` and the SDK `dist/` folders should stay out.

### CRR-003 — Implementation review of IR-002 (released grid, full-width Project page, three-column board)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/code-review-report.md`. The round 2 meta and the "Round 2 — `IR-002` Review" section were added, and scorecard rows 4, 7 and 8 and the Latest Authoritative Result were updated. Round 1 content remains valid for the unchanged server, stores, dialog and Workspaces panel.
- Review entry point and round: Implementation Review, round 2.
- Triggering role, report path, and finding or scenario IDs:
  - Role: `/implementation_engineer`.
  - Report: `implementation-handoff.md` (`IR-002`), commit `ae0cd4755`.
  - Scenarios and requirements: `SCN-002`, `SCN-007`; `REQ-006`, `REQ-007`, `REQ-009`, `REQ-016`; `AC-002`, `AC-005`, `AC-007`, `AC-011`.
- Relevant solution revision IDs: `SR-005`–`SR-008` (requirements basis `SR-008`, `APPROVAL-PROJ-TASKS-20260927-002`)
- Relevant architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-001` (superseded web UI), `IR-002`
- Relevant API/E2E revision IDs: `API-REV-001` (validated the superseded UI)
- Relevant delivery revision IDs: `DR-001` (rejected by the user; must not be finalized)
- Prior authoritative result: `Pass` (`CRR-001`), now superseded for the web UI by the user's rejection and `SR-005`–`SR-008`.
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The web UI was reworked to the SR-008 basis:
    - the released grid and pages are restored byte-identically from `e06080b00`;
    - the card shows "N open tasks · N workspaces";
    - the Project page is full width with "← Projects" in every state;
    - the new `ProjectTaskBoard` has three columns that switch on the board's own width through a container query at 752 px, with no viewport breakpoint;
    - the new description-only `ProjectTaskCard`;
    - there is one search with a no-match state and no status filter.
  - The rejected two-pane components, the relative-time util, their specs and their keys are removed.
  - The server, the stores and the dialog are unchanged.
  - The reviewer ran the tests: web 403/403 across 62 files, server 65/65, and both localisation guards pass.
- Supported product scenario / material-premise basis changes: SCN-007 and AC-002/005/007/011 were revised by SR-005–SR-008. `P-001` (the board-width premise) is resolved. Candidates C-11 to C-15 were rejected with reasons.

#### Prior Finding Resolution

None. `CRR-001` had no findings.

- New or remaining finding IDs: None
- Material score or classification changes: Scorecard rows 4, 7 and 8 were re-justified for round 2, and the overall score stays 9.3/10. Task size `Medium` and architectural risk `High` are preserved.
- Recommended recipient: `/api_e2e_engineer`, with the informational pass notice to `/implementation_engineer`.
- Remaining risks or uncertainty:
  - The uncommitted delivery docs edits describe the rejected UI and must be redone in docs sync.
  - The `CRR-002` test review covered the superseded probe. The rewritten probe (`ae0cd4755`), plus any API/E2E additions, needs a new proportional test review after a passing run.
  - The board width guards need browser confirmation.
  - The delete count uses `openTaskCount`, which the admission ticket must revisit.

### CRR-004 — Proportional test-code review after the API/E2E round 2 pass (API-REV-002)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/api-e2e-test-review-report.md`, rewritten as round 2. `code-review-report.md` is unchanged and remains at `CRR-003` Pass.
- Review entry point and round: Proportional API/E2E Test-Code Review, round 2.
- Triggering role, report path, and finding or scenario IDs:
  - Role: `/api_e2e_engineer`.
  - Report: `api-e2e-execution-coverage-report.md` (`API-REV-002`, Pass, 95%).
  - Scenarios: E2E-001–029, API-001–009.
- Relevant solution revision IDs: `SR-008`
- Relevant architecture-review revision IDs: `ARCH-REV-003`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `API-REV-001` (superseded), `API-REV-002`
- Relevant delivery revision IDs: `DR-001` (rejected; not finalized)
- Prior authoritative result: `Pass` (`CRR-002`, for the superseded two-pane probe)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - This is a fresh review of the current probe: the `ae0cd4755` rewrite plus the uncommitted E2E-028 width sweep, the E2E-029 error-state Back and description-clamp case, and the header correction.
  - The restored E2E-001–013 were diffed against the v1.4.86 probe. The only differences are helper extraction, the `?tab=workspaces` navigation, one keyboard tab switch, and the REQ-011-driven E2E-008 raw-key check.
  - The board cases assert the approved SR-008 outcomes, and the width checks assert the approved rule rather than the 752 px threshold.
  - The synthetic error injection (E2E-029) and the mixed-status fixture (E2E-026) only reach approved states.
  - The server e2e is unchanged since `768c155f6`, which was reviewed in `CRR-002`.
  - No rerun was needed.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None. No test-review findings were open.

- New or remaining finding IDs: None
- Material score or classification changes: None. Task size `Medium` and architectural risk `High` are preserved.
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty:
  - Optional polish: a side-panel drag helper; polling instead of the fixed settle wait; a probe split later.
  - Carried product notes: focus after Task delete; the delete count at admission; the stack thresholds.
  - The uncommitted probe additions need committing. The stale docs edits must be redone in docs sync. `DR-001` must not be finalized as-is.
