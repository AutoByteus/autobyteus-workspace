# Product Design Request — Search section in Settings

- Classification: `Product Design Requested`, purpose `New Request`
- Package: `search-model-settings` (Project Task `autobyteus-146`, follow-up FU-1 of `autobyteus-71`)
- From: Solution Designer (software engineering team), 2026-10-19
- To: Product Team (`/product_team`), at the user's explicit request: *"if yes you can send a task to @Product Team for this"*, after the Solution Designer recommended a UI design step.
- Return to: the Solution Designer that delegated this (its run id comes with the delegation).

## The User's Requested Outcome (the user's words)

- 2026-10-18: the model download "may take some time… in the setting area… users can… select a different model. And then the indexing… the user can actively click index."
- 2026-10-19: *"maybe we need to do some UI design now"* … *"if yes you can send a task to @Product Team for this"*

## What Needs Designing

The experience of a new place in Settings where the user manages local meaning search (embedding models and Project indexes). It covers:

- where it sits in Settings (open decision DEC-005; the Solution Designer recommends a top-level section named "Search");
- the layout;
- how each state and its progress look;
- the confirmation before switching models;
- the wording.

The behavior below is defined by the requirements. The visual and interaction design is yours.

## Requirements Context (behavior; requirements doc `Ready for Approval`)

Requirement IDs: REQ-001…REQ-009; ACs AC-001…AC-009 (`requirements-doc.md`).

- **Models (REQ-001):** the catalog has 3 models.

  | Model | Languages | Download | Indexing speed | Memory / notes | Licence |
  | --- | --- | --- | --- | --- | --- |
  | IBM Granite Embedding Small English R2 (default) | English | 55 MB | ~0.5 s per Task | — | Apache-2.0 |
  | MongoDB LEAF-IR | English, small Projects | 23 MB | fastest | — | Apache-2.0 |
  | Google EmbeddingGemma 2 | 100+ languages | 346 MB | ~4 s per Task | up to 1.5 GB RAM | Apache-2.0 |

  Each model shows one state:
  - **Active**, with the model's readiness: ready / preparing (with progress) / unavailable + reason + Retry;
  - **Downloaded**;
  - **Not downloaded**;
  - **Downloading N of M MB**.
- **Download ahead (REQ-002, REQ-003):**
  - Download with live progress and **Cancel**.
  - A failure shows the reason and Retry.
  - Downloaded models stay until **Remove**; the active model can't be removed.
- **Switch (REQ-004):** **Use this model** asks for confirmation first. The dialog says:
  - every Project will be re-indexed;
  - meaning results are limited (exact matches only) until then;
  - the cost (download size, time per Task).

  The switch then takes effect immediately.
- **Project indexes (REQ-005, REQ-006):** every Project with its state for the active model:
  - **Not indexed**;
  - **Indexing N of M**;
  - **Ready (M Tasks)**;
  - **Needs update (K changed)**;
  - **Unavailable** (a model problem; Retry is at model level).

  Actions: **Index now**, **Rebuild** (re-index from scratch), and **Index all Projects** at the top.
- **Live (REQ-007):** progress updates live (at most 2 s stale). Leaving the page doesn't stop work, and returning shows the current state. Opening the section never starts a download or indexing.
- **Server-side (REQ-008):** it works the same for the node the window is connected to (desktop app, Docker node, self-hosted server); nothing is Electron-specific.
- **Consistent (REQ-009):** the raw server setting `AUTOBYTEUS_EMBEDDING_MODEL` (Server Settings → Advanced) stays the single source of truth; the section reflects it.
- **Localization:** en + zh-CN.

## Starting Sketch (from the Solution Designer; illustrative, not a design)

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

## Existing Product Context

- **Settings page:** `autobyteus-web/pages/settings.vue`. Left navigation sections: API Keys, Token Usage, Display, Language, Local Tools, MCP Servers, Application Packages, Agent Packages, Server Settings (with sub-sections), Extensions, Updates. Cards live in `autobyteus-web/components/settings/`.
- **Visual precedent:** `VoiceInputExtensionCard.vue` already shows an install with a progress bar and status pill. It's Electron-only, but a visual precedent.
- **The board's search status line:** (`autobyteus-web/components/projects/ProjectTaskBoard.vue`, from autobyteus-71) shows "Preparing meaning search… N of M" and the unavailable state with Retry. It is unchanged by this Task.
- **Design record for the Projects board:** the earlier task-keys ticket's design record is at `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-keys-and-dependencies/ui-ux-spec.md`.

## Established Constraints And Non-Goals

- Catalog models only: no browsing Hugging Face, no adding models.
- No "Index now" link on the board; the board stays unchanged.
- One active model per server; no per-Project model.
- No automatic pre-indexing.
- Proxy support is a separate Task.

## Open Questions For Product Design

1. **Placement (DEC-005):** a top-level "Search" section (recommended), under Server Settings, or under Extensions?
2. **Page structure:** is the two-card structure (models; Project indexes) right, and how much of each model's facts to show up front?
3. **Many Projects:** how to present the Project list when there are many Projects.
4. **Confirmation dialog:** wording and the cost it presents.

## Expected Output

A Product-owned, user-approved UI/UX result (your workflow decides the form), identifying:

- the approved UI/UX specification;
- its final references;
- the runnable reference;
- the user's confirmation reference;
- the design repository/ticket/revision.

The Solution Designer will reconcile it with the requirements (the DEC-005 decision and any behavior questions), obtain the requirements approval, and continue with architecture design.

## Paths

- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings/tickets/in-progress/search-model-settings/`
- Requirements: `requirements-doc.md` in that folder
- Investigation: `investigation-notes.md` in that folder
- Code base for context: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings` (branch `codex/search-model-settings`, base `origin/personal` @ `8d40ba3b6c`, which contains autobyteus-71)
