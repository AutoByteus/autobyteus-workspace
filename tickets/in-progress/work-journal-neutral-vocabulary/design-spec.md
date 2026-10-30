# Design Spec — autobyteus-331 (Work Journal: neutral vocabulary)

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction (user informed; reference: the message to the user of 2026-10-30). The vocabulary decisions N-1…N-9 were delegated by the user ("you know the best").
- Behavior-defining supplements and their approval references: `work-journal-neutral-vocabulary-contract.md` (canonical copy in this folder), approved with the SR-001 baseline.
- Design status: `Ready` (waiting for the user's approval; no build before it)
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-neutral-vocabulary/tickets/in-progress/work-journal-neutral-vocabulary/investigation-notes.md`
- Authorities read (design reading gate; 2026-10-30): `references/architecture-design.md`, `references/design-principles.md` (all fifteen principles, structural triggers, health assessment, size and risk); project `DESIGN.md` (`/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-neutral-vocabulary/DESIGN.md`: rules 1–9, best practices, "Before accepting a design"); `autobyteus-server-ts/docs/design/data_migration_guideline.md` § 2 (checklist answered below); `autobyteus-server-ts/docs/modules/agent_work_journal.md`; `GLOSSARY.md` (Memory, Work Journal). `design-examples.md` not needed.
- Project design-principle conflicts or discrepancies: none. One discrepancy recorded: `agent_work_journal.md:13` says the format is specified in "the ticket's `work-journal-contract.md`"; a done ticket's folder is not a durable home for a contract the code follows. The design's docs step (REQ-014) puts the vocabulary tables into the module doc.

## Current-State Read

The journal is rendered by one pure class from one raw-trace file at a time (`work-journal-file-renderer.ts:62-104`). For a tool call it asks the run's runtime translation to unwrap the call and looks the name up in that runtime's built-in table; anything not in the table is printed by the generic rule (`:132-150`, lookup `:143`, generic `:146`). Every runtime's built-ins (shell, files, web) already become the same neutral lines through shared helpers; **everything else prints `Tool: <name as recorded> …`** (E-01…E-03). The outcome word set is closed and has no word for an accepted message (`tool-outcome.ts:4-13`), so a refused message prints `→ ok` (E-04). The service reuses a closed journal file only while the manifest's renderer revision equals `WORK_JOURNAL_RENDERER_REVISION` (currently 1; `work-journal-service.ts:152-156`); a journal is refreshed when a live run ends a turn or memory search's Journals step sees a changed raw-trace fingerprint, which does not contain the revision (`journals-step.ts:32,55`; E-07, E-08). The format's only parser classifies an entry by its head prefix and treats everything unknown as an action (`journal-entry-reader.ts:40-46`; E-05); memory search builds chunks and a card (`Did: a; b; c` from the heads) per journal file (`journal-card-builder.ts:29-43`; E-06). The journal module's tests run in `test:unit` (`package.json:18`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: about 8 new files (platform converters and the lookup owner), edits to the five runtime translation files, four shared rendering files (`journal-actions.ts`, `generic-tool-line.ts`, `tool-outcome.ts`, `runtime-translation.ts`), the renderer, two service/pipeline files and one constant, plus tests and the module doc; all inside the existing journal module and one line of memory search's Journals step. Content volume (the vocabulary tables, 50–68 synthetic records per runtime) is payload, not structure (design-principles § Content-Heavy Work).
- Architectural risk: `Low`
- Risk rationale and supporting evidence: no new runtime owner, API, route, persistence format, migration, security boundary or concurrency behavior; dependency direction unchanged (the journal reads recorded tool names; no tool or runtime code is touched); stored data is derived and rebuilt in place by the existing atomic writer. The one blast-radius item, memory search re-embedding 82% of the cards once, is a bounded background cost that the shadow render measures (E-15, REQ-013).
- Escalation trigger if implementation or validation discovers new impact: a change to the journal format a consumer depends on (the entry reader's kinds, the card builder, the Memory page), a need to touch a tool, a runtime backend or run metadata, or a measured re-index cost the user does not accept; reclassify and return a Design Impact.

## Architecture Investigation Evidence

Evidence is in `investigation-notes.md` (E-01…E-19); the rows below map it to decisions.

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Read | `rendering/work-journal-file-renderer.ts:132-150` | Two extension points only: runtime table, then generic | Add the platform step between them; extract the chain to one owner | None |
| Read | `rendering/runtimes/runtime-translation.ts:32-52`, translation files 97–156 lines | A translation is a strategy object with a Map of converters; room to grow | Runtime-only converters go into each runtime's own table | None |
| Read | `rendering/journal-actions.ts:20,88`, `command-text.ts` (`asText`, `asInteger`, `isTrue`) | All shell and read converters end in `commandLine`; argument readers exist | The skill rule lives once in `commandLine`; platform converters reuse the readers | None |
| Read | `rendering/tool-outcome.ts:4-40` | Closed outcome union, one formatter | Add `delivered` (REQ-004) | None |
| Read | `reading/journal-entry-reader.ts:40-46`; grep of `src/` for `Tool:`/`Command:` | Unknown heads are actions; nothing outside `rendering/` matches tool lines | No reader change; new heads are actions | None |
| Read | `memory-search/index/journal-card-builder.ts:29-43`; `pipeline/journals-step.ts:32-60`; `memory-index-pipeline.ts:102-105,213-231,285-300` | Cards from heads; fingerprint without revision; catch-up on start runs the Journals and Text steps but not the Meaning step; Rebuild clears the store and runs everything | Put the revision into the fingerprint; Rebuild passes a regenerate flag (the pass knows `request.kind`) | Re-index time (U-1) |
| Read | `work-journal-service.ts:146-186`; `agent_work_journal.md:85-110` | Closed files reused by revision; "rebuilt without a migration" | Raise the revision; regenerate option for Rebuild | None |
| Read | `autobyteus-translation.ts:103-110,146`; `project-task-tool-contract.ts:6`; `default-agent-tool-mcp-adapter-providers.ts:16-29` | A removed tool stays as recorded history; current names differ from recorded names | Platform table = current names + recorded-history names, keyed by literals; completeness test reads the registry | None |
| Measured | Contract §5 and E-14 (counts) | Folder names above `<name>/SKILL.md`; plain-read shares | The skill rule's folder test | Wrong-label rate (U-3) |
| Measured | E-12, E-15 | 95.0% of `Tool:` lines converted; 82% of files change | Scope of the table; cost note | Real time (U-1) |
| Reproduced (older base) | Contract §11, `probes/` | Today's lines for 5 synthetic runtimes; a refused message prints `→ ok` | First fixtures; AC-004 | Environment E-19 for the build |

## Intended Change

The journal's lookup chain gets two new steps and one rule, all inside the journal module: each runtime's table gains its runtime-only converters; a new platform-converter registry (one small pure converter per platform tool or family) sits between the runtime table and the generic rule; `commandLine` turns a plain skill-file read into `Load skill: <name>`; a runtime hook splits server-qualified names for the generic rule. A new outcome word `delivered` is added. The renderer revision is raised, memory search's fingerprint carries it, and Rebuild forces regeneration. No tool, runtime backend, run metadata or raw trace changes.

## Change Scope (Mandatory)

- In scope: UC-001 to UC-004. Areas: `autobyteus-server-ts/src/agent-work-journal/rendering/**` (lookup owner, platform converters, runtime tables, shared builders, outcome), `agent-work-journal/domain/work-journal-models.ts` (revision), `agent-work-journal/services/work-journal-service.ts` (regenerate option, revision exposure), `memory-search/pipeline/{journals-step,memory-index-pipeline}.ts` (fingerprint, regenerate flag), tests under `tests/agent-work-journal/**` and `tests/unit/memory-search/**`, and `docs/modules/agent_work_journal.md`. The file list is in Target Subsystem / Folder / File Mapping.
- Derived consumers of the changed structure (Principle 11): (1) `readJournalEntries` / `journal-chunker` / `journal-card-builder` / `run-journal-indexer` read journal text: new heads are `action` entries, chunks and cards are rebuilt for changed files by the existing content-hash logic, no code change; (2) the Memory page's journal view (`workJournal` window, `work-journal-view.ts`) shows lines as text: no change; (3) `journal-term-census.ts` (evaluation script) reads entries: no change; (4) agents reading journals with a file tool or `search_memory`: they see new text (the goal); (5) the manifest: only `renderer_revision` changes value (1 to 2), shape unchanged.
- Deliberately left alone: tools and their registry, runtime backends, run metadata and the history of runs, raw traces, journals without a recorded runtime (FU-001), the memory-search ranking and its tool, the Memory page UI, the Claude session's tool exposure (FU-002).
- Follow-ups: FU-001, FU-002 (`follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, AC-001 | A turn ends or a pass renders a raw-trace file containing a platform tool call | E-01, E-12 | Neutral platform line | DS-001, DS-003 |
| BEH-002 | System | REQ-002, AC-002 | Same, runtime-only tool | E-02 | Neutral line from the runtime's own table | DS-001, DS-003 |
| BEH-003 | System | REQ-003, AC-003 | Same, a skill load | E-14, E-18 | `Load skill` in one place | DS-001, DS-003 |
| BEH-004 | System | REQ-004, AC-004 | Same, a message with a result | E-04 | `delivered` / `failed: <message>` | DS-003 |
| BEH-005 | System | REQ-005, AC-005 | A raw file of an old run is rendered | E-10, E-11 | History names keep lines | DS-003 |
| BEH-006 | System | REQ-006, AC-006 | A qualified tool name | E-12 | `(via <server>)`, never a platform match | DS-003 |
| BEH-007 | System | REQ-008, AC-008 | First catch-up pass after the update | E-07, E-08 | Regeneration in place | DS-002 |
| BEH-008 | User | REQ-009, AC-009 | Rebuild on the Memory page | E-09 | Forced regeneration | DS-002 |
| BEH-009 | System | REQ-010, AC-010 | Index or read a regenerated journal | E-05, E-06 | Unchanged consumers | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `work-journal-neutral-vocabulary-contract.md` | The vocabulary: every line, per runtime and platform, the rules, the examples | REQ-001…006, AC-001…006, AC-012 | The design builds exactly its tables; its §11 traces are the test fixtures; its §2 and §5 are realized below | Behavior-defining; approved with SR-001 |
| `journal-neutrality-analysis.md` | Evidence | — | Context | Evidence only |
| `probes/build_examples.py`, `probes/render-examples.probe.test.ts` | The prototype of the converters and the synthetic traces | AC-012 | First fixtures; reproduction | Reproduction |

## Task Design Health Assessment (Mandatory)

- Change posture: Behavior Change (plus one bug fix: a refused message printed `ok`).
- Current design issue found: No. The renderer's strategy-per-runtime design is healthy and extends cleanly; the gap is that a whole category (platform and runtime-only tools) has no converters.
- Structural triggers that fire, each with evidence: **Capability-area reuse** (fires): the journal module already owns "translate a recorded call into a neutral line"; the design extends it and reuses `asText`/`asInteger`/`isTrue` and the line builders rather than creating a new subsystem. **Repeated coordination** (could fire, ruled out by design): a skill rule repeated in eight runtime converters would repeat one policy; the design puts it once in `commandLine`. **Split sequence** (could fire, ruled out): the lookup chain is one sequence; it gets one owner (`toolCallLine`) that calls each step itself in order, no callback passed to another component. **Derived data** (fires): the manifest/fingerprint/index chain derives from the revision; one owner derives the revision's value (`WorkJournalService.rendererRevision`) and memory search reads it from there instead of recomputing or importing the constant. **Vocabulary drift** (fires, resolved): the contract fixes one word per action across runtimes; `Tool:` stays only for unknown tools. **Persisted-data transition** (fires, decided below: `Discard or Rebuild`). **Shared-structure tightness** (checked below): `BodyPart` gains one kind (`message`), the outcome union one kind (`delivered`).
- Root cause classification: Missing Invariant (the neutrality rule of contract principle 2 is enforced only for built-ins; nothing guards platform and runtime-only tools).
- Refactor needed now: No (the extension is additive inside the existing owners; the lookup chain moves out of the renderer into its own owner as part of the addition, not as a separate refactor).
- Evidence: E-01…E-06.
- Design response: add the converters per owner (runtime tables, platform registry), one chain owner, one skill rule, one new outcome, and the two guards (completeness and neutrality tests) that make the invariant hold for future tools.
- Refactor rationale: n/a.
- Intentional deferrals and residual risk: journals without a recorded runtime stay generic (FU-001); user-installed tools stay generic by design.

## Terminology

- **Platform tool:** a tool of the platform's own tool set that every runtime can call (the registry's adapters: send message, delegate, handoff rules, project tasks, browser, media, discovery, memory search, publish artifacts, routing answer). Not the user's MCP tools.
- **Runtime-only tool:** a tool only one runtime has (Claude `Skill`, Codex `js` …) as found in that runtime's recorded journals.
- **Recorded-history name:** the name a tool had when it was recorded, kept in the tables although the tool no longer exists.
- **Neutral line:** a journal head that says what was done without naming a runtime's tool.
- Words as in `GLOSSARY.md` (Work Journal, Agent runtime, Memory). No new domain word is introduced: "converter" is the existing code word (`BuiltInConverter`).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: none to remove. The old `Tool:` rendering of converted tools is replaced by their converters (clean cut: no flag, no dual rendering).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`. (Recorded-history rows are not compatibility code: they are current rendering of data that exists.)

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: `<run memory folder>/work_journal/` (journal Markdown files and `work_journal_manifest.json`): 3,716 journal sets, 7,509 files, 1.79 GB on the user's node (counts only).
- Relevant code-model, serialization, semantic, or physical-store change: the text of 82% of the files changes (E-15); the manifest's `renderer_revision` value goes from 1 to 2; no key is added, removed or renamed.
- Normal reader/writer behavior and representative evidence: `WorkJournalService` is the only writer (atomic temp-file rename, `work-journal-store.ts`); readers parse by structure (`journal-entry-reader.ts`), unknown heads are actions.
- Required semantics and invariants under direct use: an old-wording file read by the new code is still a valid journal (same entry shape); old and new wording may coexist until the catch-up pass completes.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: the journal is derived and disposable (`agent_work_journal.md`: "the whole `work_journal/` folder can be deleted and is rebuilt from [the raw traces]"); rebuilding uses no model; the raw traces are untouched; secrets handling is unchanged (journals already mask nothing beyond what raw traces hold; converters only rephrase recorded fields).
- Decision: `Discard or Rebuild`.
- Decision rationale: the data is derived from an authority that stays, the rebuild is deterministic and the existing cache key (`renderer_revision`) is designed for it; a migration would add machinery for no benefit. Cost: re-render and re-index (REQ-013).
- Acceptance criteria or design constraints supported by this decision: AC-008, AC-009, AC-013.

Data migration guideline § 2 checklist (concise): **1 Need:** none: derived data, no change of meaning of any stored name. **2 Availability:** the app starts and works with old journals; regeneration is a background pass; Rebuild is the recovery. **3 Source and target:** shape inventory = one shape (the journal Markdown format), no old shapes; fixtures = the contract's synthetic traces. **4 Disposition:** every file is either re-rendered (changed) or kept (reusable, byte-identical); a failed render keeps the run's previous journal and the Journals step retries next pass (existing: a failed run keeps no fingerprint). **5 Commit and retry:** the existing atomic writer and the manifest. **6 Current-only boundary:** nothing historical is interpreted by current code: the recorded-history names are current rendering rules for recorded data. **7 Cost:** 82% of the files, 1.6 GB read and written once, plus the re-index; the pass yields between runs; measured in validation. **8 References:** none cross the boundary (links `[↗](../raw_traces…#id)` are unchanged). **9 Evidence:** AC-007…009, AC-013. **10 Lessons:** the unclean-shutdown and work-journal tickets' rule that derived data is rebuilt, not migrated; independent review by the architecture/code review route per the classification.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001…006, 009 | A turn ends (or a pass needs a journal) | Neutral journal file on disk, read by an agent, a person or memory search | `WorkJournalService` (writes) with `WorkJournalFileRenderer` (renders) | The path every journal line takes |
| DS-002 | Primary End-to-End | BEH-007, 008, 009 | App start catch-up pass, or Rebuild click | Regenerated journals and a re-indexed memory search | `MemoryIndexPipeline` (when) with `WorkJournalService` (what) | How old journals become neutral with no migration |
| DS-003 | Bounded Local | BEH-001…006 | A tool call record reaches `toolEntry` | A `BuiltInLine` (head, outcome, parts) | `toolCallLine` (new owner of the lookup chain) | Where each category of tool gets its line |

## Primary Execution Spine(s)

- **DS-001:** `Run event (turn end) -> WorkJournalRunUpdater -> WorkJournalService.ensureCurrent -> WorkJournalFileRenderer.render -> toolCallLine (DS-003) -> formatted entry -> atomic write of the journal file -> readers (entry reader, memory search, Memory page, agent file tools)`
- **DS-002 (start):** `Server start -> MemoryIndexPipeline.start (catchUp pass) -> Journals step: rawTraceFingerprint(run, journals.rendererRevision) differs -> WorkJournalService.ensureCurrent -> reconcile (revision differs, closed files rendered again) -> journal files replaced -> Text index step re-chunks the changed files; the Meaning step does not run at a catch-up ("no model at start", memory-index-pipeline.ts:229-231) and re-embeds the changed cards at the first search or live update, only with the model the index was built with, never a download`
- **DS-002 (Rebuild):** `Memory page Rebuild -> rebuild pass (store cleared, card collection dropped: memory-index-pipeline.ts:222-226) -> Journals step (regenerate = request.kind === "rebuild") -> ensureCurrent(target, {regenerate:true}) -> reconcile ignores the stored files -> Text index and Meaning step for every journal (the user's click runs the Meaning step with the model)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A run ends a turn; the updater asks the service to make the journal current; the service renders each raw-trace file with the run's runtime, one pure render per file, and writes the Markdown atomically; readers parse it by head prefix. | Raw-trace file, tool call, journal entry | `WorkJournalService`, `WorkJournalFileRenderer` | Runtime translations, platform converters, shared line builders, the outcome formatter |
| DS-002 | After the update (or on Rebuild) memory search's Journals step compares the run's fingerprint, which now includes the renderer revision, with the stored one; a difference calls `ensureCurrent`, whose reuse check sees the new revision and renders everything again; the text index re-chunks the files whose content hash changed at once, and the meaning index re-embeds their cards later (first search or live update); unchanged-content files keep their hash and are not touched. | Run, fingerprint, journal package, index | `MemoryIndexPipeline` | The revision value (one owner: the service), the regenerate option |
| DS-003 | For a tool call: unwrap the runtime's wrapper, split a qualified name, ask the runtime's own table, then the platform table, then the generic rule; the first that knows the name builds the line. | Tool call, line | `toolCallLine` | Result normalization (the translation's), argument readers |

## Spine Actors / Main-Line Nodes

`WorkJournalRunUpdater` (trigger), `WorkJournalService` (reconcile, write), `WorkJournalFileRenderer` (one file to text), `toolCallLine` (one call to one line), `RuntimeTranslation` (the runtime strategy), `PlatformToolConverters` (the platform strategy table), `MemoryIndexPipeline` and the Journals step (when to regenerate).

## Ownership Map

- `WorkJournalService`: when a journal is current; the reuse rule; the revision value; the regenerate option. Public boundary for memory search (it already reads journals only through it).
- `WorkJournalFileRenderer`: one file to Markdown: entries, pairing, formatting, header. It **does not** own how a call becomes a line any more: it calls `toolCallLine` (a pure function).
- `toolCallLine` (new, `rendering/tool-call-line.ts`): the order of the lookup chain and nothing else. It calls each step itself.
- `RuntimeTranslation` per runtime: that runtime's wrapper, qualified-name rule, table of built-ins and runtime-only converters, result normalizer.
- Platform converters (`rendering/platform/`): the neutral line of each platform tool; the same on every runtime; they receive an already normalized result.
- `journal-actions.ts`: the shared line builders, including the skill rule inside `commandLine`.
- `MemoryIndexPipeline` / Journals step: when to ask the service to regenerate; they do not decide how a line looks.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A: `WorkJournalService` is the existing public boundary and also the governing owner of reconcile; no new facade.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| The lookup lines in `WorkJournalFileRenderer.toolEntry` (`work-journal-file-renderer.ts:139-146`) | The chain now has its own owner | `rendering/tool-call-line.ts` | Move, not copy; `toolEntry` keeps pairing, markers and link handling |
| Dead code in touched files | Checked: `rendering/**` runtime files and `journal-actions.ts` contain no unreferenced exports (each helper is used by at least one translation); `read_media_file` is reached by recorded history (E-11), so it is not dead | n/a | Re-check at implementation with the unused-export check the project uses |

## Return Or Event Spines (If Applicable)

`onJournalChanged` (existing): after `ensureCurrent` writes or removes a file, the service notifies listeners; memory search re-indexes the run (DS-002 tail). Unchanged by this design; its volume increases once (the catch-up pass), and the Journals step's own calls are already excluded from the live queue (`ownJournalCalls`).

## Bounded Local / Internal Spines (If Applicable)

**DS-003**, parent owner `toolCallLine`: `recorded call -> runtime.unwrapCall -> runtime.splitToolName (qualified? -> generic with "via") -> runtime table (built-ins and runtime-only converters) -> platform table (unqualified names only) -> generic rule -> BuiltInLine`. It matters because the order is the contract: a runtime's own name wins (the same name can be a built-in in one runtime and an ordinary tool in another), and a qualified name never reaches the platform table.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Platform converters (`rendering/platform/*`) | DS-003 | `toolCallLine` | Neutral line per platform tool | One category of tools, the same on every runtime | Putting them in each runtime table would repeat 30 converters five times |
| Skill rule (`rendering/skill-load.ts`, called by `commandLine`) | DS-003 | `journal-actions.ts` | Recognize a plain read of a skill file | One policy, all runtimes | Eight converters repeating it |
| Argument readers (`command-text.ts`: `asText`, `asInteger`, `isTrue`) | DS-003 | converters | Defensive reading of recorded arguments | Exists; reused | Re-implementing per converter |
| `delivered` outcome (`tool-outcome.ts`) | DS-003 | the outcome formatter | One word set for outcomes | Closed union | A free-text note on `ok` would hide the new meaning |
| Regenerate option and revision value (`WorkJournalService`) | DS-002 | `WorkJournalService` | Ignore stored files; expose the revision | Rebuild and the fingerprint need them | Memory search importing the constant (bypass of the service boundary) |

## Ownership Boundaries

Authority changes at three points: (1) the journal module owns rendering; no other subsystem renders a journal line (unchanged rule: "nothing but this service reads raw traces to make a journal"); (2) a runtime's translation owns that runtime's names and wrappers; the platform table owns names that are the same on every runtime; (3) memory search owns when to ask for regeneration, the journal service owns how.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `WorkJournalService` | store, renderer, translations, platform converters, revision | memory search, run updater, the Memory page's reader | Memory search importing `WORK_JOURNAL_RENDERER_REVISION` or calling the renderer | Expose `rendererRevision` and `ensureCurrent(target, options)` on the service |
| `toolCallLine` | the lookup order | `WorkJournalFileRenderer` only | The renderer or a test looking in a table directly | Extend `toolCallLine` |

## Dependency Rules

- Allowed: `WorkJournalFileRenderer -> toolCallLine -> RuntimeTranslation | platform converters | genericToolLine`; platform converters and runtime converters `-> journal-actions, command-text, tool-outcome, result-envelopes`; `MemoryIndexPipeline -> WorkJournalService`.
- Forbidden: any tool, runtime backend, run metadata or other subsystem importing `rendering/**`; `rendering/**` importing tool modules or their name constants (names are recorded history: string literals); platform converters importing a runtime translation (they are runtime-independent); memory search importing the journal's `domain` constants or `rendering/**`.
- Tests may import the tool registry (the completeness test) because tests are not production dependencies.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `toolCallLine(translation, call, result)` | A recorded tool call | The line for one call | `RecordedCall {name, args}` and `RecordedResult | null` | New; pure |
| `PlatformToolConverter = (call: RecordedCall, result: NormalizedToolResult | null) => BuiltInLine` | One platform tool or family | Its neutral line | Tool name key (literal) | New; receives the result already normalized by the run's translation |
| `RuntimeTranslation.splitToolName?(name): {tool, server} | null` | The runtime's qualified-name rule | Split a qualified name | Recorded name | New optional hook (Codex `server.tool`, Antigravity `mcp__server__tool`) |
| `WorkJournalService.rendererRevision` | The renderer revision value | One owner of the value | Number | New read-only member |
| `WorkJournalService.ensureCurrent(target, options?: {regenerate?: boolean})` | A run's journal | Make it current; optionally ignore stored files | `WorkJournalTarget` | Extended |
| `makeJournalsCurrent(journals, runs, progress, shouldStop, regenerate)` and `rawTraceFingerprint(memoryDir, rendererRevision)` | The Journals step | When to regenerate | Run, revision | Extended |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `toolCallLine` | Yes | Yes (a call plus its result) | Low | None |
| `PlatformToolConverter` | Yes | Yes (keyed by tool name) | Low | None |
| `splitToolName` | Yes | Yes | Low | Optional hook, absent for runtimes that do not qualify |
| `ensureCurrent` options | Yes | Yes | Low | One optional flag |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Same Meaning And Name Everywhere It Appears, Per The Glossary? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| The lookup owner | `toolCallLine` in `tool-call-line.ts` | Yes | Yes | Low | None |
| Platform strategy table | `platformToolConverters` in `rendering/platform/` | Yes ("platform tool" is used as in the tool docs) | Yes | Low | None |
| Outcome word | `delivered` | Yes | Yes (one meaning: the recipient accepted it) | Low | None |
| Existing `BuiltInConverter` / `builtInTools` | unchanged | Mild: the table now also holds runtime-only tools | Yes | Low | Not renamed (a rename touches five files for no behavior; its doc comment says "built-in and runtime-only tools") |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Translate a recorded call to a neutral line | agent-work-journal rendering (runtime translations) | Extend | The owner of this exact work | n/a |
| Argument readers, line builders, outcome formatting | `command-text.ts`, `journal-actions.ts`, `tool-outcome.ts` | Reuse / Extend | Exist | n/a |
| When to regenerate after an update | memory search pipeline (`catchUp`, Journals step) | Reuse | Already runs on start and on Rebuild | n/a |
| Platform tool names for the completeness test | tool registry (`buildDefaultAgentToolMcpAdapterProviders`) | Reuse (tests only) | Authoritative list | n/a |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-work-journal/rendering` | converters, builders, outcome, the chain owner | DS-001, DS-003 | `WorkJournalFileRenderer` | Extend | New folder `platform/` inside it |
| `agent-work-journal/services` | reconcile, revision, regenerate | DS-001, DS-002 | `WorkJournalService` | Extend | |
| `memory-search/pipeline` | fingerprint, regenerate flag | DS-002 | `MemoryIndexPipeline` | Extend | One line plus one parameter |

## Draft File Responsibility Mapping

(First pass; tightened below.)

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `rendering/tool-call-line.ts` | rendering | `toolCallLine` | The order of the lookup chain | One sequence | `RuntimeTranslation`, `genericToolLine` |
| `rendering/platform/platform-tool-converters.ts` | rendering | platform strategy | The registry Map from the family maps | One table | family maps |
| `rendering/platform/message-tool-converters.ts` | rendering | platform strategy | `send_message_to`, `delegate_task`, `get_handoff_rules` | One family: agent-to-agent messaging | `asText` etc. |
| `rendering/platform/project-task-tool-converters.ts` | rendering | platform strategy | Project and project-task tools, current and history names | One family | same |
| `rendering/platform/browser-tool-converters.ts` | rendering | platform strategy | The nine browser tools | One family | same |
| `rendering/platform/media-tool-converters.ts` | rendering | platform strategy | The four media tools | One family | same |
| `rendering/platform/discovery-tool-converters.ts` | rendering | platform strategy | `list_available_agents`, `list_peer_nodes`, `list_available_agent_runtimes`, `search_memory`, `publish_artifacts`, `submit_launch_choices` | Small read/answer tools | same |
| `rendering/platform/platform-line-parts.ts` | rendering | platform strategy | Recipient text, first line of a text, result body parts, outcome from an accepted/refused result | Shared by the families (Principle 11) | `BodyPart`, `NormalizedToolResult` |
| `rendering/skill-load.ts` | rendering | skill rule | Recognize a plain read of a skill file | One pure function | `command-text.ts` |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Reading a recipient from three argument shapes; first line of a text; accepted/refused from a result; "result body" parts | `platform/platform-line-parts.ts` | rendering | Used by message, task, discovery families | Yes | Yes | A grab-bag of helpers: only functions two families call |
| The head builder `Label: detail → outcome` | `journal-actions.ts` (existing builders) | rendering | Already the shared builder file | Yes | Yes | A second builder file |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ToolOutcome` + `delivered` | Yes (`delivered`: the recipient accepted; `ok`: the call ran) | Yes | Low | Add one kind and one formatter case; no note field reuse |
| `BodyPart` + `message` | Yes (`message`: free text of a message, shown with the argument line limit) | Yes | Low: `content` (written file text, 20 lines) and `argument` (labelled) mean other things | Add one kind and one `partLines` case |
| `RuntimeTranslation` + `splitToolName?` | Yes | Yes | Low | Optional member |
| `WorkJournalManifest` | Unchanged shape | n/a | n/a | n/a |

## Final File Responsibility Mapping

Same as the draft (no file merged or split by the tightness pass), plus the edited existing files:

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `rendering/work-journal-file-renderer.ts` (edit) | rendering | renderer | Pairing, entry formatting; calls `toolCallLine` | Unchanged role | yes |
| `rendering/journal-actions.ts` (edit) | rendering | line builders | Adds `loadSkillLine`; `commandLine` returns it for a plain skill read; adds a `messageLine`-style builder only if two families need it | One concern: shared action lines | yes |
| `rendering/generic-tool-line.ts` (edit) | rendering | generic rule | Adds the optional `via` server | One concern | yes |
| `rendering/tool-outcome.ts` (edit) | rendering | outcomes | `delivered` | One concern | yes |
| `rendering/runtimes/runtime-translation.ts` (edit) | rendering | strategy contract | `BodyPart.message`, `splitToolName?`, doc comment of `builtInTools` | One concern | yes |
| `rendering/runtimes/claude-translation.ts` (edit, about +110 lines) | rendering | Claude strategy | `Skill`, `TodoWrite`, `Agent`, `ToolSearch`, `TaskCreate`, `TaskUpdate`, `TaskOutput`, `TaskStop`, `Workflow` | One runtime's table; stays under 500 lines | yes |
| `rendering/runtimes/codex-translation.ts` (edit) | rendering | Codex strategy | `js`, `js_reset`, `js_add_node_module_dir`, `speak`, `splitToolName` | same | yes |
| `rendering/runtimes/antigravity-translation.ts` (edit) | rendering | AGY strategy | `Bash`, `splitToolName` | same | yes |
| `rendering/runtimes/autobyteus-translation.ts` (edit) | rendering | native strategy | `get_process_output`, `stop_background_process`, `replace_in_file`, `download_media`, `download_video`, `convert_video_format`, `submit_task_result` | same | yes |
| `rendering/runtimes/grok-translation.ts` | rendering | Grok strategy | No change (no runtime-only tool is known) | n/a | n/a |
| `domain/work-journal-models.ts` (edit) | agent-work-journal | domain | `WORK_JOURNAL_RENDERER_REVISION = 2` | One constant | n/a |
| `services/work-journal-service.ts` (edit) | agent-work-journal | service | `rendererRevision`, `ensureCurrent(target, options)`, reconcile's reuse rule | One concern | n/a |
| `memory-search/pipeline/journals-step.ts` (edit) | memory-search | Journals step | Fingerprint with the revision; `regenerate` parameter | One concern | n/a |
| `memory-search/pipeline/memory-index-pipeline.ts` (edit) | memory-search | pipeline | Passes `pass.kind === "rebuild"` and the service's revision | One concern | n/a |

## Applied Patterns (If Any)

Strategy (per-runtime translation, platform converters), Registry (name to converter Map, lookup infrastructure only), one pure function as the chain owner. No new pattern.

## Target Subsystem / Folder / File Mapping

| Path (under `autobyteus-server-ts/`) | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `src/agent-work-journal/rendering/tool-call-line.ts` | File (new) | lookup chain | The order of the lookup | Spine DS-003 | A converter's body; any table |
| `src/agent-work-journal/rendering/platform/` | Folder (new) | platform strategy | Platform converters, runtime-independent | A distinct structural depth: runtime-independent converters beside runtime strategies | Anything that names a runtime |
| `src/agent-work-journal/rendering/platform/{platform-tool-converters,message-tool-converters,project-task-tool-converters,browser-tool-converters,media-tool-converters,discovery-tool-converters,platform-line-parts}.ts` | Files (new) | as in the file mapping | as above | One concern each, each well under 500 lines | Imports of tool modules |
| `src/agent-work-journal/rendering/skill-load.ts` | File (new) | skill rule | `skillNameOfPlainRead(command)` | One policy | Runtime knowledge |
| `src/agent-work-journal/rendering/{journal-actions,generic-tool-line,tool-outcome,work-journal-file-renderer}.ts`, `rendering/runtimes/{runtime-translation,claude-translation,codex-translation,antigravity-translation,autobyteus-translation}.ts` | Files (edit) | as above | as above | Existing owners | |
| `src/agent-work-journal/domain/work-journal-models.ts`, `services/work-journal-service.ts` | Files (edit) | service | revision, regenerate | Existing owners | |
| `src/memory-search/pipeline/{journals-step,memory-index-pipeline}.ts` | Files (edit) | pipeline | fingerprint, regenerate flag | Existing owners | |
| `tests/agent-work-journal/rendering/*.test.ts` (edit and new), `tests/agent-work-journal/synthetic-run-traces.ts` (new), `tests/agent-work-journal/services/work-journal-service.test.ts` (edit), `tests/unit/memory-search/*` (edit) | Tests | verification | See Guidance For Implementation | | |
| `docs/modules/agent_work_journal.md` | File (edit, delivery) | docs | Vocabulary tables and regeneration rule | The module doc | |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `rendering/platform/` | Off-Spine Concern (strategy table) | Yes | Low | Seven small files, each one family; a flat dump into `rendering/` would hide that these are runtime-independent |
| `rendering/runtimes/` | Off-Spine Concern (strategies) | Yes | Low | Unchanged |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| The chain owner | `toolCallLine(t, call, r)`: `const c = t.unwrapCall?.(call) ?? call; const q = t.splitToolName?.(c.name); if (q) return genericToolLine({...c, name: q.tool}, norm(r), q.server); const own = t.builtInTools.get(c.name); if (own) return own(c, r); const p = platformToolConverters.get(c.name); if (p) return p(c, norm(r)); return genericToolLine(c, norm(r));` | Each runtime translation also consulting the platform table; the renderer holding the chain | One sequence, one owner (Principle 13) |
| A platform converter | `send_message_to`: recipient from `recipient_address ?? recipient_name ?? "run " + target_agent_run_id`; outcome from the result's `accepted`; head `Message to <recipient>[ (<type>)]`; body: the message text (`message` part) and `Files: …` | `Tool: send_message_to recipient_name=…` plus the raw result JSON | The converter reads every recorded shape and states what happened |
| The skill rule | In `commandLine`: `const skill = skillNameOfPlainRead(command); if (skill && !notes.includes("background")) return loadSkillLine(skill, result);` (an `in <cwd>` note is ignored: the line says what was loaded, not where the shell ran) | A skill check in `bash`, `read`, `run_command`, `view_file`, `run_bash`… (eight copies) | One policy, one place; works because every runtime already produces the neutral `cat`/`sed -n`/`head` command |
| Qualified name | `Tool: lookup_price (via acme_prices) sku="BOX-S" → ok` | `Tool: mcp__acme_prices__lookup_price …`; or treating `acme.screenshot` as the platform's `screenshot` | Readable, and a user's tool is never mistaken for the platform's |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| A flag to keep the old `Tool:` lines | Someone may parse them | Rejected: nothing in `src/` parses `Tool:` (E-05); the raw trace keeps the original | Clean cut |
| A migration or startup scan of all journals | "Old journals must change" | Rejected: derived data, rebuilt by the existing catch-up pass (N-7) | Revision in the fingerprint |
| Keeping both old and new heads in the card text | Search continuity | Rejected: cards are rebuilt for changed files by content hash | None needed |
| Per-runtime copies of the skill rule | Matching the first contract wording | Rejected: one rule on the neutral command (Principle 13) | `commandLine` |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Add `delivered` to `tool-outcome.ts`; add `BodyPart.message`, `splitToolName?` and the doc comment to `runtime-translation.ts`; add the `via` parameter to `genericToolLine`.
2. Add `skill-load.ts` and the rule in `commandLine`; add `loadSkillLine`.
3. Add `platform/` (line parts, the five families, the registry) and `tool-call-line.ts`; switch the renderer's `toolEntry` to it (move, remove the old lookup lines).
4. Add each runtime's own converters and `splitToolName`.
5. Raise `WORK_JOURNAL_RENDERER_REVISION` to 2; add `rendererRevision` and the `regenerate` option to the service; change the Journals step and pipeline (fingerprint, regenerate on Rebuild).
6. Tests (below), updated existing expectations, the synthetic-trace fixtures.
7. Shadow render on an isolated copy of the memory; report (REQ-013).
8. Docs sync (REQ-014). Nothing temporary remains at the end (no flag, no old path).

## Key Tradeoffs

- Literal names in the platform table versus importing the tools' name constants: literals keep the journal independent of the tool modules and keep old recorded names working; the cost is that a renamed tool needs a table row, which the completeness test forces.
- One skill rule on the neutral command versus per-runtime rules: one place, but it depends on every runtime table producing the neutral command; a runtime whose table does not would not be recognized, which the test fixtures per runtime cover.
- `delivered` as a new outcome kind versus `ok (delivered)`: a closed union gets one clear word; one more `switch` case.
- Re-embedding 82% of the cards once versus leaving old wording: the user's goal needs the former.

## Risks

- **Re-index cost** (E-15): regeneration and re-chunking run in the catch-up pass at start (CPU, no model; not measured yet); the embedding of 82% of the cards is deferred to the first search or live update and is of the order of 50 minutes of background work (estimate from the evaluation's 1 h whole-index build); measured by the shadow render before finalization; the Journals step yields between runs, searches are served first.
- **Search quality** shifts with new words (E-06): the known-answer queries are re-run on the shadow render (U-2).
- **Wrong `Load skill` labels** (U-3): measured counts and a sample; the line stays true.
- **Argument shapes of rarely seen tools** (U-4): defensive readers and "(… not recorded)".
- **Environment for the build** (E-19): a normal dependency install in the worktree.

## Guidance For Implementation

- Reproduction to start from, from the investigation notes: `probes/build_examples.py` and `probes/render-examples.probe.test.ts` (steps in contract §11): they produce today's lines for the five synthetic runtimes; the prototype's `neutral()` function is the expected "after" for every converted line. Port the traces to `tests/agent-work-journal/synthetic-run-traces.ts` (hand-built records, never real ones) and make the expected lines of contract §11 pass.
- Tests to write: per converter family (all argument shapes and outcomes: AC-001, AC-002, AC-004, AC-005); `skill-load` positives and negatives (AC-003); qualified names (AC-006); byte-identity of a file without converted entries (AC-007); the completeness test over `buildDefaultAgentToolMcpAdapterProviders()` names with an explicit allow-list that starts empty (AC-011); the neutrality test (AC-012); the service test for `reconcile` with a stored revision 1 and with `regenerate` (AC-008, AC-009); the Journals-step tests for the fingerprint and the regenerate flag; the reader/card test (AC-010). Update `runtime-translations.test.ts` and `work-journal-file-renderer.test.ts` where a line changes.
- Run `pnpm test:unit` (it includes `tests/agent-work-journal`), plus the shadow render outside the suites.
- Shadow render: copy the memory folder to a temp root (never the user's), render all journals with the new code into it, record counts of changed files and entries by rule, wall time, then run the memory-search build on it and report index time and size and the known-answer queries before and after. Counts and neutral snippets only in the report.
- Do not add a flag, an environment variable or a second renderer for the old wording.
