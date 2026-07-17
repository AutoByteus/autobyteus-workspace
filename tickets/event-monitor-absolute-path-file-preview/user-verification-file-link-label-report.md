# User Verification Report — File-Link Visible Label Cleanup

## Classification

- Verification source: User-provided Electron screenshots after the inline-link affordance fix.
- Classification: Bounded Local Fix — implementation-owned visible label refinement.
- Owner: `implementation_engineer`.
- Architecture impact: None. The typed action descriptor, renderer event boundary, launcher, read-only preview owner, and security rules remain unchanged.
- Finalization impact: Delivery finalization remains held until the label cleanup is reviewed and the rebuilt Electron artifact is verified.

## Exact Verification Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview`
- Branch: `codex/event-monitor-absolute-path-file-preview`
- Current implementation HEAD observed: `5a72303bf`
- User evidence images:
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ef49d45255034cdf9b4c0411c380cfd1/solution_designer_f8adb9ecc8844afca985ef2b4b0996c2/context_files/ctx_80af4fdb49c6__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ef49d45255034cdf9b4c0411c380cfd1/solution_designer_f8adb9ecc8844afca985ef2b4b0996c2/context_files/ctx_e8d462a0ae53__image.png`
- Observed current UI: the inline link still visibly says `Open compaction-lifecycle-contract.md in Files` / `Open design-review-report.md in Files`.
- User expectation: show only the file label, such as `compaction-lifecycle-contract.md`, because `Open` and `in Files` are visually redundant once the text is already a clickable link.

## Approved Intended Behavior

- Visible generated Event Monitor file-action text contains only the file display label, normally the basename, with no visible `Open` or `in Files` wording.
- Authored Markdown links continue to preserve their authored visible label.
- The existing accessible action semantics remain: the control stays keyboard-accessible, prevents browser navigation, emits the same typed action, and opens the same read-only Files preview.
- Accessibility metadata may retain a localized descriptive label such as `Open <file> in Files`, and the full path may remain in the title/accessible context; these are non-visible affordance metadata and do not reintroduce visible redundancy.
- Unsupported or invalid paths remain ordinary non-action source text.
- No launcher, file-type, path-validation, security, persistence, or generic Markdown behavior changes.

## Current-Code Evidence

- `MarkdownRenderer.vue` currently supplies a localized `open_file` string as `fileActionLabel`, which is used as the visible text for generated inline action links.
- `MarkdownRenderer.vue` already applies the same localized `open_file` string as `aria-label` and the normalized path as `title`, so visible-label cleanup can retain accessibility metadata without changing the event contract.
- `useMarkdownSegments.ts` already distinguishes authored Markdown-link labels from generated action labels; only the generated visible label needs to change.

## Proposed Bounded Fix

1. Make the visible generated action label use `action.displayLabel` only.
2. Keep the localized `Open <file> in Files` string for `aria-label` (and optionally the existing title) so assistive technology still gets action context.
3. Update MarkdownRenderer tests to assert visible generated links equal the filename and do not contain `Open` or `in Files`, while retaining the typed click/keyboard event assertions.
4. Rebuild and verify the Electron artifact; no architecture rerun is required.

## Acceptance / Scenario Mapping

- New requirement: REQ-020.
- New acceptance criterion: AC-023.
- Existing REQ-018/019 and AC-021/022 remain applicable.

## Handoff / Rework Routing

This report is durable user-verification evidence for a bounded implementation local fix. Return through implementation source review, then API/E2E/browser/Electron validation before delivery finalization.
