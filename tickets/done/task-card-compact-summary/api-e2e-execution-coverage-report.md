# API/E2E Execution Coverage Report — `task-card-compact-summary`

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/requirements-doc.md` (SR-002)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/design-spec.md`
- Supplemental: evidence screenshot; prior UI/UX spec (unchanged)
- Design Review / Architecture Review / Code Review: `N/A — not applicable` (direct low-risk route)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/implementation-revision-record.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/api-e2e-coverage-investigation.md`
- Ledger: not used
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`; round 1; trigger IR-001

## Routing Classification

- `Small` / `Low`; `Direct Low-Risk` → `Delivery`
- Test-code review: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Investigation written before final execution: `Yes`.
- Scope decision (user-agreed, 2026-10-07): validation is proportionate to a presentation-only change in one component.
  - **Run:** the rendered checks of the changed card (PMU-013, PMU-014), short-text visual parity, the unit specs, the localization checks and the packaged build (already started).
  - **Not run:** the full PMU-001..012 regression, and a desktop journey. Neither exercises anything this change touches (no server, store, feed, navigation or shell change), and the desktop renderer is the same Chromium the probe uses.

## Changed Boundary And Evidence Matrix

| Case | AC | Evidence | Result |
| --- | --- | --- | --- |
| PMU-013, final file (row bound 200 px; never run before) | AC-001, 002, 003 (long), 004, 005 | 10,000-word paragraph: 2-line summary (48 px at 24 px line height), no preview. Multi-line: 2-line summary + 2-line preview (40 px). Both boards at 1440/1024. Labels ≤ 120 with "…". Search `brief9999` finds the card. Both Task pages show all 98,889 characters | Pass (`api-e2e-evidence/pmu-013-014/`) |
| PMU-014 (new, durable) | AC-001/002 edges, AC-003 short half, REQ-001 file count and worker line | At 1440/1024/390: long summaries exactly 2 lines (48 px); CJK hard cut at 300 characters; 5,000-character unbroken token wraps with no horizontal overflow; long Task with a context file and a worker line is 185 px, every part inside the card; short Task is one line (24 px); the delete confirmation shows "Ship the FAQ." in full; the Task page shows the full text and the file | Pass 4/4 consecutive runs (`pmu-014-runs/`) |
| PARITY (temporary) | AC-006 | 5 short-card shapes (one line, two lines, with a file, with a worker line, Temp) at 1440/1024, rendered with the **base** row + utility and with the **fix**: all 10 screenshots pixel-identical (PIL difference: no bounding box); heights equal (52/76/105/88/112 px) | Pass (`parity/base`, `parity/fix`) |
| Unit + Projects web specs | All | 186 tests: 185 pass. 1 pre-existing failure (`org-definition-navigation`) imports none of the changed files | Pass (`web.log`) |
| Localization guard + audit | REQ-010 basis | "Passed"; "zero unresolved findings" | Pass (`l10n.log`) |
| Packaged desktop build | Release packaging | `build:electron:mac` exit 0 (dmg/zip 1.4.96-beta.4) | Pass (`electron-build.log`) |

## Probe Harness Finding (test code, not product)

- **Symptom:** PMU-014's first runs failed only at the closing browser-error check: "Failed to fetch agent definitions / agent team definitions / workspace metadata".
- **Diagnosis:** an instrumented copy found it in 1 of 4 runs. The probe's full-page `goto` from the Temp tasks board fired while the app shell's late GraphQL reads were in flight, and Chrome aborted them (`net::ERR_ABORTED`). Users navigate in-app, so this is test-only.
- **Fix:** the probe's shared `goto` now waits until the current page has had no GraphQL request in flight for 750 ms. PMU-014's last hop also navigates in-app. After that, 4/4 runs passed.
- Evidence: `pmu-014-runs/diag-aborted-fetch.json`.

## Validation Confidence Scorecard

| Category | Score | Basis |
| --- | --- | --- |
| Requirement/AC proof | 97% | AC-001..006 directly proven in a rendered browser, including edges |
| Boundary directness | 97% | The changed component rendered in real Chromium against a real backend |
| Integration realism | 95% | Real backend data, both boards; Electron uses the same engine (build verified) |
| Environment fidelity | 95% | Private stack; the packaged build passes all guards |
| Edge cases | 95% | CJK, unbroken token, files + worker line, 390 px, short labels |
| User surface | 95% | Both boards, Task pages, delete dialog; desktop not launched (same engine) |
| Durable regression | 95% | PMU-013 + PMU-014, unit specs; the parity check is temporary |

- Overall **96%**. Every AC proven. No category below 90%.

## Durable Coverage Changed In The Codebase

| Path | Change | Result |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` | Added PMU-014 (`compactCardEdges`, `createTaskWithFile`, `cardLayout`); updated the shared `goto` (waits for in-flight GraphQL); per-page GraphQL in-flight tracking | PMU-013 Pass; PMU-014 4/4 |

Uncommitted in the worktree.

## Temporary Methods

| Method | Cleanup |
| --- | --- |
| Parity probe copy in `/tmp` | The swapped base files were restored (`cmp` identical to the fix); `git status` shows only the probe change |
| Diagnostic probe copy in `/tmp` | Outside the repo |

## Cleanup

All probe stacks closed their browser and processes and removed their data roots. No isolated instance was started.

## Latest Authoritative Result

- Result: `Pass`, 96%
- Broader validation: Browser executed. The desktop journey and the full regression were not required (proportionate; user-agreed).
- Next: `/delivery_engineer`
