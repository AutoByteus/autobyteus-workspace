# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer`; `code-review-report.md`; round 1 | `SR-004`, `ARCH-REV-004`, `IR-002`, `CRR-002` | N/A | Pass / 97% |
| API-REV-002 | User-requested real AutoByteus/DeepSeek validation; round 2 | `API-REV-001`, `CRR-003`, `DR-001` | Pass / 97% | Pass / 98% |
| API-REV-003 | User-requested real Codex/`gpt-5.6-luna` validation; round 3 | `API-REV-002`, `CRR-004`, `DR-002` | Pass / 98% | Pass / 98% |

## Revision Entries

### API-REV-001 — Carpenter runtime, provider, persistence, and current-surface baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/code-review-report.md`; API/E2E round 1
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
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-execution.log`
- Prior result/confidence: N/A
- Current result/confidence: **Pass / 97%**
- New or remaining failure IDs: None
- Recommended recipient: `code_reviewer` for proportional review of changed durable coverage
- Remaining risks/untested scope: external live Claude cases gated; full server/Nuxt typecheck blockers remain documented; delivery-owned `AC-006` pending; no browser/desktop run because the affected user surface is deletion-only and directly covered by mounted UI/persistence checks


### API-REV-002 — Real AutoByteus DeepSeek V4 Flash agent turn

- Triggering role, report path, and round: explicit user request after `DR-001`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-execution-coverage-report.md`; API/E2E round 2
- Triggering scenario: run a real product-runtime/model test by importing `/Users/normy/.autobyteus/server-data/.env` and selecting DeepSeek V4 Flash
- Related revision IDs: `API-REV-001`, `CRR-003`, `DR-001`
- Why recorded: broader live validation changed the authoritative evidence and confidence even though no durable coverage changed
- Coverage decisions or durable paths changed: none; round-1 five-file coverage remains byte-identical and already passed proportional review
- Scenario added: `API-E2E-010`
- Commands/environment delta:
  - preflighted `deepseek.agent-flow` against the built test server
  - imported recognized credentials through the value-safe importer into the dedicated test database/vault; no values logged
  - executed `pnpm test:e2e:real -- --scenarios=deepseek.agent-flow`
- Live result: preflight `READY` with the required DeepSeek secret configured; 1 file / 2 tests passed; real `DeepSeekLLM` turn, full Carpenter prompt, assistant completion, turn completion, termination, and cleanup observed

#### Prior Failure Resolution

None. `API-REV-001` was already Pass. Round 2 voluntarily reduced the explicitly recorded real-provider uncertainty.

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-live-execution.log`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-revision-record.md`
- Prior result/confidence: **Pass / 97%**
- Current result/confidence: **Pass / 98%**
- New or remaining failure IDs: None
- Recommended recipient: `code_reviewer`; round-2 durable test review is Not Applicable, then return updated evidence to delivery
- Remaining risks: live validation used one provider/model on one macOS arm64 host; live provider failure/retry was not induced; full server/Nuxt typecheck blockers remain documented; no browser/desktop run because no such boundary changed


### API-REV-003 — Real Codex App Server two-turn validation with GPT-5.6 Luna

- Triggering role, report path, and round: explicit user request after `DR-002`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-execution-coverage-report.md`; API/E2E round 3
- Triggering scenario: inspect the real DeepSeek result and additionally validate Codex runtime with exact model `gpt-5.6-luna`
- Related revision IDs: `API-REV-002`, `CRR-004`, `DR-002`
- Why recorded: real Codex execution adds a second external runtime/provider boundary to authoritative evidence
- Coverage decisions or durable paths changed: none
- Scenario added: `API-E2E-011`
- Commands/environment delta:
  - queried the live Codex model catalog through built production modules and confirmed exact `gpt-5.6-luna`
  - executed the repository-owned GraphQL/WebSocket two-turn Codex live E2E with `RUN_CODEX_E2E=1` and exact model overrides
  - executed the focused current GraphQL configured-runtime-skill live E2E with the same exact model
- Execution-method correction: an initial `pnpm exec tsx` probe failed because `tsx` is not installed; the probe was rerun via built production JS and passed. This was not a product failure.
- Live result: 2 files / 2 selected tests passed; both unique two-turn tokens, initial history title preservation, two-message projection, configured-skill materialization/linked-guidance token, and cleanup passed through real Codex App Server. The configured-skill file reported 19 nonmatching tests skipped by the explicit name filter.

#### Prior Failure Resolution

None. `API-REV-002` was Pass. Round 3 voluntarily reduced the remaining Codex live-runtime uncertainty.

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-codex-live-execution.log`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-revision-record.md`
- Prior result/confidence: **Pass / 98%**
- Current result/confidence: **Pass / 98%**
- New or remaining failure IDs: None
- Recommended recipient: `code_reviewer`; round-3 durable test review is Not Applicable, then return updated evidence to delivery
- Remaining risks: no live Claude turn; one macOS arm64 host; provider failure/retry not induced; full server/Nuxt typecheck blockers remain documented; no browser/desktop run because no such boundary changed
