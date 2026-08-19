# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative. This record preserves concise round history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / CRR-002 / round 1 | SR-006; ARCH-REV-006; IR-002; CRR-002 | N/A | Fail / 70.0% |
| API-REV-002 | `code_reviewer` / CRR-004 / round 2 | SR-006; ARCH-REV-006; IR-003; CRR-004 | Fail / 70.0% | Fail / 75.0% |
| API-REV-003 | `code_reviewer` / CRR-007 / round 3 | SR-006; ARCH-REV-006; IR-005; CRR-007 | Fail / 75.0% | Pass / 97.1% |

## Revision Entries

### API-REV-001 — Current-store mixed-pricing failure baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`; API/E2E round 1.
- Triggering finding or scenario IDs: `APIE2E-F001` discovered while implementing the planned APIE2E-002/current-store coverage.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-006`, `ARCH-REV-006`, `IR-002`, `CRR-002`; no delivery revision.
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E result. A reset/migrated real Prisma/SQLite current-store scenario disproved the required mixed-currency cost-status/unit-price semantics, so execution correctly stopped and recorded `Fail` rather than crediting planned evidence.
- Coverage decisions or durable test paths changed:
  - added `autobyteus-server-ts/tests/helpers/token-usage-run-record-fixtures.ts`;
  - updated `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-snapshot-delta-normalizer.test.ts`;
  - updated `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-unit-price-summary.test.ts`;
  - updated `autobyteus-server-ts/tests/integration/token-usage/providers/default-agent-run-event-pipeline-lifecycle.integration.test.ts`;
  - replaced obsolete contents in `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts`;
  - replaced obsolete contents in `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts`.
- Scenarios added, changed, removed, or rechecked: partial APIE2E-001/002/003 coverage was added/rechecked; `APIE2E-F001` was added and reproduced; APIE2E-004–008 and APIE2E-TMP-001 remain not tested; no durable test file was removed.
- Commands, environment, fixture, or broader-validation delta: frozen lockfile install, Prisma generation, and shared preparation passed. Focused Vitest ran against the normal reset/migrated worktree SQLite DB. The selected real-SQLite lifecycle/scale, live API, and Chrome validation did not start because a critical current-store failure requires rework first.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-revision-record.md`
- Prior result and confidence: `N/A`
- Current result and confidence: `Fail / 70.0%`
- New or remaining failure IDs: `APIE2E-F001`
- Recommended recipient: `/code_reviewer` for focused failure-origin review, likely followed by `/implementation_engineer` for a bounded implementation fix.
- Remaining risks, blocked evidence, or untested scope: AC-008 fails; released-scale consolidation, migration lifecycle/recovery/overlap/freelist, every restore gate, GraphQL/live SafeInt, browser states, remaining stale coverage, and the known Nuxt typecheck toolchain incompatibility remain incomplete.

