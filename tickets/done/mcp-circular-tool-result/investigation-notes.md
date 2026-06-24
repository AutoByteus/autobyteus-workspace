# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements approved by user; design spec prepared for architecture review; implementation not started.
- Investigation Goal: Determine why Browser MCP activity results show `[Circular]`, prove whether the marker originates in MCP output or later backend/frontend serialization/projection, and define a fix path if needed.
- Scope Classification (`Small`/`Medium`/`Large`): Small-to-Medium
- Scope Classification Rationale: The root cause is localized to backend payload serialization / Codex MCP result projection, but it sits on a runtime-event spine that affects live Activity, memory, and history projection.
- Scope Summary: Inspected Docker/backend build context, MCP configuration, Browser MCP runtime probes, backend Codex MCP result handling, backend payload serialization, memory projection, and frontend Activity rendering.
- Primary Questions Resolved:
  - Does Browser MCP return `[Circular]` in its actual tool result payload? **No for normal serializable results.** Direct probe returned structured JSON; circular JS return failed with a serialization error instead of returning `[Circular]`.
  - Does the backend MCP/Codex bridge introduce `[Circular]`? **Yes.** `serializePayload` can produce `[Circular]` for shared result references, and `resolveToolResult` can then select that placeholder.
  - Does frontend Activity synthesize `[Circular]`? **No evidence.** Tool Activity rendering displays `activity.result` and has no Activity-specific circular marker logic.
  - What code owner should enforce safe, faithful result projection? **Backend payload serialization plus Codex MCP result conversion.**

## Request Context

