# Implementation Handoff — autobyteus-480

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-heading-links-480/tickets/in-progress/markdown-heading-links-480/`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-heading-links-480`, branch `codex/markdown-heading-links-480`, base `origin/personal` `931a1feeb6`.
Commits: `45e456b8b0` (code and tests); the ticket documents and evidence follow in one docs commit (named in the handoff message).

**State (IR-001): SR-002 is implemented.** The package goes to API/E2E (direct route). Results:
- the unit reproduction is red on the base and green now;
- the full web suite passes;
- in a real desktop window, all 26 Contents entries of `design-principles.md` scroll to their heading without changing the URL.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: `Small` / `Low`, direct route → API/E2E.
- Requirements doc: `requirements-doc.md` (Approved, SR-001).
- Investigation notes: `investigation-notes.md`.
- Solution revision record: `solution-revision-record.md`.
- Design spec (required on every route): `design-spec.md` (SR-002); `handoff-sr-002.md`.
- Supplemental task artifacts: `follow-ups.md` (FU-001, unchanged).
- Design review report: `N/A — not applicable` (not selected).
- Architecture review revision record: `N/A — not applicable` (not selected).
- Triggering rework report, revision record, or evidence: N/A (initial round).

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

What the change does:

1. **DS-001, heading ids** (`autobyteus-web/utils/markdownHeadingAnchors.ts`, `composables/useMarkdownSegments.ts`):
   - `githubHeadingSlug(text)` applies GitHub's rule: lowercase, remove `[^\p{L}\p{M}\p{N}\p{Pc} -]` (with the `u` flag), and turn each space into `-`.
   - `createHeadingSlugger()` numbers repeats `-1`, `-2`, … per document, as `github-slugger` does: a later literal `Notes 1` becomes `notes-1-1`.
   - `HEADING_ANCHOR_ID_PREFIX = 'user-content-'`.
   - Right after `md.parse`, `assignHeadingAnchors(tokens)` sets `id="user-content-<slug>"` on every `heading_open`, with one slugger per document. DOMPurify keeps the id.
2. **DS-002, link clicks** (`components/conversation/segments/renderer/MarkdownRenderer.vue` `handleLinkClick`), in order:
   - a file action (unchanged);
   - `#anchor`: prevent the default, decode the anchor (a malformed escape is looked up as written), find the heading with that id among this renderer's own `h1`–`h6`, and `scrollIntoView({ block: 'start' })`. Nothing happens if there is no such heading.
   - a non-empty href with no scheme and not protocol-relative (`other.md`, `other.md#x`, `/x.md`, `./x.md`): prevent the default and do nothing (DEC-001);
   - otherwise the external `http(s)` rule, then the browser default for other schemes (`mailto:`), both unchanged.

   Keyboard activation of a link fires the same click.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Small`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: three production files in the web renderer (one new, 27 non-empty lines; +19 and +26 in the two touched files). No contract, persistence, security-boundary or store change. Neither escalation trigger fired: every surface goes through `MarkdownRenderer`/`useMarkdownSegments`, and `scrollIntoView` reached the Files panel's scroll container (IMP-04).
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below).
- New design impact or escalation trigger: `None`

## Lightweight Implementation Self-Review

- **Correctness:**
  - one slugger per parse, so repeats are numbered across the whole document even when a Mermaid block splits it into several HTML segments;
  - the lookup is scoped to this renderer's root, so two messages with the same heading never cross (unit);
  - ids are prefixed, so they cannot clash with app ids or DOM property names (QR-001).
- **Preserved (REQ-004):** file actions are still handled first; absolute `http(s)` links still open externally; `mailto:` is still not prevented (unit); rendering is otherwise unchanged (full suite).
- **Side effect inside the same rule:** a file-action control renders as `<a href="#" role="button">`. If it is not resolved as an action, the anchor rule now prevents it and finds no heading, so nothing happens. On an http-served page it used to resolve to the page's own URL and open it externally.
- **Dead code in touched files:** none found in `MarkdownRenderer.vue` or `useMarkdownSegments.ts`.

## Decisions made inside the design (for review)

- **Rule order: the anchor and no-scheme rules run before the external rule.** The design's DS-002 lists external first. `resolveExternalHttpUrl` resolves the href against `window.location.href`, though. On an http-served page (the phone bundle, a browser or `nuxt dev` window, jsdom), `#x` and `other.md` therefore become `http(s)` URLs, and the external rule would open them in a new tab before the new rules ran. The red run shows this: `openExternalLink` was called for each, see IMP-01. Absolute `http(s)` links are still caught by the external rule, because a scheme bypasses both new rules; so is a protocol-relative `//host/x`, which is excluded from the no-scheme rule. The design's outcomes are unchanged; only the order differs.
- **The heading text for the slug comes from a plain inline parse of the heading's source.** The tokenizer runs with `typographer: true`, which rewrites text tokens: `--` becomes `–`, `(c)` becomes `©`, and quotes become smart quotes. GitHub slugs the text as written, so `## A -- B` must give `a----b` (unit). `headingText` re-parses the heading's inline source with a module-level `MarkdownIt({ html: true })` and joins its `text` and `code_inline` content. Markup such as `**bold**` and link text is kept as text; HTML tags are dropped.
- **File placement:** `utils/markdown/` does not exist, so the helper is `utils/markdownHeadingAnchors.ts`, beside `markdownItPrism.ts` and `markdownMath.ts`, as the design's fallback says. Its tests are in `utils/__tests__/`.
- **Renderer tests in a new spec file**, `MarkdownRenderer.headingLinks.spec.ts`, instead of `MarkdownRenderer.spec.ts`. That file has 436 non-empty lines, and the new cases (~140) would take it past 500. The old spec changes in one assertion only: `<h1 id="user-content-hello-world">`, the approved BEH-002.
- **Heading lookup:** a scan of this root's `h1`–`h6` for the id, instead of `querySelector('#' + CSS.escape(…))`. No escaping is needed, and jsdom has no `CSS.escape`. The scope (this root only) is the same.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-002 | GitHub-compatible heading ids | `useMarkdownSegments` → `assignHeadingAnchors` → `markdownHeadingAnchors.ts` | Unit table (IMP-01); every Contents entry of the fixture has exactly one heading, both in the unit test and in the real window (IMP-04: 26/26) |
| BEH-001 | `#heading` scrolls in the same document; no route or URL change | `MarkdownRenderer.handleLinkClick` → `scrollToHeading` | Unit: prevented, the right heading, the right root, URL unchanged (IMP-01); window: 26/26 in view at the viewer's top, URL unchanged (IMP-04) |
| BEH-003 | Relative/root-relative link → nothing | the no-scheme rule | Unit (IMP-01); window: 5 links plus the fixture's `ticket-scope.md#common-situations`, with the URL and viewer unchanged, no 404 and no new tab (IMP-04) |
| BEH-004 | External, file-action and other-scheme links unchanged | unchanged rules, after the new ones | Unit (IMP-01); full suite (IMP-03) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Production:
  - `autobyteus-web/utils/markdownHeadingAnchors.ts` (new);
  - `autobyteus-web/composables/useMarkdownSegments.ts`;
  - `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`.
