# API-C08 semantic adjudication — Fail, API-F005

Actual model: qwen/qwen3.6-35b-a3b:lmstudio@localhost:1234. Factory: production createCompactionLlm, current null/null tuple (inherit model defaults), exact prompt-v5, fresh direct calls, no tools. The small quality fixture is synthetic; no private history or external cloud call. This is generation fidelity evidence, separate from the full runtime flow and snapshot installation.

## Observations

| Source obligation | First summary | Repeated summary (latest run) |
| --- | --- | --- |
| Audit-only goal, no deployment/push/customer export | Preserved | Preserved |
| Owner Mira Chen; INC-042; exact two paths and command | Preserved | Preserved |
| Inventory completed/12tables; risk assessment active | Preserved | Preserved |
| Verification unrun; implementation approval pending | Preserved | Preserved |
| Latest correction retention30 replaces7; cancel cloud export | N/A first | Preserved |
| Latest request compare rollback options, not implement | N/A first | Preserved |
| Add APPROVAL-73 is requested, not performed | N/A first | **Fail: invented completed plan update** |
| Six headings/one body/provider termination/one call | Present; complete/stop | Present; complete/stop; two distinct invocations total |

Input correction asks: `Add the owner-review checkpoint APPROVAL-73 to the plan; approval for implementation is still pending.` There is no subsequent assistant response or tool execution between that user message and summarization.

Accepted repeated body says in Decisions and findings:
`Checkpoint APPROVAL-73 added to the plan to track owner review.`

Under Completed work:
`Updated plan with retention policy (30 days) and checkpoint APPROVAL-73.`

This promotes a requested action into completed work. It is not a harmless synonym, output-envelope issue or token truncation. Invocation compaction_8d4ac49c-a133-4c03-ab04-1acff30626fe reports complete/stop, usage input1203/output3227/reasoning2667. The runtime parser correctly handles structure but cannot establish semantic truth; do not add a corrective generation loop or change approved behavior here.

## Why automated green is not validation Pass

The initial keyword/retention checks passed on the latest two-call run. Independent comparison found the contradiction above; this adjudication overrides that mechanical Pass. New fixture-specific `assertNoInventedPlanChanges` now runs on future repeated outputs. The exact retained output was replayed through it and rejected with LIVE_E2E_QUALITY_PLANNED_WORK_REPORTED_COMPLETE; positive/negative durable unit cases pass. No new provider run after this detector addition is claimed. The alarm is deliberately narrow, not a semantic completeness oracle.

An earlier two-call sample retained the checkpoint as pending and did not invent completion; its automated test failed only because a too-literal assertion rejected “Planning/approval only” / “unexecuted.” Both samples are retained. Their difference demonstrates model-output variability; neither a later good sample nor a mechanical Pass waives this observed failure. No probability/general reliability claim follows from two samples.

## Separate API-F004

Full product-runtime fixture attempt3 completed compaction on turn3, but final turn completed without final tool dispatch (3 tool-success notifications rather than4) and failed with the wrapper's generic LIVE_E2E_PROVIDER_OPERATION_FAILED. The subsequent same-behavior diagnostic run passed all full-flow assertions (only logging changed). Underlying attempt3 exception/response was not retained before cleanup, so cause remains unclear; do not attribute it to parent token limit, provider or compactor without evidence. See API-F004-triage.json.

## Routing question

Observed behavior violates AC-002/007's planned/completed fidelity on repeated compaction. Preliminary origin **Unclear — actual model/prompt quality vs configuration/implementation**, not a demonstrated source-construction bug or new requirements gap. Request Code Reviewer focused failure-origin review; preserve approved SR-012/SR-013/prompt-v5 and source Pass. Any intended prompt/design change belongs to Solution Designer after origin review, not this API/E2E patch.
