# Design Spec

## Current-State Read

The current product exposes `skillAccessMode` as a normal launch-time setting for single-agent runs, team runs, and external channel launch presets. The visible choices are `PRELOADED_ONLY`, `GLOBAL_DISCOVERY`, and `NONE`.

Current execution ownership is fragmented:

- Agent definitions already own configured skill identity through `skillNames`.
- Launch forms also own a separate skill exposure policy, which lets a user override configured-only behavior at run start.
- Runtime bootstraps and prompt processors interpret the same enum differently by runtime.
- AutoByteus runtime has a real `GLOBAL_DISCOVERY` path that catalogs all registered skills and can load non-configured skills.
- Codex and Claude runtime paths do not implement all-installed AutoByteus skill materialization for `GLOBAL_DISCOVERY`; they mostly distinguish `NONE` from non-`NONE` configured-skill materialization.
- Runtime skill tools are inconsistent: `load_skill` enforces access mode, but `get_available_skills` and `get_skill_content` currently list/read all registered skills without applying the configured-skill allowlist.
- Run/team metadata and external channel bindings persist the old enum value, so removing the value requires data migration.

The target design must respect existing configured skills on agent definitions, existing run/team launch paths, and the migration framework, while removing the global discovery behavior cleanly.

## Intended Change

Remove `GLOBAL_DISCOVERY` as a supported product/runtime behavior and remove user-facing `Skill Access` launch controls.

After the change:

- The execution-plane rule is simple: an agent run may use only skills explicitly configured for that agent definition.
- A team member may use only skills explicitly configured for that member's agent definition.
- A general/orchestrator agent is represented by configuring all desired allowed skills on that agent definition.
- An agent with no configured skills receives no AutoByteus-managed skills by default.
- Runtime skill tools must not expose arbitrary installed skills to an agent runtime context.
- Persisted `GLOBAL_DISCOVERY` values are migrated to configured-only behavior.

This design removes global discovery now. Full removal of the internal `skillAccessMode` attribute can be a later cleanup if desired, but any retained field must no longer contain or preserve `GLOBAL_DISCOVERY` and must not be user-facing in normal launch flows.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Product Cleanup / Boundary Refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Duplicated Policy Or Coordination.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence:
  - Agent definitions already hold `skillNames`, but launch UI adds a second user-visible policy switch.
  - The low-level resolver defaults missing mode + zero configured skills to `GLOBAL_DISCOVERY`, violating the desired invariant that no configured skills means no skills.
  - AutoByteus, Codex, and Claude do not share equivalent semantics for `GLOBAL_DISCOVERY`.
  - `get_available_skills` and `get_skill_content` bypass configured-only policy if exposed to an agent.
  - The value is persisted in multiple data stores, so a UI-only removal would leave legacy behavior available through API/history/channel presets.
- Design response:
  - Make `AgentDefinition.skillNames` the authoritative skill allowlist for execution.
  - Remove `GLOBAL_DISCOVERY` enum values, UI labels/options, resolver branches, prompt branches, SDK contract values, and tests.
  - Add migration to rewrite persisted old global values to configured-only behavior before strict parsing/serialization relies on the new enum.
  - Centralize runtime skill-tool enforcement so list/read/load all obey the same configured-only policy.
- Refactor rationale:
  - The problem is not just a misplaced dropdown. It is a duplicated access policy that leaks from runtime internals into user launch UX and is interpreted inconsistently by runtimes.
- Intentional deferrals and residual risk, if any:
  - Full deletion of the `skillAccessMode` field itself is deferred. It may remain as internal plumbing with configured-only/no-skill semantics if that keeps launch contracts and test setup stable. Residual risk: the field remains a future cleanup target, but global discovery is removed and no normal user control remains.

## Terminology

- Configured skills: the explicit skill identities attached to an agent definition, currently represented as `skillNames`.
- Execution-plane skill allowlist: the concrete set of skills a running agent may list, read, load, prompt-inject, or materialize.
- Control-plane skill catalog: administrative/human/orchestrator skill browsing used to choose which skills to assign. This is distinct from what a running agent may execute.
- Global discovery: the legacy behavior where a running agent can see/load all installed server-managed skills instead of only configured skills.

## Design Reading Order

