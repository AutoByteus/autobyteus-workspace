// Reviewer diagnostic: existing user-authored member model override with same supported parameters.
import { readFileSync } from 'node:fs'
import { it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { teamRunExecutionTreeDtoSchema } from '@autobyteus/team-stream-contracts'
import { loadTeamRunLaunchSeed } from '../teamRunLaunchSeed'
import { useExistingRunModelConfigStore } from '~/stores/existingRunModelConfigStore'
import { resolveTeamRunConfiguration, projectTeamRunLaunchRecords } from '~/utils/teamRunLaunchHierarchy'
const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('~/services/runConfigEditing/existingRunModelOptionsClient', () => ({ loadExistingRunModelOptions: vi.fn().mockResolvedValue({}) }))
const frames = JSON.parse(readFileSync('../tickets/in-progress/stopped-org-member-header-actions/validation/api-r2/f003-team-transport.json', 'utf8'))
const saved = JSON.parse(frames.find((x:any) => x.id===670 && x.type==='response').body).data.updateStoppedTeamRunModelConfigs
it.each([false,true])('same saved reasoning low survives canonical Team copy (different member model: %s)', async different => {
 setActivePinia(createPinia())
 const tree=teamRunExecutionTreeDtoSchema.parse(saved.canonicalExecutionTree)
 const member=tree.root_team.members[0]; if(member.kind!=='configured_agent')throw Error('Expected configured Agent')
 // Supported ordinary stopped Team Settings edit: same-runtime compatible member replacement,
 // preserving its existing low parameters. Invoke real Settings command/planner/client; only wire controlled.
 if(different){
  const editor=useExistingRunModelConfigStore()
  editor.syncTeamCanonical({teamRunId:tree.root_team.team_run_id,isActive:false,executionTree:tree,modelConfigEditability:{editable:true,reason:null}})
  await editor.refreshModelOptions()
  editor.modelOptionsByAddress[member.address]={status:'ready',options:{currentModelIdentifier:'gpt-5.4-mini',replacements:[{llmModelIdentifier:'gpt-5.4'}]}} as any
  editor.setSchemaState('/',{status:'ready',message:null});editor.setSchemaState(member.address,{status:'ready',message:null})
  editor.updateTeamScopeModelConfig(member.address,{llmModelIdentifier:'gpt-5.4',llmConfig:{reasoning_effort:'low'}})
  io.mutate.mockImplementation(async ({variables:{input}})=>{
   expect(input.patches).toEqual([{scopeKind:'CONFIGURED_AGENT',scopeAddress:member.address,llmModelIdentifier:'gpt-5.4',llmConfig:{reasoning_effort:'low'}}])
   member.launch_configuration.llm_model_identifier=input.patches[0].llmModelIdentifier
   member.launch_configuration.llm_config=input.patches[0].llmConfig
   return {data:{updateStoppedTeamRunModelConfigs:{...saved,canonicalExecutionTree:JSON.parse(JSON.stringify(tree))}}}
  })
  expect(editor.canSave).toBe(true);expect(await editor.save()).toBe(true)
 }
 const metadata={workspaceId:'ws',workspaceRootPath:tree.root_team.default_launch_configuration.workspace_root_path!,displayName:'Workspace',kind:'filesystem' as const}
 io.query.mockResolvedValue({data:{getTeamRunResumeConfig:{teamRunId:tree.root_team.team_run_id,isActive:false,executionTree:tree,modelConfigEditability:{editable:true,reason:null}}}})
 const seed=await loadTeamRunLaunchSeed({teamRunId:tree.root_team.team_run_id,expectedDefinitionId:tree.root_team.team_definition_id,workspaceMetadata:[metadata]})
 const nodes=[{kind:'agent',address:member.address,displayName:'Lead',agentDefinitionId:member.agent_definition_id}] as never
 const view=resolveTeamRunConfiguration(seed,nodes)
 const records=projectTeamRunLaunchRecords(seed,nodes)
 console.log(JSON.stringify({different, canonical:member.launch_configuration, seedOverride:seed.agentOverrides[member.address],records}))
 expect(view.root.effectiveConfig.llmConfig).toEqual({reasoning_effort:'low'})
 expect(view.agentsByAddress[member.address].effectiveConfig.llmModelIdentifier).toBe(member.launch_configuration.llm_model_identifier)
 expect(view.agentsByAddress[member.address].effectiveConfig.llmConfig).toEqual({reasoning_effort:'low'})
})
