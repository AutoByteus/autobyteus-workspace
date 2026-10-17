from pathlib import Path
import hashlib,json,subprocess,re
R=Path.cwd(); E=R/'tickets/in-progress/shared-network-workspaces/implementation-evidence/ir-011'
S=Path((E/'scratch-path.txt').read_text().strip())/'repo'
def git(*args):return subprocess.check_output(['git',*args],text=True).strip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
input=json.loads((E/'input-audit.json').read_text()); parent=input['head']; commit=git('rev-parse','HEAD'); base=git('rev-parse','origin/personal')
p='autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts'
old=git('show',parent+':'+p); new=(R/p).read_text().strip()
cases=re.findall(r'  it\("([^\"]+)"',new)
assert len(cases)==6 and cases==re.findall(r'  it\("([^\"]+)"',old)
assert old[old.index('  it('):]==new[new.index('  it('):]
protected=[x for x in input['preserve'] if not (R/x['path']).is_file() or sha(R/x['path'])!=x['sha256']]
assert not protected
inputChanges=[x['path'] for x in input['inputs'] if sha(R/x['path'])!=x['sha256']]
assert inputChanges==[p], inputChanges
codePaths=['autobyteus-nfs','autobyteus-web/components/fileExplorer/FileExplorerTabs.vue','autobyteus-web/stores/fileExplorerContentActions.ts','autobyteus-web/stores/fileExplorerState.ts','autobyteus-server-ts/tests/e2e/helpers/studio-runtime-test-server.ts']
assert not git('diff',parent,commit,'--',*codePaths)
paths=[x for x in git('ls-files').splitlines() if not x.startswith('tickets/')]
diff=[]
for x in paths:
    a,b=R/x,S/x
    if a.is_file() and (not b.is_file() or sha(a)!=sha(b)):diff.append(x)
assert not diff,diff
assert not git('diff','--name-only','--diff-filter=U')
assert git('rev-list','--parents','-n','1','HEAD').split()[1:]==[parent,base]
assert git('diff','--check',parent,commit,'--',p)==''
for marker in ['<<<<<<<','=======','>>>>>>>']:assert marker not in new
result={'commit':commit,'parents':[parent,base],'branch':git('branch','--show-current'),'authorDelta':'6 additions/2 deletions test lifecycle; rest imported from fresh personal base','casesPreservedByteForByte':cases,'publicCleanupAssertions':['getWorkspaceById is undefined','getRegisteredWorkspaceRootPath is null'],'sourcePathsUnchanged':codePaths,'protectedArtifactsUnchanged':len(input['preserve']),'initialInputsChangedOnlyAsIntended':inputChanges,'archiveSourceFilesCompared':len(paths),'scratchSourceDifferences':diff,'scope':'DR001 repository integration only; API008 command-only verdict unchanged, no UI or NFS campaign'}
(E/'source-audit.json').write_text(json.dumps(result,indent=2)+'\n')
(E/'integration.diff').write_text(subprocess.check_output(['git','diff',parent,commit,'--',p],text=True))
print(json.dumps(result,indent=2))
