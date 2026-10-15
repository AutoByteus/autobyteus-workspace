exec((__import__('pathlib').Path(__file__).resolve().parent/'mac-common.py').read_text())
OUT='mac-permission-observation.json';r['scope']='Read-only follow-up to immediate warmed export-root chmod000; not assuming NFS parent mode revokes cached child handles'
try:
 r['sourceAndMounted']=m('id; stat -f "%d:%i:%u:%g:%Lp" '+SRC+' '+ROOT+'; cat '+SRC+'/project/preexisting.txt; cat '+ROOT+'/project/preexisting.txt; ls -ld '+ROOT+'/.autobyteus-nfs '+ROOT+'/.autobyteus-nfs/*',20,False)
 r['status']=m(B+' status --yes --json',30,False);r['reconnect']=m(B+' reconnect --yes --json',60,False)
finally:
 m('chmod 755 '+SRC);r['restored']=m(B+' reconnect --yes --json',90);r['mountedProof']=mounted_proof('permission-restored');r['result']='Observed and original mode restored';save()
