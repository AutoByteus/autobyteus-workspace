await go('#/workspace'); await wait(1500);
const entry = await until(() => document.querySelector('button[aria-haspopup="dialog"][aria-expanded]'), 15000);
const entryText = entry?.innerText?.replace(/\n+/g, ' | ');
if (entry?.getAttribute('aria-expanded') !== 'true') entry.click();
const center = await until(() => q('[data-testid="notification-center"]'), 10000); await wait(1500);
return { entryText, entryLabel: entry?.getAttribute('aria-label'), autoFailed: text('[data-testid="notification-center"] [data-testid="notification-row-auto-failed"]'), centerText: center?.innerText?.replace(/\n+/g, ' | ').slice(0, 700) };
