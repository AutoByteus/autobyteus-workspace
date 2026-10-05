#!/usr/bin/env python3
import sys,subprocess,datetime,re,json,shlex
from pathlib import Path
root=Path(__file__).resolve().parents[4]; ticket=Path(__file__).resolve().parent.parent
case=sys.argv[1].split('@')[0]; logcase=sys.argv[1].replace('@','-'); label=sys.argv[2]; command=sys.argv[3:]
log=ticket/'api-e2e-evidence'/f'{logcase.lower()}.log'; ledger=ticket/'api-e2e-test-case-ledger.md'
def event(kind,observed,result):
 now=datetime.datetime.now(datetime.timezone.utc).isoformat()
 with ledger.open('a') as f:f.write(f'\n| {case}-{kind} | {case} | {now} | {kind} | `{shlex.join(command)}` in W | {label} | {observed} | {result} | api-e2e-evidence/{log.name} | See investigation |\n')
event('Started','Execution started','N/A')
with log.open('w') as f:
 f.write(f'case={case}\ncwd={root}\ncommand={shlex.join(command)}\n');f.flush()
 p=subprocess.run(command,cwd=root,stdout=f,stderr=subprocess.STDOUT)
 f.write(f'\nPROCESS_EXIT_CODE={p.returncode}\n')
s=log.read_text(); summary='; '.join(re.sub(r'\x1b\[[0-9;]*[a-zA-Z]','',x).strip() for x in s.splitlines() if re.search(r'Test Files|Tests |Duration|Error:|error TS|PROCESS_EXIT_CODE',x))[-2200:]
event('Completed',summary.replace('|','/'), 'Pass' if p.returncode==0 else 'Fail')
print(json.dumps({'case':case,'exit':p.returncode,'log':str(log),'summary':summary}))
