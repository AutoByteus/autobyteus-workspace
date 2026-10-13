<template>
  <WorkspaceToolShell class="h-full"><TeamWorkspaceView /></WorkspaceToolShell>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import WorkspaceToolShell from '~/components/layout/WorkspaceToolShell.vue';
import TeamWorkspaceView from '~/components/workspace/team/TeamWorkspaceView.vue';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useRightPanel } from '~/composables/useRightPanel';
import { useLeftPanel } from '~/composables/useLeftPanel';
import { useRightSideTabs } from '~/composables/useRightSideTabs';
import { useResponsiveWorkspaceShellState } from '~/composables/layout/useResponsiveWorkspaceShell';
const context = buildTestTeamContext({isActive:false,teamRunId:'layout-preview-team', teamDefinitionId:'preview-definition', teamDefinitionName:'Layout Preview Team', coordinatorAddress:'/Engineer', focusedAgentRunId:'layout-preview-agent', workspaceRootPath:'/layout-preview', rootChildren:[testAgentNode('/Engineer',{agentRunId:'layout-preview-agent'})]});
const workspace = useWorkspaceStore();
workspace.workspaces['test-workspace'] = {workspaceId:'test-workspace', name:'Layout Preview Workspace',absolutePath:'/layout-preview',workspaceRootPath:'/layout-preview',workspaceConfig:{},kind:'filesystem'};
workspace.workspacesFetched = true;
useAgentTeamContextsStore().addTeamContext(context);
const otherContext = buildTestTeamContext({isActive:false,teamRunId:'layout-preview-team-2', teamDefinitionId:'preview-definition-2', teamDefinitionName:'Second Preview Team', coordinatorAddress:'/Reviewer', focusedAgentRunId:'layout-preview-agent-2', workspaceRootPath:'/second-layout-preview',configuration:{workspaceId:'preview-workspace-2'},rootChildren:[testAgentNode('/Reviewer',{agentRunId:'layout-preview-agent-2'})]});
workspace.workspaces['preview-workspace-2'] = {workspaceId:'preview-workspace-2',name:'Second Layout Preview Workspace',absolutePath:'/second-layout-preview',workspaceRootPath:'/second-layout-preview',workspaceConfig:{},kind:'filesystem'};
useAgentTeamContextsStore().addTeamContext(otherContext);
const selection = useAgentSelectionStore();
selection.setRunSelection('layout-preview-team','team');
const right = useRightPanel(); const left = useLeftPanel(); const tabs = useRightSideTabs();
const shell = useResponsiveWorkspaceShellState();
onMounted(() => {(window as any).__layoutPreview = {state:()=>({shell:shell.value,rawRight:right.preferredRightPanelWidth.value,measuredRight:right.rightPanelWidth.value,intent:right.rightPanelResizeIntent.value,leftWidth:left.leftPanelWidth.value,selection:selection.subject,focus:useAgentTeamContextsStore().activeTeamContext?.view.getFocusedAgentRunId(),tab:tabs.activeTab.value}), reset:()=>{left.setLeftPanelVisible(true);left.leftPanelWidth.value=320;right.setRightPanelVisible(true);right.preferredRightPanelWidth.value=450;right.rightPanelResizeIntent.value='automatic';tabs.selectTabExplicitly('teamMembers');}};});
onBeforeUnmount(()=>{delete (window as any).__layoutPreview;});
</script>
