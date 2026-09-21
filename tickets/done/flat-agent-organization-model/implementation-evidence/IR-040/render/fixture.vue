<template>
  <main class="flex h-screen flex-col bg-slate-50 text-slate-900">
    <header class="flex shrink-0 flex-wrap items-center gap-3 border-b p-3 text-sm">
      <strong>Compact collaboration · implementation render</strong>
      <button data-test="standalone" @click="standalone = !standalone; panelOnly = standalone">Standalone Team</button>
      <button data-test="locale" @click="localizationRuntime.setPreference(locale === 'en' ? 'zh-CN' : 'en')">EN / 中文</button>
      <button data-test="director" @click="select('agent-director')">Director</button>
      <button data-test="task-agent" @click="select('agent-worker-task')">Task Agent</button>
      <button data-test="mounted" @click="select('agent-lead-configured')">Mounted Agent</button>
      <button data-test="task-team" @click="select('agent-task-lead')">Task Team</button>
      <button data-test="settle" @click="settle">Accept &amp; settle</button>
      <button data-test="narrow-panel" @click="panelOnly = !panelOnly">Conversation / collaboration</button>
    </header>
    <div v-if="target" class="flex min-h-0 flex-1">
      <div v-show="!panelOnly" class="hidden w-64 shrink-0 overflow-y-auto border-r bg-white p-2 lg:block" data-test="render-history">
        <div class="px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-400">Teams</div>
        <WorkspaceAgentOrgHistoryCollection workspace-id="render-workspace" :groups="groups" :state="historyState" :actions="{}" />
      </div>
      <div v-show="!panelOnly" class="min-w-0 flex-1">
        <TeamWorkspaceSurface v-if="'team' in target" :target="target" />
        <AgentWorkspaceSurface v-else :target="target" />
      </div>
      <aside class="min-h-0 shrink-0 border-l bg-white" :class="panelOnly ? 'w-full' : 'hidden w-[540px] lg:block'">
        <CollaborationOverviewPanel :key="standalone ? 'team' : 'org'" :messages="standalone ? teamMessages : target.collaborationMessages" :tasks="standalone ? teamTasks : target.collaborationTasks" />
      </aside>
    </div>
  </main>
