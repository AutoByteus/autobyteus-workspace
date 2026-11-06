# DeepSeek Harness Runtime

## Scope and ownership

DeepSeek Harness (`dsh`, npm `@deepseek-ai/dsh`) is DeepSeek's own agent program. AutoByteus runs it as the runtime
kind `deepseek_harness` ("DeepSeek Harness") on the shared ACP backend, one `dsh --profile acp` process and one ACP
session per run, for agents, Teams, Orgs and application launches in the studio. Users install dsh themselves
(Node.js 24.9 or later).

dsh's model calls never hold the DeepSeek key. They go to the credential proxy's DeepSeek **provider relay**
(see [Credential Proxy](./credential_proxy.md#provider-relays)), which checks the run's pass, adds the key from the
vault (`provider.deepseek.api-key`, Settings → API Keys) and streams the reply back unchanged. The relay also reports
each call to the run's session: that is where dsh's token usage, compaction boundaries and turn liveness come from,
because dsh reports none of them over ACP.

dsh runs only where the process runs the credential proxy (the studio). The standalone application host has none:
there dsh shows as unavailable with the reason "DeepSeek Harness needs the AutoByteus credential proxy, which this
host does not run.", and a launch is refused before dsh starts (`PROVIDER_RELAY_UNAVAILABLE`). dsh never falls back
to a key it finds itself.

dsh is a developer preview. AutoByteus has no version gate for it: a change that breaks the integration is handled as
a bug.

### Source layout

| Path | Owner | Concern |
| --- | --- | --- |
| `runtime-management/deepseek-harness/deepseek-harness-identity.ts` | dsh | Label, command (`DEEPSEEK_HARNESS_COMMAND` or `dsh`), relay id `deepseek`, `DSH_PROVIDER_ROUTE` (`deepseek-official`, dsh's own name for its route to DeepSeek's API), npm package, install URL |
| `runtime-management/deepseek-harness/deepseek-harness-home.ts` | `DeepSeekHarnessHome` | `<appData>/runtimes/deepseek-harness/`: `home` (the `DSH_HOME`), `runs/<runId>`, `discovery`; home files written atomically when they differ |
| `runtime-management/deepseek-harness/deepseek-harness-home-files.ts` | dsh | The home patch and the instructions plugin |
| `runtime-management/deepseek-harness/deepseek-harness-launch-profile.ts` | launch profile | Run and discovery launches (args, environment, run files) |
| `runtime-management/deepseek-harness/deepseek-harness-capability.ts` | discovery | `dsh --version` probe, model discovery and normalization, diagnostics |
| `runtime-management/agent-runtimes/strategies/deepseek-harness-agent-runtime-strategy.ts` | Agent Runtimes page | Version, latest version (`npm view`), key state, update command |
| `llm-management/services/deepseek-harness-model-catalog.ts` | model catalog | dsh models for the catalog |
| `agent-execution/backends/deepseek-harness/` | session profile | Session hooks, tool projection, provider-call effects, usage and compaction payloads, factory binding (skills under `.dsh/skills`) |
| `agent-work-journal/rendering/runtimes/deepseek-harness-translation.ts` | Work Journal | dsh's tools in the journal |

## The dsh home

Every dsh process gets `DSH_HOME=<appData>/runtimes/deepseek-harness/home`; the user's own `~/.dsh` is never read or
written. The home holds dsh's own session store (needed to restore runs), the home patch `cordis.patch.yml` and the
plugin `plugins/autobyteus-agent-instructions.mjs`. It never holds a key: a stored key in a dsh home outranks the
launch environment and would bypass the pass.

The home patch, layered by dsh over its ACP profile:

- `system-prompt.personaPrefix: ''`: dsh's persona is replaced by the agent's own instructions.
- The instructions plugin, reading the file in `AUTOBYTEUS_DSH_INSTRUCTIONS_FILE` into one system-prompt section with
  `interpolate: false`, so the text reaches the model literally (dsh's persona fields are templates that fail on an
  unknown `{{…}}`). Without the variable (discovery) it adds nothing.
- `skill-filesystem`: `includeDefaultRoots: false` and only `AUTOBYTEUS_DSH_SKILLS_DIR` (an empty list without it):
  dsh sees exactly the agent's configured skills, never an enclosing repository's `.agents/skills`.
- `session-log-deepseek.enabled: false`: no session-log upload to DeepSeek.
- dsh's subagent, subagent-fork, subagent-control, workflow, goal and plugin-manager tools are disabled:
  collaboration goes through AutoByteus `delegate_task`/`send_message_to`. dsh's ACP profile loads no team or
  ask-user tool.

The relay never alters request bodies, so dsh's plugin-inventory field (active dsh plugin npm packages, never model
input) stays.

## Launch

```text
dsh --profile acp
```

Environment: the server environment without `DSH_PERMISSION_MODE`, `DEEPSEEK_API_KEY` and `DEEPSEEK_BASE_URL`, plus:

| Variable | Value |
| --- | --- |
| `DSH_HOME` | the AutoByteus-owned home |
| `DEEPSEEK_BASE_URL` | `http://127.0.0.1:<proxy>/relay/deepseek` (no pass in it) |
| `DEEPSEEK_API_KEY` | the run's pass (not a key) |
| `AUTOBYTEUS_DSH_INSTRUCTIONS_FILE` | `<appData>/runtimes/deepseek-harness/runs/<runId>/instructions.md` |
| `AUTOBYTEUS_DSH_SKILLS_DIR` | `<workspace>/.dsh/skills` |

dsh's shells see `DEEPSEEK_BASE_URL` but not `DEEPSEEK_API_KEY` (dsh scrubs credentials from its shells).

The instructions file is written at every launch: create, restore and the reopen after an Agent Tools change. The run
folder is removed when the launch is released, after its process stopped.

## Sessions

- **Create:** `session/new` with the workspace and the Agent Tools HTTP MCP server, no `_meta`; dsh connects MCP during
  `session/new`, so there is no readiness wait.
- **Model and effort:** set with `session/set_config_option` (`model`, then `reasoning_effort`) after the session
  opens. A model dsh does not offer is refused by dsh with its own message.
- **Restore:** dsh offers `session/resume`, not `session/load`; the shared layer restores by resume. dsh replays no
  history.
- **Approvals:** dsh asks only for sandbox escalations (it runs in its `workspace-write` sandbox). Auto-execute answers
  them allow.
- **Stop:** `session/cancel` ends the turn and its command.

## Models

The catalog runs a short dsh process in `<appData>/runtimes/deepseek-harness/discovery` with the relay's address and
no pass: it lists that folder's one session and resumes it (or creates it), reads its config options and closes it.
No prompt, no model call. dsh offers its models only while a key is configured, and on a non-official endpoint (the
relay) it lists its built-in catalog without a listing call, so discovery's `DEEPSEEK_API_KEY` is the placeholder
`autobyteus-model-discovery`: neither a key nor a pass (a call made with it would reach only the relay, which refuses
it). The models are dsh's `model` options on its DeepSeek route, with the session's reasoning
efforts as their `reasoning_effort` choices.

Diagnostics: `DEEPSEEK_HARNESS_RELAY_UNAVAILABLE` (no credential proxy in this process),
`DEEPSEEK_HARNESS_RELAY_NOT_READY` (the proxy is not listening yet; transient, nothing caches it),
`DEEPSEEK_HARNESS_CLI_UNAVAILABLE`, `DEEPSEEK_HARNESS_DISCOVERY_FAILED`, `DEEPSEEK_HARNESS_CATALOG_INVALID`.

## Token usage, compaction and liveness

The relay reports each forwarded call to the run's session (provider call observations); the dsh session profile turns
them into effects:

- **Usage:** one `TOKEN_USAGE_UPDATED` per finished call, from DeepSeek's own stream counts (`ingestion_kind`
  `deepseek_harness_call`, or `deepseek_harness_compaction_call` for a compaction call; input excludes cache reads).
