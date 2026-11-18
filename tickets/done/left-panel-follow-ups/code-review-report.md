# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001; REQ-003, AC-003, DEC-003)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (E-06, E-07, as cited by DEC-003)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001)
- Design Spec Reviewed As Context: `design-spec.md` (Change 3, DEC-003; escalation trigger; risks)
- Relevant Solution Revision IDs: SR-001
- Design Review Report Reviewed As Context: `N/A`. Direct route (Small/Low).
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Relevant Implementation Revision IDs: IR-001 (`ee1178617c`, `2903fba48a`, `00339421ed`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1 (no earlier code review)
- Review Scope: `N/A` (failure-origin round)
- Trigger: API/E2E round 1 (API-REV-001) `Fail`, 87%: API-04 (PLN-11, last part)
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md` (Preliminary Classification)
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001 (head `2f8ef36bbc`; PLN-11 `43a714f993`)
- Failing Scenario IDs: API-04 / PLN-11 (AC-003, REQ-003)
- Exact Failing Commands / Execution Mode: `pnpm -C autobyteus-web test:e2e:projects-left-navigation --output-dir <fresh>` (or `--cases PLN-11`). Real browser and backend.
- Failure Evidence Paths: `evidence/api-e2e/API-03-04-pln/evidence.json` (`cases.PLN-11`: `mUnlistedMs: false`, `readsAfterOlderArchive: 0`), `PLN-11-older-run-archived-elsewhere.png`
- Project testing guideline applied: `TESTING.md`, as the coverage investigation records it. No conflicts.

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception` (direct route)
- Classification evidence or correction required: the revision must choose what signals a removal, at a cost the design accepts. The Solution Designer reclassifies with it.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis: REQ-003: "With the Projects view shown, a run started **or removed** by another client (another window, the phone, an application, the API) appears in or leaves its Project within one poll (about 5 s), without switching views."
- Scenario:
  - `Supported Normal Scenario`. A Project's run is archived elsewhere (the phone, another window, the API).
  - Its agent has 6 or more newer runs in the same folder outside any Project, which is an ordinary history shape.
  - The removal of an older run is part of REQ-003's text, not a contrived corner.
- Behavior-basis status: `Confirmed`.

## Failure Origin

### CR-001: An open Projects view misses the removal of a Project run that is not among its folder's 6 newest (REQ-003, AC-003)

- How established: `Read`, matching API/E2E's measurement (12 s still listed, 0 `GetProjectRunHistory` reads). I did not rerun it.
- Path:
  1. DEC-003 (`projectRunsStore.ts`, the `listedRootRunIds` watch) re-reads the loaded Projects when the set of root run IDs in `runHistoryStore` changes. Those are the agent runs in `workspaceGroups`, Team runs and Org runs.
  2. While the Projects view is shown, the run section reads that history with the window 6 (`RunSectionPanel.vue:120`, `historyWindowOf`: `null` only for Runs; autobyteus-385 DS-002). It holds only the newest 6 Agent runs per agent and folder.
  3. A Project's own read (`projectRunHistory`) is separate and not windowed that way, so the Project lists run R even when R is outside the history window.
  4. When R, the 7th newest, is archived elsewhere, the windowed history set is the same before and after. Nothing changes, nothing is read, and the Project stays listed.
- Where the design's premise fails:
  - DEC-003 says the comparison is "exact within one poll". That holds for starts, since a new run is always the newest, and for Team and Org runs, which are not capped.
  - It does not hold for removing a windowed Agent run, because the window that 385 set for the Workspaces and Projects views hides it. The design did not trace the window. It treats "the run history poll's set of root runs" as the set of all runs.
- IR-001 implemented DEC-003 exactly. This is not an implementation slip.

### Why `Design Impact`

The fix must choose a different signal or cost, which the approved DEC-003 decided:
- **Use the window `null` while Projects is shown.** The set then covers every run. This revises 385's DS-002 window per view. 385 measured the uncapped poll at p95 151 ms against a 250 ms budget.
- **Watch the shown Projects' own listed runs.** For example, re-read a Project when one of its listed runs drops out of a fuller signal. The windowed set cannot tell "archived" from "fell out of the window", so it needs another source.
- **Re-read the shown Projects on each poll.** This is a cost the design's escalation trigger names, for a set that must change only on add or remove.
- **A server event.** DEC-003 rejected this, and the ticket keeps it out of scope.

Choosing among them, and reclassifying, is the Solution Designer's call.

## Findings

| ID | Severity | Path | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| CR-001 | Blocking (REQ-003, AC-003) | `projectRunsStore.ts` (`listedRootRunIds` watch) with `RunSectionPanel.vue:120` (`historyWindowOf`) | Above; `cases.PLN-11` | Revise DEC-003 so a removal of any run a shown Project lists is seen within one poll, with the cost decided. PLN-11's last part stays the end-to-end check. Per the team rule on problems a later stage caught, add the local check too: a `projectRunsStore` spec where the removed run is outside the history window | `Design Impact` / Solution Designer |

## Follow-ups

- Follow-ups this review added: None.

## Classification

- `Design Impact`, owned by the Solution Designer.

## Recommended Recipient

- Solution Designer (`/software_engineering_team/solution_designer`). After the revision: implementation, then API/E2E (PLN-11, plus PLN-01…10 for the window's effect if it changes).

## Latest Authoritative Result

- Review Decision: `Fail`
- Failure Origin: DEC-003's run-set signal is built from the windowed history, which in the Projects view holds only the newest 6 Agent runs per agent and folder. So the removal of an older Project run changes nothing and triggers no re-read.
- Other cases: API-02, API-03 (PLN-01…10), PLN-11's first parts (start and archive elsewhere of a new Project's run; no reads while hidden) and API-05 (fresh-start release build) pass and are unaffected.
- Notes: established by reading against API/E2E's evidence. Nothing in the worktree was changed.
