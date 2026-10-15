from pathlib import Path
import hashlib,json,subprocess
R=Path(__file__).resolve().parents[5]; E=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
a=json.loads((E/'input-audit.json').read_text()); base=a['head']
paths=['autobyteus-web/components/fileExplorer/FileExplorerTabs.vue','autobyteus-web/stores/fileExplorerContentActions.ts','autobyteus-web/stores/fileExplorerState.ts']
rows=[]
for path in paths:
 old=subprocess.check_output(['git','show',base+':'+path],cwd=R).decode();new=(R/path).read_text()
 lines=subprocess.check_output(['git','diff','--numstat',base,'--',path],cwd=R).decode().split()
 rows.append({'path':path,'beforeNonblank':sum(bool(l.strip()) for l in old.splitlines()),'afterNonblank':sum(bool(l.strip()) for l in new.splitlines()),'deltaLines':int(lines[0])+int(lines[1]),'sha256':sha(new.encode())})
allowed=set(paths+['autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.spec.ts','tickets/in-progress/shared-network-workspaces/implementation-handoff.md','tickets/in-progress/shared-network-workspaces/implementation-revision-record.md'])
protected=[x for x in a['inputs'] if x['path'] not in allowed]
checks={'source':rows,'sourceGuardrails':all(x['afterNonblank']<=500 and x['deltaLines']<=220 for x in rows),'protectedInputCount':len(protected),'protectedInputsUnchanged':all(sha((R/x['path']).read_bytes())==x['sha256'] for x in protected),'oldDistAndCandidatesCount':len(a['preserve']),'oldDistAndCandidatesUnchanged':all(sha((R/x['path']).read_bytes())==x['sha256'] for x in a['preserve'])}
oldHistory=next(x for x in a['inputs'] if x['path'].endswith('/implementation-revision-record.md'))
checks['historyPrefixPreserved']=sha((R/oldHistory['path']).read_bytes()[:oldHistory['bytes']])==oldHistory['sha256']
checks['unchangedFileViewerAndMonaco']='Protected inputs include both; draft projection fixes their upstream authority without changing shared viewer semantics.'
checks['deadCode']='Removed Tabs-only uncalled context-close handlers, write-only invisible context menu state/listener, unread DOM ref, unused language wrapper/import. Prior SFC template contains no context-menu consumer. Existing test-only document-click assertions retired; active keyboard controls retained.'
checks['persistedData']='Not affected: session-only OpenFileState composition; store is not persisted, no schema migration.'
(E/'source-audit.json').write_text(json.dumps(checks,indent=2)+'\n');print(json.dumps(checks,indent=2))
assert checks['sourceGuardrails'] and checks['protectedInputsUnchanged'] and checks['oldDistAndCandidatesUnchanged'] and checks['historyPrefixPreserved']