1. Follow the launch and runtime skill-exposure data-flow spine.
2. Confirm subsystem ownership: definitions own skill allowlists; launch forms do not own access policy; runtime adapters materialize configured skills only.
3. Inspect runtime skill-tool enforcement to ensure no bypass remains.
4. Inspect migration and generated/API contract changes to ensure old global values are removed cleanly.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove `GLOBAL_DISCOVERY` from all supported enums, unions, labels, API/generated types, SDK contracts, runtime branches, tool policies, migration normalizers, and tests.
- Persisted old values are not preserved as a compatibility path. They are rewritten to configured-only behavior by app-data migration.
- Client requests using `GLOBAL_DISCOVERY` after the change should fail enum/validation checks instead of silently enabling or preserving legacy behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Single-agent launch config | Runtime configured skill exposure | Agent run provisioning + runtime backend | Removes launch-time global policy and validates configured-only behavior for normal agent runs. |
| DS-002 | Primary End-to-End | Team launch config | Each member runtime configured skill exposure | Team run service + member runtime backend | Ensures each team member receives only that member's configured skills; no team-level global switch. |
| DS-003 | Primary End-to-End | Runtime skill tool call | Allowed list/read/load result or denial | Skill tool access policy | Closes bypasses around prompt/materialization by enforcing allowlist in tools. |
| DS-004 | Primary End-to-End | Persisted app data containing `GLOBAL_DISCOVERY` | Migrated configured-only persisted data | App-data migration framework | Prevents removed enum values from breaking history/channel parsing and serialization. |
| DS-005 | Bounded Local | Control-plane channel binding setup | Persisted launch preset without user skill mode | External channel setup | Removes a secondary UI surface that would otherwise preserve launch-time skill policy. |

## Primary Execution Spine(s)

- DS-001: `AgentDefinition.skillNames -> Launch Defaults -> PrepareAgentRun Input -> AgentRunProvisioningService -> Runtime Backend Bootstrap -> Prompt/Workspace Skill Exposure`
- DS-002: `TeamDefinition leaf AgentDefinition.skillNames -> Team Launch Defaults -> Team Member Config Builder -> TeamRunService -> Member Runtime Backend Bootstrap -> Member Prompt/Workspace Skill Exposure`
- DS-003: `Agent Runtime Tool Invocation -> SkillToolAccessPolicy -> Configured Skill Resolver -> SkillService list/read/load -> Tool Response or Denial`
- DS-004: `AppDataMigrationRunner -> GlobalDiscoveryMigration -> Metadata/Binding File Scan -> Backup + Rewrite -> Strict New Enum Parsing`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A user chooses an agent and launch runtime/model/workspace. The launch no longer asks for skill access. The backend builds runtime config from the selected definition's configured skills. AutoByteus prompt injection and Codex/Claude materialization use that configured set only. | Agent definition, launch config, agent run config, runtime bootstrap, skill exposure composer | Agent run provisioning and runtime backend | UI defaults, GraphQL enum generation, metadata persistence |
| DS-002 | A user launches a team. The team form no longer applies one skill mode to all leaf members. Each leaf member runtime receives the skill set configured on that member's own agent definition. | Team definition, member config records, team run metadata, member runtime config | Team run service | Member route identity, nested team projection, generated types |
| DS-003 | If an agent calls skill tools, the tools resolve the same configured-skill allowlist and filter or deny access. Listing returns configured skills only; content/load only succeeds for configured skills. | Runtime context, skill access policy, configured skill set, SkillService | Skill tool access policy | Admin/control-plane skill catalog must use a different non-agent service/API if needed |
| DS-004 | Startup migration scans app-data stores where old mode values can exist, backs up touched files, rewrites `GLOBAL_DISCOVERY` to configured-only, and reports migrated/skipped/failed counts. After that, parsers can reject global. | Migration runner, run metadata, team metadata, channel binding records | App-data migration framework | File backup/atomic write, idempotence, migration tests |
| DS-005 | Channel binding setup still captures runtime/model/workspace/auto-execute settings, but no skill mode. Saved presets launch with configured-only behavior. | Channel binding setup form, launch preset, channel run launcher | External channel setup + channel launcher | GraphQL external-channel setup types, old preset migration |

## Spine Actors / Main-Line Nodes

- Agent definitions and team member definitions.
- Frontend launch/default builders.
- GraphQL launch input types and resolvers.
- Agent run provisioning service.
- Team run service and team member config mapper.
- Runtime bootstrappers/materializers for AutoByteus, Codex, and Claude.
- AutoByteus available-skills prompt processor.
- Runtime skill tool access policy and skill tools.
- App-data migration runner and migration definition.

## Ownership Map

