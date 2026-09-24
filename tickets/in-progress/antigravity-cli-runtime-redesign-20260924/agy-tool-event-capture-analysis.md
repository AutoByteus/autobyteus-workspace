# AGY tool-event JSON capture and inspection — 2026-09-24

## Scope and raw evidence

This is a **live CLI 1.2.10 experiment**, not an AutoByteus integration test or an authoritative design. `agy-tool-event-capture.py` used four harmless prompts in disposable projects with `gemini-3.8-flash-low`. `agy-multiturn-tool-event-capture.py` sent two correctly shaped stdin user events through one process. `agy-command-failure-event-capture.py` tested an allowed command deliberately exiting 7. These scripts stored **unmodified stdout NDJSON** and stderr in `agy-tool-event-capture/`; manifest/summary JSON files are derived indexes, not substitutes for the raw files. The probes used only created fixture data and did not edit user-global settings. `--dangerously-skip-permissions` was used for the allowed command, file write, nonzero-command and two-turn controls; the denied command ran under default policy.

| Case | Exact stdout evidence | Result verified |
| --- | --- | --- |
| File read | `agy-tool-event-capture/view_file.stdout.jsonl` | `view_file` ACTIVE → DONE; assistant returned fixture marker; tool output only `2 lines, 16 bytes`. |
| Allowed shell | `agy-tool-event-capture/run_command_allowed.stdout.jsonl` | `run_command` ACTIVE → DONE; `tool_info.output` contains exact marker. |
| Denied shell | `agy-tool-event-capture/run_command_denied.stdout.jsonl` and matching `.stderr.txt` | `run_command` ACTIVE → ERROR; `tool_info.error` and `result.denied_actions` identify denial, while top-level status is `SUCCESS` and exit is 0. |
| File write | `agy-tool-event-capture/file_write_allowed.stdout.jsonl` | `write_to_file` ACTIVE → DONE; fixture inspection before temporary-directory removal verified `created.txt` contains `TOOL-EVENT-WRITE\n`, but event parameters expose only `TargetFile`, not the written content. |
| Nonzero shell exit | `agy-tool-event-capture/run_command_nonzero.stdout.jsonl` | Command `sh -c 'exit 7'` ran once; `run_command` ACTIVE → DONE with **no output, error, or exit-code field** in `tool_info`, while the assistant text said it failed with code 7 and overall result was SUCCESS. |
| Two tool turns, one process | `agy-tool-event-capture/multi_turn.stdout.jsonl` | One `init`, two `result`s, same conversation ID, two distinct `run_command` steps, step indexes 2 and 6; results have `num_turns` 1 and 2. |

An initial malformed multi-turn input used a string `message` instead of `{ "content": "..." }`; its raw output is retained as `multi_turn_malformed.*`. AGY emitted an ERROR result and exited 1. The corrected script and successful capture use the [documented stdin format](https://antigravity.google/docs/cli/headless/).

## Inspected event shape

All four single-turn successful parses had 0 non-JSON stdout lines. Each began with `init` (`conversation_id`, configuration including `permission_mode` and **available** tool names), then `step_update` events, then `result`. The `init.tools` list is availability, **not evidence those tools ran**. Tool invocation is a `step_update` with `step_type: "tool"`, `tool_name`, `step_index`, `state`, and `tool_info`.

The allowed shell case emitted this call/result pair (excerpt from its verbatim file, with unrelated fields omitted here only):

```json
{"step_index":2,"state":"ACTIVE","step_type":"tool","tool_name":"run_command","tool_info":{"name":"run_command","parameters":{"CommandLine":"printf TOOL-EVENT-ALLOWED"}}}
{"step_index":2,"state":"DONE","step_type":"tool","tool_name":"run_command","tool_info":{"name":"run_command","parameters":{"CommandLine":"printf TOOL-EVENT-ALLOWED"},"output":"TOOL-EVENT-ALLOWED"}}
```

The denied case had the same step index in ACTIVE and ERROR, with `tool_info.error.type: "TOOL_ERROR"` and a permission-denial message. The final `result` still had `status: "SUCCESS"`, empty `response`, and `denied_actions: [{"action":"command","display_name":"RunCommand"}]`; stderr also carried a notice. Thus process exit 0 or overall SUCCESS must not override the tool's ERROR state. Conversely, a real shell command returning 7 was marked tool DONE with no structured exit code/error/output in this sample, even though the assistant reported failure in prose. A converter must **not equate DONE with successful underlying command exit** when AGY omits that status. In the tested allowed write, `write_to_file` DONE had no `tool_info.output`; the stream did not disclose the authored bytes even though the file existed with expected content.

The `user_input` step contained no submitted message text in these captures: AutoByteus must record its own submitted input. Some `agent_response` steps had no `text_delta` (an internal pre-tool step); final assistant text arrived as ACTIVE/DONE deltas. The per-turn `result.response` repeated the assembled answer, so a converter must not append both deltas and response as separate assistant messages. In the two-turn capture, step indexes advanced across the conversation, the same index linked ACTIVE/DONE for each tool, `result.response` was turn-local, and `num_turns`/usage were cumulative. No dedicated provider tool-call ID was present in these samples; using conversation ID plus step index as a correlation key is a **candidate inference**, subject to additional lifecycle tests.

## Design relevance and limits

The observed JSON contains enough structure to propose an AGY-to-`AgentRunEvent` adapter and feed AutoByteus's existing normalized raw-trace recorder/Event Monitor: tool start and terminal state, tool name/parameters, output or error when exposed, assistant text deltas, exact conversation ID, and turn result. It does **not** establish that every AGY tool exposes full inputs/outputs or execution outcome: `view_file` returned a size summary, `write_to_file` omitted written bytes, and an underlying command exit 7 lacked a machine-readable exit code. Raw AutoByteus trace items should therefore record only supplied tool information and known app input, with no fabricated full payload or success claim beyond AGY's emitted tool state. This experiment **did not implement or validate** the adapter, recorder write, frontend rendering, all tool categories, retries, subagents, or cross-version stability. The authoritative design must still decide normalization and test those production paths after complete requirements approval.
