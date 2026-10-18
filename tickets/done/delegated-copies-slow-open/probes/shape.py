import json, os, sys
root = os.path.expanduser('~/.autobyteus/server-data/memory')
host = sys.argv[1]
t = json.load(open(f'{root}/agents/{host}/collaboration/collaboration_tree.json'))
tot_members = 0; tot_trace = 0; teams = 0; agents = 0; tree_bytes = 0; msg_bytes = 0; fc_bytes=0
def dsize(p):
    s=0
    for dp,_,fs in os.walk(p):
        for f in fs:
            if f.startswith('raw_traces') and f.endswith('.jsonl'): s+=os.path.getsize(os.path.join(dp,f))
    return s
for te in t['taskExecutions']:
    if 'teamRunId' in te:
        teams += 1
        d = f"{root}/agent_teams/{te['teamRunId']}"
        tp = f'{d}/team_run_execution_tree.json'
        if not os.path.exists(tp): print('missing', tp); continue
        tree_bytes += os.path.getsize(tp)
        mp = f'{d}/team_communication_messages.json'
        if os.path.exists(mp): msg_bytes += os.path.getsize(mp)
        tt = json.load(open(tp))
        members = tt.get('members') or tt.get('memberRuns') or []
        if not members:
            # find any list of members
            for k,v in tt.items():
                if isinstance(v,list) and v and isinstance(v[0],dict) and 'agentRunId' in v[0]: members=v
        tot_members += len(members)
        tot_trace += dsize(d)
        for m in members:
            fp=f"{d}/{m.get('agentRunId','')}/file_changes.json"
            if os.path.exists(fp): fc_bytes+=os.path.getsize(fp)
    else:
        agents += 1
        d = f"{root}/agents/{te['agentRunId']}"
        tot_trace += dsize(d)
print(dict(host=host, task_executions=len(t['taskExecutions']), teams=teams, task_agents=agents, team_members=tot_members,
  member_raw_trace_MB=round(tot_trace/1e6,1), team_tree_KB=round(tree_bytes/1e3), team_msgs_MB=round(msg_bytes/1e6,1), file_changes_KB=round(fc_bytes/1e3)))
