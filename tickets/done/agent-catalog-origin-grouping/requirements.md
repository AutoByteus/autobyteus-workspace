# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined / implementation-ready after superseding product correction on 2026-05-07.

Current authoritative direction:

- Keep the Agents page origin grouping work.
- Keep the server built-in-agent centralization work for true platform infrastructure agents.
- Treat `Memory Compactor` as the only in-scope server built-in agent today.
- Treat `Daily Assistant` as a private/user-managed agent under `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/`, not as a server built-in/default-featured agent.
- Users may feature `Daily Assistant` through the existing Server Settings / Featured catalog items UI when their configured package roots make that agent available.

This document supersedes earlier ticket language that said the server should seed, migrate, or default-feature `Daily Assistant`.

## Goal / Problem Statement

Improve the `/agents` page information architecture and clean up built-in agent ownership.

Users need an Agents page that keeps manually/configured featured agents visible first while making the remaining catalog easier to understand by origin: team-local, application-owned, or shared/global. The server already exposes ownership metadata; the frontend should present it clearly instead of flattening all non-featured definitions into one regular grid.

The ticket also exposed a platform ownership issue: true server built-in agent templates/seeding should have one owner instead of scattered one-off bootstrappers. However, the user clarified that `Daily Assistant` is not platform infrastructure. It should live in the private agents package and become featured only when a user chooses it in Settings. The server should only auto-provision platform infrastructure agents such as `Memory Compactor`.

## Investigation Findings

- `AgentList.vue` already receives all agent definitions and splits configured featured items from the regular catalog.
- GraphQL/store data already includes ownership metadata: `ownershipScope`, team owner fields, application owner fields, and package/application context fields. No backend ownership API change is required for grouping.
- `AgentCard.vue` already has reusable run/details/sync behavior and ownership labels, so grouped and search views can reuse the same card surface.
- Search mode is already flat and should remain flat; grouping applies only to the no-search regular catalog after featured de-duplication.
- Current branch WIP introduced `autobyteus-server-ts/src/built-in-agents/` with a registry/bootstrapper and templates. That subsystem direction is correct, but `Daily Assistant` must be removed from server built-ins.
- `Memory Compactor` is a true platform built-in because compaction runtime depends on `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`, which should default to `autobyteus-memory-compactor` when blank.
- The normal server loader reads runtime agents from `<appDataDir>/agents` and package roots supplied through `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`. Therefore `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/` can provide Daily Assistant without server bootstrapping when that package root is configured.
- Existing private source candidate exists at `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/super-ai-assistant/`; it should be renamed/copied to `agents/daily-assistant/` with `agent.md` frontmatter `name: Daily Assistant`.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + behavior change + cleanup/refactor.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes for frontend presentation organization and server built-in template ownership; no backend ownership schema issue.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Frontend presentation gap; server file-placement/responsibility drift for built-in provisioning; legacy/compatibility pressure from treating a private assistant as a platform default.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now.
- Evidence basis: Grouping policy would bloat `AgentList.vue` if embedded directly; ownership normalization already exists and should be shared. Server one-off bootstrappers/templates split provisioning across unrelated folders. Daily Assistant should not be provisioned by server bootstrap because users can choose featured agents through Settings.
- Requirement or scope impact: Add a small frontend grouping helper; centralize true built-in agent seeding for Memory Compactor only; remove server Daily Assistant seeding/default-feature migration; add/update private Daily Assistant package definition.

## Recommendations

1. Implement origin grouping as a frontend list-composition concern using existing backend ownership metadata.
2. Keep `Featured agents` first and controlled only by `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` / Settings.
3. Keep search mode flat and include all matching definitions, including featured definitions.
4. Keep one server built-in-agent subsystem, but register/seed only true platform infrastructure built-ins in this ticket: `Memory Compactor`.
5. Do not seed, migrate, default-feature, or keep packaged server templates for `Daily Assistant`.
6. Move or copy the private assistant definition to `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/` and set its formal name to `Daily Assistant`.
7. Update tests/smoke/docs so fresh server startup expectations are: Memory Compactor built-in only; Daily Assistant appears only through configured private package root or user data.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

The user-visible grouping work is localized to the Agents frontend, but the ticket also requires server built-in provisioning cleanup and a private-agent repository adjustment.

## In-Scope Use Cases

