(() => {
  const E = 'remote-9b9dfdc6-6852-4629-83a4-18b038c084fb';
  const N = 'srv_MNIZuC4HXb_2IVm37Uhuo80fFeg7NWKZ';
  const q = (id) => document.querySelector(`[data-testid="${id}"]`);
  const text = (id) => q(id)?.innerText.trim() ?? null;
  return {
    at: new Date().toISOString(),
    route: location.hash,
    serverVersion: text(`node-server-version-${N}`),
    updateButton: text(`node-server-update-${N}`),
    progress: text(`node-server-progress-${N}`),
    notice: text(`node-server-notice-${N}`),
    autoSwitchChecked: q(`node-auto-update-toggle-${E}`)?.getAttribute('aria-checked') ?? null,
    autoFailedLine: text(`node-auto-update-failed-${E}`),
    autoUpdatedLine: text(`node-auto-update-updated-${E}`),
  };
})()
