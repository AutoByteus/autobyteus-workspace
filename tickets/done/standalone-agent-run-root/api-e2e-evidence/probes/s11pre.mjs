export default async ({ page }) => (await page.evaluate(() => document.querySelector("aside").innerText)).slice(0, 800);
