# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, CRR-003 pass, round 1 | IR-001..IR-003, CRR-001..CRR-003, SR-014 | N/A | Fail / 83% |

## Revision Entries

### API-REV-001: baseline round, Org container validated through package edits, two nodes, real runtimes and the web app

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-003), round 1
- Triggering finding or case IDs: N/A (baseline)
- Related revision IDs: IR-003 (implementation `1f0aad498b`), CRR-003, SR-014
- Why this baseline was recorded: the first complete API/E2E result for org-teams-follow-definition
- Coverage decisions or durable test paths changed:
  - added `tests/e2e/agent-org-runs/org-container-package.e2e.test.ts` (OC-01..OC-11) and `tests/e2e/runtime/org-container-live.e2e.test.ts` (OCL-01/02);
  - added RC-56 to `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`;
  - updated RC-07, RC-12 (message), RC-13, RC-20 and `stopped-org-workspace-graphql.e2e.test.ts` for the container shape.
- Cases added, changed, removed, or rechecked: rechecked OF-01..06, AOML-1/2, MIG, TF; added OC, RC-56, OCL, OCU (probe `probes/org-container-ui-probe.mjs`); FSB-01 for the changed `typecheck-baseline.json`
- Commands, environment, fixture, or broader-validation delta:
  - the two-server suite needs `pnpm -C autobyteus-server-ts test:integration:prepare`;
  - the live suite uses the test vault and Codex with a throwaway `CODEX_HOME`;
  - the probe runs Nuxt dev + Chromium against the built backend.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/round-1/`
- Prior result and confidence: N/A
- Current result and confidence: Fail, 83%
- New or remaining failure IDs:
  - F-1: an Org's rows and view drop a Team unit's leaving member (OC-04, OCL-02, OCU-04);
  - F-2: `list_running_agents` lists Org units (RC-47);
  - F-3: stopped Org mixed settings save returns `PERSISTENCE_INDETERMINATE` (ORG-E2E);
  - F-4: a peer Team copy that gained and lost members is not restorable for a follow-up (RC-12/13/24 after RC-56);
  - A-1 (ambiguity): the cross-unit refusal text for a removed Team member.
- Recommended owner: code reviewer (failure-origin review). Proposed: F-1..F-3 implementation, F-4 unclear, A-1 Solution Designer.
- Remaining risks, blocked evidence, or untested scope: macOS/x64 release jobs (runner); macOS file events; FU-001 (memory sync)
