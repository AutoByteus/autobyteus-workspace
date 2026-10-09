# Investigation Notes

## Investigation Meta

- Package identifier: `anthropic-prompt-caching`
- Request / ticket: Project Task `project_task_e08c9081-0d1d-4e89-a1ef-dd213f53febf` (from `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching` / `codex/anthropic-prompt-caching`
- Resolved base remote / branch / revision: `origin` / `personal` / `927796780562482b900926fa7ab0d50109820e01` (fetched 2026-10-09)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: worktree created from refreshed `origin/personal`; `pnpm install --frozen-lockfile --prefer-offline --ignore-scripts` succeeded in the worktree.
- Bootstrap blocker: None
- Current solution revision ID: `SR-004`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-09); templates for requirements, investigation notes, solution revision record (2026-10-09); repository `AGENTS.md`; `TESTING.md` sections on test layers and real-provider credentials (2026-10-09). Claude API skill `shared/prompt-caching.md` (2026-10-09).
- Investigation status: Requirements and architecture investigation complete through SR-004 (architecture review ARCH-REV-001 findings resolved).

## Initial Request And Clarifications

- Original request: Native AutoByteus runtime with Anthropic models (claude-opus-5-5) shows cache hit 0.0 %. Anthropic Console confirms "Prompt caching: Not enabled", spend $7.31 equal to the Token Meter total. Confirm root cause, implement Anthropic prompt caching per current guidance, check other Anthropic call paths and runtimes, keep the Token Meter matching the Console (cache-write premium, cache-read discount), optionally report other providers' cache hit.
- Clarifications received:
  - 2026-10-09 (user, mid-turn): an Anthropic API key exists in `/Users/normy/.autobyteus/server-data/.env`; experiments are allowed; a test vault may be set up for testing.
  - 2026-10-09 (`/project_task_manager`): Part 2 (Token Meter "Latest prompt" fill and delegated-member usage) was briefly added, then **withdrawn**: it is a separate Claude Agent SDK problem tracked in `project_task_cb40258d-0311-4675-bdd4-8ff49253b576`. Scope is native-runtime prompt caching only. 17.png is kept only as evidence that Claude Agent SDK already caches.
- User-supplied facts and constraints: screenshots 11/13/14/15 (Token Meter and Anthropic Console).
- Initial ambiguity: cache TTL choice; whether one-shot calls should cache; whether the stale Claude Sonnet 5 price row is in scope.

## Product And Domain Understanding

