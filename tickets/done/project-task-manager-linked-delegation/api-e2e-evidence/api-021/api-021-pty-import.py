import os, pty, json, select, sys, time
from pathlib import Path
E=Path('tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence/api-021')
i=json.loads((E/'api-207-upgraded-instance.json').read_text())['result']
cmd=['pnpm','--silent','secrets:import','--','--source','/Users/normy/.autobyteus/server-data/.env','--database-url',i['databaseUrl']]
pid,fd=pty.fork()
if pid==0: os.execvp(cmd[0],cmd)
buf=b''; sent=False; deadline=time.time()+600
while time.time()<deadline:
    r,_,_=select.select([fd],[],[],1)
    if fd in r:
        try: data=os.read(fd,4096)
        except OSError: break
        if not data: break
        buf+=data
        if not sent and b'Type IMPORT to continue' in buf:
            time.sleep(0.5); os.write(fd,b'IMPORT\r'); sent=True
_,status=os.waitpid(pid,0); code=os.waitstatus_to_exitcode(status)
print('import', 'CONFIGURED' if b'CONFIGURED' in buf else 'no-configure-line', [l for l in buf.decode('utf8','replace').splitlines() if l.startswith(('CONFIGURED','REPLACED','SKIPPED'))], 'exit', code); sys.exit(code)
