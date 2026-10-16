#!/usr/bin/env python3
"""Compares the system instructions each real runtime was SUPPLIED (recorded in the run's raw trace as SYSTEM_INSTRUCTIONS_SUPPLIED)
with the approved complete views (wording/collaboration-prompt-complete-views.md), for every run in a data root.
Usage: check-supplied-prompts.py <views.md> <data-root>/server-data/memory
Role is read from where the run lives (root agent = standalone; under collaboration/ of an Agent root = task agent; agent_teams = team member;
agent_orgs direct member = organization agent; a member of a team inside agent_orgs = team member with the organization line)."""
import json, re, sys, glob, os
views = open(sys.argv[1]).read()
memory = sys.argv[2]
b = re.findall(r"```markdown\n(.*?)\n```", views, re.S)
standalone, task, member, orgagent, orgbullet = b
HANDOFFS = "\n\n### Handoffs"
tail = lambda blk, h: blk[blk.index(h):]
def strip_handoffs(t): return t[:t.index(HANDOFFS)] if HANDOFFS in t else t
TM = "- To talk with a teammate, use `send_message_to` with their address."
def expected(role, handoffs, instruction, org_line=False):
    ins = f"## Team Instruction\n\n{instruction}\n\n" if instruction else ""
    if role == "standalone": return strip_handoffs(tail(standalone, "## Working With Other Agents"))
    if role == "task":
        base = tail(task, "## Working With Other Agents")
        return ins + base + ("\n\n" + member[member.index(HANDOFFS) + 2:] if handoffs else "")
    blk = orgagent if role == "org" else member
    body = tail(blk, "## AgentTeam Addressing")
    if not handoffs: body = strip_handoffs(body)
    if org_line: body = body.replace(TM, orgbullet[orgbullet.index(TM):].strip())
    return ins + body
def collab(prompt):
    starts = [prompt.find(h) for h in ("## Team Instruction", "## AgentTeam Addressing", "## Working With Other Agents")]
    s = min(i for i in starts if i >= 0); e = prompt.find("\n\n## Working Environment", s)
    return (prompt[s:] if e < 0 else prompt[s:e]).strip()
ok = True
for f in sorted(glob.glob(memory + "/**/raw_traces_active.jsonl", recursive=True)):
    rel = os.path.relpath(f, memory); name = rel.split("/")[-2]
    sysm = [json.loads(l) for l in open(f) if '"system_instruction"' in l]
    if not sysm: continue
    prompt = sysm[0]["content"]; part = collab(prompt)
    has_hand = "### Handoffs" in part
    ti = re.search(r"## Team Instruction\n\n([^\n]+)", part); ti = ti.group(1) if ti else None
    if rel.startswith("agents/") and "/collaboration/" not in rel:
        role, org = "standalone", False
    elif rel.startswith("agents/"):
        role, org = ("team", False) if re.search(r"/collaboration/[^/]+/[^/]+/raw", rel) else ("task", False)
    elif rel.startswith("agent_teams/"):
        role, org = "team", False
    else:  # agent_orgs
        depth = rel.split("/")
        role, org = ("org", False) if len(depth) == 4 else ("team", True)
    exp = expected(role, has_hand, ti, org)
    same = part == exp
    ok &= same
    print(("PASS" if same else "FAIL"), role + (" (org line)" if org else ""), "handoffs" if has_hand else "no-handoffs", "|", rel[:90])
    if not same:
        import difflib
        print("\n".join(list(difflib.unified_diff(exp.split("\n"), part.split("\n"), lineterm=""))[:10]))
print("ALL PASS" if ok else "SOME FAIL")