- `AgentDefinition.skillNames` owns the durable skill allowlist chosen for an agent.
- Launch forms own run-specific operational choices: runtime, model, workspace, and tool auto-approval. They must not own skill exposure policy.
- Agent/team run provisioning owns translating selected definitions into runtime configs.
- Runtime backends own adapting configured skills into each runtime's representation:
  - AutoByteus: prompt catalog/details for configured skills.
  - Codex: materialized `.codex/skills` for configured skills.
  - Claude: materialized `.claude/skills` for configured skills.
- Skill tool access policy owns runtime enforcement for list/read/load tool calls.
- App-data migration owns cleanup of persisted legacy values.
- SDK contracts own externally supported launch shape and therefore must remove `GLOBAL_DISCOVERY`.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `CreateAgentRunInput` / `prepareAgentRun` | Agent run provisioning | Transport boundary for launch requests | Skill allowlist calculation beyond passing selected definition/config to provisioning |
| GraphQL `CreateAgentTeamRunInput` / `TeamMemberConfigInput` | Team run service | Transport boundary for team launch | A team-level global access override |
| External channel setup GraphQL inputs | External channel setup service | Transport boundary for saved launch presets | User-selectable global skill mode |
| Frontend default builders | Launch UX | Provide default runtime/model/workspace/config values | Authorization or global skill discovery |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `SkillAccessMode.GLOBAL_DISCOVERY` enum value | Product no longer supports all-installed runtime discovery | Configured skill allowlist from `AgentDefinition.skillNames` | In This Change | Remove from shared runtime enum and generated types. |
| `resolveSkillAccessMode(...)->GLOBAL_DISCOVERY` fallback | Empty configured skill list must mean no skills, not all skills | Configured-only default / internal no-skill semantics | In This Change | Missing/invalid modes should resolve to configured-only unless explicit internal no-skill mode applies. |
| Agent launch `Skill Access` dropdown | User should not choose access policy at launch | Agent definition skill configuration | In This Change | Remove labels/options for all three modes from normal form. |
| Team launch `Skill Access` dropdown | One global team mode applied to all members is the wrong owner | Member agent definitions | In This Change | Each member's configured skills are authoritative. |
| Channel binding setup `Skill Access` dropdown | External preset should not preserve launch-time global policy | Configured-only preset default | In This Change | Remove always-true visibility flag if only used by this field. |
| AutoByteus prompt global catalog branch | Would keep global discovery behavior alive | Configured-skill prompt injection | In This Change | No all-registry prompt catalog in agent runtime. |
| `load_skill` global/path allowance | Agents should not load arbitrary installed skills | Skill tool configured-only policy | In This Change | Path loads should not bypass allowlist. |
| Unfiltered `get_available_skills` / `get_skill_content` in agent context | Bypasses configured-only policy | Skill tool configured-only policy | In This Change | If admin catalog is needed, create/use separate control-plane API later. |
| SDK/app contract `GLOBAL_DISCOVERY` value | External contract should match product behavior | Configured-only launch profile default | In This Change | Breaking cleanup; no compatibility alias. |
| Persisted `GLOBAL_DISCOVERY` metadata values | Removed enum value would break strict parsing and preserve old behavior | App-data migration | In This Change | Rewrite to configured-only behavior. |
| Full `skillAccessMode` attribute | Field may become redundant once no user-facing mode remains | Agent definition skill allowlist | Follow-up | Defer unless implementation finds a safe low-risk removal path. |

## Return Or Event Spine(s) (If Applicable)

No separate return/event spine changes are required. Existing run status, stream, and history projections continue to publish runtime state. Projections that include `skillAccessMode` should no longer be able to emit `GLOBAL_DISCOVERY` after migration and enum cleanup.

## Bounded Local / Internal Spines (If Applicable)

- App-data migration bounded spine:
  - Parent owner: app-data migration framework.
  - Arrow chain: `list candidate files -> read JSON -> detect GLOBAL_DISCOVERY -> copy backup -> write temp JSON -> atomic rename -> migration summary`.
  - Why it matters: strict enum removal is unsafe if old persisted values remain.

- Runtime skill tool policy bounded spine:
  - Parent owner: skill tool access policy.
  - Arrow chain: `normalize context.config.skills -> resolve supported mode -> build Set -> authorize list/read/load -> filter/deny`.
  - Why it matters: all skill tools must share the same configured-only enforcement instead of each implementing partial checks.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Generated GraphQL types | DS-001, DS-002, DS-005 | API transport | Reflect removed enum value in frontend/server generated artifacts | Transport types must match server schema | Manual ad-hoc type edits can drift from schema |
