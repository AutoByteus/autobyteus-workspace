import type { TranslationCatalog } from "../../runtime/types";

const messages = {
  "workspace.components.conversation.SkillRequestChips.sentToTheAgentAs": "发送给智能体的内容",
  "fileExplorer.workspaceUnavailable": "工作目录信息暂不可用。请刷新或重新打开设置以加载已保存的工作目录。",
  "workspace.teamCopy.loading": "正在读取已保存的团队配置…",
  "workspace.runModelConfig.modelRequired": "启动前请选择模型。",
  "workspace.runModelConfig.orgOwnershipUnavailable": "此组织运行由应用管理，无法在此编辑模型设置。",
  "workspace.agentOrg.inspectionUnavailable": "无法读取已保存的智能体组织数据。未启动任何运行。",
  "workspace.runModelConfig.loading": "正在加载运行配置…",
  "workspace.runModelConfig.loadingModels": "正在加载模型选项…",
  "workspace.runModelConfig.catalogError": "无法加载模型选项。已保存的设置未更改。",
  "workspace.runModelConfig.selectedModelUnavailable": "所选模型在当前运行时中不可用。",
  "workspace.runModelConfig.retry": "重试",
  "workspace.runModelConfig.noAdjustableSettings": "此模型没有可调整的设置。",
  "workspace.runModelConfig.schemaUnavailable": "当前架构无法表示已保存的模型设置。",
  "workspace.runModelConfig.nativeModelHelp": "请选择已验证且上下文容量不小于已保存模型的模型。",
  "workspace.runModelConfig.externalModelHelp": "可选择此运行时提供的任意模型。恢复运行时由该运行时处理上下文限制。",
  "workspace.runModelConfig.unknownModelHelp": "此运行时的替换模型不可用。",
  "workspace.runModelConfig.loadingOptions": "正在加载替换模型…",
  "workspace.runModelConfig.optionsUnavailable": "运行时模型选项暂不可用。请刷新此运行后重试；已保存的模型标识仍可查看。",
  "workspace.runModelConfig.replacementInvalid": "此替换模型已不再提供或不符合条件。保存前请刷新选项。",
  "workspace.runModelConfig.noNativeReplacements": "没有已验证的上下文容量相等或更大的替换模型。",
  "workspace.runModelConfig.noCatalogReplacements": "此运行时目前未提供其他模型。",
  "workspace.runModelConfig.validation.required": "此项为必填项。",
  "workspace.runModelConfig.validation.type": "请输入 {expected} 类型的值。",
  "workspace.runModelConfig.validation.enum": "请选择支持的选项。",
  "workspace.runModelConfig.validation.minimum": "值不得小于 {expected}。",
  "workspace.runModelConfig.validation.maximum": "值不得大于 {expected}。",
  "workspace.runModelConfig.validation.pattern": "值不符合所需格式。",
  "workspace.runModelConfig.validation.schema_pattern": "当前模型架构包含无效的格式规则。",
  "workspace.runModelConfig.thinkingAdvancedOnly": "请使用下方的模型设置来控制思考。",
  "workspace.components.workspace.team.TeamWorkspaceView.stream_recovery_required":
    "团队实时更新已不同步。请等待团队完成当前工作，然后再次选择此团队成员以重新加载完整对话。",
  "workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.stream_recovery_wait":
    "该团队仍在工作。请等待其完成，然后再次选择此团队成员。",
  "workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.stream_recovery_retry":
    "重新加载对话时团队活动发生了变化。请再次选择此团队成员以重试。",
  "workspace.agentOrg.recovery.exhausted":
    "实时更新无法自动恢复。请重新选择此智能体组织，以重新加载经过验证的完整对话。",
  "workspace.agentOrg.connecting": "正在连接智能体组织…",
  "workspace.agentOrg.stoppedHistory.title": "已停止的智能体组织",
  "workspace.agentOrg.stoppedHistory.description":
    "请从侧栏中的历史运行选择成员，以从其保存状态继续。",
  "workspace.agentOrg.activeUnfocused.title": "选择智能体或团队",
  "workspace.agentOrg.activeUnfocused.description":
    "请从侧栏中的当前智能体组织选择成员。选择团队时会先聚焦其协调者。",
  "workspace.agentOrg.history.refreshLabel": "刷新智能体组织历史记录",
  "workspace.collaboration.identity.details": "参与者详情",
  "workspace.collaboration.identity.address": "地址",
  "workspace.collaboration.identity.agentRun": "智能体运行",
  "workspace.collaboration.identity.hostRun": "宿主运行",
  "workspace.collaboration.identity.executionRun": "执行运行",
  "workspace.collaboration.identity.teamRun": "团队运行",
  "workspace.agentOrg.history.collectionLabel": "组织",
  "workspace.agentOrg.history.stopLabel": "停止智能体组织",
  "workspace.agentOrg.history.archiveLabel": "归档智能体组织历史记录",
  "workspace.agentOrg.history.deleteLabel": "永久删除智能体组织历史记录",
  "workspace.agentOrg.history.deleteConfirmation": "要永久删除此智能体组织历史记录吗？此操作仅删除本次运行，且无法撤销。",
  "workspace.agentOrg.history.archived": "智能体组织历史记录已归档。",
  "workspace.agentOrg.history.archiveFailed": "无法归档智能体组织历史记录，请重试。",
  "workspace.agentOrg.history.deleted": "智能体组织历史记录已永久删除。",
  "workspace.agentOrg.history.deleteFailed": "无法删除智能体组织历史记录，请重试。",
  "workspace.agentOrg.history.navigationCleanupFailed": "智能体组织历史记录已更改，但工作区无法离开已移除的运行。请选择其他项目继续。",
  "workspace.agentOrg.history.workspaces": "工作区",
  "workspace.agentOrg.history.running": "运行中",
  "workspace.agentOrg.history.stopped": "已停止",
  "workspace.agentOrg.history.newRun": "新建 - {{name}}",
  "workspace.agentOrg.history.expandRun": "展开 {{name}} 下的成员",
  "workspace.agentOrg.history.collapseRun": "折叠 {{name}} 下的成员",
  "workspace.agentOrg.history.executionHierarchy": "{{name}} 执行层级",
  "workspace.agentOrg.history.empty": "暂无智能体组织运行历史记录。",
  "workspace.agentOrg.history.noWorkspace": "无工作区",
  "workspace.agentOrg.history.relativeNow": "刚刚",
  "workspace.agentOrg.history.relativeMinutes": "{{count}} 分钟",
  "workspace.agentOrg.history.relativeHours": "{{count}} 小时",
  "workspace.agentOrg.history.relativeDays": "{{count}} 天",
  "workspace.agentOrg.runConfig.orgLabel": "智能体组织",
  "workspace.components.conversation.segments.renderer.MermaidDiagram.expand_diagram":
    "放大图表",
  "workspace.components.conversation.segments.renderer.MermaidDiagram.viewer":
    "图表查看器",
  "workspace.components.conversation.segments.renderer.MermaidDiagram.zoom_out":
    "缩小",
  "workspace.components.conversation.segments.renderer.MermaidDiagram.zoom_in":
    "放大",
  "workspace.components.conversation.segments.renderer.MermaidDiagram.fit_diagram":
    "适应窗口",
  "workspace.components.conversation.segments.renderer.MermaidDiagram.close_viewer":
    "关闭图表查看器",
  "workspace.components.conversation.segments.renderer.MarkdownRenderer.open_file":
    "在文件中打开 {{file}}",
  "workspace.components.conversation.segments.renderer.MarkdownRenderer.file_available_on_host":
    "此文件仅在主机工作区中可用。",
  "workspace.components.conversation.segments.renderer.MarkdownRenderer.file_preview_failed":
    "无法打开文件预览。",
  "workspace.components.workspace.config.RunConfigPanel.title.agentConfiguration":
    "智能体配置",
  "workspace.components.workspace.config.RunConfigPanel.title.teamConfiguration":
    "团队配置",
  "workspace.components.workspace.config.RunConfigPanel.title.configuration":
    "配置",
  "workspace.components.workspace.config.TeamRunConfigForm.member_overrides_count":
    "{{count}} 个已覆盖",
  "workspace.components.workspace.config.TeamScopeConfigEditor.customized": "已自定义",
  "workspace.components.workspace.config.TeamScopeConfigEditor.inherited": "已继承",
  "workspace.components.progress.CompactionActivityItem.memory_compaction":
    "记忆压缩",
  "workspace.components.progress.BackgroundTaskPanel.title":
    "后台任务",
  "workspace.components.progress.BackgroundTaskPanel.counts":
    "{{running}} 个运行中 · 共 {{total}} 个",
  "workspace.components.progress.BackgroundTaskPanel.empty":
    "没有后台任务",
  "workspace.components.progress.BackgroundTaskPanel.untitled":
    "后台任务",
  "workspace.components.progress.BackgroundTaskPanel.kind.shell":
    "命令行",
  "workspace.components.progress.BackgroundTaskPanel.kind.subagent":
    "子智能体",
  "workspace.components.progress.BackgroundTaskPanel.kind.monitor":
    "监视器",
  "workspace.components.progress.BackgroundTaskPanel.kind.workflow":
    "工作流",
  "workspace.components.progress.BackgroundTaskPanel.kind.other":
    "任务",
  "workspace.components.progress.BackgroundTaskPanel.status.running":
    "运行中",
  "workspace.components.progress.BackgroundTaskPanel.status.completed":
    "已完成",
  "workspace.components.progress.BackgroundTaskPanel.status.failed":
    "失败",
  "workspace.components.progress.BackgroundTaskPanel.status.stopped":
    "已停止",
  "workspace.components.progress.SystemInstructionActivityItem.title":
    "系统指令",
  "workspace.components.progress.SystemInstructionActivityItem.available":
    "可用",
  "workspace.components.progress.SystemInstructionActivityItem.character_count":
    "{{count}} 个字符",
  "workspace.components.progress.SystemInstructionActivityItem.captured_at":
    "捕获于 {{time}}",
  "workspace.components.progress.SystemInstructionActivityItem.aria_label":
    "{{title}}。{{source}}。{{availability}}。捕获于 {{time}}。{{count}} 个字符。",
  "workspace.components.progress.SystemInstructionActivityItem.source.native":
    "由 AutoByteus 提供 · Native 已配置系统提示词",
  "workspace.components.progress.SystemInstructionActivityItem.source.claude":
    "由 AutoByteus 提供 · Claude SDK systemPrompt",
  "workspace.components.progress.SystemInstructionActivityItem.source.codex":
    "由 AutoByteus 提供 · Codex baseInstructions",
  "workspace.components.progress.SystemInstructionActivityItem.source.grok":
    "由 AutoByteus 提供 · Grok Build rules",
  "workspace.components.progress.SystemInstructionActivityItem.source.unknown":
    "由 AutoByteus 提供的系统指令",
  "workspace.components.workspace.team.TeamOverviewPanel.messages": "消息",
  "workspace.components.workspace.team.TeamOverviewPanel.messages_count":
    "消息",
  "workspace.components.workspace.team.TeamCommunicationPanel.sent_messages":
    "已发送",
  "workspace.components.workspace.team.TeamCommunicationPanel.received_messages":
    "已接收",
  "workspace.components.workspace.team.TeamCommunicationPanel.to_counterpart":
    "发送给",
  "workspace.components.workspace.team.TeamCommunicationPanel.from_counterpart":
    "来自",
  "workspace.components.workspace.team.TeamCommunicationPanel.unknown_teammate":
    "未知队友",
  "workspace.components.workspace.team.TeamCommunicationPanel.no_focused_member":
    "请选择团队成员以查看沟通记录。",
  "workspace.components.workspace.team.TeamCommunicationPanel.empty_title":
    "暂无团队消息",
  "workspace.components.workspace.team.TeamCommunicationPanel.empty_detail":
    "已接受的智能体间消息及其引用文件会显示在这里。",
  "workspace.components.workspace.team.TeamCommunicationPanel.select_message":
    "选择一条消息以查看完整内容。",
  "workspace.components.workspace.team.TeamCommunicationPanel.loading_reference":
    "正在加载引用文件...",
  "workspace.components.workspace.team.TeamCommunicationPanel.reference_unavailable":
    "引用文件不可用",
  "workspace.components.workspace.team.TeamCommunicationPanel.reference_unavailable_detail":
    "文件可能已被删除、移动或变为不可读。",
  "workspace.components.workspace.team.TeamCommunicationPanel.preview": "预览",
  "workspace.components.workspace.team.TeamCommunicationPanel.raw": "原文",
  "workspace.components.workspace.team.TeamCommunicationPanel.maximize_view":
    "最大化查看",
  "workspace.components.workspace.team.TeamCommunicationPanel.restore_view":
    "恢复视图",
  "workspace.components.workspace.team.TeamCommunicationPanel.represents_subteam":
    "代表",
  "workspace.components.workspace.team.TeamCommunicationPanel.reference_count_label":
    "{{count}} 个引用文件",
  "workspace.components.workspace.team.TeamCommunicationPanel.show_all_references":
    "显示全部 {{count}} 个文件",
  "workspace.components.workspace.team.AgentTeamEventMonitor.focused_subteam":
    "当前聚焦的子团队",
  "workspace.components.workspace.team.AgentTeamEventMonitor.no_activity_yet":
    "还没有活动。",
  "workspace.components.workspace.team.TeamMembersPanel.team_members":
    "团队名册",
  "workspace.components.workspace.team.TeamMembersPanel.no_active_team_members":
    "没有团队名册成员。",
  "workspace.components.workspace.team.TeamMembersPanel.roster_non_execution_note":
    "逻辑成员名册，不代表活跃任务执行。",
  "workspace.components.workspace.team.TeamTaskAgentActivityBar.active_task_agents":
    "活跃任务智能体",
  "workspace.components.workspace.team.TeamTaskAgentActivityBar.task_agent_badge":
    "任务智能体",
  "workspace.components.workspace.team.TeamTaskAgentActivityBar.approval_required":
    "需要审批",
  "workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.temporary_execution_title":
    "临时任务执行",
  "workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_running":
    "团队状态：运行中",
  "workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_initializing":
    "团队状态：正在初始化",
  "workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_error":
    "团队状态：错误",
  "workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_idle":
    "团队状态：空闲",
  "workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_offline":
    "团队状态：离线",
  "workspace.history.hierarchy.tree_label": "{{name}}组织树",
  "workspace.history.hierarchy.role.agent_team": "智能体团队",
  "workspace.history.hierarchy.role.agent": "智能体",
  "workspace.history.hierarchy.role.temporary_task_team": "临时任务团队",
  "workspace.history.hierarchy.role.temporary_task_agent": "临时任务智能体",
  "workspace.history.hierarchy.identity": "{{role}} · {{name}} · {{address}}",
  "workspace.history.hierarchy.tree_item": "{{role}}，{{name}}，第 {{level}} 级，{{status}}，{{address}}",
  "workspace.history.hierarchy.expand": "展开{{name}}",
  "workspace.history.hierarchy.collapse": "折叠{{name}}",
  "workspace.history.hierarchy.status.running": "运行中",
  "workspace.history.hierarchy.status.initializing": "正在初始化",
  "workspace.history.hierarchy.status.error": "错误",
  "workspace.history.hierarchy.status.idle": "空闲",
  "workspace.history.hierarchy.status.offline": "离线",
  "workspace.members.started_by": "由 {{name}} 启动",
  "workspace.task_monitor.loading": "正在加载活动…",
  "workspace.task_monitor.load_error": "无法加载活动。",
  "workspace.task_monitor.retry": "重试",
  "workspace.task_monitor.retry_accessible": "重试加载活动",
  "workspace.components.workspace.team.TeamWorkspaceView.send_subteam_placeholder":
    "向此子团队发送消息",
  "workspace.components.workspace.team.TeamWorkspaceView.send_to_subteam":
    "发送给子团队",
  "workspace.components.workspace.agent.ArtifactContentViewer.content_not_available_yet":
    "内容暂不可用",
  "workspace.components.workspace.agent.ArtifactContentViewer.preview_unavailable":
    "暂不支持预览",
  "workspace.components.workspace.agent.ArtifactContentViewer.failed_before_final_content_could_be_captured":
    "该文件变更在服务器捕获最终内容之前已失败。",
  "workspace.components.workspace.agent.ArtifactContentViewer.file_change_will_become_viewable_after_the_edit_completes":
    "该文件变更会在编辑完成且服务器捕获最终内容后变为可查看。",
  "workspace.components.workspace.agent.ArtifactContentViewer.preview_is_currently_available_only_for_text_file_changes":
    "当前仅支持文本文件变更预览。",
  "workspace.components.workspace.agent.ArtifactContentViewer.file_change_is_still_pending_server_side_capture":
    "该文件变更仍在等待服务器端捕获。",
  "workspace.components.workspace.agent.ArtifactContentViewer.failed_to_fetch_artifact_content":
    "获取工件内容失败",
  "workspace.components.workspace.agent.ArtifactList.agent_artifacts":
    "智能体产物",
  "workspace.components.workspace.agent.AgentConversationFeed.jump_to_latest":
    "跳到最新动态",
  "workspace.components.workspace.agent.AgentConversationFeed.retry_earlier":
    "重试",
  "workspace.components.workspace.tools.Terminal.retry_workspace_load":
    "重试加载工作区",
  "workspace.components.launchConfig.DefinitionLaunchPreferencesSection.title":
    "LLM 配置",
  "workspace.components.launchConfig.DefinitionLaunchPreferencesSection.help":
    "可选的运行时、模型和 LLM 设置。",
  "workspace.components.launchConfig.DefinitionLaunchPreferencesSection.clear":
    "清除配置",
  "workspace.components.launchConfig.DefinitionLaunchPreferencesSection.blankRuntime":
    "启动时再选择",
  "workspace.components.launchConfig.RuntimeModelConfigFields.runtimeLabel":
    "运行时",
  "workspace.components.launchConfig.RuntimeModelConfigFields.modelLabel":
    "模型",
  "workspace.components.launchConfig.RuntimeModelConfigFields.modelPlaceholder":
    "选择模型",
  "workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.improve_skills": "改进技能",
  "workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.standalone_scope": "此运行",
  "workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.team_member_scope": "该成员的运行",
  "workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.aria_label": "为{{scope}}改进技能",
  "workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.tooltip": "为{{scope}}启动一个可见的 Retrospective Skill Improver。它可能更新已配置的技能包，也可能不做更改。",
  "workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.run_not_eligible": "此运行不符合技能改进条件。",
  "workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.started_toast": "技能改进已启动。技能可能会被更新，也可能不做更改。",
} satisfies TranslationCatalog;

export default messages;
