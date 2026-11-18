await go('#/settings?section=updates');
const s0 = await window.electronAPI.getAppUpdateState();
await click('[data-testid="auto-update-app-toggle"]');
const seen = [];
for (let i = 0; i < 60; i++) { await wait(500); const s = await window.electronAPI.getAppUpdateState(); const k = `${s.status}|${s.errorOperation ?? ''}|${s.notification?.outcome ?? ''}|${(s.notification?.outcomeReason ?? '').slice(0, 110)}|${(s.message ?? '').slice(0, 110)}`; if (seen.at(-1) !== k) seen.push(k); if (s.notification?.outcome === 'AUTO_FAILED' && i > 8) break; }
return { before: { status: s0.status, availableVersion: s0.availableVersion, automaticUpdate: s0.automaticUpdate }, at: new Date().toISOString(), seen };
