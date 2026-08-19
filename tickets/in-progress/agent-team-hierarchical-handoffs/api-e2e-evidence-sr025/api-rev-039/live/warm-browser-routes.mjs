import { chromium } from '../../../../../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage();
const results=[];
for (const path of ['/agent-teams?view=team-list','/agents?view=list','/workspace']) {
  const response=await page.goto(`http://127.0.0.1:31239${path}`,{waitUntil:'networkidle',timeout:120000});
  await page.waitForTimeout(1500);
  results.push({path,status:response?.status()??null,title:await page.title(),bodyBytes:(await page.locator('body').innerText()).length});
}
await browser.close();
console.log(JSON.stringify({result:'PASS',results},null,2));
