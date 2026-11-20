# Investigation Notes

## Investigation Meta

- Package identifier: `global-semantic-memory` (autobyteus-555)
- Request: Project Task autobyteus-555 (the founder's request of 2026-11-19, cut off at "may be stored in a global folder, or …")
- Requested by: `/project_task_manager`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/global-semantic-memory`, `codex/global-semantic-memory`
- Base: `origin/personal` @ `8430d9ef12`
- Order: after or together with autobyteus-554 (semantic memory for every agent), which is in architecture review
- Status: investigation of what exists; options drafted; waiting for the founder's answers

## What exists (2026-11-19)

| ID | Finding | Evidence |
| --- | --- | --- |
| G-1 | Agent-level semantic memory: `<memory>/semantic/<encoded definition id>/`, one per agent definition. A run is told the path in its instructions ("## Semantic Memory … belongs to you and is shared by all your runs, in every Project and team"). Claude and Codex runs get the folder added as an accessible root. After autobyteus-554, every agent has one | `agent-execution/prompt/carpenter-prompt-sections.ts:46-49`; 554 design |
| G-2 | A run started under a Project is told the Project's name and id ("## Project … ask the user before working on another Project") | `carpenter-prompt-sections.ts:41-44`; `carpenter-prompt-composer.ts:56` |
| G-3 | The founder's node has 14 Projects: 12 about AutoByteus (product, website, marketing, agents, skills, NFS, MCPs, integrations, opportunities, investor applications, …), plus "Miscellaneous" (personal) and "Niuzhirui App Market". Projects have no folder of their own for knowledge | `~/.autobyteus/server-data/projects/*/project.json` (read-only) |
| G-4 | Today's semantic folders hold reflections (lessons, proposals) written by the reflection skill, not product facts. The PTM's product facts live in its workspace (`task-plans/board.md`, `task-plans/library/*`) | `memory/semantic/project-task-manager/reflections/*`; `task-plans/library/` (names only) |
| G-5 | Episodic memory: work journals (per run) and the per-agent episodic catalog (`memory/episodic/`); `search_memory` searches journals by words and meaning | autobyteus-493; memory search docs |
| G-6 | Procedural memory: skills, changed only through the Agent Package Creator (the founder's rule) | autobyteus-491 Task |
| G-7 | Earlier thinking (autobyteus-233, 2026-10-22): semantic memory = "what is true now, with a timeline, built from episodes" | PM journal 2026-10-22 (search_memory) |
| G-8 | Memory Sync carries `agents/` and `agent_teams/` only; neither `semantic/` nor a new folder would sync to a hub | `memory-sync-path-policy.ts` |

## Options for the founder (to confirm; nothing decided)

1. **Where it lives**
   - (a) one node-wide folder, for example `<memory>/semantic-global/`, a sibling of `semantic/` (a name inside `semantic/` could collide with an agent id);
   - (b) one folder per Project, for example `<memory>/project-semantic/<project id>/` (facts of the AutoByteus product for AutoByteus Projects; nothing of "Miscellaneous" reaches them);
   - (c) both: node-wide plus per-Project;
   - or what the founder meant after "or".
2. **How an agent gets it**
   - (i) the path in the instructions, like agent-level memory; the agent reads an `index.md` there when it needs facts (small, cache-friendly);
   - (ii) the index's text inlined into the instructions (always present, costs tokens, and changes the cached prompt whenever it changes);
   - (iii) found through `search_memory`.
   - Recommendation: (i) first, (iii) later.
3. **Who writes**
   - (a) only the user, or an agent when the user asks;
   - (b) any agent;
   - (c) a curator (the maintenance team agents-105 or the curation skill agents-104), with the user's approval.
   - Recommendation: (a) plus (c), and agents read-only by default.
4. **Promotion** (agent-level → global): the user says so, or the curator proposes and the user approves.
5. **Stale facts**: each fact carries "as of" and a source; a replaced fact moves under "Earlier" (G-7's timeline). This is the curator skill's work; the platform only provides the folder.
6. **Keeping private data out**: option 1(b) keeps Projects apart, and the write rule (3a/3c) keeps agents from writing on their own. The folder never receives journals or run data; the platform writes nothing into it.
7. **All runtimes and run kinds**: the same path as agent-level semantic memory (G-1), so every runtime behaves the same.
