"""Review diagnostic, not a product test or real installation.
Runs current installer with task-only fake HTTPS assets/binary, retaining its real
umask/extraction/install/invocation behavior. No sudo/OS paths/Docker/providers.
The fake binary observes inherited umask and the same mkdir(0755) syscall mode
semantics used by Go os.Mkdir; root ownership/elevation are source-reviewed only.
"""
import hashlib, io, json, os, subprocess, tarfile, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[5]
EVIDENCE = Path(__file__).resolve().parent
receipt = {'scope': __doc__, 'cases': []}
with tempfile.TemporaryDirectory(prefix='crr001-installer-') as tmp:
    p=Path(tmp); home=p/'home'; home.mkdir(); downloads=p/'downloads'; downloads.mkdir(); bins=p/'bin'; bins.mkdir()
    receipt['temporaryRoot']=tmp
    installer=p/'install.sh'
    installer.write_text((ROOT/'scripts/public/nfs/install.sh').read_text().replace('__RELEASE_TAG__','v0.0.0-review'))
    (bins/'uname').write_text('#!/bin/sh\ncase "$1" in -s) echo Darwin;; -m) echo arm64;; esac\n')
    (bins/'curl').write_text('''#!/bin/bash
set -eu
url= out=
while (($#)); do case "$1" in -o) out="$2";shift 2;; https://*) url="$1";shift;; *) shift;; esac;done
cp "$FIXTURE_DOWNLOADS/${url##*/}" "$out"
''')
    for f in bins.iterdir(): f.chmod(0o755)
    fake=b'''#!/usr/bin/python3
import os,json,sys
from pathlib import Path
mask=os.umask(0);os.umask(mask)
home=Path(os.environ['HOME'])
role=sys.argv[1]
created=home/('mkdir-mode-'+role)
os.mkdir(created,0o755)
(home/(role+'.json')).write_text(json.dumps({'inheritedUmask':oct(mask),'requestedMkdirMode':'0o755','actualMkdirMode':oct(created.stat().st_mode & 0o777)}))
'''
    archive=downloads/'autobyteus-nfs-0.0.0-review-darwin-arm64.tar.gz'
    with tarfile.open(archive,'w:gz') as tar:
        for name,content in [('LICENSE',b'review fixture'),('THIRD_PARTY_NOTICES',b'review fixture'),('release.json',b'{}'),('autobyteus-nfs',fake)]:
            info=tarfile.TarInfo(name); info.size=len(content); info.mode=0o755 if name=='autobyteus-nfs' else 0o644
            tar.addfile(info,io.BytesIO(content))
    (downloads/'SHA256SUMS-nfs').write_text(hashlib.sha256(archive.read_bytes()).hexdigest()+'  '+archive.name+'\n')
    (downloads/'autobyteus-nfs-manifest.json').write_text('{}')
    env={'PATH':str(bins)+':/usr/bin:/bin','HOME':str(home),'TMPDIR':tmp,'FIXTURE_DOWNLOADS':str(downloads)}
    result=subprocess.run(['/bin/bash',str(installer),'create'],env=env,capture_output=True,text=True)
    receipt.update(exitCode=result.returncode,stdout=result.stdout,stderr=result.stderr)
    assert result.returncode==0, result.stderr
    for role in ('verify-release','create'):
        case={'stage':role,**json.loads((home/(role+'.json')).read_text())}
        receipt['cases'].append(case)
        assert case['inheritedUmask']=='0o77'
        assert case['actualMkdirMode']=='0o700'
    receipt['downloadScratchAbsent']=not list(p.glob('autobyteus-nfs-install.*'))
receipt['temporaryRootRemoved']=not Path(receipt['temporaryRoot']).exists()
receipt['interpretation']='Installer delivers umask 077 to its child. Default sudo union preserves it; InstallRoot and Run do not reset it. RootDirectory passes 0755 to os.Mkdir without chmod, producing 0700 on newly-created public/libexec directories. Actual root/nonroot access failure is established by source/permission contracts, NOT a privileged reproduction here.'
(EVIDENCE/'installer-umask-result.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt,indent=2))
