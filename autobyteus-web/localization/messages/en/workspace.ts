import type { TranslationCatalog } from "../../runtime/types";

const messages = {
  "fileExplorer.workspaceUnavailable": "Workspace details are unavailable. Refresh or reopen Settings to load the saved workspace.",
  "workspace.teamCopy.loading": "Reading saved Team configuration…",
  "workspace.teamCopy.failed": "Could not copy this Team configuration: {error} Use New (+) to retry.",
  "workspace.runModelConfig.modelRequired": "Select a model before launch.",
  "workspace.agentOrg.runConfig.modelRequired": "Select a model for {address} before launch.",
  "workspace.agentOrg.runConfig.retryInitialization": "Retry loading configuration",

  "workspace.runModelConfig.orgOwnershipUnavailable": "This Org run is application-owned. Its model settings cannot be edited here.",
  "workspace.agentOrg.inspectionUnavailable": "Saved Agent Org data is unavailable. No run was started.",
  "workspace.runModelConfig.loading": "Loading run configuration…",
  "workspace.runModelConfig.runUnavailable": "This run is no longer available.",
  "workspace.runModelConfig.save": "Save",
  "workspace.runModelConfig.saving": "Saving…",
  "workspace.runModelConfig.verifying": "Verifying…",
  "workspace.runModelConfig.loadingModels": "Loading model options…",
  "workspace.runModelConfig.catalogError": "Model options could not be loaded. Saved settings were not changed.",
  "workspace.runModelConfig.selectedModelUnavailable": "The selected model is unavailable for the current runtime.",
  "workspace.runModelConfig.retry": "Retry",
  "workspace.runModelConfig.refreshRequired": "Saved model settings must be refreshed before editing.",
  "workspace.runModelConfig.noAdjustableSettings": "This model has no adjustable settings.",
  "workspace.runModelConfig.schemaUnavailable": "Saved model settings cannot be represented by the current schema.",
  "workspace.runModelConfig.agentStopped": "This run is stopped. Saved model settings will be used when it resumes.",
  "workspace.runModelConfig.agentActive": "Stop this run before changing model settings.",
  "workspace.runModelConfig.teamStopped": "This team is stopped. Saved model settings will be used when it resumes.",
  "workspace.runModelConfig.orgStopped": "This Org is stopped. Save model settings and mounted Team workspaces for the next continuation. A Team workspace applies to all its configured Agents; existing files and history stay where they are.",
  "workspace.runModelConfig.orgActive": "Stop the enclosing Org before changing its settings.",
  "workspace.runModelConfig.teamActive": "Stop this team before changing model settings.",
  "workspace.runModelConfig.fixedRuntime": "Runtime is fixed for this saved run.",
  "workspace.runModelConfig.nativeModelHelp": "Choose a verified model with at least the saved model’s context capacity.",
  "workspace.runModelConfig.externalModelHelp": "Choose any model offered by this runtime. The runtime handles context limits when the run resumes.",
  "workspace.runModelConfig.unknownModelHelp": "Replacement models for this runtime are unavailable.",
  "workspace.runModelConfig.loadingOptions": "Loading replacement models…",
  "workspace.runModelConfig.optionsUnavailable": "Runtime model options are unavailable. Refresh this run to retry; its saved model identity remains visible.",
  "workspace.runModelConfig.replacementInvalid": "This replacement is no longer offered or eligible. Refresh options before saving.",
  "workspace.runModelConfig.noNativeReplacements": "No verified equal-or-larger replacement models are available.",
  "workspace.runModelConfig.noCatalogReplacements": "No other models are currently offered by this runtime.",
  "workspace.runModelConfig.fixedWorkspace": "Workspace is fixed for existing runs.",
  "workspace.runModelConfig.validation.required": "A value is required.",
  "workspace.runModelConfig.validation.type": "Enter a value of type {expected}.",
  "workspace.runModelConfig.validation.enum": "Choose one of the supported options.",
  "workspace.runModelConfig.validation.minimum": "Value must be at least {expected}.",
  "workspace.runModelConfig.validation.maximum": "Value must be at most {expected}.",
  "workspace.runModelConfig.validation.pattern": "Value does not match the required format.",
  "workspace.runModelConfig.validation.schema_pattern": "The current model schema contains an invalid format rule.",
  "workspace.runModelConfig.thinkingAdvancedOnly": "Use the model settings below to control thinking.",
  "workspace.components.workspace.team.TeamWorkspaceView.stream_recovery_required":
    "Live Team updates are out of sync. Wait for the Team to finish its current work, then select this Team member again to reload the complete conversation.",
  "workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.stream_recovery_wait":
    "This Team is still working. Wait for it to finish, then select this Team member again.",
  "workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.stream_recovery_retry":
    "Team activity changed while the conversation was being reloaded. Select this Team member again to retry.",
  "workspace.agentOrg.recovery.exhausted":
    "Live updates could not recover automatically. Select this Agent Org again to reload a verified complete conversation.",
  "workspace.agentOrg.connecting": "Connecting to Agent Org…",
  "workspace.agentOrg.stoppedHistory.title": "Stopped Agent Org",
  "workspace.agentOrg.stoppedHistory.description":
    "Select a member from the historical run in the sidebar to continue from its saved state.",
  "workspace.agentOrg.activeUnfocused.title": "Choose an Agent or Team",
  "workspace.agentOrg.activeUnfocused.description":
    "Select a member from the active Agent Org in the sidebar. Teams focus their coordinator first.",
  "workspace.agentOrg.history.refreshLabel": "Refresh Agent Org history",
  "workspace.collaboration.identity.details": "Participant details",
  "workspace.collaboration.identity.address": "Address",
  "workspace.collaboration.identity.agentRun": "Agent run",
  "workspace.collaboration.identity.task": "Task",
  "workspace.collaboration.identity.hostRun": "Host run",
  "workspace.collaboration.identity.executionRun": "Execution run",
  "workspace.collaboration.identity.teamRun": "Team run",
  "workspace.agentOrg.history.collectionLabel": "Orgs",
  "workspace.agentOrg.history.stopLabel": "Stop Agent Org",
  "workspace.agentOrg.history.archiveLabel": "Archive Agent Org history",
  "workspace.agentOrg.history.deleteLabel": "Delete Agent Org history permanently",
  "workspace.agentOrg.history.deleteConfirmation": "Delete this Agent Org history permanently? This removes only this run and cannot be undone.",
  "workspace.agentOrg.history.archived": "Agent Org history archived.",
  "workspace.agentOrg.history.archiveFailed": "Failed to archive Agent Org history. Please try again.",
  "workspace.agentOrg.history.deleted": "Agent Org history deleted permanently.",
  "workspace.agentOrg.history.deleteFailed": "Failed to delete Agent Org history. Please try again.",
  "workspace.agentOrg.history.navigationCleanupFailed": "The Agent Org history changed, but the workspace could not leave the removed run. Select another item to continue.",
  "workspace.agentOrg.history.workspaces": "Workspaces",
  "workspace.agentOrg.history.running": "Running",
  "workspace.agentOrg.history.stopped": "Stopped",
  "workspace.agentOrg.history.newRun": "New - {{name}}",
  "workspace.agentOrg.history.expandRun": "Expand {{name}} descendants",
  "workspace.agentOrg.history.collapseRun": "Collapse {{name}} descendants",
  "workspace.agentOrg.history.executionHierarchy": "{{name}} execution hierarchy",
  "workspace.agentOrg.history.taskLabel": "Task: {{name}}",
  "workspace.agentOrg.history.empty": "No Agent Org run history yet.",
  "workspace.agentOrg.history.noWorkspace": "No workspace",
  "workspace.agentOrg.history.relativeNow": "now",
  "workspace.agentOrg.history.relativeMinutes": "{{count}}m",
  "workspace.agentOrg.history.relativeHours": "{{count}}h",
  "workspace.agentOrg.history.relativeDays": "{{count}}d",
  "workspace.agentOrg.runConfig.orgLabel": "Agent Org",
  "workspace.agentOrg.runConfig.runtimeHelp": "Selects the runtime used by this organization run.",
  "workspace.agentOrg.runConfig.modelLabel": "Default LLM Model",
  "workspace.agentOrg.runConfig.modelHelp": "Used across the organization unless a placement is customized.",
  "workspace.agentOrg.runConfig.loading": "Loading Agent Org…",
  "workspace.agentOrg.runConfig.starting": "Starting Agent Org…",
  "workspace.agentOrg.runConfig.run": "Run Agent Org",
  "workspace.agentOrg.runConfig.autoApprove": "Auto approve tools",
  "workspace.agentOrg.runConfig.autoApproveHelp":
    "Automatically allows tool calls and access requests for this run.",
  "workspace.agentOrg.runConfig.workspaceRequired": "Workspace is required to run an Agent Org.",
  "workspace.agentOrg.runConfig.memberOverrides": "Member overrides",
  "workspace.agentOrg.runConfig.referencesLoading": "Loading organization members…",
  "workspace.agentOrg.runConfig.referencesUnavailable": "Unable to load organization members: {references}",
  "workspace.agentOrg.runConfig.schemaLoading": "Validating model configuration for {address}…",
  "workspace.agentOrg.runConfig.schemaBlocked": "Model configuration for {address} is not ready: {error}",
  "workspace.agentOrg.runConfig.schemaUnavailable": "The effective model configuration is unavailable.",
  "workspace.agentOrg.runConfig.workspaceUnavailable": "Workspace '{{workspaceId}}' is unavailable.",
  "workspace.agentOrg.runConfig.workspacePathRequired": "Workspace path is required.",
  "workspace.agentOrg.runConfig.workspacePathUnavailable": "Selected workspace has no usable root path.",
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
  "workspace.components.workspace.config.AgentRunConfigForm.agy_auto_approve_tools_help":
    "High-trust mode for Antigravity CLI: runs tools without interactive prompts. When off, denied actions cannot be approved in chat.",
  "workspace.components.workspace.config.TeamRunConfigForm.auto_approve_tools_help":
    "High-trust mode for Codex team members: automatically allows tool calls and access/permission requests for this run.",
  "workspace.components.workspace.config.TeamRunConfigForm.agy_auto_approve_tools_help":
    "High-trust mode for Antigravity CLI members: runs tools without interactive prompts. When off, denied actions cannot be approved in chat.",
  "workspace.components.workspace.config.TeamRunConfigForm.team_members_override":
    "Team Members Override",
  "workspace.components.workspace.config.TeamRunConfigForm.member_overrides_count":
    "{{count}} overridden",
  "workspace.components.workspace.config.TeamRunConfigForm.topology_repaired":
    "Team topology changed. Stale settings were removed. Review these addresses and retry:",
  "workspace.components.workspace.config.TeamRunConfigForm.historical_value_unavailable": "Saved value is unavailable in current options.",
  "workspace.components.workspace.config.TeamRunConfigForm.saved_model_configuration": "Saved model configuration",
  "workspace.components.workspace.config.TeamScopeConfigEditor.customized": "Customized",
  "workspace.components.workspace.config.TeamScopeConfigEditor.inherited": "Inherited",
  "workspace.components.workspace.config.TeamScopeConfigEditor.team_marker": "Team",
  "workspace.components.workspace.config.TeamScopeConfigEditor.reset": "Reset",
  "workspace.components.workspace.config.TeamScopeConfigEditor.reset_aria": "Reset settings for {{name}} ({{address}})",
  "workspace.components.workspace.config.TeamScopeConfigEditor.runtime_help": "Runtime used by this Team scope.",
  "workspace.components.workspace.config.TeamScopeConfigEditor.team_default_model": "Default LLM Model",
  "workspace.components.workspace.config.TeamScopeConfigEditor.model_help": "Nested Teams and Agents inherit this value unless customized.",
  "workspace.components.workspace.config.TeamScopeConfigEditor.flat_model_help": "Agents in this Team inherit this value unless customized.",
  "workspace.components.workspace.config.TeamScopeConfigEditor.auto_approve": "Auto approve tools",
  "workspace.components.workspace.config.TeamScopeConfigEditor.auto_help": "Inherited by descendant scopes without an override.",
  "workspace.components.workspace.config.TeamScopeConfigEditor.catalog_loading": "Loading models for {{address}}…",
  "workspace.components.workspace.config.TeamScopeConfigEditor.catalog_error": "Could not load models for {{address}}: {{error}}",
  "workspace.components.workspace.config.TeamScopeConfigEditor.retry": "Retry",
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
  "workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_running":
    "Team status: Running",
  "workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_initializing":
    "Team status: Initializing",
  "workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_error":
    "Team status: Error",
  "workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_idle":
    "Team status: Idle",
  "workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_offline":
    "Team status: Offline",
  "workspace.history.hierarchy.tree_label": "{{name}} organization tree",
  "workspace.history.hierarchy.role.agent_team": "Agent team",
  "workspace.history.hierarchy.role.agent": "Agent",
  "workspace.history.hierarchy.role.temporary_task_team": "Temporary task team",
  "workspace.history.hierarchy.role.temporary_task_agent": "Temporary task agent",
  "workspace.history.hierarchy.identity": "{{role}} · {{name}} · {{address}}",
  "workspace.history.hierarchy.tree_item": "{{role}}, {{name}}, level {{level}}, {{status}}, {{address}}",
  "workspace.history.hierarchy.expand": "Expand {{name}}",
  "workspace.history.hierarchy.collapse": "Collapse {{name}}",
  "workspace.history.hierarchy.status.running": "running",
  "workspace.history.hierarchy.status.initializing": "initializing",
  "workspace.history.hierarchy.status.error": "error",
  "workspace.history.hierarchy.status.idle": "idle",
  "workspace.history.hierarchy.status.offline": "offline",
  "workspace.task_monitor.task": "Task",
  "workspace.task_monitor.lifecycle.in_progress": "In progress",
  "workspace.task_monitor.lifecycle.awaiting_review": "Awaiting review",
  "workspace.task_monitor.lifecycle.revision_requested": "Revision requested",
  "workspace.task_monitor.lifecycle.accepted": "Accepted",
  "workspace.task_monitor.lifecycle.interrupted": "Interrupted",
  "workspace.task_monitor.execution.running": "Running",
  "workspace.task_monitor.execution.initializing": "Initializing",
  "workspace.task_monitor.execution.error": "Error",
  "workspace.task_monitor.execution.idle": "Idle",
  "workspace.task_monitor.execution.offline": "Offline",
  "workspace.task_monitor.combined_status": "{{lifecycle}} · {{execution}}",
  "workspace.task_monitor.loading": "Loading task activity…",
  "workspace.task_monitor.load_error": "Couldn't load task activity.",
  "workspace.task_monitor.retry": "Retry",
  "workspace.task_monitor.retry_accessible": "Retry loading task activity",
  "workspace.task_monitor.empty": "No activity recorded for this task yet.",
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
