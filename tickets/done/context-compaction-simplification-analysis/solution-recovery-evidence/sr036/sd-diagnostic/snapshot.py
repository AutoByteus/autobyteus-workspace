import sys,json,subprocess
from pathlib import Path
from api import gql
p=Path(__file__).resolve().parent
name,host,address=sys.argv[1:4]
root=gql(name+'-root','query{agentRunCollaboration(runId:'+json.dumps(host)+')}')
r=root['agentRunCollaboration']['root_agent']
agents=[]
for child in r['execution_tree']['collaborators']:
 if child['kind']=='agent':agents.append(child)
 else:agents.extend(child['members'])
a=next(x for x in agents if x['address']==address)
query='query{agentRunCollaborationMemberProjection(hostRunId:'+json.dumps(host)+',memberAddress:'+json.dumps(address)+',agentRunId:'+json.dumps(a['agentRunId'])+'){agentRunId memberAddress conversation activities summary lastActivityAt hasEarlierActiveTraceEvents}}'
gql(name+'-projection',query)
launch=json.loads((p/'start-2.json').read_text())['result']
with (p/(name+'-backend.txt')).open('x') as f:f.write(subprocess.check_output(['lsof','-nP','-iTCP:'+str(launch['serverPort']),'-sTCP:LISTEN']).decode())
raw=[f for f in Path(launch['dataRoot']).rglob('raw_traces*.jsonl') if a['agentRunId'] in str(f)]
for i,f in enumerate(raw):
 with (p/(name+'-raw-'+str(i)+'.jsonl')).open('xb') as out:out.write(f.read_bytes())
state=next(x['state'] for x in r['agent_input_states'] if x['agent_run_id']==a['agentRunId'])
print(json.dumps({'agent':a,'state':state,'rawPaths':[str(f) for f in raw]},indent=2))

