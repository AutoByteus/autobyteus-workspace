# API/E2E Revision Record — composer-context-file-removal

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `code-review-report.md` / round 1 | SR-003, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: universal draft delete proven on a real stack

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CRR-001 round 1 (Pass).
- Triggering finding or case IDs: none (validation focus items 1–7 from the code review handoff).
- Related revision IDs: SR-003, ARCH-REV-001, IR-001, CRR-001.
- Why this baseline was recorded: first API/E2E validation of the package.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs`.
  - Added the `test:e2e:composer-context-file-removal` script to `autobyteus-web/package.json`.
  - Added a `TESTING.md` section.
  - Existing tests are kept unchanged (all `Still Valid`).
- Cases added, changed, removed, or rechecked: CF-001..CF-009 added; CF-010 planned and dropped (not on a runtime send path).
- Commands, environment, fixture, or broader-validation delta:
  - Repository suites: server typecheck/targeted/unit, web targeted/full. All pass.
  - Broader validation: built backend + Nuxt dev + headless Chrome, with the scripted AGY CLI and real delegation. run-1 surfaced two probe defects, fixed before run-2. run-2 and a stability rerun both pass 9/9.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all), `api-e2e-execution-coverage-report.md` (all), `api-e2e-test-case-ledger.md`.
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: none
- Recommended owner: N/A. Non-blocking out-of-scope items:
  - OBS-001: `agent_draft` run-id hardening, server context-files.
  - OBS-002: Org task-agent composer visibility after a pending send, web Org store.
- Remaining risks, blocked evidence, or untested scope: the user's desktop verification of 19.png (delivery gate); packaged Electron native drop/restart not exercised.
