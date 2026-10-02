"""Render prompt builders only, without constructing a compressor/provider or invoking a model."""
import hashlib, importlib, json, pathlib, sys
root, out = map(pathlib.Path, sys.argv[1:3])
sys.path.insert(0, str(root / 'hermes'))
m = importlib.import_module('agent.context_compressor')
# Make a clock-dependent interpolation recognizable, not an asserted runtime date.
m._today_for_prompt = lambda: '{{CURRENT_DATE}}'
c = object.__new__(m.ContextCompressor)
c.tail_mode = 'lean'  # constructor default at this pinned revision
c._previous_summary = None
fresh = c._build_summary_prompt('{{NEWLY_SELECTED_HISTORY}}', 4096, None, '', True)
c._previous_summary = '{{PREVIOUS_SUMMARY}}'
repeat = c._build_summary_prompt('{{NEWLY_SELECTED_HISTORY}}', 4096, None, '', True)
out.mkdir(parents=True, exist_ok=True)
(out / 'hermes-rendered.json').write_text(json.dumps({'first': fresh, 'repeated': repeat, 'source_sha256': hashlib.sha256((root/'hermes/agent/context_compressor.py').read_bytes()).hexdigest(), 'settings': {'has_user_turn': True, 'tail_mode': 'lean', 'summary_budget_argument': 4096, 'focus_topic': None, 'memory_context': '', 'date_binding': '{{CURRENT_DATE}}'}, 'method': 'Actual imported _build_summary_prompt, no constructor or provider call; date helper bound to visible placeholder.'}, indent=2)+'\n')
print('Hermes prompt builder rendered first/repeated variants; no model call.')
