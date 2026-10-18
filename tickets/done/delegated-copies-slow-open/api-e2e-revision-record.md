# API/E2E Revision Record — delegated-copies-slow-open

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 Pass; round 1 | SR-002, SR-004, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95.0% |
| API-REV-002 | Code reviewer, CRR-003 (merge re-review), forwarding delivery DR-001; round 2 | IR-002, CRR-002, CRR-003, DR-001 | Pass / 95.0% | Pass / 95.0% |

## Revision Entries

### API-REV-001 — Baseline: GraphQL E2E for the scoped query, large-hub base-vs-fix timings, live journeys, desktop instance

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, round 1
- Triggering finding or case IDs: none (pass). Still-required items 1–5 from the code review message
- Related revision IDs: SR-002 (requirements), SR-004 (design), ARCH-REV-002, IR-001, CRR-001
- Why this baseline was recorded: first API/E2E validation of the package
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts`.
  - Added the `GENERATE_IMAGE:` directive to `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`.
  - Added `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` and the `test:e2e:delegated-copies-large-hub` script.
  - Nothing removed or replaced.
- Cases added, changed, removed, or rechecked:
  - Reused: API-R1..R5 (IMP-01..IMP-09).
  - New: API-02..API-15 and L-001..L-011.
- Commands, environment, fixture, or broader-validation delta:
  - Test-owned seed of 50 Teams × 6 members plus 300 unrelated team runs, made through public APIs with scripted AGY.
  - Base build `5ceb43039a` in a temporary git worktree.
  - Isolated desktop instance of the packaged fix build.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/API-*`, `evidence/OBS-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95.0%
- New or remaining failure IDs: none
- Recommended owner: `/software_engineering_team/code_reviewer` for proportional test-code review
- Remaining risks, blocked evidence, or untested scope:
  - The synthesized fixture makes the baseline 7.3 s, not minutes.
  - CAND-003 under continuous streaming is not reproduced.
  - Live cases were not run inside the desktop shell.
  - Out-of-scope follow-ups: OBS-1 (live view lists part of the hub log, pre-existing), OBS-2 (an extra hub-view request per hub click, now visible), OBS-3 (unbroken 60 KB-token conversations take ~86 s of client processing, pre-existing).

### API-REV-002 — Integrated-state rerun (DR-001): probe reads the append-only hub log; S and live cases on the merged build

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-003), forwarding `delivery-revision-record.md` DR-001; round 2
- Triggering finding or case IDs: CRR-003 blocker. The probe read `collaboration/communication_messages.json`; the merged base stores `communication_messages_<6 digits>.jsonl` plus `communication_messages_active.jsonl`. DR-001 asks for the large-hub S cases and L-001, L-002, L-004 on the integrated state.
- Related revision IDs: IR-002, CRR-002, CRR-003, DR-001
- Why this revision was recorded: integrated-state evidence before delivery resumes
- Coverage decisions or durable test paths changed: `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` now reads the hub log as the server's `MessageLog` does (sealed files in order, then the active file; complete lines; each id once). Nothing else changed.
- Cases added, changed, removed, or rechecked:
  - Rerun: R2-API-02 (server E2E + fixture regression), R2-API-04 (seed), R2-API-05 (new base), R2-API-06 (merged S cases + row comparison), R2-API-07 (L-001..L-011).
  - Reused: R2-API-R (IMP-10..IMP-18).
  - Not rerun: R2-API-11 (desktop).
- Commands, environment, fixture, or broader-validation delta:
  - Merged worktree rebuilt; new base worktree `2763e7c678`.
  - Round-2 seed made with the merged server: 2.61 MB in `communication_messages_active.jsonl`.

#### Prior Failure Resolution

None (round 1 had no failures).

- Canonical artifacts and sections updated: execution report (Round, environments, Round 2 cases, AC-008 table, scorecard note, durable coverage, cleanup, OBS-1), coverage investigation meta, progress log, `evidence/R2-*`, `evidence/API-02-12-merged-e2e.log`
- Prior result and confidence: Pass / 95.0%
- Current result and confidence: Pass / 95.0%
- New or remaining failure IDs: none
- Recommended owner: `/software_engineering_team/code_reviewer` for proportional review of the probe change
- Remaining risks, blocked evidence, or untested scope:
  - Desktop shell not rerun on the merged build.
  - CAND-003 under continuous streaming.
  - OBS-1..OBS-3 unchanged. OBS-1 is still present with append-only logs: live view 14 of 252.
