# LIVE-006 Correlated Standalone-Team Task Lifecycle

## Identity

- Team definition: `AORG E2E Research Squad`
- TeamRun: `aorg_e2e_research_squad_1cfb7cc5ac8b4f0ba208f3c8f1686a0a`
- Delegator: `/lead` / `aorg_e2e_lead_40ab463de3a341a18ba9756664500250`
- Task: `task_ce348550defc476aaefea3ade67ad46d`
- Assignee task AgentRun: `/analyst` / `aorg_e2e_analyst_e25f40d042ec46d7968728647c0687df`
- Runtime/model: Codex App Server / `gpt-5.6-sol` / low / auto approve
- Artifact: `43ef19f2de69b2c16133577dac40471f75ebd913`

## Initial submission

| Boundary | Evidence |
| --- | --- |
| Provider item start | turn `01a0771f-d761-73b0-85d8-19f065100837`; item `ctc_0bb207...`; call `exec-d4e1e59e-708f-425d-b37a-c924140e0800`; `submit_task_result`; provider trace `14:29:45.506Z` |
| Local MCP ingress | session `agtrun_CYb_mjX2L0m_z_WCd1ytzCpB9AKRmGKW8m4q2QdAZg0`; JSON-RPC id `2`; `14:29:45.507Z` |
| Dispatcher/executor/adapter | all started at `14:29:45.508Z`; exact Team root/address/AgentRun admitted |
| Root FIFO | `submit_result`, open, not fail-stopped, idle queue; enqueue/start `14:29:45.510Z`; exact-at-head `14:29:45.511Z` |
| Durable transition | `active -> awaiting_review`; write start `14:29:45.511Z`; durable complete and in-memory commit `14:29:45.515Z` |
| Notification/result | delegator notification `14:29:45.517Z`; adapter/dispatcher/HTTP 200 complete `14:29:45.518Z`; access duration 12.17 ms |
| Provider completion | `TOOL_EXECUTION_SUCCEEDED` at `14:29:45.524Z` with task status `awaiting_review` |
| Browser/file | live `Awaiting review`; one durable update `API16-INITIAL-SUBMISSION` |

## Revision and same-task resubmission

- Delegator `review_task_result(request_revision)` entered MCP id `3` at `14:31:56.430Z`, entered an idle root FIFO, durably changed `awaiting_review -> active` by `14:31:56.437Z`, and returned HTTP 200 at `14:31:56.444Z`.
- The exact same task AgentRun received the revision and emitted call `exec-906e68dd-4b17-4bf6-93a5-f30605c1b3da`.
- Second `submit_task_result` reached the same local MCP session as JSON-RPC id `3` at `14:31:59.871Z`, crossed dispatcher/executor/adapter, entered the idle Team FIFO at `14:31:59.874Z`, and durably committed `active -> awaiting_review` at `14:31:59.877Z`.
- Notification and HTTP 200 completed at `14:31:59.879–880Z`; provider recorded success at `14:31:59.885Z`.
- The sidecar contains exactly three ordered updates: initial submission, one revision request, and `API16-REVISED-SUBMISSION`. The browser updated without refocus to Result 2 / Awaiting review.

## Acceptance and settlement

- Delegator call `exec-92dd662b-7435-4d11-a031-a0710642b3cd` reached MCP id `4` at `14:33:19.851Z`.
- The root FIFO started `review_result` with no prior queued work. The durable transition `awaiting_review -> accepted` completed at `14:33:19.857Z`; HTTP/provider completed successfully.
- The task execution tree records `settledAt=2026-09-06T14:33:19.857Z` for the same task AgentRun.
- Browser retained Result 1, revision request, Result 2, and acceptance once; it showed `Accepted`, no alert, one current lead selection, and no horizontal overflow.

## Shutdown, restart, Restore and continuation

- Normal Team termination left all configured members Offline and preserved the accepted task sidecar byte-for-byte.
- Direct application SIGTERM logged `Server closed cleanly` in 142 ms. Node then waited only for the intentionally attached inspector; closing that API/E2E-owned controller released the already-closed process.
- A first test restart used the wrong provider `HOME`; it failed before prompt commit because the exact rollout resides under `/root/.codex`. This was recorded as an environment correction.
- With original `HOME=/root`, normal inactive-Team first-send restored the same TeamRun. The real-conversation `/lead` preserved its exact AgentRun and provider thread `01a0771e-a1ae-7173-ad0c-5da5f7f94bd1`; system-instruction-only configured members retained AgentRun IDs and received allowed fresh provider IDs.
- The settled task Agent did not reopen. The accepted task sidecar remained SHA-256 `cfad23a71dcc3c95bea8f22b015433fa288d6f0d7a3f97cabef712c29e7387c1`.
- Real provider continuation returned `API16-RESTORED-TEAM-CONTINUE` and confirmed the prior revised result was visible.
- Final normal Team termination and direct SIGTERM completed cleanly.

## Disposition

The prior API-REV-015 observation is **Not Reproduced / runtime-only historical evidence**. Both the initial and revised submissions completed the entire provider -> local MCP -> dispatcher/executor -> Team FIFO -> durability -> notification -> HTTP -> provider chain. No source defect, timeout, retry, replay or recovery change is established or proposed.
