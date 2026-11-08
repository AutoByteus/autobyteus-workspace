const card = app.getByTestId('node-list-card');
const btns = await card.locator('button').evaluateAll(els => els.map(e => ({ t: e.innerText.trim(), title: e.getAttribute('title'), aria: e.getAttribute('aria-label'), test: e.getAttribute('data-testid') })));
return btns;
