"""Pinned removal/input/reference audit; one-round API evidence only."""
import ast, glob, hashlib, os, re, subprocess
from pathlib import Path
from scripts.tests import test_docker_build_context_sources as s
ROOT=Path.cwd(); BASE='2756d7b298ca5b203ebd2310d172b37a5d381b5c'
def git(*args):
    return subprocess.check_output(['git',*args],cwd=ROOT)
def blob(ref,path): return git('show',f'{ref}:{path}')
changes=[line.split('\t') for line in git('diff','--name-status',BASE,'HEAD','--','.',':!tickets').decode().splitlines()]
expected={p:'D' for p in s.RETIRED_ASSETS}
expected.update({p:'M' for p in ['.gitignore','README.md','autobyteus-server-ts/docker/README.md','scripts/tests/test_docker_build_context_sources.py','scripts/tests/test_public_docker_launcher_shared_workspace.py']})
assert {p:status for status,p in changes}==expected,changes
print('Complete source allowlist PASS: 11 deletes +5 modifications; all other tracked production paths unchanged.')
print('\n'.join('\t'.join(x) for x in changes))
assert not git('ls-files','docker').strip()
for path in s.RETIRED_ASSETS:
    assert not os.path.lexists(ROOT/path),path
    print('ABSENT',path,'baseline sha256',hashlib.sha256(blob(BASE,path)).hexdigest())
# Compare actual retained worktree contents and file-mode-sensitive git delta.
retained=['.dockerignore','package.json','pnpm-workspace.yaml','pnpm-lock.yaml','LICENSE','LICENSING.md','NOTICE','.github/workflows/release-server-docker.yml']
retained += git('ls-files','autobyteus-server-ts/docker','scripts/public/docker').decode().splitlines()
for path in retained:
    if path=='autobyteus-server-ts/docker/README.md': continue
    assert blob(BASE,path)==(ROOT/path).read_bytes(),path
    print('BYTE-IDENTICAL',path,hashlib.sha256((ROOT/path).read_bytes()).hexdigest())
assert not git('diff',BASE,'--','autobyteus-server-ts/docker',':!autobyteus-server-ts/docker/README.md','scripts/public/docker','.dockerignore','.github/workflows/release-server-docker.yml').strip()
# Direct COPY package roots include a guide edit; inspect all changed paths under each.
for source in s.direct_copy_sources(s.PRIMARY_DOCKERFILE):
    assert not any(source==p or p.startswith(source.rstrip('/')+'/') for p in s.RETIRED_ASSETS),source
    assert glob.glob(str(ROOT/source)),source
    matches=[(status,p) for status,p in changes if p==source or p.startswith(source.rstrip('/')+'/')]
    assert all(p=='autobyteus-server-ts/docker/README.md' for _,p in matches),(source,matches)
    print('COPY',source,'exists/no removed dependency; scoped delta=',matches)
print('Executable application/contracts/manifests/lockfile/license inputs unchanged; broad package COPY guide bytes can change, not full-image equality.')
# Baseline consumer closure, not a false global string scanner over historic tickets.
pattern='Dockerfile\\.(allinone|remote-server)|personal-docker\\.sh|seed-personal-test-fixtures\\.py|compose\\.personal-test\\.yml|allinone-start|remote-server-entrypoint|supervisor-allinone'
for ref in [BASE,'HEAD']:
    run=subprocess.run(['git','grep','-n','-E',pattern,ref,'--','.',':!tickets'],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    assert run.returncode in (0,1),run.stderr
    print('REFERENCE AUDIT',ref); print(run.stdout)
    for line in run.stdout.splitlines():
        path=line.split(':')[1]
        if ref==BASE:
            assert path in expected,path
        else:
            assert path=='scripts/tests/test_docker_build_context_sources.py',path
# Resolve package-local docker guide links, distinguishing retired root link.
for path in ['README.md','autobyteus-server-ts/README.md','autobyteus-server-ts/docker/README.md','autobyteus-message-gateway/README.md']:
    text=(ROOT/path).read_text()
    for target in re.findall(r'\]\(([^)]+)\)',text):
        if 'docker/' not in target or '://' in target: continue
        resolved=((ROOT/path).parent/target.split('#')[0]).resolve()
        assert resolved.is_file(),(path,target)
        assert resolved != ROOT/'docker/README.md',(path,target)
        print('GUIDE LINK',path,target,'=>',resolved.relative_to(ROOT))
# Installer assertion body byte/AST unchanged; not suppressed by baseline fixtures.
def method_body(source,name):
    node=next(n for n in ast.walk(ast.parse(source)) if isinstance(n,ast.FunctionDef) and n.name==name)
    return ast.dump(node,include_attributes=False)
path='scripts/tests/test_public_docker_launcher_shared_workspace.py'
name='test_bash_install_no_update_path_skips_profile_write'
assert method_body(blob(BASE,path).decode(),name)==method_body((ROOT/path).read_text(),name)
print('Original supported apostrophe fixture/assertion body unchanged; IMPL-BASE-001 remains OPEN.')
# Historical supplements and original evidence, including unsuccessful D3 attempt, not rewritten.
for path in ['tickets/done/remove-autobyteus-remote-provider/api-e2e-evidence/docker/Dockerfile.remote-server.validation','tickets/done/remove-autobyteus-remote-provider/api-e2e-evidence/docker/container.log','tickets/done/agpl-dual-licensing-slice-2/implementation-handoff.md','tickets/done/agpl-dual-licensing-slice-2/api-e2e-execution-coverage-report.md']:
    assert blob(BASE,path)==(ROOT/path).read_bytes(),path
assert not git('diff','6c4437f03','--','tickets/in-progress/fix-legacy-docker-workspace-builds/implementation-evidence','tickets/in-progress/fix-legacy-docker-workspace-builds/code-review-evidence').strip()
print('Historical/IR/CR evidence unchanged. No resource operations in this audit; no actual image/API/desktop/provider execution.')
print('PASS audit.')
