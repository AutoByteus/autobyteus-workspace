# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005`
- Package identifier: `anthropic-prompt-caching`
- Request / ticket: Project Task `project_task_e08c9081-0d1d-4e89-a1ef-dd213f53febf`
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-09
- Approval state and reference: Approved by the user in conversation on 2026-10-09: "you need to do deep investigation how to enable [caching] and how to achieve the maximum cost efficiency in our own runtime when we use the anthropic models ... after you find out then start to work on this ... we must achieve at least comparable [cache] rates like the Claude agent SDK" + "fixing of course pricing as well." The user set the goal (Claude-Agent-SDK-comparable cache hit, maximum cost efficiency), approved the pricing fix (DEC-002), and delegated the technical means and TTL (DEC-001) to the evidence of the deep investigation, then instructed work to start. SR-002 records that evidence-based resolution. 2026-10-09 (SR-003): after the explanation of the three problems and the design (caching + 1h TTL, append-only history by removing the per-turn thinking strip, interruption note as appended message, Sonnet 5 price, SDK upgrade) the user replied "please continue"; earlier the user required "If we are not using the latest anthropic SDK, we should update it" (REQ-011).
- SR-005 (2026-10-09): the user asked for a provider-boundary refactor in this ticket: "If you think the refactoring will make it better, do it. Ask the implementation engineer to stop and then do the refactoring right now. Update your design." This follows the Solution Designer's proposal to move provider-specific history rules out of MemoryManager behind a provider-owned policy, give each provider one request builder, and give the request prefix an explicit owner. Adds REQ-013 and AC-014; no user-visible behavior change.
- Exact approved requirements baseline / solution revision: SR-005 of this document (earlier: SR-003, SR-004). SR-004 (2026-10-09, after architecture review ARCH-REV-001) revises BEH-005/REQ-003/AC-004 and adds REQ-012/AC-013. Approved by the user 2026-10-09: after the SR-004 explanation and recommendation the user said "you decide the most reasonable … reason about the most reasonable architecture and reasonable approach and then work on it", explicitly delegating the choice; the Solution Designer selected the recommended option (one-time thinking removal on tool/system change and on restore; text-only replies stored as today).
- Behavior-defining supplements and their approved versions: None. Probe files are evidence only.

## Problem And Desired Outcome