- UC-001: User opens `/agents` with no search text and sees configured featured agents first.
- UC-002: User sees non-featured team-local agents grouped by owning team, including application context when the team belongs to an application.
- UC-003: User sees non-featured application-owned agents grouped by owning application.
- UC-004: User sees non-featured shared/global agents in a shared section.
- UC-005: User searches agents and sees one flat result grid instead of origin sections.
- UC-006: User can still run, view details, and sync agents from featured, grouped, and search views.
- UC-007: Fresh server startup provisions Memory Compactor as a platform built-in and initializes blank compaction setting to it.
- UC-008: Fresh server startup does not create or feature Daily Assistant automatically.
- UC-009: User configures `/Users/normy/autobyteus_org/autobyteus-private-agents` as an agent package root and the private `daily-assistant` definition becomes discoverable like any other package agent.
- UC-010: User chooses whether `Daily Assistant` appears in Featured agents by editing Featured catalog items in Settings.

## Out of Scope

- Backend ownership schema changes for agents.
- Collapsible sections, custom section ordering, pagination, or saved grouping preferences.
- Grouping changes for Agent Teams, tools, skills, or non-Agents catalog pages.
- Automatic server migration from `autobyteus-super-assistant` to `daily-assistant` in featured settings or app data.
- Server auto-seeding or auto-featuring any general-purpose assistant.
- Changing the compaction runtime contract beyond preserving its default agent setting.
- Deploy/release automation beyond normal handoff.

## Functional Requirements

- FR-001: The no-search `/agents` page must render `Featured agents` first when configured featured definitions resolve.
- FR-002: The no-search `/agents` page must exclude featured definitions from all regular origin sections.
- FR-003: Non-featured team-local agents must be grouped under `Team-local agents` by owning team identity.
- FR-004: Team-local groups must show application context when the owning team is associated with an application.
- FR-005: Non-featured application-owned agents must be grouped under `Application agents` by owning application identity.
- FR-006: Non-featured shared/global/package agents not owned by a team or application must appear under `Shared agents`.
- FR-007: Empty origin sections must not render.
- FR-008: Group and item ordering must be deterministic and human-readable.
- FR-009: Existing `Run`, `View Details`, and `Sync` actions must work identically from featured, grouped, and search views.
- FR-010: Search mode must remain a single flat result list across all matching definitions and must not render origin section grouping.
- FR-011: Search matching must keep the existing searchable fields and behavior unless existing tests require only copy updates.
- FR-012: The frontend must use existing authoritative ownership metadata rather than inferring ownership from ids or file paths.
- FR-013: Ownership label/normalization logic reused by store/card/grouping code must live in one shared frontend utility area, not duplicated.
- FR-014: `AgentList.vue` must remain a page-composition owner and must not become the low-level grouping policy owner.
- FR-015: The existing featured catalog settings mechanism must remain the only authority for featured agent selection.
- FR-016: Server startup must not initialize `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` to `daily-assistant` or any other general assistant.
- FR-017: Server startup must not migrate featured catalog rows from `autobyteus-super-assistant` to `daily-assistant`.
- FR-018: Server startup must not seed `<appDataDir>/agents/daily-assistant/` as a built-in/default agent.
- FR-019: Active server source must not contain a Daily Assistant built-in template under `autobyteus-server-ts/src/built-in-agents/templates/`.
- FR-020: Daily Assistant must be represented as a private/user-managed agent at `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/`.
- FR-021: Private Daily Assistant `agent.md` frontmatter must use formal name `Daily Assistant`.
- FR-022: The private Daily Assistant definition must preserve appropriate tools/processors/instructions from the existing private assistant candidate unless implementation finds a better current private source.
- FR-023: Server built-in agent provisioning must have one central owner under `autobyteus-server-ts/src/built-in-agents/`.
- FR-024: The built-in-agent registry must contain Memory Compactor as canonical id `autobyteus-memory-compactor`.
- FR-025: Built-in Memory Compactor templates must live under `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/`.
- FR-026: Startup must seed Memory Compactor into `<appDataDir>/agents/autobyteus-memory-compactor/` when missing.
- FR-027: Startup must preserve existing user-edited Memory Compactor files by seeding only missing files.
- FR-028: Startup must initialize blank `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` to `autobyteus-memory-compactor` after the seeded definition resolves.
- FR-029: Startup must preserve non-blank compaction agent setting values.
- FR-030: One-off Memory Compactor template/bootstrap paths under `agent-execution/compaction/default-compactor-agent*` must be removed/replaced by the built-in-agent subsystem.
- FR-031: One-off Daily/Super Assistant bootstrap/template paths under `agent-definition/default-agents` must not remain active product code.
- FR-032: Build asset copying must include the central built-in Memory Compactor template in packaged output and avoid stale deleted template output.
- FR-033: Tests and smoke validation must cover grouped Agents page behavior and Memory Compactor-only built-in bootstrapping.
- FR-034: Durable docs must describe origin grouping, Settings-controlled featured selection, Memory Compactor as a built-in infrastructure agent, and Daily Assistant as user/private-managed rather than server default-featured.

