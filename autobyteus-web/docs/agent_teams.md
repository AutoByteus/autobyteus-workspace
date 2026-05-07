# Agent Teams Module - Frontend

## Scope

Shows team definitions in the native Agent Teams surface, supports shared-team creation, supports edit/detail flows for existing shared and application-owned teams, and prepares workspace team launches with ownership-aware member semantics, mixed-runtime per-member overrides, truthful launch-readiness gating, and reopen/hydration support.

For runtime execution/streaming behavior, see `agent_execution_architecture.md`.

The Agent Teams list can also present a server-configured **Featured teams** section. Featured placement is owned by the `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` server setting and managed from Settings -> Server Settings -> Basics -> Featured catalog items; it is not a property of the team definition itself.

## Main Files

- `stores/agentTeamDefinitionStore.ts`
- `components/agentTeams/AgentTeamList.vue`
- `components/agentTeams/AgentTeamCard.vue`
- `components/agentTeams/AgentTeamDetail.vue`
- `components/agentTeams/AgentTeamDefinitionForm.vue`
- `components/launch-config/DefinitionLaunchPreferencesSection.vue`
- `components/launch-config/RuntimeModelConfigFields.vue`
- `components/workspace/config/TeamRunConfigForm.vue`
- `components/workspace/config/MemberOverrideItem.vue`
- `components/workspace/config/RunConfigPanel.vue`
- `components/agentTeams/form/useAgentTeamDefinitionFormState.ts`
- `components/agentTeams/form/AgentTeamMemberDetailsPanel.vue`
- `stores/teamRunConfigStore.ts`
- `stores/agentTeamContextsStore.ts`
- `stores/agentTeamRunStore.ts`
- `utils/teamRunConfigUtils.ts`
- `utils/teamRunLaunchReadiness.ts`
- `utils/teamRunMemberConfigBuilder.ts`
- `utils/catalog/featuredCatalogItems.ts`
- `utils/definitionOwnership.ts`

## Team Definition Model

Team definitions now include:

- `ownershipScope` (`SHARED` or `APPLICATION_OWNED`),
- owning application/package provenance, and
- persisted launch defaults:
  - `defaultLaunchConfig.llmModelIdentifier`
  - `defaultLaunchConfig.runtimeKind`
  - `defaultLaunchConfig.llmConfig`
- per-member `refScope` for agent members (`SHARED`, `TEAM_LOCAL`, or `APPLICATION_OWNED`).

Nested team members continue to use `refType: 'AGENT_TEAM'` without `refScope`.

`defaultLaunchConfig.llmConfig` carries schema-driven runtime/model parameters
for the selected model. This includes thinking settings such as
`reasoning_effort` and runtime-specific non-thinking settings such as Codex
`service_tier: "fast"` for models whose catalog schema exposes **Fast mode**.

## Ownership Behavior

| Scope | Shown in generic Agent Teams list | Editable from generic team detail/edit | Generic delete / sync |
| --- | --- | --- | --- |
| `SHARED` | Yes | Yes | Allowed |
| `APPLICATION_OWNED` | Yes | Yes when backed by a writable source | Not allowed in the generic shared workflow |

The list/detail/card surfaces show ownership badges and application/package provenance so embedded teams remain distinguishable from standalone shared teams.

## Default Launch Preferences

`AgentTeamDefinitionForm.vue` now round-trips `defaultLaunchConfig` through the shared `DefinitionLaunchPreferencesSection.vue` surface for both shared and application-owned teams.

Those values are used in two places:

- direct native team launches, and
- application-authored backend flows that may reuse persisted definition defaults when an application backend decides to start runtime work.

Definition editors can leave runtime blank to mean “choose when launching”, while workspace run-config forms resolve one effective team default immediately and let individual leaf members diverge when mixed-runtime launch is needed.

## Team Run Config Surface

The workspace-side team launch buffer is owned by `teamRunConfigStore` and rendered through `TeamRunConfigForm.vue`.

That surface owns:

- the team-level default runtime/model/config selection,
- shared workspace / auto-execute / skill-access fields,
- leaf-member override rows flattened from nested team definitions, and
- runtime-scoped model catalog loading for the team default plus any explicit member runtime overrides.

`MemberOverrideItem.vue` is the authoritative row owner for per-member launch overrides. Each leaf member can:

- inherit the global runtime/model/config,
- choose an explicit runtime override,
- choose a compatible explicit model when the inherited global model is invalid for that runtime,
- override auto-execute behavior, and
- carry an explicit member `llmConfig` (including explicit `null`) only when that row truly owns the divergence.

Member `llmConfig` values use the same schema-driven shape as the team default.
For Codex members, `service_tier: "fast"` is valid only while the selected or
inherited Codex model schema exposes **Fast mode**; stale values are cleared when
the owning runtime/model context changes.

When the runtime override changes, the row clears incompatible explicit model/config state instead of leaking stale member-only configuration into the next launch.

When the team-level runtime or model changes, `TeamRunConfigForm.vue` also clears
member `llmConfig` values that were only meaningful because the member inherited
the previous team-level runtime/model. Explicit member runtime/model overrides
and unrelated member fields such as auto-execute are preserved.

When `RunConfigPanel.vue` is showing a selected existing team run rather than a
new team launch buffer, `TeamRunConfigForm.vue` receives read-only mode. In that
mode the team-level runtime/model/workspace/auto-approve/skill controls and all
`MemberOverrideItem.vue` rows render as disabled, direct update handlers no-op,
and the **Run Team** action is not shown. Member override rows remain
inspectable, and advanced model/thinking sections are expanded or available so
persisted backend values such as `reasoning_effort: "xhigh"` are visible for the
global team config and per-member overrides.

