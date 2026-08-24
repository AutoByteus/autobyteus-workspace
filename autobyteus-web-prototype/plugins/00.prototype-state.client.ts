import runtimeFixture from '~/prototype/fixtures/runtime-state.json'
import type { Pinia, PiniaPluginContext } from 'pinia'
import type { Router } from 'vue-router'
import { addCollection } from '@iconify/vue'
import monacoLoader from '@monaco-editor/loader'
import iconCollections from '~/prototype/fixtures/icon-collections.json'
import { defineNuxtPlugin } from '#app'
import { installHostScenario } from '~/prototype/shared/install-host-scenario.js'
import { applyExperienceScenario } from '~/prototype/shared/apply-experience-scenario.js'

const SCENARIO_KEY = 'autobyteus.prototype.scenario'
const CONTEXT_KEY = 'autobyteus.prototype.context'
const DEFAULT_SCENARIO = 'populated'
const DEFAULT_CONTEXT = 'desktop'
const navigationOverlayStores = new Set(['agentRunConfig', 'agentSelection', 'teamRunConfig'])

const localActions: Record<string, Set<string>> = {
  appFontSize: new Set(['initialize', 'setPreset', 'resetToDefault']),
  appLayout: new Set(['toggleMobileMenu', 'closeMobileMenu', 'openMobileMenu', 'setHostShellPresentation', 'resetHostShellPresentation']),
  activeContext: new Set(['addContextFilePath', 'removeContextFilePath', 'clearContextFilePaths']),
  agentRunConfig: new Set(['setTemplate', 'setAgentConfig', 'updateAgentConfig', 'setWorkspaceLoading', 'setWorkspaceLoaded', 'setWorkspaceError', 'clearWorkspaceState', 'collapsePanel', 'expandPanel', 'togglePanel', 'markFirstMessageSent', 'clearConfig']),
  agentSelection: new Set(['setRunSelection', 'setTeamDraftSelection', 'clearRunSelection', 'promoteTeamDraftLaunch', 'selectRunWithoutShellNavigation', 'selectTeamDraftWithoutShellNavigation', 'clearSelectionWithoutShellNavigation', 'selectRun', 'selectTeamDraft', 'clearSelection']),
  agentTodo: new Set(['_ensureEntry', 'setTodos', 'clearTodos']),
  agentTeamContexts: new Set(['addTeamContext', 'replaceTeamContext', 'removeTeamContext', 'focusMember']),
  teamRunConfig: new Set(['createDraft', 'setTemplate', 'setConfig', 'applyConfigEdit', 'focusMember', 'setPendingInput', 'removeDraft', 'selectDraft', 'replaceSelectedDraft', 'admitDraftLaunch', 'completeDraftLaunch', 'releaseDraftLaunch', 'setRuntimeModelCatalog', 'setWorkspaceLoading', 'setWorkspaceLoaded', 'setWorkspaceError', 'clearWorkspaceState', 'collapsePanel', 'expandPanel', 'togglePanel', 'markFirstMessageSent', 'clearConfig']),
  workspaceCenterView: new Set(['showChat', 'showConfig']),
  uiError: new Set(['push', 'remove', 'clear', 'toggle', 'open', 'close']),
  mobileWork: new Set(['selectContext', 'setActiveTab', 'requestRunSetup', 'consumeRunSetupIntent', 'requestFilePreview', 'consumeFilePreviewRequest', 'addDraftContextAttachment', 'removeDraftContextAttachment', 'clearDraftContextAttachments', 'consumeDraftContextAttachments', 'getPendingTeamRunAttachments', 'hasPendingTeamRunAttachments', 'addPendingTeamRunAttachment', 'moveDraftAttachmentsToPendingTeamRun', 'removePendingTeamRunAttachment', 'clearPendingTeamRunAttachments', 'consumePendingTeamRunAttachments', 'rememberFocusedTeamMember', 'getRememberedFocusedTeamMember', 'updateFocusedTeamMember', 'clearContext']),
  memoryExplorerStore: new Set(['setSelectedSourceByKey', 'setHomeTab', 'setSelectedAgentFromRoute', 'setSelectedTeamFromRoute', 'setAgentsSearch', 'setTeamsSearch', 'setAgentRunsSearch', 'setTeamRunsSearch', 'changeAgentRunsPage', 'changeTeamRunsPage', 'changeHomePage', 'resetPagesForSourceChange', 'clearSelections']),
  memoryInspectorStore: new Set(['setActiveTab', 'setRawTraceLimit', 'setRawTraceFileName', 'buildVariables', 'clear']),
  mediaLibrary: new Set(['setCategory', 'changePage']),
  messagingSetupNavigationStore: new Set(['selectedStepForProvider', 'setSelectedStep', 'clearSelectedStep']),
  messagingProviderScopeStore: new Set(['applyManagedAccountHints', 'setSelectedProvider']),
  messagingVerificationStore: new Set(['resetVerificationChecks', 'setVerificationCheckStatusForProvider', 'setVerificationResultForProvider', 'clearVerificationResultForProvider', 'resetAllProviderVerificationStates']),
  skill: new Set(['setCurrentSkill', 'clearError']),
  application: new Set(['clearError']),
  applicationPackages: new Set(['clearError']),
  agentPackages: new Set(['isPackageActionLoading', 'clearError']),
  toolManagement: new Set(['clearError', 'clearPreviewResult']),
  agentDefinition: new Set(['clearDeleteResult', 'invalidateAgentDefinitions']),
  nodeStore: new Set(['replaceSnapshot', 'persistSnapshotToLocalStorage', 'persistCurrentSnapshotToLocalStorage', 'applyRegistrySnapshot', 'ensureBrowserEmbeddedNodePresent', 'initializeRegistry', 'getNodeById', 'getNodeBaseUrl', 'upsertRegistry', 'addRemoteNode', 'removeRemoteNode', 'renameNode', 'teardownRegistryListener']),
  windowNodeContext: new Set(['initializeFromWindowContext', 'bindNodeContext', 'getBoundEndpoints', 'waitForBoundBackendReady']),
  server: new Set(['initialize', 'waitForServerReady', 'handleElectronServerInitialization', 'handleBrowserServerConnection', 'attemptServerConnection', 'updateServerStatus', 'restartServer', 'resetServerDataAndRestart', 'checkServerHealth']),
  appUpdate: new Set(['initialize', 'checkForUpdates', 'downloadUpdate', 'installUpdateAndRestart', 'dismissNotice', 'applyRemoteState']),
  extensions: new Set(['startInstallPolling', 'stopInstallPolling', 'refreshInstallState', 'applyRemoteState', 'updateLocalExtension', 'initialize', 'installExtension', 'enableExtension', 'disableExtension', 'updateVoiceInputSettings', 'updateVoiceInputLanguageMode', 'updateVoiceInputAudioInputDevice', 'removeExtension', 'reinstallExtension', 'openExtensionFolder']),
  voiceInput: new Set(['setLatestResult', 'clearLatestResult', 'clearCaptureWatchdog', 'armCaptureWatchdog', 'handleCaptureStartupTimeout', 'initialize', 'queryMicrophonePermission', 'registerMediaDeviceListener', 'refreshAudioInputDevices', 'startRecording', 'stopRecording', 'cancelOperationForSource', 'cleanup']),
  browserShell: new Set(['initialize', 'openTab', 'navigateTab', 'reloadTab', 'focusSession', 'setActiveSession', 'updateHostBounds', 'setDeviceEmulation', 'closeSession']),
  agentContexts: new Set(['createRunFromTemplate', 'removeRun', 'lockConfig', 'promoteTemporaryId', 'upsertProjectionContext', 'patchConfigOnly']),
  fileExplorer: new Set(['_getOrCreateWorkspaceState', 'toggleFolder']),
  runFileChanges: new Set(['replaceRunProjection', 'mergeRunProjection', 'upsertFromLivePayload', 'clearRun']),
  runHistory: new Set(['applyRunNavigationTeamFocus', 'focusTeamMemberAndEnsureHydrated', 'selectTreeRun']),
  workspace: new Set(['registerSkillWorkspace', 'acquireFileExplorerLiveSession', 'releaseFileExplorerLiveSession', 'clearFileExplorerLiveSessionForWorkspace', 'connectFileExplorerLiveStream', 'disconnectFileExplorerLiveStream', 'disconnectAllFileExplorerLiveStreams', 'refreshFileExplorerSnapshot', 'fetchFolderChildren']),
}

