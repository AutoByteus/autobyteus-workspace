# Requirements

## Status
- `Design-ready`
- Maturity notes:
  - Initial `Draft` captured from investigation evidence.
  - Refined to `Design-ready` after entrypoint and dependency boundary analysis.

## Goal / Problem Statement
Implement a Node-native backend logging architecture that writes logs to console and persistent files simultaneously, with a central runtime policy and without relying on shell-level `tee` as the primary logging mechanism.

## Scope Triage
- Classification: `Medium`
- Rationale:
  - Cross-cutting impact on startup/runtime bootstrap, config parsing, logger stream construction, and docs.
  - Requires architecture-level handling for both Fastify logger and extensive `console.*`-based module logs.

## In-Scope Use Cases
- `UC-001` (`Requirement`): Backend process startup emits operational logs to stdout/stderr and file sink.
- `UC-002` (`Requirement`): Fastify + HTTP access logs are emitted to both sinks.
- `UC-003` (`Requirement`): Existing module logs using `console.*` are captured by central runtime logging policy.
- `UC-004` (`Requirement`): Configurable log directory (`AUTOBYTEUS_LOG_DIR`) is respected in host and Docker runtime.
- `UC-005` (`Design-Risk`): Runtime logger initialization does not break startup path or app/test execution boundaries.

## Requirements
- `R-001` Dual sink runtime logging:
  - Expected outcome: one backend runtime policy duplicates log writes to console and file.
- `R-002` Fastify integration:
  - Expected outcome: Fastify logger output uses the same dual-sink policy.
- `R-003` Console capture:
  - Expected outcome: existing `console.info/warn/error/debug` logs are captured by dual-sink policy without per-module rewrites.
- `R-004` Log directory configurability:
  - Expected outcome: `AUTOBYTEUS_LOG_DIR` controls log directory when set; default remains app data logs dir.
- `R-005` Backward-incompatible cleanup rule:
  - Expected outcome: no compatibility wrapper that preserves old stdout-only behavior as a parallel legacy branch.
- `R-006` Verification:
  - Expected outcome: targeted tests and runtime validation prove sink duplication and config behavior.

## Acceptance Criteria
- `AC-001` (`R-001`): backend startup creates/appends `server.log` and still writes to container/host stdout.
- `AC-002` (`R-002`): a request lifecycle produces Fastify/access entries observable in both console output and `server.log`.
- `AC-003` (`R-003`): at least one known existing `console.*` startup log entry appears in `server.log`.
- `AC-004` (`R-004`): setting `AUTOBYTEUS_LOG_DIR` writes logs under that path (including Docker remote server configured path).
- `AC-005` (`R-005`): no new legacy fallback branch for stdout-only mode is introduced.
- `AC-006` (`R-006`): updated unit tests for logging config pass and runtime validation demonstrates file creation + writes.

## Constraints / Dependencies
- Must preserve current public runtime behavior (ports/API/startup flow).
- Must work under existing `autobyteus-server-ts` Node 20 runtime.
- Must avoid requiring shell wrappers as core logging mechanism.

## Assumptions
- Startup path can initialize runtime logging before substantial module logging side effects.
- Centralized logger bootstrap module can be used by `app.ts`.

## Open Questions / Risks
- Risk: global console rebinding may impact tests that monkey-patch console methods.
  - Mitigation: avoid running runtime bootstrap during most unit tests unless explicitly invoked.
- Risk: mixed line formats in a single log file (JSON + text).
  - Mitigation: document behavior and keep one operational log file for now.

## Requirement Coverage Map
| requirement_id | Covered Use Case IDs |
| --- | --- |
| R-001 | UC-001 |
| R-002 | UC-002 |
| R-003 | UC-003 |
| R-004 | UC-004 |
| R-005 | UC-001, UC-002, UC-003, UC-004 |
| R-006 | UC-001, UC-002, UC-003, UC-004, UC-005 |
