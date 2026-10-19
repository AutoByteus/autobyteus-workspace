# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer pass handoff, `code-review-report.md` CRR-002; round 1 | SR-005, ARCH-REV-003, IR-002, CRR-002 | N/A | Fail / 87% (requirement proof 50%) |
| API-REV-002 | Code reviewer pass handoff, `code-review-report.md` CRR-005; round 2 | SR-007 (DEC-012, DEC-013, REQ-011, CR-003), IR-003, IR-004, CRR-005 | Fail / 87% | Pass / 95% |

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

### API-REV-002 — Rerun after SR-007 / IR-003 / IR-004; Pass

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-005, Pass), round 2, code `8c283c6acc`.
- Triggering finding or case IDs: the reviewer's rerun list:
  - API-L02 on Docker and the desktop host against DEC-012, with the Projects list and host load;
  - AC-015 on Docker and desktop;
  - a status-only Task write after a restart (CR-003);
  - O-1, O-2 and O-4 on the real stack;
  - earlier journeys by impact.
- Related revision IDs: SR-007, IR-003, IR-004, CRR-003, CRR-004, CRR-005, API-REV-001.
- Why this revision was recorded: the redefined QR-001 and the new requirement (REQ-011 / AC-015) and constraint (CR-003) needed real-stack proof; F-001 needed rechecking.
- Coverage decisions or durable test paths changed: none this round. API-D01 (`projects-graphql.e2e.test.ts`, commit `c02a54bc3e`) is unchanged and still awaits proportional test review.
- Cases added, changed, removed, or rechecked:
  - reused from implementation: API-R01 (IMP-21), API-R02 (IMP-22/23), API-R03 (IMP-24), API-R04 (IMP-14), API-R05 (IMP-18/19);
  - rerun: API-R06, API-R07, API-L01…API-L07, API-L10 (through API-L12/L12b);
  - new: API-L02b (desktop DEC-012), API-L11 / API-L11a / API-L11b (AC-015), API-L12 / API-L12b (CR-003);
  - still valid from round 1: API-L08.
- Commands, environment, fixture, or broader-validation delta:
  - Docker image `ab-sms-validation:8c283c6acc`, container `sms-api-node2` (no volumes);
  - packaged desktop `iso-56939-a508`; after a power-off at 15:20, `iso-50179-e4cd` from the same build (`--from-worktree`), reseeded;
  - new probes `API-PROBE-dec012-timing.mjs` and `API-PROBE-first-load-sequence.mjs`.

#### Prior Failure Resolution

| Prior Failure ID | Resolution | Proven By Case IDs | Evidence |
| --- | --- | --- | --- |
| F-001 | Resolved. SR-007 / DEC-012 redefined QR-001. IR-003 caches the fingerprint inputs, so refreshes read no Task: Docker refresh medians are 8–9 ms; Docker first load (1.76–2.11 s) is within the Projects list's own range (1.44–2.71 s); desktop refresh median 4 ms and 15 of 16 first loads ≤ 1 s | API-L02, API-L02b, API-R04 | `API-L02-r2-01-docker-dec012.txt`, `API-L02b-01-desktop-dec012.txt`, `API-L02b-02-desktop-first-load-samples.txt` |

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (§ Round 2 Rerun Plan), `api-e2e-execution-coverage-report.md` (rewritten for round 2), `api-e2e-test-progress.md`, `evidence/api-e2e/` (round-2 files).
- Prior result and confidence: `Fail`, 87%.
- Current result and confidence: `Pass`, 95%.
- New or remaining failure IDs: none. New observation O-5 (an already-open panel shows write-triggered indexing only at its next 10 s idle poll), for the design owner, non-blocking.
- Recommended owner: code reviewer (proportional test review of API-D01).
- Remaining risks, blocked evidence, or untested scope:
  - the desktop first load's thin margin on a shared host (one sample at 1,204 ms);
  - O-5;
  - Windows, Linux and macOS x64 desktop, and Docker amd64, are not built here;
  - the Project store's whole-backlog read (DEC-012 follow-up).
