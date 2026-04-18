# Docs Sync Report

## Scope

- Ticket: `application-team-local-agents-refactor`
- Trigger: Review round `3` passed on `2026-04-18`, then delivery refreshed `codex/application-team-local-agents-refactor` against the latest recorded base `origin/personal` and reran the relevant post-integration checks.

## Why Docs Were Updated

- Summary: Long-lived docs needed to reflect the clean cutover from application-root sibling team members to application-team-local agent ownership. The final integrated implementation now treats application-owned teams as owners of private `team_local` agents stored under the team folder, while direct application runtime-target agents remain `application_owned` at the application root. The frontend docs also needed the final provenance and authoring semantics for those team-local application agents.
- Why this should live in long-lived project docs: This ownership model now defines durable filesystem layout, validation, launch-resolution, and UI authoring behavior across built-in sample applications, server module contracts, and the generic web management surfaces. Leaving that knowledge only in ticket artifacts would preserve obsolete guidance.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `applications/brief-studio/README.md` | The canonical teaching sample README had to describe the final repo-local and package-mirror team-local layout. | `Updated` | Now points readers to `agent-teams/brief-studio-team/agents/` for the private `researcher` and `writer` team members. |
| `applications/socratic-math-teacher/README.md` | The lightweight sample README had to stop implying an application-root `agents/` folder for the runtime-target team member. | `Updated` | Now teaches the private tutor agent path under `agent-teams/socratic-math-team/agents/`. |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | The backend agent-definition module doc had to record the authoritative source shapes for `TEAM_LOCAL` agents. | `Updated` | Added the application-owned-team-local path shape and optional owning-application provenance. |
| `autobyteus-server-ts/docs/modules/agent_team_definition.md` | The backend team-definition module doc had to match the final member ref semantics and persistence-time authority. | `Updated` | Documents `team_local` member refs for application-owned teams and the provider-owned integrity boundary. |
| `autobyteus-server-ts/docs/modules/applications.md` | The applications module doc had to reflect bundle validation of nested application-team-local agents. | `Updated` | Now explains that bundle validation covers nested `agent-teams/<team-id>/agents/*` members and escape prevention. |
| `autobyteus-web/docs/agent_management.md` | The frontend agent management doc had to describe provenance and store semantics for application-owned team-local agents. | `Updated` | Added combined team + application provenance and ownership-aware getters for team-local agents. |
| `autobyteus-web/docs/agent_teams.md` | The frontend agent teams doc had to describe the final application-owned team member library behavior and persisted local refs. | `Updated` | Now explains current-team team-local library filtering and localization of canonical ids back to local refs on submit. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `applications/brief-studio/README.md` | Sample authoring/runtime layout refresh | Replaced the old application-root team-member framing with the final `agent-teams/brief-studio-team/agents/` structure and updated the recommended reading path. | Brief Studio is the canonical sample that future readers copy when authoring application bundles. |
| `applications/socratic-math-teacher/README.md` | Sample runtime-target layout refresh | Removed the stale top-level `agents/` expectation and documented the runtime-target tutor agent under the owning team folder. | The minimal sample must still teach the correct ownership shape. |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Ownership model update | Expanded the `TEAM_LOCAL` source shape to include application-owned teams and clarified provenance in the generic Agents surface. | Backend/runtime readers need one authoritative path model for team-local agents. |
| `autobyteus-server-ts/docs/modules/agent_team_definition.md` | Member-reference and authority update | Documented `refScope = team_local` for application-owned team-private agents, localized nested-team refs, and `FileAgentTeamDefinitionProvider.update(...)` as the source-aware integrity owner. | The previous wording would re-teach the obsolete application-owned sibling model. |
| `autobyteus-server-ts/docs/modules/applications.md` | Bundle-validation contract update | Added nested application-team-local agent validation and escape-prevention notes. | Application package import/scan behavior now depends on this contract. |
| `autobyteus-web/docs/agent_management.md` | Provenance/store update | Added combined team + application provenance behavior and documented team-local ownership-aware store getters. | The generic Agents surface still exposes these embedded definitions independently, so the docs must explain how. |
| `autobyteus-web/docs/agent_teams.md` | Authoring-flow update | Documented current-team team-local library filtering and submit-time localization of visible canonical ids back to persisted local refs. | This is the durable authoring behavior for editing application-owned teams. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Application-owned team-private agent ownership | Private agents that belong to an application-owned team are no longer application-root siblings; they live under the owning team folder and persist as `team_local`. | `requirements.md`, `design-spec.md`, `implementation-handoff.md` | `applications/brief-studio/README.md`, `applications/socratic-math-teacher/README.md`, `autobyteus-server-ts/docs/modules/agent_team_definition.md` |
| Team-local discovery and provenance | `TEAM_LOCAL` agents may now come from shared teams or application-owned teams and can carry both owner-team and owner-application provenance in generic listings. | `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/agent_definition.md`, `autobyteus-web/docs/agent_management.md` |
| Application bundle validation contract | Bundle scan/import must validate nested `agent-teams/<team-id>/agents/*` members and reject escapes from the owning team/application boundary. | `requirements.md`, `design-spec.md`, `validation-report.md` | `autobyteus-server-ts/docs/modules/applications.md`, `autobyteus-server-ts/docs/modules/agent_team_definition.md` |
| Application-owned team authoring behavior | Editing an application-owned team uses the current team's team-local agent library, but the persisted config keeps local refs even when the UI shows canonical visible ids. | `implementation-handoff.md`, `validation-report.md` | `autobyteus-web/docs/agent_teams.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Team-private agents stored as application-root siblings under `applications/<application-id>/agents/<agent-id>/` | Team-private agents stored under `applications/<application-id>/agent-teams/<team-id>/agents/<agent-id>/` | `applications/brief-studio/README.md`, `applications/socratic-math-teacher/README.md`, `autobyteus-server-ts/docs/modules/agent_definition.md` |
| Application-owned team agent members persisted with `refScope: application_owned` | Application-owned team agent members persisted with `refScope: team_local` and localized member refs | `autobyteus-server-ts/docs/modules/agent_team_definition.md`, `autobyteus-web/docs/agent_teams.md` |
| Generic-agent provenance that only surfaced owning-team or owning-application independently | Combined team + application/package provenance for team-local agents owned by application bundles | `autobyteus-web/docs/agent_management.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is truthful against the integrated checked branch state. No further long-lived doc corrections were needed after the base refresh; repository finalization remains blocked only on explicit user verification.
