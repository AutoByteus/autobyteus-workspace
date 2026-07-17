# User Verification Report — Inline File-Link Affordance

## Classification

- Verification source: User-approved UX clarification and reference image after the Event Monitor preview implementation.
- Classification: Bounded Local Fix — implementation-owned Markdown action presentation.
- Owner: `implementation_engineer`.
- Architecture impact: None to the approved path-action, launcher, File Explorer, or trusted-byte boundaries. This changes only the rendered affordance and preserves the existing typed action event.
- Finalization impact: Delivery finalization remains held until the inline-link implementation is reviewed and the rebuilt Electron artifact is verified.

## Exact Verification Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview`
- Branch: `codex/event-monitor-absolute-path-file-preview`
- User reference image: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ef49d45255034cdf9b4c0411c380cfd1/solution_designer_f8adb9ecc8844afca985ef2b4b0996c2/context_files/ctx_e7a13355c06e__image.png`
- Current implementation affordance: supported Event Monitor paths render an adjacent bordered `Open ... in Files` button.
- User decision: replace the bulky button with an inline, underlined clickable file label/path matching the supplied reference image.

## Approved Intended Behavior

- Supported, syntactically complete Event Monitor file paths use an inline link-style action rather than a separate bordered button.
- For an authored Markdown link, preserve the authored visible label, such as `compaction-lifecycle-contract.md`, and intercept its activation to open the existing read-only Files preview.
- For bare prose paths, style the visible path text itself as the inline action so the complete path remains visible and copyable.
- For inline/fenced code, keep the literal path/code content intact and use an inline link-style action treatment without adding a large button or changing copied source text. The implementation may wrap only the recognized literal path in an action anchor if selection/copy tests confirm source fidelity; no unrelated code text may be changed.
- Valid actions remain keyboard-accessible, expose an accessible name/title, prevent browser navigation, and emit the same typed Event Monitor file action.
- Unsupported file types and invalid/incomplete paths remain ordinary source rendering with no link-style action.
- Existing ordinary Markdown links and non-Event-Monitor consumers remain unchanged.

## Current-Code Evidence

- `autobyteus-web/composables/useMarkdownSegments.ts` already renders Markdown-link actions as `<a href="#" role="button">` but renders prose and code actions through the `actionButton()` bordered button helper.
- `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` already delegates action IDs and keyboard activation, so the launcher, security boundary, and preview owner can remain unchanged.
- The current `.event-monitor-file-action` CSS defines the bulky bordered button and the fenced-code action group layout; the visual change can be localized to the Markdown render helpers and scoped CSS.

## Proposed Bounded Fix

1. Replace the prose/code `actionButton()` output with an inline native anchor/action control using the existing render-scoped action ID.
2. Preserve the Markdown-link raw destination/token seam and existing typed event payload; do not classify browser-resolved `href`.
3. Keep code text/source copying faithful and add focused renderer tests for Markdown links, prose, inline code, and fenced code.
4. Assert unsupported and invalid candidates still have no action control.
5. Keep default-off behavior, ordinary external links, and the existing launcher/read-only Files flow unchanged.

## Acceptance / Scenario Mapping

- New requirement: REQ-018.
- New acceptance criterion: AC-021.
- Existing REQ-004/005/013/015/016/017 and AC-004/005/010/016/019/020 remain applicable.

## Handoff / Rework Routing

This report defines approved user-visible behavior and is part of the requirements basis. The change is a bounded implementation local fix. After implementation, return through implementation source review, then API/E2E/browser/Electron validation. Delivery must not finalize before rebuilt-artifact verification.
