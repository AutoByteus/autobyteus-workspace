# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Post-validation requirement gap investigated; upstream artifacts refined for architecture re-review
- Investigation Goal: Determine how run configuration surfaces control `Advanced`, `Thinking`, and `Reasoning Effort`, why schema defaults are not displayed, and how the corrected UX should apply across Codex, DeepSeek, and other provider schema shapes.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Shared frontend model-config behavior affects individual-agent, team-global, and member-override surfaces; backend probing was required for Codex and DeepSeek; no backend code change currently appears necessary.
- Scope Summary: Render schema defaults as effective values, derive top-level thinking state from effective defaults across providers, and initialize advanced disclosure from effective thinking state: ON opens, OFF/unavailable collapses initially.
- Primary Questions Resolved:
  - Which component owns the `Advanced` collapse state? `ModelConfigSection.vue` owns it through `showAdvancedParams`, initialized/reset from `advancedInitiallyExpanded` in the historical code path.
  - Which component/state model owns `Thinking` and `Reasoning Effort` values? `ModelConfigSection.vue` delegates top-level thinking behavior to `llmThinkingConfigAdapter.ts` and advanced enum rendering to `ModelConfigAdvanced.vue`; parent forms hold the authoritative editable `llmConfig`.
  - Why is Codex `Reasoning Effort` blank/not medium? The advanced select display path historically used a `__default__` sentinel for unset config even when the schema provided a valid default. Because no `Default` option is rendered when schema default exists, the select can show blank/no-match.
  - Is Codex backend metadata missing? No. Live backend GraphQL reports GPT-5.5 default reasoning `medium` and enum values `low`, `medium`, `high`, `xhigh`.
  - Does backend explicit propagation work? Existing backend source and unit tests show explicit `llmConfig.reasoning_effort` maps into Codex thread config and `turn/start.effort`; unset config maps to `null`/model default.
  - Does DeepSeek also have default reasoning/thinking? Yes. Live backend GraphQL reports DeepSeek V4 Flash/Pro default `thinking_type=enabled` and `reasoning_effort=high`.
  - What was refined after the initial handoff? The user clarified that Codex default `medium` must make `Thinking` show ON and `Advanced` open; this cross-provider default-thinking rule supersedes the earlier Codex-specific recommendation to hide the top-level thinking row for effort-only schemas.

## Request Context

The user reported that in the frontend, when running either a software engineering team or one individual agent, selecting the Codex runtime and GPT-5.5 model shows `Advanced` folded by default. The `Reasoning Effort` field is only visible after clicking `Advanced`, and one user did not realize `Advanced` was clickable. The user asked whether the UI should auto-open `Advanced`, or open it when `Thinking` is toggled. The user also reported a strange behavior: the selected model label says default reasoning is `medium`, but inside the `Reasoning Effort` section `medium` is not selected.

Reference screenshots supplied by user:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_4023883c/solution_designer_85fb741cf29ca867/context_files/ctx_0b938a9bc9c2__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_4023883c/solution_designer_85fb741cf29ca867/context_files/ctx_7445bd0557f8__image.png`

Image observations:

- Image #1: `Advanced` collapsed; no `Reasoning Effort` visible.
- Image #2: `Advanced` expanded; `Reasoning Effort` select visually blank while model selector says `GPT-5.5 (default reasoning: medium)`; `Fast mode` correctly shows `Default`.
- Image #2 also shows a `Thinking` switch rendered off/gray despite the model default being a non-`none` reasoning effort.

Clarification received on 2026-06-02:

- Codex default `medium` reasoning should make the `Thinking` state ON and `Advanced` open.
- The same principle applies to DeepSeek and other providers: if the effective default has reasoning, `Thinking` should be ON; if not, OFF.
- The primary/global advanced section in agent and agent-team configuration should generally be open by default because the collapsed `Advanced` label is not discoverable enough.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git superrepo
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/reasoning-advanced-config-ux`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/reasoning-advanced-config-ux/tickets/done/reasoning-advanced-config-ux`
- Current Branch: `codex/reasoning-advanced-config-ux`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/reasoning-advanced-config-ux`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-02.
- Task Branch: `codex/reasoning-advanced-config-ux` created from `origin/personal` at `1678dc82b705d24c58b073c75f363d96b5d4cc3c`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Work must continue in the dedicated worktree above, not the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout.

