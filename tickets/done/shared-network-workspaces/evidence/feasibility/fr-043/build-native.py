from pathlib import Path
import subprocess as sp,json,time,uuid,socket,threading,os
P=Path(__file__).resolve().parent;M='/Volumes/autobyteus-shared';R={'scope':'native Mac build prerequisite in fresh no-auth/no-share guest, no host dependency installs','commands':[],'cases':[],'cleanup':[]}
def save():(P/'native-build-result.json').write_text(json.dumps(R,indent=2))
def run(*argv,timeout=45,check=True):
 r=sp.run(argv,capture_output=True,text=True,timeout=timeout);R['commands'].append({'argv':list(argv),'rc':r.returncode,'stdout':r.stdout,'stderr':r.stderr});save()
 if check and r.returncode:raise RuntimeError(r.stderr[-1500:])
 return r
try:
 exec((P/'vm-client.py').read_text(),globals());vm_boot()
 r=vmsh('command -v /opt/homebrew/bin/brew; /usr/bin/xcrun --find clang; test -d /opt/homebrew; ls /opt/homebrew/opt/libtirpc 2>/dev/null',check=False);R['prerequisite']=r.stdout;save();print(r.stdout,flush=True)
 if not '/opt/homebrew/bin/brew' in r.stdout:raise RuntimeError('No existing guest Homebrew; not installing a host toolchain or asking user for commands')
 r=vmsh('HOMEBREW_NO_AUTO_UPDATE=1 /opt/homebrew/bin/brew install autoconf automake bison flex libtirpc',timeout=600);(P/'native-dependency-build.log').write_text(r.stdout+'\n'+r.stderr)
 code="set -e; mkdir /Users/admin/.ab-sf-unfs-build; cd /Users/admin/.ab-sf-unfs-build; /usr/bin/curl -fL --retry 2 https://github.com/unfs3/unfs3/archive/ec1660ba33c80d5c67131e163e68834c1a10e243.tar.gz -o source.tar.gz; /usr/bin/shasum -a 256 source.tar.gz; tar -xzf source.tar.gz; cd unfs3-*; export PATH=/opt/homebrew/opt/bison/bin:/opt/homebrew/opt/flex/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin; export PKG_CONFIG_PATH=/opt/homebrew/opt/libtirpc/lib/pkgconfig; autoreconf -fi; ./configure --prefix=/Users/admin/.ab-sf-unfs-install; make -j2; make install; /Users/admin/.ab-sf-unfs-install/sbin/unfsd -h"
 r=vmsh(code,timeout=300);(P/'native-engine-build.log').write_text(r.stdout+'\n'+r.stderr);R['nativeBuildPassed']=True;print('NATIVE MAC UNFS BUILD PASS',flush=True);save()
except Exception as e:R['fatal']=repr(e);print('BUILD FAILURE',repr(e),flush=True);save()
finally:
 if 'vm_process' in globals():vm_cleanup()
print(json.dumps({'nativeBuildPassed':R.get('nativeBuildPassed',False),'fatal':R.get('fatal')}),flush=True)
raise SystemExit(1 if R.get('fatal') else 0)
