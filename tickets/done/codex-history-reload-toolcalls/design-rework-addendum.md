# Design Rework Addendum: Local Replay Source Authority

## Status

Refined design-ready addendum after user clarification on 2026-05-16.

This addendum supersedes both previous rework directions:

1. turn-aware raw/native merge; and
2. Codex-native-provider-only UI history.

The final clarified direction is simpler: **normal UI history display should use the local application-owned replay trace consistently, with no Codex native fallback/recovery and no local/native merge.**

## Trigger

The delivered build still shows reloaded Codex team-member histories where the focused transcript ends with `Thinking` rows and prose but no adjacent tool-call cards. Reproduction showed that mixing local raw-trace projection with Codex-native provider projection can append duplicate text/reasoning-only rows after tool-bearing rows.

The user clarified an additional product/design constraint:

- history display only needs to show what the app locally recorded;
- if some older run has no local history, that is acceptable;
- no fallback/recovery from Codex native thread history is required.

## Revised root cause

The root cause is not that either source is inherently bad. The defect comes from **multiple display authorities**:

```text
local raw/replay trace projection + Codex native provider projection -> merged transcript
```

That creates duplicate ordering/tail bugs and forces the backend to reconcile two representations of the same run.

## Final source-of-truth invariant

> Normal UI history projection is built from the local application-owned replay trace only, for every runtime, including Codex. Runtime-native providers are not part of the normal UI history path. If the local replay trace is missing or incomplete, the UI projection may be empty or incomplete; do not fallback to Codex native thread history.

## Why this is the better design under the clarified requirements

- The local replay trace is the app's own record of what was streamed to the UI live.
- Display reload becomes runtime-consistent: Codex, Claude, local, and future runtimes all hydrate from the same canonical local replay source.
- The UI no longer depends on Codex-native thread item shapes, which can change across Codex versions.
- The system avoids complex source reconciliation, duplicate-tail heuristics, and fallback policy ambiguity.
- Missing old local histories fail transparently as missing local history instead of silently rendering a different runtime-native reconstruction.

## Target design change

### 1. Centralize local-only display policy

`AgentRunViewProjectionService` should use the local replay projection provider for normal UI history regardless of runtime kind.

```text
getRunProjection / getTeamMemberRunProjection
  -> AgentRunViewProjectionService
  -> LocalReplay/LocalTraceRunViewProjectionProvider
  -> raw traces -> HistoricalReplayEvent[] -> RunProjection
```

### 2. Remove runtime-native providers from normal UI history

`CodexRunViewProjectionProvider` must not be selected by `getRunProjection` or `getTeamMemberRunProjection` for normal UI history. If retained at all, it must be renamed/scoped as a diagnostic or separate utility, not a fallback display source.

### 3. Remove local/native merge for UI display

`mergeProjectionBundles(local, runtimeNative)` must not be used for normal UI display. Merge helpers may remain only if another explicitly-owned use case needs them, but they are no longer part of Codex history correctness.

### 4. Keep raw trace persistence, but clarify ownership

Raw traces are still written. For this scope, those traces are the local replay input for display and may also serve future memory features. The important boundary is that display history reads the local replay trace directly and does not ask runtime-native providers to reconstruct display state.

## Required implementation changes

- Modify `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts` so normal UI projection loads local replay/local trace projection only.
- Modify `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts` so team-member histories delegate through the same local-only service path with member `memoryDir` metadata, or return the local member projection directly through one clearly-owned local replay provider.
- Decommission `CodexRunViewProjectionProvider` from the normal provider registry/path used by GraphQL history APIs.
- Remove any Codex local/native projection merge from normal history loading.
- Remove or clearly re-scope `TeamMemberLocalRunProjectionReader` if a unified local replay provider replaces it.
- Update docs to say Codex native thread history is not the normal UI display source; local replay trace is.

## Required tests

1. **Standalone Codex local-only**: `getRunProjection` for a Codex run reads local replay traces and does not call `CodexRunViewProjectionProvider`.
2. **Team-member Codex local-only**: `getTeamMemberRunProjection` for a Codex member reads the member local replay trace and does not call `CodexRunViewProjectionProvider`.
3. **No fallback**: if local replay trace is empty/missing but a mocked Codex native provider could return rows, the normal UI projection remains empty/missing.
4. **Local tools display**: local replay trace containing reasoning, tool calls, and assistant text produces canonical conversation/activity rows with tool calls in order.
5. **Runtime consistency**: non-Codex runs use the same local replay projection path.
6. **Frontend unchanged**: canonical projection hydration tests continue to pass without runtime-specific branches.

## Acceptance criteria additions / replacements

- AC-009: Normal UI history projection uses the local application-owned replay trace as the sole display source for Codex standalone and Codex team-member runs.
- AC-010: Normal UI history projection does not call or fallback to `CodexRunViewProjectionProvider` when local replay history is missing or incomplete.
- AC-011: Normal UI history projection does not merge local replay rows with Codex native thread rows.
- AC-012: Local replay traces with reasoning/tool/text rows hydrate into the frontend with tool calls adjacent to their turn text after restart/history reload.

## Evidence package

- Post-delivery reproduction note: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/done/codex-history-reload-toolcalls/post-delivery-live-repro.md`
- Current Electron backend projection: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/done/codex-history-reload-toolcalls/live-repro-evidence/current-electron-backend-implementation-projection.json`
- Screenshot: `/Users/normy/.autobyteus/browser-artifacts/b0b990-1778916761455.png`

## 2026-05-17 Refinement: Thinking Segment Durability

The local-only source-authority decision remains correct. The new bug shows that the local replay source is incomplete for one visible segment kind: Codex reasoning/thinking.

Add this invariant:

> Any UI-visible reasoning/thinking segment must be durable in the local replay trace before the app can lose in-memory stream state. The local replay writer must not depend only on `TURN_COMPLETED` or a reasoning `SEGMENT_END` event.

Implementation guidance:

- `RuntimeMemoryEventAccumulator` should flush open reasoning segments for the same turn before writing a tool call.
- It should flush open reasoning segments for the same turn before writing assistant text / assistant-complete output.
- It should still flush on `TURN_COMPLETED`.
- If a run is stopped/terminated while a reasoning segment is open, any available reasoning content should be flushed before shutdown/cleanup if the event path exposes such a boundary.

This is a local replay persistence fix. Do not reintroduce Codex-native fallback or local/native merge.
