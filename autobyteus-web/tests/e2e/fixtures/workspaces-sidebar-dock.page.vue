<template>
  <WorkspaceToolShell class="h-full"><TeamWorkspaceView /></WorkspaceToolShell>
</template>
<script setup lang="ts">
// Actual default layout, Team center, tools, drag and drawer owners. Only I/O and initial
// conversation data are deterministic; geometry is never substituted or forced by fixture CSS.
import { onMounted, onBeforeUnmount } from 'vue'
import WorkspaceToolShell from '~/components/layout/WorkspaceToolShell.vue'
import TeamWorkspaceView from '~/components/workspace/team/TeamWorkspaceView.vue'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useRightPanel } from '~/composables/useRightPanel'
import { useLeftPanel } from '~/composables/useLeftPanel'
import { useRightSideTabs } from '~/composables/useRightSideTabs'
import { useResponsiveWorkspaceShellState } from '~/composables/layout/useResponsiveWorkspaceShell'
const context = buildTestTeamContext({ isActive: false, teamRunId: 'dock-probe-team',
  teamDefinitionId: 'dock-probe-definition', teamDefinitionName: 'Dock Probe Team',
  coordinatorAddress: '/Engineer', focusedAgentRunId: 'dock-probe-agent', workspaceRootPath: '/dock-probe',
  rootChildren: [testAgentNode('/Engineer', { agentRunId: 'dock-probe-agent' })] })
const workspace = useWorkspaceStore()
workspace.workspaces['test-workspace'] = { workspaceId: 'test-workspace', name: 'Dock Probe Workspace',
  absolutePath: '/dock-probe', workspaceRootPath: '/dock-probe', workspaceConfig: {}, kind: 'filesystem' }
workspace.workspacesFetched = true
useAgentTeamContextsStore().addTeamContext(context)
const selection = useAgentSelectionStore()
selection.setRunSelection('dock-probe-team', 'team')
const right = useRightPanel(), left = useLeftPanel(), tabs = useRightSideTabs()
const shell = useResponsiveWorkspaceShellState()
onMounted(() => {
  (window as any).__sidebarDockProbe = {
    state: () => ({ shell: shell.value, rawRight: right.preferredRightPanelWidth.value,
      measuredRight: right.rightPanelWidth.value, intent: right.rightPanelResizeIntent.value,
      leftWidth: left.leftPanelWidth.value, selection: selection.subject,
      focus: context.view.getFocusedAgentRunId(), tab: tabs.activeTab.value }),
    // Initial setup between independently meaningful cases, never used to implement a tested action.
    reset: () => { left.setLeftPanelVisible(true); left.leftPanelWidth.value = 320
      right.setRightPanelVisible(true); right.preferredRightPanelWidth.value = 450
      right.rightPanelResizeIntent.value = 'automatic'; tabs.selectTabExplicitly('teamMembers') },
  }
})
onBeforeUnmount(() => { delete (window as any).__sidebarDockProbe })
</script>