User reports that Browser MCP result details in the Activity UI show `[Circular]`, including `run_script` calls. User attached screenshot at `/home/autobyteus/data/memory/agent_teams/software_engineering_team_2d7c4b2964624e0caa5f871197c1e580/solution_designer_b9a3486f91da46baadf7d1a570056979/context_files/ctx_3bfd45b54ad9__image.png`. The user specifically asked to update the main repository personal branch to latest, inspect how backend Docker is built, inspect MCP configuration/source code, and run experiments if needed.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation`
- Task Artifact Folder: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/in-progress/mcp-circular-tool-result`
- Current Branch: `codex/mcp-circular-result-investigation`
- Current Worktree / Working Directory: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` advanced `origin/personal` from `174f6455` to `46acf801847780d936796f3adf493e5ac2378700` on 2026-06-24.
- Task Branch: `codex/mcp-circular-result-investigation` tracking `origin/personal`, created at `46acf801847780d936796f3adf493e5ac2378700`.
- Expected Base Branch (if known): `personal` / `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The original shared checkout `/home/autobyteus/workspace/autobyteus-workspace` was on local `personal` at `174f64554fb63c4f702814c8f58b2b917e7904fd` with uncommitted modifications in `autobyteus-web/docker-compose.yml` and two log files; this investigation intentionally uses a dedicated clean worktree at latest `origin/personal` to avoid overwriting those changes.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-24 | Command | `git -C /home/autobyteus/workspace/autobyteus-workspace status --short --branch` | Identify initial branch and uncommitted state before worktree setup | Shared checkout was `personal...origin/personal` with local modifications | No |
| 2026-06-24 | Command | `git fetch origin personal` | Refresh base branch per user request and workflow requirement | `origin/personal` advanced to `46acf801847780d936796f3adf493e5ac2378700` | No |
| 2026-06-24 | Command | `git worktree add -b codex/mcp-circular-result-investigation /home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation origin/personal` | Create dedicated task worktree from latest base | Clean task branch created from latest `origin/personal` | No |
| 2026-06-24 | Command | `hostname; whoami; node -v; cat /proc/1/cgroup; test -f /.dockerenv` | Confirm runtime/container context | Running as `root` in Docker container, Node `v22.22.2`, `/.dockerenv` exists | No |
| 2026-06-24 | Code | `autobyteus-server-ts/docker/Dockerfile.monorepo` | Understand backend-built Docker image | Runtime image extends `autobyteus/chrome-vnc`, installs Codex and Claude CLIs, copies built server dist, exposes 8000/5900/6080/9223, entrypoint starts supervisor/server | No |
| 2026-06-24 | Code | `autobyteus-server-ts/docker/docker-compose.yml` | Understand configured Docker runtime | Compose mounts `/home/autobyteus/data`, root home, Chromium profile, exposes backend/VNC/Chrome debug ports, sets `AUTOBYTEUS_WORKSPACE_ROOT=/app` and data dir | No |
| 2026-06-24 | Command | `ps -ef` and `/proc/<pid>/environ` inspection | Verify running services | Server process `node dist/app.js`; Codex app-server processes; Browser MCP processes `uv --directory /home/autobyteus/workspace/autobyteus-mcps/browser-mcp run python -m browser_mcp.server`; Chromium remote debugging on 9222/9223 | No |
| 2026-06-24 | Data | `/home/autobyteus/data/mcps.json` | Inspect MCP configuration | `BrowserServer` configured to launch `browser-mcp` via `uv`, with `CHROME_REMOTE_DEBUGGING_PORT=9222` and `AUTOBYTEUS_AGENT_WORKSPACE=/home/autobyteus/workspace` | No |
| 2026-06-24 | Code | `/home/autobyteus/workspace/autobyteus-mcps/browser-mcp/src/browser_mcp/tools/run_script.py` | Verify Browser MCP return behavior | `run_script` uses `structured_output=True`, evaluates JS via Playwright, returns `RunScriptResult(url=page.url, result=result, tab_id=tab_id)`; no `[Circular]` generation | No |
| 2026-06-24 | Probe | `mcp__autobyteus_agent_tools.open_tab({url:"https://example.com"})` | Direct Browser MCP probe | Returned `{"tab_id":"1","url":"https://example.com/"}` | No |
| 2026-06-24 | Probe | `mcp__autobyteus_agent_tools.run_script({tab_id:"1", script:"() => ({title: document.title, answer: 42, href: location.href})"})` | Direct Browser MCP serializable result probe | Returned `{"url":"https://example.com/","result":{"title":"Example Domain","answer":42,"href":"https://example.com/"},"tab_id":"1"}`; not `[Circular]` | No |
| 2026-06-24 | Probe | `mcp__autobyteus_agent_tools.run_script({tab_id:"1", script:"() => { const obj = {name: 'root'}; obj.self = obj; return obj; }"})` | Direct Browser MCP circular result probe | Tool failed with `Error serializing to JSON: ValueError: Circular reference detected (id repeated)`; it did not return `[Circular]` as success content | No |
| 2026-06-24 | Code | `autobyteus-web/components/progress/ToolActivityItem.vue` | Check frontend Activity rendering | `formatJson` returns strings as-is or `JSON.stringify` objects, falling back to `String(val)`; it does not synthesize `[Circular]` for tool results | No |
| 2026-06-24 | Command | `rg -n "\[Circular\]" autobyteus-server-ts autobyteus-web autobyteus-ts` | Locate code that can produce marker | Activity-relevant backend marker is in `autobyteus-server-ts/src/services/agent-streaming/payload-serialization.ts`; frontend marker appears only in `uiErrorStore`, not Activity | No |
| 2026-06-24 | Code | `autobyteus-server-ts/src/services/agent-streaming/payload-serialization.ts` | Inspect serialization implementation | Uses one global `WeakSet` in JSON.stringify replacer, so repeated shared object references become `[Circular]` even when they are not cycles | Yes: fix serializer |
| 2026-06-24 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | Trace Codex MCP local completion construction | For `item.type = mcpToolCall`, `item/completed` emits `codex/local/mcpToolExecutionCompleted` with `{...params}` and enriched ids/arguments, preserving nested object references from raw params | No |
| 2026-06-24 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Trace Activity terminal event creation | Local MCP completion calls `serializeCodexItemEventPayload`, resolves result, then calls `normalizeBrowserMcpToolResult(toolName, result)` for Browser tools before emitting `TOOL_EXECUTION_SUCCEEDED` | Yes: add regression test |
| 2026-06-24 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` | Trace result candidate priority | `resolveToolResult` selects `payload.result` before `item.result`, so top-level `[Circular]` masks a real nested MCP result envelope | Consider fallback only if needed |
| 2026-06-24 | Code | `autobyteus-server-ts/src/agent-tools/browser/browser-mcp-result-normalizer.ts` | Trace Browser result normalization | Correctly unwraps JSON strings, content text blocks, and `structuredContent` when it receives the real MCP result envelope; cannot recover when input is already literal `[Circular]` | No |
| 2026-06-24 | Probe | Node ESM script importing `/app/autobyteus-server-ts/dist/services/agent-streaming/payload-serialization.js` and simulating `{ item: { result }, result }` | Reproduce built-runtime serialization defect | Serialized payload became `{"item":{"result":{...}},"result":"[Circular]"...}` when `item.result` and top-level `result` shared the same object | No |
| 2026-06-24 | Probe | Node ESM script importing built `CodexToolPayloadParser` and `normalizeBrowserMcpToolResult` | Prove result projection consequence | `resolveToolResult(serialized)` returned `"[Circular]"`; Browser normalizer returned `"[Circular]"`, proving the actual browser result can be lost after backend serialization | No |
| 2026-06-24 | Test Source | `autobyteus-server-ts/tests/unit/services/agent-streaming/payload-serialization.test.ts` and `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Find coverage gaps | Existing tests cover true self-cycle and a non-aliased Browser MCP envelope, but not shared-reference aliasing between `params.result` and `params.item.result` | Yes: add tests |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: User-visible Activity panel result detail for Browser MCP `run_script` events.
- Current execution flow for Codex Browser MCP tools:
  1. Browser MCP server returns structured output (`content`/`structuredContent`) from `/home/autobyteus/workspace/autobyteus-mcps/browser-mcp`.
  2. Codex app-server reports an `item/completed` event for `item.type = mcpToolCall`.
  3. `codex-thread-notification-handler.ts` emits a local `codex/local/mcpToolExecutionCompleted` event by shallow-spreading raw `params` and adding normalized ids/arguments.
  4. `codex-item-event-converter.ts` serializes the local payload with `serializeCodexItemEventPayload(...)`.
  5. `serializePayload(...)` replaces repeated object references with `[Circular]`, even when the repeated object is not an ancestor cycle.
  6. `CodexToolPayloadParser.resolveToolResult(...)` prefers `payload.result`; if that field became `[Circular]`, it returns the placeholder instead of `item.result`.
  7. `normalizeBrowserMcpToolResult(...)` receives the placeholder and cannot unwrap the real Browser MCP result envelope.
  8. The emitted `TOOL_EXECUTION_SUCCEEDED` payload/result and frontend Activity store can receive `[Circular]` as the result.
