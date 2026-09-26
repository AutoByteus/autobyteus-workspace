# API/E2E Execution Coverage Report

Package `PROJ-TASKS-20260926-001` — `project-tasks` (description-only Project Tasks on a two-pane Projects page).

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/requirements-doc.md` (Approved, `SR-003`)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-spec.md` (`SR-004`)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/handoff-to-architecture-review-sr-004.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-review-report.md` (`ARCH-REV-001`)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/implementation-revision-record.md` (`IR-001`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/code-review-report.md` (`CRR-001`)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: `1`
- Trigger: `/code_reviewer` implementation-review Pass `CRR-001` of `IR-001` (`8d3de39a6`, `e8fca7771` on `e06080b00`)
- Prior Round Reviewed: N/A
- Latest Authoritative Round: `1`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md` (round 1)
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. E2E-026 (a mixed-status fixture) was added during planning to prove status-as-text and the not-done count with Done Tasks present.
- Existing coverage decisions revised during execution: none
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded: `Yes` (sequences 1–20)
- Long-running checkpoints: `Yes` (sequence 1 baseline)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: sequence 20
- Cases still running, interrupted, or not started: none
- Interruption or rerun note: probe runs 1, 2 and 3 were identical

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| API-001 … API-009 | Pass | seq 2–5 | `/tmp/ptasks-logs/server-e2e-run{1,2,3}.log` | Pass |
| E2E-001 … E2E-013 | Pass | seq 6, 20 | `/tmp/ptasks-logs/probe-run{1,2,3}/result.json` | Pass (released journeys on two panes) |
| E2E-014 … E2E-026 | Pass | seq 7–20 | same | Pass. Two non-blocking notes (E2E-021 focus after delete; E2E-026 count note). |

## Compatibility / Legacy Scope Check

- Backward compatibility introduced, tolerated or ambiguous in requirements or design: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. There is no redirect from the old card grid and no re-export.
- Approved persisted-data transition followed: `Yes` (`Directly Usable — No Migration`)
  - A released v1.4.86 row reads through the normal reader, and reads do not rewrite the file (API-009, E2E-024).
  - The first write adds `tasks` while keeping all released fields.
- Durable coverage retained only for compatibility behavior: `No`
- Reroute: N/A

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| API-001…006 | Released AC-001–009; AC-001 (Task survives restart), REQ-013 | Capability, CRUD, links, restart | Full schema, isolated config, shell env not scrubbed | Durable | Pass | `projects-graphql.e2e.test.ts` |
| API-007 | AC-001–004, 007; REQ-001–003 | `ProjectTaskService` + resolver + real store | same | Durable | Pass | same |
| API-008 | AC-006; QR-001 | Cascade | same | Durable | Pass | same |
| API-009 | AC-010; REQ-013 | Released-row reader | same | Durable | Pass | same |
| E2E-001…013 | Released ACs; AC-008 (flag), AC-011 (list switching) | Two-pane route shell | Browser, live nodes A/B | Durable / Browser | Pass | `result.json` |
| E2E-014 | AC-001, AC-002, AC-007; REQ-003 | Task panel, row, dialog; store; count push | Browser | Durable / Browser | Pass | same |
| E2E-015 | AC-003, AC-004 | Dialog edit and delete modes | Browser | Durable / Browser | Pass | same |
| E2E-016 | AC-005, QR-002, REQ-006 | Client-side search and filter, 120 Tasks | Browser timing | Durable / Browser | Pass | same |
| E2E-017 | AC-006, REQ-008 | Project delete count and cascade | Browser + files | Durable / Browser | Pass | same |
| E2E-018 | AC-007, REQ-009 | `openTaskCount` in the list pane | Browser | Durable / Browser | Pass | same |
| E2E-019 | AC-008, REQ-010 | Route gate with Tasks | Browser | Durable / Browser | Pass | same |
| E2E-020 | AC-011, REQ-016 | Nested routes, pane persistence, deep link, prompt, not-found | Browser DOM identity | Durable / Browser | Pass | same |
| E2E-021 | AC-012, QR-003 | Keyboard and focus across Task dialog modes, tabs, Project delete | Browser keyboard-only | Durable / Browser | Pass | same |
| E2E-022 | AC-012, REQ-015 | zh-CN Task catalogue | Browser zh-CN | Durable / Browser | Pass | same |
| E2E-023 | REQ-016 (stacking) | `md` breakpoint layout | Browser 700×900 | Durable / Browser | Pass | `E2E-023-narrow-*.png` |
| E2E-024 | AC-010, REQ-013 | Released file on a live node | Browser + node C + file bytes | Durable / Browser | Pass | same |
| E2E-025 | AC-001, REQ-013 | Real restart | Lifecycle + browser | Durable / Browser | Pass | same |
| E2E-026 | AC-002, AC-007, REQ-006, QR-003 | Status rendering and counts beyond To Do | Browser + node C fixture | Durable / Browser | Pass | same |
| AC-009 | REQ-012 | Delegated tasks (unchanged) | Existing suites + unchanged files + architecture/schema tests | Durable (existing) | Pass | `/tmp/ptasks-logs/{web,server}-delegated.log` |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 8 | `corepack pnpm -C autobyteus-server-ts build` | worktree | Live nodes run the reviewed server | Pass | `/tmp/ptasks-logs/server-build.log` |
| 9 | `node tests/e2e/projects-feature-probe.mjs --skip-server-build --output-dir=/tmp/ptasks-logs/probe-run1` | `autobyteus-web` | E2E-001…026 | 26/26 | `/tmp/ptasks-logs/probe-run1/` |
| 10 | `corepack pnpm test:e2e:projects --skip-server-build --output-dir=/tmp/ptasks-logs/probe-run{2,3}` | `autobyteus-web` | Determinism, script entry | 26/26 ×2 | `/tmp/ptasks-logs/probe-run{2,3}/` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 95% | +15 | Every AC is directly proven. AC-001–008 and 010–012 run through live UI and API. AC-009 (preservation) is covered by unchanged delegated-task code and passing delegated-task suites (web 112, server 200). | AC-009 was not exercised in a live team run, which needs an LLM runtime; the preserved code is unchanged |
| Changed-boundary execution directness | 80% | 95% | +15 | Real browser → Nuxt → server → `projects.json`, including nested routes and the Task dialog modes | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | +20 | Three live nodes, a real restart, a released-file node, cross-origin rebinding; no mocks on the probe path | Rebinding uses `bindNodeContext`, the same method the shell calls |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | +5 | Scrubbed/hermetic flags on both surfaces. The released fixture is written in the store's own format and read by a restarted node. The diff has no build or runtime config change, so the dev-server bundle is representative. | macOS only |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | +10 | Empty and whitespace validation (create and edit); Cancel paths (edit, Task delete, Project delete); no-match and clear; not-found recovery; flag off/on; restart; cascade | — |
| User-surface, browser, and desktop-shell confidence | 60% | 95% | +35 | 1440×900, 1024×700 (released E2E-013) and 700×900 stacked; keyboard-only journey; zh-CN; status as text for all 3 states | Focus after a Task delete lands on `BODY` (non-blocking; the ACs are met) |
| Durable regression coverage quality and relevance | 85% | 95% | +10 | 9 API cases + 26 browser cases with per-case evidence and cleanup; hermetic harness | — |

- Overall post-repository confidence: 79%
- Overall final confidence: 95% (665 / 7)
- Calculation method: simple average
- Confidence change produced by broader validation: +16
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material (see Evidence / Notes)

## Broader Validation Decision And Execution

- Decision and mode: `Required` — Browser with isolated live nodes (A, B, and C for released and mixed-status fixtures), a real restart, three viewports, keyboard-only, and zh-CN
- Material deviation: none
- Gaps addressed: Task journeys; two-pane routing and DOM persistence; the narrow layout (not rendered by implementation); 100+ Task timing; released-file upgrade on a live node; status labels beyond To Do
- Startup:
  1. Server build.
  2. Probe-owned `prisma migrate deploy` + `node dist/app.js --data-dir <tmp>/node-{a,b}` (node C created in E2E-024), readiness via `/rest/health`.
  3. `pnpm dev` with `BACKEND_NODE_BASE_URL=A`.
  4. Headless Chromium.
- Environment choices: every `ENABLE_*` variable is scrubbed in spawned processes (the shell exports `ENABLE_PROJECTS=true`); `en` preset, with zh-CN in its own context; UTC.
- Seed data: Projects and Tasks through the UI when under test, otherwise through real GraphQL mutations. Five temp workspace roots plus `e2e-released-ws`. Node C gets the released-shape and mixed-status `projects.json` written between restarts.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| E2E-014 create | To Do, first-line summary, empty rejected, live count, no status control | Row "To Do / Write release notes for 1.4.87 / just now". The error is `role=alert` with `aria-invalid` and `aria-describedby`. Count went 0 → 1 → 3 open with no reload. Row, view, edit and create have 0 status controls. Order: Plan / Fix / Write | `result.json` › `E2E-014` | Pass |
| E2E-015 edit/delete | Cancel discards; save shows the full text; delete confirmation | Prefill is the full text; Cancel restored it; the empty edit was rejected; the saved text shows in full and moves to the top. The delete message names the summary with initial focus on Cancel; Cancel kept it; confirm removed it; 2 open | `E2E-015` | Pass |
| E2E-016 scale | Search < 100 ms; filter; no-match | 14 matches (including later lines); max update 4.3 ms; max to painted frame 17–24 ms; DONE and IN_PROGRESS → no-match; Clear → ALL and 120 rows with focus to search; Tasks unchanged | `E2E-016` | Pass |
| E2E-017 Project delete | "5 tasks"; Cancel keeps; cascade; registry unchanged | "…and its 5 tasks?" on both tabs; file clean; `workspaces.json` and memory dir unchanged | `E2E-017` | Pass |
| E2E-018 counts | N open | 4 / 0 / 2 / 120 open | `E2E-018` | Pass |
| E2E-019 flag | Hidden, then the same Tasks | Route and deep link redirect home; Tasks identical | `E2E-019` | Pass |
| E2E-020 two panes | One click, same pane; deep link; prompt; not-found | Same pane node across switches and tab changes, no reload, `aria-current=page`; deep link opens Tasks; prompt with no highlight; not-found inside `projects-page-content` and the pane is usable | `E2E-020` | Pass |
| E2E-021 keyboard | Every action by keyboard | All steps pass (`softFailures: []`). Focus after a Task delete = `BODY` (observation) | `E2E-021` | Pass |
| E2E-022 zh-CN | Localised | "4 项未完成", 任务 / 新建任务 / 待办 / 全部状态, dialogs, validation, empty state; no raw keys or English Task strings | `E2E-022` | Pass |
| E2E-023 narrow | Stacked | Column; pane 342 px above content; no overflow; dialog within 700×900 | `E2E-023-narrow-*.png` | Pass |
| E2E-024 released file | Intact, no rewrite | "Released project", 0 open, link AVAILABLE; bytes identical after browsing; the first UI write kept every released field | `E2E-024` | Pass |
| E2E-026 status beyond To Do | Text labels; filter; not-done count | Done / In Progress / To Do labels; each filter shows 1; "2 open" | `E2E-026` | Pass |
| E2E-025 restart | Identical | All Projects and Tasks identical; UI 2 open | `E2E-025` | Pass |

## Desktop Application Validation

- Approach: browser against `pnpm dev`; renderer-only change
- Shell-specific behavior: none changed
- Effect on the running desktop application: `None`

## Platform / Runtime Targets

- macOS (darwin-arm64); Node v22.23.1; playwright-core 1.58.2 bundled Chromium (headless)
- Viewports 1440×900, 1024×700 and 700×900; `en` and `zh-CN`; UTC; keyboard-only journey in E2E-007 and E2E-021

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Directly Usable — No Migration`
- Representative existing data: a v1.4.86 row with a workspace link and no `tasks`, both in the API e2e and on live node C
- Result: intact reads, no rewrite on read (bytes and mtime), and the first write persists `tasks` while keeping the released fields (API-009, E2E-024). A real restart preserves all Projects and Tasks (E2E-025, API-006).
- Version-specific branch or fallback: `No`
- Residual risk: none material

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` | Updated: a hermetic `ENABLE_*` stash/restore; `openTaskCount` in the fields; the Task service singleton reset; API-006 + Task. Added: API-007, API-008, API-009 | AC-001–004, 006, 007, 010; REQ-003, 013; QR-001 | 9/9 ×3 with the shell flags set | The released API-001 failure under shell flags was a test-environment defect, now fixed |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | Updated: header, Task and binding helpers, node C lifecycle, `e2e-released-ws` root. Added: E2E-014…026. (`IR-001`'s adaptations of E2E-001…013 were reviewed and retained.) | AC-001–008, 010–012; QR-002, QR-003; REQ-016 | 26/26 ×3 | Evidence per case; cleanup covers node C |

## Tests Removed As Stale Or Obsolete

None by API/E2E. `IR-001` removed `ProjectsList.spec.ts` (the released card grid, superseded by `REQ-016`) and replaced the released "no Task wording" assertion in E2E-008 with a raw-key check (`REQ-011`). Both were accepted in `CRR-001` and verified valid here.

## Durable Coverage Changed In The Codebase

- Durable coverage added or updated this round: `Yes` (uncommitted in the worktree)
- Paths:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/autobyteus-web/tests/e2e/projects-feature-probe.mjs`
- Paths removed: none
- Attached for the proportional test-code review: `Yes`

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `/tmp/ptasks-logs/` | Logs, probe results and screenshots | Retained (outside the repo) | `probe-run1/result.json` holds the observations; runs 2 and 3 confirm them |

## Temporary Execution Methods / Scaffolding

None beyond the durable probe.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Run managers (API e2e only) | `getInstance` returns "no active runs" | Process singletons | None for Tasks |
| Future agent-written statuses (E2E-026) | Current-shape `projects.json` with IN_PROGRESS/DONE written between restarts | No status mutation exists (`REQ-003`) | Represents the model's valid states; not a user path |
| Electron window bootstrap | In-page `bindNodeContext` (E2E-011, E2E-024, E2E-026) | Browser surface | Window creation is unchanged code |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | API-001…009, E2E-001…026, AC-009 suites | All approved ACs proven |
| Out Of Scope | Pre-existing failures | `org-definition-navigation` (web) and the `workspaces-graphql` removal test (server), both on the released package's base-failing list |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe nodes A/B/C, frontend, browser (runs 1–3) | Probe-owned | Process-group SIGTERM/SIGKILL; `browser.close()` | `terminated:*` for all in every `result.json` |
| Probe temp roots | Probe-owned | `fs.rm` | `tempRoot: removed`; no `$TMPDIR/autobyteus-projects-e2e-*` left |
| API e2e temp app data dirs, `process.env` flags | Test-owned | `afterEach` removes dirs and restores the stashed `ENABLE_*` | Restored |
| `autobyteus-web/test-results/` | Implementation-owned (pre-existing, untracked) | Not touched; my output went to `/tmp/ptasks-logs` | Unchanged |

## Preliminary Classification

N/A — Pass.

## Recommended Recipient

`/code_reviewer` — proportional test-code review (`api-e2e-test-review-report.md`)

## Evidence / Notes

These notes are non-blocking; no approved AC is violated.

1. **Focus after a Task delete.** Deleting a Task from its dialog removes the row that opened it, so `ProjectDialogFrame` has no focus-return target and focus falls to `BODY` (E2E-021). A keyboard user then needs about 35 Tabs to reach New task again. AC-012 and QR-003 are met, because every action stays reachable. Suggested polish, at the owner's discretion: return focus to the next row or to New task.
2. **Delete count.** With a Done Task present, the Project delete message counts open Tasks: "2 tasks" for 3 (E2E-026 observation). This is unreachable in this ticket and is the known review note 1. Carry it to the Task-admission ticket.
3. **Environment.** The developer shell exports `ENABLE_PROJECTS=true` and other flags. Both durable surfaces are now hermetic against them.
4. **Icon loading in narrow captures.** Decorative Iconify icons can be missing in a fresh-context screenshot taken immediately after load. They are `aria-hidden`, and layout does not depend on them.
5. **Carried from review.** Relative dates follow the browser locale (repo convention).

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` target met: `Yes`
- Any final applicable category below `90%`: `No`
- Broader validation decision: `Required` — executed
- Critical acceptance criteria lacking direct proof: none
- Required next recipient: `/code_reviewer` (proportional test-code review)
- Notes:
  - `task_size=Medium` and `architectural_risk=High` are preserved.
  - Durable test changes are uncommitted in the worktree.
  - Delivery owns integration, commit and docs sync (design step 10).
