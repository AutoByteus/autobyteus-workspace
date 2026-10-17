# Requirements Document

## Document Status
- Status: Approved
- Package identifier: `claude-interrupt-resume-fake-cli`
- Requirements owner / approved by: Solution Designer within the Task direction, user informed.
- Date: 2026-10-13; current solution revision: SR-001.
- Approval reference: conversation message beginning “The separate lifecycle check passed all 12 tests…” (2026-10-13).
- Exact approved basis: this document, SR-001. Behavior-defining supplements: N/A — none.
- Authorities read: solution-designer SKILL.md; references/requirements-engineering.md; requirements/investigation templates; repository AGENTS.md and autobyteus-server-ts/AGENTS.md; current-worktree TESTING.md.

## Problem And Desired Outcome
Eight ungated cases in `claude-agent-websocket-interrupt-resume.e2e.test.ts` remain red on freshly fetched `origin/personal` @ `32aca0818e88126c02f009c3987dd86541348c9a`. Restore deterministic public-WebSocket coverage without relaxing production lifecycle safety. Done means the unchanged eight cases pass, the live case skips without RUN_CLAUDE_E2E, and Delivery merges to personal after its verification/finalization gates.

## Relevant Current And Desired Behavior
| ID | Kind | Scenarios | Current evidence | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | 8 failures / 1 skip, opening/cleanup aggregates | 8 passes / 1 skip, zero unhandled errors | Live gate and all original case names/assertion intent |
| BEH-002 | User/System | SCN-002..005 | Intended public streaming behavior remains supported; fixture fails before any send | Deterministic tests exercise these existing outcomes again | Same-session interrupt/follow-up; busy append; exactly-once post-settlement requeue; background notification/turn |
| BEH-003 | Contract | SCN-006 | SDK error cases never reach result classification | All four provider error shapes tested through public WebSocket and successful next turn | Scalar/list precedence, credential redaction, completed tool work, one terminal error, no auto retry, same-session continuation |
| BEH-004 | Contract | SCN-007 | Real pinned SDK lifecycle investigation: 12 passed; fake lacks public initialization observation | Fake obeys current opening and exact-resource-release contract | No production weakening, no imaginary physical-release certificate |
Evidence: investigation-notes.md E-01..E-05.

## Stakeholders, Actors, And Outcomes
Developers/validators regain deterministic coverage without credentials; Claude users retain existing turn/conversation behavior. Production lifecycle owners retain cancellation and exact cleanup invariants.

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
- UC-001: Run this deterministic suite in an isolated test environment (SCN-001,007).
- UC-002: Validate existing interrupt, busy append, requeue and background behaviors (SCN-002..005).
- UC-003: Validate existing SDK failure and next-turn behaviors (SCN-006).
### Out Of Scope
Other stale suites (Tasks aac4b26a/0c7efc37), global test typechecking or CI/release gates, provider upgrades, frontend redesign, migrations, and production lifecycle redesign. A product defect discovered downstream must be reported to Solution Designer before fixing; it is not silently authorized here.
### Non-Goals
Paid inference, universal cross-platform process teardown certification, or expanding this suite beyond its existing eight deterministic and one live cases.
### Preserved Behavior Boundary
BEH-002..004 and REQ-002..004. Do not suppress assertions, increase waits to mask opening failures, skip fake cases, suppress unhandled errors, or fabricate release proofs.
### Review Authority
Blocking findings must trace to approved REQ/AC/BEH IDs. New product policy/behavior or production changes require recovery and renewed requirements approval, not an informal reviewer amendment. Adjacent improvements are separate-ticket candidates.

## Relevant Scenarios And Journeys
| Scenario | Actor/event and goal | Trigger / starting condition / sequence | Outcome and alternate | Validity / independent basis |
| --- | --- | --- | --- | --- |
| SCN-001 | Developer runs credential-free runtime regression | Fresh dependencies; ungated suite executed in private HOME/data, gate absent | Eight behavioral cases pass; one live skip; actual failure stays a failure | Supported Normal Scenario — assigned Task and TESTING.md |
| SCN-002 | User refines running Claude work | Existing conversation; send → tool runs → Interrupt → follow-up | Same conversation retains prior context; only current turn interrupted | Supported Normal Scenario — historical interrupt-session requirements and Task |
| SCN-003 | User adds instructions while busy | Send long work → send additional instruction before settlement | Both inputs answered in one active turn without another query | Supported Normal Scenario — current Task/suite AC-003 |
| SCN-004 | Input arrives as active turn ends | Busy user send accepted as append → first turn settles before dispatch | Requeue once as next turn, no failed/duplicate terminal lifecycle | Supported Explicit Edge Scenario — explicit Task/suite AC-016 race contract |
| SCN-005 | Provider background completion | Background job starts → user turn ends → job completes → autonomous report | Completion notice plus provider-initiated streamed turn settles | Supported Normal Scenario — explicit Task/suite AC-002 |
| SCN-006 | SDK-reported turn failure | Normal work produces partial text/tool success → SDK error result → user continues | Single redacted terminal error, no automatic retry; next same-session turn works | Supported Explicit Edge Scenario — report/API-CL01..04, existing approved error-message requirements |
| SCN-007 | Opening/release contract | SDK query acquired → public initialization observed → controlled resources released | Cleanup needs exact child/IO and acquisition settlement evidence; malformed query is not certified | Supported Explicit Edge Scenario — production contract, Task no-production-weakening constraint, existing pinned-SDK tests |
No new UI scenario is authorized. Fake messages are contract stimuli, not proof of paid inference.

