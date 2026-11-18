await go('#/settings?section=updates'); const t = q('[data-testid="auto-update-app-toggle"]'); const on = t?.getAttribute('aria-checked') === 'true'; if (on) t.click(); await wait(800);
return { was: on, state: (await window.electronAPI.getAppUpdateState()).automaticUpdate };
