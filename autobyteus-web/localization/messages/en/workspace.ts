import type { TranslationCatalog } from '../../runtime/types';

const messages = {
  'workspace.components.workspace.config.RunConfigPanel.runTeamButton': 'Run Team',
  'workspace.components.workspace.config.RunConfigPanel.runAgentButton': 'Run Agent',
  'workspace.components.workspace.config.RunConfigPanel.title.agentConfiguration': 'Agent Configuration',
  'workspace.components.workspace.config.RunConfigPanel.title.newAgentConfiguration': 'New Agent Configuration',
  'workspace.components.workspace.config.RunConfigPanel.title.teamConfiguration': 'Team Configuration',
  'workspace.components.workspace.config.RunConfigPanel.title.newTeamConfiguration': 'New Team Configuration',
  'workspace.components.workspace.config.RunConfigPanel.title.configuration': 'Configuration',
  'workspace.components.workspace.running.RunningRunRow.defaultAgentName': 'Agent',
  'workspace.components.workspace.running.RunningRunRow.newRunLabel': 'New - {{name}}',
  'workspace.components.workspace.running.AgentLibraryPanel.agentsHeading': 'Agents',
  'workspace.components.workspace.running.AgentLibraryPanel.teamsHeading': 'Teams',
  'workspace.components.workspace.running.AgentLibraryPanel.noDescription': 'No description',
  'workspace.components.workspace.agent.ArtifactContentViewer.content_not_available_yet': 'Content not available yet',
  'workspace.components.workspace.agent.ArtifactContentViewer.preview_unavailable': 'Preview unavailable',
  'workspace.components.workspace.agent.ArtifactContentViewer.failed_before_final_content_could_be_captured': 'This file change failed before the final content could be captured.',
  'workspace.components.workspace.agent.ArtifactContentViewer.file_change_will_become_viewable_after_the_edit_completes': 'This file change will become viewable after the edit completes and the server captures the final content.',
  'workspace.components.workspace.agent.ArtifactContentViewer.preview_is_currently_available_only_for_text_file_changes': 'Preview is currently available only for text file changes.',
  'workspace.components.workspace.agent.ArtifactContentViewer.file_change_is_still_pending_server_side_capture': 'This file change is still pending server-side capture.',
  'workspace.components.workspace.agent.ArtifactContentViewer.failed_to_fetch_artifact_content': 'Failed to fetch artifact content',
  'workspace.components.launchConfig.DefinitionLaunchPreferencesSection.title': 'LLM config',
  'workspace.components.launchConfig.DefinitionLaunchPreferencesSection.help': 'Optional runtime, model, and LLM settings.',
  'workspace.components.launchConfig.DefinitionLaunchPreferencesSection.clear': 'Clear config',
  'workspace.components.launchConfig.DefinitionLaunchPreferencesSection.blankRuntime': 'Choose when launching',
  'workspace.components.launchConfig.RuntimeModelConfigFields.runtimeLabel': 'Runtime',
  'workspace.components.launchConfig.RuntimeModelConfigFields.modelLabel': 'Model',
  'workspace.components.launchConfig.RuntimeModelConfigFields.modelPlaceholder': 'Select a model',
} satisfies TranslationCatalog;

export default messages;
