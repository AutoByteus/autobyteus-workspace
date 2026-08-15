# Runtime Tool Exposure Matrix

- **Status:** Approved intended-behavior supplement — explicit user approval is recorded in requirements; architecture review remains the gate before the follow-up implementation change.
- **Purpose:** Make the runtime-kind and run-context boundary explicit for the four requested native default tools and existing team defaults.
- **Canonical relationship:** This supplement constrains REQ-001 through REQ-005 and REQ-007 and AC-001 through AC-007 and AC-010 in `requirements.md`; it supports the design's runtime-isolation, materialization, and coverage decisions. The implementation must keep this matrix aligned.

## Effective Exposure Matrix

| Runtime kind | Run shape | Configured `toolNames` | Effective default baseline | Existing automatic team tools | Required target |
| --- | --- | --- | --- | --- | --- |
| `autobyteus` | Standalone create/restore | Empty, partial, or full | Always add exactly `run_bash`, `read_file`, `edit_file`, `write_file` | None | Native tool instances contain the four foundation tools plus configured optional tools |
| `autobyteus` | Team member / mixed task-agent create/restore | Empty, partial, or full | Always add exactly `run_bash`, `read_file`, `edit_file`, `write_file` | Preserve current automatic `send_message_to`, `delegate_task` behavior for valid team context | Native tool instances contain the four foundation tools and current team tools, with no duplicates |
| `claude_agent_sdk` | Standalone create/restore | Empty, partial, or full | No new native baseline | None | Existing Claude exposure unchanged; requested foundation names appear only when explicitly configured/available under its current projection |
| `claude_agent_sdk` | Team member create/restore | Empty, partial, or full | No new native baseline | Preserve current team-pair exposure behavior | Existing Claude team projection unchanged |
| `codex_app_server` | Standalone create/restore | Empty, partial, or full | No new native baseline | None | Existing Codex exposure unchanged; requested foundation names appear only when explicitly configured/available under its current projection |
| `codex_app_server` | Team member create/restore | Empty, partial, or full | No new native baseline | Preserve current team-pair exposure behavior | Existing Codex team projection unchanged |

## Composition Rules

1. The native default baseline is runtime-derived and must not be written into `AgentDefinition.toolNames`.
2. The native baseline is the ordered tuple `run_bash`, `read_file`, `edit_file`, `write_file`; configured names are normalized and deduplicated with it.
3. Native mixed-team filtering may remove legacy task-management names but must not remove any foundation name.
4. Existing team automatic tools remain additive and keep their current context/availability guards.
5. Unknown configured optional names remain tolerant: they may be skipped by native registry resolution without preventing any of the four foundation tools from materializing.
6. `write_file` remains the existing registered native tool. Its creation/overwrite behavior, trusted-local path semantics, approval gate, and execution result contract are reused without change.
7. Tool schemas, path authorization, shell/file execution, approval, lifecycle, and event naming remain the current contracts.
8. Claude/Codex continue to use the runtime-neutral exposure boundary directly; the native wrapper and four-tool baseline are forbidden dependencies for those paths.

## Coverage Matrix

| Scenario | Exposure assertion | Materialization assertion | Definition immutability | Approval/path contract | External-runtime regression |
| --- | --- | --- | --- | --- | --- |
| Native standalone, empty config, create and restore | Four names present once | Registry-backed instances named exactly | `toolNames` remains empty | Existing approval and trusted-local path semantics remain unchanged | N/A |
| Native team, empty config, create and restore | Four names plus current team pair | Native instances include all expected names | `toolNames` remains empty | Existing team-tool and file-tool approval behavior remains unchanged | N/A |
| Native partial/full config including `write_file` | No duplicate names | Each configured/default name materializes once | Original order/content preserved | `write_file` and `edit_file` retain existing file-path behavior | N/A |
| Native mixed team with stale legacy names | All four foundation names survive legacy filtering | Foundation instances materialize | Original config preserved | No default changes to approval/path enforcement | N/A |
| Claude/Codex helper/bootstrap empty config | No native baseline | Existing provider exposure remains empty unless current team/config rules add tools | N/A | Existing provider contracts unchanged | Required |
| API/E2E native standalone/team file-tool journey | Four-tool exposure is observable through representative run behavior | Approved native file call materializes/executed through existing registry | Persisted definition remains unchanged | Approval event, execution, and path/file side effect remain canonical | Required isolation reruns |
