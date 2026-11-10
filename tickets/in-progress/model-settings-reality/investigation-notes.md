# Investigation Notes

## Investigation Meta

- Package identifier: `model-settings-reality`
- Request / ticket: Project Task `autobyteus-9` (Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`), Parts A–D; absorbs autobyteus-10 and autobyteus-11
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality`, branch `codex/model-settings-reality`
- Resolved base remote / branch / revision: `origin/personal` at `fd0eb664c` (2026-11-10). Investigation ran on `310fc2745`; the 11 commits since (autobyteus-455, Daily Assistant as collaborator) change none of the files this investigation cites (`git diff --name-only 310fc2745 fd0eb664c`), and the worktree was fast-forwarded to `fd0eb664c` before design
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created 2026-11-10 06:05 UTC; dependencies installed with `corepack pnpm install --frozen-lockfile` (pnpm 10.28.2; `pnpm` is not on the shell PATH here, use `corepack pnpm`)
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md` (2026-11-10); templates read; repository `AGENTS.md`, `TESTING.md` §Test vault (2026-11-10)
- Investigation status: Requirements and architecture investigation complete (2026-11-10)

## Initial Request And Clarifications

- Original request: autobyteus-9 description (Parts A–D) and comments. Attached context: autobyteus-8 `follow-ups.md` (FU-001..FU-005).
- Clarifications received:
  - User via Project Task Manager, 2026-11-10: origin/personal changed a lot since Parts A–C and the Part D leads were written; fetch the latest, re-check each part (still reproduces? evidence), fix only what still exists, record the already-fixed parts with evidence in the result.
  - Task comments (user, 2026-10-29): "the configuration should respect the reality"; provider defaults used as they are; no Off where thinking cannot be off; Off must really turn it off; every Claude model on both runtimes. General rule: "if off does nothing, then do not show it, we provide effective configuration" (all runtimes and models).
- User-supplied facts: Part D incident (stopped supervised research team, `researcher` member set to `claude-fable-5-2` on the Claude Agent SDK runtime, Save refused "Model options for '/supervised_research_team/researcher' are unavailable; saved settings were not changed."; after a client restart the model showed up).
- Initial ambiguity: whether each part still exists on current code; where model lists are cached; what "Off" does on the SDK runtime.

## Product And Domain Understanding

- Product area: model catalog and per-run model settings (thinking/effort) across the AutoByteus runtime (in-process LLM adapters, `autobyteus-ts`) and external agent runtimes (Claude Agent SDK, Codex, Antigravity, Grok Build, DeepSeek Harness) in `autobyteus-server-ts`, presented by `autobyteus-web`.
- Affected actors: the user configuring and launching agents/teams; stopped-run settings editors; provider requests.
- Terminology: *Off* = the thinking choice "Off" in the one-list thinking menu (`thinking_enabled: false`). *Effort* = `reasoning_effort` (Anthropic `output_config.effort`). *Model list / catalog* = the models a runtime offers.

## Source Log

| ID | Date | Type | Exact Source / Command | Why | Relevant Finding |
| --- | --- | --- | --- | --- | --- |
| SRC-001 | 2026-11-10 | Command | `git fetch origin personal; git rev-parse HEAD origin/personal` in the worktree | Re-check basis | Both `310fc2745`; every check below is on the latest origin/personal |
| SRC-002 | 2026-11-10 | Code | `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts` L34-42 | Part A, AutoByteus runtime | `claude-opus-5`, `claude-fable-5`, `claude-fable-5-1` = `adaptive('omit')`; opus-5-5 `adaptive_required`; sonnet-5-5 `between_tools`; haiku-5-5, sonnet-5 `disabled` |
| SRC-003 | 2026-11-10 | Code | `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts` | Part A schemas | Switch rows (`thinking_enabled` default **false** + effort): fable-5, opus-5, sonnet-5-5, sonnet-5, haiku-5-5. Effort-only: fable-5-1, opus-5-5. Effort defaults = API defaults (high; medium for opus-5-5, haiku-5-5). No `claude-fable-5-2` row |
| SRC-004 | 2026-11-10 | Code | `autobyteus-ts/src/llm/api/anthropic-llm.ts` L111-125, L138-150, L189-241 | Part A request shaping | Reads only owned keys `thinking_enabled`, `reasoning_effort`; `adaptive_required` + `thinking_enabled === false` **fails locally** (L141-145); toggle off with `omit` sends nothing (L199); effort not sent while Off (L238-241) |
| SRC-005 | 2026-11-10 | Web | https://platform.claude.com/docs/en/build-with-claude/thinking-troubleshooting (per-model table) | Part A, current Anthropic facts | Fable 5.2 / 5.1 / 5, Opus 5.5: "Always on", `disabled` → 400. Opus 5: default On, `disabled` accepted at effort ≤ high. Sonnet 5.5: On, `between_tools` instead of `disabled` (≤ high). Sonnet 5: On, `disabled` accepted. Haiku 5.5: On, `disabled` at ≤ high. Opus 5 with thinking disabled may leak tool calls/XML into text on tool-heavy work |
| SRC-006 | 2026-11-10 | Web | https://platform.claude.com/docs/en/build-with-claude/extended-thinking | Defaults | Effort default medium for Opus 5.5 and Haiku 5.5, high for the others; Fable 5.2 listed among current models |
| SRC-007 | 2026-11-10 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-config.ts` L27-48 | Part A, SDK runtime (FU-003) | `thinking_enabled` boolean → `thinking: adaptive/disabled`; `reasoning_effort` sent independently, also with `disabled` |
| SRC-008 | 2026-11-10 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-model-normalizer.ts` L39-68 | SDK runtime schema | Every model with `supportsAdaptiveThinking` gets `thinking_enabled` (default false); effort levels from the SDK, default `medium` for every model |
| SRC-009 | 2026-11-10 | Code | `autobyteus-web/utils/llmThinkingConfigAdapter.ts` L246-248, L366-377 | Off in the web | Claude Off writes only `thinking_enabled:false`, keeping the stored effort; `getDefaultThinkingConfig` writes each key at its schema default (so switch rows launch with `thinking_enabled:false`) |
| SRC-010 | 2026-11-10 | Code | `autobyteus-web/components/chat/chatThinkingMenu.ts` | Menu forms | Switch schema → merged list `Off · levels`; effort-only schema → parameters menu; nothing checked → summary "Default" |
| SRC-011 | 2026-11-10 | Code | `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` L48; `mistral-llm.ts` L67-69; `gemini-llm.ts` L142-201; `openai-responses-llm.ts` L141-145, L223-225, L278-280; `ollama-llm.ts` L75-76; `utils/llm-config-overrides.ts` L187-191 | Part B, FU-004 | Stored run config keys become `extraParams` (unknown top-level keys included); these adapters copy the remaining `extraParams` into the provider request. Anthropic reads owned keys only |
| SRC-012 | 2026-11-10 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts` L249, L361, L377 | Part B constraint | Some catalog rows carry model-owned default `extraParams` (e.g. `reasoning_effort`, `thinking_type`) that must keep reaching the provider |
| SRC-013 | 2026-11-10 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` L220-268, L270-300 | Part B, FU-005 | `createAgentRun` stores `input.llmConfig ?? null` unchanged into the new run's `AgentRunConfig`; no `RunModelSelectionService` / schema projection |
| SRC-014 | 2026-11-10 | Code | `rg "\.validate\(|\.validateMany\("` in server src | Validator callers | Callers: stopped agent/team/org saves, delegated launches, org launch, launch usability, model routing, standalone roots. Standalone agent/team creation is not a caller |
| SRC-015 | 2026-10-29 | Evidence | autobyteus-8 `evidence/API-r2-browser-journeys.txt` "API-11" | FU-005 reproduction | Definition `{'reasoning_effort':'low','thinking_display':'omitted'}` → Run Agent → stored both keys (reproduced then; server path unchanged since, SRC-013) |
| SRC-016 | 2026-11-10 | Command | `rg -n "gemini-3.5-flash|kimi-k2" autobyteus-ts/docs` vs `supported-model-definitions.ts` | Part C | Still present: `llm_module_design.md` L92-94, L191, L202-207, L402-405; `llm_module_design_nodejs.md` L129-132, L182, L279-285, L341-355. Catalog rows: `gemini-3.8-flash`, `kimi-k3` (and no `gemini-3.5-flash`/`kimi-k2*`) |
| SRC-017 | 2026-11-10 | Code | `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts` L154-176 | Part D, server lists | Each request reads the runtime's list: Claude SDK → `ClaudeModelCatalog.selectionCatalog` → `ClaudeSdkClient.listModels`; Codex/Antigravity/Grok/DeepSeek → their catalogs; AutoByteus → `LLMFactory.listAvailableModels()` (built-in rows static in code; Ollama/LM Studio/custom are discovered sources with `reloadProviderModelCatalog`) |
| SRC-018 | 2026-11-10 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` L168-196 | Part D, Claude | `listModels` opens a control query (spawns the CLI) on every call; no list cache; **any failure returns `[]`** (only a deadline time-out propagates) |
| SRC-019 | 2026-11-10 | Code | `.../claude/client/claude-sdk-executable-path.ts`; `claude-sdk-control-query.ts` L39-47; `claude-sdk-spawn-environment.ts` L22-32 | Part D, which CLI | Server runs `CLAUDE_CODE_EXECUTABLE_PATH`/… or `which claude` (path cached per process), else the SDK default; auth mode defaults to `cli` (the user's Claude Code login) |
| SRC-020 | 2026-11-10 | Code | `grok-build-model-catalog.ts` L5, `deepseek-harness-model-catalog.ts` L5, `antigravity-model-catalog.ts`, `codex-model-catalog.ts` + `codex-app-server-client-manager.ts` | Part D, other runtimes | Grok/DeepSeek: fresh handshake, "no process-global cache"; Antigravity: `agy models` per read; Codex: lease per read, app-server closed when no holder remains |
| SRC-021 | 2026-11-10 | Code | `autobyteus-server-ts/src/llm-management/services/run-model-selection-service.ts` L49-85 | Part D, Save validation | Every Save validates against a fresh catalog read ("never across Saves"); a selection missing from the read → `model_unavailable`; a read error → `model_unavailable` |
| SRC-022 | 2026-11-10 | Code | `delegated-launch-selection-command.ts` L110-118; `team-run-delegated-launch-plan.ts` L78-82; `standalone-stopped-run-selection-updater.ts` L89-96; `standalone-agent-run-root-manager.ts` L396; `agent-org-run-manager.ts` L313-317 | Part D, refusal texts | "Model options for '<address>' are unavailable; saved settings were not changed." (and variants) for both `model_unavailable` and `schema_unavailable`; no model name, no next step |
| SRC-023 | 2026-11-10 | Code | `autobyteus-web/stores/llmProviderConfig.ts` L190-246; `composables/useRuntimeScopedModelSelection.ts` L105-127; `components/launch-config/RuntimeModelConfigFields.vue` L361-363 | Part D, web cache | `fetchProvidersWithModels` returns the stored runtime catalog once `ready` (kept for the app's lifetime); `refreshLocalCatalog` / `reloadModelsForRuntime` exist but are reached only from Retry after a load error (and provider settings) |
| SRC-024 | 2026-11-10 | Code | `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue` L427-449; `services/runConfigEditing/existingRunModelOptionsClient.ts` L14; `delegatedLaunchSelectionClient.ts` L85 | Part D, stopped-run settings | Options for the saved runtime come from the server per open (`network-only`); a scope switched to another runtime in the draft uses the web store's cached catalog |
| SRC-025 | 2026-11-10 | Code | `useRuntimeScopedModelSelection` consumers: `RuntimeModelConfigFields.vue`, `MobileRuntimeModelRows.vue`, application launch-profile editors, `ApplicationTeamMemberOverrideItem.vue` | Part D surfaces | All new-run / launch-profile pickers read the shared web store |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Behavior | Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | AutoByteus runtime, Opus 5, Thinking = Off | Nothing is sent; Opus 5 thinks (default On) | "Off" is not off | SRC-002, SRC-004, PRB-A2 | Measured |
| BEH-002 | User | AutoByteus runtime, Fable 5, Thinking = Off | Nothing sent; Fable 5 thinks; it cannot turn thinking off (`disabled` → 400) | Off is offered but impossible | SRC-002, SRC-005, PRB-A2 | Measured |
| BEH-003 | User | AutoByteus runtime, a switch row (Opus 5, Sonnet 5, Sonnet 5.5, Haiku 5.5) left at its default | Schema default `thinking_enabled:false`; launch surfaces write it; thinking off (or, with an empty config, nothing sent while the menu shows Off) | Default differs from Anthropic's default (thinking On) | SRC-003, SRC-009, SRC-005 | Read + Measured (defaults) |
| BEH-004 | User | AutoByteus runtime, Sonnet 5 / Haiku 5.5 / Sonnet 5.5 Off | `disabled` / `between_tools` sent, effort not sent | Real off (no up-front thinking) | SRC-004, PRB-A2 | Measured |
| BEH-005 | User | Claude Agent SDK runtime, Thinking = Off | `thinking: disabled` + stored effort passed to the SDK; the CLI still thinks on every current model; nothing is rejected | Off has no effect; FU-003's 400 does not reproduce via CLI 2.1.280 / 2.1.322 | SRC-007, SRC-009, PRB-A1 | Measured |
| BEH-006 | User | Claude Agent SDK runtime, effort left at default | Schema default `medium` for every model is written and sent | Not the provider's default for Fable/Sonnet (high) | SRC-008, SRC-009, SRC-006 | Read |
| BEH-007 | System | Resume/launch on AutoByteus runtime with a stored key the schema no longer declares | Non-Anthropic adapters send it to the provider | Latent: no current schema removed a key | SRC-011 | Read |
| BEH-008 | User | New standalone agent/team run from a definition default or composer | Server stores the submitted `llmConfig` as is | Undeclared keys copied into the new run | SRC-013, SRC-015 | Read (+ Reproduced 2026-10-29) |
| BEH-009 | Contract | Reading `autobyteus-ts/docs` | Docs describe removed Gemini/Kimi rows as current | Drift | SRC-016 | Read |
| BEH-010 | User | Model picker in new-run launch config, application launch profiles, mobile new run, runtime switch in stopped-run settings | First load per runtime is kept until the app restarts; no refresh control (Retry only after an error) | A model offered after the list loaded is not shown | SRC-023, SRC-024, SRC-025 | Read |
| BEH-011 | System | Server reads a runtime's list (options, validation) | Fresh read per request; follows a Claude Code update without restart | Server is not the stale layer | SRC-017..SRC-021, PRB-D3 | Measured (Claude), Read (others) |
| BEH-012 | User | Save of a stopped run's settings whose selection the fresh read does not offer (or the read fails) | All-or-nothing refusal: "Model options for '<address>' are unavailable; saved settings were not changed." | No model name, no next step; read failure and "not offered" look the same | SRC-021, SRC-022, SRC-018 | Read |
| BEH-013 | System | Claude Agent SDK runtime identifiers | CLI option values: change with the CLI version and the CLI's own cached account state (`opus[1m]`/`opus`, `claude-fable-5-1`/`claude-fable-5-1[1m]`/`fable`) | A selection taken from an older list can name an identifier the current list no longer has | PRB-D1..D4 | Measured |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `anthropic-model-request-policy.ts` + Anthropic catalog | Off shape and schema per row | Opus 5 → `disabled`; Fable 5 → effort-only/`adaptive_required`; switch defaults | Stored `thinking_enabled:false` on Fable 5 must not hit the local `adaptive_required` failure (SRC-004 L141-145) |
| `claude-sdk-model-normalizer.ts`, `claude-session-config.ts` | SDK runtime schema and session options | Drop the switch; no fixed effort default; read declared keys only | How to keep old stored `thinking_enabled` inert |
| `llm-config-overrides.ts` + adapters | Stored config → `LLMConfig.extraParams` → request | Only declared keys (+ model-owned defaults) reach the provider | One owner (config projection) vs per-adapter projection; discovered models without schema |
| `agent-run-provisioning-service.ts`, team creation | New run config | Store only declared keys | Schema source per runtime without adding a CLI spawn to every launch (Claude read ≈2.3 s, PRB-D1) |
| `stores/llmProviderConfig.ts`, `useRuntimeScopedModelSelection.ts` | Web catalog per runtime | Refresh automatically and on demand | Revalidation policy; one store feeds every picker |
| Refusal texts (SRC-022), `ClaudeSdkClient.listModels` | Save refusal; list read | Message names the model, says what to do, distinguishes unreadable list | Error propagation from `listModels` (`[]` on failure) |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces
- Catalog definitions (Anthropic rows); SDK-derived schemas; stored `llmConfig` in run metadata and definitions' `defaultLaunchConfig`; docs `autobyteus-ts/docs/llm_module_design*.md`.
- Readers: adapters, server validator, web thinking adapter/menu, history views.

### Structural Surfaces
- Server GraphQL model catalog queries, run-model options, stopped-run/delegated save mutations; web catalog store.
- Existing support: web `refreshLocalCatalog` / `reloadModelsForRuntime`; server `reloadProviderModelCatalog` for discovered providers; server validator canonical selection.

### Potential Structural Impacts To Investigate
- API change: possibly none (refresh can reuse existing queries); refusal message text.
- Persistence: none required; stored keys become inert/omitted (no migration).
- Concurrency/lifecycle: background revalidation of the web store; concurrent CLI spawns.
- Confirmed absent: schema migration need; security boundary change.

## Runtime, Probe, Or Reproduction Findings

Full outputs: [evidence/probe-results-2026-11-10.md](evidence/probe-results-2026-11-10.md); scripts in [probes/](probes/).

| ID | Method | Scenario | Observation | Established | Implication |
| --- | --- | --- | --- | --- | --- |
| PRB-A1 | `probes/prb-sdk-off.mts` (SDK session, system CLI 2.1.322 and bundled 2.1.280) | SDK runtime Off on haiku/sonnet/opus/fable (+ xhigh) | Thinking blocks and thinking tokens in every case on current models; no rejection | Measured | Off is ineffective on the SDK runtime → do not offer it (user rule); FU-003's failure no longer reproduces there |
| PRB-A2 | `probes/prb-api-off.mts` (Messages API) | Opus 5 / Fable 5 / Sonnet 5 / Haiku 5.5 / Sonnet 5.5 with and without Off shapes | Opus 5 omit → thinks, `disabled` → 0 thinking; `disabled`+xhigh → 400; Fable 5 `disabled` → 400; Sonnet 5 and Haiku 5.5 `disabled` → 0 thinking | Measured | FU-001 reproduces; Opus 5 Off via `disabled` is real; Fable 5 has no Off |
| PRB-D1 | `probes/prb-sdk-models.mts` | Server `ClaudeSdkClient.listModels` | 5 aliases incl. `fable` → `claude-fable-5-2`; same generic schema for all; ≈2.3 s | Measured | Schema not per model; read cost matters for automatic refresh |
| PRB-D2 | `probes/prb-sdk-raw.mts` | Raw `supportedModels()` (bundled CLI) | Different identifiers and resolved models | Measured | Identifiers volatile across CLIs |
| PRB-D3 | `probes/prb-cli-update.mts` | CLI swapped mid-process | Second read shows the new CLI's list without restart | Measured | Server is fresh; staleness is client-side (SRC-023) |
| PRB-D4 | `probes/prb-cli-reread.mts` | Three reads with CLI-cached account state | List kept the CLI's cached Fable option | Measured | Part of what a runtime offers is the runtime's own state, outside AutoByteus |

- Temporary diagnostics: None (no repository file was changed; probes ran from `/tmp/msr-probes`, private CLI config dirs deleted).
- Reproduction for implementation to start from: `probes/prb-api-off.mts` (Opus 5/Fable 5 Off) and `probes/prb-sdk-off.mts` (SDK Off); run commands in the evidence file. The user's exact Part D Save refusal was not reproduced on his machine (his logs are not on this host); its mechanism is established (BEH-010, BEH-011, BEH-013).

## Stakeholder And User Evidence

| Source | Need / Constraint | Strength | Implication |
| --- | --- | --- | --- |
| User, 2026-10-29 (Task comments) | Settings mirror what the provider supports; provider defaults as they are; Off really off or not shown; every option must have an effect | Explicit | REQ-001..REQ-006 |
| User, 2026-11-10 (Task, autobyteus-11) | Reload models without restarting when a provider releases a model; Save of an existing model should not be refused | Explicit | REQ-010..REQ-014 |
| User via PTM, 2026-11-10 | Re-check each part on the latest origin/personal; fix only what still exists; report fixed parts with evidence | Explicit | Re-check table below |

## Re-check Against Latest origin/personal (user instruction 2026-11-10)

| Part / FU | Still exists? | Evidence |
| --- | --- | --- |
| A / FU-001 (AutoByteus Off on Opus 5, Fable 5) | Yes | SRC-002 L38-39 still `omit`; PRB-A2: Opus 5 and Fable 5 think with today's Off |
| A / FU-003 (SDK Off + stored xhigh/max rejected) | The rejection **no longer reproduces**; the underlying problem is worse than reported: Off does nothing at all on the SDK runtime | SRC-007 still sends `disabled` with effort; PRB-A1: no 400 through CLI 2.1.280 or 2.1.322, thinking continues on every current model |
| B / FU-004 (adapters forward stored keys raw) | Yes | SRC-011 (5 adapters + builder) |
| B / FU-005 (standalone launch copies undeclared keys) | Yes | SRC-013 (server stores submitted config unchanged); SRC-015 |
| C / FU-002 (docs name removed models) | Yes, and wider than listed | SRC-016 |
| D (new models need a restart) | Yes, in the web client; the server side is already fresh | SRC-023/SRC-024 (Read), PRB-D3 (Measured) |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Anthropic Messages API thinking/effort | docs 2026-11-10 | Per-model Off shapes, defaults, rejections | SRC-005, SRC-006, PRB-A2 | Docs change with new models |
| Claude Agent SDK `@anthropic-ai/claude-agent-sdk` | 0.3.280 (repo pin) | `supportedModels()`, `thinking`, `effort` options | PRB-A1, PRB-D1/D2 | CLI decides what `thinking: disabled` does |
| Claude Code CLI | system 2.1.322 (or SDK-bundled 2.1.280) | Model aliases and their resolution; own cached account state | PRB-D2..D4 | Outside AutoByteus; changes without an AutoByteus release |

## Persisted Data And State Facts

- Affected stored subjects: run metadata `llmConfig` (agent/team/org runs), definitions' `defaultLaunchConfig.llmConfig`, application launch profiles.
- Shapes affected: `thinking_enabled` on Fable 5 (AutoByteus) and on every SDK-runtime Claude model; stored `reasoning_effort: 'medium'` written by the SDK default; stale undeclared keys (e.g. `thinking_display`).
- Current readers: `AnthropicLLM` (owned keys; `adaptive_required` + `false` fails locally), `buildClaudeSessionConfig` (reads `thinking_enabled`/`reasoning_effort` directly), other adapters (raw), server validator (omits undeclared keys on validated paths).
- Must preserve: every saved run and definition keeps launching/resuming; explicit user choices that remain meaningful keep their meaning.
- Acceptable: keys that no longer have an effect become inert (omitted on next save); no migration.
- Remaining evidence gap: number of stored Fable 5 / SDK configs holding `thinking_enabled` (not needed: handling is uniform).

## Product Design Request Context

- Product Design request in the current input: `Not stated`. The Task leaves "where in the UI" for the team; decided in the requirements (DEC-009) without a Product Design handoff.

## Product Design Findings

N/A — not requested.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/probe-results-2026-11-10.md` | Solution Designer | Probe outputs | Parts A, D | BEH-001..013 | Final | Evidence (not behavior-defining) |
| `probes/*.mts` | Solution Designer | Reproductions | Parts A, D | PRB-A1/A2, PRB-D1..D4 | Final | Evidence |
| autobyteus-8 `follow-ups.md` (Task context file) | Project Task Manager | Origin of FU-001..005 | Parts A–C | — | Reference | N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | The exact identifiers in the user's failed Save (`claude-fable-5-2` may be the label or canonical name; SDK identifiers are aliases) | Exact reproduction of the incident | Mechanism established (BEH-010/011/013); acceptance tests use a simulated CLI update | Accepted |
| RSK-001 | Risk | Claude Agent SDK runtime: a future CLI might honor `thinking: disabled` for some model | Removing Off would then hide a working option | Re-measure on SDK upgrades; recorded in design | Open |
| RSK-002 | Risk | Automatic refresh cost: a Claude read spawns the CLI (≈2.3 s) | Picker latency, process churn | Non-blocking background revalidation (QR-001) | Open → design |
| RSK-003 | Risk | Opus 5 with thinking disabled can leak tool calls/XML into text on tool-heavy work (Anthropic) | Real Off has a documented quality caveat | Keep Off (user rule satisfied), say so in the switch description (DEC-003) | Decided |
| RSK-004 | Risk | Switch default On increases thinking tokens for new runs on Opus 5, Sonnet 5, Sonnet 5.5, Haiku 5.5 | Cost | Follows the user's "provider defaults" direction; called out to the user (DEC-002) | Decided |

## Architecture Investigation Findings

Authorities read for design (2026-11-10): `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1-2, `GLOSSARY.md`, `autobyteus-server-ts/docs/modules/llm_management.md`.

| ID | Source | Observation | Design implication |
| --- | --- | --- | --- |
| ARC-001 | `autobyteus-ts/src/llm/llm-factory.ts` L175-190, L197-219 | `composeEffectiveConfig` holds the model (with `configSchema`) and the raw stored config | Runtime projection owner |
| ARC-002 | `autobyteus-ts/src/llm/utils/llm-config-overrides.ts` L7-41, L113-191 | Classifies standard/reserved keys; unknown top-level keys and `extra_params`/`extraParams` entries become `extraParams` | Projection rule lives here |
| ARC-003 | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/available-llm-construction.ts`; `autobyteus-agent-run-backend-factory.ts` L416-419 | Every AutoByteus run passes its raw stored record to `createLLM` | Runtime projection covers new and resumed runs |
| ARC-004 | `application-portable-launch-config-schemas.ts` L55-90; `-policy.ts` L135-150 | Applications set AutoByteus settings only via `extra_params`; standard fields accepted; Claude schema accepts `thinking_enabled` | DEC-013, DEC-015 |
| ARC-005 | `rg extra_params|thinking_enabled` over `applications`, `autobyteus-application-*` | No in-repo application uses either | No in-repo caller loses behavior |
| ARC-006 | `anthropic-llm.ts` L111-246 | `adaptive_required` fails locally on stored `false`; effort dropped when stored switch is false | Fable rows need `always_on` + projection |
| ARC-007 | `claude-session-config.ts` L34-35; `codex-app-server-model-normalizer.ts` L21/L29; `acp-session-launcher.ts` L80-83 | External backends read fixed keys | Per-runtime setting-key exports (DEC-014) |
| ARC-008 | `agent-run-provisioning-service.ts` L220-268; `team-run-service.ts` L114-190 | Three creation entry points | Projection calls there |
| ARC-009 | `rg "\.validate\(|\.validateMany\("`; refusal sites (SRC-022) + `agent-org-run-service.ts` L160-170, `launch-usability-check.ts` L56-66, `model-routing-settings.ts` L106-115 | Eight wordings for unavailability; `catalogDiagnostic` used by Org launch | One wording owner; new kind keeps diagnostics |
| ARC-010 | `available-agent-runtimes-service.ts` L240-264 | "empty external list = failed read" only here | Move rule to `ModelCatalogService` |
| ARC-011 | `autobyteus-web/stores/existingRunConfigResultActions.ts` L80-95 | Scope marking on `MODEL_UNAVAILABLE`/`SCHEMA_UNAVAILABLE` | Add `MODEL_LIST_UNAVAILABLE` |
| ARC-012 | `autobyteus-web/composables/chat/useChatModelCatalog.ts`; `components/chat/ChatModelMenu.vue` L245-266; `components/launch-config/RuntimeModelConfigFields.vue`; `SearchableGroupedSelect.vue` | Two picker families; chat menu already re-checks availability on open | Refresh-on-open hooks |
| ARC-013 | `autobyteus-web/stores/llmProviderConfig.ts` L190-246 | `refreshLocalCatalog` flips to `idle`/`loading` | Background refresh with `refreshing` flag |
| ARC-014 | `autobyteus-ts/src/utils/parameter-schema.ts` L191 | `ParameterSchema.parameters` public | Declared keys source |
| ARC-015 | `rg supportsAdaptiveThinking` (server src, web) | Read only in the normalizer | Removable |
| ARC-017 | `launch-usability-check.ts` L163-168; `launch-configuration-source.ts` L16-24, L60-62; `run-history/store/launch-configuration-source-schema.ts` L42; web `useRunMemberFacts.ts` | Fallback reason is a persisted vocabulary; recorded fallbacks render `detail`; no code branches on the reason | DEC-D1 (keep vocabulary) |
| ARC-018 | `api/graphql/types/llm-provider.ts` L164-175; web `useRuntimeCurrentModelDescriptor.ts` | Empty read gives `model: null`; error path exists in the composable | Accept error for an unreadable list |
| ARC-019 | `application-launch-host-capability-validator.ts` L113-138 | Read failure → `RUNTIME_AUTHENTICATION_UNAVAILABLE`; not offered → `MODEL_UNAVAILABLE` | Empty list moves to the failure issue; texts from the owner |
| ARC-020 | `startup/cache-preloader.ts` L22 | Reads the default runtime (AutoByteus) | Unaffected |
| ARC-021 | `rg "\.createAgentRun\(|\.prepareAgentRun\(|\.createTeamRun\(|\.createTeamRunFromRootConfig\("` | Agent callers all reach `prepareAgentRun`; team callers (incl. `remote-team-run-starter.ts` L76) reach `createTeamRun`; `createTeamRunFromRootConfig` delegates (L185) | Two projection points |
| ARC-022 | PRB-A3 | Fable 5/5.1 accept explicit adaptive; reject `temperature` like Opus 5.5 | One `adaptive_required` mode |
| ARC-016 | `llm_management.md` "Ensure, Reload, And Invalidation Behavior" | No global reload; per-provider `reloadProviderModelCatalog` for discovered providers | Explicit refresh reloads each discovered provider |

## Requirement Implications

- Part A must cover both runtimes and is different per runtime: AutoByteus needs per-model Off shapes and defaults; the SDK runtime's Off is inert on every current model, so it is removed rather than repaired (user rule), which also removes FU-003's risk.
- Defaults must equal what the provider does when nothing is chosen: switch default On; SDK effort with no AutoByteus-invented default.
- Part B needs both layers: what a new run stores, and what an adapter sends.
- Part D is a client freshness and messaging problem; the server already validates against fresh lists. The fix is refreshing the web catalog (automatically and on demand) and making refusals actionable.

## Notes For Architecture Design

- Approved scenario IDs to realize: SCN-001..SCN-008 (requirements doc).
- Verify: projection owner for stored config keys (FU-004) incl. model-owned default extraParams and discovered models without schemas; how new-run creation gets the schema without adding a CLI spawn per launch; Fable 5 stored `thinking_enabled:false` resume path (SRC-004 L141-145); `buildClaudeSessionConfig` reading undeclared keys; web store revalidation and which components show the refresh action; `ClaudeSdkClient.listModels` failure semantics for the refusal message.
