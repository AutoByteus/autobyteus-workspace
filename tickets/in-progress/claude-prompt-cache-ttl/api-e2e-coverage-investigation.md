# API/E2E Coverage Investigation: autobyteus-273 Claude runtime one-hour prompt cache

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl/tickets/in-progress/claude-prompt-cache-ttl/requirements-doc.md` (Approved, SR-002)
- Investigation Notes: `.../claude-prompt-cache-ttl/investigation-notes.md` (S1-S9, D1/D4, T1-T6)
- Solution Revision Record: `.../claude-prompt-cache-ttl/solution-revision-record.md` (SR-001, SR-002)
- Design Spec (required on every route): `.../claude-prompt-cache-ttl/design-spec.md` (SR-002, Ready; Small / Low)
- Supplemental Task Artifacts: 271 cost evidence `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/claude-prompt-cache-ttl-evidence/` (read-only background; not a validation input)
- Design Review Report: `N/A — not applicable` (architecture review not selected, direct Small/Low route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `.../claude-prompt-cache-ttl/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../claude-prompt-cache-ttl/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (source review not selected)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `.../claude-prompt-cache-ttl/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation engineer handoff, IR-001, HEAD `62bfd7ed51` on `codex/claude-prompt-cache-ttl`
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-001: every Claude Code process AutoByteus spawns gets `ENABLE_PROMPT_CACHING_1H=1` while the toggle is on (absent = on), in `cli`, `auto` and `api-key` modes; on API billing a two-turn run records its writes under `ephemeral_1h_input_tokens` (DEC-004: api-key mode, vault key through the product only, Haiku, ~6 min gap, about 1-2 cents approved).
- REQ-002 / AC-002: the default ranks below every user choice; a user-set `ENABLE_PROMPT_CACHING_1H` is kept (unit); a `promptCacheTtl: "5m"` user setting beats the default in a real run through the AutoByteus spawn.
- REQ-003 / AC-003: on the subscription the agent conversation stays 1h.
- REQ-004 / AC-004: Token Statistics cost breakdown shows "Cache write 5m"/"Cache write 1h" rows with tokens and costs; unsplit writes keep one "Cache writes" row.
- REQ-005 / AC-005: docs updated.
- REQ-006 / AC-006: "Claude runtime" card, toggle on when absent, saves `true`/`false`, error + revert on failure; with the setting off the spawn env has no variable, on/absent it has; server accepts only the two values; a change applies to Claude sessions started afterwards, without restart.
- Design escalation trigger: writes still under `ephemeral_5m` on API billing with the variable present -> `Design Impact`.
- Persisted data: Not Affected (one optional `.env` key; absent = on).
- Direct route: no architecture or code review; test-review decision on `Pass` is `Not Required — direct low-risk route`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SC-001 (API billing, agents idle between turns), SC-002 (user prefers 5m via `promptCacheTtl`), SC-003 (subscription), SC-004 (cost breakdown in Token Statistics), SC-005 (toggle in Server Settings).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SC-006: the user switches the card off (or on) while the server keeps running, then starts a new Claude agent run. Trigger: card click -> GraphQL `updateServerSetting` -> next `createAgentRun` + first message (REQ-006 "without restart"; DS-002 -> DS-001).
  - SC-007: the user puts `promptCacheTtl` in a Claude Code settings layer AutoByteus loads (`settingSources` user/project/local). The validation uses the project layer (`<workspace>/.claude/settings.json`), which Claude Code ranks the same as the user file (D4 "bucket setting") and which avoids touching `~/.claude` (TESTING.md: never edit the user's CLI config).
  - SC-008: the user runs Claude agents in `api-key` mode set through Server Settings (custom setting `CLAUDE_AGENT_SDK_AUTH_MODE=api-key`), key from the vault.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 spawn env default `ENABLE_PROMPT_CACHING_1H=1` | Added | design DS-001; handoff trace | Unit (IMP-01) proves composition; live API-billed run must prove Claude Code honours it (escalation trigger) |
| BEH-002 user choice wins | Preserved | T3, T6; builder `=== undefined` check | Unit for user-set variable; live run with `promptCacheTtl: "5m"` through the AutoByteus spawn |
| BEH-003 subscription conversation 1h | Preserved | T1; DEC-001 | Live subscription run in `cli` mode |
| BEH-004 cost breakdown split rows | Changed | design DS-003 | Component spec (IMP-04) + rendered on real usage (browser probe) |
| BEH-005 native runtime 1h | Preserved (untouched) | design Change Scope | No change in its files; no new coverage |
| BEH-006 card + setting | Added | design DS-002 | Component spec + IMP-07 render; GraphQL settings boundary; card change reaching the next real session |
| Auth-mode policy | Preserved (refactored to one exit) | design Removal plan | Unit (IMP-01) for all modes; live api-key and cli runs exercise both real paths |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `buildClaudeSdkSpawnEnvironment`, `claude-prompt-cache-setting.ts` | IMP-01 unit (108 tests) | Whether Claude Code (2.1.308) honours the variable on API billing | Gated live server E2E through the real Claude backend, SDK and CLI |
| API / transport / contract | Yes | GraphQL `updateServerSetting`/`getServerSettings` for the new key | Service unit test | GraphQL boundary + `.env` + `process.env` handoff to the next spawn | Durable GraphQL E2E case |
| Frontend component / state | Yes | `ClaudeRuntimeCard.vue`, `TokenUsageCostBreakdown.vue` | IMP-04 (109 tests) | Real aggregate from the server (GraphQL shape, pricing) | Browser probe on real usage |
| Browser integration / user journey | Yes | Server Settings card; Token Statistics task row details | IMP-07 (card render, `.env`) | Card change reaching a real Claude session; split rows on real data | Browser probe (probe-owned backend + Nuxt + Chrome) |
| Authentication / session / permissions | Yes (indirect) | Auth policy moved to one exit; api-key path now continues to the cache default | Unit, all modes | Real api-key spawn with the vault key; real cli spawn on the subscription | Live runs in both modes |
| Desktop renderer / web-equivalent UI | Yes | Same renderer as web | as above | as above | Browser probe (web-equivalent) |
| Desktop shell / Electron-specific integration | No | — | — | — | None |
| Process / lifecycle | Yes (light) | Setting read at each spawn; no restart | Unit | Live: change between sessions in one server process | Live E2E + probe |
| Persisted-data transition | No (Not Affected) | Optional `.env` key | IMP-07 CARD-01 (opening writes nothing) | — | None beyond the default-on run on a never-saved node |
| Worker / queue / distributed coordination | No | — | — | — | None |
| External integration | Yes | Claude Code CLI + Anthropic API cache buckets | None in repo (T1-T6 manual, subscription only) | API-billing effect of the variable | Live runs (approved spend) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl`, branch `codex/claude-prompt-cache-ttl`, HEAD `62bfd7ed51`.
- Project type and runtime stack: pnpm monorepo; Node server (`autobyteus-server-ts`, Fastify + GraphQL + WebSocket, Prisma/SQLite), Nuxt web (`autobyteus-web`), Claude runtime via `@anthropic-ai/claude-agent-sdk` + Claude Code CLI 2.1.308 (`/Users/normy/.local/bin/claude`).
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl/TESTING.md` (no closer `TESTING*.md` under `autobyteus-server-ts/` or `autobyteus-web/`).
- Conflicting, missing, or unclear project instructions: TESTING.md notes isolated desktop instances pass only `CODEX_HOME` of the CLI homes; the validation therefore uses in-process server suites and a probe-owned backend (both receive the environment the test gives them), and puts `promptCacheTtl` in the workspace's project settings instead of a throwaway Claude home. A throwaway `CLAUDE_CONFIG_DIR` would also lose the macOS keychain login needed for the subscription case.
- Required environment variables or secrets available: `Yes` — test vault `~/.autobyteus-test/vault` READY with `provider.anthropic.api-key` (`pnpm test-vault status`, values never printed); Claude CLI signed in on the subscription (real `HOME`).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | Layers/commands; e2e folders inherit the shell -> run with `env -i PATH HOME USER LOGNAME TMPDIR`; signed-in CLI needs real `HOME`, `USER`, `LOGNAME`; keys only from the test vault (`AUTOBYTEUS_TEST_VAULT`); never edit `~/.claude`; gated live suites; rerun by impact; evidence in ticket folder |
| `AGENTS.md`, `autobyteus-server-ts/AGENTS.md` | Repo instructions | Design/testing/release docs |
| `autobyteus-server-ts/vitest.config.ts`, `tests/setup/test-environment-isolation.ts` | Test runner | `tests/**/*.test.ts`, forks pool; `*_API_KEY` deleted and `AUTOBYTEUS_TEST_VAULT` captured for every file; live suites apply it via `initializeLiveServerVault` |
| `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`, `autobyteus-anthropic-prompt-caching-live.e2e.test.ts` | Existing live-suite patterns | Studio server (`startStudioE2eRuntimeServer`), GraphQL `createAgentDefinition`/`createAgentRun`, agent WS `SEND_MESSAGE`, `TOKEN_USAGE_UPDATED` per-call payloads with `cache_creation_5m/1h_input_tokens` |
| `src/runtime-management/claude/client/claude-sdk-client.ts` | Spawn path | `resolveSpawnEnvironment` -> builder; api-key mode resolves `provider.anthropic.api-key` from the server vault; `settingSources` user/project/local |
| `evidence/scripts/claude-runtime-card-preview.mjs` (IMP-07) | Probe-owned stack pattern | Backend from `dist/app.js` on temp data root, Nuxt dev, headless Chrome, cleanup receipt |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server E2E (in-process studio server) | `autobyteus-server-ts` | `env -i PATH HOME USER LOGNAME TMPDIR [AUTOBYTEUS_TEST_VAULT] RUN_CLAUDE_PROMPT_CACHE_E2E=1 ./node_modules/.bin/vitest run <file> --no-watch` | Test DB via prisma global setup; temp data dir; port 0 | suite `beforeAll` | suite `afterAll` (terminate runs, delete token rows, remove temp dirs) |
| Probe backend | `autobyteus-server-ts` | `node dist/app.js --data-dir <temp>` (build first: `pnpm -C autobyteus-server-ts build`) | Own temp data root, SQLite, free port; `AUTOBYTEUS_TEST_VAULT` set on the backend only | `/rest/health` | SIGTERM process group; remove temp root |
| Nuxt dev | `autobyteus-web` | `pnpm dev --host 127.0.0.1 --port <free>` with `BACKEND_NODE_BASE_URL` | Serialize with other Nuxt servers in this worktree | HTTP 200 | SIGTERM process group |
| Headless Chrome | — | playwright-core `chromium.launch` | — | page load | `browser.close()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Anthropic API key (API billing) | Test vault through the product (`CLAUDE_AGENT_SDK_AUTH_MODE=api-key` saved via GraphQL `updateServerSetting`, key resolved by `ClaudeSdkClient` from the server vault) | Never printed or copied; vault is read-only | none |
| Subscription login | User's Claude CLI (keychain, real `HOME`) | No login/logout; no edit of `~/.claude`; each run adds a session transcript under `~/.claude/projects/<temp workspace path>` (as the other live Claude suites do) | Reported, not removed (user's history folder) |
| `promptCacheTtl: "5m"` | `<temp workspace>/.claude/settings.json` (project setting layer) | Temp workspace only | Workspace removed after the case |
| Agent definition / runs | GraphQL `createAgentDefinition`, `createAgentRun` | Test DB / probe DB | Runs terminated; token rows deleted; probe temp root removed |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`.
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: a node whose `.env` never had the key behaves as on.
- Evidence planned: API-07 and API-11 start from a never-saved setting and expect 1h writes; IMP-07 CARD-01 (reused) shows opening the page writes nothing.
- Migration-specific scenarios: none.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/claude-prompt-cache-setting.test.ts` (new) | absent/other = on, `"false"` = off; variable added only when undefined | AC-001, AC-002, AC-006 | Still Valid | IMP-01 | Reuse |
| `.../claude/client/claude-sdk-spawn-environment.test.ts` (new) | cli/auto/api-key get the variable; off -> none; pre-set kept; auth policy unchanged | AC-001, AC-002, AC-006 | Still Valid | IMP-01 | Reuse |
| `.../claude/client/claude-sdk-client.test.ts` (updated) | spawn env expectations include `ENABLE_PROMPT_CACHING_1H: "1"` | AC-001 | Still Valid | IMP-01 | Reuse |
| `tests/unit/services/server-settings-service.test.ts` (updated) | key registered; only true/false | AC-006 | Still Valid | IMP-01 | Reuse |
| `autobyteus-web/components/settings/__tests__/ClaudeRuntimeCard.spec.ts`, `ServerSettingsBasicsPanel.spec.ts`, `token-usage/__tests__/TokenUsageCostBreakdown.spec.ts` | card states/saves/error; panel renders card; split/unsplit rows | AC-004, AC-006 | Still Valid | IMP-04 | Reuse |
| `tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` | GraphQL settings lifecycle, Codex sandbox validation | AC-006 (pattern) | Still Valid; no Claude case | read | Add one case (API-06) |
| `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` (Claude cases) | per-call Claude usage live | BEH-004 data path | Out Of Scope (unchanged; split recording predates this ticket) | read | None |
| `tests/e2e/runtime/claude-*.e2e.test.ts` | Claude runtime lifecycle live | auth policy refactor | Still Valid; not rerun separately — API-07..API-10 exercise the same backend/session/spawn path in both auth modes | read | None |
| `autobyteus-server-ts/tests/**/*.test.js` (82 files) | stale compiled copies, never run | — | Out Of Scope (FU-004) | handoff | None |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 (unit), AC-002 (unit), AC-006 (server, spawn) | setting module, builder, client, settings service | Reused | IMP-01 | Ran on `cece5ce05b`; `git diff --name-only cece5ce05b 62bfd7ed51` touches only `tickets/` |
| API-02 | — (type safety) | server `src` | Reused | IMP-02 | Ran on `08a012f9d6`; diff to HEAD: one unrelated unit test + `tickets/` |
| API-03 | AC-004, AC-006 (card) | web components, localization | Reused | IMP-04 | Ran on `08a012f9d6`; no web file changed since |
| API-04 | REQ-006 texts | web guards | Reused | IMP-05 | as API-03 |
| API-05 | regression | full server unit | Reused | IMP-06 (run 2) | Ran on `cece5ce05b`; diff to HEAD only `tickets/` |
| API-06 | AC-006 (server accepts only two values; next spawn follows) | GraphQL settings boundary -> `process.env` + `.env` -> spawn builder | Durable | `env -i ... ./node_modules/.bin/vitest run tests/e2e/server-settings/server-settings-graphql.e2e.test.ts --no-watch` | Service unit test bypasses GraphQL and the `.env`/`process.env` handoff |
| API-07 | AC-001 (real run), AC-006 (absent = on), escalation trigger | Real Claude backend/session/SDK/CLI, api-key mode with vault key, Anthropic API | Durable (gated live) | `CPC-E2E-001` in new `tests/e2e/runtime/claude-prompt-cache-ttl-live.e2e.test.ts`: setting never saved; turn 1; wait 6 min; turn 2 | Only a real API-billed run proves the variable raises 5m -> 1h |
| API-08 | AC-006 (off, no restart), billing control | same, after GraphQL `updateServerSetting false` | Durable (gated live) | `CPC-E2E-002`: new run, one turn | Shows the default really comes from the toggle and that the run is API-billed (5m) |
| API-09 | AC-002 (real run) | same, setting `true`, workspace `.claude/settings.json` `promptCacheTtl: "5m"` | Durable (gated live) | `CPC-E2E-003`: new run, one turn | User setting must beat the default on the billing where the default matters |
| API-10 | AC-003 | `cli` mode, user's subscription login | Durable (gated live) | `CPC-E2E-004`: new run, one turn | Subscription conversation stays 1h |
| API-11 | AC-004 (rendered on real usage), AC-006 (card -> next real session), AC-002 | Probe-owned backend (`dist/app.js`) + Nuxt + headless Chrome; `cli` mode on the operator's subscription (revised from api-key mode, see Round 1 revision below) | Temporary Probe | `node tickets/.../evidence/scripts/claude-cache-ttl-live-probe.mjs --output-dir=<evidence>/API-11-...`: run A default -> card off by a click -> run B -> card on -> run C with workspace `promptCacheTtl: "5m"` -> Token Statistics Run details breakdowns of A, B, C | The split rows and the card are component-tested; the live render is a one-time integration confirmation, not a repository probe (needs real inference on every run) |
| API-12 | AC-005 | docs | Journey (review) | Read the four doc diffs against REQ-005 | Docs check |
| API-13 | AC-006 (off: AutoByteus adds nothing), AC-003 | Live suite, `cli` mode, subscription | Durable (gated live) | `CPC-E2E-005`: toggle saved `false` -> spawned CLI has no `ENABLE_PROMPT_CACHING_1H`; conversation writes 1h (Claude Code's subscription default) | Added in round 1: the off path's effect on the real spawn without API credits |
| API-14 | AC-002 (real run through the AutoByteus spawn) | Live suite, `cli` mode, subscription | Durable (gated live) | `CPC-E2E-006`: toggle `true`, workspace `promptCacheTtl: "5m"` -> spawned CLI has the variable; writes 5m | Added in round 1: the handoff's suggested AC-002 run (as T3, through the AutoByteus spawn), independent of API credits |
| API-15 | — (test code type safety) | the two changed test files | Temporary Probe | `tsc -p <temp tsconfig extending tsconfig.build.json, rootDir "..", include the two files>` | `typecheck` covers `src` only; the repo's own e2e type-check config pattern (`tsconfig.claude-interrupt-resume-e2e.json`) applied to the changed files |

- Test progress log needed: `Yes`.

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-06 | `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` (new `it`) | GraphQL validation of the two values and the hand-off to the next spawn env are not covered at the API boundary |
| API-07..API-10, API-13, API-14 | `autobyteus-server-ts/tests/e2e/runtime/claude-prompt-cache-ttl-live.e2e.test.ts` (new, gate `RUN_CLAUDE_PROMPT_CACHE_E2E=1`; CPC-E2E-001..006) | The behavior depends on Claude Code honouring `ENABLE_PROMPT_CACHING_1H` and its precedence; a future CLI change must be detectable, as for the native runtime's live caching suite |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan (When Applicable)

- Desktop framework / shell: Electron wrapping the Nuxt renderer and the embedded server.
- Testing guideline used: TESTING.md "Choosing the path", "Isolated desktop instances".
- Web-equivalent behavior: card, Token Statistics, server settings, Claude spawn (server).
- Shell-specific or lifecycle behavior: none changed.
- Chosen approach: in-process server live suite + probe-owned backend/Nuxt/Chrome. An isolated desktop instance passes only `CODEX_HOME` and adds no shell coverage this change needs.
- How the run avoids disturbing the running desktop app: own ports, temp data roots, test DB; never `~/.autobyteus`.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order: (1) API-06 GraphQL e2e; (2) live suite API-07..API-10 in one process (`env -i`, real `HOME`/`USER`/`LOGNAME`, `AUTOBYTEUS_TEST_VAULT`); (3) `pnpm -C autobyteus-server-ts build`, then API-11 probe.
- Environment choices: clean env (`env -i`), so none of this Claude Code session's variables (`CLAUDECODE`, `CLAUDE_CODE_*`, `ENABLE_*`) reach the server or the spawned CLI; real `HOME` for the subscription login (the user's `~/.claude/settings.json` has keys `$schema, model, modelSettings, skipDangerousModePermissionPrompt, theme` only: no `promptCacheTtl`, no `env`). Model: Claude runtime `haiku` (Haiku 5.5 pricing $0.1/M input, $0.125/M 5m write, $0.2/M 1h write, $0.01/M read).
- Health / readiness: GraphQL responds; agent WS `CONNECTED`; `/rest/health` for the probe backend.
- Seed data: one agent definition per suite through GraphQL.
- Identities: vault Anthropic key (api-key cases), subscription login (API-10 only).
- Journeys: as Planned Cases.
- Evidence: per-call `TOKEN_USAGE_UPDATED` payloads (`cache_creation_5m/1h_input_tokens`, `cache_read_input_tokens`, `model_identifier`), GraphQL run cost summaries, the spawned CLI's environment variable names (presence of `ENABLE_PROMPT_CACHING_1H` read from the process table; values of key variables never printed), `.env` content of the setting key, DOM text of the breakdown rows, screenshots.
- Owned processes and temporary state: in-process server, Claude CLI children, probe backend/Nuxt/Chrome, temp data roots and workspaces.
- Spend: about 6 Haiku turns on API billing, estimated under 2 cents.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| API billing through a Console login with credits (not api-key mode) | Would need logging the user's CLI out of the subscription (forbidden by the handoff); api-key mode reaches the same "API billing" TTL rule in Claude Code (D4: "Usage credits, API key, or cloud provider") and the same spawn env | Low | No | None |
| `promptCacheTtl` in the user file `~/.claude/settings.json` | Never edit the user's CLI config; the project layer is the same "bucket setting" rank (D4) and goes through the same `settingSources` | Low | No | None |
| BEH-005 native runtime | Not touched | None | No | None |
| API-billed runs (API-07, API-08, API-09: AC-001 real run, toggle-off on API billing, AC-002 on API billing) | Blocked in round 1: Anthropic refuses the test-vault key, "Your credit balance is too low to access the Anthropic API" (core client) / "Credit balance is too low" (Claude runtime). The product did reach the key (api-key mode resolved it from the vault and Claude Code sent it) | High: AC-001's API-billing effect (the reason for the ticket) and the design escalation trigger stay unobserved | No (needs a dependency, not the user's own account check) | Ask the user to add credits to the Anthropic organization of the test-vault key, or replace `provider.anthropic.api-key` with a funded key (`pnpm test-vault setup --replace`); then rerun `-t "CPC-E2E-00[123]"` |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| Writes stay `ephemeral_5m` on API billing with the variable present | Design Impact (pre-agreed escalation trigger) | API-07 | Solution Designer |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added: API-06 case; new gated live suite API-07..API-10)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: implementation checks reused per the rerun-by-impact rule (only `tickets/` and one unrelated unit test changed since they ran).

## Round 1 Plan Revisions (evidence-driven)

- API-billed runs blocked by the vault key's credit balance (see Not Tested). The suite now reports a provider refusal as a skip with its reason (`AUTOBYTEUS_LIVE_STRICT=1`: failure), following TESTING.md "a classified provider refusal is reported as a skip".
- AC-002's real run and the toggle-off effect moved to the subscription as API-14 and API-13 (no credits needed); API-11 runs in `cli` mode on the subscription. On the subscription, toggle off cannot change the bucket (Claude Code's own default there is already 1h), so the off path is proven by the spawned CLI's environment (variable absent), the on path by its presence plus the buckets.
- API-11 sets the Run details end date to tomorrow: with the default range (ending today) runs created today are not listed, a pre-existing defect recorded as FU-005.
