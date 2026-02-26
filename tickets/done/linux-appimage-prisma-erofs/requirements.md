# Requirements

- Status: `Refined`
- Ticket: `linux-appimage-prisma-erofs`
- Scope Triage: `Small`
- Triage Rationale: Runtime hardening + packaging script update in focused startup/build path.

## Goal / Problem Statement

Fix Linux CI-built AppImage startup crash where Prisma migration fails with read-only filesystem (`EROFS`) while attempting engine copy into mounted app resources.

## In-Scope Use Cases

- `UC-001`: Linux packaged startup when bundled Prisma engines are present and compatible.
- `UC-002`: Linux packaged startup when bundled engines are missing or incompatible but local Prisma cache has compatible engines.
- `UC-003`: Migration error path when no valid engine path can be resolved.
- `UC-004`: CI Linux packaging step bundles both OpenSSL engine targets needed across user systems.

## Requirements

- `REQ-001`: Startup migration command must use explicit Prisma engine paths to prevent writes into mounted AppImage resources.
- `REQ-002`: Engine path resolution must prefer bundled engine files and fallback to local Prisma cache when bundled files are unavailable.
- `REQ-003`: Existing successful startup behavior (local build and packaged build with bundled engines) must continue unchanged.
- `REQ-004`: Failure path must report actionable logs when engine overrides cannot be resolved.
- `REQ-005`: CI packaging must bundle both `debian-openssl-1.1.x` and `debian-openssl-3.0.x` Prisma engines in packaged server resources.

## Acceptance Criteria

- `AC-001`: In read-only packaged runtime with compatible engine target available, migration startup succeeds.
- `AC-002`: Startup behavior shows no Prisma engine copy attempt into `/tmp/.mount_*` package path for normal CI artifact run.
- `AC-003`: In packaged runtime with bundled engines present, migration still succeeds.
- `AC-004`: If neither bundled nor cache engines are available, startup surfaces explicit resolution failure context in logs/error.
- `AC-005`: Extracted CI Linux AppImage contains both `debian-openssl-1.1.x` and `debian-openssl-3.0.x` engine files under packaged `@prisma/engines`.

## Constraints / Dependencies

- Prisma CLI version `5.22.0` behavior around engine resolution.
- Runtime packaged path under AppImage is read-only.
- Startup sequence remains: config init -> migration -> server ready.

## Assumptions

- Prisma cache layout remains under `~/.cache/prisma/master/*/<platform-target>/` with `libquery-engine` and `schema-engine` names.
- Migration deploy requires query engine library and schema engine binary resolution.

## Open Questions / Risks

- None blocking after direct CI artifact verification.

## Requirement Coverage Map (Requirement -> Use Case)

- `REQ-001` -> `UC-001`, `UC-002`
- `REQ-002` -> `UC-002`, `UC-003`
- `REQ-003` -> `UC-001`
- `REQ-004` -> `UC-003`
- `REQ-005` -> `UC-004`

## Acceptance Criteria Coverage Map (AC -> Stage 6 Scenario)

- `AC-001` -> `SCN-001`
- `AC-002` -> `SCN-001`, `SCN-002`
- `AC-003` -> `SCN-002`
- `AC-004` -> `SCN-003`
- `AC-005` -> `SCN-004`
