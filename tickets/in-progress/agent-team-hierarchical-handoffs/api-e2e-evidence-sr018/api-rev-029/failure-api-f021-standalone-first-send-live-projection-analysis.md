# API-F-021 — standalone first-send assistant content is absent until refresh

## Scenario

- ID: `API-LIVE-029-STANDALONE-FIRST-SEND-001`
- Runtime/model: AutoByteus / `gpt-5.6-luna`
- Surface: real Chrome -> current frontend -> first-send immutable launch promotion -> standalone Agent WebSocket -> current run projection/hydration
- Target: checked disposable API-REV-029 runtime/database only
- Result: **Product Fail; preliminary current frontend first-send/stream projection defect**

## Expected

After the browser opens the `New — API REV 029 Browser Agent` shell and sends `Reply with exactly STANDALONE_AUTOBYTEUS_OK and nothing else.`, the canonical first-send promotion must create the run and the live Agent conversation must render the exact assistant token. Reload/restore must retain the same content.

## Observed

The first send created fresh run `api_rev_029_browser_agent_52de5446d4ca4c538a866eaae3f99bb6`. The real provider completed successfully, and the public `getRunProjection` response contains the exact assistant message `STANDALONE_AUTOBYTEUS_OK`. However, the still-live workspace rendered the assistant avatar/bubble with no text. Playwright waited 240 seconds for the exact visible token and timed out. There were no browser console errors.

After a browser reload and selection of the historical run, current hydration rendered the exact token immediately. Thus backend/provider execution and persisted projection are correct, while the live first-send conversation projection is not.

## Evidence

- Empty live assistant bubble after the 240-second timeout: `live/browser/standalone-autobyteus-failure.png`
- Browser result and timeout: `live/browser/standalone-autobyteus.json`; `live/browser/standalone-autobyteus-rerun.log`
- Exact persisted assistant content: `live/browser/standalone-autobyteus-run-projection.json`
- Current reload/hydration renders the token: `live/browser/standalone-autobyteus-restored.png`; `live/browser/standalone-autobyteus-restore-inspection.log`
- The initial automation ordering issue (waiting for a run before first send) is separately disclosed and corrected in `live/standalone-runner-first-send-correction.md`; it made no provider call and is not this failure.

## Failure-origin assessment

This is not a provider, credential, prompt-election, database, target-isolation, GraphQL persistence, or locator-only failure:

1. the exact user message and assistant result exist in the public current run projection;
2. the live screen visibly contains the assistant bubble but not its content;
3. the exact locator remains absent for 240 seconds;
4. current reload/hydration renders the same persisted content;
5. browser console errors are empty.

The preliminary owner is implementation source at the standalone first-send promotion / live stream-to-conversation projection boundary. Focused `code_reviewer` failure-origin review is required before implementation work.

## Stop decision

This is a critical ordinary Agent browser journey, so API/E2E failed fast after capturing restore evidence. Fresh Codex and Claude standalone rows, selected-active-Team config browser inspection, and the real mobile reference-content journey are `Not Tested`, not passing skips. The AutoByteus/Codex/Claude imported nested-Team provider rows had already completed before this failure.

## Safety

Only the disposable API-REV-029 target was used. All owned processes/data were removed. The operational database was not inspected or acted on. Protected `60004/31004` were absent and untouched. Both historical operational-database incident disclosures remain preserved.
