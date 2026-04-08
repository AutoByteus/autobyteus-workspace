# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `4`
- Trigger Stage: `6`
- Prior Round Reviewed: `3`
- Latest Authoritative Round: `4`

## Testing Scope

- Ticket: `run-bash-tool-benchmarks`
- Scope classification: `Medium`
- Workflow state source: `tickets/done/run-bash-tool-benchmarks/workflow-state.md`
- Requirements source: `tickets/done/run-bash-tool-benchmarks/requirements.md`
- Call stack source: `tickets/done/run-bash-tool-benchmarks/future-state-runtime-call-stack.md`
- Design source: `tickets/done/run-bash-tool-benchmarks/proposed-design.md`
- Interface/system shape in scope: `CLI` / `Other`
- Platform/runtime targets: local LM Studio + Vitest integration harnesses
- Lifecycle boundaries in scope: `None`

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - `tests/integration/agent/run-bash-benchmark-flow.test.ts`
  - `tests/integration/agent/edit-file-benchmark-flow.test.ts`
  - `tests/integration/agent/edit-file-diagnostics.test.ts`
  - unit/integration tests for `replace_in_file` and `insert_in_file`
- Temporary validation methods or setup to use only if needed:
  - `/tmp/edit-file-diagnostics.log` filtered summary output for the focused diagnostics pass
- Cleanup expectation for temporary validation:
  - log file can be discarded after ticket close; it is not part of the repo truth

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Gate Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No blocking failures | Pass | Yes | Aggregate edit reliability improved materially over the single-tool baseline |
| 2 | Post-handoff flow compatibility sweep | N/A | Yes | Fail | Yes | `agent-single-flow`, `agent-single-flow-xml`, and `agent-team-single-flow` all exposed path-contract mismatches after the temporary absolute-only file-tool change |
| 3 | Stage 6 local-fix rerun | Yes | No | Pass | No | the repaired flow prompts/assertions aligned with the temporary explicit-path contract and the broader flow coverage returned green |
| 4 | Final local-fix rerun | Yes | No | Pass | Yes | file tools were restored to accept absolute or workspace-root-relative paths, the focused file-tool suite reran green, and the affected LM Studio flows remained green |

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001, R-002, R-003 | `run_bash` benchmark proves stable nested-directory execution | AV-001 | Passed | 2026-04-08 |
| AC-002 | R-004, R-005, R-007 | edit-family fallback benchmark reaches acceptable final-result success | AV-002 | Passed | 2026-04-08 |
| AC-003 | R-002, R-008 | tool results/failures provide actionable recovery information | AV-001, AV-003 | Passed | 2026-04-08 |
| AC-004 | R-006 | file tool paths remain explicit and low-ambiguity | AV-004 | Passed | 2026-04-08 |
| AC-005 | R-008 | diagnostics identify remaining miss patterns by category/content | AV-003 | Passed | 2026-04-08 |

## Spine Coverage Matrix