## Current Repository State Note

After the initial design handoff, the working tree contains modified frontend files and downstream artifacts (`design-review-report.md`, `implementation-handoff.md`) based on the earlier interpretation. The refined user requirement changes the target behavior. In particular, any implementation/test expectation that hides or suppresses the top-level thinking row for Codex effort-only schemas is now stale. Downstream work should rework that state rather than preserve it for compatibility.

Observed modified files on 2026-06-02:

- `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue`
- `autobyteus-web/components/workspace/config/ModelConfigSection.vue`
- `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts`
- `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts`
- `autobyteus-web/components/workspace/config/__tests__/ModelConfigSection.spec.ts`
- `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`
- `autobyteus-web/utils/__tests__/llmConfigSchema.spec.ts`
- `autobyteus-web/utils/__tests__/llmThinkingConfigAdapter.spec.ts`
- `autobyteus-web/utils/llmConfigSchema.ts`
- `autobyteus-web/utils/llmThinkingConfigAdapter.ts`

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-02 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch -vv` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap repo/worktree/base discovery | Shared checkout was `personal` tracking `origin/personal`; not a dedicated task branch. | No |
| 2026-06-02 | Command | `git fetch origin --prune` | Refresh remote state before branch/worktree creation | Fetch completed successfully. | No |
| 2026-06-02 | Command | `git worktree add -b codex/reasoning-advanced-config-ux /Users/normy/autobyteus_org/autobyteus-worktrees/reasoning-advanced-config-ux origin/personal` | Create dedicated task worktree and branch | Worktree created from `origin/personal` at `1678dc82...`. | No |
| 2026-06-02 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required design guidance | Design must be spine-first, ownership-led, avoid compatibility wrappers, and classify design health. | No |
| 2026-06-02 | Command | `rg -n "Reasoning Effort|reasoning_effort|Thinking|Advanced" autobyteus-web autobyteus-server-ts autobyteus-ts -S` | Find frontend/backend reasoning paths | Found `ModelConfigSection.vue`, `ModelConfigAdvanced.vue`, `llmThinkingConfigAdapter.ts`, Codex normalizer, DeepSeek schema/source/docs, and tests. | No |
| 2026-06-02 | Code | `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | Inspect advanced collapse and thinking switch ownership | Historical behavior initialized `showAdvancedParams` from `advancedInitiallyExpanded`; validated implementation later changed primary/global sections to open whenever advanced schema existed. Post-validation clarification requires conditional disclosure from effective thinking state instead. | Yes, implement refined ON-open/OFF-collapsed disclosure and effective thinking-state policy. |
| 2026-06-02 | Code | `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue` | Inspect select/default behavior | Historical select fallback to `__default__` caused blank/no-match for schema-defaulted enum fields. Current modified version appears to add effective default helpers and should be reviewed against refined requirements. | Yes, keep schema-default display fix. |
| 2026-06-02 | Code | `autobyteus-web/utils/llmConfigSchema.ts` | Inspect normalization/default validation owner | Existing file owns schema normalization and config sanitization; current modified version adds `getValidSchemaDefault` and `resolveEffectiveConfigValue`, which is the right owner for default display. | Yes, ensure helpers remain provider-neutral and tested. |
| 2026-06-02 | Code | `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Inspect provider thinking mapping | Existing file owns provider/schema thinking-key mapping. Current modified version has `hasThinkingToggleSupport` that returns false for Codex effort-only schemas, causing stale behavior under clarified requirements. | Yes, split effective thinking state from disable-capability. |
| 2026-06-02 | Code | `autobyteus-web/components/workspace/config/ModelConfigBasic.vue` | Inspect basic switch capabilities | The component renders a simple switch with one `disabled` prop. It may need a separate read-only/non-disable-capable state or helper text to show ON without allowing unsupported OFF. | Yes, optional small prop extension may be needed. |
| 2026-06-02 | Command | `curl -sS -H 'Content-Type: application/json' --data '{...runtimeKind:"codex_app_server"...}' http://127.0.0.1:29695/graphql` | Probe live Codex model schema | GPT-5.5 reports `reasoning_effort.default_value/default = "medium"`, enum `low, medium, high, xhigh`, and `service_tier.default_value` absent/enum `fast`. | No backend metadata fix needed. |
| 2026-06-02 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` | Verify Codex metadata mapping | App-server model list default/supported reasoning metadata is mapped into schema default and display label. | No |
| 2026-06-02 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` and `codex-thread.ts` | Verify explicit Codex effort propagation | Explicit `llmConfig.reasoning_effort` maps to Codex thread config and `turn/start.effort`; unset config maps to `null`. | No |
| 2026-06-02 | Command | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/codex-app-server-model-normalizer.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | Backend regression check | 15 Codex backend tests passed. | Re-run after backend changes only; none expected. |
| 2026-06-02 | Setup | `pnpm install --offline`; `pnpm -C autobyteus-web exec nuxt prepare` | Prepare frontend test environment | Offline install succeeded; Nuxt prepare required before direct Vitest. | Downstream implementation should preserve this setup note. |
| 2026-06-02 | Command | `pnpm -C autobyteus-web exec vitest run components/workspace/config/__tests__/ModelConfigSection.spec.ts` | Baseline frontend component test after setup | Existing ModelConfigSection suite passed before refined requirement change. | Downstream tests must be updated for refined expectations. |
| 2026-06-02 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Inspect DeepSeek schema source | `deepseekV4Schema` defines `reasoning_effort` default `high`, enum `high|max`; `thinking_type` default `enabled`, enum `enabled|disabled`; Flash/Pro use this schema. | No backend schema fix needed. |
| 2026-06-02 | Code | `autobyteus-ts/src/llm/api/deepseek-llm.ts` | Inspect DeepSeek provider request mapping | `normalizeDeepSeekExtraParams` maps flat `thinking_type` to `extra_body.thinking.type`; deletes `reasoning_effort` when `thinking_type=disabled`. | Ensure frontend OFF emits provider-correct config only when schema supports it. |
| 2026-06-02 | Doc | `autobyteus-ts/docs/provider_model_catalogs.md` | Verify documented DeepSeek behavior | Docs state DeepSeek enable/disable is owned by the basic Thinking toggle and Advanced renders `reasoning_effort`. | Align frontend behavior with docs. |
| 2026-06-02 | Command | `curl -sS -m 5 -H 'Content-Type: application/json' --data '{"query":"query($runtimeKind:String){ availableLlmProvidersWithModels(runtimeKind:$runtimeKind){ provider{ id name providerType } models{ modelIdentifier name configSchema } } }","variables":{"runtimeKind":"autobyteus"}}' http://127.0.0.1:29695/graphql` plus Python filter for DeepSeek | Probe live AutoByteus DeepSeek schema | Live GraphQL returns `deepseek-v4-flash` and `deepseek-v4-pro` with `thinking_type.default="enabled"` and `reasoning_effort.default="high"`. | No backend schema fix needed. |

