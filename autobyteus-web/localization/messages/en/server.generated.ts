import type { TranslationCatalog } from '../../runtime/types';

const messages = {
  'server.components.server.ServerLoading.application_error': 'Application Error',
  'server.components.server.ServerLoading.backend_service_initializing': 'Backend service initializing...',
  'server.components.server.ServerLoading.check_server_health': 'Check Server Health',
  'server.components.server.ServerLoading.initial_server_startup_may_take_a': 'Initial server startup may take a moment. Please be patient...',
  'server.components.server.ServerLoading.please_wait_this_may_take_a': 'Please wait, this may take a moment.',
  'server.components.server.ServerLoading.reset_all_server_data_and_restart': 'Reset All Server Data and Restart',
  'server.components.server.ServerLoading.restart_server': 'Restart Server',
  'server.components.server.ServerLoading.restarting_server': 'Restarting Server...',
  'server.components.server.ServerLoading.run_health_check': 'Run health check',
  'server.components.server.ServerLoading.starting_autobyteus': 'Starting AutoByteus...',
  'server.components.server.ServerLoading.these_actions_can_lead_to_data': 'These actions can lead to data loss. Proceed with caution.',
  'server.components.server.ServerLogViewer.no_logs_available_click_refresh_logs': 'No logs available. Click "Refresh Logs" to load server logs.',
  'server.components.server.ServerLogViewer.open_in_editor': 'Open in Editor',
  'server.components.server.ServerLogViewer.refresh_logs': 'Refresh Logs',
  'server.components.server.ServerLogViewer.server_logs': 'Server Logs',
  'server.components.server.ServerMonitor.refresh_status': 'Refresh Status',
  'server.components.server.ServerMonitor.restart_server': 'Restart Server',
  'server.components.server.ServerMonitor.server_error': 'Server Error',
  'server.components.server.ServerMonitor.server_running': 'Server Running',
  'server.components.server.ServerMonitor.server_starting': 'Server Starting',
  'server.components.server.ServerMonitor.server_status': 'Server Status',
  'server.components.server.ServerMonitor.the_server_is_running_and_ready': 'The server is running and ready to use.',
  'server.components.server.ServerMonitor.unknown_status': 'Unknown Status',
  'server.components.server.ServerShutdown.please_wait_while_we_safely_close': 'Please wait while we safely close the application.',
  'server.components.server.ServerShutdown.shutting_down': 'Shutting Down...',
} satisfies TranslationCatalog;

export default messages;
