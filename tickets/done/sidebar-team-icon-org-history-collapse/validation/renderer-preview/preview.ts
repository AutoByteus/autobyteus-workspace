import {createApp,defineComponent,computed,reactive,ref,h} from 'vue';
import Section from '../../components/workspace/history/WorkspaceHistoryWorkspaceSection.vue';
import {useWorkspaceHistoryTreeState} from '../../composables/useWorkspaceHistoryTreeState';
import {useRunHistoryAvatarState} from '../../composables/useRunHistoryAvatarState';
import {localizationRuntime} from '../../localization/runtime/localizationRuntime';
import '../../assets/css/main.css';
const agentOrgDefinitionGroup = (): AgentOrgHistoryDefinitionGroup => {
  const launch = {
    runtimeKind: 'codex_app_server' as const,
    llmModelIdentifier: 'gpt-5.6-sol',
    llmConfig: null,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY' as const,
    workspaceRootPath: '/ws/a',
  };
  return {
    stableKey: 'agent_org_definition:org-definition',
    definitionId: 'org-definition',
    name: 'Delivery Org',
    runs: [{
      stableKey: 'agent_org_run:org-run',
      rootSubjectKind: 'agent_org',
      rootRunId: 'org-run',
      createdAt: '2026-09-03T00:00:00.000Z',
      archivedAt: null,
      isActive: true,
      summary: 'Deliver current package',
      executionTree: {
        schemaVersion: 1,
        subjectKind: 'agent_org',
        createdAt: '2026-09-03T00:00:00.000Z',
        archivedAt: null,
        applicationBinding: null,
        handoffs: [],
        rootOrg: {
          address: '/', orgDefinitionId: 'org-definition', orgDefinitionName: 'Delivery Org', orgRunId: 'org-run',
          defaultLaunchConfiguration: launch, taskExecutions: [],
          members: [{
            address: '/software', teamDefinitionId: 'software-team', role: null, description: null,
            teamRunId: 'mounted-team-run', coordinatorAddress: '/software/implementation',
            defaultLaunchConfiguration: launch, taskExecutions: [],
            members: [{
              address: '/software/implementation', agentDefinitionId: 'implementation-agent', role: null,
              description: null, agentRunId: 'implementation-run', platformAgentRunId: null,
              launchConfiguration: launch,
            }],
          }],
        },
      },
    }],
  };
};

await localizationRuntime.setPreference('en');
const svg='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#4f46e5"/><path d="M10 24 20 34 38 12" fill="none" stroke="white" stroke-width="5"/></svg>');
const app=createApp(defineComponent({setup(){
const group=reactive(agentOrgDefinitionGroup());
group.runs.push({...agentOrgDefinitionGroup().runs[0],rootRunId:'stopped',stableKey:'stopped',isActive:false,summary:'Stopped history run'});
const definitions=ref([]), events=ref([]), draft=ref('Retained unsent draft');
const selected=ref({rootRunId:'org-run',focusAddress:'/software/implementation',selection:{kind:'agent_execution',agentRunId:'implementation-run'}});
const history=reactive({selectedRunId:null,selectedTeamRunId:null,workspaceGroups:[],navigationTopologyRevision:0,getTreeNodes:()=>[],getTeamNodes:()=>[],getAgentNavigationAncestry:()=>null,getTeamNavigationAncestry:()=>null,getTeamMemberNavigationAncestorRowKeys:()=>[],getAgentOrgNavigationAncestry:()=>({workspaceId:'ws',definitionId:'org-definition',teamAddresses:['/software']})});
const tree=useWorkspaceHistoryTreeState({runHistoryStore:history,selectionStore:{selectedRunId:null,selectedType:null},selectedAgentOrg:selected});
const avatars=useRunHistoryAvatarState({loading:ref(false),agentDefinitions:computed(()=>[]),teamDefinitions:computed(()=>definitions.value),orgDefinitions:computed(()=>definitions.value)});
const state={...tree,selectedRunId:null,isRunTerminating:()=>false,isTeamTerminating:()=>false,isRunDeleting:()=>false,isTeamDeleting:()=>false,isRunArchiving:()=>false,isTeamArchiving:()=>false,isWorkspaceRemoving:()=>false,isWorkspaceHistoryLoading:()=>false,workspaceHistoryError:()=>null,formatRelativeTime:()=> 'now',isTeamRunSelected:()=>false};
const actions=Object.fromEntries(['onRemoveWorkspace','onCreateRun','onSelectRun','onTerminateRun','onArchiveRun','onDeleteRun','onTerminateTeam','onArchiveTeam','onDeleteTeam','onSelectTeam','onSelectTeamMember','onSelectAgentOrgMember','onInspectAgentOrgExecution','onTerminateAgentOrg','onOpenAgentOrgRun'].map(n=>[n,()=>events.value.push(n)]));
const team={teamRunId:'team-run',teamDefinitionId:'team-def',teamDefinitionName:'Software Engineering Team',workspaceRootPath:'/ws/a',summary:'Current implementation',lastActivityAt:new Date().toISOString(),isActive:true,deleteLifecycle:'READY',focusedAgentRunId:'',members:[],executionRows:[],rootTeam:{children:[]}};
const button=(text,fn)=>h('button',{class:'border rounded px-3 py-2 mr-2 mb-2',onClick:fn},text);
return()=>h('main',{class:'flex flex-wrap min-h-screen bg-white text-gray-800'},[
h('aside',{class:'w-80 flex-none border-r p-3'},[h('h1',{class:'mb-4 text-sm font-semibold'},'Sidebar — local preview'),h(Section,{workspaceNode:{workspaceId:'ws',stableKey:'ws',workspaceRootPath:'/ws/a',workspaceName:'Implementation workspace',workspaceKind:'filesystem',canRemoveFromWorkspaces:false,agents:[],agentOrgDefinitions:[group]},workspaceTeams:[team],workspaceTeamHistoryGroups:[],state,avatars,actions})]),
h('section',{class:'p-8 max-w-2xl'},[h('h2',{class:'text-xl font-semibold mb-3'},'Selected implementation agent'),h('p',{class:'mb-4'},'Existing conversation remains selected.'),h('textarea',{class:'block border rounded p-3 w-full mb-5',value:draft.value,onInput:e=>draft.value=e.target.value,'aria-label':'Draft'}),h('p',{class:'text-sm text-gray-500 mb-3'},'Validation controls — no backend:'),button('Show avatars',()=>definitions.value=[{id:'org-definition',avatarUrl:svg},{id:'team-def',avatarUrl:svg}]),button('Missing avatars',()=>definitions.value=[]),button('Broken avatars',()=>definitions.value=[{id:'org-definition',avatarUrl:'/missing-org.png'},{id:'team-def',avatarUrl:'/missing-team.png'}]),button('Refresh history',()=>history.navigationTopologyRevision++),h('pre',{'data-test':'events'},JSON.stringify(events.value))])]);
}}));
app.config.globalProperties.$t=(key,params)=>localizationRuntime.translate(key,params);app.mount('#app');
