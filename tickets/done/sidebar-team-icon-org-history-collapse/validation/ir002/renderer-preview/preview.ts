import { createApp,defineComponent,h } from 'vue';
import { createPinia } from 'pinia';
import { createRouter,createWebHashHistory } from 'vue-router';
import Experience from '../../components/agentOrgs/AgentOrgExperience.vue';
import { controls } from './stores';
import { localizationRuntime } from '../../localization/runtime/localizationRuntime';
import '../../assets/css/main.css';
const router=createRouter({history:createWebHashHistory(),routes:[{path:'/:pathMatch(.*)*',component:Experience}]});
await localizationRuntime.setPreference('en');
const app=createApp(defineComponent({setup(){return()=>h('div',[
h('div',{class:'px-4 py-2 bg-amber-50 text-sm'},['Local renderer fixture · no backend · ',h('label',[h('input',{type:'checkbox',onChange:(e:any)=>controls.failDelete=e.target.checked}),' Reject delete ']),h('label',[h('input',{type:'checkbox',onChange:(e:any)=>controls.failUpload=e.target.checked}),' Reject upload ']),h('button',{class:'border rounded ml-2 px-2',onClick:()=>localizationRuntime.setPreference('zh-CN')},'中文')]),h(Experience),h('pre',{class:'px-4 text-xs whitespace-pre-wrap break-all','data-test':'events'},JSON.stringify(controls.events))])}}));
app.use(createPinia());app.use(router);app.config.globalProperties.$t=(k,p)=>localizationRuntime.translate(k,p);await router.isReady();app.mount('#app');
