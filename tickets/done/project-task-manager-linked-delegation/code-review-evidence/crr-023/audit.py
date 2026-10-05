import datetime, difflib, hashlib, json, os, pathlib, shutil, subprocess, sys

W = pathlib.Path('/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation')
T = W / 'tickets/in-progress/project-task-manager-linked-delegation'
E = T / 'code-review-evidence/crr-023'
A = T / 'api-e2e-evidence'
I = T / 'implementation-evidence/ir-011'
ENV = dict(os.environ, GIT_OPTIONAL_LOCKS='0')

def sha(p):
    h = hashlib.sha256()
    with pathlib.Path(p).open('rb') as f:
        for b in iter(lambda: f.read(1024 * 1024), b''): h.update(b)
    return h.hexdigest()

def git(*args):
    return subprocess.check_output(['git', '--no-optional-locks', *args], cwd=W, env=ENV)

def write(name, data):
    (E/name).write_text(json.dumps(data, indent=2)+'\n')

def capture():
    index = pathlib.Path(git('rev-parse','--git-path','index').decode().strip())
    if not index.is_absolute(): index = W/index
    result = {'indexPath': str(index), 'indexSha256': sha(index)}
    commands = {
      'head': ('rev-parse','HEAD'), 'merge-head': ('rev-parse','MERGE_HEAD'),
      'branch': ('symbolic-ref','--short','HEAD'), 'stash': ('stash','list','--format=%H %gd %s'),
      'stages.z': ('ls-files','--stage','-z'), 'unmerged.z': ('ls-files','--unmerged','-z'),
      'status.z': ('status','--porcelain=v1','-z'),
      'staged.patch': ('diff','--cached','--binary','--no-ext-diff'),
      'unstaged.patch': ('diff','--binary','--no-ext-diff')}
    for k,args in commands.items():
        b = git(*args)
        result[k] = hashlib.sha256(b).hexdigest() if k.endswith(('.z','.patch')) else b.decode().strip()
        if sys.argv[1]=='input': (E/('input-'+k)).write_bytes(b)
    result['indexSha256AfterReads'] = sha(index)
    assert result['indexSha256']==result['indexSha256AfterReads'], 'Index changed during read-only capture'
    return result

E.mkdir(parents=True, exist_ok=True)
if sys.argv[1]=='input':
    refs = json.loads((A/'api-017-reference-files.json').read_text())
    assert isinstance(refs,list) and len(refs)==len(set(refs))
    missing=[p for p in refs if not pathlib.Path(p).is_file()]
    assert not missing, missing
    hashes=[{'path':p,'sha256':sha(p)} for p in refs]
    state=capture()
    shutil.copyfile(state['indexPath'], E/'input-index')
    for name in ['api-e2e-test-review-report.md','code-review-revision-record.md','code-review-report.md']:
        shutil.copyfile(T/name,E/('prior-'+name))
    durable=json.loads((I/'durable-fidelity.json').read_text())
    inventory=json.loads((A/'api-017-coverage-inventory.json').read_text())['paths']
    assert {r['current'] for r in durable}=={r['path'] for r in inventory}
    rows=[]
    for n,r in enumerate(durable,1):
        p=pathlib.Path(r['current']); accepted=pathlib.Path(r['acceptedSnapshot'])
        assert sha(p)==r['currentHash'] and sha(accepted)==r['acceptedHash']
        dest=E/'current-durables'/p.relative_to(W);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
        diff=''.join(difflib.unified_diff(accepted.read_text().splitlines(True),p.read_text().splitlines(True),fromfile=str(accepted),tofile=str(p)))
        dp=E/'integration-diffs'/f'{n:02d}-{p.name}.diff';dp.parent.mkdir(exist_ok=True);dp.write_text(diff)
        rows.append(dict(r,sha256=sha(p),number=n,relative=str(p.relative_to(W)),integrationChanged=bool(diff),diff=str(dp),currentSnapshot=str(dest),lines=len(p.read_text().splitlines())))
    package=json.loads((I/'current-package-fingerprints.json').read_text())
    assert all(sha(r['path'])==r['sha256'] for r in package)
    write('durable-scope.json',rows)
    write('input-preservation.json', {'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'references':hashes,'git':state,'package545Exact':True,'sourceReportHash':sha(T/'code-review-report.md'),'priorRevisionHash':sha(T/'code-review-revision-record.md'),'api17IndexOriginalByteExact':False,'api17DisclosedStatOnlyIndexDerivativeAcceptedAsCurrentInput':True})
    print(json.dumps({'references':len(refs),'durables':len(rows),'integrationChanged':sum(r['integrationChanged'] for r in rows),'renamed':sum(r['renamed'] for r in rows),'package':len(package),'indexCurrent':state['indexSha256'],'indexReadOnlyExact':True,'durableLines':[(r['number'],r['lines']) for r in rows]}))
elif sys.argv[1]=='final':
    baseline=json.loads((E/'input-preservation.json').read_text());state=capture()
    changes=[];missing=[]
    for r in baseline['references']:
        p=pathlib.Path(r['path'])
        if not p.is_file(): missing.append(str(p))
        elif sha(p)!=r['sha256']:changes.append(str(p))
    allowed={str(T/'api-e2e-test-review-report.md'),str(T/'code-review-revision-record.md')}
    assert not missing and set(changes)<=allowed, (missing,changes)
    assert state==baseline['git'], 'Git state no longer current-input exact'
    assert sha(T/'code-review-report.md')==baseline['sourceReportHash']
    assert (T/'code-review-revision-record.md').read_bytes().startswith((E/'prior-code-review-revision-record.md').read_bytes())
    rows=json.loads((E/'durable-scope.json').read_text())
    assert all(sha(r['current'])==r['sha256'] and sha(r['acceptedSnapshot'])==r['acceptedHash'] for r in rows)
    package=json.loads((I/'current-package-fingerprints.json').read_text())
    assert all(sha(r['path'])==r['sha256'] for r in package)
    result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'incomingReferences':len(baseline['references']),'missing':missing,'changed':changes,'all20CurrentAndAcceptedExact':True,'all545PackageExact':True,'sourceCRR022Exact':True,'priorCRR001Through022ExactPrefix':True,'gitAllFieldsAndCurrentInputBinaryIndexExact':True,'indexSha256':state['indexSha256'],'zeroUnmerged':not git('ls-files','--unmerged','-z'),'api17OriginalBinaryIndexExact':False,'scope':'Read-only review preserves API17 current disclosed stat-cache derivative; no restoration, semantic Git mutation or original-byte-exact claim.'}
    write('final-preservation.json',result);print(json.dumps(result))
