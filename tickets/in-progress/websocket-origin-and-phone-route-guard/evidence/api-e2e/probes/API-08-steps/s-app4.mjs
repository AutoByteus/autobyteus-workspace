export default async ({ page, shot }) => {
  const sockets = [];
  page.on('websocket', ws => { const e = { url: ws.url().replace(/access_token=[^&]+/, 'access_token=…'), frames: 0, closed: false, firstFrame: null }; sockets.push(e); ws.on('framereceived', f => { e.frames += 1; if (!e.firstFrame) e.firstFrame = String(f.payload).slice(0, 100); }); ws.on('close', () => { e.closed = true; }); ws.on('socketerror', err => { e.error = String(err); }); });
  await page.evaluate(() => { location.hash = '#/applications'; });
  await page.waitForTimeout(2500);
  await page.getByText('Open app', { exact: false }).first().click({ timeout: 10000 });
  await page.getByRole('button', { name: 'Enter application' }).click({ timeout: 15000 });
  await page.waitForTimeout(10000);
  const frame = page.frames().find(f => f.url().includes('/rest/application-bundles/'));
  const cdpFrame = frame ? await page.context().newCDPSession(frame).then(() => 'oopif-session-ok').catch(e => `no-oopif-session: ${e.message.slice(0, 80)}`) : 'no frame';
  await shot(page, 'API-08-22-brief-studio-entered');
  return { frameOrigin: frame ? await frame.evaluate(() => location.origin) : null, cdpFrame, sockets };
};
