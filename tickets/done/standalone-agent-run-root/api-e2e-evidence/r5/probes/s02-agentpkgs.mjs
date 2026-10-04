export default async ({ page, shot, text }) => {
  await page.getByText("Agent Packages", { exact: true }).first().click();
  await page.waitForTimeout(1500);
  await shot("r5-03-agent-packages");
  const inputs = await page.evaluate(() => Array.from(document.querySelectorAll("input, textarea, select, button")).map((e) => `${e.tagName}|${e.getAttribute("type") ?? ""}|${e.getAttribute("placeholder") ?? ""}|${(e.innerText ?? "").trim().slice(0, 40)}`).filter((s) => !/^BUTTON\|\|\|$/.test(s)));
  const t = await text();
  return { text: t.slice(t.indexOf("Agent Packages", 300), t.indexOf("Agent Packages", 300) + 1200), inputs: inputs.slice(0, 40) };
};
