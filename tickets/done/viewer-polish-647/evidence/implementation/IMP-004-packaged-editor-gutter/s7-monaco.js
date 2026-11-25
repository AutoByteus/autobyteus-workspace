const sleep = ms => new Promise(r => setTimeout(r, ms));
await win.locator('text="notes.ts" >> visible=true').first().click();
await win.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
await sleep(1500);
const m = await win.evaluate(() => {
  const ed = document.querySelector('.monaco-editor');
  const r = s => { const e = ed.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), w: Math.round(b.width) }; };
  const line = ed.querySelector('.view-lines .view-line span span');
  return { editor: r('.overflow-guard') ?? r(':scope'), margin: r('.margin'), lines: r('.lines-content'), lineNumbers: ed.querySelectorAll('.line-numbers').length, glyph: ed.querySelectorAll('.glyph-margin').length, folding: ed.querySelectorAll('.cldr.codicon-folding-expanded, .cldr.codicon-folding-collapsed').length, firstTextX: line ? Math.round(line.getBoundingClientRect().x) : null };
});
const box = await win.locator('.monaco-editor').first().boundingBox();
await win.screenshot({ path: '<tmp>/cdp/s7-monaco.png', clip: { x: box.x, y: box.y, width: Math.min(box.width, 700), height: 160 } });
return m;
