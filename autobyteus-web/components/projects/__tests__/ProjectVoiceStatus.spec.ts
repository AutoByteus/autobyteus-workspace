import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import ProjectVoiceStatus from '../ProjectVoiceStatus.vue'
import type { VoiceInputLatestResult } from '~/types/voiceInput'

let voice: any
vi.mock('~/stores/voiceInputStore', () => ({useVoiceInputStore: () => voice}))
const target = {key: 'owned', isCurrent: () => true, appendTranscript: vi.fn()}
const result = (outcome: VoiceInputLatestResult['outcome']) => ({outcome, source: 'project-description'})

describe('ProjectVoiceStatus', () => {
  beforeEach(() => {
    voice = reactive({transcriptTarget: target, isStarting: false, isRecording: false, isTranscribing: false, latestResult: null, cancelOperationForTarget: vi.fn()})
  })
  it.each(['starting', 'recording', 'transcribing'])('shows %s activity only for its target', async (phase) => {
    const wrapper = mount(ProjectVoiceStatus, {props: {target}})
    voice['is' + phase[0]!.toUpperCase() + phase.slice(1)] = true
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    if (phase === 'recording') {
      await wrapper.get('button').trigger('click')
      expect(voice.cancelOperationForTarget).toHaveBeenCalledWith('owned')
    }
    voice.transcriptTarget = {key: 'other'}
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    wrapper.unmount()
  })
  it.each(['error', 'no-speech', 'empty-transcript'])('retains %s after release, clears on successful retry without a gap', async (outcome) => {
    const wrapper = mount(ProjectVoiceStatus, {props: {target}, attrs: {class: 'mt-3'}})
    voice.latestResult = result(outcome as any)
    voice.transcriptTarget = null
    await nextTick()
    expect(wrapper.find('[data-testid="project-voice-status"]').exists()).toBe(true)
    expect(wrapper.attributes('role')).toBe(outcome === 'error' ? 'alert' : 'status')
    voice.transcriptTarget = target
    voice.latestResult = null
    voice.latestResult = result('transcript-ready')
    voice.transcriptTarget = null
    await nextTick()
    expect(wrapper.find('div').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
    wrapper.unmount()
  })
  it('ignores unrelated results', async () => {
    const wrapper = mount(ProjectVoiceStatus, {props: {target}})
    voice.transcriptTarget = {key: 'other'}
    voice.latestResult = result('error')
    await nextTick()
    expect(wrapper.find('div').exists()).toBe(false)
    wrapper.unmount()
  })
})
