# Codex GPT-5.6 Cache-Write Token Probe

## Status

`Complete — point-in-time runtime and protocol evidence captured on 2026-07-10`

## Scope

Determine whether the Codex app-server runtime currently emits a cache-write token count for real `gpt-5.6-sol` runs and whether AutoByteus receives but drops such a field.

Related requirements and acceptance criteria: `REQ-011`, `AC-013`, `AC-014` in `requirements.md`.

## Direct Answer

- Does the current Codex app-server token-usage event expose cache-write tokens? **No.**
- Does it expose cache-read tokens? **Yes**, as `cachedInputTokens`.
- Is AutoByteus currently dropping a cache-write field that is present in the Codex event? **No.** The raw event, generated protocol type, stored raw usage, and stored raw event contain no cache-write key.
- Can this probe prove that Codex/OpenAI performs no internal prompt-cache writes? **No.** It proves only that the current Codex app-server client contract does not expose their token count.

## Evidence 1 — Current Codex App-Server Protocol

Commands:

```bash
codex --version
codex app-server generate-ts --experimental --out <temporary-directory>
/Applications/Codex.app/Contents/Resources/codex --version
/Applications/Codex.app/Contents/Resources/codex app-server generate-ts --experimental --out <temporary-directory>
```

Observed binaries:

- PATH CLI: `codex-cli 0.144.1`.
- Codex.app resource binary: `codex-cli 0.144.0-alpha.4`.
- The live session metadata reported CLI version `0.144.0`.

Both generated protocols define the same token breakdown:

```ts
export type TokenUsageBreakdown = {
  totalTokens: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
};
```

The generated `ThreadTokenUsage` contains `total`, `last`, and `modelContextWindow`. A case-insensitive search of both generated protocol trees found no `cacheWrite`, `cache_write`, or equivalent write-cache field. Temporary generated files were removed after inspection.

## Evidence 2 — Live GPT-5.6 Sol Session

The newest inspected Codex session was originated by `autobyteus-server-ts`. Its `turn_context` selected `gpt-5.6-sol`.

The inspected `event_msg/token_count` records had the following keys in both `total_token_usage` and `last_token_usage`:

```text
cached_input_tokens
input_tokens
output_tokens
reasoning_output_tokens
total_tokens
```

No cache-write key appeared. Sample inspected events had large positive cached-read counts, proving the event was not a cache-empty trivial case. The probe selected metadata and usage only; it did not retain conversation content or secrets.

## Evidence 3 — AutoByteus Ledger

Point-in-time read-only query against:

`/Users/normy/.autobyteus/server-data/db/production.db`

Aggregate result for `runtime_kind='codex_app_server'` and `model_identifier='gpt-5.6-sol'` at the time of the probe:

| Measure | Result |
| --- | ---: |
| Ledger events inspected | 2,676 |
| Events with a reported cache-read field | 2,676 |
| Events with a positive cache-read value | 2,671 |
| Events with non-null `cache_creation_input_tokens` | 0 |
| Events whose raw usage/event JSON contained a cache-write-like key | 0 |
| Ledger ID range | 29,598–32,647 |

For the active solution-designer `gpt-5.6-sol` run, 99 ledger events were inspected at the query boundary. All 99 had null cache creation and no raw cache-write-like key; cached reads ranged from 6,912 to 304,896 tokens. The union of raw usage keys was exactly:

```text
cachedInputTokens
inputTokens
outputTokens
reasoningOutputTokens
totalTokens
```

Representative read-only query shape:

```sql
SELECT
  COUNT(*),
  SUM(CASE WHEN cache_creation_input_tokens IS NOT NULL THEN 1 ELSE 0 END),
  SUM(CASE WHEN lower(COALESCE(raw_usage_json,'')) LIKE '%cache%write%'
            OR lower(COALESCE(raw_event_json,'')) LIKE '%cache%write%'
           THEN 1 ELSE 0 END)
FROM token_usage_ledger_events
WHERE runtime_kind='codex_app_server'
  AND model_identifier='gpt-5.6-sol';
```

## Evidence 4 — Current AutoByteus Codex Adapter

`autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` maps:

- `inputTokens` -> reported gross input;
- `cachedInputTokens` -> cache-read input;
- `outputTokens` -> output;
- `reasoningOutputTokens` -> reasoning output.

It intentionally emits `cache_creation_input_tokens: null` in the provider-delta snapshot and does not place a cache-write field on `CodexReadyTokenUsageUpdate`, because the upstream protocol does not supply one. It retains the complete received records in `raw_usage_json` and `raw_event_json`.

## Technical Conclusion

The current Codex runtime boundary is **cache-read observable but cache-write unobservable**. AutoByteus is not failing to parse an available Codex cache-write value.

The direct OpenAI API runtime is different: official Responses/Chat usage contracts publish `cache_write_tokens`, so this ticket should map that field at the OpenAI-compatible API normalizer boundary.

For Codex runtime events, the implementation must:

1. keep cache creation `null`, not `0`, because absence is not proof of zero writes;
2. never infer write tokens from `inputTokens - cachedInputTokens`, because that remainder can contain both standard input and unexposed cache writes;
3. retain raw payloads for future protocol diagnosis;
4. not show a cache-write Token Meter row without a positive provider-reported count;
5. re-generate/recheck the Codex app-server protocol during API/E2E. If a future supported protocol adds a write field, that is a design-impact return requiring explicit mapping and cumulative-snapshot handling rather than a speculative alias today.

## Residual Limitation

Codex may perform internal prompt-cache writes that are not exposed through `thread/tokenUsage/updated`. Therefore AutoByteus cannot currently calculate or display a Codex cache-write component from observed data, even after GPT-5.6 cache-write prices are added to the shared model catalog. This is an upstream observability limitation, not evidence that the write count is zero.
