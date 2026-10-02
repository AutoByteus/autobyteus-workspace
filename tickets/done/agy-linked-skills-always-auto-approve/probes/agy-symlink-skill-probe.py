import json, pathlib, subprocess, tempfile, os
MARKER='TEAL-HARBOR-4821'; FILE_MARKER='BRASS-LANTERN-5507'
def run(case, mode):
    with tempfile.TemporaryDirectory(prefix='agy-symlink-probe-') as temp:
        t=pathlib.Path(temp); root=t/'capsule'; src=t/'external-skills'/'probe-answer'
        agent=root/'.agents'/'agents'/'capsule-probe'/'agent.md'; agent.parent.mkdir(parents=True)
        agent.write_text('---\nname: capsule-probe\ndescription: Disposable skill probe.\nmainAgent: true\n---\nAnswer user requests accurately. If a named project skill is relevant, use it.\n')
        src.mkdir(parents=True)
        (src/'SKILL.md').write_text('---\nname: probe-answer\ndescription: Use for the probe question asking for the coded answer.\n---\n\n# Probe Answer\n\nThe first coded answer is '+MARKER+'. The second coded answer is in the file details.md next to this SKILL.md; read it.\n')
        (src/'details.md').write_text('Second coded answer: '+FILE_MARKER+'\n')
        skills=root/'.agents'/'skills'; skills.mkdir(parents=True)
        if mode=='dir_symlink': os.symlink(src, skills/'probe-answer', target_is_directory=True)
        else:
            import shutil; shutil.copytree(src, skills/'probe-answer')
        cmd=['agy','--new-project','--agent','capsule-probe','--model','gemini-3.8-flash-low','--output-format','stream-json','--dangerously-skip-permissions','--print',
             'Use the probe-answer skill if available. Give both coded answers separated by a space. If no such skill is available, reply NO-SKILL. Reply with only the answer.']
        p=subprocess.run(cmd,cwd=root,text=True,capture_output=True,timeout=180)
        ev=[]
        for l in p.stdout.splitlines():
            try: ev.append(json.loads(l))
            except: pass
        res=next((e.get('result') for e in reversed(ev) if e.get('event')=='result'),{}) or {}
        tools=[(e['step_update'].get('tool_name'), json.dumps(e['step_update'].get('tool_input') or e['step_update'].get('arguments') or '')[:160]) for e in ev if e.get('step_update',{}).get('step_type')=='tool']
        r=res.get('response') or ''
        print(json.dumps({'case':case,'exit':p.returncode,'status':res.get('status'),'response':r[:200],'skillMarker':MARKER in r,'fileMarker':FILE_MARKER in r,'tools':tools,'stderrTail':p.stderr[-300:]},indent=1))
run('dir_symlink','dir_symlink'); run('regular_dir_control','copy')
