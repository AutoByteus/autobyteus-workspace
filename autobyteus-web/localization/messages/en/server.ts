export default {
  'server.conflict.summary': 'Backend port {port} is already in use.',
  'server.conflict.owner': '{executable} (PID {pid})',
  'server.conflict.unknownName': 'Unknown application',
  'server.conflict.unavailable': 'The current listener could not be identified.',
  'server.conflict.guidance': 'Restart Server controls only this app’s managed backend. It cannot stop another application’s listener. Verify which application owns this port, stop or reconfigure it, then retry. The identity shown is a current snapshot, not permission to stop an unfamiliar process.',
  'server.conflict.noReset': 'Resetting server data will not free this port. Your data does not need to be reset.',
};
