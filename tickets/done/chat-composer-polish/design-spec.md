# Design Spec — chat-composer-polish

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline: SR-002 content of `requirements-doc.md` (REQ-001–009 incl. REQ-001a;
  AC-001–010). User approval: "go", chat, 2026-09-29.
- Behavior-defining supplements: None
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/investigation-notes.md`
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable`,
  `codex/thinking-selector-auto-enable`, from `origin/personal` @ `c8c7351e5`; finalization target `personal`.

## Current-State Read

All three items are frontend-only, inside `autobyteus-web`.

1. **Thinking.** Provider-family thinking semantics live in one owner,
   `utils/llmThinkingConfigAdapter.ts` (detect family → state → `applyThinkingToggle`). Two surfaces
   consume it:
   - the chat composer's `components/chat/ChatThinkingControl.vue` (new-chat surface only);
   - the run-config form's `components/workspace/config/ModelConfigSection.vue`.

   The adapter has no concept of "a setting that only applies while thinking is on". So both surfaces
   write effort/budget/display independently of the switch (investigation notes, "Evidence — Thinking
   Control"). This is a **missing invariant** in the adapter, not a UI bug alone.
2. **Workspace menu.** `components/chat/ChatWorkspaceMenu.vue` renders an unfiltered list. Pure filter
   helpers for composer menus already live in `components/chat/chatComposerMenus.ts` (`filterTargets`),
   and the model menu has the search-row visual pattern (`ChatModelMenu.vue:45-56`).
3. **Layout.** `components/chat/ChatNewSurface.vue:3` uses `pb-[14vh]`.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: About 8 production files plus 2 locale files and focused tests. Everything stays within
  existing owners: the thinking adapter, the chat composer components, the run-config section and locale
  messages. No new subsystem.
- Architectural risk: `Low`
- Risk rationale: No server, API, schema, persistence, runtime or ownership-boundary change. The stored
  `llmConfig` shape is unchanged; only which values the UI writes changes. The adapter gains one
  additive semantic function consumed by two existing callers. Blast radius is limited to thinking-menu
  and form interactions for switch-bearing schemas (Claude family, DeepSeek V4). Other families are
  explicitly unaffected by construction (their dependent-key list is empty).
- Escalation trigger: Return a Design Impact if the implementation finds that (a) any server/runtime
  consumer depends on `reasoning_effort` being written while thinking is off, (b) automatic
  default/sanitize emissions in `ModelConfigSection` cannot be distinguished from user edits, or
  (c) the merged list cannot represent a real schema without changing its stored values.

## Architecture Investigation Evidence

| Source | Path | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | `utils/llmThinkingConfigAdapter.ts:21-26,116-142,212-293` | `PROVIDER_KEYS`, per-family state, `applyThinkingToggle` only fills a Claude budget / typed effort when undefined | The dependent-edit rule can reuse `applyThinkingToggle(schema, true, next)` without overwriting the user's chosen value | None |
| Code read | `ChatThinkingControl.vue:148-162` | Non-toggle keys are written raw | Route every chat write through the new adapter function | None |
| Code read | `ModelConfigSection.vue:55-66,213-217,254-286` | Advanced edits and automatic sanitize/default writes both go through `emitConfig`; automatic ones pass `automatic = true` from the watchers | Intercept only the `ModelConfigAdvanced` `update:config` listener (user edits), not `emitConfig` | None |
| Code read | `ModelConfigAdvanced.vue:106-177` | Emits the whole next config (`null` when empty) | The adapter API compares previous vs next configs rather than taking a key | None |
| Code read | `chatComposerMenus.ts` | Pure, unit-tested filter helpers for composer menus | Add `filterWorkspaceOptions` there | None |
| Code read | `ChatModelMenu.vue:45-56,206-217` | Search row markup; the input is focused on open; ArrowDown moves into the list | Copy the pattern into the workspace menu | None |
| Code read | `useAnchoredPopover.ts:32` | Escape is already handled by the popover | No new Escape handling needed | None |
| Code read | `claude-session-config.ts:34-47` | The server passes effort independently of the thinking flag | Unchanged; out of scope. See Risks | Whether the SDK uses effort while thinking is disabled (existing behavior, not changed) |

## Intended Change

1. Add one adapter invariant: *editing a thinking-dependent setting while thinking is off turns thinking
   on, keeping the edited value.* Both surfaces use it.
2. Give the chat thinking menu a merged presentation for switch-bearing schemas (REQ-001a), built by a
   pure menu-model function. Add a state-aware trigger label and bulb tint.
3. Add a search row and pure filtering to the workspace menu.
4. Change the new-chat upward bias from `14vh` to `6vh`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing Behavior Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, 001a, 008 / AC-001–003, 010 | Pick an effort / budget / display in the chat menu or the Advanced form | Investigation notes: Thinking | The dependent edit auto-enables thinking | DS-001, DS-002 |
| BEH-002 | User | REQ-001a, 002 / AC-001, 004 | Open the chat menu | `ChatThinkingControl.vue:112-131` | Merged list; exactly one checked item that matches the sent value | DS-001 |
| BEH-003 | User | REQ-003 / AC-001, 004 | Look at the trigger | `ChatThinkingControl.vue:133-137` | Label "Off" / level / "On"; muted bulb when off | DS-001 |
| BEH-004 | User | REQ-004 / AC-005 | Pick Off | adapter toggle | One-click off preserved | DS-001 |
| BEH-005 | User | REQ-005, 006, 009 / AC-007, 008 | Open the workspace menu and type | `ChatWorkspaceMenu.vue` | Filtered list, keyboard flow, empty state | DS-003 |
| BEH-006 | User | REQ-007 / AC-009 | Open the new-chat page | `ChatNewSurface.vue:3` | Composer ~4vh lower | N/A (static layout) |
| Preserved | User | AC-006 | Non-switch schemas | adapter family detection | Unchanged menu and stored values | DS-001 (parameters mode) |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant`
- Refactor needed now: `No` (additive extension of the existing owner)
- Evidence: The dependent-vs-switch relationship is implied by `PROVIDER_KEYS` and `applyThinkingToggle`
  but never enforced. Each surface writes raw keys.
- Design response: Put the invariant in the adapter (the single owner of thinking semantics). Surfaces
  call it rather than re-implementing per-family rules. The chat menu-shape projection lives in a chat
  helper because it is presentation, not semantics.
- Refactor rationale: The existing owner, boundary and file placement are healthy. Only an additive
  function is needed.
- Deferrals / residual risk: Whether the Claude SDK still applies `effort` while thinking is disabled is
  existing server behavior and outside the approved scope.

## Terminology

- **Switch-bearing schema**: a thinking schema with an on/off key that can both enable and disable:
  Claude `thinking_enabled`; typed `thinking_type` whose enum contains both `enabled` and `disabled`.
- **Dependent key**: a thinking key that only applies while the switch is on.
  - Claude: `reasoning_effort`, `thinking_budget_tokens`, `thinking_display`.
  - Typed: `reasoning_effort`.
  - OpenAI / Gemini: none.
- **Merged mode**: the chat menu presentation used for switch-bearing schemas. **Parameters mode** is the
  existing per-parameter presentation, used unchanged for all other schemas.

## Legacy Removal Policy (Mandatory)

- Policy: No backward compatibility; remove legacy code paths.
- In scope: The raw-write branch in `ChatThinkingControl.setValue`/`setNumber` is replaced (every write
  goes through the adapter). The old "first choice parameter" summary is used only in parameters mode.
  In merged mode, the per-key groups for the switch key and the effort key are not rendered (the merged
  list replaces them). No wrapper keeps the old two-group rendering for switch-bearing schemas.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. `llmConfig` keys and value types are unchanged. Existing drafts and run configs
  with `{thinking_enabled: false, reasoning_effort: 'medium'}` remain valid and display as Off.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Bounded Local | BEH-001–004 | User picks an item in the chat thinking menu | `chatDraftStore.setThinkingConfig(next)` | `llmThinkingConfigAdapter` (semantics); `ChatThinkingControl` (presentation) | The main complaint |
| DS-002 | Bounded Local | BEH-001 (REQ-008) | User edits an Advanced field in the run-config form | `ModelConfigSection` `update:config` emit | `llmThinkingConfigAdapter` | Same rule on the second surface |
| DS-003 | Bounded Local | BEH-005 | User types in the workspace search | `emit('select', workspace)` | `ChatWorkspaceMenu` | Search |

## Primary Execution Spine(s)

- DS-001: `ChatThinkingControl click → buildChatThinkingMenu (model) → option.apply → adapter
  (applyThinkingToggle | applyThinkingDependentEdit) → emit('update') → chatDraftModelControls.selectThinking
  → chatDraftStore.setThinkingConfig`
- DS-002: `ModelConfigAdvanced update:config(next) → ModelConfigSection.onAdvancedConfig →
  applyThinkingDependentEdit(schema, previous, next) → emitConfig`
- DS-003: `search input (query) → filterWorkspaceOptions(options, query) → rendered options →
  Enter/click → chooseExisting | close (pending)`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Subjects | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The control asks the menu-model helper for a view of the schema and config: a merged or parameters mode, the primary options with one selected, secondary parameters, the summary label and an active flag. Each option carries the next config it produces, computed only through adapter functions. Picking an option emits that config. | thinking config, schema | adapter / control | label localization |
| DS-002 | The Advanced form emits a full next config. The section passes previous + next through the adapter. If thinking was off and a dependent key changed, the adapter returns next with thinking turned on. Automatic sanitize/default writes skip this path. | llmConfig | adapter | none |
| DS-003 | The query filters the in-memory workspace options by name/path. The list, heading and empty state render from the filtered set. The keyboard moves between the input and the options. | workspace options | menu | i18n |

## Spine Actors / Main-Line Nodes

`ChatThinkingControl`, `chatThinkingMenu.buildChatThinkingMenu`, `llmThinkingConfigAdapter`,
`ModelConfigSection`, `ChatWorkspaceMenu`, `chatComposerMenus.filterWorkspaceOptions`.

## Ownership Map

- `llmThinkingConfigAdapter.ts`: sole owner of provider-family thinking semantics. It now also owns
  which keys are dependent and the auto-enable invariant.
- `chatThinkingMenu.ts` (new): pure presentation model of the chat thinking menu (mode, options,
  selection, summary). It owns no semantics; every config transition calls the adapter.
- `ChatThinkingControl.vue`: rendering, focus, popover and emit only.
- `ModelConfigSection.vue`: form orchestration. It decides that Advanced edits are user edits and routes
  them through the adapter.
- `chatComposerMenus.ts`: pure composer-menu filtering.
- `ChatWorkspaceMenu.vue`: rendering, search state, keyboard and selection.

## Thin Entry Facades / Public Wrappers

N/A — none.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Raw `{...llmConfig, [key]: value}` writes in `ChatThinkingControl.setValue`/`setNumber` | They bypass the invariant | Option/parameter `apply` via adapter | In This Change | |
| Inline `parameters`/`summary` computeds in `ChatThinkingControl` | Moved into a testable pure model | `buildChatThinkingMenu` | In This Change | Parameters-mode output is identical to today |
| Workspace menu's focus-selected-option-on-open behavior | The search input takes initial focus | Search input focus | In This Change | Arrow keys still reach the options |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

Covered by DS-001–003 above.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Localized labels (`Off`, `On`, `Thinking`, search placeholder, no-match) | DS-001, DS-003 | components | `localization/messages/{en,zh-CN}/chat.ts` | i18n | Hard-coded English |

## Ownership Boundaries

The adapter is the authoritative boundary for any change to thinking-related `llmConfig` keys. Components
and the chat menu model must not write thinking keys except through adapter functions.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `llmThinkingConfigAdapter` | Family detection, switch keys, dependent keys, toggle defaults | `chatThinkingMenu`, `ModelConfigSection`, `MemberOverrideItem` (read) | A component checking `'thinking_enabled' in schema` or writing `thinking_type` directly | Add an adapter function |

## Dependency Rules

- `components/chat/chatThinkingMenu.ts` → `utils/llmThinkingConfigAdapter`, `utils/llmConfigSchema`
  (read helpers). It must not import Vue or stores. Labels are passed in as a translate function.
- `ChatThinkingControl.vue` → `chatThinkingMenu.ts` only (no direct adapter write calls).
- `ModelConfigSection.vue` → adapter (existing import, plus the new function).
- `ChatWorkspaceMenu.vue` → `chatComposerMenus.filterWorkspaceOptions`.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `getThinkingDependentParamKeys(schema): string[]` | schema | Dependent keys present in the schema. Empty unless the schema is switch-bearing (claude; typed with both enum values) | schema | Exported |
| `applyThinkingDependentEdit(schema, previous, next): ThinkingConfig \| null` | config transition | If `previous` is off, `next` is still off, `canEnable`, and any dependent key differs between them, return `applyThinkingToggle(schema, true, next)`. Otherwise return `next` unchanged | two configs | `Object.is` comparison per key; `null` configs are treated as `{}` |
| `buildChatThinkingMenu(schema, config, t): ChatThinkingMenu` | chat menu view | See shape below | schema + config | Pure |
| `filterWorkspaceOptions<T extends {name: string; path: string}>(items, query): T[]` | workspace options | Case-insensitive `includes` on name or path; an empty/whitespace query returns all | list + query | Pure |

`ChatThinkingMenu` shape:

```ts
type ChatThinkingOption = { id: string; label: string; checked: boolean; next: Record<string, unknown> | null }
type ChatThinkingParameter = {           // secondary (merged) or every parameter (parameters mode)
  key: string; label: string; kind: 'choice' | 'number'
  options: ChatThinkingOption[]           // choice
  value: number | ''; minimum: number | null; maximum: number | null
  applyNumber: (value: number) => Record<string, unknown> | null  // number
}
type ChatThinkingMenu =
  | { mode: 'hidden' }
  | { mode: 'merged'; title: string; primary: ChatThinkingOption[]; secondary: ChatThinkingParameter[]; summary: string; active: boolean }
  | { mode: 'parameters'; parameters: ChatThinkingParameter[]; summary: string; active: boolean }
```

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `applyThinkingDependentEdit` | Yes | Yes | Low | — |
| `getThinkingDependentParamKeys` | Yes | Yes | Low | — |
| `buildChatThinkingMenu` | Yes | Yes | Low | — |
| `filterWorkspaceOptions` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Dependent thinking keys | `getThinkingDependentParamKeys` | Yes | Low | Matches `getThinkingParamKeys` / `getThinkingToggleOwnedParamKeys` |
| Chat menu model | `chatThinkingMenu.ts` / `buildChatThinkingMenu` | Yes | Low | Matches `chatComposerMenus.ts` / `chatModelOptionText.ts` |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Turn thinking on with correct family defaults | `applyThinkingToggle` | Reuse | Already correct and does not overwrite set values |
| Effective value / default resolution | `resolveEffectiveConfigValue` | Reuse | Same as today |
| Filtering | `chatComposerMenus.ts` | Extend | Home of composer filter helpers |
| Search row visuals | `ChatModelMenu.vue` markup | Reuse (copy classes) | Consistency (REQ-009). A shared component for one duplicate row is not warranted |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine | Decision |
| --- | --- | --- | --- |
| `utils/` thinking adapter | Semantics / invariant | DS-001, DS-002 | Extend |
| `components/chat/` | Chat menus, menu models, layout | DS-001, DS-003 | Extend |
| `components/workspace/config/` | Run-config form | DS-002 | Extend |
| `localization/messages/` | Strings | — | Extend |

## Draft File Responsibility Mapping / Final File Responsibility Mapping

| File | Area | Concrete Concern |
| --- | --- | --- |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | adapter | Add `getThinkingDependentParamKeys` and `applyThinkingDependentEdit` |
| `autobyteus-web/components/chat/chatThinkingMenu.ts` (new) | chat | Pure `buildChatThinkingMenu` |
| `autobyteus-web/components/chat/ChatThinkingControl.vue` | chat | Render merged/parameters mode from the model; trigger label and bulb tint |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | config | Route `ModelConfigAdvanced` `update:config` through `applyThinkingDependentEdit` |
| `autobyteus-web/components/chat/chatComposerMenus.ts` | chat | Add `filterWorkspaceOptions` |
| `autobyteus-web/components/chat/ChatWorkspaceMenu.vue` | chat | Search row, filtered rendering, empty state, keyboard |
| `autobyteus-web/components/chat/ChatNewSurface.vue` | chat | `pb-[14vh]` → `pb-[6vh]` |
| `autobyteus-web/localization/messages/en/chat.ts`, `.../zh-CN/chat.ts` | i18n | `chat.workspace.search` = "Search workspaces" / "搜索工作区"; `chat.workspace.noMatch` = "No workspaces match “{{query}}”" / "没有匹配“{{query}}”的工作区" |
| Tests: `utils/__tests__/llmThinkingConfigAdapter.spec.ts` (extend), `components/chat/__tests__/chatThinkingMenu.spec.ts` (new), `components/chat/__tests__/ChatThinkingControl.spec.ts` (new), `components/chat/__tests__/chatComposerMenus.spec.ts` (extend), `components/chat/__tests__/ChatWorkspaceMenu.spec.ts` (new), `components/workspace/config/__tests__/ModelConfigSection.spec.ts` (extend) | tests | AC coverage |

## Reusable Owned Structures Check / Shared Structure Tightness

The `ChatThinkingOption.next` field carries the precomputed next config, so the component never computes
transitions. One meaning per field. No overlapping representations. Low risk.

## Applied Patterns

Pure view-model function + thin component (same as `chatComposerMenus.ts` / `ChatTargetMenu`).

## Target Subsystem / Folder / File Mapping

As in the file table above. No new folders. Keeping `chatThinkingMenu.ts` beside its component follows
the existing `components/chat/chat*.ts` convention.

## Folder Boundary Check

| Path | Depth | Clear | Risk | Justification |
| --- | --- | --- | --- | --- |
| `components/chat/` | Mixed Justified | Yes | Low | Existing convention for composer view-models |

## Concrete Examples / Shape Guidance

**Merged menu construction (`buildChatThinkingMenu`)**

1. `mode: 'hidden'` when `getThinkingParamKeys(schema)` is empty (same as today's `v-if`).
2. Merged when `state = getThinkingControlState(schema, config)` has `toggleOwnedKeys.length > 0`,
   `canEnable` and `canDisable`.
   - Effort enum = `schema.reasoning_effort?.enum`, when the key is dependent.
   - `primary`:
     - `{id:'off', label:t('chat.thinking.off'), checked: !state.enabled, next: applyThinkingToggle(schema, false, config)}`
     - then, if an effort enum exists, one option per level:
       `{id:level, label:humanize(level), checked: state.enabled && effectiveEffort === level, next: applyThinkingDependentEdit(schema, config, {...config, reasoning_effort: level})}`
     - otherwise `{id:'on', label:t('chat.thinking.on'), checked: state.enabled, next: applyThinkingToggle(schema, true, config)}`.
   - `secondary`: remaining dependent keys (budget number, display enum), rendered as today. Each choice's
     `next` / `applyNumber` goes through `applyThinkingDependentEdit`. Secondary choice `checked` is shown
     only while `state.enabled` (REQ-002 spirit: nothing looks active while Off).
   - `title = t('chat.thinking.title')`.
   - `summary`:
     - `!state.enabled` → `t('chat.thinking.off')`;
     - effort exists → `humanize(effectiveEffort)`;
     - else → `t('chat.thinking.on')`.
3. Otherwise parameters mode. The output must equal today's parameters/summary exactly. Choice `next` =
   the adapter toggle for toggle-owned booleans, else `applyThinkingDependentEdit(schema, config, {...config, [key]: value})`
   (which is a no-op pass-through for these families).
4. `active = state.enabled` in both modes.

**Examples (Claude SDK schema `{thinking_enabled: bool=false, reasoning_effort: enum[low..max]=medium}`)**

| Config | Primary checked | Summary |
| --- | --- | --- |
| `null` | Off | Off |
| `{thinking_enabled:false, reasoning_effort:'medium'}` | Off | Off |
| pick High → `{thinking_enabled:true, reasoning_effort:'high'}` | High | High |
| pick Off → `{thinking_enabled:false, reasoning_effort:'high'}` | Off | Off |

DeepSeek V4 (`thinking_type` enabled/disabled, effort high/max): Off · High · Max. Picking Max gives
`{thinking_type:'enabled', reasoning_effort:'max'}`. Off gives `{thinking_type:'disabled'}` (the adapter
removes effort).

Anthropic API budget model: primary Off · On; secondary "Thinking budget tokens" number. Entering 4096
while Off gives `{thinking_enabled:true, thinking_budget_tokens:4096}`.

**Trigger styling.** Bulb `Icon` gets `:class="menu.active ? '' : 'text-gray-300'"`. The label and
chevron are unchanged. In merged mode, the menu header `<p>` shows `title` above `primary`. When
`secondary` is non-empty, a `border-t border-gray-100 my-1` divider precedes it, with each secondary
label using the existing small-caption style.

**Workspace menu.**

- Insert the model-menu search row (magnifier icon + borderless input, `border-b border-gray-100 px-3 py-2`)
  as the first child of the menu container, above the scrolling listbox. It is not inside the listbox.
- `query` resets on open. On open, focus the input.
- Filter inputs:
  - temp → `{name: t('chat.workspace.temp'), path: tempWorkspace.absolutePath ?? ''}` (also match
    `t('chat.workspace.tempDescription')`);
  - user workspaces → `{name, path: absolutePath}`;
  - pending folder → `{name: folderName(p), path: p}`.
- Hide the "Your workspaces" heading when its filtered list is empty.
- When nothing remains, render
  `<p class="px-3 py-3 text-center text-[0.8125rem] text-gray-500" data-test="chat-workspace-search-empty">`
  with `chat.workspace.noMatch`.
- Input keys: `ArrowDown` → focus the first `[data-option]`; `Enter` → click the first `[data-option]`, if any.
- In the listbox `onKeydown`, `ArrowUp` on the first option → focus the input.
- `data-test="chat-workspace-search"`, `aria-label` = the placeholder text.
- The footer ("Open another folder…") and the add-folder form are unchanged. `toggle()` still resets `adding`.

**Avoided shapes.** The component must not branch on `'thinking_enabled' in schema`, and must not
duplicate the adapter's per-family rules in the menu model.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the two-group chat menu behind a flag | Lower change risk | Rejected | Merged mode replaces it for switch-bearing schemas |
| Rewrite stored drafts to drop effort while Off | "Clean" data | Rejected / N/A | Not needed: state is derived from the switch key |

## Change / Refactor Sequence

1. Adapter functions + unit tests (claude, typed with both values, typed always-on GLM (no-op), openai
   (no-op), gemini (no-op), budget preserved, user effort preserved).
2. `chatThinkingMenu.ts` + unit tests (the examples table above; parameters-mode parity for OpenAI and Gemini).
3. Refactor `ChatThinkingControl.vue` onto the model + component test (AC-001, 004, 005, trigger tint).
4. `ModelConfigSection.vue` Advanced interception + spec (AC-010; automatic default/sanitize writes do not
   auto-enable).
5. `filterWorkspaceOptions` + tests; `ChatWorkspaceMenu.vue` search + component test (AC-007, 008).
6. Locale strings (en, zh-CN).
7. `ChatNewSurface.vue` padding.
8. Run the web unit tests touching chat, config and the adapter. Render the new-chat page and check it
   visually at about 700px and about 1000px window heights.

## Key Tradeoffs

- The merged list always writes an explicit effort when turning thinking on via a level. That is intended:
  the user sees exactly what is sent.
- The search row visuals are duplicated rather than extracted into a shared component (only two uses).
  Extract later if a third menu needs it.
- 6vh is a designer judgment (optical center). The user will fine-tune it during verification.

## Risks

- Existing server behavior: with thinking off, a stored `reasoning_effort` is still passed to the Claude
  SDK as `effort`. This is unchanged and out of scope; noted for a possible follow-up.
- `ModelConfigSection` is shared by agent/team definition and application launch-profile editors.
  Auto-enable applies there too (consistent with DEC-002). Existing specs in those areas must stay green.

## Guidance For Implementation

- Keep all thinking-key transitions inside adapter functions. The menu model only composes them.
- Parameters-mode output must be unchanged for non-switch schemas (AC-006); assert this with a snapshot-like
  equality test on OpenAI and Gemini schemas.
- Use `Object.is` for value comparisons, as the adapter already does.
- Use existing `data-test` names where they exist (`chat-thinking-trigger`, `chat-thinking-menu`,
  `chat-thinking-option-<key>-<value>`). In merged mode, use `chat-thinking-option-primary-<id>`.
