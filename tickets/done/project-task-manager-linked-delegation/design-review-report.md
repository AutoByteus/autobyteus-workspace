# Design Review Report — ARCH-REV-011 (SR-024: per-Project storage + migration, agent run resources, on SR-023)

This report is authoritative for the latest result. Earlier reports are archived byte-exact in `architecture-review-history/`:
- `arch-rev-010-design-review-report.md` (sha1 `d2190ec4…`): the SR-023 Pass
- `arch-rev-009-design-review-report.md`: the full SR-023 structural review

Their SR-023 verdicts, premises (RV-MP-019–022) and notes (N4–N6) still apply under the C-4 renaming (`TaskRun*` → `TaskAgentResource*`). N5 is now realized by `ProjectsLayout`.

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md`. REQ-BL-009 is Approved (SD-AP-003), with direct user amendments recorded in SR-024:
  - **C-2 relocated:** `<projectId>/tasks/<taskId>/agent_run_resources.json`.
  - **C-3 replaced:** per-Project folders plus a one-time startup migration in this ticket, quoting the user ("Do not defer … super cheap").
  - **C-4:** "agent run resources" naming.
- Investigation Notes: E-094–E-100. Solution Revision Record: SR-024 entries.
- Reviewed Design Spec: `design-spec.md` (SR-023 + SR-024) and `data-model-draft.md`. Diffed against `solution-history/sr-024-prior/` (the ARCH-REV-010 basis).
- Governing policy: `autobyteus-server-ts/docs/design/data_migration_guideline.md`, read in full.
- Current Architecture Review Revision ID: **ARCH-REV-011**. Round 11.
- Prior round: ARCH-REV-010, Pass on SR-023.
- Current-State Evidence Basis: I read these at HEAD `4b04d9097` / base `10fb69504f`:
  - **Migration framework:** `app-data-migration-types.ts` has `SUCCEEDED_WITH_WARNINGS`, item statuses `MIGRATED|SKIPPED|FAILED`, `requiredOnStartup` and `executionPolicy: ANYTIME|STARTUP_ONLY`.
  - **Startup ordering:** `server-runtime.ts` awaits `runPending()` (line 178) before `buildStudioServer` (line 239) and `listen`. `start-standalone-application-host.ts` awaits `runPending()` (line 146) before the composition (line 270) and `listen`. Both only warn on FAILED/RUNNING.
  - **Released `ProjectTaskContextLayout`:** `segment()` uses `encodeURIComponent` and rejects separators and dot segments; there are containment and no-symlink directory checks.
  - **Released locator:** `projectTaskFileLocator` is logical.
  - **Other consumers:** a grep found nothing outside `projects/` that reads `projects.json`, `task_context_*` or the context layout (server and web).

  I ran no tests and made no source, test or Git changes.

## Routing Classification Review

Large / High confirmed. SR-024 adds a released-user-data migration and a store rewrite on top of SR-023. Reviewed route. No correction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**.
- Approved basis:
  - **C-3:** per-Project folders plus a one-time migration; no lockout; only Projects errors while it is pending.
  - **C-2/C-4:** a per-Task `agent_run_resources.json`, kept on Delete.
  - **B-5:** Delete removes metadata and context and keeps the records.
  - **Q-3:** the damaged-file policy, unchanged.
- The user's direction overrides the guideline §2.1 default "avoid migrations by design" at the product level. The relayout changes where every fact lives, which a tolerant reader cannot absorb without a forbidden dual-layout runtime, so **Migration Required** is the correct disposition.

| Behavior | Status | Notes |
| --- | --- | --- |
| BEH-001/002 Projects/Tasks UI and tools | Confirmed | Same services and APIs over the per-folder store; `PROJECTS_MIGRATION_PENDING` goes through the existing `withProjectErrors` → UI alert |
| BEH-003/004 saved packet | Confirmed | From `task.json` + `context/` via `ProjectsLayout` |
| BEH-005–007, 009, 010 (SR-023 runtime) | Confirmed | Unchanged in substance; renamed only |
| BEH-008 Delete | Confirmed | Removes `task.json`/`context/` (or `project.json`, `drafts/` and Task metadata) and keeps every `agent_run_resources.json`; load enumerates all `*/tasks/*/agent_run_resources.json`, so closed-forever survives Delete |
| C-3 migration / no lockout | Confirmed | See Migration review |

## Migration Review (guideline §2 checklist, verified)

| # | Item | Verdict | Evidence / notes |
| --- | --- | --- | --- |
| 1 | Need | Pass | User-directed relayout; no tolerant-reader alternative without dual layout (§4) |
| 2 | Availability | Pass | Migrations finish before Projects composition in both hosts. The runner continues and hosts only warn. The narrow gate is a Projects-only existence check of `projects.json`; Chat, agents and everything else work; never an empty list in place of un-migrated data (§1 "gate narrowly"). The agent-resources view needs no gate (no released files). |
| 3 | Source/target | Pass | Inspected: the released store and context layout, the real dataset (E-095) and the dev lifetime residue. No predecessor migration. The target is admitted by the current ProjectStore and layout. |
| 4 | Disposition | Pass | MIGRATED; already-current → no-op; invalid rows/Tasks, conflicts, duplicates and non-empty residue → SKIPPED with warning and preserved; unparsable source or I/O → FAILED with sources unchanged and the gate kept. Status (runner) is separate from admission (source absent + current reader validates). |
| 5 | Commit/retry | Pass | Per-file atomic writes, same-filesystem directory renames (the `team-agent-memory-layout` lesson), sources kept until the current-reader reread validates, retry recognizes completed targets. No journal, hashes or copies. The retained `projects.pre-folders.json` is the released file renamed, not copied, and keeps excluded rows (§1 "Preserve"; §7 originals). |
| 6 | Current-only boundary | Pass | Old-shape reading only in the frozen `released-projects-array-v1.ts`. Current code only tests the source for existence. The released array path and context layout are removed from runtime. |
| 7 | Cost | Pass | One small read, one write per Project/Task, one rename per directory, one validation reread each. After completion: an existence check, no history audit (§7 "completed means completed"). |
| 8 | References | Pass | `storedFilename` → `context/` is checked. Logical locators are unchanged (verified released format). Absolute paths in past conversations are untyped historical text, an accepted disposition (E-100). Agent run resources are new. |
| 9 | Evidence | Pass | Committed released-data fixtures, including the real-shape sample, context/drafts, dev residue, an invalid row and a duplicate. Also exact target and retained original, statuses, mid-way retry, no-op, gate before/after on both entrypoints, and the store/delete/unsafe-ID controls. |
| 10 | Lessons/review | Pass | Rename relayout, frozen copies, no lockout, no backups or journals (v1.4.87 and startup-performance lessons). Review chain named. |

## Structural Check Of The SR-024 Delta

| Area | Verdict | Notes |
| --- | --- | --- |
| Ownership | Pass | `ProjectsLayout` is the single path owner (replaces the context layout; covers N5). ProjectStore owns `project.json`/`task.json` and the gate. TaskAgentResourceStore/Service own the per-Task resources file. The migration owns old shapes. |
| Boundary / dependency | Pass | Runtime still imports nothing from Projects. The migration may import the current schema only to validate output. |
| Persisted data | Pass | Released Projects data: Migration Required (above). New layout written exactly and read tolerantly, no version field. Agent run resources new. Trees directly usable. |
| Removal | Pass | Released array path, state/metadata schemas, old context layout and the lifetime machinery. |
| Naming (C-4) | Pass | Consistent `agentRunResources`/`agentRun`/`TaskAgentResource*`. |
| Change sequence | Pass | Store/layout and migration first, then the SR-023 steps; implementation holds the storage parts until this pass. |

## Material Premise Validation

### RV-MP-023 — Released user upgrades with Projects data (enabled at some point)

- Basis: Operational.
- Path: install the new release → host startup → `runPending()` → `projects-per-folder-v1` runs before composition → target written and validated → source renamed → Projects composition reads the new layout.
- **Reachable** (E-095 real dataset). The plan covers it.

### RV-MP-024 — Interrupted migration (Quit/kill mid-way)

- Basis: guideline §5, "unfinished attempt".
- Path: sources remain until validation → the gate stays → the next startup's STARTUP_ONLY retry recognizes completed files and renamed directories → completes.
- **Reachable.** Handled by ordinary retry. No journal.

### RV-MP-025 — Interrupted Project Delete (Quit mid-delete)

- Basis: Operational, ordinary interruption.
- The Project delete is now multi-file. If `project.json` is removed and the process stops before every `task.json` is removed, the remaining `task.json` files are not listed (no `project.json`). The design's "find a Task by ID … per Project folder" does not state that a parent `project.json` is required, so a deleted Project's Task could stay resolvable by `task_id` (REQ-011/AC-010: deleted IDs fail).
- **Reachable but narrow.** The fix is one admission rule (N7), with no new machinery.

## Findings

None blocking.

Non-blocking implementation notes:
- **N7 (Task admission vs interrupted Project delete; RV-MP-025):**
  - Admit a Task (listing, find-by-ID, assign, DONE, context and draft operations) only when its parent `project.json` is valid. `agent_run_resources.json` enumeration intentionally ignores this, which keeps closed-forever after Delete.
  - Delete `project.json` first, so any remainder is inert under that rule. Repeating the Delete is not needed, since the Project is gone from listings.
  - Add an interrupted-delete test.
- **N8 (migration ID and path safety):**
  - A released Project or Task whose ID fails the frozen `segment()` → that item `SKIPPED` with a warning (preserved in the retained original), not FAILED.
  - Rename sources and targets through the same contained-directory checks (no symlink following) as `ProjectsLayout`.
- **N9 (gate wording):** the gate is an existence check per Projects operation (or computed once after `runPending()` in the same host process, since STARTUP_ONLY cannot change it later). State one of these consistently. Never cache it before migrations run.

## Classification

N/A (Pass).

## Recommended Recipient

Primary `/implementation_engineer`, then an informational Pass notice to `/solution_designer`, per post-result rules.

## Residual Risks

- All SR-023 + SR-024 controls are unimplemented: the migration fixtures and statuses, the gate on both entrypoints, the per-folder store/Delete rules and all SR-023 runtime controls.
- Code review, then API/E2E on a changed build (IR-012 recheck paused), including a real upgrade from a released profile copy (stopped-writer disposable copy only; never the live profile, §9.5). Then Delivery docs resync.
- Accepted:
  - absolute paths in past conversations keep their old text (E-100);
  - unexpected hand-edited source rows are skipped with warnings;
  - the Q-3 fail-closed behavior;
  - accumulating kept resource files;
  - a single server process;
  - downgrade to a pre-folder release is unsupported (it would see an empty Projects list; the original is retained as `projects.pre-folders.json`).
- **DR-002 must not finalize `ccb5fbe3` / `4b04d9097`.**

## Latest Authoritative Result

- Review Decision: **Pass — SR-024 on SR-023 (ARCH-REV-011)**
- Material-Premise Gate: **Pass**. RV-MP-023/024 are Reachable and handled; RV-MP-025 is Reachable but narrow (N7).
- Notes: Large/High preserved. This is a design Pass, not source, API or migration acceptance.
