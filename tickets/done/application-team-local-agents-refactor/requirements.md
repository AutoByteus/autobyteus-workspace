# Requirements Doc

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Refactor application-bundle team/member ownership semantics so application teams no longer model their member agents as `application_owned` siblings under the application root. When an agent belongs to a team, including inside an application bundle, it must be represented as `team_local` and stored inside that team's `agents/` folder. Keep `application_owned` only for application-root definitions such as direct runtime-target agents and application-root teams.

## Investigation Findings

- Current application sample bundles (`brief-studio`, `socratic-math-teacher`) store team member agents under `applications/<app>/agents/*` and reference them from `team-config.json` with `refScope: "application_owned"`.
- Current application-owned team parsing, normalization, and integrity validation explicitly require agent members to use `application_owned` refs and canonicalize them against the application-root `agents/` directory.
- Existing team-local agent discovery already supports `agent-teams/<team-id>/agents/<agent-id>/` for shared teams; the same locality concept can be extended into application-owned team roots.
- Current bundle validation scans only top-level application `agents/` and `agent-teams/` directories; it does not treat team-local agents inside application-owned teams as part of the bundle contract.
- The current semantics produce a locality mismatch for authors: opening an application team folder does not show its private member agents.

## Recommendations

- Make `team_local` the required scope for any agent that belongs to an application-owned team.
- Keep `application_owned` as inferred ownership for definitions that live directly under `applications/<app>/agents/*` or `applications/<app>/agent-teams/*`.
- Remove support for `application_owned` agent members inside application-owned teams; do a clean cutover with no fallback or backward-compatibility path.
- Update sample applications, package mirrors, docs, tests, validation, and runtime/source-resolution logic to the new folder and reference model.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- `UC-001`: An application bundle targets a direct application-root agent; that agent remains `application_owned` and lives under `applications/<app>/agents/<agent-id>/`.
- `UC-002`: An application bundle targets an application-root team; member agents that belong only to that team live under `applications/<app>/agent-teams/<team-id>/agents/<agent-id>/` and are referenced as `team_local`.
- `UC-003`: Backend parsing, validation, source resolution, and launch preparation resolve application-team member agents from the owning team folder rather than the application-root `agents/` folder.
- `UC-004`: Native platform surfaces still discover, display, and edit application-team member agents independently, but with owning-application and owning-team provenance.
- `UC-005`: Package/sample/test fixtures use the new application-team-local folder shape and fail fast when old application-team member semantics are supplied.

## Out of Scope

- Compatibility reads, fallback resolution, dual-write support, or legacy migration helpers for the old application-team member shape.
- Changes to shared standalone agent semantics outside what is required to reuse the same `team_local` model inside application bundles.
- Broader application-package UX redesign beyond provenance or validation updates required by this ownership refactor.
- New authoring abstractions beyond the filesystem/config semantics and the codepaths that must honor them.

## Functional Requirements

- `REQ-001`: The system must define `application_owned` as an application-root definition ownership scope, not as the required scope for agent members inside an application-owned team.
- `REQ-002`: If an application bundle runtime target is a direct agent, that agent must remain an application-root definition under `applications/<app>/agents/<agent-id>/` with `application_owned` ownership.
- `REQ-003`: If an application bundle runtime target is a team, that team must remain an application-root definition under `applications/<app>/agent-teams/<team-id>/` with `application_owned` ownership.
- `REQ-004`: Any agent that belongs to an application-owned team and is private to that team must be stored under `applications/<app>/agent-teams/<team-id>/agents/<agent-id>/`.
- `REQ-005`: Application-owned team configs must represent team-private member agents with `refType: "agent"` and `refScope: "team_local"`.
- `REQ-006`: Application-owned team configs must not allow `refType: "agent"` with `refScope: "application_owned"`.
- `REQ-007`: Application-owned team parsing, normalization, persistence, and integrity validation must resolve `team_local` member agents from the owning team folder and reject agent-member refs that escape that owning team.
- `REQ-008`: Application bundle discovery and validation must treat application-team-local agents as part of the owning application bundle contract and fail fast if referenced team-local agents are missing or malformed.
- `REQ-009`: Application session launch preparation and team runtime resolution must continue to expose independently launchable member agents while resolving application-team member agents through team-local identity/path semantics.
- `REQ-010`: Native Agents/Agent Teams surfaces must continue to surface application-team-local agents with provenance that includes both the owning application and the owning team.
- `REQ-011`: Built-in sample applications and importable package mirrors must be rewritten to the new folder/config shape.
- `REQ-012`: Documentation and tests that currently describe or assert application-team member agents as `application_owned` siblings must be updated to the new team-local semantics.
- `REQ-013`: The refactor must be a clean cutover: old application-team member configs that use `application_owned` agent refs are invalid and must not be supported by compatibility code.

