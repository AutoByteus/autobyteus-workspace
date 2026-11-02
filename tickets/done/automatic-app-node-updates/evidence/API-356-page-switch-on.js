await go('#/settings?section=updates');
await click('[data-testid="settings-updates-check-updates"]');
await until(async () => { const s = await window.electronAPI.getAppUpdateState(); return s.status === 'no-update'; }, 30000);
await click('[data-testid="auto-update-app-toggle"]'); await wait(2000);
const s = await window.electronAPI.getAppUpdateState();
return { status: s.status, automaticUpdate: s.automaticUpdate, aria: q('[data-testid="auto-update-app-toggle"]')?.getAttribute('aria-checked') };
