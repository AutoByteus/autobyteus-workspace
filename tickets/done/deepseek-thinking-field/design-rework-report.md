# Solution Design Rework Report

## Rework Trigger

API/E2E browser validation rerouted the DeepSeek thinking-field task back to solution design with `Design Impact / Requirement Gap`. The original raw blank `Thinking` text input was gone, but the real browser UI still showed two controls for the same DeepSeek thinking enable/disable mode:

- basic `Thinking` toggle; and
- Advanced `Thinking Type` dropdown (`enabled|disabled`).

Evidence:

- API/E2E report: `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-thinking-field/tickets/deepseek-thinking-field/api-e2e-report.md`
- Browser screenshot: `/Users/normy/.autobyteus/browser-artifacts/fb85ed-1780205969002.png`

## Rework Decision

The basic `Thinking` toggle is the single authoritative user-facing DeepSeek enable/disable control. Advanced must not render a second `Thinking Type` control for DeepSeek. For DeepSeek, Advanced should render `Reasoning Effort` as the thinking-related tuning control.

The underlying runtime/user config key `thinking_type` remains valid and is still translated by `DeepSeekLLM` into `extra_body.thinking.type`, but it is a basic-toggle-owned UI key. It must be excluded from the schema projection passed to `ModelConfigAdvanced`.

## Updated Artifacts

- Requirements updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-thinking-field/tickets/deepseek-thinking-field/requirements.md`
- Investigation notes updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-thinking-field/tickets/deepseek-thinking-field/investigation-notes.md`
- Design spec updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-thinking-field/tickets/deepseek-thinking-field/design-spec.md`

## Implementation Guidance Delta

- Add an adapter-owned helper such as `getThinkingToggleOwnedParamKeys(schema)` or equivalent.
- `ModelConfigSection` should derive `advancedSchema` by excluding those toggle-owned keys before calling `ModelConfigAdvanced`.
- For DeepSeek, exclude `thinking_type` from Advanced and keep `reasoning_effort`.
- Keep `ModelConfigAdvanced` generic; do not add DeepSeek-specific hide logic there.
- Revise validation-stage `AgentRunConfigForm.spec.ts` so it asserts `select#agent-run-thinking_type` is absent rather than expected.

## Validation Expectations

A passing browser state for AutoByteus + `DeepSeek / deepseek-v4-flash` is:

- `Thinking` toggle visible;
- Advanced `Reasoning Effort` dropdown visible with `high|max`;
- no Advanced `Thinking Type` field/dropdown;
- no raw text input labelled `Thinking`;
- runtime request mapping still sends `extra_body.thinking.type` based on the toggle-owned `thinking_type` config.
