import { chromium } from '/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/autobyteus-web/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page = await browser.newPage({viewport:{width:1600,height:1000}});
await page.goto('http://127.0.0.1:3107/agent-teams',{waitUntil:'networkidle'});
const card=page.locator('div.group').filter({hasText:'Software Engineering Team'});
await card.getByRole('button',{name:'Run',exact:true}).click();
await page.waitForURL('**/workspace');
await page.locator('#team-run-runtime-kind').selectOption('codex_app_server');
await page.waitForTimeout(1500);
const buttons=await page.locator('button').allTextContents();
console.log('buttons',buttons.map(x=>x.trim()).filter(Boolean));
const mb=page.getByRole('button',{name:/Select a model/}); console.log('modelButtons',await mb.count());
if(await mb.count()){ await mb.first().click(); await page.waitForTimeout(300); console.log('body-tail',(await page.locator('body').innerText()).slice(-5000)); }
await browser.close();
