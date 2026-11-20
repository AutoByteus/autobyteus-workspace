// Public, disposable metadata for the documented pre-M1 bootstrap case.
import { repo, base, workflow, signerJob } from '../desktop-trust-state.mjs';
export function historyFixture(){
  const release={id:'older',tagName:'v1.5.13',releaseAssets:{totalCount:1,pageInfo:{hasNextPage:false},nodes:[{name:'AutoByteus_personal_linux-x64-1.5.13.AppImage'}]}};
  const bootstrapRelease={id:'beta',tagName:'v1.5.14-beta.2',releaseAssets:{totalCount:8,pageInfo:{hasNextPage:false},
    nodes:Array.from({length:8},(_,i)=>({name:i<6?'server-artifact-'+i:'android-artifact-'+i}))}};
  const sha='a728fbcad32a21410e7427bdc70aed9a5baed528';
  const run={id:44685600710,head_branch:bootstrapRelease.tagName,head_sha:sha,event:'push',status:'completed',path:workflow,repository:repo,run_attempt:1};
  const job={id:123,run_id:run.id,run_attempt:1,head_sha:sha,name:signerJob,status:'completed',conclusion:'skipped'};
  const releases={totalCount:2,pageInfo:{hasNextPage:false,endCursor:'done'},nodes:[bootstrapRelease,release]};
  const runs=[run],jobs=[job];
  const file={path:workflow,type:'file',sha:'f3bd4edc089f357c7fded198e59cfb5137c537e6'};
  const state={releases,runs,run,jobs,job,file,calls:[],denied:null};
  state.request=(path,method,body)=>{
    state.calls.push(path);
    if(state.denied && path.includes(state.denied))throw Error('denied');
    if(path==='graphql' && method==='POST' && body.query.startsWith('query('))return {data:{repository:{nameWithOwner:repo,releases}}};
    if(path.startsWith(base+'/actions/workflows/release-desktop.yml/runs?created='))return {total_count:runs.length,items:runs};
    if(path.startsWith(base+'/contents/'+workflow+'?ref='))return file;
    if(path.startsWith(base+'/actions/runs/'+run.id+'/attempts/') && path.includes('/jobs?'))return {total_count:jobs.length,items:jobs};
    throw Error('unexpected test metadata path');
  };
  return state;
}
