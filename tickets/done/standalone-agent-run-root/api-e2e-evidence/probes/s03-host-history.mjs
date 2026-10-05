export default async ({ page, shot, text }) => {
  await page.getByText("Use send_message_to to message the mentioned collaborator", { exact: false }).first().click();
  await page.waitForTimeout(4000);
  await shot("s03-host-prechange-history");
  const t = await text();
  const segs = await page.evaluate(() => Array.from(document.querySelectorAll("*")).filter((e) => e.children.length < 3 && /^From\s/.test((e.textContent ?? "").trim())).map((e) => (e.textContent ?? "").trim().slice(0, 120)).slice(0, 10));
  const i = t.indexOf("SEEDED-ONE");
  return { fromSegments: segs, around: t.slice(Math.max(0, i - 400), i + 200), hasRawHeader: /You received a message from sender name/.test(t) };
};