- Product area: `autobyteus-ts` native LLM layer (Anthropic Messages API adapter) used by the native AutoByteus agent runtime (standalone agents and native team members); server Token Meter pricing.
- Affected actors or systems: users running native-runtime agents/teams on Anthropic models; Anthropic API billing; Token Meter.
- Existing purpose: long agentic tool loops with a stable system prompt and tool list and a growing history.
- Relevant terminology: breakpoint (`cache_control` marker), automatic caching (top-level `cache_control`), 5m/1h TTL, cache write (creation), cache read (hit), 20-block lookback, independent turn vs tool continuation, signed thinking reset.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-09 | User | 11.png, 13.png, 14.png, 15.png | Symptom | Native run, Opus 5.5, cache hit 0.0 %, 1,727,704 uncached tok × $4 = $6.91 + output $0.39 = $7.31; Console spend $7.31, "Prompt caching: Not enabled" | — |
| 2026-10-09 | Code | `grep cache_control/cacheControl/promptCach` over `autobyteus-ts/src`, `autobyteus-server-ts/src` | Lead | No matches: caching never requested | — |
| 2026-10-09 | Code | `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Request building | `system` sent as a plain joined string; `tools` from kwargs; no `cache_control` anywhere; both sync and stream paths | Design target |
| 2026-10-09 | Code | `autobyteus-ts/src/llm/api/anthropic-token-usage-normalizer.ts` | Usage parsing | Parses `cache_read_input_tokens`, `cache_creation_input_tokens`, `cache_creation.ephemeral_5m/1h_input_tokens`; `base_excludes_cache` semantics; cache_state | Preserve; test |
| 2026-10-09 | Code | `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts` | Pricing | Opus 5.5 `pricing(4, 20, read 0.2, 5m 5, 1h 8)` matches official. Claude Sonnet 5 row `pricing(3, 15, read 0.3, 5m 3.75, 1h 6)` does **not** match official $2/$10, read $0.20, 5m $2.50, 1h $4 | DEC-002 |
| 2026-10-09 | Code | `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts`, `token-usage-component-basis.ts` | Meter pricing | Already prices standard input, cache read, generic/5m/1h cache writes separately; gross = base + read + creation | Preserve; test |
| 2026-10-09 | Code | `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Meter UI | Already renders cache-hit, cache-write (generic/5m/1h) rows when tokens > 0 | Preserve |
| 2026-10-09 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts`, `agent/llm-request-assembler.ts`, `agent/loop/llm-phase-tools.ts`, `tools/usage/providers/tool-schema-provider.ts` | Prefix stability | System prompt from `processedSystemPrompt` (set once at bootstrap); tools from `Object.keys(toolInstances)` in insertion order, formatted per provider; working context grows append-only within a tool cycle | Verify byte-stability in design |
| 2026-10-09 | Code | `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts` | Volatile content | `Date.now()` is used only for capture metadata, not in the prompt text; prompt = base + skills catalog | — |
| 2026-10-09 | Code | `memory-manager.ts` `resetAnthropicSignedHistory` + `provider-native-assistant-turn.ts`; `tickets/done/new-models-gpt6-opus55/design-spec.md` | Prefix edits | Approved design: at each new independent turn all `thinking`/`redacted_thinking` blocks are removed from earlier native assistant turns (only the latest tool cycle still has them). This rewrites bytes from the first such assistant message onward | Breakpoint placement must tolerate; preserve behavior |
| 2026-10-09 | Code | `memory-manager.ts:485` interruption boundary note | Prefix edits | After an interrupted turn a SYSTEM-role boundary note is appended; Anthropic adapter joins all SYSTEM messages into top-level `system` → one-time system/prefix change | Accept as documented one-time invalidation |
| 2026-10-09 | Code | `memory/compaction/direct-llm-compression-strategy.ts` | Other Anthropic paths | Compaction summarizer: one-shot `sendMessages([SYSTEM summary prompt, USER unique history])`; no reusable prefix | Do not request caching on unique content |
| 2026-10-09 | Code | `autobyteus-ts/src/llm/api/autobyteus-llm.ts` | Other routes | Proxy to the AutoByteus LLM server (separate system); not an Anthropic API call from this codebase | Out of scope |
| 2026-10-09 | Data | `/Users/normy/.autobyteus/server-data/llm/custom-llm-providers.json` grep anthropic/claude | OpenAI-compatible routes serving Claude | None configured | Out of scope |
| 2026-10-09 | Data | `sqlite3 -readonly production.db` on `token_usage_run_records` (queries in Runtime section) | Recorded evidence | Native Opus 5.5 run: cache read 0, creation 0, `cache_state=zero_reported` (Anthropic returned the fields as 0) | — |
| 2026-10-09 | Runtime | Live probe `probes/anthropic-cache-probe.test.ts` → `probes/anthropic-cache-probe-result.json` | Root cause + feasibility | See Runtime section | — |
| 2026-10-09 | Web | https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md | Official guidance | Max 4 breakpoints (automatic uses one); 5m default / 1h TTL, 1h entries must precede 5m; min cacheable 512 tok for Opus 5.5/Opus 5/Fable 5/5.1/Sonnet 5.5, 1024 for Opus 4.8/Sonnet 5/Sonnet 4.6, 2048 Opus 4.7; 20-block lookback; thinking blocks cannot carry `cache_control` but are cached as part of prefix; on Opus 4.5+/Sonnet 4.6+ thinking blocks are preserved by default; changing thinking config/effort invalidates messages cache; `input_tokens` = uncached tail only | Design input |
| 2026-10-09 | Web | https://platform.claude.com/docs/en/about-claude/pricing.md | Pricing | Writes 1.25× (5m) / 2× (1h); reads 0.1× default, 0.05× Opus 5.5 and Sonnet 5.5, 0.025× Fable 5.1/Mythos 5.1. Opus 5.5: $4 / $5 / $8 / $0.20 / $20. Sonnet 5: $2 / $2.50 / $4 / $0.20 / $10 (introductory price made standard; the planned $3/$15 increase will not occur) | DEC-002 |
| 2026-10-09 | Doc | Claude API skill `shared/prompt-caching.md` | Placement patterns | Robust agent-loop pattern: explicit breakpoint on last system block (tools+system) + top-level automatic caching for the growing tail; fork/one-shot calls with unique content should not cache | Design input |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | User runs a native-runtime agent or native team member on an Anthropic model | Each LLM call sends tools + system + full history to Anthropic Messages API without `cache_control` | Every request pays full input price; `cache_read_input_tokens = 0`, `cache_creation_input_tokens = 0` | Probe A; DB run `solution_designer_08a92ade…`; Console 14.png | High |
| BEH-002 | Contract | Anthropic usage response | Adapter parses base, cache-read, cache-write (5m/1h) tokens into the usage observation | Fields preserved and stored; `cache_state=zero_reported` today | normalizer source; probe A observation | High |
| BEH-003 | System | Server Token Meter | Prices standard input, cache reads and 5m/1h writes from the model catalog; shows cache rows when tokens > 0 | Meter total equals Console for the uncached run ($7.31) | 13/14/15.png; calculator source | High |
| BEH-004 | System | Automatic compaction of a native agent's memory | One-shot summarizer call with unique content | No caching; no reusable prefix | compression strategy source | High |
| BEH-005 | System | Independent turn after an Anthropic tool cycle | Memory strips all earlier thinking blocks before the request (approved prior design) | Text/tool_use/tool_result retained; signed blocks replayed unchanged only within the active tool cycle | memory-manager; prior design spec | High |
| BEH-006 | System | Claude Agent SDK runtime on Anthropic | Claude Code harness requests caching itself | 98.3 % cache hit on Opus 5.5 across 295 runs since 2026-08-01 | DB query; 17.png | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Builds Messages requests (sync + stream) | Owner of caching request shape | Where to decide breakpoints; how the caller signals "growing conversation" vs one-shot |
| `autobyteus-ts/src/llm/base.ts` `LLMInvocationOptions` | Per-invocation options (`signal`, `turnId`, `retryMode`) | — | Candidate channel for a provider-neutral caching intent |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Agent loop request: tools from `ToolSchemaProvider`, system from `processedSystemPrompt`, `logicalConversationId` kwarg | Agent loop is the only caller with a growing conversation | — |
| `autobyteus-ts/src/llm/api/provider-request-kwargs.ts` | Filters internal kwargs from provider requests | Caching intent must not leak as an unknown provider param | — |
| `autobyteus-ts/src/memory/memory-manager.ts` | Signed-thinking reset; boundary system note | Known prefix edits | Superseded: per-turn reset replaced by the REQ-012 guard; late notes rendered in place (design-spec SR-004) |
| `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts` | Catalog prices incl. cache read/5m/1h | Opus 5.5 correct; Sonnet 5 stale | DEC-002 |
| `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Cost per component | Already correct structure | Tests only |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Anthropic Messages request body (`system`, `tools`, `messages`, top-level fields) produced by `AnthropicLLM`.
- Model catalog price rows (Anthropic provider module).
- Evidence paths: see Source Log.

