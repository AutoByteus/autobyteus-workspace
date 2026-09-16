import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import Experience from '../AgentOrgExperience.vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
const mocks = vi.hoisted(() => ({ route: null as any, store: null as any, push: vi.fn(), post: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => mocks.route, useRouter: () => ({ push: mocks.push }) }))
vi.mock('~/services/api', () => ({ default: { post: mocks.post } }))
vi.mock('~/stores/agentOrgDefinitionStore', () => ({ useAgentOrgDefinitionStore: () => mocks.store }))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => ({ sharedAgentDefinitions: [], getAgentDefinitionById: vi.fn(), fetchAllAgentDefinitions: vi.fn() }) }))
vi.mock('~/stores/agentTeamDefinitionStore', () => ({ useAgentTeamDefinitionStore: () => ({ sharedAgentTeamDefinitions: [], getAgentTeamDefinitionById: vi.fn(), fetchAllAgentTeamDefinitions: vi.fn() }) }))
const org = (id = 'one') => ({ id, name: id === 'one' ? '<img src=x> Research Org' : 'Second Org', description: 'Description', instructions: 'Hidden', revision: 'r1', avatarUrl: `/${id}.png`, members: [], handoffs: [], category: 'retained', defaultLaunchConfig: null })
let wrapper: VueWrapper
const open = async (view = 'org-edit') => { mocks.route.query = { view, id: 'one' }; wrapper = mount(Experience, { global: { stubs: { teleport: true } } }); await flushPromises() }
const button = (text: string, scope = wrapper) => scope.findAll('button').find(b => b.text() === text)!
const pick = async () => { const input = wrapper.get('input[type=file]'); Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['image'], 'avatar.png', { type: 'image/png' })] }); await input.trigger('change') }
const deferred = <T,>() => { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { resolve, promise } }
beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks()
  mocks.route = reactive({ query: {} }); mocks.store = reactive({ definitions: [org(), org('two')], loading: false, error: null,
    byId: (id: string) => mocks.store.definitions.find((o: any) => o.id === id), fetchAll: vi.fn(),
    update: vi.fn(async (id, revision, input) => ({ ...org(id), ...input, revision: 'r2' })), create: vi.fn(async input => ({ ...org(), ...input })), remove: vi.fn(async () => true) })
  mocks.push.mockImplementation(async ({ query }) => { mocks.route.query = query })
})
afterEach(async () => { wrapper?.unmount(); await localizationRuntime.setPreference('en') })
describe('Org authoring controls with real editor, upload store and modal', () => {
  it('uses saved images in catalog/detail and safe named confirmation with explicit package boundary', async () => {
    await open('org-list'); expect(wrapper.findAll('img').map(i => i.attributes('src'))).toEqual(['/one.png', '/two.png'])
    mocks.route.query = { view: 'org-detail', id: 'one' }; await flushPromises()
    expect(wrapper.get('img').attributes('src')).toBe('/one.png'); await button('Delete').trigger('click')
    const dialog = wrapper.get('[role=dialog]'); expect(dialog.text()).toContain('<img src=x> Research Org'); expect(dialog.find('img').exists()).toBe(false)
    expect(dialog.text()).toContain('Separately shared'); expect(dialog.text()).toContain('history')
    await button('Cancel', dialog as any).trigger('click'); expect(mocks.store.remove).not.toHaveBeenCalled(); expect(wrapper.find('[role=dialog]').exists()).toBe(false)
  })
  it('keeps unchanged avatar omitted, sends empty string on explicit clear, and omits it on subsequent unchanged Save', async () => {
    await open(); await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(mocks.store.update.mock.calls[0][2]).not.toHaveProperty('avatarUrl')
    await button('Remove image').trigger('click'); expect(wrapper.find('img').exists()).toBe(false)
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(mocks.store.update.mock.calls[1][2]).toMatchObject({ avatarUrl: '' }); expect(mocks.store.update.mock.calls[1][2]).not.toHaveProperty('instructions')
    await wrapper.get('form').trigger('submit'); await flushPromises(); expect(mocks.store.update.mock.calls[2][2]).not.toHaveProperty('avatarUrl')
  })
  it('blocks Save during upload then saves the actual returned preview URL, without mutating persisted state before Save', async () => {
    await open(); const d = deferred<any>(); mocks.post.mockReturnValueOnce(d.promise); await pick()
    expect(wrapper.get('button[type=submit]').attributes('disabled')).toBeDefined(); await wrapper.get('form').trigger('submit'); expect(mocks.store.update).not.toHaveBeenCalled()
    d.resolve({ data: { fileUrl: '/new.png' } }); await flushPromises()
    expect(wrapper.get('img').attributes('src')).toBe('/new.png'); expect(mocks.store.byId('one').avatarUrl).toBe('/one.png')
    await wrapper.get('form').trigger('submit'); await flushPromises(); expect(mocks.store.update.mock.calls[0][2]).toMatchObject({ avatarUrl: '/new.png' })
  })
  it('creates with an uploaded avatar and cancels without a mutation', async () => {
    await open('org-create'); await wrapper.get('form input:not([type=file])').setValue('Created Org')
    mocks.post.mockResolvedValueOnce({ data: { fileUrl: '/create.png' } }); await pick(); await flushPromises()
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(mocks.store.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Created Org', avatarUrl: '/create.png' }))
    await button('Remove image').trigger('click'); await button('Cancel').trigger('click'); await flushPromises(); expect(mocks.store.update).not.toHaveBeenCalled()
  })
  it('cannot publish an old upload or save error into another edit identity', async () => {
    await open(); const upload = deferred<any>(); mocks.post.mockReturnValueOnce(upload.promise); await pick()
    mocks.route.query = { view: 'org-edit', id: 'two' }; await flushPromises(); upload.resolve({ data: { fileUrl: '/stale.png' } }); await flushPromises()
    expect(wrapper.get('img').attributes('src')).toBe('/two.png'); expect(wrapper.get('button[type=submit]').attributes('disabled')).toBeUndefined()
    const save = deferred<any>(); mocks.store.update.mockReturnValueOnce(save.promise); await wrapper.get('form').trigger('submit')
    mocks.route.query = { view: 'org-edit', id: 'one' }; await flushPromises(); save.resolve({ ...org('two'), avatarUrl: '/saved-two.png' }); await flushPromises()
    expect(wrapper.get('img').attributes('src')).toBe('/one.png'); expect(wrapper.text()).not.toContain('Agent Org saved.')
  })
  it.each(['false', 'error'])('retains confirmation/identity on %s deletion, permits retry, then navigates only on success', async mode => {
    await open('org-detail'); await button('Delete').trigger('click')
    if (mode === 'false') mocks.store.remove.mockResolvedValueOnce(false); else mocks.store.remove.mockRejectedValueOnce(new Error('Read-only source'))
    await button('Delete', wrapper.get('[role=dialog]') as any).trigger('click'); await flushPromises()
    expect(wrapper.get('[role=dialog] [role=alert]').text()).toBeTruthy(); expect(mocks.push).not.toHaveBeenCalled()
    await button('Delete', wrapper.get('[role=dialog]') as any).trigger('click'); await flushPromises()
    expect(mocks.store.remove.mock.calls).toEqual([['one'], ['one']]); expect(mocks.route.query.view).toBe('org-list')
  })
  it('blocks duplicate confirm/cancel while pending and stale completion cannot navigate another selected Org', async () => {
    await open('org-detail'); await button('Delete').trigger('click'); const d = deferred<boolean>(); mocks.store.remove.mockReturnValueOnce(d.promise)
    await button('Delete', wrapper.get('[role=dialog]') as any).trigger('click'); await nextTick()
    const dialog = wrapper.get('[role=dialog]'); expect(dialog.attributes('aria-busy')).toBe('true'); expect(dialog.findAll('button').every(b => b.attributes('disabled') !== undefined)).toBe(true)
    for (const b of dialog.findAll('button')) await b.trigger('click'); expect(mocks.store.remove).toHaveBeenCalledTimes(1)
    mocks.route.query = { view: 'org-detail', id: 'two' }; await flushPromises(); expect(wrapper.find('[role=dialog]').exists()).toBe(false)
    d.resolve(true); await flushPromises(); expect(mocks.push).not.toHaveBeenCalled(); expect(mocks.route.query.id).toBe('two')
  })
  it('closes a committed delete before reporting navigation failure, without duplicate submission', async () => {
    await open('org-detail'); await button('Delete').trigger('click'); mocks.push.mockRejectedValueOnce(new Error('Navigation failed'))
    await button('Delete', wrapper.get('[role=dialog]') as any).trigger('click'); await flushPromises()
    expect(wrapper.find('[role=dialog]').exists()).toBe(false); expect(wrapper.get('[role=alert]').text()).toContain('deleted'); expect(mocks.store.remove).toHaveBeenCalledTimes(1)
  })
  it('retains a cleared avatar draft and error on failed Save, then retries the same explicit clear', async () => {
    await open(); await button('Remove image').trigger('click'); mocks.store.update.mockRejectedValueOnce(new Error('Revision conflict'))
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toBe('Revision conflict'); expect(wrapper.find('img').exists()).toBe(false)
    expect(mocks.store.byId('one').avatarUrl).toBe('/one.png'); expect(mocks.push).not.toHaveBeenCalled()
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(mocks.store.update.mock.calls.map((call: any[]) => call[2].avatarUrl)).toEqual(['', ''])
  })
  it('creates an avatar-free Org with null, and handles a resolved router navigation failure after deletion', async () => {
    await open('org-create'); await wrapper.get('form input:not([type=file])').setValue('No avatar')
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(mocks.store.create.mock.calls[0][0].avatarUrl).toBeNull()
    mocks.route.query = { view: 'org-detail', id: 'one' }; await flushPromises(); await button('Delete').trigger('click')
    mocks.push.mockResolvedValueOnce(new Error('Navigation aborted'))
    await button('Delete', wrapper.get('[role=dialog]') as any).trigger('click'); await flushPromises()
    expect(wrapper.find('[role=dialog]').exists()).toBe(false); expect(wrapper.get('[role=alert]').text()).toContain('deleted')
  })
  it('localizes avatar controls and destructive confirmation in Chinese', async () => {
    await localizationRuntime.setPreference('zh-CN'); await open(); expect(wrapper.get('[data-test=org-avatar-editor]').text()).toContain('上传')
    mocks.route.query = { view: 'org-detail', id: 'one' }; await flushPromises(); await button('删除').trigger('click')
    expect(wrapper.get('[role=dialog]').text()).toContain('共享'); expect(wrapper.get('[role=dialog]').text()).toContain('<img src=x> Research Org')
  })
})
