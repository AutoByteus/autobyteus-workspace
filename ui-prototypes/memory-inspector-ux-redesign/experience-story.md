# Experience Story: memory-inspector-ux-redesign

## 1) Product Story

The user is an AutoByteus operator who has run many independent agents and agent teams over time and wants the Memory page to behave like a simple memory library: first choose an **agent with memory** or an **agent team with memory**, then enter that agent/team's runs, then inspect the exact memory. Success means the user never has to guess a run ID and never sees agents or teams that have no memory.

## 2) Main Journey

1. The user opens Memory; the system shows `screen_id: memory_library` with tabs `Agents with Memory` and `Agent Teams with Memory`.
2. The user clicks an agent, for example `Codex`; the system loads `screen_id: memory_runs` with only that agent's runs, sorted by latest memory update.
3. The user clicks one agent run; the system loads `screen_id: memory_inspector` and shows the selected run's Working Context tab with breadcrumb `Agents / Codex / <run summary or run id>`.
4. The user switches to Raw Traces; the system fetches traces on demand and keeps the same selected run context.
5. The user switches to `Agent Teams with Memory`; the system shows only agent teams that have memory.
6. The user clicks a team, clicks a team run, then clicks a team member such as `solution_designer`; the system loads the inspector with breadcrumb `Agent Teams / Software Engineering Team / <team run> / solution_designer`.

## 3) Cognitive Load Criteria

- Learning order: show agents/agent teams with memory first, then runs, then memory content; do not force users to interpret raw run IDs before they know whose memory they are viewing.
- Connection strategy: group runs under the visible agent or agent team name, and keep breadcrumbs visible so each memory panel is connected to an agent/team, run, and optional team member.
- Chunking limit: show one decision layer per column or step: agents/teams list <= 25 per page, run list <= 25 per page, team member cards grouped inside one selected team run.
- Interference control: avoid mixing independent agent runs and team member runs in one flat list; avoid showing configured agents/teams that have no memory.
- Progression policy: unlock memory-type detail only after a concrete run or team member memory target is selected; load Raw Traces only when the user opens that tab.

## 4) Screen Stories

### screen_id: memory_library
- User arrives from: main app sidebar item `Memory`.
- User sees:
  - Page title `Memory` and subtitle `Inspect stored agent and team memories`.
  - Tabs: `Agents with Memory` and `Agent Teams with Memory`.
  - Search box: `Search agents with memory...` or `Search teams with memory...`.
  - Cards with name, run count, latest update, and memory-type badges.
- User can do:
  - `action_select_agents_tab`: switch to agents with memory.
  - `action_select_teams_tab`: switch to agent teams with memory.
  - `action_search_memory_agents_or_teams`: filter the current list by name/id.
  - `action_select_agent_or_team`: choose one agent or agent team.
- System behavior:
  - when `action_select_agent_or_team` -> highlight the card -> load `memory_runs` for that agent/team.
- Cognitive objective: replace run-id guessing with recognizable agents and teams that actually have memory.
- Cognition controls:
  - chunking: agents/teams only; no raw memory payloads.
  - progressive disclosure: runs are hidden until an agent/team is chosen.
  - clarity guardrails: cards use display names first and IDs as secondary metadata.
- States to prototype: default, loading, empty, error.

### screen_id: memory_runs
- User arrives from: `memory_library` after selecting an agent or agent team.
- User sees:
  - Header with selected agent/team name, run count, latest update, and search/filter within that selected agent/team.
  - For agents: run cards with summary, run ID, workspace, created/updated time, memory badges.
  - For teams: team-run cards with team run summary and member memory availability.
- User can do:
  - `action_back_to_memory_library`: clear selected agent/team and return to `memory_library`.
  - `action_search_runs`: filter runs within the selected agent/team.
  - `action_select_agent_run`: inspect a standalone agent run.
  - `action_select_team_run`: select a team run and reveal member memory targets.
- System behavior:
  - when `action_select_agent_run` -> load `memory_inspector` for the run.
  - when `action_select_team_run` -> reveal `team_member_memory_targets` inside this screen.
- Cognitive objective: let the user compare only runs that belong to the chosen agent/team.
- Cognition controls:
  - chunking: one agent/team's runs at a time.
  - progressive disclosure: team members appear only for the selected team run.
  - clarity guardrails: every card shows both human summary and exact run ID.
- States to prototype: default, loading, empty, error.

### screen_id: team_member_memory_targets
- User arrives from: `memory_runs` after selecting a team run.
- User sees:
  - Team run breadcrumb and member cards for leaf agents.
  - Member name, route key, member run ID, latest update, and memory badges.
