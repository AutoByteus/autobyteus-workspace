# Result — Codex app-server multi-agent startup investigation

- Package: `codex-disable-multi-agent-20261006`; revision: SR-003.
- Classification: Investigation Complete — diagnostic-only response; not Architecture Design Complete or finalized-delivery Terminal.
- Original request: check whether native multi-agent can be disabled when starting Codex app-server; reproduce apparently ineffective control; experiments expressly permitted.
- Goal achieved: verified effective control on installed codex-cli 0.160.1/gpt-6.1-sol through both nine raw-request probes and three completed real-model tool-inventory turns.
- Scope/approval: investigation/experiments only. No new product behavior approved; no source, personal config or live user app changes; no implementation handoff requested.
- Workspace: `/Users/normy/.codex/investigations/codex-disable-multi-agent-20261006`, non-Git reporting. Source pin read-only personal/f48dbfbf39bbf9ed76116943e304248ca387dc7f. Branch/base/finalization/deployment/cleanup of a Git task: N/A.

## Answer
Yes. On the installed version, start with:

```sh
codex app-server -c agents.enabled=false
```

Official OpenAI documentation: https://learn.chatgpt.com/docs/agent-configuration/subagents and https://learn.chatgpt.com/docs/config-file/config-reference.

Nine isolated real-binary/local-mock requests prove:
- Default: six native collaboration tools present.
- Current AutoByteus flags (`features.multi_agent=false`, `features.multi_agent_v2=false`), including --disable equivalents: six still present.
- agents.enabled=false via CLI/config.toml: zero.
- CLI false overrides config.toml true; explicit per-thread true can override the process default and re-enable tools. Per-thread false also removes tools.

Current startup owner: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-launch-config.ts` line 8 uses only old flags. This is why its existing native multi-agent suppression is ineffective for the tested binary/model. Existing deferred FAPI-013/REQ-014/AC-017 context is linked in investigation notes, read-only.

## Evidence And Limits
- Full method, sources and knowns/unknowns: investigation-notes.md.
- Canonical per-case checks: probe-summary.json and assertions.txt; nine valid cases pass. One initial schema/setup error retained separately.
- SR-001: no credentials or paid inference; local mock deliberately terminates after request capture. SR-003: user-requested authenticated model turns completed and corroborate tool availability; no actual spawn enforcement or full-product E2E claimed.
- All owned processes stopped, mock servers closed, private data roots removed.
- Other Codex models/versions, saved resume, packaged AutoByteus and old-version compatibility untested.
- No implementation/design/review/delivery artifacts: N/A — not applicable.

## Artifact Paths
- `/Users/normy/.codex/investigations/codex-disable-multi-agent-20261006/result.md`
- `/Users/normy/.codex/investigations/codex-disable-multi-agent-20261006/investigation-notes.md`
- `/Users/normy/.codex/investigations/codex-disable-multi-agent-20261006/requirements-doc.md`
- `/Users/normy/.codex/investigations/codex-disable-multi-agent-20261006/solution-revision-record.md`
- `/Users/normy/.codex/investigations/codex-disable-multi-agent-20261006/probe.py`
- `/Users/normy/.codex/investigations/codex-disable-multi-agent-20261006/probe-summary.json`
- `/Users/normy/.codex/investigations/codex-disable-multi-agent-20261006/assertions.txt`
- `/Users/normy/.codex/investigations/codex-disable-multi-agent-20261006/evidence/`
- `/Users/normy/.codex/investigations/codex-disable-multi-agent-20261006/schema/`

## Next Action And Routing
Return findings and tested startup command to user. Any AutoByteus source update requires a separate explicit request/approved scope/design; no receiving specialist's work started.
Handoff-rule lookup completed and retained in handoff-rules.json. No rule matches: both forward routes require an approved Architecture Design Complete package; the delivery correction route requires a returned Delivery Completed receipt. Neither applies to this diagnostic-only request. Return the result directly to the user; no message/delegation sent and no downstream work started.


## Follow-up SR-002 — Why a GitHub report can say unsupported
Original follow-up: “But why on GitHub somebody says that created a GitHub ticket saying that this is not yet supported?”

No new intended-behavior approval, architecture, implementation or real-model execution. The exact issue has not been supplied. Our saved prior investigation records openai/codex#50880 as a codex-cli 0.160.0 report about ineffective --disable multi_agent on catalog-v2 models. It did not establish whether agents.enabled=false worked. This saved account is not live GitHub verification.

The present probes agree that --disable/feature flags fail, while the different agents.enabled=false setting removes native collaboration declarations and the multi-agent developer prompt on installed 0.160.1/gpt-6.1-sol. Official OpenAI subagents docs explicitly document the latter setting. This is not proof the issue was fixed in 0.160.1 or that its author was wrong. Other versions, models and actual spawn enforcement remain untested.

Expected user response: explain control/version distinction, narrow the previous claim to measured facts, and ask for the exact issue/comment if it claims agents.enabled=false also fails. Renewed rule lookup retained in handoff-rules-sr002.json: no matching rule, because this is neither Architecture Design Complete nor a Delivery Completed receipt correction. Return directly to user; no downstream handoff or duplicate forwarding.


## Follow-up SR-003 — Real tool-inventory question completed
Original user request: “You mean… we send the wrong argument… do enough experiments… simply ask what kind of tool do you have… see whether… arguments works or not.”

Three authenticated, isolated actual-model turns now completed. Same gpt-6.1-sol model and same prompt (tool names not pre-supplied), same binary 0.160.1 and production AutoByteus client identifier:
| Startup delta | Model-reported collaboration tools | Turn status |
| --- | --- | --- |
| Default | 6 | completed |
| Current AutoByteus flags: features.multi_agent=false and features.multi_agent_v2=false | 6 | completed |
| agents.enabled=false | 0 | completed |

Default/current-flags tools: collaboration.followup_task, interrupt_agent, list_agents, send_message, spawn_agent, wait_agent. Effective-disable response: “No built-in multi-agent/collaboration tools are available.”

All three answers match the corresponding raw request definitions captured independently in SR-001. No tools executed, no agents spawned. Protected temporary copies of existing CLI auth/catalog only; all copies/private data removed; personal auth/config files byte-unchanged and owned processes exited. Codex quota was used as user requested. Source untouched.

Current answer: yes, current AutoByteus startup passes recognized but ineffective flags for this binary/model, not malformed arguments. The effective startup argument is `-c agents.enabled=false`. A source update remains unrequested/unapproved; do not silently perform it.

Additional absolute evidence paths:
- /Users/normy/.codex/investigations/codex-disable-multi-agent-20261006/live_probe.py
- /Users/normy/.codex/investigations/codex-disable-multi-agent-20261006/live-probe-summary.json
- /Users/normy/.codex/investigations/codex-disable-multi-agent-20261006/live-assertions.txt
- /Users/normy/.codex/investigations/codex-disable-multi-agent-20261006/live-evidence/

Limits unchanged: no older-version/other-model/saved-resume/full-product/spawn-enforcement certification or proof a GitHub ticket was fixed. Renewed handoff lookup saved in handoff-rules-sr003.json. No rule matches this investigation-only outcome: no Architecture Design Complete package or Delivery Completed receipt. Return live findings directly to user; no downstream work/handoff initiated.
