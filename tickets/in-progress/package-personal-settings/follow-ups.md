# Follow-ups — package-personal-settings

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, `data-model.md` V7 | `autobyteus-server-ts/docs/modules/agent_definition.md` still describes the removed `src/built-in-agents` subsystem: the TS Source list (line 12) and "Built-In Agent Sync" (from line 117), including Daily Assistant startup sync | `git log -- autobyteus-server-ts/src/built-in-agents`: removed in autobyteus-205 (`1f12b46b8b`); `src/built-in-agents` absent at `c78ffb15a2` | Documentation of another ticket's removal; nothing here depends on it | No | "Update agent_definition.md: remove the built-in agent sync sections and the src/built-in-agents source entry, and describe what replaced Daily Assistant, if anything." | Not sent |
