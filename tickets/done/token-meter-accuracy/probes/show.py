import sys,json
for l in open(sys.argv[1]):
  o=json.loads(l); d=o['data']; lab=o['label']
  if lab=='MSG':
    t=d['type']
    if t=='assistant':
      u=d['usage'] or {}
      print(o['dt'],'ASSIST',d['id'][-8:],d['blocks'],'in',u.get('input_tokens'),'cr',u.get('cache_read_input_tokens'),'cw',u.get('cache_creation_input_tokens'),'out',u.get('output_tokens'), 'iters',len(u.get('iterations') or []))
    elif t=='result':
      u=d['usage']; print(o['dt'],'RESULT num_turns',d['num_turns'],'in',u.get('input_tokens'),'cr',u.get('cache_read_input_tokens'),'cw',u.get('cache_creation_input_tokens'),'out',u.get('output_tokens'),'iters',len(u.get('iterations') or []),'cost',d['total_cost_usd'])
      for k,v in d['modelUsage'].items(): print('   modelUsage',k,{x:v.get(x) for x in ['inputTokens','cacheReadInputTokens','cacheCreationInputTokens','outputTokens','contextWindow','costUSD']})
    elif t=='system': print(o['dt'],'SYSTEM',d['subtype'], json.dumps(d.get('raw'))[:300] if d['subtype']!='init' else d['raw'])
    elif t=='user': print(o['dt'],'USER tool_result')
    else: print(o['dt'],t,json.dumps(d)[:300])
  elif lab.startswith('CONTEXT'):
    if isinstance(d,dict):
      print(o['dt'],lab,{k:d[k] for k in d if k!='categories'}); print('   ',[(c['name'],c['tokens'],c['kind']) for c in d['categories']])
    else: print(lab,d)
  else: print(o['dt'],lab,str(d)[:150])
