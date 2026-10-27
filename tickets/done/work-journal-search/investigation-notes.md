# Investigation Notes

## Investigation Meta

- Package identifier: `work-journal-search`
- Request / ticket: Project Task `autobyteus-185`. Agent search over Work Journals across all agents; the first step of the memory work (`autobyteus-233`).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search`
- Repository mode: `Git`
- Task worktree / branch: `codex/work-journal-search`
- Resolved base: `origin/personal` @ `a22394f0ce` (fetched 2026-10-21); **fast-forwarded to `8b34e8ae10` on 2026-10-24** at the user's request (244 commits; the journal service, embedding layer, agent-memory services and Memory page are unchanged; Project Tasks gained comments and Task search matches them; new `list_available_nodes`; the native working-context v5 migration code was removed from `autobyteus-ts`)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created. For probes only, `node_modules` are symlinked from the main checkout; they are listed in `.git/info/exclude` and never committed.
- Bootstrap blocker: none
- Current solution revision ID: `N/A` (requirements not yet drafted)
- **Base fast-forwarded again to `ddd6fdcdf6` on 2026-10-24** (120 commits, at the user's request). The journal service and embedding layer are unchanged. Memory Sync identity renamed (`sourceNodeId` → `memorySyncSourceId`); while Memory Sync is held back, the Memory page lists only local memory. `list_available_nodes` → `list_peer_nodes`.
- **New project authorities found in `DESIGN.md` (2026-10-24):**
  - `GLOSSARY.md` is the authority for domain words (Principle 15). It has no memory, journal, episodic, semantic or memory-search entries yet, so this design must add them.
  - `docs/design-cases.md` holds the project's design cases.
  - `autobyteus-server-ts/docs/design/collaboration_model.md` § 3 "Run Storage Shape" states every run's own folder and memory, "the Work Journal rendered from its raw traces" included; delegated runs live in their own folder at their kind's standard place; CM-10: no node reads another node's run.
  - Data Migration Guideline rule 10: stored names stay in sync with renames.
- Skill re-read again 2026-10-24: `SKILL.md` (design cases go to the project's own file), Principle 15 One Vocabulary, generalized case studies, `finding-the-cause.md` and `ticket-scope.md` examples generalized, the template's naming table with a glossary column.
- Authorities re-read 2026-10-24 after a skill update: `SKILL.md`; shared `design-principles.md` (several kinds and forms, cited claims, one owner per sequence, derived consumers, behavior by absence); `design-examples.md` (cases from our own reviews); `templates/design-spec-template.md`.
- Authorities read (requirements reading gate): `SKILL.md`, `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/handoff.md`, `references/ticket-scope.md`, `templates/investigation-notes-template.md` (2026-10-21; skill updated that day)
- Investigation status: in progress. Corpus facts, code study and the DDNS ground truth are done; the summary and search experiments are running.

## Initial Request And Clarifications

- **Original request (`autobyteus-185`):**
  - A new agent session asks a vague question, for example "Do you remember the DDNS / domain updater we set up? Where is it?".
  - It gets back a pointer: who did it, the run ID, the date, the journal file and section, a 2–3 line snippet, the strength and the match kind.
  - Best match per run; only fields that have a value.
  - Search all agents on this node. Reuse the embedding layer (`autobyteus-71`) and the Memory page services.
- **User decision (from the Task):** do not rely on runtime-provided compaction summaries.
- **Clarification 1 (user, 2026-10-21):** "check whether it's possible to create a summary for each work journal ourselves… some work journal is super big… are there any model which we are able to use… do experiments… then we can even create an index."
- **Clarification 2 (user, 2026-10-21):**
  - "you are free to do experiments… as long as our local Mac is able to support you."
  - "Gemma 4 31B … is not going to support you … runs very, very slow … on the current machine, you're only able to use the MOE model."
  - Recorded as approval of the experiments (read-only and isolated copy) and as the constraint: MoE models only on this Mac.
- **User-supplied constraints (Task):**
  - Test read-only or on an isolated copy.
  - Never print journal contents into reports.
  - Journals can hold secrets and private paths.
  - No journals from other nodes unless the user sets that up.
  - Any change to the user's data needs approval and a backup.

## Source Log

| Date | Type | Source | Why | Finding |
| --- | --- | --- | --- | --- |
| 2026-10-21 | Doc | `autobyteus-server-ts/docs/modules/agent_work_journal.md` | Journal format and lifecycle | Journal is derived from raw traces, deterministic, no model. One file per raw segment plus the active file. Written by `WorkJournalService.ensureCurrent` only. "No startup scan": an old run gets its journal "the first time its journal is needed". |
| 2026-10-21 | Code | `src/agent-work-journal/services/work-journal-service.ts`, `domain/work-journal-models.ts` | Public boundary | `ensureCurrent({runId, memoryDir, runtimeKind})` → `WorkJournalPackage {files[{path, sourceFile, state}], evidenceHash}`. Manifest keeps `content_sha256` per file. Closed files are reused; the open file is re-rendered. |
| 2026-10-21 | Command | `git log -- autobyteus-server-ts/src/agent-work-journal` | When journals started | First commit `d98c213afc` on 2026-10-19 |
| 2026-10-21 | Code | `src/agent-memory/services/agent-memory-explorer-service.ts`, `team-memory-explorer-service.ts`, `collaboration-root-memory-catalog.ts`, `memory-explorer-source-service.ts` | Reuse for "who / when" | Explorer groups runs by agent definition with name, summary, workspace and createdAt. Team/org catalogs give member address, display name, `groupPath` and `agentRunId`. Imported sources (other nodes) are separate roots (`imports/`), read-only. |
| 2026-10-21 | Code | `src/agent-memory/store/agent-memory-layout.ts` | Where runs live | `agents/<runId>`, `agent_teams/<teamRunId>[/<ancestors>]/<memberRunId>`, `agent_orgs/<orgRunId>/...`, `agents/<hostRunId>/collaboration/...` |
| 2026-10-21 | Code | `autobyteus-ts/src/memory/store/run-memory-file-store.ts:32-58` | Can a reader modify data? | `readJsonl` **truncates the file** when its last line is incomplete (crash repair). Reading raw traces of a live run through this path can write to user data. |
| 2026-10-21 | Data | Read-only metadata scan of `~/.autobyteus/server-data/memory` (sizes, mtimes, counts; no content) | Corpus and coverage | See Persisted Data |
| 2026-10-21 | Data | `rg -c -i` for ddns / dynamic dns / domain updater / duckdns / dyndns (counts and paths only) | DDNS ground truth | 172 files in 139 runs. See Runtime findings. |
| 2026-10-21 | Runtime | LM Studio 1234, `qwen/qwen3.6-35b-a3b` MLX 4-bit, 64k context, on repository docs (no journal text) | Local model speed | See Runtime findings |
| 2026-10-21 | Web | Searches listed in § External | Models and memory practice | See External |

## Relevant Existing Behavior

| ID | Kind | Trigger | Current behavior | Evidence |
| --- | --- | --- | --- | --- |
| BEH-001 | System | Run turn completed / interrupted / compaction | `WorkJournalRunUpdater` keeps a **live** run's journal current, after the memory recorder is idle | module doc § Keeping It Current |
| BEH-002 | System | Old or restored run | No journal until something calls `ensureCurrent`; no backfill | module doc; `existed:false` for 3,564 of 3,654 runs (probe) |
| BEH-003 | User | Memory page | Lists agents / teams / orgs with memory, filtered by a substring over name, summary, run ID and workspace path. **Not** over content. | explorer services |
| BEH-004 | Agent | `search_project_tasks(project_id, query)` | Exact tier plus meaning tier over Tasks of one Project; local embeddings | `autobyteus-71` |
| BEH-005 | Agent | — | No current supported behavior for searching past work across runs | — |

## Persisted Data And State Facts

Measured 2026-10-21, metadata only:

- **Local run folders with raw traces:** 3,654 in total.
  - By family: `agents/` 706, `agent_teams/` 2,832 (team members), `agent_orgs/` 116.
  - The Task's "256 folders" most likely counted top-level `agents/` folders on another basis. This count includes team and org members.
  - Raw traces total **8,048 MB**.
- **Runs with a journal today:** **90**.
  - 221 files, 84.0 MB.
  - Per run: median 434 KB, p90 2.2 MB, max 6.3 MB; 20 runs over 1 MB.
  - Per file: median 244 KB, p90 958 KB, max 1.96 MB.
- **Runs without a journal:**
  - 31 active since 2026-10-19 (36.7 MB raw);
  - **3,533 older ones (7,680 MB raw, 95% of history)**.
- **Why most runs have none:** journals began on 2026-10-19 and are produced only for live runs or on demand (BEH-002).
- **Raw to journal ratio:** for the 90 journaled runs, 331 MB raw became 84 MB of journal (≈ 4 : 1).
- **Imports from other nodes:** `imports/` holds 415 raw-trace folders and 8 journals. Out of scope by default (Task safety rule).
- **Privacy:** journals hold commands, file paths, tool results and user text, so they can hold secrets.
- **Acceptable rebuild:** the journal is derived (deletable and rebuilt from raw traces); a search index would be derived the same way.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Established | Implication |
| --- | --- | --- | --- | --- |
| `rg -c` hit table per run (counts and paths only) | DDNS ground truth | 139 runs mention the words. The top run, `agents/codex_45ce…` (Codex, workspace `autobyteus_mcps`, 2026-08-25), has 137 hits in 25 tool calls, 43 tool results and 31 assistant messages; its first request is an infrastructure task on a remote server. The next runs only *read* a file mentioning DDNS (daily assistant, tutorial producer) or *edited this Task* (project task manager). The current solution-designer run (this ticket) also matches. | Measured | (1) The answer run **has no journal**, so the scenario fails today without backfill. (2) Plain word search returns 139 runs, so ranking is essential. (3) Self-references (runs *about* the search) must not outrank the work itself. |
| Per-record classification of hits (record types and tool names only; first user message cut to 160 chars with long tokens masked) | Ground truth check | Codex run hits are in `run_script`, `search_web` and browser tools; the others are in `Read` results | Measured | Ground truth: `codex_45ce1b9e80ea42db869dc86615d51fc3` |
| LM Studio `/api/v0/chat/completions`, Qwen3.6-35B-A3B MLX 4-bit, repo docs | Speed | Prompt 8.8k tokens: prefill 647 tok/s, decode 55 tok/s. Prompt 26.9k tokens: prefill 562 tok/s, decode 45 tok/s. | Measured | ≈ 22M tokens (84 MB) ≈ 11 h of prefill; the whole history (≈ 2 GB of journals estimated) would take days |
| `/v1/chat/completions` with `reasoning_effort: "none"` | Thinking off | 6 completion tokens, no reasoning, versus 199 tokens without it | Measured | The standard OpenAI parameter works; `chat_template_kwargs` and `/no_think` do not |
| Probe `probes-wjs/render-journals.probe.ts` (real `WorkJournalService`) on an isolated copy `/tmp/wjs-copy/memory` (raw traces, manifests and metadata; 7.6 GB; rsync in 46 s) | Backfill journals | Running; DDNS run: 11 files, 1.53 MB, rendered in 73 ms | Measured (partial) | Backfill is cheap (no model) |

### Experiment Results (2026-10-21, isolated copy, all measured)

Known-answer set `/tmp/wjs-probe/queries.json`:
- 25 queries, paraphrased from run purposes with different words (4 in Chinese), plus 3 off-topic.
- Ground truth by run ID; any of several runs counts where the work was repeated.
- No journal text in this report.

| Step | Result |
| --- | --- |
| **Backfill** (real `WorkJournalService` over the copy) | 3,654 runs, **0 errors, 104 s**, 7,385 files, **1,709.7 MB** of journal. Per run: median 187 KB, p90 906 KB, p99 5.0 MB, max 22.6 MB; 323 runs over 1 MB. Runtimes: Codex 2,257, AutoByteus 820 (includes runs with an unknown runtime), Claude 546, Antigravity 31. |
| **Composition** (all journals) | Teams 1,531 MB, orgs 112 MB, standalone 57 MB. By kind: tool output detail 1,396 MB (82%), dialogue lines (User / Agent / teammate messages) 180 MB, action lines 125 MB. |
| **Text tier** (SQLite FTS5 `unicode61`, 2,000-character entry-aligned chunks, BM25 OR query, best chunk per run) | 1,054,429 chunks, **built in 90 s** (182 s with the CJK split). 3.3 GB, because the probe stores the text; external content would avoid that. Query 20–1,800 ms. |
| Text tier, first run | hit@1 12/25, hit@5 16/25, MRR 0.558. All 4 Chinese queries returned nothing: `unicode61` keeps a Chinese run as one token. |
| Text tier with CJK split (each CJK character a token; query as overlapping 2-character phrases) | hit@1 16/25, hit@5 20/25, MRR 0.712 |
| Text tier, Memory Compactor runs excluded | **hit@1 17/25, hit@5 20/25, MRR 0.738.** Compactor runs hold copies of other runs' memory and outranked the original once. |
| **Meaning tier** (Granite R2, one deterministic card per journal file: agent, first 6 requests, first 8 reply openings, 25 distinct actions; ≤ 2,400 characters) | 7,385 vectors in **3,499 s** (partly shared with the LLM). **hit@1 16/25, hit@5 18/25, MRR 0.689.** Fails on the long DDNS question (#41), Chinese (Granite is English) and two others. Off-topic top scores 0.74–0.83 overlap true hits 0.80–0.92, so there is no usable absolute floor (as in FO-001). |
| **Fusion** | RRF: hit@1 15, hit@5 21, MRR 0.708. **Interleave** (alternate text and meaning lists, deduplicated): **hit@1 17, hit@3 21, hit@5 22/25, MRR 0.775.** Remaining misses: "airplane shooter" vs "jet" (#16), "desktop shell framework" vs Electron (#45), "run settings forms" (#28). |
| **DDNS** | Q01 (the user's wording) is #1 by text and #1 interleaved. Q02 and Q03 are #1 in both tiers. Self-references: the current solution-designer run and the PTM run that wrote this Task rank #2 and #3 for Q01 by text. |
| **Decisions use case** (PTM input, 2026-10-21) | FTS5 over 2,143 core ticket documents (requirements, design, investigation, release notes, follow-ups, revision records in `tickets/done/`, plus `task-results/*/report.md`): 50.6 MB, 46,954 sections, **built in 2.2 s**. Results: "Why did we not integrate login/sign-in … Claude and Antigravity?" gives the provider-terms report (`autobyteus-234`) at #1 and `runtime-lifecycle-review` E-R21 (`autobyteus-207`) at #2. "why is there no Claude sign-in button" gives `runtime-lifecycle-review` § User Direction at #1. Journals for the same question: 620 runs, none clearly the decision. |
| **LLM summary, full text** (Qwen3.6-35B-A3B MLX 4-bit, map-reduce over 60k-character windows, `reasoning_effort: none`) | DDNS run (1.53 MB, 11 files): **579,724 prompt tokens, 45 calls, 1,727 s**. Journals are **2.64 characters per token**. The run summary names the Dynamic DNS setup (domain, provider, router); files 4 and 5 hold it. It contains server IPs, a domain and private folder paths. |
| **LLM summary, skeleton** (dialogue and action lines only) | Same run: **174,241 tokens (30%), 14 calls, 838 s** (shared with Granite). Still names DynDNS on the provider in the run summary and in files 4 and 5. Quality close to the full-text summary. |
| **Cost projection** (measured rates) | Full-text summaries: 84 MB of current journals ≈ 32M tokens ≈ 16 h; all history (1.7 GB) ≈ 650M tokens ≈ **13 days**. Skeleton summaries for all history ≈ 115M tokens ≈ 2–3 days. Runs active in the last 30 days hold 802 MB of journal (≤ 27 MB/day upper bound), so keeping summaries current ≈ 50 min/day (skeleton) or 4–5 h/day (full) of GPU on this Mac. |
| **Embedding speed** | Granite WASM, idle: 10.4/s at 600 characters, 4.8/s at 1,200, 2.4/s at 2,400, so **≈ 6 KB/s** whatever the size (1.4/s at 2,400 while the LLM ran). LM Studio nomic-embed-text v1.5 on the GPU: 7.5/s at 1,800 characters ≈ 13.5 KB/s, only about 2× faster. Projections: chunk vectors for all journals ≈ 79 h; skeleton ≈ 14 h; per-file cards ≈ 1 h. |
| **Local models** | Qwen3.6-35B-A3B (MLX 4-bit, 19 GB loaded): prefill 560–650 tok/s, decode 45–64 tok/s. Gemma 4 31B (dense) excluded by the user (too slow). Gemma 4 26B-A4B MLX 4-bit (15.6 GB): first download flagged "Checksum failed" by LM Studio on 3 small files that are byte-identical to Hugging Face's current files; a retry fixed it; loads in 24 s and answers. gpt-oss-20b: download incomplete (6 of 12 GB). Comparison pending the user's choice. |

### Summary Experiment (2026-10-21, measured)

| Step | Result |
| --- | --- |
| **Real daily growth** (raw record timestamps, last 30 days) | Raw 64.5 MB/day mean (max 133.9), so **journal ≈ 13.7 MB/day** (max 28.5) at the measured 0.21 ratio. Skeleton summaries ≈ 1.5M tokens/day ≈ 40 min/day of Qwen3.6 on this Mac; full-text summaries ≈ 2.4 h/day. Backlog: skeleton ≈ 195M tokens ≈ 4 days of GPU once (the user accepts a one-time cost, 2026-10-21). |
| **Model comparison, same workload** (DDNS run, skeleton, nothing else running) | Qwen3.6-35B-A3B: 174k tokens, **471 s**. Gemma 4 26B-A4B: 182k tokens, **571 s**. Quality similar: both name DynDNS on the provider, in files 4 and 5 and in the run summary. Gemma used fewer search terms and added Markdown formatting. |
| **Clean speed test** (repo docs) | Qwen: prefill 406–536 tok/s, decode 45–54. Gemma 4 26B: prefill 273–451, decode 38–41. Qwen 19 GB loaded, Gemma 15.6 GB. |
| **Context fit** (all 7,385 journal files, 2.64 characters/token) | Full file: median 74k tokens, p90 139k, p99 466k, max 2.53M. Fits 64k: 35%; 128k: 86%; 262k: 96%. Skeleton: median 9.4k, p90 26k, p99 145k, max 741k. Fits 64k: 96%; 262k: 99.6%. **Over 262k tokens (full):** Claude 126 of 592 files (21%), Codex 116 of 5,663, AutoByteus 35 of 1,097, Antigravity 1 of 33. Skeleton over 262k: 31 files. Late compaction with 1M-context models makes big segments (the user's explanation; supported). |
| **Batch** (Qwen, skeleton, 60,000-character windows, recursive merge) | 233 of 281 runs before the 2 h background limit stopped it (not restarted). 26.7 MB of journal, 2.29M prompt tokens, 6,414 s, about 360 tok/s effective. Largest job: a 5.0 MB Claude run in 28 calls, 385k tokens, 949 s. 15 Claude runs summarized. |
| **Search with summaries** (corpus = the 234 summarized runs, so every method sees the same runs; 541 summary vectors embedded in 84 s) | Text hit@1 20, hit@5 25, MRR 0.881. Cards hit@1 21, hit@5 24, MRR 0.889. **Summary hit@1 22, hit@5 22, MRR 0.883.** Text+cards MRR 0.893. **Text+summary hit@3 25, MRR 0.900.** All three together MRR 0.893. Summaries are best at top-1 for paraphrases ("airplane"/"jet", "GitHub command line", "online store for iPhones"). They fail Chinese queries (#77, #24; summaries are written in English and Granite is English) and one short title query (#88). On a corpus this small all methods are close to the ceiling, so it shows no large ranking gain. |
| **Secret scan of 566 summary files** (pattern counts only) | API keys, GitHub tokens, AWS keys, private-key blocks, JWTs, `password=`: **0**. 14 long mixed-case strings: all file names (checked by context, values not printed). `[secret]` marker (the model masked something as instructed): 2 files. IPv4 addresses: 37 files. Home-directory paths: 285 files (UD-002). |

### Scenario: Fresh Copy In Another Workspace (PTM input 2026-10-22; use case file `autobyteus-delivery-receipts/memory-use-cases/use-case-fresh-copy-other-workspace.md`)

- **Asker:** a new Project Task Manager copy in the website workspace.
- **Source:** a Daily Assistant run (`daily_assistant_1d9a…`, Claude runtime) in a business-applications workspace; named details are in the private evidence folder (§ Evidence Location).
  - Read-only counts: 508 hits for the application's name and 18 for the new product positioning.
  - Other runs in that workspace: `codex_7e59…` (56 hits), `eb2d…`, `5e43…`, `3e52…`.
- **Freshness finding:** the copy taken 2026-10-21 08:14 had **0** mentions of the new name. The rename happened later that day (raw traces changed at 18:02). The run was refreshed into the copy (read-only rsync), re-rendered (3 files) and re-indexed (1,638 text chunks, 3 cards).
- **Run layout:** it spans 3 journal files. File 1 covers 2026-09-30 → 10-11, file 2 covers 10-12 → 10-20, and the active file is 10-21. **The new name appears only in the active file (2026-10-21).**

| Query | Text | Meaning (cards) | Interleave | Where the text pointer lands |
| --- | --- | --- | --- | --- |
| Q26 the user's full cue (the application's name + the new positioning) | #1 (#2 is `codex_7e59…`, same workspace) | #1 | #1 | Newest file, but not on the new-name lines |
| Q27 "what do we call our product now…" (no new name) | #3 (#1 is the PTM run: self-reference) | not in the top 400 | #5 | **Oldest file (2026-09-30 → 10-11), where the old name is** |
| Q28 a vague cue for the same application work | #2 (another run in the same workspace) | #40 | #2 | — |
| Q29 the same cue in Chinese | #1 | not found | #1 | Oldest file |

- **Totals (29 positive queries):** text hit@1 19, hit@5 24. **Interleave hit@1 19, hit@3 24, hit@5 26, MRR 0.761.**
- **Findings:**
  1. Cross-agent, cross-workspace recall works because the index covers all local runs (an access decision for the user, UD-005).
  2. **The newest fact does not win.** BM25 best-chunk ranking ignores dates, so the pointer went to the oldest section.
  3. **Cards are front-loaded** (first requests and replies of a file), so they miss a decision made late in a file. Summaries cover the whole file.
  4. Freshness of hours matters: the rename was a few hours old.
  5. Self-reference again: the PTM run that discussed the scenario ranks #1 for Q27.

### Context Header Per Chunk (user idea, 2026-10-22, measured)

- **Header:** `Agent: <name> · Workspace: <folder> · Day: <date>` plus `Request: <the user request or teammate message in force>`. It is prepended to every entry-aligned chunk, deterministic, no model.
- **Build:** 1,054,686 chunks in 69 s.
- **Fresh questions added:**
  - Q30 (a news-check question): **unanswerable**. Its run folder has only `run_metadata.json` and no raw traces. 35 of 742 standalone folders (6 catalog runs, mostly June) have no recorded history.
  - Q31 "disposable online payment card outside America".
  - Q32 "a second team modelled on the children's storybook team".

| Method (31 answerable questions, all 3,654 runs, compactor excluded) | #1 | Top 3 | Top 5 | Top 10 | MRR |
| --- | --- | --- | --- | --- | --- |
| Plain text | 19 | 23 | 25 | 26 | 0.694 |
| **Text with header** | **22** | 23 | 24 | 26 | 0.745 |
| Cards (meaning) | 19 | 21 | 21 | 23 | 0.653 |
| Plain text + cards (interleave) | 19 | 26 | 28 | 28 | 0.744 |
| **Text with header + cards (interleave)** | **22** | **27** | **28** | 28 | **0.802** |

- **The header helps where the who or where is part of the cue:**
  - "what do we call our product now" goes from #3 to #1 (the workspace name);
  - a document-analysis question goes from #2 to #1;
  - German grammar PDF goes from #2 to #1.
- **It slightly hurts four paraphrase queries:** a few ranks lower; the meaning tier covers them.
- **Fresh questions:** Q31 and Q32 are both **#2 combined**. The meaning cards find them at #1; plain text puts Q32 at #147.

### Design Validation (user request 2026-10-22: chunk size, tool contract, and how the agent finds the information)

**V1. Chunk size** (plain entry-aligned chunks, no header, no summary; fields run, file, line range, day; 31 answerable questions; all 3,654 runs):

| Max chunk | Chunks | Build | Lines per chunk (median / p90) | Text #1 / top 5 | Text + cards #1 / top 3 / top 5 / MRR | Query p50 / p90 |
| --- | --- | --- | --- | --- | --- | --- |
| 1,000 characters | 2,045,487 | 80 s | 7 / 15 | 15 / 24 | 15 / 25 / 28 / 0.660 | 962 / 1,818 ms |
| **2,000 characters** | 1,109,536 | 70 s | **13 / 28** | 19 / 24 | **19 / 26 / 28 / 0.744** | 670 / 1,282 ms |
| 4,000 characters | 594,569 | 60 s | 27 / 45 | 18 / 24 | 18 / 27 / 28 / 0.726 | 646 / 1,183 ms |

**V2. Meaning unit fit** (Granite R2 tokenizer, real counts):
- **Cards:** median 732 tokens, p90 825, max 2,419. **68 of 7,385 are over 1,024 tokens** and are cut off; most are Chinese-heavy (about 1 character per token). The limit must be counted in tokens, not characters.
- **Whole-file coverage alternative:** "dialogue chunks" (User and Agent text only, ≤ 3,000 characters, cut at entry boundaries) give 28,902 pieces, 62 MB, about 3 h once at the measured rate. With teammate messages: 43,252 pieces, 94.5 MB, about 4.4 h. The embedding run is in progress, to compare with cards.

**V3. Can an agent get from the pointer to the answer?**

Setup:
- Local agent: Qwen3.6-35B-A3B via LM Studio, tool calling, thinking off. **Nothing leaves the machine.**
- Tools:
  - `search_memory(query, since?, until?, limit?)`: probe backend; 2,000-character text chunks interleaved with cards; pointers with masked snippets;
  - `read_file(path, start_line, end_line)`: the shape of AutoByteus `read_file`; ≤ 200 lines.
- 13 natural questions; DDNS excluded at the user's request.

Results (first run, 8 steps max):

| Outcome | Count | Questions |
| --- | --- | --- |
| Right run in the first search's top 5 | **12 / 13** | Missing: Q27 "what do we call our product now" |
| Opened the right run's journal | 10 / 13 | |
| Answered from the right run and cited it (run ID in the answer) | 7 / 13 | Q05, Q09, Q12, Q17, Q20, Q29, Q31 |
| Opened it but did not cite | 2 | Q15, Q32 |
| Mixed in another run | 1 | Q15: answered from a different run's content |
| Lost or step limit | 2 | Q14 (`gh` in the image: 5 searches among many Dockerfile team runs, never opened #4); Q26 (kept verifying; also tried to read the original workspace file, which the probe's `read_file` refuses) |
| Ambiguous ground truth | 1 | Q21: a team run also built an Apple shop |
| Newest fact lost | 1 | Q27: answered with the 2026-10-14 positioning, not the 2026-10-21 one; did not use `since` |

Retry of 5 with an improved description and a `source` line, 12 steps max:
- Q32 now cites its source.
- Q14, Q15 and Q26 still loop: they keep searching and reading.
- Q27 answers "AutoByteus" (the name) from the PTM run (self-reference) and a 10-14 run, again missing the 10-21 positioning.

Findings for the design:
1. **Retrieval is good** (12 of 13 in the first top 5).
2. The **agent loop** is the weak part with this local model: it doesn't stop, and it mixes runs. Production agents use stronger models, but testing them sends journal text to a provider (a user decision).
3. **"What is true now" needs semantic memory** (`autobyteus-233`); episodic search plus guidance did not fix it.
4. A **`source` line helps citation**.
5. Pointers to workspace files outside memory need the cross-workspace policy (UD-005).

### Two-Gate Evaluation (user definition, 2026-10-23)

The user's rule:
- **Gate 1 (must): if the work is in a journal, the search must find it.**
- **Gate 2 (only for questions that passed gate 1):** how quickly the target is reached, in steps and time.

Operational definition used: the right run is in the tool's top 10 within at most 3 searches (the agent may rephrase).

- **Gate 1, one search, top 10 (31 answerable questions):** 28 strictly.
  - Agent re-run of the 4 failures: "desktop shell framework" **passes at search #3**. The agent read a result, learned "Electron" and searched again.
  - "Airplane shooter" and "run settings forms" were **ground-truth gaps**. The agent found other valid runs: another jet-game run (#5 of its first search; the run title is just "hello…") and the team runs that did the run-settings work (#1). The answer lists were extended.
  - **Remaining failure: "what do we call our main product now?"** The right run is never in the results; the agent answers from older runs and its own PTM run. This is the semantic-memory case (`autobyteus-233`).
  - **Result: 30 of 31 pass gate 1;** the one failure is a "what is true now" question.
- **Gate 2 (passed questions):**
  - Ranked test: #1 for 19, #2–3 for 7, #4–10 for 2 (before the ground-truth correction).
  - Agent test: the right journal was opened at step 2 (right after the first search) for 9 of 12. Answer time 11–33 s for clean cases; up to 195 s when the local agent loops.
  - Search latency: meaning 10–15 ms (query embedding) + 0.5 ms (card scan); text p50 0.2 s, p90 0.9 s, max 1.2 s (1.1M chunks). Plus 0.4 s once to load the model after 10 idle minutes.

### Cards vs Whole-File Dialogue Pieces (completed 2026-10-23)

- **Dialogue pieces:** User and Agent text, ≤ 3,000 characters, cut at entry boundaries.
  - 28,902 pieces embedded in four parts: 4,285 s; 6,789 s for 2,752 pieces, a slow run of unknown cause (sleep or contention); 4,267 s; 4,703 s.
  - About 4.4 h at normal speed, against about 1 h for cards.

| Setup (31 answerable questions, one search) | Gate 1 (top 10) | #1 | Top 3 | MRR |
| --- | --- | --- | --- | --- |
| Text | 27 | 20 | 25 | 0.731 |
| Cards | 24 | 19 | 22 | 0.662 |
| Dialogue pieces | 25 | 18 | 23 | 0.675 |
| **Text + cards** | **30** | **20** | **27** | **0.780** |
| Text + dialogue | 30 | 20 | 26 | 0.768 |
| Text + cards + dialogue | 30 | 20 | 27 | 0.776 |

- **Alone, dialogue pieces beat cards on late or long content:** DDNS #2 against #41, the product-name-now question #8 against not found, the scenario's vague cue #3 against #40. **Combined with text there is no gain,** because text already covers those runs.
- **The only gate-1 failure in every setup is "desktop shell framework" (Electron),** #36–51. The agent passes it by rephrasing (search #3).
- **Technical decision: text + cards for stage 1.** Dialogue pieces are the measured alternative.

### Baseline Without The Index: Keywords + One `rg` (user request, 2026-10-23)

- **Method:** each question is split into keywords with the same rule as the text index (stop words removed; Chinese as 2-character literals). One `rg -o -i -F -e k1 -e k2 …` runs over all 7,385 journal files (1.7 GB, OS file cache warm). Runs are ranked (a) by total hits, (b) by the number of different keywords found, then hits. Memory Compactor runs excluded. 31 answerable questions.

| | `rg` ranked by hits | `rg` ranked by distinct keywords | `search_memory` (text + cards) |
| --- | --- | --- | --- |
| Gate 1: right run in top 10 | **5 / 31** | **16 / 31** | **30 / 31** |
| #1 | 0 | 4 | 20 |
| Top 3 | 2 | 11 | 27 |
| MRR | 0.063 | 0.263 | 0.780 |
| Time per question | `rg` p50 0.67 s, p90 2.65 s, max 4.55 s | same | p50 0.2 s, p90 0.9 s, max 1.2 s |
| What comes back | p50 **465,859 matching lines**, max 9.7 million; p50 3,098 of 3,654 runs match | same | at most 10 runs, each with file:lines and a snippet |

- **Why `rg` fails:**
  - Ordinary words ("game", "file", "product") occur in almost every run. `rg` finds *where* words are but not *which run is about them*.
  - An agent would get a few thousand characters of that output (tools cut it), with no ranking.
  - Ranking by distinct keywords, which an agent can only approximate with several piped commands, reaches 16 of 31.
- **Where `rg` is good:** rare, exact terms (a game named by its animals #1, two Chinese questions #1, DDNS #2). The text index keeps this strength and adds ranking (BM25: rare words weigh more, frequent words less).
- **Not measured:** an agent doing several refined `rg` rounds. The one-shot result shows the starting point it would have to improve from.

- **Temporary diagnostics:**
  - probe files under `autobyteus-server-ts/probes-wjs/` and `vitest.probe.config.ts` (untracked, excluded);
  - scripts in `/tmp/wjs-probe/`;
  - the copy in `/tmp/wjs-copy/`.
  - All are removed at the end of the investigation.
- **Reproduction for implementation:** the DDNS query against the copy (to be frozen as a known-answer set without journal text).

## External Contracts, Standards, And Dependencies

Web research, 2026-10-21. Claims are from the sources unless marked measured.

| Topic | Source | Claim | Strength |
| --- | --- | --- | --- |
| Summary vs original text | AMA-Bench, arXiv 2602.22769 | Recurrent summarization memory is "inherently lossy": early details get compressed away | Paper |
| Summary vs original text | WhenLoss, arXiv 2605.24579 | Compares verbatim chunks with summary and tree memories on LongMemEval; gains come from write-side compression, not the retriever | Paper |
| Summary vs original text | memoryplugin.com hierarchical-memory wiki (citing the HippoRAG 2 evaluation) | Summary-heavy indexes (RAPTOR 48.8 F1) lose to plain retrieval on simple factual questions; summaries help global questions | Secondary |
| Retrieval tuning | MemMachine, alphaxiv 2604.04853 | 93.0% on LongMemEval-S; retrieval tuning mattered more than ingestion changes | Paper (self-reported) |
| Vendor memory | mem0.ai/research-3 | 94.4 on LongMemEval, below 7k tokens per retrieval | Vendor claim |
| Local MoE models | computingforgeeks open-source LLM table; avinashsangle Gemma 4 guide; pinggy, daily.dev 2026 lists | Gemma 4 26B-A4B (≈3.8B active, 16–18 GB at 4-bit); gpt-oss-20b (3.6B active, ≈14 GB); Qwen3.6-35B-A3B (3B active, ≈23 GB). No independent summarization benchmark found. | Blogs |
| Qwen3.6 on M1 Max | lilting.ch test; willitrunai estimate | ≈27 tok/s decode with Ollama GGUF; MLX said to be faster | Blog; measured locally 45–64 tok/s decode with MLX |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Status |
| --- | --- | --- | --- |
| U-1 | Unknown | Journal token density (chars per token) | Probe running |
| U-2 | Unknown | Whether local summaries keep the "where" (paths, hosts) needed by the DDNS question | Probe running |
| R-1 | Risk | Summaries may copy secrets from journals | Measure: scan outputs for secret patterns (counts only) |
| R-2 | Risk | Reading raw traces of live runs can truncate them (`readJsonl` repair) | Design: the index reads journals only, and only the journal service reads raw traces |
| R-3 | Risk | Self-reference: runs about searching DDNS rank above the DDNS work | Measure in the search probe |

## Notes For Architecture Design

- The journal backfill exists as a service call (`ensureCurrent`) and costs milliseconds per run. Ownership of backfill and index freshness stays with the journal service's consumers.
- Attribution comes from the explorer services; don't build a second catalog.
- Collections of the embedding layer are owned by the consumer: `work-journals/<…>`.

## Architecture Investigation Findings (2026-10-26, base `ddd6fdcdf6`)

| ID | Source (path:line) | Observation | Design implication |
| --- | --- | --- | --- |
| AE-01 | `autobyteus-server-ts/src/agent-work-journal/domain/work-journal-models.ts:10-14` | `WorkJournalTarget.runtimeKind: RuntimeKind` is required | Old runs whose runtime is not recorded need an explicit "not recorded" value |
| AE-02 | `agent-work-journal/rendering/work-journal-file-renderer.ts:26,69`; `rendering/runtimes/runtime-translation.ts` (end of file) | The renderer already takes `runtimeKind: RuntimeKind \| null`; null = "no runtime named: every tool uses the generic rule" | Pass null through the service target; no new rendering rule |
| AE-03 | `agent-work-journal/services/work-journal-service.ts:48-54` | `ensureCurrent` is the only public entry and only writer; per-folder serialization | The pipeline's Journals step calls `ensureCurrent`; nothing else writes journals |
| AE-04 | `agent-work-journal/services/work-journal-run-updater.ts:84-93` | After each turn end or compaction: `waitForIdle`, then `ensureCurrent`; errors logged | Live journal changes happen here; the index learns of them through a notification from the journal service, not by the updater calling memory search |
| AE-05 | `embeddings/embedding-index.ts:106-116, 118-121` | `search` re-syncs the complete item list on every call; `sync` brings a collection in step | The pipeline owns `sync`; search must not need the item list |
| AE-06 | `embeddings/embedding-index.ts:351-368`; `embeddings/relevance.ts` | `query` returns only items passing `selectRelevant` (floor + near-best margin, per model) | Memory search needs nearest items without the cut, plus the layer's own relevant flag: a new `nearest` query on the boundary |
| AE-07 | `embeddings/collection-indexing-job.ts:66-72, 84-90` | Fingerprint-based incremental embedding; fresh vectors only | Meaning step = one collection of journal cards, synced on change |
| AE-08 | `agent-tools/project-tasks/project-task-tool-manifest.ts` (end of file); `agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.ts`; `startup/agent-tool-loader.ts:46` | Node-local tools: one manifest (name, description, schema, execute), wrapped as native tools (loader spec) and MCP adapters; selection per agent is session-owned | `search_memory` follows this pattern in its own `agent-tools/memory/` family |
| AE-09 | `agent-tools/mcp/agent-tool-mcp-session.ts:28-32`; `autobyteus-ts/src/tools/base-tool.ts:36,63` | MCP sessions carry the owner `runId`; native tools carry `agentId` | Both entry forms can pass the asking run for R-004 |
| AE-10 | `api/graphql/types/memory-view.ts:136-210` | Run memory views are split by subject: standalone `runId`; team `teamRunId` + `agentRunId`; org `orgRunId` + `agentRunId`; flags `includeEpisodic` / `includeSemantic` | The Work Journal read follows the same subject split; the episodic/semantic flags are derived consumers of the tab removal |
| AE-11 | `agent-memory/services/agent-memory-service.ts:14-15,35-36,50-51`; `agent-memory/services/memory-run-summary-builder.ts:30-31,47-48,80-81`; `agent-memory/store/memory-file-store.ts` (`readEpisodic` / `readSemantic`); `api/graphql/types/memory-explorer-schema.ts` (availability fields) | Server readers and availability flags of the old per-run files | Removed with the tabs (touched files, Principle 7) |
| AE-12 | `run-history/services/team-run-execution-tree-location-service.ts:15-29, 98-101`; `run-history/domain/run-execution-tree-shared-records.ts:26-34` | Located team executions give address, `agentRunId`, group path, `memoryDir`, the tree and each member's `launchConfiguration` (runtime, workspace); only admitted roots are listed | Attribution of team and task-team members as recorded; old-format folders fall back to the folder walk |
| AE-13 | `agent-memory/store/agent-memory-layout.ts:47-57, 86-88`; `agent-memory/store/memory-file-store.ts:53` | The layout owns the three family roots and agent-root collaboration dirs; `listRunDirs` lists `agents/` only | Find runs walks the three family roots through the layout |
| AE-14 | `services/server-settings-service.ts:183-190`; `embeddings/catalog/embedding-model-setting.ts` | Predefined settings: key, description, editable, `normalizeForPersistence`; read at use time | `AUTOBYTEUS_MEMORY_SEARCH_DEFAULT_LIMIT` follows it |
| AE-15 | `docs/design/startup_initialization_and_lazy_services.md` § Required Ordering, step 9 | Background tasks start after configuration and app-data migrations | Pipeline catch-up starts at step 9 or lazily, never at import |
| AE-16 | `node -e` (Node 22.23.1): `sqlite_version()` 3.51.3; `fts5(b, content='', contentless_delete=1)` created | Contentless FTS5 with deletes is available | Text index stores no copy of journal text; snippets come from the journal lines |
| AE-17 | `autobyteus-server-ts/docs/design/collaboration_model.md` § 3, CM-10 | Every run's own folder and memory, Work Journal included; delegated runs at their kind's place; no node reads another node's run | Coverage = this node's memory layout |
| AE-18 | `memory-sync/shared/memory-sync-path-policy.ts:7` | Memory Sync copies the memory folder (skips `.tmp` and similar) | The index lives under `<appData>/memory-search/`, outside the memory folder |
| AE-20 | Probe `readiness-root.probe.ts` on the complete copy (2026-10-26): `RootRunPackageReadinessIndex.rebuild()` | 702 team roots with a tree; 601 admitted; **all 101 task-team roots (tree with `taskAgent`) not admitted, without a diagnostic**; `TeamRootMemorySource.listRootRunIds()` and `readRoot()` therefore skip them (`team-root-memory-source.ts:41-43`, `collaboration-root-memory-catalog.ts` `collectRuns`) | Task teams are not root packages by design; the Teams explorer cannot list them. UD-008 needs a source for task-team roots |
| AE-21 | `run-history/store/task-agent-link-check.ts`; `agent-memory/services/agent-memory-explorer-service.ts` (`TaskAgentLinkChecker` in `buildGroups`); `agent-memory/store/agent-memory-layout.ts:86-88`; `web/components/memory/CollaborationMemoryDetail.vue:39-57` | A delegated run is linked from its coordinating run's tree (agent roots: `agents/<host>/collaboration/`); detached task agents are not listed; task teams show only inside a team or org root's detail as `TASK_TEAM` groups | Admission rule for task teams = still linked by the coordinating run; one shared reader for the task team's own tree, used by the Teams explorer and by memory-search discovery |
| AE-19 | `autobyteus-ts/src/memory/store/run-memory-file-store.ts:32-58` | The raw reader truncates a broken last line | Only the journal service reads raw traces; existing behavior stated in the design |

## Supplements

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `memory-search-evaluation-report.md`, `probes/` | Solution Designer | Measured evidence | Current |
| `product-design-request.md` | Solution Designer | Product brief | Done |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/work-journal-search/ui-ux-spec.md` (+ `visual-references/` VIS-001 to VIS-024, `design-review-notes.md`, `product-ticket.md`) | Product Team | Approved Memory page UI/UX (behavior-defining) | Approved by the user 2026-10-26 |

## Evidence Location

This repository is public. The exact test questions, per-question agent traces, per-run data and probe outputs that name personal or business matters are kept privately at `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/work-journal-search-evidence/` (local, not in any repository). This ticket keeps the method, the scripts and the numbers by question ID and category.
