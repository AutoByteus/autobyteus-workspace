# Release Notes: Newest GLM and Kimi Built-In Models

## Summary

- Replaces active built-in GLM support with `glm-5.2`.
- Keeps `kimi-k2.6` as the general-purpose Kimi built-in model.
- Adds `kimi-k2.7-code` as the coding/agentic Kimi built-in model.
- Removes active built-in support for `kimi-k2-thinking`.

## Behavior Changes

- `new GlmLLM()` now defaults to `glm-5.2`.
- GLM model metadata now reports the GLM 5.2 token limits and exposes `thinking_type` plus `reasoning_effort` configuration.
- `GlmLLM` maps flat GLM thinking configuration into provider-native request fields and omits stale `reasoning_effort` when thinking is disabled.
- `new KimiLLM()` continues to default to `kimi-k2.6`.
- `kimi-k2.7-code` must be selected explicitly for coding/agentic Kimi workflows.
- `KimiLLM` keeps K2.6-specific tool-workflow normalization separate from K2.7 Code request normalization.

## Compatibility Notes

- Saved configs or code that reference removed built-in IDs `glm-5.1` or `kimi-k2-thinking` will no longer resolve intentionally.
- No compatibility aliases, fallback rows, or old-model wrappers were added for the removed model IDs.
- Historical run records may still contain old model IDs as history, but active built-in catalogs should not advertise them.

## Verification Summary

- GLM live integration: passed, 7 tests.
- Kimi live integration: passed, 7 tests.
- Temporary Kimi K2.6 live reasoning probe: passed.
- Unit/factory focused tests: passed, 26 tests.
- Web thinking utility tests: passed, 6 tests.
- OpenAI-compatible reasoning and Kimi stream boundary tests: passed, 13 tests.
- API/E2E Round 3 refreshed live GLM/Kimi checks after the corrected Round 5 package. Delivery integrated-state checks: `git diff --check` passed; `pnpm --dir autobyteus-ts build` passed.
