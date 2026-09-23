# IR-002 — API-F001 correction scope assessment

## Current result
**Design Impact — narrow file-scope authorization needed before implementation**, not Requirement Gap and not a reversal of CRR-002's implementation-defect origin. Approved recovery behavior is clear. API-F001 remains open; no corrective source/test edit made.

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace`; branch `codex/offline-org-team-workspace`; HEAD remains `3a52e67ba72ee53497f5d9492f406289f23f28f3`. Medium / High / Reviewed unchanged.

## Read and reproduction
Cumulative approved SR-002, SR-004 DS-002/scope mapping, ARCH-REV-002, IR-001, CRR-001/002 and API-REV-001 reports/ledger/investigation/revisions carried. CRR-002 confirms an existing implementation defect, not provider/proxy/test ambiguity. The incoming reviewer explicitly preserves the design's lower-consumer file restriction.

Command from worktree:
```sh
pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts --run
```
Result **exit 1**, **one failed test plus one unhandled rejection**: `Maximum recursive updates exceeded in component <FileExplorer>`. Evidence `implementation-ir002-metadata-reproduction.log`; copied output has only trailing whitespace normalized. The API-owned test is unmodified: real reactive FileExplorer/Pinia metadata registration, delayed external transport, substituted file live stream. No live browser/provider environment launched or altered.

Source hash comparison: `implementation-ir002-source-provenance.json`. FileExplorer, workspaceMetadataActions, FileExplorerTabs and useWorkspaceFileExplorer are identical at original base, reviewed commit and current working tree. All four equality checks true. Existing defect exposed by approved recovery is accepted, not reclassified as post-review regression.

## Confirmed dependency and lifecycle
1. Canonical read resolves/caches B metadata without registering B in client `workspaces`. Normal Files mount must perform registration; server registration during Save is not client registration.
2. `FileExplorer.vue:202–213` watches one getter returning a new array of effective metadata ID and active state. `requestedWorkspaceMetadata` at 122–127 depends on the metadata cache object.
3. `activateCurrentWorkspace` at 165–200 calls `ensureWorkspaceMetadata`; `workspaceMetadataActions.ts:129–145` replaces the cached descriptor before consulting pending registration-task deduplication. Replacing a same-ID object invalidates the getter; its new array is unequal, so activation loops. Transport deduplication does not deduplicate reactive activation.
4. Completion can replace metadata again. A superseding activation's already-registered fast path (`FileExplorer.vue:174–176`) does not settle `isActivatingWorkspace`, while the prior async finally is correctly sequence-guarded. Thus suppressing recursion alone would not establish terminal loading correctness.
5. IR-001's composed test calls `register('B')` before read recovery (`RightSideTabs.workspaceTarget.spec.ts:163`), so its passing safety/retention assertions do not exercise this metadata-only branch. Keep them; strengthen recovery rather than pre-registering away the new reproducer.

## Concrete design constraint
SR-004 `design-spec.md:183` explicitly requires `FileExplorer.vue`, `FileExplorerTabs.vue` and `useWorkspaceFileExplorer.ts` to stay unchanged. Lines 180/258 additionally keep FileExplorerLayout display-only, with no Save or metadata retry ownership. The clean local owner for the activation watcher, in-flight sequence and loading terminal paths is **FileExplorer.vue**, the protected file.

Fixing this in the permitted parent/layout/facade by pre-registering B, forcing a remount/tab-toggle, or duplicating an activation state machine would bypass the failing owner or violate the layout's display-only responsibility. Changing global metadata behavior solely to avoid the restricted consumer would couple correctness to cache object identity and would not directly settle the consumer's terminal fast paths. No such workaround was introduced.

## Bounded amendment requested (proposal, not implemented or validated)
Authorize only a local activation/settlement correction in `autobyteus-web/components/fileExplorer/FileExplorer.vue`, plus focused existing/new regression edits. Preserve the existing metadata registration owner and public contracts. No global workspace-store/composable/fallback rewrite, new framework, schema, lifecycle/save or provider change is proposed.

Candidate direction for Solution Designer to confirm:
- Observe semantic activation inputs with individually compared primitive sources rather than a newly allocated aggregate array. Include metadata-availability transitions for an unchanged explicit ID; simply watching ID alone must not strand a target whose metadata arrives later. Apply the same identity discipline to live-session activation where relevant.
- Make current activation's terminal fast paths explicitly settle loading/error state; retain stale async sequence guards and inactive/unmount cleanup. Registration failure still surfaces normal Retry; old completions must not publish to a new target.
- Keep omitted-ID fallback behavior exactly as before. Preserve explicit-null layout gating of both consumers, unrelated draft A/composer, and canonical retry without Save replay.
- No edits to FileExplorerTabs, useWorkspaceFileExplorer, workspace global getters, Terminal, provider/runtime or persistence anticipated. FileExplorer is 359 physical lines before correction, so no large refactor is indicated.

The approved intended behavior and acceptance criteria need no expansion. Solution Designer owns updating the scope/design authority and any required review routing; renewed user approval is needed only if that owner determines intended behavior must change.

## Validation after authorization and implementation
- Retain real delayed registration C09-R1; require zero failed/unhandled errors and first-pass loading settlement.
- Cover metadata arriving later for the same explicit ID, already-registered target, registration rejection/retry, target/active/unmount changes during pending registration, and omitted-target defaults with no unnecessary live-session reactivation.
- Strengthen composed initial-unopened and previously mounted/dirty recovery to use metadata-only B and delayed real registration; retain no stale writes/Save replay, draft/composer preservation and explicit-null gate assertions.
- Source re-review, then API owner C09 first canonical read recovery for both variants; API/E2E independently updates result/confidence. No tab-toggle workaround qualifies.

## Evidence attribution / residual scope
API-REV-001 reports positive sampled real native/Codex/Claude continuation, core browser Save/reopen/Send, HTTP/restart and fresh-task evidence. Preserve that API-owned evidence; it does not cancel C09/C09-R1 failure. No provider execution is repeated or newly claimed here. Current source review remains CRR-002 Fail; API/E2E remains API-REV-001 Fail. Full web typecheck's baseline parser blockers and unexecuted actual native picker remain. No commit/push/merge/release/deployment or provider/session reset in IR-002.
