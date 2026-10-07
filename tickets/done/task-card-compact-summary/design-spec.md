# Design Spec — `task-card-compact-summary`

## Solution And Approval Basis
- Current solution revision ID: `SR-002`
- Approved requirements: `requirements-doc.md` SR-002 (user, 2026-10-07: "…follow the best practice… you shouldn't show the complete content…")
- Supplements: none. Evidence screenshot: `evidence/temp-tasks-full-content-2026-10-07.png`
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/investigation-notes.md`
- Authorities read (2026-10-07): `references/architecture-design.md`, `design-principles.md`, `/DESIGN.md`
- Conflicts or discrepancies: None

## Current-State Read
- `ProjectTaskRow.vue` is the single card used by Project boards and the Temp tasks board. It renders `taskSummary(description)` (first non-empty line) and a preview (remaining lines joined), each in `<span class="block line-clamp-2 …">`.
- Tailwind emits `.line-clamp-2` (with `display:-webkit-box`) before `.block` (`display:block`), so `display:block` wins and the clamp never applies.
- The full first line is also used as the card's `aria-label` and in the Task delete confirmation (`ProjectTaskDetail.vue:15`).
- Owner and placement are correct; the defect is local.

## Task Size And Architectural Risk (Mandatory)
- Task size: `Small`
- Size rationale: one component's classes and computed text, one utility file (+ tests), one detail component's message argument, one browser probe extension, one docs paragraph. No server, contract, data or store change.
- Architectural risk: `Low`
- Risk rationale: presentation only, inside the existing owner; no contract, persistence, security, concurrency or ownership change.
- Escalation trigger: if the clamp cannot be made reliable in the packaged Electron Chromium, or a summary string is needed by the server or agents, return a Design Impact.

## Intended Change
1. **Make the clamp work:** remove `block` from both clamped spans (`line-clamp-2` already sets the needed display). Add `break-words` to the preview.
2. **Don't lay out huge strings:**
   - Card text is bounded before rendering: summary and preview each at most `TASK_CARD_TEXT_MAX_CHARS = 300` characters, cut at a word boundary with "…". That is more than 2 lines at the widest lane (~95 characters per line at `text-sm` in a 751 px lane).
   - CSS clamps the visible lines; the cap removes needless layout of up to 10,000 words per card (DESIGN.md: remove unnecessary work).
3. **Bounded single-line labels:** `taskSummaryLabel(description)` = the summary shortened to at most 120 characters at a word boundary, with "…" when cut. It is used for the card `aria-label` and the delete confirmation.
4. **Unchanged:**
   - search keeps matching the full description;
   - the Task page keeps the full text;
   - short descriptions render exactly as before (AC-006).

## Behavior Map
| BEH | REQ/AC | Path |
| --- | --- | --- |
| BEH-001 | REQ-001, 002; AC-001..003, 005, 006 | Board → `ProjectTaskRow` → `utils/projects/taskSummary.ts` |
| BEH-002/003 | REQ-003; AC-004 | Unchanged (Task page, board search) |

## Task Design Health Assessment
- Posture: `Bug Fix`
- Issue: `Yes`, a `Local Implementation Defect` (conflicting utilities); a missing bound on derived labels.
- Triggers:
  - **Repeated coordination:** card text derivation was inline in the component. It moves to the existing summary utility, which is now the single owner of summary, preview and label derivation.
- Refactor needed: `No`, beyond moving the preview derivation into the utility.

## Persisted Data
`Not Affected` (presentation only; summaries are never stored).

## Spine / Ownership
`Board component → ProjectTaskRow (presentation owner) → taskSummary utility (text derivation owner) → rendered card`. `ProjectTaskDetail` uses the same utility for its confirmation.

## File Mapping
| Path | Change | Responsibility |
| --- | --- | --- |
| `autobyteus-web/utils/projects/taskSummary.ts` | Modify | `taskSummary` (unchanged); add `taskPreview(description)`; `boundTaskText(text, max)` (word-boundary cut + "…"); `TASK_CARD_TEXT_MAX_CHARS = 300`; `taskSummaryLabel(description)` (120) |
| `autobyteus-web/utils/projects/__tests__/taskSummary.spec.ts` | Add/Modify | Bounds, word boundaries, no-cut for short text, multi-line preview |
| `autobyteus-web/components/projects/ProjectTaskRow.vue` | Modify | Remove `block` from the clamped spans; use the bounded summary/preview; `aria-label` = `taskSummaryLabel` |
| `autobyteus-web/components/projects/ProjectTaskDetail.vue` | Modify | The delete message uses `taskSummaryLabel` |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` (+ fixtures) | Modify | Add real-length fixtures (~10,000-word single paragraph; multi-line) to a Project board and Temp tasks. At 1440×900 and 1024×768, assert each card text span renders ≤ 2 lines (`getBoundingClientRect().height ≤ 2 × computed line-height + 1`), the card height is bounded, and the Task page shows the full text. |
| `autobyteus-web/docs/projects.md` | Modify | Card summaries: 2+2 line clamp; bounded labels; full text on the Task page |

## Removal Plan
| Item | Replaced By |
| --- | --- |
| Inline preview derivation in `ProjectTaskRow.vue` | `taskPreview` in the utility |
| `block` on clamped spans | `line-clamp-2` display |

## Backward-Compatibility Rejection Log
| Candidate | Decision |
| --- | --- |
| Keep `block` and add a custom CSS override | Rejected: remove the conflicting utility instead |

## Change Sequence
1. Utility + unit tests.
2. Row and detail.
3. Probe fixtures and assertions; run `pnpm -C autobyteus-web test:e2e:project-manager-ux` and the nuxt unit tests.
4. Docs.

## Risks
- **Electron Chromium supports `-webkit-line-clamp`**, so the browser probe is representative. The desktop journey is optional.
- **The Product design copy** (`/Users/normy/autobyteus_org/autobyteus-web-design/components/projects/ProjectTaskRow.vue`) has the same class conflict. It is Product-owned and outside this ticket; this is an informational note for the Product UI/UX Designer's next baseline refresh.

## Guidance For Implementation
- Keep the visual classes otherwise identical (VIS-001..018 for short text).
- Do not change search or the Task page.
