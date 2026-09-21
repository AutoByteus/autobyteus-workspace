# LIVE-002 durable activation/event ordering

- TeamRun: `aorg_e2e_research_squad_b64ab122404a414ca49c5da44ef9bfc0`
- Task: `task_67c02e48943849ffac37231cc7e2bf63`
- Stable assignee AgentRun: `aorg_e2e_analyst_9dfc8a741d8f47418f7ee5d7ce3f6424`
- Task AgentRun: `aorg_e2e_analyst_875c5eba2b4442a5b161af199d41943a`
- Durable task-execution `startedAt`: `2026-09-02T09:21:46.441Z`
- First provider trace event: `1788340906.446` (`system_instruction` / `SYSTEM_INSTRUCTIONS_SUPPLIED`)
- First user/task prompt event: `1788340906.609` (`user` / `AgentRun.postUserMessage`)
- First `send_message_to` call: `1788340918.065`
- First `submit_task_result` call: `1788340931.725`

Observed boundary: the authoritative execution tree was durably materialized with the exact task AgentRun and `startedAt=2026-09-02T09:21:46.441Z`; the first provider event is 5 ms later at epoch `1788340906.446`, the task prompt 168 ms later, and all task tool events later still. Stable `/analyst` and transient task AgentRun identities are distinct.

After a selected-monitor user follow-up, the same task AgentRun appended `APIREV5-TASK-LIVE-UPDATE`. After the delegator requested revision, the same selected task monitor received the revision prompt and second `submit_task_result`; `task_delegation_records.json` contains two ordered submissions while status remains `awaiting_review`.
