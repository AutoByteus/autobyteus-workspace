import { describe, expect, it } from 'vitest'
import enAgentTeamMessages from '../en/agentTeams'
import enWorkspaceMessages from '../en/workspace'
import zhCnAgentTeamMessages from '../zh-CN/agentTeams'
import zhCnWorkspaceMessages from '../zh-CN/workspace'

const agentTeamCopy = {
  'agentTeams.components.agentTeams.AgentTeamDefinitionForm.dropAgentsHere': [
    'Drop Agents here to add them to this Team',
    '将智能体拖到此处以添加到该团队',
  ],
  'agentTeams.components.agentTeams.form.AgentTeamLibraryPanel.title': ['Agent Library', '智能体库'],
  'agentTeams.components.agentTeams.form.AgentTeamLibraryPanel.searchPlaceholder': ['Search Agents', '搜索智能体'],
  'agentTeams.components.agentTeams.form.AgentTeamLibraryPanel.agentsHeading': ['Agents', '智能体'],
  'agentTeams.components.agentTeams.form.AgentTeamLibraryPanel.agentBadge': ['AGENT', '智能体'],
  'agentTeams.components.agentTeams.form.AgentTeamLibraryPanel.emptyState': ['No Agents found.', '未找到智能体。'],
  'agentTeams.components.agentTeams.form.AgentTeamLibraryPanel.flatTeamHint': [
    'Drag Agents into the Team canvas. Teams cannot contain Teams.',
    '将智能体拖到团队画布中。团队不能包含团队。',
  ],
} as const

const agentOrgCopy = {
  'workspace.agentOrg.activeUnfocused.title': ['Choose an Agent or Team', '选择智能体或团队'],
  'workspace.agentOrg.activeUnfocused.description': [
    'Select a member from the active Agent Org in the sidebar. Teams focus their coordinator first.',
    '请从侧栏中的当前智能体组织选择成员。选择团队时会先聚焦其协调者。',
  ],
  'workspace.agentOrg.history.refreshLabel': ['Refresh Agent Org history', '刷新智能体组织历史记录'],
  'workspace.agentOrg.history.collectionLabel': ['Orgs', '组织'],
  'workspace.agentOrg.history.stopLabel': ['Stop Agent Org', '停止智能体组织'],
  'workspace.agentOrg.runConfig.orgLabel': ['Agent Org', '智能体组织'],
  'workspace.agentOrg.runConfig.autoApprove': ['Auto approve tools', '自动批准工具'],
  'workspace.agentOrg.runConfig.autoApproveHelp': [
    'Automatically allows tool calls and access requests for this run.',
    '自动允许本次运行中的工具调用和访问请求。',
  ],
  'workspace.agentOrg.runConfig.workspaceRequired': [
    'Workspace is required to run an Agent Org.',
    '运行智能体组织需要工作区。',
  ],
} as const

describe('flat Team and AgentOrg localization catalogs', () => {
  it('keeps the audited product copy complete in English and Simplified Chinese', () => {
    for (const key of Object.keys(agentTeamCopy) as Array<keyof typeof agentTeamCopy>) {
      const [english, simplifiedChinese] = agentTeamCopy[key]
      expect(enAgentTeamMessages[key]).toBe(english)
      expect(zhCnAgentTeamMessages[key]).toBe(simplifiedChinese)
    }
    for (const key of Object.keys(agentOrgCopy) as Array<keyof typeof agentOrgCopy>) {
      const [english, simplifiedChinese] = agentOrgCopy[key]
      expect(enWorkspaceMessages[key]).toBe(english)
      expect(zhCnWorkspaceMessages[key]).toBe(simplifiedChinese)
    }
  })
})
