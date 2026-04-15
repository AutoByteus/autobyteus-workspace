import { describe, expect, it } from 'vitest';

import zhCnAgentTeamsMessages from '../zh-CN/agentTeams.generated';
import zhCnAgentsMessages from '../zh-CN/agents.generated';
import zhCnApplicationsMessages from '../zh-CN/applications.generated';
import zhCnMemoryMessages from '../zh-CN/memory.generated';
import zhCnSettingsGeneratedMessages from '../zh-CN/settings.generated';
import zhCnSettingsMessages from '../zh-CN/settings';
import zhCnShellGeneratedMessages from '../zh-CN/shell.generated';
import zhCnShellMessages from '../zh-CN/shell';
import zhCnToolsMessages from '../zh-CN/tools.generated';
import zhCnWorkspaceMessages from '../zh-CN/workspace.generated';

const scopedCatalogs = {
  shell: zhCnShellMessages,
  shellGenerated: zhCnShellGeneratedMessages,
  settings: zhCnSettingsMessages,
  settingsGenerated: zhCnSettingsGeneratedMessages,
  agents: zhCnAgentsMessages,
  agentTeams: zhCnAgentTeamsMessages,
  workspace: zhCnWorkspaceMessages,
  memory: zhCnMemoryMessages,
  applications: zhCnApplicationsMessages,
  tools: zhCnToolsMessages,
};

const deprecatedGlossary = ['代理', '经纪人', '特工团队', '工作空间', '跑步', '队伍', '会员', '球队'];

describe('zh-CN glossary consistency', () => {
  it('keeps shared agent and team terminology aligned with the approved glossary', () => {
    expect(zhCnShellMessages['shell.navigation.agents']).toBe('智能体');
    expect(zhCnShellMessages['shell.navigation.agentTeams']).toBe('智能体团队');
    expect(zhCnSettingsMessages['settings.page.sections.applicationPackages']).toBe('应用包');
    expect(zhCnSettingsMessages['settings.page.sections.agentPackages']).toBe('智能体包');
    expect(zhCnSettingsGeneratedMessages['settings.components.settings.messaging.ChannelBindingSetupCard.agent_definition']).toBe('智能体定义');
    expect(zhCnAgentsMessages['agents.pages.agents.go_to_agents']).toBe('前往智能体');
    expect(zhCnAgentTeamsMessages['agentTeams.pages.agent_teams.go_to_agent_teams']).toBe('前往智能体团队');
    expect(zhCnWorkspaceMessages['workspace.components.workspace.common.WorkspaceHeaderActions.new_agent']).toBe('新建智能体');
    expect(zhCnMemoryMessages['memory.components.memory.MemoryIndexPanel.team_runs']).toBe('团队运行');
    expect(zhCnApplicationsMessages['applications.components.applications.ApplicationLaunchConfigModal.default_model_for_all_agents']).toBe('默认模型（适用于所有智能体）');
    expect(zhCnToolsMessages['tools.components.fileExplorer.FileExplorer.no_workspaces_available_add_a_workspace']).toBe('没有可用的工作区。添加工作区以查看文件。');
  });

  it('does not retain deprecated glossary in the swept shared-product catalogs', () => {
    for (const [catalogName, catalog] of Object.entries(scopedCatalogs)) {
      for (const [key, value] of Object.entries(catalog)) {
        for (const term of deprecatedGlossary) {
          expect(`${catalogName}:${key}:${value}`).not.toContain(term);
        }
      }
    }
  });
});
