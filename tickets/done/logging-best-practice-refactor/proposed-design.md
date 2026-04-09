# Proposed Design Document

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Introduce centralized per-runtime application logger APIs with named loggers, shared level semantics, scoped overrides, and migrated noisy paths | 1 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/logging-best-practice-refactor/investigation-notes.md`
- Requirements: `tickets/in-progress/logging-best-practice-refactor/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `shared/design-principles.md`
- Common Design Practices: `shared/common-design-practices.md`

## Summary

Keep Fastify/Pino as the HTTP/request logger path, but stop using file-local `console.*` shims as the application logging architecture. Introduce a centralized application logger API per runtime:

- server: `autobyteus-server-ts/src/logging/*`
- Electron main process: `autobyteus-web/electron/logger.ts`

Both runtimes will honor the same configuration contract:

- global level: `LOG_LEVEL`
- optional scoped overrides: `AUTOBYTEUS_LOG_LEVEL_OVERRIDES`

Both runtimes will support named/module loggers and child logger derivation. The server runtime bootstrap remains a sink/transport concern and a legacy-console compatibility boundary; it no longer acts as the primary application logger API. The initial migration set covers the logging foundations and the highest-signal noisy paths that surfaced this ticket.

## Goal / Intended Change

- Establish one authoritative log-level policy per runtime with default `INFO` and explicit `DEBUG` enablement.
- Provide named application loggers so modules stop embedding ad hoc string prefixes or building local console shims.
- Preserve Fastify request logging while bringing application logging under the same policy semantics.
- Fix the `Cache HIT for agent team definition ID` noise path and the Electron server-stdout misclassification path.
- Leave a clean migration path for the remaining legacy modules without adding another ad hoc wrapper layer.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action:
  - Remove local logger shims from all touched modules.
  - Remove the info-level reclassification of child server stdout in the touched Electron bridge.
  - Do not introduce new dual-path logging APIs in touched files.
- Scope note:
  - Untouched legacy `console.*` call sites remain on the existing runtime console sink until later migration, but this ticket does not add new compatibility wrappers for them. The authoritative API for touched application code becomes the centralized logger factory.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | One authoritative log-level policy per runtime | AC-001, AC-002 | Default `INFO` hides debug; explicit `DEBUG` enables it | UC-001, UC-002, UC-003 |
| R-002 | Server application logging uses centralized named loggers in touched scope | AC-003, AC-004 | Touched server modules consume one shared logging API | UC-001, UC-002, UC-005 |
| R-003 | Electron main-process logging uses the same threshold semantics and named loggers | AC-005 | Touched Electron modules use child/named loggers | UC-003, UC-005 |
| R-004 | Noisy paths are fixed without severity drift | AC-006, AC-007 | Cache-hit debug is hidden at `INFO`; forwarded stdout is not promoted to info | UC-001, UC-004 |
| R-005 | Migration remains incremental and safe | AC-008 | Central logger foundation exists with documented migration boundary | UC-005 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Server has one config path for Fastify/Pino and separate ad hoc application logging paths | `autobyteus-server-ts/src/server-runtime.ts`, `autobyteus-server-ts/src/logging/runtime-logger-bootstrap.ts`, `autobyteus-web/electron/logger.ts` | Whether the server application logger should directly wrap Pino |
| Current Ownership Boundaries | Ownership is fragmented across runtime bootstrap, file-local shims, and Electron singleton logging | `autobyteus-server-ts/src/logging/*`, `autobyteus-web/electron/logger.ts`, `autobyteus-web/electron/server/baseServerManager.ts` | None blocking |
| Current Coupling / Fragmentation Problems | `138` server logger shims and `341` server console calls show no shared application logger boundary | investigation command log in `investigation-notes.md` | Full repo migration is deferred |
| Existing Constraints / Compatibility Facts | `.env` already defaults to `LOG_LEVEL=INFO`; Fastify/Pino must keep working | `AppDataService.buildDefaultEnvFileContents`, `server-runtime.ts` | Whether scoped overrides should use exact or prefix matching |
| Relevant Files / Components | Logging config, runtime bootstrap, server startup, cached team-definition provider, Electron logger, Electron server manager | same files above | None blocking |

