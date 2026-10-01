# API/E2E Revision Record — remove-skill-access-mode

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md`, round 2 (`CRR-002`, Pass) | `SR-005`, `ARCH-REV-003`, `IR-002`, `CRR-002` | N/A | Pass / 95% |
| API-REV-002 | `/code_reviewer`, `code-review-report.md`, round 3 (`CRR-004`, Pass) after delivery re-entry | `SR-005`, `ARCH-REV-003`, `IR-003`, `CRR-004`, `DR-002` | Pass / 95% | Pass / 95% |

## Revision Entries

### API-REV-001 — Initial validation of the skill-access-mode removal

- Triggering role, report path, and round: `/code_reviewer`; `code-review-report.md`; round 2.
- Triggering finding or scenario IDs: none (pass handoff). Reviewer notes taken as inputs: upgrade E2E pre-existing failures; `generated/graphql.ts` produced from an emitted SDL; no `ALL_INSTALLED` → prompt test; live and probe suites not run.
- Related revision IDs: `SR-005`, `ARCH-REV-003`, `IR-002`, `CRR-002`.
- Why recorded: first completed API/E2E result (baseline).
- Coverage decisions or durable test paths changed:
  - Updated `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` (one case added).
  - Added `autobyteus-server-ts/tests/e2e/run-history/removed-skill-access-mode-history-graphql.e2e.test.ts`.
  - Three existing E2E groups classified `Needs Update — outside this ticket` (stale on base).
- Scenarios added, changed, removed, or rechecked: TC-01..TC-17 defined and executed.
- Commands, environment, fixture, or broader-validation delta: repository suites on branch and on a temporary base worktree; documented dev stack (`pnpm dev`) with a stub model provider; browser; real Codex, Claude and AGY runtimes; packed Brief Studio.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all), `api-e2e-execution-coverage-report.md` (all), `api-e2e-test-case-ledger.md` (events 1–23).
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95% (post-repository 79%)
- New or remaining failure IDs: none
- Recommended recipient: `/code_reviewer` (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: ACP runtime not run live; packaged desktop app not run; browser at 400 px only; stored-key records derived from current-written records; pre-existing stale E2E suites (upgrade, gated live runtime, history / team configuration) do not guard this change.

### API-REV-002 — Validation of the merged state after delivery re-entry

- Triggering role, report path, and round: `/code_reviewer`; `code-review-report.md`; round 3 (`CRR-004`), following `DR-002` and `IR-003`.
- Triggering finding or scenario IDs: none failed in API/E2E. Delivery found three merged-in test files that still used the removed field; `IR-003` fixed them.
- Related revision IDs: `SR-005`, `ARCH-REV-003`, `IR-003`, `CRR-003`, `CRR-004`, `DR-001`, `DR-002`.
- Why recorded: the finalization target advanced; the merged state (`0180457ae`, base `e9aa4a74c`) had not been validated.
- Coverage decisions or durable test paths changed: none.
- Scenarios added, changed, removed, or rechecked: TC-18 (the three `IR-003` files) and TC-19 (Background Tasks launch on the merged server) added; TC-01, TC-02, TC-04..TC-08, TC-10..TC-16 rerun; TC-14 reduced; TC-17 not repeated live.
- Commands, environment, fixture, or broader-validation delta: new base worktree at `e9aa4a74c`; live suites with `RUN_CLAUDE_E2E=1` and `RUN_AGY_BACKGROUND_E2E=1`; `test:e2e:background-tasks-panel`; dev stack twice; evidence under `api-e2e-evidence/rev-002/`.

#### Prior Failure Resolution

None — round 1 had no failure.

- Canonical artifacts and sections updated: ledger "Round 2"; investigation "Round 2 Investigation"; execution report meta, "Round 2 Result", "Latest Authoritative Result".
- Prior result and confidence: Pass / 95%
- Current result and confidence: Pass / 95% (post-repository 88%)
- New or remaining failure IDs: none
- Recommended recipient: `/code_reviewer`
- Remaining risks, blocked evidence, or untested scope: as round 1 (ACP live, packaged app, stale suites on base). This round did not repeat the browser launch forms or the Brief Studio live launch; their source is unchanged since round 1.
