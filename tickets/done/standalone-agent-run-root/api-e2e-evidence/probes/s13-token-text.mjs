export default async ({ page, shot }) => {
  const tab = page.getByText("Token", { exact: true }).first();
  await tab.click();
  await page.waitForTimeout(3000);
  await shot("s13-host-token-meter");
  const t = await page.evaluate(() => document.body.innerText);
  const i = t.search(/Total|tokens/i);
  const lines = t.split("\n").filter((l) => /\d[\d,.]*\s*(k|K|M)?\b/.test(l) && /token|total|input|output|context|prompt|cost|\$|%/i.test(l));
  return { lines: lines.slice(0, 30) };
};