type RuntimeSnapshot = { item: { path: string, scenario: string, mobile?: string }, actualPath: string, state: Record<string, any>, bootstrapPending?: boolean }
type PrototypePinia = Pinia & { _s: Map<string, any> }
const snapshots = runtimeFixture.snapshots as Record<string, RuntimeSnapshot>

const clone = <T>(value: T): T => {
  if (value instanceof Map) {
    return new Map(Array.from(value.entries(), ([key, entry]) => [clone(key), clone(entry)])) as T
  }
  if (value instanceof Set) return new Set(Array.from(value, clone)) as T
  if (value instanceof Date) return new Date(value.getTime()) as T
  if (Array.isArray(value)) return value.map(clone) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)])) as T
  }
  return value
}
const referenceStoreState = (storeId: string): Record<string, any> | undefined =>
  Object.values(snapshots).find(snapshot => snapshot.state?.[storeId])?.state?.[storeId]
const canonicalPath = (value: string): string => {
  const url = new URL(value, window.location.origin)
  return `${url.pathname}${url.searchParams.size ? `?${url.searchParams.toString()}` : ''}`
}
const normalizePath = (): string => canonicalPath(`${window.location.pathname}${window.location.search}`)
const defaultRouteAliases: Record<string, string> = {
  '/agents': '/agents?view=list',
  '/agent-teams': '/agent-teams?view=team-list',
  '/memory': '/memory?view=home&tab=agents',
  '/nodes': '/nodes?tab=manage',
}
const scenario = (): string => localStorage.getItem(SCENARIO_KEY) || DEFAULT_SCENARIO
const context = (): string => localStorage.getItem(CONTEXT_KEY) || (window.location.pathname === '/mobile' ? 'unpaired' : DEFAULT_CONTEXT)

