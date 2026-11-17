# Requirements Document

## Document Status

- Status: `Draft`
- Current solution revision ID: `N/A` (SR-001 at the first coherent baseline)
- Package identifier: `follow-ups-of-461-500`
- Request / ticket: Project Task `autobyteus-500` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`: "All follow-ups of autobyteus-461 in one Task"
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), at the founder's word (2026-11-17)
- Requirements owner: Solution Designer (run `solution_designer_65a93db823284ad5b4e87726a5b250a2`)
- Date: 2026-11-17
- Approved by and reference: not yet
- Exact approved requirements baseline / solution revision: not yet
- Behavior-defining supplements: `source-follow-ups-461.md` (the Task's context file: the follow-up rows FU-*, as leads, not decisions)

## Problem And Desired Outcome

- **Problem:** the delivered autobyteus-461 (`v1.5.13-beta.7`) left 22 recorded follow-ups, in six groups:
  1. hosting-era names in the web (FU-019, FU-020);
  2. migration safety (FU-027, FU-032, FU-028, FU-029, FU-033);
  3. server naming and dependency cleanup (FU-006, FU-010, FU-007, FU-011, FU-018, FU-013, FU-002);
  4. refusal wording (FU-030);
  5. tests and tooling (FU-016, FU-021, FU-022, FU-023);
  6. new at delivery (FU-035 Grok's refused tool calls; FU-036 silent drop of an early command).
- **Desired outcome (the Task's goal):**
  - no behavior change, except where a name hid a bug or the founder decided otherwise;
  - green and reliable gates;
  - no silent loss;
  - clear refusals.
- **Done when:** each group is delivered or explicitly dropped with the founder's word, finalized on the base branch. A release happens only on his word.

## Constraints From The Task (the founder's rules)

- Any change to the founder's real data needs his approval and a backup first. No data migration by default.
- FU-027's scope is open with the founder: ask him directly before designing it.
- The Grok waiver rule stays: only the founder's own standing words apply to a Grok smoke case that fails solely on a usage limit.
- Follow `DESIGN.md` and `TESTING.md`.

## Open Decisions

| ID | Decision | Owner | Status |
| --- | --- | --- | --- |
| D-1 | FU-027's scope (the migration runner's order and late-run rules) | **The user**, 2026-11-17 | **Decided: option 1, guards only.** The user: "I feel like a simple guard would be enough … a guard which protects the current order so somebody can only put it in as the latest … being enough for migration." So: the released order is protected (learned from the latest release tag, not a hand-kept list), and a new migration can only be appended as the latest (its ID's date later than the last entry's), by test. The runner is unchanged. Late-running migrations stay handled per migration, by the guideline's rule (461's follow-up pattern). FU-028 and FU-029 are fixed individually. The minimum supported upgrade version (option 3) is not taken. |
| D-2 | Staging of the six groups into deliveries | Solution Designer (user informed) | proposed 2026-11-17 |

(The behavior, scenario, requirement and acceptance tables are written group by group as investigation completes.)
