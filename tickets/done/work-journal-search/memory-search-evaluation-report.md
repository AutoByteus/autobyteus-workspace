# Memory Search Evaluation Report

- **Ticket:** `work-journal-search` (Project Task `autobyteus-185`, the first step of `autobyteus-233`).
- **Author:** Solution Designer.
- **Dates:** experiments 2026-10-21 → 2026-10-23.
- **Machine:** Apple M1 Max, 64 GB, macOS. The server's embedding layer runs on the CPU (WebAssembly, 4 threads). LM Studio serves local LLMs on the GPU (MLX).
- **Labels:** **Measured** = run here and counted. **Claimed** = a source says so, not checked here.
- **Privacy:**
  - All tests ran read-only on an isolated copy of the user's memory (`/tmp/wjs-copy`).
  - No journal content is reproduced here. The repository is public, so questions and findings are described by ID and neutral category.
  - The exact questions, agent traces and per-run data are in the private evidence folder (§ 12).

## 1. Summary

**Question:** can an agent in a new session find past work of any agent from a vague cue, and be pointed to the journal lines to read?

**Answer: yes, with an index; without one, no.**

- **Gate 1** (the user's rule: if the work is in a journal, the search must find it), measured as "the right run is in the top 10 of one search":
  - text index + meaning cards: **30 of 31** (95% CI 84–99%);
  - one `rg` over all journals with the same keywords: **16 of 31** (35–68%) at best;
  - paired exact McNemar: **p = 0.0001**. On 14 questions only the index passes; on 0 only `rg` passes.
- **With an agent:** given several tries, an agent with only `rg`/`grep` found the right run within 3 searches for **2 of 16** questions, against **15 of 16** with `search_memory` (paired exact McNemar p = 0.001).
  - The `rg` agent needed 6–8 rounds before the run appeared in its output.
  - It opened the right journal for 4 of 16, against 12 of 16.
  - Median 116 s against 47 s per question.
- **The one remaining gate-1 failure** ("desktop shell framework" for an Electron upgrade) passes when the agent rephrases (3rd search).
- **Gate 2** (speed, for questions that pass gate 1):
  - right run #1 for 20 of 31, top 3 for 27;
  - one search p50 0.2 s, max 1.2 s over all history (1.1 million chunks).
- **"What is true now" is not solved by search.** "What do we call our product now?" gets pointed to an older section. That is semantic memory (`autobyteus-233`).
- **No LLM is needed for stage 1.**
  - Our own LLM summaries are feasible and of good quality, but they barely change ranking: best at #1, 22 vs 20–21 on 234 runs.
  - They cost about 4 days of GPU time once, then about 40 minutes a day.

**Chosen design for stage 1, each choice backed by § 9:**
- Markdown journals for every run (backfill);
- entry-aligned chunks of up to 2,000 characters, no header, no summary;
- a full-text index (SQLite FTS5, CJK split);
- one meaning card per journal file (Granite R2, ≤ 1,024 tokens);
- the two candidate lists interleaved and grouped per run;
- pointers (who, when, file:lines, masked snippet, match kind) returned to the agent, which reads the lines with its normal file tool.

## 2. Questions The Experiments Answer

| # | Question | Section |
| --- | --- | --- |
| Q-A | How much history is there, and why do most runs have no journal? | § 3 |
| Q-B | Can the search find past work (gate 1), and how fast (gate 2)? | § 5, § 6 |
| Q-C | What chunk size, and what goes into the meaning index? | § 5.2, § 5.3 |
| Q-D | Do our own LLM summaries help, which local model, and at what cost? | § 7 |
| Q-E | Is an index needed at all, or do `grep`/`rg` and an agent suffice? | § 8 |
| Q-F | Do the other use cases ("why did we decide", "other agent, other workspace") work? | § 6.4, § 6.5 |

## 3. Corpus (Measured; Metadata Only)

| Item | Value |
| --- | --- |
| Local runs with raw traces | **3,654** (`agents/` 706, `agent_teams/` members 2,832, `agent_orgs/` 116); imports from other nodes excluded |
| Raw traces | 8,048 MB, from 2026-04-10 to 2026-10-21 |
| Runs that had a journal | **90** (84 MB). Journals began on 2026-10-19 (`d98c213afc`) and are made only for live runs or on demand ("no startup scan"). |
| Backfill with the real `WorkJournalService` on the copy | **3,654 runs, 0 errors, 104 s**; 7,385 files; **1,709.7 MB** |
| Journal per run | median 187 KB, p90 906 KB, p99 5.0 MB, max 22.6 MB; 323 runs over 1 MB |
| Journal per file | median 196 KB, max 6.7 MB |
| Composition | tool-output detail 1,396 MB (82%), dialogue lines (user / agent / teammate) 180 MB, action lines 125 MB |
| By family | teams 1,531 MB, orgs 112 MB, standalone 57 MB |
| Runtimes (files) | Codex 5,663, AutoByteus 1,097, Claude 592, Antigravity 33 |
| Daily growth (last 30 days, from record timestamps) | journal ≈ **13.7 MB/day** (max day 28.5) |
| Runs with no recorded history | 35 of 742 standalone folders (metadata only); unfindable by any method |
| Markdown vs JSON for the same entries (300 files) | 70.7 MB vs 72.4 MB (+2%) |

- **Reader hazard (Read in code):** `autobyteus-ts/src/memory/store/run-memory-file-store.ts:32-58` truncates a raw-trace file whose last line is incomplete. Reading a live run's raw traces from outside the journal service could therefore modify user data. The index must read journals only.

## 4. Method

### 4.1 Known-answer set

- **31 answerable questions** (Q01–Q29, Q31, Q32) and 3 off-topic ones; Q30 is unanswerable, because its run has no recorded history.
- **5 in Chinese.**
- **Written by the Solution Designer** as paraphrases of a run's purpose (from run titles and known work), deliberately with different words.
- **Ground truth** is the set of runs that did the work. Public list: `probes/questions-public.json` (ID, category, language, accepted run IDs).
- **Two corrections on 2026-10-23,** after the agent found valid runs missing from the answer lists:
  - Q04: another run that built the same kind of game;
  - Q25: the team runs that did the work.
  - The lesson for the implementation tests: answer lists must include every run that did the work.
- **DDNS** (the Task's acceptance scenario) is Q01–Q03.
- **The fresh-copy scenario** (PTM input, 2026-10-22) is Q26–Q29.

### 4.2 Gates (the user's definition, 2026-10-23)

- **Gate 1 (must):** the right run is found. Ranked tests use "in the top 10 of one search". Agent tests use "in the results within 3 searches".
- **Gate 2 (only for questions that pass gate 1):** rank (#1, top 3, MRR), search latency, and agent steps and seconds to the right journal lines.

### 4.3 Statistics

- 95% Wilson intervals for pass rates.
- Exact two-sided McNemar for paired comparisons (same questions, two methods): b = only A passes, c = only B passes.
- **n = 31 is small:** differences of 1–3 questions are not significant. § 10 lists the threats to validity.

### 4.4 Probes

- Scripts are in `probes/`; the server-side probes in `probes/server-probes/` run the real `WorkJournalService` and `EmbeddingModelRunner` through `vitest.probe.config.ts`.
- Nothing was committed to source.
- § 12 has the order of reproduction.

## 5. Retrieval Experiments

### 5.1 Text tier (SQLite FTS5)

- **Tokenizer:** `unicode61`. **Query:** the question's keywords (stop words removed) OR-joined. **Ranking:** BM25, best chunk per run. Memory Compactor runs excluded (they copy other runs' memory and once outranked the original).
- **Chinese:** `unicode61` keeps a Chinese run of characters as one token, so all Chinese queries returned nothing (Measured). Fix: index each CJK character as a token and query with overlapping 2-character phrases. After it, Chinese questions are #1–#3.
- **Build:** 60–80 s for all 1.7 GB.
- **Size:** the probe stores the text in the index (≈ 3 GB). An external-content or contentless index pointing into the journals avoids the copy.

### 5.2 Chunk size (no header, no summary; text + cards)

| Max chunk | Chunks | Lines per chunk (median / p90) | #1 | Top 3 | Top 5 | MRR |
| --- | --- | --- | --- | --- | --- | --- |
| 1,000 characters | 2,045,487 | 7 / 15 | 15 | 25 | 28 | 0.660 |
| **2,000 characters** | 1,109,536 | **13 / 28** | **19** | 26 | 28 | **0.744** |
| 4,000 characters | 594,569 | 27 / 45 | 18 | 27 | 28 | 0.726 |

- **Rule:** group whole entries up to 2,000 characters; split a single longer entry by lines.
- **Context-header variant** (agent, workspace, day and request prepended; deterministic): #1 22 vs 19, top 5 equal, MRR 0.802 vs 0.744. **Not adopted** (the user: keep it simple). The same fields are stored beside each chunk as metadata.

### 5.3 Meaning tier

- **Model:** Granite Small English R2 via the server's `EmbeddingModelRunner`. Catalog `maxTokens` 1,024; the model reads up to 8,192 (Claimed, `autobyteus-71` report).
- **Speed (Measured, CPU idle):** 10.4 items/s at 600 characters, 4.8 at 1,200, 2.4 at 2,400, so **≈ 6 KB of text per second whatever the size.** LM Studio `nomic-embed-text-v1.5` on the GPU: ≈ 13.5 KB/s, only about 2× faster.
- **Characters per Granite token** on journal text (351 samples): median 3.41 (p10 2.95, p90 3.98). 1,024 tokens ≈ 3,400 characters; 8,192 ≈ 27,500. Only 4.9% of journal files fit in 1,024 tokens and 10.7% in 8,192, so **a journal must be split, whatever the limit.**
- **Units compared:**

| Unit | Count | Build (once) | Token fit |
| --- | --- | --- | --- |
| Every text chunk | 1.05 M | ≈ 79 h (projected) | — |
| **Card per journal file** (agent, first 6 requests, first 8 reply openings, 25 distinct actions; ≤ 2,400 characters) | 7,385 | **≈ 1 h** (3,499 s, partly shared with the LLM) | median 732, p90 825, max 2,419 tokens; **68 over 1,024**, mostly Chinese-heavy, so the limit must be counted in tokens |
| Whole-file dialogue pieces (User + Agent text, ≤ 3,000 characters) | 28,902 | ≈ 4.4 h (4 parts) | — |

- **Off-topic queries** score 0.74–0.83, overlapping true hits (0.80–0.92). No absolute relevance floor works (as FO-001 in `autobyteus-71`), so the tool reports weak matches instead of "nothing".

### 5.4 Combining the tiers (25-question set, all runs)

| Method | #1 | Top 5 | MRR |
| --- | --- | --- | --- |
| Reciprocal rank fusion (RRF) | 15 | 21 | 0.708 |
| **Interleave** (alternate text and meaning, de-duplicated) | **17** | **22** | **0.775** |

- Same lesson as `autobyteus-71`: keep the tiers separate. Each result is labelled with how it matched.

## 6. Results Under The Two Gates

### 6.1 Ranked test (31 questions, one search, all 3,654 runs)

| Method | Gate 1 (top 10) | 95% CI | #1 | Top 3 | MRR |
| --- | --- | --- | --- | --- | --- |
| **Text + cards (chosen)** | **30 / 31 (97%)** | 84–99% | **20** | **27** | **0.780** |
| Text + dialogue pieces | 30 / 31 (97%) | 84–99% | 20 | 26 | 0.768 |
| Text + cards + dialogue | 30 / 31 | 84–99% | 20 | 27 | 0.776 |
| Text only | 27 / 31 (87%) | 71–95% | 20 | 25 | 0.731 |
| Dialogue pieces only | 25 / 31 (81%) | 64–91% | 18 | 23 | 0.675 |
| Cards only | 24 / 31 (77%) | 60–89% | 19 | 22 | 0.662 |
| `rg`, ranked by distinct keywords | 16 / 31 (52%) | 35–68% | 4 | 11 | 0.263 |
| `rg`, ranked by hits | 5 / 31 (16%) | 7–33% | 0 | 2 | 0.063 |

Paired exact McNemar, gate 1:

| A vs B | b | c | p |
| --- | --- | --- | --- |
| text + cards vs `rg` (distinct keywords) | 14 | 0 | **0.0001** |
| text + cards vs `rg` (hits) | 25 | 0 | < 0.0001 |
| text vs `rg` (distinct keywords) | 11 | 0 | 0.0010 |
| text + cards vs cards | 6 | 0 | 0.031 |
| **text + cards vs text** | 3 | 0 | **0.25 (not significant at n = 31)** |
| text + cards vs text + dialogue | 0 | 0 | 1.0 |

- **Reading:** the index against `rg` is a clear, significant difference. The meaning tier adds 3 gate-1 passes over text with no losses. That is consistent with its purpose (paraphrases), but not significant on 31 questions.
- **Why it stays:** zero observed losses, about 1 h build, about 10 ms per query. The implementation's known-answer set should be enlarged to confirm it.
- **Dialogue pieces** equal cards in combination at about 4× the build cost, so they are not chosen. They are the measured alternative if late-in-file decisions matter more in real use: alone they find a late product rename at #8, where cards miss it.

### 6.2 Remaining gate-1 failure

- Q13 ("desktop shell framework", the run says Electron): #36–51 in every setup.
- An agent with `search_memory` passes it at its **3rd search**: it read a result, learned "Electron" and searched again.

### 6.3 Latency (gate 2; Measured, CPU idle)

| Step | Time |
| --- | --- |
| Load Granite (once after 10 idle minutes) | 376 ms |
| Embed one query | p50 10 ms, p90 15 ms, max 26 ms (35 queries) |
| Scan 7,385 cards | 0.54 ms |
| Text search, 1.1 M chunks, top 50 | p50 201 ms, p90 879 ms, max 1,194 ms |
| **One search in total** | **≈ 0.2–0.9 s, max ≈ 1.2 s** |

### 6.4 "Why did we decide …" over ticket documents

- **Index:** FTS5 over 2,143 core ticket documents (requirements, design, investigation, release notes, follow-ups, revision records in `tickets/done/`, plus `task-results/*/report.md`): 50.6 MB, 46,954 sections, **2.2 s** to build.
- **"Why did we not integrate login/sign-in … Claude and Antigravity?":** #1 is the provider-terms report (`autobyteus-234`), #2 is `runtime-lifecycle-review` E-R21 (`autobyteus-207`).
- **"Why is there no Claude sign-in button":** #1 is `runtime-lifecycle-review` § User Direction.
- Text alone answers this use case.

### 6.5 Fresh copy in another workspace (Q26–Q29)

- **The scenario:** a new Project Task Manager copy in the website workspace must recall work another agent did in a business-applications workspace, including a product-positioning change.
- **Results:**
  - Full cue: #1.
  - Chinese cue: #1.
  - Vague cue: #2.
  - "What do we call our product now?" (no new name): #3 by text, #5 interleaved. **The pointer lands in the oldest of the run's 3 journal files,** where the old positioning is; the new one is only in the newest file, written a few hours before the test.
- **Findings:**
  - cross-agent, cross-workspace recall works;
  - the newest fact does not win;
  - freshness of hours matters;
  - runs that only discussed the scenario (self-references) rank high.

## 7. Our Own Summaries (Optional Stage, Measured)

### 7.1 Local models (MoE only: the user excluded the dense Gemma 4 31B as too slow)

| Model (LM Studio, MLX 4-bit) | Loaded | Prefill | Decode (long input) | DDNS run skeleton summary, nothing else running |
| --- | --- | --- | --- | --- |
| **Qwen3.6-35B-A3B** | 19 GB | 406–647 tok/s | 45–55 tok/s | **174,431 tokens, 471 s** |
| Gemma 4 26B-A4B | 15.6 GB | 273–451 tok/s | 38–41 tok/s | 182,307 tokens, 571 s |

- **Quality:** similar; both name the work, where it lives and the provider. Gemma added Markdown and used fewer search terms.
- **Thinking:** off via `reasoning_effort: "none"` (OpenAI parameter; `chat_template_kwargs` and `/no_think` did not work).
- gpt-oss-20b was not tested (incomplete download).

### 7.2 Method

- **Map-reduce:** windows of ≤ 60,000 characters cut at entry boundaries, one call per window (notes: GOAL / DONE / WHERE / TERMS, ≤ 180 words), then recursive merging per file and per run. No call exceeds about 23k tokens, whatever the file size.
- **Skeleton input:** only user, agent, teammate and action lines. 30% of the tokens of full text (174k vs 580k on the DDNS run) at similar quality.

### 7.3 Context fit (7,385 files; LLM tokens at 2.64 characters per token)

| Input | Median | p99 | Max | Fits 64k | Fits 262k (Qwen3.6 max) |
| --- | --- | --- | --- | --- | --- |
| Full file | 74k | 466k | 2.53M | 35% | 96% |
| Skeleton | 9.4k | 145k | 741k | 96% | 99.6% |

- **Files over 262k (full):** Claude 126 of 592 (21%; a 1M-context runtime compacts late), Codex 116 of 5,663, AutoByteus 35 of 1,097.
- **Over 262k as skeleton:** 31 files.
- So splitting is the normal path for big files, and the window should follow the chosen model's context.

### 7.4 Retrieval with summaries (234 runs that all have summaries)

| Method | #1 | Top 3 | Top 5 | MRR |
| --- | --- | --- | --- | --- |
| Text | 20 | 24 | 25 | 0.881 |
| Cards | 21 | 24 | 24 | 0.889 |
| Summaries | **22** | 22 | 22 | 0.883 |
| Text + summaries | 20 | **25** | 25 | **0.900** |

- **Strengths:** summaries are best at #1 for paraphrases.
- **Weaknesses:** they fail Chinese questions (written in English; Granite is English-only).
- **Caveat:** on 234 runs every method is near the ceiling.

### 7.5 Cost

- **Batch:** 233 runs in 6,414 s for 2.29 M prompt tokens (≈ 360 tok/s effective). The largest job, a 5.0 MB Claude run: 28 calls, 385k tokens, 949 s.
- **Backlog (skeleton):** ≈ 195 M tokens ≈ **4 days of GPU** once.
- **Ongoing:** ≈ 1.5 M tokens/day ≈ **40 min/day**. Full-text summaries would take ≈ 2.4 h/day.
- **Secret scan of 566 summaries** (pattern counts only):
  - 0 API keys, tokens, private keys, JWTs or `password=`;
  - the model wrote `[secret]` twice;
  - IPv4 addresses in 37 files and home-directory paths in 285 (privacy decision UD-002).
- **Conclusion:** summaries are optional. Their value is readability of results, not finding.

## 8. Is An Index Needed? Baselines Without It

### 8.1 One `rg` with the question's keywords (no agent)

| | Value |
| --- | --- |
| Gate 1 (top 10) | 16 / 31 ranked by distinct keywords; 5 / 31 ranked by hits |
| `rg` time per question (warm cache, 1.7 GB) | p50 0.67 s, p90 2.65 s, max 4.55 s |
| Output | **p50 465,859 matching lines** (max 9.7 million); p50 3,098 of 3,654 runs match |

- **Why it fails:** ordinary words occur in almost every run. `rg` finds where words are, not which run is about them. An agent sees a cut slice of that output, unranked.
- **Where it works:** rare words: a game named by its animals, two Chinese questions and DDNS are top-2. BM25 in the index keeps that strength.
- For DDNS alone, plain `rg` returns 139 runs.

### 8.2 An agent with a shell (`rg`/`grep`/`find`, read-only) and `read_file`, no index

- **Setup:** the same local agent (Qwen3.6), told where the journals are and how entries look; a fair best case, since without the tool an agent would not know the location.
- **Tools:** read-only `run_bash` (`rg`, `grep`, `find`, `ls`, `head`, `sed`, `wc`…; output cut at 8,000 characters) and `read_file`.
- **Budget:** up to 12 steps. 16 questions, the same as the `search_memory` agent (§ 8.3 plus the 4 gate-1 cases).
- **Counting:** "found" = the right run's ID appears anywhere in a command's output, which is generous: it may be one line among thousands.

| | `search_memory` agent | `rg` agent (no index) |
| --- | --- | --- |
| **Gate 1: found within 3 searches** | **15 / 16** | **2 / 16** |
| Found in the first search | 14 / 16 | 0 / 16 |
| Found at all (any round, ≤ 12 steps) | 15 / 16 | 12 / 16 |
| Opened the right journal | 12 / 16 | 4 / 16 |
| Median steps | 6 | 12 (the step limit) |
| Median seconds per question | 47 | 116 |

- **Paired exact McNemar on gate 1:** b = 14 (only `search_memory` passes), c = 1 (only `rg` passes: Q27, "what do we call our product now", where the run ID appeared in round 3 but was never opened). **p = 0.001.**
- **What happened:**
  - Without the index the agent needs **6–8 `rg` rounds** before the right run appears in its output, and then mostly runs out of steps before opening it.
  - The `search_memory` agent has the right run in its first result for 14 of 16 and opens it at step 2 for most.
- **Caveat:** the `search_memory` agent's first 13 questions ran with an 8-step limit and the `rg` agent with 12, which favours `rg`.
- Per-question numbers: `probes/results/agent-compare.txt` and `probes/results/agent-rg-baseline.json`. Traces with answers are in the private evidence folder.

### 8.3 An agent with `search_memory` (same local agent, same questions)

- **Setup:** Qwen3.6 via LM Studio, tool calling, thinking off.
- **Tools:**
  - `search_memory(query, since?, until?, limit?)`: probe backend; interleaved text and cards; masked snippets; a ready `source` line;
  - `read_file(path, start_line, end_line)`: the AutoByteus `read_file` shape.
- **13 questions:**

| Outcome | Count |
| --- | --- |
| Right run in the first search's top 5 | **12 / 13** |
| Right journal opened | 10 / 13 (at step 2 for 9) |
| Answered from the right run and cited it | 7 / 13 |
| Clean answers | 11–33 s, 2–4 steps; almost all of the time is the model reading |
| Failure modes | looping (2), mixing in another run (1), ambiguous ground truth (1), newest fact lost (1) |

- **Clearer tool guidance** ("open the best match before searching again; cite `source`; for 'now' questions search recent days") fixed citation for 1 of 5 and not the looping. That is a property of this local model.
- **Production agents use stronger models.** Testing them on real journals sends journal lines to the provider; that needs the user's decision.

## 9. Decisions Derived From The Evidence

| Decision | Evidence |
| --- | --- |
| Backfill journals for all runs (UD-001, the user decides on writing into run folders) | § 3: 95% of runs had none; backfill 104 s, 0 errors. Q01 (DDNS) was unfindable without it. |
| Index journals only, never raw traces | § 3, reader hazard |
| Keep journals Markdown | § 3: +2% size for JSON; line ranges are the pointers |
| Entry-aligned chunks ≤ 2,000 characters, no header, no summary | § 5.2: best MRR and a 13-line reading span; header gain not adopted (simplicity) |
| Text tier with CJK split; Memory Compactor runs excluded | § 5.1 |
| Meaning tier = one card per journal file, limit counted in tokens | § 5.3, § 6.1: equal to whole-file pieces in combination, about 4× cheaper |
| Interleave the tiers; label the match kind | § 5.4 |
| Index required; plain `rg` is not enough, even for an agent with several rounds | § 6.1, § 8: p = 0.0001 (ranked), p = 0.001 (agents) |
| No LLM in stage 1; summaries optional later | § 7 |
| Pointers with dates; newest matching part first; "weak matches" instead of "nothing found" | § 6.5, § 5.3 |
| "What is true now" goes to semantic memory (`autobyteus-233`) | § 6.5, § 8.3 |
| Follow-ups: token-limit setting (FU-001), reranker for ordering (FU-002) | § 5.3; § 6.1 (gate 2: 7 of 28 hits at #2–3) |

## 10. Threats To Validity

- **Small set:** n = 31. Only large differences are significant (the index vs `rg`). Text + cards over text alone (+3, p = 0.25) needs a larger set.
- **Question bias:** questions were written by the Solution Designer from run titles and known work. They paraphrase on purpose, but they may favour runs whose first request states the purpose, which also favours cards (built from first requests).
- **Ground truth:** two answer lists were incomplete and corrected after the agent found valid runs. Others may still be incomplete.
- **Snapshot:** the copy was taken 2026-10-21 08:14; one run was refreshed on 2026-10-22. Live freshness was not tested.
- **Agent:** the agent tests used a local model (Qwen3.6-35B-A3B). Production agents (Claude, Codex, Antigravity) are untested on real journals.
- **One machine:** an M1 Max. Timings on other machines and in Docker differ. The 2-hour background limit of the Solution Designer's tools split long jobs; one part ran about 6× slower for an unknown reason (sleep or contention).
- **English-only embedding model:** Chinese meaning search is weak; Chinese is carried by the text tier.

## 11. Sources (Web, Read 2026-10-21 / 2026-10-23)

- AMA-Bench, arXiv 2602.22769: summarization memory is lossy.
- WhenLoss, arXiv 2605.24579: verbatim chunks vs summaries on LongMemEval.
- MemMachine, alphaxiv 2604.04853: retrieval tuning matters more than ingestion.
- mem0.ai/research-3 (vendor claims).
- memoryplugin.com hierarchical-memory wiki (RAPTOR vs plain retrieval).
- Local-model guides: computingforgeeks open-source LLM table; avinashsangle Gemma 4 guide; lilting.ch Qwen3.6 on M1 Max; willitrunai.
- Rerankers: qdrant.tech "oxidizing cross encoders"; mixpeek best rerankers; promptlayer bge-reranker-v2-m3 int8.

## 12. Reproduction And Evidence

- **Private evidence (not in any repository):** `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/work-journal-search-evidence/`. It holds the exact questions, agent traces with answers, per-run render statistics and evaluation outputs.
- **Order:**
  1. Copy raw traces read-only (rsync; § 3).
  2. `server-probes/render-journals.probe.ts`.
  3. `build_plain.py 2000`.
  4. `build_cards.py`, then `server-probes/embed-cards.probe.ts`.
  5. `eval_plain.py` / `eval_dialogue.py` / `eval_rg.py`.
  6. `stats.py`.
  7. Agents: `server-probes/embed-server.probe.ts`, then `e2e_agent.py` and `e2e_bash.py` (LM Studio on `localhost:1234`).
  8. Summaries: `summarize.py` / `summarize_corpus.sh`.
- **Results by ID:** `probes/results/` (`ranks-all.json`, `rg-baseline.json`, `stats.txt`, `embed-speed.jsonl`, `query-latency.json`, `summary-batch-costs.json`).
