# API/E2E Coverage Investigation

## Investigation Meta

- Package: `claude-sonnet-haiku-5-5-model-support`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support`, `codex/claude-5-5-model-support`
- Implementation under test: `22c3c89fa` (IR-001) on base `ff227eb72`
- Round: `API-REV-001` (initial baseline)
- Upstream package read in full: requirements-doc (Approved, SR-006), investigation-notes, design-spec (Ready), solution-revision-record, solution-handoff, implementation-handoff, implementation-revision-record. Supplements: None. Architecture/code review artifacts: `N/A — not applicable` (direct route).

## Routing Classification

- task_size: `Medium`; architectural_risk: `Low` (confirmed by implementation). Route: direct low-risk → API/E2E. Test-review decision on Pass: `Not Required — direct low-risk route`.

## Current Requirement And Design Basis

REQ-001..REQ-013, AC-001..AC-012; DEC-001=A, DEC-002=A (toggle default off → Sonnet 5.5 `between_tools`, Haiku 5.5 `disabled`), DEC-003=A (Sonnet 5.5 display default `summarized`). Design: exact-value policy table (`anthropic-model-request-policy.ts`) consumed by `applyAnthropicRequestParams`.

## Supported Scenarios And Real Usage

| Scenario | Real trigger | Planned evidence |
| --- | --- | --- |
| SCN-001 pick model | Frontend model picker → Thinking menu, server catalog GraphQL | Live catalog GraphQL (C55-E2E-001) + rendered browser check in owned Nuxt + built backend (C55-BR-001) |
| SCN-002 plain/tool turn, thinking off/on | Agent WebSocket send on a run created with the llmConfig the frontend writes (schema defaults written explicitly, AF-007) | New live server E2E C55-E2E-002..005 (both models × off/on) |
| SCN-003 tool turn + continuation with preserved native turn | read_file tool calls through the real server | C55-E2E-002..005 (byte-identical thinking replay check on live responses) + prompt-caching live E2E with strict preserved-thinking check on each model (APC-SON / APC-HAI) |
| SCN-004 cost a turn | Token Meter `getAgentRunTokenUsageSummary` | C55-E2E-006 (Haiku, one call ≤100k and one call >100k gross) + APC-E2E-007 on each model |
| Added: unconfigured streaming output limit (AF-012/013, handoff hint 5) | Every streamed agent call | Asserted `max_tokens: 128000` on every call in C55-E2E-002..006 |

Contrived/unsupported (not tested): explicit `thinking` kwargs through the server (no supported caller sends them); forced `tool_choice` through the server (the agent runtime never forces it) — covered by unit tests only.

## Changed Behavior Summary

- Request shaping per model from an exact-value policy table; prefix family matching and Opus 5.5 special cases removed (affects every Claude row → regression risk for existing models).
- Two catalog rows with schemas, 128k output, Standard pricing; Haiku 100k-tier pricing.

## Changed Surface And Boundary Classification

| Surface | Classification | Boundary to prove |
| --- | --- | --- |
| `anthropic-llm.ts` + policy | domain/backend + external integration (Anthropic Messages API) | real provider accepts generated shapes in agent runs |
| catalog rows | backend catalog → GraphQL → web renderer | GraphQL fields, schema defaults; rendered Thinking menu |
| pricing tiers | server token-usage | Token Meter costs at the right tier |
| frontend | unchanged code, schema-driven | rendered control set and preselection |

## Project Execution Discovery

- Guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/TESTING.md` (no closer TESTING*.md).
- Learned commands: `pnpm -C autobyteus-ts exec vitest run tests/unit`; `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; web `pnpm -C autobyteus-web test:nuxt` (needs `nuxt prepare`); live E2E from `autobyteus-server-ts` with `env -i PATH HOME=<temp> TMPDIR ... ./node_modules/.bin/vitest run ...` and gates `RUN_ANTHROPIC_CACHE_E2E`, `RUN_NATIVE_OUTPUT_LIMIT_E2E`; shared harness `tests/e2e/helpers/native-runtime-live-harness.ts`; browser probes own a built backend (`dist/app.js`) + Nuxt dev on free ports with sanitized env (`autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` pattern).
- Credentials: the user directed using `/Users/normy/.autobyteus/server-data/.env` (contains `ANTHROPIC_API_KEY`). For the server E2E the key is passed only as the env var of the `env -i` command, read from that file inside the command (never echoed); the test helper saves it into the test-owned vault. For the browser probe's owned backend the key is imported with `pnpm secrets:import -- --source <that .env> --database-url file:<owned db>` (TESTING.md importer rule). The user's running app and `~/.autobyteus` data are never used as a test target.
- Discrepancy: `test:nuxt` failed until `pnpm -C autobyteus-web exec nuxt prepare` was run in this fresh worktree (documented prerequisite elsewhere in TESTING.md).

## Persisted Data Transition Coverage Basis (When Applicable)

`Not Affected` (static catalog rows; existing token-usage records keep captured prices). No migration evidence needed.

## Existing Durable Coverage Inventory

| Test | Decision | Notes |
| --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm*.test.ts`, `anthropic-signed-tool-continuation`, `anthropic-conversation-prefix-flow`, `provider-native-request-payloads` | Still Valid | unchanged; pass → AC-010 |
| `anthropic-model-request-policy.test.ts` (new) | Still Valid | pins every catalog row |
| `anthropic-llm-claude-5-5.test.ts` (new) | Still Valid | AC-004..009 mocked SDK |
| `supported-model-definitions.test.ts` | Still Valid | order/slice updated as design anticipated |
| server `token-cost-calculator.test.ts` Haiku cases | Still Valid | AC-003 unit |
| web `llmThinkingConfigAdapter.spec`, `chatThinkingMenu.spec`, `ChatThinkingControl.spec`, `llmConfigSchema.spec` | Still Valid | schema-driven behavior with Sonnet-5-shaped schemas |
| `autobyteus-anthropic-prompt-caching-live.e2e.test.ts` | Needs Update | (a) run llmConfig `{thinking_display}` only works for Opus 5.5 (adaptive_required); for other adaptive models it sends no thinking at all, so `ANTHROPIC_CACHE_E2E_MODEL=claude-sonnet-5-5` would not exercise thinking replay; the frontend writes `thinking_enabled` explicitly for models whose schema has it; (b) APC-E2E-007 hard-codes Opus 5.5 prices |
| `autobyteus-native-output-limit-live.e2e.test.ts` | Still Valid | not re-run (Opus-centric, large-output cost); 128k streaming limit asserted directly in the new suite instead |

