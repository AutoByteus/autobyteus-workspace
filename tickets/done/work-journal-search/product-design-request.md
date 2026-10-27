# Product Design Request: The Memory Page As The Home Of Memory Search

- **Purpose:** New Request.
- **From:** Solution Designer, Software Engineering Team, for Project Task `autobyteus-185` ("Agent search over Work Journals across all agents"), 2026-10-26.
- **Requirements basis:** `requirements-doc.md` (approved, SR-001), especially R-002, R-009, R-010, R-012, R-013, R-014, R-015 and AC-008, AC-011.
- **Evidence:** `investigation-notes.md`, `memory-search-evaluation-report.md` (same folder).

## The User's Requested Outcome (His Words)

- On the Memory page (left menu): "I feel like the memory index is not on the server setting page… we have a separate memory menu… we haven't used that area at all. I think that's a really, really great area that we should start to build… the user can index and the user may be able to perform separate query as well there" (2026-10-23).
- On the old run tabs: "those are outdated now… should be cleaned up… semantic and episodic now should be global… those raw traces are simply showing the raw traces" (2026-10-23).
- On indexing: "the indexing part, I think it will be a pipeline, which can be shown on the memory page, we can really see, for example, when I click index, I can see where it is" (2026-10-26).
- On task teams: "task agent teams of course should be on the memory page as well… they are also agents for agent teams" (2026-10-25).

## What The Page Must Support (Requirements)

1. **Memory search for the user (R-014, UC-007).**
   - The user types a cue in any words or language and sees the same results agents get from `search_memory`.
   - Results are one per run, best first, 10 by default.
   - Each result has only the fields that have a value:
     - agent name;
     - team and member (for team or org runs);
     - run ID;
     - workspace;
     - first and latest day the cue appears;
     - 1–2 matches, each with the journal file, lines, day, a 2–3 line snippet and how it matched (`text` or `meaning`) with its strength.
   - Opening a result shows that run's journal at the matched lines.
2. **Work Journal view in the run detail (R-014).**
   - Shows a run's readable journal and jumps to given lines.
   - A run's journal is several Markdown files, one per compaction segment plus the active one. Files can be several MB (the largest run has 22 MB in total).
3. **Memory index panel (R-013).**
   - Indexing is a pipeline of steps, shown as rows with state and progress:
     1. Find runs;
     2. Journals;
     3. Text index (search by words works from here);
     4. Meaning index (background).
   - "Index now" starts the first build, only by the user's click; "Rebuild" starts over (for example after the embedding model changed on Server Settings → Embedding).
   - After the first build it keeps itself current.
   - Measured on the user's machine: Find runs and Journals about 2 min, Text index 1–3 min, Meaning index about 1 h.
4. **Honest states (R-009, R-010).**
   - Only weak matches: say so and suggest other words; never "nothing in memory" when weak matches exist.
   - Indexing incomplete: say how much is covered.
   - Results show dates; the newest matching part of a run comes first; results are pointers to check, not facts.
5. **Lists show every run (R-012, UD-008).**
   - Task teams delegated by an agent appear like other teams. Today 370 member folders are missing from the lists, mostly software engineering teams started by the Project Task Manager.
   - Runs of retired or renamed agents and runs without metadata are named as recorded at the time, or by folder name.
6. **Clean up the old per-run tabs (R-014, R-015).** "Episodic" and "Semantic" in the run detail show files of an early, unused design (only 5 runs have them). They go away. The words must not keep the old meaning anywhere (project `GLOSSARY.md`, Design Principle 15). Raw traces stay.

## Today's Page (Facts, For Context)

- **Home** (`autobyteus-web/components/memory/MemoryHome.vue`):
  - a source picker (local memory or imported memory; imported sources are hidden while Memory Sync is held back);
  - tabs Agents / Agent Teams / Agent Orgs;
  - a search box that filters by name, title, run ID and path only (not content);
  - cards per agent or team.
- **Run detail** (`MemoryInspector.vue`): tabs Working context, Episodic, Semantic, Raw traces.
- The embedding model is chosen on Server Settings → Embedding (`autobyteus-146`); the Memory page only uses it.

## Questions The Design Should Answer

- How memory search sits next to the existing name filter and the Agents / Teams / Orgs browsing: one search or two, and what the user sees first.
- How a result reads (who, when, workspace, snippet, match kind and strength, newest mention), and how opening it lands in the Work Journal at the lines.
- How the Work Journal view handles several files per run and large files, and shows where the matched lines are.
- How the index panel shows the pipeline steps, states, progress, the first-time "Needs indexing" state, "Index now", "Rebuild", and errors.
- What happens while indexing is incomplete, and with weak matches.
- Names for the page's parts that fit the project vocabulary (memory, memory search, memory index, Work Journal).
- Whether "Working context" stays in the run detail.

## Constraints And Non-Goals

- **Local only:** no model call, nothing leaves the machine.
- **Privacy:** snippets show paths, IPs and domains (UD-002); secrets are masked.
- **Out of scope:**
  - summaries (FU-005);
  - time, agent or workspace filters (UD-009);
  - choosing the embedding model (stays on Server Settings);
  - imported memory from other nodes.
- **Data:** the Solution Designer defines the server API for search, index status and journal reading in the design spec; the page design should not depend on details beyond the result fields above.
