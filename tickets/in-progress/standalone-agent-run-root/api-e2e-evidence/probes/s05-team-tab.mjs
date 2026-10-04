export default async ({ page, shot }) => {
  await page.getByRole("button", { name: "Team", exact: true }).first().click().catch(async () => page.getByText("Team", { exact: true }).first().click());
  await page.waitForTimeout(2500);
  await shot("s05-collaborator-team-tab");
  const panel = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("aside, section, div")).filter((e) => /from|to/i.test(e.innerText ?? "") && /General Agent/.test(e.innerText ?? ""));
    const smallest = all.sort((a, b) => a.innerText.length - b.innerText.length)[0];
    return smallest ? smallest.innerText.slice(0, 1200) : null;
  });
  const body = await page.evaluate(() => document.body.innerText);
  const lines = body.split("\n").filter((l) => /general agent|general_agent/i.test(l));
  return { lines, panel };
};
