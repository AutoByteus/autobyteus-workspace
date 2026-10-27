# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 6, the latest-base merge for delivery DR-001). Rounds 1–5 are kept below as history; round 6's section is authoritative.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-006: UD-020 strength labels removed, UD-021 the Memory page revision, UD-022 R-010 kept; R-002, R-009 and AC-007 as revised)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as cited; § Freshness for UD-022)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-006)
- Design Spec Reviewed As Context: `design-spec.md` (SR-006: § Match Facts, § Removal Plan row, § Product Design Integration point 4; SR-003 sections otherwise)
- Supplemental Task Artifacts Reviewed As Context: the UI/UX spec revised for SR-006 (design repository `a0b6410395`; VIS-025, VIS-026); `memory-search-evaluation-report.md`; `follow-ups.md`
- Relevant Solution Revision IDs: SR-005 (superseded), SR-006
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-004, Pass; R-12…R-15)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-004
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-006 for round 6; IR-005 for round 5; IR-004; IR-003 superseded except `nearest` `{id, score}` and the O-1 tool wording)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-003, IR-004, IR-005, IR-006
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007` (CRR-006 is the test review in `api-e2e-test-review-report.md`)
- Current Review Round: 6
- Review Scope: `Targeted Delta Review` of the merge integration (round 6); round 5: `Targeted Delta Review`; round 4: `Full Re-Audit` of the changed areas (round 1: `Full Review`; round 2: `Full Re-Audit`; round 3: failure-origin)
- Review Scope Evidence (round 5): the delta `716563012f..5b16e1fe4a` (code `3204aa2455`) touches only the normalizer (`containsTerm`, `queryTerms`), one call site in `toMatch`, the evaluation counter, two docs and the tests: the files and behavior of CR-004 and CR-005. No shape, GraphQL, tool, web or pipeline change.
- Review Scope Evidence (round 4): the last source I reviewed is `41501c5a41` (round 2). The net source delta `41501c5a41..716563012f` (41 files, IR-003's `0f3c2a2d87`, `5617a04d02` and IR-004's `e7a15930c3`, `606d13b937`) changes shared data shapes: the domain match and result, the tool result, the GraphQL types, the generated web types, the store schema (`chunk_vocab` removed, `hasChunk` added), the normalizer, the search sequence, the facade's note, and the page. So I re-audited the net delta, not only `9fa2e072ba..716563012f`, and reran the structural checks and the full scorecard for it. The pipeline is unchanged since round 2.
- Review Scope Evidence (round 6): `3204aa2455..3d209177ec` merges `origin/personal` `f56365c809` (238 commits) and `8c31e530d6`. Against the pre-merge code, `src/memory-search`, `src/agent-work-journal` and the web memory components, stores and page are unchanged (`git diff --stat` is empty). The ticket's own change in the merge is the tool result serialization (three files) moving to the base's one tool result rule, the wiring re-applied in auto-merged files, the regenerated web types and two test updates. The re-audit covered exactly those.
- Trigger: implementation engineer handoff for IR-006 (delivery DR-001 Local Fix: latest-base merge); round 5: IR-005 (CRR-004 Local Fix: CR-004, CR-005); round 4: IR-004 (SR-006, Match Facts)
- Prior Review Round Reviewed: round 5 (`CRR-005`, `Pass`), then the test review `CRR-006` (`Pass`)
- Latest Authoritative Round: 6
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search`, branch `codex/work-journal-search`; round 6: `3204aa2455..3d209177ec` (not pushed); round 5: `716563012f..5b16e1fe4a`; round 4: `41501c5a41..716563012f` (requested range `9fa2e072ba..716563012f`)
- Coverage / API/E2E / delivery artifacts: N/A (implementation review)

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The implementation matches the design's surfaces:
  - a new subsystem with a persistent derived store;
  - an agent tool in two entry forms;
  - GraphQL additions and removals;
  - a startup task;
  - background concurrency;
  - a rebuilt page.

  No escalation trigger fired: nothing outside the journal service reads raw traces, there is no migration, and the layout is unchanged.

## Review Scope

- Changed implementation and behavior reviewed:
  - **Server, read in full:**
    - `src/memory-search/**`: facade, pipeline, journals step, run indexer, discovery, chunker, card builder, normalizer, store, search service, secret masker, settings;
    - `agent-tools/memory/*` and the MCP provider;
    - `startup/memory-search-loader.ts`;
    - GraphQL `memory-search.ts`, `work-journal-view.ts` and `memory-view.ts`;
    - `EmbeddingIndex.nearest`;
    - the `WorkJournalService` and store diffs;
    - `TaskTeamRootMemorySource`, the `TeamMemoryExplorerService` diff and the location-service diff;
    - the removals (`agent-memory-service`, `memory-file-store`, `memory-run-summary-builder`, converter, run-history projection).
  - **Web:** read `stores/memorySearchStore.ts`, `stores/memoryJournalStore.ts`, the routing and result opening in `pages/memory.vue`, and the coverage logic in `MemorySearchResults.vue`. The other components were checked against the spec through IMP-09 and the IMP-12 probe screenshots.
  - **Docs:** `GLOSSARY.md` § Memory, plus a vocabulary grep (R-015).
- Checks:
  - The implementer's Checks Run (IMP-01…IMP-12) were recorded on the code under review, so none was rerun.
  - One check of my own, **Measured**: the Teams explorer list on the isolated copy `/tmp/wjs-copy/memory` (101 task teams; never `~/.autobyteus`), using the built `dist`, read-only. `TeamMemoryExplorerService.listAgentTeamsWithMemory` took 537 / 463 / 247 ms at load average 12. The probe script lived in `/tmp/crr-probe` and was removed afterwards.
- Explicit exclusions: the evaluation command's internals beyond its reported gates; probes and evidence; the regenerated `generated/graphql.ts`; the web components' visual fidelity, which the IMP-12 probe compared with VIS-*.

## Round 6 (CRR-007): Targeted Delta Review of the latest-base merge (IR-006, delivery DR-001)

**1. `search_memory` on the base's one tool result rule (autobyteus-260):**
- Native: `toToolResultJson(result)`, and errors through `toToolResultJson(memoryToolError(…))`. MCP: `toAgentToolsMcpStructuredJsonResult(object)`, which derives both the text and `structuredContent` from one `toToolResultJson` value; errors use `{ isError: true }`. No `JSON.stringify` of a tool result remains, as the base's architecture test requires.
- The manifest's local `present` was removed, which is right (Principle 15, one rule). The shared rule prunes `null`, `undefined`, `""`, `[]` and `{}` at any depth, a superset of `present` plus the explicit empty-array handling. So empty `matchedWords`, `wordsNotFound`, `coverage`, `note`, `day` and so on are left out exactly as before, and `TOOL_RESULT` passes unchanged.
- **One visible difference (not a finding):** with no results, `results: []` is now left out too, so the tool returns `{"note":"No matches; try other words."}`, or `{"coverage": "Memory index not built yet…"}` before the first build. The rule is the platform's ("an absent field means none") and R-002 adopts it by citing autobyteus-260. The note still tells the agent what happened.