const findSnapshot = (): [string, RuntimeSnapshot] => {
  const path = normalizePath()
  const aliasedPath = defaultRouteAliases[path] || path
  const wantedScenario = scenario()
  const wantedContext = context()
  const entries = Object.entries(snapshots)
  const exactEntry = entries.find(([, value]) =>
    value.item.scenario === wantedScenario
    && (value.item.mobile || 'desktop') === wantedContext
    && canonicalPath(value.item.path) === aliasedPath)
  if (exactEntry) return exactEntry
  const scenarioRedirectEntry = entries.find(([, value]) =>
    value.item.scenario === wantedScenario
    && (value.item.mobile || 'desktop') === wantedContext
    && canonicalPath(value.actualPath) === path)
  if (scenarioRedirectEntry) return scenarioRedirectEntry
  const populatedEntry = entries.find(([, value]) =>
    value.item.scenario === DEFAULT_SCENARIO
    && (value.item.mobile || 'desktop') === wantedContext
    && canonicalPath(value.item.path) === aliasedPath)
  if (populatedEntry) return populatedEntry
  const desktopEntry = entries.find(([, value]) =>
    value.item.scenario === DEFAULT_SCENARIO
    && canonicalPath(value.item.path) === aliasedPath)
  if (desktopEntry) return desktopEntry
  return ['populated|desktop|/', snapshots['populated|desktop|/']]
}

