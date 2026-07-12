# Markdown Preview Relative Images — Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/done/markdown-preview-relative-images/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/done/markdown-preview-relative-images/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/done/markdown-preview-relative-images/design-spec.md`
- Supplemental solution artifacts: `None`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/done/markdown-preview-relative-images/design-review-report.md`

## What Changed

- Added required nullable `OpenFileState.relativeResourceContext` identity and assigned it only when the file-explorer load owner classifies a path as workspace-backed. Local/external files remain context-neutral.
- Added a pure workspace content URL builder plus workspace Markdown image resolver. It resolves Markdown image paths against the document directory, decodes path segments once, rejects malformed/encoded separators and traversal outside the workspace, excludes query/fragment text from filesystem identity, and keeps direct URI forms unchanged.
- Extended the existing Markdown token/render model with the reviewed direct/managed/blocked image contract. Managed and blocked images are emitted without an initial `src`; the managed source inventory is derived from the same parsed render model.
- Kept `MarkdownRenderer` workspace/credential-neutral while adding post-sanitize managed image binding through `useAuthorizedObjectUrlMap`. Published-map invalidation removes existing managed bindings synchronously before prior blob revocation.
- Extended the authorized-resource owner to observe the full `mobileNodeSessionStore.activeCredential` value. Each generation snapshots sources plus one credential, invalidates before cleanup/refetch, suppresses stale completions, atomically commits current results, and revokes committed or stale generation-local blobs.
- Added explicit-credential transport/resource entrypoints while retaining existing current-credential convenience entrypoints through the same header owner.
- Consolidated server lexical containment in `resolveWorkspaceRelativePath`; both `FileSystemWorkspace.getAbsolutePath` and `WorkspaceFileExplorer.getPath` delegate to it. The REST route continues to use `FileSystemWorkspace` as its public authority.
- Added focused unit/component coverage for source/path classification, managed-token inertness, explicit context propagation, authorized credential generations, managed DOM binding, mobile state projection, and server sibling-prefix containment.

## Key Files Or Areas

- Workspace identity and preview adaptation:
  - `autobyteus-web/stores/fileExplorerState.ts`
  - `autobyteus-web/stores/fileExplorerContentActions.ts`
  - `autobyteus-web/components/fileExplorer/FileViewer.vue`
  - `autobyteus-web/components/fileExplorer/viewers/MarkdownPreviewer.vue`
  - `autobyteus-web/components/mobile/MobileFileViewer.vue`
- Markdown image contract/resolution/rendering:
  - `autobyteus-web/utils/markdownImageResource.ts`
  - `autobyteus-web/utils/fileExplorer/workspaceResourceUrl.ts`
  - `autobyteus-web/composables/useMarkdownSegments.ts`
  - `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`
- Authorized resource lifecycle:
  - `autobyteus-web/composables/useAuthorizedObjectUrl.ts`
  - `autobyteus-web/utils/remoteAccess/authorizedResourceUrl.ts`
  - `autobyteus-web/utils/remoteAccess/authorizedTransport.ts`
- Server containment:
  - `autobyteus-server-ts/src/workspaces/workspace-path-utils.ts`
  - `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts`
  - `autobyteus-server-ts/src/file-explorer/file-explorer.ts`

## Important Assumptions

- Workspace file paths remain workspace-relative identities supplied by the file-explorer owner; no global active workspace is inferred.
- Existing server symlink semantics are unchanged; this implementation hardens lexical containment only, as reviewed.
- Local query text on a relative image source is intentionally excluded from fetch/filesystem identity; an SVG fragment is appended only to the final direct/blob display URL.
- Existing HTTP(S), protocol-relative, root-relative, data, blob, file, and other scheme-bearing sources remain on the sanitizer/browser-owned direct path.

## Known Risks

- Live browser validation is still required for actual Chromium image decoding and packaged/mobile endpoint behavior.
- Multi-source credential rotation is unit-covered with an in-flight stale request, but realistic Phone Access pairing/rotation/removal remains downstream executable coverage.
- The repository-wide web and server typecheck commands currently fail on substantial pre-existing baseline configuration/type errors; details are recorded below. Focused changed behavior is covered by passing tests and boundary guards.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix`
- Reviewed root-cause classification: Primary `Boundary Or Ownership Issue`; secondary `Duplicated Policy Or Coordination`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: Explicit workspace identity now survives the file-preview boundary; the generic renderer consumes only the resolver contract; credential observation remains inside the authorized-resource owner; server callers share one containment invariant behind the public workspace boundary.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Inline workspace media URL construction, source-only authorized refresh behavior, stale published-map behavior, naive server prefix containment, and duplicated file-explorer containment were cleanly replaced. No global base, raw-source regex rewrite, new static route, sanitizer weakening, workspace fallback, or caller-driven credential refresh was added. The largest changed source file is `file-explorer.ts` at 427 effective non-empty lines; all changed deltas are below 220 lines.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Not Affected`
- Design-spec decision reference: `design-spec.md` → `Persisted Data / State Transition Decision`
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: Markdown and referenced image files remain unchanged; new state, resolver results, direct URLs, and blob URLs are ephemeral only.
- Migration implementation and focused checks, only when `Migration Required`: `N/A`
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- The task worktree initially had no installed dependencies. Focused checks reused the primary checkout's existing pnpm dependency installation through temporary local symlinks; those symlinks were removed before commit. Nuxt generated an ignored worktree-local `.nuxt` type directory.
- No API/E2E environment or live desktop/mobile system was started by implementation engineering.

## Local Implementation Checks Run

- `pnpm -C autobyteus-web test:nuxt --run ...` over 12 focused frontend files: `Pass` — 12 files, 64 tests.
  - Includes workspace resolver, Markdown render model/renderer, preview context propagation, authorized URL lifecycle/transport, mobile viewer/state consumers, and file-explorer store regression coverage.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/workspaces/workspace-path-utils.test.ts tests/unit/workspaces/filesystem-workspace-id.test.ts tests/unit/file-explorer/workspace-file-explorer.test.ts tests/unit/api/rest/workspaces.test.ts --no-watch`: `Pass` — 4 files, 21 tests.
