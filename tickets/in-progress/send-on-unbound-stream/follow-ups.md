# Follow-ups

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, design-spec.md | `autobyteus-web/stores/agentOrgContextsStore.ts` and `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts` are 506 lines each, over the 500-line limit before this change | `wc -l` on base `914eb36577` | This ticket only adapts a few lines in them and must not grow them; splitting them is its own refactor | No | Split `agentOrgContextsStore.ts` and `agentOrgStreamingService.ts` under 500 lines each by owned concern | |
