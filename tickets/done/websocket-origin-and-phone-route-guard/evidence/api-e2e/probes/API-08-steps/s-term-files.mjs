// On the open run's workspace: Terminal tab (type a command, read the output) and Files tab (tree; a file created on
// disk appears live through the file-explorer stream).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
export default async ({ page, shot, log }) => {
  const label = process.env.LABEL; const out = {};
  await page.locator('[data-tab-name="terminal"]:visible').first().click({ timeout: 10000 });
  await page.waitForTimeout(3000);
  const term = page.locator('[data-test="terminal-panel"], [data-test="right-side-terminal-panel"]').first();
  await term.click({ timeout: 10000 }).catch(() => {});
  const marker = `ABX403_TERM_${label}`;
  await page.keyboard.type(`echo ${marker}_$((40+3))`, { delay: 15 }); await page.keyboard.press('Enter');
  let termText = '';
  for (let i = 0; i < 20; i += 1) { await page.waitForTimeout(700); termText = await term.innerText({ timeout: 1500 }).catch(() => ''); if (termText.includes(`${marker}_43`)) break; }
  out.terminal = { answered: termText.includes(`${marker}_43`), tail: termText.replace(/\s+/g, ' ').slice(-200) };
  await shot(page, `API-08-${label}-terminal`);
  await page.locator('[data-tab-name="files"]:visible').first().click({ timeout: 10000 });
  await page.waitForTimeout(2500);
  const panelText = async () => page.evaluate(() => [...document.querySelectorAll('[data-test*="file"],[data-testid*="file"]')].filter(e => e.offsetParent).map(e => e.innerText).join('\n'));
  const before = await panelText();
  const fresh = `abx403-live-${label}.md`;
  if (process.env.CREATE_CMD === 'docker') execFileSync('docker', ['exec', 'abx403-api-e2e-node', 'sh', '-c', `echo live > /root/abx403-ws/${fresh}`]);
  else fs.writeFileSync(`${process.env.WS_DIR}/${fresh}`, 'live\n');
  let after = '';
  for (let i = 0; i < 20; i += 1) { await page.waitForTimeout(700); after = await panelText(); if (after.includes(fresh)) break; }
  out.files = { listedReadme: before.includes('README.md'), listedDocs: before.includes('docs'), liveFileAppeared: after.includes(fresh), fresh };
  await shot(page, `API-08-${label}-files`);
  return out;
};