- Ownership or boundary observations: Browser MCP owns browser automation output; Codex event converter owns runtime-event normalization; backend payload serialization owns JSON safety; frontend Activity should only render the normalized payload.
- Current behavior summary: Direct MCP output is normal, but backend serialization can collapse a duplicated result reference into `[Circular]` before Activity receives it.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor posture evidence summary: Current owner boundaries are correct. The defect is in the implementation of JSON-safe serialization and a missing regression scenario in Codex MCP result conversion. No broad refactor is needed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Direct MCP probe | Browser MCP returns normal structured JSON for serializable `run_script`; circular JS returns error rather than `[Circular]` success | MCP server is not the source of the reported normal-case `[Circular]` result | No |
| `payload-serialization.ts` | Global `WeakSet` marks repeated references as `[Circular]` | Local implementation defect in JSON-safe serializer | Fix serializer |
| Built-runtime Node reproduction | Shared `result` object under `item.result` and `result` produces top-level `result: "[Circular]"` | Reproduces the exact marker without MCP returning it | Add regression test |
| `codex-tool-payload-parser.ts` | Top-level `payload.result` is preferred over `item.result` | Placeholder can mask the real nested result envelope | Covered by converter test; consider narrow fallback if needed |
| `ToolActivityItem.vue` | Tool Activity renderer does not generate `[Circular]` | Frontend should not be fixed with a masking workaround | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `/home/autobyteus/data/mcps.json` | Runtime MCP server configuration | `BrowserServer` points at the external browser MCP repo and Chrome debug port | Confirms configured MCP source |
| `/home/autobyteus/workspace/autobyteus-mcps/browser-mcp/src/browser_mcp/tools/run_script.py` | Browser MCP `run_script` implementation | Returns structured `RunScriptResult`; no `[Circular]` generation | MCP server does not own this defect |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | Backend server Docker image | Builds server/web, installs Codex CLI, runs server in chrome-vnc runtime | Running container matches backend image architecture |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | Converts Codex raw notifications into local enriched notifications | Shallow-spreads raw MCP completion params and preserves references | Local completion payload can contain aliased result references |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Converts Codex item/local events into AgentRunEvents | Calls serializer, result parser, and Browser MCP normalizer before success event | Needs regression coverage for aliased result references |
| `autobyteus-server-ts/src/services/agent-streaming/payload-serialization.ts` | JSON-safe backend event payload serialization | Uses global WeakSet and creates false `[Circular]` for shared refs | Primary implementation fix owner |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` | Extracts tool names/arguments/results from Codex payloads | Prefers `payload.result` before `item.result` | Works when serializer preserves both values; susceptible to placeholder masking |
| `autobyteus-server-ts/src/agent-tools/browser/browser-mcp-result-normalizer.ts` | Unwraps known Browser MCP result envelopes | Correct when passed real result envelope | Should stay backend owner of Browser result normalization |
| `autobyteus-web/components/progress/ToolActivityItem.vue` | Displays Activity arguments/logs/result/error | Renders `activity.result`; no Activity-specific `[Circular]` generator | No frontend workaround needed |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/payload-serialization.test.ts` | Serializer unit tests | Covers self-cycle but not shared references | Add shared-reference test |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Codex event converter unit tests | Covers non-aliased Browser MCP envelope but not aliased `result`/`item.result` | Add regression test |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-24 | Probe | `mcp__autobyteus_agent_tools.open_tab` with `https://example.com` | Success: `{"tab_id":"1","url":"https://example.com/"}` | Browser MCP success output is normal JSON |
| 2026-06-24 | Probe | `mcp__autobyteus_agent_tools.run_script` returning `{title, answer, href}` | Success: `{"url":"https://example.com/","result":{"title":"Example Domain","answer":42,"href":"https://example.com/"},"tab_id":"1"}` | Normal `run_script` result is not `[Circular]` from MCP |
| 2026-06-24 | Probe | `mcp__autobyteus_agent_tools.run_script` returning `obj.self = obj` | Failure: `Error serializing to JSON: ValueError: Circular reference detected (id repeated)` | Genuine circular JS values are rejected by Browser MCP/Playwright serialization instead of becoming successful `[Circular]` payloads |
| 2026-06-24 | Script | `node - <<'NODE' ... serializePayload({ item: { result }, result }) ... NODE` using built `/app` dist | Serialized top-level `result` was `[Circular]` while `item.result` retained real MCP envelope | Backend serializer can introduce screenshot marker from shared references |
| 2026-06-24 | Script | `node - <<'NODE' ... CodexToolPayloadParser.resolveToolResult(serialized); normalizeBrowserMcpToolResult('run_script', resolved) ... NODE` | Resolved and normalized result both remained `"[Circular]"` | Result parser/normalizer path explains why Activity result can show placeholder |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None needed; investigation used local runtime, local Browser MCP source, and local backend source.
- Version / tag / commit / freshness: Source worktree at `origin/personal` commit `46acf801847780d936796f3adf493e5ac2378700`; running image contains built `/app` code with the same serializer behavior.
- Relevant contract, behavior, or constraint learned: Browser MCP uses FastMCP structured output and returns JSON-compatible result dictionaries for supported browser tools.
- Why it matters: Confirms the normal-case `[Circular]` is introduced after MCP output, inside AutoByteus backend event projection.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Running backend container with Browser MCP configured; existing VNC Chromium on remote debugging port 9222/9223.
- Required config, feature flags, env vars, or accounts: None for the direct `example.com` probe. Runtime raw Codex event logging was not enabled.
- External repos, samples, or artifacts cloned/downloaded for investigation: None; used existing `/home/autobyteus/workspace/autobyteus-mcps/browser-mcp` checkout.
- Setup commands that materially affected the investigation: Dedicated worktree creation from latest `origin/personal`; Browser MCP tab opened to `https://example.com`.
- Cleanup notes for temporary investigation-only setup: Browser tab `1` may remain open in the Browser MCP session.

