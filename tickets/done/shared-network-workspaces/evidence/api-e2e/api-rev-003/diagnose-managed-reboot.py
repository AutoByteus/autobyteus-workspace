"""Read-only actual boot-failure evidence before any manual repair/reconnect."""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib
E=Path(__file__).resolve().parent;p=E/'run-linux-docker-public.py';s=p.read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','managed-reboot-diagnostic.json');exec(s)
try:
 r['observedAt']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());r['selectedInspect']=json.loads(g('sudo -n docker inspect autobyteus-server-0')['stdout'])[0];r['unselectedInspect']=json.loads(g('sudo -n docker inspect autobyteus-server-1')['stdout'])[0];r['engineInspect']=g('sudo -n docker ps -a --filter label=com.autobyteus.nfs.storageId=71887d49-17ec-4e6f-a734-03ebd3abaafd --format "{{.Names}}"; sudo -n docker inspect autobyteus-nfs-storage-419ae1b8-6aad-45bc-9bf0-614c48f57d58');save()
 r['journal']=g('sudo -n journalctl -b -u docker -u containerd -u autobyteus-nfs.service --no-pager -o short-precise; sudo -n journalctl -b -k --no-pager | grep -Ei "oom|out of memory|nfs|killed process" || true',timeout=30);save()
 r['sourceAndMount']=snapshot();r['configuration']=g('sudo -n cat /var/lib/autobyteus-nfs/attachment.json /var/lib/autobyteus-nfs/hosted-filesystem.json; sudo -n cat /etc/systemd/system/autobyteus-nfs.service; sudo -n systemctl is-enabled docker autobyteus-nfs.service; cat /proc/sys/kernel/random/boot_id; uptime; free -m');r['publicStatus']=nongroups(B+' status --yes --json',timeout=60);r['result']='Captured';save()
except BaseException as x:r['result']='Incomplete';r['error']=repr(x);save()
print(json.dumps({'result':r['result'],'nodeState':r.get('selectedInspect',{}).get('State'),'restartPolicy':r.get('selectedInspect',{}).get('HostConfig',{}).get('RestartPolicy'),'error':r.get('error')}),flush=True)
