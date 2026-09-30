# Grok Build Runtime

## Scope and ownership

`grok_build` ("Grok Build") is the fifth Agent runtime, alongside native
`autobyteus`, `codex_app_server`, `claude_agent_sdk`, and `antigravity_cli`.
It drives the user's locally installed xAI `grok` CLI in ACP (Agent Client
Protocol) stdio agent mode. It is available to standalone Agents, flat Team
members, and direct or Team-nested AgentOrg members. Its provider factory is
wired into both the General Process and Application execution scopes.
`AgentRunManager` creates and restores it through the ordinary
manager/factory boundary; Team and Org orchestration keep their normal
topology, exact member addresses, and scoped Agent Tools sessions.

The integration has two layers:

- a **runtime-neutral ACP layer** that can drive any ACP agent over stdio; and
- a **Grok profile** that holds everything xAI-specific.

A future ACP agent is added as a new runtime kind plus a new profile, not as a
new backend. The product does not offer a generic user-selectable "ACP
runtime".

### Source layout

| Path (`src/`) | Layer | Owns |
| --- | --- | --- |
| `runtime-management/acp/` | ACP (neutral) | `AcpAgentProcess` (child spawn, Node↔Web stream bridge, stderr drain, exit, stop), `AcpClientConnection` (one `@agentclientprotocol/sdk` `ClientSideConnection` per process, `initialize`, request timeouts, per-`sessionId` callback routing, buffering for sessions still being opened), `AcpAgentCapabilities` (standard `initialize` fields + `requiredFor({restore, mcp})`), launch-profile contract, initialize-only discovery handshake, `acp-error-message.ts` |
| `agent-execution/backends/acp/` | ACP (neutral) | `AcpAgentRunBackendFactory` (create/restore sequencing, rollback, start-time error conversion), `AcpAgentRunBackend`, `AcpAgentSession` (session state machine), `AcpPermissionBridge`, `AcpSessionUpdateConverter`, `AcpPromptBuilder`, session-profile contract |
| `runtime-management/grok/` | Grok profile | Launch profile (command, args, env, model normalization) and `GrokBuildCapability` (version/agent-mode probe, safe diagnostics) |
| `agent-execution/backends/grok/` | Grok profile | Session profile (`_meta`, MCP entry, extension notifications), tool projection, per-call usage, MCP readiness, `.grok/skills` materializer, factory binding |
| `llm-management/services/grok-build-model-catalog.ts` | Catalog | Handshake-based `ModelInfo[]` |

Dependency rule: `backends/grok → backends/acp → runtime-management/acp →
@agentclientprotocol/sdk` (pinned `1.5.0`). Nothing under an `acp/` folder may
import from `grok/` or contain `grok`, `xai`, or `x.ai` names;
`acp-layer-neutrality.test.ts` enforces this. Only the agent profiles read
`_x.ai/*` notifications or `_meta` extension fields. The shared layer passes
them through without interpreting them. Other runtimes do not import ACP
modules.

## Availability, models, and authentication

- **Command.** The runtime runs `grok` by default. Set `GROK_BUILD_COMMAND`
  to use a different command.
- **Availability probe.** The probe runs `--version`, which must report
  **1.0.41** or later, then checks `agent --help` for the required
  agent-mode flags. It is bounded to 3 s, is asynchronous, and opens no ACP
  session.
- **Safe diagnostics.** Failures become classified diagnostics:
  `GROK_CLI_UNAVAILABLE`, `GROK_CLI_UNSUPPORTED`,
  `GROK_MODEL_DISCOVERY_TIMEOUT`, `GROK_MODEL_DISCOVERY_FAILED`, and
  `GROK_MODEL_CATALOG_INVALID`. Raw stderr, paths, and credentials never
  reach GraphQL or the browser.
