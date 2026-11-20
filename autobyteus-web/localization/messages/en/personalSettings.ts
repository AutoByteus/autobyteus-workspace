import type { TranslationCatalog } from '../../runtime/types';

/** Personal settings of package and built-in definitions (package-personal-settings, design "UI (stage 1)"). */
const messages = {
  'personalSettings.note.agent.package': 'Tools, skills, avatar and runtime/model are your personal settings on this computer. Package updates keep them.',
  'personalSettings.note.agent.builtIn': 'Tools, skills, avatar and runtime/model are your personal settings on this computer. Restarts and AutoByteus updates keep them.',
  'personalSettings.note.collaboration.package': 'Avatar and runtime/model are your personal settings on this computer. Package updates keep them.',
  'personalSettings.mark': 'Personal',
  'personalSettings.reset.package': "Reset to the package's setting",
  'personalSettings.reset.builtIn': 'Reset to the built-in setting',
  'personalSettings.reset.failed': 'The setting could not be reset: {{error}}',
  'personalSettings.orgLaunchConfig': 'Default runtime/model: {{runtime}} · {{model}}',
} satisfies TranslationCatalog;

export default messages;
