# Requirements Document

## Document Status

- **Package:** `work-journal-search` (Project Task `autobyteus-185`, "Agent search over Work Journals across all agents"; the first step of `autobyteus-233`).
- **Status:** `Approved` (SR-006, 2026-10-27: strength labels removed by the user's decision; the Memory page spec revision goes through the Product Team).
- **Evidence:**
  - [investigation-notes.md](investigation-notes.md);
  - [memory-search-evaluation-report.md](memory-search-evaluation-report.md): 31 known-answer questions, the two gates, statistics, and baselines without an index;
  - private evidence in `autobyteus-delivery-receipts/work-journal-search-evidence/` (the repository is public).
- **Base:** `origin/personal` @ `ddd6fdcdf6`.
- **Solution revision:** SR-002.
- **Behavior-defining supplement:** the approved Memory page UI/UX specification (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/work-journal-search/ui-ux-spec.md`, approved by the user 2026-10-26: "Oh, I think that the UI is correct now. I feel it's good."). Its screenshots (VIS-001 to VIS-024) are normative.

## Problem And Desired Outcome

- **Problem:** an agent in a new session cannot find earlier work, its own or another agent's. Nothing searches the content of past runs:
  - the Memory page filters names and titles only;
  - many run titles are just "hello";
  - Work Journals existed for only 90 of 3,654 local runs on 2026-10-21, because journals began on 2026-10-19 and are made only for live runs.
  - Searching without an index fails: one `rg` with the question's keywords finds the right run in the top 10 for 16 of 31 questions. An agent with only `rg`/`grep` finds it within 3 searches for 2 of 16 (report § 8).
- **Desired outcome:**
  - An agent, or the user on the Memory page, asks in their own words, any language.
  - It gets back pointers to the runs that did the work: who, when, which journal file and lines, and a short snippet.
  - The agent then reads those lines itself; the search never answers or copies whole journals.
  - Every run on this node is covered, old and new; nothing leaves the machine; no language model is needed.

## Memory Model (User Direction, 2026-10-22)

The user's framing:
- **Procedural** memory is skills: how to do things.
- **Episodic** memory is the Work Journals: what happened and the progress, with dates.
- **Semantic** memory is what is true now. It is "what we miss right now".

Scope that follows:
- **This ticket:** episodic memory made findable and aware of time.
- **`autobyteus-233`:** semantic memory (facts built from episodes, with timelines, sources and the user's approval). Its sources are this ticket's pointers, so the result shape must be stable enough to cite.
- **Later:** learned procedural lessons.

## Relevant Current And Desired Behavior

| ID | Current | Desired |
| --- | --- | --- |
| BEH-001 | A live run's journal is kept current after each turn (`WorkJournalRunUpdater`) | Unchanged; the memory index follows journal changes |
| BEH-002 | Old runs get a journal only when something asks for it ("no startup scan") | Building the memory index makes every run's journal current first |
| BEH-003 | Memory page: Agents / Teams / Orgs lists filtered by name, title, run ID and path; run detail tabs Working context, Episodic, Semantic, Raw traces | The page gains memory search, a Work Journal view and the index panel; task teams are listed; the old per-run Episodic / Semantic tabs are removed (§ R-014) |
| BEH-004 | `search_project_tasks` searches one Project's Tasks | Unchanged; `search_memory` follows the same tool pattern |
| BEH-005 | No search over past work | `search_memory` for opted-in agents and a search box for the user |

## Stakeholders, Actors, And Outcomes

- **The user:** asks about past work through agents or the Memory page; starts and watches indexing; owns the data and the privacy decisions.
- **Agents:** only those whose definition selects `search_memory`.
- **The server:** owns the journals (journal service) and the memory index, and uses the active embedding model (`autobyteus-71` / `autobyteus-146`).

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- **UC-001:** An agent finds the run(s) that did a piece of work from a vague cue in different words (the DDNS questions; "a game with a bunny and a tortoise").
- **UC-002:** The same in Chinese.
- **UC-003:** Each result is a pointer the agent can open with its normal file tool: the journal file path and lines.
- **UC-004:** Work of another agent in another workspace is found (one memory per machine).
- **UC-005:** Old runs are found as well as new ones, including runs of retired or renamed agents, task teams and runs without metadata.
- **UC-006:** New work becomes findable shortly after the turn that did it.
- **UC-007:** The user searches memory on the Memory page and opens a result in the run's Work Journal at the matched lines.
- **UC-008:** The user starts the first build ("Index now"), watches progress, and rebuilds after an embedding model switch.

### Out Of Scope

- Memory imported from other nodes (`memory/imports/`) and other nodes' runs (CM-10). The Task's original DDNS story happened on another machine.
- Answering questions: the tool points; the agent reads.
- Runtime-provided compaction summaries (the user's decision in the Task).
- Our own LLM summaries (follow-up FU-005; the user: "we don't generate a summarize for now").
- Ticket documents and other repository files (UD-003; facts and decisions belong to `autobyteus-233`).
- A time filter, an agent filter or a workspace filter in the tool (§ R-001).
- Removing the unused per-run episodic/semantic code in `autobyteus-ts` and the server (FU-003).
- Rerankers (FU-002) and a configurable embedding token limit (FU-001).
- Repairing old-format team folders (the user: not needed).

### Non-Goals

- Semantic memory, project facts and decision logs (`autobyteus-233`).
- Per-project memories (UD-005).

### Preserved Behavior Boundary

- Raw traces stay the only authority; journals and the index are derived and can be deleted and rebuilt.
- Only the journal service reads raw traces. The raw reader repairs a file whose last line is broken by cutting that tail (`run-memory-file-store.ts:32-58`); that is existing behavior, and the index never reads raw traces.
- The embedding layer's public boundary and `search_project_tasks` stay as they are; memory search adds its own collection.
- The Memory page keeps its existing lists and Raw traces view.

### Prerequisites

- None. Checked 2026-10-24/25:
  - the memory layout is correct by `agent-memory-layout.ts` and `collaboration_model.md` § 3;
  - the journal service renders all runs without errors;
  - `autobyteus-71` is delivered.

### Review Authority

- The user approved each `Needs user` decision (§ Decisions) and approves this text.
- The Solution Designer decides technical choices within that direction, from the measurements.

## Requirements

| ID | Requirement |
| --- | --- |
| R-001 | **Agent tool `search_memory(query, limit?)`:** `query` is the cue in any words or language (required); `limit` is optional, 1–20; without it the server default applies: the server setting `AUTOBYTEUS_MEMORY_SEARCH_DEFAULT_LIMIT` (blank = 10; allowed 1–20; an invalid value falls back to 10 with one warning; read at use time, settable in the env file and the server settings list, like `AUTOBYTEUS_EMBEDDING_MODEL`). The maximum stays 20. Opt-in per agent definition; native and MCP exposure like `search_project_tasks`. **No time, agent or workspace filter** in this version (the user, 2026-10-23: people rarely remember when; a wrong filter would hide the right run). |
| R-002 | **Result: one entry per run, best first.** Only fields that have a value (`autobyteus-260`): agent name; team and member for team or org runs; run ID; workspace; first and latest day mentioned; a ready-to-cite source line; and 1–2 matches, each with the journal file path, lines, day, a 2–3 line snippet, and how it matched: `text` with **the query words found in it**, or `meaning` (no grade; the page shows no label for it, Product revision 2026-10-27). **No strength label** (UD-020, the user, 2026-10-27: embedding scores have no reliable absolute meaning). Best match per run, so one run does not fill the list. |
| R-003 | **Two kinds of matching, kept separate and alternated:** text (words; any language, Chinese included) and meaning (local embeddings with the active model). Each match says which kind found it. |
| R-004 | **Coverage: every run folder on this node** in the memory layout (standalone agents, task agents, team and org members, task teams), whether or not the Memory page lists it. Memory Compactor runs are indexed like any other run (UD-016). Only the asking agent's own run is left out of its results. |
| R-005 | **Every run has a current journal before it is indexed.** Building the index first makes each run's journal current through the journal service (closed files are reused); live runs keep updating their journals after each turn. Journals stay Markdown. |
| R-006 | **Freshness:** a journal change from a turn is findable by text within about a minute and by meaning once its embedding is done in the background, newest first. |
| R-007 | **Local only:** nothing leaves the machine; no language-model call. |
| R-008 | **Secrets are masked in snippets** (API keys, tokens, passwords, private keys). IP addresses, domains and paths are shown (UD-002). |
| R-009 | **Factual notes instead of quality guesses (UD-020):** when query words occur in no journal, the result says so and names them ("None of these words appear in your memory: X, Y.", or "Not found in your memory: X." when only some are absent; neither while the Text index is incomplete); this is checked against the text index, never estimated from scores. The tool never says "nothing in memory" while related results exist. While indexing is incomplete, the result says how much is covered. **Search is available as soon as the Text index has content**; before the first build the page's search is disabled and offers "Index now". |
| R-010 | **Time-aware pointers:** each result shows its days. Per run, the newest matching part comes first, and the tool states that results are pointers to verify, not facts. |
| R-011 | **One memory for the whole machine:** an agent finds work of any agent in any workspace on this node; each result shows its workspace (UD-005). |
| R-012 | **Past runs stay findable whatever happened to their agent or team since** (the user, 2026-10-24). Names are shown as recorded at the time (run metadata, team record, history), falling back to the folder name; nothing depends on the agent's or team's current definition. |
| R-013 | **Indexing is a pipeline the user starts and watches on the Memory page** (the user, 2026-10-26). Its steps run in order and each is shown as a row with its own state and progress (X of Y): <ul><li>**Find runs:** every run folder in the memory layout;</li><li>**Journals:** each run's journal made current;</li><li>**Text index:** search by words works from here;</li><li>**Meaning index:** embeddings, in the background.</li></ul> "Index now" starts the first build (only by the user's click); "Rebuild" starts over (for example after an embedding model switch). Each step processes only what changed since its last run (content fingerprints) and can be run again safely. Afterwards the pipeline keeps itself current after each turn. **Searching** (`search_memory` and the page's search box) only reads the indexes: while a step is incomplete, results say how much is covered (R-009). The embedding model stays chosen on Server Settings → Embedding. |
| R-014 | **Memory page, per the approved UI/UX specification (the supplement above):** <ul><li>three tabs, **Browse · Search · Index** (Browse = today's Agents / Agent Teams / Agent Orgs lists with a name filter);</li><li>Search: one card per run, opening a match shows the run's Work Journal at the matched lines with a banner and match buttons;</li><li>Index: the four-step pipeline;</li><li>run detail has two tabs, **Work Journal** (default) and **Raw Traces**: the outdated Episodic and Semantic tabs **and Working Context** are removed (the user approved removing Working Context in the Product review);</li><li>Work Journal view: file list (days, lines, size, Active, Matched lines), windows of 300 lines, Jump to day, Go to line;</li><li>task teams listed in Agent Teams with a "Task team" tag (UD-008);</li><li>availability badges only when something is missing (No Work Journal / No Raw traces / Archive);</li><li>the memory-source picker only when more than one source exists.</li></ul> |
| R-015 | **One vocabulary** (Design Principle 15): `GLOSSARY.md` gains the words this ticket uses (Work Journal, memory, memory search, memory index), and no UI, tool or doc keeps "Episodic"/"Semantic" for the old per-run files. |
| R-016 | **A repeatable quality check** (the user, 2026-10-26: quality indexing needs transformations): an evaluation command runs a known-answer question file against the built index and reports gate 1 (found within 3 searches; one-search top 10 as its proxy) and gate 2 (rank, latency). The command and its file format live in the repository; the user's own question file stays private (`autobyteus-delivery-receipts/work-journal-search-evidence/`). A transformation is added or changed only if gate 1 stays at 100% and gate 2 does not get worse. **v1 transformations** (each measured): <ul><li>Chinese split into searchable units;</li><li>entry-aligned pieces ≤ 2,000 characters;</li><li>meaning cards bounded in tokens;</li><li>agent, team, workspace and day attached;</li><li>secrets masked in what is shown.</li></ul> Later candidates are measured first: Memory Compactor copies or test runs left out, paths and code names split into words, duplicate teammate messages, self-references, links between runs. |

### Feasibility Evidence (Skill Update `autobyteus-agents-67`, Backfilled 2026-10-27)

Requirements that depend on uncertain technology, with the measurement that shows each can be achieved. The others (R-004, R-005, R-007, R-010 days, R-011, R-012, R-014, R-015) are deterministic: `N/A`.

| Requirement | Uncertain part | Feasibility evidence | Status |
| --- | --- | --- | --- |
| R-001, R-003 | Finding the right run from a vague cue, in any language | Evaluation report: 30/31 in one search, 31/31 within three; `rg` without an index 16/31 at best (p = 0.0001); an agent with only `rg` 2/16 vs 15/16 with search (p = 0.001). API/E2E API-L04: 31/31 | Proven |
| R-001 latency | Search time on 1.1 M chunks | Report: text p90 879 ms, query embedding p90 15 ms; API-L04: p90 508 ms in-process | Proven |
| R-002 (as revised, UD-020) | Grading a match | **Challenged and removed:** meaning scores overlap (report § 5.3: unrelated 0.74–0.83, real 0.80–0.92). Now only facts: `matchedWords` (string containment) and `matchedBy` | Proven (no grade promised) |
| R-006 | Findable within about a minute of a turn | API/E2E API-L08, API-L09 (a new word findable by text after the live pass) | Proven |
| R-008 | Masking secrets | API-L04 `unmaskedSecrets 0` | Proven |
| R-009 | Naming words found in no journal | Exact FTS `MATCH` per term against the index (deterministic); the limits are named in the design: incomplete Text step, the ≤ 20 s live window, tokenizer rules (ARCH-REV-004 R-13, R-14) | Design-proven; measured by AC-007 in API/E2E |
| R-010 | Newest match first helps | Investigation § Freshness, Q26–Q29: by relevance alone the pointer went to the oldest file (old product name) | Proven (UD-022) |
| R-013 | Build time on this Mac | Report: text index about 3 min (1.05 M chunks in 69 s for the chunking step), meaning cards about 1 h (3,499 s) | Proven |

## Acceptance Criteria

| ID | Criterion | Baseline measured before design |
| --- | --- | --- |
| AC-001 | **Gate 1 (must; the user's rule; measured with the default embedding model; other catalog models are verified and their results recorded, SR-005c):** for every known-answer question whose work is in a journal on this node, the right run is in the top 10 within at most 3 searches. "What is true now" questions are excluded (`autobyteus-233`). The known-answer set lists every run that did the work, and grows during implementation. | 30 of 31 in one search; the 31st at search #3 by rephrasing |
| AC-002 | **Gate 2** (only for questions that pass gate 1): <ul><li>right run in the first search's top 3 for at least 80%;</li><li>one search p90 ≤ 1 s and max ≤ 2 s over all history on the reference machine;</li><li>an agent usually reaches the right journal lines in 2 steps (one search, one read).</li></ul> | Top 3: 27 of 31; p90 0.9 s, max 1.2 s; step 2 for 9 of 12 |
| AC-003 | **DDNS on this node:** "Do you remember that earlier we set up a domain updater / DDNS? Where is it?" returns `codex_45ce…` (2026-08-25) in the top 3 | #1 |
| AC-004 | Chinese questions pass gate 1 | 5 of 5 |
| AC-005 | No secret pattern appears in any result over the known-answer set | To measure |
| AC-006 | No result comes from `memory/imports/`; an agent's own run never appears in its results | — |
| AC-007 | **Factual notes (UD-020):** for every off-topic question of the known-answer check (key words verified absent by count), the result names the absent words; for every question, every word named as absent has no occurrence in the text index and no named-as-found word is absent. No strength label appears anywhere | Replaces the strength checks of SR-004/SR-005 |
| AC-008 | **First build on the reference machine** (M1 Max, about 3,700 runs, 1.7 GB of journals): journals ≤ 5 min, text ≤ 10 min (search by text works after this), meaning ≤ 2 h in the background; progress visible on the Memory page | Measured 104 s / 70–182 s / ≈ 1 h |
| AC-009 | A turn's journal change is findable by text within about a minute | — |
| AC-010 | Runs of retired or renamed agents, task-team members and runs without metadata are found, named as recorded or by folder | Known-answer set includes such runs |
| AC-011 | Memory page: <ul><li>search from the page;</li><li>open a result at its lines in the Work Journal view;</li><li>the index panel works (Index now, progress, Rebuild);</li><li>task teams are listed;</li><li>the old Episodic/Semantic tabs are gone.</li></ul> Per the Product Team's approved design. | — |
| AC-012 | **Real-agent validation** (UD-007): real AutoByteus agents (for example the Project Task Manager on Claude or Codex) use `search_memory` in the running app on known-answer questions and reach the right journal | — |
| AC-013 | An agent whose definition does not select `search_memory` cannot call it | — |

## Quality And Non-Functional Requirements

- **Disk:**
  - journals for all history add about 1.7 GB inside the run folders;
  - the text index must not keep a second full copy of the journal text (the probe's copy took about 3 GB).
- **CPU:** indexing runs in the background on the CPU, and searches are served first.
- **Memory page:** stays responsive during indexing.

## Data Continuity And Acceptable Loss

- The memory index is derived: it can be dropped and rebuilt from journals at any time.
- Journals are derived from raw traces; generating them writes only `work_journal/` inside each run folder, apart from the existing crash repair described above.
- **Safety on the user's machine (Task rule):** before the first build on the user's own data, the team backs up the memory folder, and the user approves the run. The product itself does not copy memory.

## Decisions

| ID | Decision | Decided by |
| --- | --- | --- |
| UD-001 | Journals for all old runs: yes, as part of building the index; backup first on the user's machine | User, 2026-10-24 ("obviously") |
| UD-002 | IP addresses, domains and paths shown in snippets; secrets masked | User, 2026-10-25 |
| UD-003 | Work Journals only; no ticket documents | User, 2026-10-25 |
| UD-004 | No LLM summaries now; follow-up FU-005 | User, 2026-10-24 |
| UD-005 | One memory for the whole machine, workspace shown | User, 2026-10-23 |
| UD-006 | A curated project-facts file belongs to `autobyteus-233` | User, 2026-10-22 (the memory split) |
| UD-007 | Real AutoByteus agents validate after implementation | User, 2026-10-25 |
| UD-008 | Task teams listed on the Memory page | User, 2026-10-25 |
| UD-009 | Tool `search_memory(query, limit?)`, no filters, default 10 | User, 2026-10-23 |
| UD-010 | Indexing controls and user search on the Memory page, not Server Settings; the old per-run tabs cleaned up | User, 2026-10-23 |
| UD-011 | Keep journals in Markdown | User, 2026-10-23 ("that's also fine") |
| UD-012 | Keep it simple: no header per chunk, no summaries | User, 2026-10-22 |
| UD-013 | The default number of results is a server setting (`AUTOBYTEUS_MEMORY_SEARCH_DEFAULT_LIMIT`, default 10); a call's `limit` overrides it | User, 2026-10-26 |
| UD-014 | Indexing is a pipeline of steps, shown step by step on the Memory page; search only reads its result. Start simple: clean steps with fingerprints, no general pipeline framework; generalize when a third consumer (for example summaries, facts) needs the same mechanism | User, 2026-10-26 |
| UD-015 | Transformations (cleaning, normalization, enrichment, de-duplication) are pipeline steps decided by measurement against the known-answer check | User, 2026-10-26 |
| UD-018 | **Work Journal before the run has a journal** (a state the approved UI spec does not define; code review CR-003, architecture review R-6): a local run shows "No Work Journal yet." and "Index your memory to create it." with a link to the Index tab; an imported run (read-only) shows "No Work Journal". Opening a run never generates its journal; only the user's Index now does (R-013) | Decided by the Solution Designer 2026-10-26 under the user's explicit delegation ("you can decide… you propose your recommendations") |
| UD-022 | **R-010 reviewed and kept** (the user asked the Solution Designer to judge whether time-aware results are reasonable). Across runs: relevance order, each card dated; within a run: newest match first; no date sort or time filter (UD-009). Feasibility evidence: investigation § Freshness (product rename, Q26–Q29): relevance alone pointed into the oldest file, where the old name was; the new name was only in the newest file. The days are read from journal entries, so they are facts, not estimates | Solution Designer, 2026-10-27, at the user's request via the Product Team |
| UD-021 | The Memory page revision for UD-020 as specified by the Product Team: no label on meaning matches, the two factual notes (gray some-not-found, amber none-found), and a cleaner result card (no "Mentioned" prefix, run ID and workspace on one line, a match's own day only when the card's date does not show it, the whole match clickable without an "Open" button, subtitle "Pointers to check in the Work Journal, not facts") | User, 2026-10-27 (Product revision: "its done") |
| UD-020 | **Remove the Strong / Fair / Weak labels and the "only weak matches" note.** Show facts instead: the query words found in a text match; no label for a meaning match (a match without words was found by meaning; wording aligned with the Product revision and ARCH-REV-004 R-12); a note naming the query words that occur in no journal. Supersedes UD-019 and the strength part of UD-017 (Product decision 7) | User, 2026-10-27 ("yess. lets remove it. otherwise later during testing we still fail") |
| UD-019 (superseded by UD-020) | **Strength reflects how informative the matched words are:** a text match's level is the share of the query's word weight (rarer words weigh more, the same weighting the text index ranks by) found in the chunk, so common words alone do not make an off-topic match Fair or Strong. The known-answer check includes off-topic questions, which must end with the "only weak matches" note (AC-007) | Solution Designer 2026-10-26 under the user's delegation (code review: "Off-topic cues can rate fair or strong by word share") |
| UD-017 | The Memory page experience as specified and approved in the Product design (four review rounds), including the removal of Working Context, three strength levels (superseded by UD-020), and search enabled once the Text index has content | User, 2026-10-26 (Product review: "Oh, I think that the UI is correct now. I feel it's good.") |
| UD-016 | Memory Compactor runs are indexed like any other run; no special exclusion (replaces the Solution Designer's earlier DEC-001). The agent is retired (last run 2026-08-15); excluding them moved one question from #3 to #1, and gate 1 passes either way | User, 2026-10-26 ("we're just building the episode memory… whatever happened… I don't think it's a big deal") |
| DEC-002 | Text plus meaning cards; entry-aligned chunks ≤ 2,000 characters | Solution Designer (measured, report § 5–6) |

## Traceability

| Requirement | Use case | Acceptance |
| --- | --- | --- |
| R-001, R-002, R-003 | UC-001, UC-002, UC-003 | AC-001, AC-002, AC-003, AC-004 |
| R-004, R-005, R-012 | UC-005 | AC-006, AC-010 |
| R-006 | UC-006 | AC-009 |
| R-007, R-008 | — | AC-005 |
| R-009, R-010 | UC-001 | AC-007 |
| R-011 | UC-004 | AC-001 |
| R-013, R-014 | UC-007, UC-008 | AC-008, AC-011 |
| R-015 | — | review |
| R-001 (opt-in) | — | AC-012, AC-013 |

## Architecture Phase Input

- **Pipeline:** layout → journals → index → search (report § 9).
- **Owners to reuse:**
  - `WorkJournalService` (only writer of journals; `ensureCurrent`);
  - `AgentMemoryLayout` (run folders);
  - `EmbeddingIndex` (a new collection);
  - the agent-tool contract and manifest pattern of `search_project_tasks`.
- **Trace every run kind and both entry forms** (agent tool and Memory page search) with the same gates (Design Principle 1).
- **Glossary entries in the same change** (Principle 15).
- **Product Design:** the Memory page (R-014) goes to the Product Team with the user's words.