### Structural Surfaces

- `BaseLLM`/`LLMInvocationOptions` invocation contract (shared by all providers).
- Anthropic adapter request policy; agent loop invocation.
- Existing structural surfaces that can support the behavior: Anthropic adapter alone can add breakpoints; usage/pricing/meter already support cache components end to end.

### Potential Structural Impacts To Investigate

- API or external-contract change: Anthropic request shape only (additive `cache_control`).
- Persistence schema or invariant change: none expected (usage fields exist).
- Security or privacy boundary change: none (caches are workspace-isolated on Anthropic side).
- Concurrency or lifecycle change: none.
- Deployment, migration, ownership-boundary change: possibly a small provider-neutral invocation option; to decide in design.
- Confirmed absent/present/unknown: persistence change absent; UI change absent (rows exist).

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| `sqlite3 -readonly …/db/production.db` run record `solution_designer_08a92ade04734555bd597d1fa89dc54e` | The user's native Opus 5.5 team-member run | 27 model calls, 1,834,393 input tok, cache read 0, cache write 0 (5m 0, 1h 0), `cache_state=zero_reported`, est. $7.34 input | Root cause confirmed from recorded usage: Anthropic returned zero cache fields | DB (read-only) |
| Same DB, aggregate by runtime/provider/model since 2026-08-01 | Cache hit per runtime | Claude Agent SDK + Opus 5.5: 98.3 % (295 runs); native AutoByteus + Opus 5.5: 0.0 %; native Claude Sonnet 5 (2026-07-07): 0.0 %; Codex App Server GPT-6/5.x: 93–97 %; Antigravity CLI Gemini 3.8: 99 %; native DeepSeek v4: 96.5 %; native Gemini 3.x: 66–83 %; native OpenAI gpt-5.6-luna: cache reads reported (positive); OpenAI-compatible DeepSeek: 94–97 % | Only native Anthropic lacks caching | DB (read-only) |
| Live probe A (production `AnthropicLLM.sendMessages`, Opus 5.5, ~4.87k-token system + 1 tool, two sequential requests) | Current behavior | Request 2: `input_tokens 4870`, `cache_creation_input_tokens 0`, `cache_read_input_tokens 0`, `cache_creation {5m:0, 1h:0}`; observation `cache_state=zero_reported` | Root cause confirmed live: caching not requested | `probes/anthropic-cache-probe-result.json` |
| Live probe B (SDK, same prefix, explicit breakpoint on last system block + top-level automatic caching, growing conversation, adaptive thinking) | Feasibility | Req 1: write 4,867 (5m); req 2: read 4,867, write 18, uncached 4; req 3: read 4,885, write 19, uncached 4 | Approach works on Opus 5.5; healthy-loop signature | same |
| Live probe C (tool cycle then simulated thinking strip, independent turn) | Strip interaction | C1 read 4,783 / write 95; C2 continuation read 4,878 / write 59; C3 read 4,937 / write 22. Opus 5.5 returned no thinking block for this trivial prompt, so the strip was a no-op | Strip effect on cache **not exercised**; remains an architecture-phase check (UNK-001) | same |

