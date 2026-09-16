import { reactive } from 'vue';
const original={id:'disposable',name:'Software Engineering Department',description:'A disposable renderer fixture. Shared Teams remain independent; no server is connected.',instructions:'Preserve instructions',revision:'r1',avatarUrl:null,members:[],handoffs:[],category:null,defaultLaunchConfig:null};
export const controls=reactive({failDelete:false,failUpload:false,events:[] as string[]});
const store=reactive({definitions:[original],loading:false,error:null,byId:(id:string)=>store.definitions.find(d=>d.id===id),fetchAll:async()=>{},
create:async(input:any)=>{const d={...original,...input};store.definitions.push(d);return d},
update:async(id:string,revision:string,input:any)=>{const d={...store.byId(id),...input,avatarUrl:input.avatarUrl===undefined?store.byId(id)?.avatarUrl:input.avatarUrl||null,revision:'r2'};store.definitions=store.definitions.map(o=>o.id===id?d:o);controls.events.push('Save '+id);return d},
remove:async(id:string)=>{controls.events.push('Delete '+id);await new Promise(r=>setTimeout(r,1500));if(controls.failDelete)throw new Error('Read-only package: disposable rejection fixture.');store.definitions=store.definitions.filter(d=>d.id!==id);return true}});
export const useAgentOrgDefinitionStore=()=>store;
export const useAgentDefinitionStore=()=>({sharedAgentDefinitions:[],getAgentDefinitionById:()=>null,fetchAllAgentDefinitions:async()=>{}});
export const useAgentTeamDefinitionStore=()=>({sharedAgentTeamDefinitions:[],getAgentTeamDefinitionById:()=>null,fetchAllAgentTeamDefinitions:async()=>{}});
