# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-004/SR-004b; UD-018, UD-019, AC-007 refined)
- Investigation Notes: `investigation-notes.md` (AE-01…AE-21)
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-003: DS-001…DS-006, § Meaning Step Rules, § Run Kinds, § Tool Contract)
- Supplemental Task Artifacts:
  - the approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/work-journal-search/ui-ux-spec.md` (VIS-001…VIS-024);
  - `memory-search-evaluation-report.md`;
  - `follow-ups.md` (FU-001…FU-006);
  - the private question file `autobyteus-delivery-receipts/work-journal-search-evidence/queries.json` (never committed here).
- Design Review Report: `design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002 Pass, round 2)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002` (round 3 will add `API-REV-003`)
- Current Investigation Round: 3
- Trigger: round 1 CRR-002 (`41501c5a41`); round 2 CRR-005 Pass on SR-006 (UD-020, UD-021), branch at `5b16e1fe4a`, code `3204aa2455`
- Prior Investigation Reviewed: round 1 (this file)
- Latest Authoritative Investigation: this file, round 3 (§ Round 3 Rerun Plan); round 3 trigger: CRR-007 Pass on the latest-base merge (delivery DR-001, IR-006), branch `3d209177ec`

## Current Requirement And Design Basis

- **Search (DS-002):** `search_memory(query, limit?)` for agents whose definition selects it (native tool and MCP adapter), and the Memory page Search. Results are one entry per run, best first, with journal pointers (file, lines, day, snippet, Words/Meaning, Strong/Fair/Weak). Secrets are masked. Notes: only-weak; coverage while indexing is incomplete; "not built yet". The asking run is left out; `memory/imports/` is never searched.
- **Indexing pipeline (DS-001, DS-005):** Find runs → Journals → Text index → Meaning index. Only the user's Index now / Rebuild starts it. Search is enabled once the Text index has content. Each step shows progress.
- **Live updates (DS-003):** a turn's journal change is findable by text within about a minute (20 s debounce, then a one-run pass). CR-001: changes made during a full, rebuild or catch-up pass are queued. CR-002: live and `meaningSync` passes report the settled index (no false "still indexing").
- **Restart (DS-006):** catch-up without loading the model; the first search answers by text with "Meaning index is loading" and requests the meaning sync.
- **Model change:** `modelChanged`; text kept current, meaning skipped and said, until Rebuild.
- **Memory page (R-014, UD-017, UD-018):** Browse · Search · Index; the run detail has Work Journal (default) and Raw Traces; task teams tagged; exception-only badges; the Work Journal view (files, windows of 300 lines, Jump to day, Go to line, search banner, match buttons); empty-state copy.
- **Gates:** AC-001 (gate 1), AC-002 (top 3 ≥ 80%, p90 ≤ 1 s, max ≤ 2 s on the reference machine, about 2 agent steps), AC-003 (DDNS top 3), AC-004 (Chinese), AC-005 (no secrets), AC-007 (off-topic only-weak, no false note), AC-008 (first-build times), AC-009, AC-010, AC-011, AC-012 and AC-013 (real agents, UD-007).

## Supported Scenarios And Real Usage

- Designer and reviewer scenarios covered: SCN-A…SCN-F (code review § Supported Product Scenario).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - **SCN-G, opted-in agent over MCP:** a Codex-runtime agent (the Project Task Manager definition with `search_memory` selected) asks a known-answer question in a run. Trigger: the user's message. Path: the MCP adapter with `session.owner.runId`.
  - **SCN-H, opted-in agent, native tool:** an AutoByteus-runtime agent with the tool selected. Trigger: the user's message. Path: the native tool with `agentId`.
  - **SCN-I, imported memory on a hub:** a Memory Sync source pushes runs to this node, a Memory Hub. Trigger: the source's Sync now. Imported runs are browsable read-only and never searched.
  - **SCN-J, the first build on a large real memory while the user keeps using the page.** Trigger: Index now. The page must stay responsive (Quality § Memory page).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none recorded. C-07 (model files deleted by hand) is unreachable through product actions (code review) and is not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-005 / DS-002 search (tool, MCP, page) | Added | R-001…R-012 | Unit, GraphQL e2e (existing); real agents (new journeys); gates on real data |
| BEH-002 / DS-001, DS-005 pipeline | Added | R-005, R-013, AC-008 | Unit, e2e, web probe; first build on a real data copy in the desktop app |
| BEH-001 / DS-003 live update (CR-001, CR-002) | Changed (notification added) | R-006, AC-009 | Unit; live agent turns in the running app, including during a pass |
| DS-006 catch-up and deferred meaning | Added | MP-001 | Unit; real restart with process observation |
| BEH-003 / DS-004 Memory page | Changed | R-014, UD-017, UD-018 | Web specs, probe; packaged desktop journeys on real data |
| Episodic/Semantic/Working Context path | Removed | Removal plan | Web specs; desktop check that the tabs are gone |
| `EmbeddingIndex.nearest`, model change | Added | Meaning Step Rules | Unit; real model switch and Rebuild |
| Imported memory excluded | Preserved / Added rule | AC-006, R-004 | No durable test today → add one; real Memory Sync journey |
| `search_project_tasks`, Raw Traces, Browse lists | Preserved | BEH-004 | Existing tests; Raw Traces opened in a journey |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `memory-search/**`, journal service, `nearest` | IMP-16 (369 tests) | Behavior at 3,700 real runs; timing | Evaluation command and real-data build |
| API / transport / contract | Yes | GraphQL memory search, views; tool contract | IMP-16 e2e (20) | Real agents reading the contract | Real agents |
| Frontend component / state | Yes | Memory page | IMP-09 (123), IMP-10 | Real data volume | Desktop journeys |
| Browser integration / user journey | Yes | Search → open at lines; Index | IMP-12 probe (fixture memory, dist `ecbf5a57bd`) | Multi-MB journals, real names, task teams | Desktop journeys; probe rerun on the reviewed dist |
| Authentication / session / permissions | Yes (opt-in tool) | Definition tool selection; asking run | Unit | Real runtime exposure (Codex MCP tool list) | Real agents (AC-013) |
| Desktop renderer / web-equivalent UI | Yes | Memory page in Electron | None | Not run in Electron | Isolated desktop instance |
| Desktop shell / Electron-specific integration | No | — | — | Embedded server startup task (step 9) runs in the shell's server | Covered by restart in the instance |
| Process / lifecycle | Yes | Startup catch-up, shutdown, model load | Unit | Real process: no model at start | `isolated-app restart` with thread/footprint observation |
| Persisted-data transition | Yes | New store; journals written into run folders; `runtime_kind: null` | Unit; IMP-06 | Real copy | First build on the copy; restart reuse |
| Worker / queue / distributed coordination | Yes | Debounce queue, single flight, embedding worker; Memory Sync imports | Unit | Real concurrent turns and passes | Live agent turns during a pass; real Memory Sync |
| External integration | Yes | Runtimes (Codex CLI, AutoByteus + LLM), Hugging Face model download | None | Real tool use by real models | Real agents; real model download |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search` (branch `codex/work-journal-search`; reviewed source `41501c5a41`; HEAD `e183aded53` adds only `tickets/`)
- Project type and runtime stack: pnpm monorepo; Fastify/GraphQL server (Node 22, `node:sqlite`), Nuxt web, Electron desktop.
- Project testing guideline path(s): `TESTING.md` (root). No closer `TESTING*.md` under `autobyteus-server-ts/` or `autobyteus-web/`.
- Conflicting, missing, or unclear project instructions:
  - TESTING.md "Data" forbids copying real data into a test and running a migration or startup on real data or a copy. This ticket's approved validation (design § Guidance For Implementation, requirements § Data Continuity, the evaluation command's doc) explicitly uses an isolated copy of a memory folder, never `~/.autobyteus`. I follow the ticket's approved method, reuse the implementer's existing copy `/tmp/wjs-copy/memory` (made 2026-10-21), and do not read `~/.autobyteus` at all. No migration is involved; the rule's intent (no harm to the user's data) holds.
  - The memory copy and the question file are private. Committed evidence keeps aggregates, IDs and short masked excerpts only; full outputs go to the private evidence folder.
- Required environment variables or secrets available: `Yes`. Codex login (`~/.codex/auth.json`, linked into a throwaway `CODEX_HOME`); LM Studio local models (`qwen/qwen3.6-35b-a3b`); no provider keys needed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | Rerun by impact; serialize builds; one heavy run at a time; clean env with a resolved temp `HOME` for e2e; isolated desktop instance for full journeys; only `CODEX_HOME` passes to an instance; never the user's CLI config; one local-model run at a time, unload it after |
| `docs/isolated-app-instances.md` | Desktop instance lifecycle | `pnpm --silent isolated-app start --build [--data-root <dir>]`, `restart`, `stop`; a provided data root is never deleted |
| `autobyteus-server-ts/scripts/evaluate-memory-search.md` | R-016 quality check | `--memory-dir`, `--index-dir` (= app data dir), `--questions`, `--model`, `--asking-run`; refuses `~/.autobyteus` |
| `autobyteus-server-ts/docs/features/memory_sync.md` | Memory Sync | Hub and source setup; imports in `memory/imports/<sourceId>/` |
| `autobyteus-web/tests/e2e/memory-search-probe.mjs` | Repository browser probe | Probe-owned stack; needs a current `dist` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | Serialized | `exit 0` | Untracked output kept |
| Isolated desktop instance (ENV-D) | worktree | `CODEX_HOME=<temp> pnpm --silent isolated-app start --build --data-root <test root>` | Data root holds an APFS clone of the memory copy | `start` JSON; `/rest/health` | `isolated-app stop <id>`; remove the test root myself |
| Memory Sync source (ENV-S) | worktree | Built `dist` server on its own temp data root and port | Small memory of a few cloned runs | GraphQL answers | Kill its process group; remove its root |
| Docker check (ENV-K) | — | `docker run --rm` of the existing server image, no volumes, no ports | Node 22 `node:sqlite` features | Command output | `--rm` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Real-size memory | Clone `/tmp/wjs-copy/memory` with `cp -c` into the test root; remove the copied `work_journal/` folders so Index now is a true first build | Never `~/.autobyteus`; the source copy is not modified | Remove the test root at the end |
| Known-answer questions | Private `queries.json` | Not committed; only aggregates in evidence | Unchanged |
| Agent definitions | The Project Task Manager package from `autobyteus-agents` copied into a test-owned folder: one with `search_memory` selected, one as shipped (without) | No change to the agents repository | Removed with the test root |
| Codex login | Throwaway `CODEX_HOME` with `config.toml` and a symlink to `auth.json` | Never edit `~/.codex` | Remove the throwaway home |
| Imported memory | Real Memory Sync from ENV-S to ENV-D (hub) | Test-owned nodes | Removed with the roots |

## Persisted Data Transition Coverage Basis

- Approved decision: memory index store and meaning vectors `Discard or Rebuild`; Work Journals and manifests with `runtime_kind: null` `Directly Usable — No Migration`.
- Design-spec and implementation-handoff references: design § Persisted Data; handoff § Persisted Data Transition Check.
- Representative existing-data setup and required behavior: the real-size copy (about 3,700 runs, many without metadata); journals generated through the journal service; the index reused after a restart (no rebuild).
- Evidence planned: the first build (API-L01); a restart reusing the store (API-L11); Rebuild after a model switch (API-L10).
- Migration-specific scenarios: N/A.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/memory-search/*.test.ts` | Discovery of every run kind; index units; store; facade (build, search, notes, live, CR-001, CR-002, restart, model change); evaluation | DS-001…DS-006, R-001…R-012, UD-019, C-06 | Still Valid | IMP-16 | Reuse |
| `autobyteus-server-ts/tests/unit/agent-tools/memory/search-memory-tool.test.ts` | Contract; native and MCP asking run | R-001, AC-006 (own run) | Still Valid | IMP-16 | Reuse |
| `autobyteus-server-ts/tests/e2e/memory/memory-search-graphql.e2e.test.ts` and the other memory e2e files | GraphQL search, status, actions, run-folder journal; views; explorers; imports | DS-001, DS-002, DS-004 | Still Valid | IMP-16 | Reuse |
| `autobyteus-web` memory specs, localization tests | Page components and stores | R-014, AC-011 | Still Valid | IMP-09 (web unchanged since) | Reuse |
| `autobyteus-web/tests/e2e/memory-search-probe.mjs` | Real-stack page probe | R-013, R-014, AC-011 | Still Valid | IMP-12 ran on server dist `ecbf5a57bd` | Rerun on the reviewed dist (the server's search and status changed since) |
| No test | Discovery never returns runs under `memory/imports/` | AC-006, R-004 | Missing | `memory-run-discovery.ts` `SKIPPED_FOLDERS`; no test mentions `imports` | Add (API-D01) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | all server | Server unit, GraphQL e2e, typecheck | Reused | IMP-16 (`41501c5a41`) | Ran on the reviewed source; nothing changed since (`git diff 41501c5a41 HEAD` touches only `tickets/`) |
| API-R02 | AC-011, R-015 | Web specs and guards | Reused | IMP-09, IMP-10 (`c66708b44b`) | No web change after `c66708b44b` (code review round 2) |
| API-D01 | AC-006 | Discovery | Durable | Add a case to `tests/unit/memory-search/memory-run-discovery.test.ts`: a run under `imports/<source>/agents/` is never found; run the file | Missing coverage of an acceptance criterion |
| API-R03 | — | Server build | Existing | `pnpm -C autobyteus-server-ts build` | The probe and the desktop build need current output |
| API-R04 | R-013, R-014, AC-004, AC-011 | Real-stack browser probe | Existing Test | `env -i … node autobyteus-web/tests/e2e/memory-search-probe.mjs --output-dir <evidence>` | Its server code changed after its last run |
| API-L01 | AC-008, R-005, R-009, R-013, AC-011 (index panel), SCN-J | Desktop Memory page on the real-size copy | Journey | Index now; follow the 4 steps; time them; Search enabled once text has content; Browse and Search stay responsive during the build | First build on real data in the product |
| API-L02 | AC-003, AC-011, UC-007, R-002, R-010 | Desktop Memory page | Journey | Search the DDNS question; result card; open at lines (banner, matches); a multi-MB journal: Jump to day, Go to line, earlier and later windows; Raw Traces | The page's main journey on real data |
| API-L03 | AC-010, AC-011, UD-008, UD-018 | Desktop Browse | Journey | Task teams tagged; old tabs gone; a run without metadata; a run known only by its folder | Real data shapes |
| API-L04 | AC-001, AC-002 (rank, latency), AC-004, AC-005, AC-007 | Built index of ENV-D | Existing Test (evaluation command) + Temporary Probe | Stop ENV-D; `evaluate-memory-search.mjs --memory-dir <root>/server-data/memory --index-dir <root>/server-data --model <active> --asking-run <authoring run>` at the lowest load I can get; plus GraphQL `memorySearch` latency on the running instance | Gate 2 on a quieter machine (round-1 residual risk) and through the real API |
| API-L05 | AC-012, AC-002 (2 steps), AC-003, AC-004, AC-006 (own run) | Codex runtime, MCP adapter | Journey | Project Task Manager with `search_memory`, Codex runtime; DDNS, a Chinese question and others; check its tool calls and answers | UD-007 |
| API-L06 | AC-012 | AutoByteus runtime, native tool | Journey | The same definition on the AutoByteus runtime with LM Studio `qwen/qwen3.6-35b-a3b`; one question | Native entry form |
| API-L07 | AC-013 | Codex and AutoByteus runtimes | Journey | The shipped definition (no `search_memory`): ask it to call the tool; check the exposed tools | Opt-in |
| API-L08 | AC-009, R-006, CR-002 | Running app: live update | Journey | A turn with a unique word; search by text until found; poll status and search coverage during the live pass | Real freshness and honest coverage |
| API-L09 | CR-001, SCN-E | Running app: turn during a full pass | Journey | A turn while a Rebuild runs; after the pass and debounce, its word is found | Changes during a pass are kept |
| API-L10 | Model change (UXJ-005, VIS-016) | Settings → Embedding, Index tab, Search | Journey | Download and use another model; Index tab "Embedding model changed"; search words only with the note; Rebuild restores meaning | Real switch |
| API-L11 | DS-006, MP-001 | Restart | Journey | `isolated-app restart`; server threads/footprint (no model); first search "Meaning index is loading"; then by meaning | Real lifecycle |
| API-L12 | AC-006, UD-018, SCN-I | Memory Sync hub and source | Journey | ENV-S pushes runs to ENV-D; the imported run shows "No Work Journal"; its distinctive words never come back from search | Real imports |
| API-L13 | Design risk (Node `node:sqlite` on Docker) | Docker image runtime | Temporary Probe | `docker run --rm` the server image's Node: contentless FTS5 with delete and `fts5vocab` | Cheap check of the packaged runtime |
| API-R05 | — | Repository checks | Existing | `python3 scripts/check_licensing.py`; `python3 scripts/check_repository_artifact_hygiene.py` | Before handoff |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-D01 | `autobyteus-server-ts/tests/unit/memory-search/memory-run-discovery.test.ts` | AC-006 has no test: a regression that walks `imports/` would put another node's runs into search |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron with the embedded server.
- Testing guideline, README, or development instructions used: TESTING.md; `docs/isolated-app-instances.md`.
- Web-equivalent behavior: the Memory page (API-L01…API-L03, L08…L10, L12).
- Shell-specific or lifecycle behavior: the embedded server's startup task and restart (API-L11).
- Chosen validation approach and why it fits the project: an isolated instance of this worktree's packaged build with a test-owned data root holding the memory copy, driven through CDP; real agents run inside it.
- Server/frontend setup when browser validation is used: the repository probe owns its stack (API-R04).
- How the run avoids disturbing an already-running desktop application: own ports, data root and process group; `stop` with my instance ID only.

## Live Environment And Fixture Plan

- Startup order and commands: build the server (API-R03), run the probe (API-R04), then `isolated-app start --build --data-root <root>` with `CODEX_HOME`; later the ENV-S source server.
- Environment choices that materially affect the run: the default embedding model downloaded by Index now; host load recorded with each timing.
- Health / readiness checks: `start` JSON; Memory page renders.
- Seed data / fixtures: the memory clone; two agent definitions; one Memory Sync source.
- Test identities: Codex login through the throwaway home; LM Studio local.
- Requirement-linked journeys: as Planned Cases.
- Evidence to capture: DOM state (JSON), screenshots, GraphQL results, timings, process threads/footprint, agent tool calls and answers (masked excerpts).
- Owned processes and temporary state to clean up: the instance, the source server, the test roots, the throwaway `CODEX_HOME`, the LM Studio model if loaded by the run.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| The first build on the user's own memory | Task rule: needs the user's approval and a backup; never run by the team on `~/.autobyteus` | The copy is from 2026-10-21; today's memory is larger | Yes | Delivery takes it to the user |
| Claude runtime agent | Only `CODEX_HOME` passes to an instance; a Claude run would use the user's real `~/.claude` | Same MCP adapter as Codex | No | Codex covers the MCP path |
| Windows, Linux and macOS x64 desktop | Not built here | Platform differences | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (API-D01)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the gate-2 measurement records the host load; an idle reference machine is not available on this shared host.

## Round 2 Rerun Plan

- **What changed** (`git diff --name-only 41501c5a41 3204aa2455`, code only; `3204aa2455..5b16e1fe4a` touches only `tickets/`):
  - search service, facade notes, models, store query (`hasChunk` replaces the vocabulary weights), normalizer query side (no punctuation-only terms; `containsTerm` by tokens);
  - the tool contract and manifest result shape (`matchedWords`, `wordsNotFound`, no strength), GraphQL types;
  - the evaluation and the term census;
  - `EmbeddingIndex` (relevance flags dropped for memory);
  - web: results card, notes, page and journal store.
  - **Unchanged:** the pipeline, journals step, discovery, journal service, index-side normalization (`toIndexText`), and the startup loader.
- **Requirement basis:** SR-006, UD-020 (no strength labels; factual notes), UD-021 (Product revision of the card), AC-007 as a fact check, R-13 (live-window limit), R-15 (the asking run's journal counts for absence).

| Case | Decision | Reason |
| --- | --- | --- |
| API-R01 | Reused: IMP-25, IMP-29, IMP-30 (`3204aa2455`) | 650 server tests and 20 memory e2e on the code under test |
| API-R02 | Reused: IMP-26 (web 121 memory tests) and IMP-28 (page probe, 23 checks) | The web changed; the implementer ran both on the changed web |
| API-D01 | Still valid | The test and discovery are unchanged |
| API-R03 | Rerun | Fresh `dist` for the evaluation and the desktop build |
| API-L01 | Still valid (round 1) | Pipeline and indexing unchanged. A new first build is still needed to get an index; its step times are recorded again as a check |
| API-L02 | Rerun (as API-L02r2) | The results card, notes and opening a match changed (UD-021) |
| API-L03, API-L07, API-L09, API-L12, API-L13 | Still valid | Browse, tool exposure, pipeline passes, discovery and store DDL features are unchanged in what they exercise |
| API-L04 | Rerun | AC-001 and AC-002 on the new search; idle-as-possible host; the private 47-question file |
| F-001 / AC-007 | Rerun as API-L14 | Off-topic cues must name their verified-absent words. Checks: no named word occurs in the index, no strength anywhere, and named-as-found words occur in the match's lines |
| API-L05 (Codex) | Rerun, short | The tool's result shape changed; 3 prompted questions including an absent codename |
| API-L06 (native) | Rerun, one question | The same result shape on the native path |
| API-L08 | Rerun, short | AC-009: the text search code changed; one turn's new word, timed |
| API-L10, API-L11 | Spot-check during API-L11 only | Notes changed in the facade. Restart: the first search's meaning note, and `wordsNotFound` empty while the catch-up holds the Text step |
| API-R05 | Rerun | Licensing and hygiene |

## Round 3 Rerun Plan (latest-base merge, `3d209177ec`)

- **What changed** (`git diff 3204aa2455 3d209177ec`, 789 files, mostly the base):
  - **Shared foundations:**
    - the server's HTTP and GraphQL stack: Fastify 4 → 5, mercurius 13 → 16, `@fastify/*` majors;
    - `autobyteus-ts` (40 files);
    - the contract packages;
    - agent tools (49 files, incl. the platform's one tool-result rule, autobyteus-260);
    - runtime management and agent execution;
    - the Electron shell (30 files);
    - app-data migrations (4 files).
  - **For this ticket:** `search_memory` serialization now goes through `toToolResultJson` (native) and `toAgentToolsMcpStructuredJsonResult` (MCP). Empty fields, including `results: []`, are left out. Wiring was re-applied in auto-merged files.
  - **Unchanged:** `src/memory-search`, `src/embeddings`, `src/agent-work-journal`, `src/memory-sync`, the web memory components, stores and page. The embedding packages in the lockfile (`@huggingface/tokenizers` 0.2.0) are also unchanged.
- **TESTING.md rule 4** applies: a shared foundation changed, so every case that crosses those boundaries is rerun. Rule 5 applies too: after a merge, rebuild every output the cases use.

| Case | Decision | Reason |
| --- | --- | --- |
| API-R01/R02 | Reused: IMP-32 (merge commit) | Build, typecheck, 1,256 focused, 20 memory e2e, full `test:unit` 7,171 (failures FU-010/FU-011 shown identical on the base), 161 web tests, guards |
| API-R03 | Rerun | Server build of the merge |
| API-L01r3 | Rerun | First build in the packaged merged app (Electron, GraphQL, startup changed) |
| API-L02r3/L03r3 | Rerun (smoke) | Page search, notes, open a match, journal navigation, Browse, over the new GraphQL server |
| API-L05r3 (Codex, MCP) / API-L06r3 (native) | Rerun | `search_memory` serialization changed: before a build, with results, with no results, and an argument error, on both entry forms |
| API-L07r3 | Rerun | Tool exposure through the changed agent-tools layer (both runtimes) |
| API-L08r3 | Rerun | A live turn reaches the index through the changed agent-execution path |
| API-L11r3 | Rerun | Restart of the changed Electron shell and embedded server |
| API-L04r3 (HTTP part) and API-L14r3 | Rerun | Same search code, but HTTP and GraphQL changed |
| API-L04 evaluation (in-process) | Still valid (round 2) | memory-search, embeddings and their packages are unchanged |
| API-L09, API-L10, API-L12, API-L13, API-D01 | Still valid | Pipeline, embedding settings flow, discovery and Docker runtime are unchanged in what they exercise. API-L10's page and GraphQL path is covered by L02r3/L04r3. API-L12's imports exclusion is discovery; Memory Sync's transport is not this ticket's code |
| API-R05 | Rerun | Licensing and hygiene |
