"""Installer unit fixtures: fake HTTPS downloader and binary, real tar/checksum tools.
No published URL is fetched, no sudo/storage/Docker command executes. The happy
path proves invocation/plumbing, not native release qualification or installation.
Run: python3 -m unittest scripts/tests/test_nfs_installer_fixture.py -v
"""
import hashlib
import io
import os
import subprocess
import tarfile
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]

class NfsInstallerFixtureTest(unittest.TestCase):
    def run_fixture(self, variant):
        with tempfile.TemporaryDirectory(prefix='nfs-installer-fixture-') as root:
            p=Path(root); home=p/'home';home.mkdir();downloads=p/'downloads';downloads.mkdir();bin_dir=p/'bin';bin_dir.mkdir()
            installer=p/'install.sh'
            installer.write_text((ROOT/'scripts/public/nfs/install.sh').read_text().replace('__RELEASE_TAG__','v0.0.0-fixture'))
            # Only platform metadata is doubled; the container guard is unchanged.
            (bin_dir/'uname').write_text('#!/bin/sh\ncase "$1" in -s) echo Darwin;; -m) echo arm64;; esac\n')
            (bin_dir/'curl').write_text('''#!/bin/bash
set -eu
url= out=
while (($#)); do case "$1" in -o) out="$2";shift 2;; https://*) url="$1";shift;; *) shift;; esac;done
cp "$FIXTURE_DOWNLOADS/${url##*/}" "$out"
''')
            for f in bin_dir.iterdir():f.chmod(0o755)
            archive=downloads/'autobyteus-nfs-0.0.0-fixture-darwin-arm64.tar.gz'
            with tarfile.open(archive,'w:gz') as tar:
                for name,content in [('LICENSE',b'fixture'),('THIRD_PARTY_NOTICES',b'fixture'),('release.json',b'{}'),('autobyteus-nfs',b'#!/bin/sh\nprintf "%s\\n" "$1" >> "$HOME/invocations"\n')]:
                    info=tarfile.TarInfo(name);info.size=len(content);info.mode=0o755 if name=='autobyteus-nfs' else 0o644
                    if variant=='symlink' and name=='autobyteus-nfs':info.type=tarfile.SYMTYPE;info.linkname='/bin/false';info.size=0
                    tar.addfile(info,io.BytesIO(content) if info.isreg() else None)
                if variant=='extra':
                    info=tarfile.TarInfo('../outside');info.size=3;tar.addfile(info,io.BytesIO(b'bad'))
            checksum=hashlib.sha256(archive.read_bytes()).hexdigest() if variant!='checksum' else '0'*64
            (downloads/'SHA256SUMS-nfs').write_text(checksum+'  '+archive.name+'\n')
            (downloads/'autobyteus-nfs-manifest.json').write_text('{}')
            env={'PATH':str(bin_dir)+':/usr/bin:/bin','HOME':str(home),'TMPDIR':root,'FIXTURE_DOWNLOADS':str(downloads)}
            result=subprocess.run(['/bin/bash',str(installer),'version'],env=env,text=True,capture_output=True)
            self.assertEqual(list(p.glob('autobyteus-nfs-install.*')),[], 'download scratch leaked')
            self.assertFalse((p/'outside').exists())
            if variant=='valid':
                self.assertEqual(result.returncode,0,result.stderr)
                self.assertEqual((home/'invocations').read_text(),'verify-release\nversion\n')
                self.assertTrue((home/'.local/bin/autobyteus-nfs').is_symlink())
            else:
                self.assertNotEqual(result.returncode,0,result.stderr)
                self.assertFalse((home/'invocations').exists())
                self.assertFalse((home/'.local').exists())
    @unittest.skipIf(Path('/.dockerenv').exists(), 'installer deliberately refuses container-host context')
    def test_valid_fixture_installs_and_immediately_invokes(self):self.run_fixture('valid')
    @unittest.skipIf(Path('/.dockerenv').exists(), 'installer deliberately refuses container-host context')
    def test_corrupt_or_unsafe_archive_never_executes(self):
        for case in ['checksum','symlink','extra']:
            with self.subTest(case=case):self.run_fixture(case)

if __name__=='__main__':unittest.main()
