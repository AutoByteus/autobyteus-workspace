# Target Status Design (consolidated from the 2026-10-09/10 design discussion)

Status: proposal for a follow-up ticket; not the design implemented in this ticket (SR-003). Evidence: investigation-notes.md sections "Status Ownership Investigation", "Product-Wide Validation", "Worker-Owned Status Check", "AgentRun Is The Only Executing Unit", "Representation Model Proposal".

## 1. Subjects

- **Agent** = any `AgentRun` (standalone, team member, task agent, collaborator agent, Org agent). The only executing unit.
- **Agent run container** = any `TeamRun` (standalone team run, team inside an Org, delegated task team, collaborator team) or `AgentOrgRun`. Executes nothing. Teams are flat; there are no team-in-team definitions.
- **Display groupings** (agent / team / Org definition groups) are not subjects.

## 2. Owned facts

| Fact | Owner |
| --- | --- |
| Agent status `offline/initializing/idle/running/error` | `AgentRun`; the member handle owns `initializing`/activation `error` only before the AgentRun exists |
| Agent execution address (its container chain: root run, ordered task-team run IDs, member address) | Part of the agent's execution identity, carried on every agent event |
| Container lifecycle (alive/stopped) | `TeamRun` / `AgentOrgRun` |

Container status is **not** an owned or published fact.

## 3. One derived view

`containerStatus(container) = highest status among agents whose execution address includes the container`, with running/initializing → `busy`, error → `error`, idle → `idle`, offline → `offline`, and `offline` when the container is not alive (a staleness guard). Ranking `busy > error > idle > offline`. Defined once in `@autobyteus/collaboration-stream-contracts` as `ContainerStatus` + `containerStatus(...)`; evaluated by the server (Projects board) and the web.

Unstarted members, closed (DONE/CANCELLED) work and stopped containers need no special membership handling: their agents are offline, which never raises the result.

## 4. Web

- One run status store: `agentStatus(agentRunId)`, `containerStatus(teamRunId | orgRunId)`, fed by owned facts only.
- Two components: `AgentStatusDot` (+ text form), `ContainerStatusDot`. Rows pass an ID; nothing else computes status.
- Every agent row → agent status. Every container row (incl. the Org root row) → container status. Group rows → highest of listed runs. The agent run row = host agent's status. Conversation header, member panel, composer gating → agent status. Mobile runs list (same web code) → agent/container status. Run settings "active/stopped" stays lifecycle.
- Projects board worker line: the server applies the same function.
- Removed: per-root counting code, `TeamActivityDot`, `components/workspace/running/*`, `RunningAgentCard`, nested-team-era branches once proven unreachable.

## 5. Freshness (second ticket)

One per-node navigation feed in the `/ws/projects` pattern (connected first, snapshot, coalesced changes, root change sequence, re-read on reconnect) carrying agent statuses with addresses, container lifecycles, tree changes, last activity and summaries for all running work. It fills the same store. Conversation connections open only while a run is viewed.

## 6. Open verification

The Org stream and the Agent-root collaboration stream must carry the same container chain in each agent's address as Team streams do (confirmed only for Team streams).
