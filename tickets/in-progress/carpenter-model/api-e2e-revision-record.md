# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer`; `code-review-report.md`; round 1 | `SR-004`, `ARCH-REV-004`, `IR-002`, `CRR-002` | N/A | Pass / 97% |

## Revision Entries

### API-REV-001 — Carpenter runtime, provider, persistence, and current-surface baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/code-review-report.md`; API/E2E round 1
- Triggering findings/scenarios: mandatory disposition of the inherited persistence edit and three stale provider/session fixtures; direct active-run, provider, snapshot/lifecycle, configured-resolution, effective-tool, workspace, freshness, relative-reference, and inert-retired-name evidence
- Related revision IDs: `SR-004`, `ARCH-REV-004`, `IR-002`, `CRR-002`
- Why recorded: first completed authoritative API/E2E result; no prior result or confidence existed
- Coverage decisions: five existing durable files updated; zero added; zero removed
- Scenarios added/changed/rechecked: `API-E2E-001`–`API-E2E-009`
- Execution delta: 23 files / 165 deterministic tests passed; 9 external-provider-gated tests skipped; source-only server typecheck, core build/runtime dependency verification, retired current-source search, and diff check passed
- Fixture corrections during development: canonicalized macOS temp workspace root and updated a stale MCP test fake from `emitLocalEvent` to async `publishEvent`; neither required production changes
- Broader validation: Not Required because real deterministic changed boundaries were directly executed

#### Prior Failure Resolution

None. This is the initial baseline; development-run fixture corrections were resolved before the authoritative result and were not prior completed API/E2E failures.

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/api-e2e-execution.log`
- Prior result/confidence: N/A
- Current result/confidence: **Pass / 97%**
- New or remaining failure IDs: None
- Recommended recipient: `code_reviewer` for proportional review of changed durable coverage
- Remaining risks/untested scope: external live Claude cases gated; full server/Nuxt typecheck blockers remain documented; delivery-owned `AC-006` pending; no browser/desktop run because the affected user surface is deletion-only and directly covered by mounted UI/persistence checks
