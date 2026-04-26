# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/replicate-run-config-on-add/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/replicate-run-config-on-add/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/replicate-run-config-on-add/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/replicate-run-config-on-add/design-review-report.md`

## What Changed

- Added editable source-run seed helpers that deep-clone agent/team configs, nested `llmConfig` values, and member override configs while forcing `isLocked=false`.
- Replaced selected-run add actions in agent/team header views with the shared editable seed helpers.
- Updated running-panel and history-row add policies to prefer the currently selected same-definition source run before deterministic fallback templates/defaults.
- Narrowed `ModelConfigSection` to renderer/sanitizer/default behavior by removing empty-schema clearing and schema-change reset side effects.
- Moved stale `llmConfig` clearing to explicit runtime/model selection owners:
  - `RuntimeModelConfigFields`
  - `MemberOverrideItem`
  - messaging binding launch-preset model selection
- Protected launch-time context creation paths from nested config aliasing by using the same editable seed helpers.
- Added regression coverage for source immutability, selected-source preference, renderer preservation during schema absence/change, explicit clear behavior, and history model-resolution config clearing.

## Key Files Or Areas

- `autobyteus-web/composables/useDefinitionLaunchDefaults.ts`
- `autobyteus-web/types/launch/defaultLaunchConfig.ts`
- `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue`
- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `autobyteus-web/components/workspace/running/RunningAgentsPanel.vue`
- `autobyteus-web/stores/runHistoryStore.ts`
- `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue`
- `autobyteus-web/components/workspace/config/ModelConfigSection.vue`
- `autobyteus-web/components/workspace/config/MemberOverrideItem.vue`
- `autobyteus-web/composables/messaging-binding-flow/launch-preset-model-selection.ts`

## Important Assumptions

- `llmConfig` remains JSON-like model configuration data; nested arrays/objects are cloned recursively and plain object key order is normalized for stable comparisons.
- Schema absence is still ambiguous during async catalog loading, so it does not imply config invalidity.
- Explicit runtime/model changes are the authoritative signal for clearing stale model-specific config.
- If history draft creation resolves a different model than the source seed had, source `llmConfig` is treated as incompatible and cleared.

## Known Risks

- `runHistoryStore.ts` is at the source-file size guardrail after scoped edits (`500` effective non-empty lines). No broader store split was performed because the reviewed design explicitly scoped this action in the existing store.
- Runtime/model schemas that are definitively schema-less may leave non-rendered copied `llmConfig` in state until a user explicitly changes runtime/model or a known schema sanitizes it. This matches the reviewed ownership rule.
- API/E2E validation still needs to exercise actual UI add flows against realistic model-catalog loading timing.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: `ModelConfigSection.clearOnEmptySchema` and schema-change reset behavior were removed instead of retained behind compatibility flags. Changed-line deltas are below the `>220` signal; `runHistoryStore.ts` is exactly at the `500` effective-line guardrail.

## Environment Or Dependency Notes

- The worktree initially had no `node_modules`; direct `pnpm -C autobyteus-web test:nuxt ...` failed with `cross-env: command not found`.
- For local checks, I temporarily linked the existing dependency install from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, ran `pnpm -C autobyteus-web exec nuxt prepare`, then removed the temporary `node_modules` symlinks after checks.
- Attempted `pnpm -C autobyteus-web exec vue-tsc --noEmit --project tsconfig.json`; it could not run because `vue-tsc` is not installed/available in this package.

## Local Implementation Checks Run

- `pnpm -C autobyteus-web exec nuxt prepare` — passed; generated `.nuxt` types for the worktree.
- `pnpm -C autobyteus-web test:nuxt --run components/workspace/config/__tests__/ModelConfigSection.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts composables/__tests__/useDefinitionLaunchDefaults.spec.ts composables/messaging-binding-flow/__tests__/launch-preset-model-selection.spec.ts` — passed (`32` tests).
- `pnpm -C autobyteus-web test:nuxt --run components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/running/__tests__/RunningAgentsPanel.spec.ts stores/__tests__/runHistoryStore.spec.ts stores/__tests__/agentContextsStore.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts` — passed (`70` tests).
- `pnpm -C autobyteus-web test:nuxt --run stores/__tests__/agentRunConfigStore.spec.ts stores/__tests__/teamRunConfigStore.spec.ts types/agent/__tests__/TeamRunConfig.spec.ts utils/__tests__/teamRunConfigUtils.spec.ts` — passed (`33` tests).
- After the final run-history line-count compaction: `pnpm -C autobyteus-web test:nuxt --run stores/__tests__/runHistoryStore.spec.ts components/workspace/running/__tests__/RunningAgentsPanel.spec.ts` — passed (`40` tests).

## Downstream Validation Hints / Suggested Scenarios

- In the UI, select an existing codex/server model run with `llmConfig.reasoning_effort='xhigh'`, click add/new, and confirm the editable draft retains `xhigh` before and after model schema loading.
- Repeat for a team run with both global `llmConfig` and member override `llmConfig`.
- From the running panel, select a same-definition run that is not first/recent, click the group add button, and confirm the selected run is the source seed.
- From history definition-row add, confirm selected same-definition local context wins over preferred recent fallback and that a changed resolved model clears stale copied `llmConfig`.
- Change runtime/model explicitly in agent form, team global form, member override rows, and messaging binding launch preset; confirm stale model-specific config is cleared exactly once.

## API / E2E / Executable Validation Still Required

API/E2E validation remains required and is owned by `api_e2e_engineer` after code review. Suggested focus: browser-level add-flow replication under async model-catalog loading, selected-source preference in running/history panes, and no stale config after explicit runtime/model changes.
