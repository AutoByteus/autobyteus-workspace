# Requirements

- Ticket: `logging-best-practice-refactor`
- Status: `Design-ready`
- Last Updated: `2026-04-09`

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - The change is architectural and cross-runtime, but the initial implementation scope can remain bounded to the logging foundations plus the highest-signal migrated call paths.

## User Intent

Refactor the TypeScript logging architecture so it follows best practice instead of ad hoc `console.*` usage and inconsistent level handling.

## Goal / Problem Statement

The current monorepo mixes Fastify/Pino logging, direct `console.*` wrappers, and a separate Electron logger implementation. As a result, the configured global level is applied inconsistently, named/module loggers are not standardized, and debug/noise control depends on local implementation details rather than one authoritative logging policy.

## In-Scope Use Cases

| Use Case ID | Name | Description | Primary Runtime |
| --- | --- | --- | --- |
| UC-001 | Server info-only default | Start the server with default `LOG_LEVEL=INFO` and run normal application flows without surfacing debug-only diagnostics | Server |
| UC-002 | Server scoped debug enablement | Enable debug logging explicitly and observe scoped server diagnostics from migrated modules | Server |
| UC-003 | Electron main-process logging | Run Electron main-process code with default `INFO` level and named/module loggers without writing debug noise | Electron |
| UC-004 | Embedded server stdout forwarding | Forward embedded server stdout through Electron without reclassifying server debug lines as normal info output | Electron + embedded server |
| UC-005 | Incremental migration boundary | Add a best-practice logging foundation that migrated modules can adopt immediately while untouched legacy modules remain compatible until later follow-up | Both |

## Requirements

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | The logging architecture must enforce one authoritative log-level policy per runtime. | AC-001, AC-002 | Default `INFO` hides debug; explicit `DEBUG` enables it | UC-001, UC-002, UC-003 |
| R-002 | Server application logging in the refactored scope must use a centralized logger API with stable module names instead of ad hoc `console.*` shims. | AC-003, AC-004 | Server migrated files use one logging module and emit named logs | UC-001, UC-002, UC-005 |
| R-003 | Electron main-process logging must provide the same threshold semantics and scoped/module logger support. | AC-005 | Electron logger factory/child loggers honor the configured threshold | UC-003, UC-005 |
| R-004 | The refactor must fix the noisy logging path that triggered the ticket without misclassifying severity. | AC-006, AC-007 | Cache-hit debug lines are hidden at `INFO`; forwarded stdout is no longer promoted to info | UC-001, UC-004 |
| R-005 | The refactor must be incremental and leave a clear migration path for remaining legacy logging call sites. | AC-008 | A documented migration boundary exists and the implementation does not require repo-wide same-turn conversion | UC-005 |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Expected Outcome | Scenario Intent |
| --- | --- | --- | --- |
| AC-001 | R-001 | With `LOG_LEVEL=INFO`, migrated server and Electron application loggers do not emit debug records to their normal sinks | Validate default production-like behavior |
| AC-002 | R-001 | With `LOG_LEVEL=DEBUG`, migrated server and Electron application loggers emit debug records without code changes | Validate explicit debug enablement |
| AC-003 | R-002 | Refactored server modules obtain loggers from a central logging module rather than declaring local `{ info: console.info, ... }` shims | Validate server architecture change |
| AC-004 | R-002 | Migrated server log records carry stable module/scope identity without hard-coded per-message string prefixes | Validate named logger behavior |
| AC-005 | R-003 | Electron main-process logging exposes scoped loggers and applies the same threshold semantics as the server-side migrated logger path | Validate Electron parity |
| AC-006 | R-004 | The team-definition cache-hit path logs at debug level only and is suppressed under default `INFO` operation | Validate the original noisy path is fixed architecturally |
| AC-007 | R-004 | Embedded server stdout forwarded through Electron is not written as app-level info for debug-only server output | Validate severity preservation across process boundary |
| AC-008 | R-005 | The implementation introduces a central logging foundation and records a migration path/rationale for untouched legacy modules | Validate incremental safety and future extensibility |

## Constraints / Dependencies

- Fastify/Pino request logging must keep working; the refactor should not break HTTP logging while fixing application logging.
- Server and Electron are separate processes, so they can share semantics and configuration while keeping separate runtime logger instances.
- Existing `.env` generation already defaults to `LOG_LEVEL=INFO`; the refactor should preserve that default and make it authoritative.
- A full repo-wide migration is out of scope for this ticket because the codebase currently contains hundreds of legacy logging call sites.

## Assumptions

- A centralized logging API per runtime is an acceptable best-practice target even if the full repository is migrated in phases.
- Keeping one compatibility boundary for untouched modules is preferable to a single risky whole-repo conversion.
- The immediate highest-signal migration set is the logging infrastructure plus the noisy paths that surfaced the bug.

## Open Questions / Risks

- Whether the server application logger should wrap Pino directly or remain a lighter shared facade over the existing sink/bootstrap path
- Whether any untouched legacy `console.*` paths will still leak noise through the compatibility layer if not covered by the new runtime threshold enforcement

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| R-001 | UC-001, UC-002, UC-003 |
| R-002 | UC-001, UC-002, UC-005 |
| R-003 | UC-003, UC-005 |
| R-004 | UC-001, UC-004 |
| R-005 | UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Planned Scenario ID |
| --- | --- |
| AC-001 | AV-001 |
| AC-002 | AV-002 |
| AC-003 | AV-003 |
| AC-004 | AV-004 |
| AC-005 | AV-005 |
| AC-006 | AV-006 |
| AC-007 | AV-007 |
| AC-008 | AV-008 |

## Non-Goals

- Do not attempt a repo-wide one-shot migration of every existing logging call in one turn.
- Do not change product behavior outside logging, diagnostics, and related observability paths.
- Do not perform Stage 10 archival or git finalization before explicit user verification.
