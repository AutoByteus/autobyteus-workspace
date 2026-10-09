# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `base-test-suite-green`
- Request / ticket: Project Task from `/project_task_manager` — "Fix the pre-existing failing tests on the base branch … so the suite is green again" (user, 2026-10-08: "we definitely need it")
- Requirements owner: Solution Designer
- Date: 2026-10-08
- Approval state and reference: Approved by the user in this conversation, 2026-10-08: "Based on your investigation … try to fix the one which could be fixable. … if the ones which cannot be fixed, then let it be. Let's go." The user did not pick options for DEC-001..DEC-003, so the recommended options (A/A/A) and ASM-001/ASM-002 are recorded as approved with this baseline (user-directed defaults). Clarification recorded as REQ-005 refinement: tests that cannot be fixed within this ticket are accepted as documented exceptions with their cause.
- Exact approved requirements baseline / solution revision: this document at SR-002
- Behavior-defining supplements and their approved versions: none (evidence files in `evidence/` are evidence only)

## Problem And Desired Outcome

- Problem: On `origin/personal` (`ebf68c4af`), the `autobyteus-server-ts` suites are red. In a clean environment, `tests/unit` has 41 failures in 13 files. On a fresh worktree, `tests/integration` has 89 failures in 27 files; 47 remain after the build outputs are built. The `typecheck` script fails on a configuration error (TS6059) that also hides every real type error. Inside agent shells, the inherited live-app environment adds 2 more unit failures and can point tests at the user's real data. Every ticket must argue "identical on base", and real regressions hide in the noise.
- Affected actors or systems: all agents and developers who run the server suites (TESTING.md Rule 9), and `autobyteus-server-ts` test infrastructure.
- Desired outcome: from `origin/personal` after this change, the unit suite, the integration suite and the typecheck all pass. Each passes with documented, reproducible commands, in a clean environment and in an agent shell that has the live-app variables. No test is deleted or skipped to get there unless the user accepts a recorded reason.
- Observable definition of success: AC-001..AC-008 hold on the merged result.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | `vitest run tests/unit`: 41 failed / 13 files (clean env) | 0 failed | All 5,042 passing tests keep passing; existing opt-in/platform skips unchanged | investigation U1–U13 |
| BEH-002 | Operational | SCN-002 | `tests/integration`: 89 failed on a fresh worktree; 42 caused only by missing build outputs | The documented integration command prepares or verifies its prerequisites and the suite has 0 failures | Opt-in gated live tests stay skipped unless their gate is set | investigation (prerequisite table) |
| BEH-003 | Operational | SCN-002 | 47 failed / 16 files with prerequisites built | 0 failed | Same | investigation I1–I15 |
| BEH-004 | Operational | SCN-003 | `pnpm -C autobyteus-server-ts typecheck` exits 2 on TS6059 and checks no types | `typecheck` performs real type checking of the agreed scope (DEC-001) and exits 0 | `pnpm build` type policy unchanged | TC-1..TC-4 |
| BEH-005 | Operational | SCN-004 | In agent shells, tests inherit live-app config (data/memory dirs, settings, provider mode); 2 extra unit failures; risk of touching user data | Unit/integration results are the same with or without the live-app environment, and tests never resolve to the user's app data | Explicit opt-in gates and fixture variables still work | E1, E2, ENV-1..ENV-4 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Ticket agents (implementation, review, API/E2E, delivery) | Prove "no regression" | A green baseline; any failure is theirs | Run inside app-spawned shells with live-app env |
| User / product owner | Trustworthy baseline | Merged fix; only accepted, documented exceptions | No silent deletion/skip; no product-behaviour change without approval |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Run the server unit suite and get a pass | SCN-001, SCN-004 |
| UC-002 | Run the server integration suite (with its documented prerequisites) and get a pass | SCN-002, SCN-004 |
| UC-003 | Run the server `typecheck` script and get a meaningful pass | SCN-003 |

