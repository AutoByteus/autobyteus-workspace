# Release Notes — Agent Team Live Output And Recovery

## Summary

This change fixes a Team streaming failure where valid Codex output was generated and persisted but did not appear live. It also closes the strict Team file-change admission mismatch found while expanding real-runtime validation.

## User-Visible Changes

- Codex responses in an Agent Team appear under the focused AgentRun without requiring a refresh.
- Refresh, history reopen, process reopen, and supported restore retain the same response without duplication.
- A detected Team stream sequence gap now fails closed and directs the user through an explicit, retryable reopen instead of silently continuing on a discontinuous stream.
- Team file writes from AutoByteus and Claude project normally instead of showing a red `file_change_id is required` Team error.

## Technical Notes

- Snapshot and live Team status messages now have distinct strict projections.
- Team stream recovery uses one persistent failed phase, exact conversation hydration, stable root checkpoints, and atomic candidate replacement.
- Team file-change adaptation validates the canonical internal payload; the WebSocket projector remains the sole snake-case wire owner.
- No compatibility reader, fallback serializer, provider-specific bypass, replay/outbox, or duplicate event path was added.

## Data And Upgrade Impact

- Existing Team and Agent history is directly usable.
- No migration, data rewrite, dependency update, lockfile update, version bump, or configuration change is required.

## Validation

- Source review: Pass.
- API/E2E: Pass / 98%.
- Current file-change selection: 3 files / 24 tests passed.
- Provider-neutral selection: 124/124 passed in the applicable prior round.
- Real browser/provider coverage includes Codex, AutoByteus, and Claude Agent SDK across Team, nested-Team, and standalone scenarios, with refresh/process-reopen/restore evidence where applicable.

## Release Status

User verification is complete and repository finalization to
`codex/agent-team-universal-task-delegation` is authorized. No tag, release,
publication, deployment, or `personal` branch action is included.
