# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `baseline-e2e-probe-repair`
- Request / ticket: Project Task `6834441c` — Fix the pre-existing failing server e2e suites and web probes found in the collaboration-model ticket (test-only)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-17
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: Solution Designer conversation message of 2026-10-17 informing the user of the decisions below (all items are stale tests; no product defect; two removed-feature expectations dropped with reasons).
- Exact approved requirements baseline / solution revision: this document at `SR-001`.
- Behavior-defining supplements and their approved versions: None.

## Problem And Desired Outcome

- Problem: 8 server e2e files (27 tests) and 3 web probes fail identically on the base, so a red e2e baseline hides real regressions and blocks Task 7ea7804f (run e2e in CI).
- Affected actors or systems: developers and validation agents; future CI.
- Desired outcome: every listed suite and probe passes, or an expectation that tests a removed feature is dropped with a stated reason, while the supported behavior each one protects stays covered.
- Observable definition of success: the 8 files and 3 probes pass on the branch in clean environments; each fix is its own baseline-fix commit; no production code changes.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001 | `hierarchical-team-run-config-graphql` sends `refType`/`AGENT_TEAM` members and `/Research/*` addresses; Team definitions are now Agent-only, so all 7 tests fail at seeding | The suite covers flat Team run configuration: root defaults + per-member overrides persist, survive restart and restore; invalid runtime is rejected before side effects | Product behavior unchanged | Notes BEH-001 |
| BEH-002 | Contract | SCN-002 | `agent-command-correlated-status` expects `AGENT_STATUS` without `recoverableBlock` | Expectation includes the current payload | Status order offline → initializing → running | Notes BEH-002 |
| BEH-003 | Contract | SCN-003 | `standalone-error-termination-lifecycle` calls removed `prepareNewAgentRun`; the second test then cascades on the process singleton | The suite activates its run through the current activation API and cleans up between tests | Error-runtime list/terminate/history semantics | Notes BEH-003 |
| BEH-004 | Operational | SCN-004 | `team-run-v1-production-upgrade` stops at the TeamRun V2 intermediate and hard-codes the old ledger length | The suite asserts the current end state of the chain (Org-like root → AgentOrg V1) and derives ledger expectations from the current registry | No-loss, health, new work, immutable relaunch, retry semantics | Notes BEH-004 |
| BEH-005 | Operational | SCN-005 | `memory-sync-multiprocess` seeds a current Team package with a nested Team, which current Team V2 rejects | The suite syncs a current flat Team package (plus the standalone run it already covers) across two processes | Cross-process sync and read-back by explicit source | Notes BEH-005 |
| BEH-006 | Operational | SCN-006, SCN-007 | `nested-team-history-restart` seeds a three-level released tree; the flat migration refuses it (approved) and the suite then reads through the retired Team projection | Supported case: a one-level released nested history is moved, converted and readable after startup and after restart; manual-retry case reaches the startup-only flat migration by restarting. Edge case: three-level released history is refused before mutation and the server stays healthy | Layout-repair semantics; approved refusal | Notes BEH-006 |
| BEH-007 | Contract | SCN-008 | `recent-run-projection-graphql` seeds unadmitted, incomplete packages | The suite seeds complete current packages and admits them as production writers do | All projection/paging/archive assertions | Notes BEH-007 |
| BEH-008 | Contract | SCN-009 | `configured-skill-on-demand-loading` calls the private factory method with an old signature | The suite builds the backend through the public preparation entry | Skill catalog and explicit read behavior | Notes BEH-008 |
| BEH-009 | User | SCN-010 | `existing-run-model-config` probe fixture lacks two GraphQL operations | The fixture answers every operation the page sends | Probe cases API-E2E-004-* | Notes BEH-009 |
| BEH-010 | User | SCN-011 | `interrupt-result-presentation` probe sends retired stream shapes and leaves a WebSocket unserved; it has no `package.json` script | Fixture uses current shapes and serves every boundary; probe is discoverable by script | SR008 cases | Notes BEH-010 |
| BEH-011 | User | SCN-012 | `run-settings-live` R03 deletes the member definition to provoke a server rejection, but the client now disables Run first | R03 proves the server-rejection presentation with a trigger the client cannot pre-check | R03's AC-003 assertions | Notes BEH-011 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Developer / validation agent | Trust the e2e baseline | Listed suites/probes green | Test-only |
| Task 7ea7804f owner | Turn on CI | Green baseline for these suites | Not done here |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Repair `agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` | SCN-001 |
| UC-002 | Repair `agent/agent-command-correlated-status.e2e.test.ts` | SCN-002 |
| UC-003 | Repair `agent/standalone-error-termination-lifecycle.e2e.test.ts` | SCN-003 |
| UC-004 | Repair `app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` (also listed in Task 0c7efc37) | SCN-004 |
| UC-005 | Repair `memory-sync/memory-sync-multiprocess.e2e.test.ts` | SCN-005 |
| UC-006 | Repair `run-history/nested-team-history-restart.e2e.test.ts` | SCN-006, SCN-007 |
| UC-007 | Repair `run-history/recent-run-projection-graphql.e2e.test.ts` | SCN-008 |
| UC-008 | Repair `runtime/configured-skill-on-demand-loading.e2e.test.ts` | SCN-009 |
| UC-009 | Repair web probe `existing-run-model-config` | SCN-010 |
| UC-010 | Repair web probe `interrupt-result-presentation` (and add its `package.json` script) | SCN-011 |
| UC-011 | Repair web probe `run-settings-live` case R03 | SCN-012 |

