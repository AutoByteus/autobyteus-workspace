import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ApplicationCard from '../ApplicationCard.vue'

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'applications.components.applications.ApplicationCard.iconAlt': 'Application icon',
        'applications.components.applications.ApplicationCard.openDetails': 'Review setup',
        'applications.components.applications.ApplicationCard.continue': 'Open app →',
        'applications.components.applications.ApplicationCard.launchSetupLabel': 'Launch setup',
        'applications.components.applications.ApplicationCard.requiredSetupSummary': 'Confirm 1 required host-managed setup item before entering the app.',
        'applications.components.applications.ApplicationCard.optionalSetupSummary': 'Review optional host-managed setup before entering the app.',
        'applications.components.applications.ApplicationCard.openBusinessView': 'Open the app and continue in the business workflow.',
        'applications.shared.noDescriptionProvided': 'No description',
        'applications.shared.package': 'Package',
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
  it('keeps the primary card business-first and hides raw runtime resource labels', () => {
    const wrapper = mount(ApplicationCard, {
      props: {
        application: {
          id: 'bundle-app__pkg__brief-studio',
          packageId: 'pkg',
          localApplicationId: 'brief-studio',
          name: 'Brief Studio',
          description: 'Create and review briefs.',
          writable: true,
          iconAssetPath: null,
          resourceSlots: [
            {
              slotKey: 'draftingTeam',
              required: true,
            },
          ],
          bundleResources: [
            {
              kind: 'AGENT_TEAM',
              localId: 'drafting-team',
              definitionId: 'drafting-team',
            },
          ],
        },
      },
    })

    expect(wrapper.text()).toContain('Brief Studio')
    expect(wrapper.text()).toContain('Create and review briefs.')
    expect(wrapper.text()).toContain('Package')
    expect(wrapper.text()).toContain('Launch setup')
    expect(wrapper.text()).toContain('Confirm 1 required host-managed setup item before entering the app.')
    expect(wrapper.text()).not.toContain('drafting-team → drafting-team')
    expect(wrapper.text()).not.toContain('Agent team')
  })
})
