await go('#/settings?section=updates');
await until(() => q('[data-testid="auto-update-app-toggle"]'), 15000);
const s = await window.electronAPI.getAppUpdateState();
return { aria: q('[data-testid="auto-update-app-toggle"]')?.getAttribute('aria-checked'), download: !!q('[data-testid="settings-updates-download-update"]'), status: s.status, availableVersion: s.availableVersion, automaticUpdate: s.automaticUpdate, currentVersion: s.currentVersion, message: s.message, errorOperation: s.errorOperation, outcome: s.notification?.outcome, outcomeReason: s.notification?.outcomeReason };
