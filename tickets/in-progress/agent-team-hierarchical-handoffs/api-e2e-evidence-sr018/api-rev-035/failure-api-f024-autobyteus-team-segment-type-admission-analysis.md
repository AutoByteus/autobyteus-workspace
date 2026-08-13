# API-F-024 — AutoByteus Team SEGMENT_CONTENT type admission failure

## Result

- Round: `API-REV-035`
- Scenario: `API-LIVE-035-AUTOBYTEUS-TEAM-SEGMENT-TYPE-001`
- Result: **Fail**
- Current HEAD: `e29625f69d2b090ab1839baccdc595fdcac03eff`
- Environment: checked disposable server/frontend `127.0.0.1:60235 / 31235`; disposable SQLite/vault only
- Preliminary owner: implementation source; focused failure-origin review required

## Expected

After IR-040, the fresh real AutoByteus Team row must admit native segment start/content/end events through the Team boundary, render live content without red protocol-error cards, retain the exact canonical segment ID, and preserve the full rooted collaboration/task/restore/termination lifecycle.

## Observed

The lifecycle itself passed: fresh rooted Team, exact persistent reference send/reply, first-level task Team, exact task peer request/reply, one exact submission, accepted review, refresh/restore, and clean termination. Browser console errors were zero.

However, the application rendered repeated red cards:

`Rejected SEGMENT_CONTENT: segment_type is required`

The row therefore failed the blocking `noTeamProtocolErrors` condition. The prior `segment_id is required` / `SEGMENT_END` errors are gone, proving IR-040 reached the real path, but live content remains rejected on the next required field.

## Exact source-boundary reproduction

A built-code probe using the real native AutoByteus content shape proves the mismatch without provider or browser variance:

1. Native `SEGMENT_CONTENT` carries `segment_id`, `turn_id`, and nested `{ delta }`; it does not repeat `segment_type` on every content event.
2. `AutoByteusStreamEventConverter` emits canonical internal `{ id, turn_id, delta }` and no `segment_type`.
3. `TeamAgentEventAdapter` requires `segment_type` on every `SEGMENT_CONTENT` and rejects with `TEAM_AGENT_EVENT_ADMISSION_FAILED`.

The new durable boundary test missed this because it fabricated a top-level `segment_type` for all three native variants. It is valid for exact `id` ownership, but insufficient for the actual native sequence/type-correlation behavior and must be corrected only after source-origin review.

## Failure classification

This is not:

- a model/prompt election issue—the required task/message lifecycle completed;
- a checked-target or secret-vault issue—the exact disposable target passed preflight/PID verification and the requested source secrets were imported only into it;
- a frontend-only presentation issue—the server-side Team adapter explicitly returned the rejection;
- the old API-F-023 identity failure—canonical `id` now passes.

Preliminary classification: **implementation-source contract defect** at AutoByteus native segment conversion / stateful Team segment admission. The approved strict internal/wire identity must remain; no alias, fallback, dual reader, or parser relaxation should be added.

## Stop decision

The critical AutoByteus Team UI row prevents Pass. Codex/Claude Team, all standalone, mobile, and remaining live rows are **Not Tested** in API-REV-035 and were not inferred from historical results. Repository/build results remain valuable and preserved.

## Evidence

- `live/browser/autobyteus-browser-row.json`
- `live/browser/autobyteus-team-run.log`
- `live/browser/autobyteus-post-refresh.png`
- `live/api-f024-autobyteus-segment-type-probe.mjs`
- `live/api-f024-autobyteus-segment-type-probe.log`
- `repository/integrated-current-server.log`
- `repository/integrated-current-web.log`
- `repository/server-build-full.log`
- `repository/web-production-build.log`
- `environment/safe-target-preflight.log`
- `environment/safe-server-ready.json`
- `environment/server-pid-lsof.log`
- `environment/secret-import-summary.log`
- `environment/final-cleanup-verification.log`

## Safety and cleanup

Owned processes were stopped; `60235/31235` were closed; provider traces and public records were copied; the main disposable runtime/database/vault were removed; and the source fixture was byte-identical. CR-F-043 later proved one owned nested SQLite journal residue remained; API-REV-036 verified and removed only that residue before any new live execution. The operational database was not inspected, opened, targeted, copied, migrated, repaired, rolled back, or deleted. Protected `60004/31004`, all four stashes, delivery backup, and automatic rollback were not acted on. Both historical incident disclosures remain preserved.
