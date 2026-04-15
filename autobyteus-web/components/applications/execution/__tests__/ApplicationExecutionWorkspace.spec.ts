import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ApplicationExecutionWorkspace from '../ApplicationExecutionWorkspace.vue'

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string | number>) => ({
      'applications.shared.members': 'Members',
      'applications.shared.pending': 'pending',
      'applications.shared.teamPath': 'Team path',
      'applications.shared.root': 'root',
      'applications.shared.artifacts': 'Artifacts',
      'applications.shared.final': 'Final',
      'applications.shared.draft': 'Draft',
      'applications.components.applications.execution.ApplicationExecutionWorkspace.executionSummary': 'Execution view',
      'applications.components.applications.execution.ApplicationExecutionWorkspace.openFullExecutionMonitor': 'Open full execution monitor',
      'applications.components.applications.execution.ApplicationExecutionWorkspace.retainedArtifactCount': `${params?.count ?? 0} retained artifacts`,
      'applications.components.applications.execution.ApplicationExecutionWorkspace.noRetainedArtifactsSummary': 'No retained artifacts yet.',
      'applications.components.applications.execution.ApplicationExecutionWorkspace.noRetainedMemberArtifactYet': 'No retained member artifact yet.',
      'applications.components.applications.execution.ApplicationExecutionWorkspace.selectMemberHint': 'Select a member to inspect retained artifacts.',
      'applications.components.applications.execution.ApplicationExecutionWorkspace.launchToInspectHint': 'Launch the application to inspect retained member artifacts.',
    } as Record<string, string>)[key] ?? key,
  }),
}))

describe('ApplicationExecutionWorkspace', () => {
  it('renders the selected member artifact-centric execution view with a full-monitor handoff and no run-id metadata', async () => {
    const wrapper = mount(ApplicationExecutionWorkspace, {
      props: {
        selectedMemberRouteKey: 'writer',
        session: {
          applicationSessionId: 'app-session-1',
          application: {
            applicationId: 'app-1',
            localApplicationId: 'brief-studio',
            packageId: 'built-in:applications',
            name: 'Brief Studio',
            description: null,
            iconAssetPath: null,
            entryHtmlAssetPath: '/application-bundles/brief-studio/ui/index.html',
            writable: true,
          },
          runtime: {
            kind: 'AGENT_TEAM',
            runId: 'team-run-1',
            definitionId: 'brief-team',
          },
          view: {
            members: [
              {
                memberRouteKey: 'researcher',
                displayName: 'Researcher',
                teamPath: ['researcher'],
                runtimeTarget: {
                  runId: 'member-run-1',
                  runtimeKind: 'AGENT_TEAM_MEMBER',
                },
                artifactsByKey: {},
                primaryArtifactKey: null,
              },
              {
                memberRouteKey: 'writer',
                displayName: 'Writer',
                teamPath: ['writer'],
                runtimeTarget: {
                  runId: 'member-run-2',
                  runtimeKind: 'AGENT_TEAM_MEMBER',
                },
                artifactsByKey: {
                  'working-brief': {
                    artifactKey: 'working-brief',
                    artifactType: 'final_brief',
                    title: 'Market Entry Brief',
                    summary: 'Ready for review',
                    artifactRef: {
                      kind: 'INLINE_JSON',
                      mimeType: 'application/json',
                      value: { title: 'Market Entry Brief' },
                    },
                    metadata: null,
                    isFinal: true,
                    updatedAt: '2026-04-15T09:00:00.000Z',
                    producer: {
                      memberRouteKey: 'writer',
                      displayName: 'Writer',
                      teamPath: ['writer'],
                      runId: 'member-run-2',
                      runtimeKind: 'AGENT_TEAM_MEMBER',
                    },
                  },
                  'writer-blocker': {
                    artifactKey: 'writer-blocker',
                    artifactType: 'brief_blocker_note',
                    title: 'Blocked',
                    summary: 'Waiting for more inputs',
                    artifactRef: {
                      kind: 'INLINE_JSON',
                      mimeType: 'application/json',
                      value: { blocker: true },
                    },
                    metadata: null,
                    isFinal: false,
                    updatedAt: '2026-04-15T08:30:00.000Z',
                    producer: {
                      memberRouteKey: 'writer',
                      displayName: 'Writer',
                      teamPath: ['writer'],
                      runId: 'member-run-2',
                      runtimeKind: 'AGENT_TEAM_MEMBER',
                    },
                  },
                },
                primaryArtifactKey: 'working-brief',
              },
            ],
          },
          createdAt: '2026-04-15T08:00:00.000Z',
          terminatedAt: null,
        },
      },
      global: {
        stubs: {
          HostArtifactRenderer: {
            props: ['artifact'],
            template: '<div class="artifact-renderer-stub">{{ artifact.title }}</div>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Execution summary')
    expect(wrapper.text()).toContain('Open full execution monitor')
    expect(wrapper.text()).toContain('Writer')
    expect(wrapper.text()).toContain('2 retained artifacts')
    expect(wrapper.text()).toContain('Market Entry Brief')
    expect(wrapper.text()).toContain('Artifacts')
    expect(wrapper.text()).toContain('Final')
    expect(wrapper.text()).not.toContain('member-run-2')
    expect(wrapper.text()).not.toContain('Route')

    await wrapper.get('[data-testid="open-full-execution-monitor"]').trigger('click')
    expect(wrapper.emitted('openFullExecutionMonitor')).toHaveLength(1)
  })
})
