export default async ({ page, shot, text }) => {
  await shot("r5-07b-model-picker");
  const sel = await page.evaluate(() => Array.from(document.querySelectorAll("select")).map((s) => s.value + " / " + Array.from(s.options).map((o) => o.text).join("|")));
  const t = await text();
  const i = t.indexOf("LLM Model");
  return { selects: sel, around: t.slice(i, i + 900) };
};
