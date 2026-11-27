import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MessagePrimaryActionButton from '../MessagePrimaryActionButton.vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'

// autobyteus-541 D-D1 (REQ-006, AC-007): the composer button's labels follow the app's language.
describe('MessagePrimaryActionButton labels', () => {
  afterEach(async () => { await localizationRuntime.setPreference('en') })

  it.each([
    ['en', 'send', 'Send message'],
    ['en', 'interrupt', 'Stop generation'],
    ['zh-CN', 'send', '发送消息'],
    ['zh-CN', 'interrupt', '停止生成'],
  ] as const)('%s %s reads "%s"', async (locale, kind, label) => {
    await localizationRuntime.setPreference(locale)
    const wrapper = mount(MessagePrimaryActionButton, { props: { kind, disabled: false } })
    await flushPromises()
    expect(wrapper.get('button').attributes('aria-label')).toBe(label)
    expect(wrapper.get('button').attributes('title')).toBe(label)
  })

  it('keeps a given title (a blocking reason) in place of the label', async () => {
    await localizationRuntime.setPreference('zh-CN')
    const wrapper = mount(MessagePrimaryActionButton, { props: { kind: 'send', disabled: true, title: 'Uploading…' } })
    expect(wrapper.get('button').attributes('aria-label')).toBe('Uploading…')
  })
})
