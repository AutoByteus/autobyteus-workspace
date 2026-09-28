// CE-17: Daily Assistant (ALL_INSTALLED) on a given runtime; tag the bundled skill and expect its marker.
import fs from 'node:fs/promises';
import path from 'node:path';
const walk = async (dir, depth = 0, acc = []) => {
  if (depth > 6) return acc;
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/[\\/]\.(agents|claude|codex)[\\/]skills$/.test(p)) acc.push({ dir: p, skills: (await fs.readdir(p)).sort() });
      else await walk(p, depth + 1, acc);
    }
  }
  return acc;
};
export default async ({ page, front, out }) => {
  const runtime = process.env.RUNTIME;
  const root = process.env.ROOT;
  const r = { runtime };
  await page.goto(`${front}/chat`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-new"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.locator('[data-test="chat-model-trigger"]').click();
  await page.locator(`[data-test="chat-runtime-${runtime}"]`).click();
  await page.locator('[data-test^="chat-model-option-"]').first().waitFor({ timeout: 120000 });
  r.models = await page.locator('[data-test^="chat-model-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')));
  const model = process.env.MODEL && r.models.includes(process.env.MODEL) ? process.env.MODEL : r.models[0];
  r.model = model;
  await page.locator(`[data-test="chat-model-option-${model}"]`).click();
  r.trigger = await page.locator('[data-test="chat-model-trigger"]').innerText();
  const input = page.locator('[data-test="chat-message-input"] textarea, textarea[data-test="chat-message-input"]').first();
  await input.click();
  await input.type('/probe-bund');
  await page.locator('[data-test="chat-skill-option-probe-bundled"]').click();
  await input.type('Reply with the marker from the skill only.');
  const started = Date.now();
  await page.locator('[data-test="chat-primary-action"]').first().click();
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/temp-/.test(u.toString()), { timeout: 180000 });
  r.url = page.url().replace(front, '');
  // skill exposure while the run is live
  await page.waitForTimeout(5000);
  r.skillDirs = await walk(root);
  r.replied = await page.waitForFunction(() => /BUNDLED-OK/.test(document.querySelector('[data-test="chat-run-view"] .overflow-y-auto, [data-test="chat-run-view"]')?.innerText.replace(/SENT TO THE AGENT AS[\s\S]*?Reply with the marker from the skill only\./, '') ?? ''), null, { timeout: 300000 }).then(() => Date.now() - started).catch(() => null);
  r.skillDirsAfterReply = await walk(root);
  r.status = await page.locator('[data-test="chat-run-status"]').innerText();
  r.tail = (await page.locator('[data-test="chat-page"]').innerText()).slice(-500);
  await page.screenshot({ path: `${out}/runtime-${runtime}.png` });
  return r;
};
