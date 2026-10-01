from pathlib import Path
import json,hashlib,subprocess,re,difflib,datetime,shutil
r=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis'); t=r/'tickets/in-progress/context-compaction-simplification-analysis'; e=t/'delivery-evidence/dr-001'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
run=lambda *args:subprocess.check_output(args,cwd=r,text=True)
paths=json.loads((e/'docs-changed-paths.json').read_text())
canonical=[t/x for x in ['docs-sync-report.md','handoff-summary.md','release-deployment-report.md','delivery-revision-record.md','release-notes.md']]
entry=json.loads((e/'entry-audit.json').read_text()); api=json.loads((t/'api-e2e-evidence/api-rev-008/final-audit.json').read_text())
missing=[]; changed=[]
for p,h in entry['sha256'].items():
 q=Path(p)
 if not q.is_file(): missing.append(p)
 elif sha(q)!=h: changed.append(p)
durable=[p for p,h in api['currentDurableSha256'].items() if not (r/p).is_file() or sha(r/p)!=h]
base=run('git','rev-parse','origin/personal').strip(); head=run('git','rev-parse','HEAD').strip(); branch=run('git','branch','--show-current').strip()
# Tracked patch comparison excludes only explicitly owned docs.
def without_docs(patch):
 chunks=re.split(r'(?=^diff --git )',patch,flags=re.M)
 return ''.join(x for x in chunks if not any(x.startswith('diff --git a/'+p+' b/'+p+'\n') for p in paths))
patch=run('git','diff'); index=run('git','diff','--cached')
unowned_unchanged=without_docs(patch)==without_docs((e/'entry-tracked.patch').read_text())
index_unchanged=index==(e/'entry-index.patch').read_text()
status=run('git','status','--porcelain=v1','--untracked-files=all'); (e/'final-git-status.txt').write_text(status)
old_status=set((e/'entry-git-status.txt').read_text().splitlines()); now_status=set(status.splitlines())
owned=set(paths)|{str(p.relative_to(r)) for p in canonical}; prefix=str(e.relative_to(r))+'/'
status_delta=[s for s in sorted(old_status^now_status) if s[3:] not in owned and not s[3:].startswith(prefix)]
# Local links in additions, and all new canonical docs.
links=[]; errors=[]; sources=[]
for rel in paths+[str(p.relative_to(r)) for p in canonical]:
 p=r/rel; current=p.read_text(); bp=e/'before'/rel
 if bp.is_file():
  added='\n'.join(x[1:] for x in difflib.unified_diff(bp.read_text().splitlines(),current.splitlines()) if x.startswith('+') and not x.startswith('+++'))
 else: added=current
 for link in re.findall(r'\]\(([^)]+)\)',added):
  if ':' in link: continue
  dest,_,anchor=link.partition('#'); destpath=p.parent/dest if dest else p
  ok=destpath.is_file(); row={'from':rel,'link':link,'fileExists':ok}
  if ok and anchor:
   headings=[re.sub(r'[^\w\- ]','',x.lower()).replace(' ','-') for x in re.findall(r'^#+\s+(.+)$',destpath.read_text(),re.M)]
   row['anchorExists']=anchor in headings; ok=ok and row['anchorExists']
  links.append(row)
  # final-audit is written after link check; it is the only permitted generated target.
  if not ok and destpath.resolve()!=(e/'final-audit.json').resolve(): errors.append(row)
 if rel=='autobyteus-ts/docs/agent_memory_design.md':
  for source in re.findall(r'^- `(src/[^`]+)`',current,re.M):
   ok=(r/'autobyteus-ts'/source).is_file(); sources.append({'path':source,'exists':ok})
   if not ok: errors.append(sources[-1])
check=subprocess.run(['git','diff','--check','--',*paths],cwd=r,capture_output=True,text=True)
(e/'docs-diff-check.log').write_text(check.stdout+check.stderr); (e/'docs-diff-check.exit').write_text(str(check.returncode)+'\n')
(e/'docs.patch').write_text(run('git','diff','--',*paths))
whitespace=[]
for p in canonical:
 for no,line in enumerate(p.read_text().splitlines(),1):
  # Exactly two spaces intentionally encode Markdown hard breaks.
  trailing=len(line)-len(line.rstrip(' \t'))
  if trailing and not (trailing==2 and line.endswith('  ')): whitespace.append(f'{p.name}:{no}')
