import {beforeEach, describe, expect, it, vi} from 'vitest'
import {mount, flushPromises} from '@vue/test-utils'
import {createTestingPinia} from '@pinia/testing'
import {setActivePinia} from 'pinia'
import CompactionConfigCard from '../CompactionConfigCard.vue'
import {useServerSettingsStore} from '~/stores/serverSettings'
import {useWindowNodeContextStore} from '~/stores/windowNodeContextStore'
// A value saved by the removed compaction-model setting may still be present on old nodes.
const LEFTOVER_MODEL_KEY='AUTOBYTEUS_COMPACTION_MODEL_SETTINGS'
const initial = [ [LEFTOVER_MODEL_KEY,'{"modelIdentifier":"old-model","llmConfig":null}'], ['AUTOBYTEUS_COMPACTION_TRIGGER_RATIO','0.75'], ['AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE','4096'], ['AUTOBYTEUS_COMPACTION_DEBUG_LOGS','true'] ]
const mountCard = async () => {
  const pinia=createTestingPinia({createSpy:vi.fn,initialState:{serverSettings:{settings:initial.map(([key,value])=>({key,value,isEditable:true,isDeletable:false,description:key})),settingsBindingRevision:0}}})
  setActivePinia(pinia)
  const store=useServerSettingsStore()
  store.updateServerSetting=vi.fn(async (key,value)=>{store.settings=store.settings.map(s=>s.key===key?{...s,value}:s);return true})
  const wrapper=mount(CompactionConfigCard,{global:{plugins:[pinia],stubs:{Icon:true}}})
  await flushPromises()
  const save=async()=>{await wrapper.get('[data-testid="compaction-config-save"]').trigger('click');await flushPromises()}
  return {wrapper,store,save}
}
beforeEach(()=>vi.clearAllMocks())
describe('CompactionConfigCard',()=>{
 it('offers no compaction model choice and shows the remaining settings without dirty defaults',async()=>{
   const {wrapper}=await mountCard()
   expect(wrapper.find('[data-testid="compaction-model-select"]').exists()).toBe(false)
   expect(wrapper.text()).not.toContain('old-model')
   expect((wrapper.get('#compaction-ratio-input').element as HTMLInputElement).value).toBe('75')
   expect((wrapper.get('#compaction-context-override-input').element as HTMLInputElement).value).toBe('4096')
   expect((wrapper.get('[data-testid="compaction-debug-logs-toggle"]').element as HTMLInputElement).checked).toBe(true)
   expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeDefined()
 })
 it('saves the remaining settings and never writes the removed model setting',async()=>{
   const {wrapper,store,save}=await mountCard()
   await wrapper.get('#compaction-ratio-input').setValue('60')
   await wrapper.get('#compaction-context-override-input').setValue('')
   await wrapper.get('[data-testid="compaction-debug-logs-toggle"]').setValue(false)
   await save()
   expect(store.updateServerSetting).toHaveBeenNthCalledWith(1,'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO','0.6')
   expect(store.updateServerSetting).toHaveBeenNthCalledWith(2,'AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE','')
   expect(store.updateServerSetting).toHaveBeenNthCalledWith(3,'AUTOBYTEUS_COMPACTION_DEBUG_LOGS','false')
   expect(store.updateServerSetting).toHaveBeenCalledTimes(3)
   expect(store.updateServerSetting).not.toHaveBeenCalledWith(LEFTOVER_MODEL_KEY,expect.anything())
   expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeDefined()
 })
 it('keeps failed/unsent drafts while retrying only remaining settings',async()=>{
   const {wrapper,store,save}=await mountCard();const normal=store.updateServerSetting
   store.updateServerSetting=vi.fn(async(key,value)=>{if(key==='AUTOBYTEUS_COMPACTION_TRIGGER_RATIO')throw new Error('disk failure');return normal(key,value)})
   await wrapper.get('#compaction-ratio-input').setValue('60');await save()
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
 it('resets drafts and prevents remaining writes after node binding changes during save',async()=>{
   const {wrapper,store}=await mountCard();let release!:()=>void
   store.updateServerSetting=vi.fn(()=>new Promise<boolean>(resolve=>{release=()=>resolve(true)}))
   await wrapper.get('#compaction-ratio-input').setValue('60')
   await wrapper.get('#compaction-context-override-input').setValue('8192')
   await wrapper.get('[data-testid="compaction-config-save"]').trigger('click')
   useWindowNodeContextStore().bindingRevision++;store.settingsBindingRevision=null
   release();await flushPromises()
   expect(store.updateServerSetting).toHaveBeenCalledOnce()
   expect((wrapper.get('#compaction-ratio-input').element as HTMLInputElement).value).toBe('')
 })
})
