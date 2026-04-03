# Requirements

## Status

- Current Status: `Refined`
- Previous Status: `Design-ready`

## Goal / Problem Statement

The current filesystem package model supports:

- shared standalone agents under `agents/`
- shared team folders under `agent-teams/<team-id>/`

but it does **not** support team-owned agents living inside their owning team folder.

That creates two product problems:

1. Team-scoped agents are forced into one flat shared `agents/` namespace even when they only belong to one team.
2. The current naming around `definition source` and `Import` is unclear and inconsistent for a feature that really manages external filesystem package roots.

The requested refactor must support the real authoring model users expect:

- shared reusable agents remain under top-level `agents/`
- a team may keep its own private member agents inside its own folder
- team-owned agents must still be visible and configurable from the main Agents page
- the naming around the package-root manager must be cleaned up so the feature is understandable without internal context

## Investigation-Based Direction

- The current implementation does not support team-local agents.
- The current implementation assumes agent ids are global across registered roots.
- Team runtime creation, run-history projection, sync dependency validation, and bundled skill discovery all rely on that global-id assumption.
- The current product term `definition source` is technically tied to prior implementation history, but it is not a clear user-facing concept.
- The current UI term `Import` is also inaccurate, because the feature registers external filesystem roots and leaves files in place.
- The clean implementation slice should be a canonical cut, not a compatibility slice: touched GraphQL/env/settings naming should move directly to the package-root terminology, and touched team-member refs should require explicit shared-vs-local scope.

## Scope Classification

- Classification: `Large`
- Rationale:
  - The change crosses filesystem discovery, team member resolution, runtime hydration, run-history identity, node sync, skill discovery, settings UX, GraphQL naming, config/env naming, and generated web types.
  - Team-local agents require a new scoped identity model so nested teams and run-history projections stay collision-free.

## Naming Decision

- Canonical product/domain term: `Agent Package Root`
- Canonical user-facing settings section: `Agent Package Roots`
- Canonical action language: `Add Root` / `Remove Root`
- Legacy terms to remove from touched code and UI:
  - `definition source`
  - `Definition Sources`
  - `Import` when it actually means root registration

## In-Scope Use Cases

- `UC-001`: User lists registered agent package roots in Settings.
- `UC-002`: User adds or removes an external agent package root by absolute filesystem path.
- `UC-003`: System discovers shared standalone agents from top-level `agents/` folders under the default root and any registered package roots.
- `UC-004`: System discovers team definitions from top-level `agent-teams/` folders under the default root and any registered package roots.
- `UC-005`: Team author stores team-owned agents under `agent-teams/<team-id>/agents/<agent-id>/`.
- `UC-006`: Team definition can reference both shared standalone agents and team-local agents without ambiguity.
- `UC-007`: Team runtime resolves shared standalone members and team-local members correctly when launching a team.
- `UC-008`: Two different teams can each contain the same local agent id without collision.
- `UC-009`: A team-local agent id may overlap with a shared standalone agent id without ambiguous resolution.
- `UC-010`: Team run and run-history projections keep unique downstream member identities even when two local agents share the same raw `ref`.
- `UC-011`: Node sync export/import preserves a team together with its team-local agents instead of flattening them into top-level `agents/`.
- `UC-012`: Bundled `SKILL.md` discovery works for both shared standalone agents and team-local agents.
- `UC-013`: Existing package roots that only use top-level `agents/` remain supported, but agent-team configs must use the new explicit scoped member shape.
- `UC-014`: The settings manager component, store, GraphQL documents, route names, and server API naming move away from `definition source` naming toward `agent package root` naming.
- `UC-015`: The Agents page lists both shared standalone agents and team-local agents, and team-local agents remain visually distinguishable by ownership context so users can configure them without confusing them for shared standalone agents.

## Out Of Scope

- `OOS-001`: Team-local nested team definitions under `agent-teams/<team-id>/agent-teams/`.
- `OOS-002`: Automatic migration of existing team-config files that omit the new agent `refScope`.
- `OOS-003`: Git clone / remote repository import workflows beyond local filesystem root registration.
- `OOS-004`: A full redesign of all agent/team editing UX beyond the naming and data-shape changes required for this slice.
- `OOS-005`: A separate team-local-only management surface outside the main Agents page and the owning team flows.

## Requirements

- `REQ-001`: The product must preserve top-level shared standalone agents under `agents/<agent-id>/`.
- `REQ-002`: The product must support optional team-local agents under `agent-teams/<team-id>/agents/<agent-id>/`.
- `REQ-003`: Team-local agents must be treated as owned by the containing team folder rather than as members of the global standalone-agent namespace.
- `REQ-004`: Team member references must encode whether an agent reference targets:
  - the shared standalone-agent namespace, or
  - the owning team's local agent namespace.
