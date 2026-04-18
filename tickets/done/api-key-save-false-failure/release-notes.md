# Release Notes

## Fixes
- Built-in provider API-key saves (for example OpenAI) no longer show a false failure toast after a successful backend save.
- Gemini setup saves no longer flip from success into a failure toast after the save succeeds.
- Provider configured-state refresh now stays compatible with immutable hydrated provider rows, preserving the correct success path for built-in and Gemini providers.
