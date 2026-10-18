# Requirements Document

## Document Status

- Status: `Approved` (SR-007)
- Current solution revision ID: `SR-007`
- Package identifier: `project-task-semantic-search`
- Request / ticket: Project Task `autobyteus-71` (`project_task_9b35671b-5079-4dff-90ef-e62a71289ed9`), "Local semantic search for Project Tasks, built on a reusable local embedding layer"
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's GO-AHEAD of 2026-10-18
- Requirements owner: Solution Designer (software engineering team)
- Date: 2026-10-18
- Approved by and reference: `User`, 2026-10-18, in the Solution Designer conversation. After the full set was presented (lanes/near-best rule, LEAF-IR default with switchable catalog, server download on first use, targets, `search_project_tasks`) and the user asked "which model you will use by default?" (answer: MongoDB LEAF-IR), the user said: *"Okay… I think you can go on now for your design."* **SR-007 delta:** approved by the user on 2026-10-18 (\"go a head for the switching\"), in reply to the presented option A (Granite default) with its re-based targets and the scale statement.
- Exact approved requirements baseline / solution revision: this document at `SR-007` (SR-004 baseline + SR-007 delta) (REQ-001…REQ-015, AC-001…AC-016, QR-001…QR-008, DEC-001…DEC-011)
- Behavior-defining supplements and their approved versions: none (probe artifacts are evidence only)

## Delta SR-007 (approved by the user, 2026-10-18)

Trigger: code review FO-001 (API/E2E API-L04). With the default model LEAF-IR, AC-004 and AC-001 fail on 1,000-Task backlogs:

| Backlog | Unrelated queries with no match | Targets shown in the first 5 |
| --- | --- | --- |
| 60 Tasks | 92% | 97% |
| 1,000 generated Tasks | 58% | 87% |
| 1,000 real-text Tasks | 42% | 90.5% |

Solution Designer analysis (`probes/fo-001/rule-evaluation.txt`):

- No relevance rule makes LEAF-IR meet both bars at 1,000 Tasks; tested were the floor from 0.24 to 0.36, two margins and score-distribution (z-score) rules. Its ranking itself drops (target in the top 5 of the generated backlog: at most 87–89% with any cut-off).
- Granite Small English R2 with its shipped calibration meets both on all three backlogs:

| Backlog | Targets shown in the first 5 | Unrelated queries with no match |
| --- | --- | --- |
| 60 Tasks | 96.8% | 95.8% |
| 1,000 generated Tasks | 93.7% | 95.8% |
| 1,000 real-text Tasks | 92.1% | 95.8% |

Approved changes (the user, 2026-10-18, replying to the option A proposal with its targets: *"go a head for the switching"*):

- **DEC-002 (default model):** the default becomes `granite-embedding-small-english-r2`. LEAF-IR and EmbeddingGemma 2 stay in the catalog (LEAF-IR as the fast option for small Projects).
- **DEC-011 (new; scale of AC-001/AC-002/AC-004):** these criteria hold for Projects of up to 1,000 Tasks (the QR-001 scale), measured on the 60-Task fixture and on 1,000-Task backlogs.
- **QR-003 (re-based on Granite):** download ≤ 60 MB; background indexing of ≈ 170 Tasks within 3 minutes and of 1,000 Tasks within 20 minutes on a typical laptop. Evidence: on the same host and runner, Granite embedded 1,000 Tasks in 188–200 s against LEAF-IR's 70–75 s (`probes/fo-001/embedding-times.txt`); LEAF-IR took ≈ 107 s in the app.
- **QR-004 (re-based on Granite):** server memory added ≤ 800 MB at peak while indexing and ≤ 450 MB while only searching; back to ≤ +50 MB after 10 idle minutes. Measured on the WASM probe: Granite ≈ 370 MB loaded, ≈ 720 MB peak.
- **QR-005:** unchanged (Granite's files are 55 MB, within 60 MB).

## Problem And Desired Outcome

- **Problem:** The Projects board search matches only an exact, case-insensitive piece of a Task's description. A user who doesn't remember a Task's wording can't find it: none of 40 differently worded test queries returned anything on the real backlog of 168 Tasks. Agents have no search at all. The Project Task Manager's only way to check whether a Task already exists is `list_project_tasks`, which returns every Task in full (≈ 470 K characters for today's backlog).
- **Affected actors or systems:** the user (Projects page Tasks tab and right-panel Projects board, in the desktop app or a browser connected to any node, including Docker nodes); the Project Task Manager and any agent whose definition selects the new tool; the server (model, index, search).
- **Desired outcome:** the user and agents find Project Tasks by meaning (paraphrases, related concepts) as well as by the exact words they remember. Everything runs locally on the CPU with a compact model. It is built on a reusable embedding layer that later features (conversations, memory, notes) can use without changing the layer.
- **Observable definition of success:** a paraphrased query in the board search shows the intended Task among the first results, and so does a sentence given to `search_project_tasks`. Today's exact matches still appear. Edits, deletions and restarts never produce stale results. First use and failures are explained without blocking ordinary Task management. Installation needs no database server, vector database, GPU or hosted service.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | Board search = case-insensitive substring of the whole query in the description, client-side, per Project; lanes ordered by last update | Board search also finds Tasks by meaning; while searching, each lane lists matches best-first | Lanes, Cancelled toggle, Clear search, per-Project transient search, Refresh, compact panel, locator reveal; every Task that matches today still matches | `ProjectTaskBoard.vue`; web `docs/projects.md`; probe: 0/40 |
| BEH-002 | Contract | SCN-003 | No search tool; `list_project_tasks` returns all Tasks in full | New `search_project_tasks` tool: Project + sentence in, compact best-first Tasks out | Existing tools unchanged | tool contract |
| BEH-003 | System | SCN-004 | No index | The index follows Task create/edit/delete and Project delete; persists across restarts | Task files remain the only source of truth | `ProjectTaskService`, change marks |
| BEH-004 | System / User | SCN-005, SCN-006 | No model, no readiness state | First use obtains the model and indexes existing Tasks in the background; readiness and failures are shown; exact search always works | Task create/edit/delete, the board and server startup are never blocked by search | — (new) |
| BEH-005 | Contract (internal) | SCN-007 | No embedding capability | A reusable embedding layer: collections, model runner, vector storage, incremental indexing, similarity query; Task search is its first collection | — | grep: no embedding code |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | Find an existing Task without remembering its wording | Relevant Tasks appear for a paraphrase, in the familiar board | No setup work; never blocks Task management |
| Project Task Manager (agent) | Find whether a Task already exists or which Task the user means | A short, best-first list from one sentence | Compact result; clear tool description |
| Future features (conversations, memory, notes) | Search their own items by meaning | Reuse the embedding layer by registering a new collection | Not built now |
| Release / installation | Ship on every supported platform | No new service, GPU or database server; licences in order | Proportionate footprint |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | The user searches a Project's Tasks by typing a sentence (or remembered words) on the board: the Projects page Tasks tab and the right-panel Projects board | SCN-001, SCN-002 |
| UC-002 | An agent searches a Project's Tasks with a sentence through `search_project_tasks`; the Project Task Manager's definition selects the tool | SCN-003 |
| UC-003 | The search index follows Task and Project changes and server restarts | SCN-004 |
| UC-004 | First use and failure: the model is obtained, existing Tasks are indexed, readiness and failures are explained, and the user can retry | SCN-005, SCN-006 |
| UC-005 | A future collection is added on the embedding layer without changing the layer | SCN-007 |
| UC-006 | A server operator switches the active embedding model through a server setting | SCN-008 |

### Out Of Scope

- Searching conversations, agent memory, notes, workspaces, Task context files or attachment contents. The layer must allow these later; none is built now.
- Temp tasks (Tasks with no Project): their board keeps today's substring search (DEC-007).
- The Task dependency picker search and the Projects list search: unchanged.
- Cross-Project search on the board (the board is per Project); cross-node search.
- Changing Task storage, Task files or any existing persisted data.
- Showing why a Task matched on its card (highlighting). This was "considered" in Task `autobyteus-126` and stays with that Task.
- A front-end screen where users choose and download an embedding model themselves (user, 2026-10-18: "maybe in the future"). The design must make it possible (REQ-015) but it is not built now.
- Shipping more than the catalog models listed in DEC-002; per-collection model choice.
- Task key lookup (`autobyteus-42`) in search: removed from this ticket by the user (2026-10-18, "keep it simple"; users type sentences). Task `autobyteus-126` remains a separate Task for the Project Task Manager and the user to decide on.

### Non-Goals

- No relevance-tuning UI or user-configurable thresholds; no model picker in the app UI in this ticket. The active model is a server setting (REQ-015).
- No guarantee that every conceptually related Task appears. The goal is that the intended Task is among the first results for typical paraphrases (QR-007).
- No index or model sharing between nodes.

### Preserved Behavior Boundary

- BEH-001 preserved column: lanes and their order of statuses; the Cancelled toggle (search applies only to shown Tasks); per-Project transient search text; Clear search; Refresh never clears search; successful creation clears search; the "Show Task in Projects" locator clears a search that hides its Task; the compact right-panel board behaves the same; lane counts count matches; Project totals come from the unfiltered list.
- Every Task that the current substring rule matches remains a match (REQ-002).
- Existing agent tools, their inputs and their results are unchanged (BEH-002).
- Task create/edit/delete latency and server startup are not affected by search (REQ-010, QR-006).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Board search finds a Project's Tasks by meaning: a query worded differently from a Task's description (paraphrase, related concept) returns that Task among the first results. | BEH-001 | Must | Core request | User 2026-10-13 |
| REQ-002 | Today's exact matching is kept: every Task whose description contains the query (case-insensitive) is still a match, and exact matches rank above meaning-only matches. | BEH-001 | Must | Preserve existing lookup; no regression for remembered words | Task text; user 2026-10-18 ("keep it simple") |
| REQ-003 | Result rule and presentation while searching (DEC-001). The status lanes stay, and each lane lists its matching Tasks best-first instead of by last update. A Task is a match when it is an exact match (REQ-002), or one of the closest meaning matches: those nearly as relevant as the best one, at most 20, and only when the best one is clearly relevant. Lane counts count matches. When nothing matches, the existing no-match state with Clear search shows. Clearing the search restores the normal order. | BEH-001 | Must | "Settle relevance/ranking and empty/no-match behaviour" | DEC-001 (user) |
| REQ-004 | The preserved board behaviors listed in the Scope Guardrail keep working, on both the Projects page and the right-panel board. | BEH-001 | Must | Preserve existing controls | Task text |
| REQ-005 | A new agent tool `search_project_tasks` takes `project_id` (first, required) and `query` (required, a sentence or a few words), plus optional `limit` (default 10, 1–30). It returns that Project's best-matching Tasks best-first. Each result carries the Task's key as `taskId`, its `status`, a one-line `summary` (the description's first line, at most 160 characters) and `match` (`exact` or `meaning`). The result also says whether meaning search was used or, if not, why. Unknown Projects and invalid arguments fail like the existing Project tools. The description says when to use it instead of `list_project_tasks`. | BEH-002 | Must | Agents need search with a compact result | User 2026-10-18 (tool name and parameter order); DEC-005 |
| REQ-006 | The tool is available to native and MCP-based runtimes like the other Project tools, and only to definitions that select it. The Project Task Manager's definition selects it, and its skill tells it to search before creating a Task that may duplicate existing work and when the user refers to a Task by description. | BEH-002 | Must | "the Project Task Manager can do the same" | DEC-005; `docs/modules/projects.md` |
| REQ-007 | Results are never stale. A deleted Task, or a Task of a deleted Project, never appears. Status filtering uses the current status. A created or edited Task is found by its current text, by exact match at once and by meaning within QR-002. Until then, it is never ranked by meaning from text it no longer has. | BEH-003 | Must | "must not leave misleading stale results" | Task text |
| REQ-008 | The index persists across server restarts. After a restart, unchanged Tasks are not re-indexed, and Tasks changed while the index was not running are brought up to date. | BEH-003 | Must | "the index persists across restarts" | Task text |
| REQ-009 | First use needs no setup step. When meaning search is first needed, the server obtains the model (DEC-003) and indexes the Project's existing Tasks in the background. Meanwhile, exact matches show, and the board shows a short status ("Preparing meaning search… N of M Tasks"). When it finishes, the shown results update without retyping. | BEH-004 | Must | "Explain first-use model availability/index readiness" | Task text; DEC-003 |
| REQ-010 | If the model can't be obtained or run, the board shows a short message saying what failed, that exact matches still work, and a Retry action. The tool result states the same. Nothing else is affected: Task create, edit, delete, lists, the board and server startup never wait for or fail because of meaning search. | BEH-004 | Must | "without blocking ordinary ticket management" | Task text |
| REQ-011 | The embedding layer is generic. It loads and runs the model, stores vectors, keeps a collection's index in step with its items incrementally, and answers "most similar items in collection C to text T" with scored item IDs. Task search is its first collection. A second collection can be added without changing the layer, demonstrated by a test-only collection. | BEH-005 | Must | User 2026-10-18 | User |
| REQ-012 | Local and server-side only. The server provides the whole capability: model download, model execution, index and search. Nothing depends on the Electron desktop shell, so it works the same on a self-hosted server in the user's own infrastructure, on a Docker node and in the desktop app. Inference runs on the server machine's CPU, with no GPU, no hosted embedding API, no external search service, and no separate database server or vector database. Task text never leaves the server machine. After the one-time model download, meaning search works offline. | BEH-004, BEH-005 | Must | Hard constraints; some users deploy the server in their own infrastructure | User 2026-10-13; user 2026-10-18 ("i dont want to be dependent on electron… the solution is server side solution") |
| REQ-013 | Works on every supported installation: desktop macOS arm64/x64, Linux x64/arm64, Windows x64, and the Docker images (amd64/arm64). Model and runtime licences permit distribution, notices are included, and the repository licensing check passes. | BEH-004 | Must | Supported installations | `release-desktop.yml`; RELEASE.md |
| REQ-014 | Only the Task description is indexed. Context files, conversations and workspaces are not. | BEH-005 | Must | Scope | Task text |
| REQ-015 | The embedding model is replaceable. The server knows a catalog of supported models. Each entry defines: pinned download source and checksums, prompts, pooling, token limit and relevance thresholds. Each server chooses its active model through a server setting (default: the recommended model, DEC-002), so different environments can use different models. Changing the setting takes effect without code changes. The model is downloaded on its first use, and the existing index is rebuilt for it in the background; vectors of different models are never mixed. Exact search keeps working during the rebuild. A later front-end model chooser/downloader can use the same catalog and server operations without changing the embedding layer. | BEH-005 | Must | Different environments may need different models; models improve quickly | User 2026-10-18 ("we are able to switch the embedding model in the future… maybe in the future on the front end… allow the user to download a certain embedding model themselves") |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | BEH-001 / SCN-001 | A Project with representative Tasks (test data package); meaning search ready; the user types a paraphrase of one Task | That Task is shown in its lane among the first 5 matches; lanes keep their status order; matches are best-first | — | Real-app run (isolated instance) + web unit tests |
| AC-002 | REQ-001, QR-007 | BEH-001, BEH-002 / SCN-001, SCN-003 | Synthetic representative test set (paraphrased queries with known targets) | The target Task ranks in the top 5 for ≥ 90% of queries and top 10 for ≥ 95% | — | Server test over the real model (gated if download needed) |
| AC-003 | REQ-002 | BEH-001 / SCN-002 | Query is a phrase contained in one or more descriptions | Every Task whose description contains the phrase is a match and ranks above meaning-only matches | — | Server unit tests; web tests |
| AC-004 | REQ-003 | BEH-001 / SCN-001 | A query clearly unrelated to every Task, from a defined set (e.g. "recipe for banana bread", random letters) | The existing no-match state with Clear search shows (no forced weak meaning matches) for at least 90% of the defined set | — | Server test (cut-off) + web test |
| AC-005 | REQ-004 | BEH-001 / SCN-001 | Search active; user toggles Cancelled, presses Refresh, opens and returns, creates a Task, uses "Show Task in Projects" for a hidden Task, uses the right-panel board | Each behaves as today (see Scope Guardrail) | — | Existing web tests stay green + new cases |
| AC-006 | REQ-005, REQ-006 | BEH-002 / SCN-003 | An agent calls `search_project_tasks` with a `project_id` and a sentence | Best-first list of at most `limit` compact items (`taskId` key, `status`, `summary`, `match`) plus the meaning-search state | Unknown `project_id` → the existing Project error; empty query or bad `limit` → argument error | Server unit + E2E (native and MCP exposure) |
| AC-007 | REQ-006 | BEH-002 / SCN-003 | Project Task Manager definition (companion repo) | Its tool list includes `search_project_tasks`; its skill describes when to search | A definition that doesn't select the tool doesn't get it | Review of the companion change; real-app run |
| AC-008 | REQ-007 | BEH-003 / SCN-004 | Ready index; the user edits a Task's description to a new topic, deletes another Task, deletes a Project | Searching the new topic finds the edited Task within QR-002; its old topic no longer finds it by meaning; the deleted Task and the deleted Project's Tasks never appear | During the update window the edited Task is found by exact text only | Server tests; real-app run |
| AC-009 | REQ-008 | BEH-003 / SCN-004 | Index built; server restarted | Search works without re-indexing unchanged Tasks (no model work for them); a Task changed while the index was not running is brought up to date | A missing or unreadable index file is rebuilt; nothing is lost | Server tests; real-app run with restart |
| AC-010 | REQ-009 | BEH-004 / SCN-005 | Fresh install, Tasks exist, no model yet; the user searches | Exact matches show at once with "Preparing meaning search… N of M Tasks"; when ready, the results include meaning matches without retyping | — | Real-app run; web tests with a mocked state |
| AC-011 | REQ-010 | BEH-004 / SCN-006 | The model can't be downloaded (offline) or fails to load | Board shows the failure message with Retry; exact matches still show; Task create/edit/delete work normally; the tool result states that meaning search is unavailable and why | Retry after the network returns succeeds | Server tests (simulated failure); real-app run offline |
| AC-012 | REQ-010, QR-006 | BEH-004 | Server start | Startup does not load the model or index anything | — | Server test / timing check |
| AC-013 | REQ-011 | BEH-005 / SCN-007 | A test-only second collection registered in a test | It indexes and queries through the same layer with no change to layer code | — | Server unit test |
| AC-014 | REQ-012, REQ-013 | BEH-004 | Packaged desktop build and Docker image | No GPU or external service at query time; works offline after the download; licensing check passes; notices present | — | Build checks; release workflow; Docker smoke |
| AC-015 | QR-001…QR-005 | — | Synthetic backlog of 1,000 representative Tasks | Measured latency, indexing time, memory and disk meet the QR targets | — | Measurement report in validation |
| AC-016 | REQ-015 | BEH-005 / SCN-008 | Ready index on the default model; the operator sets the active-model server setting to another catalog model | The next search downloads the new model, rebuilds the index in the background with progress, then returns meaning results from the new model only; switching back works the same way; an unknown model id is rejected by the setting | Download failure of the new model → unavailable state with Retry; exact search unaffected | Server tests with two catalog entries; real-app run switching once |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Find an existing Task whose wording they don't remember | Board search box (Projects page Tasks tab; right-panel Projects board) | Project with Tasks; meaning search ready | Type a description of the problem in their own words → board shows matching Tasks best-first per lane → open one | The intended Task is among the first shown | No match → no-match state; Clear | Supported Normal Scenario | User 2026-10-13 | REQ-001, REQ-003, REQ-004; AC-001, AC-002, AC-004, AC-005 |
| SCN-002 | User | User | Find a Task by words they remember | Board search box | Any | Type a phrase from the description | Exact matches first | — | Supported Normal Scenario | Current behavior; Task 8865a11e | REQ-002; AC-003 |
| SCN-003 | Contract | Project Task Manager (or any agent selecting the tool) | Check whether a Task exists / which Task the user means | `search_project_tasks` tool call | Agent knows the Project | Call with a sentence → read compact list → act on a `taskId` | Correct Task identified without listing everything | Meaning search not ready/unavailable → keyword results with a stated reason | Supported Normal Scenario | User 2026-10-18 | REQ-005, REQ-006; AC-006, AC-007 |
| SCN-004 | System | Task writers (UI GraphQL, agent tools) | Keep search truthful | Task create / description edit / status change / delete; Project delete; server restart | Index exists | Change committed → index brought up to date | Search reflects current Tasks | Index file missing/unreadable → rebuilt | Supported Normal Scenario | Task text | REQ-007, REQ-008; AC-008, AC-009 |
| SCN-005 | System / User | First search after install or upgrade | Make existing Tasks searchable | First board search or tool call | No model / no index | Obtain model (one time) → index the Project's Tasks in the background → results update | Meaning search ready | Large backlog → progress shown | Supported Normal Scenario | Task text | REQ-009; AC-010 |
| SCN-006 | System / User | Offline first use; model failure | Explain and keep working | Same as SCN-005 | Model can't be obtained/run | Error state + Retry; exact matches continue | Clear message; no blocking | Retry succeeds later | Supported Explicit Edge Scenario (Task text: "Explain … failures clearly, without blocking ordinary ticket management") | Task text | REQ-010; AC-011 |
| SCN-008 | Operational | Server operator (desktop user, Docker or self-hosted admin) | Use a model that suits this environment (e.g. multilingual) | Server setting for the active embedding model | Index on another model | Change the setting → next search prepares the new model and rebuilds | Meaning search on the new model | Download failure → unavailable + Retry | Supported Normal Scenario | User 2026-10-18 | REQ-015; AC-016 |
| SCN-007 | Contract (internal) | Developer of a future feature | Search another kind of item by meaning | Code: register a collection on the embedding layer | Layer exists | Provide items (id + text) → sync → query | Scored ids for that collection | — | Supported Normal Scenario (user-required reuse) | User 2026-10-18 | REQ-011; AC-013 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (existing board search box; no new screens)
- Linked UI/UX or interaction supplement: N/A — not applicable (no Product Design request; the existing board and its approved design remain the visual basis)
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: existing board (`web/docs/projects.md`)
- Normative visual and interaction details:
  - Same search box, placeholder text updated to invite a sentence (e.g. "Describe the task you're looking for").
  - While searching: lanes unchanged, matches best-first in each lane; no scores shown.
  - One quiet status line under the toolbar only when meaning search is not ready: preparing (with N of M progress) or unavailable (reason + Retry). Nothing is shown when ready.
  - Search requests are debounced (about 250 ms after typing stops); exact matches can show immediately from the loaded list.
- Explicitly illustrative fixture content or permitted implementation variation: wording of status texts (localized, en + existing locales), exact debounce.
- Required screens, states, transitions: ready / preparing (progress) / unavailable (Retry) / no-match; compact panel shows the same states.
- Product decisions that need the user: DEC-001 (result rule and presentation).

## Quality And Non-Functional Requirements

Proposed targets, to be agreed with the user (DEC-004). Measurement basis: `investigation-notes.md` benchmarks (M1 Max). The validation must re-measure on the built app with a synthetic 1,000-Task backlog.

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, AC-015 | Performance | Board results update within 0.5 s after typing stops; server search time ≤ 150 ms at p90 | Project with up to 1,000 Tasks; meaning search ready | Measure server timing + UI |
| QR-002 | REQ-007, AC-008 | Performance | A created/edited Task is found by meaning within 10 s (typically ~2 s); deletions take effect immediately | Ready index | Server test timing |
| QR-003 | REQ-009, AC-010 | Performance | With the default model (Granite Small English R2, SR-007): one-time download ≤ 60 MB. Background indexing of today's backlog (≈ 170 Tasks) finishes within 3 minutes, and 1,000 Tasks within 20 minutes. Exact search works throughout. Other catalog models differ (stated per model in the catalog). | Typical laptop CPU. Same-host runner evidence: Granite 188–200 s per 1,000 Tasks vs LEAF-IR 70–75 s | Measure on the build |
| QR-004 | AC-015 | Resource | With the default model, server memory added by meaning search is ≤ 800 MB at peak while indexing and ≤ 450 MB while only searching. It returns to near the baseline (≤ +50 MB) after 10 minutes without searches or Task edits. | WASM probe: Granite ≈ 370 MB loaded, ≈ 720 MB peak (in-process RSS) | Measure (footprint) |
| QR-005 | AC-015, AC-016 | Resource | Index storage ≤ 10 MB per 1,000 Tasks. Model files of the default ≤ 60 MB (Granite 55 MB). Only the active model's files and vectors are kept after a switch completes. | Expected ≈ 1.5 MB per 1,000 Tasks (384 dimensions) | Measure files |
| QR-006 | REQ-010, AC-012 | Performance | No model loading or indexing during server startup; Task create/edit/delete add no waiting for search | — | Test / timing |
| QR-007 | REQ-001, AC-002 | Quality | Representative paraphrase set: target Task in top 5 for ≥ 90% of queries and top 10 for ≥ 95% (for every catalog model) | Measured on real Tasks (69 queries): default Granite 95.7% / 100% (SR-007); LEAF-IR 98.6% / 100%; EmbeddingGemma 2 97.1% / 98.6% | Probe + synthetic durable test |
| QR-008 | REQ-013, AC-014 | Compatibility | Same behavior on all supported desktop platforms and Docker images; no native binary that a platform lacks | — | CI builds + Docker smoke |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (new derived data only)
- Data or state that must be preserved: all Task and Project data, unchanged; Task files stay the only source of truth.
- Loss, reset, rebuild, or regeneration that is acceptable: the search index and the downloaded model may be deleted, rebuilt or re-downloaded at any time without user-visible loss beyond preparation time.
- Retention, privacy, compliance, volume, downtime, or operational constraints: Task text stays on the machine; index stored under the node's app data; deleting a Task or Project removes its index entries.
- Unknowns requiring downstream investigation: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Embedding model catalog (default since SR-007: IBM Granite Small English R2, Apache-2.0; also MongoDB LEAF-IR, EmbeddingGemma 2) | Compact, CPU, permissive licence; switchable (REQ-015) | `model-evaluation-report.md` | Default is English-only; a multilingual environment switches to EmbeddingGemma 2 |
| CPU inference runtime + tokenizer | Runs on every supported platform with no missing native binary | investigation-notes runtime table | WASM speed vs native |
| Model file host (one-time download) | Pinned version, integrity-checked | DEC-003 | Network availability on first use |
| Project Task Manager package (companion repo `autobyteus-agents`) | Selects the tool; skill guidance | REQ-006 | Separate PR in that repository |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `model-evaluation-report.md` | Model experiments: method, candidates, results, conclusions, reproduction | DEC-002, REQ-015, QR-003…QR-005, QR-007 | Evidence (round 2 current) | Supports DEC-002; not itself behavior-defining |
| `probes/*` | Investigation evidence (benchmarks, baselines, query sets, raw results) | REQ-001, QR-* | Evidence | Not behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Task text is mostly English | English default model (DEC-002, Granite) | 166/168 real Tasks are English; a multilingual model is available in the catalog | Mitigated by REQ-015 |
| ASM-002 | A one-time model download on first use (default ≈ 24 MB) is acceptable | DEC-003 | User confirms DEC-003 | Pending user |
| ASM-003 | Typical laptops are 2–4× slower than the M1 Max benchmark host | Target headroom | Validation measures on the build | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Which Tasks count as matches by meaning, and how does the board show them? | Every Task has some similarity score, so without a rule search returns the whole board; it sets visible behavior | (a) Keep lanes, best-first per lane; matches = exact matches + the meaning matches nearly as relevant as the best one (cap 20), none when even the best is weak; (b) switch to a single ranked list while searching; (c) show everything ranked | (a) keeps the familiar board and status controls (the request says enhance, not replace) and keeps lane counts meaningful. On the real backlog, the "nearly as relevant as the best" rule showed 1 meaning match typically and 9 at p90, and always included the intended Task (40/40). Off-topic queries scored clearly lower, so they show no-match. Words that appear in Tasks still bring every exact match. **Recommend (a).** | User | Decided (user approved 2026-10-18) |
| DEC-002 | Which model is the default, and which models does the catalog offer? | Quality, speed, memory, language, licence | `model-evaluation-report.md`, round 2; FO-001 scale evidence (`probes/fo-001/`) | SR-004 chose LEAF-IR for cost. **SR-007:** at 1,000 Tasks LEAF-IR cannot meet AC-001 and AC-004 under any relevance rule tested, while Granite's shipped calibration meets both on the 60-Task fixture and on both 1,000-Task backlogs. **Default: Granite Small English R2.** Catalog also offers LEAF-IR (fastest; suits small Projects) and EmbeddingGemma 2 (multilingual). | User | Decided (user approved SR-004; default changed in SR-007) |
| DEC-003 | How does the model reach the server? | Installer size, offline use, one code path for every server (desktop, Docker, self-hosted) | (a) The server downloads the active model once on first need (default ≈ 24 MB, pinned version, checksum-verified) into its own data folder; (b) bundle it into every desktop build and Docker image (self-hosted builds would also need it) | (a) is one server-side path everywhere: desktop, Docker, self-hosted servers and dev. Installers and images don't grow, no model weights go into git or CI, and nothing depends on Electron (REQ-012). The cost is that first use needs network once from the server; offline first use shows "unavailable" and exact search still works. **Recommend (a).** | User | Decided (user approved 2026-10-18) |
| DEC-004 | Performance and resource targets | "Requirements and performance expectations agreed with the user" | QR-001…QR-008 from measurements | Targets set with headroom over the measured values (see QR table) | User | Decided (user approved 2026-10-18) |
| DEC-005 | Agent tool shape | Usability for agents | Name `search_project_tasks` (user, 2026-10-18, after first saying `search_tasks`: "search project tasks please my mistake. because there are tool like list project tasks"); `project_id` first, then `query`; optional `limit`; no status filter; compact items | The user chose the name (consistent with `list_project_tasks`) and parameter order. Per Project, like `list_project_tasks`; `taskId` = key as in every Project tool. No status filter (keep it simple): each result shows its status. A compact result keeps agent context small; full details stay in `list_project_tasks`. | User (name, order); Solution Designer (rest) | Decided |
| DEC-006 | Task key lookup in search | Scope and simplicity | Earlier proposal (SR-001): add key exact/prefix matching, consistent with Task `autobyteus-126` | The user removed it (2026-10-18): users type sentences and don't remember keys; keep it simple. Not in this ticket. `autobyteus-126` stays a separate Task; the Project Task Manager is told about the user's view. | User | Decided |
| DEC-007 | Temp tasks board | Scope | Keep its substring search | Temp tasks are execution helpers, not Project work (`projects.md`); the request is Project Task search | Solution Designer | Decided |
| DEC-008 | Board search scope | Consistency | Per Project (board shows one Project) | Matches the board and the tool | Solution Designer | Decided |
| DEC-009 | Behavior while preparing/unavailable | First-use UX | Exact matches + one status line; results refresh when ready; tool waits briefly (bounded) for readiness before answering, then reports state | Agents act on results, so a short bounded wait avoids false "no such Task" conclusions; the board never waits | Solution Designer | Decided |
| DEC-010 | Storage technology | User delegated it (2026-10-18) | Architecture decision | Decided in the design (local file storage, no server) | Solution Designer | Decided (design) |
| DEC-011 | At which Project size must AC-001, AC-002 and AC-004 hold? | Acceptance scale (FO-001 question 1) | QR-001 says up to 1,000 Tasks | They hold for the default model on Projects of up to 1,000 Tasks, verified on the 60-Task fixture and on 1,000-Task backlogs (generated and real-text). Other catalog models are verified on the fixture (QR-007), with their scale behavior documented. | User (SR-007) | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 | Benchmarks |
| REQ-002 | UC-001, UC-002 | BEH-001 | AC-003 | SCN-002 | — |
| REQ-003 | UC-001 | BEH-001 | AC-001, AC-004 | SCN-001 | DEC-001 |
| REQ-004 | UC-001 | BEH-001 | AC-005 | SCN-001 | web docs |
| REQ-005 | UC-002 | BEH-002 | AC-006 | SCN-003 | DEC-005 |
| REQ-006 | UC-002 | BEH-002 | AC-006, AC-007 | SCN-003 | PTM package |
| REQ-007 | UC-003 | BEH-003 | AC-008 | SCN-004 | — |
| REQ-008 | UC-003 | BEH-003 | AC-009 | SCN-004 | — |
| REQ-009 | UC-004 | BEH-004 | AC-010 | SCN-005 | DEC-003 |
| REQ-010 | UC-004 | BEH-004 | AC-011, AC-012 | SCN-006 | — |
| REQ-011 | UC-005 | BEH-005 | AC-013 | SCN-007 | — |
| REQ-012 | UC-001…UC-005 | BEH-004, BEH-005 | AC-014 | SCN-005 | — |
| REQ-013 | UC-004 | BEH-004 | AC-014 | SCN-005 | Licences |
| REQ-014 | UC-003 | BEH-005 | AC-008 | SCN-004 | — |
| REQ-015 | UC-006 | BEH-005 | AC-016 | SCN-008 | `model-evaluation-report.md` |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001…SCN-007 (after approval).
- Product and system constraints architecture must preserve: REQ-012/QR-006 (local, lazy, non-blocking); preserved board behaviors (REQ-004); Task files as the source of truth.
- Decisions intentionally deferred to architecture design: storage technology (DEC-010), runtime (WASM vs native), indexed-text strategy (whole Task vs chunks), hybrid ranking method, relevance floor value, index-update trigger, model lifecycle (load/unload), packaging and licence notices, download source and integrity checks.
- Technical facts architecture should verify: WASM threading in Node/Electron; memory after releasing model bytes; ranking fusion benefit; floor calibration; MCP exposure of a new Project tool; prune `onnxruntime-web` in packaging.
- Known feasibility or integration risks: RSK-001…RSK-003 (investigation notes).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
