import { describe, expect, it } from 'vitest'
import { agentRuntimeName } from '@autobyteus/agent-presentation-contracts'
import { existingRunModelHelpKey } from '../existingRunModelHelp'
import { getSystemInstructionSourceKey } from '~/services/activity/runActivityPresentation'
import { runtimeColor } from '~/components/settings/model-routing/modelRoutingPresentation'
import en from '~/localization/messages/en/workspace'
import zhCN from '~/localization/messages/zh-CN/workspace'

describe('DeepSeek Harness runtime presentation', () => {
  it('names the runtime, gives it its own colour and external-runtime model help', () => {
    expect(agentRuntimeName('deepseek_harness')).toBe('DeepSeek Harness')
    expect(runtimeColor('deepseek_harness')).toBe('#4d6bfe')
    expect(existingRunModelHelpKey('deepseek_harness')).toBe('workspace.runModelConfig.externalModelHelp')
  })

  it('names its system-instruction source in both locales', () => {
    expect(getSystemInstructionSourceKey('deepseek_harness')).toBe('deepseekHarness')
    const key = 'workspace.components.progress.SystemInstructionActivityItem.source.deepseekHarness'
    expect((en as Record<string, string>)[key]).toBe('AutoByteus-supplied · DeepSeek Harness instructions plugin')
    expect((zhCN as Record<string, string>)[key]).toBeTruthy()
  })
})
