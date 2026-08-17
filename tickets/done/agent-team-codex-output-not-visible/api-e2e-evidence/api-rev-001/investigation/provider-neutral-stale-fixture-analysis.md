# API-REV-001 provider-neutral standalone fixture adjudication

## Trigger

The optional five-file provider-neutral expansion produced `128/134` passing tests and six failures, all in `tests/integration/agent/agent-status-websocket.integration.test.ts`. The required four-file ticket server selection and 11-file web selection remain clean.

## Validity decision

`Needs Update` — API/E2E-owned durable fixture currentization; not an implementation-source finding.

The failing standalone integration file manufactures `AgentRunEventType.SEGMENT_CONTENT` payloads with retired `segment_id`, sometimes adds forbidden `segment_type` to content, never opens the segment with `SEGMENT_START`, and expects content after the turn has terminalized. Current canonical AgentRun segment admission accepts:

- start: exact `{id, turn_id, segment_type, metadata?}`;
- content: exact `{id, turn_id, delta}` only after a matching active start;
- end: exact current end fields;
- any segment after the turn is retired: diagnostic `AGENT_SEGMENT_LIFECYCLE_INVALID`, not visible content.

The actual failures are the intentional current behavior: invalid manufactured content becomes `ERROR`, coalescing sees zero accepted content, and late terminalized-turn content is rejected. The current native AutoByteus/Codex/Claude converter suites pass `117/117`, and current Team segment admission passes `10/10`; therefore no evidence points to the reviewed Team status/recovery implementation or provider source.

## Required durable correction

Currentize only `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts`:

1. open each exercised text segment with current `SEGMENT_START` carrying `id` and `segment_type`;
2. send `SEGMENT_CONTENT` with `id`, `turn_id`, and `delta` only;
3. update exact wire/canonical counts to include the start event;
4. assert post-terminal late segment content is rejected as a diagnostic `ERROR` while the live current turn remains unchanged;
5. retain the test's provider-neutral standalone status, cadence, reconnect, and current-turn assertions.

Do not change production source, add a compatibility reader, accept `segment_id`, permit content without start, or make late retired-turn content visible.
