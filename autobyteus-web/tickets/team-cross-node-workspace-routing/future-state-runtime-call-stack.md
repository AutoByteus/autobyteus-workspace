# Future-State Runtime Call Stack

## Version
v2

## UC1: Mixed-node temporary team launch (frontend)
1. `AgentUserInputTextArea.handleSend(...)`
2. `activeContextStore.send(...)`
3. `agentTeamRunStore.sendMessageToFocusedMember(...)`
4. Validate remote members: `override.workspaceRootPath` must be non-empty
5. Build `memberConfigs[]`:
   - embedded member: `workspaceId = resolveWorkspaceIdForTeamMember(...)`
   - remote member: `workspaceId = null`, `workspaceRootPath = override.workspaceRootPath`
6. GraphQL `sendMessageToTeam(input.memberConfigs[])`

## UC2: Local context projection on create (frontend)
1. `RunConfigPanel.handleRun()`
2. `agentTeamContextsStore.createRunFromTemplate()`
3. `resolveWorkspaceIdForTeamMember(...)` per team member
4. `AgentContext` created with embedded workspace / remote null workspace
5. Run is blocked before this step if any remote member misses required path

## UC3: Workspace selection update in selected team (frontend)
1. `RunConfigPanel.handleSelectExisting(...)` or `handleLoadNew(...)`
2. `applyWorkspaceToTeamMembers(...)`
3. `resolveWorkspaceIdForTeamMember(...)` per member
4. Embedded members updated to selected workspace, remote members remain null

## UC4: Team creation workspace resolution (backend)
1. `AgentTeamRunResolver.sendMessageToTeam(...)`
2. `resolveRuntimeMemberConfigs(...)` normalizes `workspaceId` and `workspaceRootPath`
3. `AgentTeamInstanceManager.createTeamRunWithId(...)`
4. `buildTeamConfigFromDefinition(...)`
5. `buildAgentConfigFromDefinition(...)`
6. Workspace resolution:
   - if `workspaceId` exists -> `workspaceManager.getWorkspaceById(...)`
   - else if local-to-node and `workspaceRootPath` exists -> `workspaceManager.ensureWorkspaceByRootPath(...)`
7. Missing local required path -> `AgentTeamCreationError`

## UC5: Manifest persistence for restore metadata (backend)
1. `AgentTeamRunResolver.buildTeamRunManifest(...)`
2. For each binding, persist `workspaceRootPath` (explicit override or derived from workspace lookup)
3. `teamRunHistoryService.createTeamRunRecord(...)`