## Acceptance Criteria

- `AC-001`: Given an application bundle with `runtimeTarget.kind = "AGENT"`, when the bundle is scanned, then the bound agent is resolved from `applications/<app>/agents/<agent-id>/` and still carries `application_owned` ownership metadata.
- `AC-002`: Given an application-owned team with member agent refs marked `team_local`, when the team definition is loaded, then each member agent resolves from `applications/<app>/agent-teams/<team-id>/agents/<agent-id>/` and the team definition is accepted.
- `AC-003`: Given an application-owned team config that uses `refScope: "application_owned"` for an agent member, when parsing or validation runs, then the request fails with a clear validation error.
- `AC-004`: Given an application-owned team that references a missing or malformed team-local agent under its own `agents/` folder, when bundle validation runs, then the bundle fails validation before catalog import/list success.
- `AC-005`: Given the Brief Studio and Socratic Math Teacher sample apps, when their application roots and generated importable package mirrors are inspected, then team-private member agents live inside the owning team folder and the team configs use `team_local` refs.
- `AC-006`: Given the native Agents surface, when an application-team-local agent is listed, then the system still exposes it as an independently inspectable/editable definition with owning application and owning team provenance.
- `AC-007`: Given application team launch preparation, when member descriptors are collected and runtime configs are built, then application-team-local agents are resolved without requiring application-root sibling agent definitions.
- `AC-008`: Given the repository tests/docs for application-owned team fixtures, when the refactor is complete, then no in-scope test fixture or durable documentation still describes application-team member agents as `application_owned` siblings.

## Constraints / Dependencies

- The authoritative boundaries remain the existing agent-definition, agent-team-definition, and application-bundle services/providers.
- The refactor must respect the existing clean-cut modernization rule: no compatibility wrappers, dual-path behavior, or legacy fallback reads.
- Application-owned direct agents must remain supported because application manifests can still target a single agent.
- Package validation, source resolution, runtime launch preparation, docs, and sample app package mirrors all need to stay aligned on one ownership model.

## Assumptions

- Application-owned teams may still reference nested application-owned teams from the same application root.
- Team-local agents inside application teams are private to exactly one team; cross-team reuse should use application-root definitions instead.
- Ownership can be inferred from definition path/source and does not need to be redundantly authored in agent config files.

## Risks / Open Questions

- The exact canonical ID shape for application-team-local agents must remain unambiguous when surfaced in generic platform lists and runtime launch APIs.
- Application bundle summary/discovery code may need explicit changes so package metadata counts or validations include team-local agents nested under application teams.
- Tests and fixture builders may encode the old semantics in more places than the current sample apps and core unit tests already inspected.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `REQ-001` | `UC-001`, `UC-002`, `UC-003` |
| `REQ-002` | `UC-001` |
| `REQ-003` | `UC-002` |
| `REQ-004` | `UC-002`, `UC-005` |
| `REQ-005` | `UC-002`, `UC-005` |
| `REQ-006` | `UC-003`, `UC-005` |
| `REQ-007` | `UC-003` |
| `REQ-008` | `UC-003`, `UC-005` |
| `REQ-009` | `UC-003`, `UC-004` |
| `REQ-010` | `UC-004` |
| `REQ-011` | `UC-005` |
| `REQ-012` | `UC-005` |
| `REQ-013` | `UC-003`, `UC-005` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Preserve application-root direct-agent semantics. |
| `AC-002` | Accept the new application-team-local folder/config model. |
| `AC-003` | Enforce clean-cut rejection of the old application-team member semantics. |
| `AC-004` | Fail fast on missing or malformed team-local agents in application bundles. |
| `AC-005` | Keep shipped sample bundles aligned with the new authoring model. |
| `AC-006` | Preserve independent platform visibility/editability with richer provenance. |
| `AC-007` | Preserve runtime launch/build behavior under the new resolution model. |
| `AC-008` | Remove stale docs/tests that would re-teach the old semantics. |

## Approval Status

Approved by user on 2026-04-18.
