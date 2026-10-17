"""Exact source preparation for the release-owned Noble backport; no host setup."""
import hashlib
import json
import os
import shutil
import subprocess
from email.utils import formatdate
from pathlib import Path

HERE = Path(__file__).resolve().parent
LOCK = json.loads((HERE / 'source-lock.json').read_text())
VERSION = LOCK['packageVersion']
NAMES = ('nfs-ganesha', 'nfs-ganesha-vfs')


def run(*args, cwd=None, **kwargs):
    return subprocess.run(args, cwd=cwd, check=True, **kwargs)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def identity(path):
    return {'file': path.name, 'sha256': sha(path), 'size': path.stat().st_size}


def recipe_hash():
    digest = hashlib.sha256()
    for p in sorted(HERE.iterdir()):
        if p.is_file() and p.suffix in ('.py', '.json', '.patch', '.md'):
            digest.update(p.name.encode() + b'\0' + p.read_bytes())
    return digest.hexdigest()


def source_identity(base):
    return {k: LOCK[k] for k in ('version', 'files', 'patchCommit', 'patchSha256', 'sourceDateEpoch')} | {
        'recipeSha256': recipe_hash(), 'buildBase': base}


def prepare(work):
    work.mkdir(parents=True, exist_ok=False)
    for record in LOCK['files']:
        path = work / record['file']
        run('curl', '--fail', '--location', '--proto', '=https', '--tlsv1.2',
            '--connect-timeout', '15', '--max-time', '180', '-o', str(path), LOCK['archive']+path.name)
        if identity(path) != record:
            raise ValueError('Ubuntu source identity mismatch: '+path.name)
    patch = HERE / 'get-dir-delegation.patch'
    if sha(patch) != LOCK['patchSha256']:
        raise ValueError('Backport patch digest mismatch')
    run('dpkg-source', '-x', 'nfs-ganesha_4.3-8ubuntu1.dsc', 'source', cwd=work)
    tree = work / 'source'
    target = tree / 'src/Protocols/NFS/nfs4_Compound.c'
    if sha(target) != LOCK['unpatchedHandlerSha256']:
        raise ValueError('Unexpected distro-patched handler')
    shutil.copyfile(patch, tree / 'debian/patches/autobyteus-get-dir-delegation.patch')
    with (tree / 'debian/patches/series').open('a') as f:
        f.write('\nautobyteus-get-dir-delegation.patch\n')
    run('dpkg-source', '--before-build', '.', cwd=tree)
    if sha(target) != LOCK['patchedHandlerSha256']:
        raise ValueError('Backport did not produce exact selected two-field result')
    changelog = tree / 'debian/changelog'
    entry = (f'nfs-ganesha ({VERSION}) noble; urgency=medium\n\n'
             '  * AutoByteus backport of upstream 98eb77c4fd94effa6882b214698a77752ec79f6e.\n'
             '    Recognized GET_DIR_DELEGATION uses existing NOTSUPP handler/free.\n\n'
             ' -- AutoByteus release build <build@example.invalid>  '
             + formatdate(LOCK['sourceDateEpoch'], localtime=False, usegmt=False) + '\n\n')
    changelog.write_text(entry + changelog.read_text())
    os.environ['SOURCE_DATE_EPOCH'] = str(LOCK['sourceDateEpoch'])
    return tree
