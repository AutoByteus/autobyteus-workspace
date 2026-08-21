# Codex Shell CWD Probe Evidence

## Purpose

Retain the focused, reviewable evidence that distinguishes:

1. the model-facing Codex tool call,
2. the stable Codex app-server command-execution item,
3. the current AutoByteus live-event conversion, and
4. the current AutoByteus native-history normalization.

This artifact is evidence only. The requirements doc remains authoritative for intended behavior.

## Environment

- Date: 2026-08-21
- Host: macOS, arm64
- Installed runtime: `codex-cli 0.149.0`
- Probe model: `gpt-5.4-mini`, reasoning effort `low`
- App-server launch: `codex app-server`
- Thread workspace: a disposable directory created with prefix `codex-cwd-native-probe-`
- Per-command target: a `nested-target` directory below that disposable workspace
- Thread approval/sandbox settings: `approvalPolicy: "never"`, `sandbox: "workspace-write"`

## Experiment 1 — Version-Exact Generated Protocol

Commands:

```bash
codex --version
codex app-server generate-json-schema --experimental --out <temporary-schema-dir>
codex app-server generate-ts --experimental --out <temporary-ts-dir>
```

Relevant generated `v2/ThreadItem.ts` contract:

```ts
{
  type: "commandExecution";
  id: string;
  command: string;
  cwd: LegacyAppPathString;
  status: CommandExecutionStatus;
  commandActions: Array<CommandAction>;
  aggregatedOutput: string | null;
  exitCode: number | null;
  // other fields omitted
}
```

The generated `v2/CommandExecutionRequestApprovalParams.ts` contract independently exposes:

```ts
{
  command?: string | null;
  cwd?: LegacyAppPathString | null;
  // other approval fields omitted
}
```

**Finding:** Codex app-server `0.149.0` makes command working directory an explicit stable app-server field named `cwd`; it is required on a `commandExecution` thread item and optional on an approval request.

## Experiment 2 — Direct Live App-Server Probe

The disposable JSON-RPC driver performed:

1. `initialize`
2. `thread/start` with the disposable workspace as thread `cwd`
3. `turn/start` with an instruction to call the shell exactly once using command `pwd` and a different per-command working directory (`nested-target`), without `cd` or a directory-prefixed shell expression
4. raw frame capture until after the command and final answer completed

### Model-Facing Raw Function Call

The opt-in `rawResponseItem/completed` event contained this function call (temporary path retained exactly as observed):

```json
{
  "type": "function_call",
  "name": "exec_command",
  "arguments": "{\"cmd\":\"pwd\",\"workdir\":\"/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/codex-cwd-native-probe-8c476mr0/nested-target\",\"yield_time_ms\":10000,\"max_output_tokens\":2000}",
  "call_id": "call_1bNRDtCKBKyIritTxj0zMJtd"
}
```

### Stable App-Server Item Start

The corresponding `item/started` notification contained:

```json
{
  "item": {
    "type": "commandExecution",
    "id": "call_1bNRDtCKBKyIritTxj0zMJtd",
    "command": "/bin/bash -lc pwd",
    "cwd": "/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/codex-cwd-native-probe-8c476mr0/nested-target",
    "source": "unifiedExecStartup",
    "status": "inProgress",
    "commandActions": [{ "type": "unknown", "command": "pwd" }],
    "aggregatedOutput": null,
    "exitCode": null
  },
  "threadId": "01a023aa-5667-73b2-8cd6-9ce76b9089cf",
  "turnId": "01a023aa-580a-70e1-81d8-0043fd894586"
}
```

### Stable App-Server Item Completion

The corresponding `item/completed` notification contained:

```json
{
  "item": {
    "type": "commandExecution",
    "id": "call_1bNRDtCKBKyIritTxj0zMJtd",
    "command": "/bin/bash -lc pwd",
    "cwd": "/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/codex-cwd-native-probe-8c476mr0/nested-target",
    "source": "unifiedExecStartup",
    "status": "completed",
    "commandActions": [{ "type": "unknown", "command": "pwd" }],
    "aggregatedOutput": "/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/codex-cwd-native-probe-8c476mr0/nested-target\n",
    "exitCode": 0,
    "durationMs": 231
  }
}
```

