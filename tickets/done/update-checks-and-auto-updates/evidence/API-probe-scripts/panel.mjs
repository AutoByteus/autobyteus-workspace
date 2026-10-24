// The Notification Center as the user sees it: sections, switches, rows.
export default async (page) => page.evaluate(() => {
  const text = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  const center = document.querySelector('[data-testid="notification-center"]');
  if (!center) return { open: false };
  const r = center.getBoundingClientRect();
  return {
    open: true, rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), right: Math.round(innerWidth - r.right), innerWidth },
    sections: [...center.querySelectorAll('[data-testid^="notification-section-"]')].filter((el) => !/-(title|more)$/.test(el.getAttribute('data-testid'))).map((el) => ({ id: el.getAttribute('data-testid'), title: text(el.querySelector('[data-testid="notification-section-title"]')) })),
    switches: [...center.querySelectorAll('[data-testid^="auto-update-"][data-testid$="-toggle"]')].map((el) => ({ id: el.getAttribute('data-testid'), checked: el.getAttribute('aria-checked'), disabled: el.disabled,
      explanation: text(center.querySelector(`[data-testid="${el.getAttribute('data-testid').replace(/-toggle$/, '-explanation')}"]`)),
      applying: text(center.querySelector(`[data-testid="${el.getAttribute('data-testid').replace(/-toggle$/, '-applying')}"]`)) })),
    rows: [...center.querySelectorAll('[data-testid^="notification-row-"][data-state]')].map((li) => ({ id: li.getAttribute('data-testid').slice(17), state: li.getAttribute('data-state'), text: text(li).slice(0, 220),
      compare: li.querySelector('[data-testid="notification-row-compare"]')?.getAttribute('href') ?? null })),
    entry: [...document.querySelectorAll('[aria-label*="update"]')].map((el) => el.getAttribute('aria-label')).slice(0, 2),
    pill: [...document.querySelectorAll('*')].filter((el) => el.children.length === 0 && /^\d+ (updates?|updated)$/.test(el.textContent.trim())).map((el) => el.textContent.trim()),
    dialogs: [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].map((d) => text(d).slice(0, 600)),
  };
});