### Out Of Scope

- Any production source change (server `src/`, web components/stores, contracts, migrations, docs other than test-file headers). A product defect found during implementation is reported, not fixed (REQ-011).
- Other stale or flaky tests: Task 0c7efc37 (except `team-run-v1-production-upgrade`, merged here), 7e13a4af (`task-copy-idle-lifetime`), a1dfb6dc (projects-feature, project-manager-ux, task-agent-monitor-visibility probes), `terminal-websocket-lifecycle`, `codex-interrupted-compaction`.
- CI wiring and type-checking `tests/` (Task 7ea7804f).
- Changing `executeGraphql`'s error reporting in the shared bootstrap.
- New coverage for behavior not previously covered by these suites (for example Org-run configuration persistence or Org memory sync).

### Non-Goals

- Restoring coverage for nested Team definitions or three-level history conversion; both are removed or refused by the approved flat-Orgs model.
- Running the full run-settings-live probe (it needs paid inference for other cases); only R03 is in scope.

### Preserved Behavior Boundary

- All product behavior (BEH-001..BEH-011 "Intentionally Preserved Behavior").
- Each repaired suite keeps proving the supported outcome it was written for; assertions are updated to current shapes, not weakened (REQ-010).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The hierarchical suite MUST be replaced by a flat Team run-configuration suite proving: root defaults and per-member overrides persist in the Team V2 tree, are returned by `getTeamRunResumeConfig` while active, after restart and after restore; and missing/blank/unsupported runtime (Team root and Agent member) is rejected before any workspace or run side effect. The nested-Team expectations MUST be dropped with the reason stated in the file header. | BEH-001 | High | Nested Teams were removed by the flat-Orgs change | DEC-001 |
| REQ-002 | `agent-command-correlated-status` MUST expect the current `AGENT_STATUS` payload, including `recoverableBlock: null`. | BEH-002 | High | Payload changed 2026-09-30 | Task direction |
| REQ-003 | `standalone-error-termination-lifecycle` MUST prepare and publish its run through `AgentRunManager.beginActivation`, and each test MUST release the process manager instance even when it fails, so one failure cannot cascade. | BEH-003 | High | API removed | Task direction |
| REQ-004 | `team-run-v1-production-upgrade` MUST assert the current end state of the startup migration chain for each released root (Org-like roots as AgentOrg V1 under `agent_orgs/`, served through the Org history/projection/restore APIs) and MUST NOT hard-code the number of registered migrations. Its no-loss, health, new-work, warning-isolation, retry and relaunch-immutability assertions MUST be kept. | BEH-004 | Critical | Data-continuity proof for released data | DEC-002 |
| REQ-005 | `memory-sync-multiprocess` MUST seed only current-shape packages (flat Team V2, Agent-only members) and keep proving cross-process sync, conflict handling and read-back by explicit source for them. Nested-layout repair expectations that need a Team inside a Team MUST be dropped with the reason stated. | BEH-005 | High | Current Team V2 rejects nested Teams | DEC-003 |
| REQ-006 | `nested-team-history-restart` MUST (a) prove a supported one-level released nested history moves to canonical layout, converts through the full chain and is readable through the current public API after startup and after restart; (b) prove the manual-retry path, including the restart that runs the startup-only flat migration; (c) prove that a three-level released history is refused by the flat migration before it mutates the package, with the server healthy. Released fixtures MUST keep the released keys and shapes (TESTING.md migrations rule). | BEH-006 | High | Supported continuity plus approved refusal | DEC-004 |
| REQ-007 | `recent-run-projection-graphql` MUST seed complete current packages and admit them the way production writers do, keeping every projection, paging, cursor and archive assertion. | BEH-007 | High | Admission introduced 2026-09-27 | DEC-005 |
| REQ-008 | `configured-skill-on-demand-loading` MUST build its backend through the factory's public preparation entry. | BEH-008 | High | Private signature changed | Task direction |
| REQ-009 | The three web probes MUST pass: `existing-run-model-config` and `interrupt-result-presentation` fixtures MUST answer every GraphQL operation and serve every WebSocket the page reaches with current shapes; `interrupt-result-presentation` MUST have a `test:e2e:interrupt-result-presentation` script; R03 MUST provoke a real or boundary-injected server rejection that client readiness cannot pre-empt and keep its AC-003 assertions. | BEH-009, BEH-010, BEH-011 | High | Stale harnesses | DEC-006, DEC-007 |
| REQ-010 | No production file may change. No assertion that still describes supported behavior may be weakened or removed; every dropped expectation MUST name its reason in the test file and the implementation handoff. | All | Critical | Test-only Task | Task direction |
| REQ-011 | If a repaired test reveals a product defect (for example lost content after upgrade), implementation MUST stop that item and report it with the cause for the user's decision instead of fixing product code or weakening the test. | All | Critical | Task direction | Task direction |
| REQ-012 | Each item MUST be committed separately, labelled as a baseline test fix naming the test and cause (TESTING.md Rule 9). | All | High | Rule 9 | Task direction |

