# Handoff Summary — projects-always-on

## Status

- Delivery state: **DR-002: finalized and released as beta `v1.4.96-beta.5`.**
  - Merged into `personal` as `395d0840c`.
  - All 4 workflows succeeded, and the prerelease, updater metadata and Docker tags are verified.
  - The worktree and branches are cleaned up.
  - `82960e903` was kept.
  - A stable `v1.4.96` was requested next (DR-003).
  - The sections below are kept for history.
- Classification (unchanged): `task_size=Medium`, `architectural_risk=Low`, **direct route**. Architecture review, source code review and test-code review are `Not Applicable — direct low-risk route`.

| Stage | Revision | Result |
| --- | --- | --- |
| Requirements | SR-002 (flag removal, user-approved) + SR-003 (tab, at the user's direction) | Approved |
| Design | SR-003 | Done |
| Implementation | IR-001 (`0fd265652`), plus 8 labelled baseline-fix commits | Done |
| API/E2E | API-REV-001 | Pass, 95% confidence |
| Docs sync | DR-001 | Updated MCP doc, `TESTING.md`, web `projects.md` |

| Item | Value |
| --- | --- |
| Worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on` |
| Ticket branch | `codex/projects-always-on` (local, not pushed) |
| Finalization target | `origin/personal` |
| Follow-up (user-requested, after verification) | `0446c378c`: the visible "Show" label is removed from the Projects tab picker. The screen-reader-only label is "Choose a Project or Temp tasks". |
| Branch commits on `93d1b18b4` | `a28264b7f` (TESTING.md rule 9) → 7 baseline fixes (`0a5f888d0`, `4f1ce2ca3`, `d98b1a0c5`, `0af5cd86f`, **`82960e903`**, `7fc41f3d7`, `675e5221b`) → `a5b10f8e7` (package) → `0fd265652` (feature) → delivery checkpoint `8a1ed4647` (PMU-016, probe hardening, API/E2E artifacts) |
| Integrated base | `origin/personal@93d1b18b4`. The base had not advanced, so no merge was needed. |
| Pre-release check | `scripts/check_repository_artifact_hygiene.py` passes |

## What Changed (for you)

1. **Projects is always on (desktop).**
   - The `ENABLE_PROJECTS` capability, its GraphQL API, the Settings switch and the route middleware are removed.
   - A stored value is ignored and is now a deletable custom setting. There is no migration. The mobile runtime still hides Projects.
2. **Projects tab in the right panel.** It is first, before Files, in Agent, Team and Org conversations.
   - Picker: remembered per node. It defaults to the most recently updated Project, else Temp tasks.
   - A live compact board; card → in-tab detail → back; "Open in Projects".
   - A worker opens in the center, and the tab stays.
   - On narrow windows it is listed in the strip and the drawer.
3. **Baseline fixes (new TESTING.md rule 9).** 22 files that also failed on `personal` now pass. Seven commits are test-only. One changes product code (below).

## Decision Needed: product baseline fix `82960e903`

- **What:** five Settings › Token statistics components change fixed `px` font sizes (`text-[10px]`/`[11px]`, `9px`/`10px`) to the same sizes in `rem`.
- **Effect:** identical at the default font size. These labels now scale with the app's font-size setting.
- **Why it was made:** the repository's `app-font-size-fixed-px-audit` spec failed on `personal` because of these sizes.
- **The issue:** TESTING.md rule 9 (added in this branch) says product fixes should be reported, not fixed in-branch. API/E2E flagged it.
- **Delivery's recommendation: keep it.**
  - It is tiny and behavior-preserving at the default size.
  - It aligns with the existing app font-size rule that the audit enforces, and it turns a red repository check green.
  - It is listed in the release notes.
- If you'd rather keep this ticket strictly scoped, I will revert that one commit before merging. The audit then stays failing on `personal` and goes to a separate ticket.

## Verification Evidence

- **API/E2E (real built backends, Chrome):**
  - **PMU-001..016: 16/16**, including PMU-015 (tab journey) and PMU-016 (Team/Org tab, constrained width).
  - **PT-E2E-001..016: 16/16 on the final run.** This covers always on, a stored `false` being ignored and deletable, no Settings switch, and AC-005/011.
- **Implementation:** full web suite 582 files / 3900 tests, exit 0, after the baseline fixes. Contracts 22/22. The navigation probe was run twice.
- **Delivery smoke:** web Projects/stores/settings/layout 149 files / 1294 tests; both probes pass `node --check`; the hygiene check passes.

## Suggested Checks For You

1. Settings › Server: the Projects switch is gone, and Projects is in the main navigation.
2. Open any conversation. The right panel's first tab is **Projects**. Pick a Project and watch Tasks update live.
3. Click a card, read the Task and go back. Click the worker: its conversation opens in the center, and the Projects tab stays selected.
4. Reload. The tab remembers your Project choice.

## Residual Risks / Non-goals

- PT-E2E-005/006 narrow-layout check: an intermittent timing flake (measured right after a viewport resize). It is contained: the probe now restores locale and viewport in `finally` and logs measurements. It is not root-caused.
- **Remaining server baseline failures (49 tests in 19 files), reported under rule 9** with first-level causes in `implementation-handoff.md` › Known Risks: application-platform/orchestration API drift, memory explorers, workspace converter/manager, studio services, a pinned prisma version, machine-dependent env reads, and four not yet diagnosed. A dedicated baseline-repair ticket is recommended.
- Web `vue-tsc` reports 385 pre-existing errors, mostly missing `@apollo/client` / `@vue/apollo-composable` type declarations. They are reported as their own item.
- Not run, judged proportionate: a packaged desktop app (no shell change), the mobile runtime (unit-covered gate), and two-node picker memory (unit-covered).

## Pending After Your Verification

1. Apply your decision on `82960e903`.
2. Archive the ticket.
3. Commit and push the branch, then merge into `origin/personal` and push.
4. Release only if you ask for one. The hygiene check is run before any tag.
5. Clean up the worktree and the branch.
