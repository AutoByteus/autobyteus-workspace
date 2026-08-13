# API-F-023 — AutoByteus Team live segment admission rejects the current converter payload

## Result

- API/E2E revision: `API-REV-034`
- Scenario: `API-LIVE-034-AUTOBYTEUS-TEAM-SEGMENT-001`
- Result: **Fail**
- Preliminary owner: implementation source; focused `code_reviewer` failure-origin review required
- Current HEAD: `817956ba4b097d1e9792a264ec7df839fc81a461`
- Environment: checked disposable server/frontend `127.0.0.1:60234 / 31234`, disposable SQLite/vault only

## Expected

A real Team-bound AutoByteus member must project live `SEGMENT_START`, `SEGMENT_CONTENT`, and `SEGMENT_END` events through the strict Team stream boundary without generating admission errors. The browser conversation should render the live response/tool sequence without red protocol-error cards. The same current segment identity must remain exact across native AutoByteus conversion, Team admission, Team WebSocket serialization, frontend projection, and persisted restore.

## Observed

The real imported Nested Classroom AutoByteus row completed the functional collaboration journey: exact rooted TeamRun, `get_handoff_rules`, persistent send/reply with reference, one nested task Team, task-scoped peer request/reply, exact submission, accepted review, refresh, and clean termination all succeeded. During the live Team stream, however, the browser rendered repeated red cards:

- `Rejected SEGMENT_CONTENT: segment_id is required`
- `Rejected SEGMENT_END: segment_id is required`

The captured active-state screenshot contains multiple instances while the Team task row/details are visible. This is user-visible live-stream corruption even though later persisted hydration reconstructs the completed transcript.

## Exact boundary correlation

The hash-matched built-code probe recreates the production mismatch without mocks around the competing owners:

1. `AutoByteusStreamEventConverter` receives a native segment with `segment_id=segment-real-shape` and emits the current `AgentRunEvent` payload as `{ id: "segment-real-shape", turn_id, segment_type, delta }`.
2. `AgentRunEventMessageMapper` accepts that payload for the supported standalone wire and preserves `id`.
3. `TeamAgentEventAdapter` reads only `segment_id` or `segmentId`; it rejects the same current converted event with exact code `TEAM_AGENT_EVENT_ADMISSION_FAILED` and exact message `Rejected SEGMENT_CONTENT: segment_id is required`.

The source audit shows the mismatch directly:

- producer: `autobyteus-stream-event-converter.ts` writes `payload.id`;
- Team admission: `team-agent-event-adapter.ts` requires `payload.segment_id`/`payload.segmentId`;
- standalone mapper: `agent-run-event-message-mapper.ts` preserves the converter payload, explaining why the defect is Team-specific.

This is not model/prompt behavior, fixture staleness, browser-only presentation, environment setup, or the two API/E2E durable-test corrections. The model completed the journey and the exact deterministic rejection reproduces after the built converter. No production source was edited during API-REV-034.

## Evidence

- Real browser screenshot: `failure/api-f023-autobyteus-team-segment-errors.png`
- Real browser row result: `live/browser/autobyteus-browser-row.json`
- Browser process output: `live/browser/autobyteus-browser-row.log`
- Built-code reproduction: `live/api-f023-autobyteus-segment-admission-probe.mjs`
- Built-code output: `live/api-f023-autobyteus-segment-admission-probe.log`
- Source boundary audit: `failure/api-f023-source-boundary-audit.log`
- Copied real provider traces and hashes: `live/provider-traces/`; `live/provider-traces.sha256`
- Checked environment proof: `environment/safe-target-preflight.log`, `environment/safe-server-ready.json`, `environment/server-pid-lsof.log`
- Cleanup proof: `environment/final-cleanup-verification.log`

## Stop decision

The AutoByteus Team live stream is a critical required row. API-REV-034 stops after capturing the exact failure rather than spending external-provider calls on Codex, Claude, or standalone rows that cannot convert the round to Pass. Those five fresh integrated rows and the mobile/retained lifecycle recheck remain **Not Tested** in this revision. Repository/build evidence and the successful functional portions of the AutoByteus row remain valid for the eventual rerun.

## Safety

Owned processes were stopped; ports `60234/31234` are closed; provider traces were copied; the disposable runtime/database/vault were removed. The source fixture is byte-identical. The operational database was not inspected, opened, targeted, copied, migrated, repaired, rolled back, or deleted. The protected `60004/31004` stack, delivery stash, and backup were not acted on. Both historical incident disclosures remain preserved.
