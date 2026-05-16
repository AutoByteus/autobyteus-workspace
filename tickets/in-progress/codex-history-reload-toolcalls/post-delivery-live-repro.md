# Post-Delivery Live Reproduction: Historical Tool Calls Still Not Correctly Displayed

## Status
Confirmed after user feedback on 2026-05-16.

## What was reproduced
Using the delivered Electron backend on `http://127.0.0.1:29695` and the current worktree frontend dev server pointed at that backend, I loaded the user's reported Software Engineering Team history and selected `implementation_engineer`.

Visible screenshot evidence:

- Text-only visible historical tail: `/Users/normy/.autobyteus/browser-artifacts/b0b990-1778916761455.png`

The visible focused-member conversation matches the user's complaint: after several `Thinking` rows the viewport shows only final prose such as `Local fix completed...` and no adjacent tool-call cards.

## Backend projection evidence
Querying the same backend path used by the UI (`getTeamMemberRunProjection`) for:

- `teamRunId`: `team_software-engineering-team_9da5f909`
- `memberRouteKey`: `implementation_engineer`

produced:

- conversation rows: 132
  - `tool_call`: 74
  - `tool_call_pending`: 2
  - `reasoning`: 44
  - `message`: 12
- activity rows: 76
  - `run_bash`: 57
  - `edit_file`: 17
  - `send_message_to`: 2

Raw saved projection:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/live-repro-evidence/current-electron-backend-implementation-projection.json`

## Key ordering / merge finding
The problem is not simply that backend returns zero tool calls. The backend projection contains many tool rows, but the merged historical conversation contains duplicate message/reasoning tails after the tool-bearing rows.

For the current `implementation_engineer` projection, the tail shows this shape:

```text
97-106   tool_call rows, including run_bash/send_message_to
107      assistant: "Local fix completed..."
108-116  reasoning rows duplicated later
117      user: architecture_reviewer message duplicated/reintroduced
118      assistant: "I’ll use the implementation-engineer skill..."
119-122  reasoning rows duplicated/reintroduced
123      assistant: "Implemented the reviewed fix..."
124      user: code_reviewer message duplicated/reintroduced
125      assistant: "I’ll apply the implementation-engineer workflow..."
126-130  reasoning rows duplicated/reintroduced
131      assistant: "Local fix completed..."
```

Because the UI scrolls to the last conversation rows after historical load, users see the duplicate text/reasoning-only tail and not the earlier tool-bearing rows.

## Root-cause classification update
The delivered backend fix improved Codex native tool item coverage, but the remaining defect is a backend projection merge/order issue:

- local memory/raw-trace projection and Codex native thread projection are both being combined;
- stable tool rows are present, but non-tool message/reasoning rows are only exact-deduped;
- Codex native message/reasoning rows that duplicate local turns get appended after the local tool-bearing turns;
- the frontend then renders/scrolls to that appended duplicate tail, making historical tool calls appear missing.

## Required rework
The next implementation must make historical projection merge turn-aware, not just invocation-aware.

Minimum behavioral requirement:

- When local memory projection already contains a user/assistant turn with tool rows, Codex-native `thread/read` rows for the same turn must not be appended as a second text/reasoning-only tail.
- The merged projection must preserve a single chronological turn where reasoning, tool calls, and assistant text stay adjacent.
- The frontend should remain runtime-agnostic; it should receive a correct canonical `conversation` order from the backend.

## Evidence commands / artifacts
- Screenshot: `/Users/normy/.autobyteus/browser-artifacts/b0b990-1778916761455.png`
- Current Electron backend projection: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/live-repro-evidence/current-electron-backend-implementation-projection.json`
- Isolated live Codex repro logs and pre/post restart projections are under:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/live-repro-evidence/`

## Routing recommendation
Route as design/implementation rework, not as resolved delivery. The prior design acceptance criteria need an explicit non-duplicated historical turn/order criterion in addition to tool-call presence.
