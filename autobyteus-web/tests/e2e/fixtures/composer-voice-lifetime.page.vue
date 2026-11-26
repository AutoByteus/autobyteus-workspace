<!-- Test-only renderer ingress: real Team/selection/composer/button/store and native audio.
     Only this computer's Voice Input (its availability read and its transcribe action on the embedded node) is a fixture. Installed as an owned page by the durable probe. -->
<template>
  <main class="min-h-screen bg-slate-50 p-4">
    <h1>Composer voice lifetime regression</h1>
    <p>Synthetic Chrome microphone; actual AudioContext/worklet. Fixture transcription only.</p>
    <div class="my-4 flex flex-wrap gap-2">
      <button data-testid="publish" @click="publish">Background Team message</button>
      <button data-testid="member" @click="switchMember">Switch member</button>
      <button data-testid="startup" @click="holdStartup = !holdStartup">Hold startup: {{ holdStartup }}</button>
      <button data-testid="release-media" @click="releaseMedia">Release microphone</button>
      <button data-testid="transcribe" @click="holdTranscribe = !holdTranscribe">Hold transcription: {{ holdTranscribe }}</button>
      <button data-testid="release-transcribe" @click="releaseTranscribe">Release transcription</button>
      <button data-testid="unmount" @click="visible = false">Leave composer</button>
    </div>
    <section v-if="visible" data-testid="composer" class="mx-auto max-w-3xl rounded border bg-white">
      <ChatComposer v-if="kind === 'chat'" :target="composer" placeholder="Message" :skill-options="[]" />
      <AgentUserInputTextArea v-else :target="composer" placeholder="Message" />
    </section>
    <pre data-testid="state" class="mt-4 whitespace-pre-wrap text-xs">{{ snapshot() }}</pre>
  </main>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { parseTeamStreamServerMessage } from '@autobyteus/team-stream-contracts'
import ChatComposer from '~/components/chat/ChatComposer.vue'
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useActiveContextStore } from '~/stores/activeContextStore'
import { useComposerTarget } from '~/composables/agentInput/useComposerTarget'
import { useVoiceInputStore } from '~/stores/voiceInputStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
definePageMeta({ layout: false })
const kind = useRoute().query.kind === 'chat' ? 'chat' : 'run'
const visible = ref(true), holdStartup = ref(false), holdTranscribe = ref(false)
const counts = ref({ publications: 0, wrappersChanged: 0, sends: 0, stops: 0, cancellations: 0, transcribe: 0 })
const pendingMedia = ref(false), pendingTranscribe = ref(false)
let mediaResolve: (() => void) | null = null, transcribeResolve: (() => void) | null = null
const streams: MediaStream[] = [], contexts: AudioContext[] = [], wavs: object[] = []
// Preserve native audio APIs. This transparent acquisition gate models pending OS permission;
// it calls native getUserMedia and returns its actual stream, never a fake worklet/track.
const nativeMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
const mediaDescriptor = Object.getOwnPropertyDescriptor(navigator.mediaDevices, 'getUserMedia')
Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async (constraints: MediaStreamConstraints) => {
  const stream = await nativeMedia(constraints)
  streams.push(stream)
  if (holdStartup.value) await new Promise<void>(resolve => { pendingMedia.value = true; mediaResolve = resolve })
  return stream
} })
// This computer's Voice Input on the embedded node: its availability read and its transcribe action, by request.
const nativeFetch = window.fetch.bind(window)
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input)
  if (url.endsWith('/rest/extensions/voice-input/actions/transcribe')) {
    const audioData = init!.body as ArrayBuffer
    counts.value.transcribe++
    const header = new DataView(audioData)
    wavs.push({ byteLength: audioData.byteLength, riff: header.getUint32(0, false),
      wave: header.getUint32(8, false), rate: header.getUint32(24, true), samples: header.getUint32(40, true) / 2 })
    if (holdTranscribe.value) await new Promise<void>(resolve => { pendingTranscribe.value = true; transcribeResolve = resolve })
    return new Response(JSON.stringify({ output: { text: 'dictated words', detectedLanguage: 'en', noSpeech: false } }), { headers: { 'content-type': 'application/json' } })
  }
  if (url.endsWith('/graphql') && String(init?.body ?? '').includes('GetExtensions')) {
    return new Response(JSON.stringify({ data: { extensions: { catalog: 'verified', platform: 'darwin-arm64',
      extensions: [{ id: 'voice-input', state: 'installed', enabled: true, ready: true }] } } }), { headers: { 'content-type': 'application/json' } })
  }
  return nativeFetch(input, init)
}
useWindowNodeContextStore().bindNodeContext('voice-probe', 'http://127.0.0.1:9')
const team = buildTestTeamContext({ teamRunId: 'voice-probe-team', focusedAgentRunId: 'lead', coordinatorAddress: '/lead',
  rootChildren: [testAgentNode('/lead', { agentRunId: 'lead' }), testAgentNode('/reviewer', { agentRunId: 'reviewer' }),
    testAgentNode('/engineer', { agentRunId: 'engineer' })] })
