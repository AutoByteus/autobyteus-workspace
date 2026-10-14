// Temporary diagnostic: capture every frame on the Org WebSocket while the Org lead answers one message.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/autobyteus-web/package.json')('playwright-core');
const [endpoint, orgRunId, out] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts()[0].pages().find(p => p.url().includes('renderer/index.html'));
const frames = [];
page.on('websocket', ws => ws.on('framereceived', f => frames.push({ t: Date.now(), url: ws.url(), payload: typeof f.payload === 'string' ? f.payload : Buffer.from(f.payload).toString('utf8') })));
await page.reload(); await page.waitForLoadState('load'); await new Promise(r => setTimeout(r, 2500));
await page.evaluate(id => { location.hash = `/workspace?rootSubjectKind=agent_org&definitionId=tps-desktop-org&orgRunId=${id}&mode=active`; }, orgRunId);
await new Promise(r => setTimeout(r, 3000));
const children = page.locator(`[data-test="agent-org-run-children-${orgRunId}"]`);
if (!(await children.isVisible())) { await page.locator(`[data-test="agent-org-run-disclosure-${orgRunId}"]`).click(); await new Promise(r => setTimeout(r, 800)); }
await children.locator('[data-test^="agent-org-agent-row-"]').click(); await new Promise(r => setTimeout(r, 1500));
await page.locator('textarea').first().fill('Reply with one plain-text paragraph of about 60 words about rain. Do not use tools.');
await page.getByRole('button', { name: 'Send message', exact: true }).click();
await new Promise(r => setTimeout(r, 20000));
const types = {};
for (const f of frames) { let ty = '?'; try { const o = JSON.parse(f.payload); ty = o.type + (o.payload?.message?.type ? '/' + o.payload.message.type : '') + (o.payload?.event?.type ? '/' + o.payload.event.type : ''); } catch {} const k = f.url.split('/ws/')[1].split('/')[0] + ' ' + ty; types[k] = (types[k] || 0) + 1; }
const usage = frames.filter(f => /TOKEN_USAGE|token_usage/.test(f.payload)).map(f => ({ url: f.url, head: f.payload.slice(0, 600) }));
await fs.writeFile(out, JSON.stringify({ types, usage }, null, 2));
console.log(JSON.stringify({ types, usageCount: usage.length, firstUsage: usage[0]?.head?.slice(0, 400) }, null, 1));
await browser.close();
