await go('#/settings?section=updates');
await click('[data-testid="settings-updates-check-updates"]');
const seen = [];
for (let i = 0; i < 16; i++) { await wait(250); try { const s = await window.electronAPI.getAppUpdateState(); if (seen.at(-1) !== s.status) seen.push(s.status); if (s.status === 'installing') break; } catch { break; } }
return { at: new Date().toISOString(), seen };
