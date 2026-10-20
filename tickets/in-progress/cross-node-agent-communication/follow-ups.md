# Follow-ups — cross-node-agent-communication (slice 1, autobyteus-191)

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, `design-spec.md` § On-Disk Data Model | `taskAgent.origin` (`catalog` / `configured_place`) kept a pre-own-file behavior: copies of configured places restored from the member slot (`run-history/store/agent-run-metadata-types.ts`, `task-agent-own-records.ts`) | `tickets/done/delegated-copy-own-run-memory/design-spec.md:72` (U-4); `follow-up-delegated-copy-restore-from-own-file.md` | The remote run does not use `origin`; slice 1 works without it | No | See `follow-up-delegated-copy-restore-from-own-file.md` | `/project_task_manager`, 2026-10-19 (sent early at the user's request) → autobyteus-197, DONE (merge `d7c0222eb7`, v1.5.7-beta.4) |
