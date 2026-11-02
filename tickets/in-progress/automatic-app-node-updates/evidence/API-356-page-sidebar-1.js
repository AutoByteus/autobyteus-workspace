await go('#/workspace'); await wait(2500);
const e = await until(() => document.querySelector('button[aria-haspopup="dialog"][aria-expanded]'), 15000);
return { before: e && { text: e.innerText.replace(/\n+/g, ' | '), label: e.getAttribute('aria-label') } };
