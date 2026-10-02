import pathlib,json,subprocess,time,datetime,sys
root=pathlib.Path.cwd(); t=root/'tickets/in-progress/project-task-manager-foundations'; e=t/'delivery-round-3-evidence'
old=json.loads((t/'api-e2e-round-3-evidence/commands.json').read_text())
items=[(old[i]['command'],name) for i,name in [(0,'shared-prepare.log'),(6,'server-build.log'),(7,'server-current-serial.log'),(10,'renderer-current.log'),(4,'electron-current.log')]]
items.append(('pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/antigravity/agy-stream-event-converter.test.ts tests/unit/run-history/raw-trace-to-historical-replay-events.test.ts --no-watch','upstream-agy-smoke.log'))
records=[]
for command,name in items:
    start=time.monotonic()
    with (e/name).open('w') as out: p=subprocess.run(command,shell=True,stdout=out,stderr=subprocess.STDOUT)
    record={'cwd':str(root),'command':command,'log':name,'exitCode':p.returncode,'elapsedSeconds':round(time.monotonic()-start,3),'completedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    records.append(record);(e/'commands.json').write_text(json.dumps(records,indent=2)+'\n'); print(json.dumps(record),flush=True)
    print('\n'.join((e/name).read_text().splitlines()[-8:]),flush=True)
    if p.returncode:sys.exit(p.returncode)