- User can do:
  - `action_select_team_member_memory`: inspect a member's memory.
  - `action_change_team_run`: choose another team run.
- System behavior:
  - when `action_select_team_member_memory` -> load `memory_inspector` for `teamRunId + memberRunId`.
- Cognitive objective: preserve team context while making the actual team member memory explicit.
- Cognition controls:
  - chunking: members are grouped within exactly one team run.
  - progressive disclosure: member cards are hidden until a team run is selected.
  - clarity guardrails: member route key and run ID are visible but secondary.
- States to prototype: default, empty, error.

### screen_id: memory_inspector
- User arrives from: `memory_runs` or `team_member_memory_targets` after selecting a memory target.
- User sees:
  - Breadcrumb: Agents / agent / run, or Agent Teams / team / team run / member.
  - Inspector title `Memory Inspector`.
  - Metadata strip: run ID, workspace, last updated, memory badges.
  - Tabs: Working Context, Episodic, Semantic, Raw Traces.
- User can do:
  - `action_select_tab`: switch memory type.
  - `action_change_raw_trace_limit`: change raw trace limit.
  - `action_copy_run_id`: copy exact run ID or compound team target.
- System behavior:
  - when `action_select_tab` -> show cached tab content if loaded; Raw Traces fetch on demand.
  - when `action_change_raw_trace_limit` -> refetch raw traces for the selected target.
- Cognitive objective: keep inspection focused and always answer “whose memory am I seeing?”
- Cognition controls:
  - chunking: one memory type per tab.
  - progressive disclosure: raw traces are opt-in.
  - clarity guardrails: no inspector content without a selected memory target.
- States to prototype: default, loading, empty, error, success.

## 5) Alternate And Error Paths

- If no agents have memory, show `No agent memories yet`, then user can switch to teams or clear search.
- If no teams have memory, show `No team memories yet`, then user can switch to agents or clear search.
- If a selected agent/team has no runs after filtering, show `No runs match this filter`, then user can clear run search.
- If a team run has no member memory files, show members with `No memory files` badges when metadata exists, then user can choose another run.
- If backend metadata is missing for old standalone runs, group them under `Unattributed runs`, explain that metadata is unavailable, and still allow run inspection by run ID.
- If an index query fails, keep the last successful list, show retry, and do not clear the selected inspector target.
- If a memory view query fails, keep the last successful inspector payload and show retry in the inspector banner.

## 6) Transition Index

| transition_id | trigger | from_screen | to_screen | expected_feedback |
| --- | --- | --- | --- | --- |
| T-MEM-001 | `action_select_agents_tab` | `memory_library` | `memory_library` | Agents with memory load; team/run selections clear. |
| T-MEM-002 | `action_select_teams_tab` | `memory_library` | `memory_library` | Agent teams with memory load; agent/run selections clear. |
| T-MEM-003 | `action_search_memory_agents_or_teams` | `memory_library` | `memory_library` | Current list refreshes with loading shimmer and empty state if none match. |
| T-MEM-004 | `action_select_agent_or_team` | `memory_library` | `memory_runs` | Agent/team card selected; run list loads for that agent/team. |
| T-MEM-005 | `action_search_runs` | `memory_runs` | `memory_runs` | Run list refreshes inside selected agent/team only. |
| T-MEM-006 | `action_select_agent_run` | `memory_runs` | `memory_inspector` | Inspector breadcrumb and Working Context load for selected agent run. |
| T-MEM-007 | `action_select_team_run` | `memory_runs` | `team_member_memory_targets` | Selected team run expands to member memory cards. |
| T-MEM-008 | `action_select_team_member_memory` | `team_member_memory_targets` | `memory_inspector` | Inspector breadcrumb includes team, team run, and member. |
| T-MEM-009 | `action_select_tab` | `memory_inspector` | `memory_inspector` | Active tab changes; Raw Traces query fires only for Raw Traces. |
| T-MEM-010 | `action_change_raw_trace_limit` | `memory_inspector` | `memory_inspector` | Raw trace list refetches for the same selected target. |
| T-MEM-011 | `action_back_to_memory_library` | `memory_runs` | `memory_library` | Agent/team/run/member selection clears; current tab list remains loaded. |

## 7) Blocking Questions

- None blocking for design. Implementation should confirm whether removing the old flat `listRunMemorySnapshots` / `listTeamRunMemorySnapshots` GraphQL queries is acceptable for any external consumers beyond this app UI; code search found only the current Memory UI/tests using them.
