# Investigation Notes — Gemini Native Cache Hit

## Investigation Meta

- Package identifier: `gemini-native-cache-hit`
- Request / ticket: Project Task delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on 2026-10-09: "Raise the Gemini cache hit on the native AutoByteus runtime toward what the Antigravity (AGY) CLI runtime achieves." It was raised from the Anthropic prompt-caching Task (`project_task_e08c9081-0d1d-4e89-a1ef-dd213f53febf`).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit` on `codex/gemini-native-cache-hit`
- Resolved base remote / branch / revision: `origin/personal` @ `927796780562482b900926fa7ab0d50109820e01` (fetched 2026-10-09)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile` and `autobyteus-server-ts` build succeeded.
- Bootstrap blocker: None.
- Current solution revision ID: `SR-002`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-09); repository `AGENTS.md`, `TESTING.md` (2026-10-09).
- Investigation status: Requirements-phase investigation complete. Architecture investigation has not started; it begins after approval.

## Initial Request And Clarifications

- Original request: explain the native-vs-AGY Gemini cache-hit gap per model, using the local DB numbers (native gemini-3.8-flash 83.2%, gemini-3.1-pro-preview 66.1%; AGY gemini-3.8-flash-high 99.4%, -medium 99.9%, gemini-3.7-flash-high 76.5%, gemini-3.1-pro-high 58.3%, gemini-3.8-flash-low 8.9%). Then stabilise the request prefix and/or use explicit context caching where it pays off, and make sure the Token Meter prices cached Gemini input correctly.
- Clarifications received: the user asked for live experiments, run through an isolated test vault populated from `/Users/normy/.autobyteus/server-data/.env`.
- User-supplied facts and constraints: Out of scope are the Anthropic caching Task (`e08c9081`) and the Claude Agent SDK Token Meter Task (`cb40258d`).
- Initial ambiguity: whether the AGY figures are measured on the same basis as the native figures. They are not; see F1.

## Product And Domain Understanding

