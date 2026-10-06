# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer / `design-review-report.md` / round 1 pass | N/A (advisory REC-001, REC-002 adopted) | `Initial Baseline` | `SR-001`, `ARCH-REV-001`, CRR N/A, API-REV N/A, DR N/A | Implemented; ready for code review |

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