Probe cost: 8 short Opus 5.5 requests, well under $0.10. The key was read in-process from `/Users/normy/.autobyteus/server-data/.env` and never printed or written.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (screenshots, Console) | Native Anthropic runs cost full input price every turn | Strong | REQ-001..004 | TTL (DEC-001) |
| User | Token Meter must keep matching the Console | Strong | REQ-005 | — |
| User | Experiments may use the key in server `.env`; a test vault can be set up | Explicit permission | Validation may use live calls via the vault | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Anthropic prompt caching | platform.claude.com docs, read 2026-10-09 | Prefix match over tools→system→messages; ≤4 breakpoints; top-level automatic caching; 5m/1h; min cacheable length per model; 20-block lookback; thinking/effort changes invalidate messages cache | Web source log | Lookback misses after long tool cycles |
| Anthropic pricing | platform.claude.com pricing, read 2026-10-09 | Multipliers and per-model prices above | Web source log | — |
| `@anthropic-ai/sdk` 0.128.0 (workspace pin) | lockfile | Accepts `cache_control` on blocks and top level (probe B/C used it) | Probe | TS typing of top-level field to confirm in design |

## Persisted Data And State Facts

- Affected stored subject: none new. Existing usage columns already hold cache read/write (5m/1h) tokens and costs.
- Historical records: unchanged; no repricing of old runs.
- Remaining evidence gap: none.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. N/A.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/anthropic-cache-probe.test.ts` | Solution Designer | Disposable live probe (root cause + feasibility) | Investigation evidence | REQ-001, AC-001, AC-002 | Complete | Evidence only; not behavior-defining |
| `probes/anthropic-cache-probe-result.json` | Solution Designer | Probe output | Investigation evidence | same | Complete | Evidence only |
| `probes/strategy-probe.mjs` + `probes/strategy-probe-result.json` | Solution Designer | Strip vs append-only live comparison | Evidence | REQ-003, REQ-005, AC-004 | Complete | Evidence only |
| `probes/transcript-analysis/{usage,multi,sim}.py` | Solution Designer | Claude Agent SDK transcript TTL/gap/cost analysis | Evidence | REQ-005 | Complete | Evidence only |
| `probes/strategy-probe-s4-result.json` | Solution Designer | S4: no per-turn strip, text-only replies stored as today | Evidence | REQ-003, AC-004 | Complete | Evidence only |
| `probes/prefix-change-probe.mjs` + `probes/prefix-change-probe-result.json` | Solution Designer | Binding equivalence of system shapes; tool-change 400; one-time strip | Evidence | REQ-012, AC-013 | Complete | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Real cache effect of the independent-turn thinking strip | Could rewrite history every turn | Resolved by strategy probe: strip rewrites the latest cycle every turn; append-only removes it (REQ-003) | Resolved |
| UNK-002 | Unknown | Byte-stability of tool schemas across requests within a run (formatter determinism, tool set changes mid-run) | Any change at position 0 invalidates everything | Pre-approval check 2026-10-09: tool instances are fixed at agent creation (`agent-factory.ts` `prepareToolInstances`); `ToolDefinition` caches its description and argument schema and refreshes only on explicit `reloadCachedSchema()`, which is called by the media-settings re-registration (`register-media-tools.ts`) and the GraphQL `reloadToolSchema` operator action; `AnthropicJsonSchemaFormatter` emits `{name, description, input_schema}` deterministically. Stable within a run except those explicit operator reloads and restore. With kept thinking these are not just one cache miss; they need the REQ-012 one-time strip. Test still asserts identical tools/system across consecutive requests | Mostly resolved |
| RSK-001 | Risk | One-shot calls (compaction summarizer) paying the 1.25× write premium on unique content if caching is applied indiscriminately | Small but pure surcharge | REQ-003 | Open |
| RSK-002 | Risk | Team members idle > 5 min between turns lose the 5m cache and rewrite their history | Higher cost | Resolved: 1h TTL (DEC-001) | Resolved |
| RSK-003 | Risk | Keeping thinking blocks across turns makes any later prefix edit a 400 on enforced accounts (created ≥ 2026-08-31) | Hard failures for new users | History append-only in normal turns (REQ-002/003/010); one-time strip on tool/system change or restore (REQ-012); tests compare consecutive request bodies; validation in `"error"` mode | Mitigated by design |
| ASM-001 | Assumption | Anthropic first-party API only (no Bedrock/Vertex path exists in this adapter) | Automatic caching availability | Confirmed by code search (no Bedrock/Vertex client) | Confirmed |


## Deep Cost-Efficiency Investigation (SR-002, 2026-10-09)

Trigger: user asked for a deep investigation of how to enable caching and reach maximum cost efficiency on the native runtime, with a cache hit comparable to the Claude Agent SDK, and to fix pricing.

### What the Claude Agent SDK does (ground truth from its own transcripts)

Command: `python3 probes/transcript-analysis/usage.py|multi.py <~/.claude/projects/*/*.jsonl>` (per-call `message.usage`, deduplicated by `message.id`, main loop only).

| Session | Calls | Hit % | 5m writes | 1h writes | Gaps > 5 min | Gaps > 1 h | Rewrite spikes (write > 50 % of prior prompt) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 44aac626 | 281 | 98.9 | 0 | 1,667,279 | 5 | 1 | 3 (0.6 % of gross) |
| 8a711df8 | 253 | 96.7 | 0 | 1,583,952 | 37 | 6 | 7 (2.6 %) |
| 57edf67b | 122 | 98.9 | 0 | 413,858 | 3 | 0 | 1 (0.2 %) |
| 3efe1acd (this session) | 96 | 98.4 | 0 | 307,064 | 0 | 0 | 1 (0.2 %) |
| fff73a53 | 50 | 95.1 | 0 | 466,741 | 1 | 1 | 3 (3.0 %) |

Findings: (1) every cache write is 1-hour TTL; (2) uncached input is near zero (190 tokens over 95 calls), so the breakpoint sits on the last block; (3) the history is append-only: no rewrite spike at turn boundaries; spikes only after > 1 h gaps or compaction.

### TTL economics on real call sequences

`probes/transcript-analysis/sim.py`: replays each session's real per-call prompt sizes and timestamps at Opus 5.5 prices (read $0.20, 5m write $5, 1h write $8, input $4). A call within the TTL of the previous call reads the previous prompt and writes the delta; otherwise it writes everything.

| Total over 5 sessions | Uncached | 5-minute TTL | 1-hour TTL |
| --- | --- | --- | --- |
| Input cost | $1,073.65 | $123.51 | $88.63 |

5m was slightly cheaper only for two short continuous sessions; 1h wins overall by 28 %. Decision basis for DEC-001 = 1 hour.

### Thinking-strip vs append-only (live, enforced preserved-thinking check)

`probes/strategy-probe.mjs` → `probes/strategy-probe-result.json`. Opus 5.5, adaptive thinking (display summarized), effort high, 1h TTL, explicit breakpoint on the last system block + top-level automatic caching, beta `thinking-binding-controls-2026-08-01` with `prefix_mismatch_behavior: "error"` (opts into enforcement; any invalid history would 400). 3 independent turns, 4–5 tool calls each, ~1.8k-token tool results.

| Strategy | Calls | Hit % | 1h writes | Input cost | First call of turn 2 / turn 3 |
| --- | --- | --- | --- | --- | --- |
| S1 current behavior: strip all thinking at each new turn | 17 | 82.8 | 48,399 | $0.434 | read 3,417 / write 9,151; read 12,568 / write 9,025 |
| S2 S1 + extra breakpoint at the previous turn's user message | 17 | 84.3 | 45,915 | $0.417 | read 3,417 / write 9,090; read 12,507 / write 8,962 |
| S3 append-only, thinking kept on all replies | 17 | 90.9 | 26,490 | $0.265 | read 13,299 / write 391; read 22,580 / write 152 |

Findings: (1) the strip forces a rewrite of the latest cycle at every new turn; an extra breakpoint cannot avoid it because the bytes changed; (2) append-only is accepted by the enforced check (empty `input_transformations`, no 400) and removes the turn-boundary rewrites: 39 % lower input cost in only 3 turns; (3) Opus 5.5 text-only final replies carry thinking blocks (`['thinking','text']`). The native runtime stores text-only replies without native blocks, which is why the prior design strips everything at the next turn.

### Anthropic guidance (claude-api skill `shared/model-migration.md` § Breaking change 3, Opus 5.5 § Breaking change 3)

- Opus 5.5 thinking blocks are bound to the conversation prefix (system, tools, earlier messages). Enforced by default for accounts created on or after 2026-08-31 (relevant for other people using AutoByteus); older accounts can opt in.
- Valid: append-only histories; appended `role: "system"` messages; removing a leading run of thinking blocks; changing `cache_control` markers.
- Invalid: editing/removing earlier turns, rebuilding top-level `system` or `tools`, removing a thinking block from the middle.
- "Strip every thinking block" is a one-time recovery: "an integration that invalidates its own history on every request loses that reasoning and restarts the prompt cache each time, which can raise cost per task. Treat this as a one-time recovery, not a steady-state pattern."
- Keep-tail client compaction must strip thinking from retained turns (current native behavior; keep).

### Prefix-edit audit of the native runtime (three-step check, static)

| Edit | Where | Effect today | Required change |
| --- | --- | --- | --- |
| Text-only Anthropic replies stored without native blocks | `llm-phase.ts` keeps `providerNativeAssistantTurn` only for tool-bearing responses (`anthropic-llm.ts` emits it only when `tool_use` present) | Assumed to create a middle gap (prior design) | No change: S4 shows it is accepted once the per-turn strip is gone (SR-003) |
| Strip of all thinking at each independent turn | `llm-request-assembler.ts:51` → `memory-manager.ts resetAnthropicSignedHistory` | Rewrites latest cycle every turn; loses reasoning | Remove steady-state strip (keep compaction strip) |
| Interruption boundary note as SYSTEM message merged into top-level `system` | `memory-manager.ts:485`; `anthropic-llm.ts splitSystemMessages` | System change → full cache restart; invalid for kept thinking blocks | Render post-start SYSTEM notes as appended messages |
| Tool schema / media-model reload; restore with changed definition | `reloadMediaToolSchemas`, `reloadToolSchema`, `restoreBackend` | With kept thinking → 400 (probe P2) | One-time strip on change/restore (REQ-012, SR-004) |
| Compaction | keep-tail with strip | Cache restart (inevitable) | Keep |

### Compaction summarizer cost (recommended follow-up, not in scope)

`DirectLlmCompressionStrategy` sends `COMPACTION_SUMMARY_PROMPT` + the rendered history as one new user message (model from compaction settings, default the parent model). Nothing is reused from the parent cache: at the native 80 % trigger on a 1M window (~800k tokens) one compaction costs ≈ $3.20 input on Opus 5.5. Reusing the parent's exact cached prefix (same model, system, tools, messages + an appended summarize instruction) would read it for ≈ $0.16. Requires changing the approved compaction design and only works when the compaction model equals the parent model. Recommended as a separate follow-up Task.

### Projected effect on the user's run

Run `solution_designer_08a92ade…`: 27 calls, 1,834,393 gross input, final prompt 106,689. Append-only + 1h: writes ≈ final prompt + outputs ≈ 113k (≈ $0.90), reads ≈ 1.72M (≈ $0.34): input ≈ $1.24 instead of $7.34 (≈ 94 % hit); total ≈ $1.66 instead of $7.76.

## Architecture Investigation Findings

### SR-004 — Architecture review ARCH-REV-001 follow-up (2026-10-09)

Prefix-change probe (`probes/prefix-change-probe.mjs` → `probes/prefix-change-probe-result.json`): Opus 5.5, thinking kept, beta `thinking-binding-controls-2026-08-01`, `prefix_mismatch_behavior: "error"`. The history was minted with the system prompt as a plain string.

| Case | Result |
| --- | --- |
| P1 same text, system as `TextBlockParam[]` with `cache_control` | Accepted, `input_transformations: []`. String and block array are binding-equivalent (settles review P-003b(ii)) |
| P2 tool description changed, thinking kept | **400** `invalid_request_error`: "Invalid `signature` in `thinking` block. The block is bound to a different conversation … The `tools` list differs from the one this block was created with." |
| P3 tool description changed, all thinking stripped once | Accepted |
| P4 control, unchanged prefix | Accepted |

Reachable prefix-change triggers (from the review, verified):
- `autobyteus-server-ts/src/services/server-settings-service.ts:360` → `reloadMediaToolSchemas()` (`agent-tools/media/register-media-tools.ts:12`). Media tool descriptions embed the default model id. Also the GraphQL `reloadToolSchema` (`api/graphql/types/tool-management.ts:66`). `ToolSchemaProvider.buildSchema` re-derives `tools` from the shared registry on every request.
- `autobyteus-agent-run-backend-factory.ts:232` `restoreBackend`, which rebuilds the agent config (tools) from the current definition. A restored run gets a new in-memory `MemoryManager` (`memory-manager.ts:105`) loaded from the snapshot.
- Stored snapshots still hold the thinking of their latest tool cycle, because the old strip ran at the start of the *next* turn. The first resume after the upgrade is a restore.

Conclusion: removing the per-turn strip needs a narrow replacement. Remove all thinking once when the request prefix (tool definitions, leading system prompt) differs from the previous request of the same in-memory agent, or on the first request after start/restore when history holds thinking. Otherwise the history stays append-only.

Residual (review P-004, risk only): images are read from disk on every request. A changed image file under kept thinking would give a 400. No supported workflow rewrites an attached image in place.

Completed in SR-002..SR-004; see the SR-004 subsection above and `design-spec.md`.

## Requirement Implications

- Root cause is a missing request feature, not usage parsing or pricing: REQ-001/002.
- Usage parsing and meter pricing already support cache components; they become preserved behavior with new tests (REQ-005).
- One-shot calls must not be charged a write premium without reuse (REQ-003).
- Catalog price for Claude Sonnet 5 is stale and would make the meter disagree with the Console for that model, cached or not (DEC-002).

## Out-Of-Scope Observations (handed to the separate Token Meter Task)

Recorded because they were investigated before the scope correction; useful for `project_task_cb40258d-0311-4675-bdd4-8ff49253b576`. Not part of this package.

- Claude Agent SDK `result.usage` is documented in the installed SDK (`@anthropic-ai/claude-agent-sdk` 0.3.280 `sdk.d.ts`, `SDKResultSuccess.usage`) as "MAIN AGENT LOOP ONLY … per-turn": a sum over all model calls of the turn. `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts` computes `latest_prompt_tokens = input + cache_read + cache_creation` from it, so "Latest prompt" is a per-turn sum and can exceed 100 %. DB examples today: 735.8 %, 472.9 %, 252.2 %, 210.3 %, 146.3 %, 135.6 % on Claude SDK runs.
- Claude SDK usage is emitted only on the terminal `result` frame (`claude-session.ts` `turnResult`). A long first turn therefore shows 0 usage, unknown model/runtime until it ends (this designer copy: first report at turn end 08:13:46). Per-call usage exists mid-turn on `assistant` frames (`message.usage`, shared `message.id` across blocks, `parent_tool_use_id` for subagents).
- Antigravity CLI runs also show one cumulative report at turn end (`daily_assistant_a4fa…`).
- Native compaction default trigger ratio is 0.8 of the input budget (`memory/policies/compaction-policy.ts`, env `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO`). Claude Code compaction is Claude-owned (`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` is undocumented officially; community reports say it is unreliable on 1M windows).

## Notes For Architecture Design

Superseded by `design-spec.md` (SR-004). Earlier ideas in this section, such as an extra breakpoint before the latest tool cycle, were rejected (probe S2 ≈ S1).
