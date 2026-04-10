import agentInputMessages from './agentInput.generated';
import agentTeamGeneratedMessages from './agentTeams.generated';
import agentTeamMessages from './agentTeams';
import agentGeneratedMessages from './agents.generated';
import agentMessages from './agents';
import generatedApplicationMessages from './applications.generated';
import applicationMessages from './applications';
import commonMessages from './common.generated';
import memoryMessages from './memory.generated';
import serverMessages from './server.generated';
import generatedSettingsMessages from './settings.generated';
import settingsMessages from './settings';
import generatedShellMessages from './shell.generated';
import shellMessages from './shell';
import generatedSkillsMessages from './skills.generated';
import skillsMessages from './skills';
import toolsMessages from './tools.generated';
import generatedWorkspaceMessages from './workspace.generated';
import workspaceMessages from './workspace';
import type { TranslationCatalog } from '../../runtime/types';

const enMessages: TranslationCatalog = {
  ...agentInputMessages,
  ...agentTeamGeneratedMessages,
  ...agentTeamMessages,
  ...agentGeneratedMessages,
  ...agentMessages,
  ...generatedApplicationMessages,
  ...applicationMessages,
  ...commonMessages,
  ...memoryMessages,
  ...serverMessages,
  ...generatedSettingsMessages,
  ...settingsMessages,
  ...generatedShellMessages,
  ...shellMessages,
  ...generatedSkillsMessages,
  ...skillsMessages,
  ...toolsMessages,
  ...generatedWorkspaceMessages,
  ...workspaceMessages,
};

export default enMessages;