| Localization cleanup | DS-001, DS-002, DS-005 | Frontend UX | Remove unused `All installed skills` and skill-access labels where no control remains | Avoid stale user-facing copy | Leaving labels can hide dead UI paths |
| Test fixture cleanup | All | Validation | Remove/update old global mode expectations and fixtures | Compile/test safety | Tests may keep legacy behavior alive |
| SDK contract update | DS-001, DS-002, DS-005 | External app launch | Remove global from supported external values | Contract should match product | External clients could keep sending removed value |
| Historical metadata projection | DS-004 | Run history | Ensure no serializer emits removed value | Old data can break GraphQL enum serialization | Projection code becomes a compatibility wrapper |
| Future control-plane skill catalog | DS-003 | Future orchestration UX | Let humans/orchestrators choose skills without granting runtime global access | Addresses conceptual future need | Blending catalog with runtime tools recreates global discovery |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Configured skill source | Agent definitions (`skillNames`) | Reuse | Already durable and product-facing | N/A |
| Runtime skill prompt/materialization | Existing runtime backends/processors | Extend | They already adapt skills per runtime | N/A |
| Tool allowlist enforcement | `skill-tool-access.ts` | Extend | Existing central policy used by `load_skill` | N/A |
| Data cleanup | App-data migration framework | Extend | Existing startup migration pattern supports file scan/backup/rewrite | N/A |
| External app defaults | Application SDK/backend launch profile | Extend | Existing normalizer/defaults own external launch profile shaping | N/A |
| Control-plane skill browsing | Existing skill CRUD/service/admin APIs | Follow-up / Reuse later | Not needed for this removal | New runtime global tool is explicitly wrong |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend launch configuration | Hide skill access controls; keep configured-only defaults in payload if field remains | DS-001, DS-002 | Launch UX | Extend | No runtime-specific skill policy UI. |
| External channel setup | Remove skill mode from setup UI/preset form defaulting | DS-005 | Channel setup | Extend | Saved presets should use configured-only. |
| Runtime shared context | Enum/resolver without global; no zero-skill global fallback | DS-001, DS-002, DS-003 | Runtime config | Extend | Keep no-skill only if internal paths still require it. |
| Runtime prompt/materialization | Configured skills only | DS-001, DS-002 | Runtime backends | Extend | No all-registry branch. |
| Agent skill tools | Configured-only list/read/load enforcement | DS-003 | Skill tool access policy | Extend | Centralize checks in `skill-tool-access.ts`. |
| GraphQL/API contracts | Remove global enum value; normalize defaults | DS-001, DS-002, DS-005 | API transport | Extend | Regenerate frontend types. |
| Run history / metadata | Parse/store no global; migrate old data | DS-004 | Metadata stores | Extend | Avoid compatibility fallback. |
| App SDK contracts | Remove external global value | DS-001, DS-005 | Application launch | Extend | Breaking cleanup accepted. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/context/skill-access-mode.ts` | Runtime shared context | Skill exposure enum/resolver | Remove global and fix defaults | Central runtime type source | Yes |
| `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | Runtime prompt | AutoByteus skill prompt composition | Remove all-registry catalog branch | Owns prompt skill injection | Yes |
| `autobyteus-server-ts/src/agent-tools/skills/skill-tool-access.ts` | Skill tools | Runtime tool authorization | Central configured-only policy | Avoid repeated checks | Yes |
| `autobyteus-server-ts/src/agent-tools/skills/get-available-skills.ts` | Skill tools | Skill listing tool | Return configured list in runtime context | Tool-specific result formatting | Yes |
| `autobyteus-server-ts/src/agent-tools/skills/get-skill-content.ts` | Skill tools | Skill content tool | Enforce configured allowlist | Tool-specific content formatting | Yes |
| `autobyteus-server-ts/src/agent-tools/skills/load-skill.ts` | Skill tools | Skill load tool | Remove global/path allowance | Existing load tool owner | Yes |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Frontend launch | Single-agent launch UI | Remove selector | Component owns form rendering | N/A |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Frontend launch | Team launch UI | Remove selector | Component owns form rendering | N/A |
| `autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue` | Channel setup | Binding setup UI | Remove selector | Component owns form rendering | N/A |
| `autobyteus-server-ts/src/app-data-migrations/migrations/remove-global-skill-discovery-mode-migration.ts` | App-data migration | Persisted value cleanup | Rewrite old global values | One migration concern | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Skill access enum/resolver | `autobyteus-ts/src/agent/context/skill-access-mode.ts` | Runtime shared context | Used by runtime config, server tools, GraphQL, SDK-adjacent code | Yes, global value removed | Partial; full field removal deferred | A compatibility alias map for global |
| Runtime skill authorization | `autobyteus-server-ts/src/agent-tools/skills/skill-tool-access.ts` | Skill tools | List/read/load need same policy | Yes, no global branch | Yes for tool bypasses | A generic admin catalog access layer |
| Migration JSON rewrite helpers | New migration-local helpers unless reused existing store utils | App-data migrations | Existing migrations keep helpers local unless broadly useful | Yes for global persisted values | Yes | A general legacy enum compatibility layer |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SkillAccessMode` after change | Yes if limited to configured-only/internal none | Partially | Medium | Remove `GLOBAL_DISCOVERY` now; later consider deleting the field entirely. |
| `AgentDefinition.skillNames` | Yes | N/A | Low | Treat as authoritative skill allowlist. |
| Channel binding launch preset | Mostly | Partially | Medium | Stop user collection of skill mode and default configured-only. |
| Run/team metadata skill mode | Historical state only | Partially | Medium | Migrate global; do not reintroduce global fallback in parser. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/context/skill-access-mode.ts` | Runtime shared context | Skill exposure resolver | Remove `GLOBAL_DISCOVERY`; make missing/invalid mode resolve to configured-only or explicit supported internal no-skill; no zero-skill global fallback | Existing central enum/resolver | N/A |
| `autobyteus-ts/src/agent/context/agent-config.ts` | Runtime shared context | Agent config normalization | Continue using resolver; no default global when skills empty | Constructor owns runtime config normalization | Yes |
| `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | Runtime prompt | AutoByteus skill prompt | Prompt configured skills only; if none, skip or state no configured skills; remove load-skill global guidance | Existing prompt owner | Yes |
| `autobyteus-server-ts/src/agent-tools/skills/skill-tool-access.ts` | Skill tools | Authorization policy | Build configured skill set; expose helpers for list filtering and single-skill assertion; no global mode | Existing policy owner | Yes |
| `autobyteus-server-ts/src/agent-tools/skills/load-skill.ts` | Skill tools | Load tool | Allow only configured skills; reject path loads unless path resolves to a configured skill and policy explicitly supports that shape | Existing load owner | Yes |
| `autobyteus-server-ts/src/agent-tools/skills/get-available-skills.ts` | Skill tools | List tool | In agent runtime context, return configured skills only; if no configured skills, return empty list | Tool-specific output | Yes |
| `autobyteus-server-ts/src/agent-tools/skills/get-skill-content.ts` | Skill tools | Content tool | In agent runtime context, return content only for configured skill names | Tool-specific output | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Runtime backend | AutoByteus bootstrap | Pass configured skills and configured-only/default mode; no global branch | Backend-specific config assembly | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Runtime backend | Codex bootstrap | Resolve no global; materialize configured skills only | Backend-specific bootstrap | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` | Runtime backend | Codex skill materialization | Non-disabled path materializes configured skills only | Existing materializer owner | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Runtime backend | Claude bootstrap | Resolve no global; materialize configured skills only | Backend-specific bootstrap | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts` | Runtime backend | Claude skill materialization | Non-disabled path materializes configured skills only | Existing materializer owner | Yes |
| `autobyteus-server-ts/src/api/graphql/types/agent-run.ts` | API transport | Single-run launch schema | Remove global enum value exposure; keep field only if internal contract still requires it | Existing transport owner | Yes |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` | API transport | Team launch schema | Same for member input | Existing transport owner | Yes |
| `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/types.ts` | API transport | Channel setup schema | Remove global value exposure and default configured-only | Existing transport owner | Yes |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Frontend launch | Agent launch form | Remove `Skill Access` field and unused computed setter | Existing UI owner | Generated types |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Frontend launch | Team launch form | Remove `Skill Access` field and unused computed setter | Existing UI owner | Generated types |
| `autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue` | Channel setup | Binding setup form | Remove `Skill Access` field | Existing UI owner | Generated types |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | Frontend launch | Defaults | Keep hidden/default configured-only value if API still needs it | Existing defaults owner | Frontend union |
| `autobyteus-web/composables/useMessagingChannelBindingSetupFlow.ts` | Channel setup | Form flow state | Remove `showSkillAccessControl` or make unused code disappear | Existing flow owner | N/A |
| `autobyteus-web/types/agent/AgentRunConfig.ts` | Frontend types | Launch config type | Remove global from union | Existing type owner | N/A |
| `autobyteus-web/generated/graphql.ts` | Generated transport | API generated types | Regenerate after schema change | Generated output | Server schema |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-schema.ts` | Metadata parsing | Team metadata schema | Stop accepting global after migration | Existing schema owner | Runtime enum |
| `autobyteus-server-ts/src/app-data-migrations/migrations/remove-global-skill-discovery-mode-migration.ts` | App-data migrations | Legacy data cleanup | Rewrite old global values in run metadata, team metadata, channel bindings, and any duplicated projections found by implementation | One migration concern | Store utils |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | App-data migrations | Migration registration | Register new migration in startup sequence before strict readers rely on removed enum | Existing registry owner | Migration definition |
| `autobyteus-application-sdk-contracts/src/index.ts` | App SDK contract | External launch type | Remove `GLOBAL_DISCOVERY` from `ApplicationSkillAccessMode` | Existing contract owner | N/A |
| `autobyteus-application-backend-sdk/src/launch-profile.ts` | App SDK defaults | Launch profile normalization | Stop preserving global; default configured-only | Existing normalizer owner | Contract type |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts` | Application orchestration | App launch input normalization | Stop accepting/preserving global | Existing launch owner | Runtime enum |