### Out Of Scope

- Server E2E (`tests/e2e`), real-provider E2E, browser probes, packaged Electron, web (`autobyteus-web`), `autobyteus-ts`, message gateway and other package suites.
- Adding a CI workflow that runs these suites (separate-ticket candidate; RISK-002).
- Fixing type errors in test files beyond what DEC-001 includes. Under the production policy these are 1,322 errors in ~370 files (separate-ticket candidate when DEC-001 = A).
- Making production `src` pass the strict `tsconfig.json` editor flags (3,365 errors).
- Cleaning the ignored test residue in the package root (ENV-5).
- Product behaviour changes, except a confirmed small, clearly intended bug fix under REQ-005.

### Non-Goals

- No new test coverage beyond what is needed to keep each fixed test's original intent.
- No performance target for suite duration.

### Preserved Behavior Boundary

- Production runtime behaviour, APIs, persisted data and `pnpm build` output stay unchanged (unless REQ-005 applies and the user accepts).
- Each fixed test keeps its original behavioural intent, updated to the current intended contract. Deleting assertions just to pass is not a fix.
- E2E and real-provider suites keep their current env handling unless the user approves otherwise.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- Adjacent concerns outside this boundary are non-blocking risks or separate-ticket candidates.
- A downstream reviewer comment does not amend this basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Every currently failing unit test (U1–U13, E1–E2) passes. A stale test is updated to the current intended production contract, keeping its original behavioural intent. | BEH-001, BEH-005 | Must | Red baseline hides regressions | Request; TESTING.md Rule 9 |
| REQ-002 | Every currently failing integration test (I1–I15, including the I11 suite-level error) passes under the same rule. | BEH-003 | Must | Same | Request |
| REQ-003 | The integration suite's build prerequisites (server `dist`, application SDK/devkit `dist` and bin link, Brief Studio importable package) are handled per DEC-002. Missing prerequisites never appear as dozens of unrelated failures. | BEH-002 | Must | 42 failures were prerequisite-only | Investigation; DEC-002 |
| REQ-004 | Unit and integration results do not depend on inherited AutoByteus app or provider environment variables. Under such an environment, tests never resolve data, memory, database or package paths to the user's application data. Explicit opt-in gate and fixture variables keep working. | BEH-005 | Must | Determinism; TESTING.md Rule 2 | ENV-1..ENV-4; DEC-003 |
| REQ-005 | If implementation finds a genuine product bug (e.g. UNK-001), it is fixed in this ticket only if small and clearly intended, with the cause recorded. Otherwise it is reported with its cause as a separate-ticket candidate. Per the user's approval ("if the ones which cannot be fixed, then let it be"), a test that cannot be fixed within this ticket stays failing as an accepted documented exception: test, cause and why it is out of reach are recorded in the handoff and final report. It is not deleted or skipped. | BEH-001..003 | Must | Request step 2 | Request |
| REQ-006 | No test is deleted, skipped or weakened to obtain a pass without a recorded reason the user accepts. Existing opt-in/platform gates are unchanged. | BEH-001..003 | Must | Request step 3 | Request |
| REQ-007 | `pnpm -C autobyteus-server-ts typecheck` performs real type checking of the scope chosen in DEC-001 and exits 0. No configuration error may suppress semantic checking. | BEH-004 | Must | Script has never checked types | TC-1..TC-4; DEC-001 |
| REQ-008 | `TESTING.md` (and the server README test section if it describes these commands) documents the exact commands and prerequisites for the green unit, integration and typecheck runs, and records each baseline fix as its own labelled commit per Rule 9. | BEH-001..005 | Must | Reproducibility | TESTING.md Rule 9 |
| REQ-009 | The fix is merged to `origin/personal`, and the unit, integration and typecheck results are re-verified on the latest `origin/personal` at merge time. Failures that appear on the base before merge get the same classification and treatment. | BEH-001..005 | Must | Done criterion | Request; RISK-001 |

