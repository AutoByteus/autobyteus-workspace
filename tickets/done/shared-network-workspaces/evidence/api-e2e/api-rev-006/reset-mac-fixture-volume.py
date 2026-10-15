exec((__import__('pathlib').Path(__file__).resolve().parent/'mac-common.py').read_text());OUT='mac-fixture-reset-volume-result.json'
# Independent test precondition reset only. Product intentionally preserves OS-owned nfsd.
m('set -e; sudo -n test ! -e '+Q(STATE+'/attachment.json')+'; sudo -n test ! -e '+Q(STATE+'/hosted-filesystem.json')+'; sudo -n test ! -e '+Q(STATE+'/pending-setup.json')+'; test ! -e /Library/LaunchDaemons/com.autobyteus.nfs.plist; ! /sbin/mount | grep '+Q(' on '+ROOT+' (nfs'))
x=m('sudo -n cat /etc/exports')['stdout'];assert not any(l.strip() and not l.strip().startswith('#') for l in x.splitlines())
r['exportsBefore']=x;r['reason']='Reset solely-owned guest OS prerequisite between independent create cases; no user host operation, not automatic repair/product reconnect proof';save()
case('stop solely-owned guest OS nfsd after verified public detach and no exports',lambda:m('sudo -n /sbin/nfsd disable; sudo -n /sbin/nfsd stop',60))
m('! sudo -n /usr/sbin/lsof -nP -iTCP:2049 -sTCP:LISTEN');r['result']='Ready';save()
