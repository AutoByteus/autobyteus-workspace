<!-- Implementation-only rendered self-check fixture; never installed as a product page.
     Actual Chat composer + Team publication + voice store; controlled media/IPC. -->
<template>
  <main class="min-h-screen bg-slate-50 p-6">
    <div class="mx-auto max-w-3xl space-y-4">
      <h1 class="text-xl font-semibold">Composer recording lifetime — local self-check</h1>
      <p class="text-sm text-slate-600">Controlled audio/IPC. No real microphone, server, model or desktop journey.</p>
      <div class="flex flex-wrap gap-2 text-sm">
        <button class="rounded border bg-white px-3 py-2" @click="publish">Background Team message</button>
        <button class="rounded border bg-white px-3 py-2" @click="switchMember">Switch member</button>
        <button class="rounded border bg-white px-3 py-2" @click="narrow = !narrow">Narrow layout</button>
        <button class="rounded border bg-white px-3 py-2" @click="holdStartup = !holdStartup">Defer startup: {{ holdStartup }}</button>
        <button v-if="pendingMedia" class="rounded border bg-white px-3 py-2" @click="releaseMedia">Release microphone</button>
      </div>
      <div :style="{ width: narrow ? '360px' : '100%', maxWidth: '100%' }">
        <ChatComposer :target="composer" placeholder="Ask anything" :skill-options="[]" />
      </div>
      <pre class="whitespace-pre-wrap rounded border bg-white p-3 text-xs">{{ status }}</pre>
    </div>
  </main>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { parseTeamStreamServerMessage } from '@autobyteus/team-stream-contracts'
import ChatComposer from '~/components/chat/ChatComposer.vue'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useComposerTarget } from '~/composables/agentInput/useComposerTarget'
import { useExtensionsStore } from '~/stores/extensionsStore'
import { useVoiceInputStore } from '~/stores/voiceInputStore'
definePageMeta({ layout: false })
const narrow = ref(false), holdStartup = ref(false), pendingMedia = ref(false)
const counts = ref({ stops: 0, closes: 0, ipc: 0, sends: 0, publications: 0 })
const originals = {
  api: Object.getOwnPropertyDescriptor(window, 'electronAPI'),
  media: Object.getOwnPropertyDescriptor(navigator, 'mediaDevices'),
  permissions: Object.getOwnPropertyDescriptor(navigator, 'permissions'),
  audio: window.AudioContext, worklet: window.AudioWorkletNode,
}
let resolveMedia: (() => void) | null = null
const stream = () => ({ getTracks: () => [{ stop: () => counts.value.stops++ }] })
Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
  enumerateDevices: async () => [{ kind: 'audioinput', deviceId: 'preview-mic', label: 'Controlled preview microphone' }],
  addEventListener: () => {}, getUserMedia: async () => {
    if (holdStartup.value) await new Promise<void>(resolve => { pendingMedia.value = true; resolveMedia = resolve })
    return stream()
  },
} })
Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: async () => ({ state: 'granted' }) } })
Object.defineProperty(window, 'electronAPI', { configurable: true, value: {
  transcribeVoiceInput: async () => {
    counts.value.ipc++
    await new Promise(resolve => setTimeout(resolve, 1200))
    return { ok: true, text: 'dictated words', detectedLanguage: 'en', noSpeech: false, error: null }
  },
} })
window.AudioContext = class {
  state = 'running'; destination = {}; audioWorklet = { addModule: async () => {} }
  createMediaStreamSource() { return { connect: () => {} } }
  async close() { counts.value.closes++ }
} as any
window.AudioWorkletNode = class {
  port = { onmessage: null as any, postMessage: () => queueMicrotask(() => this.port.onmessage?.({ data: {
    type: 'audio-ready', wavData: new Uint8Array([1,2,3]), diagnostics: { sampleCount: 48000, durationMs: 1000 },
  } })) }
  constructor() { setTimeout(() => this.port.onmessage?.({ data: { type: 'capture-stats', level: .2 } }), 50) }
  connect() {}; disconnect() {}
} as any
const extensions = useExtensionsStore()
extensions.initialized = true
extensions.extensions = [{ id: 'voice-input', status: 'installed', enabled: true, settings: {} }] as any
const team = buildTestTeamContext({ teamRunId: 'preview-team', focusedAgentRunId: 'lead', coordinatorAddress: '/lead',
  rootChildren: [testAgentNode('/lead', {agentRunId: 'lead'}), testAgentNode('/reviewer', {agentRunId: 'reviewer'}), testAgentNode('/engineer', {agentRunId: 'engineer'})] })
useAgentTeamContextsStore().teams = new Map([['preview-team', team]])
useAgentSelectionStore().selectRun('preview-team', 'team')
const composer = useComposerTarget()
const voice = useVoiceInputStore()
voice.isElectron = true
team.view.getAgentContext('lead')!.requirement = 'existing draft'
function publish() {
  const sequence = team.view.getChangeSequence() + 1
  const message = parseTeamStreamServerMessage(JSON.stringify({ type: 'TEAM_COMMUNICATION_MESSAGE', payload: {
    change_sequence: sequence, message: { message_id: `preview-${sequence}`, sender_agent_run_id: 'engineer', receiver_agent_run_id: 'reviewer',
      content: 'Review ready', message_type: 'result', reference_files: [], created_at: '2026-10-03T12:00:00.000Z' },
  } }))
  if (message.type === 'TEAM_COMMUNICATION_MESSAGE') team.view.applyMessage(message)
  counts.value.publications++
}
function switchMember() { team.view.focusAgent(team.view.getFocusedAgentRunId() === 'lead' ? 'reviewer' : 'lead') }
function releaseMedia() { resolveMedia?.(); resolveMedia = null; pendingMedia.value = false }
const status = computed(() => ({ focused: team.view.getFocusedAgentRunId(), starting: voice.isStarting, recording: voice.isRecording,
  transcribing: voice.isTranscribing, ...counts.value, draft: composer.value?.context.requirement }))
onBeforeUnmount(() => {
  releaseMedia(); void voice.cleanup()
  window.AudioContext = originals.audio; window.AudioWorkletNode = originals.worklet
  for (const [object, key, descriptor] of [[window, 'electronAPI', originals.api], [navigator, 'mediaDevices', originals.media], [navigator, 'permissions', originals.permissions]] as const) {
    if (descriptor) Object.defineProperty(object, key, descriptor)
    else Reflect.deleteProperty(object, key)
  }
})
</script>
