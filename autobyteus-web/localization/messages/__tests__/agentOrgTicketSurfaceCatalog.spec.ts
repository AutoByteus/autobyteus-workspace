import { describe, expect, it } from 'vitest'
import enAgentOrgMessages from '../en/agentOrgs'
import enAgentTeamMessages from '../en/agentTeams'
import enHandoffMessages from '../en/handoffs'
import enWorkspaceMessages from '../en/workspace'
import zhCnAgentOrgMessages from '../zh-CN/agentOrgs'
import zhCnAgentTeamMessages from '../zh-CN/agentTeams'
import zhCnHandoffMessages from '../zh-CN/handoffs'
import zhCnWorkspaceMessages from '../zh-CN/workspace'

describe('Agent Org ticket surface localization catalogs', () => {
  it('keeps every Agent Org management key complete in English and Simplified Chinese', () => {
    expect(Object.keys(zhCnAgentOrgMessages).sort()).toEqual(Object.keys(enAgentOrgMessages).sort())
    expect(enAgentOrgMessages).toMatchObject({
      'agentOrgs.experience.catalog.title': 'Agent Orgs',
      'agentOrgs.experience.catalog.emptyFiltered': 'No organizations matched “{{query}}”',
      'agentOrgs.experience.detail.back': 'Back to Agent Orgs',
      'agentOrgs.experience.form.memberAddedLabel': '{{name}} added',
      'agentOrgs.experience.form.handoffsInvalid': 'Resolve the highlighted handoffs before saving this Agent Org.',
    })
    expect(zhCnAgentOrgMessages).toMatchObject({
      'agentOrgs.experience.catalog.title': '智能体组织',
      'agentOrgs.experience.catalog.emptyFiltered': '没有与“{{query}}”匹配的智能体组织',
      'agentOrgs.experience.detail.back': '返回智能体组织',
      'agentOrgs.experience.form.memberAddedLabel': '已添加 {{name}}',
      'agentOrgs.experience.form.handoffsInvalid': '保存此智能体组织前，请先解决突出显示的交接规则问题。',
    })
  })

  it('keeps Agent Org launch, history, and return navigation copy bilingual', () => {
    const workspaceKeys = [
      'workspace.agentOrg.connecting',
      'workspace.agentOrg.history.workspaces',
      'workspace.agentOrg.history.running',
      'workspace.agentOrg.history.stopped',
      'workspace.agentOrg.history.newRun',
      'workspace.agentOrg.history.executionHierarchy',
      'workspace.agentOrg.history.taskLabel',
      'workspace.agentOrg.history.empty',
      'workspace.agentOrg.history.noWorkspace',
      'workspace.agentOrg.history.relativeNow',
      'workspace.agentOrg.history.relativeMinutes',
      'workspace.agentOrg.history.relativeHours',
      'workspace.agentOrg.history.relativeDays',
      'workspace.agentOrg.runConfig.runtimeHelp',
      'workspace.agentOrg.runConfig.modelLabel',
      'workspace.agentOrg.runConfig.modelHelp',
      'workspace.agentOrg.runConfig.loading',
      'workspace.agentOrg.runConfig.starting',
      'workspace.agentOrg.runConfig.run',
      'workspace.agentOrg.runConfig.workspaceUnavailable',
      'workspace.agentOrg.runConfig.workspacePathRequired',
      'workspace.agentOrg.runConfig.workspacePathUnavailable',
    ] as const

    for (const key of workspaceKeys) {
      expect(enWorkspaceMessages[key], key).toBeTruthy()
      expect(zhCnWorkspaceMessages[key], key).toBeTruthy()
      expect(zhCnWorkspaceMessages[key], key).not.toBe(enWorkspaceMessages[key])
    }

    const returnKey = 'agentTeams.components.agentTeams.AgentTeamDetail.backToAgentOrgs'
    expect(enAgentTeamMessages[returnKey]).toBe('Back to Agent Orgs')
    expect(zhCnAgentTeamMessages[returnKey]).toBe('返回智能体组织')
  })

  it('keeps shared handoff authoring chrome and feedback complete in both catalogs', () => {
    expect(Object.keys(zhCnHandoffMessages).sort()).toEqual(Object.keys(enHandoffMessages).sort())
    expect(enHandoffMessages).toMatchObject({
      'handoffs.manager.title': 'Handoffs',
      'handoffs.manager.actions.add': 'Add handoff',
      'handoffs.manager.groups.teamAgents': 'Team Agents',
      'handoffs.manager.validation.chooseSource': 'Choose a source Agent.',
      'handoffs.manager.validation.resolveAffectedOne': 'Resolve {{count}} affected handoff before saving.',
    })
    expect(zhCnHandoffMessages).toMatchObject({
      'handoffs.manager.title': '交接规则',
      'handoffs.manager.actions.add': '添加交接规则',
      'handoffs.manager.groups.teamAgents': '团队智能体',
      'handoffs.manager.validation.chooseSource': '请选择来源智能体。',
      'handoffs.manager.validation.resolveAffectedOne': '保存前，请解决 {{count}} 条受影响的交接规则。',
    })
  })
})
