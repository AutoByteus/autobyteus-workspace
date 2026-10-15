# Runs inside task-owned harness scope. Not a user command or production patch.
import hashlib
skill='read-proof'
worker_by_name={}
body='''# Private proof fixture
Use actual native filesystem commands to read supporting proof.txt (or after-stop.txt when requested) from this skill package, not the shared project. The project cwd does not change when reading the skill.
Copy the exact file bytes, including the terminal newline, into the explicitly requested file in the project. Append only when asked, preserving all prior bytes. Print pwd and the actual read file contents. Never read any credentials or unrelated private files or access network.
'''
for label,n in zip(['a','b'],nodes):
    fixture=gql(n['port'],'mutation($i:CreateSkillInput!){createSkill(input:$i){name rootPath}}',{'i':{'name':skill,'description':'Owned private native Codex fixture for shared-workspace capability.','content':body}})['createSkill']
    n['sourceRoot']=fixture['rootPath'];n['skillParent']='/home/autobyteus/data/native-fixtures/'+label
    n['proof']='CODEX_PRIVATE_'+uuid.uuid4().hex;n['afterStop']='CODEX_AFTER_STOP_'+uuid.uuid4().hex
    nodejs(n['name'],f"const f=require('fs'),p=require('path');const s={json.dumps(n['sourceRoot'])},d={json.dumps(n['skillParent']+'/'+skill)};f.writeFileSync(p.join(s,'proof.txt'),{json.dumps(n['proof']+chr(10))});f.writeFileSync(p.join(s,'after-stop.txt'),{json.dumps(n['afterStop']+chr(10))});f.mkdirSync(p.dirname(d),{{recursive:true}});f.cpSync(s,d,{{recursive:true}})")
    d('cp',str(P/'codex-private-worker.mjs'),n['name']+':/app/autobyteus-server-ts/codex-private-worker.mjs')

def auth():
    receipts=[]
    for n in nodes:
        source=sp.Popen(['docker','exec','autobyteus-server-0','tar','-C','/root','-cf','-','.codex/auth.json'],stdout=sp.PIPE,stderr=sp.PIPE)
        target=sp.Popen(['docker','exec','-i',n['name'],'tar','-C','/root','-xf','-'],stdin=source.stdout,stdout=sp.PIPE,stderr=sp.PIPE)
        source.stdout.close();target.communicate(timeout=20);source.stderr.read();rc=source.wait(timeout=10)
        assert rc==0 and target.returncode==0,'Native Codex credential transfer failed; contents not logged'
        d('exec',n['name'],'sh','-c','chmod 0600 /root/.codex/auth.json; codex --version')
        receipts.append({'node':n['name'],'source':'read-only node-0 Codex auth stream','host_credential_file':False,'values_logged':False})
    return receipts
case('native Codex login streamed into fresh private homes, source unchanged',auth)

def response(w,timeout=180):
    assert select.select([w.stdout],[],[],timeout)[0],'native Codex response timeout'
    line=w.stdout.readline();assert line,'native Codex worker exited before receipt'
    receipt=json.loads(line);assert receipt.get('event')!='ERROR',receipt
    return receipt

def start_worker(n,resume=None):
    argv=['docker','exec','-i','-w','/app/autobyteus-server-ts',n['name'],'node','codex-private-worker.mjs',ROOT,n['skillParent'],skill]+([resume] if resume else [])
    err=open(P/(n['name']+('-resumed' if resume else '')+'-worker.stderr.log'),'w')
    w=sp.Popen(argv,stdin=sp.PIPE,stdout=sp.PIPE,stderr=err,text=True);w._probe_error_file=err
    workers.append(w);worker_by_name[n['name']]=w
    init=response(w);assert init['event']=='READY' and init['thread']['cwd']==ROOT,init
    n['threadId']=init['thread']['id'];n['model']=init['model']
    (P/(n['name']+('-resumed' if resume else '')+'-init.json')).write_text(json.dumps(init,indent=2))
    return {'node':n['name'],'nativeThreadId':n['threadId'],'model':n['model'],'privateSkill':init['privateSkill'],'discovered':init['discovered']}
case('each independent native process discovers its private skill while retaining common project cwd',lambda:[start_worker(n) for n in nodes])

def turn(n,prompt,label,use_skill=True,expected_output=None):
    w=worker_by_name[n['name']];w.stdin.write(json.dumps({'action':'turn','label':label,'prompt':prompt,'useSkill':use_skill})+'\n');w.stdin.flush()
    r=response(w);(P/(label+'-turn.json')).write_text(json.dumps({'node':n['name'],'prompt':prompt,'typedPrivateSkillInput':use_skill,'receipt':r},indent=2))
    completed=[e for e in r['events'] if e['method']=='turn/completed'];assert len(completed)==1 and completed[0]['params']['turn']['status']=='completed',completed
    items=[e['params']['item'] for e in r['events'] if e['method']=='item/completed']
    commands=[i for i in items if i.get('type')=='commandExecution']
    assert commands and all(c.get('exitCode')==0 and c.get('cwd')==ROOT for c in commands),commands
    if expected_output:assert any(expected_output in c.get('aggregatedOutput','') for c in commands),commands
    return {'node':n['name'],'threadId':n['threadId'],'nativeCommands':commands,'receipt':label+'-turn.json'}

