# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, CRR-003 pass, round 1 | IR-001..IR-003, CRR-001..CRR-003, SR-014 | N/A | Fail / 83% |
| API-REV-002 | Code reviewer, CRR-005 pass (IR-004), round 2 | IR-004, CRR-004, CRR-005, SR-015 (DEC-007) | Fail / 83% | Fail / 91% |
| API-REV-003 | Code reviewer, CRR-007 pass (IR-005), round 3 | IR-005, CRR-006, CRR-007 | Fail / 91% | Pass / 95% |
| API-REV-004 | Code reviewer, CRR-011 pass (IR-008), round 4 | IR-006..IR-008, CRR-008..CRR-011, SR-016..SR-018 | Pass / 95% | Pass / 95% |

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

### API-REV-003: rerun on IR-005; F-5 resolved, Pass

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-007), round 3
- Triggering finding or case IDs: F-5 (OC-13)
- Related revision IDs: IR-005 (`cfc4bc67f2`), CRR-006 (failure-origin review), CRR-007
- Why this revision was recorded: the requested rerun of the OC file
- Coverage decisions or durable test paths changed: none
- Cases added, changed, removed, or rechecked:
  - rechecked: OC-01..OC-13 (13/13), TC-01, plus OF-01..06 and the OCU probe (both use the changed Org follow planner);
  - reused from round 2: RC file, OCL, ORG-E2E, AOML (IR-005 touches only the handoff compiler's opt-in mode, the container plan and the membership planner).
- Commands, environment, fixture, or broader-validation delta: none

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-5 Org stops following its definition while an Org rule names a removed Team member | Local Fix (CRR-006) | Resolved (IR-005) | OC-13 (`"followed": true`, no `AGENT_ORG_DEFINITION_NOT_FOLLOWED`), OC-08/09, OF-05, OCU-05 |

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (round 3), `api-e2e-coverage-investigation.md` (meta), `api-e2e-test-progress.md`, `evidence/api-e2e/round-3/`
- Prior result and confidence: Fail, 91%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: macOS file events and macOS/x64 release jobs not run here; FU-001 follow-up

### API-REV-004: full rerun after the merges and the typed path rewrite; Pass, with observation C-1

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-011), round 4
- Triggering finding or case IDs: none (package changed since API-REV-003)
- Related revision IDs: IR-006 (SR-016 merges, SR-017/SR-018), IR-007, IR-008, CRR-008..CRR-011
- Why this revision was recorded: the package changed. Two `origin/personal` merges changed build inputs, runtime, web and remote code; the conversion gained the typed path rewrite.
- Coverage decisions or durable test paths changed:
  - OC-14 added (the beta.7 cross-node Org converted on the built server);
  - `agent-org-units-conversion-cost.e2e.test.ts` added (COST-01, opt-in);
  - FSB-01 regenerated from the current workflow by a job-parsing generator.
- Cases added, changed, removed, or rechecked:
  - rechecked, all passing: BLD-01, TC-01 (both typechecks), FSB-01, MIG (75/649), OF, AOML, ORG-E2E, TF, OC-01..13, RC (62), OCL, OCU;
  - added: OC-14, COST-01.
- Commands, environment, fixture, or broader-validation delta:
  - `pnpm install --frozen-lockfile` (the lockfile changed);
  - the new release step needs Docker (not on this host);
  - COST-01 writes about 1.3 GB under `/root/.autobyteus-e2e/cost`.

#### Prior Failure Resolution

None open (API-REV-003 passed).

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (round 4), `api-e2e-coverage-investigation.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/round-4/`
- Prior result and confidence: Pass, 95%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none.
- Observation C-1, open for decision: the upgrade start on a 1,347 MiB node takes 44.1 s against 4.6 s for the second start. The conversion itself is 2.2 s; the 23 follow-ups each re-run the node pass (1.4–2.2 s each).
- Recommended owner: code reviewer (test-code review; C-1 to the reviewer or designer for a decision)
- Remaining risks, blocked evidence, or untested scope:
  - the clean-image AppImage step (Docker), and the macOS, x64 and Windows jobs need the release runner;
  - Windows paths are proven only in the migration suites;
  - FU-001 is a follow-up.
