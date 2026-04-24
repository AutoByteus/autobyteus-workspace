import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ApplicationCard from '../ApplicationCard.vue'

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'applications.components.applications.ApplicationCard.iconAlt': 'Application icon',
        'applications.components.applications.ApplicationCard.continue': 'Open app →',
        'applications.shared.noDescriptionProvided': 'No description',
      }
      return translations[key] ?? key
    },
  }),
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    getBoundEndpoints: () => ({
      rest: 'http://127.0.0.1:43123/rest',
    }),
  }),
}))

vi.mock('~/utils/application/applicationAssetUrl', () => ({
  resolveApplicationAssetUrl: () => 'http://127.0.0.1:43123/rest/assets/brief-studio.png',
}))

describe('ApplicationCard', () => {
  it('keeps the primary card business-first and hides technical metadata', () => {
    const wrapper = mount(ApplicationCard, {
      props: {
        application: {
          id: 'bundle-app__pkg__brief-studio',
          name: 'Brief Studio',
          description: 'Create and review briefs.',
          iconAssetPath: null,
          entryHtmlAssetPath: '/application-bundles/brief-studio/ui/index.html',
          resourceSlots: [
            {
              slotKey: 'draftingTeam',
              required: true,
            },
          ],
        },
      },
    })

    expect(wrapper.text()).toContain('Brief Studio')
    expect(wrapper.text()).toContain('Create and review briefs.')
    expect(wrapper.text()).not.toContain('Launch setup')
    expect(wrapper.text()).not.toContain('Confirm 1 required host-managed setup item before entering the app.')
    expect(wrapper.text()).not.toContain('Package')
    expect(wrapper.text()).not.toContain('brief-studio')
    expect(wrapper.text()).not.toContain('Agent team')
  })
})
