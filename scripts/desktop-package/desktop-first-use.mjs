// First provisioning is an absence-of-conflict decision, not the tag creator's
// positive signing witness. Inspect official metadata; do not download assets.
import { api, base, paged, repo, workflow, signerJob } from './desktop-trust-state.mjs';

const stop = () => { throw Error('First desktop signing setup is not established. Reconcile official release and signer history with the custodian; do not generate a key.'); };
const need = condition => { if (!condition) stop(); };
const id = n => Number.isSafeInteger(n) && n > 0;
// Known history of this repository, not a signing anchor. If the observed failed
// bootstrap run/release has disappeared, an empty collection is not evidence.
const bootstrap = { tag:'v1.5.14-beta.2', run:44685600710, sha:'a728fbcad32a21410e7427bdc70aed9a5baed528' };
const legacyWorkflow = 'bac612b9d71a4832bb91945e885e941ec312dc97'; // pre-managed workflow blob
const managedWorkflow = 'f3bd4edc089f357c7fded198e59cfb5137c537e6'; // reviewed bootstrap workflow blob
const query = `query($cursor:String) {
 repository(owner:"AutoByteus",name:"autobyteus-workspace") { nameWithOwner
  releases(first:25,after:$cursor) { totalCount pageInfo {endCursor hasNextPage}
   nodes { id tagName releaseAssets(first:100) {totalCount pageInfo {hasNextPage} nodes {name}} }
  }
 }
}`;

function inspectAssets(request) {
  let cursor=null, expected, sawBootstrap=false;
  const seen=new Set(), cursors=new Set();
  for(let page=0;page<40;page++){
    // Read-only GraphQL query: nested counts avoid treating truncated embedded
    // REST release.assets arrays as complete. Include old releases and drafts.
    const reply=request('graphql','POST',{query,variables:{cursor}});
    need(!reply?.errors && reply?.data?.repository?.nameWithOwner===repo);
    const releases=reply.data.repository.releases;
    expected??=releases?.totalCount;
    need(id(expected) && expected<=1000 && releases.totalCount===expected && Array.isArray(releases.nodes));
    for(const release of releases.nodes){
      need(typeof release?.id==='string' && release.id && !seen.has(release.id) && typeof release.tagName==='string');
      seen.add(release.id);
      sawBootstrap ||= release.tagName===bootstrap.tag;
      const a=release.releaseAssets;
      need(a?.pageInfo?.hasNextPage===false && Array.isArray(a.nodes) && a.nodes.length===a.totalCount && a.totalCount<=100);
      for(const asset of a.nodes){
        need(typeof asset?.name==='string' && asset.name);
        // Even one partial managed sidecar is conflicting evidence. Legacy
        // unsigned AppImages, updater feeds, server and Android files are not.
        need(!/^AutoByteus_personal_linux-.*\.AppImage\.release\.json(?:\.sig)?$/i.test(asset.name));
      }
    }
    if(releases.pageInfo?.hasNextPage===false){ need(seen.size===expected && sawBootstrap);return; }
    cursor=releases.pageInfo?.endCursor;
    need(releases.pageInfo?.hasNextPage===true && releases.nodes.length===25 && seen.size<expected &&
      typeof cursor==='string' && cursor && !cursors.has(cursor));
    cursors.add(cursor);
  }
  stop();
}

function inspectRuns(request) {
  // 4c58622f6a introduced the protected job on Nov 18. Include the entire
  // UTC day, all events (manual too), failures, and every relevant attempt.
  const runs=paged(base+'/actions/workflows/release-desktop.yml/runs?created=%3E%3D2026-11-18',
    'workflow_runs','{id,run_attempt,path,event,status,head_branch,head_sha,repository:.repository.full_name}',request);
  need(runs.length<=40 && runs.some(r=>r.id===bootstrap.run && r.event==='push' && r.head_branch===bootstrap.tag && r.head_sha===bootstrap.sha));
  let attempts=0;
  for(const run of runs){
    need(id(run.id) && id(run.run_attempt) && run.repository===repo && run.path===workflow && /^[a-f0-9]{40}$/.test(run.head_sha));
    const file=request(base+'/contents/'+workflow+'?ref='+run.head_sha,'GET',undefined,'{path,sha,type}');
    need(file?.type==='file' && file.path===workflow);
    if(file.sha===legacyWorkflow && run.id!==bootstrap.run)continue;
    need(file.sha===managedWorkflow && run.status==='completed' && (attempts+=run.run_attempt)<=64);
    for(let n=1;n<=run.run_attempt;n++){
      const jobs=paged(base+'/actions/runs/'+run.id+'/attempts/'+n+'/jobs','jobs',
        '{id,run_id,run_attempt,head_sha,name,status,conclusion}',request);
      const signer=jobs.filter(j=>j.name===signerJob);
      need(signer.length===1 && signer[0].run_id===run.id && signer[0].head_sha===run.head_sha &&
        signer[0].run_attempt===n && signer[0].status==='completed' && signer[0].conclusion==='skipped');
    }
  }
}

export function requireFirstUse(request=api) {
  try { inspectAssets(request); inspectRuns(request); }
  catch { stop(); } // also on permission, truncation or inconclusive responses
}
