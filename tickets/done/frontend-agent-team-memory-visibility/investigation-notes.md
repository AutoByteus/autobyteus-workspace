# Investigation Notes

- Ticket: `frontend-agent-team-memory-visibility`
- Date: `2026-03-07`
- Stage: `1` Investigation + Triage

## User Problem (As Investigated)

Frontend Memory currently displays individual run memory only. Team memory is not visible in the same experience, creating a gap when users need to inspect both single-agent and team-run memory.

## Evidence Summary

### 1) Current Memory page is single-run scoped

- `autobyteus-web/pages/memory.vue` mounts memory index + inspector and only fetches run memory index.
- `autobyteus-web/stores/agentMemoryIndexStore.ts` calls `listRunMemorySnapshots`.
- `autobyteus-web/stores/agentMemoryViewStore.ts` calls `getRunMemoryView(runId)` and stores one `selectedRunId`.
- `autobyteus-web/components/memory/MemoryInspector.vue` renders tabs for `workingContext`, `episodic`, `semantic`, `rawTraces` for the selected run only.

### 2) Backend Memory API is bound to `memory/agents/<runId>`

- `autobyteus-server-ts/src/api/graphql/types/memory-index.ts` and `memory-view.ts` build services with `new MemoryFileStore(baseDir)` (default root subdir = `agents`).
- `autobyteus-server-ts/src/agent-memory-view/store/memory-file-store.ts` defaults `runRootSubdir` to `agents`.
- Result: memory index/view APIs do not read `memory/agent_teams/...`.

### 3) Team run memory exists, but via different APIs and shape

- Team member memory files are persisted under `memory/agent_teams/<teamRunId>/<memberRunId>/...`.
- `autobyteus-server-ts/src/run-history/store/team-member-memory-layout-store.ts` and tests confirm this layout.
- Team GraphQL currently exposes:
  - `listTeamRunHistory`
  - `getTeamRunResumeConfig`
  - `getTeamMemberRunProjection`
- `getTeamMemberRunProjection` returns conversation projection only (not full memory tabs like episodic/semantic/raw trace payloads).

### 4) Frontend already consumes team projection in run-history flow, not Memory page

- `autobyteus-web/stores/runHistoryStore.ts` loads team history.
- `autobyteus-web/stores/runHistorySelectionActions.ts` hydrates team member contexts via `getTeamMemberRunProjection`.
- Memory page does not consume these team queries.

## Root Cause

The Memory module is designed around a single identifier (`runId`) with agent-memory APIs tied to the `agents` directory. Team memory is stored under a separate hierarchy (`agent_teams`) and exposed via run-history projection APIs, so the Memory page has no data contract for team scope.

## Scope Triage

- Classification: `Medium`
- Rationale:
  - Requires GraphQL contract extension or new memory queries for team scope.
  - Requires frontend state/model updates to represent memory scope (`Agent` vs `Team`).
  - Requires UX changes in Memory index and inspector for mixed hierarchy and context switching.

## UX Direction Candidates (For Discussion)

### Option A: Scope Toggle + Unified Inspector (Recommended)

- Add top-level scope switch in Memory page: `Agent Runs` | `Team Runs`.
- Left index changes by scope:
  - Agent: existing run list.
  - Team: team rows expandable into member rows.
- Right inspector stays one component but header shows scope context:
  - Agent: `Run: <runId>`
  - Team: `Team: <teamName> / Member: <memberName>`
- Benefits:
  - Minimal cognitive load; one familiar page.
  - Clear explicit separation without forcing users to navigate away.
  - Reuses current inspector interaction model.

### Option B: Combined Tree (Agent + Team in one left tree)

- Left side shows one mixed hierarchy: Workspaces -> Agents/Teams -> Runs/Members.
- Selection drives a single inspector.
- Benefits:
  - Powerful single-pane navigation.
- Tradeoff:
  - Higher visual complexity; harder to scan quickly.

### Option C: Two Dedicated Pages

- Keep `/memory` for agents.
- Add `/team-memory` for team-member memory.
- Benefits:
  - Lowest implementation coupling.
- Tradeoff:
  - Fragmented UX and context switching; weaker discoverability.

## Recommended Direction

Proceed with Option A (`Agent Runs` / `Team Runs` scope toggle) because it gives the best clarity-to-effort ratio and keeps memory inspection in one predictable place.

## Discussion Decisions Needed Before Implementation

1. In `Team Runs` scope, should inspector show per-member memory tabs only, or also add a team-level aggregate summary tab?
2. Should default selection in Team scope auto-focus coordinator member or last-active member?
3. Should team and agent selections preserve independent tab state and raw-trace limit preferences?
