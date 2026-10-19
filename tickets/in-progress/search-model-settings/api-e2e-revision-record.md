# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer pass handoff, `code-review-report.md` CRR-002; round 1 | SR-005, ARCH-REV-003, IR-002, CRR-002 | N/A | Fail / 87% (requirement proof 50%) |

## Revision Entries

### API-REV-001 — Baseline validation; QR-001 fails on a Docker node

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-002, Pass), round 1.
- Triggering finding or case IDs: the reviewer's downstream list:
  - AC-008 (Docker from a browser);
  - C-07 (QR-001 on Docker or slower hardware);
  - the desktop app and a rerun of the probe on the reviewed commit;
  - R-9 / D-2;
  - network loss with Retry (AC-012);
  - AC-014 on the real stack;
  - AC-011 on a fresh root;
  - AC-013 after a restart;
  - EmbeddingGemma 2.
- Related revision IDs: SR-005, ARCH-REV-003, IR-001, IR-002, CRR-001, CRR-002.
- Why this baseline was recorded: first complete API/E2E result.
- Coverage decisions or durable test paths changed: updated `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` API-007 (stale name filter vs the approved index mutations; API-D01).
- Cases added, changed, removed, or rechecked:
  - repository: API-R01…R07, API-D01 (R01, R02 and R05 reused from IMP-09/10/05/06/12);
  - journeys: API-L01…L08, API-L10 (API-L09's Cancel ran in API-L05).
- Commands, environment, fixture, or broader-validation delta:
  - Docker image `ab-sms-validation:d2bcb95d3a` with a Nuxt frontend bound by `BACKEND_NODE_BASE_URL`;
  - packaged desktop build of `d2bcb95d3a`;
  - 20 × 1,000 Tasks seeded through GraphQL on the Docker node.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`.
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 87% overall (requirement and acceptance-criteria proof 50%).
- New or remaining failure IDs: F-001 (QR-001 on the Docker node: status median 2.0 s, p90 3.5 s at 20 × 1,000; the cost is the Project store's file reads).
- Recommended owner: failure-origin review by the code reviewer; preliminary `Design Impact` → Solution Designer.
- Remaining risks, blocked evidence, or untested scope:
  - Windows, Linux and macOS x64 desktop, and Docker amd64, are not built here;
  - observations O-1…O-4 in the report.
