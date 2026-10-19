# Investigation Notes

## Investigation Meta

- Package identifier: `search-model-settings`
- Request / ticket: Project Task `autobyteus-146` (`project_task_d5a33e15-bdd7-4fc1-b7d4-5154661ff922`), "Search model settings: choose, download and index the embedding model from Settings", follow-up FU-1 of `autobyteus-71`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings` / `codex/search-model-settings`
- Resolved base remote / branch / revision: `origin` / `personal` / `8d40ba3b6c1e04574cfbf56a9e1caab59c011ac4` (fetched 2026-10-19; contains `autobyteus-71`, merge `528deff924`, released in `v1.5.6-beta.8`)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from the fetched base
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md` (read earlier in this conversation; unchanged); `references/handoff-references.md` (re-read after the 2026-10-18 skill update); repository `AGENTS.md`, `DESIGN.md`, `TESTING.md`, `RELEASE.md` (read for autobyteus-71 in this conversation)
- Investigation status: requirements investigation complete

## Initial Request And Clarifications

- Original request: see the Task text. Built on `autobyteus-71`. Users should be able to:
  - see the catalog models;
  - download one ahead of time with progress;
  - select the active model;
  - see each Project's index state;
  - press "Index now" or "Rebuild index".
  Automatic first-search preparation stays the default. Server-side only. Catalog models only.
- User's own words (2026-10-18, in the autobyteus-71 conversation): the download "may take some time… in the setting area… users can… select a different model. And then the indexing… the user can actively click index."
- Correction to the Task text: it calls LEAF-IR the default. Since autobyteus-71 SR-007 (user-approved), the default is Granite Small English R2 (`DEFAULT_EMBEDDING_MODEL_ID = GRANITE_SMALL_ENGLISH_R2.id` on `personal`).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-19 | Code | `autobyteus-server-ts/src/embeddings/embedding-index.ts` | Layer boundary | Public: `search`, `sync`, `removeItems`, `dropCollection`, `modelStatus()` (`activeModelId`, state idle/downloading/loading/ready/unavailable, reason), `retryModel()`, `shutdown()`. Collections exist only in memory after a `search`/`sync` touches them. `prepareModel` → `files.ensure` → runner → `removeOtherModels(activeId)` (store `deleteOtherModels` + `files.removeAllExcept`) | Per-Project status without indexing needs a read-only status operation; downloaded non-active models are deleted when the active model becomes ready |
| 2026-10-19 | Code | `embeddings/models/embedding-model-files.ts` | Downloads | `hasAllFiles(def)` (size check), `ensure(def, onProgress)` (single flight per model, verify/download/verify/rename), `removeAllExcept(id)`; files under `<appData>/embeddings/models/<modelId>/`; no cancel | Download ahead = `ensure` for a non-active model; cleanup policy conflicts |
| 2026-10-19 | Code | `embeddings/catalog/embedding-model-catalog.ts`, `embedding-model-setting.ts` | Catalog | Three entries with `description` (language, size, speed, memory), `languages`, `licence`, `files` (bytes); the setting description lists them; blank = default (Granite) | UI data available from the catalog |
| 2026-10-19 | Code | `src/projects/search/project-task-search-service.ts` | Collections per Project | `project-tasks/<projectId>`; items = descriptions in indexing order (open Tasks first); deps `{listTasks, index}` | "Index now" / status per Project belongs to this service |
| 2026-10-19 | Code | `src/api/graphql/types/embeddings.ts` | Existing API | Only `retryEmbeddingModel` | New queries/mutations needed |
| 2026-10-19 | Code | `autobyteus-web/pages/settings.vue`; `components/settings/*` | Settings UI | Sections: API Keys, Token Usage, Display, Language, Local Tools, MCP Servers, Application Packages, Agent Packages, Server Settings (sub-sections), Extensions, Updates. `VoiceInputExtensionCard.vue` already shows install progress (Electron-only, but a visual precedent) | New "Search" section |
| 2026-10-19 | Code | `server-settings-service.ts`; `graphql/mutations/server_settings_mutations.ts` (`updateServerSetting(key, value)`) | Setting writes | `AUTOBYTEUS_EMBEDDING_MODEL` has `allowedValues`; validated server-side | Activation writes the same key |
| 2026-10-19 | Doc | autobyteus-71 delivery handoff (O-2) | Known issue | The setting appears in Advanced only once it has a value | Solved by a dedicated section |
| 2026-10-19 | Doc | `model-evaluation-report.md`, autobyteus-71 API/E2E | Model costs | Granite 55 MB, ≈ 0.19–0.5 s/Task; LEAF-IR 24 MB, ≈ 0.07–0.1 s/Task; EmbeddingGemma 2 ≈ 346 MB, ≈ 4.3 s/Task, ≤ 1.5 GB | UI cost texts come from the catalog |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Operational | Operator wants another model | Only via Settings → Server Settings → Advanced (raw key `AUTOBYTEUS_EMBEDDING_MODEL`, visible only once set) or an env file | Next search switches; exact-only until rebuilt | setting code; O-2 | High |
| BEH-002 | System | First search in a Project | Download (if needed), load, index in the background; board shows "Preparing… N of M" | Ready | autobyteus-71 | High |
| BEH-003 | User | Wish to download or index ahead | Not possible | — | — | No current supported behavior |
| BEH-004 | System | Active model becomes ready | Files of every other model deleted; vectors of other models deleted | Disk holds only the active model | `removeOtherModels` | High |
| BEH-005 | User | See index state | Only on the board during a search | — | board | High |