- **Model catalog.** Models come from the connected agent, with no
  hard-coded Grok Build list. For each catalog request, the catalog spawns a
  short-lived process and runs `initialize` only (15 s bound; no session and
  no prompt). It normalizes `initialize._meta.modelState` into `ModelInfo`,
  including context capacity and a `reasoning_effort` enum schema with the
  agent's advertised default (for example `grok-4.7`, 500000 tokens,
  `xhigh/high/medium/low`, default `high`). There is no process-global cache.
  Replacement validation follows the other external runtimes: fresh
  **offered** catalog membership plus a valid target schema.
- **Authentication.** Authentication belongs to Grok: the CLI's own login,
  or `XAI_API_KEY` inherited from the server environment. AutoByteus adds no
  login UI, vault binding, or credential relay. The vault's
  `provider.grok.api-key` belongs to the native `autobyteus` runtime and is
  never passed to the child process. Provider errors are surfaced as-is. For
  example, an unauthenticated start fails `createAgentRun` with
  `Grok Build: Authentication required: no auth method id provided`.

## Process, session, and identity

Each run spawns its own process:

```text
grok agent --no-leader --model <model> [--reasoning-effort <effort>] stdio
```

The child inherits the server environment and adds `GROK_SUBAGENTS=0`,
`GROK_WORKFLOWS=0`, and `GROK_ASK_USER_QUESTION=0`. These variables remove
Grok's native `task` subagents, model-launched `workflow` child agents, and
the interactive `ask_user_question` tool. AutoByteus
`delegate_task`/`send_message_to` are the collaboration path, and AutoByteus
has no question-card bridge. AutoByteus never writes to the user's Grok
configuration. The `--no-leader` flag stops a user config from attaching
AutoByteus runs to Grok's shared leader process.

**Create path.**

1. The factory prepares the workspace, the composed Carpenter prompt,
   configured skills, and, when tools are exposed, the run-scoped Agent Tools
   MCP session.
2. It spawns the process and runs `initialize`. Client capabilities are
   `fs:false, terminal:false`.
3. It checks the capabilities the product needs: `loadSession` for restore,
   and HTTP MCP when tools are exposed. Anything missing is named in an
   explicit error.
4. It opens `session/new` with the workspace `cwd`, an HTTP `mcpServers`
   entry, and `_meta` containing exactly `rules` and `yoloMode`.
5. It records the supplied system instructions. The Grok `sessionId`
   becomes `platformAgentRunId` before candidate publication.

**Instruction delivery.** The composed Carpenter prompt goes into
`_meta.rules`, which Grok places inside its own system prompt as a
`<human_rules>` block. This is the Grok equivalent of Codex
`baseInstructions` and Claude `options.systemPrompt`. Grok's own harness
guidance stays intact. The system-instructions Activity records the exact
string AutoByteus supplied.

**MCP readiness gate.** When Agent Tools are exposed, the session waits up to
15 s for `_x.ai/mcp/server_status{name:"autobyteus_agent_tools",
status:"ready"}`. If the server is unavailable or the wait times out,
activation fails with an error naming the server. Grok would otherwise
continue silently without the team tools.

**Restore.** Restore spawns a new process and requires `loadSession`. It
calls `session/load` with the stored `sessionId`, the same working
directory, and a fresh MCP descriptor, then checks MCP readiness again. It
does not inject the rules again, because they persist in the Grok session.
Grok replays history before the load response. Those `session/update` and
usage frames are **dropped**, because UI history comes only from local raw
traces. An unknown session, a load error, or an id mismatch is terminal;
there is no silent new session. On create and restore, provider JSON-RPC
errors from `initialize`, `session/new`, or `session/load` become
`AgentCreationError` with the provider message and data. On restore, the
manager's generic `PlatformAgentRunRestoreError` message is shown, and the
provider text is kept as its `cause`.

**Session state machine.**

```text
created → opening(new|load) → ready ⇄ prompting
prompting → cancelling → ready
any → failed | closed
```

- **Idle timeout.** A turn fails after 5 minutes with no frame for the
  session while no tool call is pending or in progress
  (`ACP_TURN_IDLE_TIMEOUT`). A `tool_call` without a status counts as
  pending, so time spent deciding on an approval does not count.
