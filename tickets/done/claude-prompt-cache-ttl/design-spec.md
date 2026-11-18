# Design Spec: autobyteus-273 Claude runtime one-hour prompt cache

## Solution And Approval Basis

- Current solution revision ID: SR-002
- Approved requirements baseline: `requirements-doc.md` as of SR-002, approved by the user on 2026-10-22 in the Solution Designer conversation (card request, toggle confirmation, spend approval "yes you can spend, go ahead").
- Behavior-defining supplements: none (271 evidence is supporting evidence only).
- Design status: Ready
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl/tickets/in-progress/claude-prompt-cache-ttl/investigation-notes.md`
- Authorities read (2026-10-22): `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md` (rules 1-9; rule 9: no version compatibility), `autobyteus-server-ts/AGENTS.md`; design-examples.md not used.
- Conflicts / discrepancies: none.

## Current-State Read

- Claude runtime spawn (S1, S2): `ClaudeSdkClient.listModels` and `.beginStreamingSession` call `resolveSpawnEnvironment`, which calls `buildClaudeSdkSpawnEnvironment(process.env[, apiKey])` in `client/claude-sdk-auth-environment.ts`. That function copies the server environment and applies the auth-mode policy (strip API-key variables in `cli`/`auto`+OAuth; inject the vault key in `api-key`, early `return`). The result is the Claude Code child's `env`. AutoByteus sets no cache TTL; Claude Code defaults to 5m on API billing (D4, 271 R9).
- Server settings (S9): predefined settings are registered in `ServerSettingsService` (`registerPredefinedSetting` with `allowedValues`); `updateSetting` -> `AppConfig.set` writes `process.env` and `.env`. The Codex card (`CodexFullAccessCard.vue`) is a switch over one predefined string setting; its key/constant lives in `runtime-management/codex/codex-sandbox-mode-setting.ts`, read from `process.env` at session start.
- Token Statistics (S5-S7): the 5m/1h split is recorded per Claude call and delivered to the web aggregate; the meter panel shows it; `TokenUsageCostBreakdown.vue` shows only the unsplit total.
- Claude Code precedence verified on 2.1.307 (T1-T6): `ENABLE_PROMPT_CACHING_1H=1` ranks below `FORCE_PROMPT_CACHING_5M`, both bucket env vars and both bucket settings.

## Task Size And Architectural Risk (Mandatory)

- Task size: Small
- Size rationale: one new server setting file, one small change in the spawn-environment builder (plus a file rename with 2 importers), one predefined-setting registration, one new web card modeled on an existing card plus its registration and i18n (en, zh-CN), four rows in one existing web component, tests and docs. No new runtime owner, API, persistence or migration.
- Architectural risk: Low
- Risk rationale: reuses the existing server-settings contract (generic string setting, `allowedValues`) and the existing spawn-environment owner; adds one environment variable Claude Code itself defines; no schema, GraphQL, persistence, security or concurrency change. Older Claude Code binaries ignore the variable (D4).
- Escalation trigger: the two-turn API-billed proof shows writes still under `ephemeral_5m_input_tokens` with the variable present (Claude Code does not honour `ENABLE_PROMPT_CACHING_1H` on API billing) -> return as Design Impact (mechanism change, e.g. the bucket env var, needs renewed user decision because it overrides user settings, T4).

## Architecture Investigation Evidence

| Source | Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| S1, S2 | `claude-sdk-auth-environment.ts`, `claude-sdk-client.ts` l.205-379 | One builder makes every production spawn env | Put the default in that builder (single owner) | None |
| S3 | `claude-sdk-client.ts` l.94-100 | No Claude Code subagents | Subscription impact of the default limited to background requests | None |
| S9 | Codex card + `codex-sandbox-mode-setting.ts` + `server-settings-service.ts` + `AppConfig.set` | Settings reach `process.env` immediately | New card follows the Codex pattern; no restart | None |
| T1-T6 | investigation-notes "Runtime ... Findings" | `ENABLE_PROMPT_CACHING_1H` ranks below every user choice | Use it as the default carrier (REQ-002) | API-billing effect not yet run (validation, approved spend) |
| S5-S7 | `TokenUsageCostBreakdown.vue`, `TokenUsageMeterPanel.vue` l.344-430, `types/tokenUsageCostSummary.ts` | Data present; one view lacks rows | UI-only change mirroring the meter | None |
| D4 | code.claude.com/docs/en/prompt-caching | Buckets, precedence, values | Mechanism | None |

## Intended Change

Add a "Claude runtime" Server Settings card with a "One-hour prompt cache" toggle (absent = on). While on, the Claude spawn environment gets `ENABLE_PROMPT_CACHING_1H=1` unless the server environment already sets that variable. Show 5-minute and 1-hour cache writes in the Token Statistics cost breakdown.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003 (spawn default), UC-005 (card), UC-004 (cost breakdown rows). Areas: `autobyteus-server-ts/src/runtime-management/claude/` (setting + spawn env), `src/services/server-settings-service.ts` (registration), `autobyteus-web/components/settings/` (new card, basics panel, cost breakdown), web localization (en, zh-CN), docs, tests.
- Deliberately left alone: Claude Code's own cache breakpoints and TTL buckets (Claude Code owns them); the auth-mode policy (unchanged behavior); the native runtime (`anthropic-llm.ts`, already 1h); token recording and pricing (split already recorded; the SDK compaction remainder is already priced at the 1h rate, `claude_sdk_cache_write_1h_assumed`, now matching reality); `analytics/TokenUsageBreakdown.vue` (FU-002); Token Statistics period selection (FU-001); the test-only `options.env` seam in `claude-sdk-client.ts` (FU-003).
- Follow-ups: FU-001, FU-002, FU-003.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior / Evidence | Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001 / AC-001 | Agent session opens on the Claude runtime | 5m on API billing (271 R9) | 1h default | DS-001 |
| BEH-002 | Contract | REQ-002 / AC-002 | User sets `promptCacheTtl`, bucket env var, FORCE_5M or the variable itself | Claude Code honours them | Still wins (T3, T6; builder never overwrites a set value) | DS-001 |
| BEH-003 | System | REQ-003 / AC-003 | Subscription session | Main 1h | Unchanged (background requests 1h; approved option A) | DS-001 |
| BEH-004 | User | REQ-004 / AC-004 | User expands a task row in Token Statistics | One cache-write row | 5m / 1h rows | DS-003 |
| BEH-006 | User | REQ-006 / AC-006 | User toggles the card | No card | Card saves the setting; next session applies it | DS-002 -> DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/claude-prompt-cache-ttl-evidence/` | 271 cost evidence | BEH-001 | Why the change is needed; baseline numbers | Read-only evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: Feature (with a default behavior change)
- Current design issue found: No (one naming drift fixed in passing)
- Structural triggers: Capability-area reuse fires (server settings, spawn env): reused/extended. Responsibility overload: `claude-sdk-auth-environment.ts` would own auth + cache defaults; resolved by rename to `claude-sdk-spawn-environment.ts` (its exported builder is already called `buildClaudeSdkSpawnEnvironment`) and keeping the cache policy in its own setting file. Shared folder, ambiguous boundary, empty indirection, legacy cleanup, persisted-data transition: do not fire (no shared folder, no IDs, no forwarding layer, no old path, no schema change).
- Root cause classification: No Design Issue Found (missing feature; the 5m default is Claude Code's documented behavior)
- Refactor needed now: No (the rename is a naming correction inside the change)
- Evidence: S1, S2, S9.
- Design response: extend the existing spawn-environment owner and server-settings registry; new card mirrors the Codex card.
- Intentional deferrals: FU-001..003 (no effect on this behavior).

## Terminology

- One-hour prompt cache: Claude Code's 1h cache TTL (`ephemeral_1h`), requested through `ENABLE_PROMPT_CACHING_1H=1`.
- User choice: any of Claude Code's own TTL controls (D4 precedence 1-4) or a user-set `ENABLE_PROMPT_CACHING_1H`.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths: none.
- Compatibility wrappers / dual paths kept: None.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: one new optional key in the server `.env` (`CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE`), written only when the user toggles.
- Decision: Not Affected. Absent key = on, so existing installations need nothing; token records unchanged.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001..003 | Agent session open (Claude runtime) | Claude Code child writes 1h cache | `buildClaudeSdkSpawnEnvironment` | Carries the default without overriding the user |
| DS-002 | Primary End-to-End | BEH-006 | User toggles card | Setting in `process.env` + `.env` | `ServerSettingsService.updateSetting` | Makes the default user-controllable without restart |
| DS-003 | Primary End-to-End | BEH-004 | User expands Token Statistics task row | Split rows rendered | `TokenUsageCostBreakdown.vue` | Shows whether writes are 5m or 1h |

## Primary Execution Spine(s)

- DS-001: `Agent run -> ClaudeSession (open) -> ClaudeSdkClient.resolveSpawnEnvironment -> buildClaudeSdkSpawnEnvironment (auth policy, then one-hour cache default) -> Agent SDK query(env) -> Claude Code child -> Anthropic API (cache_control ttl 1h)`
- DS-002: `ClaudeRuntimeCard toggle -> serverSettings store.updateServerSetting -> GraphQL updateServerSetting -> ServerSettingsService.updateSetting (allowedValues true/false) -> AppConfig.set (process.env + .env)`
- DS-003: `Token Statistics page -> TokenUsageTaskStatisticsTable row -> TokenUsageCostBreakdown (aggregate) -> rows: uncached, cache hits, cache write (unsplit remainder) / 5m / 1h, total`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | When a Claude agent session (or model listing) spawns Claude Code, the builder copies the server environment, applies the auth-mode policy, then, if the one-hour setting is not `false` and the environment does not already define `ENABLE_PROMPT_CACHING_1H`, sets it to `1`. Claude Code then resolves its TTL with its own precedence: any user choice wins; otherwise 1h. | session, client, builder, child | builder | setting definition (`claude-prompt-cache-setting.ts`) |
| DS-002 | The card reads the setting from the store (absent -> on), saves `"true"`/`"false"`, reverts and shows an error on failure. The server validates the two values and writes `process.env` and `.env`; the next spawn reads it. | card, store, service, AppConfig | service | i18n |
| DS-003 | The breakdown builds its input rows from the aggregate: uncached, cache hits, then cache writes split exactly like the meter panel (an unsplit remainder row only when tokens exist outside the split; 5m and 1h rows when present), then total input. | component | component | formatter, i18n |

## Spine Actors / Main-Line Nodes

`ClaudeSdkClient.resolveSpawnEnvironment`, `buildClaudeSdkSpawnEnvironment`, `ServerSettingsService.updateSetting`, `ClaudeRuntimeCard`, `TokenUsageCostBreakdown`.

## Ownership Map

- `buildClaudeSdkSpawnEnvironment` (renamed file `claude-sdk-spawn-environment.ts`): owns the child-process environment composition: auth-mode variables and the one-hour cache default. Single exit for all modes.
- `claude-prompt-cache-setting.ts`: owns the setting's key, allowed values, the "absent = on" reading and the Claude Code variable name/value. No I/O.
- `ServerSettingsService`: owns registration/validation of the key (existing mechanism).
- `ClaudeRuntimeCard.vue`: owns the toggle UI state, save and error display.
- `TokenUsageCostBreakdown.vue`: owns its rows.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Notes |
| --- | --- | --- | --- |
| File name `client/claude-sdk-auth-environment.ts` | Name no longer covers the file's concern (spawn env composition) | `client/claude-sdk-spawn-environment.ts` (git mv; same exports) | Update 2 importers |
| Early `return` in the `api-key` branch | Would skip the cache default | One exit after both policies | Behavior of auth policy unchanged |

## Return Or Event Spine(s) (If Applicable)

N/A (usage return path unchanged; S5).

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Setting definition | DS-001, DS-002 | builder, service | Key, values, reader, Claude variable | One home for the policy constants | Duplicated literals in builder/service/web |
| i18n (en, zh-CN) | DS-002, DS-003 | card, breakdown | Texts | Existing localization | Hard-coded strings |

## Ownership Boundaries

The builder is the only place that composes the Claude child environment; callers (`listModels`, `beginStreamingSession`) keep calling `resolveSpawnEnvironment`. The setting module has no I/O; the builder passes it the environment it already has. The web card only uses the server-settings store (no direct GraphQL).

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `buildClaudeSdkSpawnEnvironment` | auth policy, cache default | `ClaudeSdkClient.resolveSpawnEnvironment` | Setting `ENABLE_PROMPT_CACHING_1H` in `buildQueryOptions` or session code | Extend the builder |
| `useServerSettingsStore` | GraphQL setting read/write | `ClaudeRuntimeCard` | Card calling GraphQL directly | Store method |

## Dependency Rules

- `client/claude-sdk-spawn-environment.ts` -> `../claude-prompt-cache-setting.ts` (allowed). `services/server-settings-service.ts` -> `runtime-management/claude/claude-prompt-cache-setting.ts` (allowed, same as Codex).
- The setting module imports nothing from client/service code.
- Web card -> store only. Web uses the key string literal like the Codex card (no shared package between web and server for setting keys; existing convention).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `buildClaudeSdkSpawnEnvironment(env, apiKeyOverride?)` | Claude child env | Compose env | none | Signature unchanged |
| `isClaudeOneHourPromptCacheEnabled(env): boolean` | setting | absent/other -> true; `"false"` (trim, case-insensitive) -> false | none | |
| `applyClaudeOneHourPromptCacheDefault(spawnEnv): void` | spawn env | sets `ENABLE_PROMPT_CACHING_1H=1` when enabled and undefined | none | Mutates the builder's own copy |
| Server setting `CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE` | setting | `"true"`/`"false"` | key | `allowedValues`, `trimBeforePersist` |

## Interface Boundary Check

| Interface | Singular | Explicit | Risk | Action |
| --- | --- | --- | --- | --- |
| all above | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift | Action |
| --- | --- | --- | --- | --- |
| Setting key | `CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE` | Yes (matches `CLAUDE_AGENT_SDK_AUTH_MODE`) | Low | — |
| Spawn env file | `claude-sdk-spawn-environment.ts` | Yes | Fixed | Rename |
| Card | `ClaudeRuntimeCard.vue`, title "Claude runtime" | Yes (room for later Claude settings) | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Persist a toggle | Server settings (predefined setting, store) | Reuse | Codex precedent |
| Child env | Spawn env builder | Extend | Single owner |
| Split rows | Meter panel logic and i18n `shell.tokenUsage.cacheWrite5m/1h` | Reuse labels; mirror the rule | Consistent views |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spine | Decision |
| --- | --- | --- | --- |
| `runtime-management/claude` | setting definition, spawn env | DS-001 | Extend |
| `services` (server settings) | registration | DS-002 | Extend |
| web `components/settings` | card, panel, breakdown | DS-002, DS-003 | Extend |

## Draft File Responsibility Mapping

See Final mapping (no shared-structure extraction needed).

## Reusable Owned Structures Check

| Repeated Logic | Candidate | Decision |
| --- | --- | --- |
| Cache-write split rows (meter panel and breakdown) | Shared web helper | Not extracted: the two components build different row shapes (meter: unit price + formatted cells; breakdown: label/tokens/cost). Mirror the 3-line rule; extraction would create a loose shared type. |

## Shared Structure / Data Model Tightness Check

N/A (no new shared types).

## Final File Responsibility Mapping

| File | Area | Owner | Concern |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/claude-prompt-cache-setting.ts` (Add) | runtime-management/claude | setting module | `CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY = "CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE"`, `CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_VALUES = ["true","false"]`, `isClaudeOneHourPromptCacheEnabled`, `applyClaudeOneHourPromptCacheDefault` (`ENABLE_PROMPT_CACHING_1H` = `"1"`) |
| `.../claude/client/claude-sdk-auth-environment.ts` -> `claude-sdk-spawn-environment.ts` (Rename/Modify) | runtime-management/claude/client | builder | auth policy as today, then `applyClaudeOneHourPromptCacheDefault(resolvedEnv)` on every path, single return |
| `.../claude/client/claude-sdk-client.ts` (Modify import only) | same | client | — |
| `autobyteus-server-ts/src/services/server-settings-service.ts` (Modify) | services | service | `registerPredefinedSetting(KEY, "Claude runtime: request Claude Code's one-hour prompt cache for agent sessions started afterwards (true/false, default true). A promptCacheTtl in the user's Claude Code settings, CLAUDE_CODE_PROMPT_CACHE_TTL or FORCE_PROMPT_CACHING_5M take precedence.", true, { allowedValues: VALUES, trimBeforePersist: true })` next to the Codex setting |
| `autobyteus-web/components/settings/ClaudeRuntimeCard.vue` (Add) | web settings | card | Switch like `CodexFullAccessCard.vue`; reads `store.getSettingByKey(KEY)?.value` (absent or not `"false"` -> on); saves `"true"`/`"false"`; texts: title "Claude runtime", description, toggle label "One-hour prompt cache", explanation (plain words: keeps the cache for an hour instead of 5 minutes on API credits; writing costs a bit more, reading the same; saves money when agents wait more than 5 minutes; no change to agent conversations on a Claude subscription), precedence note (a `promptCacheTtl` in your Claude Code settings takes precedence), future-session note, save-failed text. `data-testid` prefix `claude-runtime-` |
| `autobyteus-web/components/settings/ServerSettingsBasicsPanel.vue` (Modify) | web settings | panel | Render `<ClaudeRuntimeCard />` right after `<CodexFullAccessCard />` |
| `autobyteus-web/localization/messages/en/settings.ts`, `zh-CN/settings.ts` (Modify) | localization | — | `settings.components.settings.ClaudeRuntimeCard.*` keys |
| `autobyteus-web/components/settings/token-usage/TokenUsageCostBreakdown.vue` (Modify) | web token usage | component | Cache-write rows: unsplit remainder (`cacheCreationInputTokens - 5m - 1h`, label `shell.tokenUsage.cacheWrites`, cost `estimatedApiCacheCreationInputCost`) only when no split exists or a positive remainder exists; `shell.tokenUsage.cacheWrite5m` row (tokens/cost 5m) when > 0 or cost not null; same for 1h. Mirror `TokenUsageMeterPanel.vue` l.344-430 |
| Tests (Add/Modify) | — | — | server: `tests/unit/runtime-management/claude/claude-prompt-cache-setting.test.ts`; spawn-env cases in the existing client test (or a new `client/claude-sdk-spawn-environment.test.ts`): cli/auto/api-key get `ENABLE_PROMPT_CACHING_1H=1`; setting `"false"` -> absent; a pre-set `ENABLE_PROMPT_CACHING_1H=0` kept; auth behavior unchanged; server-settings test: key registered, rejects other values. web: `__tests__/ClaudeRuntimeCard.spec.ts` (absent -> on, save true/false, failure reverts + error), `ServerSettingsBasicsPanel.spec.ts` renders card, `TokenUsageCostBreakdown` rows test (split, unsplit) |
| Docs (Modify) | — | — | `autobyteus-server-ts/docs/modules/llm_management.md` (Claude Agent SDK section: new subsection "Prompt cache lifetime": setting, variable, precedence, subscription note, cost trade-off); `autobyteus-web/docs/settings.md` (Claude runtime card); `autobyteus-server-ts/docs/modules/token_usage.md` or `autobyteus-web/docs/token_meter.md` (cost breakdown split rows) |

## Applied Patterns (If Any)

None beyond the existing settings-card pattern.

## Target Subsystem / Folder / File Mapping

As in the Final mapping; `claude-prompt-cache-setting.ts` sits in `runtime-management/claude/` like `runtime-management/codex/codex-sandbox-mode-setting.ts`.

## Folder Boundary Check

| Path | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `runtime-management/claude/` | Off-Spine Concern (setting) | Yes | Low | Mirrors Codex |
| `runtime-management/claude/client/` | Main-line (spawn) | Yes | Low | — |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Builder shape | `const env = { ...source }; applyAuthPolicy(env, mode, key); applyClaudeOneHourPromptCacheDefault(env); return env;` (one exit) | `if (mode === "api-key") { ...; return env; }` before the cache default | The default must apply in every mode |
| Respect the user | `if (enabled && env.ENABLE_PROMPT_CACHING_1H === undefined) env.ENABLE_PROMPT_CACHING_1H = "1";` | `env.CLAUDE_CODE_PROMPT_CACHE_TTL = "1h"` | The bucket env var overrides a user's `promptCacheTtl` (T4) |
| Card reading | `value?.trim().toLowerCase() !== 'false'` -> on | `value === 'true'` -> on | Absent must mean on |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `claude-sdk-auth-environment.ts` as a re-export of the renamed file | Avoid touching importers | Rejected | Update the 2 importers |
| Version check of the Claude Code binary before setting the variable | Older binaries | Rejected (DESIGN rule 9 spirit; older binaries ignore unknown variables, no harm) | None |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Server: add `claude-prompt-cache-setting.ts` + unit test.
2. `git mv` auth-environment -> spawn-environment; update imports; restructure to one exit; call the default; extend tests.
3. Register the predefined setting; server-settings test.
4. Web: `ClaudeRuntimeCard.vue`, panel registration, i18n en/zh-CN, specs.
5. Web: cost breakdown split rows + spec.
6. Docs.
7. Checks: `pnpm -C autobyteus-server-ts typecheck`, unit tests for touched areas, web unit tests for touched components, localization checks the web uses.

## Key Tradeoffs

- `ENABLE_PROMPT_CACHING_1H` (approved option A) vs `CLAUDE_CODE_PROMPT_CACHE_TTL`: A respects every user choice; it also gives Claude Code's background requests on a subscription 1h (small; user approved).
- Toggle vs field: toggle (user confirmed); Claude Code accepts only 5m/1h.
- Cost: 1h writes cost 2x input vs 1.25x; reads unchanged; pays off when sessions resume within an hour (271 R6).

## Risks

- Claude Code changes the variable's meaning or precedence in a future version: covered by the docs link and the validation proof; the card text names the effect, not the variable.
- The proof needs an API-billed path (credits). The user's CLI is on the subscription now; validation uses `api-key` mode with the vault Anthropic key on an isolated instance.

## Guidance For Implementation

- Reproduction to start from: investigation-notes T1-T6 commands (Claude CLI, Haiku, `--no-session-persistence`); no failing test exists.
- Validation (API/E2E): approved spend up to about 1-2 cents of API credits (user, 2026-10-22). Two-turn proof: isolated AutoByteus server built from this branch, Claude runtime with `CLAUDE_AGENT_SDK_AUTH_MODE=api-key` and the Anthropic key from the vault used only through the product (never printed, never copied into logs), Haiku 5.5, toggle absent (default on); turn 1, wait about 6 minutes, turn 2; expected: turn-1 writes under `ephemeral_1h_input_tokens`, turn-2 reads the earlier prefix from cache (cache read > 0, no full re-write). Also check the Token Statistics cost breakdown shows the 1h row. If the isolated instance cannot reach the vault key through the product, stop and ask the user (do not copy key material by hand). Also re-run T3 through the AutoByteus spawn: a `promptCacheTtl: "5m"` user setting wins (on the subscription, no credits).
