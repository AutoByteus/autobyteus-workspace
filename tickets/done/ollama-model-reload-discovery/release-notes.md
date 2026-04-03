## What's New
- Ollama local models now appear under the `OLLAMA` provider card after reload in API Key Management.

## Improvements
- Local model discovery now keeps Ollama-hosted models grouped consistently with their runtime, matching the existing LM Studio behavior.

## Fixes
- Fixed a bug where Ollama-hosted models such as Qwen were grouped under vendor buckets like `QWEN` instead of `OLLAMA`, causing `No Models Found` under the Ollama card.
