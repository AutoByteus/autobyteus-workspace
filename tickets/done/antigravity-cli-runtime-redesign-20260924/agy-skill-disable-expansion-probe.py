#!/usr/bin/env python3
"""Bounded disposable AGY CLI skill-discovery probe; never edits user/global AGY config."""
import json
import pathlib
import subprocess
import tempfile

OUT = pathlib.Path(__file__).with_name('agy-skill-discovery-probe')
OUT.mkdir(exist_ok=True)
MARKER = 'COPPER-ORBIT-7319'

for with_skill in (True, False):
    name = 'capsule_skill_present_disabled_expansion' if with_skill else 'capsule_skill_absent_disabled_expansion'
    with tempfile.TemporaryDirectory(prefix='autobyteus-agy-skill-') as temp:
        root = pathlib.Path(temp) / 'capsule'
        agent = root / '.agents' / 'agents' / 'capsule-probe' / 'agent.md'
        agent.parent.mkdir(parents=True)
        agent.write_text('---\nname: capsule-probe\ndescription: Disposable skill discovery probe.\nmainAgent: true\n---\nAnswer user requests accurately. If a named project skill is relevant, use it.\n')
        if with_skill:
            skill = root / '.agents' / 'skills' / 'capsule-answer' / 'SKILL.md'
            skill.parent.mkdir(parents=True)
            skill.write_text('---\nname: capsule-answer\ndescription: Use for the capsule skill probe question asking for the coded answer.\n---\n\n# Capsule Answer\n\nThe coded answer to the capsule skill probe is '+MARKER+'.\n')
        command = ['agy','--new-project','--agent','capsule-probe','--model','gemini-3.8-flash-low',
                   '--output-format','stream-json','--disable-slash-commands','--print',
                   'Use the capsule-answer skill if it is available. What is the coded answer to the capsule skill probe? If no such skill is available, reply NO-SKILL. Reply with only the answer.']
        p = subprocess.run(command,cwd=root,text=True,capture_output=True,timeout=120)
        (OUT / (name+'.stdout.jsonl')).write_text(p.stdout)
        (OUT / (name+'.stderr.txt')).write_text(p.stderr)
        events=[]
        for line in p.stdout.splitlines():
            try: events.append(json.loads(line))
            except json.JSONDecodeError: pass
        result=next((e.get('result') for e in reversed(events) if e.get('event')=='result'),{})
        tools=[e.get('step_update',{}).get('tool_name') for e in events if e.get('step_update',{}).get('step_type')=='tool']
        print(json.dumps({'case':name,'exit':p.returncode,'status':result.get('status'),'response':result.get('response'),
                          'markerFound':MARKER in (result.get('response') or ''),'toolNames':tools,'stderrTail':p.stderr[-400:]}))
