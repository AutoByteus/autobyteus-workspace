## What's New

- Codex model configuration now exposes every reasoning level advertised for the selected model by the installed Codex App Server, including `max` and `ultra` when supported.

## Improvements

- Reasoning choices remain model-specific and follow the live Codex catalog order, including future non-empty effort values without requiring another AutoByteus hardcoded-list update.

## Fixes

- Fixed `max` and `ultra` disappearing from AutoByteus Codex configuration even when the selected model advertised them.
- Fixed explicitly selected advertised reasoning values being discarded before Codex `turn/start` execution.
