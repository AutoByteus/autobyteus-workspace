# Implementation Plan

## Scope Classification
- Classification: `Medium`
- Reasoning: logging changes cross startup/config/runtime boundaries and require architecture-level sink policy.

## Upstream Artifacts (Required)
- Investigation notes: `tickets/in-progress/node-native-dual-logging/investigation-notes.md`
- Requirements: `tickets/in-progress/node-native-dual-logging/requirements.md` (`Design-ready`)
- Runtime call stacks: `tickets/in-progress/node-native-dual-logging/future-state-runtime-call-stack.md` (`v2`)
- Runtime review: `tickets/in-progress/node-native-dual-logging/future-state-runtime-call-stack-review.md` (`Go Confirmed`)
- Proposed design: `tickets/in-progress/node-native-dual-logging/proposed-design.md` (`v2`)

## Plan Maturity
- Current Status: `Ready For Implementation`

## Preconditions
- `requirements.md` is `Design-ready`: Yes
- Runtime call stack review artifact exists and is current: Yes
- All in-scope use cases reviewed: Yes
- No unresolved blocking findings: Yes
- Runtime review has `Go Confirmed`: Yes

## Runtime Call Stack Review Gate Summary
| Round | Review Result | Findings Requiring Write-Back | Write-Back Completed | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- |
| 1 | Fail | Yes | Yes | Reset | 0 |
| 2 | Pass | No | N/A | Candidate Go | 1 |
| 3 | Pass | No | N/A | Go Confirmed | 2 |

## Go / No-Go Decision
- Decision: `Go`
- Evidence:
  - Final review round: 3
  - Clean streak at final round: 2
  - Final review gate line: `Implementation can start: Yes`

## Principles
- Bottom-up implementation order.
- No legacy compatibility branches.
- Centralized runtime logging ownership in backend source.

## Dependency And Sequencing Map
| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `autobyteus-server-ts/src/config/logging-config.ts` | N/A | Define config contract first |
| 2 | `autobyteus-server-ts/src/config/app-config.ts` | C-001 config fields | Resolve log directory policy |
| 3 | `autobyteus-server-ts/src/logging/runtime-logger-bootstrap.ts` | C-001, C-002 | Build sink implementation |
| 4 | `autobyteus-server-ts/src/app.ts` | C-003 | Wire startup + Fastify logger |
| 5 | `autobyteus-server-ts/tests/unit/config/logging-config.test.ts` | C-001 | Verify config parsing defaults |
| 6 | `docker/allinone-start-server.sh`, `docker/remote-server-entrypoint.sh` | C-004 | Remove server tee in Docker |
| 7 | `docker/README.md`, `README.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md` | all above | Docs sync |

## Requirement And Design Traceability
| Requirement | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 5 Verification | Stage 6 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- |
| R-001 | Target State, C-001/C-004 | UC-001 | T-001,T-004 | Unit + startup smoke | SV-001 |
| R-002 | C-001/C-004 | UC-002 | T-003,T-004 | Startup smoke + request log check | SV-002 |
| R-003 | C-001 | UC-003 | T-003 | startup log evidence | SV-003 |
| R-004 | C-003 | UC-004 | T-002 | targeted unit/runtime check | SV-004 |
| R-005 | Decommission/C-006,C-007 | UC-001..003 | T-006 | diff + runtime validation | SV-001 |
| R-006 | C-005,C-008 | UC-005 | T-005,T-007 | unit tests + docs sync | SV-005 |

## Design Delta Traceability
| Change ID | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Add | T-003 | No | Unit + startup smoke |
| C-002 | Modify | T-001 | No | Unit tests |
| C-003 | Modify | T-002 | No | runtime path check |
| C-004 | Modify | T-004 | No | startup smoke |
| C-005 | Modify | T-005 | No | unit tests |
| C-006 | Modify | T-006 | Yes | docker startup smoke |
| C-007 | Modify | T-006 | Yes | docker startup smoke |
| C-008 | Modify | T-007 | No | docs review |

## Step-By-Step Plan
1. T-001: Extend logging config parsing for file sink settings.
2. T-002: Update `AppConfig.getLogsDir()` to honor `AUTOBYTEUS_LOG_DIR`.
3. T-003: Add runtime logger bootstrap with fan-out streams + console binding.
4. T-004: Wire runtime logger bootstrap into server startup and Fastify logger options.
5. T-005: Update logging config tests.
6. T-006: Remove server shell tee from Docker startup scripts.
7. T-007: Run targeted backend + runtime validations and sync docs.

## Per-File Definition Of Done
| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `src/config/logging-config.ts` | new fields parsed | logging-config tests pass | N/A | include defaults |
| `src/config/app-config.ts` | log dir override supported | app-config smoke behavior stable | N/A | no legacy path |
| `src/logging/runtime-logger-bootstrap.ts` | fan-out and console bind working | targeted bootstrap test (if added) or runtime smoke evidence | startup scenario | fail-fast semantics |
| `src/app.ts` | logger wired before app startup | compile/typecheck pass | startup scenario | no behavior regressions |

## Test Strategy
- Unit tests:
  - `autobyteus-server-ts/tests/unit/config/logging-config.test.ts`
- Integration/runtime validation:
  - start stack via `./scripts/enterprise-docker.sh up --project <name> --no-build`
  - verify log file existence and contents in main + remote containers

## Aggregated System Validation Scenario Catalog (Stage 6 Input)
| Scenario ID | Source Type | Requirement ID(s) | Use Case ID(s) | Validation Level | Expected Outcome |
| --- | --- | --- | --- | --- | --- |
| SV-001 | Requirement | R-001,R-005 | UC-001 | System | startup emits to stdout and file, no tee dependency |
| SV-002 | Requirement | R-002 | UC-002 | API/System | request/access logs observed in file + console |
| SV-003 | Requirement | R-003 | UC-003 | System | console-driven startup log appears in file |
| SV-004 | Requirement | R-004 | UC-004 | System | `AUTOBYTEUS_LOG_DIR` override path used |
| SV-005 | Design-Risk | R-006 | UC-005 | System | startup remains stable with bootstrap enabled |