- Product area: the native AutoByteus LLM runtime (`autobyteus-ts` `GeminiLLM`), Token Meter usage ingestion and pricing (`autobyteus-server-ts` token-usage), and AGY runtime usage ingestion.
- Affected actors or systems: users running native Gemini agents and AGY Gemini agents; the Token Meter / token statistics UI.
- Existing user or operational purpose: lower Gemini cost through caching, and show truthful cache hit and cost.
- Relevant terminology: cache hit = cache-read input ÷ gross input (gross = uncached + cached). Implicit caching is Google's automatic prefix caching. Explicit caching uses `cachedContents` resources.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-09 | Data | `sqlite3 -readonly ~/.autobyteus/server-data/db/production.db` over `token_usage_run_records` since 2026-08-01, Gemini models, grouped by runtime/model | Reproduce the request's numbers | Reproduced. The request's metric is `cache_read ÷ (cache_read + cache_miss)`. AGY runs show `cache_miss_input_tokens = 0` while `accounting_input_tokens` is large and `cache_read > accounting_input` | Verify the AGY usage semantic |
| 2026-10-09 | Code | `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts:218-236` | AGY usage ingestion | AGY result `usage` is ingested as a `cumulative_snapshot` with `input_token_semantic: "gross_includes_cache"` | Live AGY probe |
| 2026-10-09 | Runtime | Live `agy` 1.3.2, model `gemini-3.8-flash-medium`, stream-json, 3 turns over a ~125K-token file (`/tmp/agy-cache-probe`) | Settle the AGY `input_tokens` semantic | Per-call usage `{"input_tokens":6110,"cache_read_tokens":307003,"total_tokens":6111}` and `{"input_tokens":2100,"cache_read_tokens":311085,"total_tokens":2101}`, so `total = input + output` and cache reads are excluded: **AGY `input_tokens` is net of cache** | F1 |
| 2026-10-09 | Code | `autobyteus-server-ts/src/token-usage/domain/token-usage-component-basis.ts:80-140` | How semantics drive accounting | `gross_includes_cache` computes standard = input − cache_read, clamped at 0. `base_excludes_cache` computes gross = input + cache_read. Grok Build already uses `base_excludes_cache` | F1 fix shape |
| 2026-10-09 | Code | `autobyteus-ts/src/llm/api/gemini-llm.ts`, `prompt-renderers/gemini-prompt-renderer.ts`, `api/gemini-token-usage-normalizer.ts`, `agent/loop/llm-phase.ts`, `agent/llm-request-assembler.ts` | Native request shape | `systemInstruction` (the processed system prompt, set once), `tools` (from a stable tool-instance list), and `contents` (append-only working-context history rendered deterministically). No `cachedContents`. Usage parser reads `cachedContentTokenCount` with gross semantics (correct) | F2 |
| 2026-10-09 | Web | https://ai.google.dev/gemini-api/docs/caching | Google guidance | Implicit caching is on by default for 2.5+. Minimum 4,096 tokens for 3.x (Developer API). Tips: large common content first, similar prefixes within a short time | — |
| 2026-10-09 | Web | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview | Vertex guidance | Implicit caching on by default, 90% discount, no storage cost. Minimum 6,144 tokens for 3.1 Pro preview, 3.7 Flash and 3.8 Flash. Explicit: same minimum, default TTL 60 min, storage billed. Express mode not mentioned | — |
| 2026-10-09 | Web | https://cloud.google.com/vertex-ai/generative-ai/pricing (read in a browser tab) | Official prices | **Gemini 3.1 Pro Preview (Global):** input $2.00 (≤200K) / $4.00 (>200K); cached $0.20 / $0.40; output $12.00 / $18.00. **Gemini 3.8 Flash (Global, through 2026-12-31):** input $0.75, cached $0.075, output $3.75; non-global is 10% higher; from 2027-01-01 $1.50 / $0.15 / $7.50. **Explicit cache storage:** 3.1 Pro $4.50, 3.8 Flash $1.00 per M tok-hr | F5 |
| 2026-10-09 | Web | https://ai.google.dev/gemini-api/docs/pricing | AI Studio prices | 3.8 Flash $0.75 / $0.075 / $3.75 (storage $0.50); 3.1 Pro $2.00 / $0.20 / $12.00 (≤200K), $4.00 / $0.40 / $18.00 (>200K) | F5 |
| 2026-10-09 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts:289-333`; `git log -S"pricing(2.25, 18.0"` → `fb3914b1c` (2026-06-25) | Catalog prices | 3.1 Pro catalog: 2.25 / 0.225 / 18 (≤200K) and 4.5 / 0.45 / 27 (>200K). The 2026-06-25 notes (`tickets/done/token-usage-pricing-ui/investigation-notes.md:131`) recorded the official 2.00 / 12.00 and 4.00 / 18.00, and no rationale exists for the change. 3.8 Flash catalog matches the official prices | F5 |
| 2026-10-09 | Command | `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:/Users/normy/.autobyteus/investigations/gemini-cache-lab/lab.db` | Isolated lab vault (user direction) | 10 secrets configured in the lab DB. Output was value-free. The production vault was not touched | — |
| 2026-10-09 | Runtime | `probes/gemini-cache-lab.mjs` (production `GeminiLLM` + renderer, Vertex Express, credentials from the lab vault) | Live caching behaviour | See Runtime findings E1–E6 | — |
| 2026-10-09 | Data | `~/.autobyteus/server-data/memory/agent_teams/software_engineering_team_b2cded97…/solution_designer_052deeed…/{working_context_snapshot.json,raw_traces_active.jsonl}` | Real native 3.8 Flash history and timing | 131 calls. Summed prompt is ≈11.8M tokens (estimated as chars ÷ 4) against 11.48M recorded, so no compaction reset. Mean new tail per call is ≈1.4K tokens. Inter-call gap: median 10.6 s; 7 gaps >60 s, 3 >300 s | F3 |
| 2026-10-09 | Data | `…/software_engineering_team_9c387697…/delivery_engineer_2fdd93b9…` | Real native 3.1 Pro history | 71 calls, prompts up to ≈290K. Median gap 6.9 s, but one ≈23 h break and 5 user interrupts | F4 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | A native agent run with a Gemini model makes LLM calls in a tool loop | Each call sends `systemInstruction` + `tools` + the full append-only history to `generateContent(Stream)`. Google implicit caching serves the cached prefix | The prefix is deterministic. Measured hit is 83–85% on 3.8 Flash and 66% on 3.1 Pro | Code; E2/E4 replay | High |
| BEH-002 | Contract | The AGY CLI emits per-turn `result.usage` (cumulative across the conversation) | The server ingests it as a cumulative snapshot with `gross_includes_cache` | Gross input is under-counted by every cache read. Cache miss is clamped to 0, so the Token Meter shows ≈99% hit and gross/total tokens too low | Live AGY probe; DB rows | High |
| BEH-003 | System | The Token Meter prices native Gemini usage from the catalog | `cache_read × cachedInputReadTokenPricing`, `miss × input`, `output × output`, with tiers selected at ≤200K / >200K | 3.8 Flash is correct. 3.1 Pro is overpriced on every dimension (input +12.5%, cached +12.5%, output +50%) | Catalog vs official | High |
| BEH-004 | System | AGY Gemini models in the Token Meter | `api_cost_status = price_missing` (AGY model ids such as `gemini-3.8-flash-high` are not in the catalog) | No cost shown for AGY Gemini runs | DB | High; out of scope |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api/gemini-llm.ts` | Builds the request: systemInstruction, tools, thinkingConfig. No explicit cache | The prefix is already stable; no reorder is needed | Whether to add a prefix-stability regression test |
| `autobyteus-ts/src/llm/prompt-renderers/gemini-prompt-renderer.ts` | Deterministic history rendering. Preserves the Gemini functionCall part (thought signature). Skips `system`-role messages, including mid-history interruption notes | No caching implication | Observation only: dropped mid-history system notes are a separate correctness question |
| `autobyteus-ts/src/llm/api/gemini-token-usage-normalizer.ts` | `promptTokenCount` is gross and `cachedContentTokenCount` is the cache read, with semantic `gross_includes_cache` | Correct; preserve | — |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts:230` | Declares the AGY semantic `gross_includes_cache` | Wrong; must be `base_excludes_cache` | Repair or leave historical AGY rows (DEC-001) |
| `autobyteus-ts/src/llm/supported-model-definitions.ts:289-316` | 3.1 Pro tiered pricing | Must match official prices | Repair or leave historical 3.1 Pro costs (DEC-002) |
| `autobyteus-ts/src/utils/gemini-helper.ts` | Runtime modes: aiStudio, vertexExpress, vertexProject | Explicit caching availability depends on the mode | DEC-003 |

## Runtime, Probe, Or Reproduction Findings

All native probes use `probes/gemini-cache-lab.mjs`: the production `GeminiLLM` streaming path on Vertex Express, with the user's configured mode. Raw per-call JSONL is kept next to the script. Only usage numbers are recorded.

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| E1 `loop --model gemini-3.8-flash --calls 8` | Synthetic tool loop: ~16K-token prompt, 2.5K-token tool results | Cache reads grow in ≈4,067-token blocks (12,215 → 16,284 → 20,351 → 24,414 → 28,480) and sometimes lag one block. Warm hit is 82% at this small context size | Structural floor: new tail + up to one block per call | `probes/e1-loop-38flash.jsonl` |
| E2 `replay --from 40 --count 10` | Exact production 3.8 Flash requests (58–69K), back-to-back | Warm hit 92–95% (93.6% aggregate); ≈4.2K uncached per call | Native prefix stability is confirmed; requests are cacheable | `probes/e2-replay-38flash.jsonl` |
| E4 `replay --from 60 --count 25 --delay-ms 12000` | Production requests at production-like pacing | Warm hit 91.9%. **One random full miss** (call 65: 0 of 80.5K cached) between warm calls; the next call hit again | Google-side best-effort misses happen even with a stable prefix | `probes/e4-replay12s-38flash.jsonl` |
| E3 `replay --from 100 --count 6 --delays 30,60,120,240,480` | Implicit TTL and write lag | Hit 96% after 120 s and after 240 s idle. **0% after 480 s idle**. Right after a large new chunk, the first two calls only hit 55–63% (partial lag), then 96% | Implicit TTL is between 4 and 8 min, so long user think-time causes a cold restart | `probes/e3-ttl-38flash.jsonl` |
| E5 `probe-explicit` | Explicit `caches.create` (system + tools, TTL 300 s) | **Vertex Express: HTTP 404** (`cachedContents` is not on the Express surface). **AI Studio:** create succeeded (16,074 tokens), then the follow-up `generateContent` returned 429 (per-minute request quota on that key); the cache was deleted | Explicit caching is unavailable in the user's configured mode | `probes/e5-explicit-probe.jsonl` |
| E6 `replay --model gemini-3.1-pro-preview --from 20 --count 10` | Production 3.1 Pro requests (≈260K), 7 s pacing | **5 of 6 successful calls had 0 cached**; one had 99%. 4 calls failed with 429 "resource exhausted". Cost about $5–6 (higher than planned; probing stopped) | On Vertex Express, 3.1 Pro implicit caching is unreliable at large context; native cannot fix this by changing request shape | `probes/e6-replay-31pro.jsonl` |
| AGY probe | `agy` 3-turn session, 3.8 Flash medium | Small prompts (≈12K) had 0 cache reads at 35 s gaps. Large prompts (≈313K) had 98–99% cache reads after 90 s / 30 s | AGY relies on the same Google caching behaviour; its input is net | Command in Source Log |

## Key Findings

- **F1 — The AGY "99%" is a measurement artifact.** AGY reports `input_tokens` net of cache. We ingest it as gross, so `cache_miss` becomes 0 and gross input loses every cache read. On the correct basis, hit = cache_read ÷ (cache_read + input):

  | Runtime / model (since 2026-08-01) | Requested figure | Corrected figure |
  | --- | --- | --- |
  | AGY gemini-3.8-flash-high | 99.4% | **86.6%** |
  | AGY gemini-3.8-flash-medium | 99.9% | **93.5%** (one 58-call run dominates) |
  | AGY gemini-3.7-flash-high | 76.5% | **60.6%** |
  | AGY gemini-3.1-pro-high | 58.3% | **37.0%** |
  | AGY gemini-3.8-flash-low | 8.9% | **8.2%** |
  | Native gemini-3.8-flash | 83.2% | 83.2% (already gross; correct) |
  | Native gemini-3.1-pro-preview | 66.1% | 66.1% |

  Like-for-like, native 3.8 Flash (83.2%) sits 3.4 points below AGY high (86.6%) and about 10 points below AGY medium (93.5%, one dominant run). Native 3.1 Pro (66.1%) is above AGY 3.1 Pro high (37.0%).
- **F2 — The native request prefix is already stable.** Replaying the exact production requests back to back reaches 92–95% hit. There is no byte-level prefix instability to fix.
- **F3 — The residual native loss is structural and on Google's side.** For the 131-call 3.8 Flash run: an uncached new tail (≈1.4K tokens) plus up to one ≈4K block per call; occasional best-effort full misses (1 in 24 warm calls in E4); partial write lag after large new chunks; and cold restarts after idle gaps longer than the 4–8 min implicit TTL (3 such gaps). These add up to roughly the observed ≈13.3K uncached per call.
- **F4 — 3.1 Pro on Vertex Express caches unreliably at large context** (E6: 5 of 6 full misses, plus 429s). This is Google-side; the request shape is the same deterministic one that hits on 3.8 Flash.
- **F5 — Token Meter pricing.** 3.8 Flash cached input is priced correctly ($0.075 global). **3.1 Pro is mispriced:** the catalog has 2.25 / 0.225 / 18 and 4.5 / 0.45 / 27; official is 2.00 / 0.20 / 12 and 4.00 / 0.40 / 18. Since 2026-08-01 the Token Meter estimated $35.68 for native 3.1 Pro runs; at official prices this is lower. Exact re-pricing is a design-phase computation.
- **F6 — Explicit caching does not pay off for the user's setup.** It is unavailable on Vertex Express (404). On AI Studio and Vertex Project it is available, but a growing agent history would need re-created caches (creation billed plus storage at $1.00 / $4.50 per M tok-hr on Vertex). It mainly protects the static prefix, which implicit caching already hits, plus cold restarts after more than 4–8 min idle. That pays off only if the user returns within roughly 40 min for 3.8 Flash. It might help 3.1 Pro's unreliable implicit caching, but only outside Express mode.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/gemini-cache-lab.mjs` | Solution Designer | Reproducible live cache probe (lab vault; no secrets) | Evidence for F2–F6; reusable by API/E2E | REQ-003, AC-004 | Current | Evidence only; no approval |
| `probes/*.jsonl` | Solution Designer | Raw per-call usage from E1–E6 | Evidence | F1–F6 | Current | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Whether Vertex Project mode (regional or global) caches 3.1 Pro or 3.8 Flash more reliably than Express | It might be a better path for heavy 3.1 Pro use | Needs ADC credentials, which this machine lacks; separate task if wanted | Open; not blocking |
| UNK-002 | Unknown | Whether a project-scoped `cachedContents` path works with an Express key | Would make explicit caching possible on Express | Out of scope unless DEC-003 chooses explicit caching | Open |
| RSK-001 | Risk | Repairing historical AGY/3.1 Pro rows touches run records and analytics facets | Data correctness versus migration complexity | DEC-001 / DEC-002 | Open |
| OBS-001 | Observation | The Gemini renderer drops mid-history `system` notes (interruption notes) | Gemini doesn't see interruption context | Separate-ticket candidate; not caching | Recorded |

