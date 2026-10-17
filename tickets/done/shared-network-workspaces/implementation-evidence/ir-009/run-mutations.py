"""Copied-source negative controls only; copies stay on canonical project filesystem."""
from pathlib import Path
import subprocess as sp,json,shutil,time
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());rows=[]
env={'PATH':str(S/'go/bin')+':/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'GOTOOLCHAIN':'local'}
root=R/'autobyteus-nfs/out/ir009-unit-mutations';root.mkdir(exist_ok=False)
mutations=[
 ('skip-fd-close','platform/source_darwin.go','defer syscall.Close(fd)','// close removed','TestSourceCaptureCorrelationAndClosure','platform'),
 ('skip-post-correlation','platform/source_darwin.go','if after != observed || current != observed || currentMount != mount {','if false && (after != observed || current != observed || currentMount != mount) {','TestSourceCaptureCorrelationAndClosure','platform'),
 ('accept-duplicate-key','platform/volume_plist.go','if _, exists := v.fields[name]; exists {','if _, exists := v.fields[name]; false && exists {','TestVolumePlistStrictIdentity','platform'),
 ('ignore-trailing-document','platform/volume_plist.go','if _, err = plistToken(d); err != io.EOF {','if _, err = plistToken(d); false && err != io.EOF {','TestVolumePlistStrictIdentity','platform'),
 ('skip-volume-mapping','platform/volume_identity.go','if fields["DeviceNode"].text != device || fields["MountPoint"].text != mount || fields["FilesystemType"].text != "apfs" {','if false && (fields["DeviceNode"].text != device || fields["MountPoint"].text != mount || fields["FilesystemType"].text != "apfs") {','TestVolumePlistStrictIdentity','platform'),
 ('skip-bound-pending-check','setup/pending.go','if err := platform.CheckSource(s.Runner, *p.Hosted); err != nil {','if err := error(nil); err != nil {','TestBoundPendingReuseAndReplacementRefusal','setup'),
 ('skip-binding-save','setup/apply.go','return s.SaveIntent(*p)','return nil','TestCreatedSourceBindingSurvivesProbeFailure','setup'),
 ('keep-new-source-flag','setup/apply.go','p.NewSource = false\n\tif err := p.Hosted.ValidateBound();','p.NewSource = true\n\tif err := p.Hosted.ValidateBound();','TestCreatedSourceBindingSurvivesProbeFailure','setup'),
 ('ignore-hosted-unbound','setup/pending.go','return errors.New("unbound pending source conflicts with hosted state")','return nil','TestPendingUnboundAndInvalidForms','setup'),
 ('skip-complete-validation','setup/apply.go','if err = h.ValidateBound(); err != nil {','if err = h.Validate(); err != nil {','TestCompletedBindingValidationAndReconnectNoEffects','setup'),
]
for name,file,old,new,test,pkg in mutations:
 dest=root/name;shutil.copytree(R/'autobyteus-nfs',dest,ignore=shutil.ignore_patterns('out','__pycache__'))
 p=dest/'internal'/file;s=p.read_text();assert old in s,(name,old);p.write_text(s.replace(old,new))
 start=time.monotonic();q=sp.run([str(S/'go/bin/go'),'test','-count=1','-run',test,'./internal/'+pkg],cwd=dest,env=env,capture_output=True,text=True,timeout=120)
 log=q.stdout+q.stderr;(E/('mutation-'+name+'.log')).write_text(log)
 rows.append({'name':name,'path':str(dest),'rc':q.returncode,'expected':1,'seconds':round(time.monotonic()-start,3),'intendedTest':test,'failureIsTest': '--- FAIL:' in log and 'build failed' not in log})
 (E/'mutation-result.json').write_text(json.dumps(rows,indent=2)+'\n')
 assert q.returncode==1 and rows[-1]['failureIsTest'],(name,log)
print('Ten intended failing copied-source controls complete')