## Current Frontend Path Details

### Component Flow

- `RunConfigPanel.vue` chooses the run form surface.
- `AgentRunConfigForm.vue` and `TeamRunConfigForm.vue` compose runtime/model fields through `RuntimeModelConfigFields.vue`.
- `RuntimeModelConfigFields.vue` resolves the selected model schema and passes it to `ModelConfigSection.vue`.
- `ModelConfigSection.vue` decides whether to show the top-level `Thinking` row, whether to filter toggle-owned keys from advanced schema, and whether the advanced section is expanded.
- `ModelConfigAdvanced.vue` renders per-parameter controls and emits explicit config changes.

### Historical Failure Shape

1. User selects Codex App Server + GPT-5.5.
2. Backend schema contains `reasoning_effort.default = "medium"`.
3. Parent config has no explicit `llmConfig.reasoning_effort`.
4. `ModelConfigSection.showAdvancedParams` is false because this is an editable launch config.
5. User may not discover `Advanced` or the reasoning field.
6. If user expands `Advanced`, `ModelConfigAdvanced` selects `__default__` even though the real default is `medium`; the template does not render a `Default` option for schema-defaulted enum fields, so the select appears blank/no-match.
7. Top-level `Thinking` reads unset config as OFF even though the model default is reasoning ON.

