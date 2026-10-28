# API/E2E Revision Record — test-and-tooling-hygiene-294 (autobyteus-294)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md`, CRR-002 (round 2 Pass) | SR-005, ARCH-REV-002, IR-002, CRR-002 | N/A | Pass / 95.3% |
| API-REV-002 | Code Reviewer, `code-review-report.md` § Round 3, CRR-004 (IR-003 packaging fix) after DR-001 | IR-003, CRR-004, DR-001 | Pass / 95.3% | Fail / 73% |

## Revision Entries

### API-REV-001 — Baseline validation: clean clone, full suites, probes, packaged build, desktop icons, live CLIs

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md`, round 2 (CRR-002).
- Triggering finding or case IDs: the implementation handoff's "Not run" list and Downstream Coverage Hints.
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-005; ARCH-REV-002; IR-001, IR-002; CRR-001, CRR-002.
- Why this baseline or coverage/execution revision was recorded: first API/E2E round.
- Coverage decisions or durable test paths changed: five TESTING.md Rule 9 baseline fixes, each a red test whose cause was a lag behind a base commit:
  - `dfef14abc6`: `remove-built-in-project-task-manager-startup.integration.test.ts` (Model Router built-in, `930597c730`).
  - `a001e645c7`: `workspaces-graphql.e2e.test.ts` (config double `get`, `d384968700`).
  - `bce2f8b4e3`: `remove-built-in-project-task-manager-startup.e2e.test.ts` (built-in folder list, `930597c730`).
  - `e60f4d89a0`: `claude-sdk-client.integration.test.ts` helper (`beginStreamingSession` / `requestClose`, `028cca2312`).
  - `6af8819ede`: `electron-launch-profile-probe.mjs` occupied-port expectation (`f34ad8749f`).
- Cases added, changed, removed, or rechecked: API-01..API-26 as planned; API-20 gained a per-file run (temporary runner) after the full run hit the 2 h tool limit.
- Commands, environment, fixture, or broader-validation delta: clean clone for the repository suites; worktree for E2E, probes, packaged build and desktop instance; clean env for E2E; throwaway `CODEX_HOME` for the Codex runs; `caffeinate -is` after the machine slept during API-20.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all sections; Durable Coverage To Update rows for the five fixes), `api-e2e-execution-coverage-report.md` (all sections), `api-e2e-test-progress.md`, `follow-ups.md` (FU-011, FU-012), `evidence/API-*`.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.3% (no category below 94%).
- New or remaining failure IDs: none.
- Recommended owner: Code Reviewer, for proportional test-code review of the five baseline fixes.
- Remaining risks, blocked evidence, or untested scope: AC-014 on Linux (no host); BEH-032 screens rendered only through their specs; fresh-clone Electron download race (FU-011); stale call in the real-provider capabilities E2E (FU-012).

### API-REV-002 — Rerun for the IR-003 packaging fix: the gate passes on a fresh checkout at 4 GB, fails on the macOS runner heap and after a local build

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` § Round 3 (CRR-004); Delivery `release-deployment-report.md` (DR-001: Desktop Release `40640209395` failed in all five build jobs).
- Triggering finding or case IDs: DR-001; IR-003 (`75e9f323f0`), IMP-20.
- Related revision IDs: IR-003, CRR-004, DR-001.
- Why recorded: rerun of the affected validation after an implementation fix.
- Coverage decisions or durable test paths changed: none.
- Cases added, changed, removed, or rechecked: added API-27 (fresh clone, release job order, gate), API-28 (the gate under the macOS runner's default heap), API-29 (web suites), API-30 (the gate after a local desktop build), API-31 (the failed run's gate output per job). Round-1 cases unaffected by the script change stay valid.
- Commands, environment, fixture, or broader-validation delta: ENV-3 fresh clone with `pnpm install --no-frozen-lockfile` only, as the release job does; V8 heap caps via `NODE_OPTIONS`; `gh run view` for the CI logs.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| DR-001 (all five build jobs fail at `pnpm typecheck`) | Local Fix (packaging), implementation | Resolved for the Linux and Windows cause (missing contracts `dist/`): the gate passes on a fresh checkout. **Not resolved for the two macOS jobs**, whose cause was different (vue-tsc out of memory, SIGABRT): new failure F-1 | API-27 (resolved part); API-31, API-28 (F-1) |

- Canonical artifacts and sections updated: investigation (Meta, § Round 2), execution report (Round, § Round 2, Preliminary Classification, Latest Authoritative Result; round-1 result kept as "Round 1 Result (superseded)"), progress log, `evidence/API-27..31`.
- Prior result and confidence: Pass, 95.3% (API-REV-001).
- Current result and confidence: Fail, 73%.
- New or remaining failure IDs: F-1 (macOS runner heap), F-2 (build outputs in the Nuxt type scope).
- Recommended owner: implementation engineer (`Local Fix`, preliminary), through the Code Reviewer's failure-origin review.
- Remaining risks, blocked evidence, or untested scope: the build-only release run (delivery, needs a push to `personal`); whether a raised heap fits in a 7 GB runner (vue-tsc RSS 4.4-4.9 GB at a 4 GB cap on this host).
- Correction of a round-1 statement: round 1's AC-009/AC-016 proof (API-24) ran from a clean worktree on a 64 GB Mac and could not show F-1 or F-2.
