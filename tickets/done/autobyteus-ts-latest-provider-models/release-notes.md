# Release Notes - Latest Provider Model Support

- Added `autobyteus-ts` catalog support for the latest verified provider models: OpenAI `gpt-5.5`, Anthropic `claude-opus-4.7`, DeepSeek `deepseek-v4-flash` / `deepseek-v4-pro`, Moonshot/Kimi `kimi-k2.6`, OpenAI `gpt-image-2`, and Gemini TTS `gemini-3.1-flash-tts-preview` / `gemini-2.5-pro-tts`.
- Updated provider request handling for Claude Opus 4.7 adaptive thinking, Kimi K2.6 tool-call workflows, OpenAI GPT Image 2 editing, and Gemini TTS runtime model mapping.
- Added focused unit/integration validation for the new catalogs and request payloads. Live OpenAI `gpt-image-2` generation/editing and OpenAI/Kimi LLM smokes passed; Anthropic, DeepSeek, and Gemini TTS live checks were recorded as provider-access/configuration skips where credentials or runtime settings were not valid.
- Updated long-lived developer docs to show the model catalog source-of-truth files and future maintenance checklist.
