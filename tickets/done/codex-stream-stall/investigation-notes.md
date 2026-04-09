# Investigation Notes

## Status

- Current Status: `Current`
- Scope Triage: `Medium`
- Investigation Goal: determine whether the progressive Codex slowdown/stuck behavior comes from AutoByteus integration layers or is already present in native `codex app-server`.

## Findings

### 1. AutoByteus server-side long-turn probe reproduces the slowdown

- Probe path: real `codex app-server` through `CodexAppServerClientManager -> CodexThreadManager -> CodexAgentRunBackend`.
- Representative baseline run summary before any Codex token-persistence removal:
  - duration: `253866ms`
  - `segmentContentEventCount`: `1183`
  - `earlyContentAvgGapMs`: `9.68`
  - `lateContentAvgGapMs`: `18.68`
  - `slowdownRatio`: `1.93`
- This confirmed the slowdown exists before the desktop renderer alone can explain it.

### 2. Removing Codex token persistence did not remove the symptom

- User clarified that AutoByteus does not need Codex runtime token persistence.
- Codex-specific persistence was removed from `CodexAgentRunBackend`.
- Follow-up long-turn checkpoints after that removal still showed the same progressive pattern:
  - `100` content events: `elapsedMs=10302`, `avgGapMs=104.06`
  - `200` content events: `elapsedMs=92881`, `avgGapMs=466.74`
  - `300` content events: `elapsedMs=125560`, `avgGapMs=419.93`
  - `400` content events: `elapsedMs=225226`, `avgGapMs=564.48`
- Conclusion: Codex token persistence was not the main cause of the long silent phases.

### 3. Native `codex app-server` raw JSON-RPC probing reproduces the same behavior without AutoByteus

- Probe method: spawn `codex app-server` directly, send raw JSON-RPC (`initialize`, `model/list`, `thread/start`, `turn/start`), and timestamp native `item/agentMessage/delta` notifications from stdout.
- Native raw checkpoints:
  - `100` text deltas: `elapsedMs=42276`, `avgGapMs=427.03`
  - `200` text deltas: `elapsedMs=149912`, `avgGapMs=753.33`
  - `300` text deltas: `elapsedMs=193730`, `avgGapMs=647.93`
  - `400` text deltas: `elapsedMs=207149`, `avgGapMs=519.17`
  - `900` text deltas: `elapsedMs=215376`, `avgGapMs=239.57`
- Native raw summary:
  - duration: `225573ms`
  - `rawTextDeltaCount`: `925`
  - `earlyRawAvgGapMs`: `9.8`
  - `lateRawAvgGapMs`: `17.08`
  - `slowdownRatio`: `1.74`
  - `stderrLineCount`: `0`
  - `completed`: `true`
- Conclusion: the progressive slowdown is already present in native `codex app-server` output. AutoByteus is not the sole source of the symptom.

### 4. Same-run paired measurement shows the AutoByteus backend is not adding backlog

- Probe method: one real long turn through AutoByteus backend while recording both:
  - raw thread-layer `item/agentMessage/delta` timestamps
  - backend `SEGMENT_CONTENT` timestamps
- Paired summary:
  - `rawTextDeltaCount`: `1004`
  - `backendTextDeltaCount`: `1004`
  - `pairedCount`: `1004`
  - `avgDispatchDelayMs`: `0.0608`
  - `p99DispatchDelayMs`: `1`
  - `maxDispatchDelayMs`: `1`
  - `rawGapsOver5s`: `7`
  - `backendGapsOver5s`: `7`
- Representative cumulative checkpoints:
  - `100`: raw avg gap `36.34ms`, backend avg gap `36.33ms`
  - `200`: raw avg gap `518.72ms`, backend avg gap `518.72ms`
  - `300`: raw avg gap `651.24ms`, backend avg gap `651.24ms`
  - `1000`: raw avg gap `223.66ms`, backend avg gap `223.66ms`
- Conclusion:
  - `CodexAgentRunBackend` is not introducing the slowdown.
  - The raw Codex stream and backend stream are effectively identical in cadence.
- Detailed table artifact: `tickets/done/codex-stream-stall/paired-cadence-measurements.md`

### 5. Larger-task rerun preserves the same attribution

- Probe profile: `huge`
- Task shape: a much larger Nuxt SSR commerce platform with storefront, account area, admin area, mock APIs, stores, composables, and README.
- The run was intentionally stopped after enough sparse-output checkpoints were gathered; a full completion was not required once the raw-vs-backend alignment remained stable.
- Representative same-run checkpoints:
  - `70`: raw avg gap `35.62ms`, backend avg gap `35.62ms`, avg dispatch delay `0.071ms`
  - `130`: raw avg gap `75.48ms`, backend avg gap `75.49ms`, avg dispatch delay `0.092ms`
  - `180`: raw avg gap `146.75ms`, backend avg gap `146.75ms`, avg dispatch delay `0.083ms`
  - `200`: raw avg gap `133.53ms`, backend avg gap `133.53ms`, avg dispatch delay `0.085ms`
  - `260`: raw avg gap `178.99ms`, backend avg gap `178.99ms`, avg dispatch delay `0.069ms`
  - `280`: raw avg gap `167.08ms`, backend avg gap `167.08ms`, avg dispatch delay `0.071ms`
- Conclusion:
  - a larger task makes the native stream sparser and more bursty,
  - but the backend still tracks the raw stream almost exactly,
  - so the attribution does not change under heavier workload.

### 6. Git history explains why Codex token persistence was added

- Introducing commit: `764003448a47578c671875701b65006e260c5a25`
- Author: `normy`
- Date: `2026-04-09`
- Commit title: `Remove persistence provider mode`
- The introducing ticket (`remove-file-persistence-provider`) explicitly required token usage to remain database-backed for AutoByteus statistics after removing the old generic persistence-provider abstraction.
- This indicates Codex token persistence was added for AutoByteus-side token accounting consistency, not because native Codex required it.

### 7. AutoByteus had a team-path amplification point

- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` refreshed team metadata on every streamed team event.
- For long workflow/team runs this creates avoidable repeated metadata IO during already-slow native Codex turns.
- This was mitigated by coalescing metadata refresh work with a debounce window instead of writing on every event.

## Current Conclusion

- Primary diagnosis:
  - the reported “starts fast, then slower, then appears stuck” symptom is reproducible in native `codex app-server` itself for a large multi-step task.
- Ruled out as primary cause:
  - Codex token persistence inside AutoByteus.
- Confirmed local amplifier:
  - per-event team metadata refresh in `AgentTeamStreamHandler`.

## Practical Implication

- AutoByteus cannot fully eliminate the issue if the native Codex app server is already emitting progress in a bursty / long-silent pattern.
- AutoByteus can still avoid making the problem worse by removing unnecessary per-event work in its own streaming path.

## Validation Evidence

- Focused tests passing after the local mitigation:
  - `tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts`
  - `tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
  - `tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
- Codex token-usage runtime GraphQL e2e is now intentionally skipped because Codex token persistence is no longer a product requirement.
