# Investigation Notes

## Investigation Meta

- Package identifier: `file-viewer-word-wrap-618`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-word-wrap-618`
- Branch: `codex/file-viewer-word-wrap-618`
- Base: `origin/personal` @ `c1147c8917`
- Finalization target: `origin/personal`
- Bootstrap: worktree created; dependencies not yet installed (implementation installs them)
- Authorities read: requirements and design gates (read in this conversation), `DESIGN.md`, `TESTING.md`
- Status: complete

## Source Log

| Source | Finding |
| --- | --- |
| Task screenshots (4) | Phone: `pnpm-workspace.yaml`, `tsconfig.json`, `draft-v1.txt` clip at the right; horizontal scroll |
| `autobyteus-web/components/fileExplorer/MonacoEditor.vue:80-83` | Initial wrap: the `wordWrap` prop, then `options.wordWrap`, otherwise `'off'` |
| `MonacoEditor.vue:97, 139-153` | `isWordWrapControlled` (a prop was passed); the "Toggle Word Wrap" action applies its change only when uncontrolled, and always emits `update:wordWrap` |
| `MonacoEditor.vue:127-136` | `monaco.editor.create(…)` with `wordWrap: wordWrapState.value`; `wrappingIndent` not set (Monaco's default `'same'`) |
| `autobyteus-web/components/fileExplorer/FileViewer.vue:37, 80-81, 103-107` | `MonacoEditor` is used for Text in edit mode, with `modelValue`, `language`, `readOnly` and no wrap setting |
| `grep "MonacoEditor"` in `autobyteus-web/components`, `pages` | Only `FileViewer.vue` imports it. `FileViewer` is used by `FileExplorerTabs`, `MobileFileViewer`/`MobileFiles`, `CollaborationMessageReferenceViewer`, `TeamReferenceFileViewer` and `ArtifactContentViewer` |
| `autobyteus-web/components/fileExplorer/__tests__/MonacoEditor.spec.ts:45-80` | Tests of wrap options exist (to update for the new default) |
