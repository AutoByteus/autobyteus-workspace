# Design Spec — autobyteus-480

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements: `requirements-doc.md` at SR-001 (Solution Designer within the direction, user informed, 2026-11-12)
- User approval of the design: `Not required`. Design status: `Ready`.
- Investigation notes: `investigation-notes.md`
- Authorities read (2026-11-12, after the skill update): `references/architecture-design.md`, `references/design-principles.md` (updated: "The Approach: Spine First, Practices In Context"), `templates/design-spec-template.md` (updated), `DESIGN.md`. No persisted data.
- Conflicts: None.

## Current-State Read

- One renderer, `MarkdownRenderer.vue`, shows Markdown on every surface: the file preview (`MarkdownPreviewer.vue` in `FileViewer.vue`, used by the Files panel, the Skills page and the phone's `MobileFileViewer.vue:23`) and conversations.
- `useMarkdownSegments.ts` parses a document once (`md.parse`, `:159`), transforms tokens (images, `:167-193`; links, `:195+`), and renders the stream in HTML segments sanitized by DOMPurify (`:362-380`). Headings get no id (measured).
- `MarkdownRenderer.handleLinkClick` (`:125-136`) handles file-action links (`handleFileAction`) and external `http(s)` links (`resolveExternalHttpUrl`, `externalHttpLink.ts`). Every other link falls to the browser, and in the hash-routed window a `#heading` becomes a route: 404.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`. One new small utility file plus two touched files in the web renderer, and tests.
- Architectural risk: `Low`. No contract, persistence, security boundary or concurrency change. Ids are namespaced and sanitized as before.
- Escalation trigger: a surface whose Markdown does not go through `useMarkdownSegments`; a scroll container that `scrollIntoView` cannot reach.

## Architecture Investigation Evidence

| Source | Observation | Decision |
| --- | --- | --- |
| `node -e` markdown-it render | No heading ids; `href="#slug"` | Assign ids in the token pass |
| `MarkdownRenderer.vue:125-136` | `#` and relative links fall through | Handle them in the same click owner |
| Renderer users (grep) | One renderer for all surfaces | One fix |

## Intended Change

1. In the one token pass, give each `heading_open` the id `user-content-<github slug>`, with duplicates numbered document-wide.
2. In the renderer's link click, handle a `#anchor` link: prevent the default, find `user-content-<anchor>` inside this renderer's root, and scroll it into view; nothing happens if it is missing.
3. A link with no scheme that is neither an anchor nor a file action is prevented and does nothing.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002.
  - Add `autobyteus-web/utils/markdown/headingAnchors.ts`.
  - Modify `composables/useMarkdownSegments.ts` (one pass after `md.parse`).
  - Modify `components/conversation/segments/renderer/MarkdownRenderer.vue` (`handleLinkClick`).
  - Tests and a fixture.
- Derived consumers: the rendered HTML gains `id` on headings; every surface that shows `MarkdownRenderer` output gets them. No style or selector depends on heading ids (grep at implementation to confirm).
- Deliberately left alone: opening other files from relative links (FU-001); the window URL; heading link icons; `externalHttpLink.ts` behavior.
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Change | Spine |
| --- | --- | --- | --- |
| BEH-001/002 | REQ-001, 002 / AC-001…003 | Heading ids; scroll on click | DS-001, DS-002 |
| BEH-003 | REQ-003 / AC-004 | Prevented | DS-002 |
| BEH-004 | REQ-004 / AC-005 | Unchanged | DS-002 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `No`. The renderer owns rendering and link clicks; it lacks one rule each.
- Structural triggers that fire, with response:
  - *Several kinds or forms* (Principle 1): link targets are file action, external, same-document anchor, relative or root-relative, and other schemes. Each is routed explicitly in `handleLinkClick`, in that order; other schemes are untouched.
  - *Derived data* (Principle 11): the slug is derived once at render time (one owner, `headingAnchors.ts`). The click handler reads the rendered id; it does not recompute slugs from heading text.
- Deliberate deviations from a principle: `None`.
- Root cause classification: `Local Implementation Defect` (a missing rule in the existing owners).
- Refactor needed now: `No`.

## Terminology

- *Heading anchor*: a heading's GitHub-style slug. Its rendered id is `user-content-<slug>`. No glossary entry needed.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: none. Compatibility kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | Markdown source | Rendered headings with ids | `useMarkdownSegments` (with `headingAnchors.ts`) |
| DS-002 | Primary | Click on a rendered link | Scroll, external open, file open, or nothing | `MarkdownRenderer.handleLinkClick` |

## Primary Execution Spine(s)

- DS-001: `content -> useMarkdownSegments: md.parse -> assignHeadingAnchors(tokens) (one slugger per document) -> transforms -> segment render -> DOMPurify (id kept) -> v-html`
- DS-002: `click -> handleLinkClick: file action? (unchanged) : external http(s)? (unchanged) : href starts with '#'? (preventDefault; root.querySelector by id 'user-content-' + decoded anchor; scrollIntoView({ block: 'start' }) when found) : no scheme? preventDefault (nothing) : browser default (other schemes)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | After parsing, each `heading_open` token gets `id="user-content-<slug>"`. The slug comes from the heading's inline text (text and code content, as GitHub uses the heading's text), via `githubHeadingSlug`; duplicates are numbered by a per-document slugger. DOMPurify keeps ids, and the `user-content-` prefix keeps them clear of DOM-property clobbering and of app element ids. | `useMarkdownSegments` |
| DS-002 | The click owner already routes file actions and external links. It adds a same-document anchor rule and a "no scheme" rule, both preventing the browser default. The anchor is decoded (`decodeURIComponent`, safely) and looked up in this renderer's root element only, so two messages with the same heading never cross. A missing target does nothing. Keyboard activation of a link triggers the same click. | `MarkdownRenderer` |

## Spine Actors / Main-Line Nodes

`useMarkdownSegments`, `headingAnchors.ts`, `MarkdownRenderer.handleLinkClick`.

## Ownership Map

- `headingAnchors.ts` owns GitHub's slug rule and duplicate numbering (`githubHeadingSlug(text)`, `createHeadingSlugger()`), plus `HEADING_ANCHOR_ID_PREFIX = 'user-content-'`.
- `useMarkdownSegments` owns assigning ids during rendering.
- `MarkdownRenderer` owns link clicks, including the two new rules. The anchor-to-id rule (`HEADING_ANCHOR_ID_PREFIX + decoded anchor`) is read from `headingAnchors.ts`, so both sides use one prefix.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Notes |
| --- | --- | --- |
| None | — | Dead code in `MarkdownRenderer.vue` / `useMarkdownSegments.ts`: none found (implementation re-checks) |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| `headingAnchors.ts` | DS-001, DS-002 | Slug rule, numbering, id prefix |

## Ownership Boundaries

Rendering and clicking stay inside the renderer; no store, router or surface component changes.

## Boundary Encapsulation Map

| Boundary | Internal | Callers |
| --- | --- | --- |
| `MarkdownRenderer` | `useMarkdownSegments`, `headingAnchors.ts` | every surface |

## Dependency Rules

`headingAnchors.ts` depends on nothing. Both the renderer and the composable import it. No new package (DEC-003).

## Interface Boundary Mapping

| Interface | Subject | Shape |
| --- | --- | --- |
| `githubHeadingSlug(text: string): string` | one heading's text | GitHub rule |
| `createHeadingSlugger(): (text: string) => string` | one document | numbers duplicates |

## Interface Boundary Check

| Interface | Singular? | Risk |
| --- | --- | --- |
| Both | Yes | Low |

## Main Domain Subject Naming Check

| Subject | Name | Note |
| --- | --- | --- |
| Slug function | `githubHeadingSlug` | Says what rule it follows |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Token transform | `transformImageTokens` pattern | Same pattern |
| Link click routing | `handleLinkClick` | Extend |

## Subsystem / Capability-Area Allocation

| Subsystem | Decision |
| --- | --- |
| Web Markdown rendering | Extend |

## Draft File Responsibility Mapping

See the final mapping.

## Reusable Owned Structures Check

| Structure | Decision |
| --- | --- |
| Id prefix and slug rule | One file, used by both sides |

## Shared Structure / Data Model Tightness Check

N/A.

## Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-web/utils/markdown/headingAnchors.ts` | Add | Slug rule, slugger, id prefix |
| `autobyteus-web/composables/useMarkdownSegments.ts` | Modify | Assign heading ids after `md.parse` |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Modify | Anchor and no-scheme rules in `handleLinkClick` |
| `autobyteus-web/utils/markdown/__tests__/headingAnchors.spec.ts` | Add | AC-001 table (incl. every Contents entry of a `design-principles.md` fixture) |
| `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` | Modify | AC-002…005 (scroll called on the right element in the right root; `preventDefault`; route unchanged; broken anchor; relative links; external and file actions unchanged) |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

As above (`utils/markdown/` exists for Markdown helpers; check at implementation, else beside `utils/markdownItPrism.ts`).

## Folder Boundary Check

N/A.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Slug | `"The Approach: Spine First, Practices In Context"` → `the-approach-spine-first-practices-in-context`; `"1. Approved Behavior And Production Reality"` → `1-approved-behavior-and-production-reality`; second `"Notes"` → `notes-1` | Collapsing repeated hyphens (GitHub does not) |
| Lookup | `root.querySelector('#' + CSS.escape(HEADING_ANCHOR_ID_PREFIX + anchor))` | `document.getElementById(anchor)` (crosses messages; clashes with app ids) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Unprefixed ids so `#slug` matches natively | Rejected (DOM clobbering, app id clashes, router still receives the fragment) |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. `headingAnchors.ts` with its unit table.
2. Assign ids in `useMarkdownSegments`.
3. The click rules in `MarkdownRenderer`, with renderer tests.
4. Validation: a browser probe on the phone bundle and a desktop window with a `design-principles.md` fixture in a workspace; click every Contents entry in the Files panel (the same viewer the Skills page uses) and the phone viewer; assert the heading is in view and the URL and route are unchanged.

## Key Tradeoffs

- Doing nothing on relative file links keeps the page and the change small; opening them is FU-001.

## Risks

- A surface with its own scroll container: `scrollIntoView` scrolls the nearest scrollable ancestor (the preview's `overflow-auto`). The probe confirms it on each surface.

## Guidance For Implementation

- Reproduction: a renderer test mounting `MarkdownRenderer` with the fixture's Contents and its headings, clicking an entry. Today there is no element with the target id and the click is not prevented.
- Use the Unicode property escapes for GitHub's rule: remove `[^\p{L}\p{M}\p{N}\p{Pc} -]` with the `u` flag after lowercasing, then replace each space with `-`.
