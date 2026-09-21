import vue from '@vitejs/plugin-vue';
import tailwind from 'tailwindcss';
import { resolve } from 'node:path';
const web=process.cwd(), fixture=resolve(web,'.local/org-authoring-preview');
export default { root:fixture, plugins:[vue()], resolve:{alias:{'vue-router':resolve(web,'../node_modules/.pnpm/node_modules/vue-router/dist/vue-router.mjs'),'graphql-tag':resolve(web,'../node_modules/.pnpm/node_modules/graphql-tag/lib/index.js'),'~/stores/agentOrgDefinitionStore':resolve(fixture,'stores.ts'),'~/stores/agentDefinitionStore':resolve(fixture,'stores.ts'),'~/stores/agentTeamDefinitionStore':resolve(fixture,'stores.ts'),'~/utils/apolloClient':resolve(fixture,'apollo.ts'),'~/services/api':resolve(fixture,'api.ts'),'vue':resolve(web,'../node_modules/.pnpm/node_modules/vue/dist/vue.runtime.esm-bundler.js'),'~':web,'@':web}}, css:{postcss:{plugins:[tailwind({config:resolve(web,'tailwind.config.js')})]}}, server:{host:'127.0.0.1',port:4318,strictPort:true,fs:{allow:[resolve(web,'..')]}} };
