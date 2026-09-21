import { createApp, h, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import ServerLoading from '~/components/server/ServerLoading.vue'
import { useServerStore } from '~/stores/serverStore'
import { ServerStatus } from '~/types/serverStatus'
import '~/assets/css/main.css'
const notice = 'Startup is taking longer than usual. Waiting for the backend; see logs for details.'
window.electronAPI = {
 getLogFilePath: async () => '/isolated/startup-preview/logs/server.log',
 checkServerHealth: async () => ({ status: 'starting' }),
 restartServer: async () => undefined,
} as any
const pinia=createPinia();setActivePinia(pinia)
const store=useServerStore(); store.isInitialStartup=false
const urls={graphql:'http://127.0.0.1:29695/graphql',rest:'',graphqlWs:'',terminalWs:'',transcription:'',health:''}
const change=(status:ServerStatus,message?:string)=>store.updateServerStatus({status,message,baseUrl:'http://127.0.0.1:29695',urls})
change(ServerStatus.STARTING,notice)
const controls=()=>h('nav',{style:'position:fixed;bottom:0;left:0;right:0;z-index:10001;background:#ddd;padding:10px;display:flex;gap:12px;font:14px sans-serif;'},[
 h('strong','RENDERER PREVIEW ONLY'),
 ...[ServerStatus.STARTING,ServerStatus.RESTARTING,ServerStatus.RUNNING,ServerStatus.ERROR].map(status=>h('button',{onClick:()=>change(status,status==='error'?'Essential startup gate failed':status==='running'?undefined:notice)},status)),
 h('button',{onClick:()=>change(ServerStatus.STARTING)},'new attempt'),
])
const app=createApp({render:()=>h('main',[h('h1',{style:'padding:30px;font:28px sans-serif'},'Application content (preview)'),h(ServerLoading),controls()])})
app.use(pinia)
app.config.globalProperties.$t=(key:string)=>{
 const copy={
 starting_autobyteus:'Starting AutoByteus',restarting_server:'Restarting Server',application_error:'Application Error',
 initial_server_startup_may_take_a:'Initial server startup may take a moment.',
 backend_service_initializing:'Backend service initializing',run_health_check:'Run Health Check',restart_server:'Restart Server',
 check_server_health:'Check Server Health',reset_all_server_data_and_restart:'Reset All Server Data and Restart',
 }
 return copy[key.split('.').pop()]||key
}
app.mount('#app')
