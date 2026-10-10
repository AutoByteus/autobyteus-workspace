# API/E2E Revision Record — draft-run-id-validation

## Revision Index

| Revision ID | Trigger | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `code-review-report.md` / round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 96% |

## Revision Entries

### API-REV-001 — Baseline: malformed owners and filenames rejected live; real client flows unchanged

- Trigger: `/software_engineering_team/code_reviewer`, CRR-001 round 1 (Pass); validation focus items 1–4.
- Related revision IDs: SR-003, ARCH-REV-002, IR-001, CRR-001.
- Why recorded: first API/E2E validation of the package.
- Durable test paths changed:
  - `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs`:
    - CF-001 adds live upload/finalize rejections, an agent-final `%00` row, and a data-root context-file snapshot assertion.
    - New CF-011 and CF-012 (first send from New chat: finalize, then read the final file).
  - `TESTING.md`.
  - Existing tests are unchanged.
- Cases: CF-001 extended; CF-011 and CF-012 added; CF-002..CF-009 and CF-004/CF-005 rerun as regressions.
- Commands and environment:
  - Server build, typecheck, targeted suites (517 tests) and unit suite (5254 tests): all pass.
  - Probe run-1: 11/11. Stability rerun: 11/11.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`.
- Prior result and confidence: N/A
- Current result and confidence: Pass / 96%
- New or remaining failure IDs: none
- Recommended owner: N/A
- Remaining risks:
  - CND-002, a pre-existing `..`-in-filename upload rejection, is out of scope.
  - Packaged Electron was not exercised (server-only change).