## Ownership Boundaries

- Agent definition boundary: only this boundary owns which skills an agent is allowed to use.
- Launch UI boundary: may display/configure runtime, model, workspace, auto-approval, and context; must not expose global skill discovery or override the agent definition skill allowlist.
- Runtime backend boundary: may translate configured skills into runtime-specific prompt or filesystem shape; must not expand the set to all installed skills.
- Skill tool boundary: may consult `SkillService`, but only after applying runtime context allowlist for agent-executed tools.
- Control-plane/admin boundary: may list all installed skills for human configuration flows, but that capability must be separate from agent runtime tools.
- Migration boundary: owns old data rewrite; parsers should not carry global compatibility after migration.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Agent definition skill configuration | `skillNames` storage/resolution | Launch provisioning, team member config mapping | Launch forms selecting "all installed skills" | Add better skill assignment UI on definitions, not launch mode |
| Skill tool access policy | Configured skill set normalization and assertion | `load_skill`, `get_available_skills`, `get_skill_content` | Direct `SkillService.listSkills()` in runtime tool without filtering | Extend policy helper with list/filter methods |
| Runtime backend skill materialization | Runtime-specific folder/prompt construction | Agent run provisioning/team member bootstrap | Backend materializing all registered skills | Pass explicit configured skill list only |
| App-data migration framework | File scan/backup/write/summary | Startup migration runner | Parser accepting removed enum as fallback | Add migration coverage for missed store |