verification={'scope':'new local doc links/anchors, explicit core owner paths, docs diff whitespace; not runtime or full-site validation','docsUpdated':len(paths),'localLinksChecked':len(links),'sourcePathsChecked':len(sources),'links':links,'sourcePaths':sources,'errors':errors,'diffCheckExit':check.returncode,'canonicalUnexpectedWhitespace':whitespace}
(e/'docs-verification.json').write_text(json.dumps(verification,indent=2)+'\n')
selection={'result':'Blocked','reason':'Routine explicit user-verification hold; initial integrated docs preparation complete','rulesRetrieved':str(e/'handoff-rules.json'),'evaluation':[{'recipient_address':'/implementation_engineer','matches':False,'reason':'No code or packaging Local Fix discovered by Delivery.'},{'recipient_address':'/solution_designer','matches':False,'reason':'No new Design Impact/Requirement Gap/Unclear finding or non-deployment issue requiring upstream classification; existing limits preserved.'},{'recipient_address':'/solution_designer','matches':False,'reason':'Not Delivery Completed: user verification, repository finalization and safe cleanup remain unfinished.'}],'selectedRecipient':None,'messageSent':False,'nextActor':'User verification, then Delivery unfinished gates','noDuplicateOutcomeHandoff':True}
(e/'handoff-selection.json').write_text(json.dumps(selection,indent=2)+'\n')
request={'status':'Requested; awaiting response','tool':'request_user_input_async','accepted':True,'questions':[{'title':'How would you like to complete user verification of the context-compaction candidate? The reviewed checks passed within their stated scope, but broader test/typecheck failures and the documented limitations remain unresolved. No push, merge or release has occurred.','options':['Prepare an isolated worktree app first; make no provider calls.','I will test the candidate and report my result.','I have tested this candidate successfully; proceed with repository finalization, not release.']}],'verificationReceived':False,'defaultOptionIsNotApproval':True}
(e/'user-verification-request.json').write_text(json.dumps(request,indent=2)+'\n')
shutil.copy2('/tmp/dr001-final-audit.py',e/'final-audit.py')
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'deliveryResult':'Blocked — awaiting explicit user verification','integratedDocsPreparation':'Pass' if not (missing or changed or durable or status_delta or errors or whitespace or check.returncode) and unowned_unchanged and index_unchanged else 'Fail','head':head,'headUnchanged':head==entry['head'],'branch':branch,'branchUnchanged':branch==entry['branch'],'checkedBase':base,'aheadBehind':run('git','rev-list','--left-right','--count','HEAD...origin/personal').strip(),'incomingReferences':len(entry['sha256']),'missing':missing,'changedIncomingPins':changed,'cumulativeApiDurableCount':len(api['currentDurableSha256']),'apiDurableHashMismatches':durable,'allOtherTrackedDiffUnchanged':unowned_unchanged,'gitIndexUnchanged':index_unchanged,'unexpectedStatusDelta':status_delta,'docsUpdated':len(paths),'docsCheckExit':check.returncode,'newLocalLinksChecked':len(links),'sourceOwnerPathsChecked':len(sources),'linkSourceErrors':errors,'canonicalWhitespaceErrors':whitespace,'productionAndTestEditsByDelivery':False,'providerOrUiCampaignByDelivery':False,'runtimeChecksRerunByDelivery':False,'runtimeNoRerunReason':'Already-current refreshed base and unchanged source/test candidate; docs-only Delivery edits. Reuse scoped API008/CRR013 without claiming fresh runtime proof.','userVerificationReceived':False,'finalizationPerformed':False,'releaseDeploymentPerformed':False,'worktreeCleanupPerformed':False,'terminalHandoffSent':False,'ownedDocumentationSha256':{p:sha(r/p) for p in paths},'canonicalDeliveryArtifactSha256':{str(p.relative_to(t)):sha(p) for p in canonical}}
(e/'final-audit.json').write_text(json.dumps(result,indent=2)+'\n')
# Mark the deferred audit link as resolved after this file is created.
for link in verification['links']:
 dest=(r/link['from']).parent/link['link'].split('#')[0]
 if dest.resolve()==(e/'final-audit.json').resolve(): link['fileExists']=True
(e/'docs-verification.json').write_text(json.dumps(verification,indent=2)+'\n')
# Complete current reference inventory with final audit but no self hash.
refs=sorted(set(entry['sha256'])|{str(p) for p in canonical}|{str(r/p) for p in paths}|{str(p) for p in e.rglob('*') if p.is_file() and p.name not in ['reference-index.json']})
(e/'reference-index.json').write_text(json.dumps({'package':'context-compaction-simplification-analysis','deliveryRevision':'DR-001','result':'Blocked — user verification pending','paths':refs},indent=2)+'\n')
summary={k:result[k] for k in ['integratedDocsPreparation','headUnchanged','branchUnchanged','incomingReferences','missing','changedIncomingPins','cumulativeApiDurableCount','apiDurableHashMismatches','allOtherTrackedDiffUnchanged','gitIndexUnchanged','unexpectedStatusDelta','docsUpdated','docsCheckExit','newLocalLinksChecked','sourceOwnerPathsChecked','linkSourceErrors','canonicalWhitespaceErrors']}; print(json.dumps(summary,indent=2))