- Tests:
  - new: `autobyteus-web/utils/__tests__/markdownHeadingAnchors.spec.ts` and `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.headingLinks.spec.ts`;
  - fixture: `autobyteus-web/utils/__tests__/fixtures/design-principles.md`, a copy of the team's design-principles reference;
  - updated: one assertion in `MarkdownRenderer.spec.ts`.

## Important Assumptions

- None open.

## Known Risks

- GitHub's real slugger removes a generated list of characters. The approved rule (REQ-001), a Unicode-class approximation of it, may differ on rare symbols. The test table covers punctuation, emoji, `_`, non-ASCII letters and CJK.
- Surfaces other than the desktop Files panel (the phone viewer, the Skills page, a conversation message) were not clicked in a real browser here; see the coverage hints.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix`
- Reviewed root-cause classification: `Local Implementation Defect`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: the rule order and the heading-text source are in-design decisions (above). They follow from code the design cites (`externalHttpLink.ts`, the tokenizer's options) and change no approved outcome.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no unprefixed ids).
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (none found)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`. One prefix constant is used by both sides, and the slug is derived once at render time; the click reads the rendered id.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes` (the updated `design-principles.md` was re-read before starting)
- Deviations from a design principle decided during implementation, each with the principle and why the reason holds for this case: `None`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Non-empty lines:
  - `useMarkdownSegments.ts` 388 → 407;
  - `MarkdownRenderer.vue` 195 → 221;
  - `markdownHeadingAnchors.ts` 27 (new).
- Notes: the new renderer tests went into their own spec file to keep `MarkdownRenderer.spec.ts` under 500.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Implementation follows the approved decision: `Yes`

## Environment Or Dependency Notes

- macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2. The fresh worktree needed `nuxt prepare` (`.nuxt/tsconfig.json`) before vitest would load; `pnpm -C autobyteus-web typecheck` runs it as well.
- In the Nuxt test environment, `import.meta.url` is not a `file:` URL. The specs read the fixture through `path.resolve(process.cwd(), …)`, as `McpServerFormModal.spec.ts` does, so run them from `autobyteus-web` (`pnpm -C autobyteus-web …`).
- No new package (DEC-003); the lockfile is unchanged.
- Untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are build outputs, not part of the change.

## Checks Run

Evidence paths are relative to the ticket folder's `evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-web exec cross-env NUXT_TEST=true vitest run components/conversation/segments/renderer/__tests__/ utils/__tests__/markdownHeadingAnchors.spec.ts`. Red on the base production files first. | `45e456b8b0`; the base `931a1feeb6` for the red run | as above, jsdom | slug rule and numbering; ids in rendered HTML; anchor scroll in its own root; broken anchor; relative links; external, `mailto:` and file action unchanged | REQ-001…004; AC-001, AC-003, AC-004, AC-005, AC-002 (unit part) | Pass (red on base: 11 failed, 2 passed) | `IMP-01-renderer-heading-link-specs.log` | `## RED` `Tests  11 failed \| 2 passed (13)`; `## GREEN` `Tests  64 passed (64)` |
| IMP-02 | `pnpm -C autobyteus-web typecheck`; `guard:web-boundary`; `guard:localization-boundary`; `audit:localization-literals` | `45e456b8b0` | as above | type, boundary and localization rules | — | Pass | `IMP-02-typecheck-guards.log` | `production errors: 0; test-file errors: 93 in 40 files (baseline 93 in 40 files)`; `Passed.` ×2; `Passed with zero unresolved findings.` |
| IMP-03 | `pnpm -C autobyteus-web exec cross-env NUXT_TEST=true vitest run` (full) | `45e456b8b0` | as above | every web spec | AC-005 | Pass | `IMP-03-web-unit-full.excerpt.log` | `Test Files  759 passed (759)`, `Tests  5736 passed \| 2 skipped (5738)` |
| IMP-04 | `node evidence/IMP-04-rendered-probe/heading-links-probe.mjs --output-dir=…/run`, after `pnpm -C autobyteus-server-ts build` | `45e456b8b0` | isolated node; `nuxt dev` window in headless Chrome, 1440×1000; test files only | the Files panel viewer (`FileViewer` → `MarkdownPreviewer` → `MarkdownRenderer`) | AC-002 (desktop Files panel), AC-004 (window) | Pass | `IMP-04-rendered-probe/` (`README.md`, the probe, `run-stdout.log`, `run/probe-summary.json`, logs, screenshots) | `"contentsEntries":26,"contentsFound":26,"contentsInView":26,"contentsUrlUnchanged":26,"linksUrlUnchanged":5`; `popups` only `step: "start"` |