- `REQ-005`: For `refType: "agent"`, `refScope` is mandatory and the accepted scopes are `shared` and `team_local`.
- `REQ-006`: For `refType: "agent_team"`, the reference remains team-definition scoped by id and must not use agent `refScope`.
- `REQ-007`: Bare filesystem scanning alone is insufficient; all runtime, history, sync, and UI consumers must use the same scoped member-resolution contract.
- `REQ-008`: Team runtime construction must resolve team-local members from the owning team folder and shared members from the shared standalone-agent registry.
- `REQ-009`: Team leaf-member traversal and member-run projection logic must preserve the same scoped resolution semantics used during team creation.
- `REQ-010`: Team-local agents must receive a derived unique runtime/history identity so two different teams can contain the same local agent id without downstream collisions.
- `REQ-011`: Team dependency validation during sync/export selection must validate team-local members correctly and must not require them to exist in the global standalone-agent map.
- `REQ-012`: Node sync export/import must preserve team-local agents as part of the owning team payload instead of serializing them only as top-level standalone agents.
- `REQ-013`: Package-root summary/counting must not silently ignore team-local agents; the summary contract must expose separate shared-agent and team-local-agent counts.
- `REQ-014`: Bundled skill discovery must scan both:
  - top-level shared standalone agent folders,
  - team-local agent folders.
- `REQ-015`: The main Agents listing/query surfaces must expose both shared standalone agents and team-local agents, but team-local agents must remain explicitly marked as team-owned rather than being silently treated as shared standalone agents.
- `REQ-016`: Team deletion must remove the full team-owned directory, including any team-local agents it owns.
- `REQ-017`: The canonical term for registered filesystem roots must become `Agent Package Root`.
- `REQ-018`: The settings section currently surfaced as `Import` / `Definition Sources` must be renamed to `Agent Package Roots`.
- `REQ-019`: The current settings component file [DefinitionSourcesManager.vue](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/components/settings/DefinitionSourcesManager.vue) must be renamed to `AgentPackageRootsManager.vue`.
- `REQ-020`: The current frontend store file [definitionSourcesStore.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/stores/definitionSourcesStore.ts) must be renamed to `agentPackageRootsStore.ts`.
- `REQ-021`: The current frontend GraphQL document file [definitionSources.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/graphql/definitionSources.ts) must be renamed to `agentPackageRoots.ts`.
- `REQ-022`: The current server GraphQL type file [definition-sources.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/api/graphql/types/definition-sources.ts) must be renamed to `agent-package-roots.ts`.
- `REQ-023`: The current server service file [definition-source-service.ts](/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/definition-sources/services/definition-source-service.ts) must be renamed to `agent-package-root-service.ts` and moved under a matching package-root module path.
- `REQ-024`: The canonical GraphQL API naming must expose:
  - `agentPackageRoots`
  - `addAgentPackageRoot`
  - `removeAgentPackageRoot`
- `REQ-025`: The canonical configuration key for registered package roots must be `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`.
- `REQ-026`: Touched code must stop reading or writing `AUTOBYTEUS_DEFINITION_SOURCE_PATHS`.
- `REQ-027`: The Settings section id and route query value for the renamed page must be `agent-package-roots`.
- `REQ-028`: Touched code must stop using the old `definition-sources` settings section id and route query value.
- `REQ-029`: Agent listing/detail/edit surfaces must expose ownership metadata sufficient to distinguish team-local agents from shared standalone agents and to visually disambiguate duplicate display names across teams.
- `REQ-030`: The generic Agents page must only offer actions that preserve ownership semantics for the displayed agent; actions that would incorrectly treat a team-local agent as a shared standalone agent must be disabled or hidden until a safe ownership-aware workflow exists.
- `REQ-031`: The backend-visible agent payload used by the generic Agents page must include semantic ownership metadata sufficient for the frontend to:
  - render a clean team label for team-owned agents,
  - know whether the agent is shared or team-owned,
  - preserve ownership-aware edit/save routing without exposing raw filesystem paths.
- `REQ-032`: Frontend shared-only selection surfaces, including team-authoring flows, must continue to consume a shared-only agent subset even if the generic visible agent list includes team-local agents.

## Acceptance Criteria

