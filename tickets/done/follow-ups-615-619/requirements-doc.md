# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `follow-ups-615-619` (autobyteus-619; absorbs autobyteus-620)
- Request / ticket: Project Task `autobyteus-619`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`: merged follow-ups FU-001…FU-004 of autobyteus-615
- Requested by: `/project_task_manager`
- Requirements owner: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`)
- Date: 2026-11-23
- Approved by and reference: `Solution Designer within the direction (user informed)`, in my message to the founder in this conversation, 2026-11-23
- Behavior-defining supplements: none

## Problem And Desired Outcome

Four follow-ups; causes established in `investigation-notes.md` (Reproduced).

| Item | Problem | Cause (established) | Desired outcome |
| --- | --- | --- | --- |
| I-1a, I-1c (FU-003) | `collaborators-to-delegated-runs-startup` and `removed-skill-access-mode-history-graphql` fail: "AgentOrg package is not admitted." | **Test setup, not a faithful upgrade.** The tests start the built server on released-shape data with an empty migration ledger, so every historical migration runs, including ones a real install of that release had already recorded. `20260824_team_run_execution_tree_v2` fails on the fixtures' team trees (already past V1), its dependents stay `NOT_RUN`, and autobyteus-29's `20261122_agent_org_units_own_runs_v1` correctly leaves every Org unconverted while a reader predecessor (`20260905_…`) is not terminal. The readiness index then refuses the Org: "a released Org tree that was not converted". | Both tests model a real upgrade (a ledger made by a first start, minus the migrations that release never ran), as the sibling upgrade tests do, and pass |
| I-1b (FU-003) | `memory-collaboration-graphql`: the Memory page's Agent Teams list has 2 definitions, the test expects 1 | **Product regression from autobyteus-29.** An Org's mounted Team is now a Team run of its own (`agent_teams/<unit run>`, `containedIn` the Org), and `listAgentTeamsWithMemory` lists it as a team root (`gql-org-a-1-engineering`). 29's REQ-006 (preserved): the Memory page shows the Org and its units "as today", meaning under the Org. | An Org's Team unit is not listed as a team root in the Memory page's Agent Teams list or its runs; it stays under its Org |
| I-2 (FU-004) | `scoped-org-history-graphql` fails in whole runs: `summary` `""` after Stop, `"Continue."` after restart | **Test helper race.** `tests/e2e/helpers/restore-by-member-message.ts` returns when the run is active and a second snapshot arrived, without waiting for the command's acknowledgement. The server records the summary before it sends that acknowledgement (`agent-org-stream-handler.ts:186-196`), so under load the test stops the run first. The product is correct. | The helper returns only after its own message is acknowledged |
| I-3 (FU-002) | The SR-016 unit test fails when `TMPDIR` is not canonical | **Test defect.** It gives `ReceivedFiles` `memoryDir: fs.realpathSync(os.tmpdir())` but builds the agent folders under `os.tmpdir()`, so `inside()` sees `/private/var/…` outside `/var/…`. In the product both sides come from one configured memory folder (`remote-files-composition.ts:24-26`; the callers join paths, no `realpath`). | The test uses one form of the root and passes with canonical and symlinked `TMPDIR`; the product is unchanged |
| I-4 (FU-001) | `docs/design-cases.md` has two Case 26 and two Case 27 | Parallel merges: 591's Case 26 and autobyteus-28's Case 27 (2026-11-21) came first; 599's 26 and 27 (2026-11-22) came later | 599's two cases become 29 and 30. Each says which number the 599 records cite. A note says to take the next free number at merge. No live document or code cites these numbers; archived ticket records stay unchanged. |

## Relevant Current And Desired Behavior

| BEH | Kind | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Two upgrade E2E files run every migration on newer data | They use the faithful-upgrade ledger | What each test asserts about its own migration | investigation notes |
| BEH-002 | User | Memory page lists an Org's Team unit as an Agent Team | Not listed among team roots | Standalone team roots and their delegated runs as today; the Org page lists its units | 29 REQ-006 |
| BEH-003 | Operational | The helper returns before its message is acknowledged | Returns after | Its other waits | code |
| BEH-004 | Operational | SR-016 depends on `TMPDIR`'s form | Independent | The product's containment check | code |
| BEH-005 | Doc | Duplicate case numbers | Unique numbers, with a cross-reference | Case texts | file |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| UC | Use case |
| --- | --- |
| UC-001 | Run the server unit and E2E suites on `personal` and get passes for these files, for the right reason |
| UC-002 | Browse the Memory page's Agent Teams after Orgs became containers |
| UC-003 | Find a design case by a unique number |

