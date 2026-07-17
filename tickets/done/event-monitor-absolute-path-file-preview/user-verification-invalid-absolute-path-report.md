# User Verification Report — Invalid/Truncated Absolute-Path Guard

## Classification

- Verification source: User-provided Electron screenshot and clarification after the supported-file-type fix.
- Classification: Bounded Local Fix — implementation-owned pure path-syntax validation.
- Owner: `implementation_engineer`.
- Architecture impact: None to the approved cross-boundary ownership. This tightens the existing pure Event Monitor path policy before action creation.
- Finalization impact: Delivery finalization remains held until the guard is implemented, reviewed, and the rebuilt artifact is verified.

## Exact Verification Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview`
- Branch: `codex/event-monitor-absolute-path-file-preview`
- Current source HEAD at investigation: `ce9303994`
- User evidence image: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ef49d45255034cdf9b4c0411c380cfd1/solution_designer_f8adb9ecc8844afca985ef2b4b0996c2/context_files/ctx_de4a2d806820__image.png`
- Reproduction shape shown by the user: a Markdown link destination resembling `/Users/normy/autobyteus_org/.../compaction-lifecycle-contract.md`.
- Observed defect: the path policy accepts the literal placeholder component `...`, classifies the final `.md` suffix as supported text, and renders the special `Open ... in Files` action.

## Current-Code Evidence

1. `autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts` currently recognizes POSIX/Windows absolute shape and normalizes separators, but `normalizeAbsoluteFilePath()` does not reject dot segments or ellipsis placeholders.
2. `useMarkdownSegments.ts` reads raw Markdown link destinations through `normalizeMarkdownLinkPath()`; therefore the same missing guard affects Markdown links, prose, inline code, and fenced-code candidates through the shared normalizer.
3. `createAbsoluteFilePathAction()` already suppresses unsupported viewer families. The remaining defect is syntactic completeness, not file existence or viewer capability.
4. The policy is intentionally pure and must not probe the filesystem during rendering. A path may be syntactically complete but missing/unreadable; trusted content boundaries retain responsibility for those failures.

## Approved Intended Behavior

- A special Event Monitor Files action is created only for a syntactically complete absolute path with a normal path component sequence and a supported preview family.
- Reject lexical placeholder/traversal components `.`, `..`, `...`, and the Unicode ellipsis component `…` before action creation. The guard is component-based, so ordinary names containing dots (for example `release..notes.md`) are not rejected solely for containing multiple dots.
- A rejected candidate remains rendered exactly through the source's existing Markdown/code/prose path. It does not receive the Event Monitor `Open ... in Files` action, does not switch panels, and does not read local or workspace content.
- If the source itself is an ordinary Markdown hyperlink, preserving original rendering means the normal Markdown link output remains governed by existing generic link behavior; the Event Monitor-specific Files action is not added.
- Supported, syntactically complete paths remain eligible even when they later fail trusted existence/readability/regular-file checks; those failures use the existing localized non-destructive viewer state.

## Proposed Bounded Fix

1. Add a pure component-validation guard to `normalizeAbsoluteFilePath()` (or a small utility it owns) after separator normalization and before returning the canonical candidate.
2. Reject `.`, `..`, `...`, and `…` when they occur as complete path components. Preserve existing POSIX/Windows absolute-shape, NUL, root, punctuation, and separator behavior.
3. Add table-driven unit coverage for prose, raw Markdown link destinations, inline code, and fenced code; assert that invalid candidates produce no action and source text/code remains intact.
4. Preserve the existing supported-type gate and no-read behavior. Do not add filesystem existence checks to Markdown rendering.
5. Re-run source review and API/E2E/browser/Electron validation; delivery remains pending rebuilt Electron verification.

## Acceptance / Scenario Mapping

- New requirement: REQ-017.
- New acceptance criterion: AC-020.
- Existing REQ-002/003/004/005/013/015 and AC-001–005/010/016 remain applicable.
- Existing AC-019 continues to govern unsupported file types.

## Handoff / Rework Routing

This report is durable user-verification evidence for a bounded implementation local fix. The implementation fix must return through implementation source review and then API/E2E/browser/Electron validation. It must not be treated as a new architecture boundary or as permission to perform render-time filesystem probes.
