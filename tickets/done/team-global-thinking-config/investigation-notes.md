# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Small`
- Triage Rationale:
  - The requested behavior fits the existing frontend architecture and reusable `ModelConfigSection` component.
  - Backend team-run APIs already accept and persist per-member `llmConfig`; the missing behavior is primarily how the web app captures, expands, and rehydrates inherited team defaults.
  - Expected code changes stay within existing team-config UI, team launch expansion, and team run hydration helpers.
- Investigation Goal:
  - Determine why team-level thinking/model config is missing for team runs and identify the minimal code path needed to add inherited global config with per-member overrides.
- Primary Questions To Resolve:
  1. Where does the team config UI stop compared with the single-agent config UI?
  2. Does team launch already support per-member `llmConfig` payloads?
  3. How are team configs reconstructed when reopening/restoring a run, and will global inheritance survive that flow?
  4. Which tests/docs are most directly affected?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-03-30 | Command | `rg -n "thinking" autobyteus-web autobyteus-ts autobyteus-server-ts` | Find existing thinking/model-config implementation points | Team UI already has reusable `ModelConfigSection` and thinking adapter utilities; backend already persists `llmConfig` per run/member. | No |
| 2026-03-30 | Code | `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Inspect current team config UI | Team form renders runtime + global model + member overrides, but no global `ModelConfigSection`. Runtime/model reset paths also never touch team-global `llmConfig` because the field does not exist. | Yes |
| 2026-03-30 | Code | `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Compare against working single-agent flow | Agent form already renders `ModelConfigSection` directly after model picker and clears `llmConfig` when runtime/model changes. | No |
| 2026-03-30 | Code | `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | Inspect per-member override behavior | Member overrides only read `override?.llmConfig`; they do not display or inherit a global team config value when override is absent. | Yes |
| 2026-03-30 | Code | `autobyteus-web/types/agent/TeamRunConfig.ts` | Check team config data model | `TeamRunConfig` has global model / auto-execute / skill access, but no global `llmConfig`; only `MemberConfigOverride` has `llmConfig`. | Yes |
| 2026-03-30 | Code | `autobyteus-web/stores/agentTeamRunStore.ts` | Inspect launch payload generation | Temporary team launch expands global model / auto-execute into member configs, but sends `llmConfig: override?.llmConfig ?? null`, so inherited team-global model config is never propagated. | Yes |
| 2026-03-30 | Code | `autobyteus-web/stores/agentTeamContextsStore.ts` | Inspect temp team context creation | Member contexts inherit global model + auto-execute, but not global `llmConfig`, so draft member contexts also miss inherited model config. | Yes |
| 2026-03-30 | Code | `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | Inspect history restore/hydration behavior | Hydration rebuilds team config by choosing the focused member's model/auto-execute as the global config and then stores every member as an explicit override with its own `llmConfig`. This loses the lazy/inherited representation. | Yes |
| 2026-03-30 | Code | `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | Inspect alternate team-open path | Duplicate reconstruction logic exists here with the same focused-member + all-members-as-overrides behavior. | Yes |
| 2026-03-30 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Confirm whether backend changes are required | Team service already accepts launch-preset/member `llmConfig`, restores member `llmConfig`, and persists it into team-run metadata; frontend can fix inheritance by expanding global defaults into per-member configs before mutation. | No |
| 2026-03-30 | Code | `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`, `MemberOverrideItem.spec.ts`, `agentTeamRunStore.spec.ts`, `agentTeamContextsStore.spec.ts` | Identify direct regression surface | Existing tests cover model inheritance and member overrides; they should be extended for global `llmConfig` rendering, inheritance, and launch expansion. | Yes |
| 2026-03-30 | Doc | `autobyteus-web/docs/agent_teams.md` | Check durable docs | Team config docs describe global model/auto-execute but do not document a global team `llmConfig`. | Yes |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` for interactive team configuration.
  - `autobyteus-web/stores/agentTeamRunStore.ts:sendMessageToFocusedMember` for first-launch expansion from team config to GraphQL `memberConfigs`.
  - `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` and `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` for reopened/restored team config reconstruction.
- Execution boundaries:
  - Web UI state (`TeamRunConfig`) -> temporary `AgentTeamContext` -> GraphQL `CreateAgentTeamRun` member inputs -> backend `TeamRunService` member metadata persistence -> frontend restore/hydration back into `TeamRunConfig`.
- Owning subsystems / capability areas:
  - `autobyteus-web/components/workspace/config/*` owns config UI.
  - `autobyteus-web/stores/*Team*` owns team draft/run state.
  - `autobyteus-web/services/runHydration/*` and `runOpen/*` own history/live rehydration.
  - `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` owns backend team member config persistence.
