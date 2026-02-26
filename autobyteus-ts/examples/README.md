# Autobyteus TypeScript Examples

This folder contains runnable example scripts for the TypeScript version of Autobyteus.
They mirror the Python examples and are intended for manual validation and demos.

## How to Run

Enter the `autobyteus-ts/` folder first:

```bash
cd autobyteus-ts
```

Make sure dependencies are installed:

```bash
pnpm install
```

These examples import TypeScript modules that use `.js` specifiers (for ESM parity),
so they should be run from compiled output. Build once, then run the generated JS.

From `autobyteus-ts/`:

```bash
pnpm exec tsc -p tsconfig.examples.json
node dist-examples/examples/run_poem_writer.js
```

All examples accept `--help-models` to list model identifiers and `--llm-model` to pick one.

To exit the single-agent CLI, type `/quit` or `/exit`. For the team TUI, press `q`.

## Agent Examples

- Poem writer (writes to `--output-dir` using `write_file`):
  ```bash
  pnpm exec ts-node --esm examples/run_poem_writer.ts \
    --llm-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234 \
    --topic "a winter sunrise" \
    --output-dir ./poems
  ```
- Agent with skill (preloads `examples/skills/image_concatenator`):
  ```bash
  pnpm exec ts-node --esm examples/run_agent_with_skill.ts \
    --llm-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234
  ```
  Note: the skill references a script path; provide the script if you want to actually run it.
- Agentic software engineer (workspace + local tools):
  ```bash
  pnpm exec ts-node --esm examples/run_agentic_software_engineer.ts \
    --llm-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234 \
    --workspace-path ./agent_workspace
  ```
- Deep research agent (search + URL reading + paper download + report writing):
  ```bash
  pnpm exec ts-node --esm examples/run-deep-research-agent.ts \
    --llm-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234 \
    --workspace-path ./deep_research_workspace \
    --topic "Compare retrieval-augmented generation evaluation methods in 2024-2026"
  ```
- Browser MCP agent (uses `npx @browsermcp/mcp@latest`):
  ```bash
  pnpm exec ts-node --esm examples/run_browser_agent.ts \
    --llm-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234
  ```
- SQLite MCP agent:
  ```bash
  pnpm exec ts-node --esm examples/run_sqlite_agent.ts \
    --llm-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234
  ```
- Google Slides MCP agent:
  ```bash
  pnpm exec ts-node --esm examples/run_google_slides_agent.ts \
    --llm-model qwen/qwen3-next-80b:lmstudio@192.168.2.158:1234
  ```
- Status transitions table:
  ```bash
  pnpm exec ts-node --esm examples/discover_status_transitions.ts
  ```

## Environment

Examples will try to load a `.env` from the repo root if present. You can also export
environment variables directly in your shell.

Each example writes logs to its own file under `./logs/` by default. You can override
the log file path with `AUTOBYTEUS_LOG_FILE` if you prefer a different location.

MCP-backed examples require additional variables:

- `run_sqlite_agent.ts`: `TEST_SQLITE_MCP_SCRIPT_PATH`, `TEST_SQLITE_DB_PATH`
- `run_google_slides_agent.ts`: `TEST_GOOGLE_SLIDES_MCP_SCRIPT_PATH`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`

Search-backed examples (for example `run-deep-research-agent.ts`) require one search provider:

- `SERPER_API_KEY`, or
- `SERPAPI_API_KEY`, or
- both `VERTEX_AI_SEARCH_API_KEY` and `VERTEX_AI_SEARCH_SERVING_CONFIG`

To reduce console noise, set `AUTOBYTEUS_LOG_LEVEL` to `warn`, `error`, or `silent`:

```bash
AUTOBYTEUS_LOG_LEVEL=warn node dist-examples/examples/run_poem_writer.js
```

To log everything to a file, set `AUTOBYTEUS_LOG_FILE`:

```bash
AUTOBYTEUS_LOG_LEVEL=debug AUTOBYTEUS_LOG_FILE=./logs/autobyteus.log \
  node dist-examples/examples/run_poem_writer.js
```

## Agent Team Examples

Agent team examples live in `examples/agent-team/`. See the README there for details
and usage patterns.
