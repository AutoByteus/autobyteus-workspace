# Page Text Prototype: Memory UX Redesign

## Page 1: Memory Home / List Page

Purpose: show only independent agents and agent teams that already have stored memory.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Memory                                                                       │
│ Inspect stored memories from agents and agent teams                          │
│                                                                              │
│ [Agents with Memory] [Agent Teams with Memory]              Search memories… │
│                                                                              │
│ Agents with Memory                                                           │
│ ┌──────────────────────────┐ ┌──────────────────────────┐ ┌───────────────┐ │
│ │ Codex                    │ │ AudioTranscriber          │ │ Daily Assistant│ │
│ │ 33 runs                  │ │ 29 runs                  │ │ 15 runs       │ │
│ │ Latest: Today 06:58      │ │ Latest: May 29 06:14     │ │ Latest: Today │ │
│ │ Working · Semantic       │ │ Working · Raw Traces      │ │ Working       │ │
│ │ Raw Traces               │ │                           │ │ Raw Traces    │ │
│ │                          │ │                           │ │               │ │
│ │ [Open memory]            │ │ [Open memory]             │ │ [Open memory] │ │
│ └──────────────────────────┘ └──────────────────────────┘ └───────────────┘ │
│                                                                              │
│ Not shown here: agents that exist in the Agents page but have no memory yet. │
└──────────────────────────────────────────────────────────────────────────────┘
```

Interaction:
- Click `Agents with Memory` to see independent agents with stored memory.
- Click `Agent Teams with Memory` to see agent teams with stored memory.
- Click an agent card to enter that agent's Memory Detail page.
- Click an agent team card to enter that team's Memory Detail page.

Empty states:

```text
No agent memories yet.
Run an agent first; stored memory will appear here after the run writes memory.
```

```text
No agent team memories yet.
Run an agent team first; team memories will appear here after team members write memory.
```

---

## Page 1B: Memory Home / Agent Teams Tab

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Memory                                                                       │
│ Inspect stored memories from agents and agent teams                          │
│                                                                              │
│ [Agents with Memory] [Agent Teams with Memory]              Search teams…    │
│                                                                              │
│ Agent Teams with Memory                                                      │
│ ┌──────────────────────────────┐ ┌──────────────────────────────┐           │
│ │ Software Engineering Team    │ │ Video Tutorial Creation Team │           │
│ │ 127 team runs                │ │ 14 team runs                 │           │
│ │ Latest: Today 07:20          │ │ Latest: May 29 10:45         │           │
│ │ Members with memory: 6       │ │ Members with memory: 2       │           │
│ │ solution_designer, api_e2e…  │ │ VoiceoverWriter, Assembler   │           │
│ │                              │ │                              │           │
│ │ [Open memory]                │ │ [Open memory]                │           │
│ └──────────────────────────────┘ └──────────────────────────────┘           │
│                                                                              │
│ Not shown here: configured teams that have never been run / have no memory.  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Page 2: Agent Memory Detail Page

Example: user clicked `Codex`.

Purpose: show all runs for one independent agent that has memory.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Memory                                                             │
│                                                                              │
│ Codex Memory                                                                 │
│ 33 runs · Latest memory: Today 06:58 · Working · Semantic · Raw Traces       │
│                                                                              │
│ Search Codex runs…                                                           │
│                                                                              │
│ Agent Runs                                                                   │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ fe8a0deb-de32-48bd-960f-e9e61f01f255                                   │ │
│ │ Summary: “The most important thing, check whether these MCP tools…”      │ │
│ │ Workspace: /Users/normy/.autobyteus/server-data/temp_workspace           │ │
│ │ Updated: Today 06:58 · Working · Semantic · Raw Traces                   │ │
│ │ [Inspect memory]                                                         │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ 3d99f4bf-5b6e-4d63-bcda-180febd4f083                                   │ │
│ │ Summary: “okayyyy. continue thanks…”                                    │ │
│ │ Workspace: /Users/normy/autobyteus_org/autobyteus-social-media           │ │
│ │ Updated: May 31 07:08 · Working · Raw Traces                             │ │
│ │ [Inspect memory]                                                         │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Interaction:
- Back returns to the Memory Home page without losing the selected tab/search if possible.
- Search filters only Codex runs.
- Click `Inspect memory` to open the run memory inspector.

---

## Page 3: Agent Run Memory Inspector

Example: user clicked one Codex run.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Codex Memory                                                       │
│                                                                              │
│ Memory Inspector                                                             │
│ Agents / Codex / fe8a0deb-de32-48bd-960f-e9e61f01f255                       │
│ Workspace: /Users/normy/.autobyteus/server-data/temp_workspace               │
│ Updated: Today 06:58                                                         │
│                                                                              │
│ [Working Context] [Episodic] [Semantic] [Raw Traces]                         │
│                                                                              │
│ Working Context                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ user                                                       #1            │ │
│ │ The most important thing, can you please check whether these MCP tools…  │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ assistant                                                  #2            │ │
│ │ I checked the available MCP tools and…                                  │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Raw Traces tab:

```text
[Raw Traces]
Raw trace limit: [500] [Apply]

