# Investigation Notes

## Investigation Meta

- Package identifier: `web-ui-cleanup-round` (Project Task `autobyteus-320`)
- Request / ticket: autobyteus-320 (six items; see requirements)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round`
- Repository mode: `Git`
- Task worktree / branch: the workspace root, branch `codex/web-ui-cleanup-round`
- Resolved base: `origin/personal` @ `e72a4702e9` (fetched 2026-10-28)
- Finalization target: `origin/personal`
- Bootstrap result: `pnpm install --frozen-lockfile`, `nuxi prepare`, server `prebuild`
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (2026-10-28): the updated `SKILL.md`, `references/requirements-engineering.md` and `templates/requirements-doc-template.md` (re-read after the skill update), `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`, `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `GLOSSARY.md`, `TESTING.md`, `RELEASE.md` (in this conversation)
- Investigation status: complete

## Initial Request And Clarifications

- Original request: Task autobyteus-320 description and its comment (item 6), read with `get_project_task`.
- Clarifications from the user in this conversation (2026-10-28):
  - Local Tools card icons go;
  - MCP card row icons go ("so many identical icons");
  - the Sync Tools sparkles go;
  - menu items themselves stay (only icons go);
  - runtime names are full names everywhere, as the chat area shows ("It's not like short names");
  - the rest of the proposal is approved ("as long as it makes the UI more clean");
  - "Waiting…" is fine;
  - voice input as proposed.

## Source Log

| Date | Type | Source | Finding | ID |
| --- | --- | --- | --- | --- |
| 2026-10-28 | History | `git show --stat 3a87152631` | 28 web files; 71 `i-heroicons-*` classes → `<Icon>` (they rendered nothing before) | E-01 |
| 2026-10-28 | Code | `autobyteus-web/pages/settings.vue:27,38-229,313` | 13 menu-item Icons plus the Back arrow (line 27, already an Icon before the commit) | E-01 |
| 2026-10-28 | Code | `components/tools/ToolCard.vue` (diff), `McpServerCard.vue`; `git show 5b27a997f4` | Tool card icon inside a tinted box; MCP card row icons; autobyteus-244's icons are in `McpConfigRows.vue` (not in the H-28 set) | E-02 |
| 2026-10-28 | Code | server `available-agent-runtimes/available-agent-runtimes-service.ts:48-57,245` (`RUNTIME_NAMES`, `agentRuntimeDisplayName`) used by `model-routing/services/model-routing-sessions.ts:120`, `model-router.ts:51`, `launch-preferences/launch-usability-check.ts:174`; web `types/agent/AgentRunConfig.ts:6-28` (`runtimeKindToLabel`, full names), `utils/chat/chatDefaults.ts:18-28` (`runtimeShortLabel`: "Claude SDK"), `components/settings/agent-runtimes/agentRuntimesPresentation.ts:4-11` (`runtimeName`: "Claude") | Three name sets; callers: Chat model menu (both full and compact), Run Settings, member rows, Model Routing, Agent Runtimes page, update notices | E-03 |
| 2026-10-28 | Code | `autobyteus-agent-presentation-contracts` is a dependency of both web and server, with runtime value imports on both sides (`remoteRunsStore.ts:8`, `collaborator-admission.ts:5`) | Place for the one list | E-03 |
| 2026-10-28 | Code | `components/settings/embedding/ProjectIndexesCard.vue:55-57,121-122`; `EmbeddingSettingsPanel.vue:28-33`; `EmbeddingModelCard.vue:33-60`; `localization/messages/{en,zh-CN}/embeddingSettings.ts:55-56`; `__tests__/EmbeddingSettingsPanel.spec.ts:147` | One WAITING state with two wordings by `modelReady`; the model card above shows the model's own state and progress | E-04 |
| 2026-10-28 | Code | `autobyteus-server-ts/src/skill-update-notices/services/skill-update-notice-builder.ts:14-27`; `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue` (renders through `MarkdownRenderer`) | Paths and the skill folder are plain Markdown text; the skill name is already inline code | E-05 |
| 2026-10-28 | Code | `components/projects/TaskDependencyPicker.vue:107-127`; `TaskPartOfPicker.vue:123` | `watch(options, …)` without `immediate`; the Part-of picker has `{ immediate: true }` | E-06 |
| 2026-10-28 | Code | `components/voiceInput/VoiceInputButton.vue`; `components/projects/ProjectVoiceStatus.vue`; `components/projects/ProjectEditor.vue:24-26,76-85`; `composables/projects/useProjectTaskDraft.ts:32-33`; `types/voiceInput.ts:2`; `components/memory/MemorySearchPanel.vue` | The shared button shows only when voice input is available, cancels its operation on unmount; targets merge the transcript into the draft with `mergeTranscriptWithDraft`; the project status line shows recording/transcribing/no speech/failure; `source` is a web-only union | E-07 |

## Relevant Existing Behavior And Supported Product Paths

See requirements BEH-001…007 with these evidence IDs.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Established | Evidence |
| --- | --- | --- | --- | --- |
| User screenshots (2026-10-28) | SCN-001 | Settings sidebar, Local Tools cards and MCP cards with icons on 1.5.9 | Reproduced (by the user, in the app) | conversation |
| Code read | SCN-005 | With options unchanged after mount, `active` stays 0 even if option 0 is a loop Task | Read | E-06 |
| Code read | SCN-004 | `__init__` inside plain Markdown is bold | Read (and autobyteus-145's evidence `tickets/done/skill-update-notice-changed-files/api-e2e-evidence/desktop/obs-001-markdown-paths.png`) | E-05 |

- Temporary diagnostics: none.
- Reproduction for implementation: the regression tests named in the design (AC-009, AC-010) start failing on base.

## Persisted Data And State Facts

- Not affected.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `icon-inventory.md` | Solution Designer | The 71 icons and their disposition | Item 1 | REQ-001/002 | Current | User-approved (DEC-001) |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| R-01 | Risk | Longer runtime names in tight spots (chat footer, member rows) | They truncate already (`truncate whitespace-nowrap`); the footer hides the runtime on small screens; look in the app | Accepted (user decision) |
| R-02 | Risk | Tests asserting short names in server and web | Update with the change | Expected |
