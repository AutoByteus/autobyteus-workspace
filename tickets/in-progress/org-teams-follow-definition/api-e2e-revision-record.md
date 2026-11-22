# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, CRR-003 pass, round 1 | IR-001..IR-003, CRR-001..CRR-003, SR-014 | N/A | Fail / 83% |
| API-REV-002 | Code reviewer, CRR-005 pass (IR-004), round 2 | IR-004, CRR-004, CRR-005, SR-015 (DEC-007) | Fail / 83% | Fail / 91% |

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

### API-REV-002: rerun on IR-004; F-1..F-4 and A-1 resolved; new F-5

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-005), round 2
- Triggering finding or case IDs: F-1..F-4, A-1 (round 1)
- Related revision IDs: IR-004 (`cd6a777b24`), CRR-004 (failure-origin review), CRR-005, SR-015 / DEC-007
- Why this revision was recorded: the requested rerun of OC-04, OCL-02, OCU-04, the two-server file and `stopped-org-workspace`, plus the recommended F-4 Org-form case
- Coverage decisions or durable test paths changed: `org-container-package.e2e.test.ts`: OC-04 asserts the DEC-007 text; OC-12 added (hand-off, removal, Org stop and reopen); OC-13 added (Org edit while an Org rule names a removed member)
- Cases added, changed, removed, or rechecked:
  - rechecked: OC file, ORG-E2E, RC file (whole), OCL, OCU probe, OF, AOML, TC-01;
  - reused: FSB-01, MIG, TF-REG (no build input or migration change).
- Commands, environment, fixture, or broader-validation delta: none beyond round 1. ORG-E2E needs the scripted-AGY gates (without them, one test is skipped and one depends on the environment).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-1 Org rows and view drop a leaving Team-unit member | Local Fix | Resolved (IR-004) | OC-04, OCL-02, OCU-04 |
| F-2 `list_running_agents` lists Org units | Local Fix | Resolved | RC-47 |
| F-3 stopped Org mixed save `PERSISTENCE_INDETERMINATE` | Local Fix | Resolved | ORG-E2E (`stopped-org-workspace-graphql`) |
| F-4 peer Team copy not restorable after member changes | Unclear → Local Fix (CRR-004) | Resolved | RC-12/13/24 after RC-56; OC-12 (Org form) |
| A-1 cross-unit refusal text | Requirement Gap → DEC-007 | Resolved | OC-04, OF-04 |

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (rewritten for round 2), `api-e2e-coverage-investigation.md` (planned cases), `api-e2e-test-progress.md`, `evidence/api-e2e/round-2/`
- Prior result and confidence: Fail, 83%
- Current result and confidence: Fail, 91%
- New or remaining failure IDs: F-5. While an Org rule names a member removed from its Team, the Org stops following its Org definition (`AGENT_ORG_DEFINITION_NOT_FOLLOWED … AgentOrg endpoint '/team/writer' was not found.`).
- Recommended owner: code reviewer (failure-origin review); proposed Local Fix (implementation)
- Remaining risks, blocked evidence, or untested scope: macOS/x64 release jobs; macOS file events; FU-001
