// Implementation-only rendered component inspection. Native IPC and node feeds are fixture boundaries, not E2E proof.
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(resolve('autobyteus-web/package.json'));
const {chromium}=require('playwright-core');
const output=resolve('tickets/in-progress/ubuntu-appimage-sandbox-startup/evidence');
const result={check:'IMP-14',commit:'f1a88a2672',date:new Date().toISOString(),surface:'Nuxt temporary page importing unchanged production components',errors:[],requests:[],states:[],cleanup:false};
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--disable-dev-shm-usage']});
try {
 const context=await browser.newContext({viewport:{width:1100,height:800},locale:'en-US'});
 await context.routeWebSocket(/\/ws\//,()=>{}); // connected but silent synthetic node feeds
 await context.route('http://127.0.0.1:9/**',route=>{
  result.requests.push(route.request().url());
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{updateNotifications:[]}})});
 });
 const page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));
 await page.goto('http://127.0.0.1:18087/implementation-managed-preview',{waitUntil:'networkidle'});
 await page.locator('#preview-panel').waitFor();
 const capture=async(name)=>{
  const state=await page.locator('#preview-panel').evaluate(el=>({text:el.textContent, width:el.getBoundingClientRect().width, scrollWidth:el.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth}));
  result.states.push({name,...state});assert.equal(state.overflow,false);
  await page.screenshot({path:resolve(output,`IMP-14-${name}.png`)});
 };
 assert.match(await page.locator('[data-testid="auto-update-app-explanation"]').innerText(),/will not close or reopen/);
 await capture('ready-wide');
 await page.locator('[data-testid="auto-update-app-toggle"]').focus();await page.keyboard.press('Space');
 await page.waitForFunction(()=>document.querySelector('#actions').textContent==='automatic:false');
 assert.equal(await page.locator('[data-testid="auto-update-app-toggle"]').getAttribute('aria-checked'),'false');
 await page.locator('[data-testid="notification-row-install"]').click();
 assert.equal(await page.locator('#actions').innerText(),'install-requested');
 await page.locator('#refused').click();await capture('refused-wide');
 assert.match(await page.locator('[role="alert"]').innerText(),/Update failed/);
 assert.equal(await page.locator('[data-testid="notification-row-not-retried"]').count(),0);
 await page.locator('[data-testid="notification-row-update"]').click();assert.equal(await page.locator('#actions').innerText(),'download-requested');
 await page.setViewportSize({width:390,height:844});await page.locator('#gone').click();await capture('lost-narrow');
 await page.locator('#zh').click();await page.waitForFunction(()=>document.querySelector('[role="alert"]').textContent.includes('待安装'));
 await capture('lost-narrow-zh');await page.locator('#ready').click();await capture('ready-narrow-zh');
 result.interactions=['keyboard Space changes switch','Install action forwarded once','Download retry action forwarded','localized ready/refusal/receipt-loss states'];
 assert.equal(result.errors.length,0);
} finally {await browser.close();result.cleanup=true;writeFileSync(resolve(output,'IMP-14-rendered-inspection.json'),JSON.stringify(result,null,2)+'\n');}