## Dependency Rules

- Launch UI may depend on generated GraphQL/frontend config types, but may not introduce skill-access policy decisions.
- Runtime backends may depend on runtime shared `SkillAccessMode` only for supported internal configured-only/no-skill semantics; they must not know about removed global behavior.
- Agent runtime tools must depend on `skill-tool-access.ts` for authorization before using `SkillService`.
- Metadata parsers may depend on the supported enum domain after migration; they must not preserve old `GLOBAL_DISCOVERY` compatibility branches.
- SDK normalization may default missing/invalid values to configured-only only if global is not preserved.
- Future control-plane skill browsing must use admin/configuration APIs, not agent runtime skill tools.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `CreateAgentRunInput.skillAccessMode` | Launch policy plumbing | If retained, accept only supported non-global values; otherwise default internally | Enum without global | Prefer making optional/defaulted in a later cleanup if feasible. |
| `TeamMemberConfigInput.skillAccessMode` | Member launch policy plumbing | Same as single run | Enum without global | Do not reintroduce team-level global override. |
| `ChannelBindingLaunchPreset.skillAccessMode` | Channel preset plumbing | If retained, store configured-only/default only | Enum without global | UI should not ask user. |
| `resolveSkillAccessMode(requestedMode, preloadedSkillCount)` | Runtime mode normalization | Normalize to configured-only/no-skill; no global fallback | string/null enum input | Missing + zero configured skills must not mean all installed skills. |
| `resolveSkillToolAccessPolicy(context)` | Runtime tool authorization | Return configured skill set and supported mode | runtime context config with `skills[]` | List/read/load must use it. |
| `SkillService.listSkills()` | Skill registry | Registry/control-plane listing | none | Agent runtime tools must filter before returning. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Agent definition `skillNames` | Yes | Yes | Low | Make it authoritative in launch/runtime docs and code. |
| `skillAccessMode` field | No, historically | Partially | Medium | Remove global now; later consider field deletion. |
| Skill tools | Yes after policy cleanup | Yes | Medium currently | Enforce configured-only before `SkillService` calls. |
| Channel binding launch preset | Mostly | Yes | Medium | Remove user skill mode and migrate old global. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `GLOBAL_DISCOVERY` | Remove | N/A | High if retained | Delete value/branches. |
| `PRELOADED_ONLY` | Configured-only behavior | Partially | Medium | Existing name is technical; keep internally for now but hide from users. |
| `AgentDefinition.skillNames` | Configured skills | Yes | Low | Use in product language as allowed/configured skills. |
| `Skill Access` UI label | Remove from normal launch | N/A | High | Remove field instead of relabeling. |

