# API/E2E Coverage Investigation — autobyteus-384 (list_projects returns each Project's linked folders)

## Investigation Meta

- Requirements Doc: `tickets/in-progress/list-projects-workspaces-384/requirements-doc.md` (SR-001; release DEC-004 by SR-002)
- Investigation Notes: `tickets/in-progress/list-projects-workspaces-384/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/list-projects-workspaces-384/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/list-projects-workspaces-384/design-spec.md`
- Supplemental Task Artifacts: `handoff-implementation.md`
- Design Review Report: `N/A — not applicable` (direct Small / Low route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/list-projects-workspaces-384/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/list-projects-workspaces-384/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation_engineer handoff, IR-001, HEAD `af13798404`
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-001, AC-004: `list_projects` returns each Project's `workspaces: [{workspaceRootPath, description}]`. The tool result rule leaves out an empty description, an empty list and a link's empty description. Native and MCP-served results are identical (one executor).
- REQ-002 / AC-002: `create_project`/`update_project` results use the same projection (`toProjectSummary`), with their shape unchanged.
- REQ-003 / AC-003: the `list_projects` description names `workspaces` and its purpose.
- REQ-004 / AC-005: tests cover the field; server `test:unit` and `typecheck` pass.
- Preserved: order by name; `projectId`, `name`, `description`; no arguments; task search keeps reading `projectId` and `name` from `listProjectSummaries`.
- Persisted data: `Not Affected` (read-only projection). Release: a new beta after finalization (DEC-004, delivery's job).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (an agent lists Projects to find the one a folder belongs to).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1: a Claude, Codex or other MCP-served agent calls `list_projects` through the agent-tools MCP host over HTTP, which is the real transport for non-native runtimes. Its fixtures are Projects with folders linked through `create_project`, as a real agent links them.
  - SCN-A2: a native AutoByteus agent with `list_projects` is asked which Project a folder (one inside a linked folder) belongs to. It calls the tool, and the model reads the description and the field. Entry: a live run through the in-process studio server on local LM Studio.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 `list_projects` result | Changed (adds `workspaces`) | `911a303a25` | Unit (IMP-01); real MCP e2e with folders (new assertions); live agent probe |
| BEH-001 `list_projects` description | Changed | `project-task-tool-contract.ts` | Unit (IMP-01); live probe shows a model using it |
| BEH-002 create/update result | Preserved shape, shared projection | manifest | Existing e2e E-005/E-006 assert the acks; new check that a list entry equals its create ack |
| Task search over `listProjectSummaries` | Preserved | `project-task-search-service.ts` reads `projectId`, `name` | Search tests in IMP-01 and `test:unit` |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `toProjectSummary`, `listProjectSummaries` | Unit tests | — | — |
| API / transport / contract | Yes | Agent tool result over native and the MCP HTTP host | Unit test through the MCP adapter object | Real HTTP MCP serialization with folders (existing e2e fixtures have none) | Server e2e `project-task-boundaries.e2e.test.ts` with new assertions |
| Frontend component / state | No | GraphQL `listProjects` untouched | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No (`Not Affected`) | read-only | E-006 already asserts the stored links are unchanged | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Indirect | A model reads the result and description | None | Whether a real model sees and uses the folders | Live AutoByteus run on LM Studio |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-projects-workspaces-384`, branch `codex/list-projects-workspaces-384`, HEAD `af13798404`
- Project type and runtime stack: pnpm monorepo; TypeScript server (Fastify, GraphQL, MCP HTTP host, vitest)
- Project testing guideline path(s): `TESTING.md` (root); no closer `TESTING*.md`
- Conflicting, missing, or unclear project instructions: None
- Required environment variables or secrets available: `N/A` (local LM Studio, no key)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers | Server E2E | One file: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| `TESTING.md` § Rerun by impact; Rules 2, 9 | Reuse, data safety, failures | Reuse IMP checks; never the user's data; find each failure's cause |
| `tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts` | Pattern for a live in-process run | `startStudioE2eRuntimeServer`, `LMSTUDIO_HOSTS`, GraphQL `createAgentDefinition`/`createAgentRun`, `/ws/agent/<runId>` |
| `src/startup/agent-tool-loader.ts` | Native Project tools registered at startup | `project_tasks` → `registerProjectTaskTools` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process studio server + MCP host | `autobyteus-server-ts` | started by the test or probe on a temp data dir | test-owned | the test's own | `afterAll` closes it and removes the dir |
| LM Studio `qwen/qwen3.6-35b-a3b` | host | loaded on demand | one model at a time | `lms ps` | `lms unload --all` (none loaded before) |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Projects with linked folders | `create_project` over MCP (e2e); GraphQL `createProject` with workspaces (probe) | Temp data dir only | Removed by the test or probe |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/projects/project-summary.test.ts` (new) | Projection fields | REQ-001, REQ-002 | Still Valid | IMP-01 | Reuse |
| `tests/unit/agent-tools/project-tasks/project-task-tools.test.ts` (new cases) | list_projects native = MCP adapter; folders and descriptions; description text | AC-001, AC-003, AC-004 | Still Valid | IMP-01 | Reuse |
| `tests/e2e/projects/project-task-boundaries.e2e.test.ts` API-MCP (L171-176), E-005 (L340-342), collision (L293) | `list_projects` over real MCP equals native; folder-less entries `{projectId, name, description}` | BEH-001 preserved fields | Still Valid (folder-less Projects get no `workspaces` field) | read | Run |
| Same file, E-006 | Folder links through create/update over MCP; acks | AC-002 | Needs Update | It creates Projects with folders but never lists them | Add list_projects assertions |
| Search tests (`project-task-search*.test.ts`, index status) | Search reads `projectId`, `name` | preserved | Still Valid | IMP-01 | Reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-003, AC-004 | projection, native tool, MCP adapter, description | Reused | IMP-01 | Ran at `911a303a25`; HEAD `af13798404` adds only ticket files |
| API-02 | AC-005 | server gate, `test:unit` | Reused | IMP-02 | Ran on the tree of `911a303a25`; the tracked-imports failure was the then-uncommitted file, and `tests/architecture` passed 61/61 after the commit |
| API-03 | AC-001, AC-002, AC-004, preserved fields | Real HTTP MCP host + GraphQL + native tool | Durable (updated) + Existing Test | Add to E-006: after the links are made, `list_projects` over MCP equals the native result; the entry with folders equals its `create_project` ack and AC-001's shape; a Project without description shows no `description`. Then `vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts` (whole file, clean env) | Proves AC-001 over the real transport non-native runtimes use; the whole file checks that the existing expectations still hold |
| API-04 | AC-005 | server type gate | Existing Test | `pnpm -C autobyteus-server-ts typecheck` after the e2e edit | The edit touches a type-checked test file |
| API-05 | SCN-001 / SCN-A2, AC-003 | live native AutoByteus run, tool → model | Temporary Probe | In-process studio server; GraphQL creates Projects "Shop frontend" (folders `<tmp>/shop/web` with description "Storefront UI", `<tmp>/shop/api`) and "Docs site" (`<tmp>/docs`); an agent with `list_projects` only is asked which Project `<tmp>/shop/web/src/cart` belongs to, replying with the projectId; assert the raw `tool_result` has the `workspaces` and the answer names the right projectId. LM Studio `qwen3.6-35b-a3b` | A model's use of the field is the scenario's goal. Kept as a probe: the answer depends on a live model, and the repository's live suites are gated per runtime; the durable contract is API-03 |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None as new files.

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-03 | `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` E-006 | Assert `list_projects` over real MCP shows the linked folders (AC-001), equals native (AC-004), and each entry equals its create ack (AC-002) | Its own test commit |

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order and commands: no model loaded beforehand; the probe loads `qwen3.6-35b-a3b` through LM Studio; `lms unload --all` afterwards.
- Environment choices: clean env, temp HOME, temp data dir; `LMSTUDIO_HOSTS=http://127.0.0.1:1234`.
- Seed data: two Projects with folder links, through GraphQL.
- Evidence: probe output, the run's raw `tool_call`/`tool_result` and the final answer.
- Cleanup: the server and data dir (probe `afterAll`), the model load, the probe file (copy kept).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Live Claude/Codex agents calling `list_projects` | Paid; the MCP transport is proven by API-03 | Low | No | None |
| The Project Task Manager skill's use of the field | Out of scope (autobyteus-agents-84) | — | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (E-006 assertions)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: —
