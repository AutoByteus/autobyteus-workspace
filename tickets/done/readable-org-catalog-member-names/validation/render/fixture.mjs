// Synthetic read-only transport for implementation rendering, not API acceptance.
import http from 'node:http';
let mode='ready', renamed=false;const pending=[];
const definitions=new Map();
const members=(owner)=>[
 {memberName:'research_group',ref:`agent-org-owned-team:${owner}:squad`,refType:'AGENT_TEAM',refScope:'AGENT_ORG_OWNED'},
 {memberName:'lead_agent',ref:`agent-org-owned-agent:${owner}:guide`,refType:'AGENT',refScope:'AGENT_ORG_OWNED'},
 {memberName:'shared_group',ref:'shared-team',refType:'AGENT_TEAM',refScope:'SHARED'},
 {memberName:'shared_worker',ref:'shared-agent',refType:'AGENT',refScope:'SHARED'},
];
const orgs=['alpha','beta'].map(id=>({__typename:'AgentOrgDefinition',id,name:id==='alpha'?'Research Organization':'Operations Organization',description:'Synthetic catalog check: owned and shared Agent/Team references.',instructions:'',category:'validation',avatarUrl:null,revision:'1',members:members(id),handoffs:[],defaultLaunchConfig:null}));
for(const org of orgs)for(const member of org.members){
 const team=member.refType==='AGENT_TEAM';const owned=member.refScope==='AGENT_ORG_OWNED';
 definitions.set(member.ref,{__typename:team?'AgentTeamDefinition':'AgentDefinition',id:member.ref,
 name:owned?(team?(org.id==='alpha'?'Research & Development Team':'Operations Team'):(org.id==='alpha'?'Research Director':'Operations Director')):(team?'Shared Review Team':'Shared Reviewer'),
 description:'Synthetic member',instructions:'',category:null,avatarUrl:null,revision:'1',handoffs:[],ownershipScope:member.refScope,
 ownerOrgId:owned?org.id:null,ownerOrgName:owned?org.name:null,ownerTeamId:null,ownerTeamName:null,ownerApplicationId:null,ownerApplicationName:null,ownerPackageId:null,ownerLocalApplicationId:null,
 coordinatorMemberName:'worker',nodes:[{memberName:'worker',ref:'unused-child',refScope:'TEAM_LOCAL'}],defaultLaunchConfig:null});
}
http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','content-type,apollographql-client-name,apollographql-client-version');res.setHeader('Content-Type','application/json');
 if(req.method==='OPTIONS'){res.end();return}
 if(req.url.startsWith('/__mode/')){mode=req.url.split('/').pop();while(pending.length)pending.shift()();res.end('{}');return}
 if(req.url==='/__rename'){renamed=true;res.end('{}');return}
 if(req.url.includes('health')){res.end('{"status":"ok"}');return}
 if(!req.url.includes('graphql')){res.end('{}');return}
 let body='';for await(const part of req)body+=part;
 const p=JSON.parse(body);console.log(p.operationName,JSON.stringify(p.variables));
 const exact=p.operationName==='GetAgentOrgReferencedAgent'||p.operationName==='GetAgentOrgReferencedTeam';
 if(exact&&mode==='pending')await new Promise(resolve=>pending.push(resolve));
 if(exact&&mode==='error'){res.end('{"errors":[{"message":"Synthetic unavailable read"}]}');return}
 let data;
 if(exact){let value=definitions.get(p.variables.id)??null;if(renamed&&value)value={...value,name:'Updated '+value.name};data={[p.operationName==='GetAgentOrgReferencedTeam'?'agentTeamDefinition':'agentDefinition']:value}}
 else if(p.operationName==='GetAgentOrgDefinitions')data={agentOrgDefinitions:orgs};
 else if(p.operationName==='GetAgentDefinitions')data={agentDefinitions:[]};
 else if(p.operationName==='GetAgentTeamDefinitions')data={agentTeamDefinitions:[]};
 else if(p.operationName==='GetApplicationsCapability')data={applicationsCapability:{enabled:false,scope:'BOUND_NODE',settingKey:'ENABLE_APPLICATIONS',reason:null}};
 else if(p.operationName==='GetAllWorkspaces')data={workspaces:[]};
 else if(p.operationName==='ListWorkspaceRunHistory')data={listWorkspaceRunHistory:[]};
 else if(p.operationName==='ListCollaborationRootHistory')data={listCollaborationRootHistory:[]};
 else if(p.operationName==='GetServerSettings')data={getServerSettings:[]};
 else {console.log('UNHANDLED',p.operationName);res.end('{"errors":[{"message":"Fixture is read only"}]}');return}
 res.end(JSON.stringify({data}));
}).listen(50882,'127.0.0.1',()=>console.log('Owned renderer fixture50882'));
