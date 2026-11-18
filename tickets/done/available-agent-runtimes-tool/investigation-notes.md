# Investigation Notes — autobyteus-303

## Investigation Meta

- Package identifier: `available-agent-runtimes-tool`
- Request / ticket: Project Task autobyteus-303 (part of autobyteus-32)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool`
- Repository mode: `Git`
- Task worktree / branch: same path, branch `codex/available-agent-runtimes-tool`
- Resolved base: `origin/personal` at `a2faf424d6dc69a1d5160cb55acefc2f5a4f6bd5` (fetched 2026-10-25)
- Finalization target: `origin` / `personal`
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile --ignore-scripts` ok.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md`, `finding-the-cause.md`, `ticket-scope.md`, `architecture-design.md`, `design-principles.md`, `DESIGN.md`, `docs/design-cases.md`, `GLOSSARY.md`, `TESTING.md` § Test vault (all read 2026-10-24/25 in this conversation)
- Investigation status: complete for design.

## Initial Request And Clarifications

- Original request: Task autobyteus-303 (see requirements). Built from handoff PRE-001 of autobyteus-32 and the user's direction in the Solution Designer conversation 2026-10-24/25 (name, tool first, strategy per runtime, AutoByteus key rule, Model Routing page).

## Source Log (limit probes, Measured; carried from autobyteus-32's investigation A-15…A-19)

| ID | Method | Source | Finding |
| --- | --- | --- | --- |
| P-01 | Measured | `evidence/limit-probes/codex-limits.mjs` | Codex `account/rateLimits/read` 0.65 s, 0 tokens: primary window 10080 min used 100%, `rateLimitReachedType` rate_limit_reached, reset 2026-10-30 |
| P-02 | Measured | `evidence/limit-probes/claude-usage.mjs` | Claude SDK `get_usage` 0.78 s, 0 tokens: `limits[]` session 87% / weekly_all 22% / weekly_scoped (model "Fable") 0%; `rate_limits_available` true on Max |
| P-03 | Measured | `agy -p "/usage" --output-format json` | 2.7 s, 0 tokens: groups Gemini (weekly 0.997, 5h 0.989), Claude and GPT (weekly 0, reset 2026-10-26; 5h disabled), Gemini 4 Argon (weekly 0.40); group descriptions list model families |
| P-04 | Measured | `evidence/limit-probes/grok-billing.mjs` | Grok ACP `_x.ai/billing` ~1 s: weekly period, tier "X Basic", on-demand/prepaid 0; `creditUsagePercent` in the type but absent |
| P-05 | Measured | `evidence/limit-probes/api-limits.mjs` (test vault) | DeepSeek balance 0.14 USD available; Kimi 0 / cash −0.012; xAI key flags; GLM "no coding plan"; OpenAI nothing; Anthropic `count_tokens` 400 "credit balance is too low" |

## Relevant Codebase And Technical Facts (Read)

| ID | Path | Fact | Design Implication |
| --- | --- | --- | --- |
| C-01 | `runtime-management/agent-runtimes/agent-runtime-strategy.ts` | One stateless strategy per external runtime: `resolveExecutable`, `readVersion`, `readLatestVersion`, `readSignIn`, `updateArgv`, `signInArgv` | Add `readUsageLimits` here: one place per runtime |
| C-02 | `strategies/create-agent-runtime-strategies.ts` | Factory takes `codexClientManager`; four strategies 40–77 lines each | Strategies stay small after the addition |
| C-03 | `strategies/codex-agent-runtime-strategy.ts:27-46` | `readSignIn` uses `codexClientManager.beginAcquire(cwd)` lease and `client.request("account/read")` | Same lease for `account/rateLimits/read` |
| C-04 | `claude/client/claude-sdk-client.ts:204-220, 381-431` (438 lines) | Model discovery: `query({prompt: probe, options:{maxTurns:0, …}})` then control `supportedModels()`, closed in `finally` | Same short control query for `usage_…()`; extract the shared short control query to stay under 500 lines |
| C-05 | `runtime-management/acp/acp-discovery-handshake.ts` (48 lines); `acp-client-connection.ts:138-140` | Short ACP process with `initialize` only; `connection.extension(method, params)` exists; SDK sends the method name as given (`acp.js:1272`) | Add an extension request after `initialize`: method `_x.ai/billing` |
| C-06 | `runtime-management/agent-runtimes/runtime-command-runner.ts` | `runRuntimeCommand(command, args, timeout)`: never throws, output not logged | Antigravity `/usage` through it |
| C-07 | `agent-runtime-sign-in-reader.ts` | One owner of sign-in per runtime | Reuse for "available" |
| C-08 | `runtime-management/runtime-availability-service.ts` | Installed/command present per runtime, AutoByteus always | Reuse for "installed" |
| C-09 | `llm-management/services/model-catalog-service.ts:159-171` | `runtimeModelSelectionCatalog(runtime, workspace)` = offered models per runtime (AutoByteus: `LLMFactory.listAvailableModels()`) | One source of models |
| C-10 | `llm-management/llm-providers/services/llm-provider-service.ts:99-111, 332-350` | `listProviderCredentialSettings(runtime)` → `apiKeyConfigured` per provider (Ollama false; Gemini by its setup) | AutoByteus "available" provider rule |
| C-11 | `secret-management/resolution/secret-management-provider-api-key-resolver.ts` | Server resolver of provider keys (`{kind:'llm'}`) | Balance readers take keys through it; never logged |
| C-12 | `agent-tools/agent-discovery/list-peer-nodes-tool.ts`, `register-agent-discovery-tools.ts`, `agent-tools/mcp/providers/list-peer-nodes-mcp-adapter-provider.ts` | Opt-in tool pattern: contract + local tool registered in `defaultToolRegistry` (tool picker) + MCP adapter | Same pattern; no member context needed |
| C-13 | `api/graphql/types/agent-runtimes.ts:131-165` | Agent Runtimes GraphQL; `GraphQLJSON` scalar used elsewhere (`agent-org-run.ts:2`) | New query in its own type file |
| C-14 | `autobyteus-web/pages/settings.vue` (452 lines), `components/settings/agent-runtimes/*` | Settings sections are explicit nav entries; Agent Runtimes rows pattern | New section entry + `components/settings/model-routing/` |
| C-15 | `@anthropic-ai/claude-agent-sdk@0.3.280/sdk.mjs` (Read, verified 2026-10-25 after ARCH-REV-001 AR-001) | A string prompt is written to the CLI's stdin at once as a `user` message (`if(typeof n==="string")t.write(…{type:"user",…})`); `--max-turns` is passed only when truthy (`if(p)G.push("--max-turns",…)`), so `maxTurns: 0` is dropped. Today's model discovery (`claude-sdk-client.ts:395-398`) therefore sends "Enumerate supported models only." as a user turn | Idle-input control query; also fixes model discovery |
| C-16 | `agent-runtime-status-service.ts:180-190` (Read, verified) | Agent Runtimes page: installed = `strategy.readVersion(executable) !== null` | One install rule (AR-003) |
| C-17 | `runtime-version.ts:19-22`, `grok-agent-runtime-strategy.ts:9,31`, `antigravity-cli-capability.ts:5-6,95`, `acp-discovery-handshake.ts:7,23-26`, `codex-model-catalog.ts:18-26`, `claude-model-catalog.ts:24` | Each step has its own fixed time-out (3–15 s), applied in sequence | Pass a cap down each step (AR-002) |
| C-18 | `compositions/build-studio-server.ts:75,349`, `index.ts`, `startup/agent-tool-loader.ts:69` | One server builder for desktop and Docker nodes; tool registration loader | Composition and registration points |
| C-19 | `antigravity-cli-capability.ts:95-99`; `grok-build-capability.ts:12,80-86`; `codex-model-catalog.ts:18-45` (Read, verified 2026-10-25 after ARCH-REV-002) | Several steps run more than one command; Grok's `timeoutMs` bounds each probe; Codex releases its lease only after an untimed request settles | Step deadline shared by every command; Codex race |
| C-20 | `runtime-management/codex/client/codex-app-server-client-manager.ts:27-50` (Read 2026-10-25, CRR-003) | `beginAcquire` throws "unresolved cleanup" while a folder's generation is closing; the last holder's `release` closes it. Callers: Codex strategy, Codex model catalog, thread bootstrapper/manager, history reader | One client hold per read; single-flight; FU-003 for the manager |
| C-21 | `llm-management/services/model-catalog-service.ts:96-112,206-258`; `dynamic-model-source-lifecycle.ts:52-66,142` (Read) | Discovered providers (Ollama, LM Studio, custom) load through `ensureLlmSource`; non-forced `ensure` tries once per fingerprint; `reloadProviderModelCatalog` forces; a failed refresh keeps rows (`STALE_ERROR`) | Reload discovered providers per read |
| C-22 | `evidence/api-e2e/API-08b`, `API-05b`, `API-03b` (Measured by API/E2E round 1) | LM Studio's 4 models missing until loaded; 1–4 of 10 overlapping rounds lost Codex data; 9 of 400 Antigravity time-outs reported as "could not be read" | SR-006 |

## Persisted Data And State Facts

- None affected (live reads only).

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `evidence/limit-probes/` (README + 4 scripts) | Solution Designer | Probe evidence; source of test fixtures (redacted) | Current |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Grok `creditUsagePercent` presence/meaning | Validation with Grok usage | Open |
| UNK-002 | Unknown | Docker node CLIs and auth paths match the desktop | User verification | Open |
| RSK-001 | Risk | Claude `get_usage` is experimental; Antigravity `/usage` is CLI output | Parsers tolerant; failure → limits unknown | Accepted |
| RSK-002 | Risk | Concurrent calls spawn several short processes | Bounded by time-outs; measure in validation | Accepted |

## Notes For Architecture Design

See `design-spec.md`.
