# FAPI-012 — A Task-owned helper's reply by address starts a duplicate worker instead of reaching its delegator

Observed 2026-10-05 on IR-013 (`b61b8452f`), real packaged desktop build (isolated instance iso-49296-0746, upgraded data root), real model Native DeepSeek V4 Flash, Agent root (`project_task_manager_17b07df3…`). Case API-208a.

## Scenario (supported: REQ-BL-009 B-1, BEH-009)
1. The Manager assigns Task A to `/api019_packet_agent` → worker **W** `api019_packet_agent_c8e44b8d…` (`assigned`, open).
2. The user asks W to delegate sub-work without `task_id` to `/api019_delegate_helper` → helper **H** `api019_delegate_helper_68ccdcbf…` (`delegated`, open). This is correct.
3. H's packet says: "Task delegator address: /api019_packet_agent, Task delegator AgentRun ID: api019_packet_agent_c8e44b8d…". H replies with `send_message_to(recipient_address: "/api019_packet_agent", content: "…acknowledged…")`.

## Expected
The reply reaches H's delegator W, the open run of the same Task already at that address. No new agent is started.

## Observed
- The tool result is `{"accepted":true,"code":"DELIVERED","target_agent_run_id":"api019_packet_agent_9d7adedd…"}`. That is a **new** Packet Agent copy **W2**. Its tree node is `/api019_packet_agent` with `delegatorAgentRunId = H`.
- Task A's `agent_run_resources.json` gains `{"role":"broughtIn","agentRun":{"kind":"agent","agentRunId":"api019_packet_agent_9d7adedd…"}}` (linkedAt 14:24:04.849Z).
- W never receives H's reply. W2 receives it and answers "No action taken".
- The bring-in helper `api019_bring_helper_0be6419a…` (started by W at step 4) also replied to `/api019_packet_agent`. That reply went to W2 too, now Task A's open `broughtIn` at that address, not to W.
- At DONE, Task A closed 4 entries (assigned, delegated, broughtIn W2, broughtIn bring-helper) and stopped them.

## Why (reading of the current design and code)
Design § Fences, routing order: "own Team instance → the Task's open helper at the address (`openAgentRuns(taskId,'broughtIn')`) → an unowned run-wide run → a new `broughtIn` copy". W is `assigned` (owned, not `broughtIn`), so it is neither "the Task's open helper" nor "unowned", and routing falls through to starting a new copy. An unlinked worker is unaffected: its helpers' replies find it as an unowned run-wide run. So linked Tasks behave differently from unlinked delegation for an ordinary reply.

## Impact
In any Task where a worker uses helpers, replies addressed to the worker's address (the address the packet hands the helper) are misdelivered to a spawned duplicate. The real worker never gets results, an extra paid agent run is started, and the duplicate is recorded as Task membership. The reverse direction (W messaging `/api019_delegate_helper` after delegating) would similarly miss its own `delegated` helper. That direction was not executed, so it is inferred only.

## Preliminary classification
**Design Impact (preliminary)**: the specified routing order omits the same Task's open `assigned`/`delegated` runs at the address. Implementation appears to follow the design. Recommended next owner: Code Reviewer for focused failure-origin review, then Solution Designer if confirmed.

## Evidence
`api-019-agent.json` (closedA, steps), `attempt2-api-019-agent.json`, the Agent root raw traces under the instance data root (helper H, W2, W), `collaboration_tree.json`, this note.