## Acceptance Criteria

| AC ID | Related REQ | Related Behavior / Scenario | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-006 | BEH-001 / SCN-001 | Fresh worktree of the merged result, install + prebuild, clean env | `vitest run tests/unit` exits 0 with 0 failed; skipped count limited to the existing opt-in/platform gates | Any failure blocks Done unless it is a user-accepted documented exception | Full run + JSON report |
| AC-002 | REQ-001, REQ-004 | BEH-005 / SCN-004 | Same, run with the live-app variables present (agent shell) | Same result as AC-001, including the flush-interval and Gemini tests | — | Full run with inherited env |
| AC-003 | REQ-002, REQ-003 | BEH-002/003 / SCN-002 | Fresh worktree, documented integration command (DEC-002) | `tests/integration` exits 0 with 0 failed and no suite-level errors; only gated skips | Missing prerequisites give one clear actionable message naming the missing artifacts and the command, not scattered failures | Full run on fresh worktree |
| AC-004 | REQ-004 | BEH-005 / SCN-004 | Integration and unit runs with the live-app variable set re-pointed at a test-owned sentinel data folder (never the real `~/.autobyteus`) | No file under the sentinel data folder is created or modified by the run; results match AC-001/AC-003 | — | Before/after inspection of a sentinel data dir, plus results |
| AC-005 | REQ-007 | BEH-004 / SCN-003 | `pnpm -C autobyteus-server-ts typecheck` | Exit 0 with semantic checking active; a deliberately introduced type error in the covered scope makes it fail | — | Run + negative probe |
| AC-006 | REQ-001, REQ-002, REQ-006 | all | Code review of the diff | Every changed test traces to a recorded cause (U*/I*/E*); no deletions or new skips without a user-accepted reason; original intent preserved | — | Review against inventory |
| AC-007 | REQ-005 | BEH-001..003 | A product bug found during implementation | Fixed with a recorded cause if small and clearly intended; otherwise reported to the user before Done | — | Handoff/report check |
| AC-008 | REQ-008, REQ-009 | all | Delivery | Docs list exact commands/prerequisites; baseline-fix commits labelled; merged to `origin/personal`; AC-001/003/005 re-run on the latest base | New base failures classified and treated | Delivery evidence |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Ticket agent / developer | Prove no unit regression | `pnpm -C autobyteus-server-ts exec vitest run tests/unit` | Fresh worktree, installed, prebuilt | Run suite | Green | Failure is attributable to the change | Supported Normal Scenario | TESTING.md layers table; prior tickets | REQ-001, AC-001 |
| SCN-002 | Operational | Same | Prove no integration regression | Documented integration command | Fresh worktree | Prepare/verify prerequisites, run suite | Green | Clear prerequisite message | Supported Normal Scenario | TESTING.md; investigation | REQ-002/003, AC-003 |
| SCN-003 | Operational | Same | Type safety gate | `pnpm -C autobyteus-server-ts typecheck` | Installed workspace | Run script | Exit 0 with real checking | Type error → non-zero | Supported Normal Scenario | package.json script; prior tickets | REQ-007, AC-005 |
| SCN-004 | Operational | Agent in an app-spawned shell | Same as SCN-001/002 | Same commands | Live-app variables inherited | Run suites | Same results; user data untouched | — | Supported Normal Scenario (how all ticket agents run) | ENV-1..ENV-4 | REQ-004, AC-002/004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — N/A — not applicable (test infrastructure only).

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement | Conditions | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004 / AC-002, AC-004 | Reliability, Privacy | Identical pass/fail results with and without inherited live-app env; zero writes to user app data | Unit + integration | Paired runs, sentinel dir |
| QR-002 | REQ-001/002 / AC-001, AC-003 | Reliability | Two consecutive full runs both green (no flakes) | Clean env | Repeat run |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (tests and test infrastructure only). User app data must never be touched (REQ-004).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| `repository_prisma` 1.0.10 | U10 must follow the 1.0.10 loading contract (default-namespace import of a CommonJS `@prisma/client` peer, no dotenv) | Package CHANGELOG | Low |
| `TESTING.md` Rules 2 and 9 | No user data; fix base failures as labelled baseline commits | TESTING.md | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/clean-unit-inventory.txt`, `evidence/clean-integration-inventory.txt`, `evidence/clean-integration-prereqs-built-inventory.txt` | Exact baseline failure lists | REQ-001..003 | Current | Evidence only |

## Assumptions

| ID | Assumption | Why Necessary | Validation / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | "The suite" means `autobyteus-server-ts` `tests/unit` + `tests/integration` + its `typecheck` script | All evidence and the request reference these | User approval 2026-10-08 | Accepted |
| ASM-002 | Opt-in gated live tests (`RUN_*`, live URLs, Windows/WSL) stay skipped in the default run | They require external CLIs/credentials by design | User approval 2026-10-08 | Accepted |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | What must `typecheck` check? | The current script has never type-checked anything (TC-2); "passes" needs a defined scope | **A (recommended):** fix the script to type-check production `src` under the production policy; it passes today (0 errors). Test-file type errors (1,322 in ~370 files) become a separate ticket. **B:** also type-check all test files under the production policy in this ticket; much larger, though many errors are the same stale doubles. **C:** keep the strict `tsconfig.json` flags; 10,174 errors, not feasible here. | User | Decided: A (user-directed default, 2026-10-08) |
| DEC-002 | How are integration build prerequisites handled? | 42 failures were only missing build outputs | **A (recommended):** one documented prepare command builds server `dist`, application SDKs/devkit (with bin link) and Brief Studio. The integration run checks these first and fails with one clear message if any is missing. **B:** the integration global setup builds them automatically on every run (slow, but zero-step). **C:** document only. | User | Decided: A (user-directed default, 2026-10-08) |
| DEC-003 | May the unit/integration test setup ignore inherited AutoByteus/provider environment variables (keeping explicit `RUN_*`/fixture gates)? | Determinism and Rule 2 safety | **A (recommended):** yes, for unit and integration only; E2E unchanged. **B:** fix only the 2 env-sensitive tests and leave inheritance. | User | Decided: A (user-directed default, 2026-10-08) |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-005 | AC-001, AC-002, AC-006 | SCN-001, SCN-004 |
| REQ-002 | UC-002 | BEH-003 | AC-003, AC-006 | SCN-002 |
| REQ-003 | UC-002 | BEH-002 | AC-003 | SCN-002 |
| REQ-004 | UC-001, UC-002 | BEH-005 | AC-002, AC-004 | SCN-004 |
| REQ-005 | UC-001, UC-002 | BEH-001..003 | AC-007 | SCN-001, SCN-002 |
| REQ-006 | UC-001, UC-002 | BEH-001..003 | AC-001, AC-003, AC-006 | SCN-001, SCN-002 |
| REQ-007 | UC-003 | BEH-004 | AC-005 | SCN-003 |
| REQ-008 | UC-001..003 | BEH-001..005 | AC-008 | SCN-001..004 |
| REQ-009 | UC-001..003 | BEH-001..005 | AC-008 | SCN-001..004 |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-004 (after approval).
- Constraints: no production behaviour change (except REQ-005); preserve test intent; E2E env handling unchanged; follow TESTING.md Rule 9 commit labelling.
- Deferred to design: exact env allow/deny list and where isolation is installed; the prepare/preflight mechanism; the typecheck config shape; per-test fix approach.
- Technical facts to verify: UNK-001; whether `autobyteus-ts` memory path resolution can be isolated from tests without production change; that the env isolation keeps gated suites working.
- Known risks: base moves before merge (RISK-001).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-08, this conversation)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-002)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
