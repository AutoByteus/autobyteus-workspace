import {describe,expect,it,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {ref} from 'vue'
import CompactionModelSettings from '../CompactionModelSettings.vue'
import SearchableGroupedSelect from '~/components/agentTeams/SearchableGroupedSelect.vue'
import ModelConfigSection from '~/components/workspace/config/ModelConfigSection.vue'
vi.mock('~/composables/useRuntimeScopedModelSelection',()=>({useRuntimeScopedModelSelection:()=>({groupedModelOptions:ref([{label:'OpenAI',items:[{id:'available',name:'Available'}]}]),hasModelIdentifier:(id:string)=>id==='available',modelConfigSchemaByIdentifier:()=>({temperature:{type:'number'}}),isLoadingModels:ref(false),modelLoadError:ref(null),reloadModelsForRuntime:vi.fn()})}))
const render=(modelValue:any)=>mount(CompactionModelSettings,{props:{modelValue},global:{stubs:{SearchableGroupedSelect:true,ModelConfigSection:true}}})
describe('CompactionModelSettings',()=>{
 it('keeps unavailable persisted model explicit, not a fallback',()=>{
   const wrapper=render({modelIdentifier:'unavailable',llmConfig:{temperature:0.3}})
   expect(wrapper.get('[role="alert"]').text()).toContain('unavailable')
   expect(wrapper.findComponent(SearchableGroupedSelect).props('selectedDisplay')).toBe('unavailable')
   expect(wrapper.emitted('update:modelValue')).toBeUndefined()
 })
 it('supports explicit reset to current parent with no config defaults',()=>{
   const wrapper=render({modelIdentifier:'available',llmConfig:{temperature:0.3}})
   wrapper.findComponent(SearchableGroupedSelect).vm.$emit('update:model-value','')
   expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([{modelIdentifier:null,llmConfig:null}])
   expect(wrapper.findComponent(ModelConfigSection).props('applyDefaults')).toBe(false)
 })
 it('keeps schema identity stable while config edits preserve the Advanced disclosure',async()=>{
   const wrapper=render({modelIdentifier:'available',llmConfig:{temperature:0.3}})
   const schema=wrapper.findComponent(ModelConfigSection).props('schema')
   await wrapper.setProps({modelValue:{modelIdentifier:'available',llmConfig:{temperature:0.5}}})
   expect(wrapper.findComponent(ModelConfigSection).props('schema')).toBe(schema)
 })

})
