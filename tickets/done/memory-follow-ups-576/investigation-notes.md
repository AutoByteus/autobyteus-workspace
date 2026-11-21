# Investigation Notes

- Package: `memory-follow-ups-576` (autobyteus-576)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-follow-ups-576`, `codex/memory-follow-ups-576`
- Base: `origin/personal` @ `61fd6f41f7` (2026-11-21); finalization target `origin/personal`
- Authorities read: requirements, architecture, design and finding-the-cause references and `DESIGN.md` (this conversation); `TESTING.md` "File watching on a busy Mac"

| ID | Item | Finding | Established |
| --- | --- | --- | --- |
| I-1 | FU-009 | `agent-memory-layout.ts:36-38, 57-67`: `MAX_FULL_DEFINITION_FOLDER_NAME_BYTES = 200`, prefix 120, hash 16. Docs: `agent_memory.md:151`, `agent_episodic_catalog.md:29`. Test: `tests/unit/agent-memory/definition-folder-names.test.ts`. autobyteus-554 is merged but not released | Read |
| I-2 | FU-002 | `MarkdownPreviewer.vue` passes only an image resolver to `MarkdownRenderer`. `MarkdownRenderer.vue:141-163` swallows scheme-less links (`preventDefault`, nothing else). Opening a file: `fileExplorerStore.openFilePreview(path, workspaceId)` (`fileExplorerContentActions.ts:87-93`). The previewer has `path` and `relativeResourceContext` (`{ kind: 'workspace', workspaceId }` for workspace files) | Read |
| I-3 | FU-003 | `ChatWorkspaceMenu.vue:264-268` filters only `!isTemp`. `useMobileLaunchWorkspaces.ts:40` maps every workspace. `SkillWorkspaceLoader.vue:28-55` registers in `onMounted` and unregisters only a completed id. The web store's kinds are `filesystem`, `temp`, `skill`, `semantic_memory` (`stores/workspace.ts:94, 379-397`) | Read |
| I-4 | FU-004 | `memory/imports/docker-node-1/agent_teams/`: 113 folders with older-layout files (`team_communication_messages.json` ×97, `task_delegation_records.json` ×76, `team_run_metadata.json` ×29); newest change 2026-11-08. The readiness index refuses them (`ROOT_RUN_PACKAGE_MANIFEST_INVALID`, 554 IMP-09) | Data (read-only) |
| I-5 | FU-005 | `package-personal-settings.e2e.test.ts:206` installs fake `setTimeout`, `clearTimeout` and `Date`; `afterAll` (`:211-216`) calls `app.close()` before `vi.useRealTimers()` | Read |
| I-6 | FU-006 | SM-12 (`agent-semantic-memory.e2e.test.ts:438-461`) uses `chmod 0o555`, which root ignores | Read |
| I-7 | FU-007 | No server source in `8430d9ef12..74d046320a` touches package definitions, watchers or agent listing (`git diff --name-only`): 115 files, all collaboration, messaging, journal and ACP. The test waits a fixed 300 ms (`agent-package-definitions-live-refresh.e2e.test.ts:684-693`). The host's `fseventsd` was at 23.8 GB (554 DEL-47). Likely host and test, not a code regression; to be reproduced | Read; cause not yet reproduced |
| I-8 | FU-008 | `runtime-management/antigravity-cli-capability.ts:28, 78-82`: the timer calls `finish(undefined, timedOut())` and kills the child without checking whether it exited. `grok/grok-build-capability.ts` reports `GROK_CLI_UNSUPPORTED` on the same path (554 FU-008, DEL-46/47) | Read |
