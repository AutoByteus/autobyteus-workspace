## The Skill Self-Evolver and the Memory Compactor agents are removed

- Two built-in agents that belong to retired features are removed at the first start after updating: the **Skill Self-Evolver** and the **Memory Compactor**. They no longer appear on the Agents page, and no agent is offered them any more (the Memory Compactor was listed to every agent as `/memory_compactor`). The Skill Self-Evolver edited skills directly; skill changes go through the Agent Package Creator.
- Only the two installed agent folders are deleted, and no copy of them is kept. Nothing else is touched: your other agents, every run and its history (including the old Memory Compactor runs) and all memory files stay exactly as they are. Agent compaction does not use either agent.
- Removing them again is harmless: a later start finds nothing to do. If a removal fails (for example a locked folder), startup is not affected and it is tried again at the next start.
- Nothing else changes in the app. The old compactor's summary files (`episodic.jsonl`, `semantic.jsonl`) inside old run folders stay on disk; nothing reads them any more.

## What you need to do

- If one of your own agent teams or organizations lists the Skill Self-Evolver or the Memory Compactor as a member, replace that member before you update. After the update that team or organization will no longer work as it did, because the member's definition is gone.
- Want a copy of these two agents? Back up your agents folder before you update. The removal cannot be undone from inside the app.
