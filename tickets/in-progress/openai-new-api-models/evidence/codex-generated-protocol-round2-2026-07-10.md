# Codex Generated Protocol Recheck — API/E2E Round 2

- Verified: 2026-07-10
- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models
- Command: `<binary> app-server generate-ts --experimental --out <temporary-directory>`
- Result: no generated cache-write field; no design-impact reroute.

## Binaries

| Supported binary | Resolved path | Version | Generated files |
| --- | --- | --- | ---: |
| PATH CLI | `/Users/normy/.local/bin/codex` | `codex-cli 0.144.1` | 671 |
| Codex.app resource | `/Applications/Codex.app/Contents/Resources/codex` | `codex-cli 0.144.0-alpha.4` | 671 |

## Exact generated types

Both binaries generated the same `TokenUsageBreakdown` field set:

```ts
export type TokenUsageBreakdown = {
  totalTokens: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
};
```

Both generated the same enclosing shape:

```ts
export type ThreadTokenUsage = {
  total: TokenUsageBreakdown;
  last: TokenUsageBreakdown;
  modelContextWindow: number | null;
};
```

The upstream notification is `thread/tokenUsage/updated`, with `tokenUsage: ThreadTokenUsage`. AutoByteus treats `total` as the cumulative snapshot and `last` as the provider-supplied latest delta/reconciliation source. Neither breakdown contains a cache-write field.

## Drift and write-key checks

| Check | PATH CLI | Codex.app resource |
| --- | --- | --- |
| Case-insensitive generated files matching `cache.?write`, `write.?cache`, or `cache_write` | 0 | 0 |
| `TokenUsageBreakdown.ts` SHA-256 | `5b28aaf482e581e0c552b3efc60417cf9b1107d3464e1f12849da4f0fadbe7d2` | `5b28aaf482e581e0c552b3efc60417cf9b1107d3464e1f12849da4f0fadbe7d2` |
| `ThreadTokenUsage.ts` SHA-256 | `27cae6c3e6c44696225e9a0903e0531c6eff126c6de3da2176bc5cdd904def4e` | `27cae6c3e6c44696225e9a0903e0531c6eff126c6de3da2176bc5cdd904def4e` |
| Breakdown text identical | `yes` | same comparison |
| Thread shape text identical | `yes` | same comparison |

## Source-versus-injected metadata conclusion

The current supported upstream source records are only `params.tokenUsage.total` and `params.tokenUsage.last`; the selected upstream breakdown is retained in `raw_usage_json`. Their keys are exactly:

`totalTokens`, `inputTokens`, `cachedInputTokens`, `outputTokens`, `reasoningOutputTokens`.

`raw_event_json.autobyteus_cumulative_snapshot_provider_delta_tokens` is AutoByteus-injected reconciliation metadata. Its canonical `cache_creation_input_tokens: null` entry is not a Codex-generated/source field and is not evidence that Codex emitted a write count.

Because no supported generated field exists, round 2 must retain null/no-inference/no-write-cost/no-frontend-row behavior. Temporary generated trees were removed after extracting this evidence.
