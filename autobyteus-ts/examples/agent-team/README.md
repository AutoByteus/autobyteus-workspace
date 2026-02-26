# Agent Team Examples (TypeScript)

These examples demonstrate how to build and run multi-agent teams with the TypeScript
version of Autobyteus. They mirror the Python examples, but use the Ink-based TUI.

## Categories

- `manual-notification/`: Coordinator agents explicitly send messages to start work.
- `event-driven/`: Coordinator publishes a plan and the system handles notifications.

## Running Examples

Build examples once, then run the compiled JS:

First enter `autobyteus-ts/`:

```bash
cd autobyteus-ts
```

```bash
pnpm exec tsc -p tsconfig.examples.json
node dist-examples/examples/agent-team/manual-notification/run-team-with-tui.js
```

Press `q` to quit the TUI.

## Example Scripts

Manual notification:

```bash
# Basic two-agent demo
node dist-examples/examples/agent-team/manual-notification/run-team-with-tui.js --llm-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234

# Basic research team
node dist-examples/examples/agent-team/manual-notification/run-basic-research-team.js --llm-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234

# Multi-specialist research team
node dist-examples/examples/agent-team/manual-notification/run-multi-researcher-team.js --llm-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234

# Hierarchical debate team
node dist-examples/examples/agent-team/manual-notification/run-debate-team.js --llm-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234

# Software engineering team (manual)
node dist-examples/examples/agent-team/manual-notification/run-software-engineering-team.js --llm-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234
```

Event-driven:

```bash
# Software engineering team (event-driven notifications)
node dist-examples/examples/agent-team/event-driven/run-software-engineering-team.js --llm-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234
```

## Switching Notification Modes

The event-driven examples set `AUTOBYTEUS_TASK_NOTIFICATION_MODE=system_event_driven` automatically.
You can override it in your shell if needed.

## Tool Call Format

You can override the tool-call parser by setting `AUTOBYTEUS_STREAM_PARSER` to
`api_tool_call`, `xml`, or `json` before running an example.

## Logging

Each team example writes logs to its own file under `./logs/` by default. To reduce
console noise, set `AUTOBYTEUS_LOG_LEVEL` to `warn`, `error`, or `silent`. To override
the log file path, set `AUTOBYTEUS_LOG_FILE`:

```bash
AUTOBYTEUS_LOG_LEVEL=debug AUTOBYTEUS_LOG_FILE=./logs/agent_team_software_engineering_event.log \
  node dist-examples/examples/agent-team/event-driven/run-software-engineering-team.js
```

## Model Selection

All scripts accept `--llm-model` and support `--help-models` to list available model identifiers.
You can override per-role models (e.g., `--engineer-model`) where supported.

Example: run a team with a local LM Studio Qwen model and XML tool calls:

```bash
AUTOBYTEUS_STREAM_PARSER=xml node dist-examples/examples/agent-team/event-driven/run-software-engineering-team.js \
  --coordinator-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234 \
  --engineer-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234 \
  --reviewer-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234 \
  --tester-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234
```

Example: run with a local Gemma model:

```bash
node dist-examples/examples/agent-team/event-driven/run-software-engineering-team.js \
  --coordinator-model google/gemma-3n-e4b:lmstudio@192.168.2.126:1234 \
  --engineer-model google/gemma-3n-e4b:lmstudio@192.168.2.126:1234 \
  --reviewer-model google/gemma-3n-e4b:lmstudio@192.168.2.126:1234 \
  --tester-model google/gemma-3n-e4b:lmstudio@192.168.2.126:1234
```