## Acceptance Criteria

| AC ID | Requirement IDs | Behavior / Scenario | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-010 | BEH-001 / SCN-001 | Built server; clean env | The flat Team run-config suite passes (persist/restart/restore + 6 rejection cases); header states why nested cases were dropped | — | `vitest run` the file |
| AC-002 | REQ-002 | BEH-002 / SCN-002 | — | `agent-command-correlated-status` passes | — | `vitest run` |
| AC-003 | REQ-003 | BEH-003 / SCN-003 | — | Both tests pass; each passes alone too | — | `vitest run`, plus `-t` per test |
| AC-004 | REQ-004, REQ-011 | BEH-004 / SCN-004 | — | All 4 tests pass with Org-family end-state assertions and registry-derived ledger expectations | Any lost content → stop, report | `vitest run` |
| AC-005 | REQ-005 | BEH-005 / SCN-005 | — | Suite passes with current-shape packages | — | `vitest run` |
| AC-006 | REQ-006, REQ-011 | BEH-006 / SCN-006, SCN-007 | — | Supported one-level case, manual-retry-with-restart case and three-level refusal case pass | — | `vitest run` |
| AC-007 | REQ-007 | BEH-007 / SCN-008 | — | All 9 tests pass | — | `vitest run` |
| AC-008 | REQ-008 | BEH-008 / SCN-009 | — | Both tests pass | — | `vitest run` |
| AC-009 | REQ-009 | BEH-009 / SCN-010 | Nuxt prepared, Chrome | `existing-run-model-config` probe: 0 failures, no browser errors, cleanup receipt | — | probe with fresh `--output-dir` |
| AC-010 | REQ-009 | BEH-010 / SCN-011 | — | `pnpm -C autobyteus-web test:e2e:interrupt-result-presentation` passes with no browser errors | — | probe |
| AC-011 | REQ-009 | BEH-011 / SCN-012 | Signed-in CLIs (real HOME) | `run-settings-live --cases R03` passes: failure copy, values kept, Run enabled, no run created | Environment unavailable → report as not run, never as pass | probe |
| AC-012 | REQ-010, REQ-012 | All | Branch diff | `git diff origin/personal --stat` shows only test files, fixtures and one `package.json` script; one commit per item labelled baseline fix; server `test:unit` and `typecheck` still pass | — | diff + commit log review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Contract | Goal / Event | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | API client | Launch a flat Team with per-member settings, restart, restore | GraphQL | Agent and Team definitions | create → persist → terminate → restart → restore | Configs identical at every step | Invalid runtime rejected, no side effects | Supported Normal | BEH-001 | REQ-001 / AC-001 |
| SCN-002 | Contract | Web client | Watch status while restoring a stopped run | WebSocket | Stopped run | restore → status stream | offline → initializing → running | — | Supported Normal | BEH-002 | REQ-002 / AC-002 |
| SCN-003 | Contract | API client | List and terminate an Error runtime | GraphQL | Active Error run | list → terminate | Active then inactive with history; rejected termination keeps it active | — | Supported Normal | BEH-003 | REQ-003 / AC-003 |
| SCN-004 | Operational | Upgrading user | Start a new build on released TeamRun V1 data | Server startup | Released data | migrations → serve history → new work → relaunch | No loss; history and new work available; second start changes nothing | Warning/failure isolation; retry on restart | Supported Normal | BEH-004 | REQ-004 / AC-004 |
| SCN-005 | Operational | User with two nodes | Sync memory between processes | Memory Sync GraphQL/REST | Two servers | configure → sync → read imported | Imported memory readable by source | Conflict handling | Supported Normal | BEH-005 | REQ-005 / AC-005 |
| SCN-006 | Operational | Upgrading user | Start on released one-level nested Team history | Server startup | Released data | layout repair → V2 → Org conversion → read → restart | Readable via current API, stable after restart | Manual retry + restart | Supported Normal | BEH-006 | REQ-006 / AC-006 |
| SCN-007 | Operational | Upgrading user | Start on released three-level history | Server startup | Released data (pre-v1.4.70 builds allowed it) | layout repair → flat migration refuses | Server healthy; package not mutated by the flat migration; invariant reported | — | Supported Explicit Edge (flat-Orgs REQ-013/AC-008) | BEH-006 | REQ-006 / AC-006 |
| SCN-008 | Contract | Web client | Read run projection and trace pages | GraphQL | Admitted runs | projection → pages | Correct windows, cursors, archive untouched | Cursor rejected for another subject | Supported Normal | BEH-007 | REQ-007 / AC-007 |
| SCN-009 | System | Native runtime | Start a run with configured skills | Backend preparation | Installed skills | prepare → tools/skills catalog → read SKILL.md | Explicit skill reads | — | Supported Normal | BEH-008 | REQ-008 / AC-008 |
| SCN-010 | User | User | Edit an existing run's model settings | Web UI | Saved run | open settings → change → save | Correct config | — | Supported Normal | BEH-009 | REQ-009 / AC-009 |
| SCN-011 | User | User | See interrupted/steered results | Web UI | Agent/Team run | stream → render | Correct presentation | — | Supported Normal | BEH-010 | REQ-009 / AC-010 |
| SCN-012 | User | User | Launch an Org that the server rejects | Web UI | Org launch page | Run → server rejects | Failure copy, values kept, Run enabled, no run | — | Supported Normal | BEH-011 | REQ-009 / AC-011 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (no UI change; probes only observe existing UI).
- Product Design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related IDs | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | AC-001..AC-008 | Reliability | Each repaired suite passes in a clean environment (TESTING.md) twice in a row | `env -i PATH HOME=<tmp> TMPDIR` | two consecutive runs |
| QR-002 | AC-011 | Operability | R03 makes no paid model inference | — | case design review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (tests use their own temp roots and databases).

