export default async (page) => page.evaluate(async () => {
  const t = (s) => document.querySelector(`[data-testid="${s}"]`)?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  const toggle = document.querySelector('[data-testid="settings-updates-auto-check-toggle"]');
  const value = document.querySelector('[data-testid="update-interval-app-value"]');
  const unit = document.querySelector('[data-testid="update-interval-app-unit"]');
  return { status: t('settings-updates-status'), lastChecked: t('settings-updates-last-checked'), autoState: t('settings-updates-auto-state'),
    message: t('settings-updates-message'), autoFailedNote: t('settings-updates-auto-failed-note'), description: t('settings-updates-auto-check-description'),
    noEffect: t('settings-updates-auto-check-no-effect'), toggle: toggle ? { checked: toggle.getAttribute('aria-checked'), disabled: toggle.disabled } : null,
    interval: value ? { value: value.value, unit: unit?.value, hint: t('update-interval-app-hint'), saved: t('update-interval-app-saved') } : null,
    appUpdate: await window.electronAPI?.getAppUpdateState?.() };
});
