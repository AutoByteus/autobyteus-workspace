# Implementation Handoff — autobyteus-303 (`list_available_agent_runtimes`, Settings → Model Routing)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large / High); ARCH-REV-003 Pass (SR-003), ARCH-REV-005 Pass (SR-005). Downstream: code review (rule for Large or High).
- Requirements doc: `tickets/in-progress/available-agent-runtimes-tool/requirements-doc.md` (SR-005, Approved)
- Investigation notes: `tickets/in-progress/available-agent-runtimes-tool/investigation-notes.md`
- Solution revision record: `tickets/in-progress/available-agent-runtimes-tool/solution-revision-record.md`
- Design spec: `tickets/in-progress/available-agent-runtimes-tool/design-spec.md` (SR-005, incl. § SR-004 Addition)
- Supplemental task artifacts: `evidence/limit-probes/` (probe scripts; the recorded answers are now redacted fixtures in `autobyteus-server-ts/tests/fixtures/usage-limits/`)
- Design review report: `tickets/in-progress/available-agent-runtimes-tool/design-review-report.md`
- Architecture review revision record: `tickets/in-progress/available-agent-runtimes-tool/architecture-review-revision-record.md`
- Triggering rework report: N/A

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool`, branch `codex/available-agent-runtimes-tool`, base `origin/personal` `a2faf424d6`. Code commit: `5135bb73dc`; ticket documents and evidence are in the commit after it.

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`, `SR-005`
- Related architecture-review revision IDs: `ARCH-REV-003`, `ARCH-REV-005`
- Related code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

