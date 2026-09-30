// Focused repro: catalog-launched registered draft → first send in the chat view → does the reply stream?
export default async ({ page, front, out }) => {
  const r = { urls: [], ws: [], frames: [] };
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) r.urls.push(f.url().replace(front, '')); });
  page.on('websocket', (ws) => {
    const entry = { url: ws.url(), opened: Date.now(), closed: null, recv: 0 };
    r.ws.push(entry);
    ws.on('framereceived', (f) => { entry.recv += 1; const t = String(f.payload).slice(0, 120); if (/ASSISTANT|TURN_COMPLETED|STATUS|segment|CATALOG/i.test(t)) r.frames.push(`${Date.now() - entry.opened}ms ${t}`); });
    ws.on('close', () => { entry.closed = Date.now() - entry.opened; });
  });
  const marker = `CATALOG-${Date.now() % 100000}`;
  await page.goto(`${front}/agents`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Legacy Helper', { exact: true }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(1000);
  const card = page.locator('div,article,li').filter({ has: page.getByText('Legacy Helper', { exact: true }) }).filter({ has: page.getByRole('button', { name: /^Run/ }) }).last();
  await card.getByRole('button', { name: /^Run/ }).first().click();
  await page.locator('main select').first().waitFor();
  await page.locator('main select').first().selectOption('codex_app_server');
  await page.waitForTimeout(1500);
  await page.getByText('Select a model', { exact: true }).first().click();
  await page.getByText(/^GPT-5\.5 \(default reasoning/).first().click();
  await page.getByRole('button', { name: 'Run Agent' }).click();
  await page.waitForURL(/\/chat\?id=temp-/, { timeout: 60000 });
  await page.waitForTimeout(1000);
  const input = page.locator('[data-test="chat-composer"] textarea').first();
  await input.fill(`Reply with exactly ${marker} and nothing else.`);
  await page.evaluate(() => {
    const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
    const ctxs = pinia._s.get('agentContexts');
    const tempId = new URL(location.href).searchParams.get('id');
    window.__probe = { tempCtx: ctxs.getRun(tempId), log: [] };
    const origUpsert = ctxs.upsertProjectionContext?.bind(ctxs);
    if (origUpsert) ctxs.upsertProjectionContext = (o) => { window.__probe.log.push(`upsertProjectionContext ${o?.runId}`); return origUpsert(o); };
    const origRemove = ctxs.removeRun?.bind(ctxs);
    if (origRemove) ctxs.removeRun = (id) => { window.__probe.log.push(`removeRun ${id}`); return origRemove(id); };
    const runStore = pinia._s.get('agentRun');
    for (const k of ['disconnectAgentStream','connectToAgentStream','ensureAgentStreamConnected']) {
      const orig = runStore[k]?.bind(runStore);
      if (orig) runStore[k] = (...a) => { window.__probe.log.push(`${k} ${a[0]} @${location.search}`); return orig(...a); };
    }
  });
  const sentAt = Date.now();
  await page.locator('[data-test="chat-primary-action"]').first().click();
  await page.waitForURL((u) => !/id=temp-/.test(u.toString()) && /\/chat\?id=/.test(u.toString()), { timeout: 120000 });
  r.promotedUrl = page.url().replace(front, '');
  const seen = await page.waitForFunction((m) => (document.querySelector('[data-test="chat-page"]')?.innerText.split(m).length ?? 0) >= 4, marker, { timeout: 90000 }).then(() => Date.now() - sentAt).catch(() => null);
  await page.waitForFunction(() => /Idle/.test(document.querySelector('[data-test="chat-run-status"]')?.innerText ?? ''), null, { timeout: 30000 }).catch(() => {});
  r.replyVisibleAfterMs = seen;
  r.status = await page.locator('[data-test="chat-run-status"]').innerText();
  r.view = (await page.locator('[data-test="chat-page"]').innerText()).slice(-300);
  await page.screenshot({ path: `${out}/catalog-stream.png` });
  await page.waitForTimeout(6000);
  r.identity = await page.evaluate(() => {
    const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
    const ctxs = pinia._s.get('agentContexts');
    const id = new URL(location.href).searchParams.get('id');
    const cur = ctxs.getRun(id);
    const t = window.__probe.tempCtx;
    return { sameObject: cur === t, curStatus: cur?.state?.currentStatus, tempObjStatus: t?.state?.currentStatus, tempObjRunId: t?.state?.runId,
      curMsgs: cur?.state?.conversation?.messages?.length, tempMsgs: t?.state?.conversation?.messages?.length, log: window.__probe.log };
  });
  r.reactivity = await page.evaluate(async () => {
    const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
    const ctxs = pinia._s.get('agentContexts');
    const sel = pinia._s.get('agentSelection');
    const id = new URL(location.href).searchParams.get('id');
    const header = () => document.querySelector('[data-test="chat-run-status"]')?.innerText;
    const before = header();
    const viewEl = document.querySelector('[data-test="chat-run-view"]');
    ctxs.getRun(id).state.currentStatus = 'running';
    await new Promise((res) => setTimeout(res, 300));
    const afterMutate = header();
    return { before, afterMutate, selected: `${sel.selectedType}:${sel.selectedRunId}`, sameViewEl: viewEl === document.querySelector('[data-test="chat-run-view"]'),
      isRawObj: !ctxs.getRun(id).__v_raw, keys: Object.keys(ctxs.getRun(id)).slice(0, 8) };
  });
  // does a reload show the reply (server has it)?
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-run-view"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(4000);
  r.afterReloadHasReply = ((await page.locator('[data-test="chat-page"]').innerText()).split(marker).length) >= 3;
  r.afterReloadStatus = await page.locator('[data-test="chat-run-status"]').innerText();
  r.ws = r.ws.map((w) => ({ ...w, opened: undefined }));
  r.frames = r.frames.slice(0, 25);
  return r;
};
