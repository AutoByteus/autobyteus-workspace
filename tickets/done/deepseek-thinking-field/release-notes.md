# Release Notes — DeepSeek Thinking Configuration Fix

## Fixes

- Fixed the DeepSeek model configuration UI so selecting `DeepSeek / deepseek-v4-flash` no longer shows a confusing raw `Thinking` text field.
- Removed the duplicate Advanced `Thinking Type` control for DeepSeek; the basic `Thinking` toggle is now the single visible enable/disable control.
- Kept DeepSeek `Reasoning Effort` visible in Advanced as a constrained `high` / `max` dropdown.

## Improvements

- DeepSeek thinking mode is now stored as a flat `thinking_type` config value and translated by the runtime into the provider request shape `extra_body.thinking.type`.
- Disabling DeepSeek thinking no longer sends an OpenAI-style `reasoning_effort: "none"`; the runtime omits reasoning effort when thinking is disabled.
- Existing stale raw DeepSeek `thinking` config is sanitized or ignored instead of being shown as a user-editable field.

## Validation

- Verified through targeted runtime, frontend, schema, and browser E2E checks against the local AutoByteus backend/frontend.
