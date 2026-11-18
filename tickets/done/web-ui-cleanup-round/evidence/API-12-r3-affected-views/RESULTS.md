# API-12 round 3: affected views in the isolated desktop instance (iso-52555-8e2c)

| View | Fix | Result | Look for | Evidence |
| --- | --- | --- | --- | --- |
| Desktop build | FO-003 | Pass | `[typecheck] production errors: 0; test-file errors: 298 in 139 files (baseline 298 in 139 files)`, `[typecheck] PASS` | `instance-build-start-stop.txt` |
| Application launch setup summary (Package baseline, Selected resource baseline, Effective configuration) | FO-001, FO-003 | Pass | DOM: `"PACKAGE BASELINE /researcher · Codex App Server · gpt-5.6-luna /writer · Codex App Server · gpt-5.6-luna SELECTED RESOURCE BASELINE /researcher · Codex App Server · … EFFECTIVE CONFIGURATION /researcher · Codex App Server · gpt-5.6-luna …"`, `"kinds": []` | `API-12-r3-01-app-setup-summary.png` |
| Launch-setup issue text (server) | IR-002 server texts | Pass | a saved team-default override whose model Codex does not offer (as after a model is retired; saved through `PUT …/execution-resource-configurations/draftingTeam`, removed afterwards): readiness `MODEL_UNAVAILABLE` "Model 'gpt-retired-ab320' is unavailable for Codex App Server and 'team member /researcher'."; the panel shows the same text; `"kindsShown": 0` on the page | `API-12-r3-02-launch-setup-issue.png` |
| Agent detail "Preferred runtime" | FO-002 | Pass | Daily Assistant (no default): "PREFERRED RUNTIME \| Not set"; an agent created with `claude_agent_sdk` / `haiku`: "PREFERRED RUNTIME \| Claude Agent SDK" | `API-12-r3-03-agent-detail-default-runtime.png` (Not set), `API-12-r3-03-agent-detail-preferred-runtime.png` |
| Team-local agent member details | FO-002 | Pass | Brief Studio Team → researcher "View": "PREFERRED RUNTIME \| Codex App Server" | `API-12-r3-04-team-local-member-runtime.png` |
| Workspace token usage, Runtime row | IR-002 census | Pass | after one local turn (LM Studio `qwen/qwen3.6-35b-a3b`, AutoByteus runtime; model unloaded afterwards): `["Runtime","AutoByteus"]` in Pricing details | `API-12-r3-05-token-usage-runtime.png` |

Cleanup: the instance was stopped (`dataRootRemoved: true`, both ports released; forced after the graceful close), `list` is empty, the throwaway `CODEX_HOME` was removed, LM Studio has no model loaded, and no instance process is left.
