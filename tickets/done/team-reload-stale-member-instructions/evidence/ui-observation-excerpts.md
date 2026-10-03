# Native UI Observation Excerpts — 2026-10-03

These are transcribed excerpts of actual cua_repl native accessibility results in this conversation, not a fabricated/automatically exported raw AX log. Every UI action used mcp__cua_repl; no CDP/browser automation script was used. App binding was the exact newly built isolated .app path, not the installed production app.

## Initial Worker inspection
Route: `#/agents?view=detail&id=team-local-agent:english-bridge-team:worker&returnToTeam=english-bridge-team`
- Team: English Bridge Team; Team-local
- TOOLS: 6
- Description: Reproduction Worker description version one.
- Instructions: Reproduction Worker instructions version one.
A tool-call assertion checked initialWorkerState contains the version-one instruction: passed.

## After source v2 edit and Agent Teams Reload
Same exact Worker route and ID:
- Team: English Bridge Team; Team-local
- TOOLS: 6 (stale; test-source/API v2 has 2)
- Description: Reproduction Worker description version one. (stale)
- Instructions: Reproduction Worker instructions version one. (stale)
Tool-call assertion checked staleWorkerState contains version-one instructions and does not contain `Work on the request you receive.`: passed.

## Team refresh observation / observation limitation
Expanded Team screenshot visibly displayed `Reproduction Team instructions version two.` at the bottom of the instructions card. The AX text representation truncated this long instructions value at approximately 500 characters even after expansion. An attempted string assertion on that marker failed because of AX truncation; screenshot observation and real backend payload confirmed the v2 Team. This was an observation/assertion limitation, not a failed Team refresh.

## Control: Agents → Reload, then same Team → Worker
- Team: English Bridge Team; Team-local
- TOOLS: 2
- Description: Works on received requests.
- Instructions: Work on the request you receive.
- Tools: read_file, write_file
Tool-call assertion checked freshWorkerState contains latest instruction/description and no version-one instruction: passed.

No LLM invocation, real run creation, production package edit or implementation source edit occurred.
