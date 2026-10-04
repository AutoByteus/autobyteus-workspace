export default async ({ page, shot }) => {
  await page.waitForTimeout(1500);
  const t = await page.evaluate(() => document.body.innerText);
  const total = (t.match(/([\d.,]+) Tokens\s*$/m) ?? [])[1];
  const all = [...t.matchAll(/([\d.,]+) Tokens/g)].map((m) => m[1]);
  const ctx = (t.match(/([\d.,]+ \/ [\d.,]+) context tokens/) ?? [])[1];
  await shot(process.env.SHOT ?? "s14-token");
  return { tokensValues: all, ctx };
};
