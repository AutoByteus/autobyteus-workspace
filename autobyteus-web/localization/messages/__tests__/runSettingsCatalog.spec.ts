import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import enMessages from '../en'
import zhCnMessages from '../zh-CN'
import enRunSettings from '../en/runSettings'
import zhCnRunSettings from '../zh-CN/runSettings'

// run-settings-ui-unification: the new copy is bilingual, and the superseded launch UI and its copy
// are gone (REQ-018, AC-012).
describe('run settings localization', () => {
  it('keeps the run-settings catalog in en/zh-CN parity and translated', () => {
    expect(Object.keys(zhCnRunSettings).sort()).toEqual(Object.keys(enRunSettings).sort())
    for (const key of ['chat.switch.search', 'chat.switch.orgs', 'chat.modelOption.default', 'chat.modelOption.toggleTitle', 'shell.startTools.show']) {
      expect(enMessages[key], key).toBeTruthy()
      expect(zhCnMessages[key], key).toBeTruthy()
    }
    expect(enRunSettings['runSettings.orgLaunch.failed']).toBe("Couldn't start this Agent Org. Try again.")
    expect(enMessages['chat.switch.search']).toBe('Search agents, teams and orgs')
  })

  it('no longer carries the removed copy', () => {
    const removedKeys = [
      'chat.new.hintTemp', 'chat.new.hintWorkspace', 'chat.new.teamNote', 'chat.targets.headerPrefix', 'chat.targets.footer',
      'workspace.agentOrg.runConfig.modelRequired', 'workspace.components.workspace.config.RunConfigPanel.runAgentButton',
      'workspace.components.workspace.config.AgentRunConfigForm.auto_approve_tools', 'workspace.runModelConfig.fixedRuntime',
    ]
    for (const key of removedKeys) {
      expect(enMessages[key], key).toBeUndefined()
      expect(zhCnMessages[key], key).toBeUndefined()
    }
    const english = Object.values(enMessages).join('\n')
    expect(english).not.toContain('Files are saved in')
    expect(english).not.toContain('Kept from the saved run')
    expect(english).not.toMatch(/Select a model for \{\{address\}\}/)
  })

  it('removed the superseded launch forms and the run-preparation composable', () => {
    for (const path of [
      'components/workspace/config/AgentRunConfigForm.vue', 'components/workspace/config/TeamRunConfigForm.vue',
      'components/workspace/config/AgentOrgRunConfigPanel.vue', 'components/workspace/config/AgentOrgRunConfigForm.vue',
      'components/workspace/config/DraftRunConfigEditor.vue', 'components/workspace/config/WorkspaceSelector.vue',
      'components/workspace/config/MemberOverrideItem.vue', 'composables/useRunActions.ts', 'stores/agentOrgRunConfigStore.ts',
      'components/workspace/running/RunningAgentsPanel.vue', 'components/workspace/running/AgentLibraryPanel.vue',
    ]) expect(existsSync(resolve(process.cwd(), path)), path).toBe(false)
  })
})
