"""API009 owned serial repository validation; no VM/UI/application acceptance."""
from pathlib import Path
import os, subprocess, json, time, tempfile, hashlib, sys, datetime
E=Path(__file__).resolve().parent; R=E.parents[5]; T=E.parents[2]
assert (R/'.git').exists(), R
S=Path((E/'scratch-path.txt').read_text().strip()) if (E/'scratch-path.txt').exists() else Path(tempfile.mkdtemp(prefix='ab-nfs-api009-'))
assert S.name.startswith('ab-nfs-api009-')
C=S/'repo'; C.mkdir(exist_ok=True)
for name in ('home','tmp'): (S/name).mkdir(exist_ok=True)
(E/'scratch-path.txt').write_text(str(S)+'\n')
env={'PATH':os.environ['PATH'],'HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'CI':'1','NO_COLOR':'1'}
d={'scope':'API009 integrated repository validation only; API008 command-only filesystem verdict carried separately','inputHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),'scratch':str(S),'cwd':str(C),'environment':env,'checks':[]}
ledger=T/'api-e2e-test-case-ledger.md'
def save(): (E/'checks-result.json').write_text(json.dumps(d,indent=2)+'\n')
def event(case,status,note):
    text=ledger.read_text(); mark='<!-- API009 events end -->'; now=datetime.datetime.now(datetime.timezone.utc).isoformat()
    text=text.replace(mark,f'- {now} **{case} {status}** — {note}\n\n'+mark)
    ledger.write_text(text)
def finish(case,status,note):
    text=ledger.read_text(); lines=text.splitlines()
    for i,line in enumerate(lines):
        if line.startswith('| '+case+' |'):
            fields=line.split('|');fields[3]=' '+status+' ';fields[4]=' '+note+' ';lines[i]='|'.join(fields)
    ledger.write_text('\n'.join(lines)+'\n');event(case,status,note)
def run(name,args,case):
    event(case,'Checkpoint',f'Starting {name}; exact argv/output in E9/{name}.log and checks-result.json')
    started=time.time()
    with (E/(name+'.log')).open('w') as log:
        p=subprocess.Popen(args,cwd=C,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
        item={'name':name,'case':case,'command':args,'cwd':str(C),'pid':p.pid,'started':started}; d['checks'].append(item);save()
        try: code=p.wait(timeout=900)
        except subprocess.TimeoutExpired:
            item['timeout']=True;save();finish(case,'Blocked','Owned command exceeded900s; diagnose before cleanup');raise
    item.update(exitCode=code,seconds=round(time.time()-started,3),log=name+'.log');save();print(json.dumps(item),flush=True)
    if code:
        finish(case,'Fail',name+'.log (classification pending)');sys.exit(code)
    return item

event('INT01','Started','Archive current tracked source; private HOME/TMPDIR and current builds only.')
# Archive only tracked files, omitting the ticket's large historical evidence, not source.
top=[p for p in subprocess.check_output(['git','ls-tree','--name-only','HEAD'],cwd=R,text=True).splitlines() if p!='tickets']
a=subprocess.Popen(['git','archive','HEAD','--',*top],cwd=R,stdout=subprocess.PIPE)
b=subprocess.run(['tar','-x','-C',str(C)],stdin=a.stdout,capture_output=True,text=True);a.stdout.close();assert b.returncode==0,b.stderr;assert a.wait()==0
paths=subprocess.check_output(['git','ls-files','-z'],cwd=R,text=True).split('\0')
h={p:hashlib.sha256((C/p).read_bytes()).hexdigest() for p in paths if p and not p.startswith('tickets/') and (C/p).is_file()}
aggregate=hashlib.sha256(json.dumps(h,sort_keys=True,separators=(',',':')).encode()).hexdigest();expected=json.loads((E/'input-audit.json').read_text());assert aggregate==expected['trackedSourceAggregate']
d['archive']={'trackedFiles':len(h),'sourceAggregate':aggregate,'matchesInput':True,'excluded':'tickets/ historical evidence only'}
d['toolchain']={cmd:subprocess.check_output([cmd,'--version'],env=env,text=True).strip() for cmd in ('node','pnpm')};save()
run('install',['pnpm','--filter','@autobyteus-example/brief-studio-authoring...','install','--frozen-lockfile'],'INT01')
run('integration-prepare',['pnpm','-C','autobyteus-server-ts','test:integration:prepare'],'INT01')
run('server-typecheck',['pnpm','-C','autobyteus-server-ts','typecheck'],'INT01')
finish('INT01','Pass','E9/checks-result.json; current archive/build/typecheck and unchanged carry audit')
base=['pnpm','-C','autobyteus-server-ts','exec','vitest','run']
rest='tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts'
run('workspace-rest',base+[rest,'--no-watch'],'INT02')
leftovers=[str(p) for p in (S/'tmp').iterdir() if p.name.startswith(('workspace-rest-appdata-','autobyteus-workspace-rest-e2e-'))]
d['restCleanupAfterFirst']=leftovers;save();assert not leftovers,leftovers
finish('INT02','Pass','E9/workspace-rest.log; public removal and registry absence; owned fixture dirs absent')
run('workspace-unit',base+['tests/unit/workspaces','--no-watch'],'INT03')
finish('INT03','Pass','E9/workspace-unit.log')
run('adjacent-explorer',base+['tests/integration/file-explorer/file-explorer.integration.test.ts','tests/e2e/file-explorer/search-content-http.e2e.test.ts','--no-watch'],'INT04')
finish('INT04','Pass','E9/adjacent-explorer.log')
run('workspace-rest-repeat',base+[rest,'--no-watch'],'INT05')
leftovers=[str(p) for p in (S/'tmp').iterdir() if p.name.startswith(('workspace-rest-appdata-','autobyteus-workspace-rest-e2e-','search-content-http-'))]
d['restCleanupAfterRepeat']=leftovers;save();assert not leftovers,leftovers
finish('INT05','Pass','E9/workspace-rest-repeat.log; owned REST/search appdata dirs absent; repeat not unique tests')
d['executionFinished']=True;save()
