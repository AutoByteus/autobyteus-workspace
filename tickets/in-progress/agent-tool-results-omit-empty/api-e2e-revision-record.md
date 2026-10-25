# API/E2E Revision Record — agent-tool-results-omit-empty (autobyteus-260)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` (CRR-001 pass), round 1 | SR-011, ARCH-REV-003, IR-001, CRR-001 | N/A | Fail / 81% |
| API-REV-002 | Code reviewer, `code-review-report.md` (CRR-004 pass), round 2 | SR-012, ARCH-REV-004, IR-002, IR-003, CRR-002–CRR-004 | Fail / 81% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: E2E updated to the new shapes; migration lifecycle and worker-Task store failures

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, round 1.
- Triggering finding or case IDs: handoff Known Risks (E2E files on old shapes); suggested coverage (worker scope, startup migration, first-message line, desktop titles, sizes).
- Related revision IDs: SR-011, ARCH-REV-001–003, IR-001, CRR-001.
- Why this baseline was recorded: first API/E2E round.
- Coverage decisions or durable test paths changed: 2 server E2E files added (`get-project-task-worker-scope`, `project-task-titles-startup`), 25 server E2E files and 7 web probes updated (execution report, Durable Coverage Changed).
- Cases added, changed, removed, or rechecked: API-00 … API-15 (investigation Planned Cases).
- Commands, environment, fixture, or broader-validation delta: clean env with the AGY gate; built `dist/` servers; emulated LM Studio for the native route; real Codex MCP client with a throwaway `CODEX_HOME`; base scratch build for classifying out-of-scope failures.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all), execution report (all), test progress log, `follow-ups.md` (FU-002 … FU-006).
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 81%.
- New or remaining failure IDs: F-001 (API-03, startup migration blocked while keys-v1 is `FAILED`), F-002 (API-11c, web worker-Task store drops `title`, Error 500).
- Recommended owner: F-001 Solution Designer (`Design Impact`), F-002 implementation engineer (`Local Fix`), confirmed by failure-origin review.
- Remaining risks, blocked evidence, or untested scope: API-11d (four probes) and API-12 (isolated desktop) not run until F-002 is fixed; the Codex routing case cannot run (FU-005).

### API-REV-002 — Round 2: F-001 and F-002 resolved; remaining surfaces validated

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-004), round 2; head `fccf1227a6`.
- Triggering finding or case IDs: CR-001 (= F-001, `dfbd2621bb`), CR-002 (= F-002, `52cbc28442`), CR-003 (`56ceef568a`, comment only).
- Related revision IDs: SR-012, ARCH-REV-004, IR-002, IR-003, CRR-002–CRR-004.
- Why this revision was recorded: rerun after the fixes of round 1's failures.
- Coverage decisions or durable test paths changed: `project-task-titles-startup.e2e.test.ts` updated for SR-012 (invalid fixture by status; blank description is an invalid Task); `project-manager-ux-task-locator-cases.mjs` PMU-024 renames send the title. Implementation's update of the keys-failed scenario in `projects-startup-migration.e2e.test.ts` was reviewed against SR-012 and run.
- Cases added, changed, removed, or rechecked: rerun API-03 (in API-10), API-05, API-10, API-11c; first run of API-11d and API-12; new API-10b (classification of a suite-load race, FU-007). Still valid without rerun: API-11a, API-11b, API-09, API-13–15 (rerun-by-impact plan in the report's Round section).
- Commands, environment, fixture, or broader-validation delta: server `dist/` rebuilt; isolated desktop instance of the worktree's Electron build on a copy of the large-hub probe's seed (ENV-5); large-hub seed `--teams 9 --unrelated 20`.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-001 (API-03): titles migration `NOT_RUN` while keys-v1 is `FAILED`; every Project's Tasks unlisted | `Design Impact` (CR-001, SR-012) | Resolved: titles depend only on `projects-per-folder-v1` with their own frozen validator; keys-v1 `FAILED` hides only its Project; after the fix keys-v1 keeps the title | API-03 (6/6 in API-10), API-05 |
| F-002 (API-11c): `taskWorkerTaskStore` dropped `title` → Error 500 on a Project-Task worker's tree row | `Local Fix` (CR-002) | Resolved: the store keeps `title` (`null` for a Temp task) | API-11c (24/25 + PMU-024 rerun), API-11d, API-12 |

- Canonical artifacts and sections updated: execution report (Round, Environments, Cases, AC proof, scorecard, broader validation, desktop, persisted data, durable coverage, cleanup, result), coverage investigation (meta), test progress log, `follow-ups.md` (FU-007).
- Prior result and confidence: `Fail`, 81%.
- Current result and confidence: `Pass`, 95%.
- New or remaining failure IDs: none in scope. Out of scope: FU-002 … FU-007.
- Recommended owner: code reviewer (proportional test-code review), then delivery.
- Remaining risks, blocked evidence, or untested scope: the gated Codex routing case stays unexecuted (FU-005).
