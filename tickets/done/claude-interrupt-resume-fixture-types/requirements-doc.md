# Requirements Document

## Document Status
- Package: `claude-interrupt-resume-fixture-types`; Project Task `project_task_11c75527-3875-4664-a49c-d1c871064d5c`.
- Status: **Approved**; requirements baseline / current revision **SR-001**.
- Owner/approval: Solution Designer within Task direction, user informed by conversation beginning “The fresh baseline reproduces the same seven TypeScript diagnostics…” (2026-10-13).
- Explicit dispatch approval carried in Task: user “you can delegate the follow up ticket to the same team” (2026-10-13). Earlier backlog-only wording is superseded by this later authorization, not a blocker.
- Exact approved basis: this new Task's requirements-doc.md at SR-001. Behavior-defining supplements: None; previous Task requirements/reviews are read-only evidence, not this Task's approval.
- Authorities read: solution-designer SKILL.md, requirements-engineering.md; requirements/investigation/revision templates (read in current conversation); task-worktree AGENTS.md, server AGENTS.md, current TESTING.md.

## Problem And Desired Outcome
Current finalized Claude interrupt/resume fixture runs green but has seven scoped compiler diagnostics: missing ws declarations, three consequent implicit-any callbacks, incomplete AgentDefinition and two retired status capability references. Maintain the fixture against declared interfaces and obtain **zero diagnostics** in its single-file/imported graph under existing build compiler policy, without changing its behavior or production contracts. Validate, review proportionately and merge through normal Delivery gates. No release requested.

## Relevant Current And Desired Behavior
| ID | Kind / scenarios | Evidence-backed current | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | Operational / SCN-001 | Fresh baseline compiler: seven diagnostics; old delta helper returned 0 for no introduced errors, not a clean compile | A reproducible scoped check emits zero diagnostics/exit 0; any diagnostic fails, not filtered or grandfathered | Existing production build compiler strictness and explicit graph scope |
| BEH-002 | User/System/Contract / SCN-002 | Untouched current base target: 8 pass / 1 gated live skip | Same observable results after type cleanup | Eight case identities, all assertions/provider scripts/turn IDs, controlled child/IO/exact-manager cleanup and live gate/deadlines |
| BEH-003 | Contract / SCN-003 | Fixture disagrees with current AgentDefinition, status projection and ws types | Fixture represents those current declared contracts without suppressions | Production DTOs/prompt/interrupt/runtime/API semantics; constructor defaults must not change prompt text |
Evidence: investigation-notes.md E-01..E-07.

## Stakeholders, Actors, And Outcomes
Developers and validators need a trustworthy narrow compiler result and unchanged runtime coverage; production owners retain current contracts. The Task Manager owns Task status closure; Delivery owns explicit user verification and merge.

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
- UC-001: Developer runs a reproducible compiler check for this existing E2E file and its imported graph (SCN-001).
- UC-002: Maintain/run the original Claude WebSocket regression without behavioral dilution (SCN-002,003).
### Out Of Scope
Repo-wide test typechecking/CI or normal-check-path policy (Task 7ea7804f), other stale suites/fixtures (Tasks 0c7efc37/aac4b26a), production schema/API/runtime/interface changes, SDK/ws runtime upgrades, reopened original repair or new product defect fix, UI design, migrations, release/deployment.
### Non-Goals
Type-clean all tests, stronger compiler policy than the scoped original build policy, paid live-provider/other-OS certification, more than the original 8+1 cases, general fixture/helper-framework refactor.
### Preserved Behavior Boundary
BEH-002/003, REQ-002/003/004. No as-any/as-never additions to hide these diagnostics; no ambient untyped ws declaration, ignore directives, weakened compiler flags, diagnostic allowlist, source-graph filtering, removed checks, increased waits or gate expansion.
### Review Authority
Blocking findings must trace to approved BEH/REQ/AC IDs. A newly required production/shared owning change or expanded project policy is a Requirement Gap/Design Impact to report before fixing; reviewer proposals do not silently amend scope. Initial independent review routes follow configured classification; proportional review of this delta is still required by Task and must not be claimed from the prior Task's CRR-002 Pass.

## Relevant Scenarios And Journeys
| Scenario | Actor / goal | Supported trigger, state and sequence | Expected / alternate | Validity / independent evidence |
| --- | --- | --- | --- | --- |
| SCN-001 | Developer checks maintained fixture | Dependencies/shared outputs ready → scoped compiler on file + graph → examine complete diagnostics and exit | Empty diagnostics/0 only if clean; malformed config or any graph error fails | Supported Normal Scenario — user-authorized Task and existing focused-check evidence |
| SCN-002 | Developer runs existing Claude regression; underlying user/system workflows preserved | Private environment, live gate absent → four SDK error/next-turn cases plus interrupt/follow-up, busy append, late-append race and background completion → teardown | 8 pass / 1 live skip, no unhandled errors; same conversation, terminal/error/cleanup assertions remain effective | Supported Normal operational scenario covering previous Task's explicitly supported normal/edge workflows; finalized Task and fresh current-base run |
| SCN-003 | Governing declared contracts consumed by test | Compose current AgentDefinition prompt; obtain run status projection; register typed ws event callbacks | Fixture conforms to actual interfaces while returning/processing unchanged supported values; no invented capability fields | Supported Explicit Edge Scenario — TypeScript contracts + explicit maintenance Task, not mock-created product behavior |

