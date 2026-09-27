import { describe, expect, it } from 'vitest'
import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import { existingRunModelHelpKey } from '../existingRunModelHelp'
import { autoExecuteForNewRuntimeSelection, withNewRuntimeOverridePolicy } from '../agentRunRuntimeDraftPolicy'
import { getSystemInstructionSourceKey } from '~/services/activity/runActivityPresentation'
import { createTokenUsageStatisticsFormatter } from '~/components/settings/token-usage/tokenUsageStatisticsUi'
import en from '~/localization/messages/en/workspace'
import zhCN from '~/localization/messages/zh-CN/workspace'

describe('Grok Build runtime presentation', () => {
  it('labels the runtime and its token usage as Grok Build', () => {
    expect(runtimeKindToLabel('grok_build')).toBe('Grok Build')
    expect(createTokenUsageStatisticsFormatter((key) => key).formatRuntimeKind('grok_build')).toBe('Grok Build')
  })

  it('uses external-runtime model help and a Grok system-instruction source in both locales', () => {
    expect(existingRunModelHelpKey('grok_build')).toBe('workspace.runModelConfig.externalModelHelp')
    expect(getSystemInstructionSourceKey('grok_build')).toBe('grok')
    const key = 'workspace.components.progress.SystemInstructionActivityItem.source.grok'
    expect((en as Record<string, string>)[key]).toBe('AutoByteus-supplied · Grok Build rules')
    expect((zhCN as Record<string, string>)[key]).toBeTruthy()
  })

  it('keeps the standard auto-execute default (the Antigravity-only policy does not apply)', () => {
    expect(autoExecuteForNewRuntimeSelection('grok_build', false)).toBe(false)
    expect(withNewRuntimeOverridePolicy(null, { runtimeKind: 'grok_build', autoExecuteTools: false }))
      .toEqual({ runtimeKind: 'grok_build', autoExecuteTools: false })
  })
})