- **Compaction:** dsh marks its compaction calls with `x-deepseek-harness-compact: 1`. Such a call is a provider
  compaction boundary: `COMPACTION_STATUS` compacting when it starts, compacted (rotation-eligible: the run's active
  raw traces rotate) when DeepSeek answered it to its end, failed otherwise.
- **Liveness:** every report refreshes the turn's idle timer, so a long model step that sends no ACP frame is not
  failed for idleness; 300 s with neither ACP frames nor relay reports still fails the turn
  (`ACP_TURN_IDLE_TIMEOUT`).

Effects apply only within a turn.

## Agent Runtimes page

The row shows installed or not, the version, the latest version (`npm view @deepseek-ai/dsh version`) and the update
command `npm install -g @deepseek-ai/dsh@latest`. Its sign-in route is `API_KEY_SETTING`: the account line reads
"API key set" or "API key not set", with a pointer to Settings → API Keys. dsh reports no usage limits.

## Key handling

- The DeepSeek key is read only by the relay, per call, and is revealed only while the upstream `x-api-key` header is
  set.
- A run without the key in the vault is refused at creation and restore: "RELAY_KEY_NOT_SET: The DeepSeek API key is
  not set in AutoByteus. Save it in Settings → API Keys." A key removed during a run fails the next call with the same
  text from the relay, which dsh shows as the turn's error.
- The pass ends with the run (release, or a failed activation); a later call is refused `RUN_PASS_INVALID`.

## Tests

- `tests/unit/agent-execution/backends/deepseek-harness/`: the run on the shared ACP backend with a fake dsh agent
  (relay refusal, key missing, launch facts, config options, provider-call effects, end order, resume), the session
  profile, the projection and liveness.
- `tests/unit/runtime-management/deepseek-harness/`: home files, launch environment, discovery, Agent Runtimes strategy
  and availability.
- `tests/unit/credential-proxy/provider-relays.test.ts`, `tests/integration/credential-proxy/provider-relay.integration.test.ts`:
  the relay.
- `tests/e2e/runtime/deepseek-harness-live.e2e.test.ts` (`RUN_DEEPSEEK_HARNESS_E2E=1`, the test vault): real dsh against
  the real DeepSeek API through the product relay.

## Related Documentation

- [Credential Proxy](./credential_proxy.md)
- [Grok Build Runtime](./grok_build_runtime.md) (the other ACP runtime)
- [Agent Runtimes](./agent_runtimes.md)
- [Secret Management](./secret_management.md)
