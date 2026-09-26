# API/E2E Test-Case Ledger

Package `PROJ-CONCEPT-20260926-001` — `projects-concept-introduction`.

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction`
- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/api-e2e-revision-record.md`
- Ledger scope and reason it is required: 18 cases across un-mocked GraphQL e2e and a long-running, multi-process browser probe
- Last updated: 2026-09-26 (round 2 complete)

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| API-001 | Capability default/persist/toggle; Applications/SI values unchanged | AC-001, AC-002, AC-010 | GraphQL e2e | `npx vitest run tests/e2e/projects/projects-graphql.e2e.test.ts` | 1 | — |
| API-002 | CRUD + validation codes | AC-003, AC-004 | GraphQL e2e | same | 2 | — |
| API-003 | Link via real `createWorkspace`; reject temp/unregistered; duplicate; two Projects | AC-005, AC-006 | GraphQL e2e | same | 3 | — |
| API-004 | Remove workspace → `UNREGISTERED`; re-register → `AVAILABLE`; unlink unregistered | AC-007 | GraphQL e2e | same | 4 | — |
| API-005 | Delete scope; `workspaces.json` byte-identical | AC-008, REQ-011 | GraphQL e2e | same | 5 | — |
| API-006 | Restart reads the same `projects.json` | AC-009, REQ-010 | GraphQL e2e | same | 6 | — |
| E2E-001 | Flag off: nav hidden, redirects, capability error | AC-001 | Browser | `node tests/e2e/projects-feature-probe.mjs` | 7 | — |
| E2E-002 | Basics toggle on; nav appears live; persisted | AC-002 | Browser | same | 8 | — |
| E2E-003 | Create/validate/duplicate/search/no-match/edit/rename collision | AC-003, AC-004 | Browser | same | 9 | — |
| E2E-004 | Add-workspace default path; register-then-link | AC-005 | Browser | same | 10 | — |
| E2E-005 | Unavailable after removal; restored after re-registration; edit/unlink | AC-007 | Browser | same | 11 | — |
| E2E-006 | Delete cancel/confirm; `workspaces.json` unchanged | AC-008 | Browser | same | 12 | — |
| E2E-007 | Keyboard-only journey + focus management | AC-011 | Browser | same | 13 | Risk: `SearchableSelect` has no key handling |
| E2E-008 | zh-CN + no Task wording | REQ-012, AC-012 | Browser | same | 14 | — |
| E2E-009 | Advanced-table ENABLE_PROJECTS false/true | AC-002 | Browser | same | 15 | — |
| E2E-010 | Backend restart persistence | AC-002, AC-009 | Browser + lifecycle | same | 16 | — |
| E2E-011 | Node rebinding A → B → A | AC-009 | Browser + 2 backends | same | 17 | — |
| E2E-012 | Applications/SI toggles unchanged | AC-010 | Browser | same | 18 | — |
| E2E-013 | Narrow desktop width (1024×700) layout | UI section (desktop responsive), REQ-008 | Browser | same | 19 | Added in round 2 |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | API-001 | 2026-09-26 15:45 | Completed | `npx vitest run tests/e2e/projects/projects-graphql.e2e.test.ts` (`autobyteus-server-ts`) | Unset → `false`/`INITIALIZED_DISABLED` persisted; set true/false persists to `.env`; SI capability and `ENABLE_APPLICATIONS` unchanged | As expected. The first draft queried `applicationsCapability`, which needs studio services absent from the schema-only harness. The case was narrowed to the SI GraphQL capability plus the Applications accessor value; Applications end to end moved to E2E-012. | Pass | `/tmp/proj-e2e-logs/server-projects-e2e.log` | — |
| 2 | API-002 | 2026-09-26 15:45 | Completed | same | Trim, `""` description, `PROJECT_NAME_REQUIRED`, case-insensitive `PROJECT_NAME_TAKEN`, rename collision, `PROJECT_NOT_FOUND`, sorted list | As expected | Pass | same | — |
| 3 | API-003 | 2026-09-26 15:45 | Completed | same | Link via real `createWorkspace` ids; temp, unregistered and missing-project errors; duplicate rejected; same workspace in 2 Projects; register-then-link | As expected | Pass | same | — |
| 4 | API-004 | 2026-09-26 15:45 | Completed | same (run managers emulated as having no active runs) | Real `removeWorkspace` succeeds → `UNREGISTERED` with snapshot path/description; re-register → same id, `AVAILABLE`, no duplicate; edit/unlink an unregistered link | As expected | Pass | same | — |
| 5 | API-005 | 2026-09-26 15:45 | Completed | same | Delete true then false; `workspaces.json` byte-identical; other Project and registered workspaces intact | As expected | Pass | same | — |
| 6 | API-006 | 2026-09-26 15:45 | Completed | same | Fresh singletons read the same `projects.json` and `ENABLE_PROJECTS=true`; file unchanged by reads | As expected. The file passed 3 consecutive runs. In a combined run with the workspaces, settings and unit-graphql suites, the only failures were pre-existing (identical on base). | Pass | `/tmp/proj-e2e-logs/server-e2e-combined.log` | — |
| 7 | E2E-* | 2026-09-26 15:48 | Checkpoint | Probe run 1: `node tests/e2e/projects-feature-probe.mjs --skip-server-build` | — | Run 1: E2E-001/002/003/006/008 passed. The failures were diagnosed as probe defects: the option locator matched Project rows, the trap-walk index was off by one, and a failed E2E-009 left the flag off, which cascaded into E2E-010/011/012. The one exception was E2E-007's workspace-list keyboard failure, which is genuine. The probe was fixed; the product was not changed. | N/A | `/tmp/proj-e2e-logs/probe-run1.log` | Fix probe; rerun |
| 8 | E2E-009 | 2026-09-26 15:52 | Checkpoint | Probe run 2 with diagnostics | History-back to the open Project route redirects home after the Advanced edit | This was a timing race in the probe. Back was pressed after the backend persisted `false` but before the DS-004b store refresh completed (store still `isEnabled:true`). The store settled to `false` about 150 ms later; after that, a push and a reload both redirected. The probe now waits for the store to settle. E2E-012 had a similar race (reading the backend before the optimistic toggle's mutation persisted), and the probe now waits for the backend. | N/A | `/tmp/proj-e2e-logs/probe-run2.log` | Rerun |
| 9 | E2E-001 | 2026-09-26 15:53 | Completed | Probe runs 3, 4, 5 and 6 (identical results) | No nav item; `/projects` and `/projects/<id>` redirect to home (`/` → `/agents`); Basics toggle unchecked/"Disabled"; `ENABLE_PROJECTS=false` persisted | As expected | Pass | `/tmp/proj-e2e-logs/probe-run5/result.json`, `E2E-001-pass.png` | — |
| 10 | E2E-002 | 2026-09-26 15:53 | Completed | same | Toggle on → nav shows Projects right after Nodes with no reload (page marker kept); persisted true; off → hidden and client-side `/projects` redirects; capability query error → redirect and hidden | As expected (the capability error was intercepted twice) | Pass | same | — |
| 11 | E2E-003 | 2026-09-26 15:53 | Completed | same | Field error `role=alert`/`aria-invalid`/`aria-describedby`; no record for an empty name; case-insensitive duplicate rejected; search by description and by name; no-match state and clear; edit persists; rename collision rejected | As expected | Pass | same | — |
| 12 | E2E-004 | 2026-09-26 15:53 | Completed | same | Exactly the 3 registered workspaces offered, with no Temp; nothing pre-selected; Submit disabled; link shows name, path and description (AVAILABLE); a linked workspace is not offered again; New root registered then linked | As expected | Pass | same | — |
| 13 | E2E-005 | 2026-09-26 15:53 | Completed | same | Real removal not blocked; row UNREGISTERED with badge, path and description; re-register → same id, AVAILABLE, 3 rows; link description edit; unlink keeps the workspace registered | As expected | Pass | same | — |
| 14 | E2E-006 | 2026-09-26 15:53 | Completed | same | Initial focus on Cancel; Cancel keeps the Project; Confirm removes it; `workspaces.json` byte-identical; other Project intact | As expected | Pass | same | — |
| 15 | E2E-007 | 2026-09-26 15:53 | Completed | same | Full keyboard journey including linking an existing registered workspace | Create, validation, trap wrap, Shift+Tab, Escape and focus return, search, open, edit, unlink and delete all worked by keyboard. **Linking an existing workspace failed:** (1) opening the list moves focus to a search input teleported outside the `aria-modal` dialog; (2) ArrowDown+Enter selects nothing and Submit stays disabled; (3) Tab then lands on the page behind the modal; (4) Escape does not close the dialog. The New-path (typed root) link worked. | Fail | `/tmp/proj-e2e-logs/probe-run5/result.json` (`E2E-007.observations.keyboardLinkExisting`), `/tmp/proj-e2e-logs/probe-kbd/E2E-007-keyboard-link-existing.png` | Route to `/code_reviewer` |
| 16 | E2E-008 | 2026-09-26 15:53 | Completed | same | zh-CN index, detail, nav and link-dialog strings; no Task/任务 on index, detail, form, delete or link surfaces | As expected. The pre-existing selector literals "Existing" and "New" are visible in zh-CN (outside REQ-012). | Pass | same | — |
| 17 | E2E-009 | 2026-09-26 15:53 | Completed | same | Advanced false → store settles (153 ms), history-back to the open Project redirects, nav hides, no reload; true → nav shows | As expected | Pass | same | — |
| 18 | E2E-010 | 2026-09-26 15:53 | Completed | same | SIGTERM and restart on the same data dir → nav shows Projects; Projects and links identical | As expected | Pass | same | — |
| 19 | E2E-011 | 2026-09-26 15:53 | Completed | same | `bindNodeContext` → node B shows only `node-b-only` (GraphQL reached B); rebinding back shows A's Projects; no leak into A | As expected | Pass | same | — |
| 20 | E2E-012 | 2026-09-26 15:53 | Completed | same | Applications on → nav item shown and persisted; off → `/applications` redirects; SI flip persists; both restored; Projects unaffected | As expected | Pass | same | — |
| 21 | E2E-007 | 2026-09-26 16:10 | Checkpoint | Round 2 (`IR-002`, commit `63e6fb0e4`, `CRR-003`). The E2E-007 link-existing assertions were revised to the approved combobox-popup contract: focus may sit in the teleported popup owned by the dialog trigger (`aria-controls`) but never in the page behind the modal. Tab and Shift+Tab return focus to the trigger; the first Escape closes only the list, the second closes the dialog. A filtered keyboard selection is then submitted. | — | Probe updated before the recheck | N/A | `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | Recheck the prior failure first |
| 22 | E2E-007 | 2026-09-26 16:12 | Completed | `node tests/e2e/projects-feature-probe.mjs --only=E2E-003,E2E-004,E2E-007 --output-dir=/tmp/proj-e2e-logs/r2-e2e007` | `API-F-001` resolved | The open list's focus is a `combobox` whose `aria-controls` equals the dialog trigger's; `activeInPageBehindModal=false`. Tab and Shift+Tab return to the trigger (`aria-expanded=false`). The first Escape leaves the dialog open with focus on the trigger; the second closes it and focus returns to "Add workspace". Typing `superrepo` + Enter selected `e2e-superrepo`, and focus returned to the trigger. Link persisted: `e2e-superrepo:Keyboard-linked monorepo:AVAILABLE`. `softFailures: []`. | Pass | `/tmp/proj-e2e-logs/r2-e2e007/result.json` | — |
| 23 | API-001…API-006 | 2026-09-26 16:15 | Completed | `npx vitest run tests/e2e/projects` (server) | Unchanged pass | 6/6 | Pass | `/tmp/proj-e2e-logs/r2-server-e2e.log` | — |
| 24 | E2E-001…E2E-012 | 2026-09-26 16:16 | Completed | `corepack pnpm test:e2e:projects --skip-server-build --output-dir=/tmp/proj-e2e-logs/r2-full`, then a confirmation run to `r2-full-confirm` | All pass | 12/12 in both runs; cleanup complete | Pass | `/tmp/proj-e2e-logs/r2-full/result.json`, `r2-full-confirm/result.json` | — |
| 25 | E2E-013 | 2026-09-26 16:20 | Completed | New case added to the probe; full run to `/tmp/proj-e2e-logs/r2-final` | At 1024×700, index, detail, link and form dialogs have no horizontal overflow; controls are in view; dialogs fit vertically; "Add workspace" stays on one line | As expected: `docOverflowX=0` everywhere. The full run gave 13/13 Pass. | Pass | `/tmp/proj-e2e-logs/r2-final/result.json`, `E2E-013-link-dialog-1024.png` | — |

## Re-entry And Reconciliation

- Last durably recorded event: sequence 25 (E2E-013 Completed, Pass)
- Last completed case and result: round 2 complete. All 19 cases pass: API-001…006 and E2E-001…013.
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none; route to `/code_reviewer` for the proportional test-code review
- Interruption, context-compression, or rerun note:
  - Round 1: sequences 1–20, with E2E-007 failing (`API-F-001`).
  - Round 2: sequences 21–25. The prior failure was rechecked first and passed; the full reruns were identical twice, then E2E-013 was added and the full run passed 13/13.
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md` (round 2)
- Reconciliation note for any case missing a terminal result: none
