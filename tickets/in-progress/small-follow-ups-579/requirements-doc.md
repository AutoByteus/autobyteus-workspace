# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `small-follow-ups-579` (autobyteus-579)
- Request / ticket: Project Task `autobyteus-579` (merged small follow-ups from 576, 583 and 599), Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Requested by: `/project_task_manager`, on the founder's word ("Delegate follow up ticket. Make sure merge small follow ups into one and delegate the ticket")
- Requirements owner: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`)
- Date: 2026-11-22
- Approved by and reference: `Solution Designer within the direction (user informed)`, in my message to the founder in this conversation, 2026-11-22
- Exact approved requirements baseline: this document at SR-001
- Behavior-defining supplements: none

## Problem And Desired Outcome

Six small problems: one product defect and five test-reliability or documentation gaps.

| Item | Source | Problem | Desired outcome |
| --- | --- | --- | --- |
| I-1 | 576 FU-001 | A workspace file that cannot be read shows the node's raw answer as its text in the Files viewer: `{"error":"File not found: …"}`. The `fileContent` query returns refusals in band as a JSON string (`file-explorer.ts:46-74`, `jsonError`), and the web store keeps it as content (`fileExplorerContentActions.ts:358-383`). | The viewer shows its existing error state (`FileExplorerTabs.vue:23-26`, `role="alert"`) with the node's message. |
| I-2 | 576 FU-002, 583 FU-003 | Eight server E2E files fail on a busy Mac at vitest's default 5 s / 10 s limits, not on a product assertion: `provider-secret-lifecycle-graphql`, `request-origin-and-phone-routes`, `embedding-settings`, `project-mutation-node-locality` E-008, `mcp-bulk-import`, `project-task-search`, `node-files`, and `project-mutation-node-locality` again | For each, the cause of the time is found (TESTING.md rule 9), and the test gets the wait or limit its cause calls for |
| I-3 | 576 FU-003, 583 FU-004 | When the OS delivers no file event, the file-event waits of `DCF-E2E-002`/`-003` and `chokidar-watcher-runtime-links.test.ts` fail with a plain message (`not met within 30000 ms`, `expected false to be true`) | They fail with the named `ENVIRONMENT:` (or `INCONCLUSIVE:`) label TESTING.md defines, so a host problem is not read as a product failure |
| I-4 | 583 FU-002 | `claude-provider-turn-race.test.ts` waits a fixed budget (20 × flush + 1 ms) and failed once under whole-suite load | It waits for the conditions it asserts |
| I-5 | 599 FU-002 | `agent-runtimes-graphql.e2e.test.ts` and `team-run-config-graphql.e2e.test.ts` remove folders while processes still write to them (`ENOTEMPTY`) | Cleanup waits for the writers to exit, then removes |
| I-6 | 599 FU-003 | TESTING.md's "Test-only runtime CLI settings" gives a throwaway home for Codex and Antigravity, not Claude | It documents the Claude method used by `lost-session-renewal-live.e2e.test.ts` |

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Raw JSON as file text | Error state with the node's message | A readable file shows its content exactly, including a file whose text happens to be JSON; folder listing, search and write keep their answers | 576 `evidence/IMP-07-relative-link-missing-file.png`; code |
| BEH-002 | Operational | SCN-002 | Timeouts on a busy host | The cause is found; the limit or wait follows it | Tests still fail on a real product regression; quiet-window tests keep their short windows | 576 API-08, 583 DEL-05/API-07 |
| BEH-003 | Operational | SCN-002 | Plain time-out text | `ENVIRONMENT:`/`INCONCLUSIVE:` label | The product assertion unchanged when events arrive | 576 API-04, 583 DEL-05/08 |
| BEH-004 | Operational | SCN-002 | Fixed settle budget | Condition waits | The same assertions | 583 FU-002 |
| BEH-005 | Operational | SCN-002 | `ENOTEMPTY` at cleanup | Writers exit, then remove | Cleanup always removes the test root | 599 API-09 |
| BEH-006 | Operational | SCN-003 | Method only in test headers | In TESTING.md | — | 599 FU-003 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| Founder | Open files; trust test results | A clear error, not JSON; failures that name their cause | No release without his word |
| Team roles | Read test failures correctly | Host problems labeled; no flaky cleanup | TESTING.md rules |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Open a workspace file that cannot be read (missing, outside the workspace, access refused, not-opened semantic memory link) | SCN-001 |
| UC-002 | Run the server unit and E2E suites on a busy Mac and get failures that name their cause | SCN-002 |
| UC-003 | Write a Claude test with a throwaway home | SCN-003 |

### Out Of Scope

- `folderChildren`, `searchFiles` and `writeFileContent` answers (their JSON payloads are structured data, not file text).
- A product performance change, if a slow test turns out to be slow product work: recorded as a follow-up with the measurement.
- Changing `fseventsd` or host settings.

### Non-Goals

- A guarantee that every suite passes under any load.

### Preserved Behavior Boundary

The preserved column of BEH-001…005.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | A file that cannot be read opens in the Files viewer's error state with the node's message; its refusal is never shown as file text | BEH-001 | Must | The defect | Read: the viewer already shows `file.error` from a query error (`fileExplorerContentActions.ts:373, 378-381`) | I-1; DEC-001 |
| REQ-002 | A readable file's text is shown exactly as stored, including a file whose text is `{"error":…}` | BEH-001 | Must | An in-band error marker cannot be told apart from content | N/A | DEC-001 |
| REQ-003 | Each I-2 test has its time cause named, by measurement on a busy host (TESTING.md rule 9) and its wait or limit set by that cause, as DEC-002 says | BEH-002 | Must | Rule 9 | Measurement is the task | I-2; DEC-002 |
| REQ-004 | Every file-event wait in `agent-package-definitions-live-refresh.e2e.test.ts` and in `chokidar-watcher-runtime-links.test.ts` fails with the TESTING.md label when the OS delivers no event to a fresh raw `fs.watch` | BEH-003 | Must | TESTING.md "File watching on a busy Mac" | Existing method (`file-system-watcher.integration.test.ts:30-57`; `DCF-E2E-007`) | I-3 |
| REQ-005 | `claude-provider-turn-race.test.ts` waits on the conditions it asserts | BEH-004 | Must | Rule 9 | N/A | I-4 |
| REQ-006 | The two I-5 files' cleanup waits for every process that writes into a folder before removing it | BEH-005 | Must | Rule 9 | N/A | I-5 |
| REQ-007 | TESTING.md documents the Claude throwaway home: test-owned `HOME` and `CLAUDE_CONFIG_DIR`, `CLAUDE_AGENT_SDK_AUTH_MODE=api-key` with the test-vault key, a recorder that answers `--version` before the server starts, citing `lost-session-renewal-live.e2e.test.ts` | BEH-006 | Must | Reuse | Proven in 599 | I-6 |

## Acceptance Criteria

| AC ID | REQ | Behavior / Scenario | Trigger | Expected | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001, SCN-001 | Open a missing file, a file outside the workspace, and a semantic-memory link not opened | The viewer's error state shows the node's message; no JSON text | — | Web unit test of the store; server unit/E2E of the query; one rendered check |
| AC-002 | REQ-002 | BEH-001 | Open a file whose content is `{"error":"x"}` | It shows as text | — | Unit / E2E |
| AC-003 | REQ-003 | BEH-002 | Each I-2 test | The implementation handoff names the measured phases and cause per test, and the change follows DEC-002 | A product-slowness cause becomes a follow-up with the numbers | Review of the measurements; the whole server E2E suite run once on the busy host |
| AC-004 | REQ-004 | BEH-003 | No OS event (simulated by making the raw watch probe see nothing, or on the busy host) | The failure message begins `ENVIRONMENT:` (or `INCONCLUSIVE:`) | Events arrive: the test passes as before | Unit test of the shared helper; a negative control |
| AC-005 | REQ-005 | BEH-004 | Whole unit suite | The race test waits on conditions; passes | — | Review; unit run |
| AC-006 | REQ-006 | BEH-005 | Whole E2E suite | No `ENOTEMPTY`; the folders are removed | — | Whole-suite run |
| AC-007 | REQ-007 | BEH-006 | — | TESTING.md has the Claude method | — | Review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Founder | Open a file | The Files tab, or a link in chat | The file is missing or refused | Open | The error state | — | Supported Normal Scenario (a file deleted after listing; a link to a missing file) | 576 FU-001 | REQ-001, REQ-002; AC-001, AC-002 |
| SCN-002 | Operational | Team roles | A test run on the founder's busy Mac | `pnpm test:unit` and the E2E suites | `fseventsd` busy | Run | Failures name their cause | — | Supported Normal Scenario (TESTING.md) | 576/583/599 evidence | REQ-003…006 |
| SCN-003 | Operational | API/E2E | Write a Claude test | — | — | Follow TESTING.md | Isolated | — | Supported Normal Scenario | 599 | REQ-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, minimally. The existing error state of the Files viewer is used; no new UI.
- Product design fields: N/A, because the existing surface is reused.

## Quality And Non-Functional Requirements

| Quality ID | REQ / AC | Area | Requirement | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003, REQ-004 | Reliability | No limit is raised without its measured cause; waits end as soon as their condition holds | Tests | Review |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`.

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| `fileContent` GraphQL query (web ↔ server, one release) | Refusals become GraphQL errors (DEC-001). The demo handler and tests follow. | DESIGN.md rule 9 (no cross-version compatibility) | — |

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Only the web store and the web demo read `fileContent` (no phone-native client) | DEC-001 | `grep` over `.ts`, `.vue`, `.swift`, `.kt` (investigation notes) | Holds |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How does the viewer learn a file could not be read? | REQ-001, REQ-002 | (a) The server answers a refusal as a GraphQL error; the web already shows query errors as `file.error`. (b) The web parses the text and looks for `{"error":…}`. | (b) cannot tell a refusal from a file whose text is that JSON, so it would break REQ-002. `fileContent` returns raw text, unlike `folderChildren`, whose answer is always JSON. Web and server ship in one release (DESIGN.md rule 9). Recommend (a). | Solution Designer | Decided: (a) |
| DEC-002 | What does an I-2 test get, by cause? | Rule 9; QR-001 | Causes: (i) OS latency: a folder watcher, or an in-process server's start or close; (ii) a test's own fixed waits or serial work; (iii) product work that is slow | (i): limits and waits from `os-latency-under-load.ts`, as TESTING.md prescribes. (ii): condition waits, or less work in the test. (iii): a follow-up with the numbers; the test gets an explicit, measured limit named for that cause, not a silent raise. | Solution Designer | Decided |
| DEC-003 | Who writes TESTING.md (I-6)? | Ownership | `project-documents.md`: TESTING.md belongs to the API/E2E engineer | The API/E2E engineer writes it in this ticket's API/E2E stage | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-001 | BEH-001 | AC-002 | SCN-001 |
| REQ-003 | UC-002 | BEH-002 | AC-003 | SCN-002 |
| REQ-004 | UC-002 | BEH-003 | AC-004 | SCN-002 |
| REQ-005 | UC-002 | BEH-004 | AC-005 | SCN-002 |
| REQ-006 | UC-002 | BEH-005 | AC-006 | SCN-002 |
| REQ-007 | UC-003 | BEH-006 | AC-007 | SCN-003 |

## Architecture Phase Input

- Scenarios: SCN-001…003.
- Constraints: TESTING.md rules (busy Mac; rule 9).
- Deferred to design: the shared label helper; the resolver's error form.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A` (existing error state)
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
