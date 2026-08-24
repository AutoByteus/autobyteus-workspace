import type { TranslationCatalog } from "../../runtime/types";

const messages = {
  "workspace.components.workspace.team.TeamWorkspaceView.stream_recovery_required":
    "团队实时更新已不同步。请等待团队完成当前工作，然后再次选择此团队成员以重新加载完整对话。",
  "workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.stream_recovery_wait":
    "该团队仍在工作。请等待其完成，然后再次选择此团队成员。",
  "workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.stream_recovery_retry":
    "重新加载对话时团队活动发生了变化。请再次选择此团队成员以重试。",
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
  "workspace.components.workspace.config.RunConfigPanel.runTeamButton":
    "运行团队",
  "workspace.components.workspace.config.RunConfigPanel.runAgentButton":
    "运行智能体",
  "workspace.components.workspace.config.RunConfigPanel.title.agentConfiguration":
    "智能体配置",
  "workspace.components.workspace.config.RunConfigPanel.title.newAgentConfiguration":
    "新建智能体配置",
  "workspace.components.workspace.config.RunConfigPanel.title.teamConfiguration":
    "团队配置",
  "workspace.components.workspace.config.RunConfigPanel.title.newTeamConfiguration":
    "新建团队配置",
  "workspace.components.workspace.config.RunConfigPanel.title.configuration":
    "配置",
  "workspace.components.workspace.config.AgentRunConfigForm.auto_approve_tools_help":
    "Codex 高信任模式：本次运行会自动允许工具调用以及访问/权限请求。",
  "workspace.components.workspace.config.TeamRunConfigForm.auto_approve_tools_help":
    "Codex 团队成员高信任模式：本次运行会自动允许工具调用以及访问/权限请求。",
  "workspace.components.workspace.config.TeamRunConfigForm.team_members_override":
    "团队成员覆盖",
  "workspace.components.workspace.config.TeamRunConfigForm.member_overrides_count":
    "{{count}} 个已覆盖",
  "workspace.components.workspace.config.MemberOverrideItem.coordinator":
    "协调者",
  "workspace.components.workspace.config.MemberOverrideItem.overridden":
    "已覆盖",
  "workspace.components.workspace.config.MemberOverrideItem.runtime_override":
    "运行时",
  "workspace.components.workspace.config.MemberOverrideItem.use_global_runtime_default":
    "全局默认",
  "workspace.components.workspace.config.MemberOverrideItem.llm_model_override":
    "LLM 模型",
  "workspace.components.workspace.config.MemberOverrideItem.use_global_model_default":
    "全局默认",
  "workspace.components.workspace.config.MemberOverrideItem.search_models":
    "搜索模型...",
  "workspace.components.workspace.config.MemberOverrideItem.choose_compatible_member_model":
    "选择兼容的成员模型",
  "workspace.components.workspace.config.MemberOverrideItem.auto_approve":
    "自动批准",
  "workspace.components.workspace.config.MemberOverrideItem.auto_execute_use_global":
    "全局默认",
  "workspace.components.workspace.config.MemberOverrideItem.auto_execute_on":
    "开启",
  "workspace.components.workspace.config.MemberOverrideItem.auto_execute_off":
    "关闭",
  "workspace.components.workspace.running.RunningRunRow.defaultAgentName":
    "智能体",
  "workspace.components.workspace.running.RunningRunRow.newRunLabel":
    "新建 - {{name}}",
  "workspace.components.progress.CompactionActivityItem.memory_compaction":
    "记忆压缩",
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
  "workspace.components.progress.SystemInstructionActivityItem.source.unknown":
    "由 AutoByteus 提供的系统指令",
  "workspace.components.workspace.running.AgentLibraryPanel.agentsHeading":
    "智能体",
  "workspace.components.workspace.running.AgentLibraryPanel.teamsHeading":
    "团队",
  "workspace.components.workspace.running.AgentLibraryPanel.noDescription":
    "暂无描述",
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
  "workspace.components.workspace.team.TeamDelegatedTasksSection.tasks":
    "任务",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_singular":
    "个任务",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_plural":
    "个任务",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.focus_agent":
    "聚焦智能体",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.focus_team":
    "聚焦团队",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.focus":
    "聚焦",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.select_task":
    "选择一个任务进行阅读。",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.waiting_activity_notice":
    "正在等待在 Activity 中处理用户操作。",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.empty":
    "暂无委派任务",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.empty_detail":
    "委派工作会从已保存的任务记录显示在这里。",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_agent":
    "任务智能体",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_team":
    "任务团队",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.approval_required":
    "需要审批",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.members":
    "成员",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_assigned":
    "已分配任务",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.result_submitted":
    "已提交结果 · 结果 {{ordinal}}",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.revised_result_submitted":
    "已提交修订结果 · 结果 {{ordinal}}",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.revision_requested":
    "已请求修订 · 结果 {{ordinal}}",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.revision_requested_for":
    "已请求修订结果 {{ordinal}}",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.result_accepted":
    "结果 {{ordinal}} 已接受",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_interrupted":
    "任务已中断",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.status_in_progress":
    "进行中",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.status_awaiting_review":
    "等待评审",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.status_revision_requested":
    "已请求修订",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.status_accepted":
    "已接受",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.status_interrupted":
    "已中断",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_delegator":
    "任务委派者",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_assignee":
    "任务执行者",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.system_lifecycle_event":
    "系统生命周期事件",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.result_accepted_fallback":
    "结果已接受。",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.updated_at":
    "更新于 {{time}}",
  "workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.temporary_execution_title":
    "临时任务执行",
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
