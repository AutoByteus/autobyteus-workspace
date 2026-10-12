"""Real helper invocations with strict recording Docker, plus owned source mirror."""
import json, os, shutil, subprocess, sys, tempfile
from pathlib import Path
ROOT=Path.cwd()
with tempfile.TemporaryDirectory(prefix='api-helper-fixture-') as tmp:
    temp=Path(tmp); bin=temp/'bin'; bin.mkdir(); calls=temp/'calls.jsonl'
    docker=bin/'docker'
    docker.write_text(f'''#!{sys.executable}
import json,os,sys
args=sys.argv[1:]
with open({str(calls)!r},'a') as f: f.write(json.dumps(args)+'\\n')
if args==['version','--format','{{{{.Server.Arch}}}}']: print('arm64'); sys.exit(0)
if args[:2] in (['buildx','version'],['buildx','inspect'],['buildx','use']): sys.exit(0)
if args[:2]==['buildx','build']: sys.exit(0)
if args[:1]==['compose'] and 'up' in args: sys.exit(0)
print('Unexpected fake Docker invocation: '+repr(args),file=sys.stderr); sys.exit(97)
'''); docker.chmod(0o755)
    env={'PATH':str(bin)+':/usr/bin:/bin:/opt/homebrew/bin','HOME':str(temp),'TMPDIR':str(temp),'CLI_INSTALL_CACHE_BUSTER':'api-fixture-only','PYTHONDONTWRITEBYTECODE':'1'}
    def run(path,args):
        command=['/bin/bash',str(path),*args]
        print('$',' '.join(command),flush=True)
        result=subprocess.run(command,cwd=ROOT,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=45)
        print(result.stdout,'Exit:',result.returncode)
        assert result.returncode==0,result.stdout
    run(ROOT/'autobyteus-server-ts/docker/build.sh',['--tag','api-fixture'])
    run(ROOT/'autobyteus-server-ts/docker/build-multi-arch.sh',['--load','--variant','zh','--version','api-fixture','--image-name','api/fake-retained'])
    # docker-start creates .runtime; copy unchanged supported entrychain to an owned mirror.
    mirror=temp/'mirror'; directory=mirror/'autobyteus-server-ts/docker'; directory.mkdir(parents=True)
    for name in ['docker-start.sh','build.sh','Dockerfile.monorepo','docker-compose.yml']:
        shutil.copy2(ROOT/'autobyteus-server-ts/docker'/name,directory/name)
    run(directory/'docker-start.sh',['up','--build-local','--project','api-owned-fixture'])
    records=[json.loads(line) for line in calls.read_text().splitlines()]
    builds=[r for r in records if r[:2]==['buildx','build']]
    assert len(builds)==3,records
    for r,context in zip(builds,[ROOT,ROOT,mirror]):
        assert r[r.index('-f')+1]==str(context/'autobyteus-server-ts/docker/Dockerfile.monorepo'),r
        assert str(context) in r,r
        assert '--load' in r and r[r.index('--platform')+1]=='linux/arm64',r
        assert 'CLI_INSTALL_CACHE_BUSTER=api-fixture-only' in r,r
    assert 'BASE_IMAGE_TAG=zh' in builds[1]
    assert 'api/fake-retained:api-fixture-zh' in builds[1] and 'api/fake-retained:latest-zh' in builds[1]
    assert 'autobyteus-server:api-fixture' in builds[0]
    compose=[r for r in records if r[:1]==['compose']]
    assert len(compose)==1 and compose[0][compose[0].index('-f')+1]==str(directory/'docker-compose.yml'),compose
    state=Path(compose[0][compose[0].index('--env-file')+1])
    assert state.is_file() and state.is_relative_to(mirror)
    assert 'AUTOBYTEUS_IMAGE_TAG=latest' in state.read_text()
    assert '--force-recreate' in compose[0]
    for record in records: print('FAKE Docker receipt',json.dumps(record))
    print('PASS default/zh retained helper args and owned docker-start -> build.sh -> monorepo -> Compose command chain.')
    print('No real image build/pull/push/start; no real Buildx selection or user-node/state/profile operation.')
print('Owned mirror/HOME/bin/fake records/.runtime cleaned.')
