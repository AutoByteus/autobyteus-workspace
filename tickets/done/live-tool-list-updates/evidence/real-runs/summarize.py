import json,sys
d=json.load(open(sys.argv[1]))
print('runtime',d['runtimeKind'],'model',d['model'])
for t in d['turns']:
    print('==',t['label'])
    for e in t['entries']:
        k=e['kind']
        if k=='tool_call': print('  tool',e.get('toolName'),'err=',(e.get('toolError') or '')[:120],'res=',json.dumps(e.get('toolResult'))[:140])
        elif k=='system_task_notification': print('  notice',e.get('senderId'),repr(e.get('content'))[:160])
        elif k=='message' and (e.get('content') or '').strip(): print('  msg',e.get('role'),repr((e.get('content') or ''))[:200])
print('seen',[json.loads(s)['toolNames'] for s in d.get('seenToolNames',[])]); print('terminate',d.get('terminate'))
