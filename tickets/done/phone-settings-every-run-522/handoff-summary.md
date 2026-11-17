# Handoff Summary — phone-settings-every-run-522 (autobyteus-522)

## What Ships

- **Settings** in the ⋮ menu of every run the phone opens (after Activity): standalone agents, Team and Org members, task agents and task-team members under any of them, and runs on another node.
- Save changes the opened agent's own runtime and model in the run that holds it; a live run's stop stops that run (a task agent's, a task team's, the Org's or the Team's), never the run that delegated it; the phone stays on Settings.
- A run on another node: "This run is on <node>. Its runtime and model can be changed only on that node." No rows, no Save.

## Classification

- `task_size` `Small`, `architectural_risk` `Low`, route `Direct` (API-REV-001 Pass 94%; test review not required).

## Integrated State

- Merged `origin/personal` `ff13782f36` (autobyteus-515: native tool search, server only) as `8a9f2acb1a`; no conflicts, no shared file, no phone case-ID clash. Post-integration: 522's specs, the localization tests and both typechecks on the merged state (release report).

## Verification

- From the evidence: AC-001…AC-007 proven, including the founder's case in the Android app (a PTM's delegated task team: Settings on the lead, one tap stops the task team, the PTM stays active, a Save changes the lead only) and the peer-run sentence in the app; nothing left for the user.

## Residual Risks And Follow-ups

- The full phone probe stays red on two base-side items: MSP-41 (intermittent; 458 FU-003) and FU-001 (MSP-33's "Failed to fetch runtime availabilities" line on a reload of New run; also with the base's versions of this ticket's six files).
- autobyteus-525 edits the same menu files; whichever ticket merges second keeps both changes (design R-002).

## Release

- No release: none requested. Release notes are ready.
