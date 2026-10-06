# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer / `design-review-report.md` / round 1 pass | N/A (advisory REC-001, REC-002 adopted) | `Initial Baseline` | `SR-001`, `ARCH-REV-001`, CRR N/A, API-REV N/A, DR N/A | Implemented; ready for code review |
| IR-002 | architecture_reviewer / `design-review-report.md` / ARCH-REV-002 pass on SR-002 | CRR-002 Requirement Gap (from API-REV-001 B-003/B-004) | `Requirement Gap` (resolved upstream; no implementation delta) | `SR-002`, `ARCH-REV-002`, `CRR-001`, `CRR-002`, `API-REV-001`, DR N/A | Confirmed: no implementation change needed; `061d4698b` stands |

## Revision Entries

### IR-001 — Single bound process authority with an attached-run-only projection cache

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md`, `ARCH-REV-001` pass.
- Triggering finding IDs: N/A. Advisory REC-001 (guard the `handle()` cache write) and REC-002 (resolve `AgentRunManager` per call) were both adopted.
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation complete; local checks pass with no new failures.
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: the initial implementation of the approved design.
- Approved behavior or requirement IDs affected: REQ-001, REQ-002 (changed). REQ-003 and REQ-004 (preserved). BEH-001 through BEH-004.
- Implementation delta:
  - `RunFileChangeService`:
    - Adds the `attachedRunIds` set.
    - `load()` serves the cache only for attached runs and returns a fresh `readStored()` otherwise. It re-checks attachment before caching.
    - `handle()` caches only while the run is attached.
    - `clear()` removes the attachment.
    - The lazy singleton is replaced by `bindProcessRunFileChangeService`, `releaseProcessRunFileChangeService` and a bind-required `getRunFileChangeService`.
  - `GeneralProcessRunSupervisor`:
    - Builds one instance, binds it, and wires the same instance into `AgentRunResourceManager`.
    - Releases it in rollback and in `closeInternal()`.
  - `RunFileChangeProjectionService`: per-call `changes()` and `agentRuns()` resolvers, with the injected options kept.
- Changed files or areas:
  - the three source files above
  - four test files: service, projection service, supervisor ownership, integration API
  - two docs: `artifact_file_serving_design.md`, `agent_artifacts.md`
- Local validation and result:
  - Build typecheck is clean.
  - The targeted suites pass. The one exception is the pre-existing historical team-member integration case, which fails identically on base.
  - The broader related set has an identical failure list before and after the change.
  - Mutation checks confirm the regression and REC-001 tests detect the defect.
- Next recipient or routing: `/code_reviewer` (Medium + High).
- Remaining limitations or risks:
  - AC-006 live check is pending (API/E2E).
  - Pre-existing base test failures are listed in the handoff.
  - RSK-001 is out of scope.

### IR-002 — SR-002 scope narrowing confirmed against the implementation (no code change)

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md`, `ARCH-REV-002` pass on the SR-002 package.
- Triggering finding IDs: CRR-002 `Requirement Gap` (source: API-REV-001 B-003/B-004). The user resolved it in SR-002 (Option 2, split).
- Classification: `Requirement Gap`, resolved upstream. Implementation delta: none.
- Prior authoritative result: IR-001, commit `061d4698b`, CRR-001 Pass.
- Current authoritative result: unchanged. The source at HEAD matches `061d4698b` (`git diff 061d4698b -- src` is empty).
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001` (Pass), `CRR-002`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Why recorded: to confirm that the amended AC-003/AC-004 need no implementation change.
- Approved behavior or requirement IDs affected: REQ-002/AC-003 and REQ-003/AC-004, both narrowed.
  - AC-003 (server API list for any active run, including Team members, plus the standalone UI reload) is covered by:
    - the reader regression "sees artifacts an active Team member records after an earlier read", against a real bound authority
    - the standalone reader and REST/GraphQL integration regressions
    - API-E2E B-001 and E-cases.
  - AC-004 (server API for inactive runs, any run, plus the standalone UI) depends on the inactive read path, which this change leaves untouched. API-E2E E-004 shows the real historical Team-member API path returning every entry with REST 200.
  - Team-member UI hydration (B-003/B-004) is frontend-only and now out of scope. Nothing in this implementation could address it.
- Implementation delta: none.
- Changed files or areas: none. These ticket artifacts are the only edits. The uncommitted test edits from API/E2E (`tests/fixtures/agy-failure-cli.mjs`, an added completion step in the run-file-changes integration test, and the new `tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts`) belong to API/E2E. They are left uncommitted for their code review.
- Local validation and result: targeted suites (service, reader, supervisor, integration, including the API/E2E-added completion step) give 28 passed and 1 failed. The failure is the pre-existing stale-seed historical team-member integration case, which also fails on base (see the IR-001 handoff) and which API/E2E classified as out of scope.
- Next recipient or routing: `/code_reviewer`, per `get_handoff_rules` for a High-risk package. The pending downstream steps are API/E2E re-validation against the amended AC-003/AC-004 and a code review of the durable test changes.
- Remaining limitations or risks: the Team-member Artifacts UI hydration follow-up ticket; RSK-001; the stale seed fixture in the historical team-member integration case.
