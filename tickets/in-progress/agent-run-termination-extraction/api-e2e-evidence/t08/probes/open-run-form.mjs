// args: [navButton, cardName, shotName]
export default async ({ page, shot, text, args }) => {
  await page.getByRole("button", { name: args[0], exact: true }).first().click();
  await page.waitForTimeout(1500);
  const runBtns = page.getByRole("button", { name: /^Run/ });
  const n = await runBtns.count(); let idx = -1;
  for (let i = 0; i < n; i++) { const t = await runBtns.nth(i).evaluate((b) => { let e = b; for (let k = 0; k < 6 && e; k++) { if (/\n/.test(e.innerText) && e.innerText.length > 40) return e.innerText; e = e.parentElement; } return ""; }); if (t.includes(args[1])) { idx = i; break; } }
  await runBtns.nth(idx).click();
  await page.waitForTimeout(2500);
  await shot(args[2]);
  return { idx, n, text: (await text()).slice(0, 1500) };
};
