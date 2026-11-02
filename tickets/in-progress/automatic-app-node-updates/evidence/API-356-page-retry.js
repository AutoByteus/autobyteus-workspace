q('[data-testid="notification-center-close"]')?.click();
await go('#/settings?section=updates');
await click('[data-testid="settings-updates-check-updates"]');
const seen = [];
for (let i = 0; i < 40; i++) { await wait(500); const s = await window.electronAPI.getAppUpdateState(); const k = `${s.status}|${s.errorOperation ?? ''}|${s.notification?.outcome ?? ''}`; if (seen.at(-1) !== k) seen.push(k); if (i > 6 && s.status === 'error') break; }
return { seen };