**2. Conflicts:**
- `generated/graphql.ts` was regenerated from the merged schema. Against the base it adds this ticket's types and removes `MemoryMessage` and the include flags (deliberate). It also adds the base's model-routing operation types (`ModelRoutingStatus`, `SetModelRoutingEnabled`, …): the base's web already had those queries (`graphql/mutations/modelRoutingMutations.ts`, `components/settings/model-routing/*`), but its generated file lagged. Catching up on that lag is correct. The handoff's "only this ticket's additions" is slightly too narrow, and IR-002's note had already recorded the lag.
- `docs/modules/README.md` keeps both rows.

**3. Auto-merged wiring (Read, diff against `8c31e530d6`):** the ticket's deltas are only:
- `build-studio-server.ts`: `shutdownMemorySearch()`;
- `agent-tool-loader.ts`: the `memory` unit;
- `default-agent-tool-mcp-adapter-providers.ts`: `MemoryToolsMcpAdapterProvider`;
- `server-settings-service.ts`: the default-limit setting with its normalizer;
- `schema.ts`: `MemorySearchResolver`;
- `agent-memory-explorer-service.ts`: `hasMemoryAvailability(memory)` (the ticket's availability change).

No server source uses a removed memory field. The `workingContext` hits are a base app-data migration for external-runtime snapshots, unrelated to the removed memory-view fields. The web has no use of the removed fields outside `generated/`.

**4. Test updates:**
- The loader test now counts `specs.length` / `specs.length - 1` rather than fixed numbers, which decouples it from the unit count without weakening it.
- The architecture test's unit list now includes `memory`. That fills a gap this ticket should have closed.

**Checks:**
- IMP-32 ran on the merged code: build, typecheck, 1,256 focused server tests, 20 memory e2e, 7,171 `test:unit`, 161 web memory and localization tests, 3 guards. None was rerun.
- The 2 architecture assertions (FU-010) and the 3 live compaction tests (FU-011) are recorded as failing identically on a detached `origin/personal`. That makes them base problems, which are follow-ups and outside this ticket.
- The evaluation and the page probe weren't rerun, correctly: the code they exercise is unchanged.

**Score:** unchanged from round 5 (9.4/10). The tool path now follows the platform rule, which strengthens Shared-Structure, but no category moves enough to change.

## Round 5 (CRR-005): Targeted Delta Review of the CR-004 / CR-005 fix (IR-005)

| Finding | Prior Status | Current Status | Evidence |
| --- | --- | --- | --- |
| CR-004 | Open (Local Fix) | **Resolved** | See below |
| CR-005 | Open (Local Fix) | **Resolved** | See below |

**CR-004 (Read, plus recorded checks):**
- `containsTerm` is now the one rule in the normalizer: `unicode61`-style tokens (ideographs split as `toIndexText` does, NFKD with marks removed, case folded, split at anything but letters and digits), and a term matches as its tokens in a row. That is what the term's FTS phrase matches.
- The service uses it at all three call sites: `matchedWords`, the snippet's first hit, and the card-part choice. No literal rule remains.
- `matchedWords` is computed on the lines as read, links included, which is the text the index holds. So a text match names at least one word, except under the accepted R-3 drift.
- The census keeps its independent tokenizer (R-14).
- Recorded results:
  - IMP-31: text matches without words, 0 of 698 on the private set and 0 of 35 on my cues; `wordsNotFound` mismatches [].
  - IMP-29: mutation M4 (a literal substring) fails 2 tests.
- The meaning-pointer shift (cardPart 33 → 28) follows from the same rule ("updater" no longer matches inside "updaters", as in the index). It affects pointer choice only; gates 1 and 2 are identical (31/31, #1 18, top 3 26, MRR 0.7288).

**CR-005 (Read, plus recorded checks):** `queryTerms` keeps a non-ideograph word only when it holds a letter or digit. Tests pin `"the cloudflare ... ddns -- _ .x"` → `["cloudflare", "ddns", ".x"]`, and `updater ... --` gives no `wordsNotFound` and no note. Mutation M5 fails 2 tests.

**Notes (not findings):**
- **Latency:** IMP-31 p90 737 ms and max 1,339 ms (IMP-27: 605 / 1,041) on a shared host under load. Both are within AC-002 (p90 ≤ 1 s, max ≤ 2 s). The added tokenization is bounded: ≤ 20 shown matches × terms over ≤ 2,000-character chunks, plus card parts of the meaning runs. API/E2E re-measures it.
- **C-12 effect:** because matching uses the lines as indexed, a token that occurs only in link markup (for example `rt`) is now named as a found word, though the snippet hides the link. That is consistent with the index (truthful about the file). It is recorded by the implementer as a residual risk.
- **Design wording:** the handoff asks the Solution Designer to align § Match Facts items 1 and 4. That is documentation only.
- **Checks:** IMP-29…IMP-31 ran on `3204aa2455`, the code under review, so none was rerun. The web, GraphQL and tool shapes are unchanged, so the round-4 web evidence (IMP-25, IMP-28) carries forward.

### Score (round 5, revalidated)

- Overall: **9.4/10**; every category ≥ 9.2.
- Changed scores:
  - API / Interface Clarity 9.0 → 9.4 (the "no `matchedWords` = meaning" rule now holds);
  - Shared-Structure 9.3 → 9.4 (one matching rule);
  - API/E2E Readiness 9.2 → 9.4 (the `textMatches` counter; mutation-checked tests);
  - Runtime Correctness 8.8 → 9.3 (CR-004 and CR-005 resolved).
- The others carry over from round 4: Data-Flow 9.4, Ownership 9.5, Separation 9.4, Naming 9.4, No Legacy 9.6, Cleanup 9.6.

## Round 4 (CRR-004): Full Re-Audit of SR-006 Match Facts (IR-003, IR-004)

### Basis

- **Behavior basis:** UD-020 (the user's decision) removes strength; R-002 says a text match carries the query words found in it and a meaning match carries no label; R-009 says words that occur in no journal are named, "checked against the text index, never estimated"; AC-007 says every word named as absent has no occurrence in the text index.
- **Design basis:** § Match Facts (SR-006); ARCH-REV-004 R-12 (one wording: "a match without `matchedWords` was found by meaning"), R-13 (live window accepted), R-14 (matching "the way the text index does", not by literal substring), R-15 (the asking run counts).
- **F-001 (round 3):** resolved by design, not by calibration. No grade exists, so off-topic cues can no longer be called Strong. AC-007 is now a fact check, which IMP-27 measures: 0 `wordsNotFound` mismatches over 47 questions; 11 of 12 off-topic questions name their words, and N02 is the deliberate R-15 case.

### What I checked

- **Removal (Principle 7):** a grep of the server `src`/`scripts` and the web `components`/`stores`/`types`/`pages`/`localization`/`graphql` finds no `strength`, `weakOnly`, `WEAK_ONLY`, `chunk_vocab`, `termTokens`, `tokenChunkCounts` or `termWeights`. The only hits are two unrelated skill files. `meaning-strength.test.ts` and the evaluation's strength checks are gone. `nearest` keeps `{id, score}`. The service has no `activeModelId`.
- **Ownership:** the service owns the facts (`matchedWords`, `wordsNotFound`, `terms`); the facade owns only the Text-step gate and the note text. `bestCardPerRun` is a pure, tested extraction. The store's `hasChunk` is a single bound `MATCH … LIMIT 1` with the same phrase form as the search (`toFtsPhrase`, now shared by `toFtsQuery`). It has one owner and no duplicated quoting.
- **Facade gate:** `wordsNotFound` is emptied unless the `textIndex` step is `done`. A shown pass resets the steps, so a first build, catch-up or rebuild suppresses it, and a quiet live pass does not (R-13 as documented). The facts are tested both ways. The note order matches § Match Facts.
- **Tool and GraphQL shapes:** GraphQL arrays are always present (`[String!]!`). The tool omits empty `matchedWords` and `wordsNotFound` through the existing `present` rule, which R-002 asks for ("only fields that have a value"). The description states the rule an agent needs. **Requested point 2: fine as built**, but CR-004 makes the rule untrue for some text matches.
- **Page:** the amber/gray rule (`every match is a meaning match` → amber) and the server's rule (`every term not found` → "None of these words…") are different tests of one fact. On the page they agree: the page sends no asking run, so a found term always yields a text candidate, and text runs come first in the interleave, so at least one text match is shown. They cannot disagree there. The page cannot localize the server's English `note`, so deriving it locally is acceptable. **Requested point 3: correct as built** (a weakness in Shared-Structure, not a finding). `showMatchDay` implements UD-021's rule. Strings exist in en and zh-CN, and the spec covers both note states.
- **Census (R-14):** `indexTokens` tokenizes as `unicode61` does, a term matches as its tokens in a row, and it reads `entry.text` the way the index does. It is independent of FTS, as R-14 asks. Placing it under `evaluation/` is right.
- **Requested point 1, "No matches":** the design says `"No matches in memory." (unchanged)`. The approved design never had that string. The code has had `No matches; try other words.` since `bc374d4b7c`, and R-009 only forbids saying nothing is in memory. "(unchanged)" is the intent, so keeping the string is correct. The quotation in § Match Facts is design-doc drift for the Solution Designer to align. It is not a code finding.
- **Sizes:** `memory-search-service.ts` 190, `memory-search.ts` 167, `memory-search-evaluation.ts` 184, `journal-term-census.ts` 66, `MemorySearchResults.vue` 124. All shrank or are new and small.
- **Checks:** the recorded IMP-25…IMP-28 ran on `e7a15930c3`/`606d13b937`, the code under review, so none was rerun. My own checks, all read-only, on the isolated index `/tmp/wjs-eval/index` and copy `/tmp/wjs-copy/memory` (never `~/.autobyteus`), with probes in `/tmp/crr-probe-004`, removed afterwards:
  - **Measured:** for the shown text matches (top 10 runs, up to 2 per run, as the service builds them), I counted those whose lines, with links stripped as `toMatch` does, contain no query term by `containsTerm`. Results: `memory_search` 15 of 19; `work-journal` 2 of 20; `rt` 1 of 19 (a link token). These had 0: `raw traces`, `jsonl`, `active kubernetes cluster`, `traces of the deploy`, `cloudflare ddns`, `node.js`, `package.json`, `e2e`.
  - **Read** of the `memory_search` chunks: the matched forms are "Memory search", "memory-search", "memory':'Search" and "memory search". `unicode61` splits at `_`, `-`, `.`, `'` and spaces, so the FTS phrase matches them, but the literal substring does not.
  - **Reproduced** (in-memory FTS5 with the built normalizer): `queryTerms("the cloudflare ... ddns")` gives `["cloudflare", "...", "ddns"]`, and `hasChunk('"..."')` is false even for a text that contains `...`; `--` behaves the same.

### Candidates (round 4)

| ID | Candidate | Disposition | Why |
| --- | --- | --- | --- |
| C-10 | A text match can carry no `matchedWords` (separator variants) | **Promote → CR-004** | Supported scenario: a user or agent writes a term with `_`, `-` or `.` (`memory_search`, `work-journal`, file and package names are common in this memory). Measured 15 of 19 shown matches |
| C-11 | Punctuation-only query words are named as not found | **Promote → CR-005** | Supported: free text in the page box; `...` and `--` occur in typed queries. Named as a fact although it is no word and the census disagrees |
| C-12 | Link markup (`[↗](../raw_traces_active.jsonl#rt_…)`) is indexed: about half the journal lines holding "active", and about 66% holding "traces", hold them only in link markup | **Reject as a finding of this ticket** (observation) | Pre-existing (round 1 index content). The shown matches had words in 0 of 80 probe matches for common words (BM25 prefers real content); link-only tokens (`rt`, record IDs) are not plausible query words; "active" and "traces" also occur in real text, so `wordsNotFound` is still truthful about the files |
| C-13 | Page and server use different rules for amber vs "None of these words" | Reject | Equivalent on the page (above) |
| C-14 | "No matches" quotation | Reject (design-doc drift) | Above |

### Score (round 4, full scorecard)

- Overall: 9.3/10, but **not a pass**: two categories are below 9.2.

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | DS-002 unchanged in shape; facts added at their owner | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Service owns facts, facade owns gate and note text, store owns the phrase check | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.0 | Shapes clear and documented | The stated rule "no `matchedWords` = meaning" is false for some text matches (CR-004) | Fix CR-004 |
| 4 | Separation of Concerns and File Placement | 9.4 | Census under `evaluation/`; normalizer shares the phrase form | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.3 | One `toFtsPhrase`; values-only shapes | The page derives amber from kinds (equivalent, see above); two term-matching rules (CR-004) | — |
| 6 | Naming Quality and Local Readability | 9.4 | `matchedWords`, `wordsNotFound`, `hasChunk` read as facts | — | — |
| 7 | API/E2E Readiness | 9.2 | IMP-25…28 broad; R-13 and R-15 pinned; census independent | The evaluation checks `wordsNotFound` but not `matchedWords` against the index; the census skips zero-token terms that the service names | Add the `matchedWords` check (CR-004) |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.8 | Gate, note order, both-tier dedupe, R-13/R-15 correct | CR-004 (measured), CR-005 (reproduced) | Fix both |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cut, no migration (unreleased store) | — | — |
| 10 | Cleanup Completeness | 9.6 | Every SR-005 artifact removed | — | — |

## API/E2E Failure-Origin Review (Round 3, CRR-003): F-001

### The failing scenario represents approved behavior

- **Scenario:** a user or an agent asks about work no local run did: a codename, work done on another node, or plain words ("What did we decide about the sauerkraut supplier contract?").
- **Approved basis:**
  - R-009: honest results; never "nothing in memory", but weak matches are said to be weak.
  - AC-007 as refined by SR-004b: off-topic cues, "key words occur in no run, verified by count", end with the only-weak note.
  - UC-001: an agent asks with a vague cue.
- **Supported:** the cues meet that definition exactly; API/E2E counted each key word: pelicanmarigold 0, xylophonequartz 0, orchidtundra 0, falconsaffron 0, tortellini 0, bagpipe 0, sauerkraut 0. The trigger is the real one: the page's GraphQL search and real agents (an absent codename was asked in AC-012).
- **Count correction:** T2 has words that do occur, so it is `partial` (not gated) under SR-004b. The gated result is **8 of 10 off-topic cues fail**, still clearly failing AC-007.
- This is not an invalid test or a fixture problem. The curated R-016 set (N02, N04, N05) still passes because its cues happen to stay below the floor; the set is too narrow to represent AC-007's definition.

### Origin analysis

- **Mechanism (Measured by API/E2E, consistent with the code I reviewed):**
  - `MemorySearchService` maps `nearest`'s relevance to strength: `relevant` → Strong, `aboveFloor` → Fair, `below` → Weak.
  - `EmbeddingIndex.nearest` computes `relevant` with the model's catalog rule (`selectRelevant`: best ≥ `clearMatchFloor`, then everything within `nearBestMargin` of the best). That calibration was made for **Project Tasks** (autobyteus-71).
  - On journal cards, off-topic cues score 0.77–0.80, right at Granite's floor of 0.78. When the best card just clears the floor, every card within 0.02 is "relevant": 70–84 Strong cards. When it misses by 0.01, there are none. Real answers score 0.89–0.93 with one relevant card.
  - The same happens with LEAF-IR (floor 0.30). So the threshold transfer is wrong in general, not for one model.
- **The code matches the reviewed design:**
  - design § Tool Contract: "meaning: `relevant` → strong, `aboveFloor` → fair, `below` → weak (from `nearest`)";
  - § Interface Boundary Mapping: "The calibration stays in the layer; memory search maps the three values to Strong / Fair / Weak".
  - It is not an implementation defect.
- **Design origin:**
  - The design reuses a per-model relevance calibration made for one collection (Project Task descriptions) as the strength rule for a different collection (journal cards), with no calibration for cards.
  - Its "near-best" membership is built for picking matches, not for labelling absolute strength.
  - The R-016 check, the only calibration evidence, has an off-topic set too narrow to show this.
  - Fixing it needs a design decision about where per-collection meaning calibration lives. Options the evidence suggests, none decided:
    - (a) calibration per collection in the embedding layer (changes its contract);
    - (b) memory search owns its own absolute thresholds on raw scores, calibrated on journal cards (changes the "calibration stays in the layer" boundary);
    - (c) a strength rule for memory not built on near-best membership, e.g. a meaning match is at most Fair unless the text tier agrees.

    Any option also needs AC-007's evaluation set widened to represent its definition (codenames, absent topics in sentences, plain words) per R-016.
- **Review gap?**
  - Round 1 raised off-topic strength in general (C-08, handed to the Solution Designer as a calibration question). The upstream answer (UD-019) addressed only the text tier.
  - The meaning-tier calibration transfer was a reviewed design decision (ARCH-REV-002). From the source it shows only as reuse of an approved boundary. The failure needs measured card scores, which only exist at runtime on a real-size index. So it was not reasonably detectable as a code defect in source review. I am noting it, not attributing a source defect.
- **Classification:** `Design Impact` → Solution Designer, which decides the calibration owner and rule; the evaluation set is extended as part of it. Requirements are unchanged (AC-007 as refined is clear); if the remedy changes visible strength semantics, that is the Solution Designer's call with the user.

### Other API/E2E notes (not findings of this round)

- **API-D01:** the new durable test `memory-run-discovery.test.ts` "never finds runs imported from another node by Memory Sync (AC-006)" (commit `06fdc1306a`) waits for the proportional test review after API/E2E passes.
- **Observations:**
  - O-1 (tool adoption depends on phrasing) and O-3 (self-references) are product and calibration questions for the Solution Designer.
  - O-2: the index store is 610 MB against an estimate of 100–300 MB. A risk to note; no requirement sets a disk budget for the index beyond "must not keep a second full copy of the journal text", which holds (contentless FTS5).
  - O-4 (the Embedding switch dialog doesn't mention the memory index) is autobyteus-146 copy, outside this ticket. The API/E2E engineer, who found it, records it in `follow-ups.md` if it is wanted; this review adds no row.
  - O-5: dates in a copied data set, not reachable on a normal install.
- **Disclosed side effects:** one agent ran a read-only `ls` under the user's real `~/.autobyteus`, following an old pointer, and Codex chats listed connectors. These are for the API/E2E engineer's report and the Solution Designer's awareness; they don't affect the origin.

## Round 2 (CRR-002): Full Re-Audit of IR-002

### Prior findings

| Finding | Resolution | Verification (`Read`, plus the recorded tests) |
| --- | --- | --- |
| CR-001 | **Resolved** | `onJournalChanged` now drops only notifications from the Journals step's own `ensureCurrent`: the run is held in `ownJournalCalls` only while that call is in flight. Every other change is queued, also during the first build; the timer defers it until a build runs or exists, and a `runs` pass before any build indexes nothing. A live turn serialized just ahead of the pipeline's own call on the same run may be dropped, but that pass's Text step indexes the run afterwards, so nothing is lost (rule 5 holds). Tests: "queues a live change made while a pass runs: during the first build and during a later full pass"; "drops only its own Journals step's notifications". Both fail on the previous code (handoff) |
| CR-002 | **Resolved** | Only `full`, `rebuild` and `catchUp` are shown (`SHOWN`). `runs` and `meaningSync` use their own `passSteps`, and `status()` reports the settled index while they run. A failure in them changes nothing reported. `meaningSync` is requested only when `canSyncMeaning()` holds, so `modelChanged` starts no pass, and it no longer moves `updatedAt`. Meaning progress counts only the build's own embedding (`buildEmbedding`, cleared when it completes); the facade's meaning note follows. Tests: settled status and no false coverage during a held-open live pass; no `meaningSync` in `modelChanged` |
| CR-003 | **Resolved upstream** | UD-018 (SR-004) records the copy as built; the implementation already matches |
| C-06 (note) | Applied | Each snippet line is masked, then cut; test at the cut edge |

### Re-audit of the delta

| Area | Result | Evidence |
| --- | --- | --- |
| UD-019 strength | Pass | `textStrength` = the weighted share of terms found. Weight = BM25 IDF from the index's own vocabulary (`fts5vocab` 'row' over `chunk_text`), floored at 1e-6; a multi-token term weighs as its rarest token (`termTokens` follows `unicode61`). Thresholds unchanged (2/3, 1/3); the rule stays only in `MemorySearchService`. Test: rare versus common words |
| Store | Pass | `chunk_vocab` is created with `IF NOT EXISTS` on open. It is a view over the existing FTS index, so stores built earlier need no rebuild and the schema version stays. `tokenChunkCounts` is read-only |
| Evaluation (R-016, SR-004b) | Pass | Kinds `answerable` / `offTopic` / `partial`; off-topic must end with the only-weak note, and `falseOnlyWeak` lists answerable questions that wrongly did; partial questions are reported, not gated; the file format is documented |
| Ownership / boundaries | Pass | Unchanged: status and pass kinds stay in the pipeline, notes in the facade, strength in the search service, vocabulary in the store |
| Size | Pass | Pipeline 277 → 326, search service 163 → 189, store 183 → 194, facade 141, evaluation 160; all under 500, one owner each |
| Docs | Pass | `memory_search.md`: pass kinds and status, live changes during a pass, strength, snippet order; `evaluate-memory-search.md`: question kinds |
| Checks | Pass (recorded) | IMP-16 (369 tests including `tests/unit/api`; memory e2e 20 in a clean environment; typecheck). IMP-17 on the isolated copy: gate 1 31/31 (30/31 in one search), gate 2 top 3 26/31, p90 556 ms, max 879 ms, off-topic 3/3, `falseOnlyWeak` [], 0 unmasked. These cover the reviewed code, so none was rerun |

### Candidates (round 2)

| Candidate | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| C-10 | `meaningProgress` clears `buildEmbedding` while computing the status (a small side effect in a read) | Reject (as a finding) | Idempotent, and it only stops counting a finished embedding; no wrong state |
| C-11 | The partial questions N01 and N03 end with fair matches | Reject | SR-004b scopes them out of AC-007 (their key words describe real work) |

### Score update (round 2, full scorecard)

- API/E2E Readiness 8.7 → 9.3: the findings are fixed and tested; AC-007 has an evaluation check.
- Runtime Correctness 8.6 → 9.3: live changes are kept and coverage is honest.
- Shared-Structure 9.3 → 9.4: the page's weak-only rule now has a server counterpart with a calibrated weight.
- Other categories unchanged.
- Overall 9.4/10; every category ≥ 9.2.

## Upstream Behavior And Production-Path Basis Confirmation (round 1)

- Approved requirements basis understood: Yes. Episodic memory (Work Journals) becomes findable for agents (`search_memory`) and the user (Memory page), with time-aware pointers. A user-started four-step indexing pipeline keeps itself current. The old per-run episodic, semantic and working-context path is removed.
- Design-spec behavior map verified against the implementation: Yes, with the exceptions in CR-001 and CR-002.
- Design review report and round confirmed: ARCH-REV-002 Pass.
  - R-5: `nearest` answers an explicit `collection: "notSynced"`.
  - R-7: matches are ordered newest first.
  - R-6: open (CR-003).
- Behavior-basis status: `Confirmed`, except for one visible state without a recorded requirement decision (CR-003).

| Behavior | Status | Implementation path and lifecycle evidence |
| --- | --- | --- |
| BEH-001 / DS-003 | Confirmed, with a defect (CR-001) | `WorkJournalService.reconcile` → `notify` only when a file was written or removed → `MemoryIndexPipeline.onJournalChanged` → 20 s debounce → `request({kind:"runs"})` |
| BEH-002 / DS-001, DS-005, DS-006 | Confirmed, with a defect (CR-002) | `startMemoryIndexing` → `MemorySearch.startIndexing` → `pass(full)`: Find runs → Journals (raw-trace fingerprints, `ensureCurrent`) → Text index (content hash) → Meaning step (complete card set). Catch-up at start skips the Meaning step; the first search's `notSynced` requests `meaningSync` |
| BEH-003 / DS-004 | Confirmed | Memory views by subject plus `runFolderWorkJournal` (index-known `RUN_FOLDER`, contained in the memory folder) → `readWorkJournalView` → `listJournalFiles` / `readJournalLines` (manifest-validated, ≤ 400 lines) |
| BEH-004 | Confirmed | `search_project_tasks` untouched; `EmbeddingIndex.search` unchanged |
| BEH-005 / DS-002 | Confirmed | Native (`agentId`) / MCP (`session.owner.runId`) / GraphQL (no asking run) → `MemorySearch.search` → BM25 text candidates plus `nearest` cards → interleave → pointer rule (text chunk → card part → first request) → newest first → `readJournalLines` snippet → `maskSecrets` |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / event | Entry | Shape | Forward path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-A | UC-001…UC-005; R-001…R-012 | User / Contract | Agent or user | Find past work | `search_memory`; Memory page Search | Normal | DS-002 | Run pointers | Requirements | Supported Normal | Use |
| SCN-B | UC-006; R-006; AC-009 | System | A live run's turn | Keep memory findable | Turn end → journal written | Normal | DS-003 | Findable by text within about a minute | Requirements | Supported Normal | Use |
| SCN-C | UC-008; R-013; AC-008 | Operational / User | User | Build or rebuild the index | Memory page Index | Normal | DS-001 / DS-005 | Steps with progress; Ready | Requirements, UI spec | Supported Normal | Use |
| SCN-D | R-013 ("afterwards keeps itself current"), DS-006 | System | Server start | Catch up | Startup step 9 | Normal | DS-006 | Index current | Design; MP-001 | Supported Normal | Use |
| SCN-E | SCN-B during SCN-C or SCN-D | System | A live agent turn while a full, rebuild or catch-up pass runs | Its change stays findable | Turn end during a pass. Passes last minutes: the first build 198 s (IMP-06); a catch-up scans about 3,700 runs at every start | Normal: agents work while the user indexes or the server starts. The design itself treats concurrent notifications as reachable (MP-003, rule 5) | DS-003 into DS-001/DS-006 | The change is indexed after the pass | MP-003; design rule 5 | Supported Normal | Use |
| SCN-F | SCN-A during SCN-B | User / Contract | A search while a live-update pass runs | Honest coverage (R-009) | A search issued while a one-run live pass runs (every active run, 20 s after its turn) | Normal | DS-002 reading `status()` | Coverage reflects the index | R-009; UXJ-003 / VIS-008 | Supported Normal | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Scenario / contract | Trigger | Path / consequence | Evidence (how established) | Disposition | Scope | Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Live journal changes are dropped during a full, rebuild or catch-up pass, and during the whole first build | SCN-E; R-006, AC-009; MP-003 ("wasted work, not wrong state") | An agent's turn writes its journal while a pass runs | `onJournalChanged` (L157–171) returns when the index is not built yet (the whole first build), or when `inPass` holds the run. `inPass` holds **every** run of the pass from its Journals step until `drain` ends (L249, L182), including any merged follow-up pass. A change after the pass indexed that run is never queued; it stays unfindable by text until the run's next change or the next server start's catch-up. For a run whose last turn falls in the window, that can be hours or days | **Read**: `memory-index-pipeline.ts` L157–171, L244–256, L173–184; design rule 5 says these are the pipeline's own notifications | Promote | This ticket | **CR-001** (Local Fix): drop only the pipeline's own notifications, e.g. by marking the run whose `ensureCurrent` the Journals step is calling. Queue every other change, also while the first build runs; repeated runs are no-ops by content hash (MP-003). Add a test |
| C-02 | Every pass, including a one-run live update and a `meaningSync` pass, makes the status `building` with that pass's own step counts | SCN-F; R-009 (results say how much is covered); UI spec UXJ-003 / VIS-008 (coverage note "covers N% of your journals"); R-013 (the Index tab shows the build) | A search, or an open Index tab, while a live pass runs | `status()` (L116–136) uses `this.steps` and `building` whenever `running`, and `pass()` resets `steps` for every kind (L190). So during a live pass, `textIndex` counts that run's files only. The page's coverage (`MemorySearchResults.vue` L115–119, from `textPct`) then says "Still indexing: the Text index covers 0% of your journals" on a complete index. The tool's coverage (`memory-search.ts` L121) says "Indexing in progress: the text index covers 0 of 2 journal files." The Index tab flips to Building with "1 of 1 runs". With `modelChanged`, every search starts a no-op `meaningSync` pass (L69–71), which also shows as `building` and moves `updatedAt` | **Read**: lines cited | Promote | This ticket | **CR-002** (Local Fix): passes that only keep the index current (`runs`, `meaningSync`) must not replace the reported index state and step progress; report the settled status while they run. Catch-up may keep showing as building. Do not request `meaningSync` when the Meaning step would skip it (`modelChanged`). Add tests |
| C-03 | The Work Journal empty-state copy ("No Work Journal yet." + "Index your memory to create it." with the Index-tab link; imported: "No Work Journal") has no recorded requirement decision | ARCH-REV-002 R-6; `solution-revision-record.md` L114: "to be recorded as a requirements decision with the user's confirmation before code review"; the normative UI spec has no such state | Opening a local run before the first build: the default tab for most old runs | A visible state shipped without an approved basis | **Read**: requirements doc has no entry; design § Review Corrections R-1 only | Promote | Requirement Gap | **CR-003** → Solution Designer records the decision (as DEC-009/DEC-011 in autobyteus-146), with the user's confirmation as its own plan says. Implementation follows whatever is recorded |
| C-04 | Teams explorer cost with task teams (catalog read per task team, trees read twice) | Preserved Browse lists; QR "Memory page stays responsive" | Opening Browse → Agent Teams | — | **Measured**: 247–537 ms at load 12 on 101 task teams | Reject | — | Within reason; no budget missed |
| C-05 | `getRunDir(runId)` has no containment check, and the Work Journal read now runs under it | — | A crafted `runId` from a GraphQL client | Raw traces were already read this way at the base; the new read accepts only files a manifest in that folder names | Read | Reject | — | Pre-existing; no supported scenario without write access to the node |
| C-06 | Snippet lines are cut to 200 characters **before** masking, so a secret cut at the edge can leave a short unmasked prefix (fewer than 16 characters of an `sk-` key) | R-008, AC-005 | A long line with a secret at about character 190 | A partial key fragment shown | Read; IMP-07: 0 unmasked over the set | Reject (as a finding) | — | Non-blocking note: mask, then cut |
| C-07 | "Embedding model not downloaded" (`meaningNote`) is never shown by the page | Design rule 2 | The recorded model equals the active model, but its files are gone | Only by deleting model files by hand: Remove refuses the active model (autobyteus-146), and a switch is `modelChanged` | Read | Reject | — | Not reachable through product actions |
| C-08 | The evaluation's `--asking-run` and the word-share strength on off-topic cues (handoff Known Risks) | R-016, R-009 | — | Gates pass with and without `--asking-run` (#1: 18 vs 11) | IMP-07, IMP-11 | Reject (as a finding) | — | Measurement and calibration questions for the Solution Designer (R-016's "self-references" candidate); not code defects |
| C-09 | Handoff decisions: day-split chunks; skip meaning score ≤ 0; skip a failing run in the Journals step; journal reads in the journal service; member names by address; the internal `pointer` field; `runFolderMemoryDir` containment; inspector reads the memory view only for Raw Traces; plain open shows the first file; Meaning embedding shown as building; reduced motion | Design / spec | — | Each stays inside the design's room or the spec | Read | Reject (as findings) | — | Sound |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Task design health assessment preserved | Pass | One subsystem with one public boundary (`MemorySearch`); existing owners extended at the named points only |
| Matches the behavior-defining supplement | Pass, with CR-002 and CR-003 | Tabs, run detail, the pipeline panel, result anatomy and strength words; coverage fidelity is CR-002; the empty-state copy is CR-003 |
| Data-flow spine | Pass | DS-001…DS-006 traced in code (table above) |
| Ownership boundaries | Pass | Pipeline owns sequence and state; search service owns ranking and pointers; journal service owns every journal read and write; `EmbeddingIndex` owns vectors and relevance |
| Off-spine concerns | Pass | Normalizer (one rule for both sides), masker, settings, raw fingerprint |
| Existing capability reuse | Pass | Journal service, embedding layer, layout, location services, catalogs, the tool manifest pattern, server settings |
| Reusable owned structures | Pass | `MemoryRun` and subject shared by store, search and GraphQL; `readJournalEntries` is the one parser outside rendering |
| Shared-structure tightness | Pass | `MemoryAvailabilitySummary` is tightened (`hasWorkJournal`; the snapshot kept internal); results carry only fields with values |
| Repeated coordination ownership | Pass | One pipeline (single flight, merge) |
| Empty indirection | Pass | The facade owns notes, limit resolution and `meaningSync` triggering |
| Separation of concerns / file responsibility | Pass | Pipeline steps split into `journals-step` and `run-journal-indexer` |
| Dependency direction | Pass | `agent-work-journal` → listener only; `embeddings` has no `memory-search` import; outside callers use `MemorySearch` (plus `domain/` and `settings/`, as designed) |
| Authoritative Boundary Rule | Pass | No tool or resolver reaches the pipeline or store; memory search never reads `work_journal/` or raw traces itself |
| File placement / layout | Pass | — |
| Interface clarity | Pass | Explicit subjects; `nearest`'s explicit `notSynced` (R-5) |
| Naming and one vocabulary (Principle 15) | Pass | Glossary § Memory added; no "Episodic"/"Semantic" left in the UI, tool or API for the old files |
| No unjustified duplication | Pass | The page computes "weak only" from strengths, the same rule the server's `note` applies (minor, not promoted) |
| Patch-on-patch | Pass | — |
| Dead code (Principle 7) | Pass | Removed: readers, flags, converter paths, tabs, specs, 11 strings; `readWorkingContextSnapshot` and `MemoryMessage` gone; grep finds no leftovers outside migration-owned frozen copies |
| Tests clear and requirement-aligned | Pass, with gaps | Every run kind in discovery tests; `nearest` states; live update; tool contract. No test covers SCN-E or SCN-F (CR-001, CR-002) |
| Fixtures / helpers | Pass | `memory-search-fixtures.ts` |
| No stale tests | Pass | Removed-tab specs deleted; GraphQL documents of the gated runtime e2e updated |
| API/E2E readiness | Fail | CR-001, CR-002, CR-003 |

## Source File Size And Structure Audit

| Source file | Before | After | `>500` | `>220` delta | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory-search/pipeline/memory-index-pipeline.ts` | 0 | 277 | Pass | New file over 220: one owner (sequence and state) | CR-001, CR-002 land here |
| `memory-search/store/memory-search-store.ts` | 0 | 183 | Pass | Pass | — |
| `memory-search/runs/memory-run-discovery.ts` | 0 | 173 | Pass | Pass | — |
| `memory-search/search/memory-search-service.ts` | 0 | 163 | Pass | Pass | — |
| `api/graphql/types/memory-search.ts` | 0 | 190 | Pass | Pass | — |
| `embeddings/embedding-index.ts` | 367 | 410 | Pass | +43 | — |
| `pages/memory.vue` | 334 | 445 | Pass | +111 | — |
| `stores/memorySearchStore.ts`, `memoryJournalStore.ts`, `WorkJournalTab.vue` | 0 | 213 / 204 / 192 | Pass | Pass | — |
| Others changed (server settings, schema, compositions, explorer schema, explorer store) | ≤ 382 | ≤ 410 | Pass | small | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | Removed arguments and fields are a clean cut (rejection log followed) |
| No legacy retention | Pass | — |
| Dead code removed in touched files | Pass | — |
| Persisted-data decision followed | Pass | Store and vectors: Discard or Rebuild (unreadable store deleted and recreated; Rebuild clears both). Journals and `runtime_kind: null`: directly usable. Old jsonl files untouched |
| No version-specific dual reads | Pass | The manifest reader accepts `null` as a current value, not an old shape |
| Transition mechanics match | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None open.

## Docs-Impact Verdict

- Docs impact: `Yes`, already done: `memory_search.md` (new), `agent_memory.md`, `agent_work_journal.md`, `embeddings.md`, `README.md`; `GLOSSARY.md` § Memory; web `docs/memory.md`.
- The fixes for CR-001 and CR-002 may need a sentence in `memory_search.md`: which passes show as building, and that live changes during a pass are queued.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise | Status | Reason |
| --- | --- | --- |
| MP-001 (restart, meaning job) | Confirmed | Catch-up skips the Meaning step; `nearest` answers `notSynced`; the facade requests `meaningSync` once built and idle |
| MP-002 (meaning-only pointer) | Confirmed | Pointer rule implemented; evaluation reports 0 empty snippets |
| MP-003 (the pipeline's own notifications) | **Reclassified** | Rule 5 drops by run membership for the whole pass, which also drops agents' live changes. Agents' changes are a distinct trigger with a different consequence (lost state, not wasted work). New premise SCN-E, CR-001 |

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.2

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | All six spines traceable; pipeline sequence explicit | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One facade; the journal service is the only journal reader and writer; the embedding layer owns relevance | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Subjects explicit; `notSynced` explicit; tool contract per design | — | — |
| 4 | Separation of Concerns and File Placement | 9.3 | Clear split under `memory-search/` | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.3 | Tightened availability; values-only results | Page recomputes "weak only" (minor) | — |
| 6 | Naming Quality and Local Readability | 9.4 | Glossary vocabulary used throughout | — | — |
| 7 | API/E2E Readiness | 8.7 | Strong unit, e2e and probe coverage; gates measured | CR-001, CR-002 untested; CR-003 basis missing | Fix and test; record the decision |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.6 | Search, pointers, masking, nearest, discovery and removal correct | CR-001 (lost live changes), CR-002 (false coverage and building state) | Fix both |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut | — | — |
| 10 | Cleanup Completeness | 9.4 | Old path and strings removed | — | — |

## Findings

### CR-004 — A text match found through a separator variant carries no `matchedWords`, so it reads as a meaning match (Local Fix, implementation; round 4) — Resolved in round 5 (IR-005 `3204aa2455`)

- **Protects:** R-002 (a text match carries the query words found in it); ARCH-REV-004 R-12 (the one wording, now in the tool description: "a match without `matchedWords` was found by meaning"); the Product revision (a card part without "Words:" is a meaning match); R-14 ("match a term the way the text index does, not a literal substring").
- **Evidence:**
  - **Read:** text candidates come from the FTS phrase (`toFtsPhrase`, `unicode61` tokens in a row), but `toMatch` computes `matchedWords` with `containsTerm`, a lowercase literal substring (`memory-search-service.ts` L186, `memory-text-normalizer.ts` L41). That leaves two rules for one fact.
  - **Measured** on the isolated index: for `memory_search`, 15 of 19 shown text matches carry no words, because their lines say "Memory search", "memory-search" and so on. For `work-journal`, 2 of 20 carry none.
  - **Consequences:** the page shows such a match without a "Words:" label, so it looks like a meaning match. The tool sends `matchedBy: "text"` with no `matchedWords`, which contradicts its own description. The "lines a–b · Words: …" banner of the Work Journal view has nothing to show.
  - The cause is the design's own mechanism ("by the existing `containsTerm`"), which contradicts the design's stated rules (R-12, R-14). The fix stays inside the approved intent, so it is a bounded implementation fix plus a one-line alignment of the design's wording.
- **Required action:**
  - Compute `matchedWords` with the text index's matching rule (a term matches as its `unicode61` tokens in a row) on the lines as the index holds them. One owner for that rule, in the normalizer.
  - The census may keep its own independent tokenizer (R-14 wants it independent of FTS), but the service must not keep a second literal rule.
  - A text match must then name at least one word. The only exception is the accepted R-3 drift, where a file changed since indexing.
  - Tests:
    - a unit test: lines holding "Memory search" or "memory-search", queried `memory_search`, give `matchedWords: ["memory_search"]`;
    - an evaluation check: shown text matches with no `matchedWords` = 0.
  - Note in the handoff, for the Solution Designer: § Match Facts item 1 ("by the existing `containsTerm`") and item 4 (the quoted "No matches in memory.") need wording alignment.

### CR-005 — Punctuation-only query words are named as not found (Local Fix, implementation; round 4) — Resolved in round 5 (IR-005 `3204aa2455`)

- **Protects:** R-009 / AC-007: a word named as absent is a word that occurs in no journal, as the text index sees it. The census, the independent oracle, skips such terms, so the evaluation cannot see this.
- **Evidence (Reproduced):** `QUERY_WORD` (`[a-z0-9_\-.]+`, length > 1) turns `...` or `--` into terms. Each is a phrase with no tokens, so `hasChunk` is false. As a result:
  - "the cloudflare ... ddns" gives the note "Not found in your memory: ....";
  - a query of only such characters gives the amber "None of these words appear in your memory: …".
- **Required action:** a search term must contain at least one letter or digit, so a term with no index tokens is not a search term (in `queryTerms`, the one owner). The census already skips such terms, so the two agree. Add a unit test.

### CR-001 — Live journal changes are lost while a full, rebuild or catch-up pass runs, and during the first build (Local Fix, implementation)

- **Protects:** R-006 / AC-009 (a turn's change is findable by text within about a minute), R-013 ("afterwards the pipeline keeps itself current"), and MP-003's own premise ("wasted work, not wrong state").
- **Evidence (Read):**
  - `memory-index-pipeline.ts` `onJournalChanged` (L157–171) returns when `!this.isBuilt()`. That is the whole first build, since the built marker is set only at its end (L207).
  - It also returns when `this.inPass.has(memoryDir)`. `journalsStep` puts **every** run of the pass into `inPass` (L249), and `drain` clears it only after all merged passes end (L182).
  - So an agent's turn that changes a run's journal after the pass already re-indexed that run is never queued. It stays unfindable by text until that run changes again, or until the next server start's catch-up. For a run whose last turn falls inside the window (the first build is about 3 minutes; a catch-up at each start), that can be hours or days.
- **Required action:**
  - Drop only the notifications the pipeline's own Journals step causes, for example by marking the run whose `ensureCurrent` it is calling, so rule 5's intent and MP-003 still hold. Queue every other change into the next pass, including while the first build runs; repeated runs cost nothing thanks to content hashes.
  - Add a unit test: a change to an already-indexed run during a full pass is findable by text after the pass and debounce.

### CR-002 — Live and `meaningSync` passes report the index as building with their own tiny progress, so coverage notes are false (Local Fix, implementation)

- **Protects:**
  - R-009: results say how much is covered, which also means not claiming missing coverage.
  - UI spec UXJ-003 / VIS-008: the partial-coverage note is about the journals the index covers.
  - R-013 / UXJ-004: the Index tab shows the user's build, not each turn's upkeep.
- **Evidence (Read):**
  - `status()` (L116–136) returns `state: "building"` and the current pass's steps whenever any pass runs. `pass()` resets the steps for every request kind (L190).
  - During a one-run live pass (after every active run's turn) the text step counts only that run's files. The page's coverage (`MemorySearchResults.vue` L115–119, from `textPct`) then shows "Still indexing: the Text index covers 0% of your journals". The tool's coverage (`memory-search.ts` L121) shows "Indexing in progress: the text index covers 0 of 2 journal files." The Index tab shows Building with "1 of 1 runs".
  - In `modelChanged`, every search requests a `meaningSync` pass (L69–71) that does nothing but shows as building and moves `updatedAt`.
- **Required action:**
  - While a pass that only keeps the index current (`runs`, `meaningSync`) runs, report the index's settled state and coverage. A catch-up may keep showing as building.
  - Don't request `meaningSync` when the Meaning step would skip it (`modelChanged`).
  - Add tests: a search and a status read during a live pass report the complete index; in `modelChanged`, a search starts no pass.

### CR-003 — The Work Journal empty-state copy has no recorded requirement decision (Requirement Gap → Solution Designer)

- **Protects:** the approved basis for visible states (Review Authority; the normative UI spec has no such state).
- **Evidence:**
  - ARCH-REV-002 R-6 asked to record the empty-state copy as a requirements decision before code review. The solution revision record agrees (`solution-revision-record.md` L114: "to be recorded as a requirements decision with the user's confirmation before code review").
  - It is only in `design-spec.md` § Review Corrections (R-1); `requirements-doc.md` has no decision for it.
  - It is the default view of most old local runs before the first build. It was implemented as written (handoff: "awaits the user's confirmation").
- **Required action:** the Solution Designer records the decision, the copy as built or the user's wording, with the user's confirmation as planned. If the wording changes, the implementation engineer updates the en and zh-CN strings in the same rework.

Non-blocking notes:
- **C-06:** mask secrets before cutting snippet lines to 200 characters.
- **C-08:** the evaluation's authoring-run effect and the strength of off-topic cues are calibration questions under R-016, not code defects.

## Follow-ups

- Follow-ups this review added: None. C-12 (link markup in the text index) is an observation. If the Solution Designer wants it tracked, it belongs with FU-002 (search quality), not with this ticket's findings.

## Classification

- Round 6: N/A — `Pass` (merge integration correct).
- Round 5: N/A — `Pass` (CR-004 and CR-005 resolved).
- Round 4: `Local Fix` (CR-004, CR-005), owned by implementation. F-001 is resolved by SR-006.
- Round 3: `Design Impact` (F-001: meaning-strength calibration for journal cards).
- Round 2: N/A — `Pass` (CR-001 and CR-002 resolved; CR-003 resolved by UD-018).
- Round 1: `Requirement Gap` (CR-003), `Local Fix` (CR-001, CR-002).

## Recommended Recipient

- Round 6: `/software_engineering_team/api_e2e_engineer` (validation on the merged state as API/E2E judges by impact); `/software_engineering_team/implementation_engineer` (informational).
- Round 5: `/software_engineering_team/api_e2e_engineer` (primary pass handoff: re-run AC-001, AC-002, AC-007; API-D01 test review afterwards); `/software_engineering_team/implementation_engineer` (informational).
- Round 4: `/software_engineering_team/implementation_engineer` (`Local Fix`, CR-004, CR-005).
- Round 3: `/software_engineering_team/solution_designer` (`Design Impact`, F-001).
- Round 2: `/software_engineering_team/api_e2e_engineer` (primary pass handoff); `/software_engineering_team/implementation_engineer` (informational).
- Round 1: `/software_engineering_team/solution_designer`.

## Residual Risks

- Gate 2 latency: IMP-31 p90 737 ms, max 1,339 ms (IMP-27: 605 / 1,041), shared host under load; within AC-002, and API/E2E re-measures it.
- R-13 (accepted): a word only in the last turn's lines is named as not found for up to the live debounce.
- C-12: link markup is indexed. It inflates common tokens (`active`, `traces`, `raw`, `jsonl`) in BM25 and keeps them from ever being named as not found. Since round 5, a link-only token is named as a found word although the snippet hides the link. No visible defect was measured for real query words.
- AC-012 and AC-013 (real agents), the Electron page, and AC-009 in the running app are downstream. API-D01 waits for the proportional test review.
- R-3 (accepted): line drift in the open file's last entry.

## Latest Authoritative Result

- Review Decision: `Pass` (round 6)
- Review Entry Point: `Implementation Review` (round 6, `Targeted Delta Review` of the latest-base merge `3204aa2455..3d209177ec`)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10; every category ≥ 9.2 (unchanged from round 5)
- Findings: none
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`; informational to `/software_engineering_team/implementation_engineer`
- Notes:
  - On the merged state, the code paths that changed are `search_memory`'s serialization in both entry forms and the wiring. A focused check of the native and MCP results is the proportionate re-validation; the gates, census and page are unaffected.
  - The no-results tool result now omits `results` (platform rule).
  - FU-010 and FU-011 are base problems and do not block.
  - Nothing is pushed.
