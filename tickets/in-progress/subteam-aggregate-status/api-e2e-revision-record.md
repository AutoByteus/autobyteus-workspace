# API/E2E Revision Record

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative. This record preserves the concise completed-round history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | Implementation Engineer / `implementation-handoff.md` / round 1 | `RER-002`; `IR-001`; architecture/review revisions `N/A` | `N/A` | `Pass` / `98%` |

## Revision Entries

### API-REV-001 — Recursive nested-Team aggregate executable baseline

- Triggering role, report path, and round: Implementation Engineer; `/home/autobyteus/workspace/.codex/worktrees/subteam-aggregate-status-requirements/tickets/in-progress/subteam-aggregate-status/implementation-handoff.md`; initial direct-route validation round.
- Triggering finding or scenario IDs: implementation commit `dcd0baf8c`; validation scenarios `NTAS-UT-001`, `NTAS-UT-002`, `NTAS-CMP-001`, `NTAS-STORE-001`, `NTAS-REG-001`, `NTAS-STATIC-001`, and `NTAS-BR-001`–`NTAS-BR-004`.
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: architecture design/review `N/A`; `IR-001`; code review `N/A`; delivery `N/A`.
- Why this baseline was recorded: establishes the first completed API/E2E result for the approved direct `Small` / `Low` package and prevents a missing record from implying prior confidence.
- Coverage decisions or durable test paths changed: extended `workspaceHistoryNestedTeamStatus.spec.ts`; added the deterministic nested-Team browser fixture/probe; registered and documented the probe. No stale test was removed.
- Scenarios added, changed, removed, or rechecked: added exhaustive known-state pair precedence, task-team-child/container/absent-target scope, actual browser five-state rendering, expanded/collapsed/live patch, request guard, route exclusions, English/Chinese accessibility, and exactly-once interactions; rechecked all affected workspace-history/projection/action suites; removed none.
- Commands, environment, fixture, or broader-validation delta: focused Vitest passed (32 + 9 + 13 tests); broader affected suite passed (13 files / 159 tests); web/localization guards and production build passed; static boundary audit passed; deterministic Nuxt/Chromium broader validation passed. Repository-wide `nuxi typecheck` retained its existing 317-diagnostic failure baseline with no new-file diagnostic.

#### Prior Failure Resolution

None — `API-REV-001` has no prior completed API/E2E result or failure.

- Canonical artifacts and sections updated: coverage investigation repository results/post-repository scorecard/broader decision; complete execution coverage report; this revision record; retained `api-e2e-evidence/api-rev-001/` artifacts.
- Prior result and confidence: `N/A`
- Current result and confidence: `Pass` / `98%`
- New or remaining failure IDs: `None`
- Recommended recipient: Delivery Engineer via dynamic handoff rules; proportional test-code review `Not Required — direct low-risk route`.
- Remaining risks, blocked evidence, or untested scope: actual Electron shell and real backend transport were intentionally not run because no such boundary changed; the non-clean unrelated repository typecheck baseline is recorded as a bounded limitation, not a pass.