## Current State (As-Is)

Application logging is not owned by one subsystem boundary. Fastify/Pino owns request logging, but most application code either uses file-local `console.*` shims or raw console calls. Electron main-process logging is centralized only as a file sink, not as a best-practice logger factory. Child server stdout is forwarded into Electron as info-level app logs even when the originating line is debug.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Server module log call | Server log sinks (`stdout`, `server.log`) | Server logging subsystem | Primary server application logging path for touched modules |
| DS-002 | Primary End-to-End | Electron module log call | Electron log sinks (`console`, `app.log`) | Electron logging subsystem | Primary Electron application logging path for touched modules |
| DS-003 | Return-Event | Embedded server child stdout event | Electron log sinks (`console`, `app.log`) | Electron server manager + Electron logging subsystem | Preserves severity semantics when bridging embedded server output |
| DS-004 | Bounded Local | Logger name lookup | Effective level decision | Runtime logger config owner | Override/prefix resolution materially shapes whether logs emit |

## Primary Execution / Data-Flow Spine(s)

- `Touched Server Module -> Server App Logger -> Effective Level Resolver -> Record Formatter -> Runtime Console/File Sink`
- `Touched Electron Module -> Electron App Logger -> Effective Level Resolver -> Record Formatter -> Electron Console/File Sink`
- `Embedded Server stdout Event -> BaseServerManager -> Electron Scoped Logger -> Effective Level Resolver -> Electron Console/File Sink`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| Touched module | Logging caller | Emits application event with module scope |
| App logger | Authoritative logging boundary | Owns child logger creation, message emission, and scope naming |
| Effective level resolver | Policy node | Applies global level plus scoped override lookup |
| Record formatter | Translation node | Produces stable readable output with scope metadata |
| Runtime sink | Output node | Writes to stdout/file without deciding business logging policy |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A touched server module logs through one authoritative server logger API, which resolves the effective level for its scope, formats the record, and hands it to the runtime sink. | module caller, server app logger, level resolver, formatter, sink | Server logging subsystem | Fastify request logging stays adjacent but off this spine |
| DS-002 | A touched Electron module logs through the Electron app logger, which applies the same level semantics and module scope handling before writing to Electron sinks. | module caller, Electron logger, level resolver, formatter, sink | Electron logging subsystem | server-data `.env` lookup |
| DS-003 | Embedded server stdout enters the Electron server manager, which classifies it under a scoped logger instead of re-labeling it as info, and the logger decides whether it should emit. | child stdout event, base server manager, Electron logger, level resolver, sink | Electron server manager + Electron logging subsystem | ready-state detection logic |
| DS-004 | Logger configuration resolves the most specific override match for a scope and returns the effective level without the caller needing local policy logic. | logger config, override resolver | Runtime logging configuration | env parsing |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/config/logging-config.ts` | Server log-level parsing and scoped override parsing | Record formatting or sink writes | Reused by Fastify and server app logger |
| `autobyteus-server-ts/src/logging/server-app-logger.ts` | Named server logger creation, child derivation, effective level resolution, record formatting | HTTP request logging internals, unrelated feature policy | New authoritative boundary for touched server application code |
| `autobyteus-server-ts/src/logging/runtime-logger-bootstrap.ts` | Sink wiring for stdout/stderr/server.log and legacy console threshold enforcement | Application logger naming or per-module ownership | Stays off the main line |
| `autobyteus-web/electron/logger.ts` | Named Electron logger creation, child derivation, effective level resolution, record formatting | Embedded server startup state, feature-specific policies | Remains the authoritative Electron logging API |
| `autobyteus-web/electron/server/baseServerManager.ts` | Child-process lifecycle and stdout/stderr classification | Formatting or level policy duplication | Uses scoped Electron logger instead of local severity rules |

## Return / Event Spine(s) (If Applicable)

- `ChildProcess stdout event -> BaseServerManager -> Electron Scoped Logger -> Effective Level Resolver -> app.log/console`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `server/electron application logger`
- Bounded local spine: `resolve logger name -> search exact override -> search nearest prefix override -> fall back to global level`
- Why it must be explicit:
  - This is the mechanism that enables targeted debug for one scope without globally enabling debug noise.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Fastify/Pino HTTP logging | Server app logger boundary | Request/access logging | Yes |
| Runtime console/file bootstrap | Server app logger boundary | Sink fanout and legacy-console compatibility threshold | Yes |
| server-data `.env` discovery | Electron logger boundary | Reads configured default log level when Electron env is not explicit | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Server application logger | `autobyteus-server-ts/src/logging/*` | Extend | The logging subsystem already owns config/bootstrap | N/A |
| Electron application logger | `autobyteus-web/electron/logger.ts` | Extend | Existing singleton already owns Electron sinks and call sites | N/A |
| Child stdout bridging | `autobyteus-web/electron/server/baseServerManager.ts` | Reuse | This file already owns process forwarding and readiness checks | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `server logging subsystem` | server config parsing, server app logger API, runtime sink bootstrap | DS-001, DS-004 | server runtime and touched server modules | Extend | Add centralized application logger under `src/logging/` |
| `electron main-process logging subsystem` | Electron logger API, env-backed level resolution, sink writes | DS-002, DS-004 | touched Electron modules | Extend | Keep file location, upgrade API |
| `electron embedded server manager` | server stdout/stderr classification and forwarding | DS-003 | Electron logging subsystem | Reuse | Stop severity promotion |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - touched server module -> `server-app-logger`
  - touched Electron module -> Electron logger
  - `server-runtime.ts` -> server logging config + server app logger + runtime bootstrap
  - `baseServerManager.ts` -> Electron logger
- Authoritative public entrypoints versus internal owned sub-layers:
  - Server application callers use `server-app-logger`; they do not build local `console.*` shims
  - Electron application callers use the Electron logger; they do not reimplement level filtering
- Authoritative Boundary Rule per domain subject:
  - Log-level policy is owned by the centralized logger/config boundary, not by callers
  - Sinks are owned by runtime bootstrap / Electron logger internals, not by callers
- Forbidden shortcuts:
  - Touched modules must not mix centralized logger usage with direct local `console.*` logger shims
  - `baseServerManager.ts` must not decide severity independently of the logger policy except for stdout vs stderr classification
- Boundary bypasses that are not allowed:
  - Caller -> runtime sink directly
  - Caller -> config parser and logger internals at the same time

## Architecture Direction Decision (Mandatory)

- Chosen direction:
  - Centralized per-runtime application logger factories with named loggers and scoped overrides; keep Fastify/Pino for HTTP logs
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - Lowest-risk way to reach best-practice semantics without a full repo rewrite
  - Keeps the logging subsystem as the owner instead of spreading policy into every file
  - Enables targeted debug for one scope via configuration
  - Leaves a clear future migration path for untouched modules
- Data-flow spine clarity assessment: `Yes`
- Spine span sufficiency assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add` + `Modify` + `Remove`
- Note:
  - The design intentionally does not collapse Fastify request logging and application logging into one new transport in this ticket. That would expand scope without improving the core ownership problem that triggered the issue.

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| Child/named logger pattern | Server and Electron app loggers | Gives targeted per-scope observability without ad hoc prefixes | logging subsystems | Names use dot-scoped hierarchy for overrides |
| Prefix override lookup | Effective level resolver | Allows one scope to run at debug while global default remains info | logger config | Most specific prefix wins |
| Runtime sink separation | `runtime-logger-bootstrap.ts` and Electron sink internals | Keeps output wiring off the main application logging line | off-spine sink concern | Preserves clean ownership |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | Yes | Level/severity handling is currently repeated or implied in many files | Extract clear owner |
| Responsibility overload exists in one file or one optional module grouping | Yes | `runtime-logger-bootstrap.ts` currently mixes sink setup with implicit policy effect | Split responsibilities |
| Proposed indirection owns real policy, translation, or boundary concern | Yes | Central app logger owns naming, level resolution, and formatting | Keep |
| Every off-spine concern has a clear owner on the spine | Yes | bootstrap/env lookup serve logger owners | Keep |
| Primary spine is stretched far enough to expose the real business path instead of only a local edited segment | Yes | DS-001/DS-002/DS-003 cover caller, authority, resolver, sink | Keep |
| Authoritative Boundary Rule is preserved | Yes | Callers use app logger boundary, not config/sink internals | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | Yes | server logging subsystem and Electron logger are both extended | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | Yes | New server app logger file plus upgraded Electron logger factory | Extract |
| Current structure can remain unchanged without spine/ownership degradation | No | Current file-local shims are the problem | Change |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `autobyteus-server-ts/src/logging/server-app-logger.ts` | Create the authoritative server application logger boundary | server logging | named loggers, child loggers, overrides, formatter |
| C-002 | Modify | `autobyteus-server-ts/src/config/logging-config.ts` | same | Extend config to support app-logger reuse and scoped overrides | server logging | one env contract |
| C-003 | Modify | `autobyteus-server-ts/src/logging/runtime-logger-bootstrap.ts` | same | Keep sink wiring, add threshold enforcement for legacy console path | server logging | off-spine sink concern |
| C-004 | Modify | `autobyteus-server-ts/src/server-runtime.ts` | same | Replace local shim with central logger and initialize logger config | server startup | authoritative startup logging |
| C-005 | Modify | `autobyteus-server-ts/src/agent-team-definition/providers/cached-agent-team-definition-provider.ts` | same | Migrate noisy cache-hit path to central logger | server runtime path | original user issue |
| C-006 | Modify | `autobyteus-web/electron/logger.ts` | same | Upgrade Electron logger into named logger factory with threshold enforcement | Electron main process | child logger support |
| C-007 | Modify | `autobyteus-web/electron/server/baseServerManager.ts` | same | Use scoped logger and stop promoting stdout to info | Electron embedded server manager | severity preservation |
| C-008 | Modify | `autobyteus-web/electron/server/services/AppDataService.ts` | same | Use scoped logger in touched support path | Electron startup | scoped ownership |
| C-009 | Add/Modify | `tests` under server and Electron packages | same/new | Validate threshold behavior and named logger semantics | validation | targeted unit coverage |

## Removal / Decommission Plan (Mandatory)

- Remove local `const logger = { ...console... }` shims from:
  - `autobyteus-server-ts/src/server-runtime.ts`
  - `autobyteus-server-ts/src/agent-team-definition/providers/cached-agent-team-definition-provider.ts`
- Remove info-level promotion of child server stdout in:
  - `autobyteus-web/electron/server/baseServerManager.ts`
- Remove flat/root-only usage in touched Electron modules by introducing child loggers:
  - `autobyteus-web/electron/server/baseServerManager.ts`
  - `autobyteus-web/electron/server/services/AppDataService.ts`

## File / Ownership Mapping

| File | Responsibility |
| --- | --- |
| `autobyteus-server-ts/src/logging/server-app-logger.ts` | server application logger factory, level resolution, formatting, child logger derivation |
| `autobyteus-server-ts/src/config/logging-config.ts` | env parsing for global level + scoped overrides |
| `autobyteus-server-ts/src/logging/runtime-logger-bootstrap.ts` | sink fanout and legacy-console threshold enforcement |
| `autobyteus-web/electron/logger.ts` | Electron application logger factory, env-backed level resolution, sink writes |
| `autobyteus-web/electron/server/baseServerManager.ts` | child-process output classification and scoped logging |

## Validation Plan

- Server unit tests:
  - threshold behavior for runtime bootstrap/legacy console path
  - effective level resolution for server app logger
- Electron tests:
  - threshold behavior for Electron logger helper logic
  - scoped logger naming/override resolution
- TypeScript validation:
  - Electron main-process `tsc --noEmit`
- Manual/log-path validation:
  - default `INFO` suppresses `Cache HIT` debug lines
  - `DEBUG` explicitly re-enables them

## Migration / Follow-Up Notes

- This ticket intentionally establishes the logging foundation and migrates the highest-signal touched modules first.
- Remaining legacy server files should migrate incrementally to `server-app-logger.ts` instead of adding more file-local console shims.
- Remaining Electron modules should migrate to child loggers from the upgraded central logger rather than embedding prefixes in message strings.