## Findings From Code / Docs / Data / Logs

### Docker / runtime

- The server image is built by `autobyteus-server-ts/docker/Dockerfile.monorepo` from a builder stage into an `autobyteus/chrome-vnc` runtime stage.
- The runtime installs `@openai/codex` and `@anthropic-ai/claude-code`, copies built server dist to `/app/autobyteus-server-ts/dist`, starts via `/usr/local/bin/entrypoint.sh`, and exposes VNC/Chromium debug ports.
- Running process state shows:
  - `node dist/app.js --host 0.0.0.0 --port 8000 --data-dir /home/autobyteus/data`
  - Codex app-server processes under `/usr/lib/node_modules/@openai/codex`
  - Browser MCP launched by `uv --directory /home/autobyteus/workspace/autobyteus-mcps/browser-mcp run python -m browser_mcp.server`
  - Chromium remote debugging process and `socat` bridge from 9223 to 9222.

### MCP configuration and Browser MCP behavior

- `/home/autobyteus/data/mcps.json` includes `BrowserServer` with command/args for the `browser-mcp` repo and env values `CHROME_REMOTE_DEBUGGING_PORT=9222`, `AUTOBYTEUS_AGENT_WORKSPACE=/home/autobyteus/workspace`.
- Browser MCP source tools are registered with `structured_output=True`.
- `run_script.py` returns a `RunScriptResult` typed dict with `url`, `result`, and `tab_id`.
- Direct probes prove normal serializable results are returned as actual JSON objects, not `[Circular]`.

