import {beforeEach, describe, expect, it, vi} from 'vitest'
import {mount, flushPromises} from '@vue/test-utils'
import {createTestingPinia} from '@pinia/testing'
import {setActivePinia} from 'pinia'
import CompactionConfigCard from '../CompactionConfigCard.vue'
import CompactionModelSettings from '../CompactionModelSettings.vue'
import {useServerSettingsStore} from '~/stores/serverSettings'
import {useWindowNodeContextStore} from '~/stores/windowNodeContextStore'
const KEY='AUTOBYTEUS_COMPACTION_MODEL_SETTINGS'
const initial = [ [KEY,'{"modelIdentifier":null,"llmConfig":null}'], ['AUTOBYTEUS_COMPACTION_TRIGGER_RATIO','0.75'], ['AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE','4096'], ['AUTOBYTEUS_COMPACTION_DEBUG_LOGS','true'] ]
const mountCard = async () => {
  const pinia=createTestingPinia({createSpy:vi.fn,initialState:{serverSettings:{settings:initial.map(([key,value])=>({key,value,isEditable:true,isDeletable:false,description:key})),settingsBindingRevision:0}}})
  setActivePinia(pinia)
  const store=useServerSettingsStore()
  store.updateServerSetting=vi.fn(async (key,value)=>{store.settings=store.settings.map(s=>s.key===key?{...s,value}:s);return true})
  const wrapper=mount(CompactionConfigCard,{global:{plugins:[pinia],stubs:{Icon:true,CompactionModelSettings:true}}})
  await flushPromises()
  const model=(value:any)=>wrapper.findComponent(CompactionModelSettings).vm.$emit('update:modelValue',value)
  const save=async()=>{await wrapper.get('[data-testid="compaction-config-save"]').trigger('click');await flushPromises()}
  return {wrapper,store,model,save}
}
beforeEach(()=>vi.clearAllMocks())
describe('CompactionConfigCard',()=>{
 it('shows inherited model and existing universal settings without dirty defaults',async()=>{
   const {wrapper}=await mountCard()
   expect(wrapper.findComponent(CompactionModelSettings).props('modelValue')).toEqual({modelIdentifier:null,llmConfig:null})
   expect((wrapper.get('#compaction-ratio-input').element as HTMLInputElement).value).toBe('75')
   expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeDefined()
 })
 it('does not write the compound setting for an unrelated change',async()=>{
   const {wrapper,store,save}=await mountCard()
   await wrapper.get('#compaction-ratio-input').setValue('60');await save()
   expect(store.updateServerSetting).toHaveBeenCalledExactlyOnceWith('AUTOBYTEUS_COMPACTION_TRIGGER_RATIO','0.6')
 })
 it('saves one atomic model/config pair first and then universal changes',async()=>{
   const {wrapper,store,model,save}=await mountCard()
   model({modelIdentifier:'selected',llmConfig:{temperature:0.2}})
   await wrapper.get('#compaction-ratio-input').setValue('65');await save()
   expect(store.updateServerSetting).toHaveBeenNthCalledWith(1,KEY,'{"modelIdentifier":"selected","llmConfig":{"temperature":0.2}}')
   expect(store.updateServerSetting).toHaveBeenNthCalledWith(2,'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO','0.65')
   expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeDefined()
 })
 it('keeps failed/unsent drafts while retrying only remaining settings',async()=>{
   const {wrapper,store,model,save}=await mountCard();const normal=store.updateServerSetting
   store.updateServerSetting=vi.fn(async(key,value)=>{if(key==='AUTOBYTEUS_COMPACTION_TRIGGER_RATIO')throw new Error('disk failure');return normal(key,value)})
   model({modelIdentifier:'selected',llmConfig:null});await wrapper.get('#compaction-ratio-input').setValue('60');await save()
   expect(wrapper.get('[role="alert"]').text()).toContain('disk failure')
   expect((wrapper.get('#compaction-ratio-input').element as HTMLInputElement).value).toBe('60')
   store.updateServerSetting=vi.fn(normal);await save()
   expect(store.updateServerSetting).toHaveBeenCalledExactlyOnceWith('AUTOBYTEUS_COMPACTION_TRIGGER_RATIO','0.6')
 })
 it.each(['0','101'])('keeps invalid ratio %s visible and disables save',async value=>{
   const {wrapper}=await mountCard();await wrapper.get('#compaction-ratio-input').setValue(value)
   expect(wrapper.find('[data-testid="compaction-ratio-error"]').exists()).toBe(true)
   expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeDefined()
 })
 it('invalid model draft cannot save; catalogue-independent controls still work when model unchanged',async()=>{
   const {wrapper,model}=await mountCard()
   wrapper.findComponent(CompactionModelSettings).vm.$emit('valid',false)
   await wrapper.get('#compaction-ratio-input').setValue('60')
   expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeUndefined()
   model({modelIdentifier:'selected',llmConfig:{temperature:'bad'}});await flushPromises()
   expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeDefined()
 })
 it('resets drafts and prevents remaining writes after node binding changes during save',async()=>{
   const {wrapper,store,model}=await mountCard();let release!:()=>void
   store.updateServerSetting=vi.fn(()=>new Promise<boolean>(resolve=>{release=()=>resolve(true)}))
   model({modelIdentifier:'old-node-model',llmConfig:null});await wrapper.get('#compaction-ratio-input').setValue('60')
   await wrapper.get('[data-testid="compaction-config-save"]').trigger('click')
   useWindowNodeContextStore().bindingRevision++;store.settingsBindingRevision=null
   release();await flushPromises()
   expect(store.updateServerSetting).toHaveBeenCalledOnce()
   expect(wrapper.findComponent(CompactionModelSettings).props('modelValue')).toEqual({modelIdentifier:null,llmConfig:null})
 })
})
