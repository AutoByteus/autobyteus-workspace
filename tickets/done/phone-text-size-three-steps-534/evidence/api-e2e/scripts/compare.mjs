// autobyteus-534 API/E2E (from autobyteus-525) (temporary, ticket-owned): compares two screen walks of screens.mjs.
//   node compare.mjs same  <a.json> <b.json>   API-05: every text element of every screen has the same font size and box
//                                             (±0.5 px) in both walks; lists elements only in one walk
//   node compare.mjs scale <standard.json> <largest.json>   API-07: every text element's font size grew by 21/17 (±0.02);
//                                             the four Text size preview letters are exempt (each shows its own step);
//                                             Monaco must be round(14 × 21/17) = 17 px
import fs from 'node:fs';
const [mode, fa, fb] = process.argv.slice(2);
const A = JSON.parse(fs.readFileSync(fa, 'utf8')); const B = JSON.parse(fs.readFileSync(fb, 'utf8'));
const out = { mode, a: A.label, b: B.label, skipped: { a: A.skipped, b: B.skipped }, errors: { a: A.errors, b: B.errors }, screens: {} };
for (const screen of Object.keys(A.screens).filter(k => B.screens[k])) {
  const a = new Map(A.screens[screen].texts.map(t => [t.key, t])); const b = new Map(B.screens[screen].texts.map(t => [t.key, t]));
  const r = { rootA: A.screens[screen].root, rootB: B.screens[screen].root, stepA: A.screens[screen].step, stepB: B.screens[screen].step,
    sidewaysB: B.screens[screen].sideways, matched: 0, onlyA: [], onlyB: [], diffs: [] };
  for (const [key, ta] of a) {
    const tb = b.get(key); if (!tb) { r.onlyA.push(`${key} ${ta.fontSize}px`); continue; }
    r.matched += 1;
    if (mode === 'same') {
      const d = ['fontSize', 'x', 'y', 'w', 'h'].filter(f => Math.abs(ta[f] - tb[f]) > 0.5);
      if (d.length) r.diffs.push(`${key}: ${d.map(f => `${f} ${ta[f]}→${tb[f]}`).join(', ')}`);
    } else {
      const ratio = tb.fontSize / ta.fontSize;
      if (ta.preview || tb.preview) continue;
      if (ta.monaco || tb.monaco) { if (tb.fontSize !== 17 || ta.fontSize !== 14) r.diffs.push(`${key}: Monaco ${ta.fontSize}→${tb.fontSize}`); continue; }
      if (Math.abs(ratio - 21 / 17) > 0.02) r.diffs.push(`${key}: ${ta.fontSize}→${tb.fontSize} (×${ratio.toFixed(3)}) class="${tb.cls}"`);
    }
  }
  for (const key of b.keys()) if (!a.has(key)) r.onlyB.push(`${key} ${b.get(key).fontSize}px`);
  out.screens[screen] = r;
}
out.onlyInA = Object.keys(A.screens).filter(k => !B.screens[k]); out.onlyInB = Object.keys(B.screens).filter(k => !A.screens[k]);
out.totals = { screens: Object.keys(out.screens).length, matched: Object.values(out.screens).reduce((n, s) => n + s.matched, 0),
  diffs: Object.values(out.screens).reduce((n, s) => n + s.diffs.length, 0) };
console.log(JSON.stringify(out, null, 1));