## Durable Coverage To Add

- `autobyteus-server-ts/tests/e2e/runtime/autobyteus-claude-5-5-live.e2e.test.ts` (gate `RUN_CLAUDE_5_5_E2E=1` + `ANTHROPIC_API_KEY`), on the shared harness:
  - C55-E2E-001 catalog over GraphQL (rows, limits, schema defaults).
  - C55-E2E-002..005 Sonnet/Haiku × thinking off/on agent tool turns: exact `thinking` shape on every call, no sampling params, `max_tokens: 128000`, all 200, tool_use → tool_result continuation, live thinking blocks replayed byte-identically.
  - C55-E2E-006 Haiku Token Meter tier costing below and above 100k gross input against raw Anthropic usage.

## Durable Coverage To Update

- Prompt-caching live E2E: thinking-on llmConfig per model schema (`thinking_enabled: true` for models other than Opus 5.5) and a per-model catalog price table (Opus 5.5, Sonnet 5.5, Haiku 5.5 with per-call tier selection) for APC-E2E-007.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Command | Result |
| --- | --- |
| `pnpm -C autobyteus-ts exec vitest run tests/unit/llm` | 74 files / 528 pass |
| `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage --no-watch` | 17 files / 111 pass |
| `pnpm -C autobyteus-web test:nuxt <4 thinking/schema specs> --run` (after `nuxt prepare`) | 4 files / 40 pass |