### API-REV-002 — Prior pricing failure resolved; local cache state failure found

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`; API/E2E round 2 after `CRR-004`.
- Triggering finding or scenario IDs: prior `APIE2E-F001` recheck, followed by new `APIE2E-F002`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-006`, `ARCH-REV-006`, `IR-003`, `CRR-004`, prior `API-REV-001`; no delivery revision.
- Why this revision was recorded: the prior mixed-currency defect is resolved and all six original API/E2E durable changes pass, but resumed current-record/GraphQL maintenance exposed a second preserved public-semantic defect before lifecycle/scale/browser execution.
- Coverage decisions or durable test paths changed: retained the original six paths; corrected the pipeline post-quiescence assertion; converted statistics, display capture, enrichment, GPT-5.6 GraphQL, general GraphQL, provider-semantics GraphQL, and unit-price GraphQL coverage to current run-record owners. No file was removed.
- Scenarios added, changed, removed, or rechecked: `APIE2E-F001` resolved; APIE2E-001/003 and original store coverage passed; APIE2E-002/004/010 expanded; `APIE2E-F002` added and reproduced; APIE2E-005–008/TMP-001 remain not tested.
- Commands, environment, fixture, or broader-validation delta: ran focused F001/F002 commands, original durable paths, broad 30-file diagnostic, and seven-file current API suite using worktree-local lockfile dependencies and reset/migrated real Prisma/SQLite. No backend, browser, or scale process was started after F002.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-F001` | Local Fix implementation defect | Resolved by `IR-003`, source-reviewed in `CRR-004`, and independently passed by API/E2E before other round-2 work | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/test-results/api-e2e/logs/07-api-e2e-f001-round2-recheck.log` |

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-revision-record.md`
- Prior result and confidence: `Fail / 70.0%`
- Current result and confidence: `Fail / 75.0%`
- New or remaining failure IDs: `APIE2E-F002`; `APIE2E-F001` resolved.
- Recommended recipient: `/code_reviewer` for focused failure-origin review, likely followed by `/implementation_engineer` for a bounded current record cache-state merge correction.
- Remaining risks, blocked evidence, or untested scope: two stale current GraphQL expectations and both source-shaping startup E2Es still need completion; released-scale consolidation, migration lifecycle/retry/overlap/freelist, every restore gate, live unsafe-SafeInt, Chrome UI states, and known Nuxt typecheck incompatibility remain incomplete.

### API-REV-003 — Current one-row transition and system boundaries pass

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`; API/E2E round 3 after `CRR-007`.
- Triggering finding or scenario IDs: prior `APIE2E-F002` recheck plus completion of APIE2E current fold/API, source shaping, consolidation, lifecycle, scale, SafeInt, and Chrome scenarios.
- Related revision IDs: `SR-006`, `ARCH-REV-006`, `IR-005`, `CRR-007`, prior `API-REV-002`; no delivery revision.
- Why this revision was recorded: the prior local cache-state defect and subsequent migration-only historical semantic correction are source-reviewed and pass direct executable rechecks. All remaining selected repository, actual-server, released-scale, and browser evidence is complete with no critical failure.
- Coverage decisions or durable paths changed: retained and completed the original 13 API/E2E-owned paths; retargeted historical unknown to actual released migration/current output; corrected two stale current GraphQL assertions; updated both source-shaping startup E2Es; expanded actual built-server production upgrade/lifecycle and migration rollback/freelist/empty-relaunch coverage. Seventeen repository-resident paths are added or updated; none removed.
- Scenarios added, changed, removed, or rechecked: `APIE2E-F002` resolved; source shaping, production success/relaunch, failed consolidation, old/new admission, retry, overlap, transaction rollback, all restore gates, unsafe SafeInt, ninth/reappearing series, byte caps, freelist, released-scale resources, and Chrome normal/degraded/fatal are complete. The external-runtime opt-in provider suite and unchanged Electron shell were not selected.
- Commands, environment, fixture, or broader-validation delta: final broad server selection passed 27 files/125 tests with three explicit external-runtime skips; server TypeScript/build/diff/static checks passed; Nuxt component/guards and production build passed; 154,100-row/880,848,896-byte real SQLite probe passed; actual built server plus Chrome 151 passed; all owned processes/data were cleaned. Nuxt typecheck reproduced only the previously recorded `vue-tsc`/TypeScript package-export blocker.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-F002` | Local Fix implementation defect | First explicit local cache state now persists/hydrates truthfully; reviewed `IR-004` source passes the exact recheck | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/test-results/api-e2e/logs/14-api-e2e-f002-round3-recheck.log` |
| Later historical-unknown assertion | Stale coverage setup | Current ingestion case replaced by real released-row consolidation/current-record GraphQL output after `IR-005` / `CRR-007` | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/test-results/api-e2e/logs/15-round3-graphql-current-migration.log` |
| `APIE2E-F001` | Resolved in API-REV-002 | Remains resolved in final broad pricing/API suite | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/test-results/api-e2e/logs/28-final-broad-server-lifecycle-api-suite.log` |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-revision-record.md`
- Prior result and confidence: `Fail / 75.0%`.
- Current result and confidence: `Pass / 97.1%`.
- New or remaining failure IDs: `None`; `APIE2E-F001` and `APIE2E-F002` resolved.
- Recommended recipient: `/code_reviewer` for mandatory proportional review of the 17 changed durable coverage paths before delivery.
- Remaining risks, blocked evidence, or untested scope: known independent Nuxt typecheck package-export incompatibility; external-provider runtime E2E not selected; Electron shell unchanged and not executed. None blocks the approved current storage/migration/API/renderer scope.
