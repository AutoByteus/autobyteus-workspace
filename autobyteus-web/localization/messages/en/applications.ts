import type { TranslationCatalog } from '../../runtime/types';

const applicationMessages = {
  'applications.pages.applications.index.title': 'Applications',
  'applications.pages.applications.detail.loading_interface': 'Loading Application Interface...',
  'applications.pages.applications.detail.no_active_session': 'No Active Session',
  'applications.pages.applications.detail.launch_from_main_page': 'This application must be launched from the main applications page.',
  'applications.pages.applications.detail.go_to_applications': 'Go to Applications',
  'applications.components.applications.ApplicationLaunchConfigModal.launch_title': 'Launch: {{name}}',
  'applications.components.applications.ApplicationLaunchConfigModal.launching': 'Launching...',
  'applications.components.applications.ApplicationLaunchConfigModal.launch_application': 'Launch Application',
  'applications.components.applications.ApplicationLaunchConfigModal.cancel': 'Cancel',
  'applications.components.applications.ApplicationLaunchConfigModal.inherit_from_default': 'Inherit from Default',
  'applications.components.applications.ApplicationLaunchConfigModal.default_not_set': 'Not Set',
} satisfies TranslationCatalog;

export default applicationMessages;
