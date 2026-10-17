"""Ordinary Linux native/container operations; same kernel, not independent peer proof."""
from pathlib import Path
E=Path(__file__).resolve().parent; RESULT='file-operations-result.json';exec((E/'common.py').read_text())
assert json.loads((E/'visibility-result.json').read_text())['result']=='Pass'
def node(code):return g('sudo -n docker exec autobyteus-server-0 python3 -c '+shlex.quote(code),timeout=30)
def native(code):return nongroups('python3 -c '+shlex.quote(code),timeout=30)
try:
 p=ROOT+'/operations-api005';r['project']=p
 case('native mkdir create synced executable and relative symlink',lambda:native("import pathlib,os; p=pathlib.Path("+repr(p)+");p.mkdir();f=(p/'one.sh').open('xb');f.write(b'#!/bin/sh\\nprintf API005_EXEC');f.flush();os.fsync(f.fileno());f.close();(p/'one.sh').chmod(0o755);(p/'linked').symlink_to('one.sh')"))
 case('container fresh read relative symlink execute and exclusive-create refusal',lambda:node("import pathlib,subprocess; p=pathlib.Path("+repr(p)+");assert (p/'linked').read_bytes()==(p/'one.sh').read_bytes();assert subprocess.check_output([str(p/'linked')])==b'API005_EXEC';\ntry:(p/'one.sh').open('xb');raise AssertionError('exclusive create replaced existing')\nexcept FileExistsError:pass\nprint('exact relative bytes/execute/exclusive-create Pass')"))
 case('container modify fsync close then native read rename delete',lambda:node("import pathlib,os; p=pathlib.Path("+repr(p)+");f=(p/'one.sh').open('wb');f.write(b'API005_CONTAINER_WRITE');f.flush();os.fsync(f.fileno());f.close();print('synced/closed')"))
 q=native("import pathlib,time,json; p=pathlib.Path("+repr(p)+");t=time.monotonic();rows=[]\nwhile time.monotonic()-t<5:\n b=(p/'one.sh').read_bytes();rows.append({'seconds':time.monotonic()-t,'exact':b==b'API005_CONTAINER_WRITE'})\n if b==b'API005_CONTAINER_WRITE':break\n time.sleep(.1)\nassert b==b'API005_CONTAINER_WRITE';(p/'one.sh').rename(p/'renamed');(p/'linked').unlink();print(json.dumps(rows))");r['reciprocalObservation']=q;save()
 case('container observes rename and removes file',lambda:node("import pathlib; p=pathlib.Path("+repr(p)+");assert (p/'renamed').read_bytes()==b'API005_CONTAINER_WRITE';assert not (p/'one.sh').exists();(p/'renamed').unlink();print('rename/read/delete Pass')"))
 # Two real participants write different files concurrently; no artificial same-file race.
 import concurrent.futures
 code="import pathlib,os; p=pathlib.Path(PATH); f=p.open('xb');f.write(DATA);f.flush();os.fsync(f.fileno());f.close();print('synced/closed')"
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  a=pool.submit(native,code.replace('PATH',repr(p+'/native.txt')).replace('DATA',repr(b'NATIVE_DIFFERENT_FILE')))
  b=pool.submit(node,code.replace('PATH',repr(p+'/container.txt')).replace('DATA',repr(b'CONTAINER_DIFFERENT_FILE')))
  r['concurrentWriters']=[a.result(),b.result()];save()
 check="import pathlib; p=pathlib.Path("+repr(p)+");assert (p/'native.txt').read_bytes()==b'NATIVE_DIFFERENT_FILE';assert (p/'container.txt').read_bytes()==b'CONTAINER_DIFFERENT_FILE';print('different files cross-readable')"
 case('both Linux clients see independent committed outputs',lambda:{'native':native(check),'container':node(check)})
 r['result']='Pass';save();event('Linux same-kernel native/container ordinary operations and reciprocal/different-file writes Pass; no physical/mac/native-agent claim')
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('Ordinary file operations Fail/incomplete '+repr(x))
