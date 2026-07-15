# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/persist-terminal-session-tabs/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/persist-terminal-session-tabs/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/persist-terminal-session-tabs/design-spec.md`
- Design rework note: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/persist-terminal-session-tabs/design-rework-note.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/persist-terminal-session-tabs/design-review-report.md`

## What Changed

- Added `TerminalPanel.vue` as the per-canonical-target in-window terminal cache owner.
  - It lazily creates cached `Terminal.vue` children only while the Terminal tab is active.
  - It keys entries by node/backend terminal endpoint scope plus either normalized root path or explicit server-home mode.
  - It stores snapshot `TerminalTarget` objects or explicit `null`; cached entries never pass `undefined` to `Terminal.vue`.
  - It clears cached entries on `windowNodeContextStore.bindingRevision` or terminal endpoint scope changes. A local cache generation is included in the Vue render key so even same canonical key after a reset remounts child terminals and closes old WebSockets.
- Updated `RightSideTabs.vue` to host `TerminalPanel` lazily and hide/show it with `v-show`, mirroring the existing stateful Files panel pattern without letting the layout component own terminal cache internals.
- Updated `Terminal.vue` to remain a single-target xterm/WebSocket owner with:
  - `active?: boolean` visibility prop, defaulting to `true`.
  - explicit `undefined` vs `null` target semantics (`undefined` falls back to active workspace metadata; `null` means server-home).
  - active true reactivation refit plus backend resize if connected.
  - unchanged target-change reconnect and true unmount disconnect cleanup.
- Extended `terminalTarget.ts` with canonical cache-scope/key helpers.
- Added/updated focused unit coverage for `TerminalPanel`, `RightSideTabs`, `Terminal`, and existing `useTerminalSession` compatibility.
- Updated frontend terminal docs to describe the TerminalPanel cache, target semantics, node/backend reset policy, and cleanup boundary.

## Key Files Or Areas

- `autobyteus-web/components/workspace/tools/TerminalPanel.vue`
- `autobyteus-web/components/layout/RightSideTabs.vue`
- `autobyteus-web/components/workspace/tools/Terminal.vue`
- `autobyteus-web/utils/terminalTarget.ts`
- `autobyteus-web/components/workspace/tools/__tests__/TerminalPanel.spec.ts`
- `autobyteus-web/components/workspace/tools/__tests__/Terminal.spec.ts`
- `autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts`
- `autobyteus-web/docs/terminal.md`

## Important Assumptions

- Server-home mode is represented by explicit `target: null` inside cached entries.
- Workspace/root identity is the normalized root path plus node/backend scope; `workspaceId` and display name remain metadata only.
- Keeping multiple opened target terminals live while TerminalPanel is mounted is the intended UX tradeoff.
- Clearing the cache on node/backend rebinding is the scoped policy; old-node endpoint-pinned preservation remains out of scope.

## Known Risks

- Multiple opened canonical targets can keep multiple WebSockets/PTYs alive until host unmount or node/backend cache reset.
- No persistence is provided across page reload, app restart, backend restart, host destruction, right-panel teardown, or node/backend rebinding.
- Frontend path normalization may not match every backend filesystem canonicalization edge case, but backend cwd validation remains authoritative.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix / Behavior Change
- Reviewed root-cause classification: Missing Invariant / Boundary Or Ownership Issue
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now, targeted frontend refactor
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: Implemented the approved `RightSideTabs -> TerminalPanel -> Terminal.vue child per key` ownership split, explicit target/null semantics, and clear-cache-on-rebind policy. Backend terminal lifecycle and `useTerminalSession` transport behavior remain unchanged.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Direct `RightSideTabs.vue -> <Terminal />` active-tab `v-if` was replaced cleanly. No generic stateful-tab framework, backend reattach, deterministic reconnect fallback, or endpoint-pinned old-node transport was introduced.

## Environment Or Dependency Notes

- The dedicated worktree initially had no installed `node_modules` and no generated `.nuxt` directory, so the first Vitest invocation could not start.
- Ran `pnpm install --frozen-lockfile --ignore-scripts` from the worktree root to install workspace dependencies from the lockfile.
- Ran `pnpm -C autobyteus-web exec nuxt prepare` to generate `.nuxt` types for local test execution.
- `node_modules/`, `autobyteus-web/node_modules/`, and `autobyteus-web/.nuxt/` are ignored build/test environment artifacts and are not part of the source change.

## Local Implementation Checks Run

- `pnpm -C autobyteus-web exec nuxt prepare` — passed.
- `pnpm -C autobyteus-web exec vitest --run components/layout/__tests__/RightSideTabs.spec.ts components/workspace/tools/__tests__/Terminal.spec.ts components/workspace/tools/__tests__/TerminalPanel.spec.ts composables/__tests__/useTerminalSession.spec.ts` — passed, 4 files / 37 tests.
- `git diff --check` — passed.
- Source implementation file effective non-empty line check: `RightSideTabs.vue` 155, `Terminal.vue` 329, `TerminalPanel.vue` 101, `terminalTarget.ts` 67.

## Downstream Coverage Hints / Suggested Scenarios

- Same target tab switch: open Terminal for path A, produce output, switch to another right-side tab, return, verify no new init banner and same scrollback/session remains.
- Per-target cache: open path A, switch active workspace to path B while Terminal active, then return to path A and verify path A scrollback/session is restored.
- Hidden lazy behavior: switch workspace while TerminalPanel is hidden and verify no new target child/session is created until Terminal tab is activated.
- Server-home: create server-home terminal with no active workspace, later activate a workspace terminal, then return to server-home and verify it remains explicit server-home.
- Node/backend rebinding: with cached terminals present, change node binding/terminal endpoint and verify old children unmount/disconnect and new entries are created lazily under the new scope.

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E coverage investigation and any broader executable validation remain required downstream. Backend terminal WebSocket/PTY cleanup code was intentionally not changed; existing backend close-on-WebSocket-close coverage should remain valid.
