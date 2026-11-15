# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `web-typecheck-gate`
- Request / ticket: Project Task `autobyteus-workspace-9` (project `project_3165230d-b602-4efc-ac42-fb61a03f1ed5`), FU-003 of `autobyteus-workspace-7`
- Requested by: `/project_task_manager` (run `project_task_manager_89e33a2ea30f422fab0407e4dc2b13bb`)
- Requirements owner: Solution Designer
- Date: 2026-11-15
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: SR-001 in `solution-revision-record.md` and the Solution Designer's conversation message of 2026-11-15 informing the user. No decision needed the user: every requirement restates or details the Task's own direction.
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- Problem: `pnpm -C autobyteus-web typecheck` fails on `origin/personal` (`742de88c2`): one web test file calls `new CodexAgentRunContext({...})` without `workspaceSkills`, which autobyteus-460 made a required input. Every desktop release build runs this typecheck, so every desktop build of personal stops there. Nothing caught it before the merge, because the testing guideline chooses the typechecks by the package a ticket changes, and autobyteus-460 changed no web file.
- Affected actors or systems: the desktop release workflow; every ticket's implementation, API/E2E and delivery roles.
- Desired outcome: the web typecheck passes again with the smallest correct test change, and the testing guideline makes every TypeScript change run the typechecks that read it, so a server-only change can no longer break the desktop build unseen.
- Observable definition of success: AC-001…AC-007.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | Web typecheck FAIL: 1 test-file error over baseline (TS2345, missing `workspaceSkills`) | Web typecheck PASS at the unchanged baseline (93 in 40 files) | Production types unchanged; baseline unchanged; other projects' counts unchanged | INV-01, INV-04 |
| BEH-002 | Operational | SCN-002 | TESTING.md maps a server-only change to the server typecheck only; nothing selects the web typecheck, which compiles server `src` | TESTING.md requires both typechecks (web and server) for every TypeScript change, says why, and names both in the post-merge rerun step | All other TESTING.md rules | 460 evidence rows in investigation notes |
| BEH-003 | Contract | SCN-001 | The test passes 2/2 at runtime | Still 2/2, with a prepared run context that has a workspace skill holder, as every server Codex test builds it | What the test checks (native-to-projection event sequence) | INV-05 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop release workflow | Build every desktop target of personal | Typecheck step passes | No release in this ticket |
| Implementation / API-E2E / delivery roles | Choose and run checks per TESTING.md | The guideline tells them to run both typechecks for any TypeScript change | Keep TESTING.md short and global |
| Project Task Manager | Unblock releases, close the gate gap | Merge-ready branch, root cause stated | Isolated worktree, no release |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | The desktop build's web typecheck passes on personal | SCN-001 |
| UC-002 | A ticket's validation runs every typecheck that reads its TypeScript change, before merge and after a base refresh | SCN-002 |

### Out Of Scope

- Any other type error, including the 93 baselined web test-file errors and the 1180 baselined server test-file errors.
- Production code, `package.json` scripts, `tsconfig` files, `typecheck-baseline.json`, workflows.
- Adding CI (pull-request or branch workflows): a product/process decision for the user, not this ticket.
- `autobyteus-message-gateway` (not in the pnpm workspace or any release build).
- A release of any kind.

### Non-Goals

- Making the gate mechanically enforced (a script or CI). The Task allows a documented gate; DEC-002 records why a documented rule is the right form here.

### Preserved Behavior Boundary

