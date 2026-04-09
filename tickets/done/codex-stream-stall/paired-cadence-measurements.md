# Paired Cadence Measurements

## Purpose

Measure native `codex app-server` raw text-delta timing and AutoByteus backend `SEGMENT_CONTENT` timing from the same long turn, then compare the two series directly.

## Method

- Start one real Codex thread through the AutoByteus server backend.
- Subscribe at the thread layer to raw app-server notifications and record timestamps for `item/agentMessage/delta`.
- Subscribe at the backend layer and record timestamps for `SEGMENT_CONTENT` events with `segment_type=text`.
- Use the same large task in the same run.
- Compute cumulative checkpoint rows and raw-to-backend dispatch-delay statistics.

## Result Summary

| Metric | Value |
| --- | --- |
| Run ID | `run-raw-vs-backend-6eb921c2-d50c-46b3-81c1-5b3824150921` |
| Model | `gpt-5.3-codex` |
| Duration | `232414ms` |
| Raw text delta count | `1004` |
| Backend text delta count | `1004` |
| Paired count | `1004` |
| Raw early avg gap | `4.8ms` |
| Raw late avg gap | `17.52ms` |
| Backend early avg gap | `4.76ms` |
| Backend late avg gap | `17.52ms` |
| Avg raw-to-backend dispatch delay | `0.0608ms` |
| p90 dispatch delay | `0ms` |
| p99 dispatch delay | `1ms` |
| Max dispatch delay | `1ms` |
| Raw gaps over 1s | `10` |
| Raw gaps over 5s | `7` |
| Backend gaps over 1s | `10` |
| Backend gaps over 5s | `7` |

## Checkpoint Table

| Count | Raw Elapsed (ms) | Raw Avg Gap (ms) | Backend Elapsed (ms) | Backend Avg Gap (ms) | Avg Dispatch Delay (ms) | p90 Delay (ms) | p99 Delay (ms) | Max Delay (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | 3598 | 36.34 | 3597 | 36.33 | 0.07 | 0 | 1 | 1 |
| 200 | 103226 | 518.72 | 103225 | 518.72 | 0.075 | 0 | 1 | 1 |
| 300 | 194722 | 651.24 | 194721 | 651.24 | 0.0767 | 0 | 1 | 1 |
| 400 | 212629 | 532.90 | 212628 | 532.90 | 0.0725 | 0 | 1 | 1 |
| 500 | 214433 | 429.73 | 214432 | 429.72 | 0.066 | 0 | 1 | 1 |
| 600 | 216237 | 361.00 | 216236 | 360.99 | 0.065 | 0 | 1 | 1 |
| 700 | 220321 | 315.19 | 220320 | 315.19 | 0.0629 | 0 | 1 | 1 |
| 800 | 220510 | 275.98 | 220509 | 275.98 | 0.0613 | 0 | 1 | 1 |
| 900 | 221624 | 246.52 | 221623 | 246.52 | 0.0611 | 0 | 1 | 1 |
| 1000 | 223440 | 223.66 | 223439 | 223.66 | 0.061 | 0 | 1 | 1 |

## Interpretation

- The raw Codex stream and the AutoByteus backend stream were effectively identical in cadence.
- The backend did not accumulate meaningful delay over time.
- The progressive slowdown and long silent gaps were already present in raw Codex notifications.
- Therefore:
  - `CodexAgentRunBackend` is not the primary source of the slowdown.
  - AutoByteus may still amplify the user-visible effect elsewhere, but this specific backend layer does not explain the stall pattern.
