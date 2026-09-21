# LIVE-006 durable activation ordering

Target task: `task_aa15bce5c28145268b522d94d6c46b02`

- Durable Team execution tree task execution `startedAt`: `2026-09-02T16:17:44.513Z`.
- First retained task-Agent provider trace: `ts=1788365864.662`, i.e. `2026-09-02T16:17:44.662Z`.
- Durable activation therefore precedes the first provider event by **149 ms**.
- Exact AgentRun: `aorg_e2e_analyst_1bdeec48d2c24aba80446ea1687cb036`.
- Settlement: `2026-09-02T16:20:11.430Z`, after the accepted Result 2 persistence update.

Sources: copied `LIVE-006-team-run-execution-tree.json`, `LIVE-006-task-delegation-records.json`, and retained raw task-Agent trace in isolated server data.
