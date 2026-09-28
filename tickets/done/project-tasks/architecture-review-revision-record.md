# Architecture Review Revision Record

Package: `PROJ-TASKS-20260926-001` — `project-tasks`.
The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 — `Architecture Design Complete` (`SR-004`) | `SR-003`, `SR-004` | N/A | Pass | None |
| ARCH-REV-002 | Round 2 — web revision after the user rejected DR-001 (`SR-007`) | `SR-004`–`SR-007` | Pass | Fail | `AR-001`, `AR-002` (new) |
| ARCH-REV-003 | Round 3 — revised package (`SR-008`) | `SR-004`, `SR-008` | Fail | Pass | `AR-001`, `AR-002` (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review of Project Tasks (description-only Tasks, two-pane Projects page)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-review-report.md`
- Review round and trigger: Round 1; `handoff-to-architecture-review-sr-004.md` (`task_size=Medium`, `architectural_risk=High`).
- Triggering role, report path, and finding IDs: `solution_designer`; `design-spec.md` (`SR-004`); none.
- Relevant solution revision IDs: `SR-003`, `SR-004`
- Prior authoritative decision: N/A
- Current authoritative decision: `Pass`
- What baseline was established:
  - The behavior basis `BEH-001`–`BEH-006` is confirmed against the code at `e06080b00`.
  - The embedded-Task aggregate is sound: every existing write spreads the record, and delete filters the whole record under one lock.
  - The persisted-data decision is `Directly Usable — No Migration`.
  - The two-pane nested route is coherent with the existing `/projects` prefix gates.
  - No findings.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: `/implementation_engineer` (primary); `/solution_designer` (informational)
- Remaining risks or uncertainty: The report's Residual Risks lists six non-blocking notes, covering the delete-count source (`P-001`), shared store `loading`/`error` with two mounted panes, orphaned catalogue keys, and first-nested-route checks, among others.

### ARCH-REV-002 — Re-review of the SR-007 web revision (released grid, full-width Project page, three-column board)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-review-report.md`
- Review round and trigger: Round 2. Triggered by `handoff-to-architecture-review-sr-007.md`, after the user rejected delivery candidate `a0fd103af` (DR-001) as "squeezed".
- Triggering role, report path, and finding IDs: `solution_designer`; `design-spec.md` (`SR-007`); no prior findings.
- Relevant solution revision IDs: `SR-004` (server, unchanged), `SR-005`, `SR-006`, `SR-007`
- Prior authoritative decision: `Pass` (`ARCH-REV-001`, on the now-superseded `SR-003`/`SR-004` web basis)
- Current authoritative decision: `Fail`
- What changed:
  - The behavior basis was reconfirmed for the `SR-007` requirements; the server verdicts are carried forward unchanged.
  - The web restore, remove and rework plan passes.
  - New findings:
    - `AR-001`: the board's three-column breakpoint is viewport-based, so its own non-squeezed minimum fails at supported left-panel and window widths (`P-001`, Reachable).
    - `AR-002`: stale approved-basis statements in `requirements-doc.md` contradict `SR-007`.

#### Prior Finding Resolution

None. Round 1 raised no findings.

Round 1 residual notes:
- Note 1 (delete-count source) is resolved in code: `ProjectDetail.vue` L230–240 uses `openTaskCount`.
- Note 2 (shared loading with co-mounted panes) is obsolete, since the two-pane layout is removed.
- Notes 3 and 4 are covered by the SR-007 removal plan.

- New or remaining finding IDs: `AR-001` (Medium), `AR-002` (Low)
- Material classification changes: None (still `Medium` / `High`)
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: DR-001 must not be finalized; test churn from restoring released specs; page scroll with long To Do lists (accepted by the user).

### ARCH-REV-003 — Re-review of the SR-008 fixes for AR-001 and AR-002

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-review-report.md`
- Review round and trigger: Round 3. Triggered by `handoff-to-architecture-review-sr-008.md`.
- Triggering role, report path, and finding IDs: `solution_designer`; `design-spec.md` and `requirements-doc.md` (`SR-008`); `AR-001`, `AR-002`.
- Relevant solution revision IDs: `SR-004` (server), `SR-008`
- Prior authoritative decision: `Fail` (`ARCH-REV-002`)
- Current authoritative decision: `Pass`

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium) | Resolved | `SR-008`; design-spec `ProjectTaskBoard` ownership (L148), Reuse (L235), mapping (L264), Layout example (L294), Sequence step 6 (L333–334), Guidance (L346–352); `REQ-006`, `AC-002`, `DEC-016` | See evidence below |
| AR-002 | Open (Low) | Resolved | `SR-008`; `requirements-doc.md` header L11–19, Preserved Behavior Boundary L79, `SCN-002` L132, `DEC-016` L221, Readiness | See evidence below |

`AR-001` evidence:
- The board wrapper is `container-type: inline-size`, and the column grid defaults to stacked.
- `@container project-task-board (min-width: 752px)` switches to three columns; 752 px = 3 × 240 + 2 × 16.
- It uses the plain-CSS precedent in `GeminiConfigurationOptionCard.vue` L223–224 (verified). Viewport breakpoints are forbidden for this switch.
- The e2e guards cover the default panel, the 520 px panel, a 1000 px window and a narrow window.

`AR-002` evidence:
- The baseline now names `SR-008`, `APPROVAL-PROJ-TASKS-20260927-002`, `DEC-012` = A and `DEC-013` = board.
- The supersession list includes `REQ-007`.
- The Preserved Behavior Boundary now describes the released grid and page as kept.
- `SCN-002` describes the board.
- The `DEC-016` cell is a single line.
- Readiness names `SR-008`.

- New or remaining finding IDs: None
- Material classification changes: None (`Medium` / `High`)
- Recommended recipient: `/implementation_engineer` (primary); `/solution_designer` (informational)
- Remaining risks or uncertainty:
  - DR-001 must not be finalized.
  - Test churn from restoring released specs.
  - Page scroll with long lists (accepted by the user).
  - A stale editorial estimate remains in `investigation-notes.md` L199.
