# API/E2E Revision Record — remove-skill-access-mode

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md`, round 2 (`CRR-002`, Pass) | `SR-005`, `ARCH-REV-003`, `IR-002`, `CRR-002` | N/A | Pass / 95% |

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
