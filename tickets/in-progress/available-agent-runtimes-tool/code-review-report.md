# Code Review Report — autobyteus-303 (`list_available_agent_runtimes`, Settings → Model Routing)

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review` (round 3); rounds 1–2 were `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/available-agent-runtimes-tool/requirements-doc.md` (SR-005, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited C-15…C-19 through the design spec and design review)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-005, incl. § SR-004 Addition)
- Supplemental Task Artifacts Reviewed As Context: `evidence/limit-probes/` via the redacted fixtures `autobyteus-server-ts/tests/fixtures/usage-limits/`; `evidence/implementation/IMP-07-live-report.json`
- Relevant Solution Revision IDs: `SR-003`, `SR-005`
- Design Review Report Reviewed As Context: `design-review-report.md` (round 5)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-003`, `ARCH-REV-005`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`, `IR-002`
- Code Review Revision Record: `tickets/in-progress/available-agent-runtimes-tool/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: `3`
- Review Scope: `N/A` (failure-origin round); round 2 was a `Targeted Delta Review`
- Review Scope Evidence (round >1): the only source change since round 1 is commit `683b036be9` (`git show --stat`: 1 file, 3 deletions in `availableAgentRuntimesPresentation.ts`), inside CR-001's file and behavior; no shared interface, data shape or spine node changed. Round-1 evidence for every other check carries forward.
- Trigger: implementation handoff IR-002 (CR-001 Local Fix) from `/software_engineering_team/implementation_engineer`
- Prior Review Round Reviewed: `1` (CRR-001, Fail: CR-001)
- Latest Authoritative Round: `3`
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool`, branch `codex/available-agent-runtimes-tool`; round 1 `git diff a2faf424d6 5135bb73dc` (82 files); round 2 `git diff 5135bb73dc 683b036be9 -- autobyteus-web` (CR-001). Ticket docs at `eac7ee8394`.
- Coverage Investigation Reviewed (failure-origin entry point): `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (failure-origin entry point): `api-e2e-execution-coverage-report.md` (round 1, Fail)
- API/E2E Revision Record Reviewed (failure-origin entry point): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-001` (source under test `683b036be9`; tests and evidence `8de58e3ab3`)
- Project testing guideline: `TESTING.md` (Rules: a failure is not closed as "pre-existing" or "flaky" without its cause; F-1's intermittency has a measured cause, so it is a defect, not flakiness)
- Failing Scenario IDs: F-1 (API-03 run 1, API-03b; AC-008, DS-003), F-2 (API-08b; REQ-002, AC-001), F-3 (API-05, API-05b; RSK-002, SCN-A2)
- Exact Failing Commands / Execution Mode: `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts --no-watch` (AAR-03, AAR-04 parallel) and the temporary probes copied in evidence (API-03b, API-05b); live `live-lmstudio-probe.mjs` (API-08b, ENV-3)
- Failure Evidence Paths: `evidence/api-e2e/API-03b-timeout-reason-probe.log`, `API-01-05-server-e2e-full.log`, `API-05b-two-readers-probe.log`, `API-08b-live-lmstudio-probe.json.log`, `API-07b-agent-runtimes-probe-vs-base.log`

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The diff matches the design's surfaces (four new external contracts, short child processes under deadlines, provider-key path, Claude discovery change, new tool and GraphQL contracts); no persistence.

## Review Scope

- Changed implementation and behavior reviewed: the service and its step/cap/backstop sequence; the report types; `ReadDeadline`; the four strategies' `readUsageLimits`, `readSignIn`/`readVersion` deadline pass-through; the four parsers and `usage-limit-model-matching.ts`; Claude `withClaudeControlQuery`, `listModels`/`readUsage`; `runAcpExtensionRequest`; Antigravity and Grok capability deadlines; catalog deadline pass-through incl. Codex lease race; provider usage readers and registry; local tool, MCP adapter, loader unit, GraphQL resolver, composition binding; web page section, rows, model list, presentation helper, types, query, i18n; docs and glossary.
- Files / areas reviewed: all 58 changed source files; the new and changed unit tests and fixtures (proportionately); docs.
- Explicit exclusions: integration/E2E, live provider readers, Docker and desktop (API/E2E); checks IMP-01…IMP-08 were not rerun (code unchanged since they ran).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001…REQ-010 (REQ-006 removed), AC-001…AC-012, DEC-001…DEC-007; scope guardrail (no router, no peer reads, no Agent Runtimes page change, no token-spending reads, no cache/polling).
- Design-spec behavior map verified against the implementation: Yes (DS-001, DS-002, DS-003 traced in code below).
- Design review report and round confirmed: ARCH-REV-005 Pass on SR-005; residual notes (Codex lease, GraphQL encoding) are both handled (handoff decisions 5, 6).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `AutoByteusListAvailableAgentRuntimesTool._execute` / MCP adapter `execute` → `listAvailableAgentRuntimes()` → `findAvailableAgentRuntimesService().read()` (`available-agent-runtimes-service.ts:123-130`) → per strategy `readExternalRuntime` (`:133-167`): `readVersion` (4 s) → sign-in (6 s, awaited incl. Codex release) → models ‖ limits (8 s each) via `runStep` (`:65-82`, deadline + 500 ms backstop); AutoByteus `readAutoByteus`/`readProvider` (`:182-225`). Bound by `composeAgentRuntimeStatus` (`agent-runtime-status-composition.ts`). Opt-in: registry + MCP catalog by definition (test `list-available-agent-runtimes-tool.test.ts`). | — |
| BEH-002 | Confirmed | `pages/settings.vue` nav `model-routing` → `ModelRoutingManager.vue` → `AgentRuntimesNowSection.vue` (`read()` on mount, Check again, binding revision; no polling) → GraphQL `availableAgentRuntimes: JSON` (`available-agent-runtimes.ts`) → same `service.read()` → `AvailableAgentRuntimeRow.vue` / `AvailableModelList.vue`. | — |
| BEH-003 | Confirmed | Codex `account/rateLimits/read` (`codex-agent-runtime-strategy.ts`), Claude `usage_EXPERIMENTAL…({skipBehaviors:true})` on an idle-input query (`claude-sdk-client.ts readUsage`, `claude-sdk-control-query.ts`), `agy -p /usage --output-format json`, Grok `_x.ai/billing` after `initialize` (`acp-discovery-handshake.ts runAcpExtensionRequest`); providers DeepSeek/Kimi/Anthropic `count_tokens`/xAI `api-key`. `blocked` derived only in the service (`blockByLimits`, `readProvider`). | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, BEH-003; REQ-001…008, 010 | System | Agent on AutoByteus runtime whose definition lists the tool | Know what can run now | Tool call | Normal | local tool → service → per-runtime steps → report → JSON text | Runtimes, models, limits; failures per REQ-007 | requirements SCN-001; IMP-07 live answer | Supported Normal Scenario | Use |
| SCN-002 | BEH-001; REQ-001, AC-002 | System | Agent on Claude/Codex/Antigravity/Grok runtime | Same | Agent Tools MCP | Normal | MCP adapter → same service → structured content + JSON text | Same answer | requirements SCN-002 | Supported Normal Scenario | Use |
| SCN-003 | BEH-002; REQ-009, AC-010 | User | User | See the node's runtimes and limits | Settings → Model Routing, Check again | Normal | page → GraphQL → service → rows | Same data as the tool | requirements SCN-003; IMP-08 | Supported Normal Scenario | Use |
| SCN-004 | REQ-007, AC-008, AC-011 | System | A step of one runtime fails or is slow | Answer still arrives truthfully | Any read | Explicit Edge | `runStep` deadline/backstop → REQ-007 text | `unknown: …`, `signIn: "not checked"`, left out on install failure | REQ-007, AC-008, AC-011 | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `modelList` exported from `availableAgentRuntimesPresentation.ts:13` has no caller | Principle 7 (No Dead Code) | — (engineering contract) | New dead export in a file this change adds | Repository grep: only its definition matches (no import in components, tests or pages) | Promote | This ticket | CR-001: delete it |
| C-02 | `blockByLimits` passes only exhausted limits to `resolveLimitCoverage`, so "most specific family wins" is judged among exhausted limits only; a model whose most specific group is not exhausted could be given to a less specific exhausted group | Design reader rule (Antigravity: "most specific match wins") | Would need agy groups whose families overlap (e.g. a bare "Gemini" family next to "Gemini 4 Argon") | Usable model shown blocked (the safe direction under DEC-003) | Recorded fixture and IMP-07 live data: families "Gemini Flash", "Gemini Pro", "Gemini Models", "Claude Opus", "Claude Sonnet", "GPT-OSS", "Claude and GPT models", "Gemini 4 Argon"; none overlaps on any live model name. The overlap exists only in a unit test's hand-written families | Reject | — | Not reachable with the data agy produces; recorded as a residual note only |
| C-03 | AutoByteus entry left out (warning logged) when the provider list or AutoByteus catalog fails or passes 4 s (handoff decision 8) | REQ-007, REQ-002 | Local DB/secret-store read failure, or a cold registry init slower than 4 s | AutoByteus absent from one answer | No evidence of either on a running server; `LLMFactory` initialises once and caches (`llm-factory.ts:63-70`); infrastructure failure is outside scope by default (Principle 6) | Reject | — | Decision is reasonable; REQ-007 names no entry for it |
| C-04 | Codex sign-in step that overruns its backstop leaves the home-folder lease closing, so models/limits `beginAcquire` throws "unresolved cleanup" (handoff decision 6) | ARCH-REV-005 residual note | Codex app-server start slower than 6.5 s | Models/limits `unknown: … could not be read` (REQ-007-compliant) | `codex-app-server-client-manager.ts:30,44-50`; architecture reviewer accepted the outcome | Reject | — | Truthful outcome; no extra machinery warranted |
| C-05 | Two concurrent reads (page + tool, or two agents) racing the Codex home lease close | RSK-002 (design's concurrency contract) | Several agents with the tool on one node; page open during an agent call | One read gets Codex models/limits `unknown` (API-05, API-05b) | `codex-app-server-client-manager.ts:30,44-50`; API-05/05b | **Reclassified round 3: Promote** (round 1 rejected it wrongly) | This ticket | CR-004, Design Impact |
| C-06 | Claude parser reads `rate_limits.limits[]`, not declared in SDK 0.3.280 `.d.ts` (decision 3) | REQ-005, RSK-001 | SDK/CLI answer | Change → `unknown: …` | Live answer (fixture, IMP-07) carries `limits[]` | Reject | — | Accepted contract risk; parser fails closed |
| C-07 | Third `UsageLimitScope` variant `modelFamilies` beyond the design's `runtime | models` (decision 1) | DS-003 (models ‖ limits in parallel); design Ownership Map (service maps limits to models) | — | Parsers cannot know model IDs; the service resolves families once | Code read; tests `usage-limit-model-matching.test.ts` | Reject (confirmed sound) | — | Keeps the design's ownership and parallelism; no deviation in intent |
| C-08 | Family match by word order from the first word (decision 2) | AC-004 | — | "Gemini Flash" ⊂ "Gemini 3.8 Flash (High)"; "Fable" ⊂ "Fable 5.1" | IMP-07 live: Antigravity Claude/GPT models blocked, Gemini not; Claude "Weekly · Fable" maps to Fable models | Reject (confirmed sound) | — | — |
| C-09 | `available-agent-runtimes-service.ts` adds 240 lines (>220 delta) | Source size audit | — | One coherent composer, 219 effective lines | Audit below | Reject | — | Planned single-owner file well under 500 |
| C-10 | Discovered AutoByteus providers (Ollama, LM Studio, custom) have no models in `LLMFactory` until their catalog is ensured | REQ-002 | User has LM Studio or Ollama serving models | Provider absent (API-08b) | `model-catalog-service.ts` `ensureLlmSource`; API-08b | Promote (round 3) | This ticket | CR-003, Design Impact |
| C-11 | Time-out reason decided by `timeLeft(deadline) === 0`; Claude `listModels` swallows the deadline error | AC-008, DS-003 | Slow CLI | Reason "could not be read" / "no models could be read" instead of "timed out" | API-03b; code read | Promote (round 3) | This ticket | CR-002, Local Fix |

## API/E2E Failure-Origin Review (Round 3)

Each failing scenario still represents approved behavior: AC-008/DS-003 name the time-out reason ("…timed out"); REQ-002 lists local providers with models; RSK-002 in the design says concurrent calls are expected and asks validation to measure them.

### F-1 — a timed-out step is sometimes reported "could not be read" → implementation defect (`Local Fix`), CR-002

- Scenario: SCN-004 (a slow CLI), Supported Explicit Edge (REQ-007, AC-008, AC-011).
- Path and cause confirmed in code: a kill timer bounded by `commandTimeout(deadline, …)` fires and the step fails; the reason is then decided by `timeLeft(deadline) === 0` (`available-agent-runtimes-service.ts:75` in `runStep`; `usage-limits-reading.ts:56` in `readUsageLimitsSafely`). Timers run on the monotonic clock while `endsAt` is `Date.now()` milliseconds, so the step can end with 1 ms "left" (API-03b: 9 of 400, each `wallMsLeftAfterReturn: 1`).
- Scope is wider than the API/E2E note says: `runStep` ignores the error type, so every step it classifies is exposed, including the Codex models step: its `ReadDeadlineExceededError` from `raceDeadline` is not looked at, so a timer that fires with 1 ms still on `Date.now()` gives "could not be read". This is exposure by code read, not measured: the API-03b timer probe saw 0 of 30 early direct `setTimeout`s, and the 9 measured cases came through a killed child process. `readUsageLimitsSafely` is exposed for Antigravity and Grok (their errors are not `ReadDeadlineExceededError`). Codex and Claude limits are safe there.
- Related, the same defect class, deterministic: `ClaudeSdkClient.listModels` catches every failure, including `ReadDeadlineExceededError` from `withClaudeControlQuery`, and returns `[]`. So every Claude models time-out reads "unknown: no models could be read" instead of "Claude model list timed out" (design § Examples, Failure row).
- Review gap: the clock comparison was visible in source; its sub-millisecond race was not reasonably detectable without measurement. The Claude `[]` swallow was detectable (a review gap here).
- Required: one owned rule for "this step timed out", in `read-deadline.ts`, used by both `runStep` and `readUsageLimitsSafely` instead of two copies of `timeLeft(deadline) === 0`. It must classify a step stopped by its own deadline as timed out regardless of the timer's millisecond skew; the implementation chooses the mechanism (deadline-error types, a timer-granularity tolerance, or both). With a deadline, Claude `listModels` lets the deadline time-out reach the service; without one (launch paths) it keeps returning `[]`. Keep AAR-03 strict; add a unit test that reproduces the 1 ms case.

### F-2 — a local provider with models is not listed → `Design Impact` (Solution Designer), CR-003

- Scenario: SCN-001 with LM Studio or Ollama serving models; Supported Normal (REQ-002 names local providers explicitly).
- Path confirmed: the service takes AutoByteus models from `runtimeModelSelectionCatalog("autobyteus")` → `LLMFactory.listAvailableModels()` (`model-catalog-service.ts:178`). That holds the static models plus only those discovered sources something has already ensured: Ollama, LM Studio and custom endpoints load through `ensureLlmSource` (`model-catalog-service.ts`, `ensureProviderModelCatalog` / `notifySettingsChange`), which today only the API Keys settings call (`useProviderApiKeySectionRuntime.ts`, `stores/llmProviderConfig.ts`). Live: LM Studio with 4 models was absent until `ensureProviderModelCatalog(LMSTUDIO)` (API-08b).
- Origin: the design's data source ("`runtimeModelSelectionCatalog("autobyteus")` (local list)", design § Bounded Local Spines) cannot satisfy REQ-002 for discovered providers. Making it work needs design decisions: discovery on each read (network, within which cap, run in parallel with the provider list or not), the entry when a local server is unreachable (REQ-007 names none), and whether keyed custom providers (also `DISCOVERED`) are covered the same way. Likely affected too, not tested: a keyed custom provider is listed with no models until its catalog is ensured.
- Review gap: yes. In round 1 I checked that `LLMFactory` initialises once (C-03) but did not trace how the discovered-provider kind gets its models (Principle 1: trace each kind). The architecture review did not catch it either.

### F-3 — concurrent reads often get Codex `unknown` → `Design Impact` (Solution Designer), CR-004

- Scenario reclassified: C-05 is now a **Supported Explicit Edge Scenario**. Round 1 rejected it as two individually supported actions; that was wrong. The design itself states the contract: RSK-002, "concurrent calls spawn concurrent short processes; … validation measures a few parallel calls". Several agents with the tool can run on one node at once, and the page can be open while an agent calls the tool. The autobyteus-32 router is not needed to establish this.
- Path confirmed: each read acquires and releases the home-folder Codex lease three times (sign-in, then models ‖ limits). When the last holder releases, `closeEntry` marks the entry `closing`, and a concurrent read's `beginAcquire` throws "unresolved cleanup" (`codex-app-server-client-manager.ts:30,44-50`). REQ-007 turns that into `unknown: … could not be read`. Scripted: 3 of 4 concurrent readers (API-05); 1–4 of 10 two-reader rounds (API-05b); single reads 5 of 5 fine; live 0 of 8 (slower CLIs) (API-09).
- Consequence: the answer stays truthful, but the feature itself causes the failure, often enough that Codex data is lost exactly when several agents ask.
- Origin: the per-step lease pattern from the design (§ Read deadline: "the lease is released in `finally` as soon as the race ends") combined with the shared manager's throw-while-closing rule. Fixing it means choosing who owns the Codex lease across the steps of one read and across concurrent reads (one lease per read held by the service or the strategy, single-flight reads, or a change to the shared manager used by agent runs). That is an ownership and shared-contract decision, not a local patch.
- Review gap: yes. I rejected C-05 against the design's own RSK-002 contract; the design review accepted RSK-002 without this path.

### Other items

- AAR-03's strict "timed out" assertion is correct and tests approved behavior; it is not a stale test.
- FU-002 (Agent Runtimes settings probe): confirmed pre-existing and out of scope. The fail list is identical on base `a2faf424d6` (`API-07b-agent-runtimes-probe-vs-base.log`), and this ticket does not change that page or its update checks.
- O-1…O-3 (rounding, English answer texts inside zh-CN labels, empty state reachable only on a listing failure): no defect against the approved requirements. They are for the Solution Designer's judgement and are not classified here.

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Local defect (C-15) fixed: `withClaudeControlQuery` with idle input; IMP-04 fails before, passes after; `claude-sdk-client.ts` 395 → 340 effective lines | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None behavior-defining; fixtures match probe values named by AC-003…006 | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001/002 call order as designed; DS-003 in `readExternalRuntime` (install → sign-in → models ‖ limits) | — |
| Ownership boundary preservation and clarity | Pass | The service alone calls `readUsageLimits`, provider readers and the deadline options; parsers never set `blocked` | — |
| Off-spine concern clarity | Pass | Parsers, control query, ACP extension request, matching serve their owners | — |
| Existing capability/subsystem reuse check | Pass | Reuses `readVersion`, `AgentRuntimeSignInReader`, `ModelCatalogService`, `listProviderCredentialSettings`, secret resolver, ACP short process (extended via `withShortAcpProcess`) | — |
| Reusable owned structures check | Pass | `usage-limits-reading.ts` helpers shared by four parsers; `provider-usage-reader.ts` helpers shared by four readers | — |
| Shared-structure/data-model tightness check | Pass | One blocked form per subject; `signIn` and `limitsNote` single-meaning; report lean as REQ-004 | — |
| Repeated coordination ownership check | Pass | Step order/caps/backstop in one `runStep`; Codex lease handling in one `withCodexClient` | — |
| Empty indirection check | Pass | Tool/MCP/GraphQL are the designed thin facades; contract file holds shared name/description/schema | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | One concern per file | — |
| Ownership-driven dependency check | Pass | `provider-usage` takes an `AbortSignal`, never imports runtime-management; tools → service only | — |
| Authoritative Boundary Rule check | Pass | Tool, MCP and GraphQL depend only on `AvailableAgentRuntimesService` (via `findAvailableAgentRuntimesService`) | — |
| File placement check | Pass | Matches the design's file mapping (+ `usage-limit-model-matching.ts`, `AvailableModelList.vue`, both justified) | — |
| Flat-vs-over-split layout judgment | Pass | `usage-limits/`, `provider-usage/`, `agent-runtimes/`, `model-routing/` | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `readUsageLimits(exe, cwd, {deadline})`; `ProviderUsageReader.read(provider, models, {signal})`; `runAcpExtensionRequest(profile, method, {deadline})`; `runAcpDiscoveryHandshake` signature change has one caller, updated | — |
| Naming quality and one vocabulary | Pass | "agent runtime" throughout (GLOSSARY added); `deadline` = step end, `timeoutMs` = one command | — |
| No unjustified duplication of code | Pass | — | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules | Pass | Removed: `tryGetSupportedModelsFromQueryControl`, `closeQueryControl`, `MODEL_DISCOVERY_PROBE_PROMPT`, unused imports; `modelList` (C-01) removed in `683b036be9`; grep over web sources finds no reference | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Tests named by AC; deadline tests kill real child processes; AC-009 output scan | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Recorded fixtures shared by parser and service tests | — |
| No stale, duplicated, or compatibility-only tests are retained | Pass | Claude client test updated to the idle input | — |
| API/E2E readiness for the next workflow stage | Pass | Handoff lists scripted-CLI and live hints; not blocked by CR-001 | — |

## Source File Size And Structure Audit

Effective non-empty lines; all changed implementation files measured. Files not listed are ≤ 113 lines after the change.

| Source File | Before | After | `>500` Check | `>220` Delta Check | SoC / Ownership | Placement | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/pages/settings.vue` | 433 | 450 | Pass | Pass (+17) | Pass | Pass | — | — |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts` | 443 | 444 | Pass | Pass | Pass | Pass | — | — |
| `llm-management/services/model-catalog-service.ts` | 334 | 343 | Pass | Pass | Pass | Pass | — | — |
| `runtime-management/claude/client/claude-sdk-client.ts` | 395 | 340 | Pass | Pass (shrank) | Pass | Pass | — | — |
| `runtime-management/agent-runtimes/available-agent-runtimes-service.ts` | 0 | 219 | Pass | +240 raw lines; one composer concern (C-09) | Pass | Pass | — | — |
| `startup/agent-tool-loader.ts` | 152 | 159 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Optional `deadline` is a caller choice, not a legacy path |
| No legacy old-behavior retention in changed scope | Pass | Old Claude discovery query removed |
| Dead code removed in the touched files and modules | Pass | CR-001 resolved in `683b036be9` |
| Approved persisted-data transition decision is followed | Pass | `Not Affected`; nothing stored |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | Codex `rateLimits` fallback when `rateLimitsByLimitId` is absent reads one current answer shape (both fields are in the same answer), not an old version |
| Approved transition mechanics match the reviewed design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `availableAgentRuntimesPresentation.ts` `modelList` (CR-001) | UnusedHelper | Removed in `683b036be9`; `UnknownText` and `AvailableModel` stay imported, still used by `unknownReason` and `blockedCount` | — | None remaining |

## Docs-Impact Verdict

- Docs impact: `Yes` (done in this change)
- Why: new tool, query, page and vocabulary.
- Files: `GLOSSARY.md` (§ Agent Runtimes), `autobyteus-server-ts/docs/modules/{agent_runtimes,agent_tools,llm_management}.md`, `autobyteus-web/docs/settings.md`. Content matches the code read.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 (Claude CLI starts a model turn) | Confirmed | Removed: idle input in `withClaudeControlQuery`; `prompt` is an async iterable; IMP-04 |
| MP-002 (step with several commands outlives its cap) | Confirmed | `commandTimeout` in `listAntigravityModels`, `assertGrokBuildCliSupported`, `withShortAcpProcess`; `raceDeadline` + `finally release` in Codex; tests kill the hanging second `agy` and release the Codex lease |

New or reclassified premises: None.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94
- Score calculation note: simple average of the ten categories; the decision follows the findings.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001/002/003 readable in call order; one `runStep` owns caps and backstop | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Service sole owner of order, rules, mapping and `blocked`; facades thin; no boundary bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Explicit subject-owned signatures; one GraphQL JSON value mirrors the tool | `readUsageLimits` options required while siblings are optional (deliberate: always called with a deadline) | — |
| 4 | Separation of Concerns and File Placement | 9.3 | One concern per file; placement per design | — | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.2 | Tight report; `modelFamilies` added for a real need; parser helpers shared | Coverage specificity judged among exhausted limits only (C-02, rejected, no score impact beyond readability of intent) | Optional: resolve coverage over all limits, then filter exhausted |
| 6 | Naming Quality and Local Readability | 9.3 | One vocabulary; clear comments tied to REQ/DEC IDs | Dense one-line ternaries in places | — |
| 7 | API/E2E Readiness | 9.3 | Coverage hints concrete; fake-CLI gaps named | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.2 (round 2); **revised round 3: below 9.0** | AC-002…012 hold live | Round 3: F-1 time-out reason (CR-002), F-2 local providers missing (CR-003), F-3 concurrent Codex unknown (CR-004); the round-2 score did not see them | CR-002…CR-004 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Old discovery query and prompt constant removed cleanly | — | — |
| 10 | Cleanup Completeness | 9.4 | Old Claude paths and imports removed; `modelList` removed (CR-001 resolved) | — | — |

## Findings

CR-001 resolved (CRR-002). Open after round 3:

### CR-002 — Time-out reason misclassified (F-1) — `Local Fix`, implementation

- Basis: AC-008, design DS-003 and § Examples (Failure row); C-11. Evidence: API-03b 9/400, API-03 run 1; code read for Codex models (`runStep`) and Claude `listModels`.
- Required: see § API/E2E Failure-Origin Review, F-1.

### CR-003 — Local providers with models are not listed (F-2) — `Design Impact`, Solution Designer

- Basis: REQ-002, AC-001; C-10. Evidence: API-08b.
- Required: a design decision on reading discovered AutoByteus provider catalogs within the read, see F-2.

### CR-004 — Concurrent reads lose Codex data through lease churn (F-3) — `Design Impact`, Solution Designer

- Basis: design RSK-002 contract; C-05 (reclassified). Evidence: API-05, API-05b.
- Required: a design decision on who owns the Codex lease within and across reads, see F-3.

## Follow-ups

- Follow-ups this review added: None (FU-002, added by API/E2E, is confirmed out of scope)

## Classification

- CR-002 (F-1): `Local Fix`, implementation-owned.
- CR-003 (F-2), CR-004 (F-3): `Design Impact`, Solution Designer.

## Recommended Recipient

- Solution Designer, `/software_engineering_team/solution_designer` (rule: Design Impact needing a design revision). Because the revision will send implementation a new round anyway, CR-002 goes in the same package for the implementation engineer to fix in that round, rather than in a separate round in parallel. After implementation: source review here, then API/E2E reruns API-03/03b, API-05/05b, API-08b.

## Residual Risks

- C-02 (non-blocking; the implementation engineer declined it in IR-002 as outside CR-001, which is acceptable): if a future agy `/usage` lists overlapping families across groups, "most specific wins" is judged among exhausted limits only, which could show a usable model as blocked. A one-line change (resolve coverage over all limits, then use it for the exhausted ones) would match the design rule exactly; not required.
- AutoByteus listing cap of 4 s on a cold server (C-03): worth one API/E2E observation on first read after start.
- RSK-001 (external formats: Claude's undeclared `rate_limits.limits[]`, agy JSON, Grok billing), RSK-002/C-05 (concurrent reads and the shared Codex home lease), RSK-003 (Grok used %), RSK-004 (late Codex answers) as recorded upstream.
- Provider readers are verified against recorded shapes only; live checks with the test vault belong to API/E2E.

## Latest Authoritative Result

- Review Decision: `Fail` (API/E2E failure-origin review, round 3; the round-2 implementation-review pass is superseded)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (C-05 reclassified to Supported Explicit Edge Scenario under RSK-002)
- Material-Premise Gate: `Pass`
- Score Summary: round-2 scorecard kept; category 8 revised below 9.0 for CR-002…CR-004 (not re-scored in a failure-origin round)
- Failure Origin: F-1 implementation defect (review gap only for the Claude part); F-2 design impact (earlier review gap, architecture and code review); F-3 design impact (earlier review gap: C-05 wrongly rejected)
- Recommended Recipient: `/software_engineering_team/solution_designer`
- Notes: AC-002…AC-012 otherwise proven by API/E2E, including live, Docker and agent-run paths. FU-002 is out of scope.
