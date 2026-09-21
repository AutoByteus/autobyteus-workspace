# API/E2E Revision Record — APP-STARTUP-LATENCY-20260918-001

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer `CRR-002`; initial API/E2E round | `SR-005`, `ARCH-REV-002`, `IR-002`, `CRR-002` | N/A | **Fail / 95.0%** |
| API-REV-002 | Code Reviewer `CRR-005`; recovered P01 rerun | `SR-010`, `SR-011`, `ARCH-REV-007`, `IR-005`, `CRR-005` | **Fail / 95.0%** | **Pass / 96.6%** |

## Revision Entries

### API-REV-001 — Representative launch and attachment acceptance exposes database-preservation contradiction

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` / `CRR-002`, API/E2E round 1
- Triggering scenarios: R01, L01, H01, A01, P01, C01
- Related upstream revisions: approved `SR-005`; `ARCH-REV-002` Pass; cumulative `IR-001`/`IR-002`; `CRR-002` Pass
- Reason recorded: first completed API/E2E result for this ticket
- Durable coverage changes: none
- Scenarios executed: current manifest/repository/build, three isolated cold starts, actual Agent/Team/AgentOrg history browser journey, Team/Org attachment Open, exact live 400/404/200 continuity matrix, byte/provider preservation and cleanup
- Environment/broader-validation delta: normal compiled server plus Nuxt/Chrome against an explicit owned representative profile clone; initial inherited-absolute-path setup evidence was invalidated and the entire lifecycle run repeated with owned DB/memory overrides.

#### Prior Failure Resolution

None — this is the initial baseline and prior result/confidence are `N/A`.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`
- Prior result and confidence: `N/A`
- Current result and confidence: **Fail / 95.0%**
- New failure: `P01`, critical `AC-003`/`AC-005` — owned SQLite bytes changed as the preserved failed migration attempt ledger advanced 23→27 across four owned starts while target summary remained `migrated 0`.
- Preliminary classification: `Requirement Gap`; the package simultaneously preserves a genuinely repeating failed migration attempt and prohibits every startup database-byte write.
- Recommended recipient: Code Reviewer for focused failure-origin review
- Remaining limitations: live unexpected-internal-fault `500` was not manufactured against representative data and remains proven by durable integration coverage; browser proves web-equivalent renderer rather than Electron shell; <10s is representative-profile acceptance, not universal SLA; two unrelated base nested-Team fixture failures remain qualified.

### API-REV-002 — Terminal warning recovery and representative stability pass

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` / `CRR-005`, API/E2E round 2
- Triggering scenarios: prior failing `P01` first, then `L01`, `E01`, `H01`, `A01`, `D01`, `C01`
- Related upstream revisions: approved requirements `SR-010`; recovered design `SR-011`; `ARCH-REV-007` Pass; cumulative `IR-001`–`IR-005`; `CRR-005` Pass
- Reason recorded: completed recovery validation after the approved migration terminal-warning correction and all-eight detail retention
- Durable coverage changes by API/E2E: none
- Environment/broader-validation delta: fresh copy-on-write clone of the already-owned corrected representative profile; current compiled server, explicit owned database/memory paths, three later terminal starts, real SQLite/manager failure controls and normal Nuxt/Chrome history/attachment journeys

#### Prior Failure Resolution

- Prior failure: `API-REV-001 / P01 / AC-003 / AC-005` — every startup retried the failed migration and rewrote its ledger.
- Resolution evidence: first corrected startup changed the record once from `FAILED` attempts27 to terminal `SUCCEEDED_WITH_WARNINGS` attempts28; retained all eight identities/reasons and `failedCount=8`; migrated0; sources exact; targets0. Three later full starts preserved attempts/timestamps/log path/targets and every tracked profile category exactly.
- Evidence: `validation/api-e2e-r2/p01-result.json`, `p01-terminal-warning-log.txt`, `p01-db-logical-comparison.json`, `p01-terminal-stability.json`.
- Prior result and confidence: **Fail / 95.0%**
- Current result and confidence: **Pass / 96.6%**

- Additional current evidence: typed token-data rollback/local readiness rejection, unrelated-root usability, SQL/structural/unknown fatal handling, dependency behavior, fatal precedence and terminal skip pass in 5 files / 66 tests; actual Chrome retained Team and AgentOrg history and exact attachment Open; post-browser profile remains byte-exact.
- Broader-validation decision: `Required and completed`.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`.
- New failure: none.
- Remaining limitations: representative <10s threshold is not a universal SLA; destructive corrupt token/SQL states are proven at real SQLite/manager boundaries rather than unsafe UI manipulation; browser proves web-equivalent renderer rather than Electron shell; two unrelated historical nested-Team fixture failures remain qualified.
- Required recipient: Code Reviewer for reviewed-route proportional test-code review. API/E2E changed no durable repository test, so `Not Applicable` is requested.
