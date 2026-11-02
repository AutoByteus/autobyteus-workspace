const entry = () => { const e = document.querySelector('button[aria-haspopup="dialog"][aria-expanded]'); return e ? { text: e.innerText.replace(/\n+/g, ' | '), label: e.getAttribute('aria-label'), expanded: e.getAttribute('aria-expanded') } : null; };
document.querySelector('button[aria-haspopup="dialog"][aria-expanded]').click();
const c = await until(() => q('[data-testid="notification-center"]'), 10000); await wait(1500);
return { whileOpen: entry(), panel: c?.innerText.replace(/\n+/g, ' | ').slice(0, 500), read: (await window.electronAPI.getAppUpdateState()).notification?.read };
