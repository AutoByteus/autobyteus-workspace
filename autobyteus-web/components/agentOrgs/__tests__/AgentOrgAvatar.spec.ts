import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import Avatar from '../AgentOrgAvatar.vue'
import Editor from '../AgentOrgAvatarEditor.vue'
const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('~/services/api', () => ({ default: { post } }))
const wrappers: ReturnType<typeof mount>[] = []
const editor = () => { const w = mount(Editor, { props: { modelValue: '/old.png', name: 'Research Org' } }); wrappers.push(w); return w }
const pick = async (w: ReturnType<typeof mount>, type = 'image/png') => {
  const input = w.get('input'); Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['image'], 'avatar.png', { type })] }); await input.trigger('change')
}
beforeEach(() => { setActivePinia(createPinia()); post.mockReset() })
afterEach(() => wrappers.splice(0).forEach(w => w.unmount()))
describe('Org avatar presentation and real upload store', () => {
  it('falls back when missing/broken and does not let an old image failure hide a replacement', async () => {
    const w = mount(Avatar, { props: { name: 'Research Org' } }); wrappers.push(w)
    expect(w.text()).toBe('RO'); await w.setProps({ avatarUrl: '/first.png' }); const old = w.get('img')
    await old.trigger('error'); expect(w.find('img').exists()).toBe(false)
    await w.setProps({ avatarUrl: '/next.png' }); await old.trigger('error')
    expect(w.get('img').attributes()).toMatchObject({ src: '/next.png', alt: 'Research Org' })
  })
  it('posts selected File via FormData, blocks removal/reentry while pending, then emits preview URL', async () => {
    let resolve!: (v: unknown) => void; post.mockReturnValue(new Promise(r => { resolve = r }))
    const w = editor(); await pick(w); await pick(w)
    expect(post).toHaveBeenCalledTimes(1)
    const [url, body] = post.mock.calls[0]!; expect(url).toBe('/upload-file'); expect(body.get('file').name).toBe('avatar.png')
    expect(w.findAll('button').every(b => b.attributes('disabled') !== undefined)).toBe(true)
    expect(w.emitted('update:modelValue')).toBeUndefined()
    resolve({ data: { fileUrl: '/uploaded.png' } }); await flushPromises()
    expect(w.emitted('update:modelValue')).toEqual([['/uploaded.png']]); expect(w.emitted('pending')).toEqual([[true], [false]])
    await w.findAll('button')[1]!.trigger('click'); expect(w.emitted('update:modelValue')?.at(-1)).toEqual([''])
  })
  it('retains preview on error/invalid type and permits same-file retry', async () => {
    const w = editor(); await pick(w, 'text/plain'); expect(post).not.toHaveBeenCalled(); expect(w.find('[role=alert]').exists()).toBe(true)
    post.mockRejectedValueOnce(new Error('Upload failed')); await pick(w); await flushPromises()
    expect(w.get('img').attributes('src')).toBe('/old.png'); expect(w.emitted('update:modelValue')).toBeUndefined()
    post.mockResolvedValueOnce({ data: { fileUrl: '/retry.png' } }); await pick(w); await flushPromises()
    expect(w.emitted('update:modelValue')).toEqual([['/retry.png']]); expect(w.find('[role=alert]').exists()).toBe(false)
  })
  it('ignores picker cancellation and late upload after editor retirement', async () => {
    const w = editor(); await w.get('input').trigger('change'); expect(post).not.toHaveBeenCalled()
    let resolve!: (v: unknown) => void; post.mockReturnValue(new Promise(r => { resolve = r }))
    const publish = vi.fn(); await w.setProps({ 'onUpdate:modelValue': publish } as any)
    await pick(w); expect(w.emitted('pending')).toEqual([[true]]); w.unmount(); resolve({ data: { fileUrl: '/late.png' } }); await flushPromises()
    expect(publish).not.toHaveBeenCalled()
  })
})
