import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url));const r=path.resolve(here,'../../../../../..');const web=path.join(r,'autobyteus-web');
const req=createRequire(path.join(web,'package.json'));const vreq=createRequire(req.resolve('@vitejs/plugin-vue'));const ireq=createRequire(req.resolve('@iconify/vue'));
const {createServer}=await import(vreq.resolve('vite'));const {default:vue}=await import(req.resolve('@vitejs/plugin-vue'));
const tailwind=req('tailwindcss');const config=req(path.join(web,'tailwind.config.js'));
const server=await createServer({root:here,configFile:false,cacheDir:path.join(here,'cache'),plugins:[vue()],resolve:{alias:{'~':web,'@':web,vue:ireq.resolve('vue/dist/vue.esm-bundler.js'),'@iconify/vue':req.resolve('@iconify/vue')}},
 css:{postcss:{plugins:[tailwind({...config,content:[path.join(here,'Preview.vue'),path.join(web,'components/workspace/agent/CompactionStatusRow.vue'),path.join(web,'components/progress/CompactionActivityItem.vue')]})]}},
 server:{host:'127.0.0.1',port:0,fs:{allow:[r]}},});await server.listen();console.log(JSON.stringify({pid:process.pid,url:server.resolvedUrls.local[0]}));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0)});
