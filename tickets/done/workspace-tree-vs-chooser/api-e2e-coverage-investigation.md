# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results go in `api-e2e-execution-coverage-report.md`.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/` unless absolute.

## Investigation Meta

- Requirements: `requirements-doc.md` (SR-004; REQ-002, REQ-004, REQ-006…REQ-011; AC-002, AC-005, AC-007, AC-009…AC-014; DEC-008…DEC-010). Investigation: `investigation-notes.md`. Solution history: `solution-revision-record.md`. Design: `design-spec.md` (SR-004, `Large` / `High`). Supplement: `product-design-request.md` and the Product spec (VIS-001…VIS-017).
- Architecture review: `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-004 Pass). Implementation: `implementation-handoff.md`, `implementation-revision-record.md` (IR-002). Code review: `code-review-report.md`, `code-review-revision-record.md` (CRR-002 Pass; C-05 held for this stage's read budget).
- Revision record: `api-e2e-revision-record.md`; current `API-REV-001`. Round 1; trigger: CRR-002 Pass.
- Code under test: server `a5fc23849e`, web `0d3c31c4ae` and `71ce23ced8` (IR-002). Head at the start: `c764619bd2` (only ticket documents after `71ce23ced8`).
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/TESTING.md` (present).

## Changed Behavior Summary

- The run section has one header menu (`⋯`, "View") choosing Runs, Workspaces (default) or Projects, kept per node in local storage (REQ-006).
- The Runs view is a new ungrouped list, newest first by the server's `lastActivityAt`, the newest 5 with "Show older (N)" and "Archive all older" (REQ-008).
- One read window in `runHistoryStore`: `null` (every run) while Runs is shown, 6 otherwise, 5 on the phone. The server accepts `limitPerAgent: null` on `listWorkspaceRunHistory` and `workspaceRunHistory`; every Agent, Team and Org history item carries `lastActivityAt`, read from memory files on every read (DS-002, DS-005).
- The Workspaces and Projects views list a folder or Project only while it has a listed run; empty states are text only (REQ-009, REQ-011). A removed (unregistered) folder has no node whatever kind of run it has (CR-001).
- The folder X and every add action leave the run section (REQ-007, REQ-010).
- The chat chooser has "Remove" on each user folder, with a confirmation; refused while a run is running there with "Stop active runs before removing this workspace."; the chip falls back to Temp (REQ-002, REQ-004).
- Persisted data `Not Affected`; no compatibility branch.

## Supported Scenarios And Real Usage

- UC-001…UC-003, and the code review's SCN-A…SCN-D2.
- Added from investigation: the user's own shape (378 E-013: about 40 Agent runs and 200 Team runs; E-022 today: 56 listed runs) for the poll's cost; a draft that is never sent; a folder whose only runs are Team or Org runs; the phone and the desktop open at the same time (design Risks); "Archive all older" while an older run is running.
- Contrived: none.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Changed Boundary | Repository Evidence | Risk Not Exercised | Candidate Validation |
| --- | --- | --- | --- | --- | --- |
| Server GraphQL | Yes | `limitPerAgent: null`; `lastActivityAt` / `last_activity_at` on the history items | IMP-01 (schema and service tests, `run-last-activity-reader`) | The cost of the read on a large real data root over HTTP (C-05); the content of a real read | A read-budget probe on a shaped, API-created data root, against this build and the base build |
| Frontend run section and chooser | Yes | header menu, three views, window, folder rule, patch rebuild, chooser Remove | IMP-09/10 (web specs), IMP-20 (rendered states on a real stack) | Lifecycle across real polls; the window on the wire; the round trip's shrink; Remove of a chosen folder with each run kind; archive-older on a real server; phone and desktop together | Browser cases on the probe-owned stack (real Chrome, Nuxt dev, `dist/app.js`, scripted AGY) |
| Existing browser probes that drove the removed switch or add form | Yes (updated by implementation) | `projects-left-navigation-probe.mjs`, `agy-process-restart-focus-continuation-probe.mjs`; five fixture pages | Not run | Drift from the new UI | Run them |
| Persisted data, desktop shell, contracts | No | — | — | — | — |

## Project Execution Discovery

