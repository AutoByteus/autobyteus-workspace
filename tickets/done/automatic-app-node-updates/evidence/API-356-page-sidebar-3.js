q('[data-testid="notification-center-close"]')?.click(); await wait(1500);
const e = document.querySelector('button[aria-haspopup="dialog"][aria-expanded]');
return { afterClose: e ? { text: e.innerText, label: e.getAttribute('aria-label') } : null };
