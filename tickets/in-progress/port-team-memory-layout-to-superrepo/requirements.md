# Requirements

## Status
- Current Status: `Design-ready`
- Previous Status: `Draft`

## Goal / Problem Statement
Port the previously implemented personal-branch team-memory layout refactor into the physical super repo so team-member runtime artifacts, projection reads, continuation restore, and cleanup all use canonical team-scoped paths.

## Scope Triage
- Classification: `Medium`
- Rationale:
  - Change crosses runtime memory stores (`autobyteus-ts`) and run-history + GraphQL paths (`autobyteus-server-ts`).
  - Introduces/ports new run-history stores/services and updates test contracts.
  - Must keep scope constrained to team-memory behavior only.

## In-Scope Use Cases
- `UC-001`: Team create/send persists member artifacts under canonical team-member folder layout.
- `UC-002`: Team continue restore keeps writes under canonical team-member layout.
- `UC-003`: Team member projection reads from canonical team-member folder layout.
- `UC-004`: Team delete removes canonical team subtree artifacts.

## Out of Scope / Non-Goals
- Distributed multi-node runtime behavior changes.
- Non-team-memory refactors.
- API contract renames outside existing team-memory flow.

## Functional Requirements
- `REQ-001` Canonical Team-Member Memory Layout
  - Expected outcome: team member memory writes land under `memory/agent_teams/<teamRunId>/<memberRunId>/...`.
- `REQ-002` Explicit Runtime MemoryDir Leaf Semantics
  - Expected outcome: explicit member `memoryDir` is treated as final leaf directory and no extra `agents/<agentId>` segment is appended.
- `REQ-003` Team-Member Projection Alignment
  - Expected outcome: projection reads from canonical team-member subtree for (`teamRunId`, `memberRouteKey`).
- `REQ-004` Team Continuation Alignment
  - Expected outcome: continuation restore passes canonical member `memoryDir` and keeps resumed writes in the same member subtree.
- `REQ-005` Team-Member Run Manifest Persistence
  - Expected outcome: per-member `run_manifest.json` exists at canonical team-member folder path.
- `REQ-006` Team-Member Folder ID Readability
  - Expected outcome: generated team-member folder IDs use readable route slug + stable hash format.
- `REQ-007` Cleanup Completeness
  - Expected outcome: team delete removes `memory/agent_teams/<teamRunId>` without stale member artifacts.
- `REQ-008` Scope Guard
  - Expected outcome: only team-memory-layout-related files are changed.
- `REQ-009` Team Run Folder Name Readability
  - Expected outcome: generated `teamRunId` used as team folder name includes a readable team-name slug (`team_<team-name-slug>_<id>`) instead of hash-only suffix.

## Acceptance Criteria
1. `AC-001`: Branch `codex/port-team-memory-layout-to-superrepo` exists and is used for all port changes.
2. `AC-002`: Source commit `8b7470a` file deltas are ported into super repo `autobyteus-ts` paths.
3. `AC-003`: Source commits `60a113d` and `02317b8` file deltas are ported into super repo `autobyteus-server-ts` paths.
4. `AC-004`: File parity check for touched files reports no mismatches against source commit versions.
5. `AC-005`: Targeted run-history/memory test suites in super repo execute successfully or record explicit blockers.
6. `AC-006`: No unrelated files outside team-memory scope are included.
7. `AC-007`: New team runs generate team folder names with team-name slug prefix in runtime memory layout.

## Constraints / Dependencies
- Source refs:
  - `autobyteus-ts@8b7470a`
  - `autobyteus-server-ts@60a113d`
  - `autobyteus-server-ts@02317b8`
- Target repo: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Porting mechanism: commit patch replay with directory prefixing.

## Assumptions
1. Source commits above represent the intended team-memory-layout baseline to migrate.
2. Super repo currently lacks these exact deltas.

## Risks / Open Questions
- Test environment drift in super repo could produce failures unrelated to this port.

## Requirement Coverage Map (Requirement -> Use Cases)
- `REQ-001` -> `UC-001`, `UC-002`, `UC-003`
- `REQ-002` -> `UC-001`, `UC-002`
- `REQ-003` -> `UC-003`
- `REQ-004` -> `UC-002`
- `REQ-005` -> `UC-001`, `UC-002`
- `REQ-006` -> `UC-001`, `UC-002`, `UC-003`
- `REQ-007` -> `UC-004`
- `REQ-008` -> `UC-001`, `UC-002`, `UC-003`, `UC-004`
- `REQ-009` -> `UC-001`, `UC-002`, `UC-003`

## Acceptance Criteria Coverage Map (Stage 6 Scenario Mapping)
- `AC-001` -> `SCN-001` branch/workflow setup validation
- `AC-002` -> `SCN-002` autobyteus-ts patch parity validation
- `AC-003` -> `SCN-003` autobyteus-server-ts patch parity validation
- `AC-004` -> `SCN-004` file-level parity command validation
- `AC-005` -> `SCN-005` targeted verification suites
- `AC-006` -> `SCN-006` scope guard status/diff review
- `AC-007` -> `SCN-007` team run ID naming contract validation