## Test-Case Ledger Decision

Required (several independent live cases, long-running, real credits). Path: `api-e2e-test-case-ledger.md` in the ticket folder.

## Post-Repository Confidence Scorecard (Mandatory)

| Category | Score | Basis |
| --- | --- | --- |
| Requirement/AC proof | 80% | all ACs unit-proven; AC-011 only adapter-level live smoke |
| Changed-boundary directness | 75% | provider boundary only through mocks + implementation smoke |
| Integration realism / mock gap | 70% | no real-server run, no live thinking replay |
| Environment/fixture fidelity | 75% | no server/catalog/vault path |
| Failure/edge/lifecycle | 85% | unit edge cases; no live strict-thinking proof |
| User surface | 70% | no rendered check |
| Durable regression quality | 85% | good unit coverage; live suites not parameterized for new models |
| Overall | ~77% | below gate |

## Broader Validation Decision (Mandatory)

`Required`. Residual risks: live provider acceptance through the real server per model and thinking mode; signed thinking replay with real thinking; Token Meter tier; rendered picker/Thinking menu. Mode: live server E2E (in-process studio server, real Anthropic) + owned built backend/Nuxt/Chrome browser check.

## Desktop Application Validation Decision (When Applicable)

Not required: no shell-specific change; the Thinking menu is web-equivalent renderer behavior.

## Live Environment And Fixture Plan

- Server E2E: in-process studio server, temp app-data dir + test-owned SQLite vault (harness), temp workspaces with generated data files; cleanup by harness (`stop()`), evidence in `tickets/.../api-e2e-evidence/`.
- Browser: built `dist/app.js` + Nuxt dev on free ports, owned temp data root with imported key, fresh headless Chrome; all owned processes stopped, data root removed.

## Temporary Executable Validation Plan

Browser rendered check as a temporary probe (frontend code unchanged; durable web unit specs already pin the adapter/menu behavior; a durable live probe for two catalog rows would duplicate them).

## Not Tested / Infeasible / Deferred

- Forced `tool_choice` and explicit `thinking` kwargs through the server: no supported real-use trigger; unit coverage only.
- Packaged Electron shell: not changed.

## Ambiguities Or Reroute Triggers

None at investigation time. Known risk notes from the handoff (dropped unknown explicit thinking; Opus-named `adaptive_required` messages) are design-accepted and unreachable from supported callers.

## Investigation Decision

Proceed: add/update durable live coverage, execute live cases, then browser check.

## Round API-REV-003 — SR-007 rework (IR-002) and rebase

Current authority for this round; the API-REV-001 sections above remain the basis for the live, browser and desktop evidence.