## Persisted Data And State Facts

- `<appData>/embeddings/embeddings.sqlite` (vectors by collection/item/model); `<appData>/embeddings/models/<modelId>/` (verified files). Both are disposable (autobyteus-71 decision).
- The new behavior keeps downloaded non-active model files until the user removes them (see requirements DEC-001). No migration: the existing folders are already in this shape.

## Product Design Request Context

- Product Design request: `Present`. On 2026-10-19 the user asked whether to do UI design now. The Solution Designer recommended a short Product Design step, and the user said: *"if yes you can send a task to @Product Team for this"*.
- Request artifact: `product-design-request.md`. Delegated with `delegate_task` to `/product_team`: team run `product_team_0c8636b21e75455da2f411d49a081b06`, coordinator `product_ui_ux_designer_d253e0e3ab504ef7809f74b3072656d8`.
- Decision handed to Product Design: DEC-005 (placement and layout), plus the visual and interaction design of every state in REQ-001…REQ-007.

## Product Design Findings

- Product Design package: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/search-model-settings/` (product ticket `Completed`).
- Approved UI/UX specification: `ui-ux-spec.md` (Status `Approved`).
- Runnable reference: design repository `personal`, route `/settings?section=server-settings&mode=embedding` (runbook section "search-model-settings").
- User confirmation: "done", 2026-10-19 (spec § Status And User Confirmation; `product-ticket.md`).
- Revision: design `4e4ac06`, integration `cb384e3` (verified ancestors of the design repository's `origin/personal`, 2026-10-19). Source pin autobyteus-web `2f211340ee36`, whose Settings files equal this ticket's base.
- Final visual references: VIS-001…VIS-021 (23 images) in `visual-references/`; validation `final-validation.mjs` 87/87.
- Journeys validated: UXJ-001…UXJ-008; transitions TR-001…TR-020.
- User decisions: placement Server Settings → Embedding; minimal facts (name, state, language label, size); the source said once; minimal copy; a dialog stating the download size only; D-1…D-5 (inline confirmations, Use on not-downloaded models, Waiting state, Index-all semantics, Unavailable rows).
- Mocked boundaries (production must supply):
  - sizes from `files[].bytes`;
  - language label mapping;
  - active model resolved from the setting;
  - a read-only status (per model: file state, downloaded bytes, readiness, reason; per Project: state, indexed, to index, changed, waiting) refreshed at least every 2 s;
  - real download, cancel and verification;
  - server-side scheduling;
  - failure reasons naming `huggingface.co`.
- Open for architecture (spec F-5): overlapping downloads of different models; how the desktop host opens the external Hugging Face link.
- Factual finding F-1: LEAF-IR's catalog description says "about 23 MB", but its files total 23.9 MB, which rounds to 24.
- Requirements sections affected: REQ-001, REQ-002, REQ-004, REQ-005, REQ-006, QR-003, DEC-005, DEC-008, UI section.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| RSK-001 | Risk | EmbeddingGemma 2 is a 346 MB download; a mistaken click wastes time and bandwidth | Cancel action (DEC-003) | Open |
| RSK-002 | Risk | Indexing all Projects with a heavy model is long (≈ 4 s/Task) | Progress per Project; the cost is shown before switching | Open |
| UNK-001 | Unknown | Proxy environments (autobyteus-168) | Out of scope; download failure shows the reason | Open |

## Notes For Architecture Design

- Needs a read-only per-collection status in `EmbeddingIndex` (no scheduling), an explicit `sync` trigger per Project, a rebuild (drop + sync) per Project, catalog listing with per-model download state, download-ahead (`ensure` for a non-active model) with progress and cancel, removal of a non-active model's files, and a change to the cleanup policy (keep downloaded models).
- Settings polls status while work is in progress (as the board does).
