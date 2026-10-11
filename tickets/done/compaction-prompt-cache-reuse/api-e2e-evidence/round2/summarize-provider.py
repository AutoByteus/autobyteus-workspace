import json,sys
L=sys.argv[1]
for X in 'AB':
  try: d=json.load(open(f'ac003-{L}-{X}/ac003-results.json'))
  except Exception as e: print(L,X,'no results',e); continue
  m=d['meta']; print('=====',L,X,m.get('model'),'units',m['compactableUnits'],'retained',m['retainedMessages'])
  for mode in ('cached','transcript'):
    r=d['results'][mode]; s=r.get('summary') or ''
    print(mode,'parseError',str(r.get('parseError'))[:300],'chars',len(s),'completion',(r.get('metadata') or {}).get('completionStatus'),'idsNotIn',(r.get('identifierCheck') or {}).get('notInHistory'),'echo','Your context window is nearly full' in s)
    c=r.get('continuation')
    if isinstance(c,list):
      for i,t in enumerate(c): print('  cont',i+1,len(t['assistant']),'idsNotIn',t.get('identifiersNotInHistory'))
    else: print('  cont',c)
  for c in d['calls']: print('  call',c['label'],c['status'],{k:v for k,v in c['usage'].items() if v})
