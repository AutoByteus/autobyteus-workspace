// Polls a row's state/visible text every 100 ms until it matches args.until (regex on state|text), recording transitions.
export default async (page, args) => {
  const seen = []; const t0 = Date.now(); const re = new RegExp(args.until);
  for (;;) {
    const snap = await page.evaluate((id) => { const li = document.querySelector(`[data-testid="notification-row-${id}"]`); if (!li) return { state: 'absent', text: '' };
      return { state: li.getAttribute('data-state'), text: li.textContent.replace(/\s+/g, ' ').trim() }; }, args.id);
    const key = `${snap.state} | ${snap.text}`;
    if (seen.at(-1)?.key !== key) seen.push({ atMs: Date.now() - t0, key });
    if (re.test(key)) return { transitions: seen };
    if (Date.now() - t0 > (args.timeoutMs ?? 120000)) return { timeout: true, transitions: seen };
    await page.waitForTimeout(100);
  }
};
