import os, pty, json, select, sys, time
i=json.load(open(sys.argv[1]))['result']; assert i['ownsDataRoot']
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
print('import',[l for l in buf.decode('utf8','replace').splitlines() if l.startswith(('CONFIGURED','REPLACED','SKIPPED'))],'exit',code); sys.exit(code)
