import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import TaskDescriptionComposer from '../TaskDescriptionComposer.vue'
let voice: any
vi.mock('~/stores/voiceInputStore', () => ({useVoiceInputStore: () => voice}))
describe('TaskDescriptionComposer voice completion', () => {
  it('keeps editable transcript and attachments while removing success status entirely', async () => {
    const target = {key: 'task', isCurrent: () => true, appendTranscript: vi.fn()}
    voice = reactive({transcriptTarget: target, isRecording: true, latestResult: null})
    const wrapper = mount(TaskDescriptionComposer, {
      props: {modelValue: 'Typed and dictated text', files: [], client: {} as any, target, placeholder: 'Description'},
      global: {stubs: {TaskContextFiles: true, VoiceInputButton: true}},
    })
    expect(wrapper.find('[data-testid="task-voice-status"]').exists()).toBe(true)
    voice.latestResult = {outcome: 'transcript-ready'}
    voice.isRecording = false
    voice.transcriptTarget = null
    await nextTick()
    expect(wrapper.find('[data-testid="task-voice-status"]').exists()).toBe(false)
    expect(wrapper.get('textarea').element.value).toBe('Typed and dictated text')
    await wrapper.get('textarea').setValue('Reviewed')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Reviewed'])
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
