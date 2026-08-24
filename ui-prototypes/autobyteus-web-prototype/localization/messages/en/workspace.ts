import type { TranslationCatalog } from "../../runtime/types";

const messages = {
  "workspace.components.workspace.team.TeamWorkspaceView.stream_recovery_required":
    "Live Team updates are out of sync. Wait for the Team to finish its current work, then select this Team member again to reload the complete conversation.",
  "workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.stream_recovery_wait":
    "This Team is still working. Wait for it to finish, then select this Team member again.",
  "workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.stream_recovery_retry":
    "Team activity changed while the conversation was being reloaded. Select this Team member again to retry.",
  "workspace.components.conversation.segments.renderer.MermaidDiagram.expand_diagram":
    "Expand diagram",
  "workspace.components.conversation.segments.renderer.MermaidDiagram.viewer":
    "Diagram viewer",
  "workspace.components.conversation.segments.renderer.MermaidDiagram.zoom_out":
    "Zoom out",
  "workspace.components.conversation.segments.renderer.MermaidDiagram.zoom_in":
    "Zoom in",
  "workspace.components.conversation.segments.renderer.MermaidDiagram.fit_diagram":
    "Fit diagram",
  "workspace.components.conversation.segments.renderer.MermaidDiagram.close_viewer":
    "Close diagram viewer",
  "workspace.components.conversation.segments.renderer.MarkdownRenderer.open_file":
    "Open {{file}} in Files",
  "workspace.components.conversation.segments.renderer.MarkdownRenderer.file_available_on_host":
    "This file is available only on the host workspace.",
  "workspace.components.conversation.segments.renderer.MarkdownRenderer.file_preview_failed":
    "The file preview could not be opened.",
  "workspace.components.workspace.config.RunConfigPanel.runTeamButton":
    "Run Team",
  "workspace.components.workspace.config.RunConfigPanel.runAgentButton":
    "Run Agent",
  "workspace.components.workspace.config.RunConfigPanel.title.agentConfiguration":
    "Agent Configuration",
  "workspace.components.workspace.config.RunConfigPanel.title.newAgentConfiguration":
    "New Agent Configuration",
  "workspace.components.workspace.config.RunConfigPanel.title.teamConfiguration":
    "Team Configuration",
  "workspace.components.workspace.config.RunConfigPanel.title.newTeamConfiguration":
    "New Team Configuration",
  "workspace.components.workspace.config.RunConfigPanel.title.configuration":
    "Configuration",
  "workspace.components.workspace.config.AgentRunConfigForm.auto_approve_tools_help":
    "High-trust mode for Codex: automatically allows tool calls and access/permission requests for this run.",
  "workspace.components.workspace.config.TeamRunConfigForm.auto_approve_tools_help":
    "High-trust mode for Codex team members: automatically allows tool calls and access/permission requests for this run.",
  "workspace.components.workspace.config.TeamRunConfigForm.team_members_override":
    "Team Members Override",
  "workspace.components.workspace.config.TeamRunConfigForm.member_overrides_count":
    "{{count}} overridden",
  "workspace.components.workspace.config.MemberOverrideItem.coordinator":
    "Coordinator",
  "workspace.components.workspace.config.MemberOverrideItem.overridden":
    "Overridden",
  "workspace.components.workspace.config.MemberOverrideItem.runtime_override":
    "Runtime",
  "workspace.components.workspace.config.MemberOverrideItem.use_global_runtime_default":
    "Global default",
  "workspace.components.workspace.config.MemberOverrideItem.llm_model_override":
    "LLM Model",
  "workspace.components.workspace.config.MemberOverrideItem.use_global_model_default":
    "Global default",
  "workspace.components.workspace.config.MemberOverrideItem.search_models":
    "Search models...",
  "workspace.components.workspace.config.MemberOverrideItem.choose_compatible_member_model":
    "Choose a compatible member model",
  "workspace.components.workspace.config.MemberOverrideItem.auto_approve":
    "Auto approve",
  "workspace.components.workspace.config.MemberOverrideItem.auto_execute_use_global":
    "Global default",
  "workspace.components.workspace.config.MemberOverrideItem.auto_execute_on":
    "On",
  "workspace.components.workspace.config.MemberOverrideItem.auto_execute_off":
    "Off",
  "workspace.components.workspace.running.RunningRunRow.defaultAgentName":
    "Agent",
  "workspace.components.workspace.running.RunningRunRow.newRunLabel":
    "New - {{name}}",
  "workspace.components.progress.CompactionActivityItem.memory_compaction":
    "Memory compaction",
  "workspace.components.progress.SystemInstructionActivityItem.title":
    "System instructions",
  "workspace.components.progress.SystemInstructionActivityItem.available":
    "Available",
  "workspace.components.progress.SystemInstructionActivityItem.character_count":
    "{{count}} characters",
  "workspace.components.progress.SystemInstructionActivityItem.captured_at":
    "Captured {{time}}",
  "workspace.components.progress.SystemInstructionActivityItem.aria_label":
    "{{title}}. {{source}}. {{availability}}. Captured {{time}}. {{count}} characters.",
  "workspace.components.progress.SystemInstructionActivityItem.source.native":
    "AutoByteus-supplied · Native configured system prompt",
  "workspace.components.progress.SystemInstructionActivityItem.source.claude":
    "AutoByteus-supplied · Claude SDK systemPrompt",
  "workspace.components.progress.SystemInstructionActivityItem.source.codex":
    "AutoByteus-supplied · Codex baseInstructions",
  "workspace.components.progress.SystemInstructionActivityItem.source.unknown":
    "AutoByteus-supplied system instructions",
  "workspace.components.workspace.running.AgentLibraryPanel.agentsHeading":
    "Agents",
  "workspace.components.workspace.running.AgentLibraryPanel.teamsHeading":
    "Teams",
  "workspace.components.workspace.running.AgentLibraryPanel.noDescription":
    "No description",
  "workspace.components.workspace.team.TeamOverviewPanel.messages": "Messages",
  "workspace.components.workspace.team.TeamOverviewPanel.messages_count":
    "Messages",
  "workspace.components.workspace.team.TeamCommunicationPanel.sent_messages":
    "Sent",
  "workspace.components.workspace.team.TeamCommunicationPanel.received_messages":
    "Received",
  "workspace.components.workspace.team.TeamCommunicationPanel.to_counterpart":
    "to",
  "workspace.components.workspace.team.TeamCommunicationPanel.from_counterpart":
    "from",
  "workspace.components.workspace.team.TeamCommunicationPanel.unknown_teammate":
    "Unknown teammate",
  "workspace.components.workspace.team.TeamCommunicationPanel.no_focused_member":
    "Select a team member to view communication.",
  "workspace.components.workspace.team.TeamCommunicationPanel.empty_title":
    "No team messages yet",
  "workspace.components.workspace.team.TeamCommunicationPanel.empty_detail":
    "Accepted inter-agent messages will appear here with their reference files.",
  "workspace.components.workspace.team.TeamCommunicationPanel.select_message":
    "Select a message to read the full content.",
  "workspace.components.workspace.team.TeamCommunicationPanel.loading_reference":
    "Loading reference file...",
  "workspace.components.workspace.team.TeamCommunicationPanel.reference_unavailable":
    "Reference file unavailable",
  "workspace.components.workspace.team.TeamCommunicationPanel.reference_unavailable_detail":
    "The file may have been deleted, moved, or become unreadable.",
  "workspace.components.workspace.team.TeamCommunicationPanel.preview":
    "Preview",
  "workspace.components.workspace.team.TeamCommunicationPanel.raw": "Raw",
  "workspace.components.workspace.team.TeamCommunicationPanel.maximize_view":
    "Maximize view",
  "workspace.components.workspace.team.TeamCommunicationPanel.restore_view":
    "Restore view",
  "workspace.components.workspace.team.TeamCommunicationPanel.represents_subteam":
    "Represents",
  "workspace.components.workspace.team.AgentTeamEventMonitor.focused_subteam":
    "Focused subteam",
  "workspace.components.workspace.team.AgentTeamEventMonitor.no_activity_yet":
    "No activity yet.",
  "workspace.components.workspace.team.TeamMembersPanel.team_members":
    "Team roster",
  "workspace.components.workspace.team.TeamMembersPanel.no_active_team_members":
    "No team roster members.",
  "workspace.components.workspace.team.TeamMembersPanel.roster_non_execution_note":
    "Logical roster, not active task execution.",
  "workspace.components.workspace.team.TeamTaskAgentActivityBar.active_task_agents":
    "Active task agents",
  "workspace.components.workspace.team.TeamTaskAgentActivityBar.task_agent_badge":
    "Task agent",
  "workspace.components.workspace.team.TeamTaskAgentActivityBar.approval_required":
    "Approval required",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.tasks":
    "Tasks",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_singular":
    "task",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_plural":
    "tasks",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.focus_agent":
    "Focus agent",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.focus_team":
    "Focus team",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.focus":
    "Focus",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.select_task":
    "Select a task to read it.",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.waiting_activity_notice":
    "Waiting for user action in Activity.",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.empty":
    "No delegated tasks yet",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.empty_detail":
    "Delegated work appears here from saved task records.",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_agent":
    "Task Agent",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_team":
    "Task Team",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.approval_required":
    "Approval required",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.members":
    "Members",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_assigned":
    "Task assigned",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.result_submitted":
    "Result submitted · Result {{ordinal}}",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.revised_result_submitted":
    "Revised result submitted · Result {{ordinal}}",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.revision_requested":
    "Revision requested · Result {{ordinal}}",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.revision_requested_for":
    "Revision requested for Result {{ordinal}}",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.result_accepted":
    "Result {{ordinal}} accepted",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_interrupted":
    "Task interrupted",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.status_in_progress":
    "In progress",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.status_awaiting_review":
    "Awaiting review",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.status_revision_requested":
    "Revision requested",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.status_accepted":
    "Accepted",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.status_interrupted":
    "Interrupted",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_delegator":
    "Task delegator",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.task_assignee":
    "Task assignee",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.system_lifecycle_event":
    "System lifecycle event",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.result_accepted_fallback":
    "Result accepted.",
  "workspace.components.workspace.team.TeamDelegatedTasksSection.updated_at":
    "Updated {{time}}",
  "workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.temporary_execution_title":
    "Temporary task execution",
  "workspace.components.workspace.team.TeamWorkspaceView.send_subteam_placeholder":
    "Send a message to this subteam",
  "workspace.components.workspace.team.TeamWorkspaceView.send_to_subteam":
    "Send to subteam",
  "workspace.components.workspace.agent.ArtifactContentViewer.content_not_available_yet":
    "Content not available yet",
  "workspace.components.workspace.agent.ArtifactContentViewer.preview_unavailable":
    "Preview unavailable",
  "workspace.components.workspace.agent.ArtifactContentViewer.failed_before_final_content_could_be_captured":
    "This file change failed before the final content could be captured.",
  "workspace.components.workspace.agent.ArtifactContentViewer.file_change_will_become_viewable_after_the_edit_completes":
    "This file change will become viewable after the edit completes and the server captures the final content.",
  "workspace.components.workspace.agent.ArtifactContentViewer.preview_is_currently_available_only_for_text_file_changes":
    "Preview is currently available only for text file changes.",
  "workspace.components.workspace.agent.ArtifactContentViewer.file_change_is_still_pending_server_side_capture":
    "This file change is still pending server-side capture.",
  "workspace.components.workspace.agent.ArtifactContentViewer.failed_to_fetch_artifact_content":
    "Failed to fetch artifact content",
  "workspace.components.workspace.agent.ArtifactList.agent_artifacts":
    "Agent Artifacts",
  "workspace.components.workspace.agent.AgentConversationFeed.jump_to_latest":
    "Jump to latest activity",
  "workspace.components.workspace.agent.AgentConversationFeed.retry_earlier":
    "Retry",
  "workspace.components.workspace.tools.Terminal.retry_workspace_load":
    "Retry workspace load",
  "workspace.components.launchConfig.DefinitionLaunchPreferencesSection.title":
    "LLM config",
  "workspace.components.launchConfig.DefinitionLaunchPreferencesSection.help":
    "Optional runtime, model, and LLM settings.",
  "workspace.components.launchConfig.DefinitionLaunchPreferencesSection.clear":
    "Clear config",
  "workspace.components.launchConfig.DefinitionLaunchPreferencesSection.blankRuntime":
    "Choose when launching",
  "workspace.components.launchConfig.RuntimeModelConfigFields.runtimeLabel":
    "Runtime",
  "workspace.components.launchConfig.RuntimeModelConfigFields.modelLabel":
    "Model",
  "workspace.components.launchConfig.RuntimeModelConfigFields.modelPlaceholder":
    "Select a model",
  "workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.improve_skills": "improve skills",
  "workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.standalone_scope": "this run",
  "workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.team_member_scope": "this member's run",
  "workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.aria_label": "improve skills {{scope}}",
  "workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.tooltip": "Start a visible Retrospective Skill Improver for {{scope}}. It may update configured skill packages or make no changes.",
  "workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.run_not_eligible": "This run is not eligible for Skill Improvement.",
  "workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.started_toast": "Improve skills started. Skills may be updated or no changes may be made.",
} satisfies TranslationCatalog;

export default messages;
