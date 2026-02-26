# Requirements

## Status

- Current Status: `Refined`
- Updated On: `2026-02-20`

## Goal / Problem Statement

Enable `autobyteus-server-ts` to run with `PERSISTENCE_PROVIDER=file` so deployments (especially Android/edge environments) are not blocked by Prisma migration/runtime/toolchain requirements, while keeping SQL profiles available when explicitly selected.

## Scope Classification

- Classification: `Large`
- Rationale:
  - Cross-cutting impact across startup, persistence abstractions, build pipeline, packaging behavior, and multiple persisted domains.
  - Requires architecture standardization (`registry + proxy`) and dependency graph control.

## In-Scope Use Cases

- UC-001: Startup with `PERSISTENCE_PROVIDER=file` skips Prisma migrations.
- UC-002: Prompt persistence flows run through file providers.
- UC-003: Agent definition + mapping persistence flows run through file providers.
- UC-004: Agent team persistence flows run through file providers.
- UC-005: MCP configuration persistence and startup load/register run through file providers.
- UC-006: External-channel ingress + callback persistence flows run through file providers.
- UC-007: Token usage persistence/statistics run through file providers.
- UC-008: Artifact persistence flows run through file providers.
- UC-009: `build:file` compiles without SQL/Prisma graph.
- UC-010: All persisted domains follow one resolution pattern (`registry + proxy`).
- UC-011: File-profile packaging/install/runtime path does not require Prisma dependencies.
- UC-012: SQL-profile startup and provider resolution path remains valid when `PERSISTENCE_PROVIDER=sqlite|postgresql`.
- UC-013: Team send GraphQL contract remains compatible with web runtime payload fields (`targetMemberName`, `workspaceRootPath`).

## Acceptance Criteria

1. Startup behavior
- When `PERSISTENCE_PROVIDER=file`, `runMigrations()` does not execute Prisma commands.
- When `PERSISTENCE_PROVIDER=sqlite|postgresql`, migration behavior remains intact.

2. Domain persistence behavior
- In-scope persisted domains resolve providers through domain registry + proxy (no direct `new Sql...` in composition/service paths).
- File providers preserve current externally visible behavior semantics for CRUD/idempotency/read paths.

3. Build and dependency behavior
- `build:file` excludes SQL/Prisma module graph at compile time.
- File-profile deployable artifact and startup path do not require Prisma dependency resolution at runtime.
- Prisma-related dependencies are only required for SQL profiles (`build:full` / SQL runtime paths).

4. SQL profile regression safety
- With `PERSISTENCE_PROVIDER=sqlite|postgresql`, startup still runs SQL migration path and SQL provider loaders resolve correctly for persisted domains.

5. Quality and review gates
- Future-state runtime call stacks cover all in-scope use cases with primary/fallback/error paths.
- Review gate reaches `Go Confirmed` only after two consecutive clean deep-review rounds after the final write-back.

6. Team messaging API contract safety
- `sendMessageToTeam` accepts frontend payload shape without GraphQL validation failure:
  - `SendMessageToTeamInput.targetMemberName`
  - `TeamMemberConfigInput.workspaceRootPath`

## Constraints / Dependencies

- Current persisted domain modules rely on Prisma-backed repositories/providers.
- Existing package dependencies include `repository_prisma` and `@prisma/client`.
- Android/edge runtime may not provide Prisma-compatible native engines.

## Assumptions

- No backward compatibility path is required for mixed per-domain persistence patterns.
- File persistence can be accepted as first-class for targeted deployment profiles.
- SQL remains supported through profile selection, not through fallback branches in file profile.

## Open Questions / Risks

1. Packaging strategy risk
- A compile-only split may still ship Prisma dependencies unless packaging/install strategy is explicitly defined.

2. CI confidence risk
- Without profile-specific CI checks (file build + file startup smoke), regressions can silently reintroduce Prisma coupling.

3. Runtime contract risk
- Profile/loader misconfiguration could fail late unless startup/profile validation remains fail-fast and explicit.
