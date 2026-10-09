# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md`, round 1 | SR-005, SR-006, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 95.3% |
| API-REV-002 | User request (isolated desktop, public package, real model), round 2 | same | Pass / 95.3% | Pass / 96.7% |

## Revision Entries

### API-REV-001 — Baseline: copy members reach the Agent-run host (real server + rendered web)

- Triggering role, report path, and round: Code Reviewer pass CRR-001, `…/code-review-report.md`, round 1.
- Triggering finding or case IDs: none (pass); implementation coverage hints AC-001/002/003/006/009 and the missing-focused error.
- Related revision IDs: SR-005, SR-006, ARCH-REV-001, IR-001, CRR-001.
- Why recorded: first completed API/E2E result.
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/projects/delegated-copy-member-contact-host.e2e.test.ts` (DCM-001..007). No existing test updated or removed.
- Cases added: DCM-001..007 (durable), BJ-001/BJ-002 (temporary browser journey), MUT-001 (temporary control). Rechecked: contracts, server unit, ad-hoc, lazy activation, reactivation, PM startup, web unit.
- Commands, environment, fixture, or broader-validation delta: zero-credit scripted AGY CLI; server `prebuild && build` for the built-dist E2E and browser journey; broader validation `Required` → Browser + Lifecycle, executed.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, this record.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.3%
- New or remaining failure IDs: none
- Recommended owner: Code Reviewer (proportional test-code review of the new E2E file)
- Remaining risks, blocked evidence, or untested scope: real-model note adherence; AGY-only runtime; packaged desktop (AC-003 user verification, delivery); real-provider gated E2E files not run; MP-001; opt-in `list_available_agents`; 42 baseline server test files failing on base; unchanged menu header/footer copy for the host entry (separate-ticket candidate).

### API-REV-002 — Packaged desktop journey with the public agent package and a real model

- Triggering role, report path, and round: the user asked (2026-10-09) whether an isolated Electron instance was used and directed a real test with the public agent package; round 2. Round 1 had relied on server E2E plus a web-equivalent browser journey and left the packaged desktop journey to user verification, which under-applied TESTING.md for a High-risk change whose success is defined in the desktop app.
- Triggering finding or case IDs: validation gap (no packaged desktop run); new cases DSK-001..DSK-004.
- Related revision IDs: SR-005, SR-006, ARCH-REV-001, IR-001, CRR-001, API-REV-001.
- Coverage decisions or durable test paths changed: none (no test code changed). Desktop journey is temporary evidence: it needs a packaged build, a GitHub download and paid inference, so it is not suitable as an automated suite.
- Commands, environment, fixture delta: `pnpm --silent isolated-app start --build` (instance `iso-61062-6a74`); UI import of `https://github.com/AutoByteus/autobyteus-agents`; Claude Agent SDK runtime, `claude-haiku-5-5`; browser-automation attach-only; `isolated-app stop` with data-root removal.

#### Prior Failure Resolution

None (API-REV-001 passed).

- Canonical artifacts updated: `api-e2e-execution-coverage-report.md` (Round 2 section, scorecard, desktop section, latest result), `api-e2e-test-case-ledger.md`, `api-e2e-coverage-investigation.md` (broader-validation decision), this record.
- Prior result and confidence: Pass, 95.3%
- Current result and confidence: Pass, 96.7%
- New or remaining failure IDs: none
- Recommended owner: Code Reviewer (no new test code; evidence addendum)
- Remaining risks: one real model and run; pre-existing host → copy-member address refusal (`COLLABORATION_TARGET_NOT_FOUND`, PM recovered by run ID; separate-ticket candidate); menu copy "delegates the work" for the host entry (separate-ticket candidate); MP-001; opt-in `list_available_agents` (SE Team members do not select it, so SCN-002 does not apply to them with the public package).
