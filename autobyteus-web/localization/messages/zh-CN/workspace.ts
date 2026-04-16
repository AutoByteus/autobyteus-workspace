import type { TranslationCatalog } from '../../runtime/types';

const messages = {
  'workspace.components.workspace.config.RunConfigPanel.runTeamButton': '运行团队',
  'workspace.components.workspace.config.RunConfigPanel.runAgentButton': '运行智能体',
  'workspace.components.workspace.config.RunConfigPanel.title.agentConfiguration': '智能体配置',
  'workspace.components.workspace.config.RunConfigPanel.title.newAgentConfiguration': '新建智能体配置',
  'workspace.components.workspace.config.RunConfigPanel.title.teamConfiguration': '团队配置',
  'workspace.components.workspace.config.RunConfigPanel.title.newTeamConfiguration': '新建团队配置',
  'workspace.components.workspace.config.RunConfigPanel.title.configuration': '配置',
  'workspace.components.workspace.running.RunningRunRow.defaultAgentName': '智能体',
  'workspace.components.workspace.running.RunningRunRow.newRunLabel': '新建 - {{name}}',
  'workspace.components.workspace.running.AgentLibraryPanel.agentsHeading': '智能体',
  'workspace.components.workspace.running.AgentLibraryPanel.teamsHeading': '团队',
  'workspace.components.workspace.running.AgentLibraryPanel.noDescription': '暂无描述',
  'workspace.components.workspace.agent.ArtifactContentViewer.content_not_available_yet': '内容暂不可用',
  'workspace.components.workspace.agent.ArtifactContentViewer.preview_unavailable': '暂不支持预览',
  'workspace.components.workspace.agent.ArtifactContentViewer.failed_before_final_content_could_be_captured': '该文件变更在服务器捕获最终内容之前已失败。',
  'workspace.components.workspace.agent.ArtifactContentViewer.file_change_will_become_viewable_after_the_edit_completes': '该文件变更会在编辑完成且服务器捕获最终内容后变为可查看。',
  'workspace.components.workspace.agent.ArtifactContentViewer.preview_is_currently_available_only_for_text_file_changes': '当前仅支持文本文件变更预览。',
  'workspace.components.workspace.agent.ArtifactContentViewer.file_change_is_still_pending_server_side_capture': '该文件变更仍在等待服务器端捕获。',
  'workspace.components.workspace.agent.ArtifactContentViewer.failed_to_fetch_artifact_content': '获取工件内容失败',
  'workspace.components.launchConfig.DefinitionLaunchPreferencesSection.title': 'LLM 配置',
  'workspace.components.launchConfig.DefinitionLaunchPreferencesSection.help': '可选的运行时、模型和 LLM 设置。',
  'workspace.components.launchConfig.DefinitionLaunchPreferencesSection.clear': '清除配置',
  'workspace.components.launchConfig.DefinitionLaunchPreferencesSection.blankRuntime': '启动时再选择',
  'workspace.components.launchConfig.RuntimeModelConfigFields.runtimeLabel': '运行时',
  'workspace.components.launchConfig.RuntimeModelConfigFields.modelLabel': '模型',
  'workspace.components.launchConfig.RuntimeModelConfigFields.modelPlaceholder': '选择模型',
} satisfies TranslationCatalog;

export default messages;