## Requirements
| ID | Requirement | Links / priority |
| --- | --- | --- |
| REQ-001 | Remove all reported scoped diagnostics and provide reproducible clean/fail compiler evidence for the target/import graph under existing build policy; report total diagnostics, not only introduced ones. | BEH-001/003, UC-001, SCN-001/003; High |
| REQ-002 | Preserve eight ungated cases, opt-in live case/gate and every behavioral/cleanup assertion; typed inputs must preserve composed prompt content and actual command/status behavior. | BEH-002/003, UC-002, SCN-002/003; High |
| REQ-003 | Production contracts/source and runtime dependency versions stay unchanged; proper development declarations are allowed. No suppression or diagnostic/behavior dilution. Report another owning problem before widening scope. | BEH-003, UC-001/002, SCN-003; High |
| REQ-004 | Target still reports 8 passed / 1 skipped without RUN_CLAUDE_E2E, with no unhandled errors; production typecheck passes; use private test-owned resources and truthful cleanup. | BEH-002, UC-002, SCN-002; High |
| REQ-005 | Validate and review the narrow changed package proportionately under the normal workflow, then capture explicit user verification, final integrated checks and merge to origin/personal. | BEH-001/002, UC-001/002, SCN-001/002; High |

## Acceptance Criteria
| ID | REQ / scenarios | Observable proof |
| --- | --- | --- |
| AC-001 | REQ-001/003, SCN-001/003 | A fresh package-local scoped compiler command checks target plus transitively imported project graph and returns **zero diagnostics / exit 0** with inherited build policy. No delta-only filter or error allowlist. All seven prior diagnostics are closed. |
| AC-002 | REQ-001/003, SCN-001 | Checker config/negative control proves target is actually included and a deliberate local target type error makes that same command fail; restore immediately. Do not count an empty/excluded graph as clean. Evidence names policy/prerequisites/scope. |
| AC-003 | REQ-002, SCN-002/003 | Static preservation checks retain original case bodies/expectations/gate/provider/teardown logic; fixture changes keep same composed prompt string and status payload/command routing behavior. |
| AC-004 | REQ-002/004, SCN-002 | Exact command `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts --no-watch` in clean private environment gives **8 passed / 1 skipped, exit 0**, no unhandled errors and owned resource assertions pass. |
| AC-005 | REQ-003/004, SCN-003/002 | `pnpm -C autobyteus-server-ts typecheck` succeeds. Diff has no production src/runtime-dependency/contract change or new suppression; dev-declaration metadata changes stay narrow. |
| AC-006 | REQ-005, SCN-001/002 | Current package has proportionate change-review evidence, independent executable validation and Delivery receipt showing user verification, final scoped/compiler+target+production checks and merge/push/cleanup. Prior Task passes are provenance only. |

## UI, Interaction, And Experience Requirements
Not applicable; Product request/spec/screens/references/approvals **N/A — not applicable**.

## Quality / Data Continuity / Dependencies / Supplements
QR-001 → REQ-001/003: zero-diagnostic semantics with unchanged compiler policy; no introduced-vs-baseline exemption. QR-002 → REQ-004: credential-free owned resources; skip never a live pass.
Production persisted data **Not Affected**; user conversations/settings/credentials untouched. Disposable private HOME/cwd/test DB may be removed. Migration/downtime/retention: N/A.
Dependencies: existing TypeScript/Node/ws/Vitest/Claude SDK and production fixture contract declarations. No provider spend needed. Supplement inventory in investigation; original diagnostics/helper/commands/report snapshots are evidence-only, not competing requirements.

## Assumptions / Decisions
- DEC-001 (Solution Designer, Decided): Same seven diagnostics reproduced on completed repair, while runtime remains green. Treat this as a new independent type-maintenance Task, not reopened review Fail or product change.
- DEC-002 (Solution Designer, Decided): A durable narrowly targeted checker is appropriate: original helper's exit 0 only meant no introduced diagnostics. A current clean/fail check makes this Task's outcome reusable without changing repository-wide policy.
- DEC-003 (Solution Designer, Decided): Use real current type declarations/fixture defaults; remove retired capability members rather than widen production interfaces or cast away drift. Exact implementation is architecture-owned.
- DEC-004 (Solution Designer, Decided): Proportional review should assess fixture/declaration/checker delta, not full independent architecture review or the old completed package. Configured routes remain authoritative; downstream records must explicitly demonstrate current proportionate review before Delivery (source/test specialist if selected, otherwise direct-route proportionate self-review). No prior Pass is reused as this change's review.
- ASM-001: Reproduction suggests local fixture/declaration causes only. If proper typing exposes a different production/shared ownership problem, stop/report before expanding.
- Needs user: None for these requirements; Delivery's later explicit verification remains required.

## Traceability / Architecture Phase Input
Tables above map every REQ/AC to UC/SCN/BEH. Architecture must choose current declaration dependency, accurate local prompt/status fixture form and reproducible scoped-check owner while preserving production/data boundaries and runtime coverage.

## Readiness Check
Content ready **Yes**: current evidence, supported operational/contract scenarios, traceable scope/AC, decisions and preserved outcomes established. UI/supplement approval N/A. Exact SR-001 approval recorded and user informed; approved basis ready for design **Yes**. Blocker **None**.