## Backend / Runtime Findings

### Codex

- Source: `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts`
- The normalizer builds model display names such as `GPT-5.5 (default reasoning: medium)` and emits a parameter schema with `reasoning_effort.default_value = "medium"`.
- Source: `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`
- Explicit `llmConfig.reasoning_effort` is resolved into `CodexThreadConfig.reasoningEffort`; absent config remains `null`.
- Source: `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread.ts`
- Turn-start payload includes `effort: this.config.reasoningEffort ?? null`.
- Conclusion: backend is correctly exposing and using metadata/explicit overrides for current behavior. The frontend should display effective default state without forcing config materialization.

### DeepSeek

- Source: `autobyteus-ts/src/llm/supported-model-definitions.ts`
- `deepseekV4Schema` defines:
  - `reasoning_effort`: default `high`, enum `high|max`.
  - `thinking_type`: default `enabled`, enum `enabled|disabled`.
- `deepseek-v4-flash` and `deepseek-v4-pro` use this schema.
- Source: `autobyteus-ts/src/llm/api/deepseek-llm.ts`
- `normalizeDeepSeekExtraParams` deletes flat `thinking_type`, maps it to `extra_body.thinking.type`, and deletes `reasoning_effort` when thinking is disabled.
- Live GraphQL confirmed the same schema for AutoByteus runtime.
- Conclusion: DeepSeek is an explicit cross-provider example where unset config should show `Thinking = ON` and `Reasoning Effort = high` because the schema defaults say so. Unlike current Codex GPT-5.5, DeepSeek is disable-capable through `thinking_type=disabled`.

## Refined Behavior Model

### Effective Value Rule

For any model-config parameter:

1. A valid explicit `llmConfig[key]` wins.
2. Otherwise a valid schema default wins.
3. Otherwise the field is unset and may use the existing `Default` sentinel UI only when no schema default exists.

This rule is provider-neutral and belongs in `llmConfigSchema.ts` / `ModelConfigAdvanced.vue`.

### Effective Thinking State Rule

For the top-level `Thinking` row:

1. Use explicit config first where present.
2. Otherwise use valid schema defaults.
3. Interpret provider-specific no-thinking values as OFF:
   - OpenAI/Codex: `reasoning_effort="none"` and/or `reasoning_summary="none"` where advertised.
   - DeepSeek/GLM: `thinking_type="disabled"`.
   - Claude: `thinking_enabled=false`.
   - Gemini: `include_thoughts=false` and/or `thinking_level="minimal"` depending on schema shape.
4. Interpret provider-specific reasoning defaults as ON:
   - Codex GPT-5.5: `reasoning_effort="medium"`.
   - DeepSeek V4 Flash/Pro: `thinking_type="enabled"` with effort default `high`.
   - Equivalent positive defaults for other providers.

This rule belongs in `llmThinkingConfigAdapter.ts` and must not be model-name hardcoded.

### Disable Capability Rule