## Applied Patterns (If Any)

- Existing app-data migration pattern: migration definition with `id`, display name, `requiredOnStartup`, item details, file backups, temp-file writes, atomic rename, and summary.
- Existing runtime materializer pattern: runtime-specific workspace skill materializers receive configured skill records and write runtime-native skill folders.
- Existing tool-policy helper pattern: `skill-tool-access.ts` is already used by `load_skill`; extend it instead of duplicating policy in each tool.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/context/skill-access-mode.ts` | File | Runtime shared context | Supported skill exposure mode normalization without global | Central enum/resolver already lives here | Compatibility aliases for global |
| `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | File | AutoByteus prompt processor | Configured-only skill prompt injection | Existing owner of available skills prompt content | All-registry catalog injection |
| `autobyteus-server-ts/src/agent-tools/skills/` | Folder | Runtime skill tools | Enforced configured-only list/read/load tools | Existing skill tool grouping | Admin/control-plane skill catalog UX |
| `autobyteus-server-ts/src/app-data-migrations/migrations/` | Folder | App-data migrations | Add migration for persisted global values | Existing migration location | Runtime parser fallback logic |
| `autobyteus-server-ts/src/api/graphql/types/` | Folder | GraphQL transport | Remove global enum exposure in launch/channel/history types | Existing API schema owner | Product policy branching |
| `autobyteus-web/components/workspace/config/` | Folder | Launch forms | Remove skill access controls | Existing launch form components | Runtime access policy decisions |
| `autobyteus-web/components/settings/messaging/` | Folder | Channel setup UI | Remove skill access control in binding setup | Existing binding setup component | Agent runtime skill discovery |
| `autobyteus-application-sdk-contracts/src/index.ts` | File | SDK contract | Remove global value from external contract | Existing contract export | Deprecated global compatibility union |
| `autobyteus-application-backend-sdk/src/launch-profile.ts` | File | SDK launch defaults | Normalize without global | Existing launch profile owner | Hidden global preservation |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/skills/` | Main-Line Domain-Control | Yes | Low | Keep runtime skill tool policy near the tools it governs. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/` | Off-Spine Concern | Yes | Low | Data cleanup belongs in migration subsystem, not metadata parser fallbacks. |
| `autobyteus-web/components/workspace/config/` | Transport/UI | Yes | Low | Removing UI controls stays in existing launch form owners. |
| `autobyteus-server-ts/src/api/graphql/types/` | Transport | Yes | Medium | Transport schema must not own skill policy; only expose supported enum shape. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| General/orchestrator agent | Agent definition `General Agent` has `skillNames: [skillA, skillB, skillC]`; run exposes those skills. | Launch `General Agent` with `GLOBAL_DISCOVERY` to see all installed skills. | Keeps authority in agent configuration. |
| No configured skills | Agent definition has `skillNames: []`; runtime prompt/materializer exposes no skills. | `resolveSkillAccessMode(null, 0)` returns global discovery. | Prevents accidental all-skill access. |
| Runtime skill listing | `get_available_skills` returns only skills in `context.config.skills`. | `get_available_skills` returns `SkillService.listSkills()` unfiltered to an agent. | Avoids tool bypass. |
| Future dynamic child agent | Parent/control plane selects `skillNames[]`, then child run receives that explicit allowlist. | Child run starts in global discovery mode and decides later. | Separates catalog selection from execution access. |
| Persisted legacy value | Migration rewrites old `GLOBAL_DISCOVERY` strings to configured-only values before strict parsing. | Parser keeps accepting global and silently remaps every time. | Clean-cut removal rather than compatibility wrapper. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `GLOBAL_DISCOVERY` hidden but accepted by API | Would avoid breaking external callers | Rejected | Remove enum value; old requests fail validation. |
| Keep parser fallback mapping global to configured-only forever | Would avoid migration complexity | Rejected | Add app-data migration and strict post-migration parser. |
| Leave AutoByteus global prompt branch but remove UI option | Smaller implementation | Rejected | Delete global branch because product behavior is removed. |
| Let `get_available_skills` remain unfiltered | Smaller tool change | Rejected | Runtime tool policy must apply consistently. |
| Rename `GLOBAL_DISCOVERY` to "Advanced" | Could preserve feature with less visible confusion | Rejected | User approved removing global discovery, not relabeling it. |

