# Runtime Tool Exposure Matrix

- **Status:** Approved intended-behavior supplement — explicit user approval is recorded in requirements; architecture review remains the gate before implementation.
- **Purpose:** Make the runtime-kind and run-context boundary explicit for the three requested default tools and existing team defaults.
- **Canonical relationship:** This supplement constrains REQ-001 through REQ-005 and AC-001 through AC-007 in `requirements.md`; it supports the design's runtime-isolation and coverage decisions. The implementation must keep this matrix aligned.

## Effective Exposure Matrix

| Runtime kind | Run shape | Configured `toolNames` | Effective default baseline | Existing automatic team tools | Required target |
| --- | --- | --- | --- | --- | --- |
| `autobyteus` | Standalone | Empty, partial, or full | Always add exactly `run_bash`, `read_file`, `edit_file` | None | Native tool instances contain the three foundation tools plus configured optional tools |
| `autobyteus` | Team member / mixed task-agent | Empty, partial, or full | Always add exactly `run_bash`, `read_file`, `edit_file` | Preserve current automatic `send_message_to`, `delegate_task` behavior for valid team context | Native tool instances contain the three foundation tools and current team tools, with no duplicates |
| `claude_agent_sdk` | Standalone | Empty, partial, or full | No new native baseline | None | Existing Claude exposure unchanged; requested foundation names appear only when explicitly configured/available under its current projection |
| `claude_agent_sdk` | Team member | Empty, partial, or full | No new native baseline | Preserve current team-pair exposure behavior | Existing Claude team projection unchanged |
| `codex_app_server` | Standalone | Empty, partial, or full | No new native baseline | None | Existing Codex exposure unchanged; requested foundation names appear only when explicitly configured/available under its current projection |
| `codex_app_server` | Team member | Empty, partial, or full | No new native baseline | Preserve current team-pair exposure behavior | Existing Codex team projection unchanged |

## Composition Rules

1. The native default baseline is runtime-derived and must not be written into `AgentDefinition.toolNames`.
2. Configured names are normalized and deduplicated together with the native baseline.
3. Native mixed-team filtering may remove legacy task-management names but must not remove the three foundation names.
4. Existing team automatic tools remain additive and keep their current context/availability guards.
5. Unknown configured optional names remain tolerant: they may be skipped by native registry resolution without preventing the three foundation tools from materializing.
6. Tool schemas, path authorization, shell execution, approval, lifecycle, and event naming remain the current contracts.

## Coverage Matrix

| Scenario | Exposure assertion | Materialization assertion | Definition immutability | External-runtime regression |
| --- | --- | --- | --- | --- |
| Native standalone, empty config | Three names present once | Registry-backed instances named exactly | `toolNames` remains empty | N/A |
| Native team, empty config | Three names plus current team pair | Native instances include all expected names | `toolNames` remains empty | N/A |
| Native partial/full config | No duplicate names | Each configured/default name materializes once | Original order/content preserved | N/A |
| Native mixed team with stale legacy names | Foundation names survive legacy filtering | Foundation instances materialize | Original config preserved | N/A |
| Claude/Codex helper/bootstrap empty config | No native baseline | Existing provider exposure remains empty unless current team/config rules add tools | N/A | Required |