### Backend source root cause

- `serializePayload` in `autobyteus-server-ts/src/services/agent-streaming/payload-serialization.ts` uses a single `WeakSet` during `JSON.stringify`:
  - first object occurrence is serialized;
  - any later occurrence of the same object identity is replaced with `[Circular]`;
  - this conflates shared references with true circular ancestor references.
- A Codex local MCP completion payload can carry the same result object under both `item.result` and top-level `result` because `codex-thread-notification-handler.ts` shallow-spreads raw `params`.
- `CodexToolPayloadParser.resolveToolResult(...)` chooses top-level `payload.result` before `item.result`; therefore a false `[Circular]` placeholder can be selected as the authoritative result.
- `normalizeBrowserMcpToolResult(...)` can unwrap Browser MCP envelopes only if it receives the actual envelope; if it receives the placeholder string, it returns the placeholder string.

### Frontend source check

- `autobyteus-web/components/progress/ToolActivityItem.vue` formats results by returning strings as-is or using `JSON.stringify` for objects. It does not contain Activity-specific circular serialization and should not own the fix.

## Constraints / Dependencies / Compatibility Facts

- Must preserve user-visible tool result fidelity.
- Must not crash on genuine circular/non-serializable values.
- Must not overwrite local user modifications in the original shared checkout.
- Must keep Browser MCP result normalization in backend runtime-event projection so live Activity, memory, and history agree.
- Must avoid a frontend-only display workaround because the corrupted result can also reach memory/history projection.

## Open Unknowns / Risks

- Runtime raw Codex events for the original screenshot were not available because raw event logging env vars were not enabled.
- The exact property-order shape of the user's screenshot event was inferred from source and reproduced with the built serializer; if Codex sends other duplicate-reference shapes, the serializer fix should still cover them.
- If implementation adds placeholder skipping in the parser, it must not corrupt legitimate tools that intentionally return the string `[Circular]`.

## Notes For Architect Reviewer

User approved proceeding into implementation design/review on 2026-06-24. Design should remain narrow:

1. Update `serializePayload` to use path/ancestor-aware recursion instead of a global already-seen set, so only true ancestor cycles become `[Circular]` and repeated shared references serialize as duplicate JSON-safe values.
2. Add serializer unit coverage for both shared references and true cycles.
3. Add Codex local MCP Browser completion regression coverage where `params.result` and `params.item.result` alias the same MCP envelope and expect a normalized Browser result object.
4. Keep frontend Activity unchanged except for tests if downstream implementation discovers a renderer-specific regression.