The opt-in tool `list_available_agent_runtimes` (AutoByteus local tool + Agent Tools MCP adapter) and the GraphQL query `availableAgentRuntimes` both return `AvailableAgentRuntimesService.read()`: every available agent runtime on the node with its models and its live usage limits, read with 0 tokens. Settings → Model Routing → "Agent runtimes now" renders the same object.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section: design-spec § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence: ~40 source files across runtime-management, llm-management, agent-tools, GraphQL, composition and web; four new external contracts; short child processes under deadlines; a credential path (provider keys); a change to how Claude model discovery talks to the CLI. No persistence.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. No reader needs tokens or a model request; nothing is cached, persisted or polled; no credential or identity reaches the answer or logs; every step has a process-level bound.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, 002, 003, 007, 010; AC-001, 002, 008, 011, 012) | Tool returns the node's available runtimes, models, limits | `agent-tools/agent-runtimes/*` → `findAvailableAgentRuntimesService()` → `AvailableAgentRuntimesService.read()` (`runtime-management/agent-runtimes/available-agent-runtimes-service.ts`): per runtime in parallel `readVersion` (4 s) → `AgentRuntimeSignInReader.read` (6 s) → `ModelCatalogService.runtimeModelSelectionCatalog` ‖ `strategy.readUsageLimits` (8 s each); AutoByteus: `listProviderCredentialSettings` + catalog (4 s) → each keyed provider's reader (8 s). MCP: `list-available-agent-runtimes-mcp-adapter-provider.ts` (`isAvailable: () => true`); loader unit `agent_runtimes` | Implemented. Installed = `readVersion !== null`; signed out → left out; sign-in unknown/failed → `signIn: "not checked"`; models failure → `unknown: <Name> model list timed out / could not be read`; empty list → `unknown: no models could be read`; limits failure → `unknown: <Name> usage limits …` |
| BEH-002 (REQ-009; AC-010) | Settings → Model Routing → "Agent runtimes now" shows the same data | `pages/settings.vue` (nav `model-routing`) → `ModelRoutingManager.vue` → `AgentRuntimesNowSection.vue` → GraphQL `availableAgentRuntimes` (JSON scalar: the tool's object as is) → `AvailableAgentRuntimeRow.vue`, `AvailableModelList.vue` | Implemented. Reads on open, on Check again and on node rebind; no polling |
| BEH-003 (REQ-004, 005, 008; AC-003…007, 009) | Live 0-token limit readers; lean answer | Strategies' `readUsageLimits` + parsers `usage-limits/{codex,claude,antigravity,grok}-usage-limits.ts`; Claude via `claude/client/claude-sdk-control-query.ts` (idle input); Grok via `acp/acp-discovery-handshake.ts` `runAcpExtensionRequest`; providers `llm-management/provider-usage/*` | Implemented. `blocked: {until, by}` derived only in the service; `limitsNote` (SR-004/005) for Codex credits and Grok's missing used % |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The Agent Runtimes page, sign-in reading and launch paths keep their behavior (all new options are optional and default to today's time-outs); no tool is added automatically.

### Implementation decisions inside the design (for the code reviewer)

1. **`UsageLimitScope` has a third variant `modelFamilies`.** The design's `appliesTo: runtime | models(modelIds)` cannot be filled by Claude's or Antigravity's parser: limits are read in parallel with the model list (design DS-003), so a parser does not know model IDs. Those parsers emit display-name families; the service resolves them against the models it read (`usage-limits/usage-limit-model-matching.ts`). This keeps the design's ownership (the service maps limits to models), and the parallel steps.
2. **Family match = the family's words in order, starting at the display name's first word.** Literal "starts with" misses real data: the group lists "Gemini Flash", the model is "Gemini 3.8 Flash (High)" (captured live, `agy models`). Most specific (most words) wins; a limit covering no model covers the whole runtime (DEC-003).
3. **Claude limits come from `rate_limits.limits[]`.** The live answer (captured 2026-10-25, cost 0) carries `rate_limits.limits[]` with `kind` session / weekly_all / weekly_scoped; the SDK 0.3.280 `.d.ts` does not declare `limits` (it declares `five_hour`, `seven_day`, `model_scoped`). A change there → `unknown`, as RSK-001 accepts.
4. **Codex names:** a model-specific `rateLimitsByLimitId` entry gets "<window> · <limitName or slug>"; entries without any window → `not reported`.
5. **GraphQL encoding (reviewer note 2):** `availableAgentRuntimes: JSON!` returns the report object unchanged; the web types mirror the report.
6. **Codex lease (reviewer note 1):** the sign-in step is awaited, including its `lease.release()` in `finally`, before models ‖ limits start. Only when a step overruns its backstop (cap + 500 ms) can a release still be pending, which then gives models/limits `unknown`.
7. **Step backstop:** each step is also raced against cap + 500 ms (design § Bounded spine). Worst case per runtime is 18 s + 1.5 s, which is ≤ 20 s.
8. **AutoByteus listing** has its own cap (4 s). If the provider list or AutoByteus catalog cannot be read, the AutoByteus entry is left out with a logged warning (no secrets); REQ-007 names no entry for this case.
9. **`withClaudeControlQuery({ queryFn, env?, deadline? }, use)`** takes the SDK's `query` function from `ClaudeSdkClient`, which keeps owning module loading. It closes with `close()` only (nothing runs, so it does not interrupt), and it also closes a query that opens after the deadline.
10. **Strategy factory unchanged:** the Claude strategy takes an optional `claudeSdkClient` and defaults lazily to `getClaudeSdkClient()`.
11. **Extra view file** `AvailableModelList.vue` (the collapsed model list, used by runtime rows and provider sub-rows).
12. **Kimi currency:** `USD` for the api.moonshot.ai host the Kimi models use, unless the answer names a currency.

## Key Files Or Areas

- New, server: `src/runtime-management/read-deadline.ts`; `src/runtime-management/agent-runtimes/{available-agent-runtimes-service,available-agent-runtimes-report}.ts`; `src/runtime-management/agent-runtimes/usage-limits/{usage-limits-reading,usage-limit-model-matching,codex-usage-limits,claude-usage-limits,antigravity-usage-limits,grok-usage-limits}.ts`; `src/runtime-management/claude/client/claude-sdk-control-query.ts`; `src/llm-management/provider-usage/{provider-usage-reader,provider-usage-readers,deepseek-provider-usage,kimi-provider-usage,anthropic-provider-usage,xai-provider-usage}.ts`; `src/agent-tools/agent-runtimes/{list-available-agent-runtimes-contract,list-available-agent-runtimes-tool,register-agent-runtimes-tools}.ts`; `src/agent-tools/mcp/providers/list-available-agent-runtimes-mcp-adapter-provider.ts`; `src/api/graphql/types/available-agent-runtimes.ts`.
- Modified, server: `agent-runtime-strategy.ts`, `agent-runtime-sign-in-reader.ts`, four strategies, `runtime-command-runner.ts` (0 ms → not started), `runtime-version.ts`, `antigravity-cli-capability.ts`, `grok/grok-build-capability.ts`, `acp/acp-discovery-handshake.ts`, `claude/client/claude-sdk-client.ts` (`listModels(options)`, `readUsage`; `tryGetSupportedModelsFromQueryControl` and `closeQueryControl` removed), `agent-execution/backends/claude/claude-runtime-shared.ts` (`MODEL_DISCOVERY_PROBE_PROMPT` removed), catalogs + `model-catalog-service.ts`, `default-agent-tool-mcp-adapter-providers.ts`, `startup/agent-tool-loader.ts`, `api/graphql/schema.ts`, `compositions/agent-runtime-status-composition.ts`.
- Web: `components/settings/model-routing/*`, `types/availableAgentRuntimes.ts`, `graphql/queries/availableAgentRuntimesQueries.ts`, `pages/settings.vue`, `localization/messages/{en,zh-CN}/{modelRoutingSettings,settings,index}.ts`.
- Tests and fixtures: `tests/fixtures/usage-limits/*` (redacted recorded answers + README); new unit tests listed under IMP-03; updated doubles and loader expectations.
- Docs: `docs/modules/agent_runtimes.md` (§ Available Agent Runtimes), `agent_tools.md` (§ Agent Runtimes Tool), `llm_management.md` (§ Provider Usage, Claude discovery note), `autobyteus-web/docs/settings.md` (§ Settings: Model Routing), `GLOSSARY.md` (§ Agent Runtimes).

## Important Assumptions

- ASM-001 (Docker node parity) unverified here; the same composition builds Docker nodes (`build-studio-server.ts`).
- The Claude CLI answers `get_usage` and `supportedModels()` over a query whose input never yields. Confirmed live on 2026-10-25 (probe and dev stack).

## Known Risks

- RSK-001: external formats (Claude's undeclared `rate_limits.limits[]`, agy `/usage` JSON, Grok billing) can change → `unknown`; fixtures pin today's formats.
- RSK-003 / UNK-001: Grok `creditUsagePercent` is absent today → `remainingPercent: null` + `limitsNote`; its meaning when present is unconfirmed.
- RSK-004: an abandoned Codex request's late answer is ignored; with the home-folder key held only by this read, the app-server closes on release (ARCH-REV-003 MP-002).
- Codex lease timing (decision 6) under overrun only.
- Provider readers are unit-tested against recorded shapes only; their live answers (test vault) are left to validation.
- Live Claude reads during the dev-stack check: the usage answer showed the account's 5-hour window moving between reads (41 % → 25 % left over ~40 min). That is the account's own use in that time; the reads themselves reported `session.total_cost_usd` 0. Proving "utilization does not move across repeated reads" is validation's live check.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature (+ local defect fix in Claude discovery)
- Reviewed root-cause classification: Local Implementation Defect (C-15)
- Reviewed refactor decision: `Refactor Needed Now` (small: shared idle-input control query)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as Design Impact: `N/A`
- Evidence: IMP-04 (reproduction failed before, passes after); `claude-sdk-client.ts` shrank from 438 to 340 effective lines.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (`tryGetSupportedModelsFromQueryControl`, `closeQueryControl`, `MODEL_DISCOVERY_PROBE_PROMPT`, now-unused imports; `grep` finds no other reference)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (one blocked form per subject; `limitsNote` only on read limits; `signIn` only when not checked)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Largest: `pages/settings.vue` 450, `model-catalog-service.ts` 343, `claude-sdk-client.ts` 340, the service 219.

## Persisted Data Transition Check

- Approved decision: `Not Affected` (live reads only). Implementation follows it: `Yes`; nothing is stored.

## Environment Or Dependency Notes

- Worktree needed `pnpm -C autobyteus-server-ts prebuild` (Prisma client) and `pnpm -C autobyteus-web exec nuxt prepare` once.
- No dependency or lockfile change. `autobyteus-application-*/dist` outputs regenerated by builds are untracked and not committed.

## Checks Run

Evidence: `tickets/in-progress/available-agent-runtimes-tool/evidence/implementation/`. Environment for all: macOS (darwin 25.5), Node from the worktree's toolchain, this worktree.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | 5135bb73dc (same tree) | local | all server `src` | — | Pass | `IMP-01-server-typecheck.log` | `typecheck exit 0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | 5135bb73dc (same tree) | local, test isolation | whole server unit suite | AC-012 (existing exposure tests) | Pass | `IMP-02-server-unit-summary.log` | `Test Files  826 passed \| 4 skipped (830)`, `Tests  6869 passed \| 7 skipped (6876)` |
| IMP-03 | focused server suites (agent-runtimes, usage-limits, claude, grok, antigravity, acp, provider-usage, codex catalog deadline, claude catalog, agent-tools/agent-runtimes, loader, agent-runtimes resolver), `--reporter=verbose` | 5135bb73dc | local | service, parsers, matching, strategies, deadline, control query, ACP extension request, provider readers, tool/MCP/GraphQL | AC-001…009, 011, 012; AR-002 deadline tests | Pass | `IMP-03-server-focused.log` | `Tests  240 passed (240)`; e.g. "shares one step deadline across --help and models: a hanging second command ends by it and is killed (AR-002)" |
| IMP-04 | reproduction: Claude discovery query prompt is not a string | base + test edit (fail) → 5135bb73dc (pass) | local | `ClaudeSdkClient.listModels` / `withClaudeControlQuery` | AC-005 (no prompt), AR-001 | Fail before, Pass after | `IMP-04-claude-prompt-reproduction.log` | `expected 'string' not to be 'string'` before; `✓ … uses user settings-source policy for model discovery` after |
| IMP-05 | `pnpm -C autobyteus-web test:nuxt components/settings/model-routing pages/__tests__/settings.spec.ts localization --run` | 5135bb73dc | local, jsdom | Model Routing views, settings page, catalogs | AC-010 | Pass | `IMP-05-web-tests.log` | `Tests  72 passed (72)` |
| IMP-06 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | 5135bb73dc | local | web sources, en/zh-CN catalogs | — | Pass | `IMP-06-web-guards.log` | `Passed with zero unresolved findings.` |
| IMP-07 | `pnpm dev` (own data root, no provider keys) + `curl` GraphQL `{ availableAgentRuntimes }` | 5135bb73dc | this Mac's real codex 0.164.0 / claude / agy / grok, signed in | whole server path incl. real CLIs | REQ-010, AC-003/004/006 shapes live | Pass | `IMP-07-live-report.json` | `"elapsed": "real 4.79 s"`; Antigravity Claude/GPT models `blocked … "Claude and GPT models · weekly"`; Grok `limitsNote`; `"providers": []` |
| IMP-08 | browser on `http://127.0.0.1:3000/settings?section=model-routing` (same dev stack): rows, opened model list, Check again, list narrowed to 420 px | 5135bb73dc | dev stack, 1280 px window | page, section, rows, model list | AC-010, UI required states | Pass | `IMP-08-model-routing-wide.png`, `IMP-08-model-routing-blocked-models-grok-autobyteus.png`, `IMP-08-model-routing-narrow.png` | 5 rows; "0% left" in red; "13 models · 7 blocked"; "Blocked until Oct 26, 11:22 AM (Claude and GPT models · weekly)"; Grok note; "No API provider has a key on this node."; stacked layout at 420 px |

- Not run, and why: server integration and E2E suites (API/E2E owns them; the existing agent-runtimes E2E fake CLI does not answer `agy -p /usage`, which only makes Antigravity limits `unknown` there); provider readers against real keys (test vault, validation); repeated live Claude reads to show the 0-token property via utilization; Docker node (ASM-001, user verification); isolated desktop instance; zh-CN rendered view (catalog checked by tests only).

## Frontend Rendered-Result Check

- Affected surfaces / journeys: Settings nav "Model Routing"; Model Routing page, section "Agent runtimes now".
- References: requirements § UI (required states), design DS-002; Agent Runtimes page as the row-style reference.
- Design system reviewed: `AgentRuntimesManager.vue` / `AgentRuntimeRow.vue` (card, header, Check again, node line, container-query layout), settings nav pattern.
- Surface used: `pnpm dev` (README § Local full-stack development) with this worktree's build; browser at 1280 px.
- Inspected: loading → rows; every external runtime row with limits, bars, reset times, notes; a blocked model list opened; AutoByteus with no providers; Check again (disabled with "Checking…" while reading, rows kept, polite announcement after); narrow list (single column).
- Corrected during the loop: limit name, percentage and reset (and model name / id / context) had no text space between them, only flex gaps, so the text read "Weekly0% left". Added text spaces (affects screen readers and copy-paste).
- Remaining unverified: sign-in "not checked", limits/models `unknown`, provider sub-rows with balance/blocked, empty node, load-error states were exercised in component tests only (IMP-05), not on the live stack; remote-node window; zh-CN rendering. Visual nit kept: when a limit line wraps at narrow width, the wrapped part starts with "· resets …".

## Downstream Coverage Hints / Suggested Scenarios

- Server E2E on a test-owned server: `availableAgentRuntimes` with scripted CLIs (extend `tests/fixtures/agent-runtimes-fake-cli.mjs` with `agy -p /usage`, Codex `account/rateLimits/read`, Grok `_x.ai/billing`) — signed-out runtime absent, slow CLI → `unknown` within 20 s, output contains no secrets.
- Agent Tools MCP: a Claude or Codex run whose definition lists `list_available_agent_runtimes` gets the tool; one without does not (AC-002, AC-012).
- Live (validation): Claude `get_usage` reads repeated show `session.total_cost_usd` 0 and no utilization step caused by the reads; provider readers with the test vault (DeepSeek, Kimi, Anthropic `count_tokens`, xAI); whole answer ≤ 20 s with several parallel calls (RSK-002); Docker node.
- Browser probe of the page with fixture GraphQL answers covering the states listed above as unverified on the live stack.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. All of the above after code review; none of IMP-01…08 is API/E2E sign-off.
