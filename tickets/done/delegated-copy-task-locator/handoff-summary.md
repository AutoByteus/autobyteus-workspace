# Handoff Summary — delegated-copy-task-locator

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator`
- Ticket branch: `codex/delegated-copy-task-locator`. It is local only and has not been pushed.
- Base / finalization target: `origin/personal`.
  - Bootstrap base: `359d2c0ef`.
  - Re-fetched at delivery start (2026-10-11): still `359d2c0ef`. The branch is already current, so no merge or
    rebase was needed.
- Verified state: checkpoint commit `0180f7e7f` plus the uncommitted delivery docs sync (docs only, no source).
- Classification: `Large` / `High`. Route: independent review.
  - ARCH-REV-002 Pass.
  - CRR-001 Pass (9.4 / 10).
  - API-REV-001 Pass (95 % confidence).
  - CRR-002 Pass.

Branch commits on `359d2c0ef`, oldest first:

| Commit | Content |
| --- | --- |
| `40b689078` | Server: `taskWorkerTasks` query and `ProjectTaskService.currentTasksOfTaskWorkers` |
| `6bd2b694a` | Web data: `taskWorkerTaskStore`, `taskLocatorStore`, `useTaskWorkerTasks`, feed delivery |
| `96791230a` | Projects tab locate steps (shell, panel, boards, card); Tailwind `utils/` glob |
| `1949fa92d` | Task summary under delegated copy rows; `onOpenTeamRun` |
| `e97adddf8` | Fix: a leaving two-line row collapses from its own height |
| `2781f8732`, `4de754ba7` | Ticket package and CRR-001 record |
| `479cc0211` | PMU-020..025, fixture Task-worker boundaries (C-002) — delivery checkpoint of API/E2E work |
| `5c0259f3c` | Baseline fix: task-agent-peer-sidebar probe answers `GetRunFileChanges` |
| `361804e45` | `docs(testing):` user-directed TESTING.md rewrite and 7 repointed links |
| `0180f7e7f` | API/E2E and review records with evidence |

## What Changed (user-visible)

- **Task summaries.** Under Agent runs and Agent Team runs in the Workspaces tree, a delegated copy that is a Task's
  assigned worker shows that Task's summary as a second line under its name.
  - Team members, sub-work copies and `@` collaborators keep one line.
  - Agent Org rows are unchanged; they were out of scope.
- **Locating a Task.** Clicking the summary, or pressing Enter or Space on it, shows the Task in the right panel's
  Projects tab:
  - the picker switches to the Task's Project, or to Temp tasks;
  - the card scrolls to the centre, takes focus and is highlighted for 2.4 s;
  - a hiding search is cleared, and a Cancelled Task shows the Cancelled lane;
  - the center view and the tree selection do not change.
  - Clicking the rest of the row still opens the copy.
- **Pages with no right panel.** On a page such as Agents or Projects, the run opens first and then the Task is
  located.
- **Live updates.** Summaries update without a reload when a Task is renamed, closed, reassigned to a follow-up Task
  or deleted.
- **Cancelled pill.** The Cancelled status pill now shows its slate ring (REQ-011).

## Validation Evidence (final)

| Check | Result | Reference |
| --- | --- | --- |
| Server unit (full) | 670 files / 5261 tests pass | `implementation-handoff.md` |
| Web unit (full) | 602 files / 4178 tests pass | `implementation-handoff.md` |
| PMU-001..PMU-025 (real backend, scripted AGY) | 25 / 25 | `api-e2e-execution-coverage-report.md`, `api-e2e-evidence/` |
| task-closure-tree | 10 / 10 | same |
| Fixture probes after C-002 | Pass | same |
| Isolated packaged desktop smoke | Pass | `api-e2e-evidence/desktop/` |
| Test-code review | CRR-002 Pass, no findings | `code-review-report.md` |
| Delivery integration refresh | Base unchanged (`359d2c0ef`); no rerun needed | `release-deployment-report.md` |
| Docs links (delivery-edited docs) | 0 missing targets / 0 bad anchors | `docs-sync-report.md` |

## How To Verify (desktop app)

Build and start an isolated app from this worktree. It uses its own data root and ports and does not touch your
installed app:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator
pnpm --silent isolated-app start --build
```

Stop it afterwards with `pnpm --silent isolated-app stop`.

1. **Summaries.** From a Project, assign Tasks to an Agent and to an Agent Team with a Manager (`delegate_task` with
   a task ID), and let one agent create a Temp task with a description-only `delegate_task`.
   - Expected: each copy row under the run shows its Task's summary in small gray text under its name, with an
     ellipsis when long.
   - Expected: team members and collaborators keep one line.
2. **Hover and select.**
   - Expected: hovering the summary turns it indigo and underlined.
   - Expected: selecting the copy row turns its summary indigo.
3. **Locate, docked.** With the right panel on Files, click a summary.
   - Expected: Projects opens, the picker is on that Task's Project, the card is centred, focused and briefly
     highlighted.
   - Expected: the conversation in the center is unchanged.
4. **Row click unchanged.**
   - Expected: clicking the copy's name opens its conversation and does not locate the Task.
5. **Hidden panel and narrow window.**
   - Expected: with the right panel hidden, a summary click reopens it on Projects.
   - Expected: in a narrow window, the drawer opens on Projects.
6. **Agents page.** Go to Agents (no right panel) and click a summary.
   - Expected: the run opens, and the Task is located in its right panel.
7. **Live.** Rename the Task in Projects.
   - Expected: the summary updates without a reload.
   - Expected: when the Task is marked DONE, the copy row leaves the tree.
8. **Optional.**
   - Search the board for unrelated text, then click a summary. Expected: the search clears.
   - Switch to 简体中文. Expected: the tooltip reads "在项目中显示任务：…".

## Open Items And Risks

- **RSK-001.** `codex/delegated-team-aggregate-status` has not landed.
  - It is a local branch, not on `origin`.
  - Whichever branch lands second rebases. If it lands first, re-run before the final merge:
    - the row specs;
    - PMU-018..021 and PMU-023;
    - `nested-team-aggregate-status`.
  - At finalization delivery re-checks `origin/personal`, so this is caught then.
- **Base-failing probes**, reported by API/E2E to their owners. They fail identically on base, not because of this
  ticket:
  - NTAS-BR-002;
  - BG-BROWSER-004;
  - the team-activity-presentation fixture.
- **C-001.** `autobyteus-server-ts/src/projects/services/project-task-service.ts` has 499 of 500 effective lines. The
  next change there needs an extraction first.
- **Follow-up candidates**, out of scope:
  - Org-run Task-worker summaries;
  - a full regeneration of `autobyteus-web/generated/graphql.ts`, which was already out of step before this ticket.
- Persisted data: `Not Affected`. No migration, and no rollback data concern.

## Delivery State

- Docs sync: `docs-sync-report.md`, result `Updated`.
- Release notes: `release-notes.md`, kept for a later curated stable release. Beta releases publish generated notes.
- **User verification received** 2026-10-11 (`user-verification.md`): "i have also tested. i verified. its
  working. now finalize, and release anew beta."
- Finalization and the requested beta release follow: archive commit, ticket-branch push, `origin/personal`
  re-check, merge and push, beta tag, cleanup. Results: `release-deployment-report.md`, DR-002.
