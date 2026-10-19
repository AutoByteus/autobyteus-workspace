# Requirements Document

## Document Status

- Status: `Approved` (SR-004)
- Current solution revision ID: `SR-004`
- Package identifier: `search-model-settings`
- Request / ticket: Project Task `autobyteus-146` (`project_task_d5a33e15-bdd7-4fc1-b7d4-5154661ff922`), follow-up FU-1 of `autobyteus-71`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's request of 2026-10-18
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approved by and reference: `Solution Designer within the direction (user informed)`. The only decision that needed the user (DEC-005) and the visible design were decided by the **user** in the Product Team conversation: the user directed placement under Server Settings named Embedding, technical wording, a cleaner look, only the necessary facts, the source said once and much less text, and then approved the design with "done" on 2026-10-19 (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/search-model-settings/ui-ux-spec.md`, § Status And User Confirmation). The Solution Designer's decisions DEC-001…DEC-004 and DEC-006…DEC-008 were presented to the user on 2026-10-19 without objection. The user was informed in the Solution Designer conversation on 2026-10-19.
- Exact approved requirements baseline / solution revision: this document at `SR-004` (SR-002 + the SR-004 gap decisions DEC-009, DEC-010, approved by the Solution Designer within the direction; user informed 2026-10-19)
- Behavior-defining supplements: the Product-owned approved UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/search-model-settings/ui-ux-spec.md` (Status `Approved`; design revision `4e4ac06`, integration `cb384e3` on the design repository's `personal`) and its final visual references VIS-001…VIS-021. User-approved 2026-10-19.

## Problem And Desired Outcome

- **Problem:** the embedding model can be changed only through a raw server setting (shown in Advanced only once it has a value). A model is downloaded, and a Project indexed, only when someone first searches. Users can't prepare ahead, can't see what's indexed, and can't start indexing on purpose. That matters most for heavy models: EmbeddingGemma 2 is ≈ 346 MB and ≈ 4 s per Task.
- **Desired outcome:** an "Embedding" sub-section in Settings → Server Settings (user's decision) where the user can see the catalog models, download one ahead of time, choose the active model, see each Project's index state, and start or rebuild indexing. Automatic first-search preparation stays.
- **Success:** the user picks a catalog model in Settings, watches its download and each Project's indexing progress, starts indexing on demand, and board/agent search then uses the chosen model.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Operational | SCN-001, SCN-003 | Change model only through the raw setting `AUTOBYTEUS_EMBEDDING_MODEL` | Choose the model in Settings → Search; it writes the same setting | The setting stays the single source of truth; env/Advanced edits keep working | setting code |
| BEH-002 | System | SCN-004 | First search downloads, loads and indexes | Unchanged | First-search preparation; the board's status line and Retry | autobyteus-71 |
| BEH-003 | User | SCN-002 | Not possible | Download a catalog model ahead of time with progress and cancel; downloaded models stay until removed | Checksum verification; pinned sources | — |
| BEH-004 | System | SCN-002 | When the active model becomes ready, every other model's files are deleted | Files of models the user downloaded stay until the user removes them; vectors of other models are still deleted | Index contains only the active model's vectors | `removeOtherModels` |
| BEH-005 | User | SCN-003 | Index state visible only on the board during a search | Each Project's index state in Settings; "Index now", "Rebuild" and "Index all Projects" | Viewing never starts work | — |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| User (desktop or any browser connected to a node) | Prepare and control meaning search | Model ready and Projects indexed before they search | Server-side; works for Docker and self-hosted nodes |
| Operator of a self-hosted server | Choose a model per environment | Same as above, from the browser | No Electron dependency |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenario IDs |
| --- | --- | --- |
| UC-001 | See the catalog models with name, state, language label and download size (and the total on disk) | SCN-001 |
| UC-002 | Download a catalog model ahead of time (progress, cancel), and remove a downloaded non-active model | SCN-002 |
| UC-003 | Choose the active model | SCN-003 |
| UC-004 | See each Project's index state; "Index now", "Rebuild", "Index all Projects" | SCN-003, SCN-004 |

### Out Of Scope

- Models outside the catalog, or browsing Hugging Face (a separate idea awaiting the user's word).
- A "Index now" link on the board (DEC-004); board search itself is unchanged.
- Automatic pre-indexing at startup or after Task writes.
- Proxy support for downloads (`autobyteus-168`).
- Changing catalog contents or calibration.

### Non-Goals

- No per-Project or per-collection model choice (one active model per server).
- No scheduling of indexing.

### Preserved Behavior Boundary

- autobyteus-71: REQ-001…REQ-014 and AC-001…AC-016 outcomes (search, tool, readiness, delete cleanup, switch without mixing vectors), except BEH-004's file-retention change approved here.
- Exact search always works. Task management is never blocked.

### Prerequisites

None. The architecture review ARCH-REV-001 found no prerequisite; all of its findings are in this ticket's own functionality.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, AC or preserved-behavior ID.
- New behavior, policy or contract is a `Requirement Gap` that needs the user's approval.
- Adjacent concerns are follow-ups, not corrections, unless they are prerequisites (Prerequisites above).
- Reviewer comments don't amend this basis.

## Requirements

| Requirement ID | Requirement | Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Settings → Server Settings has an **Embedding** sub-section (after Basics, before Advanced and Migrations; route `/settings?section=server-settings&mode=embedding`). The **Embedding model** card lists every catalog model with **only**: name, a "Default" mark on the default model, state, a language label ("English" / "100+ languages"; optional when a model has none), and download size. Size is computed from the catalog's file bytes in decimal MB. The card has one shared line, "Used for meaning search. Downloaded from Hugging Face." (with a link), and "On disk: N MB" (downloaded and partially downloaded files). States: **Active** (with readiness: **Ready** when its files are on disk and nothing failed, whether or not the model is loaded yet; **Preparing…** with download or loading progress only while preparation actually runs; **Not downloaded** with a **Download** action when its files are not on disk and nothing runs (DEC-009); **Unavailable** + reason + **Retry**, which restarts preparation at once), **Downloaded**, **Not downloaded**, **Downloading N of M MB**. Licence, indexing speed and memory are not shown. Layout and copy as in the approved UI/UX spec. | BEH-001, BEH-003 | Must | UC-001 | User via Product (2026-10-19); UI/UX spec |
| REQ-002 | **Download** fetches a not-downloaded model ahead of time, checksum-verified like a first-use download, with live progress and **Cancel**. A cancelled or failed download leaves no partial files; a failure shows "Download failed: <reason>" (the network reason names `huggingface.co`) with Retry. **Use this model** is also offered on a not-downloaded model (the download then happens as part of the switch); it is hidden while that model downloads ahead. A downloaded non-active model has **Remove**, with an inline confirmation ("Remove <name>? This frees <size> MB."); the active model has no Remove. | BEH-003, BEH-004 | Must | UC-002; heavy models | Task; DEC-003; UI/UX spec D-1, D-2 |
| REQ-003 | Files of every model the user downloaded stay on disk until the user removes them. A switch no longer deletes the previous model's files. Vectors of non-active models are still deleted once the active model's index is ready. | BEH-004 | Must | Download ahead requires it | DEC-001 |
| REQ-004 | **Use this model** opens a confirmation dialog. Title "Use <model>?"; lead "Every Project has to be indexed again with this model."; one bullet "Until then, meaning search finds exact matches only."; one line with the download size ("Download: <size> MB, not downloaded yet" or "Download: Already downloaded"); Cancel and Use this model. Confirming writes `AUTOBYTEUS_EMBEDDING_MODEL`. The switch takes effect immediately: the new model is prepared (downloaded if needed; the active model's own preparing download has no Cancel), every Project shows Not indexed for it, and indexing follows the existing behavior or the user's Index actions (REQ-006). | BEH-001 | Must | UC-003 | Task; DEC-002, DEC-008 (narrowed by the user via Product) |
| REQ-005 | The **Project indexes** card ("Using <model>.") lists every Project alphabetically with its state for the active model: **Not indexed**, **Waiting…** (for the model or its turn), **Indexing N of M** (for Needs update: N of K changed), **Ready · M Tasks**, **Needs update · K changed**, or **Unavailable** (when the model is unavailable: every Project, no actions; Retry is on the model). A Project with no Tasks shows **Ready · 0 Tasks** with no actions (DEC-010). While the active model is Not downloaded, Projects show their state for that model (normally Not indexed), and Index now / Index all stay available; they prepare the model first. Filter tabs: All · Needs indexing · Indexing · Ready, with counts. A name filter appears above 8 Projects. Empty: "No Projects yet." The panel has its own loading and load-error (Retry) states. Opening or refreshing the section never starts a download or indexing. | BEH-005 | Must | UC-004 | Task; UI/UX spec D-3, D-5 |
| REQ-006 | Per Project: **Index now** (Not indexed and Needs update; indexes missing or changed Tasks) and **Rebuild** (Ready and Needs update; inline confirmation "Rebuild “<name>” from scratch? Meaning search is exact-only until it finishes."; drops the Project's vectors for the active model and indexes every Task). **Index all Projects** (the only filled button) runs Index now for every Not indexed or Needs update Project; disabled when there is none or the model is unavailable. Each action prepares the model if needed and shows progress. The board keeps working meanwhile. | BEH-005 | Must | UC-004 | Task; DEC-006, DEC-007; UI/UX spec D-1, D-4 |
| REQ-007 | Progress (downloads, indexing) updates live while the section is open, at least every 2 seconds. Leaving the page doesn't stop the work. Returning shows the current state. | BEH-003, BEH-005 | Must | Usability | — |
| REQ-008 | Everything is server-side. The section works for the node the window is connected to (desktop, Docker, self-hosted) with no Electron dependency. Model choice, downloads and indexing are node state, not browser state. | all | Must | autobyteus-71 REQ-012 | User 2026-10-18 |
| REQ-009 | The raw setting stays authoritative and consistent. A value set in Advanced or an env file shows as the active model in the Search section. An invalid value is rejected as today. | BEH-001 | Must | One source of truth | — |

## Acceptance Criteria

| AC ID | Requirement IDs | Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Open Settings → Search | All 3 catalog models with their facts; Granite marked Active (default) | Setting set to another model → that model marked Active | Web tests + real-app run |
| AC-002 | REQ-002 | SCN-002 | Download a not-downloaded model | Progress climbs to complete; state becomes Downloaded; files verified | Cancel mid-way → Not downloaded, no partial files; offline → reason + Retry | Server tests + real-app run |
| AC-003 | REQ-002, REQ-003 | SCN-002 | Switch from A to downloaded B, then wait until B is ready | A's files still present (Downloaded); A's vectors gone; Remove on A deletes its files | Active model shows no Remove | Server tests |
| AC-004 | REQ-004 | SCN-003 | Use this model on another model | Confirmation shown; on confirm the setting changes; model prepares; board search continues with exact matches until indexed | Cancel in the dialog → nothing changes | Web + server tests; real-app run |
| AC-005 | REQ-005 | SCN-003 | Open the section with Projects in various states | Correct state per Project; no download or indexing starts by opening | — | Server tests (no scheduling) + web tests |
| AC-006 | REQ-006 | SCN-004 | Index now / Rebuild / Index all Projects | Progress shown per Project until Ready; meaning search then uses the active model | Model unavailable → Projects show Unavailable; Retry at model level | Server tests + real-app run |
| AC-007 | REQ-007 | SCN-002, SCN-004 | Leave the page during work and return | Work continued; the current state is shown | — | Real-app run |
| AC-008 | REQ-008 | — | Use the section on a Docker node from a browser | Same behavior | — | Docker/remote run |
| AC-009 | REQ-009 | SCN-001 | Set the key in Advanced to another catalog model | The Search section shows it as Active | Invalid value rejected | Web tests |
| AC-010 | Preserved | — | autobyteus-71 suites | Still pass (search, tool, delete cleanup, switch) | — | Existing tests |
| AC-011 | REQ-001, REQ-005 | SCN-001 | Fresh data root (no model on disk), or the setting switched in Advanced to a model that isn't downloaded; open Embedding | The Active row shows "Active · Not downloaded" with Download; nothing downloads until Download (or Index now / Index all) is pressed; then "Preparing…" with progress, no Cancel | — | Server + web tests; real-app run on a fresh data root |
| AC-012 | REQ-001, REQ-006 | SCN-003 | Active model Unavailable; press Retry in Embedding | Preparation restarts at once (Preparing…), without a board search | Fails again → Unavailable + reason | Server test + real-app run |
| AC-013 | REQ-001 | SCN-001 | Server restart with the active model on disk; open Embedding | "Active · Ready" (no "Preparing…" while nothing runs) | — | Server test (restart) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Entry | Steps | Outcome | Alternate | Validity | Evidence | Req / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Understand the models | Settings → Search | Open the section and read the models | Knows which is active and what each costs | — | Supported Normal | Task | REQ-001, REQ-009; AC-001, AC-009 |
| SCN-002 | User | User | Prepare a heavy model | Search section | Download → progress → Downloaded (or Cancel) → later Remove | Model ready to use with no wait at first search | Offline: reason + Retry | Supported Normal | Task, user quote | REQ-002, REQ-003; AC-002, AC-003 |
| SCN-003 | User | User | Switch the model | Search section | Use this model → confirm → Index all Projects → watch progress | Meaning search uses the new model | Model unavailable → Retry | Supported Normal | Task | REQ-004, REQ-005, REQ-006; AC-004, AC-005, AC-006 |
| SCN-004 | User | User | Index on purpose | Search section | Index now / Rebuild on a Project | Project Ready | — | Supported Normal | Task, user quote | REQ-006, REQ-007; AC-006, AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- **Product Design delivered and approved:** UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/search-model-settings/ui-ux-spec.md` (Status `Approved`).
- Runnable UI reference: design repository `/Users/normy/autobyteus_org/autobyteus-web-design`, branch `personal`. Run `corepack pnpm install --ignore-workspace --frozen-lockfile`, then `corepack pnpm dev --port 4691`, and open `/settings?section=server-settings&mode=embedding`. Runbook: `ui-reference-runbook.md`, section "search-model-settings".
- Product ticket: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/search-model-settings/product-ticket.md`; review notes: `design-review-notes.md`.
- Design revision: `4e4ac06`, integration `cb384e3` (both on `origin/personal` of the design repository). Source pin: autobyteus-web `2f211340ee36`, identical in Settings to this ticket's base `8d40ba3b6c`.
- User confirmation: "done", 2026-10-19 (spec § Status And User Confirmation).
- **Normative:** every visible detail of VIS-001…VIS-021 (`visual-references/`) and the spec's copy, states, transitions TR-001…TR-020, focus and announcements, and responsive behavior.
- **Illustrative / permitted variation:** Project names, Task counts and progress numbers; server-provided reason wording; the reference's file and test-id names (`Search*`, `search-*`), store, timeline and sequential indexing (see spec § Implementation Fidelity Boundary).
- The ASCII sketch below is **superseded** by the spec.
- Product Design artifacts (UI/UX spec, design repository, approved visual references): N/A — not applicable.
- Sketch, normative for content and actions, illustrative for exact layout:

```
Settings ▸ Search
┌ Search model ─────────────────────────────────────────────────────────┐
│ ● IBM Granite Embedding Small English R2   ACTIVE · Ready             │
│   English · 55 MB · ~0.5 s per Task · Apache-2.0                      │
│ ○ MongoDB LEAF-IR                          Downloaded   [Use] [Remove]│
│   English, small Projects · 23 MB · fastest · Apache-2.0              │
│ ○ Google EmbeddingGemma 2                  Not downloaded  [Download] │
│   100+ languages · 346 MB · ~4 s per Task · up to 1.5 GB RAM          │
│   (while downloading: ▓▓▓▓░░ 120 of 346 MB  [Cancel])                 │
└───────────────────────────────────────────────────────────────────────┘
┌ Project indexes (Granite) ──────────────────── [Index all Projects] ──┐
│ AutoByteus           Ready · 170 Tasks                     [Rebuild]  │
│ AutoByteus Agents    Indexing 12 of 24 ▓▓▓░░                          │
│ AutoByteus Marketing Not indexed                       [Index now]    │
└───────────────────────────────────────────────────────────────────────┘
```

- States: loading; model downloading / cancelled / failed (reason + Retry); active model preparing / unavailable (Retry); Project states as REQ-005; confirmation dialog for a switch.
- Localization: en + zh-CN.
- Product decisions that need the user: none (DEC-005 decided by the user via Product).

## Quality And Non-Functional Requirements

| Quality ID | Related IDs | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-005 | Performance | The section's status loads within 1 s | Up to 20 Projects, 1,000 Tasks each | Measure |
| QR-002 | REQ-005 | Resource | Opening the section does no model work and no indexing | — | Test |
| QR-003 | REQ-001, REQ-003 | Disk | Size per model (from file bytes) and "On disk: N MB" including partial downloads; Remove frees it | — | Test |
| QR-004 | REQ-008 | Compatibility | Same behavior on desktop and Docker nodes | — | Run |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` (derived only). Downloaded model folders are kept rather than deleted. The index stays disposable. Nothing else changes.

## External Contracts And Dependencies

| Dependency | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| autobyteus-71 embedding layer | Extended, not replaced | `personal` @ `8d40ba3b6c` | — |
| Hugging Face file hosting | Same pinned downloads | catalog | Proxies (`autobyteus-168`) |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Keeping several downloaded models on disk (≤ ≈ 425 MB for all three) is acceptable with a visible Remove | REQ-003 | User approval | Pending |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Keep downloaded models after a switch? | "Download ahead" is pointless if the next ready event deletes the file (current `removeOtherModels`) | Keep until removed / keep only the active one | Keep until the user removes them, with sizes shown and a Remove button. Vectors of other models are still removed (they are rebuilt per model anyway). Switching back to a kept model then needs no download. This changes autobyteus-71's "only the active model's files" rule, as the requested feature requires. | Solution Designer (consequence of the Task's direction; user informed) | Decided |
| DEC-002 | Switch immediately, or keep the old model serving until the new one is indexed? | UX vs memory | Immediate (today) / staged (two models at once) | Immediate, as the Task says ("writes the same server setting; the index rebuilds automatically"). Staged would run two model workers at once (up to ≈ 2 GB with EmbeddingGemma 2). Downloading ahead plus "Index all Projects" keeps the gap short. | Solution Designer | Decided |
| DEC-003 | Cancel for downloads? | EmbeddingGemma 2 is 346 MB; mistaken clicks | Cancel / no cancel | Include Cancel: we own the downloader and it's a small addition; leaves no partial files. | Solution Designer | Decided |
| DEC-004 | "Index now" link on the board? | Task says "may also fit" | Add / leave the board as is | Leave the board unchanged. First-search preparation already starts indexing from the board, and the Settings section is the place for deliberate control. Fewer UI changes, less risk. | Solution Designer | Decided |
| DEC-005 | Where and how does the section look? | Visible layout | Top-level "Search" / under Server Settings / under Extensions | **Decided by the user** in the Product conversation: Server Settings → **Embedding**, technical wording, minimal facts and copy (UI/UX spec) | User | Decided |
| DEC-006 | What does Rebuild do? | Recovery | Drop the Project's vectors for the active model, then index all its Tasks | That; it's for "results look wrong" or after problems | Solution Designer | Decided |
| DEC-007 | "Index all Projects"? | After a switch, one action | Include / per-Project only | Include | Solution Designer | Decided |
| DEC-008 | Confirm a switch? | A switch re-indexes everything and temporarily limits meaning search | Confirm / none | Confirm. The cost shown is the **download size only**, as the user narrowed it via Product. | Solution Designer; content by the user | Decided |
| DEC-009 | How does Settings show an **active model that isn't downloaded** and isn't preparing? Examples: a fresh install before the first search (default Granite), or a model chosen in Advanced or an env file (REQ-009). | A gap the approved UI design left (architecture review AR-002). Opening must not start a download (QR-002). | (a) "Active · Not downloaded" with **Download**, which starts preparing the active model; (b) show Ready (untrue); (c) start downloading on open (violates QR-002) | **(a).** It is truthful and uses only the spec's existing pieces: the "Not downloaded" status, the quiet "Download" button and the Active row tint. Once started, the download is the active model's preparing download (Preparing…; no Cancel, as in D-2). A gap the approved design left, so the Solution Designer decides it; no new visual component. | Solution Designer (user informed) | Decided |
| DEC-010 | What state does a Project with no Tasks show? | An empty collection (review R-5) | Ready · 0 Tasks / Not indexed / hidden | **Ready · 0 Tasks**, no actions. Nothing needs indexing, and the Project stays visible as in the spec's list. | Solution Designer | Decided |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-003 | AC-001 | SCN-001 |
| REQ-002 | UC-002 | BEH-003 | AC-002, AC-003 | SCN-002 |
| REQ-003 | UC-002 | BEH-004 | AC-003 | SCN-002 |
| REQ-004 | UC-003 | BEH-001 | AC-004 | SCN-003 |
| REQ-005 | UC-004 | BEH-005 | AC-005 | SCN-003 |
| REQ-006 | UC-004 | BEH-005 | AC-006 | SCN-004 |
| REQ-007 | UC-002, UC-004 | BEH-003, BEH-005 | AC-007 | SCN-002, SCN-004 |
| REQ-008 | all | all | AC-008 | all |
| REQ-009 | UC-003 | BEH-001 | AC-009 | SCN-001 |

## Architecture Phase Input

- Map SCN-001…SCN-004.
- Verify:
  - a read-only collection status in `EmbeddingIndex`;
  - download ahead with cancel in `EmbeddingModelFiles`;
  - the cleanup policy change;
  - activation through the settings service;
  - per-Project index/rebuild through `ProjectTaskSearchService`;
  - status polling;
  - GraphQL shape.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence integrated consistently: `Yes`
- UI/UX approval and final visual-reference basis recorded: `Yes`
- Material assumptions and decisions visible, each with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved package ready for architecture design: `Yes`
- Remaining blocker: none
