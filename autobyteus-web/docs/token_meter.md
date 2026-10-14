# Token Meter: Output TPS

Select an agent (including Project Task Manager, a Team/Org member, or a
delegated/collaborator copy) and open the workspace's **Token** tab. **Output
TPS** describes that exact AgentRun, not its Team or the collaborators included
in its usage/cost totals. The card shows the sample's reported runtime/model,
observation time, output count and elapsed interval.

## What the estimate measures

For two consecutive usable model-call reports in the same run, turn, runtime
and model:

```text
Output TPS = later report's normalized output tokens
             / seconds between the two server observation timestamps
```

The first report establishes a baseline; its output is not counted in the
rate. For reports at 10:00:00, 10:00:10 (200 output tokens) and 10:00:15
(150 output tokens), the readings are Collecting, 20.0 and then 30.0 tokens/s.
Input tokens are excluded. Reasoning is counted only as already included in
reported output, never added again.

This is **estimated report-interval output throughput**, not model-inference
speed or an instantaneous per-token counter. Tools, waits, prompt processing,
compaction, batching and reporting delays inside the interval affect it.
Updates arrive with usage reports; no timer extrapolates or decays the number.
It is not a cross-model benchmark.

## Reading the states

- **Collecting:** waiting for enough matching reports. A first or only report
  in a turn cannot provide a rate.
- **Estimated · Last reported:** the fixed last observation, including while
  waiting, offline or idle. The timestamp and model belong to that sample,
  not to a newly configured model. Switching runs switches the card's scope
  immediately, independently of loading usage totals.
- **Unavailable:** missing/invalid count, identity, interval or telemetry;
  saved totals alone cannot establish timing. This is not zero. A genuine
  zero-output report over a valid positive interval can display 0.0 tokens/s.

Turn/runtime/model changes and known report-continuity gaps restart collection.
Duplicate or stale revisions do not alter the reading. Context-only readings
and turn-end reconciliation are not model calls and cannot supply a numerator.
Samples exist only in the renderer session: reloading loses them; reopening
saved history does not reconstruct them from lifetime totals. The expandable
explanation is keyboard-accessible and available in English and Simplified
Chinese, as are the card's states and units.

## Runtime sources and limits

All sources require two compatible, usable reports within one turn; a provider
or runtime that omits telemetry may never produce a numeric reading. There is
no model allowlist or promise of continuous reports.

| Runtime | Source consumed through existing server normalization | Limitation |
| --- | --- | --- |
| `autobyteus` | Native completed LLM-call usage | Counts/identity depend on the provider |
| `codex_app_server` | Server-folded output delta from thread usage | Cumulative snapshots are normalized on the server; context-only updates do not count |
| `claude_agent_sdk` | Paired main-loop call usage | Excludes turn-end/subagent reconciliation; reported raw model may differ from configured alias |
| `antigravity_cli` | Completed `DONE` agent-response step usage | Delayed until the usage report; a step without usable usage cannot supply TPS |
| `grok_build` | Completed-response per-call usage | Depends on the extension/runtime providing the call report |

These are source semantics, not a claim that every runtime/model combination
has been exercised live. The [delivery evidence](../../tickets/done/token-meter-tps/api-e2e-execution-coverage-report.md)
separates adapter/fold tests, scripted transport and actual desktop rendering
from live provider inference. No paid inference was used for that validation.

## Ownership and maintenance

`tokenUsageMeterStore` observes advancing, identity-validated live exact-run
summaries through its existing standalone and Team intake methods. Its private
`tokenUsageThroughput.ts` helper holds a bounded baseline/reading per run;
revision tracking prevents Team's two effects from observing the same report
twice. It trusts canonical `meter_delta_output_tokens` and `observed_at`, not
transcripts, aggregate totals or client receipt time. Fetched summaries never
seed samples; known later unsaved calls break the sampling chain.

`useTokenUsageWorkspaceScope` projects `getRunThroughput` for the selected
target's exact `context.state.runId`. `TokenUsageThroughputCard` only formats
that state and appears outside the panel's totals-available gate. Existing
accounting, cost roll-ups, context and compaction behavior stay unchanged. No
new API, database field, history polling or provider request is needed.

See [execution architecture](agent_execution_architecture.md) and the
[server accounting contract](../../autobyteus-server-ts/docs/modules/token_usage.md).
