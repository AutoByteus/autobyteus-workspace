# Follow-ups: follow-ups-of-461-500

Problems found in this ticket that are not part of it ([ticket-scope.md](../../../.claude/skills/solution-designer/references/ticket-scope.md)). The Solution Designer sends them when the ticket leaves the team.

| ID | Found by, where | What is wrong | Evidence | Why not here | Urgent | Suggested handling |
| --- | --- | --- | --- | --- | --- | --- |
| FU-500-01 | Solution Designer, SR-004 (from 461's FU-007) | The Task record's stored names differ from the code's behind one mapping: stored `agentRunResources` / `agentRun` / `coordinatorAgentRunId` (file `agent_run_resources.json`) vs code `delegatedRuns`-style names after this ticket's code rename. The stored `agentRun` also holds team runs (`kind: "team"`), a wrong meaning in the stored name. | `autobyteus-server-ts/src/projects/stores/task-execution-resource-schema.ts:5-10`; 401 such files in the founder's data | The user decided (SR-004) not to migrate stored names this round: no bug, the mapping is confined to one module, and it would be a second data migration for a name | No | **Goal:** one clean name in code and data (for example `delegated_runs.json`, `delegatedRuns`, `run`), by a migration with a backup first, as `data_migration_guideline.md` requires. **Done when:** the schema module needs no mapping. |
