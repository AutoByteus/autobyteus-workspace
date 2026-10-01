# Investigation Notes — chat-composer-polish

## Bootstrap

- Package identifier: `chat-composer-polish`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable`
- Branch: `codex/thinking-selector-auto-enable`
- Base: `origin/personal` @ `c8c7351e5` (fetched 2026-09-29; `personal` is the remote HEAD branch)
- Finalization target: `personal`
- Shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` was 45 commits behind and was not used for authoring.

## User Reports (2026-09-29)

1. Screenshot 1 (new-chat composer, `claude-opus-5-5` · Claude SDK): the thinking menu shows a
   "Thinking enabled: On / Off" group and a "Reasoning effort: Low … Max" group. Picking an effort
   does not turn thinking on; the user has to pick an effort *and* pick "On".
2. Screenshot 2 (new-chat composer, workspace menu open): the user cannot type to search workspaces.
3. The composer input box sits slightly too high on the new-chat page.

## Evidence — Thinking Control

- `autobyteus-web/components/chat/ChatThinkingControl.vue` is used only by `ChatNewSurface.vue`
  (grep for `ChatThinkingControl`). It renders **every** key from `getThinkingParamKeys(schema)` as an
  independent group. `setValue` (lines 148–156) routes only toggle-owned boolean keys through
  `applyThinkingToggle`. Every other key, including `reasoning_effort`, is written as
  `{ ...llmConfig, [key]: value }`, so the on/off key is left unchanged. **This is the root cause.**
- Trigger summary (`summary`, lines 133–137) shows the first choice parameter, which is `thinking_enabled`,
  so it displays "Off" even after the user picks an effort.
- The effort check mark comes from `resolveEffectiveConfigValue`, so "Medium ✓" is shown while thinking
  is Off (the schema default). That makes it look as if the effort is active.
- No component spec exists for `ChatThinkingControl` (`components/chat/__tests__` contains only
  `ChatComposer.spec.ts` and `chatComposerMenus.spec.ts`; neither references thinking).
- Adapter `autobyteus-web/utils/llmThinkingConfigAdapter.ts` detects the provider family by schema keys:
  - `claude`: `thinking_enabled` (+ `thinking_budget_tokens`, `thinking_display`, `reasoning_effort`)
  - `typed`: `thinking_type` (+ `reasoning_effort`)
  - `openai`: `reasoning_effort` (with `none`) / `reasoning_summary`
  - `gemini`: `thinking_level` / `include_thoughts`
  `applyThinkingToggle(schema, true, config)` already turns thinking on correctly for each family
  (it also fills in the Claude budget and typed effort defaults).

### Schemas where an on/off key plus dependent keys exist (the affected pattern)

| Source | Model family | On/off key | Dependent keys |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-model-normalizer.ts:39-68` | Claude SDK runtime (user's case) | `thinking_enabled` (default `false`) | `reasoning_effort` (default `medium`; SDK-reported levels) |
| `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts:9-25` | Anthropic API, budget models | `thinking_enabled` | `thinking_budget_tokens` (number) |
| same file `:27-43` | Anthropic API, adaptive models | `thinking_enabled` | `thinking_display` |
| `autobyteus-ts/src/llm/supported-model-definitions.ts:84-101` | DeepSeek V4 | `thinking_type` enabled/disabled | `reasoning_effort` (high/max) |

### Not affected (preserve as is)

- GLM-5.3 / Kimi K3: `thinking_type` enum is only `['enabled']` (always on).
- Claude Opus 5.5 on the Anthropic API: only `thinking_display` (always adaptive).
- OpenAI / Grok: `reasoning_effort` carries its own off value (`none`) or is always on.
- Gemini: `thinking_level` always applies; `include_thoughts` only controls summary visibility.

### Backend consumption (unchanged by this task)

- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-config.ts:34-47`
  maps `thinking_enabled` → `thinking: adaptive|disabled` and passes `reasoning_effort` → `effort`
  independently. The frontend decides which values are stored, so the fix is frontend-only.

### Run-config form (secondary surface)

- `autobyteus-web/components/workspace/config/ModelConfigSection.vue` shows a Thinking toggle
  (`ModelConfigBasic`). The dependent keys appear under "Advanced" (`ModelConfigAdvanced`). The
  Advanced section opens by default only when thinking is on (`shouldDefaultAdvancedOpen`). Editing an
  Advanced effort while the toggle is off has the same gap (the toggle stays off). The user did not
  report this surface.

## Evidence — Workspace Menu

- `autobyteus-web/components/chat/ChatWorkspaceMenu.vue` lists the temp workspace, then "Your workspaces"
  sorted by name, then "Open another folder…". It has **no** text input for filtering. On open, focus
  moves to the selected option. Arrow keys move between options.
- `ChatModelMenu.vue:48-96` already has the composer's search pattern: a search input focused on open,
  a `chat.model.search` placeholder, filtered results and a "no match" empty state. The workspace menu
  can reuse this visual/interaction pattern.
- Workspaces come from `useWorkspaceStore().allWorkspaces`, which is in memory. Filtering can run locally
  on the client; no backend query is needed.

## Evidence — Composer Vertical Position

- `ChatNewSurface.vue:3`: `flex flex-1 flex-col items-center justify-center px-4 pb-[14vh] pt-10`.
  The heading + subtitle + composer + hint block is centered, but the extra `14vh` of bottom padding
  moves it up by about 7vh. This is the likely cause of the "a little bit too high" report.
- In screenshot 1 the heading is at roughly 13% of the captured height and the composer at roughly 25–50%.
  Screenshots may be cropped, so the exact viewport is unknown.

## Unknowns

- The exact vertical target the user wants (a small adjustment was requested). It will be confirmed visually
  during user verification.
