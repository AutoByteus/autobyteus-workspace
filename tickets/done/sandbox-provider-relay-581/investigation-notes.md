# Investigation Notes: autobyteus-581

## Investigation Meta

- Package identifier: `sandbox-provider-relay-581`
- Request / ticket: autobyteus-581, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/sandbox-provider-relay`
- Repository mode: Git. Branch `codex/sandbox-provider-relay`.
- Resolved base: `origin/personal` @ `9f803aa84d` (fetched 2026-11-26)
- Finalization target: `origin/personal`
- Bootstrap: worktree created. The 484 documents and probes were copied to `history-484/`. The 484 worktree and its empty branch were removed (0 commits ahead).
- Current solution revision: SR-001
- Authorities read on 2026-11-26:
  - `requirements-engineering.md` (updated version), `ticket-scope.md` (updated), `finding-the-cause.md`, `handoff.md`, `design-principles.md` (all), `architecture-design.md`, `design-examples.md` (Case Studies);
  - repository `DESIGN.md`, `GLOSSARY.md`, `TESTING.md` (Test vault);
  - `docs/modules/credential_proxy.md`, `docs/design/node_access_model.md`, `docs/modules/secret_management.md`.
- Investigation status: complete for the requirements. The architecture investigation continues in the design.

## History

The analysis, the user's decisions and the draft contract are in [history-484/](history-484/). They cover the analysis report, the relay comparison, the 484 requirements with DEC-001 to DEC-019, and the draft data contract with O-1 to O-6. Those decisions are the direction of this Task.

## Source Log (new in 581)

| Source | Finding |
| --- | --- |
| `src/credential-proxy/provider-relays/provider-relays.ts` | One relay today (`deepseek`). A relay = route (origin, base path, auth form, allowed methods/paths) + vault consumer + stream reader. |
| `…/provider-relay-access.ts`, `provider-relay-proxy-routes.ts` | A run gets a relay grant on its run pass. The runtime sends the pass in `x-api-key` only. One relay per pass (`holder.providerRelayId`). The route does not parse the body: it streams it upstream. Refusals use the Anthropic error envelope. |
| `…/provider-relay-process-access.ts` users | Only runtime availability and DeepSeek Harness capability read the process slot |
| `src/remote-collaboration/channel/peer-request-signature.ts` | HMAC over method, path+query, both node IDs, time, nonce, body SHA-256. ±300 s window, single-use nonce, pinned peer secret. |
| `src/remote-collaboration/channel/peer-client.ts:440-500` | Peer sends buffer the body (JSON or raw bytes). Refused when remote collaboration is off or the peer is not paired. |
| `src/api/security/node-access-plugin.ts:68-92` | For a peer, the body is hashed **while it is parsed**, and compared in `preValidation`. A peer route must therefore parse the body before its handler, and Fastify's default body limit (1 MiB) applies unless the route raises it. |
| `src/api/security/node-route-permissions.ts:80` | `/rest/remote/*` is for peers only |
| `src/api/rest/remote.ts` | The peer routes; received-file pieces show the raw-body pattern, with node IDs in the query |
| `src/remote-collaboration/settings/remote-collaboration-capability.ts` | `ENABLE_REMOTE_COLLABORATION`, **off by default**. Pairing and every peer call need it on both nodes. |
| `…/settings/peer-pairing-service.ts:84-140` | Invite (10 min, single use), accept and exchange. Each side resolves the other from **address candidates**. |
| `src/server-addressing/server-address-candidate-service.ts:77-150` | Candidates: the configured `AUTOBYTEUS_SERVER_HOST`, the current node URL, `host.docker.internal:<port>` when the node's URL is loopback, and interface addresses |
| `src/config/app-config.ts:227-231` | `AUTOBYTEUS_MEMORY_DIR` is a setting (environment or `.env`) |
| `autobyteus-ts/src/llm/api/openai-llm.ts:9`, `deepseek-llm.ts:57`, `anthropic-llm.ts:284` | Native provider base URLs are fixed (FU-003) |
| `src/agent-definition/domain/models.ts:28` and `src/agent-tools/*` | Server agent tools are registered per area and granted per agent through the definition's `toolNames` |
| `DESIGN.md` rule 9 | The desktop, its server and every node it connects run one release; no cross-version compatibility. A sandbox node must therefore run the host node's release. |
| `GLOSSARY.md` | "Gateway" is taken twice (General MCP Gateway; peer gateway). "Provider relay" and "run pass" exist with fitting meanings. |
| `~/.codex/auth.json`, `~/.grok/auth.json` (key names only, no values) | Both logins are files on this Mac. Codex: `tokens.access_token`, `tokens.account_id`, refresh token, `last_refresh`. Grok: per-issuer entry with `key`, `refresh_token`, `expires_at`. |

## Runtime, Probe, Or Reproduction Findings

Image `autobyteus/autobyteus-server:beta` `218d2f1f1c9c` (2026-11-25): claude-cli 2.1.332, codex 0.172.0, grok 1.0.92, Node 22.23.5. Docker Desktop on macOS 26.5.2. All probes used placeholders only. The probe scripts and logs are in [probes/](probes/).

| ID | Method | Observation | Established |
| --- | --- | --- | --- |
| P-1 | Throwaway container to a local-only HTTP server on the Mac (`fake-relay.py` on 127.0.0.1:47581) | Reached through `host.docker.internal`; the Mac sees the caller as **127.0.0.1** | Measured |
| P-2 | Same container to the home router (192.168.2.1) and to example.com | Router answered (302). Internet answered (200). **Default Docker networking does not meet DEC-016.** | Measured |
| P-3 | Claude Code, `ANTHROPIC_BASE_URL` + `ANTHROPIC_API_KEY=<pass>` | `POST /relay/anthropic/v1/messages`, pass in `x-api-key`, body about 52 KB | Measured |
| P-4 | Claude Code, `ANTHROPIC_BASE_URL` + `CLAUDE_CODE_OAUTH_TOKEN=<placeholder>` | Same path; pass in `Authorization: Bearer`; adds `anthropic-beta: oauth-2025-04-20`. **The request shape depends on the credential kind.** | Measured |
| P-5 | Codex, custom provider `base_url` + `env_key` | `POST /relay/openai/v1/responses`, pass in `Authorization: Bearer` | Measured |
| P-6 | Codex in ChatGPT mode (placeholder `auth.json`) + `chatgpt_base_url` | All ChatGPT-backend calls went to the relay: `backend-api/wham/accounts/check`, `…/settings/user`, `ps/plugins/*`, `codex/analytics-events/events`, `ps/mcp`. Each carries `Authorization: Bearer` and `chatgpt-account-id`. The model call itself was not reached (stopped at 401). | Measured (partial) |
| P-7 | Grok, `GROK_XAI_API_BASE_URL` (and `GROK_CLI_BASE_URL` as a control) + `XAI_API_KEY=<pass>` | `GROK_XAI_API_BASE_URL` works: `GET /relay/xai/v1/models`, `/v1/api-key`, `Authorization: Bearer`. `GROK_CLI_BASE_URL`: no request reached the relay. | Measured |
| P-8 | `agy` binary strings | `GEMINI_API_KEY` and fixed Google endpoints (`generativelanguage.googleapis.com`, `cloudcode-pa…`); **no endpoint-override variable found** | Read (binary strings); not reproduced as a call |
| P-9 | Internal Docker network + egress proxy container (`egress-proxy.py`) | Internet through the proxy: 200 (curl, and Node `fetch` with `NODE_USE_ENV_PROXY=1`). Allow-listed relay `host.docker.internal:47581`: reached. The user's node `host.docker.internal:8001`: **refused by the proxy** (403, never reached the node). Router: refused. Direct connection ignoring the proxy: fails (`rc=6`). curl needs the lower-case `http_proxy` for plain HTTP. | Measured |
| P-10 | A container only on an internal network with `-p 127.0.0.1:…` | Mac to container: **no answer** (Docker publishes no port on an internal network). Through a forwarder container on both networks: 200. | Measured |
| P-13 | Codex, custom provider with `experimental_bearer_token=<placeholder>` (no env var) | `POST /relay/openai/v1/responses` with `Authorization: Bearer <placeholder>`: a per-provider bearer can travel in config | Measured |
| P-14 | Throwaway container, host folder mounted `:ro` at `/home/autobyteus/shared/articles` | Reading works; writing and deleting fail ("Read-only file system") even as root; the host file is unchanged | Measured 2026-11-26 |
| P-11 | (484) mapped folder written as root | On the Mac it is owned by the user (501). A planted link to `/etc/hostname` resolves to the Mac's file. | Measured 2026-11-26 |
| P-12 | (484) fresh node: setup code over `docker exec`, exchange, GraphQL, real turns on native, Claude (api-key) and Codex | Works, 20–28 s | Measured 2026-11-12 |

Temporary diagnostics: none in product code. Probe containers and networks were removed. The fake relay on the host was stopped at the end of the investigation.

## Assumptions, Unknowns, Risks

| ID | Type | Description | Status |
| --- | --- | --- | --- |
| U-1 | Unknown | Codex ChatGPT mode: the model call's path, and whether Codex tries to refresh its token through `auth.openai.com` (outside `chatgpt_base_url`) when the placeholder looks stale | Live check needs a real login (DEC-108) |
| U-2 | Unknown | Grok OAuth through a relay: which variable carries a placeholder access token (`GROK_AUTH_PROVIDER_ACCESS_TOKEN` exists in the binary) | Live check needs a real login (DEC-108) |
| U-3 | Unknown | Linux hosts: `host.docker.internal` needs `host-gateway`, and a node bound to 127.0.0.1 is not reachable from the bridge | Out of first platform (DEC-105) |
| R-1 | Risk | Node's `NODE_USE_ENV_PROXY` is marked experimental in Node 22 (warning `UNDICI-EHPA`) | It works (P-9). Pin it with a test. |
| R-2 | Risk | Relayed calls are buffered by the gate (body hash); large contexts can be several MB | Raise the route's body limit (design) |

## Supplemental Artifact Inventory

| Path | Purpose | Status |
| --- | --- | --- |
| `history-484/*` | The analysis, the user's decisions DEC-001 to DEC-019, the draft contract | History (authoritative for the direction) |
| `probes/fake-relay.py`, `probes/runtime-shapes.sh`, `probes/egress-proxy.py`, `probes/fake-relay-shapes.jsonl`, `probes/egress-proxy.jsonl` | Feasibility evidence P-1 to P-14 (P-13: Codex bearer; P-14: read-only shared folder) | Evidence; disposable |
| `follow-ups.md` | Follow-ups found in 581 | Living |
