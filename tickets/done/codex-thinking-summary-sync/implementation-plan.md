# Implementation Plan

## Scope
- Fix Codex reasoning-summary streaming behavior so UI does not show empty thinking blocks and shows summary when present.

## Tasks
1. Backend adapter improvements
   - Update Codex runtime event adapter to suppress empty reasoning lifecycle-only events.
   - Add reasoning snapshot extraction for completion payloads.
2. Frontend handler robustness
   - Add empty-think pruning at segment end.
   - Make fallback segment creation aware of optional `segment_type`.
3. Test coverage
   - Backend unit tests for reasoning empty/snapshot mapping.
   - Frontend unit tests for fallback typing + empty-think cleanup.
4. Verification
   - Run targeted unit tests for changed areas.

## Rollback Plan
- Revert modified adapter/handler files and tests if regressions appear.
