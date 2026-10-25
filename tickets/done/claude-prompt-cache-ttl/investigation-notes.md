# Investigation Notes

Package: autobyteus-273 (`claude-prompt-cache-ttl`)
Status: Requirements investigation and architecture premises complete; waiting for the user's policy decision and spend approval.

## Investigation Meta

- Requested by: `/project_task_manager` (run id `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user ("I want the problem fixed, because earlier our API billing went so fast").
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl`, branch `codex/claude-prompt-cache-ttl`.
- Base: `origin/personal` @ `d8df12435ca2352636046cf514daae800acecefe` (fetched 2026-10-22, 19:11 +0200). Finalization target: `personal`.
- Predecessor evidence: autobyteus-271 (`/Users/normy/autobyteus_org/autobyteus-delivery-receipts/claude-prompt-cache-ttl-evidence/`: handoff-result.md, investigation-notes.md R1-R9/D1-D4, follow-ups.md FU-001). Reference copies in the Task context are byte-identical (diff).
- Authorities read: solution-designer SKILL.md; references requirements-engineering.md, finding-the-cause.md, ticket-scope.md, architecture-design.md, design-principles.md; repo `DESIGN.md`, `autobyteus-server-ts/AGENTS.md`.

## Initial Request And Clarifications

- Task autobyteus-273 (FU-001 of 271): Claude runtime uses the 1-hour prompt cache TTL on API billing by default; an explicit user setting wins; the subscription keeps what Claude Code does itself; Token Statistics show the 5m/1h split; a two-turn run proves it (spend only with the user's approval); tell the user the manual fix now.
- PTM facts (2026-10-22 afternoon): the user is back on his subscription; his transcripts show 1h writes through 03 UTC, 5m only 04-09 UTC (API credits, ~31M tokens at 5m), 1h at 17 UTC (subscription: 240 calls, 9.4M written, 91M read). Token Statistics did not show these Claude-runtime calls "in the last 24h".

## Source Log

| # | Source | Finding | How |
| --- | --- | --- | --- |
| S1 | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-auth-environment.ts` | `buildClaudeSdkSpawnEnvironment(env, apiKeyOverride?)` copies the server environment; `cli` (default) and `auto`-with-OAuth delete `ANTHROPIC_API_KEY`, `CLAUDE_CODE_API_KEY`, `CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR`; `api-key` sets `ANTHROPIC_API_KEY` from the vault. No cache-TTL variable is set anywhere in AutoByteus. | Read |
| S2 | `claude-sdk-client.ts` `listModels` (l.205) and `beginStreamingSession` (l.244-258) -> `resolveSpawnEnvironment(explicit?)` (l.362-379) -> `buildQueryOptions` `env: spawnEnvironment`, `settingSources` user/project/local | Both production spawn paths build the environment through S1. `explicitEnvironment` (session `options.env`) is set only by unit tests (`claude-sdk-client.test.ts` l.150, 213); production `resolveClaudeSessionQueryOptions` sets no `env`. | Read (grep) |
| S3 | `claude-sdk-client.ts` l.94-100 | Built-in tools enabled: Bash, Read, Edit, Write, Glob, Grep, NotebookEdit, WebFetch, WebSearch, Skill. Disallowed: AskUserQuestion, Agent, Task, Workflow, SendMessage, ListAgents. So AutoByteus Claude agents spawn no Claude Code subagents; Claude Code's "everything else" cache bucket holds only its own background requests (compaction, session titles, helpers). | Read |
| S4 | `src/config/app-config.ts` l.233-245, 305-311 | The server loads `<dataDir>/.env` (`~/.autobyteus/server-data/.env`) into `process.env` with `dotenv.config`. So a variable in that file reaches the Claude process (S1). Measured: this Claude-runtime session's own environment contains the server's `AUTOBYTEUS_*` variables. | Read + Measured |
| S5 | Claude runtime usage: `claude-call-usage-tracker.ts` l.65-70, 86-120 | Per call it reads `usage.cache_creation.ephemeral_5m_input_tokens` / `ephemeral_1h_input_tokens` and records `cache_creation_5m_input_tokens` / `cache_creation_1h_input_tokens` when the split sums to the total. DB `token_usage_run_records` has the split for `claude_agent_sdk` runs (271 R7). GraphQL `token-usage-cost-summary.ts` exposes `cacheCreation5mInputTokens`, `cacheCreation1hInputTokens` and their costs. | Read |
| S6 | Web: `components/workspace/usage/TokenUsageMeterPanel.vue` l.344-430 | The per-run usage meter already shows "cache write 5m" and "cache write 1h" rows (i18n `shell.tokenUsage.cacheWrite5m` / `cacheWrite1h`) with unit price and cost. | Read |
| S7 | Web: `components/settings/token-usage/TokenUsageCostBreakdown.vue` (94 lines; used by `TokenUsageTaskStatisticsTable.vue`) | Token Statistics' cost breakdown shows one "Cache writes" row (`cacheCreationInputTokens`), no 5m/1h split, although the aggregate type (`types/tokenUsageCostSummary.ts`) carries the split tokens and costs. `analytics/TokenUsageBreakdown.vue` also shows one cache-write value. | Read |
| S8 | `src/token-usage/repositories/sql/token-usage-run-repository.ts` `listRunsCreatedInRange` l.95-112 | Token Statistics select runs by **run creation time** (`runCreatedAt`, else `firstObservedAt`) in the period. A long-lived Claude agent run created before the period does not appear in "last 24h" even if it spent tokens today. Explains the PTM's observation; not a recording gap. | Read |
| S9 | Web `components/settings/CodexFullAccessCard.vue` (122 lines), `ServerSettingsBasicsPanel.vue` l.8; server `src/runtime-management/codex/codex-sandbox-mode-setting.ts`, `src/services/server-settings-service.ts` l.145-153 (`registerPredefinedSetting` with `allowedValues`), `updateSetting` l.281-318 -> `AppConfig.set` (`src/config/app-config.ts` l.491-505) | The Codex card is a switch that saves one predefined server setting through `useServerSettingsStore().updateServerSetting`. The server validates `allowedValues`, then `AppConfig.set` writes `process.env[key]` **and** the `.env` file. So a saved value is visible to the next Claude spawn immediately (S1 reads `process.env`); no restart. Codex reads its key from `process.env` at thread start. `getBooleanSetting` exists (absent -> null, `"true"` -> true). | Read |
| D4 | code.claude.com/docs/en/prompt-caching, fetched 2026-10-22 | Main conversation (interactive, `-p`, Agent SDK turns): 1h only on a Claude subscription within plan usage; "Usage credits, API key, or cloud provider": 5m. Everything else: 5m (subscription: server-controlled helpers 1h). Precedence: 1 `FORCE_PROMPT_CACHING_5M=1`; 2 bucket env var (`CLAUDE_CODE_PROMPT_CACHE_TTL`, `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`); 3 bucket setting (`promptCacheTtl`, `subagentPromptCacheTtl`); 4 subagent frontmatter; 5 `ENABLE_PROMPT_CACHING_1H=1` (both buckets); 6 default. Requires Claude Code >= 2.1.242. | Read (WebFetch) |
| D1 | platform.claude.com/docs/en/build-with-claude/prompt-caching, fetched 2026-10-22 | 1h cache write = 2x base input; 5m write = 1.25x; read 0.1x (0.05x on Opus 5.5 / Sonnet 5.5). | Read (WebFetch) |

## Runtime, Probe, Or Reproduction Findings

Experiment 2026-10-22 ~20:00 local, Claude Code 2.1.307 (the user's binary), CLI signed in to the **subscription** (`~/.claude.json` `oauthAccount.billingType = stripe_subscription`, non-secret field), Haiku 5.5, empty temp folder, `--no-session-persistence`, unique nonce per prompt; usage read from `--output-format json` (`cache_creation.ephemeral_5m/1h_input_tokens`). Plan usage only; no credits.

| Test | Configuration | Cache writes | Shows |
| --- | --- | --- | --- |
| T1 | default | 10,558 all **1h** | Subscription main default is 1h |
| T2 | `--settings '{"promptCacheTtl":"5m"}'` | 21,914 all **5m** | Setting name `promptCacheTtl` is real and honoured |
| T3 | `ENABLE_PROMPT_CACHING_1H=1` + setting 5m | 6,307 all **5m** | A user setting beats `ENABLE_PROMPT_CACHING_1H` |
| T4 | `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` + setting 5m | 6,301 all **1h** | The env var overrides a user setting |
| T5 | `CLAUDE_CODE_PROMPT_CACHE_TTL=5m` | 6,297 all **5m** | Env var works both ways |
| T6 | `FORCE_PROMPT_CACHING_5M=1` + `ENABLE_PROMPT_CACHING_1H=1` | 6,309 all **5m** | Force-5m beats everything |
| 271-R9 | API credits (Console login): default vs `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` | 6,059 5m vs 6,059 1h | API billing default is 5m; env var raises it |

Not yet reproduced: `ENABLE_PROMPT_CACHING_1H=1` raising the **API-billing** default from 5m to 1h (documented in D4 step 5; T3/T6 prove its rank). It needs an API-billed run (credits): planned as the two-turn proof, after the user's approval.

## Assumptions, Unknowns, And Risks

- `promptCacheTtl` in the user file `~/.claude/settings.json` is the same setting as `--settings` (flag layer); D4 treats "the bucket's setting" as one rank. Proven for the flag layer (T2/T3).
- Claude Code < 2.1.242 ignores these variables (D4). AutoByteus uses the user's installed binary; older binaries simply keep their default (no harm).
- On a subscription, `ENABLE_PROMPT_CACHING_1H=1` also gives Claude Code's background requests (compaction, titles) 1h instead of 5m; main conversation unchanged (already 1h). S3: no subagents in AutoByteus. PTM data at 17 UTC: all 9.4M subscription writes were 1h, so that bucket carried no visible 5m traffic.

## Supplemental Artifact Inventory

| Artifact | Purpose | Status |
| --- | --- | --- |
| 271 evidence folder (`autobyteus-delivery-receipts/claude-prompt-cache-ttl-evidence/`) | Cost evidence and the 5m default on API credits | Linked, read-only |