| Spine ID | Spine Scope | Governing Owner | Scenario ID(s) | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | terminal tools | AV-001, AV-004 | Passed | benchmark + approval flow cover foreground/background and `effectiveCwd` |
| DS-002 | Primary End-to-End | file tools | AV-002, AV-004 | Passed | full edit suite and focused file-tool tests cover final-result success |
| DS-003 | Primary End-to-End | benchmark harnesses | AV-002, AV-003 | Passed | scenario and diagnostics harnesses both exercised |
| DS-004 | Bounded Local | file tools | AV-002, AV-003 | Passed | fallback/recovery behavior is visible in edit benchmarks and diagnostics |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode | Platform / Runtime | Lifecycle Boundary | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | DS-001 | Requirement | AC-001, AC-003 | R-001, R-002, R-003 | UC-001 | CLI | LM Studio + Vitest | None | verify cwd certainty and result echoing | `run_bash` scenario benchmark reaches the improved rate and reports `effectiveCwd` | `tests/integration/agent/run-bash-benchmark-flow.test.ts` | none | prior branch benchmark run | Passed |
| AV-002 | DS-002, DS-003, DS-004 | Requirement | AC-002 | R-004, R-005, R-007 | UC-002, UC-003 | Integration | LM Studio + Vitest | None | verify final-result edit success with fallback tools | `21/24` scenarios pass with final-result scoring | `tests/integration/agent/edit-file-benchmark-flow.test.ts` | none | prior branch benchmark run | Passed |
| AV-003 | DS-003, DS-004 | Requirement | AC-003, AC-005 | R-008 | UC-003 | Integration | LM Studio + Vitest | None | diagnose remaining failures and classify them | focused diagnostics identify residual categories and content-type weakness | `tests/integration/agent/edit-file-diagnostics.test.ts` | `/tmp/edit-file-diagnostics.log` | `CI=1 AUTOBYTEUS_EDIT_FILE_DIAGNOSTICS=1 ... edit-file-diagnostics.test.ts` | Passed |
| AV-004 | DS-001, DS-002 | Requirement | AC-004 | R-006 | UC-001, UC-002, UC-003 | Integration | Vitest | None | confirm file-tool and API adapter behavior in the current branch | focused tool/API suite passes | focused unit/integration tests + approval flow tests | none | `pnpm exec vitest --run ...` focused suite | Passed |
| AV-005 | DS-002 | Regression | AC-004 | R-006 | UC-003 | Integration | LM Studio + Vitest | None | verify single-agent flow still writes inside the provided workspace after the final explicit path-rule change | `agent-single-flow.test.ts` passes and the runtime supports absolute or workspace-root-relative file paths | `tests/integration/agent/agent-single-flow.test.ts` | none | `pnpm exec vitest --run tests/integration/agent/agent-single-flow.test.ts` | Passed |
| AV-006 | DS-002 | Regression | AC-004 | R-006 | UC-003 | Integration | LM Studio + Vitest | None | verify XML single-agent flow still works end to end after the file-path contract change | `agent-single-flow-xml.test.ts` passes with the updated XML prompt and assertion | `tests/integration/agent/agent-single-flow-xml.test.ts` | none | `pnpm exec vitest --run tests/integration/agent/agent-single-flow-xml.test.ts` | Passed |
| AV-007 | DS-002 | Regression | AC-004 | R-006 | UC-003 | Integration | LM Studio + Vitest | None | verify team single-flow still writes inside the worker workspace after the file-path contract change | `agent-team-single-flow.test.ts` passes using an absolute worker-workspace path in the tool call | `tests/integration/agent-team/agent-team-single-flow.test.ts` | none | `pnpm exec vitest --run tests/integration/agent-team/agent-team-single-flow.test.ts` | Passed |
| AV-008 | DS-002 | Regression | AC-004 | R-006 | UC-003 | Integration | Vitest | None | confirm XML formatter/parser coverage is still healthy despite the end-to-end XML failure | XML formatter tests and the full streaming parser flow still pass | `tests/integration/tools/usage/formatters/*xml*`, `tests/integration/agent/streaming/full-streaming-flow.test.ts` | none | targeted Vitest run | Passed |
| AV-009 | DS-002 | Regression | AC-004 | R-006 | UC-003 | Integration | LM Studio + Vitest | None | verify broader flow coverage also respects the final explicit file-path contract | `full-tool-roundtrip-flow`, `agent-team-subteam-streaming-flow`, and `agent-single-flow-ollama` all pass after the same test-alignment fix | `tests/integration/agent/full-tool-roundtrip-flow.test.ts`, `tests/integration/agent-team/streaming/agent-team-subteam-streaming-flow.test.ts`, `tests/integration/agent/agent-single-flow-ollama.test.ts` | none | targeted sequential Vitest runs | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type | Durable In Repo | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `tests/integration/agent/run-bash-benchmark-flow.test.ts` | Harness | Yes | AV-001 | already present in the branch before this workflow pass |
| `tests/integration/agent/edit-file-benchmark-flow.test.ts` | Harness | Yes | AV-002 | final-result scoring with multi-tool fallback |
| `tests/integration/agent/edit-file-diagnostics.test.ts` | Harness | Yes | AV-003 | focused 10-scenario diagnostics output |
| `tests/unit/tools/file/replace-in-file.test.ts` and `tests/integration/tools/file/replace-in-file.test.ts` | Tool tests | Yes | AV-004 | validate exact replacement semantics |
| `tests/unit/tools/file/insert-in-file.test.ts` and `tests/integration/tools/file/insert-in-file.test.ts` | Tool tests | Yes | AV-004 | validate anchored insertion semantics |
| `tests/integration/agent/agent-single-flow.test.ts` | Regression flow | Yes | AV-005 | updated during the local-fix loops and still green after restoring workspace-root-relative file support |
| `tests/integration/agent/agent-single-flow-xml.test.ts` | Regression flow | Yes | AV-006 | updated during the local-fix loops and still green after restoring workspace-root-relative file support |
| `tests/integration/agent-team/agent-team-single-flow.test.ts` | Regression flow | Yes | AV-007 | updated to provide and assert the absolute worker-workspace path directly |
| `tests/integration/tools/usage/formatters/edit-file-xml-formatter.test.ts`, `tests/integration/tools/usage/formatters/write-file-xml-formatter.test.ts`, `tests/integration/tools/usage/formatters/run-bash-xml-formatter.test.ts`, and `tests/integration/agent/streaming/full-streaming-flow.test.ts` | Regression coverage | Yes | AV-008 | parser/formatter layer remains green |
| `tests/integration/agent/full-tool-roundtrip-flow.test.ts`, `tests/integration/agent-team/streaming/agent-team-subteam-streaming-flow.test.ts`, and `tests/integration/agent/agent-single-flow-ollama.test.ts` | Regression flow | Yes | AV-009 | aligned with the explicit file-path contract and kept green after the final path-rule relaxation |

## Feasibility And Risk Record

- Any infeasible scenarios: `No`
- Environment constraints: local LM Studio evaluation is slow, so scenario runs are intentionally sequential and long-running
- Compensating automated evidence: focused Vitest regression suite plus scenario benchmarks and focused diagnostics
- Residual risk notes:
  - markdown insertion still shows formatting sensitivity
  - TypeScript multi-change edits can still produce a wrong final file even after a nominally successful tool call
- Temporary validation-only scaffolding cleaned up: `Yes`

## Stage 7 Gate Decision

- Latest authoritative round: `4`
- Latest authoritative result: `Pass`
- Stage 7 complete: `Yes`
- Durable executable validation that should live in the repository was implemented or updated: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All relevant spines mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- All executable relevant spines status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Temporary validation-only scaffolding cleaned up or intentionally retained with rationale: `Yes`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
