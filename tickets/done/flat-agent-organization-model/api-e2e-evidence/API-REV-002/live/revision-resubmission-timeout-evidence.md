# Real Codex revision/resubmission timeout evidence

- Team root: `aorg_e2e_research_squad_406e38c2bf72449ea5685e1489282463`
- Task: `task_cbd139cb628e49cdb38a5e95c5826cd8`
- Initial task Agent: `aorg_e2e_analyst_647ecebd7ced43fdbc02ff40a4cbf9ed`
- Initial `submit_task_result` succeeded at 2026-09-01T19:54:54.953Z.
- Delegator `review_task_result(request_revision)` succeeded at 19:55:02.333Z.
- The accepted system revision input did not begin a provider turn until 20:00:09.998Z (about 5m08s after review).
- The task Agent called revised `submit_task_result` at 20:00:16.186Z with exact marker `AORG-TEAM-TASK-REVISED-002`.
- No tool result was emitted, no revised submission was committed in `task_delegation_records.json`, and the call remained unresolved through SIGINT at 20:01:21Z.
- SIGINT then exited 1 with `General process run supervisor close failed`; after restart, explicit Team Restore safely classified the still-active task as interrupted and settled it.

This is not the prior invalid-fixture finding: every possible assignee explicitly exposes `submit_task_result` and `review_task_result`, the initial submission and a separate acceptance lifecycle both succeeded, and the revised tool call itself was emitted. Preliminary origin remains implementation/runtime or Codex-adapter interaction pending focused review.
