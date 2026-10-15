"""IR003 personal local checks. No sudo, mounts, live Docker, providers or API/E2E.
Run from the worktree root; GO_BINARY may select an already installed Go >=1.25.
Mutation controls edit only disposable copies, never the working source.
"""
import hashlib, json, os, pathlib, shutil, subprocess, tempfile

root = pathlib.Path.cwd()
evidence = pathlib.Path(__file__).resolve().parent
go = pathlib.Path(os.environ.get('GO_BINARY', str(pathlib.Path(json.loads((evidence/'go-toolchain.json').read_text())['root'])/'go/bin/go')))
report = {'scope': __doc__, 'steps': [], 'compiledTargets': []}

with tempfile.TemporaryDirectory(prefix='nfs-ir003-final-') as tmp:
    scratch = pathlib.Path(tmp)
    env = {'PATH':str(go.parent)+':'+os.environ['PATH'], 'HOME':tmp, 'TMPDIR':tmp,
           'GOTOOLCHAIN':'local', 'CI':'1', 'LANG':'en_US.UTF-8', 'LC_ALL':'en_US.UTF-8'}
    report['temporaryRoot'] = tmp
    report['toolchain'] = subprocess.check_output([str(go),'version'],env=env,text=True).strip()

    def run(name, cmd, cwd=root, expected=0, overrides=None):
        result = subprocess.run(cmd, cwd=cwd, env={**env, **(overrides or {})}, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        (evidence/(name+'.log')).write_text('COMMAND '+json.dumps(cmd)+'\n'+result.stdout)
        report['steps'].append({'name':name, 'command':cmd, 'exitCode':result.returncode,
                                'expectedExitCode':expected})
        assert result.returncode == expected, (name, result.stdout)
        print(name, result.returncode, flush=True)
        return result.stdout

    run('go-race-final', [str(go),'test','-race','-count=1','-v','./...'], root/'autobyteus-nfs')
    run('go-vet-final', [str(go),'vet','./...'], root/'autobyteus-nfs')
    run('installer-final', ['python3','-m','unittest','scripts/tests/test_nfs_packaging_and_launcher.py',
                          'scripts/tests/test_nfs_installer_fixture.py','-v'])
    for name, replacement in [
        ('old-umask', ''),
        ('missing-node-mode', '\t\tif filepath.Base(p) != "nodes" { if err := os.Chmod(p, mode); err != nil { return err } }\n'),
        ('missing-parent-mode', '\t\tif filepath.Base(p) != "Library" && filepath.Base(p) != "usr" { if err := os.Chmod(p, mode); err != nil { return err } }\n'),
    ]:
        copy = scratch/name
        shutil.copytree(root/'autobyteus-nfs', copy/'autobyteus-nfs')
        for path in ['scripts/public/nfs/install.sh','scripts/tests/test_nfs_installer_fixture.py']:
            dest=copy/path; dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/path,dest)
        commands=copy/'autobyteus-nfs/internal/platform/commands.go'
        text=commands.read_text()
        block='\t\tif err := os.Chmod(p, mode); err != nil {\n\t\t\treturn err\n\t\t}\n'
        assert text.count(block)==1
        commands.write_text(text.replace(block,replacement))
        output=run('mutation-'+name,[str(go),'test','-count=1','-run','^TestBootstrapDirectoryModes$','-v','./internal/platform'],copy/'autobyteus-nfs',expected=1)
        assert 'mode 0700, want 0755' in output, output
    for target in ['darwin-arm64','darwin-amd64','linux-arm64','linux-amd64']:
        goos, arch = target.split('-'); binary=scratch/target
        run('build-'+target,[str(go),'build','-trimpath','-o',str(binary),'./cmd/autobyteus-nfs'],
            root/'autobyteus-nfs', overrides={'GOOS':goos,'GOARCH':arch,'CGO_ENABLED':'0'})
        report['compiledTargets'].append({'target':target,'sha256':hashlib.sha256(binary.read_bytes()).hexdigest()})
    # This runner is executed on the task's native Darwin-arm64 host only.
    assert run('native-version',[str(scratch/'darwin-arm64'),'version']).strip()=='development-unqualified'
    run('native-unqualified-refusal',[str(scratch/'darwin-arm64'),'verify-release',
         str(root/'autobyteus-nfs/cmd/autobyteus-nfs/release.json')],expected=1)

report['temporaryRootRemoved'] = not pathlib.Path(tmp).exists()
(evidence/'final-checks.json').write_text(json.dumps(report,indent=2)+'\n')
