// Temporary: relaunch the packaged app on an existing isolated data root via the project harness
// (Playwright adapter), check landing route + Daily Assistant preservation, capture a screenshot.
import path from 'node:path';
import fs from 'node:fs/promises';
const web = '/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/autobyteus-web';
const { prepareElectronE2ELaunch } = await import(`${web}/scripts/electron-e2e/electronE2ELaunchPreparation.mjs`);
const { launchPreparedElectronWithPlaywright } = await import(`${web}/scripts/electron-e2e/playwrightElectronProcessAdapter.mjs`);
const { createRequire } = await import('node:module');
const { _electron } = createRequire(`${web}/package.json`)('playwright-core');
const dataRoot = process.argv[2];
const out = process.argv[3];
const r = {};
const prepared = await prepareElectronE2ELaunch({ webRoot: web, build: false, dataRoot });
let session;
try {
  session = await launchPreparedElectronWithPlaywright(prepared, _electron);
  await session.waitUntilReady();
  const win = await session.firstWindow();
  r.console = [];
  win.on('console', (m) => r.console.push(`${m.type()}: ${m.text().slice(0, 300)}`));
  win.on('pageerror', (e) => r.console.push(`pageerror: ${String(e.message).slice(0, 300)}`));
  await win.reload().catch((e) => r.console.push('reload failed ' + e.message));
  r.metadata = session.metadata;
  await win.waitForLoadState('domcontentloaded');
  await win.waitForFunction(() => /chat/.test(location.href) && document.querySelector('[data-test="chat-new"]'), null, { timeout: 120000 }).catch(() => {});
  await new Promise((res) => setTimeout(res, 3000));
  await new Promise((res) => setTimeout(res, 20000));
  r.windows = [];
  for (const [i, w] of session.electronApplication.windows().entries()) {
    const info = { url: w.url(), title: await w.title().catch(() => null), text: (await w.locator('body').innerText().catch(() => '')).slice(0, 300), newChat: await w.locator('[data-test="chat-new"]').count().catch(() => -1) };
    await w.screenshot({ path: path.join(out, `electron-window-${i}.png`) }).catch(() => {});
    r.windows.push(info);
  }
  r.url = win.url();
  r.dom = await win.evaluate(() => ({ htmlLen: document.documentElement.outerHTML.length, hash: location.hash, nuxt: !!document.querySelector('#__nuxt'), nuxtChildren: document.querySelector('#__nuxt')?.children.length ?? null, head: document.head.innerHTML.slice(0, 400) }));
  r.newChatVisible = await win.locator('[data-test="chat-new"]').count();
  r.navFirst = (await win.locator('[data-test="app-left-panel-primary-nav"]').innerText().catch(() => '')).split('\n')[0];
  r.micVisible = await win.locator('[data-test="chat-composer"] [data-test="mic"], [data-test="chat-composer-footer"] button[title*="ictat" i], [data-test="chat-composer-footer"] button[aria-label*="oice" i]').count();
  await win.screenshot({ path: path.join(out, 'electron-landing.png') });
  const gql = await fetch(`${session.metadata.clientBaseUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '{ agentDefinition(id:"autobyteus-daily-assistant"){ skillScope instructions } }' }) });
  r.da = (await gql.json()).data.agentDefinition;
  r.editPreserved = /ELECTRON-USER-EDIT-9921/.test(r.da.instructions ?? '');
  r.files = await fs.readdir(path.join(dataRoot, 'server-data', 'agents', 'autobyteus-daily-assistant'));
} catch (error) {
  r.error = String(error?.stack ?? error);
} finally {
  if (session) await session.cleanup();
  console.log(JSON.stringify(r, null, 2));
}
