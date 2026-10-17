"""Bound each TCP connect separately; previous -w-only probe timed out in harness."""
exec((__import__('pathlib').Path(__file__).resolve().parent/'mac-common.py').read_text());OUT='peer-network-confirm-result.json';linux=json.loads((E/'linux-new-source-confirm-result.json').read_text());assert linux['result'].startswith('Pass');ip=linux['endpoint'];r['linuxEndpoint']=ip;r['scope']='TCP prerequisite only; same-host guests never physical qualification'
r['route']=m('/sbin/route -n get '+ip,10,False)
for port in [22,2049]:r['tcp'+str(port)]=m('/usr/bin/nc -z -v -G 3 -w 3 '+ip+' '+str(port),10,False);save()
r['result']='TCP2049 reachable' if r['tcp2049']['rc']==0 else 'TCP2049 unavailable';save()
