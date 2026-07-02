import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TeamRunLaunchSummary from '../TeamRunLaunchSummary.vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import type { TeamRunLaunchSummaryPresentation } from '~/utils/teamRunConfigPresentation'
import type { SupportedLocale } from '~/localization/runtime/types'

const baseSummary = (memberOverrideTag: TeamRunLaunchSummaryPresentation['memberOverrideTag']): TeamRunLaunchSummaryPresentation => ({
  memberCount: 3,
  runtimeLabel: 'Codex App Server',
  modelIdentifier: 'gpt-5.4',
  autoApproveEnabled: true,
  workspace: { mode: 'existing', name: 'Temp Workspace' },
  memberOverrideTag,
})

const renderSummary = async (
  locale: SupportedLocale,
  memberOverrideTag: TeamRunLaunchSummaryPresentation['memberOverrideTag'],
) => {
  await localizationRuntime.setPreference(locale)
  return mount(TeamRunLaunchSummary, {
    props: {
      summary: baseSummary(memberOverrideTag),
    },
  })
}

describe('TeamRunLaunchSummary', () => {
  beforeEach(async () => {
    await localizationRuntime.setPreference('en')
  })

  afterEach(async () => {
    await localizationRuntime.setPreference('en')
  })

  it('renders a localized one-override tag with the member name', async () => {
    const wrapper = await renderSummary('en', {
      count: 1,
      routeKeys: ['program_manager'],
      visibleNames: ['program_manager'],
    })

    expect(wrapper.get('[data-test="team-run-launch-summary-overrides"]').text()).toBe('1 override: program_manager')
  })

  it('renders a localized two-override tag with both member names', async () => {
    const wrapper = await renderSummary('en', {
      count: 2,
      routeKeys: ['BuildSquad/review_lead', 'program_manager'],
      visibleNames: ['BuildSquad / review_lead', 'program_manager'],
    })

    expect(wrapper.get('[data-test="team-run-launch-summary-overrides"]').text()).toBe('2 overrides: BuildSquad / review_lead, program_manager')
  })

  it('renders a localized count-only tag for more than two overrides', async () => {
    const wrapper = await renderSummary('en', {
      count: 3,
      routeKeys: ['BuildSquad/qa_specialist', 'BuildSquad/review_lead', 'program_manager'],
      visibleNames: ['BuildSquad / qa_specialist', 'BuildSquad / review_lead'],
    })

    expect(wrapper.get('[data-test="team-run-launch-summary-overrides"]').text()).toBe('3 overrides')
  })

  it('renders the override tag through the Chinese catalog', async () => {
    const wrapper = await renderSummary('zh-CN', {
      count: 2,
      routeKeys: ['BuildSquad/review_lead', 'program_manager'],
      visibleNames: ['BuildSquad / review_lead', 'program_manager'],
    })

    expect(wrapper.get('[data-test="team-run-launch-summary-overrides"]').text()).toBe('2 个成员覆盖：BuildSquad / review_lead、program_manager')
  })

  it('emits route keys when the localized override tag is clicked', async () => {
    const wrapper = await renderSummary('en', {
      count: 1,
      routeKeys: ['BuildSquad/review_lead'],
      visibleNames: ['BuildSquad / review_lead'],
    })

    await wrapper.get('[data-test="team-run-launch-summary-overrides"]').trigger('click')

    expect(wrapper.emitted('focus-overrides')).toEqual([[['BuildSquad/review_lead']]])
  })
})