A model may have `Thinking = ON` by effective default but not support frontend disable. For example, Codex GPT-5.5 currently exposes effort levels but no `none`/OFF value. The UI must not emit unsupported OFF config for such models. The adapter should separately answer:

- `hasThinkingSupport(schema)`: there is a reasoning/thinking state to display.
- `getEffectiveThinkingState(schema, config)`: display ON/OFF from explicit/default values.
- `canDisableThinking(schema)`: schema exposes a valid OFF representation.
- `applyThinkingToggle(schema, enabled, config)`: may only mutate config when the target state is supported.

## UX Findings / Decisions

- Primary/global agent and team config should follow the post-validation disclosure rule: if effective `Thinking` is ON, open advanced by default; if effective `Thinking` is OFF or unavailable, keep advanced collapsed initially while preserving the `Advanced` affordance.
- Compact team member override cards remain collapsed by default to avoid large forms, including when inheriting global `Thinking` ON; displayed/effective values must still sync when expanded or summarized without materializing overrides.
- Toggling a supported thinking switch from OFF to ON should open advanced settings so users can see related effort/level controls; toggling OFF after inspection should not be required to auto-collapse.
- A non-disable-capable ON thinking state should be visually distinct enough to avoid implying the switch can turn OFF. Acceptable implementation shapes include a disabled ON switch plus helper text, or a read-only ON status row using the same visual affordance family. The key invariant is no false OFF state and no unsupported OFF payload.

## Test / Validation Notes For Downstream

Recommended frontend coverage:

- `llmConfigSchema` helper tests for explicit value vs valid schema default vs sentinel fallback.
- `llmThinkingConfigAdapter` tests for:
  - Codex/OpenAI effort-only schema default `medium` => effective ON, not disable-capable.
  - OpenAI schema with `none` => disable-capable and OFF when explicit/default `none`.
  - DeepSeek default `thinking_type=enabled` + `reasoning_effort=high` => effective ON and disable-capable.
  - DeepSeek explicit `thinking_type=disabled` => OFF and no stale effort emitted.
  - Gemini/Claude/GLM representative defaults if existing tests cover those providers.
- `ModelConfigSection` tests for:
  - Primary/non-compact advanced opens by default only when effective thinking is ON.
  - Codex GPT-5.5 visible ON thinking state and `medium` effort default.
  - DeepSeek visible ON thinking state and `high` effort default.
  - No-thinking or thinking-OFF defaults render OFF with advanced collapsed initially.
  - Supported toggle from OFF to ON opens advanced.
  - Compact/member override inheritance syncs effective state/value display while remaining collapsed by default and without materializing explicit config.
- `AgentRunConfigForm` and `TeamRunConfigForm` parity tests for primary/global paths.

Recommended backend coverage:

- Existing Codex normalizer/bootstrapper tests should continue to pass.
- Existing or new DeepSeek adapter tests should confirm `thinking_type=disabled` omits `reasoning_effort`, but no backend change is expected for this frontend UX issue.

## Open Risks / Unknowns

- Codex no-OFF semantics: if product expects users to truly turn off GPT-5.5 reasoning, the backend/Codex model schema must advertise a supported OFF value. Frontend cannot safely infer one.
- Read-only selected-run metadata: historical missing `llmConfig` should remain guarded to avoid representing inferred defaults as recorded historical config.
- Disclosure: collapsing advanced for OFF/no-thinking defaults restores compactness but makes the `Advanced` affordance important; implementation should ensure the collapsed control remains visibly clickable.

## Provider-Wide Follow-Up Investigation (2026-06-02)

After the user asked whether the refined design covers other providers, I ran a broader inventory of the live GraphQL model catalogs for all runtime kinds (`autobyteus`, `codex_app_server`, `claude_agent_sdk`) and re-read the relevant local provider schema/adapters.

Additional commands/sources:

- `python3`/`urllib.request` GraphQL query against `http://127.0.0.1:29695/graphql` for `availableLlmProvidersWithModels(runtimeKind)` with runtime kinds `autobyteus`, `codex_app_server`, and `claude_agent_sdk`.
- `autobyteus-ts/src/llm/supported-model-definitions.ts`
- `autobyteus-ts/docs/provider_model_catalogs.md`
- `autobyteus-ts/src/llm/api/anthropic-llm.ts`
- `autobyteus-ts/src/llm/api/gemini-llm.ts`
- `autobyteus-ts/src/llm/api/glm-llm.ts`
- `autobyteus-ts/src/llm/api/kimi-llm.ts`
- `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-model-normalizer.ts`

### Schema-Backed Provider Coverage Matrix

| Runtime / Provider Shape | Live / Source Schema Defaults | Correct Default UI State | Design Coverage Decision |
| --- | --- | --- | --- |
| Codex App Server OpenAI/Codex | `reasoning_effort=medium` or `high`; no `none` enum | `Thinking = ON`; effort displayed; OFF non-disable-capable | Covered by effective default + disable-capability split. |
| AutoByteus OpenAI Responses | `reasoning_effort=none`, `reasoning_summary=none` | `Thinking = OFF`; primary/global advanced collapsed initially | Covered by OpenAI `none` rule plus post-validation disclosure rule. |
| AutoByteus DeepSeek V4 | `thinking_type=enabled`, `reasoning_effort=high` | `Thinking = ON`; `Reasoning Effort = high`; OFF emits `thinking_type=disabled` | Covered. |
| AutoByteus Claude standard | `thinking_enabled=false`, `thinking_budget_tokens=1024` | `Thinking = OFF`; primary/global advanced collapsed initially; budget is advanced default when expanded | Covered if Claude boolean gate is used. |
| AutoByteus Claude Opus 4.7 adaptive | `thinking_enabled=false`, `thinking_display=omitted` | `Thinking = OFF`; primary/global advanced collapsed initially; display mode is advanced default when expanded | Design updated to call out `thinking_display` as advanced/non-toggle-owned. |
| Claude Agent SDK dynamic | `thinking_enabled=false`, `reasoning_effort=medium` | `Thinking = OFF`; primary/global advanced collapsed initially; effort is an advanced depth default only | Design update needed and added: `thinking_enabled` must gate mixed schemas before `reasoning_effort`; do not classify this as OpenAI. |
| AutoByteus Gemini API | `thinking_level=minimal`, `include_thoughts=false` | `Thinking = OFF`; primary/global advanced collapsed initially | Covered by Gemini minimal/false rule plus post-validation disclosure rule. |
| AutoByteus Gemini browser/RPA | `thinking_level=medium`; enum includes `minimal` | `Thinking = ON`; OFF can use `minimal` if supported | Design update added explicit single-key Gemini coverage. |
| AutoByteus GLM | `thinking_type=enabled`; enum includes `disabled` | `Thinking = ON`; OFF supported by `disabled` | Covered; tests should include GLM. |

### Catalog Rows Without Machine-Readable Thinking Metadata

The live AutoByteus catalog also includes model rows whose model/display names contain `thinking` or `reasoning` but whose rows expose no config schema/default metadata, for example:

- Built-in `grok-4-1-fast-reasoning`.
- Built-in `kimi-k2-thinking`.
- Local/custom/RPA models such as `gpt-5-thinking-rpa`, `kimi-latest-thinking-rpa`, `ring-1t-thinking-rpa`, `zhipu-glm-4.6-thinking-rpa`.
- LM Studio local models such as `qwen3-next-80b-a3b-thinking` or `*-reasoning*` variants.

Conclusion: the refined frontend schema-default design cannot generically prove default thinking state for these rows because there is no authoritative metadata. Inferring from model names would be brittle and violates the source-of-truth boundary. The revised design now makes this explicit: the frontend should not show a guessed `Thinking = ON` from names; if product wants those models to show default thinking state, their provider/catalog owner must expose machine-readable schema/default metadata or a future explicit model-level capability/default field.

