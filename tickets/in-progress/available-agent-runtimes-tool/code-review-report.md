# Code Review Report — autobyteus-303 (`list_available_agent_runtimes`, Settings → Model Routing)

## Review Round Meta

- Review Entry Point: `Implementation Review`
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
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `tickets/in-progress/available-agent-runtimes-tool/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation handoff IR-001 from `/software_engineering_team/implementation_engineer`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool`, branch `codex/available-agent-runtimes-tool`, `git diff a2faf424d6 5135bb73dc` (82 files)
- Failure-origin fields: N/A

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
| C-05 | Two concurrent reads (page + tool) racing the Codex home lease close | RSK-002 | Two individually supported actions at the same moment | One read may get `unknown` for Codex | No product goal for concurrent reads; RSK-002 accepted | Reject | — | Principle 6: not a supported concurrent workflow |
| C-06 | Claude parser reads `rate_limits.limits[]`, not declared in SDK 0.3.280 `.d.ts` (decision 3) | REQ-005, RSK-001 | SDK/CLI answer | Change → `unknown: …` | Live answer (fixture, IMP-07) carries `limits[]` | Reject | — | Accepted contract risk; parser fails closed |
| C-07 | Third `UsageLimitScope` variant `modelFamilies` beyond the design's `runtime | models` (decision 1) | DS-003 (models ‖ limits in parallel); design Ownership Map (service maps limits to models) | — | Parsers cannot know model IDs; the service resolves families once | Code read; tests `usage-limit-model-matching.test.ts` | Reject (confirmed sound) | — | Keeps the design's ownership and parallelism; no deviation in intent |
| C-08 | Family match by word order from the first word (decision 2) | AC-004 | — | "Gemini Flash" ⊂ "Gemini 3.8 Flash (High)"; "Fable" ⊂ "Fable 5.1" | IMP-07 live: Antigravity Claude/GPT models blocked, Gemini not; Claude "Weekly · Fable" maps to Fable models | Reject (confirmed sound) | — | — |
| C-09 | `available-agent-runtimes-service.ts` adds 240 lines (>220 delta) | Source size audit | — | One coherent composer, 219 effective lines | Audit below | Reject | — | Planned single-owner file well under 500 |

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
| Dead code removed in the touched files and modules | Fail | Removed: `tryGetSupportedModelsFromQueryControl`, `closeQueryControl`, `MODEL_DISCOVERY_PROBE_PROMPT`, unused imports. New dead export `modelList` (C-01) | CR-001 |
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
| Dead code removed in the touched files and modules | Fail | CR-001 |
| Approved persisted-data transition decision is followed | Pass | `Not Affected`; nothing stored |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | Codex `rateLimits` fallback when `rateLimitsByLimitId` is absent reads one current answer shape (both fields are in the same answer), not an old version |
| Approved transition mechanics match the reviewed design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/model-routing/availableAgentRuntimesPresentation.ts:12-13` `modelList` | UnusedHelper | Grep over the worktree (excluding node_modules, .nuxt, dist, tickets) finds only its definition | Principle 7: code nothing reaches, added by this change | Delete the export and its doc comment; drop `UnknownText` from the import if it becomes unused |

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

- Overall score (`/10`): 9.3
- Overall score (`/100`): 93
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
| 8 | Runtime Correctness And Behavioral Fidelity | 9.2 | AC-001…012 traced; live answer matches; failures fail closed | External contracts (RSK-001) remain live-only risks | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Old discovery query and prompt constant removed cleanly | — | — |
| 10 | Cleanup Completeness | 8.5 | Old Claude paths and imports removed | New dead export `modelList` (CR-001) | Delete it |

## Findings

### CR-001 — Dead export `modelList` in the web presentation helper

- Severity: Low; Classification: `Local Fix` (implementation)
- Where: `autobyteus-web/components/settings/model-routing/availableAgentRuntimesPresentation.ts:12-13`
- Basis: Principle 7 (No Dead Code), candidate C-01. The function is added by this change and nothing imports it (the row component checks `Array.isArray(external.models)` itself).
- Required action: delete `modelList` and its doc comment, and any import that becomes unused. No test or behavior change; rerun the web model-routing tests and `guard:web-boundary`.

## Follow-ups

- Follow-ups this review added: None

## Classification

- `Local Fix` (implementation-owned): CR-001.

## Recommended Recipient

- Implementation Engineer, `/software_engineering_team/implementation_engineer` (rule: implementation-owned Local Fix before executable coverage). After the fix: a Targeted Delta Review here, then API/E2E.

## Residual Risks

- C-02 (non-blocking): if a future agy `/usage` lists overlapping families across groups, "most specific wins" is judged among exhausted limits only, which could show a usable model as blocked. A one-line change (resolve coverage over all limits, then use it for the exhausted ones) would match the design rule exactly; not required.
- AutoByteus listing cap of 4 s on a cold server (C-03): worth one API/E2E observation on first read after start.
- RSK-001 (external formats: Claude's undeclared `rate_limits.limits[]`, agy JSON, Grok billing), RSK-002/C-05 (concurrent reads and the shared Codex home lease), RSK-003 (Grok used %), RSK-004 (late Codex answers) as recorded upstream.
- Provider readers are verified against recorded shapes only; live checks with the test vault belong to API/E2E.

## Latest Authoritative Result

- Review Decision: `Fail` (one Low `Local Fix`; everything else passes)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10 (93/100); every category ≥ 9.2 except Cleanup Completeness 8.5 (CR-001)
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/implementation_engineer`
- Notes: the implementation decisions the handoff called out (modelFamilies scope, word-order family match, `rate_limits.limits[]`, Codex lease sequencing, AutoByteus listing omission) are each confirmed sound or rejected as findings with the evidence above. Next round: Targeted Delta Review of CR-001 only.