- Implementation under test: branch on `origin/personal` @ `228cd9b5e` with `bc1777e02` (feature), `68269cfae` (live E2E), `b38d0a909` (SR-007), plus API/E2E header commit `31132efcf`. `git fetch` on 2026-10-11 showed origin still at `228cd9b5e`, and `git merge-tree --write-tree HEAD origin/personal` is clean.
- Upstream read: design-spec Revision SR-007 (D-SR7-1..6), implementation handoff and revision record IR-002, independent code review CRR-001 (CR-001..006). Requirements are unchanged (approval of 2026-10-09 stands). Classification: `Small` / `Low`, direct route; test review `Not Required — direct low-risk route`. Architecture review: `N/A — not applicable`.
- Guideline: root `TESTING.md` as rebased (origin's version, unchanged by this ticket). Relevant rules:
  - per-suite command, cases and cost belong in the test-file header;
  - real-provider runs only when the change needs real-provider proof;
  - live suites run in a clean `env -i` environment.

### Changed behavior since the validated tree (`30541612c`)

`git diff 30541612c HEAD -- autobyteus-ts/src` touches only `anthropic-model-request-policy.ts` and `anthropic-llm.ts`:

| Change | Runtime effect | Boundary |
| --- | --- | --- |
| Policy type becomes a union keyed by `thinkingMode`; the Opus 5.5 and fixed-budget entries drop `thinkingOffShape` | None. The adapter already reads `thinkingOffShape` only on the `adaptive` branch; `tsc` narrows without casts | type only |
| Explicit `claude-sonnet-4-6` row = `LEGACY_BUDGET_POLICY` | None. It is the same object the fallback returned | policy lookup |
| Two `adaptive_required` errors read `Anthropic model ${modelValue} …` | Error text only. Both throw locally before any SDK call | local validation |

Origin changes `ff227eb72..228cd9b5e` were checked by path. In server/core/web source they are only:
- project tasks: GraphQL type, domain model and service;
- web task-locator and task-worker stores;
- left-panel / workspace-history UI;
- `pages/chat.vue` and `pages/workspace.vue`: route-query parsing moved into `workspaceNavigationService`;
- a 4-line addition to an AGY E2E test.

Checked with `git diff --name-only ff227eb72 228cd9b5e`. A grep of the origin web diffs for `thinking|llmConfig|modelIdentifier|ModelSelect|llmModel` finds 0 matches. None of them touches `autobyteus-ts`, server token usage, agent runtime/WebSocket, the LLM catalog, chat or thinking controls, or the live E2E helpers. So none affects this ticket's spines DS-001..DS-003.

### Coverage decisions this round

| Test | Decision | Notes |
| --- | --- | --- |
| `anthropic-model-request-policy.test.ts` | Still Valid (updated by IR-002) | The deleted unsupported-ID `it.each` covered SCN-X2, which is `Technically Possible but Unsupported`; the removal is correct. The catalog-pinning test still pins every row. It cannot tell an explicit Sonnet 4.6 row from the fallback, but both are the same value, so there is no behavior gap. |
| `anthropic-llm-claude-5-5.test.ts` new Opus 5.5 error-text case | Still Valid | Asserts both full messages and that no SDK call happens |
| The five existing Anthropic adapter tests (`anthropic-llm`, `-prompt-caching`, `signed-tool-continuation`, `conversation-prefix-flow`, `provider-native-request-payloads`) | Still Valid | `git diff ff227eb72 HEAD` on them is empty. They pin every existing model's payload, and their message-substring checks pass unchanged. |
| `autobyteus-claude-5-5-live.e2e.test.ts` header | Needs Update → done | D-SR7-5 / CR-006: exact command added. Size/cost corrected from the recorded run (`c55-live/calls-summary.json`): 22 calls = 20 short + 2 Haiku Token Meter calls; the ~242K-gross call cost $0.2346. |
| `autobyteus-anthropic-prompt-caching-live.e2e.test.ts` header | Needs Update → done | D-SR7-5 / CR-001: exact command and model option added |
| `TESTING.md` suite rows | Removed by the rebase (CR-001) | Commands now live in the headers. No replacement row, per origin's rules. |

### Live re-run decision

`Not Required`. The rebase does not warrant one either:
- No request payload changed for any model. The only runtime-visible delta is local error text, raised before the provider boundary, and it is asserted exactly in unit tests.
- No origin change touches DS-001..DS-003.
- The API-REV-001/002 live, browser and desktop evidence therefore still exercises the same request shapes, pricing and UI paths.
- `TESTING.md` limits real-provider spend to changes that need real-provider proof.

Expected evidence gain from a ~$0.30 re-run: none material.

## Post-Broader-Validation Update

All planned live and browser cases ran and passed (see `api-e2e-execution-coverage-report.md`). The browser probe's first attempt asserted a checked display option while thinking was Off. That is not how the menu works: it intentionally shows dependent selections only while thinking is On. The assertion was corrected; this was not a product defect. Durable changes are committed as `30541612c`.
