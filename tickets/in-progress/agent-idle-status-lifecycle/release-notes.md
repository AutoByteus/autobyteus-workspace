# Reliable Idle/Running Status Across Agent Turns

## Fixes

- Keeps completed standalone agents and team members `Idle` when delayed tool or content events from an older turn arrive.
- Prevents delayed completion/error events for an older turn from closing or reopening a newer active turn.
- Preserves late tool results and transcript content without letting that activity rewrite lifecycle status.
- Keeps live status, team-member status, focused headers, and reconnect snapshots aligned with the same backend-owned turn state.

## Runtime And Integration Improvements

- Uses authoritative turn start/completion/interruption boundaries across AutoByteus, Codex, and Claude runtime adapters instead of guessing status from activity or quiet periods.
- Adds structured `error_scope`, `error_effect`, and turn identity to runtime error events so diagnostics remain visible without incorrectly terminalizing a turn.
- Keeps accepted command acknowledgements and visible running/idle transitions correlated with the command's exact turn.

## Compatibility And Data

- Public status labels and colors are unchanged.
- Existing run history, transcripts, team/member identities, and delayed activity remain directly usable.
- No data migration or historical rewrite is required.

## Validation

- Deterministic lifecycle, WebSocket reconnect, command acknowledgement, team status, and external-channel coverage passed.
- Independent live Codex and Claude Agent SDK runs verified running-to-idle settlement, no post-idle reopen, reconnect snapshots, runtime restore, and a later reusable turn.
- Live two-member Claude teams verified bidirectional inter-agent status/receipt handling and retained both member projections across terminate, restore, and continued turns.
- Live DeepSeek-backed AutoByteus runs verified standalone lifecycle/reconnect/restore, two-member status/projection restore, and real `send_message_to` delivery with reference-file projection and reviewer response.
- Browser validation confirmed that agent and team status surfaces remain idle while delayed content stays visible.
