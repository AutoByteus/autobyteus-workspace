<template><main class="min-h-screen bg-slate-100 p-4 sm:p-8"><div class="mx-auto max-w-3xl space-y-6">
<h1 class="text-xl font-semibold">Compaction — implementation fixture</h1>
<CompactionConfigCard />
<div class="flex gap-4"><button class="rounded bg-white p-2" @click="unavailable">Unavailable saved model</button><button class="rounded bg-white p-2" @click="failSave=!failSave">Toggle save failure</button></div>
<CompactionActivityItem :activity="completed" />
<CompactionActivityItem :activity="failed" />
</div></main></template>
<script setup lang="ts">
import {ref} from 'vue'
import CompactionConfigCard from '~/components/settings/CompactionConfigCard.vue'
import CompactionActivityItem from '~/components/progress/CompactionActivityItem.vue'
import {useServerSettingsStore} from '~/stores/serverSettings'
import {useWindowNodeContextStore} from '~/stores/windowNodeContextStore'
import {useLLMProviderConfigStore} from '~/stores/llmProviderConfig'
import {useRuntimeAvailabilityStore} from '~/stores/runtimeAvailabilityStore'
const setting=useServerSettingsStore();const node=useWindowNodeContextStore();const models=useLLMProviderConfigStore()
const failSave=ref(false)
setting.settings=[['AUTOBYTEUS_COMPACTION_MODEL_SETTINGS','{"modelIdentifier":null,"llmConfig":null}'],['AUTOBYTEUS_COMPACTION_TRIGGER_RATIO','0.8'],['AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE',''],['AUTOBYTEUS_COMPACTION_DEBUG_LOGS','false']].map(([key,value])=>({key,value,isEditable:true,isDeletable:false,description:key}))
setting.settingsBindingRevision=node.bindingRevision
setting.fetchServerSettings=async()=>setting.settings;setting.reloadServerSettings=async()=>setting.settings
setting.updateServerSetting=async(key,value)=>{if(failSave.value)throw new Error('Fixture disk failure');setting.settings=setting.settings.map(s=>s.key===key?{...s,value}:s);return true}
models.fetchProvidersWithModels=async()=>[] as any;models.ensureMissingDynamicProviders=async()=>{};models.refreshLocalCatalog=async()=>[] as any
models.catalogByRuntimeKind={autobyteus:{runtimeKind:'autobyteus',currentRequestId:1,state:'ready',hasSuccessfulPayload:true,errorMessage:null,providersById:{openai:{runtimeKind:'autobyteus',ownerProvider:{id:'openai',name:'OpenAI',providerType:'OPENAI',isCustom:false,catalogMode:'static'},sources:[],audioModels:[],imageModels:[],videoModels:[],llmModels:[{modelIdentifier:'fixture-model',name:'Fixture model',canonicalName:'fixture-model',providerId:'openai',providerName:'OpenAI',providerType:'OPENAI',runtime:'autobyteus',value:'fixture-model',configSchema:{type:'object',properties:{temperature:{type:'number',minimum:0,maximum:2,description:'Temperature'}}}}]}}}} as any
useRuntimeAvailabilityStore().fetchRuntimeAvailabilities=async()=>[] as any
const unavailable=()=>{setting.settings=setting.settings.map(s=>s.key==='AUTOBYTEUS_COMPACTION_MODEL_SETTINGS'?{...s,value:'{"modelIdentifier":"unavailable/model-id","llmConfig":null}'}:s)}
const completed:any={kind:'compaction',activityId:'compaction:operation:fixture-one',timestamp:new Date(),phase:'completed',message:'Memory compacted successfully.',turnId:'turn-fixture',compactionModelIdentifier:'fixture-model',summarizerProvider:'openai',completionStatus:'unknown',summaryCharCount:1560,summaryTokenCount:408,rawTraceCount:32,compactedBlockCount:10}
const failed:any={...completed,activityId:'compaction:operation:fixture-two',phase:'failed',message:'Compaction failed. Send a new message to retry.',completionStatus:'incomplete',errorMessage:'Provider reported incomplete compaction output.'}
</script>