- **Process failure.** A process exit or transport close during a turn
  closes open segments, interrupts unfinished tools, and emits
  `TURN_INTERRUPTED` followed by a runtime `ERROR`. The backend then becomes
  inactive, stops the process, and releases its skills.
- **Between turns.** Updates that arrive outside a prompt are ignored.

## Turns, events, approvals, and interrupt

**Prompt input.** User text is sent with the shared `Reference files:`
section, which lists local absolute paths for text and image context files.
HTTP(S) and data URLs are excluded. No image prompt blocks are sent; Grok
advertises `image:false`.

**Stream conversion.** `AcpSessionUpdateConverter` maps standard
`session/update` kinds to the existing event spine:

- `agent_thought_chunk` becomes a reasoning segment;
- `agent_message_chunk` becomes a text segment;
- `tool_call` and `tool_call_update` become a tool card and its lifecycle,
  keyed by `toolCallId`.

An open reasoning or text segment always ends before a tool card, a
different segment kind, a usage record, or the turn end. Unknown update kinds
and unknown `_x.ai/*` notifications, such as announcements, settings,
command lists, and queue bookkeeping, are ignored and never shown as chat
content.

**Tool projection.** The Grok profile names tools from
`_meta["x.ai/tool"].name`, never from the display title. Permission requests
use the same projection, so an approval card matches its tool card.

| Grok tool | Canonical AutoByteus tool | Notes |
| --- | --- | --- |
| `run_terminal_command` | `run_bash` (`command`, `cwd?`) | Output from `output_for_prompt`; a non-zero exit becomes `TOOL_EXECUTION_FAILED` with `Exit code: n` |
| `write` | `write_file` (`file_path`, `content`) | Drives `FILE_CHANGE` artifacts through the tool lifecycle |
| `search_replace` | `edit_file` (`file_path`, …) | The path falls back to ACP `locations[0].path` |
| `use_tool` → `autobyteus_agent_tools__<tool>` | `<tool>` (for example `send_message_to`, `get_handoff_rules`) | Grok reaches MCP tools through `search_tool`/`use_tool`; results reuse the MCP result-family projection |
| other built-ins (`list_dir`, `read_file`, `search_tool`, …) | unchanged name | `search_tool` cards stay visible |

**Approvals.**

- With `autoExecuteTools=true`, the session sets `yoloMode`. Yolo mode does
  not persist through `session/load`, so a restored auto-execute run answers
  permission requests with `allow_once` itself.
- With `autoExecuteTools=false`, each `session/request_permission` becomes a
  `TOOL_APPROVAL_REQUESTED` under the tool call id. The user's decision is
  answered with the agent-offered `allow_once` or `reject_once` option.
  AutoByteus never grants "always".
- Grok's own permission policy decides which calls prompt. AutoByteus shows
  every request Grok raises.
- Grok launch drafts use the standard auto-execute default. The AGY-only
  default-on policy does not apply.
- Every permission request is always answered. On interrupt, close, or turn
  end, pending requests are answered `cancelled`.

**Turn end classification.** The prompt result ends the turn as follows:

| Prompt result | Turn outcome |
| --- | --- |
| `end_turn` or another normal stop | `TURN_COMPLETED` |
| Provider JSON-RPC error | One turn-terminal `ERROR` with the provider message, and no extra `TURN_COMPLETED`; the run stays ready |
| `cancelled` after a user interrupt | `TURN_INTERRUPTED` |
| `cancelled` after the user denied a permission in this turn | `TURN_COMPLETED` (`provider_stop_reason:"cancelled"`); the tool is already shown `TOOL_DENIED`, and the next message continues the conversation |
| `cancelled` with no user denial | `TURN_INTERRUPTED` |

A denial produces the fourth row because Grok ends its turn after
`reject_once`.

**Interrupt.** Interrupt answers pending permissions `cancelled` and sends
`session/cancel`. The resulting `cancelled` stop ends the turn as
interrupted, and the process and session stay usable. The live check
measured 101 ms.

## Token usage

Grok reports usage per model call through
`_x.ai/session_notification{response_completed}`. Each such notification
becomes one `TOKEN_USAGE_UPDATED` record with these fields:

