<template>
  <main class="min-h-screen bg-slate-100 p-4 text-slate-900">
    <section class="mx-auto max-w-3xl rounded-xl border bg-white p-4 shadow-sm">
      <header class="mb-4 border-b pb-3">
        <h1 class="text-lg font-semibold">Stopped Org workspace — implementation preview</h1>
        <p class="text-xs text-slate-500">Real Settings components; deterministic local configuration, no provider or project I/O.</p>
        <button class="mt-2 rounded border px-3 py-1" @click="active = !active">{{ active ? 'Set stopped' : 'Set active (locked)' }}</button>
      </header>
      <AgentOrgRunConfigForm :existing-model="form" @update:workspace-selection="updateWorkspace" />
      <div class="mt-4 border-t pt-3 text-sm" data-test="preview-status">Draft Team path: {{ workspaceDraft['/team']?.rootPath || '(empty)' }}</div>
      <div class="mt-4 h-28 rounded border"><FileExplorerLayout :workspace-id="null" /></div>
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import AgentOrgRunConfigForm from '~/components/workspace/config/AgentOrgRunConfigForm.vue'
import FileExplorerLayout from '~/components/fileExplorer/FileExplorerLayout.vue'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { createExistingAgentOrgModelConfigDraft } from '~/services/runConfigEditing/existingAgentOrgModelConfigDraft'
import { createExistingAgentOrgWorkspaceDraft, updateExistingAgentOrgWorkspaceDraft } from '~/services/runConfigEditing/existingAgentOrgWorkspaceDraft'
import { projectExistingAgentOrgRunFormModel } from '~/services/runConfigEditing/existingAgentOrgRunFormModel'
import { useWorkspaceStore } from '~/stores/workspace'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
definePageMeta({ layout: false })
const active = ref(false), workspace = useWorkspaceStore()
for (const [id, root] of [['A', '/work/global'], ['B', '/work/marketing']]) {
  workspace.workspaces[id!] = { workspaceId: id!, name: id === 'A' ? 'Global project' : 'Marketing project', absolutePath: root!, workspaceConfig: {} }
}
workspace.workspacesFetched = true
const runtime = useRuntimeAvailabilityStore()
runtime.hasFetched = true; runtime.availabilities = [{ runtimeKind: 'codex_app_server', enabled: true, reason: null }]
const models = useLLMProviderConfigStore()
models.catalogByRuntimeKind.codex_app_server = { runtimeKind: 'codex_app_server', state: 'ready', currentRequestId: 0, hasSuccessfulPayload: true, errorMessage: null,
  providersById: { OPENAI: { runtimeKind: 'codex_app_server', ownerProvider: { id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false, catalogMode: 'STATIC' },
    sources: [], llmModels: [{ modelIdentifier: 'gpt-5.6-sol', name: 'GPT-5.6-Sol', value: 'gpt-5.6-sol', canonicalName: 'gpt-5.6-sol',
      providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'codex_app_server', configSchema: { type: 'object', properties: {} } }],
    audioModels: [], imageModels: [], videoModels: [] } } } as any
const tree = JSON.parse(JSON.stringify(taskBearingView().execution_tree))
tree.rootOrg.orgDefinitionName = 'Project organization'
const allLaunch = [tree.rootOrg.defaultLaunchConfiguration, ...tree.rootOrg.members.flatMap((member: any) => 'agentRunId' in member
  ? [member.launchConfiguration] : [member.defaultLaunchConfiguration, ...member.members.map((agent: any) => agent.launchConfiguration)])]
allLaunch.forEach(launch => { launch.workspaceRootPath = '/work/global' })
tree.rootOrg.members[2].role = 'marketing_team'
const planner = createExistingAgentOrgModelConfigDraft(tree)
const workspaceDraft = ref(createExistingAgentOrgWorkspaceDraft(tree, workspace.allWorkspaces))
const form = computed(() => projectExistingAgentOrgRunFormModel({ tree, planner, workspaceDraft: workspaceDraft.value,
  isActive: active.value, modelConfigEditable: !active.value, modelConfigReason: active.value ? 'RUN_ACTIVE' : null, saving: false,
  modelOptionsByAddress: Object.fromEntries(Object.keys(planner.scopesByAddress).map(address => [address, { status: 'ready', options: {
    currentModelIdentifier: 'gpt-5.6-sol', currentContextTokens: 100000, replacements: [], unavailableReason: null } }])) }))
const updateWorkspace = (address: string, selection: any) => { workspaceDraft.value = updateExistingAgentOrgWorkspaceDraft(workspaceDraft.value, address, selection, workspace.allWorkspaces) }
</script>
