from pathlib import Path
import subprocess,json,datetime
N=Path.cwd();T=N/'tickets/done/nfs-guide-install-commands';D=T/'delivery-evidence/dr-001';base='33171e13855b4bcbcb8a9d650f2403cacb03d965';ops=[]
def run(args,log=None):
 p=subprocess.run(args,capture_output=True,text=True);ops.append({'argv':args,'exit':p.returncode,'stdout':p.stdout,'stderr':p.stderr})
 if log:(D/log).write_text(p.stdout+p.stderr)
 assert p.returncode==0, (args,p.returncode,p.stdout+p.stderr);return p.stdout.strip()
def git(*args):return run(['git',*args])
def save(name,v):D.mkdir(parents=True,exist_ok=True);(D/name).write_text(json.dumps(v,indent=2)+'\n')
try:
 assert git('branch','--show-current')=='codex/nfs-guide-install-commands';git('fetch','origin','personal');assert git('rev-parse','origin/personal')==base, 'Target advanced: checkpoint/reintegrate and impact-plan before finalizing'
 git('add','--',str((D/'finalize.py').relative_to(N)))
 git('commit','-m','docs(delivery): verify and archive NFS guide installation commands')
 ticket=git('rev-parse','HEAD')
 run(['scripts/check_secrets.sh','origin/personal..HEAD'],'secrets-ticket.log')
 git('push','origin','HEAD:refs/heads/codex/nfs-guide-install-commands')
 git('fetch','origin','personal');assert git('rev-parse','origin/personal')==base,'Target advanced after ticket push; do not merge stale base'
 git('switch','-c','finalize/nfs-guide-install-commands','origin/personal')
 git('merge','--no-ff',ticket,'-m','Merge verified copy-only NFS installation and command guide')
 merge=git('rev-parse','HEAD');assert git('rev-parse','HEAD^{tree}')==git('rev-parse',ticket+'^{tree}')
 run(['scripts/check_secrets.sh','origin/personal..HEAD'],'secrets-merged.log')
 run(['python3','scripts/check_repository_artifact_hygiene.py'],'hygiene-merged.log')
 run(['python3','scripts/check_licensing.py'],'licensing-merged.log')
 git('fetch','origin','personal');assert git('rev-parse','origin/personal')==base,'Target advanced before personal push; do not push'
 git('push','origin','HEAD:refs/heads/personal')
 refs={x.split()[1]:x.split()[0] for x in git('ls-remote','origin','refs/heads/personal','refs/heads/codex/nfs-guide-install-commands').splitlines()};assert refs['refs/heads/personal']==merge and refs['refs/heads/codex/nfs-guide-install-commands']==ticket
 save('source-finalization.json',{'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'Source finalization Completed','base':base,'ticketCommit':ticket,'mergeCommit':merge,'treeEqual':True,'remoteHeads':refs,'policy':'ticket commit/secret gate/push; freshpersonal --no-ff/merged secret+hygiene+licensing/fresh target guard/push','integration':'No new base; merged tree equals evidence-verified ticket with docs-only correction','secretGates':'ticket and merged exit0, logs retained','release':'No release; no version/tag/workflow dispatch','canonicalCheckout':'Not used for any write/checkout/finalization','cleanup':'Pending safe local branch retirement and retained evidence checkout','pipelineInventory':'Pending read-only verification; current workflows tag/manual only'})
 print(json.dumps({'ticket':ticket,'personal':merge,'remoteVerified':True},indent=2),flush=True)
finally:save('finalization-commands.json',ops)
