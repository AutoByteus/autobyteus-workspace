import { describe, expect, it } from 'vitest';

import zhCnAgentsMessages from '../zh-CN/agents';
import zhCnAgentTeamsMessages from '../zh-CN/agentTeams';
import zhCnSettingsMessages from '../zh-CN/settings';
import zhCnWorkspaceMessages from '../zh-CN/workspace';

describe('zh-CN action-label consistency', () => {
  it('keeps shared run and action labels translated in the swept catalogs', () => {
    expect(zhCnAgentsMessages['agents.components.agents.AgentCard.run']).toBe('运行');
    expect(zhCnAgentTeamsMessages['agentTeams.components.agentTeams.AgentTeamCard.run']).toBe('运行');
    expect(zhCnWorkspaceMessages['workspace.components.workspace.config.RunConfigPanel.runAgentButton']).toBe('运行智能体');
    expect(zhCnWorkspaceMessages['workspace.components.workspace.config.RunConfigPanel.runTeamButton']).toBe('运行团队');
    expect(zhCnSettingsMessages['settings.components.settings.NodeManager.addNode']).toBe('添加节点');
    expect(zhCnSettingsMessages['settings.components.settings.NodeManager.open']).toBe('打开');
    expect(zhCnSettingsMessages['settings.components.settings.NodeManager.rename']).toBe('重命名');
    expect(zhCnSettingsMessages['settings.components.settings.NodeManager.remove']).toBe('移除');
    expect(zhCnSettingsMessages['settings.components.settings.TokenUsageStatistics.fetchStatistics']).toBe('获取统计数据');
  });
});
