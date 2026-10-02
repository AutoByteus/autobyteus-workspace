# Implementation local source audit

Full web VueTSC: FAILED (exit 2, 387 diagnostics). No diagnostic names a changed/new source or test file in this run (web-relative and ../server paths both compared). This filtered observation is not a full typecheck pass. Other errors were not all independently diagnosed. See implementation-web-typecheck-final.log.

| Changed/new source | Non-empty lines |
|---|---:|
| autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-collaboration-tool-exposure.ts | 44 |
| autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tooling-options.ts | 139 |
| autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts | 75 |
| autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts | 96 |
| autobyteus-server-ts/src/agent-tools/mcp/providers/default-agent-tool-mcp-adapter-providers.ts | 19 |
| autobyteus-server-ts/src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.ts | 16 |
| autobyteus-server-ts/src/agent-tools/project-tasks/project-task-native-tools.ts | 37 |
| autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts | 55 |
| autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-manifest.ts | 27 |
| autobyteus-server-ts/src/api/graphql/types/project-tasks.ts | 123 |
| autobyteus-server-ts/src/api/graphql/types/projects.ts | 182 |
| autobyteus-server-ts/src/api/rest/index.ts | 54 |
| autobyteus-server-ts/src/api/rest/project-task-context-files.ts | 47 |
| autobyteus-server-ts/src/compositions/build-studio-server.ts | 326 |
| autobyteus-server-ts/src/context-files/domain/context-file-upload-policy.ts | 56 |
| autobyteus-server-ts/src/context-files/services/context-file-draft-cleanup-service.ts | 99 |
| autobyteus-server-ts/src/context-files/services/context-file-upload-service.ts | 41 |
| autobyteus-server-ts/src/context-files/services/context-file-upload-writer.ts | 25 |
| autobyteus-server-ts/src/persistence/file/store-utils.ts | 235 |
| autobyteus-server-ts/src/projects/context/project-task-context-layout.ts | 47 |
| autobyteus-server-ts/src/projects/context/project-task-context-store.ts | 180 |
| autobyteus-server-ts/src/projects/domain/models.ts | 88 |
| autobyteus-server-ts/src/projects/domain/project-errors.ts | 24 |
| autobyteus-server-ts/src/projects/domain/project-task-context.ts | 14 |
| autobyteus-server-ts/src/projects/services/project-service.ts | 247 |
| autobyteus-server-ts/src/projects/services/project-task-service.ts | 172 |
| autobyteus-server-ts/src/projects/stores/project-store.ts | 101 |
| autobyteus-server-ts/src/startup/agent-tool-loader.ts | 152 |
| autobyteus-web/components/agentInput/AgentUserInputTextArea.vue | 334 |
| autobyteus-web/components/chat/ChatComposer.vue | 133 |
| autobyteus-web/components/projects/ProjectDetail.vue | 271 |
| autobyteus-web/components/projects/ProjectEditor.vue | 120 |
| autobyteus-web/components/projects/ProjectTaskBoard.vue | 65 |
| autobyteus-web/components/projects/ProjectTaskDetail.vue | 56 |
| autobyteus-web/components/projects/ProjectTaskDraftEditor.vue | 50 |
| autobyteus-web/components/projects/ProjectTaskEditor.vue | 23 |
| autobyteus-web/components/projects/ProjectTaskRow.vue | 24 |
| autobyteus-web/components/projects/ProjectWorkspaceEntry.vue | 29 |
| autobyteus-web/components/projects/ProjectWorkspacesPanel.vue | 68 |
| autobyteus-web/components/projects/ProjectsList.vue | 122 |
| autobyteus-web/components/projects/TaskContextFiles.vue | 56 |
| autobyteus-web/components/projects/TaskDescriptionComposer.vue | 60 |
| autobyteus-web/components/voiceInput/VoiceInputButton.vue | 74 |
| autobyteus-web/composables/projects/useProjectNotice.ts | 19 |
| autobyteus-web/composables/projects/useProjectTaskDraft.ts | 79 |
| autobyteus-web/composables/projects/useProjectTaskPage.ts | 24 |
| autobyteus-web/composables/voiceInput/useComposerVoiceTarget.ts | 20 |
| autobyteus-web/graphql/queries/projectQueries.ts | 36 |
| autobyteus-web/graphql/queries/projectTaskQueries.ts | 20 |
| autobyteus-web/localization/messages/en/projects.ts | 164 |
| autobyteus-web/localization/messages/en/settings.ts | 418 |
| autobyteus-web/localization/messages/zh-CN/projects.ts | 164 |
| autobyteus-web/localization/messages/zh-CN/settings.ts | 418 |
| autobyteus-web/pages/projects/[id]/edit.vue | 6 |
| autobyteus-web/pages/projects/[id]/index.vue | 6 |
| autobyteus-web/pages/projects/[id]/tasks/[taskId]/edit.vue | 6 |
| autobyteus-web/pages/projects/[id]/tasks/[taskId]/index.vue | 6 |
| autobyteus-web/pages/projects/[id]/tasks/new.vue | 6 |
| autobyteus-web/pages/projects/new.vue | 4 |
| autobyteus-web/services/projects/projectTaskContextClient.ts | 48 |
| autobyteus-web/stores/projectStore.ts | 222 |
| autobyteus-web/stores/projectTaskStore.ts | 121 |
| autobyteus-web/stores/voiceInputStore.ts | 453 |
| autobyteus-web/stores/workspace.ts | 438 |
| autobyteus-web/types/project.ts | 46 |
| autobyteus-web/types/projectWorkspaceDraft.ts | 2 |
| autobyteus-web/types/voiceInput.ts | 52 |

No changed source above 500 non-empty lines. >220 changed-line/new-file pressure was acted on with owned decomposition: neutral byte policy/writer, context layout/store/domain/service, tool contract/manifest/native classes, voice types and text-sink adapter, renderer REST/draft/read/notice owners and page/composer/file/row/workspace presentation components. Context store remains one cohesive IO/manifest-lifecycle owner, separate from path policy and Task invariants; not a transport or domain owner.

Hard-limit breaches: []
