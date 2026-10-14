# Token Meter: TPS

Select an agent (including Project Task Manager, a Team/Org member, or a
delegated/collaborator copy) and open the workspace's **Token** tab. The **TPS**
card shows how fast that exact AgentRun's latest model call generated output:
the value in tokens/s and the model that call reported. It never describes a
Team or the collaborators included in the usage/cost totals below it.

## What the number measures

Each model call is timed on the server by the runtime integration that runs it,
and the call's own usage event carries its TPS:

```text
TPS = the call's reported output tokens / the call's measured duration in seconds
```

The output count is the one the platform already accounts. Reasoning counts
only as already included in reported output, never added again. Two methods
exist, and every reading is labelled with one:

- **Generation speed** (default; no label): from the call's first streamed
  response event to its end. Used only when that first event provably precedes
  all of the call's generation, hidden reasoning included. It excludes the wait
  for the first token and all tool time.
- **End-to-end call speed** (labelled "incl. time to first token"): from the
  call's request, or a provider-reported call duration, to its end. It includes
  queueing, prompt processing and the wait for the first token, so it reads
  lower than generation speed, but it never inflates.

A turn with a single model call gets a reading. Calls with fewer than 20 output
tokens or a duration under 0.25 s carry no TPS and leave the shown value
unchanged; this skips tool-call-only and "OK" calls. A call whose runtime gives
no usable timing or count also carries none. The browser computes no rate and
no method; it only divides the server's tokens by the server's duration for
display.

## Reading the card

- **Value + model:** the newest TPS received for the selected run. It stays
  until a newer qualifying call arrives: no decay, no timer, including while
  idle or offline.
- **"—":** no reading has been received for this run in this browser session.
  This includes after a page reload and for history runs: TPS is real time and
  is not stored anywhere.
- **How TPS is measured** (collapsed, keyboard accessible): the reading's method
  in plain words with its output tokens and seconds.

Switching the selected run switches the card immediately. Duplicate or replayed
usage reports never create or change a reading. The card and help are available
in English and Simplified Chinese.

## Methods per runtime

| Runtime | Method | Start → end, as the server observes it | Limits |
| --- | --- | --- | --- |
| `autobyteus` | Generation when the first streamed chunk carried reasoning, or the call reports 0/no reasoning tokens; otherwise end to end | First chunk with content, reasoning or tool-call data → final chunk; end to end: request sent → final chunk | A provider that hides reasoning **without** reporting a reasoning count would read high. A response delivered as one chunk, or a generation window under 0.25 s, uses end to end |
| `claude_agent_sdk` | Generation | Main-loop `message_start` → `message_delta` receipt (before the SDK context read) | No reading without a paired `message_start`; subagent frames are ignored |
| `codex_app_server` | End to end | The call's request boundary (turn start, the previous call's end, any completed item such as user input, compaction or a tool, or the server's approval reply) → the call's `rawResponse/completed` | Codex does not prove when hidden reasoning starts, so generation speed is never claimed. A tool-ending call's usage update arrives only after the tool, so the reading is paired with that update (matching output count) and shows when it arrives; its value excludes tool and approval time. Compaction updates carry no TPS |
| `antigravity_cli` | Generation when AGY reports `thinking_tokens` = 0; otherwise end to end | First `text_delta` of the step → step `DONE`; end to end: AGY's own step `duration_seconds` | A burst-delivered or single-update step uses the provider duration. AGY's reported output already includes its thinking tokens (observed live), so thinking is not added again |
| `grok_build` (and other ACP runtimes) | End to end | Prompt sent, the previous call's usage, or a finished tool → the call's usage report | Chunks arrive in bursts, so chunk times are not used. The first call of a session may include CLI setup time |

These are the methods the integrations implement, not a claim that every
runtime/model combination has been exercised live.

## Ownership and maintenance

Each runtime integration reports `output_throughput { method, output_tokens,
duration_ms }` with its call's usage. The server's run-side
`acceptModelCallThroughput` (`agent-execution/domain/model-call-throughput.ts`)
is the only validity and minimum-sample check; it runs when the run's canonical
usage event is created, before and independent of accounting, which never reads
the field. The existing standalone, Team, Org and collaboration streams carry the
field to the exact run.

`tokenUsageMeterStore` records the newest TPS per run in both live intakes right
after the seen-key de-duplication, independent of the run summary (so TPS still
shows when persistence fails). Its private `tokenUsageThroughput.ts` holds that
session-local map. `useTokenUsageWorkspaceScope` reads `getRunTps` for the
selected target's exact `context.state.runId`, and `TokenUsageThroughputCard`
only formats it, outside the panel's totals-available gate. Accounting, cost
roll-ups, context, compaction and persisted data are unchanged. No new API,
database field, history polling or provider request is involved.

See [execution architecture](agent_execution_architecture.md) and the
[server accounting contract](../../autobyteus-server-ts/docs/modules/token_usage.md).
