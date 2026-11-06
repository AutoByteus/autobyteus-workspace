# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001; REQ-001…REQ-003, AC-001…AC-004, Scope Guardrail)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (E-01…E-07; E-05 reproduction, E-06 `v-if` control)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001)
- Design Spec Reviewed As Context: `design-spec.md` (Root Cause, Intended Change, Change Scope, Ownership And Dependencies, Tests, Risks)
- Supplemental Task Artifacts Reviewed As Context: none
- Relevant Solution Revision IDs: SR-001
- Design Review Report Reviewed As Context: `N/A`. Direct route (Small/Low): no architecture review.
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Relevant Implementation Revision IDs: IR-001 (`c5cc87d89d`, `7cc31409af`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1 (no earlier code review)
- Review Scope: `N/A` (failure-origin round)
- Trigger: API/E2E round 1 (API-REV-001) `Fail`, 87%: API-03 (RXM-001)
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md` (Preliminary Classification, Acceptance-Criteria Proof)
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001 (head `960e65a812`; live cases `83d625d32d`)
- Failing Scenario IDs: API-03 / RXM-001 (AC-001, REQ-001)
- Exact Failing Commands / Execution Mode: `pnpm -C autobyteus-web test:e2e:run-expand-motion-live --output-dir <fresh>`, after `pnpm -C autobyteus-server-ts build`. Real Chrome, Nuxt dev, this worktree's `dist/app.js`, scripted AGY, owned data. Runs r1 and r2 were identical.
- Failure Evidence Paths: `evidence/api-e2e/API-RXM-r2/delegated-launch-defaults-evidence.json` (`cases.RXM-001`) and `API-RXM-r2/RXM-001-*.png`
- Project testing guideline applied: `TESTING.md`, as the coverage investigation records it. No conflicts.

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception` (direct route)
- Classification evidence or correction required: the fix this failure needs is no longer "one template line". It must decide where Task-summary interest or answer retention lives, or how the row group's move is suppressed. That touches either `AgentRunTaskRows` (left alone, and "Ownership: unchanged") or the shared `taskWorkerTaskStore`. The Solution Designer should reclassify with the revised design; it may still be Small/Low.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis: REQ-001 and AC-001: "In a real browser, collapse then expand a run with many delegated rows. In the first frame and after, every delegated row is at its final position with no transform."
- Scenario: `Supported Normal Scenario`. The user expands an Agent run in the Runs view whose delegated rows are Project Task workers. That is the normal shape of delegated work: an agent's `delegate_task` to Team copies, as in the live case.
- Behavior-basis status: `Confirmed`. The failing case is the approved behavior on its real path.

## Failure Origin

### CR-001: Expanded delegated rows still slide, because their Task lines arrive after the rows mount (AC-001)

- How established:
  - `Read`: the full path, cited below.
  - `Measured` by API/E2E: the frames of r1 and r2.
  - I did not rerun it. The frames match the path exactly.
- Path:
  1. `RunListRow.vue:100-101` (IR-001) mounts `AgentRunTaskRows` only while the run is expanded, so collapse unmounts it.
  2. `AgentRunTaskRows.vue:70` takes Task summaries from `useTaskWorkerTasks(...)`, whose scope retains the rows' workers in `taskWorkerTaskStore` and releases them on unmount.
  3. `taskWorkerTaskStore.ts:103-114`: the release drops the last interest and calls `forgetAnswer(key)`, by design, because a worker no one retains is not followed by the `/ws/projects` feed, so its answer could go stale.
  4. On expand, the rows mount with no answer, so no Task line. `retain` enqueues one batched read (`:94-101`, `enqueue`). When the answers apply (`:71-75`), each row gains its Task line and grows by one line. The `tree-row` `TransitionGroup` (`AgentRunTaskRows.vue:3-6`), already mounted, animates the shift with its 200 ms move.
  5. The evidence matches. Frame 0 tops are 533/563/593 (30 px, one line each), the final tops 551/599/647 (48 px, two lines each), and frame 1 transforms are −18/−36/−54. That is each row offset by the Task lines above it.
- Why earlier checks missed it:
  - E-06's control page and the fixture probe IMP-03 render rows of fixed height with no Task line (IMP-03's `taskWorkerTasks` answer is `[]`).
  - The design's dependency note covered the delegated view's retention across unmount (`agentRunCollaborationStore`, R-01), but not the Task-summary interest, which `AgentRunTaskRows` owns per mount.
  - This is a design premise verified only with content that has no late part. It is not a coding slip in IR-001, which implemented the design exactly.
- The base did not have this effect. With `v-show`, the rows, their interest and the answers stayed mounted, so the change introduced it. That makes it this ticket's.

### Why `Design Impact`, not `Local Fix`

Every fix changes something the design fixed:
- **Keep the workers' interest while the run row exists**, for example by retaining at the `RunListRow` level. This moves Task-summary interest out of `AgentRunTaskRows`, against "Ownership And Dependencies: Unchanged" and "Left alone: `AgentRunTaskRows.vue`".
- **Keep answers after a release** (a grace period or a cache in `taskWorkerTaskStore`). This changes a shared store's freshness rule for the Workspaces tree too. Unretained answers are not followed by the feed, so a stale Task line could show.
- **Suppress the move when content arrives** (for example, no move until the rows' first answers have applied). This touches `AgentRunTaskRows` and the designed move motion (`treeRowLeave.css`), both left alone, and the motion is a preserved behavior.

Choosing among them, and deciding whether it is still Small/Low, is the Solution Designer's call.

### Scope note: the Workspaces and Projects views

The API/E2E engineer withdrew OBS-2 on 2026-11-06. It was a guess from the code, never run, and the user reports that expand and collapse are fine in the Workspaces and Projects views. Only the Runs view has the problem. The requirements' Out Of Scope stands, and the revised design must not widen it.

## Findings

| ID | Severity | Path | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| CR-001 | Blocking (AC-001, REQ-001) | `RunListRow.vue:100-101` with `AgentRunTaskRows.vue:3-6,70` and `taskWorkerTaskStore.ts:103-114` | Above; frames in `API-RXM-r2/…evidence.json` `cases.RXM-001` | Revise the design so the rows mount with their Task lines, or so a Task line arriving after mount does not move the rows. Decide which owner changes (row-level interest, store retention or move suppression). Keep the Workspaces and Projects views out of scope (OBS-2 withdrawn). Per the team rule on a problem a later stage caught, the revision includes the local check: the fixture probe (IMP-03) and a component spec with a non-empty Task answer, so the slide is caught before API/E2E | `Design Impact` / Solution Designer |

## Follow-ups

- Follow-ups this review added: None.
  - OBS-1 (the Runs view's fold resets on a view switch) is API/E2E's observation, outside this failure.
  - OBS-2 was withdrawn by API/E2E (`98dc9d47a4`); the user reports those views are fine.

## Classification

- `Design Impact`, owned by the Solution Designer.

## Recommended Recipient

- Solution Designer (`/software_engineering_team/solution_designer`). After the revised design: implementation, then API/E2E (RXM-001…003).

## Latest Authoritative Result

- Review Decision: `Fail`
- Failure Origin: the design's `v-if` premise was proven only with rows that have no Task line. Unmount releases the Task-worker interest, the store forgets the answers, and on expand the late Task lines grow the rows, which the mounted row group then animates.
- Other cases: API-04 (DONE-row leave), API-05 (stop, reopen, fold, view switch, unfold) and API-06 (the fresh-start release build) pass and are unaffected.
- Notes: established by reading against API/E2E's measured frames. No temporary diagnostics; nothing changed in the worktree.
