import type { TranslationCatalog } from '../../runtime/types';

const applicationMessages = {
  'applications.pages.applications.index.title': '应用程序',
  'applications.pages.applications.detail.loading_interface': '正在加载应用界面...',
  'applications.pages.applications.detail.no_active_session': '没有活动会话',
  'applications.pages.applications.detail.launch_from_main_page': '此应用必须从主应用页面启动。',
  'applications.pages.applications.detail.go_to_applications': '前往应用程序',
  'applications.components.applications.ApplicationLaunchConfigModal.launch_title': '启动：{{name}}',
  'applications.components.applications.ApplicationLaunchConfigModal.launching': '正在启动...',
  'applications.components.applications.ApplicationLaunchConfigModal.launch_application': '启动应用程序',
  'applications.components.applications.ApplicationLaunchConfigModal.cancel': '取消',
  'applications.components.applications.ApplicationLaunchConfigModal.inherit_from_default': '继承默认值',
  'applications.components.applications.ApplicationLaunchConfigModal.default_not_set': '未设置',
} satisfies TranslationCatalog;

export default applicationMessages;
