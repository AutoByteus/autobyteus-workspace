#!/usr/bin/env python3
"""Disposable same-name AGY MCP config precedence check for capsule + --add-dir workspace."""
import json,pathlib,subprocess,sys,tempfile
OUT=pathlib.Path(__file__).with_name('agy-mcp-config-precedence-probe');OUT.mkdir(exist_ok=True)
SERVER='''import json,os,sys
log=open(os.environ['PROBE_LOG'],'a',buffering=1)
for line in sys.stdin:
 try:m=json.loads(line)
 except:continue
 log.write(json.dumps(m)+'\\n')
 if 'id' not in m:continue
 method=m.get('method')
 if method=='initialize':r={'protocolVersion':m.get('params',{}).get('protocolVersion','2025-03-26'),'capabilities':{'tools':{}},'serverInfo':{'name':'collision-probe','version':'0.0.1'}}
 elif method=='tools/list':r={'tools':[{'name':'probe_echo','description':'Return the MCP origin marker.','inputSchema':{'type':'object','properties':{},'additionalProperties':False}}]}
 elif method=='tools/call':r={'content':[{'type':'text','text':os.environ['PROBE_MARKER']}],'isError':False}
 elif method=='resources/list':r={'resources':[]}
 elif method=='prompts/list':r={'prompts':[]}
 else:r={}
 sys.stdout.write(json.dumps({'jsonrpc':'2.0','id':m['id'],'result':r})+'\\n');sys.stdout.flush()
'''
with tempfile.TemporaryDirectory(prefix='autobyteus-agy-mcp-precedence-') as temp:
 root=pathlib.Path(temp);capsule=root/'capsule';workspace=root/'selected-workspace';capsule.mkdir();workspace.mkdir()
 server=root/'server.py';server.write_text(SERVER)
 agent=capsule/'.agents'/'agents'/'capsule-probe'/'agent.md';agent.parent.mkdir(parents=True)
 agent.write_text('---\nname: capsule-probe\ndescription: Disposable MCP precedence test.\nmainAgent: true\ntools: [view_file]\n---\n\n## Working Environment\n- Agent workspace: `'+str(workspace)+'`\n- Resolve task and project locations from the agent workspace unless an explicit target says otherwise.\n')
 for label,location in [('CAPSULE',capsule),('WORKSPACE',workspace)]:
  config=location/'.agents'/'mcp_config.json';config.parent.mkdir(parents=True,exist_ok=True)
  config.write_text(json.dumps({'mcpServers':{'collision-probe':{'command':sys.executable,'args':[str(server)],'env':{'PROBE_LOG':str(root/(label.lower()+'.log')),'PROBE_MARKER':label+'-MARKER-3492'}}}}))
 args=['agy','--new-project','--agent','capsule-probe','--add-dir',str(workspace),'--model','gemini-3.8-flash-low','--dangerously-skip-permissions','--output-format','stream-json','--print-timeout','45s','--print','Call the collision-probe MCP server probe_echo tool once and report only its exact returned marker.']
 p=subprocess.run(args,cwd=capsule,text=True,capture_output=True,timeout=60)
 (OUT/'stdout.jsonl').write_text(p.stdout);(OUT/'stderr.txt').write_text(p.stderr)
 events=[]
 for line in p.stdout.splitlines():
  if line.startswith('{'):
   try:events.append(json.loads(line))
   except:pass
 result=next((e['result'] for e in reversed(events) if e.get('event')=='result'),{})
 summary={'exit':p.returncode,'status':result.get('status'),'response':result.get('response'),'capsuleMethods':[json.loads(x).get('method') for x in (root/'capsule.log').read_text().splitlines()] if (root/'capsule.log').exists() else [],'workspaceMethods':[json.loads(x).get('method') for x in (root/'workspace.log').read_text().splitlines()] if (root/'workspace.log').exists() else [],'mcpToolEvents':[(e['step_update'].get('state'),e['step_update'].get('tool_info')) for e in events if e.get('event')=='step_update' and e['step_update'].get('tool_name')=='call_mcp_tool'],'stderrTail':p.stderr[-400:]}
 (OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
