export default async (page, args) => page.evaluate(async () => {
  const q = (s) => document.querySelector(s);
  const text = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  const sidebarEntry = [...document.querySelectorAll('button, a')].find((el) => /updates? available|software update|package update|skill update/i.test(el.getAttribute('aria-label') ?? '') || /\d+ updates?$/.test(text(el) ?? ''));
  const pills = [...document.querySelectorAll('*')].filter((el) => el.children.length === 0 && /^\d+ updates?$/.test(text(el) ?? '')).map((el) => ({ text: text(el), className: el.className }));
  const center = q('[data-testid="notification-center"]');
  const rows = [...document.querySelectorAll('[data-testid^="notification-row-"][data-state]')].map((li) => ({
    id: li.getAttribute('data-testid'), state: li.getAttribute('data-state'),
    name: text(li.querySelector('[data-testid="notification-row-name"]')),
    change: text(li.querySelector('[data-testid="notification-row-change"]')),
    newDot: !!li.querySelector('[data-testid="notification-row-new"]'),
    actions: [...li.querySelectorAll('button')].map((b) => text(b)).filter(Boolean),
    details: text(li.querySelector('[data-testid="notification-row-details"]')),
    compare: li.querySelector('[data-testid="notification-row-compare"]')?.getAttribute('href') ?? null,
    releasePage: li.querySelector('[data-testid="notification-row-release-page"]')?.getAttribute('href') ?? null,
    releaseNotes: text(li.querySelector('[data-testid="notification-row-release-notes"]')),
    progress: text(li.querySelector('[data-testid="notification-row-progress"]')),
    error: text(li.querySelector('[data-testid="notification-row-error"]')),
  }));
  const sections = [...document.querySelectorAll('[data-testid^="notification-section-"]')].filter((el) => /^notification-section-(app|agent_package|skill_source|AGENT|SKILL)/i.test(el.getAttribute('data-testid'))).map((el) => ({ id: el.getAttribute('data-testid'), title: text(el.querySelector('[data-testid="notification-section-title"]')) }));
  const dialogs = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].map((el) => ({ label: el.getAttribute('aria-label') ?? el.getAttribute('aria-labelledby'), text: text(el)?.slice(0, 300) }));
  const toasts = [...document.querySelectorAll('[data-testid="toast-container"] *')].filter((el) => el.children.length === 0 && text(el)).map((el) => text(el));
  const appUpdate = window.electronAPI?.getAppUpdateState ? await window.electronAPI.getAppUpdateState() : null;
  return {
    url: location.href, title: document.title,
    sidebarEntry: sidebarEntry ? { text: text(sidebarEntry), ariaLabel: sidebarEntry.getAttribute('aria-label'), title: sidebarEntry.getAttribute('title') } : null,
    pills, centerOpen: !!center, centerEmpty: text(q('[data-testid="notification-center-empty"]')), sections, rows,
    appUpdateNoticePresent: !!q('[data-testid="app-update-notice"]'), dialogs, toasts, appUpdate,
  };
});
