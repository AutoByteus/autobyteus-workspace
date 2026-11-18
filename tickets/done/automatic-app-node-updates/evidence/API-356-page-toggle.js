await go('#/settings?section=updates'); await click('[data-testid="auto-update-app-toggle"]'); return new Date().toISOString();