- `runtime_kind: "grok_build"`, `ingestion_kind: "grok_acp_call"`,
  `usage_scope: "per_call"`;
- `input_token_semantic: "base_excludes_cache"`;
- idempotency key `grok_build:<sessionId>:<turnId>:<ordinal>`;
- `model_provider: "GROK"` and the session model.

The per-call records of a turn add up to Grok's reported turn usage. Pricing
uses the existing catalog path (`LLMFactory` pricing for `grok-4.7`), and the
≤200k and >200k tiers are chosen per request from that call's input plus
cache. Grok's `costUsdTicks` stays only in `raw_usage_json`.

Some usage data is deliberately left out:

- The prompt result and `turn_completed` totals are cross-check data only,
  never ledger records. An aggregate turn record would select the wrong
  price tier.
- Usage frames replayed during `session/load` are dropped.
- A model call that an interrupt aborts in flight is not reported by Grok and
  cannot be recorded.

Analytics labels the runtime "Grok Build".

## Skills

Configured skills are symlinked into `.grok/skills/<name>` in the run working
directory. The shared workspace skill materializer applies the same
collision, repair, and release rules as `.codex/skills` and `.claude/skills`.
The symlinks are removed on terminate or failure.

## Persistence

No migration is needed. Existing data is directly usable:

- `runtimeKind` validation is enum-driven.
- The Grok `sessionId` is stored in the existing `platformAgentRunId`.
- `grok_acp_call` is a new open-string ingestion kind.
- The team-stream and collaboration-stream contract enums include
  `grok_build`.

Grok stores its own session data, including AutoByteus prompt text, under
`~/.grok/sessions/`. That data belongs to Grok and is never read, copied, or
migrated.

## Known limits

- **Application launch is not yet runnable.** The wiring exists in both
  execution scopes. However, the application credential authority for
  `GROK_BUILD` is `unsupported`, as it is for AGY, so application launch
  preflight always reports `RUNTIME_AUTHENTICATION_UNAVAILABLE`. Grok and AGY
  application launches therefore cannot become RUNNABLE. This is deferred to
  a future ticket.
- **Web search.** Grok web search runs on the provider side and is not a
  function tool, so its live use depends on the user's plan.
- **Protocol drift.** Grok CLI updates can change `_x.ai/*` shapes. Those
  shapes are handled only in the Grok profile, behind the minimum-version
  gate, and unknown traffic is ignored.
- **Out of scope.** Grok leader mode, headless `grok -p`, `grok agent serve`,
  Grok sandbox/permission-rule settings, and CLI provisioning in Docker or
  Electron are outside this runtime.
- **Adding another ACP agent.** A future ACP agent without `loadSession`, HTTP
  MCP, or a system-prompt `_meta` slot gets an explicit missing-capability
  error from the shared layer. Prompt delivery for such an agent would need
  its own session-profile strategy.

## Validation

- **Default CI.** Unit suites replay sanitized real Grok 1.0.41 wire traffic
  from `tests/fixtures/grok-acp/*.jsonl` through the ACP layer and the Grok
  profile. Two e2e tests use the fake CLIs (`fake-acp-agent.mjs`,
  `fake-grok-cli.mjs`, `tests/e2e/helpers/grok-fake-cli.ts`):
  `tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts` covers all five
  runtime kinds, and `tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts`
  covers the catalog, stream and per-call usage, approve, deny→completed,
  mid-turn exit, and unauthenticated start. Both run through the real
  server at zero cost.
- **Opt-in live suite.**
  `tests/e2e/runtime/grok-build-live-runtime.e2e.test.ts` runs only with
  `RUN_GROK_E2E=1` and a working `grok` command. It uses paid inference on
  the user's plan. Optional settings are `GROK_E2E_MODEL`,
  `GROK_E2E_REASONING_EFFORT` (default `low`), and
  `GROK_E2E_STEP_TIMEOUT_MS`. It covers standalone approve/deny/interrupt/
  restore, a mixed Team with a Grok member talking to Claude, and an Org
  relay with restore.
