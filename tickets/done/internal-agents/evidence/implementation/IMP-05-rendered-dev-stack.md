# IMP-05 rendered check on the development stack — autobyteus-308 IR-001

- Tree: `codex/internal-agents`, the IR-001 tree, committed as `813f7208d2`. macOS darwin 25.5. Stack: `pnpm dev` (backend 127.0.0.1:8000, frontend 127.0.0.1:3000), data root `<worktree>/.autobyteus/development/server-data` (created by this run, removed afterwards).
- Synthesized data only: `agents/probe-internal-helper/agent.md` ("Probe Internal Helper") + `agent-config.json` `{"internal": true, "toolNames": []}`. The other agents are the dev stack's normal definitions.
- Browser: the AutoByteus browser tab against the dev frontend; assertions read through DOM scripts, screenshots support them.

| Step | Action | Assertion (result) | Evidence |
| --- | --- | --- | --- |
| 1 | GraphQL `agentDefinitions { id internal }`, setting absent | probe absent; normal agents present (Pass) | below |
| 2 | GraphQL `agentDefinition(id:"probe-internal-helper")` | `{"id":"probe-internal-helper","name":"Probe Internal Helper","internal":true}`: opens by ID (REQ-008) (Pass) | below |
| 3 | `/agents` | `hasProbe:false`, `hasNormal:true`, `badges:0` (Pass) | IMP-05a |
| 4 | Settings → Server Settings → Basics | card `show-internal-agents-card` present, title "Internal agents", toggle `aria-checked=false` (Pass) | IMP-05b |
| 5 | click the toggle | `aria-checked=true`, no error; `getServerSettings` has `AUTOBYTEUS_SHOW_INTERNAL_AGENTS = "true"`; `agentDefinitions` now has `probe-internal-helper` `internal:true` (Pass, no restart) | below |
| 6 | `/agents` | `hasProbe:true`, `badges:1`, badge text "Internal", title "The system's own helper agent, shown because "Show internal agents" is on." (Pass) | IMP-05c |
| 7 | client-side (router push, no reload: a window marker survived) to Settings, toggle off, back to `/agents` | toggle `aria-checked=false`, no error; Agents page `hasProbe:false`, `badges:0`, normal agents present: the card's refresh reloaded the list (Pass) | DOM result |

API answers (abridged):

```
setting off:  agentDefinitions → 119 entries, none with id probe-internal-helper (same count after toggling back off)
by id:        {"data":{"agentDefinition":{"id":"probe-internal-helper","name":"Probe Internal Helper","internal":true}}}
after toggle: "key":"AUTOBYTEUS_SHOW_INTERNAL_AGENTS","value":"true"
              "id":"probe-internal-helper","internal":true
```

Look and feel: the card follows the Basics cards' layout (rounded card, title, description, row with switch); the badge is a small amber pill in the card's existing badge row. At the narrow viewport the explanation wraps cleanly beside the switch.
