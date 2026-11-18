# Docs Sync Report — phone-settings-every-run-522 (autobyteus-522)

## Scope

- Ticket: phone Settings for every run. `task_size` `Small`, `architectural_risk` `Low`, route `Direct` (no review gates; test review `Not Required`).
- Trigger: API/E2E API-REV-001 Pass (94%).
- Base: merge base before delivery; integrated `origin/personal` `ff13782f36` (autobyteus-515), merged as `8a9f2acb1a`.

## Why Docs Were Updated

- The ticket changed no long-lived doc. `autobyteus-web/docs/remote_access.md`'s phone **Settings** paragraph (written by delivery in autobyteus-458) described Settings for "the open run" with a Team/Org member's stop; 522 makes Settings every run's, scopes Save and stop to the run that holds the opened agent (never the delegating run), and adds the read-only sentence for a run on another node.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | the phone's Settings | **Updated** | every run; Save and stop scopes; the peer sentence; `mobileRunSettingsScope` |
| `autobyteus-web/docs/agent_execution_architecture.md` | the stop rule | No change | 458's `sameRunInstance` rule unchanged |
| `GLOSSARY.md`, `DESIGN.md`, `TESTING.md`, `RELEASE.md` | project documents | No change | no new term, convention, test command or release step |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | correction and addition | Settings: in every run's ⋮ menu after Activity (every kind, peer runs included); Save changes the opened agent's own runtime and model in the run that holds it (a task agent under a Team member changes only that task agent); a live run's stop stops the run that holds the agent, never the delegating run; a run on another node: no rows, no Save, "This run is on <node>. Its runtime and model can be changed only on that node." | REQ-001…REQ-005 |

## Delivery Continuation

- Result: `Pass`. Next: finalization; no release (none requested).
