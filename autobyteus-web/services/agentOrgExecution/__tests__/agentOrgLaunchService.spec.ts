import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  launch: vi.fn(async () => 'org-run-1'),
  refreshItem: vi.fn(async () => undefined),
  resolve: vi.fn(async (choice: any) => ({
    workspaceId: choice.kind === 'existing' ? choice.workspaceId : `ws:${choice.rootPath}`,
    workspaceMetadata: { workspaceRootPath: choice.kind === 'existing' ? `/known/${choice.workspaceId}` : choice.rootPath },
  })),
}))
vi.mock('~/stores/agentOrgRunStore', () => ({ useAgentOrgRunStore: () => ({ launch: mocks.launch }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ refreshAgentOrgHistoryItem: mocks.refreshItem }) }))
vi.mock('~/services/workspace/runWorkspaceChoice', () => ({ resolveRunWorkspaceChoice: mocks.resolve }))

import { agentOrgLaunchService } from '../agentOrgLaunchService'
import { readChatLastModel } from '~/utils/chat/chatLastModelPreference'

const root = {
  workspace: { kind: 'existing' as const, workspaceId: 'temp' },
  runtimeKind: 'codex_app_server',
  llmModelIdentifier: 'gpt-codex',
  llmConfig: { reasoning_effort: 'medium', service_tier: 'fast' },
  autoExecuteTools: true,
}

describe('agentOrgLaunchService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('launches with the Org card as root, each placement sparse, no recipient, and publishes the run', async () => {
    const orgRunId = await agentOrgLaunchService.launch({
      orgDefinitionId: 'org-1',
      root,
      teamOverrides: { '/product': { autoExecuteTools: false } },
      teamWorkspaces: { '/product': { kind: 'folder', rootPath: '/work/product' } },
      agentOverrides: { '/analyst': { llmConfig: { reasoning_effort: 'high' } }, '/product/lead': { runtimeKind: 'autobyteus', llmModelIdentifier: 'gpt-5.5', llmConfig: null } },
    })

    expect(orgRunId).toBe('org-run-1')
    expect(mocks.launch).toHaveBeenCalledWith({
      agentOrgDefinitionId: 'org-1',
      rootConfiguration: {
        runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-codex',
        llmConfig: { reasoning_effort: 'medium', service_tier: 'fast' }, autoExecuteTools: true,
        workspaceRootPath: '/known/temp',
      },
      teamOverrides: [{ address: '/product', configuration: { autoExecuteTools: false, workspaceRootPath: '/work/product' } }],
      agentOverrides: [
        { address: '/analyst', configuration: { llmConfig: { reasoning_effort: 'high' } } },
        { address: '/product/lead', configuration: { runtimeKind: 'autobyteus', llmModelIdentifier: 'gpt-5.5', llmConfig: null } },
      ],
    })
    expect(mocks.refreshItem).toHaveBeenCalledWith('org-run-1')
    expect(readChatLastModel()).toEqual({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-codex' })
  })

  it('creates each folder workspace once, even when several teams share it', async () => {
    await agentOrgLaunchService.launch({
      orgDefinitionId: 'org-1',
      root: { ...root, workspace: { kind: 'folder', rootPath: '/work/shared' } },
      teamOverrides: {},
      teamWorkspaces: { '/a': { kind: 'folder', rootPath: '/work/shared' }, '/b': { kind: 'folder', rootPath: '/work/shared' } },
      agentOverrides: {},
    })
    expect(mocks.resolve).toHaveBeenCalledTimes(1)
  })

  it('always launches Antigravity with auto-approve', async () => {
    await agentOrgLaunchService.launch({
      orgDefinitionId: 'org-1', root: { ...root, runtimeKind: 'antigravity_cli', autoExecuteTools: false },
      teamOverrides: {}, teamWorkspaces: {}, agentOverrides: {},
    })
    expect(mocks.launch.mock.calls[0]![0].rootConfiguration.autoExecuteTools).toBe(true)
  })
})