- TESTING.md: renderer → web specs plus a browser probe on a probe-owned stack; server APIs → server tests plus E2E; one heavy run at a time; clean environment; scripted AGY; never the user's app or data. A build of each measured worktree (`dist/app.js`).
- Stacks: `delegated-launch-defaults-probe.mjs` (case modules; real Chrome → Nuxt dev → `dist/app.js`; scripted AGY; Phone Access pairing used by LRL-004); `delegated-copies-large-hub-probe.mjs`'s seed-then-measure pattern for the budget.
- Base build for the comparison: a temporary detached worktree at `3ef5e33eec` (`/Users/normy/autobyteus_org/autobyteus-worktrees/wtvc-385-base`), installed and built; removed after the run.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related AC | Validity | Action |
| --- | --- | --- | --- | --- |
| Server unit (`run-history-window-schema`, `run-last-activity-reader`, history services, `workspace-removal-guard`) | window and last activity, refusal copy | DS-002, DS-005, REQ-004 | Still Valid (IMP-01 at `0d3c31c4ae`; no server change since) | Reuse |
| Web specs (header, window, folder rule, run list, chooser Remove) | the views and rules with stubs | AC-002…AC-014 | Still Valid (IMP-09/10 at `71ce23ced8`; no code change since) | Reuse |
| `IMP-20-render-probe.mjs` (ticket evidence) | the rendered VIS states | VIS-001…VIS-017 | Valid for `0d3c31c4ae`; IR-002 does not change its states | Reuse as evidence; not durable |
| `projects-left-navigation-probe.mjs` | Projects view, PLN-01…PLN-10 | AC-009, AC-012, AC-014 | Updated, not run | Run |
| `agy-process-restart-focus-continuation-probe.mjs` | AGY Team/Org continuation across backend processes | — (its add-form fallback removed) | Updated, not run; needs real AGY inference on the host login | Decide below |
| Fixture probes: `agent-org-task-team-disclosure`, `background-agent-renderer-contention`, `standalone-agent-error-stop`, `task-agent-sibling-sidebar`, `team-activity-presentation` | tree components on fixture pages | trees' rows preserved | Fixture pages updated (removed props, `lastActivityAt`), not run | Run |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-007 (suites), all at the repository layer | server, web | Reused | IMP-01, IMP-02, IMP-03 (server, `0d3c31c4ae`), IMP-09, IMP-10 (web, `71ce23ced8`) | No code change after them |
| API-02 | Design Risks (250 ms), C-05; DS-002, DS-005 | server over HTTP | Durable (`run-history-read-budget-probe.mjs`) | Seed through public APIs (40 Agent runs over 3 agents and 3 folders, 200 five-member Team runs, 10 Org runs, one turn each, stopped). Measure 40 poll reads (both queries in parallel, as the app) with window `null` and 6 on this build, and window 6 on the base build; content checks RB-C1…C4 | The escalation trigger; the read's content against a real data root |
| API-03 | AC-012, VIS-017, DEC-010, REQ-009 | browser | Durable (WVC-001) | Team-only and Org-only folders listed; draft-only folder not listed across a poll; listed on the first send; its run stopped and archived in the Runs view → unlisted; chooser keeps every folder | Lifecycle on real polls |
| API-04 | AC-002, AC-005, CR-001 | browser | Durable (WVC-002) | Chosen folder with stopped Agent, Team, Org runs removed in the chooser: toast, chip → Temp, not offered, not listed after a poll, its runs in the Runs view and history, files kept; a folder with a running run refused and unchanged | Real-stack Remove per run kind |
| API-05 | AC-009, AC-011, REQ-008; DS-002, DS-007 | browser | Durable (WVC-003) | 9 runs of one agent in one folder plus a running older run: Runs → Workspaces → Runs with the window on the wire (`null`/6/`null`), "Show older (N)" = listed − 5, the tree shows the newest 6, nothing missing after the round trip, reload keeps Runs; "Archive all older" refused while an older run runs, then archives exactly the older runs | The shrink reconcile and the bulk archive on a real server |
| API-06 | DS-002, design Risks (phone and desktop) | browser + phone | Durable (WVC-004) | Desktop Runs view reads `null`; the paired phone reads 5; the desktop still reads `null` afterwards | The shared store's window per surface |
| API-07 | AC-009, AC-012, AC-014 (Projects view) | browser | Existing (updated) | `projects-left-navigation-probe.mjs` PLN-01…PLN-10 | Updated, never run |
| API-08 | Preserved: the trees' rows | browser, fixture pages | Existing (fixture pages updated) | The five fixture probes | Updated, never run |
| API-09 | — | browser, real AGY | Existing (updated) | `agy-process-restart-focus-continuation-probe.mjs` | See Not Tested |
| API-10 | Preserved: the trees' rows under REQ-009 | browser | Existing (updated during execution) | `task-closure-tree-probe.mjs` (BR-001…016), `team-status-live-probe.mjs` (TS-001…007) | Added during execution: both waited for two folder rows (Temp and the workspace), and Temp is listed only while it has a run |

- Test progress log: `Yes`.

## Durable Coverage To Add

| Case ID | Path | Why |
| --- | --- | --- |
| API-02 | `autobyteus-web/tests/e2e/run-history-read-budget-probe.mjs`, script `test:e2e:run-history-read-budget` | Repeatable poll-read budget on a shaped data set, with a base comparison |
| API-03…API-06 | `autobyteus-web/tests/e2e/workspace-views-chooser-cases.mjs`, registered (opt-in) in `delegated-launch-defaults-probe.mjs`, script `test:e2e:workspace-views-chooser` | Real-stack proof of the views, the window and the chooser Remove |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User Only? | Follow-Up |
| --- | --- | --- | --- | --- |
| `agy-process-restart-focus-continuation-probe.mjs` | It needs real AGY inference with the host login and real `HOME` (TESTING.md known gap), adding conversations to the user's `agy` history; its subject (continuation across backend processes) is not changed by this ticket. The ticket's change to it is one line: the workspace row is found by its Team and Org runs, which WVC-001 proves on a real stack | Low | No | Run it when its own subject changes or the user asks |
| Electron shell | Browser layer only; no desktop-shell change | Low | No | — |
| Pixel comparison with the Product screenshots | IMP-20 and the code review compared them; this stage asserts DOM and state | Low | No | — |

## Ambiguities Or Reroute Triggers

- Escalation trigger: the uncapped read with `lastActivityAt` over 250 ms (p95 of a poll read) on the shaped data set, or the capped read slower than the base by more than 250 ms. Either routes to the Solution Designer as a design revision, not a silent cap.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added: `Yes`
- Reroute Required Before Validation Execution: `No`

## Execution Notes (round 1)

- PLN-08 still expected a Project with no run to be listed (REQ-009). It was updated, and its second form showed OBS-1 (FU-004): the Projects view does not re-read for runs started by another client.
- A static scan of the probes that click folder rows added API-10. The other probes click the `workspace` folder after creating runs there and were not run (listed in the report).
