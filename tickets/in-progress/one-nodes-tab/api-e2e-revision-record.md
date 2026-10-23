# API/E2E Revision Record — one-nodes-tab

The latest coverage investigation and execution coverage report are authoritative; this file records each round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-002 Pass, round 1 | SR-006/SR-007, ARCH-REV-003, IR-002, CRR-002 | N/A | Fail / 92% |

## Revision Entries

### API-REV-001 — First validation: repository suites, one-tab browser probe, Docker node, desktop instance

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-002, Pass), round 1.
- Triggering finding or case IDs: handoff § Not run and § Downstream Coverage Hints.
- Related revision IDs: SR-006/SR-007, ARCH-REV-003, IR-001/IR-002, CRR-001/CRR-002.
- Why this baseline was recorded: first API/E2E validation of the change.
- Coverage decisions or durable test paths changed:
  - `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs` was replaced. The 267 probe drove the removed tab and the old input; the rewrite is NP-01…NP-12 on the one list.
  - `autobyteus-web/tests/e2e/nodes-docker-address-probe.mjs` was added (ND-01…ND-05), with the script `test:e2e:nodes-docker-address`.
  - The desktop journey `evidence/api-e2e/API-09-electron-journey.mjs` is ticket-owned.
- Cases run:
  - API-00 build; API-01…API-04b reused (IMP-02, IMP-03, IMP-09, IMP-06, IMP-10).
  - API-05 integration: Pass. API-06 two-server E2E: Pass (29/29).
  - API-07: Fail (NP-07; everything else passes in run 4).
  - API-08: Pass. API-09: Pass (run 3).
- Commands, environment, fixture, or broader-validation delta: baseline. Environment: test-owned host servers, a test-owned container from `autobyteus/autobyteus-server:beta` with this worktree's `dist` mounted, an isolated desktop instance. The image's `dist` deviates in 4 autobyteus-269 files outside this change (recorded).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (planned sub-cases ND-05 and EL-07; reroute trigger); execution report (all sections).
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 92%.
- New or remaining failure IDs: NP-07 (row line drops the name after `PEER_NAME_TAKEN`).
- Recommended owner: implementation engineer (`Local Fix`), after the code reviewer's failure-origin review.
- Remaining risks, blocked evidence, or untested scope: AC-711 (user check); the image `dist` deviation; zh-CN not rerun in this round's probes (IMP-08, API-03 cover it).
- Rerun plan after the fix: the web unit suite and API-07 (whole probe). API-05, API-06, API-08 and API-09 stay valid if the fix touches only `NodeRow.vue`/`nodeRowStatus.ts` and their specs: none of those cases asserts that line, and none of their paths read it, apart from API-08/API-09's row rendering, which a text-only change does not alter.