## Derived Layering (If Useful)

Layer shape after the change:

1. Product configuration layer: agent definitions own skill allowlists.
2. Launch transport/UI layer: users choose operational launch settings, not skill access policy.
3. Runtime adaptation layer: configured skills are rendered into runtime-specific prompt or workspace form.
4. Runtime tool enforcement layer: agent tool calls cannot exceed configured allowlist.
5. Migration layer: old persisted enum values are removed from app data.

## Migration / Refactor Sequence

1. Add or adjust tests that capture desired behavior:
   - no global enum value in supported modes;
   - no zero-skill global fallback;
   - AutoByteus prompt does not include all registered skills;
   - skill tools filter/deny non-configured skills;
   - UI forms do not render `Skill Access`;
   - migration rewrites old global values.
2. Update `SkillAccessMode` shared enum/resolver to remove `GLOBAL_DISCOVERY` and remove the zero-configured-skills global fallback.
3. Update AutoByteus prompt processor to remove the global catalog/details/load-skill guidance branch.
4. Update skill tool policy and the three skill tools (`load_skill`, `get_available_skills`, `get_skill_content`) to enforce configured-only access consistently.
5. Update Codex/Claude/AutoByteus backend bootstrappers and materializers to remove any global handling and keep configured-skill-only materialization.
6. Update GraphQL schema/types and server launch normalization so `GLOBAL_DISCOVERY` is no longer registered or accepted.
7. Update frontend types/generated GraphQL and remove skill-access controls from agent launch, team launch, and channel binding setup; keep hidden configured-only defaults only if still required by current API input shapes.
8. Update app SDK contract and backend SDK launch-profile normalizers to remove `GLOBAL_DISCOVERY` preservation.
9. Add and register startup app-data migration for run metadata, team metadata/member trees, channel binding presets, and any duplicated projections found during implementation.
10. Update metadata parsers/schemas to stop accepting global after migration.
11. Remove stale localization keys, tests, fixtures, and references found by `rg GLOBAL_DISCOVERY` / `rg "All installed skills"`.
12. Run relevant frontend/backend tests and generated-code checks.

## Key Tradeoffs

- Removing global is a breaking cleanup for API/SDK callers that used it. This is accepted because the product decision is to simplify and enforce configured skills.
- Keeping the internal `skillAccessMode` field temporarily reduces contract churn but leaves a cleanup target. This is accepted only if `GLOBAL_DISCOVERY` is fully removed and no normal UI exposes the field.
- Data migration is more work than parser fallback, but it avoids keeping legacy compatibility branches.
- Filtering runtime skill tools may affect any workflow that used those tools as an agent-side skill catalog. That workflow should move to a control-plane/admin catalog, not agent runtime access.

## Risks

- Missed persisted `GLOBAL_DISCOVERY` values could fail strict parsing after enum removal.
- Generated GraphQL/frontend types may need coordinated regeneration to avoid type drift.
- Some tests use `NONE` as a convenient no-skill runtime setting. Implementation should preserve `NONE` internally unless intentionally removing it as a separate scoped cleanup.
- If an implementation keeps `skillAccessMode` required in GraphQL inputs, frontend defaults must still provide configured-only behind the scenes even though the field is not user-facing.
- If `get_available_skills` is also used outside agent runtime, implementation must avoid weakening runtime enforcement; use a separate admin/control-plane path if needed.

## Guidance For Implementation

- Treat `rg "GLOBAL_DISCOVERY"` as the removal checklist. After implementation, remaining matches should be limited to migration fixtures/tests documenting old-data cleanup, if any.
- Treat `rg "All installed skills"` as the UI/localization cleanup checklist.
- Prefer extending `skill-tool-access.ts` over adding per-tool bespoke checks.
- Prefer app-data migration over parser fallback for old persisted values.
- Do not add a new replacement mode such as `ALL` or `ADVANCED`; the replacement is explicit configured skills on the agent definition.
- Keep implementation changes organized by layer: shared enum/resolver, runtime behavior, tool enforcement, API/contracts, frontend UI, migration/tests.
