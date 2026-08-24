/**
 * Seed observable run/workspace state through the real source presentation
 * stores. This function is browser-serializable so the comparison harness can
 * execute the identical state transition in both pinned source and prototype.
 */
export function applyExperienceScenario(input = {}) {
  const scenario = String(input.scenario || localStorage.getItem('autobyteus.prototype.scenario') || 'populated')
  const app = document.querySelector('#__nuxt')?.__vue_app__
  const pinia = app?.config?.globalProperties?.$pinia
  if (!pinia?._s) return { applied: false, reason: 'pinia-unavailable' }
  const store = id => pinia._s.get(id)
  const rich = scenario.startsWith('workspace_') || scenario.startsWith('mobile_')
  if (!rich) return { applied: false, reason: 'not-rich-scenario' }

  const runId = 'run-prototype-active'
  const workspaceId = 'workspace-prototype'
  const now = '2026-08-22T04:00:00.000Z'
  const workspaceMetadata = {
    workspaceId, name: 'prototype-workspace', displayName: 'Prototype Workspace',
    workspaceRootPath: '/synthetic/prototype-workspace', absolutePath: '/synthetic/prototype-workspace', kind: 'local', isTemp: false,
  }
  const runStatus = scenario.includes('error') ? 'error' : scenario.includes('completed') || scenario.includes('history') || scenario.includes('interrupted') ? 'idle' : 'running'
  const aiComplete = !scenario.includes('streaming')
  const contextAttachment = { kind: 'workspace_path', id: 'ctx-1', locator: '/synthetic/prototype-workspace/requirements.md', displayName: 'requirements.md', type: 'Markdown' }
  const conversation = {
    id: runId, agentDefinitionId: 'agent-researcher', agentName: 'Research Assistant', llmModelIdentifier: 'mock/gpt-prototype',
    createdAt: now, updatedAt: '2026-08-22T04:02:00.000Z',
    messages: [
      { type: 'user', text: 'Summarize the controlled prototype evidence.', timestamp: new Date(now), contextFilePaths: [contextAttachment], promptTokens: 120, promptCost: 0.0012 },
      { type: 'ai', text: aiComplete ? 'The current prototype evidence is deterministic and isolated.' : 'The current prototype evidence is deterministic', segments: [{ type: 'text', content: aiComplete ? 'The current prototype evidence is deterministic and isolated.' : 'The current prototype evidence is deterministic' }], timestamp: new Date('2026-08-22T04:01:00.000Z'), isComplete: aiComplete, completionTokens: aiComplete ? 84 : 42, completionCost: aiComplete ? 0.0008 : 0.0004 },
    ],
  }
  const agentContexts = store('agentContexts')
  const selection = store('agentSelection')
  if (!agentContexts || !selection) return { applied: false, reason: 'run-stores-unavailable' }
  if (!(agentContexts.runs instanceof Map)) agentContexts.runs = new Map()
  const agentContext = agentContexts.upsertProjectionContext({
    runId,
    config: { agentDefinitionId: 'agent-researcher', agentDefinitionName: 'Research Assistant', agentAvatarUrl: null, llmModelIdentifier: 'mock/gpt-prototype', runtimeKind: 'autobyteus', workspaceId, workspaceMetadata, autoExecuteTools: false, skillAccessMode: 'PRELOADED_ONLY', isLocked: true, llmConfig: { temperature: 0.2 } },
    conversation, status: runStatus,
  })
  if (scenario.includes('error')) agentContext.state.currentStatus = 'error'

  const workspace = store('workspace')
  if (workspace) {
    for (const key of ['fileSystemConnections', 'fileExplorerLiveConsumers', 'fileExplorerSnapshotRefreshes', 'workspaceMetadataRegistrationTasks']) {
      if (!(workspace[key] instanceof Map)) workspace[key] = new Map()
    }
    workspace.workspaces = { ...workspace.workspaces, [workspaceId]: { ...workspaceMetadata, workspaceConfig: {} } }
    workspace.workspaceMetadataById = { ...workspace.workspaceMetadataById, [workspaceId]: { workspaceId, workspaceRootPath: workspaceMetadata.workspaceRootPath, displayName: workspaceMetadata.displayName, kind: 'filesystem' } }
    workspace.workspaceMetadataIdsByRootPath = { ...workspace.workspaceMetadataIdsByRootPath, [workspaceMetadata.workspaceRootPath]: workspaceId }
    workspace.workspaceMetadataLoadStateById = { ...workspace.workspaceMetadataLoadStateById, [workspaceId]: { status: 'registered', error: null } }
  }
  const todo = store('agentTodo')
  if (todo && !(todo.todosByRunId instanceof Map)) todo.todosByRunId = new Map()
  todo?.setTodos(runId, [
    { todoId: 'todo-1', description: 'Compare current UI surfaces', status: 'DONE' },
    { todoId: 'todo-2', description: 'Verify deterministic interactions', status: scenario.includes('completed') ? 'DONE' : 'IN_PROGRESS' },
    { todoId: 'todo-3', description: 'Record review evidence', status: 'PENDING' },
  ])
  const activity = store('agentActivity')
  if (activity) {
    if (!(activity.activitiesByRunId instanceof Map)) activity.activitiesByRunId = new Map()
    activity.activitiesByRunId.set(runId, { activities: [
      { kind: 'system_instruction', activityId: 'activity-system-1', content: 'Use only deterministic synthetic fixtures.', timestamp: new Date('2026-08-22T04:00:05.000Z') },
      { kind: 'tool', activityId: 'activity-tool-1', invocationId: 'tool-invocation-1', toolName: 'write_file', arguments: { path: 'evidence.md' }, status: scenario.includes('error') ? 'error' : 'success', logs: ['Prepared synthetic evidence file.'], result: 'Wrote evidence.md', error: scenario.includes('error') ? 'Synthetic write rejected.' : null, timestamp: new Date('2026-08-22T04:01:15.000Z') },
    ], hasAwaitingApproval: false, highlightedActivityId: null })
  }
  const fileExplorer = store('fileExplorer')
  if (fileExplorer) {
    if (!(fileExplorer.fileExplorerStateByWorkspace instanceof Map)) fileExplorer.fileExplorerStateByWorkspace = new Map()
    const fileState = fileExplorer._getOrCreateWorkspaceState(workspaceId)
    const TreeNode = fileState.tree?.constructor
    const makeNode = (name, path, isFile, children, id) => TreeNode
      ? new TreeNode(name, path, isFile, children, id, true)
      : { id, name, path, is_file: isFile, childrenLoaded: true, children }
    const evidenceFile = makeNode('evidence.md', 'docs/evidence.md', true, [], 'node-evidence')
    const docs = makeNode('docs', 'docs', false, [evidenceFile], 'node-docs')
    const requirementsFile = makeNode('requirements.md', 'requirements.md', true, [], 'node-requirements')
    const root = makeNode('Prototype Workspace', '', false, [docs, requirementsFile], 'root')
    fileState.tree = root
    fileState.nodeIdToNode = { root, 'node-docs': docs, 'node-evidence': evidenceFile, 'node-requirements': requirementsFile }
    fileState.openFolders = { docs: true }
    fileState.openFiles = [{ path: 'requirements.md', type: 'markdown', mode: 'edit', accessIntent: null, content: '# Prototype requirements\n\nAll UI evidence is synthetic and deterministic.', url: null, relativeResourceContext: { kind: 'workspace', workspaceId }, isLoading: false, error: scenario.includes('file_error') ? 'Synthetic file read failed.' : null }]
    fileState.activeFile = 'requirements.md'
  }
  const runFiles = store('runFileChanges')
  runFiles?.replaceRunProjection(runId, [{ id: `${runId}:docs/evidence.md`, runId, path: 'docs/evidence.md', type: 'file', status: 'available', sourceTool: 'write_file', sourceInvocationId: 'tool-invocation-1', content: '# Evidence\n\nDeterministic artifact content.', createdAt: '2026-08-22T04:01:00.000Z', updatedAt: '2026-08-22T04:01:30.000Z' }])
  const runHistory = store('runHistory')
  if (runHistory) {
    runHistory.navigationProjection = {
      workspaceNodes: [{ workspaceId, workspaceRootPath: workspaceMetadata.workspaceRootPath, workspaceName: workspaceMetadata.displayName, workspaceKind: 'filesystem', canRemoveFromWorkspaces: true, agents: [{ agentDefinitionId: 'agent-researcher', agentName: 'Research Assistant', agentAvatarUrl: null, runs: [{ runId, summary: 'Controlled prototype evidence review', lastActivityAt: '2026-08-22T04:02:00.000Z', currentStatus: runStatus, lastKnownStatus: runStatus === 'running' ? 'ACTIVE' : runStatus === 'error' ? 'ERROR' : 'IDLE', isActive: runStatus === 'running', source: 'history', isDraft: false }] }] }],
      teamNodes: [], teamNodesByWorkspaceRoot: {},
      runIndexById: { [runId]: { workspaceIndex: 0, agentIndex: 0, runIndex: 0 } },
      teamIndexById: {}, memberIndexByIdentity: {},
      runAncestryById: { [runId]: { workspaceId, agentDefinitionId: 'agent-researcher' } },
      teamAncestryById: {}, memberAncestorExecutionKeysByIdentity: {},
    }
    runHistory.resumeConfigByRunId = { ...runHistory.resumeConfigByRunId, [runId]: { runId, isActive: runStatus === 'running', metadataConfig: { agentDefinitionId: 'agent-researcher', workspaceRootPath: workspaceMetadata.workspaceRootPath, llmModelIdentifier: 'mock/gpt-prototype', llmConfig: {}, autoExecuteTools: false, skillAccessMode: 'PRELOADED_ONLY', runtimeKind: 'autobyteus', runtimeReference: null }, editableFields: { llmModelIdentifier: runStatus !== 'running', llmConfig: runStatus !== 'running', autoExecuteTools: runStatus !== 'running', skillAccessMode: runStatus !== 'running', workspaceRootPath: false, runtimeKind: false } } }
  }

  if (scenario.startsWith('workspace_team') || scenario.startsWith('mobile_team')) {
    const launchedFromCatalog = scenario === 'workspace_team_launch'
    const rootTeamRunId = launchedFromCatalog ? 'team-run-created-fixture' : 'team-run-prototype'
    const reviewerRunId = launchedFromCatalog ? 'team-member-researcher-created' : 'team-member-reviewer'
    const writerRunId = launchedFromCatalog ? 'team-member-writer-created' : 'team-member-writer'
    const reviewerName = launchedFromCatalog ? 'Research Assistant' : 'Review Coordinator'
    const writerName = launchedFromCatalog ? 'Documentation Writer' : 'Evidence Writer'
    const reviewerDefinitionId = launchedFromCatalog ? 'agent-researcher' : 'agent-reviewer'
    const reviewerDisplayName = launchedFromCatalog ? 'researcher' : reviewerName
    const writerDisplayName = launchedFromCatalog ? 'writer' : writerName
    const reviewerAddress = launchedFromCatalog ? '/researcher' : '/product-review/coordinator'
    const writerAddress = launchedFromCatalog ? '/writer' : '/product-review/evidence-writer'
    const rootRowKey = launchedFromCatalog ? `team:${rootTeamRunId}` : 'team:root'
    const rootAddress = launchedFromCatalog ? '/' : '/product-review'
    const memberConfig = (id, name) => ({ agentDefinitionId: id, agentDefinitionName: name, agentAvatarUrl: null, llmModelIdentifier: 'mock/gpt-prototype', runtimeKind: 'autobyteus', workspaceId, workspaceMetadata, autoExecuteTools: false, skillAccessMode: 'PRELOADED_ONLY', isLocked: true, llmConfig: { temperature: 0.2 } })
    const teamStatus = scenario.includes('error') ? 'error' : scenario.includes('completed') || scenario.includes('history') || scenario.includes('interrupted') ? 'idle' : 'running'
    const memberStatus = launchedFromCatalog ? 'offline' : teamStatus
    const teamLastActivityAt = launchedFromCatalog ? new Date().toISOString() : now
    const teamStreaming = scenario.includes('streaming')
    const reviewerText = scenario.includes('error') ? 'The review run encountered a deterministic error.'
      : scenario.includes('interrupted') ? 'The review run was interrupted before the next task.'
        : scenario.includes('completed') || scenario.includes('history') ? 'The controlled comparison was completed.'
          : teamStreaming ? 'I delegated the visual comparison and am reviewing' : 'I delegated the visual comparison and am reviewing the result.'
    const writerText = scenario.includes('error') ? 'The evidence writer reported a synthetic failure.'
      : scenario.includes('interrupted') ? 'The evidence writer stopped after the interruption.'
        : 'The matched source and prototype frames are ready for review.'
    const memberConversation = (id, name, text) => ({ id, agentDefinitionId: id, agentName: name, createdAt: now, updatedAt: '2026-08-22T04:03:00.000Z', messages: launchedFromCatalog ? [] : [{ type: 'ai', text, segments: [{ type: 'text', content: text }], timestamp: new Date('2026-08-22T04:02:00.000Z'), isComplete: !teamStreaming, completionTokens: teamStreaming ? 24 : 48, completionCost: teamStreaming ? 0.00025 : 0.0005 }] })
    const reviewer = agentContexts.upsertProjectionContext({ runId: reviewerRunId, config: memberConfig(reviewerDefinitionId, reviewerName), conversation: memberConversation(reviewerRunId, reviewerName, reviewerText), status: memberStatus })
    const writer = agentContexts.upsertProjectionContext({ runId: writerRunId, config: memberConfig('agent-writer', writerName), conversation: memberConversation(writerRunId, writerName, writerText), status: memberStatus })
    const entries = [
      { agentRunId: reviewerRunId, memberAddress: reviewerAddress, agentContext: reviewer },
      { agentRunId: writerRunId, memberAddress: writerAddress, agentContext: writer },
    ]
    const rows = [
      { key: rootRowKey, kind: 'configured_team', address: rootAddress, displayName: 'Product Review Team', accessibleName: 'Product Review Team', depth: 0, parentKey: null, agentRunId: null, teamRunId: rootTeamRunId, taskId: null, taskStatus: null, currentStatus: null, focusable: false, expandable: true, coordinator: false },
      { key: `agent:${reviewerRunId}`, kind: 'configured_agent', address: reviewerAddress, displayName: reviewerDisplayName, accessibleName: reviewerDisplayName, depth: 1, parentKey: rootRowKey, agentRunId: reviewerRunId, teamRunId: null, taskId: null, taskStatus: null, currentStatus: memberStatus, focusable: true, expandable: false, coordinator: true },
      { key: `agent:${writerRunId}`, kind: 'configured_agent', address: writerAddress, displayName: writerDisplayName, accessibleName: writerDisplayName, depth: 1, parentKey: rootRowKey, agentRunId: writerRunId, teamRunId: null, taskId: null, taskStatus: null, currentStatus: memberStatus, focusable: true, expandable: false, coordinator: false },
    ]
    const ref = { reference_id: 'team-ref-1', path: '/synthetic/prototype-workspace/docs/evidence.md', type: 'file', created_at: '2026-08-22T04:02:30.000Z', updated_at: '2026-08-22T04:02:30.000Z' }
    const messages = launchedFromCatalog ? [] : [
      { message_id: 'team-message-1', sender_agent_run_id: reviewerRunId, receiver_agent_run_id: writerRunId, content: 'Please compare the source and prototype workspace states.', message_type: 'agent_message', created_at: '2026-08-22T04:01:00.000Z', reference_files: [] },
      { message_id: 'team-message-2', sender_agent_run_id: writerRunId, receiver_agent_run_id: reviewerRunId, content: 'Comparison complete. The controlled evidence is attached.', message_type: 'agent_message', created_at: '2026-08-22T04:03:00.000Z', reference_files: [ref] },
    ]
    const taskRows = launchedFromCatalog ? [] : [{ task: { task_id: 'task-visual-parity', status: 'accepted', description: 'Validate exact visual parity for the workspace.', created_at: '2026-08-22T04:00:30.000Z', reference_files: [], updates: [{ kind: 'submission', submission_id: 'submission-1', created_at: '2026-08-22T04:02:30.000Z', message: 'All matched frames pass.', reference_files: [ref] }, { kind: 'review', review_id: 'review-1', reviewed_submission_id: 'submission-1', decision: 'accept', comment: 'Accepted for baseline evidence.', created_at: '2026-08-22T04:03:30.000Z', reference_files: [] }] }, label: 'Visual parity validation', targetKind: 'agent', targetAgentRunId: writerRunId, targetTeamRunId: null, targetAddress: '/product-review/evidence-writer', delegatorAgentRunId: reviewerRunId }]
    const launchConfiguration = {
      runtime_kind: 'AUTOBYTEUS', llm_model_identifier: 'mock/gpt-prototype', llm_config: { temperature: 0.2 },
      auto_execute_tools: false, skill_access_mode: 'PRELOADED_ONLY', workspace_root_path: workspaceMetadata.workspaceRootPath,
    }
    const launchExecutionTree = {
      schema_version: 1, created_at: now, archived_at: null, application_binding: null, handoffs: [],
      root_team: {
        team_definition_id: 'team-product', team_definition_name: 'Product Review Team', team_run_id: rootTeamRunId,
        coordinator_address: reviewerAddress,
        members: [
          { kind: 'configured_agent', address: reviewerAddress, agent_definition_id: reviewerDefinitionId, role: null, description: null, agent_run_id: reviewerRunId, platform_agent_run_id: null, launch_configuration: launchConfiguration },
          { kind: 'configured_agent', address: writerAddress, agent_definition_id: 'agent-writer', role: null, description: null, agent_run_id: writerRunId, platform_agent_run_id: null, launch_configuration: launchConfiguration },
        ],
        task_executions: [],
      },
    }
    const executionTree = launchedFromCatalog
      ? launchExecutionTree
      : { root_team: { team_run_id: rootTeamRunId, members: [], task_executions: [] } }
    const view = {
      _focusedAgentRunId: reviewerRunId,
      getRootTeamRunId: () => rootTeamRunId, getTeamDefinitionName: () => 'Product Review Team', getFocusedAgentContext() { return entries.find(item => item.agentRunId === this._focusedAgentRunId)?.agentContext || null },
      getFocusedMemberAddress() { return entries.find(item => item.agentRunId === this._focusedAgentRunId)?.memberAddress || '' }, getFocusedAgentRunId() { return this._focusedAgentRunId },
      getConfigurationView: () => launchedFromCatalog
        ? { teamDefinitionId: 'team-product', teamDefinitionName: 'Product Review Team', runtimeKind: 'autobyteus', workspaceId, workspaceMetadata, llmModelIdentifier: 'mock/gpt-prototype', llmConfig: { temperature: 0.2 }, autoExecuteTools: false, skillAccessMode: 'PRELOADED_ONLY', memberOverrides: {}, isLocked: true }
        : { teamDefinitionId: 'team-product', teamDefinitionName: 'Product Review Team', workspaceId, workspaceMetadata, isLocked: true },
      isRootTeamActive: () => launchedFromCatalog || teamStatus === 'running', listNavigationRows: () => rows, listAgentContextEntries: () => entries,
      listCommunicationMessages: () => messages, listTaskHistoryRows: () => taskRows, hasAgentRun: id => entries.some(item => item.agentRunId === id),
      getAgentContext: id => entries.find(item => item.agentRunId === id)?.agentContext || null,
      getMemberAddress: id => entries.find(item => item.agentRunId === id)?.memberAddress || null, getExecutionTree: () => executionTree,
      focusAgent(id) { if (!entries.some(item => item.agentRunId === id)) return { disposition: 'rejected' }; this._focusedAgentRunId = id; return { disposition: 'applied' } }, needsStreamRecovery: () => scenario.includes('recovery'),
    }
    const teams = store('agentTeamContexts')
    if (teams) teams.teams = new Map([[rootTeamRunId, { view }]])
    selection.selectRunWithoutShellNavigation(rootTeamRunId, 'team')
    if (launchedFromCatalog && runHistory) {
      const memberRow = (agentRunId, memberAddress, displayName) => ({
        teamRunId: rootTeamRunId, kind: 'agent', memberAddress, displayName, agentRunId, teamRunIdForNode: null,
        workspaceRootPath: workspaceMetadata.workspaceRootPath, summary: 'New - Product Review Team', lastActivityAt: teamLastActivityAt,
        currentStatus: memberStatus, isActive: memberStatus !== 'offline' && memberStatus !== 'error', deleteLifecycle: 'READY', children: [],
      })
      const stableExecutionRow = (row, depth = 0) => ({
        kind: 'stable_member', rowKey: `agent:${row.agentRunId}`, teamRunId: rootTeamRunId, memberAddress: row.memberAddress,
        agentRunId: row.agentRunId, teamRunIdForNode: null, memberKind: 'agent', displayName: row.displayName, depth, hasChildren: false, row,
      })
      const reviewerRow = memberRow(reviewerRunId, reviewerAddress, reviewerDisplayName)
      const writerRow = memberRow(writerRunId, writerAddress, writerDisplayName)
      const rootTeam = {
        teamRunId: rootTeamRunId, kind: 'agent_team', memberAddress: '/', displayName: 'Product Review Team', agentRunId: null,
        teamDefinitionId: 'team-product', teamRunIdForNode: rootTeamRunId, coordinatorAddress: reviewerAddress,
        workspaceRootPath: null, summary: 'New - Product Review Team', lastActivityAt: teamLastActivityAt,
        currentStatus: null, isActive: true, deleteLifecycle: 'READY', children: [reviewerRow, writerRow],
      }
      const teamNode = {
        teamRunId: rootTeamRunId, teamDefinitionId: 'team-product', teamDefinitionName: 'Product Review Team',
        workspaceRootPath: workspaceMetadata.workspaceRootPath, summary: 'New - Product Review Team', lastActivityAt: teamLastActivityAt,
        isActive: true, deleteLifecycle: 'READY', focusedAgentRunId: reviewerRunId, rootTeam,
        members: [reviewerRow, writerRow], executionRows: [stableExecutionRow(reviewerRow), stableExecutionRow(writerRow)],
      }
      runHistory.workspaceGroups = []
      runHistory.navigationProjection = {
        workspaceNodes: [{ workspaceId, workspaceRootPath: workspaceMetadata.workspaceRootPath, workspaceName: workspaceMetadata.displayName, workspaceKind: 'filesystem', canRemoveFromWorkspaces: true, agents: [] }],
        teamNodes: [teamNode], teamNodesByWorkspaceRoot: { [workspaceMetadata.workspaceRootPath]: [teamNode] }, runIndexById: {},
        teamIndexById: { [rootTeamRunId]: { index: 0, workspaceRootPath: workspaceMetadata.workspaceRootPath, workspaceIndex: 0 } },
        memberIndexByIdentity: {
          [`${rootTeamRunId}\u0000agent:${reviewerRunId}`]: 0,
          [`${rootTeamRunId}\u0000agent:${writerRunId}`]: 1,
        },
        runAncestryById: {}, teamAncestryById: { [rootTeamRunId]: { workspaceId, teamDefinitionGroupKey: 'team-product' } },
        memberAncestorExecutionKeysByIdentity: {
          [`${rootTeamRunId}\u0000agent:${reviewerRunId}`]: [],
          [`${rootTeamRunId}\u0000agent:${writerRunId}`]: [],
        },
      }
      runHistory.navigationTopologyRevision = (runHistory.navigationTopologyRevision || 0) + 1
    }
    if (scenario.startsWith('mobile_')) store('mobileWork')?.selectContext({ kind: 'team-run', teamRunId: rootTeamRunId, teamDefinitionId: 'team-product', title: 'Product Review Team', summary: 'Controlled team review run', workspaceRootPath: workspaceMetadata.workspaceRootPath, focusedAgentRunId: reviewerRunId, isActive: teamStatus === 'running', lastActivityAt: '2026-08-22T04:03:30.000Z', statusLabel: teamStatus === 'running' ? 'Running' : teamStatus === 'error' ? 'Error' : 'Stopped' }, input.tab || 'chat')
    return { applied: true, kind: 'team', runId: rootTeamRunId }
  }

  selection.selectRunWithoutShellNavigation(runId, 'agent')
  if (scenario.startsWith('mobile_')) store('mobileWork')?.selectContext({ kind: 'agent-run', runId, agentDefinitionId: 'agent-researcher', title: 'Research Assistant', summary: 'Controlled agent evidence run', workspaceRootPath: workspaceMetadata.workspaceRootPath, isActive: runStatus === 'running', lastActivityAt: '2026-08-22T04:02:00.000Z', statusLabel: runStatus === 'running' ? 'Running' : runStatus === 'error' ? 'Error' : 'Stopped' }, input.tab || 'chat')
  return { applied: true, kind: 'agent', runId }
}