- Not run, and why:
  - the design's step-4 validation probe on the **phone bundle** and the **Skills page** is API/E2E's;
  - a Contents inside a **conversation message** in a real window: the fake agent's reply is JSON-quoted, so it carries no headings. AC-003 is unit-covered.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: every rendered Markdown document gets heading ids, with no visual change. A click on a same-document link scrolls the viewer or conversation.
- Approved UI/UX, interaction, requirement, or design references: requirements § UI ("no new UI, scrolling only"); REQ-002, REQ-003.
- Existing design system, shared components, and adjacent product surfaces reviewed: `FileViewer`/`MarkdownPreviewer` (Files panel, the Skills page and the phone viewer use them); the conversation segments that use `MarkdownRenderer`. No styles or selectors depend on heading ids (grep).
- Testing guideline or development / preview instructions and rendered surface used: the isolated-node and `nuxt dev` probe pattern from autobyteus-452 (TESTING.md: isolated nodes and test files only).
- States, layouts, viewports, and interactions inspected:
  - each of the 26 Contents clicks starts with the viewer at the top and ends with the heading at the viewer's top (`offsetFromViewerTop: 0`);
  - the relative and broken links leave the viewer and the URL as they were;
  - `desktop-after-contents-click.png` shows "The Approach: Spine First, Practices In Context" at the top of the Files panel viewer.
- Visual or interaction issues found and corrected: none in the window. In the unit red run, `#x` and relative links went to `openExternalLink` on the http-served page; this led to the rule order above.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-04. Not seen in a real browser: the phone viewer, the Skills page, a conversation message's own Contents, and keyboard Enter on a link (native: Enter on a link fires a click).

## Downstream Coverage Hints / Suggested Scenarios

- Phone bundle: open `design-principles.md` (a test copy) in the phone viewer and click every Contents entry. The heading should come into view; the URL and route stay the same; no pairing or 404 page.
- Skills page: preview a skill reference file with a Contents and click its entries.
- A conversation message whose Markdown has its own Contents, and two messages with the same heading on one screen. Each link should scroll within its own message. This needs a real agent reply with headings, or a fixture conversation.
- Broken anchor, `other.md`, `other.md#x`, `/x.md` in each surface: nothing happens and no new tab opens.
- Preserved: an external `https://` link opens outside the app; a file-action link in the Event Monitor opens its file; `mailto:` as before.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All of the above.
