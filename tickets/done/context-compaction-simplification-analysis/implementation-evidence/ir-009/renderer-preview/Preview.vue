<script setup lang="ts">
import {computed,ref} from 'vue';
import CompactionStatusRow from '~/components/workspace/agent/CompactionStatusRow.vue';
import CompactionActivityItem from '~/components/progress/CompactionActivityItem.vue';
import {getCompactionMessage} from '~/utils/compactionActivityPresentation';
const phase=ref('stopped'); const highlighted=ref(false); const narrow=ref(false);
const activity=computed(()=>({kind:'compaction',activityId:'compaction:operation:native-009',compactionOperationId:'native-009',phase:phase.value,
 timestamp:new Date('2026-10-01T06:00:00Z'),updatedAt:new Date('2026-10-01T06:02:00Z'),message:phase.value==='stopped'?'Stale previous failure message':getCompactionMessage({phase:phase.value}),
 turnId:'turn-12',compactionModelIdentifier:'deepseek-chat',summarizerProvider:'DeepSeek',rawTraceCount:84,selectedBlockCount:15,
 summaryCharCount:null,summaryTokenCount:null,errorMessage:null}));
</script>
<template><main class="min-h-screen bg-white p-6 text-gray-900"><h1 class="mb-2 text-xl font-semibold">IR009 integrated component feedback</h1>
<p class="mb-4 text-sm text-gray-600">Actual worktree components; synthetic presentation-only states. No termination or saved replay claim.</p>
<div class="mb-6 flex flex-wrap gap-3"><label>Phase <select v-model="phase" aria-label="Phase" class="rounded border p-1"><option v-for="value in ['requested','started','completed','failed','stopped']" :key="value">{{value}}</option></select></label>
<label><input type="checkbox" v-model="highlighted"/> Highlight</label><label><input type="checkbox" v-model="narrow"/> Narrow card</label></div>
<div :style="{width:narrow?'360px':'100%',maxWidth:'900px'}" class="space-y-5"><section><h2 class="mb-1 font-semibold">Conversation row</h2><CompactionStatusRow :activity="activity"/></section><section><h2 class="mb-2 font-semibold">Activity panel</h2><CompactionActivityItem :activity="activity" :is-highlighted="highlighted"/></section></div></main></template>