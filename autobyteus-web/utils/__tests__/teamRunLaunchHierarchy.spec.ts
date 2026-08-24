import { describe, expect, it } from 'vitest'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import type { TeamDefinitionMemberNode } from '~/utils/teamDefinitionMembers'
import {
  indexTeamLaunchTopology,
  projectTeamRunLaunchRecords,
  reconcileTeamRunConfigTopology,
  resolveTeamRunConfiguration,
} from '~/utils/teamRunLaunchHierarchy'

const workspace = (id: string, path: string) => ({
  workspaceId: id,
  workspaceMetadata: { workspaceId: id, workspaceRootPath: path, displayName: id, kind: 'filesystem' as const },
})

const memberTree: readonly TeamDefinitionMemberNode[] = Object.freeze([
  Object.freeze({ kind: 'agent' as const, address: '/teacher', displayName: 'teacher', agentDefinitionId: 'teacher-def' }),
  Object.freeze({
    kind: 'agent_team' as const,
    address: '/classroom',
    displayName: 'classroom',
    teamDefinitionId: 'classroom-def',
    coordinatorAddress: '/classroom/lead',
    children: Object.freeze([
      Object.freeze({ kind: 'agent' as const, address: '/classroom/lead', displayName: 'lead', agentDefinitionId: 'lead-def' }),
      Object.freeze({
        kind: 'agent_team' as const,
        address: '/classroom/study',
        displayName: 'study',
        teamDefinitionId: 'study-def',
        coordinatorAddress: '/classroom/study/student',
        children: Object.freeze([
          Object.freeze({ kind: 'agent' as const, address: '/classroom/study/student', displayName: 'student', agentDefinitionId: 'student-def' }),
        ]),
      }),
    ]),
  }),
  Object.freeze({
    kind: 'agent_team' as const,
    address: '/sibling',
    displayName: 'sibling',
    teamDefinitionId: 'sibling-def',
    coordinatorAddress: '/sibling/worker',
    children: Object.freeze([
      Object.freeze({ kind: 'agent' as const, address: '/sibling/worker', displayName: 'worker', agentDefinitionId: 'worker-def' }),
    ]),
  }),
])

const config = (): TeamRunConfig => ({
  teamDefinitionId: 'root-def',
  teamDefinitionName: 'Nested Classroom',
  rootConfig: {
    runtimeKind: 'codex_app_server',
    workspace: workspace('root-ws', '/workspace/root'),
    llmModelIdentifier: 'gpt-5.6-luna',
    llmConfig: { reasoning_effort: 'medium' },
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
  },
  teamOverrides: {
    '/classroom': {
      runtimeKind: 'claude_agent_sdk',
      workspace: workspace('classroom-ws', '/workspace/classroom'),
      llmModelIdentifier: 'claude-sonnet',
      llmConfig: null,
      autoExecuteTools: true,
    },
    '/classroom/study': { llmModelIdentifier: 'claude-opus', llmConfig: { temperature: 0.2 } },
  },
  agentOverrides: {
    '/classroom/study/student': { llmModelIdentifier: 'claude-opus-student', llmConfig: null },
  },
  isLocked: false,
})

describe('teamRunLaunchHierarchy', () => {
  it('resolves root -> nearest Team -> exact Agent while root skill access remains inherited', () => {
    const view = resolveTeamRunConfiguration(config(), memberTree)

    expect(view.teamsByAddress['/classroom'].effectiveConfig).toEqual(expect.objectContaining({
      runtimeKind: 'claude_agent_sdk',
      workspaceRootPath: '/workspace/classroom',
      llmModelIdentifier: 'claude-sonnet',
      llmConfig: null,
      autoExecuteTools: true,
      skillAccessMode: 'PRELOADED_ONLY',
    }))
    expect(view.teamsByAddress['/classroom/study'].effectiveConfig).toEqual(expect.objectContaining({
      runtimeKind: 'claude_agent_sdk',
      workspaceRootPath: '/workspace/classroom',
      llmModelIdentifier: 'claude-opus',
      llmConfig: { temperature: 0.2 },
      skillAccessMode: 'PRELOADED_ONLY',
    }))
    expect(view.agentsByAddress['/classroom/study/student'].effectiveConfig).toEqual(expect.objectContaining({
      llmModelIdentifier: 'claude-opus-student',
      llmConfig: null,
      workspaceRootPath: '/workspace/classroom',
      skillAccessMode: 'PRELOADED_ONLY',
    }))
    expect(view.agentsByAddress['/sibling/worker'].effectiveConfig).toEqual(view.root.effectiveConfig)
  })

  it('projects one complete record per Team and Agent in deterministic topology order', () => {
    const records = projectTeamRunLaunchRecords(config(), memberTree)

    expect(records.teamConfigs.map((entry) => entry.teamAddress)).toEqual([
      '/', '/classroom', '/sibling', '/classroom/study',
    ])
    expect(records.memberConfigs.map((entry) => entry.memberAddress)).toEqual([
      '/classroom/lead', '/classroom/study/student', '/sibling/worker', '/teacher',
    ])
    expect(records.teamConfigs.find((entry) => entry.teamAddress === '/classroom/study')).toEqual(expect.objectContaining({
      runtimeKind: 'claude_agent_sdk',
      workspaceRootPath: '/workspace/classroom',
      skillAccessMode: 'PRELOADED_ONLY',
    }))
    expect(records.memberConfigs.find((entry) => entry.memberAddress === '/classroom/study/student')).toEqual(expect.objectContaining({
      agentDefinitionId: 'student-def',
      llmModelIdentifier: 'claude-opus-student',
      llmConfig: null,
    }))
  })

  it('prunes unknown and kind-mismatched intent without retargeting and reports sorted addresses', () => {
    const stale = config()
    stale.teamOverrides['/classroom/lead'] = { llmModelIdentifier: 'wrong-kind' }
    stale.teamOverrides['/removed'] = { llmModelIdentifier: 'removed' }
    stale.agentOverrides['/classroom'] = { llmModelIdentifier: 'wrong-kind' }
    stale.agentOverrides['/z-removed'] = { llmModelIdentifier: 'removed' }

    const result = reconcileTeamRunConfigTopology(stale, memberTree)

    expect(result.repairedAddresses).toEqual([
      '/classroom', '/classroom/lead', '/removed', '/z-removed',
    ])
    expect(result.config.teamOverrides['/classroom']).toEqual(stale.teamOverrides['/classroom'])
    expect(result.config.agentOverrides['/classroom/study/student']).toEqual(stale.agentOverrides['/classroom/study/student'])
    expect(result.config.teamOverrides['/classroom/lead']).toBeUndefined()
    expect(result.config.agentOverrides['/classroom']).toBeUndefined()
  })

  it('rejects duplicate canonical subjects before resolution', () => {
    expect(() => indexTeamLaunchTopology([
      memberTree[0]!,
      { ...memberTree[0]!, agentDefinitionId: 'other' },
    ])).toThrow("Duplicate Team topology address '/teacher'.")
  })
})
