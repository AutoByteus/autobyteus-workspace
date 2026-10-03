# AutoByteus 1.4.93

## Improvements
- Fresh Agent and Team setup now starts with automatic tool approval enabled on desktop and mobile. Supported opt-out and saved settings remain available; Antigravity keeps its required automatic approval.
- Team Reload refreshes current member instructions, descriptions and tools for inspection without changing already-running conversations.

## Fixes
- Runtime failures now show useful supplied error messages in chat, including unfamiliar causes and provider hints, instead of blanket generic feedback. AGY and Claude SDK message extraction retain existing credential redaction and missing-message fallback.
- Background Team updates no longer unexpectedly cancel voice recording when the composer's destination has not changed. Manual Stop adds transcription once; sending remains explicit.
