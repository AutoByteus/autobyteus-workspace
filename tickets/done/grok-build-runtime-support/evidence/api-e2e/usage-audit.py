import json,sys,glob,os
total_cost=0
for f in sys.argv[1:]:
  sess={}; calls=[]; turns=[]; loads=[]
  for l in open(f):
    r=json.loads(l)
    if r['dir'] not in('in','out'): continue
    try: m=json.loads(r['line'])
    except: continue
    if r['dir']=='out' and m.get('method') in ('session/prompt','session/load','session/new'):
      if m['method']=='session/load': loads.append(m['params'].get('mcpServers'))
      if m['method']=='session/prompt': calls.append('PROMPT')
    if m.get('method')=='_x.ai/session_notification' and m['params']['update'].get('sessionUpdate')=='response_completed':
      calls.append(m['params']['update']['usage'])
    res=m.get('result')
    if isinstance(res,dict) and 'stopReason' in res:
      u=(res.get('_meta') or {}).get('usage'); calls.append(('END',res['stopReason'],u))
  # group per turn
  cur=[]; print('==',os.path.basename(f), 'session/load mcpServers:', json.dumps(loads)[:160] if loads else '-')
  for c in calls:
    if c=='PROMPT': cur=[]; continue
    if isinstance(c,tuple):
      _,stop,u=c
      s={k:sum(x.get(k) or 0 for x in cur) for k in ('input_tokens','cache_read_input_tokens','output_tokens','reasoning_tokens')}
      cost=(u or {}).get('costUsdTicks') or 0; total_cost+=cost
      tu={k:(u or {}).get(k) for k in ('inputTokens','cachedReadTokens','outputTokens','thoughtTokens','totalTokens')} if u else None
      print(f"  turn stop={stop} calls={len(cur)} per-call-sum={s} turn_usage={json.dumps(u)[:260] if u else None}")
      cur=[]
    else: cur.append(c)
print('TOTAL provider costUsdTicks', total_cost, '≈ USD', total_cost/1e10)
