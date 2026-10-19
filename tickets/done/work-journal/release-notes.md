# Release Notes — Work Journal

Planned for **v1.5.6-beta.9**. This is the archived functional summary; the beta workflow publishes generated GitHub notes.

- Every agent run now keeps a **Work Journal**: plain, readable Markdown of what the agent did, kept up to date after each turn and compaction. Tool calls read the same across runtimes (Command, Write file, Edit file, Search web), and each entry links back to its raw record.
- Skill Improvement now gives the improver the run's Work Journal as its evidence.
- On first start, the old generated work-trace export folders are removed. Raw history is unchanged.
- Rolling back past this version is supported. Skill Improvement then starts a fresh improver session once for affected skills.
