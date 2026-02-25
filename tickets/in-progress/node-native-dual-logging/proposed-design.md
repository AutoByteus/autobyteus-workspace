# Proposed Design Document

## Design Version
- Current Version: `v2`

## Revision History
| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Define centralized runtime dual-sink logger for Fastify + `console.*` capture. | 1 |
| v2 | Review round 1 write-back | Remove stdout-only fallback behavior and enforce fail-fast startup on logger bootstrap failure. | 1 |

## Artifact Basis
- Investigation Notes: `tickets/in-progress/node-native-dual-logging/investigation-notes.md`
- Requirements: `tickets/in-progress/node-native-dual-logging/requirements.md`
- Requirements Status: `Design-ready`

## Summary
Introduce one backend runtime logging bootstrap that fan-outs logs to stdout/stderr and `server.log`, and wire both Fastify logger stream and global `console.*` through it. Log directory becomes configurable via `AUTOBYTEUS_LOG_DIR`.

## Goals
- Remove dependence on shell `tee` for backend server log persistence.
- Centralize log sink policy in backend source code.
- Preserve console observability while adding persistent file logs.

## Legacy Removal Policy (Mandatory)
- Policy: `No backward compatibility; remove legacy code paths.`
- Action in scope: remove server-side shell-tee as primary persistence mechanism in Docker startup scripts.

## Requirements And Use Cases
| Requirement | Description | Acceptance Criteria | Use Case IDs |
| --- | --- | --- | --- |
| R-001 | Runtime dual sink policy | AC-001 | UC-001 |
| R-002 | Fastify dual sink policy | AC-002 | UC-002 |
| R-003 | Console capture | AC-003 | UC-003 |
| R-004 | Configurable log directory | AC-004 | UC-004 |
| R-005 | No legacy parallel branch | AC-005 | UC-001, UC-002, UC-003 |
| R-006 | Verification quality | AC-006 | UC-001..UC-005 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)
| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Startup orchestrated in `startServer()` before `buildApp()` | `src/app.ts` | Whether tests invoke `startServer()` directly (low risk). |
| Current Naming Conventions | Logging code in `src/logging`, config parsing in `src/config` | `src/config/logging-config.ts`, `src/logging/http-access-log-policy.ts` | None |
| Impacted Modules / Responsibilities | Fastify logger configured in `app.ts`; app config owns logs directory path | `src/app.ts`, `src/config/app-config.ts` | None |
| Data / Persistence / External IO | Existing file logs rely on Docker shell `tee` | `docker/allinone-start-server.sh`, `docker/remote-server-entrypoint.sh` | None |

## Current State (As-Is)
- Fastify logger writes to stdout only.
- Most module logs use `console.*` directly and are not centrally routed.
- `AppConfig.configureLogger()` does not configure log sink behavior.

## Target State (To-Be)
- One `runtime logger bootstrap` module configures:
  - fan-out writable stream for stdout + file,
  - Fastify logger stream using same fan-out,
  - global console bound to fan-out streams.
- `AUTOBYTEUS_LOG_DIR` recognized by `AppConfig.getLogsDir()`.
- Logger bootstrap is fail-fast when required sink initialization fails (no compatibility fallback branch).
- Docker server startup scripts stop using `tee` for Node server processes.

## Architecture Direction Decision (Mandatory)
- Chosen direction: `Add` central runtime logging bootstrap + `Modify` startup/config boundaries.
- Rationale:
  - complexity: bounded to logging boundary,
  - testability: deterministic sink module is unit-testable,
  - operability: consistent sink policy across environments,
  - evolution cost: avoids per-module logging rewrites now.
- Layering fitness assessment: `Yes`.
- Outcome: `Add` + `Modify` + `Remove` (docker tee for server processes).

## Change Inventory (Delta)
| Change ID | Change Type | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `autobyteus-server-ts/src/logging/runtime-logger-bootstrap.ts` | Centralize dual-sink stream and console binding | Backend runtime logging | New module |
| C-002 | Modify | `autobyteus-server-ts/src/config/logging-config.ts` | same | Add file sink env config fields | Config parsing | No legacy dual-branch |
| C-003 | Modify | `autobyteus-server-ts/src/config/app-config.ts` | same | Honor `AUTOBYTEUS_LOG_DIR` in logs-dir resolution | Runtime path semantics | Enables remote persistent logs |
| C-004 | Modify | `autobyteus-server-ts/src/app.ts` | same | Initialize runtime logger bootstrap before `buildApp` | Startup flow | Fastify + console sink wiring |
| C-005 | Modify | `autobyteus-server-ts/tests/unit/config/logging-config.test.ts` | same | Verify new config defaults/parsing | Unit tests | Required for R-006 |
| C-006 | Modify | `docker/allinone-start-server.sh` | same | Remove shell tee for server process | Docker runtime | Node-native logging policy |
| C-007 | Modify | `docker/remote-server-entrypoint.sh` | same | Remove shell tee for remote server process | Docker runtime | Node-native logging policy |
| C-008 | Modify | `docker/README.md`, `README.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md` | same | Update operational docs | Documentation | Stage 7 docs sync |

