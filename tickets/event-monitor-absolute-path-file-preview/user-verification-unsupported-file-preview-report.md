# User Verification Report — Unsupported Absolute-Path Preview Affordance

## Classification

- Verification source: User-led Electron verification after the local macOS ARM64 build.
- Classification: Bounded Local Fix — implementation-owned frontend file-type gating.
- Owner: `implementation_engineer`.
- Architecture impact: None to the approved cross-boundary ownership; this is a local correction to action eligibility and existing file-type classification. The existing requirements already require safe unsupported-file handling.
- Finalization impact: Delivery finalization remains held until the fix is reviewed and the user verifies the rebuilt Electron artifact.

## Exact Verification Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview`
- Branch: `codex/event-monitor-absolute-path-file-preview`
- Integrated source HEAD used for the built artifact: `a7a7b8b6e1ad0360f0240dd580938bef3a8c434b`
- Built artifact referenced by the user: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.15.dmg`
- User evidence image: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ef49d45255034cdf9b4c0411c380cfd1/solution_designer_f8adb9ecc8844afca985ef2b4b099c6/context_files/ctx_894cfb048ed8__image.png`
- Observed in the Event Monitor: absolute paths ending in `.dmg` and `.zip` received visible `Open ... in Files` action buttons.
- User expectation: unsupported/non-previewable files should remain displayed exactly as source text/code, without a special Files action or preview attempt.

## Current-Code Evidence

1. `autobyteus-web/utils/fileExplorer/fileUtils.ts` exports `determineFileType()` with Image, Audio, Video, Excel, and PDF extension branches, then returns `Text` for every other extension.
2. The supported FileViewer matrix in `autobyteus-web/components/fileExplorer/FileViewer.vue`/`autobyteus-web/docs/content_rendering.md` is limited to text/Markdown/HTML/code, Image, Audio, Video, PDF, Excel/CSV. There is no ZIP, DMG, archive, installer, or generic binary viewer.
3. `autobyteus-web/stores/fileExplorerContentActions.ts` therefore classifies `.dmg` and `.zip` as Text, and a local absolute preview can call `readLocalTextFile()` for those binary artifacts instead of stopping at unsupported type.
4. `FileViewer.vue` has an Unsupported/empty branch, but the current classifier rarely reaches `Unsupported` because its fallback is `Text`.

## Expected Behavior

- Event Monitor path actions should be emitted only for path candidates whose filename is in the existing previewable FileViewer families, including supported text/code/Markdown/HTML extensions and the existing image/audio/video/PDF/CSV/Excel families.
- `.zip`, `.dmg`, application bundles, installers, archives, and other unrecognized binary extensions should retain their original visible/copyable path text and code formatting with no `Open in Files` affordance.
- Unsupported candidates must not trigger Electron text IPC, `local-file://`, workspace content fetches, panel switching, or viewer state creation.
- A supported-looking path may still be missing, unreadable, a directory, or corrupted; its action may then open the normal localized failure state. This is distinct from syntactically unsupported type eligibility and must remain safe.
- Generic Markdown behavior outside the Event Monitor remains unchanged.

## Proposed Bounded Fix

1. Introduce one pure supported-preview eligibility/type function shared by the Event Monitor action policy and `determineFileType()` (or an explicitly owned file-type utility) so action gating and viewer routing cannot disagree.
2. Replace the unknown-extension `Text` fallback with `Unsupported`, while preserving a deliberate allowlist for supported text/code/Markdown/HTML/known extensionless text cases according to the existing viewer matrix.
3. Make the Event Monitor path-action descriptor carry the preview eligibility/type result. Do not render an action for `Unsupported` candidates.
4. Keep the existing `FileViewer` unsupported state and localized error path for any unsupported state reached through other existing File Explorer callers.
5. Add focused tests for `.dmg`, `.zip`, installer/archive/binary extensions, supported text/code, supported media, and default-off/non-Event-Monitor rendering. Add a local Electron regression proving unsupported local paths do not call `readLocalTextFile()` or `local-file://`.

## Acceptance / Scenario Mapping

- User clarification: `.dmg` and `.zip` path in Event Monitor remains source-faithful text/code with no action.
- Existing AC-006/AC-013: supported viewer matrix and safe unsupported/failure state remain correct.
- Existing AC-010/AC-016: ordinary Markdown and copying remain unchanged.
- Existing security constraints: no render-time filesystem check; type eligibility is pure filename policy; trusted validation remains authoritative for supported actions.

## Handoff / Rework Routing

This report is the durable user-verification evidence for a bounded implementation local fix. After implementation, the fix must return through implementation source review, then API/E2E/browser/Electron validation as required by the team flow. Delivery must not finalize the branch or archive the ticket until the rebuilt artifact is explicitly verified.
