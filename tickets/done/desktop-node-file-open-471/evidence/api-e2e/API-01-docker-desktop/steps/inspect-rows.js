// Inspect the run rows in the Docker node's window (exploration only).
const win = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('renderer/index.html') && !p.url().includes('#/nodes'));
return win.evaluate(() => [...document.querySelectorAll('[data-test], [data-testid]')]
  .filter(e => /Reporter|publisher/.test(e.textContent ?? '') && e.textContent.length < 400)
  .map(e => ({ tag: e.tagName, test: e.getAttribute('data-test') ?? e.getAttribute('data-testid'), runId: e.getAttribute('data-run-id'), text: e.textContent.replace(/\s+/g, ' ').slice(0, 80) })).slice(0, 25));
