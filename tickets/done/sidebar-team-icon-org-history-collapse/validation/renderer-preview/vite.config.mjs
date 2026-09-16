import vue from '@vitejs/plugin-vue';
import tailwind from 'tailwindcss';
import {resolve} from 'node:path';
const web = process.cwd();
export default { root: resolve(web,'.local/sidebar-preview'), plugins:[vue()], resolve:{alias:{'~/stores/runHistoryReadModel':resolve(web,'.local/sidebar-preview/read-model.ts'),'~/stores/runHistoryStore':resolve(web,'.local/sidebar-preview/history.ts'),'vue':resolve(web,'../node_modules/.pnpm/node_modules/vue/dist/vue.runtime.esm-bundler.js'),'~':web,'@':web}}, css:{postcss:{plugins:[tailwind({config:resolve(web,'tailwind.config.js')})]}}, server:{host:'127.0.0.1',port:4318,strictPort:true,fs:{allow:[resolve(web,'..')]}} };
