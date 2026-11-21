# Follow-ups

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, design-spec SR-006 R-5 | After the conversion an Org's units are ordinary runs in `agents/` and `agent_teams/`; memory sync excludes them to keep today's behavior (Org memory is not synced) | `memory-sync/shared/memory-sync-path-policy.ts` (kinds `agents`, `agent_teams`); ARCH-REV-001 AR-006 | Syncing Org memory is new behavior not asked for | No | Decide whether Org runs' units should be included in memory sync like other runs | |
