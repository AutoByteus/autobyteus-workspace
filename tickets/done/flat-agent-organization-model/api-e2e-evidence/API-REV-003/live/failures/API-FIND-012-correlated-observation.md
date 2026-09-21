# API-FIND-012 — mounted-Team task settlement identity rejection

## Scenario and expected behavior

- Scenario: `ORG-TASK-REV-003`; `SCN-005/006`; `AC-007`, `AC-010`, `AC-013`.
- Mode: production-built backend and Nuxt renderer, UI-imported package, real
  Codex App Server (`gpt-5.6-sol`, low reasoning), mixed AgentOrg with mounted
  `research-team`, one supported task assigned by its coordinator to
  `/research-team/analyst`.
- Expected: the same task Agent submits, receives a revision request, resubmits,
  is accepted, completes its required rule-based handoff, and settles without
  invalidating the Org root or its persistence authority.

## Observed boundary facts

- Task: `task_a74ec579d8d34fb58ca5788856b5486b`.
- Task AgentRun: `aorg_e2e_analyst_0762fbf83b7b4893ac59fd8d5e953fc6`.
- The durable task sidecar records initial submission, revision request, revised
  submission, and acceptance; final status became `accepted` at
  `2026-09-01T22:37:06.378Z`.
- The same live provider turn then followed the configured completion protocol:
  `get_handoff_rules` at provider timestamp `1788302226.954`, successful
  `send_message_to` at `1788302233.347`, and assistant turn completion at
  `1788302237.221`.
- During settlement, the built backend logged that the exact task AgentRun did
  not resolve to the supplied member identity. The root task queue entered
  fail-stop because persistence authority was indeterminate; the settlement
  failure was logged twice.
- This uses one supported task and correct mounted-Team address. It does not
  contain API-FIND-008's invalid second task or self-review instruction.
- The later real `SIGTERM` still completed cleanly; the failure is task
  settlement/root-authority behavior, not a reproduced shutdown hang.

## Evidence

- `org-task-settlement-identity-failstop.log`
- `org-task-assignee-raw-trace.jsonl`
- `org-task-delegator-raw-trace.jsonl`
- `../persistence/org/agent_org_task_delegation_records-before-restart.json`
- `../persistence/org/agent_org_run_execution_tree-before-restart.json`
- `../persistence/org/correlation-before-restart.log`
- `../backend.log`

## Preliminary classification

`Unclear — likely implementation runtime identity / mounted-Team task-settlement
boundary.` Focused failure-origin review is required; API/E2E does not prescribe
recovery machinery or assign final source ownership.
