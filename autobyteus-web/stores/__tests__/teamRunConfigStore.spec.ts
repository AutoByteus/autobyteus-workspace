import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import type { AgentTeamDefinition } from '../agentTeamDefinitionStore'

const mockTeamDef: AgentTeamDefinition = {
  id: 'team-def-1',
  name: 'Research Team',
  description: 'Test Team',
  instructions: 'Coordinate the research workflow.',
  coordinatorMemberName: 'coord',
  nodes: [],
  defaultLaunchConfig: {
    runtimeKind: 'codex_app_server',
    llmModelIdentifier: 'gpt-5.4',
    llmConfig: {
      reasoning_effort: 'high',
    },
  },
} as AgentTeamDefinition

describe('teamRunConfigStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('setTemplate', () => {
    it('sets team config from definition defaults', () => {
      const store = useTeamRunConfigStore()
      store.setTemplate(mockTeamDef)

      expect(store.config?.teamDefinitionId).toBe('team-def-1')
      expect(store.config?.teamDefinitionName).toBe('Research Team')
      expect(store.config?.runtimeKind).toBe('codex_app_server')
      expect(store.config?.llmModelIdentifier).toBe('gpt-5.4')
      expect(store.config?.llmConfig).toEqual({ reasoning_effort: 'high' })
      expect(store.config?.workspaceId).toBeNull()
      expect(store.config?.autoExecuteTools).toBe(false)
      expect(store.config?.memberOverrides).toEqual({})
      expect(store.config?.isLocked).toBe(false)
    })
  })

  describe('updateConfig', () => {
    it('updates config fields', () => {
      const store = useTeamRunConfigStore()
      store.setTemplate(mockTeamDef)

      store.updateConfig({
        llmModelIdentifier: 'gpt-5.3-codex',
        autoExecuteTools: true,
      })

      expect(store.config?.llmModelIdentifier).toBe('gpt-5.3-codex')
      expect(store.config?.autoExecuteTools).toBe(true)
    })
  })

  describe('hasConfig getter', () => {
    it('returns false initially', () => {
      const store = useTeamRunConfigStore()
      expect(store.hasConfig).toBe(false)
    })

    it('returns true after setting template', () => {
      const store = useTeamRunConfigStore()
      store.setTemplate(mockTeamDef)
      expect(store.hasConfig).toBe(true)
    })
  })

  describe('launchReadiness getter', () => {
    it('blocks launch when workspace is missing', () => {
      const store = useTeamRunConfigStore()
      store.setTemplate(mockTeamDef)
      store.setRuntimeModelCatalog('codex_app_server', ['gpt-5.4'])

      expect(store.launchReadiness.canLaunch).toBe(false)
      expect(store.launchReadiness.blockingIssues[0]?.code).toBe('WORKSPACE_REQUIRED')
    })

    it('blocks launch when a member runtime override breaks inherited default model availability', () => {
      const store = useTeamRunConfigStore()
      store.setTemplate(mockTeamDef)
      store.updateConfig({
        workspaceId: 'ws-1',
        memberOverrides: {
          Reviewer: {
            agentDefinitionId: 'agent-reviewer',
            runtimeKind: 'claude_agent_sdk',
          },
        },
      } as any)
      store.setRuntimeModelCatalog('codex_app_server', ['gpt-5.4'])
      store.setRuntimeModelCatalog('claude_agent_sdk', ['claude-sonnet'])

      expect(store.launchReadiness.canLaunch).toBe(false)
      expect(store.launchReadiness.unresolvedMembers).toEqual([
        expect.objectContaining({ memberName: 'Reviewer', runtimeKind: 'claude_agent_sdk' }),
      ])
      expect(store.launchReadiness.blockingIssues[0]?.message).toContain(
        'Global model gpt-5.4 is unavailable for Claude Agent SDK',
      )
    })

    it('allows launch once the mixed-runtime row has a compatible explicit model', () => {
      const store = useTeamRunConfigStore()
      store.setTemplate(mockTeamDef)
      store.updateConfig({
        workspaceId: 'ws-1',
        memberOverrides: {
          Reviewer: {
            agentDefinitionId: 'agent-reviewer',
            runtimeKind: 'claude_agent_sdk',
            llmModelIdentifier: 'claude-sonnet',
          },
        },
      } as any)
      store.setRuntimeModelCatalog('codex_app_server', ['gpt-5.4'])
      store.setRuntimeModelCatalog('claude_agent_sdk', ['claude-sonnet'])

      expect(store.launchReadiness.canLaunch).toBe(true)
      expect(store.launchReadiness.blockingIssues).toEqual([])
    })
  })

  describe('clearConfig', () => {
    it('resets all state', () => {
      const store = useTeamRunConfigStore()
      store.setTemplate(mockTeamDef)
      store.updateConfig({ llmModelIdentifier: 'gpt-4' })

      store.clearConfig()

      expect(store.config).toBeNull()
    })
  })
})
