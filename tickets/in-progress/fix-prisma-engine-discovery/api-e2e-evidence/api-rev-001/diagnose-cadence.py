import pathlib,os,tempfile,subprocess,shutil,json,hashlib,datetime
r=pathlib.Path.cwd();e=r/'tickets/in-progress/fix-prisma-engine-discovery/api-e2e-evidence/api-rev-001';l=e.parent.parent/'api-e2e-test-case-ledger.md'
src=r/'autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts';dst=src.with_name('api-cadence-diagnostic.integration.test.ts');assert not dst.exists()
p=pathlib.Path(tempfile.mkdtemp(prefix='api-prisma-diagnostic-'));(p/'home').mkdir();(p/'tmp').mkdir();env={'PATH':os.environ['PATH'],'HOME':str(p/'home'),'TMPDIR':str(p/'tmp'),'CI':'1','NO_COLOR':'1'}
s=src.read_text();s=s.replace('const message = JSON.parse(data.toString()) as WsMessage;', 'const message = JSON.parse(data.toString()) as WsMessage;\n    console.log("CADENCE_DIAGNOSTIC", JSON.stringify({time: Date.now(), type: message.type, delta: message.payload.delta}));');dst.write_text(s)
paths=[str(src.relative_to(r)), 'autobyteus-server-ts/src/agent-execution/domain/agent-run.ts','autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-stream-content-cadence-scheduler.ts','autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts','autobyteus-server-ts/src/config/streaming-content-flush-interval-setting.ts']
audit=[]
for rel in paths:
 base=subprocess.check_output(['git','show','e22245f097c208e66065302cfc30814cc5ffd14f:'+rel]);current=(r/rel).read_bytes();audit.append({'path':rel,'baseEqualsCurrent':base==current,'sha256':hashlib.sha256(current).hexdigest()})
results=[]
try:
 for name,cmd in [('cadence-diagnostic',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/integration/agent/api-cadence-diagnostic.integration.test.ts','-t','coalesces a representative|uses a changed interval','--no-watch']),('unit',['pnpm','-C','autobyteus-server-ts','test:unit'])]:
  with l.open('a') as f:f.write(f'\n- API001 Started {name} {datetime.datetime.now(datetime.timezone.utc).isoformat()}; clean private environment.\n')
  with (e/(name+'.log')).open('w') as f:run=subprocess.run(cmd,env=env,stdout=f,stderr=subprocess.STDOUT)
  results.append({'name':name,'command':cmd,'exit':run.returncode}); print(name,run.returncode,flush=True)
  with l.open('a') as f:f.write(f'- API001 Completed {name} exit{run.returncode}; `{name}.log`; skips/failures retained, diagnostic does not alter assertions.\n')
finally:
 dst.unlink();shutil.rmtree(p)
 (e/'cadence-diagnostic.json').write_text(json.dumps({'sourceAudit':audit,'runs':results,'diagnosticChange':'log type/time/delta before existing AGENT_INPUT_STATE trace filtering; unchanged assertions/production','temporaryTestRemoved':not dst.exists(),'privateRootAbsent':not p.exists()},indent=2)+'\n')