</template>
<script setup lang="ts">
import { computed, ref, shallowReactive } from 'vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import WorkspaceAgentOrgHistoryCollection from '~/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue'
const locale = localizationRuntime.resolvedLocale
import AgentWorkspaceSurface from '~/components/workspace/agent/AgentWorkspaceSurface.vue'
import TeamWorkspaceSurface from '~/components/workspace/team/TeamWorkspaceSurface.vue'
import CollaborationOverviewPanel from '~/components/workspace/collaboration/CollaborationOverviewPanel.vue'
import { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext'
import { AgentOrgExecutionViewIndex } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { buildTestTeamContext, testAgentNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures'
import { testCollaborationTasksContextView, testCollaborationMessagesContextView } from '~/test-support/teamWorkspaceContextView'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
definePageMeta({ layout: false })
const view = taskBearingView()
const mounted = view.execution_tree.rootOrg.members[2] as any
mounted.taskExecutions.push({...view.execution_tree.rootOrg.taskExecutions[0],address:'/team/worker',agentRunId:'mounted-task-worker'})
view.task_records.records.push({...view.task_records.records[0],taskId:'mounted-task',delegatorAgentRunId:'agent-lead-configured',recipientAddress:'/team/worker',taskExecution:{agentRunId:'mounted-task-worker'},description:'Verify the mounted Team deliverable.'})
view.task_records.records[0].description = 'Verify the release notes and share the retained report.'
view.task_records.records[1].description = 'Review the implementation and return a concise result.'
const taskTeam = view.execution_tree.rootOrg.taskExecutions[1] as any
taskTeam.settledAt = '2026-09-01T00:05:00.000Z'
view.task_records.records[1] = { ...view.task_records.records[1], status:'accepted', updates:[
 {submissionId:'team-result',message:'All requested changes are verified. See the retained report.',referenceFiles:['/tmp/report.md'],createdAt:'2026-09-01T00:03:00.000Z'},
 {reviewId:'team-review',reviewedSubmissionId:'team-result',decision:'accept',comment:'Accepted. Thank you.',referenceFiles:[],createdAt:'2026-09-01T00:04:00.000Z'}
] }
view.communication_messages.messages = [{ messageId:'message-render', senderAgentRunId:'agent-task-lead',receiverAgentRunId:'agent-director', content:'The task Team has completed the review. The exact report is retained.',messageType:'agent_message',referenceFiles:['/tmp/report.md'],createdAt:'2026-09-01T00:02:00.000Z' }]
const contexts = [...new AgentOrgExecutionViewIndex(view).agents.values()].map((agent) => ({ agentRunId: agent.agentRunId, memberAddress:agent.address,
  context:new AgentContext({ agentDefinitionId:agent.source.agentDefinitionId,agentDefinitionName:agent.address.split('/').at(-1),
    llmModelIdentifier:'gpt-5.6-sol',runtimeKind:'codex_app_server',workspaceId:null,autoExecuteTools:false,skillAccessMode:'PRELOADED_ONLY',isLocked:true },
    new AgentRunState(agent.agentRunId,{id:agent.agentRunId,messages:[],createdAt:view.execution_tree.createdAt,updatedAt:view.execution_tree.createdAt})),
}))
const org = shallowReactive(new AgentOrgExecutionContext({orgRunId:'org-run',view,entries:contexts,transport:{interactionFor:()=>({send:async()=>{throw new Error('Render fixture does not send')},interrupt:async()=>{},decideTool:async()=>{}})}}))
for (const entry of contexts) entry.context.state.currentStatus = org.index.requireAgent(entry.agentRunId).live ? AgentStatus.Idle : AgentStatus.Offline
useAgentOrgContextsStore().contexts['org-run'] = org
const history=useRunHistoryStore()
history.agentOrgHistory=[{rootSubjectKind:'agent_org',rootRunId:'org-run',isActive:true,executionTree:view.execution_tree,createdAt:view.execution_tree.createdAt} as any]
const groups = [{stableKey:'org-definition',definitionId:'org-definition',name:'Review organization',runs:[{
 stableKey:'org-run',rootSubjectKind:'agent_org',rootRunId:'org-run',summary:'Review the current release',isActive:true,
 createdAt:view.execution_tree.createdAt,executionTree:view.execution_tree}]}]
const historyState = {isAgentOrgDefinitionExpanded:()=>true,isAgentOrgRunExpanded:()=>true,isAgentOrgTeamExpanded:()=>true,
 isAgentOrgMemberSelected:(_root:string,_address:string,id:string)=>Boolean(id && org.index.selectedAgent(org.selection)?.agentRunId===id),agentOrgContextFor:()=>org}
const team = buildTestTeamContext({ teamRunId:'standalone-team', rootChildren:[testAgentNode('/lead',{agentRunId:'standalone-lead'}),testAgentNode('/worker',{agentRunId:'standalone-worker'})], coordinatorAddress:'/lead',tasks:[testTaskRecord({
 taskId:'team-task',delegatorAgentRunId:'standalone-lead',recipientAddress:'/worker',target:{agentRunId:'standalone-task-worker'},description:'Verify the Team release report.'
})],messages:[{message_id:'standalone-message',sender_agent_run_id:'standalone-task-worker',receiver_agent_run_id:'standalone-lead',content:'The Team report is ready for review.',message_type:'agent_message',reference_files:[],created_at:'2026-09-01T00:01:00.000Z'}]})
const teamMessages = testCollaborationMessagesContextView(team,'standalone-lead')
const teamTasks = testCollaborationTasksContextView(team,'standalone-lead')
const standalone=ref(false)
const panelOnly=ref(false)
const target=computed(()=>org.activeTarget()!)
const select=(id:string)=>org.select({kind:'agent_execution',agentRunId:id})
const settle=()=>{
 const task=org.view.task_records.records.find(t=>'agentRunId' in t.taskExecution)!
 if(task.status==='accepted')return
 const submitted={...task,status:'awaiting_review',updates:[{submissionId:'s1',message:'Verified: all requested details are retained.',referenceFiles:[],createdAt:'2026-09-01T00:03:00.000Z'}]}
 org.applyEvent(9,{kind:'task',event:{kind:'submitted',task:submitted}} as any)
 const accepted={...submitted,status:'accepted',updates:[...submitted.updates,{reviewId:'r1',reviewedSubmissionId:'s1',decision:'accept',comment:'Accepted',referenceFiles:[],createdAt:'2026-09-01T00:04:00.000Z'}]}
 org.applyEvent(10,{kind:'task',event:{kind:'reviewed',task:accepted}} as any)
 org.applyEvent(11,{kind:'task',event:{kind:'settled',task:accepted,settledAt:'2026-09-01T00:05:00.000Z'}} as any)
}
select('agent-director')
</script>