- BEH-001's preserved column: production types and both baselines unchanged.
- BEH-003: the test's assertions unchanged.
- All other TESTING.md rules unchanged.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | `pnpm -C autobyteus-web typecheck` passes on the ticket branch with no type weakened, no error silenced (`as any`, `as never`, `@ts-ignore`, `@ts-expect-error`) and no baseline change | BEH-001 | Critical | Unblocks every desktop build | Probe INV-04: PASS at 93 in 40 | Task DO (1); DEC-001 |
| REQ-002 | The failing test supplies `workspaceSkills` through the existing server test fixture `createTestRunWorkspaceSkills`, and still passes | BEH-003 | Critical | Smallest correct change; a prepared run has a holder (null means "restore binding not prepared") | INV-04, INV-05 | Task DO (1); DEC-001 |
| REQ-003 | Every type check the release builds run passes on the ticket branch: web typecheck (incl. the shared packages it builds), server typecheck, web guards. Nothing else is fixed; anything else found is listed | BEH-001 | High | Task DO (2) | INV-02, INV-03 (base passes) | Task DO (2) |
| REQ-004 | TESTING.md requires both typechecks (web and server) for every change to TypeScript in any workspace package, states that the web typecheck compiles the server's source and server test fixtures, and names both typechecks in the post-merge/rebase rerun step | BEH-002 | Critical | Closes the gap that let autobyteus-460 through (project-documents.md: the check goes into the earliest stage's document) | N/A | Task DO (3); DEC-002 |
| REQ-005 | The ticket's investigation records why autobyteus-460 did not catch it: which rule selected the checks, which check was skipped, and why delivery did not rerun it | BEH-002 | High | Task DO (3) | Read evidence | Task DO (3) |
| REQ-006 | The branch is merge-ready on `origin/personal`; no release, tag or publish | — | High | Task DO (4) | N/A | Task DO (4); DEC-004 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | `pnpm install`, then `pnpm -C autobyteus-web typecheck` on the branch head, Node 22 | Exit 0, `[typecheck] PASS`, `cross-package tests … 0 errors`, `production errors: 0; test-file errors: 93 in 40 files (baseline 93 in 40 files)` | Any other count, or a changed `typecheck-baseline.json`, fails the criterion | Command log |
| AC-002 | REQ-001, REQ-002 | BEH-001, BEH-003 | Diff of the branch against base | The only source change is in `codex-turn-lifecycle-native-to-live-projection.integration.test.ts`: one import of `createTestRunWorkspaceSkills` from `autobyteus-server-ts/tests/fixtures/run-workspace-skills-fixtures.js` and one `workspaceSkills:` property; no cast, suppression comment, production or baseline change | — | Diff review |
| AC-003 | REQ-002 | BEH-003 / SCN-001 | `pnpm -C autobyteus-web test:nuxt --run <that test file>` | 2 passed | — | Command log |
| AC-004 | REQ-003 | BEH-001 / SCN-001 | Branch head | `pnpm -C autobyteus-server-ts typecheck` PASS at baseline 1180 in 364; web guards (`guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`) exit 0 | A failure is diagnosed (TESTING.md rule 9) and listed, fixed only if a one-line same-cause fix | Command logs |
| AC-005 | REQ-004 | BEH-002 / SCN-002 | Read TESTING.md on the branch | The Web typecheck row says it compiles the server's `src` and the server test fixtures its cross-package tests import; "Choosing the path" has a rule that every TypeScript change in any package runs both typechecks, with the reason; Rerun-by-impact step 5 names both typechecks; committed on its own as `docs(testing): <reason>` | — | Doc review |
| AC-006 | REQ-001, REQ-003 | BEH-001 / SCN-001 | TESTING.md Fresh-start build (the test file gains an import of another workspace package's file and is compiled by the desktop build) | A fresh clone of the branch head with `pnpm install --frozen-lockfile` alone runs the desktop macOS ARM64 build command from TESTING.md past its `typecheck` step and completes | Signing/notarization and other OSes recorded as not tested | Fresh-start log |
| AC-007 | REQ-005, REQ-006 | SCN-002 | Ticket documents | Investigation notes state the root cause of the defect and of the escape; branch merges cleanly into current `origin/personal`; no tag or release | — | Doc review; `git merge-tree`/merge check |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Release workflow / a developer | Build the desktop app from personal | `pnpm build:electron:<os>` (`release-desktop.yml`) | Fresh `pnpm install` | guards → web typecheck → server build → packaging | Typecheck passes; build continues | A new test-file error fails the build at the typecheck | Supported Normal Scenario | `autobyteus-web/package.json:45-50`; INV-01 | REQ-001…003; AC-001…004, AC-006 |
| SCN-002 | Operational | Implementation / API-E2E / delivery of any ticket | Validate a TypeScript change before merge and after a base refresh | TESTING.md "Choosing the path", "Rerun by impact" | A change in any package (e.g. server only) | Read TESTING.md → choose checks → run them → record evidence | Both typechecks run; a server API change that breaks a web caller fails before merge | — | Supported Normal Scenario | autobyteus-460 evidence; TESTING.md:68-106 | REQ-004, REQ-005; AC-005, AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. N/A — not applicable for all Product design fields.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004 | Operability | The added rule costs each ticket at most the two typecheck runs (about 1 minute each on this machine: web 31 s + 19 s + prepare, server 8 s + 22 s) | Any TypeScript change | Timings in INV-01/INV-02 |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Release runner (`release-desktop.yml`) | Starts from `pnpm install --frozen-lockfile` | TESTING.md Fresh-start build; DESIGN.md rule 12 | Covered by AC-006 |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/INV-0*.log` | Reproduction and baselines | REQ-001…003 | Final | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Roles choose checks from TESTING.md (as autobyteus-460's reports show they did) | A documented rule only works where it is read | 460's evidence; TESTING.md is in every role's reading list (project-documents.md) | Confirmed |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How does the test supply `workspaceSkills`? | Smallest correct change without weakening types | (a) `workspaceSkills: null`; (b) `createTestRunWorkspaceSkills({ runId })` from the server's test fixture | The type's doc says null means "a restore binding that was not prepared yet"; the test models a prepared, active run, so null would misdescribe it and make `requireWorkspaceSkills()` throw if a later change reaches it. All 10 server call sites use (b); a web test already imports a server test fixture (`UserMessageStoredUploadNames.spec.ts:3`). Choose (b) | Solution Designer | Decided |
| DEC-002 | Close the gap with a documented rule or a script? | The fix must make the escape not recur | (a) TESTING.md rule: every TypeScript change runs both typechecks; (b) a list of paths that trigger the web typecheck; (c) server `typecheck` also runs the web cross-package project; (d) a root script running both; (e) CI | (b) drifts as cross-package imports grow. (c) couples the server gate to Nuxt's prepare and duplicates the web gate. (d) adds a script, a build input, without changing what roles choose: they would still need a rule to run it. (e) is a new process decision for the user. (a) is where checks are chosen, costs ~2 minutes, and cannot drift. Choose (a) | Solution Designer | Decided |
| DEC-003 | How are the commits split? | Repo rules | TESTING.md rule 9 (baseline fix as its own commit, labelled); TESTING.md "commit it on its own as `docs(testing): <reason>`" | Test fix: own commit labelled baseline fix; TESTING.md: own `docs(testing):` commit; ticket documents separate | Solution Designer | Decided |
| DEC-004 | Release? | Hard to undo | Task says no release | No release | Task direction | Decided |
| DEC-005 | Does TESTING.md's Fresh-start build apply? | Release-runner safety | The test file gains an import of another workspace package's file, and the desktop build type-checks it: the trigger's last bullet. The fixture is TypeScript source whose imports are already in the project's graph | The trigger applies by its letter and the ticket is about release-build safety: run it (AC-006) | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002, AC-006 | SCN-001 | INV-01, INV-04 |
| REQ-002 | UC-001 | BEH-003 | AC-002, AC-003 | SCN-001 | INV-05 |
| REQ-003 | UC-001 | BEH-001 | AC-004, AC-006 | SCN-001 | INV-02, INV-03 |
| REQ-004 | UC-002 | BEH-002 | AC-005 | SCN-002 | — |
| REQ-005 | UC-002 | BEH-002 | AC-007 | SCN-002 | investigation notes |
| REQ-006 | UC-001, UC-002 | — | AC-007 | — | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001, SCN-002.
- Constraints: no production/type/baseline/script/tsconfig change; TESTING.md stays short and global.
- Deferred to design: exact TESTING.md wording and placement.
- Technical facts to verify: fixture import type-checks under the cross-package project (done, INV-04).
- Known risks: RSK-001 (rule not machine-enforced).

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
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