def snapshot(filename,expected):
    for n in nodes:
        actual=json.loads(nodejs(n['name'],f"console.log(JSON.stringify(require('fs').readFileSync({json.dumps(ROOT+'/'+filename)},'utf8')))") )
        assert actual==expected,(n['name'],actual,expected)
    actual=json.loads(d('exec',server,'python3','-c',"from pathlib import Path;import json;print(json.dumps(Path('/export/project/"+filename+"').read_text()))").stdout)
    assert actual==expected,(actual,expected)
    return {'clientNodes':[n['name'] for n in nodes],'path':ROOT+'/'+filename,'backing':'/export/project/'+filename,'exactText':expected,'sha256':hashlib.sha256(expected.encode()).hexdigest()}

def no_shared_artifacts():
    rows=[]
    for n in nodes:
        value=json.loads(nodejs(n['name'],f"const f=require('fs');console.log(JSON.stringify(['.claude','.codex','.agents'].map(p=>({{path:p,exists:f.existsSync({json.dumps(ROOT)}+'/'+p)}}))))"))
        assert not any(x['exists'] for x in value),value
        rows.append({'node':n['name'],'runtimeProjectPaths':value})
    return rows

filename='codex-private-roundtrip.txt'
def write_a():
    r=turn(a,'Use $read-proof. With native filesystem commands print pwd, freshly read the supporting proof.txt from this skill package, print its actual contents, and copy its exact bytes including one newline into '+filename+' in cwd. Content is not supplied here. Do not write any other project file.','a-write',True,a['proof'])
    return {'native':r,'sharedBytes':snapshot(filename,a['proof']+'\n'),'noRuntimeProjectMutation':no_shared_artifacts()}
case('A private native skill reads supporting asset and writes ordinary shared project file',write_a)
def modify_b():
    r=turn(b,'Use $read-proof. Print pwd and freshly read '+filename+' in cwd, printing actual contents (not supplied here). Freshly read and print your private skill proof.txt, then append its exact bytes including one newline to that existing project file. Preserve previous bytes. Use actual native filesystem commands.','b-read-modify',True,b['proof'])
    return {'native':r,'sharedBytes':snapshot(filename,a['proof']+'\n'+b['proof']+'\n'),'noRuntimeProjectMutation':no_shared_artifacts()}
case('B native read sees A data and appends own private skill asset without prompt copying',modify_b)
def reread_a():
    r=turn(a,'Print pwd and freshly read '+filename+' using an actual native command. Report its complete contents; another node modified it and no new contents are supplied here.','a-reread',False,b['proof'])
    return {'native':r,'sharedBytes':snapshot(filename,a['proof']+'\n'+b['proof']+'\n')}
case('A native fresh reopen sees B modification',reread_a)
def stop_worker(n):
    w=worker_by_name.pop(n['name']);w.stdin.write(json.dumps({'action':'close'})+'\n');w.stdin.flush();out,_=w.communicate(timeout=30);w._probe_error_file.close()
    assert w.returncode==0,(w.returncode,out);workers.remove(w)
    return {'node':n['name'],'threadId':n['threadId'],'exit':w.returncode}
def cleanup_a():
    closed=stop_worker(a);nodejs(a['name'],f"require('fs').rmSync({json.dumps(a['skillParent'])},{{recursive:true}})")
    return {'closed':closed,'privateOnlyDeletion':True,'noSharedRuntimePaths':no_shared_artifacts()}
case('A native process close/private-bundle removal leaves common project unchanged',cleanup_a)
def after_stop():
    r=turn(b,'Use $read-proof again after the peer has stopped. Print pwd; freshly read and print the previously unread supporting after-stop.txt from your private skill package. Copy its exact bytes including one newline to codex-peer-stopped.txt in cwd, using native filesystem commands. No asset content is supplied here.','b-after-peer-stop',True,b['afterStop'])
    return {'native':r,'sharedBytes':snapshot('codex-peer-stopped.txt',b['afterStop']+'\n'),'noRuntimeProjectMutation':no_shared_artifacts()}
case('active B private native skill survives A cleanup and reads previously unread asset',after_stop)
R['closed_before_resume']=stop_worker(b)
def resume_b():
    old=b['skillParent'];b['skillParent']=old+'-resumed';new='CODEX_RESUMED_'+uuid.uuid4().hex
    nodejs(b['name'],f"const f=require('fs');f.cpSync({json.dumps(old)},{json.dumps(b['skillParent'])},{{recursive:true}});f.writeFileSync({json.dumps(b['skillParent']+'/'+skill+'/proof.txt')},{json.dumps(new+chr(10))});f.rmSync({json.dumps(old)},{{recursive:true}})")
    init=start_worker(b,b['threadId'])
    r=turn(b,'Use $read-proof from the currently configured private root. Print pwd and freshly read/print its current proof.txt, not remembered prior contents or path. Copy exact bytes including one newline to codex-resumed.txt in cwd. Content is not supplied here.','b-resumed',True,new)
    return {'init':init,'native':r,'sharedBytes':snapshot('codex-resumed.txt',new+'\n'),'noRuntimeProjectMutation':no_shared_artifacts()}
case('native Codex thread resume loads current private source after old bundle deletion',resume_b)
R['closed_after_resume']=stop_worker(b)
R['uncovered']=['integrated AutoByteus production skill binding/collision/ownership policy','process-wide extra-root isolation for concurrent differing definitions on one node','native Mac mount','physical LAN','one-command product setup','current-source/UI/final validation']
R['production_patch']=False