Read-only selected-team config is display-only. It does not save edited
historical settings, recover missing `llmConfig`, materialize runtime history, or
infer current defaults. If backend metadata has no recorded model-thinking
config, the frontend can show the localized `Not recorded for this historical
run` state to make the absence explicit.

The workspace header add/new-run action can use a selected existing team run as
the template for a new editable team launch. That draft is a deep-cloned copy of
the selected team's config, including team-level `llmConfig` and member override
`llmConfig`, so editing the draft cannot mutate the selected historical/live run.
Runtime model catalog loading must not clear copied thinking/reasoning fields;
only explicit user runtime/model changes own stale config cleanup.

## Mixed-Runtime Launch Readiness

`teamRunLaunchReadiness.ts` is the frontend owner for mixed-runtime launch gating.

It evaluates:

- workspace presence,
- team default model availability for the selected team runtime,
- runtime-catalog readiness for each explicit member runtime override, and
- whether any member is trying to inherit a global model that is unavailable for that member's effective runtime.

`RunConfigPanel.vue` uses that result to disable **Run Team** and surface the first blocking issue directly in the workspace panel. The key user-facing rule is:

- if a member overrides runtime but the inherited global model is incompatible for that runtime, the row stays unresolved and the user must either choose a compatible member model or clear the runtime override.

## Temp-Team Materialization And Launch

The frontend still creates a local temporary team context first, but mixed-runtime launches now preserve divergent member runtime/model identity through that path.

- `agentTeamContextsStore.createRunFromTemplate()` materializes the local temp team from the current run-config buffer using `buildTeamRunMemberConfigRecords(...)`.
- `agentTeamRunStore.sendMessageToFocusedMember()` re-evaluates mixed-runtime launch readiness on first send, builds GraphQL `memberConfigs` from the shared member-config builder, creates the permanent backend team run, and promotes the local temp team id to the real backend `teamRunId`.
- That promotion keeps per-member runtime/model identity intact instead of collapsing all members back to the team default runtime.

This is the frontend contract that makes the backend `TeamBackendKind.MIXED` path reachable from the actual app UX rather than only from backend/API-only proof.

## Stopped Team Follow-Up And Termination State

`agentTeamRunStore.sendMessageToFocusedMember()` supports follow-up chat against existing team runs after local stop/termination:

- temporary teams still create and promote a permanent backend `teamRunId` before first send;
- persisted teams with cached inactive resume config call `RestoreAgentTeamRun` before send;
- the backend team WebSocket connect and `SEND_MESSAGE` paths also resolve through `TeamRunService.resolveTeamRun(...)`, so the server can restore and rebind the stream session even when the frontend's resume cache is stale or absent; and
- after a successful follow-up send, the run history cache is marked active and refreshed.

`agentTeamRunStore.terminateTeamRun()` treats backend termination as the authority for persisted teams. It tears down local stream/member state and marks the team resume config inactive only after `TerminateAgentTeamRun` succeeds. If backend termination fails, the store returns `false` and leaves the current local stream/member state and run-history activity cache unchanged. Local temporary teams are the exception: they have no persisted backend runtime and are torn down locally.

## Reopen / Hydration Behavior

`reconstructTeamRunConfigFromMetadata()` is the authoritative frontend reopen/hydration rule for existing team runs.

It rebuilds one dominant team-level default from persisted member metadata, then preserves only the member-level divergences, including:

- divergent member runtime overrides,
- divergent member model identifiers,
- divergent auto-execute values, and
- explicit member `llmConfig` differences, including explicit `null` cleanup cases.

This keeps reopened mixed-runtime teams truthful in the run-config surface instead of flattening them back to one runtime/model pair.

Reopen/hydration supplies the values that selected read-only team config
displays. The frontend treats non-null metadata from the backend as authoritative
for inspection and treats null metadata as not recorded; backend recovery,
materialization, or backfill is outside the Agent Teams frontend module.

## Store Ownership

`agentTeamDefinitionStore` owns:

- fetch and reload of the full team catalog,
- create/update/delete mutations,
- ownership-aware getters such as `sharedAgentTeamDefinitions` and `getApplicationOwnedTeamDefinitionsByOwnerApplicationId(...)`, and
- cache invalidation via `invalidateAgentTeamDefinitions()`.

`teamRunConfigStore` owns:

- the current team launch buffer,
- runtime-scoped model catalogs for launch readiness,
- workspace-loading state for new team launches, and
- the derived `launchReadiness` view consumed by the workspace panel.

`agentTeamContextsStore` and `agentTeamRunStore` own the live temp/permanent team lifecycle after the user leaves definition editing and enters runtime work.

## Package Refresh Behavior

Package import/remove flows invalidate and reload Agent Teams together with Applications and Agents so application-owned teams appear or disappear immediately in the same session.

## Featured Teams

`AgentTeamList.vue` joins the loaded team catalog with `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` entries whose `resourceKind` is `AGENT_TEAM`.

- Featured teams render with the same `AgentTeamCard` component and the same view, sync, and run actions as the regular grid.
- When the featured section is visible, the same team is removed from the regular grid to avoid duplicate cards.
- Search mode hides featured grouping and searches the full team catalog normally, including featured teams that match the query.
- Unknown or removed definition ids in the setting are ignored on the catalog page; Settings keeps unresolved rows visible for operator cleanup.
- Frontend code must not hard-code featured team ids. Change featured placement through the server setting instead.

## Notes

- The generic create flow still creates shared standalone teams.
- Application-owned teams are surfaced for inspection/testing and in-place editing, not for shared-path deletion or sync.
- Team detail cards surface team-local member badges for embedded private agents, while agent cards/details show both team and application provenance when the owning team belongs to an application bundle.
- The workspace run-config flow now truthfully supports mixed-runtime teams; any future team-launch UX must preserve the same per-member runtime/model/readiness invariants.