#1 user        ...
#2 assistant   ...
#3 tool_call   exec_command {...}
#4 tool_result ...
```

---

## Page 4: Agent Team Memory Detail Page

Example: user clicked `Software Engineering Team`.

Purpose: show all team runs for one agent team that has memory, then expose member memory inside each team run.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Memory                                                             │
│                                                                              │
│ Software Engineering Team Memory                                             │
│ 127 team runs · Latest memory: Today 07:20 · 6 members with memory           │
│                                                                              │
│ Search team runs…                                                            │
│                                                                              │
│ Team Runs                                                                    │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ team_software-engineering-team_fe9a327c                                 │ │
│ │ Summary: “Memory UX redesign and backend-for-frontend design…”           │ │
│ │ Updated: Today 07:20                                                     │ │
│ │ Members with memory: solution_designer, architecture_reviewer,           │ │
│ │ implementation_engineer, code_reviewer, api_e2e_engineer, delivery       │ │
│ │                                                                          │ │
│ │ Team member memories                                                     │ │
│ │ [solution_designer] [architecture_reviewer] [implementation_engineer]    │ │
│ │ [code_reviewer] [api_e2e_engineer] [delivery_engineer]                   │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ team_software-engineering-team_f1c58b2a                                 │ │
│ │ Summary: “Archived implementation workflow…”                             │ │
│ │ Updated: May 29 09:13                                                    │ │
│ │ Team member memories: [solution_designer] [code_reviewer] [...]          │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Interaction:
- Back returns to Memory Home.
- Search filters only runs for Software Engineering Team.
- Click a team member button inside a team run to inspect that member's memory for that team run.

---

## Page 5: Team Member Memory Inspector

Example: user clicked `solution_designer` inside `team_software-engineering-team_fe9a327c`.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Software Engineering Team Memory                                   │
│                                                                              │
│ Memory Inspector                                                             │
│ Agent Teams / Software Engineering Team                                      │
│ / team_software-engineering-team_fe9a327c / solution_designer                │
│ Member run: solution_designer_fa306f0593917cd6                               │
│ Updated: Today 07:20                                                         │
│                                                                              │
│ [Working Context] [Episodic] [Semantic] [Raw Traces]                         │
│                                                                              │
│ Working Context                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ user                                                       #1            │ │
│ │ The current memory area is very basic…                                  │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ assistant                                                  #2            │ │
│ │ I analyzed the Memory page frontend and backend…                         │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Navigation Summary

```text
Memory Home
├─ Agents with Memory
│  └─ click agent card
│     └─ Agent Memory Detail
│        └─ click run
│           └─ Agent Run Memory Inspector
└─ Agent Teams with Memory
   └─ click team card
      └─ Agent Team Memory Detail
         └─ click member inside a team run
            └─ Team Member Memory Inspector
```