## Requirements
| ID | Requirement | Behavior / use cases / scenarios |
| --- | --- | --- |
| REQ-001 | Restore eight ungated passes and one gated skip on current personal without RUN_CLAUDE_E2E or credentials. | BEH-001 / UC-001 / SCN-001 |
| REQ-002 | Preserve the existing streaming/conversation assertions, including exactly-once race settlement. | BEH-002 / UC-002 / SCN-002..005 |
| REQ-003 | Preserve all four provider-error cases and next-turn assertions without auto retry. | BEH-003 / UC-003 / SCN-006 |
| REQ-004 | Test opening honors current public initialization and controlled acquisition/cleanup; no production change solely for the fake. If a real product defect emerges, report it before fixing. | BEH-004 / UC-001 / SCN-007 |
| REQ-005 | Tests own resources and release sockets/server/workspaces/children, with no unhandled rejection or user-data access. | BEH-001,004 / UC-001 / SCN-001,007 |
| REQ-006 | Finalize by merging the verified fix into personal under Delivery's gates; no release/deployment is requested. | BEH-001 / UC-001 / SCN-001 |

## Acceptance Criteria
| ID | Requirements / scenarios | Observable verification |
| --- | --- | --- |
| AC-001 | REQ-001,005 / SCN-001 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts --no-watch` under clean private HOME without RUN_CLAUDE_E2E: 8 passed, 1 skipped, exit 0, no unhandled errors. |
| AC-002 | REQ-002 / SCN-002..005 | Existing named AC-005, AC-003, AC-016, AC-002 assertions remain effective and pass; one query/conversation survives relevant follow-ups; late append reaches provider exactly once. |
| AC-003 | REQ-003 / SCN-006 | API-CL01..04 assert original error texts/redaction/one error and no auto retry; completed work preserved; follow-up completes with same session/query. |
| AC-004 | REQ-004,005 / SCN-007 | Fixture observes public initialization and uses controlled acquisition, waits for owned cleanup; pinned-SDK real-child opening/release and process-owner regressions still pass. Diff contains no production behavior/seam change. |
| AC-005 | REQ-004 / SCN-007 | Investigation names actual immediate cause and distinguishes fixture gap from production evidence and remaining limits. Any newly found product issue routes back before change. |
| AC-006 | REQ-006 / SCN-001 | Delivery receipt records explicit user verification, final integrated rerun and merge/push revision on origin/personal; cleanup/release gates truthfully Completed or Not required. |
AC IDs above are this package's; legacy IDs in test titles are unchanged, not renumbered.

## UI, Interaction, And Experience Requirements
N/A — no UI change or Product design request. All Product-owned fields/supplements are N/A.

## Quality And Non-Functional Requirements
QR-001 → REQ-001/005/AC-001: deterministic credential-free run, zero unhandled errors, owned resources only. QR-002 → REQ-004/AC-004: production lifecycle and error semantics unchanged.

## Data Continuity And Acceptable Loss
No production persisted/external data is affected. Preserve user conversations/settings/credentials; only disposable test-owned state may be removed. Migration/retention/volume/downtime: N/A.

## External Contracts And Dependencies
Pinned SDK 0.3.280 public Query initialization and spawn/release interfaces, local installed source/typings and production owners. The suite's fake is not actual model protocol proof. Node/Vitest/pnpm/Prisma prerequisites are installed/built in the isolated worktree.

## Supplemental Artifacts
investigation-notes.md inventory is canonical. Baseline and lifecycle logs are evidence only, not behavior-defining supplements. Product/review supplements: N/A.

## Assumptions And Decisions
- ASM-001: No paid/live run is needed to diagnose this opening-contract mismatch. Validated within controlled pinned-SDK real-child boundary, not universal model behavior.
- DEC-001 (Solution Designer, Decided): Limit repair to this suite/test fixtures. All failures share malformed-query rejection; actual pinned-SDK lifecycle passes. Recommendation: repair fake, not production safety checks.
- DEC-002 (Solution Designer, Decided): Keep related tasks separate; their tooling/other-suite scope is not assigned here.
- DEC-003 (Solution Designer, Decided): Require controlled acquisition and exact cleanup proof, rather than adding only a no-op method or mocking away opening. This aligns Task contract and preserves useful lifecycle coverage.
- Needs user: none at requirements approval. Delivery still owns explicit user verification before merge.

## Traceability / Architecture Phase Input
REQ/AC/scenario/use-case links appear above. Architecture must trace the current public websocket-to-Claude opening path, design a test-only fake delta, preserve all assertions and production invariants, and specify owned teardown. No change to runtime policy, persisted data or SDK version.

## Readiness Check
Content ready: Yes — evidence-backed current failure; desired/preserved outcomes, scope, stable testable IDs, supported scenarios and decisions recorded; UI/supplement approval N/A; no material decision open.
Approved basis ready for design: Yes — exact SR-001 baseline approved within Task direction, user informed in the referenced conversation message. Remaining blocker: None.