- Problem: When an agent runs on the native AutoByteus runtime with an Anthropic model, every model call sends the full system prompt, tools and history without asking Anthropic to cache them. Anthropic bills all input at full price: 0 % cache hit. The user's run cost $7.31 instead of roughly $1. The Claude Agent SDK runtime on the same model gets 98.3 %.
- Affected actors or systems: users of native-runtime agents and native team members on Anthropic models; Anthropic billing; the Token Meter.
- Desired outcome: native-runtime conversations on Anthropic models reach a cache hit comparable to the Claude Agent SDK runtime (which measures 95–99 % on long Opus 5.5 sessions) at the lowest input cost: each call reads the already-processed prefix from Anthropic's prompt cache, and new turns do not rewrite earlier history. The Token Meter keeps showing the same cost as the Anthropic Console, split into uncached input, cache writes and cache reads.
- Observable definition of success: a long native-runtime Anthropic run shows a high cache hit after its first call. The Console shows prompt caching active ("tokens reused") and lower spend. The Token Meter total still matches the Console.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | Native Anthropic requests never request caching; `cache_read_input_tokens = 0` and `cache_creation_input_tokens = 0` on every call | Agent-conversation requests request caching so each call reads the prefix written by the previous calls | Request content, model policy (adaptive thinking, Opus 5.5 restrictions), tool replay and streaming behavior unchanged | Probe A; DB run `solution_designer_08a92ade…`; 14.png |
| BEH-002 | Contract | SCN-001, SCN-004 | Usage parser already reads base, cache read and cache write (5m/1h) tokens | Same, now with non-zero values | Parsing semantics (`base_excludes_cache`, gross = base + read + write) | normalizer source; probe A |
| BEH-003 | System | SCN-004 | Meter already prices standard input, cache reads and 5m/1h writes from the catalog and shows cache rows when present | Same, now visible for native Anthropic runs | Pricing pipeline and UI rows | calculator, meter panel source |
| BEH-004 | System | SCN-003 | Compaction summarizer is a one-shot call with unique content, uncached | Stays uncached (no write premium on content that is never reused) | Same | compression strategy source |
| BEH-005 | System | SCN-002 | At each new independent turn, all earlier thinking blocks are removed from history (prior design `new-models-gpt6-opus55`). Live probe: the first call of every new turn rewrites the whole previous tool cycle (S1: 9.1k of 12.6k tokens rewritten) | History sent to Anthropic is append-only across turns: the per-turn removal is gone, and earlier tool-cycle thinking is kept and replayed unchanged. Text-only replies stay stored as today, without their own thinking; S4 shows Anthropic accepts this at the same cost. Thinking blocks are removed once only when Anthropic would otherwise reject the request: at accepted compaction (existing); when the tool definitions or leading system prompt they were produced under change (e.g. media default model or tool schema reload in Settings, agent definition edit); and on the first request after a run is restored | Signed replay within a tool cycle; compaction-time strip; compaction deferral during a tool cycle | memory-manager; prior design spec; Anthropic preserved-thinking guidance; strategy probes S1–S4; prefix-change probe P1–P4 |
| BEH-007 | System | SCN-002 | After an interrupted turn a boundary note (SYSTEM role) is appended to memory; the Anthropic adapter merges every SYSTEM message into the top-level `system`, so the system prompt changes mid-session | The note reaches the model after the existing history without changing the top-level `system` | The note's content and timing | memory-manager.ts:485; anthropic-llm.ts `splitSystemMessages` |
| BEH-006 | System | — | Catalog price for Claude Sonnet 5 is $3/$15, read $0.30, writes $3.75/$6; official price is $2/$10, read $0.20, writes $2.50/$4 | Catalog matches official price (if DEC-002 approved) | All other catalog rows (verified equal to official) | pricing page; catalog source |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User running native agents/teams on Claude | Lower cost for long agent runs | High cache hit; lower Console spend | No behavior change in agent results |
| Token Meter | Truthful estimated API cost | Matches Anthropic Console | Historical records are not repriced |
| Anthropic API | Prompt caching contract | Valid requests (≤4 breakpoints, TTL ordering) | Minimum cacheable length per model |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Native-runtime agent (standalone or native team member) runs a multi-call conversation on an Anthropic model with caching | SCN-001, SCN-002 |
| UC-002 | Native one-shot Anthropic calls (compaction summarizer) stay uncached | SCN-003 |
| UC-003 | User compares Token Meter cost with the Anthropic Console for a cached run | SCN-004 |

### Out Of Scope

- Token Meter "Latest prompt" fill and live usage for Claude Agent SDK runs (separate Task `project_task_cb40258d-0311-4675-bdd4-8ff49253b576`).
- Claude Agent SDK runtime caching (already 98.3 %; no change).
- Caching for other providers (OpenAI, Gemini, DeepSeek already cache automatically; reported only).
- The AutoByteus LLM server proxy (`AutobyteusLLM`) and OpenAI-compatible routes to Claude (none configured).
- Changing compaction behavior (trigger, summarizer, keep-tail strip). Reusing the parent's cached prefix for the compaction summarizer is a recommended follow-up (see investigation notes), not part of this task.
- Pre-warming, keep-alive requests, cache diagnostics beta, mid-conversation system messages.
- Repricing historical usage records.

### Non-Goals

- A specific cache-hit target for runs whose calls are further apart than the cache lifetime.
- Caching for prefixes below Anthropic's minimum cacheable length (silently not cached by Anthropic).

### Preserved Behavior Boundary

