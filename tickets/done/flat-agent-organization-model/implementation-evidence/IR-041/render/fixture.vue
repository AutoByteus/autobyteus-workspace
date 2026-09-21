<template>
  <main class="min-h-screen bg-slate-50 p-4 text-gray-800">
    <header class="mb-4 flex flex-wrap items-center gap-4 text-sm">
      <strong>IR-041 · isolated history rendering</strong>
      <button data-test="locale" class="rounded border bg-white px-3 py-2" @click="localizationRuntime.setPreference(locale === 'en' ? 'zh-CN' : 'en')">EN / 中文</button>
    </header>
    <aside class="w-full max-w-sm rounded border bg-white p-2" data-test="render-history">
      <div class="px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-400" data-test="teams-heading">Teams</div>
      <WorkspaceAgentOrgHistoryCollection workspace-id="render-workspace" :groups="groups" :state="historyState" :actions="actions" />
    </aside>
  </main>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import WorkspaceAgentOrgHistoryCollection from '~/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
definePageMeta({ layout: false })
const locale = localizationRuntime.resolvedLocale
const view = taskBearingView()
const definitionExpanded = ref(true)
const runExpanded = ref(true)
const selected = ref('/director')
const groups = [{stableKey:'org-definition',definitionId:'org-definition',name:'Review organization',runs:[{
 stableKey:'org-run',rootSubjectKind:'agent_org',rootRunId:'org-run',summary:'Review the current release',isActive:false,
 createdAt:view.execution_tree.createdAt,executionTree:view.execution_tree}]}]
const historyState = {
 isAgentOrgDefinitionExpanded:()=>definitionExpanded.value,
 toggleAgentOrgDefinition:()=>{definitionExpanded.value=!definitionExpanded.value},
 isAgentOrgRunExpanded:()=>runExpanded.value,
 toggleAgentOrgRun:()=>{runExpanded.value=!runExpanded.value},
 isAgentOrgTeamExpanded:()=>true,
 isAgentOrgMemberSelected:(_root:string,address:string)=>address===selected.value,
}
const actions={onSelectAgentOrgMember:(_run:unknown,address:string)=>{selected.value=address}}
</script>
