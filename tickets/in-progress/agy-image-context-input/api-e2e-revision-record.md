# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer / implementation-handoff.md / round 1 | SR-001, SR-002, IR-001 | N/A | Fail / 84% |
| API-REV-002 | implementation_engineer / implementation-handoff.md (IR-002) / round 2 | SR-003, SR-004, IR-002, CRR-001, ARCH-REV-001 | Fail / 84% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: server-level and live AGY context-file validation

- Triggering role, report path, and round: implementation_engineer, `implementation-handoff.md`, round 1 (direct low-risk route)
- Triggering finding or case IDs: N/A (initial)
- Related revision IDs: SR-001, SR-002, IR-001
- Why this baseline was recorded: first API/E2E validation of the AGY context-file input fix
- Coverage decisions or durable test paths changed: added `tests/e2e/runtime/agy-context-files-transport.e2e.test.ts` and `tests/e2e/runtime/agy-context-files-live.e2e.test.ts`; updated `tests/fixtures/agy-failure-cli.mjs` (`context_files` case), `tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts`, and `TESTING.md`
- Cases added: FX-001, E2E-CF-001..005, LIVE-CF-001..003; regression sets REG-001 (incl. AC-007 CTX-E2E-003) and REG-002
- Commands / environment: fake-CLI server E2E (`RUN_AGY_FAILURE_E2E=1`), live server E2E (`RUN_AGY_CONTEXT_FILES_E2E=1`, real agy 1.3.1, gemini-3.8-flash-low)

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation, execution coverage report, test-case ledger, this record
- Prior result and confidence: N/A
- Current result and confidence: Fail / 84%
- New or remaining failure IDs: E2E-CF-002 (REQ-004 attach-only send is rejected by the generic AgentRun admission before AGY)
- Recommended owner: Solution Designer (`Requirement Gap`)
- Remaining risks or untested scope: data-URL image end to end (contrived, unit only); Claude-in-AGY model not exercised; desktop-app user verification still pending (delivery)

### API-REV-002 — SR-004 rework: text required to send; desktop validation

- Triggering role, report path, and round: implementation_engineer, `implementation-handoff.md` (IR-002, commit `e259a0203`), round 2
- Triggering finding or case IDs: E2E-CF-002 (API-REV-001), CRR-001, ARCH-REV-001 → DEC-006
- Related revision IDs: SR-003, SR-004, IR-002, CRR-001, ARCH-REV-001
- Why recorded: re-validation after REQ-004 was replaced (text or skill tag required; attachments-only drafts not sendable; server admission unchanged)
- Coverage decisions or durable test paths changed: E2E-CF-002 in `agy-context-files-transport.e2e.test.ts` rewritten. The obsolete attach-only delivery assertion was removed per DEC-006; it now asserts the preserved server rejection (`RUNTIME_REJECTED`, no AGY stdin) and delivery of the same image with text.
- Cases added, changed, or rechecked: E2E-CF-002 changed; E2E-CF-001/003/004/005, REG-001, REG-002 rechecked; WEB-001, DJ-001, DJ-002 added (temporary desktop journeys, not durable: the composer rule is durably covered by IR-002 web specs and the server rule by E2E-CF-002)
- Commands, environment, fixture, or broader-validation delta: full web unit suite; isolated desktop instance from the worktree build with real agy (Project Desktop Validation). The live E2E file was not re-run (no server source change since round 1).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| E2E-CF-002 (API-REV-001) | Requirement Gap → Solution Designer (confirmed by CRR-001) | Resolved by requirement change DEC-006 / SR-004 and IR-002. Attach-only is no longer offered by composers (rendered DJ-001/002 + web specs); the server rule is preserved and asserted by the revised E2E-CF-002 | `api-e2e-evidence/e2e-cf-transport.log`, `api-e2e-evidence/web-unit.log`, `api-e2e-evidence/desktop/desktop-journey-dom-states.json` |

- Canonical artifacts updated: coverage investigation (Round 2 Update), execution coverage report (rewritten for round 2), ledger (events 12–18), this record
- Prior result and confidence: Fail / 84%
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: None
- Recommended owner: Delivery Engineer
- Remaining risks or untested scope: data-URL images unit only (contrived); Claude-in-AGY not exercised; team/org composers not rendered (unchanged text-required path); desktop screenshots not retained (DOM evidence recorded); user verification in the user's own desktop app pending (delivery)