### Additional Implementation Warning

The currently modified `llmThinkingConfigAdapter.ts` detection order checks `reasoning_effort` before `thinking_enabled`. That is unsafe for Claude Agent SDK dynamic schemas (`thinking_enabled=false` + `reasoning_effort=medium`): it would classify them as OpenAI-style and could show thinking ON or emit OpenAI-style OFF values incorrectly. The design now requires provider-shape precedence/gating: if `thinking_enabled` exists, it owns ON/OFF state and `reasoning_effort` is only depth.


## Post-Validation Requirement Gap Investigation (2026-06-02)

Source: `/Users/normy/autobyteus_org/autobyteus-worktrees/reasoning-advanced-config-ux/tickets/done/reasoning-advanced-config-ux/post-validation-requirement-clarification.md`

API/E2E validation passed under the previously reviewed criteria, but the user clarified a different disclosure journey after validation:

1. Effective `Thinking` ON by default -> primary/global `Advanced` open by default.
2. Effective `Thinking` OFF by default -> primary/global `Advanced` collapsed initially.
3. User toggles `Thinking` ON -> `Advanced` opens automatically.

This is a requirement gap/design impact because the validated implementation currently opens primary/global advanced settings whenever the selected model has advanced schema parameters, including OpenAI Responses, Claude, Gemini API, and non-thinking advanced schemas whose effective thinking state is OFF or unavailable.

### Revised Disclosure Conclusions

- `ModelConfigSection` remains the correct owner for disclosure state.
- `shouldDefaultAdvancedOpen` should no longer be `hasAdvancedSchema && compact !== true` for primary/global sections.
- The target initial rule is:
  - explicit `advancedInitiallyExpanded=true` still opens;
  - missing historical config guard still wins;
  - primary/global/non-compact opens only when `thinkingControlState.supported && thinkingControlState.enabled`;
  - primary/global/non-compact collapses when `thinkingControlState.enabled` is false or thinking is unsupported;
  - compact/member sections collapse by default regardless inherited global ON state.
- `usesAdvancedDisclosure` should exist for any `hasAdvancedSchema`, including non-thinking schemas, so OFF/no-thinking advanced fields are hidden behind the `Advanced` affordance initially instead of rendering directly.
- A supported user toggle from OFF to ON should set `showAdvancedParams=true`.
- A user toggle from ON to OFF need not auto-collapse; preserving the user's visible context avoids hiding controls mid-edit.

### Member Override Conclusions

- Member effective runtime/model/config display should sync with global inherited state when the member is not overridden.
- Disclosure state is not an inherited value and should not blindly sync from global.
- Member advanced controls remain collapsed by default to avoid expanding all members.
- Explicit member-local actions can open that member's controls:
  - toggling member `Thinking` ON;
  - explicitly selecting a member runtime/model whose effective thinking state is ON.
- Expanding member controls or displaying inherited/default values must not materialize `memberOverrides` or inherited/default `llmConfig`.

## Delivery Pause Confirmation (2026-06-02)

Source: `/Users/normy/autobyteus_org/autobyteus-worktrees/reasoning-advanced-config-ux/tickets/done/reasoning-advanced-config-ux/delivery-pause-reroute-report.md`

Delivery confirmed the same Requirement Gap / Design Impact and paused repository finalization. No commit, push, merge, archival, deployment, or cleanup was performed. Delivery's base refresh found `origin/personal @ 1678dc82b705d24c58b073c75f363d96b5d4cc3c` unchanged, so the ticket branch was not rebased or merged before reroute. Delivery-owned durable docs edits prepared under the superseded always-open rule were reverted; long-lived docs sync is blocked until this refined design is implemented and revalidated.

Implication for downstream: after architecture review approves this refined design, implementation must rework the current validated frontend changes, then the package must go through implementation, code review, API/E2E validation, and delivery again. Delivery docs should document the final conditional disclosure rule only after revalidation.