## Target Architecture Shape And Boundaries (Mandatory)
| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| `config` | Parse env and filesystem paths | logging env fields + logs dir resolution | stream fan-out implementation | Keep pure parsing/path logic |
| `logging bootstrap` | Runtime sink assembly | file stream, fan-out stream, console bind, fastify stream options | business logic | Single runtime integration boundary |
| `app startup` | Orchestration | initialize config, initialize logging bootstrap, build app | low-level stream internals | Calls bootstrap once |

## File And Module Breakdown
| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `src/logging/runtime-logger-bootstrap.ts` | Add | logging bootstrap | fan-out streams + console binding + fastify logger option | `initializeRuntimeLoggerBootstrap(...)`, `getFastifyLoggerOptions(...)` | input: config/log dir, output: stream options/metadata | `node:fs`, `node:path`, `node:stream`, `node:console` |
| `src/config/logging-config.ts` | Modify | config | parse env to runtime logging config | `getLoggingConfigFromEnv` | env -> typed config | none |
| `src/config/app-config.ts` | Modify | config | log dir resolution | `getLogsDir` | env/path -> absolute dir | `node:fs`, `node:path` |
| `src/app.ts` | Modify | startup | orchestrate logging bootstrap + fastify logger integration | `startServer`, `buildApp` | startup options -> running app | config + bootstrap modules |

## Layer-Appropriate Separation Of Concerns Check
- Non-UI scope maintained at file/module/service boundary.
- No business-domain modules are modified for logging behavior.

## Naming Decisions (Natural And Implementation-Friendly)
| Item Type | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | N/A | `runtime-logger-bootstrap.ts` | Describes runtime sink bootstrapping role clearly | New module |
| API | N/A | `initializeRuntimeLoggerBootstrap` | Explicit one-time startup action | Avoid generic names |
| API | N/A | `getFastifyLoggerOptions` | Makes consumer contract explicit | Returns logger options only |

## Naming Drift Check (Mandatory)
| Item | Current Responsibility | Does Name Still Match? | Corrective Action | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `AppConfig.configureLogger` | only prints and ensures dir | No | `Remove` method + shift responsibility to bootstrap module | C-003, C-001 |

## Existing-Structure Bias Check (Mandatory)
| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Keep logger behavior in docker scripts | High | Move sink policy into backend runtime module | Change | Runtime behavior belongs to backend process, not shell wrapper. |

## Anti-Hack Check (Mandatory)
| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Continue shell `tee` as core mechanism | High | Node-native sink fan-out + Fastify stream wiring | Reject shortcut | Keep docker logs as secondary observability channel |

## Dependency Flow And Cross-Reference Risk
| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `runtime-logger-bootstrap.ts` | `logging-config`, app startup inputs | `app.ts` only | Low | Keep module standalone and stateless except internal runtime singleton |
| `app.ts` | config + bootstrap | full runtime | Low | one-way startup orchestration |

## Allowed Dependency Direction (Mandatory)
- Allowed direction: `config -> logging bootstrap -> app startup -> feature modules`.
- No temporary boundary violations planned.

## Decommission / Cleanup Plan
| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Docker server `tee` setup lines | remove redirection logic from server scripts | no parallel old/new server logging mechanism | startup smoke + file presence checks |
| `AppConfig.configureLogger` placeholder behavior | remove dead method and callsite | avoid misleading pseudo-config path | typecheck + startup smoke |

## Error Handling And Edge Cases
- Log file path creation failure: throw startup error with explicit path context.
- File stream write failure: surface error via stderr and fail startup (preferred for deterministic ops).
- Missing `AUTOBYTEUS_LOG_DIR`: fallback to app data logs dir.

## Use-Case Coverage Matrix (Design Gate)
| use_case_id | Requirement | Use Case | Primary Path Covered | Fallback Path Covered | Error Path Covered | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | R-001 | startup dual sink activation | Yes | N/A | Yes | UC-001 |
| UC-002 | R-002 | fastify dual sink | Yes | N/A | Yes | UC-002 |
| UC-003 | R-003 | console capture | Yes | N/A | Yes | UC-003 |
| UC-004 | R-004 | configurable log dir | Yes | Yes | Yes | UC-004 |
| UC-005 | R-006 | bootstrap safety/risk | Yes | Yes | Yes | UC-005 |

## Performance / Security Considerations
- Single append stream per process minimizes file descriptor churn.
- No sensitive token redaction changes in this ticket; behavior unchanged from current logging content.

## Change Traceability To Implementation Plan
| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E/System) | Status |
| --- | --- | --- | --- |
| C-001..C-008 | T-001..T-008 | Unit + startup smoke + docker runtime check | Planned |

## Open Questions
- Should future work split JSON and plain-text logs into separate files (`server-json.log`, `server-human.log`)?