const actionResult = (store: any, action: string, args: any[] = [], pinia?: PrototypePinia): any => {
  if (action.startsWith('is')) return false
  if (action.startsWith('get')) return undefined
  if (action.startsWith('fetchAllAgentDefinitions')) return store.allAgentDefinitions || store.agentDefinitions || []
  if (action.startsWith('fetchAllAgentTeamDefinitions')) return store.allAgentTeamDefinitions || store.agentTeamDefinitions || []
  if (action === 'fetchApplications') return store.applications || []
  if (action === 'fetchApplicationById') return store.currentApplication
  if (action === 'fetchProvidersWithModels') {
    if (!(store.providersWithModels || []).length) {
      const reference = referenceStoreState('llmProviderConfig')
      if (reference) store.$patch(clone(reference))
    }
    return store.providersWithModels || []
  }
  if (action === 'fetchRuntimeAvailabilities') return store.availabilities || []
  if (store.$id === 'workspace' && action === 'ensureWorkspaceMetadata') {
    const workspaceId = args[0]?.workspaceId || args[0]?.id
    return workspaceId ? store.workspaces?.[workspaceId] : undefined
  }
  if (store.$id === 'workspace' && action === 'acquireFileExplorerLiveSession') return () => {}
  if (store.$id === 'fileExplorer' && action === 'fetchFolderChildren') {
    const workspaceId = String(args[0] || 'workspace-prototype')
    const folderPath = String(args[1] || '').replace(/^\/+|\/+$/g, '')
    const fileState = store._getOrCreateWorkspaceState(workspaceId)
    const TreeNode = fileState.tree?.constructor
    const makeNode = (name: string, path: string, isFile: boolean, children: any[], id: string): any => TreeNode
      ? new TreeNode(name, path, isFile, children, id, true)
      : { id, name, path, is_file: isFile, childrenLoaded: true, children }
    const evidence = makeNode('evidence.md', 'docs/evidence.md', true, [], 'node-evidence')
    const docs = makeNode('docs', 'docs', false, [evidence], 'node-docs')
    const requirements = makeNode('requirements.md', 'requirements.md', true, [], 'node-requirements')
    if (folderPath === 'docs') {
      const currentDocs = fileState.nodeIdToNode?.['node-docs'] || docs
      currentDocs.children = [evidence]
      currentDocs.childrenLoaded = true
      fileState.nodeIdToNode = { ...fileState.nodeIdToNode, 'node-docs': currentDocs, 'node-evidence': evidence }
      return undefined
    }
    const root = makeNode(workspaceId.startsWith('skill_ws_') ? workspaceId.slice('skill_ws_'.length) : 'Prototype Workspace', '', false, [docs, requirements], 'root')
    fileState.tree = root
    fileState.nodeIdToNode = { root, 'node-docs': docs, 'node-evidence': evidence, 'node-requirements': requirements }
    return undefined
  }
  if (store.$id === 'tokenUsageMeter' && /^fetch(?:AgentRun|TeamRun|TeamMember)Summary$/.test(action)) {
    throw new Error('Synthetic token-summary hydration is unavailable for this controlled run.')
  }
  if (store.$id === 'agentTeamRun' && action === 'launchDraft') {
    const draft = args[0]
    const applied = applyExperienceScenario({ scenario: 'workspace_team_launch', context: context() })
    if (!applied.applied || applied.kind !== 'team') {
      throw new Error(`Synthetic Team launch projection failed: ${applied.reason || 'unknown reason'}`)
    }
    const drafts = pinia?._s.get('teamRunConfig')
    const teams = pinia?._s.get('agentTeamContexts')
    const launchedContext = teams?.getTeamContextById?.(applied.runId)
    if (!draft?.draftId || !drafts || !launchedContext) {
      throw new Error('Synthetic Team launch could not resolve its exact draft and context.')
    }
    drafts.removeDraft(draft.draftId)
    return {
      rootTeamRunId: applied.runId,
      agentRunId: launchedContext.view.getFocusedAgentRunId(),
      context: launchedContext,
    }
  }
  if (action === 'fetchAllSkills') return store.skills || []
  if (action === 'fetchSkill') {
    const selected = (store.skills || []).find((skill: { name?: string }) => skill.name === args[0]) || null
    store.currentSkill = selected
    return selected
  }
  if (action === 'fetchSkillFileTree') {
    store.currentSkillTree = JSON.stringify([
      { name: 'SKILL.md', path: 'SKILL.md', isDirectory: false },
      { name: 'references', path: 'references', isDirectory: true, children: [{ name: 'fixture.md', path: 'references/fixture.md', isDirectory: false }] },
    ])
    return undefined
  }
  if (action === 'readFileContent') return '# Prototype Research\n\nUse only deterministic fixture evidence.'
  if (action === 'createAgentDefinition') {
    const input = args[0] || {}
    const template = clone((store.agentDefinitions || [])[0] || {})
    const created = {
      ...template,
      ...clone(input),
      __typename: 'AgentDefinition',
      id: input.id || 'agent-created-fixture',
      avatarUrl: input.avatarUrl || null,
      skillNames: input.skillNames || [],
      toolNames: input.toolNames || [],
      inputProcessorNames: input.inputProcessorNames || [],
      llmResponseProcessorNames: input.llmResponseProcessorNames || [],
      toolExecutionResultProcessorNames: input.toolExecutionResultProcessorNames || [],
      toolInvocationPreprocessorNames: input.toolInvocationPreprocessorNames || [],
      lifecycleProcessorNames: input.lifecycleProcessorNames || [],
      defaultLaunchConfig: input.defaultLaunchConfig || null,
    }
    store.agentDefinitions = [created, ...(store.agentDefinitions || [])]
    return created
  }
  if (action === 'updateAgentDefinition') {
    const input = clone(args[0] || {})
    const existing = (store.agentDefinitions || []).find((item: { id?: string }) => item.id === input.id)
    if (!existing) return null
    const updated = { ...existing, ...input }
    store.agentDefinitions = (store.agentDefinitions || []).map((item: { id?: string }) => item.id === input.id ? updated : item)
    return updated
  }
  if (action === 'deleteAgentDefinition') {
    const id = String(args[0] || '')
    store.agentDefinitions = (store.agentDefinitions || []).filter((item: { id?: string }) => item.id !== id)
    const result = { success: true, message: 'Synthetic operation completed.' }
    store.deleteResult = result
    return result
  }
  if (action === 'createAgentTeamDefinition') {
    const input = clone(args[0] || {})
    const template = clone((store.agentTeamDefinitions || [])[0] || {})
    const created = { ...template, ...input, __typename: 'AgentTeamDefinition', id: input.id || 'team-created-fixture' }
    store.agentTeamDefinitions = [created, ...(store.agentTeamDefinitions || [])]
    return created
  }
  if (action === 'updateAgentTeamDefinition') {
    const input = clone(args[0] || {})
    const existing = (store.agentTeamDefinitions || []).find((item: { id?: string }) => item.id === input.id)
    if (!existing) return null
    const updated = { ...existing, ...input }
    store.agentTeamDefinitions = (store.agentTeamDefinitions || []).map((item: { id?: string }) => item.id === input.id ? updated : item)
    return updated
  }
  if (action === 'deleteAgentTeamDefinition') {
    const id = String(args[0] || '')
    store.agentTeamDefinitions = (store.agentTeamDefinitions || []).filter((item: { id?: string }) => item.id !== id)
    return true
  }
  if (store.$id === 'toolManagement' && action === 'configureMcpServer') {
    const input = clone(args[0] || {})
    const savedConfig = { __typename: 'StdioMcpServerConfig', serverId: input.serverId || 'prototype-files', transportType: input.transportType || 'STDIO', enabled: input.enabled ?? true, command: input.command || 'mock-adapter', args: input.args || [], env: input.env || {}, cwd: input.cwd || '/synthetic', ...input }
    store.mcpServers = [savedConfig, ...(store.mcpServers || []).filter((item: { serverId?: string }) => item.serverId !== savedConfig.serverId)]
    return { savedConfig }
  }
  if (store.$id === 'toolManagement' && action === 'deleteMcpServer') {
    const id = String(args[0] || '')
    store.mcpServers = (store.mcpServers || []).filter((item: { serverId?: string }) => item.serverId !== id)
    return { success: true, message: 'Synthetic operation completed.' }
  }
  if (store.$id === 'toolManagement' && action === 'importMcpServerConfigs') {
    return { success: true, message: 'Synthetic operation completed.', imported_count: 1, importedCount: 1, failed_count: 0, failedCount: 0 }
  }
  if (action === 'saveProviderApiKey') return true
  if (/^(?:enable|disable|update|refresh|save|create|delete|remove|reload|check|import|install)/i.test(action)) {
    return { success: true, message: 'Synthetic operation completed.' }
  }
  return undefined
}

