# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md`, round 1 | SR-005, SR-006, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 95.3% |

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