- `AC-001`: Given a package root with shared standalone agents under `agents/`, the system lists and loads those agents as shared standalone definitions.
- `AC-002`: Given a package root with `agent-teams/<team-id>/agents/<agent-id>/`, the system recognizes the team-local agent without requiring a duplicate top-level `agents/<agent-id>/`.
- `AC-003`: Given one team member ref targeting a shared standalone agent and another targeting a team-local agent, the system resolves each member to the correct folder unambiguously.
- `AC-004`: Given two different teams each containing `agents/reviewer/`, both teams can launch successfully and each resolves its own local `reviewer` definition.
- `AC-005`: Given a shared standalone `reviewer` and a team-local `reviewer`, shared refs resolve to the top-level agent and local refs resolve to the owning team-local agent.
- `AC-006`: Given a team with one or more team-local agents, team runtime creation succeeds without requiring those local agents to appear in the global standalone-agent registry.
- `AC-007`: Given two local agents with the same raw `ref` in different teams, the generated team-run member configs and run-history metadata still carry unique `agentDefinitionId` values.
- `AC-008`: Given sync export/import of a team with team-local agents, the imported result preserves the team-local folder layout beneath the owning team instead of flattening local members into top-level `agents/`.
- `AC-009`: Given a package root with a `SKILL.md` inside `agent-teams/<team-id>/agents/<agent-id>/`, bundled skill discovery exposes that skill the same way it exposes top-level agent-local skills.
- `AC-010`: Given a top-level shared agent package and a team config that uses explicit `refScope: "shared"`, registration, listing, team loading, and team execution work end-to-end.
- `AC-011`: Given a team config with `refType: "agent"` and no valid `refScope`, the definition is rejected rather than silently treated as shared.
- `AC-012`: The Settings navigation, section heading, form labels, and button labels use `Agent Package Roots` / `Add Root` / `Remove Root` instead of `Import` / `Definition Sources`.
- `AC-013`: The settings manager component file is renamed from `DefinitionSourcesManager.vue` to `AgentPackageRootsManager.vue`, and the colocated test file is renamed consistently.
- `AC-014`: The frontend store and GraphQL document files are renamed consistently with the package-root terminology.
- `AC-015`: The server GraphQL type file and package-root service file are renamed consistently with the package-root terminology.
- `AC-016`: The canonical GraphQL API names `agentPackageRoots`, `addAgentPackageRoot`, and `removeAgentPackageRoot` work end-to-end.
- `AC-017`: The server reads package roots from `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` and no longer uses `AUTOBYTEUS_DEFINITION_SOURCE_PATHS` in touched code paths.
- `AC-018`: The Settings route/query and active-section state use `agent-package-roots` instead of `definition-sources`.
- `AC-019`: Package-root summaries report separate shared-agent and team-local-agent counts.
- `AC-020`: Given two team-local agents from different teams that share the same display name, the Agents page still renders them as distinguishable entries by showing ownership context such as an owning-team prefix, badge, or subtitle.
- `AC-021`: Given a team-local agent listed on the Agents page, opening its detail or edit view from that page loads and updates the team-local agent in the owning team folder instead of failing lookup or writing to the shared `agents/` directory.
- `AC-022`: Given a team-local agent listed on the Agents page, actions that would incorrectly treat it as a shared standalone agent are not offered or are clearly disabled with ownership-aware behavior preserved.
- `AC-023`: Given a team-owned agent in the generic Agents page, the card remains visually clean and differs from a shared-agent card only by one additional team line such as `Team: Software Engineering Team`.
- `AC-024`: Given the frontend loads the generic visible agent list, the payload includes ownership metadata without exposing raw filesystem paths.
- `AC-025`: Given the team-authoring form loads candidate shared agents, team-local agents do not appear in that shared-only picker even though they are visible in the generic Agents page.

## Constraints / Dependencies

- The current `team-config.json` member model does not contain explicit scope information for shared-vs-local agent references.
- The current runtime and sync code paths assume global agent ids for `refType: "agent"`.
- The current settings/config path uses `AUTOBYTEUS_DEFINITION_SOURCE_PATHS`, which creates migration pressure for naming cleanup.
- The current GraphQL naming and generated web types are already wired through the web app, so canonical renaming requires coordinated updates.
- The current node sync bundle model separates top-level agents and teams; preserving team-local ownership requires a changed bundle shape or team payload extension.
- The current frontend team library only exposes shared standalone agents and teams; team-local agents will continue to be file-authored in this slice.
- The current Agents page and backend agent listing only expose shared standalone agents, so the new requirement needs both list-read and ownership-aware write-path updates.

## Assumptions