BEH-002, BEH-003, BEH-004, BEH-005 preserved columns; AC-009. Cross-cutting invariant: the content the model receives (tools, system text, messages, thinking/effort settings) is unchanged apart from cache markers and the REQ-012 one-time thinking removal on tool/system change or restore; late system notes are moved after the history (REQ-010).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Native-runtime agent-conversation requests to Anthropic request prompt caching so that the stable prefix (tools + system prompt) and the growing history written by earlier calls are read from cache on later calls. | BEH-001 | Must | Root cause | Task; probes A/B |
| REQ-002 | Within one run, the request prefix stays byte-identical between consecutive calls: tools and the top-level system prompt do not change, and each call's history is the previous call's history plus appended content (append-only), across tool continuations **and** new independent turns. Only compaction, a change of tool definitions or leading system prompt (REQ-012), and the first request after a restore may change it. | BEH-001, BEH-005, BEH-007 | Must | Caching is an exact prefix match | Official docs |
| REQ-003 | Earlier tool-cycle thinking blocks stay in the history and are replayed to Anthropic unchanged across new independent turns. The per-turn removal is gone. Text-only replies keep their current storage (their own thinking is not replayed). The first call of a new turn writes to cache only the newly appended content. | BEH-005 | Must | Parity with Claude Agent SDK; Anthropic guidance: steady-state stripping "restarts the prompt cache each time" and loses reasoning | Strategy probes S1, S3, S4 |
| REQ-012 | A native Anthropic request is never rejected because kept thinking was produced under a different request prefix. When the tool definitions or the leading system prompt differ from those of the previous request in the same running agent, or on the first request after a run is restored, all thinking blocks are removed from the history once before that request. Otherwise none are removed. | BEH-005 | Must | Anthropic returns 400 "The `tools` list differs …" for kept thinking after a tool change (probe P2); one-time removal is accepted (P3) | Architecture review ARCH-REV-001 (ARCH-001, ARCH-003); prefix-change probe |
| REQ-004 | One-shot native Anthropic calls with unique content (compaction summarizer) do not request caching. | BEH-004 | Must | No write premium without reuse | Official guidance |
| REQ-005 | Cache entries use the 1-hour TTL (DEC-001). Requests stay within Anthropic's limits (at most 4 breakpoints; longer-TTL entries before shorter ones). | BEH-001 | Must | Same as the Claude Agent SDK (all writes 1h); simulated on real sessions 1h costs $88.6 vs $123.5 for 5m | DEC-001; transcript analysis |
| REQ-006 | Usage parsing and the Token Meter record and price cache reads and cache writes (5m and 1h separately) with the catalog prices, so the meter's estimated cost for a native Anthropic run matches the Anthropic Console's charge for the same calls. | BEH-002, BEH-003 | Must | Meter must keep matching Console | Task item 4 |
| REQ-007 | The Claude Sonnet 5 catalog price matches the official price ($2 input, $2.50 5m write, $4 1h write, $0.20 cache read, $10 output per MTok) for new usage; historical records keep their stored price. | BEH-006 | Should (DEC-002) | Meter/Console match for that model | Pricing page |
| REQ-010 | A memory SYSTEM-role note added after the conversation started (interruption boundary note) reaches the model as an appended message after the existing history, not as a change to the top-level system prompt. | BEH-007 | Must | A system-prompt change restarts the whole cache and invalidates later thinking blocks (400 on enforced accounts) | Anthropic preserved-thinking guidance |
| REQ-011 | The `@anthropic-ai/sdk` dependency is upgraded from 0.128.0 to the latest release (0.132.1 on 2026-10-09) in every workspace package that pins it (`autobyteus-ts`, `autobyteus-server-ts`), with the lockfile updated. | — | Must | User instruction | User 2026-10-09 |
| REQ-013 | Provider-specific meaning of stored provider-native assistant output (shape validation, matching against tool calls, which parts are tied to the request prefix and must be dropped) is owned by that provider's code in the LLM layer behind a provider-neutral interface. Memory and agent code handle such output only as a provider-tagged opaque value and contain no provider-specific history logic. Each provider request is rendered once, by the provider adapter. The agent loop does not pre-render requests. | BEH-005 | Must | Clean ownership and separation of concerns (DESIGN.md; design principles); prerequisite for other providers with signed/encrypted reasoning | User 2026-10-09 (SR-005) |
| REQ-008 | All other request behavior is unchanged: Opus 5.5 request policy, adaptive thinking, signed thinking replay within a tool cycle, compaction-time thinking strip and compaction deferral, streaming, abort/retry, and every other provider. | BEH-001..005 | Must | No regressions | — |
| REQ-009 | The delivery reports the measured cache hit per Anthropic-serving path/runtime (native before/after, Claude Agent SDK, compaction) and, as available, other providers. | — | Should | Task items 3 and 5 | Task |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-005 | BEH-001 / SCN-001 | Agent-loop request with tools, system prompt and history (sync and streaming) | Request body carries cache markers that cover tools + system and the conversation tail, with the DEC-001 TTL, ≤4 breakpoints, valid TTL order | Request without tools or without system still valid and cached where possible | Unit tests on request building |
| AC-002 | REQ-002 | BEH-001 / SCN-001 | Two consecutive agent-loop calls in one run (tool continuation) | Tools and system are byte-identical; the second request's history begins with the first request's history unchanged (cache markers ignored) | — | Unit/integration test comparing consecutive request bodies |
| AC-003 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Live native-runtime run on claude-opus-5-5 with ≥25 model calls less than the TTL apart | Every call after the first reports `cache_read_input_tokens > 0`; run-level cache hit (reads ÷ gross input) ≥ 90 %, comparable to Claude Agent SDK sessions of similar length (95–99 %) | Prefix below the model minimum is not cached (non-goal) | Live validation via test vault |
| AC-004 | REQ-003 | BEH-005 / SCN-002 | Live run: a tool cycle with thinking, a text-only final reply, then a new independent user turn | The first call of the new turn reads the whole previous history from cache and writes only the new input (no rewrite of the previous cycle); thinking blocks of the earlier tool cycle are still in the request; Anthropic's preserved-thinking check (`prefix_mismatch_behavior: "error"`) accepts every request | — | Live validation; unit tests: no removal at a new turn; consecutive requests share a byte-identical prefix |
| AC-013 | REQ-012 | BEH-005 / SCN-005, SCN-006 | (a) a tool definition changes while an agent run is active (e.g. Settings → media default model); (b) a run is restored (app restart, or definition edited then continued) | The next request carries no thinking blocks and is accepted (no 400); later requests are append-only again; with unchanged tools and system no removal happens | — | Unit tests for change / no-change / restore; live validation in `"error"` mode for (a) and (b) |
| AC-011 | REQ-010 | BEH-007 / SCN-002 | Interrupted turn, then a new turn | Top-level `system` is byte-identical to before; the boundary note appears after the history | Model without mid-conversation system-message support still receives the note in an accepted form | Unit tests |
| AC-012 | REQ-011 | — | Dependency manifests and lockfile | Both packages pin `@anthropic-ai/sdk` 0.132.1; typecheck, unit suites and the live probe pass on it | Breaking SDK typing change → fixed in the adapter, not by pinning old | Package manifests; typecheck; tests |
| AC-014 | REQ-013 | — | Source tree after the change | `autobyteus-ts/src/memory/**` and `autobyteus-ts/src/agent/**` contain no Anthropic-specific code or imports (frozen migration shapes excepted); the Anthropic native-turn types and rules live under `src/llm/api/`; no caller reaches a provider's private renderer; no request is rendered outside its provider adapter; all behavior ACs (AC-001..AC-013) still pass | — | Static check (grep) + existing and new tests |
| AC-005 | REQ-004 | BEH-004 / SCN-003 | Compaction summarizer call on an Anthropic model | Request contains no cache markers | — | Unit test |
| AC-006 | REQ-006 | BEH-002, BEH-003 / SCN-004 | Usage with base, cache read, 5m and 1h writes on claude-opus-5-5 | Meter components: uncached × $4, read × $0.20, 5m write × $5, 1h write × $8 per MTok; total = sum + output; cache-hit % and rows displayed | Unknown price → existing "price missing" behavior | Unit tests (normalizer, calculator); UI shows rows |
| AC-007 | REQ-006 | SCN-004 | User runs a native Anthropic team/agent after the change | Anthropic Console shows prompt caching active / tokens reused; spend per comparable run drops; Token Meter total matches Console spend for the period (rounding only) | — | User verification in desktop app |
| AC-008 | REQ-007 | BEH-006 | New usage on claude-sonnet-5 | Priced at $2 / $2.50 / $4 / $0.20 / $10 per MTok; old records unchanged | — | Unit test on catalog row (if DEC-002 approved) |
| AC-009 | REQ-008 | BEH-005 | Existing Anthropic, memory, compaction and provider test suites | All pass unchanged except assertions that now expect cache markers | — | Existing suites |
| AC-010 | REQ-009 | — | Delivery | Report lists cache hit per path/runtime with evidence | — | Delivery artifact |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Complete a task with a native agent on Claude | Desktop app: run an agent or team on the AutoByteus runtime with an Anthropic model | Model selected; API key configured | Agent makes many model calls with tool use inside one turn | Calls after the first read the prefix from cache | Calls more than one TTL apart write again | Supported Normal Scenario | 11–15.png | REQ-001/002/005, AC-001/002/003 |
| SCN-002 | User | User / teammates | Long-lived native team member handling several independent turns | Messages from user or teammates start new turns | Member has history with completed tool cycles | New turn appended to unchanged history → model calls | New turn reads the whole previous history from cache | Idle gap longer than 1 hour → one rewrite; interruption → boundary note appended | Supported Normal Scenario | 11.png team run; prior design spec | REQ-003, REQ-010, AC-004, AC-011 |
| SCN-005 | User | User | Change a media default model or reload a tool schema while agents run | Settings → Media Default Models; Tools UI reload | Native Anthropic agent with kept thinking | Setting changes tool definitions → next model call of the running agent | Request accepted; earlier thinking dropped once | — | Supported Normal Scenario | Architecture review P-001 (`reloadMediaToolSchemas`, `reloadToolSchema`) | REQ-012, AC-013 |
| SCN-006 | User / Operational | User / app | Continue a run after restart or after editing the agent's tools | App restart restore; edit definition then continue | Stored history with thinking | Restore → first model call | Request accepted; earlier thinking dropped once | — | Supported Normal Scenario | Architecture review P-002 (`restoreBackend` → `buildAgentConfig`) | REQ-012, AC-013 |
| SCN-003 | System | Native memory | Compact a long working context | Automatic compaction threshold reached | Native agent with compaction enabled | One summarizer call | No cache markers, no write premium | — | Supported Normal Scenario | compaction source | REQ-004, AC-005 |
| SCN-004 | User | User | Check cost | Token Meter panel and Anthropic Console | Cached run completed | Compare | Meter shows uncached / cache write / cache read rows; total matches Console | — | Supported Normal Scenario | 13–15.png | REQ-006, AC-006/007 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (existing meter rows already display cache components).
- Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, AC-003 | Performance (cost) | Run-level cache hit ≥ 90 % | Native Anthropic run, ≥25 calls within TTL | Live validation |
| QR-002 | REQ-005 | Compatibility | Zero 400 errors caused by cache markers | All Anthropic catalog models | Unit + live |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (existing usage fields reused).
- Data or state that must be preserved: historical usage records and their stored prices.
- Loss, reset, rebuild, or regeneration that is acceptable: none.
- Unknowns requiring downstream investigation: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Anthropic prompt caching | Prefix match; ≤4 breakpoints; 5m/1h TTL; min cacheable length; 20-block lookback | platform.claude.com prompt-caching docs (2026-10-09) | Lookback after long tool cycles (REQ-003) |
| Anthropic pricing | Writes 1.25× / 2×; reads 0.05× on Opus 5.5 | platform.claude.com pricing (2026-10-09) | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/anthropic-cache-probe.test.ts` + `probes/anthropic-cache-probe-result.json` | Live root-cause and feasibility evidence | REQ-001, AC-003 | Complete | Evidence only |
| `probes/strategy-probe.mjs` + `probes/strategy-probe-result.json` | Live comparison of strip vs append-only strategies under enforced preserved-thinking check | REQ-003, REQ-005, AC-004 | Complete | Evidence only |
| `probes/transcript-analysis/*.py` | Claude Agent SDK transcript TTL/gap/cost simulation | REQ-005 | Complete | Evidence only |
| `probes/strategy-probe-s4-result.json` | S4: no per-turn strip, text-only replies stored as today | REQ-003, AC-004 | Complete | Evidence only |
| `probes/prefix-change-probe.mjs` + `probes/prefix-change-probe-result.json` | System string vs block array; tool change with kept thinking (400); one-time strip | REQ-012, AC-013 | Complete | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Native Anthropic calls go only to the first-party Anthropic API | Automatic caching is unavailable only on legacy Bedrock | Code search: no Bedrock/Vertex client | Confirmed |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Cache lifetime (TTL) for agent conversations — **Resolved 2026-10-09: 1 hour** (user delegated to evidence; Claude Agent SDK writes all entries with 1h; real-session simulation 1h $88.6 vs 5m $123.5 vs uncached $1,073.7) | Team members often wait more than 5 minutes between turns (for the user or teammates). Long Opus 5.5 generations and long tool runs can also exceed 5 minutes. | **A (recommended): 1 hour.** Writes cost 2× instead of 1.25×, but Anthropic only bills writes for the new part of each call. Over a whole run the extra cost is about 0.75 × the final history once. A single 5-minute expiry costs about 1.2 × the whole history again. One idle gap per run already makes 1 hour cheaper. **B: 5 minutes.** Cheapest only when calls are never more than 5 minutes apart. **C: configurable per model, default 1 hour.** | User | Resolved |
| DEC-002 | Include the Claude Sonnet 5 catalog price correction ($3/$15 → $2/$10 and cache rows) in this task? — **Resolved 2026-10-09: yes** (user: "fixing of course pricing as well") | Without it the meter overstates Sonnet 5 cost by 50 % and cannot match the Console | Recommended: include (one catalog row + test) | User | Resolved |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-003 | SCN-001 | Probes A/B |
| REQ-002 | UC-001 | BEH-001, BEH-005 | AC-002, AC-003 | SCN-001 | — |
| REQ-003 | UC-001 | BEH-005 | AC-004 | SCN-002 | Strategy probes S1–S4 |
| REQ-010 | UC-001 | BEH-007 | AC-011 | SCN-002 | — |
| REQ-011 | UC-001 | — | AC-012 | — | User instruction |
| REQ-012 | UC-001 | BEH-005 | AC-013 | SCN-005, SCN-006 | Prefix-change probe |
| REQ-013 | UC-001 | BEH-005 | AC-014 | SCN-001, SCN-002 | User instruction SR-005 |
| REQ-004 | UC-002 | BEH-004 | AC-005 | SCN-003 | — |
| REQ-005 | UC-001 | BEH-001 | AC-001 | SCN-001 | DEC-001 |
| REQ-006 | UC-003 | BEH-002, BEH-003 | AC-006, AC-007 | SCN-004 | — |
| REQ-007 | UC-003 | BEH-006 | AC-008 | SCN-004 | DEC-002 |
| REQ-008 | UC-001, UC-002 | BEH-001..005 | AC-009 | SCN-001..003 | — |
| REQ-009 | — | — | AC-010 | — | DB aggregate |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..006.
- Product and system constraints: no change to model-visible content except the documented one-time thinking removals (REQ-012); Anthropic ≤4 breakpoints and TTL order; compaction behavior unchanged.
- Decisions deferred to architecture design: owner of the request-prefix change detection; how the agent loop signals a conversation request; test seams.
- Technical facts verified: tool-schema stability except operator reloads (UNK-002); lookback/strip effect (UNK-001, probes); system string vs block array is binding-equivalent (P1); tool change with kept thinking → 400 (P2).
- Known risks: an unidentified prefix edit with kept thinking → 400 on enforced accounts (RSK-003); image bytes re-read from disk per request (P-004, no supported workflow changes them).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (SR-003; SR-004 by explicit user delegation; SR-005 by explicit user instruction, 2026-10-09)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-005)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