- `pnpm -C autobyteus-web guard:web-boundary`: `Pass`.
- `pnpm -C autobyteus-web guard:localization-boundary`: `Pass`.
- `pnpm -C autobyteus-web exec nuxi typecheck`: `Baseline failure` — 229 existing repository-wide TypeScript errors. After correcting newly affected `OpenFileState` test literals and dynamic-component inference, the remaining output contains no errors in the new Markdown/resource files; it still includes pre-existing implicit-`any` errors in unchanged regions of `fileExplorerContentActions.ts` at current lines 231 and 275.
- `pnpm -C autobyteus-server-ts typecheck`: `Baseline configuration failure` — the current `tsconfig.json` sets `rootDir` to `src` while including `tests`, producing `TS6059` for the test tree.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`: `Baseline dependency/source mismatch failure` — existing `autobyteus-ts` memory module/export mismatches and unrelated run-history/agent-memory type errors; no changed workspace containment file was named.
- `git diff --check`: `Pass`.

## Downstream Coverage Hints / Suggested Scenarios

- Preview `docs/readme.md` with sibling/nested/parent relative images, spaces, percent-encoded characters, a missing image, an SVG fragment, and a traversal attempt; verify document text/alt text remains visible.
- Confirm a managed image has no initial network request before authorized binding, especially in Phone Access mode.
- Establish credential A after the preview is already rendered, rotate A to B while at least one image request is in flight, then remove B without changing Markdown or image URLs; verify old bindings disappear immediately and stale responses never rebind.
- Switch the bound node/workspace/document while image loads are pending and verify no prior endpoint/workspace/blob survives.
- Confirm HTTP(S) and data images still render and conversation/task/team-reference Markdown remains context-neutral.
- Exercise the REST content route with `../<workspace-prefix>-other/...` and an absolute candidate; confirm rejection still flows through `FileSystemWorkspace.getAbsolutePath`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

`Yes` — `api_e2e_engineer` still owns coverage investigation, existing-test validity decisions, broader repository execution, browser/live validation, realistic Phone Access setup, cleanup, evidence, and pass/fail confidence scoring after implementation source review passes.