## Architecture Investigation Findings (2026-10-09, after approval)

- Authorities read: `references/architecture-design.md`, `design-principles.md`, `/DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2.
- `token-usage-component-basis.ts:80-140`: `base_excludes_cache` already computes gross = reported + cache_read (+ creation), standard = reported, miss = provided ?? standard. Grok Build uses it (`grok-build-call-usage.ts:37`).
- Cumulative path: `token-usage-snapshot-delta-normalizer.ts` (live) and `token-usage-run-fold.ts:134-200` (durable). Per-field deltas are taken over stored basis-resolved source tokens (`cumulative-snapshot-reconciliation-metadata.ts`), then the basis is re-resolved per delta through `TokenUsageComponentBasisResolver`. For an AGY series spanning the upgrade, every stored field increases under the new semantic (old checkpoint: accounting = reported, miss = standard = 0), so there is no regression flag. A one-time miss/standard catch-up occurs; pre-upgrade cache reads stay out of gross. Accepted under fix-forward.
- No existing test asserts the AGY semantic (`agy-stream-event-converter.test.ts`) or the 3.1 Pro prices (`supported-model-definitions.test.ts`). The tier ids `prompt_le_200k`/`prompt_gt_200k` appear only in `supported-model-definitions.ts`.

## Requirement Implications

- The "gap" explanation (Done-when #1) is mainly F1 (measurement), plus F3/F4 (Google-side implicit behaviour).
- Fixing AGY ingestion is required for any like-for-like comparison to be truthful.
- The native request already meets Google's guidance (stable prefix, large common content first). There is no request-shape change with evidence of benefit. A regression guard keeps it that way.
- Token Meter correctness needs the 3.1 Pro catalog prices fixed. Cached-input pricing for 3.8 Flash is already correct.
- Explicit caching is a user decision (DEC-003); the evidence says it is not worth it in Vertex Express mode.

## Notes For Architecture Design

To be extended after approval: AGY converter semantic change and cumulative-snapshot delta behaviour; the catalog tier fix; the historical-data decision outcome; the prefix-stability test placement (`autobyteus-ts` unit test over `GeminiLLM` request capture).
