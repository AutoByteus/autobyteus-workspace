// Opens a run by id in this window (?id=) and sends one message from the composer; returns what follows the marker.
export default async ({ page, shot }) => {
  const runId = process.env.RUN_ID; const label = process.env.LABEL;
  await page.evaluate(id => { location.hash = `#/chat?id=${id}`; }, runId); await page.waitForTimeout(4000);
  const marker = `ABX403-${label}-${Date.now().toString(36)}`;
  const input = page.locator('textarea[placeholder^="Ask anything"]').last();
  await input.click({ timeout: 15000 }); await input.fill(`Desktop origin check. Marker ${marker}`);
  await page.keyboard.press('Enter');
  let after = '';
  for (let i = 0; i < 40; i += 1) { await page.waitForTimeout(1000); const t = await page.locator('[data-test="chat-run-frame"], [data-test="agent-workspace-surface"]').first().innerText({ timeout: 1500 }).catch(() => ''); after = t.includes(marker) ? t.split(marker).pop() : ''; if (after.replace(/\s+/g, ' ').trim().length > 20 && i > 4) break; }
  await shot(page, `API-08-${label}-run-streamed`);
  return { runId, marker, markerShown: Boolean(after !== ''), after: after.replace(/\s+/g, ' ').trim().slice(0, 400) };
};
