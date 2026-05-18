# Implementation Plan

Small-scope solution sketch:
1. Reuse the Applications card persistence pattern for boolean-only Codex full access and Streaming parser settings.
2. Remove explicit top-right save action affordance from those two cards while retaining loading/disabled safety around toggles.
3. Improve shared dirty save/check action styling so remaining manual-save cards make unsaved changes obvious.
4. Validate with targeted tests/type checks where available.
