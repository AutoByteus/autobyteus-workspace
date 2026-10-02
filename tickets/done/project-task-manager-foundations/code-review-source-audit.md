# Independent source-size and responsibility audit — CRR-001

Basis: code/test commit `560a51129b3d49a84868cc7b47f6a055150fe175` against its parent (upstream changes before it are documentation-only). Effective lines are non-empty physical lines; Vue templates and styles count. Tests/fixtures/generated outputs are excluded. Rename is represented as removal plus addition so pressure is not hidden.

All current changed implementation sources are below 500 effective lines. The >220 change trigger is conservatively evaluated using additions + removals, and is a mandatory ownership reassessment rather than an automatic split. No hard-limit, boundary or cohesion failure found.

| Source file | Effective lines | Add / remove | >500 | >220 change | Responsibility / placement judgment | Classification / action |
|---|---:|---:|---|---|---|---|
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-collaboration-tool-exposure.ts` | 44 | 3/1 | Pass | N/A | tool selection/translation; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tooling-options.ts` | 139 | 6/0 | Pass | N/A | tool selection/translation; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts` | 75 | 3/0 | Pass | N/A | tool selection/translation; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts` | 96 | 1/0 | Pass | N/A | tool selection/translation; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/default-agent-tool-mcp-adapter-providers.ts` | 19 | 3/0 | Pass | N/A | tool selection/translation; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.ts` | 16 | 16/0 | Pass | N/A | tool selection/translation; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-native-tools.ts` | 37 | 37/0 | Pass | N/A | tool selection/translation; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts` | 55 | 55/0 | Pass | N/A | tool selection/translation; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-manifest.ts` | 27 | 27/0 | Pass | N/A | tool selection/translation; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/api/graphql/types/project-tasks.ts` | 123 | 26/1 | Pass | N/A | server transport/composition; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/api/graphql/types/projects.ts` | 182 | 12/0 | Pass | N/A | server transport/composition; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/api/rest/index.ts` | 54 | 3/0 | Pass | N/A | server transport/composition; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/api/rest/project-task-context-files.ts` | 47 | 47/0 | Pass | N/A | server transport/composition; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts` | 326 | 2/1 | Pass | N/A | server transport/composition; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/context-files/domain/context-file-upload-policy.ts` | 56 | 59/0 | Pass | N/A | neutral byte policy/writer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/context-files/services/context-file-draft-cleanup-service.ts` | 99 | 2/2 | Pass | N/A | neutral byte policy/writer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/context-files/services/context-file-upload-service.ts` | 41 | 3/70 | Pass | N/A | neutral byte policy/writer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/context-files/services/context-file-upload-writer.ts` | 25 | 25/0 | Pass | N/A | neutral byte policy/writer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/persistence/file/store-utils.ts` | 235 | 3/0 | Pass | N/A | known-field persistence/commit observation; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/projects/context/project-task-context-layout.ts` | 47 | 48/0 | Pass | N/A | Task byte lifecycle/path policy; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/projects/context/project-task-context-store.ts` | 180 | 181/0 | Pass | N/A | Task byte lifecycle/path policy; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/projects/domain/models.ts` | 88 | 14/2 | Pass | N/A | domain/transport types; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/projects/domain/project-errors.ts` | 24 | 7/1 | Pass | N/A | domain/transport types; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/projects/domain/project-task-context.ts` | 14 | 14/0 | Pass | N/A | domain/transport types; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/projects/services/project-service.ts` | 247 | 32/4 | Pass | N/A | Project/Task invariants/current aggregate; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/projects/services/project-task-service.ts` | 172 | 146/116 | Pass | Reassessed | Project/Task invariants/current aggregate; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/projects/stores/project-store.ts` | 101 | 28/7 | Pass | N/A | known-field persistence/commit observation; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | 152 | 2/0 | Pass | N/A | tool selection/translation; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` | 334 | 4/2 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/agentInput/VoiceInputButton.vue` | Removed | 0/75 | Pass | N/A | feature presentation/composer; obsolete path removed | Pass; none |
| `autobyteus-web/components/chat/ChatComposer.vue` | 133 | 4/2 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/projects/ProjectDetail.vue` | 271 | 49/34 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/projects/ProjectEditor.vue` | 120 | 124/0 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/projects/ProjectFormDialog.vue` | Removed | 0/157 | Pass | N/A | feature presentation/composer; obsolete path removed | Pass; none |
| `autobyteus-web/components/projects/ProjectTaskBoard.vue` | 65 | 40/160 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/projects/ProjectTaskCard.vue` | Removed | 0/24 | Pass | N/A | feature presentation/composer; obsolete path removed | Pass; none |
| `autobyteus-web/components/projects/ProjectTaskDetail.vue` | 56 | 56/0 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/projects/ProjectTaskDialog.vue` | Removed | 0/224 | Pass | Reassessed | feature presentation/composer; obsolete path removed | Pass; none |
| `autobyteus-web/components/projects/ProjectTaskDraftEditor.vue` | 50 | 50/0 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/projects/ProjectTaskEditor.vue` | 23 | 23/0 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/projects/ProjectTaskRow.vue` | 24 | 27/0 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/projects/ProjectWorkspaceEntry.vue` | 29 | 29/0 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/projects/ProjectWorkspaceLinkDialog.vue` | Removed | 0/171 | Pass | N/A | feature presentation/composer; obsolete path removed | Pass; none |
| `autobyteus-web/components/projects/ProjectWorkspacesPanel.vue` | 68 | 5/18 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/projects/ProjectsList.vue` | 122 | 4/11 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/projects/TaskContextFiles.vue` | 56 | 56/0 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/projects/TaskDescriptionComposer.vue` | 60 | 64/0 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/components/voiceInput/VoiceInputButton.vue` | 74 | 84/0 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/composables/projects/useProjectNotice.ts` | 19 | 19/0 | Pass | N/A | draft/notice/text destination lifetime; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/composables/projects/useProjectTaskDraft.ts` | 79 | 79/0 | Pass | N/A | draft/notice/text destination lifetime; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/composables/projects/useProjectTaskPage.ts` | 24 | 24/0 | Pass | N/A | draft/notice/text destination lifetime; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/composables/voiceInput/useComposerVoiceTarget.ts` | 20 | 20/0 | Pass | N/A | draft/notice/text destination lifetime; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/graphql/queries/projectQueries.ts` | 36 | 1/0 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/graphql/queries/projectTaskQueries.ts` | 20 | 1/0 | Pass | N/A | feature presentation/composer; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/localization/messages/en/projects.ts` | 164 | 90/30 | Pass | N/A | localized display copy; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/localization/messages/en/settings.ts` | 418 | 4/0 | Pass | N/A | localized display copy; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/localization/messages/zh-CN/projects.ts` | 164 | 90/30 | Pass | N/A | localized display copy; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | 418 | 4/0 | Pass | N/A | localized display copy; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/pages/projects/[id].vue` | Removed | 0/14 | Pass | N/A | route identity entry; obsolete path removed | Pass; none |
| `autobyteus-web/pages/projects/[id]/edit.vue` | 6 | 6/0 | Pass | N/A | route identity entry; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/pages/projects/[id]/index.vue` | 6 | 6/0 | Pass | N/A | route identity entry; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/pages/projects/[id]/tasks/[taskId]/edit.vue` | 6 | 6/0 | Pass | N/A | route identity entry; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/pages/projects/[id]/tasks/[taskId]/index.vue` | 6 | 6/0 | Pass | N/A | route identity entry; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/pages/projects/[id]/tasks/new.vue` | 6 | 6/0 | Pass | N/A | route identity entry; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/pages/projects/new.vue` | 4 | 4/0 | Pass | N/A | route identity entry; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/services/projects/projectTaskContextClient.ts` | 48 | 48/0 | Pass | N/A | captured Task transport; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/stores/projectStore.ts` | 222 | 53/30 | Pass | N/A | owned renderer request/cache state; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/stores/projectTaskStore.ts` | 121 | 93/172 | Pass | Reassessed | owned renderer request/cache state; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/stores/voiceInputStore.ts` | 453 | 42/95 | Pass | N/A | owned renderer request/cache state; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/stores/workspace.ts` | 438 | 7/3 | Pass | N/A | owned renderer request/cache state; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/types/project.ts` | 46 | 6/0 | Pass | N/A | domain/transport types; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/types/projectWorkspaceDraft.ts` | 2 | 2/0 | Pass | N/A | domain/transport types; cohesive owner in appropriate directory | Pass; none |
| `autobyteus-web/types/voiceInput.ts` | 52 | 56/0 | Pass | N/A | domain/transport types; cohesive owner in appropriate directory | Pass; none |

## Triggered responsibility checks

- `project-task-service.ts` (146 added / 116 removed): the coherent Task invariant owner orchestrates preparation/commit/cleanup; byte paths/manifests/writes remain in separate context store/layout/policy files. No transport or execution concerns added.
- `projectTaskStore.ts` (93/172): one current-node Task projection owner; read/write/publication state is centralized, search remains local, transport schema remains external.
- Removed `ProjectTaskDialog.vue` (224 removed): clean-cut obsolete authoring path, not retained/wrapped.
- Other larger current files (`voiceInputStore.ts` 453 non-empty, `workspace.ts` 438, settings locales 418, existing agent text area 334) remain below the hard limit; this delta narrows voice destination/settlement or extends the existing action/copy rather than adding unrelated ownership.
- All 6 ordinary route entries remain thin identity/mode transport, not empty domain abstractions. Context store 180 lines stays a single concrete byte/manifest/lifecycle provider. ProjectEditor 120 lines remains form authoring; request/persistence authority is elsewhere.

This audit supplements, but does not replace, the canonical code-review-report.md.