### Out Of Scope

- autobyteus-29's predecessor gate itself. Whether a predecessor that stays `FAILED` in a real ledger should hold back every Org is recorded as FU-001 of this ticket, with its evidence; it is not changed here.
- The Agents tab's listing of Org direct-agent runs: checked by implementation. A visible difference from before 29 becomes a follow-up, not part of this ticket.

### Non-Goals

None.

### Preserved Behavior Boundary

BEH-001…005's preserved column.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| REQ | Requirement | BEH | Source |
| --- | --- | --- | --- |
| REQ-001 | The two upgrade E2E files start from a faithful upgrade: a ledger made by a first start of the build, without the rows of migrations the modeled release never ran | BEH-001 | I-1a, I-1c |
| REQ-002 | The Memory page's team-root lists (`listAgentTeamsWithMemory`, `listAgentTeamRunsWithMemory`) leave out Team runs contained in an Org | BEH-002 | I-1b; 29 REQ-006 |
| REQ-003 | `restoreByMemberMessage` waits for its own message's acknowledgement (accepted, or a refusal reported as today) | BEH-003 | I-2 |
| REQ-004 | SR-016 uses one root form for the receiver and its agent folders | BEH-004 | I-3 |
| REQ-005 | Design case numbers are unique, with the earlier citation named | BEH-005 | I-4 |

## Acceptance Criteria

| AC | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | Both files pass; no migration of the modeled release reruns | E2E runs; the migration statuses recorded |
| AC-002 | REQ-002 | `memory-collaboration-graphql` passes unchanged in its expectations; the Org page still lists its units' memory | E2E; a unit test of the exclusion |
| AC-003 | REQ-003 | `scoped-org-history-graphql` passes in a whole server E2E run (twice); the helper's users still pass | Whole-suite runs |
| AC-004 | REQ-004 | SR-016 passes with `TMPDIR=/var/folders/…` and with its `realpath` | Unit runs, both forms |
| AC-005 | REQ-005 | `grep "^### Case"` shows unique numbers | Review |
| AC-006 | all | The whole server unit and E2E suites on the final state show none of the four failures | Delivery |

## Relevant Scenarios And Journeys

| SCN | Kind | Trigger | Outcome | Validity |
| --- | --- | --- | --- | --- |
| SCN-001 | Operational | Suite runs | Green for the right cause | Supported Normal Scenario (TESTING.md "Green server suites") |
| SCN-002 | User | The founder opens Memory → Agent Teams | Only team roots | Supported Normal Scenario (554 design; 29 REQ-006) |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, restoring the approved 554 Memory layout. No new UI.

## Quality And Non-Functional Requirements

None beyond the ACs.

## Data Continuity And Acceptable Loss

- `No`: no stored data changes.

## Decisions

| Decision ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | I-1a/I-1c: fix the tests or 29's gate? | The tests are not faithful upgrades: on real data the predecessors are recorded (the founder's ledger has `20260824_…_v2` `SUCCEEDED`). Fix the tests with the established pattern (`append-only-message-logs-startup.e2e.test.ts:144-160`, `agent-org-units-conversion-cost.e2e.test.ts:88-93`). The gate's behavior under a permanently `FAILED` predecessor is a separate concern (FU-001). | Solution Designer | Decided |
| DEC-002 | I-1b: change the test or the product? | 29's REQ-006 preserved the Memory page "as today", and 554's approved design lists teams as roots with Orgs holding their units. Fix the product list. | Solution Designer | Decided |
| DEC-003 | I-3: canonicalize in the product? | Both product sides come from one configured folder; canonicalizing would change the containment check for no supported scenario. Fix the test. | Solution Designer | Decided |
| DEC-004 | I-4: which duplicates to renumber? | Renumber the later-merged pair (599's) to the next free numbers; keep the archived records unchanged; name the earlier number under each renumbered heading. | Solution Designer | Decided |

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A` (restores the approved 554 layout)
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (within the direction; founder informed 2026-11-23)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
