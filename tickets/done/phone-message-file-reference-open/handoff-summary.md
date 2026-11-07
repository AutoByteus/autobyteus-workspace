# Handoff Summary

## Summary Meta

- Ticket: `phone-message-file-reference-open` (Project Task autobyteus-427)
- Date: `2026-11-07`
- Current status: `Verified from evidence; finalized into origin/personal; no release`
- Routing: `task_size` `Small`, `architectural_risk` `Low`, route `Direct Low-Risk` (architecture review, source review and test-code review not selected: `N/A`)
- Archived ticket folder: `tickets/done/phone-message-file-reference-open/`

## Delivery Summary

- Answer to the user's question: a bug, not on purpose. The phone design (autobyteus-277 DS-008) opens a conversation's file on the phone's Files screen; the code path existed but threw on every tap.
- Delivered scope:
  - `AgentEventMonitor.vue` takes the phone navigation (`useMobileNavigation()`) in setup, on the phone only, and passes it to the lazily imported file opener as the `mobileNavigation` option, as it already did with `revealTool`.
  - `useEventMonitorFilePreview.ts` takes `mobileNavigation` from its options and no longer calls `useMobileNavigation()` itself (which ran outside setup, so `inject` returned nothing and the open threw `TypeError … reading 'query'`).
  - `useMobileNavigation.ts` exports the `MobileFileNavigation` type.
  - Tests: new real-router regression spec `AgentEventMonitor.mobileFileOpen.spec.ts`; updated opener and shell specs; new phone browser case MSP-16 in `tests/e2e/mobile-shell-probe.mjs`; baseline fix of the desktop `event-monitor-file-preview-probe.mjs` fixture.
  - Project documents: `TESTING.md` (two rules), `docs/design-cases.md` (Case 2 entry), `autobyteus-web/docs/content_rendering.md` (delivery docs sync).
- Unchanged by design: what files the phone may read (only inside the open run's workspace on this node), the status texts, the desktop open path, which paths are clickable.
- Deferred / not delivered: FU-001 (on read-only conversations the "cannot open" status line is hidden, desktop and phone; old behavior) in `follow-ups.md`.
- Removed: the opener's own `useMobileNavigation()` call and the module mocks of it in the opener specs.

## Integration

- Base checked at delivery start: `origin/personal` @ `6225a734a3`, the ticket's bootstrap base. Branch already current: no merge, no rerun needed (the API/E2E runs are on this state).
- Re-checked before the final merge: see the release/deployment report.

## Verification Summary

- Judged from the evidence by delivery (no user check needed: everything the change touches is reachable on probe-owned nodes and an isolated desktop instance).
- AC-001: phone bundle (MSP-16, API-06): tapping `draft-v3.txt` shows `DRAFT-V3-TEXT-5150: the third draft.` in the phone viewer; URL `screen=files`, `workspace=agent_ws_bdff9c…`, `file=drafts/draft-v3.txt`; Back returns to `?screen=run` with the conversation and composer. The same case fails on the base bundle (API-05) with the `TypeError` in `openFile`.
- AC-002: `AgentEventMonitor.mobileFileOpen.spec.ts` fails on the base (`expected 'run' to be 'files'`) and passes on the fix (2/2).
- AC-003: outside-workspace tap leaves the URL unchanged, opens no viewer, shows "This file is available only on the host workspace."; outside text not on the page. Remote run: boundary spec.
- AC-004: packaged desktop probe run 3, N-001 to N-009 Pass, no page errors; full `test:nuxt` 713 files, 5312 passed, 2 skipped (platform-gated, unrelated).
- API/E2E final confidence 96%, no category below 95%.
- Residual risk: the Android WebView itself was not driven (the bundle it loads was); remote-run status on the phone proven at unit level (unchanged code).

## Documentation Sync Summary

- Docs sync report: `tickets/done/phone-message-file-reference-open/docs-sync-report.md`
- Result: `Updated` (`autobyteus-web/docs/content_rendering.md`)

## Release Notes Status

- Release notes: `tickets/done/phone-message-file-reference-open/release-notes.md` (one Fixes entry), for a later release that includes this change.
- Release decision: no release. The user did not ask for one; RELEASE.md's default is "No release", and the fix ships with the next release. A beta or stable release is available on request.