useAgentTeamContextsStore().teams = new Map([['voice-probe-team', team]])
useAgentSelectionStore().selectRun('voice-probe-team', 'team')
const composer = useComposerTarget(), voice = useVoiceInputStore()
void voice.refreshAvailability()
const unsubscribeSend = useActiveContextStore().$onAction(({ name }) => { if (name === 'send') counts.value.sends++ })
const unsubscribeVoice = voice.$onAction(({ name }) => {
  if (name === 'stopRecording') counts.value.stops++
  if (name === 'cancelOperationForTarget') counts.value.cancellations++
})
function publish() {
  const before = composer.value, sequence = team.view.getChangeSequence() + 1
  const event = parseTeamStreamServerMessage(JSON.stringify({ type: 'TEAM_COMMUNICATION_MESSAGE', payload: {
    change_sequence: sequence, message: { message_id: `voice-${sequence}`, sender_agent_run_id: 'engineer',
      receiver_agent_run_id: 'reviewer', content: 'Review ready', message_type: 'result', reference_files: [],
      created_at: '2026-10-03T12:00:00.000Z' },
  } }))
  if (event.type !== 'TEAM_COMMUNICATION_MESSAGE') throw new Error('Wrong event fixture')
  if (team.view.applyMessage(event).disposition !== 'applied') throw new Error('Team publication rejected')
  if (composer.value === before || composer.value?.context !== before?.context) throw new Error('Not an unchanged-destination refresh')
  counts.value.publications++; counts.value.wrappersChanged++
}
function switchMember() { useAgentTeamContextsStore().focusMember('voice-probe-team', 'reviewer') }
function releaseMedia() { mediaResolve?.(); mediaResolve = null; pendingMedia.value = false }
function releaseTranscribe() { transcribeResolve?.(); transcribeResolve = null; pendingTranscribe.value = false }
function snapshot() {
  if (voice.audioContext && !contexts.includes(voice.audioContext)) contexts.push(voice.audioContext)
  return { kind, visible: visible.value, focused: team.view.getFocusedAgentRunId(),
    starting: voice.isStarting, recording: voice.isRecording, transcribing: voice.isTranscribing,
    captureStats: voice.hasReceivedCaptureStats, level: voice.liveInputLevel, pendingMedia: pendingMedia.value, pendingTranscribe: pendingTranscribe.value,
    key: voice.transcriptTarget?.key, current: voice.transcriptTarget?.isCurrent(), ...counts.value,
    tracks: streams.flatMap(stream => stream.getTracks().map(track => track.readyState)),
    audioContexts: contexts.map(context => context.state), wavs, diagnostics: voice.latestResult?.diagnostics,
    outcome: voice.latestResult?.outcome, error: voice.error,
    leadDraft: team.view.getAgentContext('lead')!.requirement, reviewerDraft: team.view.getAgentContext('reviewer')!.requirement }
}
async function dispose() { releaseMedia(); releaseTranscribe(); await voice.cleanup() }
;(window as any).__composerVoiceProbe = { snapshot, dispose }
onBeforeUnmount(() => {
  void dispose(); unsubscribeSend(); unsubscribeVoice()
  window.fetch = nativeFetch
  if (mediaDescriptor) Object.defineProperty(navigator.mediaDevices, 'getUserMedia', mediaDescriptor)
  else Reflect.deleteProperty(navigator.mediaDevices, 'getUserMedia')
  Reflect.deleteProperty(window, '__composerVoiceProbe')
})
</script>
