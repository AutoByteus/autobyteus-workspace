import type { TranslationCatalog } from '../../runtime/types';

const messages = {
  'server.components.server.ServerLoading.application_error': '应用程序错误',
  'server.components.server.ServerLoading.backend_service_initializing': '后台服务正在初始化...',
  'server.components.server.ServerLoading.check_server_health': '检查服务器健康状况',
  'server.components.server.ServerLoading.initial_server_startup_may_take_a': '初始服务器启动可能需要一些时间。请耐心等待...',
  'server.components.server.ServerLoading.please_wait_this_may_take_a': '请稍候，这可能需要一些时间。',
  'server.components.server.ServerLoading.reset_all_server_data_and_restart': '重置所有服务器数据并重新启动',
  'server.components.server.ServerLoading.restart_server': '重启服务器',
  'server.components.server.ServerLoading.restarting_server': '正在重新启动服务器...',
  'server.components.server.ServerLoading.run_health_check': '运行健康检查',
  'server.components.server.ServerLoading.starting_autobyteus': '正在启动 AutoByteus...',
  'server.components.server.ServerLoading.these_actions_can_lead_to_data': '这些操作可能会导致数据丢失。谨慎行事。',
  'server.components.server.ServerLogViewer.no_logs_available_click_refresh_logs': '没有可用的日志。单击“刷新日志”加载服务器日志。',
  'server.components.server.ServerLogViewer.open_in_editor': '在编辑器中打开',
  'server.components.server.ServerLogViewer.refresh_logs': '刷新日志',
  'server.components.server.ServerLogViewer.server_logs': '服务器日志',
  'server.components.server.ServerMonitor.refresh_status': '刷新状态',
  'server.components.server.ServerMonitor.restart_server': '重启服务器',
  'server.components.server.ServerMonitor.server_error': '服务器错误',
  'server.components.server.ServerMonitor.server_running': '服务器运行',
  'server.components.server.ServerMonitor.server_starting': '服务器启动',
  'server.components.server.ServerMonitor.server_status': '服务器状态',
  'server.components.server.ServerMonitor.the_server_is_running_and_ready': '服务器正在运行并可供使用。',
  'server.components.server.ServerMonitor.unknown_status': '未知状态',
  'server.components.server.ServerShutdown.please_wait_while_we_safely_close': '我们正在安全关闭应用程序，请稍候。',
  'server.components.server.ServerShutdown.shutting_down': '正在关闭...',
} satisfies TranslationCatalog;

export default messages;