export default defineNuxtPlugin({
  name: 'prototype-state',
  setup(nuxtApp) {
    installHostScenario({ context: context(), scenario: scenario() })
    // The retained source editor defaults to jsDelivr. Ordinary prototype
    // review must remain network-independent, so use the checked-in mirror.
    monacoLoader.config({ paths: { vs: '/prototype-assets/monaco/vs' } })
    for (const collection of Object.values(iconCollections)) {
      addCollection(collection as any)
    }
    // The source resolves the Applications capability after the shell measures
    // its navigation section, yielding the stable 240px initial split.
    if (!localStorage.getItem('autobyteus.app-left-panel.primary-nav-height')) {
      localStorage.setItem('autobyteus.app-left-panel.primary-nav-height', window.location.pathname.startsWith('/applications') && scenario() !== 'apps_disabled' ? '260' : '240')
    }
    const pinia = nuxtApp.$pinia as PrototypePinia
    const router = nuxtApp.$router as Router
    // UI mutations remain local to the current browser context. Overlays keep
    // their visible result across client-side navigation without introducing
    // persistence, a backend, or cross-reviewer mutable state.
    const stateOverlays = new Map<string, Record<string, any>>()
    const hostOwnedStores = new Set(['server', 'nodeStore', 'windowNodeContext', 'appUpdate', 'extensions', 'voiceInput', 'browserShell'])
    const richExperienceOwnedStores = new Set(['agentContexts', 'agentTeamContexts', 'agentTodo', 'agentActivity', 'fileExplorer', 'runFileChanges'])
    const patchStore = (store: any): void => {
      const [, selected] = findSnapshot()
      const state = selected?.state?.[store.$id]
      const isRichExperience = scenario().startsWith('workspace_') || scenario().startsWith('mobile_')
      if (state
        && !(context().startsWith('electron_') && hostOwnedStores.has(store.$id))
        && !(isRichExperience && richExperienceOwnedStores.has(store.$id))) {
        store.$patch(clone(state))
        if (state.error && typeof state.error === 'object' && typeof state.error.message === 'string' && 'error' in store) {
          const restoreError = (): void => { store.error = new Error(state.error.message) }
          restoreError()
          // Option-store initialization may apply its initial state once after
          // plugins run. Restore the non-enumerable Error.message after that
          // deterministic initialization pass as well.
          queueMicrotask(restoreError)
        }
      }
      if (store.$id === 'workspace') {
        for (const key of ['fileSystemConnections', 'fileExplorerLiveConsumers', 'fileExplorerSnapshotRefreshes', 'workspaceMetadataRegistrationTasks']) {
          if (!(store[key] instanceof Map)) store[key] = new Map()
        }
      }
      if (store.$id === 'fileExplorer' && !(store.fileExplorerStateByWorkspace instanceof Map)) {
        store.fileExplorerStateByWorkspace = new Map()
      }
      if (store.$id === 'teamRunConfig') {
        if (!(store.drafts instanceof Map)) store.drafts = new Map()
        if (!(store.inFlightDrafts instanceof Map)) store.inFlightDrafts = new Map()
      }
      if (store.$id === 'agentTeamContexts' && !(store.teams instanceof Map)) {
        store.teams = new Map()
      }
      if (scenario() === 'team_launch' && store.$id === 'runHistory') {
        store.workspaceGroups = []
        store.navigationProjection = {
          workspaceNodes: [{
            workspaceId: 'workspace-prototype', workspaceRootPath: '/synthetic/prototype-workspace',
            workspaceName: 'Prototype Workspace', workspaceKind: 'filesystem', canRemoveFromWorkspaces: true, agents: [],
          }],
          teamNodes: [], teamNodesByWorkspaceRoot: {}, runIndexById: {}, teamIndexById: {}, memberIndexByIdentity: {},
          runAncestryById: {}, teamAncestryById: {}, memberAncestorExecutionKeysByIdentity: {},
        }
      }
      const overlay = stateOverlays.get(store.$id)
      if (overlay) store.$patch(clone(overlay))
    }

    pinia.use(({ store, options }: PiniaPluginContext) => {
      patchStore(store)
      const safe = localActions[store.$id] || new Set<string>()
      if (navigationOverlayStores.has(store.$id)) {
        store.$onAction(({ name, after }) => {
          if (safe.has(name)) after(() => stateOverlays.set(store.$id, clone(store.$state)))
        })
      }
      for (const actionName of Object.keys(options.actions || {})) {
        const pureReadAction = /^(get|is|has|format|build|resolve|find|bindingsForScope|providerStepOrder|stepStatesForProvider|selectedStepForProvider)/.test(actionName)
        if (safe.has(actionName) || pureReadAction) continue
        store[actionName] = async (...args: any[]) => {
          if (scenario() === 'loading' && (actionName === 'fetchAllWorkspaces' || actionName === 'fetchAllAgentDefinitions')) {
            await new Promise(resolve => window.setTimeout(resolve, 1500))
          }
          // The controlled paired-mobile source reports its synthetic recent
          // history refresh as failed while retaining cached recent items. The
          // switcher therefore shows the exact visible `!` segment indicator.
          if (context() === 'paired' && store.$id === 'runHistory' && actionName === 'fetchTree') {
            throw new Error('Synthetic mobile recent-history refresh failed')
          }
          const result = actionResult(store, actionName, args, pinia)
          if ((store.$id === 'agentDefinition' || store.$id === 'agentTeamDefinition' || store.$id === 'toolManagement') && result) {
            stateOverlays.set(store.$id, clone(store.$state))
          }
          return result
        }
      }
    })

    const applyCurrentSnapshot = (): void => {
      const [key] = findSnapshot()
      for (const store of pinia._s.values()) patchStore(store)
      document.documentElement.dataset.prototypeSnapshot = key
      if (localStorage.getItem('autobyteus.prototype.deferExperienceScenario') !== '1') {
        queueMicrotask(() => applyExperienceScenario({ scenario: scenario(), context: context() }))
      }
    }

    nuxtApp.hook('page:finish', applyCurrentSnapshot)
    router.afterEach(() => queueMicrotask(applyCurrentSnapshot))

    const nativeFetch = window.fetch.bind(window)
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const resolved = new URL(url, window.location.href)
      if (resolved.pathname.includes('/content') || resolved.pathname.includes('/file-change-content')) {
        return Promise.resolve(new Response('# Synthetic file\n\nFixture content only.', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }))
      }
      if (/\/applications\/[^/]+\/(execution-resource-configurations|available-execution-resources)$/.test(resolved.pathname)) {
        return Promise.resolve(new Response(JSON.stringify({ detail: 'views.map is not a function' }), { status: 400, headers: { 'content-type': 'application/json' } }))
      }
      if (resolved.origin !== window.location.origin || /^\/(graphql|rest)(\/|$)/.test(resolved.pathname)) {
        return Promise.reject(new Error(`Prototype boundary blocked external request: ${resolved.href}`))
      }
      return nativeFetch(input, init)
    }) as typeof window.fetch

    class PrototypeWebSocket extends EventTarget {
      static readonly CONNECTING = 0; static readonly OPEN = 1; static readonly CLOSING = 2; static readonly CLOSED = 3
      readonly CONNECTING = 0; readonly OPEN = 1; readonly CLOSING = 2; readonly CLOSED = 3
      readonly url: string; readonly protocol = ''; readonly extensions = ''; readonly bufferedAmount = 0; readonly binaryType = 'blob'
      readyState = PrototypeWebSocket.OPEN
      onopen: ((event: Event) => any) | null = null; onclose: ((event: CloseEvent) => any) | null = null; onerror: ((event: Event) => any) | null = null; onmessage: ((event: MessageEvent) => any) | null = null
      constructor(url: string | URL) { super(); this.url = String(url); queueMicrotask(() => this.onopen?.(new Event('open'))) }
      send(_data: string | ArrayBufferLike | Blob | ArrayBufferView): void {}
      close(): void { this.readyState = PrototypeWebSocket.CLOSED; this.onclose?.(new CloseEvent('close', { code: 1000, reason: 'prototype' })) }
    }
    window.WebSocket = PrototypeWebSocket as unknown as typeof WebSocket

    window.__AUTOBYTEUS_PROTOTYPE__ = {
      sourceCommit: runtimeFixture.sourceCommit,
      get scenario() { return scenario() },
      get context() { return context() },
      setScenario(value: string, nextContext = context()) {
        localStorage.setItem(SCENARIO_KEY, value)
        localStorage.setItem(CONTEXT_KEY, nextContext)
        applyCurrentSnapshot()
      },
      applyExperienceScenario(options: { scenario?: string, context?: string, tab?: string } = {}) {
        return applyExperienceScenario({ scenario: options.scenario || scenario(), context: options.context || context(), tab: options.tab })
      },
      reset() {
        localStorage.setItem(SCENARIO_KEY, DEFAULT_SCENARIO)
        localStorage.setItem(CONTEXT_KEY, DEFAULT_CONTEXT)
        applyCurrentSnapshot()
      },
    }
  },
})

declare global {
  interface Window {
    __AUTOBYTEUS_PROTOTYPE__: {
      sourceCommit: string
      readonly scenario: string
      readonly context: string
      setScenario(value: string, context?: string): void
      applyExperienceScenario(options?: { scenario?: string, context?: string, tab?: string }): unknown
      reset(): void
    }
  }
}