## External Contracts And Dependencies

| Contract | Constraint | Authority | Risk |
| --- | --- | --- | --- |
| TESTING.md | Clean env, faithful released fixtures, probes supply every boundary and are found by script, Rule 9 commits | TESTING.md | — |
| Flat-Orgs requirements | Agent-only Teams; no deep conversion | flat-agent-organization-model REQ-002/REQ-013 | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| None behavior-defining | — | — | — | — |

## Assumptions

| ID | Assumption | Why | Validation / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The upgraded AgentOrg end state keeps all released content | Otherwise a product defect | Implementation asserts it (REQ-011) | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Drop, or rework, the hierarchical suite? | Nested Teams are gone | Drop file; rework as flat Team; rework as Org | Its non-nested half (root + member overrides, restart, restore, invalid runtime) is still supported and not covered by another e2e at this depth. Rework as a flat Team suite, renamed to `team-run-config-graphql.e2e.test.ts`; drop the nested-Team portion with the reason. Org three-level config is not added (out of scope; Org runs are widely exercised elsewhere). | Solution Designer | Decided |
| DEC-002 | Where should the upgrade suite stop? | 0c7efc37 diagnosis | Stop at V2 (stale) vs. assert current end state | Users start on the full chain; asserting only an intermediate proves nothing about what they get. Assert the end state; derive ledger counts. | Solution Designer | Decided |
| DEC-003 | Memory Sync nested-layout expectations | Current Team V2 can't hold a nested Team | Keep via Org; drop | The nested repair exception concerned released nested memory; a current flat Team has no nested layout. Keep the flat Team and standalone sync, conflict and read-back; drop nested-layout assertions with reason. | Solution Designer | Decided |
| DEC-004 | Three-level nested history fails the flat migration: defect or approved? | Could be lost history | Flat-Orgs REQ-013/AC-008 explicitly forbid deep conversion and require fail-closed | Approved behavior, not a defect. Move the supported assertions to a one-level released shape and assert the refusal for the three-level shape. | Solution Designer | Decided |
| DEC-005 | How should projection tests seed data? | Admission | Mock readiness; admit like production | Admit like production; mocking would hide real admission rules. | Solution Designer | Decided |
| DEC-006 | How should R03 provoke a server rejection? | Client readiness now pre-empts deletion | Real server-only cause; network-boundary injection of the launch mutation response; assert only the new client block | Prefer a real server-side cause the client cannot see. If none exists cheaply, inject the rejection at the GraphQL boundary of the launch mutation only (documented in the case), since R03's subject is the page's failure presentation, not server validation (covered by server tests). Do not just assert the new block: it would drop AC-003 coverage. | Solution Designer | Decided |
| DEC-007 | Add the missing probe script? | TESTING.md: probes are found via their script | Add / leave | Add `test:e2e:interrupt-result-presentation`; one line, in the probe's own fix commit. | Solution Designer | Decided |
| DEC-008 | Absorb `codex-interrupted-compaction` (same cause, Task 0c7efc37)? | Scope | Absorb / leave | Not in this Task's list; leave to 0c7efc37 and tell the Project Task Manager the cause is the same. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | notes |
| REQ-002 | UC-002 | BEH-002 | AC-002 | SCN-002 | notes |
| REQ-003 | UC-003 | BEH-003 | AC-003 | SCN-003 | notes |
| REQ-004 | UC-004 | BEH-004 | AC-004 | SCN-004 | notes |
| REQ-005 | UC-005 | BEH-005 | AC-005 | SCN-005 | notes |
| REQ-006 | UC-006 | BEH-006 | AC-006 | SCN-006, SCN-007 | notes |
| REQ-007 | UC-007 | BEH-007 | AC-007 | SCN-008 | notes |
| REQ-008 | UC-008 | BEH-008 | AC-008 | SCN-009 | notes |
| REQ-009 | UC-009..UC-011 | BEH-009..BEH-011 | AC-009..AC-011 | SCN-010..SCN-012 | notes |
| REQ-010..REQ-012 | All | All | AC-012 | All | — |

## Architecture Phase Input

- Approved scenarios: SCN-001..SCN-012.
- Constraints: test-only; current APIs only; faithful released fixtures; clean environments; one commit per item.
- Deferred to design: concrete harness changes per file; the one-level fixture choice; the R03 trigger.
- Technical facts to verify: AgentOrg end state of the released cohort; whether a server-only rejection exists for R03.
- Risks: RSK-001, RSK-002.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