## Acceptance Criteria

- AC-001: With no search text and configured featured agents present, `/agents` shows `Featured agents` before any origin section.
- AC-002: A featured definition is not duplicated in Team-local, Application, or Shared sections.
- AC-003: Team-owned definitions render under `Team-local agents` grouped by owning team.
- AC-004: A team-local group for an application-owned team displays the application context.
- AC-005: Application-owned definitions without a team owner render under `Application agents` grouped by application.
- AC-006: Shared/global definitions render under `Shared agents`.
- AC-007: No empty regular section is visible.
- AC-008: Search text causes one flat result grid to render and hides origin sections.
- AC-009: Existing card actions still call the existing run/details/sync handlers from all visible contexts.
- AC-010: Frontend unit tests cover grouping order, featured de-duplication, empty sections, and flat search behavior.
- AC-011: Fresh server startup with empty data dir creates `<appDataDir>/agents/autobyteus-memory-compactor/agent.md` and `agent-config.json`.
- AC-012: Fresh server startup with empty data dir does not create `<appDataDir>/agents/daily-assistant/`.
- AC-013: Fresh server startup with blank compaction setting sets `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` to `autobyteus-memory-compactor` after the definition resolves.
- AC-014: Existing non-blank compaction setting values are preserved.
- AC-015: Fresh server startup does not initialize `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` to `daily-assistant`.
- AC-016: Existing featured setting rows referencing `autobyteus-super-assistant` are not server-migrated by the built-in bootstrapper.
- AC-017: Active server source has no `src/built-in-agents/templates/daily-assistant/` template and no Daily Assistant row in `BUILT_IN_AGENT_DEFINITIONS`.
- AC-018: Active server source has no one-off active `default-super-assistant`, `default-daily-assistant`, or `default-compactor-agent` bootstrapper/template path.
- AC-019: With `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=/Users/normy/autobyteus_org/autobyteus-private-agents`, a valid private `agents/daily-assistant/` definition can be discovered by the normal file-backed agent loader.
- AC-020: `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/agent.md` has frontmatter `name: Daily Assistant`.
- AC-021: Built-output smoke validation confirms the Memory Compactor built-in template is present and Daily Assistant built-in template is absent.
- AC-022: Documentation no longer says the server seeds or default-features Daily Assistant.

## Constraints / Dependencies

- Runtime app-data agent storage remains `<appDataDir>/agents`.
- Package-root loading remains controlled by `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`.
- Featured catalog selection remains controlled by existing Settings infrastructure.
- Compaction runtime continues to resolve the selected compaction agent id from settings.
- Private agent repository changes are outside the server/web package but explicitly requested by the user for this ticket.

## Assumptions

- `Memory Compactor` remains required platform infrastructure.
- `Daily Assistant` can be made available through private package-root loading without server seeding.
- Settings UI already provides the user-controlled path to feature available agents.
- If an operator previously had old `autobyteus-super-assistant` settings/data, this ticket does not attempt a server-owned migration because Daily Assistant is no longer a server built-in.

## Risks / Open Questions

- If a deployment expects Daily Assistant to appear without configuring private package roots or manually adding it to app data, it will no longer appear; this is intended by current user direction.
- If existing private `super-ai-assistant` content has drifted from the desired Daily Assistant behavior, implementation must preserve the best current private definition rather than blindly copying stale content.
- Existing old featured rows may become unresolved until a user updates Settings; this is acceptable under the user-managed featured-agent direction.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| UC-001 | FR-001, FR-002, FR-015 |
| UC-002 | FR-003, FR-004, FR-008, FR-012, FR-013 |
| UC-003 | FR-005, FR-008, FR-012, FR-013 |
| UC-004 | FR-006, FR-007, FR-008 |
| UC-005 | FR-010, FR-011 |
| UC-006 | FR-009, FR-014 |
| UC-007 | FR-023 through FR-032 |
| UC-008 | FR-016 through FR-019 |
| UC-009 | FR-020 through FR-022 |
| UC-010 | FR-015, FR-034 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 through AC-010 | Validate the Agents page browsing/search interaction model. |
| AC-011 through AC-018 | Validate Memory Compactor-only server built-in provisioning and removal of Daily Assistant built-in/default behavior. |
| AC-019 through AC-020 | Validate private Daily Assistant availability and identity. |
| AC-021 through AC-022 | Validate build/docs durability after the design correction. |

## Approval Status

User approved the grouped Agents page direction and then superseded the server Daily Assistant built-in/default-featured direction. Latest user direction: keep current changes, remove Daily Assistant from built-ins, and keep/move it under `autobyteus-private-agents`.
