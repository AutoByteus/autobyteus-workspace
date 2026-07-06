# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Investigation complete; design approved for architecture review.
- Investigation Goal: Understand the existing `Skill Access` launch mode, especially `GLOBAL_DISCOVERY`, and design removal of global discovery as a product behavior.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: The UX surface is small, but `skillAccessMode` crosses frontend launch forms, GraphQL inputs, runtime bootstrap, prompt composition, runtime skill tools, SDK contracts, run history, external channel launch presets, and data migration.
- Scope Summary: Remove `GLOBAL_DISCOVERY`; remove user-facing launch controls; make configured agent skills the authoritative exposure boundary; migrate old persisted global-discovery values.

## Request Context

The user observed a frontend `Skill Access` dropdown when starting an agent or agent team. The screenshot shows these options:

- `Configured skills only (Recommended)`
- `All installed skills`
- `No skills`

Reference screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_464779bfdc29488da090fba057b35590/solution_designer_b89148c5112f4b5ebdc11f27c1278185/context_files/ctx_24f3ccb97829__image.png`

The user clarified:

- Normal product behavior should expose only the skills an agent needs.
- A general/orchestrator agent should explicitly configure all desired skills.
- `GLOBAL_DISCOVERY` is confusing and has not been useful in normal launches.
- AutoByteus does not currently have dynamic sub-agent creation by arbitrary name + selected skills; that was only a conceptual/future pattern.
- If a future orchestration feature needs skill selection, it should separate control-plane catalog browsing from execution-plane explicit `skillNames[]` assignment.

## Environment Discovery / Bootstrap Context

- Project Type: Git.
- Original Workspace Root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.
- Task Worktree Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-access-mode-analysis`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-access-mode-analysis/tickets/in-progress/skill-access-mode-analysis`.
- Current Branch: `codex/skill-access-mode-analysis`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-07-06.
- Bootstrap Blockers: None.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-06 | Command | `git remote -v`, `git branch --show-current`, `git symbolic-ref refs/remotes/origin/HEAD`, `git worktree list --porcelain` | Resolve base branch and worktree state | Remote default is `origin/personal`; no task worktree existed. | No |
| 2026-07-06 | Command | `git fetch origin --prune` | Refresh tracked remote refs | Completed successfully. | No |
| 2026-07-06 | Command | `git worktree add -b codex/skill-access-mode-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/skill-access-mode-analysis origin/personal` | Create isolated task worktree | Worktree created from `origin/personal`. | No |
| 2026-07-06 | Data | User screenshot path above | Confirm UI surface | `Skill Access` is a top-level launch field below auto-approve tools. | No |
| 2026-07-06 | Command | `rg -n "Skill Access|skillAccessMode|SkillAccessMode|GLOBAL_DISCOVERY|PRELOADED_ONLY|No skills|Configured skills only|All installed skills" ...` | Locate end-to-end references | Found frontend forms, defaults, GraphQL types, runtime enum/resolver, skill tools, SDK contracts, run history, external channel setup, and tests. | No |
| 2026-07-06 | Code | `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Inspect single-agent launch UI | Renders the three-value `Skill Access` select and writes to `config.skillAccessMode`. | Remove control |
| 2026-07-06 | Code | `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Inspect team launch UI | Renders the same selector as a team-level setting. | Remove control |
| 2026-07-06 | Code | `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | Inspect defaults | Single-agent and team launch templates default to `PRELOADED_ONLY`. | Preserve configured-only default internally |
| 2026-07-06 | Code | `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | Inspect team member propagation | Team global `skillAccessMode` is copied to every leaf member config. | Stop exposing global choice; keep configured-only propagation only if field remains internal |
| 2026-07-06 | Code | `autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue` and `useMessagingChannelBindingSetupFlow.ts` | Inspect external channel setup | Channel binding setup also exposes the same skill-access selector; `showSkillAccessControl` is always true. | Remove control |
| 2026-07-06 | Code | `autobyteus-ts/src/agent/context/skill-access-mode.ts` | Inspect enum/default resolver | Enum has `GLOBAL_DISCOVERY`, `PRELOADED_ONLY`, `NONE`; missing mode with zero preloaded skills defaults to `GLOBAL_DISCOVERY`. | Remove global and change zero-skill default |
| 2026-07-06 | Code | `autobyteus-ts/src/agent/context/agent-config.ts` | Inspect runtime config normalization | Constructor resolves mode based on configured skill count. | Must not default to global when no skills |
| 2026-07-06 | Code | `autobyteus-ts/src/agent/factory/agent-factory.ts` | Inspect preloaded skill preparation | Converts configured skill paths/names before prompt processors run. | Reuse configured skills as authority |
| 2026-07-06 | Code | `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | Inspect AutoByteus prompt behavior | `GLOBAL_DISCOVERY` catalogs all registry skills and mentions `load_skill`; `PRELOADED_ONLY` catalogs configured skills only; `NONE` skips injection. | Remove global catalog branch |
| 2026-07-06 | Code | `autobyteus-server-ts/src/agent-tools/skills/load-skill.ts` and `skill-tool-access.ts` | Inspect skill load policy | `load_skill` blocks non-configured skills in `PRELOADED_ONLY`, blocks all in `NONE`, and allows broader access when global. | Remove global allowance |
| 2026-07-06 | Code | `autobyteus-server-ts/src/agent-tools/skills/get-available-skills.ts` and `get-skill-content.ts` | Check policy bypasses | These list/read all registered skills without inspecting access mode/configured allowlist. | Enforce configured-only in runtime tool context |
| 2026-07-06 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/...` | Inspect Codex runtime | `NONE` disables materialization; otherwise only configured skills are materialized into `.codex/skills`. `GLOBAL_DISCOVERY` does not materialize all installed AutoByteus skills. | Remove misleading mode |
| 2026-07-06 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/...` | Inspect Claude runtime | Same pattern as Codex: non-`NONE` materializes configured skills only. | Remove misleading mode |
| 2026-07-06 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-run.ts` and `agent-team-run.ts` | Inspect launch contracts | GraphQL registers `SkillAccessModeEnum`; launch inputs require skill access mode. | Remove enum value; consider keeping field internal/required for smaller contract change |
| 2026-07-06 | Code | `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/*` | Inspect channel setup contracts | Channel launch presets expose `skillAccessMode`. | Remove global value and frontend selector; default configured-only |
| 2026-07-06 | Code | `autobyteus-server-ts/src/run-history/store/team-run-metadata-schema.ts` | Inspect persisted team metadata parsing | Parser currently accepts `GLOBAL_DISCOVERY`. | Update after migration |
| 2026-07-06 | Code | `autobyteus-server-ts/src/app-data-migrations/...` | Inspect migration framework | Existing startup migrations scan files, backup, write atomically, and summarize. | Reuse for global-discovery cleanup |
| 2026-07-06 | Code | `autobyteus-application-sdk-contracts/src/index.ts` and `autobyteus-application-backend-sdk/src/launch-profile.ts` | Inspect app SDK contracts/defaults | Contracts include `GLOBAL_DISCOVERY`; backend SDK normalizer preserves it; host-managed default is `PRELOADED_ONLY`. | Remove global from contracts and normalizer |
| 2026-07-06 | Code | `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts` | Inspect app launch binding normalization | Preserves `GLOBAL_DISCOVERY` or `NONE`, otherwise defaults configured-only. | Remove global preservation |
| 2026-07-06 | Official/local docs | Codex manual helper, sections `Agent Skills` and `Subagents` | Understand Codex comparison | Codex has installed skill visibility and subagent workflows, but that is a separate control-plane/delegation pattern, not evidence AutoByteus should keep global run access. | No |

## Current Behavior / Current Flow

### Single-agent launch

`AgentDefinition.skillNames` -> `buildAgentRunTemplate()` sets `skillAccessMode: PRELOADED_ONLY` -> `AgentRunConfigForm` shows selector -> store sends GraphQL `prepareAgentRun` input -> backend stores `skillAccessMode` in run config/metadata -> runtime bootstrap resolves the mode -> AutoByteus prompt processor or Codex/Claude materializer applies it.

### Team launch

`TeamDefinition` leaf members have agent definitions with `skillNames` -> `buildTeamRunTemplate()` sets team-level `PRELOADED_ONLY` -> `TeamRunConfigForm` shows selector -> `buildTeamRunMemberConfigRecords()` copies the team-level mode to every leaf member -> GraphQL `createAgentTeamRun` input includes per-member mode -> each member runtime receives the mode.

### External channel setup

Channel binding setup UI collects a launch preset and also exposes skill access. The persisted binding preset includes `skillAccessMode`; inbound external messages reuse that preset to launch or route runs.

## Current Meaning of Each Mode

- `PRELOADED_ONLY`: expose/use configured skills only. This is the current frontend default and the product-desired behavior.
- `GLOBAL_DISCOVERY`: in AutoByteus runtime, list all globally registered skills in the prompt catalog and allow dynamic loading through `load_skill`. In Codex/Claude inspected paths, this does not provide all-installed AutoByteus skill materialization; it behaves like non-`NONE` for configured skill materialization.
- `NONE`: suppress skill prompt/materialization in several runtime paths. This may remain as an internal no-skill suppression detail, but it is not a normal user launch decision.

## Design Health Evidence

| Evidence Source | Observation | Implication |
| --- | --- | --- |
| Screenshot and launch forms | `Skill Access` appears as a normal launch setting. | Users are exposed to a policy choice they should not need to understand. |
| Launch defaults | Defaults are already `PRELOADED_ONLY`. | Hiding the selector preserves the normal path. |
| Runtime resolver | Missing mode + zero preloaded skills defaults to `GLOBAL_DISCOVERY`. | Current low-level default violates configured-skills-only product invariant. |
| AutoByteus prompt processor | `GLOBAL_DISCOVERY` has a true all-registry branch. | This branch must be removed, not just hidden from UI. |
| Codex/Claude materializers | `GLOBAL_DISCOVERY` does not implement all-installed AutoByteus skills. | Runtime-neutral UI label is misleading. |
| `get_available_skills` / `get_skill_content` | Agent tools can list/read all skills without mode enforcement. | Configured-only policy must include skill tool enforcement. |
| Run history / channel presets | Persisted records may contain global mode. | Migration is required before enum/value removal is safe. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Required Design Impact |
| --- | --- | --- |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Single-agent launch form | Remove `Skill Access` select. |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Team launch form | Remove team-level `Skill Access` select. |
| `autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue` | External channel binding setup | Remove `Skill Access` select. |
| `autobyteus-web/composables/useMessagingChannelBindingSetupFlow.ts` | Channel binding setup control visibility | Remove or stop using always-true skill-access visibility. |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | Launch defaults | Keep configured-only internal default; no global default. |
| `autobyteus-web/types/agent/AgentRunConfig.ts` | Frontend skill mode union | Remove `GLOBAL_DISCOVERY`. |
| `autobyteus-web/generated/graphql.ts` | Generated API types | Regenerate after server enum change. |
| `autobyteus-ts/src/agent/context/skill-access-mode.ts` | Runtime enum/default resolver | Remove `GLOBAL_DISCOVERY`; default to configured-only/no-skills behavior. |
| `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | AutoByteus skill prompt injection | Remove global catalog branch. |
| `autobyteus-server-ts/src/agent-tools/skills/skill-tool-access.ts` | Runtime skill tool access policy | Remove global allowance; centralize configured-only checks. |
| `autobyteus-server-ts/src/agent-tools/skills/load-skill.ts` | Load skill runtime tool | Keep configured-only enforcement; remove global path loading allowance. |
| `autobyteus-server-ts/src/agent-tools/skills/get-available-skills.ts` | List skills runtime tool | Filter/list configured skills only in agent runtime context. |
| `autobyteus-server-ts/src/agent-tools/skills/get-skill-content.ts` | Read skill content runtime tool | Permit configured skills only in agent runtime context. |
| `autobyteus-server-ts/src/api/graphql/types/agent-run.ts` | Single run GraphQL contract | Remove enum value; keep/normalize configured-only field if still required internally. |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` | Team run GraphQL contract | Same as single run. |
| `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/*` | Channel setup GraphQL contract | Remove global value and selector support. |
| `autobyteus-server-ts/src/run-history/store/*metadata*` | Persisted metadata parsing/normalization | Stop accepting global after migration. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/*` | Startup app-data migrations | Add migration replacing old `GLOBAL_DISCOVERY` values. |
| `autobyteus-application-sdk-contracts/src/index.ts` | App SDK contract type | Remove `GLOBAL_DISCOVERY`. |
| `autobyteus-application-backend-sdk/src/launch-profile.ts` | App SDK launch profile normalizer | Stop preserving `GLOBAL_DISCOVERY`; default configured-only. |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts` | Application run launch binding | Stop accepting/preserving global. |
| Localization generated files | UI labels | Remove unused `All installed skills` and skill-access label entries if no longer referenced. |

## External / Public Source Findings

No web browsing was used. The only external-comparison source was the local official Codex manual helper produced under `/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/openai-docs-cache/codex-manual.md`, sections `Agent Skills` and `Subagents`.

## Findings From Code / Docs / Data / Logs

1. The frontend makes skill access appear runtime-neutral, but only AutoByteus has inspected all-registry prompt discovery behavior.
2. Codex and Claude runtime paths use configured skill materialization and do not turn `GLOBAL_DISCOVERY` into all AutoByteus-installed skill folders.
3. The low-level resolver default currently turns "no configured skills" into "global discovery" when no explicit mode is supplied. This must change.
4. Hiding the UI without removing the global runtime branch would leave the confusing behavior available through APIs/metadata and would not satisfy the product decision.
5. Removing global without a data migration risks failures on persisted metadata that still contains the old enum value.
6. Runtime skill tools must be included because listing/reading skill content can bypass a configured-only policy if left unchanged.

## Constraints / Dependencies / Compatibility Facts

- The product has no requirement to preserve `GLOBAL_DISCOVERY` compatibility.
- Existing tests and fixtures may still use `NONE`; this design does not require eliminating `NONE` in the same change unless implementation finds it cheap and safe.
- Existing API inputs may remain structurally required to include `skillAccessMode` for now, but the only supported product/default behavior is configured-only; `GLOBAL_DISCOVERY` must be removed.
- Data migration should run before strict parsing assumes the new enum domain.

## Notes For Architecture Reviewer

The design should be reviewed as a medium cross-cutting cleanup, not as a cosmetic UI-only change. The clean target is not just hiding one dropdown; it is removing a misleading global discovery capability and making `AgentDefinition.skillNames` the execution-plane skill allowlist.
