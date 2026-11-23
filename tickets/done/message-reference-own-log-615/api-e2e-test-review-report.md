# API/E2E Test-Code Review Report — autobyteus-615

- **Round:** CRR-002 (after API/E2E round 1, API-REV-001 Pass)
- **Review scope:** proportional review of this stage's durable change
- **Reviewed:**
  - `725891acc1`: TESTING.md, one row;
  - `6ef5c7e5dd`: reports and evidence.
- **Code under test:** `0629b5c631`. Since then, `git diff 0629b5c631..HEAD` outside the ticket folder shows only `TESTING.md` and `docs/design-cases.md`. The design case was already in the reviewed package.
- **Result:** **Pass**. No findings. Next: delivery.

## Durable Change: TESTING.md "Choosing the path" Row

| Check | Result |
| --- | --- |
| Matches AC-008 | Yes. The row covers each part of AC-008:<br>- a change to where data is stored, or to which run or owner it belongs, requires every read path of that data (lists, attachments and reference files, counts, links, live updates) through its real route;<br>- this holds for every owner kind and form: standalone, Team, Org, a delegated agent and a delegated team;<br>- a case where the old location still holds a copy does not count;<br>- "expected to work" is a gap to close in the same ticket. |
| Is the rule stated as a property? | Yes. "Assert the property over everything a view lists (every listed item opens), not one example." This is the lesson of the root cause in `test-gap-report.md`. |
| Fits the table | Yes. The first column says what changed; the second says what to run. The style matches the rows around it, and the example is a real file path that exists: `tests/e2e/projects/message-references-every-view.e2e.test.ts`. |
| Project-level, not a ticket record | Yes. It applies to any future data move, and it names no ticket-specific identifiers beyond the example file. |
| Committed on its own | Yes. The commit message explains the reason with the 461 → 615 history. |

## Evidence Spot-Check

- **API-00:** `dist/app.js` was rebuilt at 08:00:39, after `dist` was removed. The build is fresh, as I asked in CRR-001.
- **API-03:**
  - MRV-1 "opened 21 references in 12 views", including `agent: task team member`, the case the founder saw;
  - each in-team reference is listed in both the lead's and the member's views;
  - CRA-1 passes;
  - `Tests 2 passed (2)`.
- **Negative control:** IMP-10 (reviewed in CRR-001) shows that MRV-1 fails on the behavior before the fix.

## Observations Checked

- **The lead's own tab without the delegator's message.** A delegated task team lead's tab does not list its delegator's message. This is MessageViewScope's documented rule (461 SR-074, 565), not a defect of this change. MRV-1 checks every reference that each view lists, and it checks the expected listings only where the rule lists them.
- **The CRR-001 hold still stands.** A view whose records can't be read still answers 500.
- **Docs for delivery's docs sync.** These files still name the old routes:
  - `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`
  - `autobyteus-server-ts/docs/modules/{agent_orgs,run_history,standalone_agent_run_root}.md`
  - `autobyteus-web/docs/{agent_execution_architecture,agent_artifacts}.md`

## Scorecard

| Category | Score |
| --- | --- |
| Fit to AC-008 | 9.5 |
| Rule quality (a property; project level) | 9.4 |
| Evidence (fresh build; negative control) | 9.5 |
