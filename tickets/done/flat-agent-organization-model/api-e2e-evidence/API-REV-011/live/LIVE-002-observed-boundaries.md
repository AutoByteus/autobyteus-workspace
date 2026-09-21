# LIVE-002 observed boundaries — mounted Team first message and task exclusion

- Normal browser launch: Agent Orgs -> AORG E2E Mixed Org -> Run -> root auto-approval enabled -> Run Agent Org.
- Runtime/model: Codex App Server / `gpt-5.6-sol`; root `aorg_e2e_mixed_org_c8d5f67fe2ff4e2bb5078d38f4208f40`.
- Target configured Agent: `/research-team/lead`, AgentRun `aorg_e2e_lead_992acea3a34c427494ae932041c7341a` inside mounted TeamRun `aorg_e2e_research_squad_93210a6a488647589e9d980514dfee27`.
- The fresh already-rendered row began as `New - AORG E2E Mixed Org`.
- The first accepted mounted-Team prompt compacted and truncated to exact 100-character title `Return exactly APIREV11-MOUNTED-REPLY-001 on the first line and five words on the second line. Th...`.
- The in-browser exact-row wait passed after SEND_MESSAGE ACK and before the provider-completion wait. Durable index mtime `2026-09-06T00:05:35.732200672Z` precedes the provider reply at `00:06:03.540Z`.
- The same persistent tab retained exactly one navigation entry and the unchanged active route.
- A later ordinary mounted prompt did not replace the title.
- A real formal `delegate_task` targeted exact `/research-team/analyst`; Task Agent `aorg_e2e_analyst_76d083849b6e40258bbbc88cb985e7f7` invoked `submit_task_result` and durable task `task_433f08ac7738461990c25303e5ad6784` reached `awaiting_review`. Neither the task prompt, task submission, tool result, nor delegator notification replaced the Org title.
- The unified hierarchy visibly contains the Task Agent row, selected configured Team lead, and current Org root. Durable task sidecar, raw traces, GraphQL history and screenshot are retained.
- Evidence-assembly note: after all behavior assertions and the screenshot passed, the first script tried to read the configuration-page auto-approval control after that page had unmounted. The postassert removed that stale locator and independently confirmed all live state.

Result: Pass.