- `ASM-001`: Top-level `agents/` remains the long-term home for reusable shared standalone agents.
- `ASM-002`: `agent-teams/<team-id>/agents/` is the long-term home for private team-owned agents.
- `ASM-003`: Team-local agents are not intended to become implicit standalone global definitions.
- `ASM-004`: Nested local team definitions are not required in the first refactor slice.
- `ASM-005`: The package-root naming cleanup is intended as a clean canonical rename, not a long-lived aliasing layer.
- `ASM-006`: A derived internal team-local agent identity string is acceptable as long as authoring stays `refScope + ref`.

## Open Questions / Risks

- `Q-001`: What exact internal string format should identify a team-local agent at runtime and in history?
  - Why it matters: the format must be unique, stable, and easy to parse without leaking filesystem paths.
- `Q-002`: Should team-local agents eventually support create/delete/duplicate/sync directly from the generic Agents page, or should those stay limited until fully ownership-aware workflows exist?
  - Why it matters: the current slice only needs visibility and configurability, but some existing shared-agent actions are not safe to blindly reuse for team-local ownership.
- `Q-003`: Should package-root summaries eventually expose read-only/read-write status per root?
  - Why it matters: package-root management already distinguishes default vs external roots, and writeability may become relevant for authoring UX.

## Requirement Coverage Map

| Requirement ID | Covered Use Cases |
| --- | --- |
| `REQ-001` | `UC-003`, `UC-013` |
| `REQ-002` | `UC-005`, `UC-006` |
| `REQ-003` | `UC-005`, `UC-008` |
| `REQ-004` | `UC-006`, `UC-009` |
| `REQ-005` | `UC-006` |
| `REQ-006` | `UC-006` |
| `REQ-007` | `UC-007`, `UC-010`, `UC-011`, `UC-012` |
| `REQ-008` | `UC-007` |
| `REQ-009` | `UC-007`, `UC-010` |
| `REQ-010` | `UC-008`, `UC-009`, `UC-010` |
| `REQ-011` | `UC-011` |
| `REQ-012` | `UC-011` |
| `REQ-013` | `UC-001`, `UC-002` |
| `REQ-014` | `UC-012` |
| `REQ-015` | `UC-003`, `UC-006`, `UC-015` |
| `REQ-016` | `UC-005` |
| `REQ-017` | `UC-014` |
| `REQ-018` | `UC-014` |
| `REQ-019` | `UC-014` |
| `REQ-020` | `UC-014` |
| `REQ-021` | `UC-014` |
| `REQ-022` | `UC-014` |
| `REQ-023` | `UC-014` |
| `REQ-024` | `UC-014` |
| `REQ-025` | `UC-001`, `UC-002`, `UC-014` |
| `REQ-026` | `UC-014` |
| `REQ-027` | `UC-014` |
| `REQ-028` | `UC-014` |
| `REQ-029` | `UC-015` |
| `REQ-030` | `UC-015` |
| `REQ-031` | `UC-015` |
| `REQ-032` | `UC-006`, `UC-015` |

## Acceptance Criteria To Scenario Intent Map

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Preserve shared standalone agent discovery |
| `AC-002` | Discover a team-local agent without top-level duplication |
| `AC-003` | Resolve shared and local members unambiguously |
| `AC-004` | Prevent local-id collisions across teams |
| `AC-005` | Prevent shared-vs-local id ambiguity |
| `AC-006` | Launch a team with local agents successfully |
| `AC-007` | Preserve collision-free downstream runtime/history identities |
| `AC-008` | Preserve team-local layout through sync export/import |
| `AC-009` | Discover team-local bundled skills |
| `AC-010` | Preserve top-level shared package behavior with explicit shared refs |
| `AC-011` | Enforce explicit scoped agent refs |
| `AC-012` | Update user-facing settings naming |
| `AC-013` | Rename the settings manager component/test files |
| `AC-014` | Rename the frontend store/GraphQL document files |
| `AC-015` | Rename the server GraphQL/service files |
| `AC-016` | Expose canonical GraphQL package-root API names |
| `AC-017` | Move to the new canonical env/config naming |
| `AC-018` | Move to the new canonical settings section id |
| `AC-019` | Expose separate shared-vs-local package-root counts |
| `AC-020` | Disambiguate duplicate team-local agent names in the Agents page |
| `AC-021` | Make team-local agents configurable from the Agents page |
| `AC-022` | Gate generic shared-only actions for team-local agents |
| `AC-023` | Keep the team-owned agent card visually clean with only a team line added |
| `AC-024` | Return ownership metadata in the visible agent payload without exposing paths |
| `AC-025` | Preserve shared-only team-authoring selection despite the broader visible agent list |
