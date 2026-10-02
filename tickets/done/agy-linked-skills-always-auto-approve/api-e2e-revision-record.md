# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `code-review-report.md` (CRR-001 Pass) / round 1 | SR-001, SR-002, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 95.3% |

## Revision Entries

### API-REV-001 — Baseline: linked skills + always auto-approve proven through the real server, live AGY and rendered UI

- Triggering role, report path, and round: `code_reviewer`, `code-review-report.md`, round 1.
- Triggering finding or case IDs: none (pass handoff). CRR-001 focus items 1–6 adopted as SCN-A1..A4 and B01–B04.
- Related revision IDs: SR-001, SR-002, ARCH-REV-001, IR-001, CRR-001.
- Why this baseline was recorded: first completed API/E2E validation of the package.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts` (E01–E08).
  - Updated `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`: permission mode follows argv, argv log, `linked_skills` case.
- Cases added, changed, removed, or rechecked: R1, R2, E01–E08, R4, R5, R6 (+A1 rerun), B01–B04 all executed. None removed.
- Commands, environment, fixture, or broader-validation delta: Broader validation `Required` and executed. Browser + live `agy` 1.2.14 against an owned backend build of `e5edfafdf`, with the user's skills checkout read-only through `AUTOBYTEUS_SKILLS_PATHS`.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all sections), `api-e2e-execution-coverage-report.md` (all sections), `api-e2e-test-case-ledger.md` (events and reconciliation).
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 95.3% (no category below 90%).
- New or remaining failure IDs: None.
- Recommended owner: `code_reviewer`, for proportional review of the changed durable test code.
- Remaining risks, blocked evidence, or untested scope:
  - ASM-001 is verified on `agy` 1.2.14 only.
  - AC-009 is proven with a legacy-shaped capsule.
  - The optional AC-003 live variant was not run.
  - CF-02 and CF-03 are carried forward.
  - Out-of-scope observations: the mobile chat hydration placeholder (unchanged code) and the archived evidence path in `agy-mcp-team-live.test.ts` (pre-existing).
