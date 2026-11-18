# Docs Sync Report — phone-run-model-runtime-458 (autobyteus-458, with autobyteus-506's build items)

## Scope

- Ticket: the readable phone conversation, Text size, Settings for a run's runtime and model (with stop for a live run), and a shared stop that reports success when the node stopped the run. `task_size` `Medium`, `architectural_risk` `Low`, route `Direct` (failure-origin review CRR-001; test-code review CRR-002).
- Trigger: API/E2E API-REV-003 Pass (the DR-001 block resolved).
- Bootstrap base (merge base): `3b59ef0be1`; integrated base: `origin/personal` `e16f0b0d55` (merged as `15c1fa5b56`); post-integration verification: API-REV-003, the full phone probe 66/66 on the merged state.

## Why Docs Were Updated

- The ticket changed no long-lived doc, but it adds a phone screen (Settings), a phone setting (Text size), the phone conversation's own layout, and a rule in the shared stop. Delivery documented them where the phone's screens and the stores are described.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | the phone's ⋮ menu and screens | **Updated** | Settings, Text size, the conversation layout |
| `autobyteus-web/docs/agent_execution_architecture.md` | `terminateRun` | **Updated** | the stop-success rule (`sameRunInstance`, REQ-011) |
| `autobyteus-web/docs/agent_orgs.md`, `agent_teams.md` | Team/Org stop | No change | a member's stop stopping the Team/Org run is unchanged desktop behavior, now also from the phone |
| `GLOSSARY.md` | terms | No change | no new term |
| `DESIGN.md` | project design | No change | |
| `TESTING.md` | testing guideline | No change | the probe ID collision is autobyteus-473 FU-003 |
| `RELEASE.md` | release guide | No change | |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | addition | ⋮ views now name Settings and Text size; new sub-bullets: **Settings** (status line, Runtime and Model rows, Save for a stopped run, a refused Save's red card, the live run's one-tap stop, a Team/Org member stops its Team/Org, the phone stays on Settings: `useRunStopAction` with `shell: 'mobile'`, whose default is the desktop, the reviewer's note), **Text size** (15/17/19/21 px, `autobyteus.phone.textSize`), **the conversation** layout (phone only; another agent's message as on the desktop, SR-004) | REQ-001…REQ-008 |
| `autobyteus-web/docs/agent_execution_architecture.md` | addition | `terminateRun`: a stop reports success when the node stopped the run; an instance unknown at the start or now is the same run (`sameRunInstance`); the same for a Team's members | REQ-011 |

## Delivery Continuation

- Result: `Pass`. Next: finalization; no release (none requested).