- Folder / file placement observations:
  - The missing behavior is localized in the correct existing owners; no new subsystem or file family appears necessary.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | template + `updateRuntimeKind` / `updateModel` / `sanitizeMemberOverridesForRuntime` | Team config editor | Global model exists, but no global model-config section; runtime/model changes clear model selection only, not a global `llmConfig`. | Modify in place; this is the correct UI owner. |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | `ModelConfigSection` usage | Single-agent config editor | Already provides the desired team-global thinking UX pattern. | Reuse same component pattern; no new UI abstraction needed. |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | `effectiveModelIdentifier`, `modelConfigSchema`, `emitOverrideWithConfig` | Per-member override editor | Schema inherits global model identifier, but config value does not inherit global `llmConfig`. | Extend existing item to read inherited global config and only persist divergent overrides. |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | `TeamRunConfig`, `createDefaultTeamRunConfig` | Team config data model | No team-global `llmConfig` field. | Add global `llmConfig` here to make inheritance explicit. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | first launch `memberConfigs` mapping | Expand team draft into create-team-run mutation | Sends only per-member override `llmConfig`, so team-global config never reaches backend. | Update mapping to fall back to team-global `llmConfig`. |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | `createRunFromTemplate` | Build temporary team context from draft config | Draft member `AgentRunConfig`s inherit model/auto-execute but not `llmConfig`. | Keep member contexts aligned with launch behavior. |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | `buildHydratedTeamContext` | Reconstruct team config from run metadata | Picks focused member defaults and materializes every member as an override, which defeats lazy team-level inheritance. | Replace duplicated inline reconstruction with inference helper. |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | `openTeamRun` hydration config construction | Alternate reopen path | Repeats same reconstruction issue as hydration service. | Share one helper to avoid drift. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | `buildMemberConfigsFromLaunchPreset`, `buildRestoreTeamRunContext`, `buildTeamRunMetadata` | Backend team member config ingestion/persistence | Per-member `llmConfig` is already first-class throughout launch, restore, and metadata persistence. | No new backend API shape required for this feature. |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-03-30 | Probe | `git fetch --all --prune` | Failed with `cannot open .git/FETCH_HEAD: Operation not permitted`. | Workflow artifacts must record checkout/worktree bootstrap fallback in current sandbox. |
| 2026-03-30 | Probe | Code inspection of `TeamRunConfigForm.vue` vs `AgentRunConfigForm.vue` | Single-agent config already contains the missing model-config UI section. | Team fix can reuse the established agent config pattern. |

### External Code / Dependency Findings

- None required; local code and tests were sufficient.

### Reproduction / Environment Setup

- No runtime reproduction environment was needed beyond repository code inspection.
- Sandbox note: `.git` metadata writes are blocked in this environment, so dedicated ticket branch/worktree bootstrap could not be created.

## Constraints

- Technical constraints:
  - Backend team-run metadata stores per-member configs, not an explicit top-level team `llmConfig` object.
  - Rehydration must infer a reasonable global/default representation from member metadata to preserve lazy editing.
- Environment constraints:
  - Git metadata writes are sandbox-blocked.
- Third-party / API constraints:
  - None identified.

## Unknowns / Open Questions

- Unknown:
  - What is the best deterministic heuristic for reconstructing a team-global default from member metadata when members diverge?
- Why it matters:
  - Restored/reopened team configs should minimize noisy overrides while staying faithful to the persisted member-level truth.
- Planned follow-up:
  - Use a frequency/majority-based inference helper (with coordinator/first-member fallback) so reopened teams preserve the smallest reasonable override set.

## Implications

### Requirements Implications

- Requirements should cover three separate behaviors, not just the visible UI:
  1. render team-global model-config/thinking controls,
  2. inherit that global config into member launch payloads and draft contexts,
  3. reconstruct reopened team configs so users still see global defaults plus only meaningful member overrides.

### Design Implications

- The smallest coherent change is frontend-only but cross-cutting across three owners:
  - team config data model/UI,
  - team launch expansion,
  - team run hydration/open reconstruction.
- Duplicated hydration/open reconstruction should be consolidated behind one helper so global-default inference logic stays consistent.

### Implementation / Placement Implications

- Likely changed files:
  - `autobyteus-web/types/agent/TeamRunConfig.ts`
  - `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`
  - `autobyteus-web/components/workspace/config/MemberOverrideItem.vue`
  - `autobyteus-web/stores/agentTeamRunStore.ts`
  - `autobyteus-web/stores/agentTeamContextsStore.ts`
  - `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`
  - `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
  - Supporting tests/docs, plus a small shared helper if introduced.
- No backend schema or GraphQL contract expansion appears necessary because existing member-level `llmConfig` transport is already sufficient.