macOS resolves `/var` through `/private/var` in `pwd` output; both strings identify the same disposable directory.

**Finding:** Codex did use the requested per-command working directory. The suspected behavior is not an execution failure inside Codex. The model-facing field is `workdir`, and Codex app-server already translates it into the stable command item field `cwd`.

### Probe Limitation

The disposable driver timed out waiting for an additional `turn/completed` notification after it had already captured the successful command completion and final assistant message. This does not affect the shell-call or working-directory evidence. The orphaned probe app-server process was terminated explicitly.

## Experiment 3 — Current AutoByteus Conversion

A disposable Vitest probe passed the captured app-server shape through the real `CodexThread` harness and `CodexThreadEventConverter`, then passed the same item through `normalizeCodexThreadHistoryItem`. The temporary test file and temporary dependency symlinks were removed after execution.

Command:

```bash
./node_modules/.bin/vitest run \
  tests/unit/agent-execution/backends/codex/events/.codex-cwd-conversion-investigation.probe.test.ts \
  --reporter=verbose
```

Live conversion output:

```text
CODEX_CWD_LIVE_CONVERSION_PROBE {
  "nativeItem": {
    "type": "commandExecution",
    "command": "/bin/bash -lc pwd",
    "cwd": "/tmp/codex-cwd-probe/nested-target"
  },
  "normalizedToolName": "run_bash",
  "normalizedArguments": {
    "command": "/bin/bash -lc pwd"
  }
}
```

Native-history normalization output:

```text
CODEX_CWD_HISTORY_NORMALIZATION_PROBE {
  "nativeItem": {
    "type": "commandExecution",
    "command": "/bin/bash -lc pwd",
    "cwd": "/tmp/codex-cwd-probe/nested-target"
  },
  "normalizedToolName": "run_bash",
  "normalizedArguments": {
    "command": "/bin/bash -lc pwd"
  }
}
```

Vitest result: `2 passed`.

**Finding:** Both paths reproduce the omission. The test passes because it asserts the current observed output, not the desired behavior.

## Static Root-Cause Trace

### Shared Argument Parser

`autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts`:

- merges only `arguments`, `args`, and `input` records from the payload and nested item;
- separately synthesizes canonical `command` from `command`/`cmd`/command actions;
- does not read `payload.cwd` or `item.cwd` for the `run_bash` case.

### Affected Consumers

- Live `item/started` and `item/completed` projection calls this parser through `CodexItemEventPayloadParser` and `CodexThreadEventConverter`.
- `item/commandExecution/requestApproval` projection calls the same parser; app-server supplies `cwd` at payload top level, so approval arguments also lose it.
- `normalizeCodexThreadHistoryItem` calls the same parser for `commandExecution` items, so runtime-native diagnostic/history normalization loses nested `item.cwd`.
- Future application-owned raw traces persist `payload.arguments`; therefore a corrected live conversion will persist `cwd` for future calls without changing the trace schema.

## Execution Ownership Finding

AutoByteus does **not** convert the Codex command and then execute the AutoByteus `run_bash` implementation. Codex app-server performs the shell execution. AutoByteus maps Codex command lifecycle facts to the canonical tool name `run_bash` for streaming, approval presentation, memory traces, and history projection.

This distinction constrains the fix: preserve app-server `cwd` in the canonical event arguments; do not reroute Codex command execution through `autobyteus-ts` `run_bash` and do not depend on experimental raw Responses API frames.

## Verdict

**Confirmed missing mapping.** Codex emits working-directory intent, Codex app-server exposes the effective per-command directory as `cwd`, and the AutoByteus shared Codex tool-payload parser currently omits that field when constructing canonical `run_bash` arguments.
