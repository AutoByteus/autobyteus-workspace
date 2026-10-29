import { describe, expect, it } from 'vitest';

import zhCnAgentsMessages from '../zh-CN/agents';
import zhCnAgentTeamsMessages from '../zh-CN/agentTeams';
import zhCnMessages from '../zh-CN';

describe('zh-CN action-label consistency', () => {
  it('keeps shared run and action labels translated in the swept catalogs', () => {
    expect(zhCnAgentsMessages['agents.components.agents.AgentCard.run']).toBe('运行');
    expect(zhCnAgentTeamsMessages['agentTeams.components.agentTeams.AgentTeamCard.run']).toBe('运行');
    expect(zhCnMessages['runSettings.orgLaunch.run']).toBe('运行');
    // one-nodes-tab: the Nodes page's labels moved to the NodesPage catalog (Open and Rename are icon and name actions now).
    expect(zhCnMessages['settings.components.settings.NodesPage.add.submit']).toBe('添加节点');
    expect(zhCnMessages['settings.components.settings.NodesPage.dialog.confirmRemove']).toBe('移除');
    expect(zhCnMessages['settings.components.settings.TokenUsageStatistics.fetchStatistics']).toBe('获取统计数据');
  });
});
