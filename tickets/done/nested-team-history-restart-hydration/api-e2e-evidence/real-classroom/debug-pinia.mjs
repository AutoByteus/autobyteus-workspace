import { chromium } from '../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1600,height:1100}}); page.setDefaultTimeout(60000);
try {
 await page.goto('http://127.0.0.1:3000/workspace',{waitUntil:'domcontentloaded'});
 await page.locator('[data-test="workspace-row"] button').first().click();
 await page.locator('[data-test="workspace-team-definition-row-nested-classroom-test"]').click();
 const row=page.locator('[data-test="workspace-team-row-nested_classroom_test_team_081587e1388b4407a50c84adcc955d91"]');
 await row.click();
 await page.locator('[data-test="workspace-center-pane"]').waitFor();
 await page.waitForTimeout(2000);
 const out=await page.evaluate(()=>{
   const keys=Object.keys(window).filter(k=>/nuxt|pinia|vue/i.test(k));
   const nuxt=window.$nuxt;
   const p=nuxt?.$pinia;
   const app=document.querySelector('#__nuxt')?.__vue_app__;
   const symbols=app?Reflect.ownKeys(app._context.provides).map(k=>({key:String(k),type:typeof app._context.provides[k]})):[];
   const pk=app&&Reflect.ownKeys(app._context.provides).find(k=>String(k)==='Symbol(pinia)');
   const pinia=pk?app._context.provides[pk]:null;
   return {keys, hasNuxt:!!nuxt, nuxtKeys:nuxt?Object.keys(nuxt):[], hasPinia:!!pinia, stores:pinia?[...pinia._s.entries()].map(([id,s])=>({id,keys:Object.keys(s), methods:Object.keys(s).filter(k=>typeof s[k]==='function')})):[],symbols};
 });
 console.log(JSON.stringify(out,null,2));
} finally {await browser.close();}
