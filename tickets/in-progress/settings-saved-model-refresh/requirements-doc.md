# Requirements — Settings saved model refresh

## Document Status
- Package: `settings-saved-model-refresh`; Task `project_task_5ee10f33-b73e-4373-b646-e87613e9c57b`.
- Status: **Approved**; requirements baseline **SR-001**, 2026-10-13.
- Requested by: `/project_task_manager`, AgentRun `project_task_manager_a5f6d9d306e54970bafdad895bdf731d` (return to this exact run).
- Owner/approver: Solution Designer within the direction; no Needs user decisions.
- Approval reference: 2026-10-13 conversation message beginning “The code points to a missing refresh … I’m approving the narrow requirements within your request”. Exact basis: this SR-001 document; no behavior-defining supplements.
- Authorities read: solution-designer SKILL.md; references/requirements-engineering.md; root and web/server AGENTS.md; source-current TESTING.md. Templates read before writing.

## Problem And Desired Outcome
The user reports that after stopping the parent, opening Agent Configuration via its gear, editing a supported collaborator/delegated copy Agent, Team or member, and saving, the open view still shows old settings. Returning to chat and reopening shows the choice. Screenshots establish the surface and Offline status, not a verified before/after. Success is authoritative saved model/config visible in the same open Settings view after Save, including applicable summary/member rows, without navigation, reload or resume.

## Relevant Current And Desired Behavior
| ID | Kind/scenario | Evidence-backed current | Desired | Preserved |
|---|---|---|---|---|
| BEH-001 | User, SCN-001/002 | Reported stale saved rows; current Agent-root Save reloads parent config, while delegated rows use a separate collaboration view. Investigation E-02/E-03. | Accepted saved settings appear on all affected current rows/editors. | Existing controls, Team inheritance/member overrides, per-instance identity. |
| BEH-002 | User, SCN-003 | Draft Save clears pending edits on success; mutation failures retain them; Cancel discards. | Feedback/dirty state honestly distinguish unsaved failure from successful save and any failed readback. | No false persistence claim; Cancel writes nothing. |
| BEH-003 | Contract/User, SCN-004 | Stopped copies editable within fixed runtime; running copies locked; existing backend validates at Save. | Unchanged, with correct refreshed labels. | Stop/resume, conversation/provider identity, launch defaults and unrelated targets untouched. |

## Stakeholders
User wants trustworthy same-view feedback; engineering must diagnose the actual save/read/publication path; Project Task Manager receives tested result/limitations/finalization receipt.

## Relevant Scenarios And Journeys
- **SCN-001 — Supported Normal Scenario**, user / UC-001: stop a parent run with listed collaborators/copies; open Settings by gear; edit one stopped Agent copy or Team member model/settings; Save; stay in Settings and inspect editor and summary; repeat edit; leave/reopen and confirm same saved value. Independent basis: task report, screenshots, prior `delegated-copy-model-change` approved REQ-001/005 and exposed current controls. Covers BEH-001, REQ-001/002, AC-001/002/004.
- **SCN-002 — Supported Normal Scenario**, user / UC-002: in the same section edit a stopped Team's model; Save; following members reflect effective accepted settings while own-default/own-choice members retain theirs; neighboring copies stay unchanged. Includes collaborators and delegated copies under supported Agent, Team and Org parents. Basis: prior approved REQ-002/006 and present UI. Covers BEH-001/003, REQ-001/002/004, AC-002/004.
- **SCN-003 — Supported Explicit Edge Scenario**, user / UC-003: Cancel an unsaved edit, Save a rejected choice, or encounter save/readback failure; feedback is truthful and recovery does not claim unsaved values are committed. Basis: explicit task failed/cancelled-save constraint and existing error/reconciliation behavior. Covers BEH-002, REQ-003, AC-003.
- **SCN-004 — Supported Normal Scenario** plus existing explicit wake-during-save edge, user/system / UC-001/002: inspect a running copy (locked), stop and edit; if copy wakes before Save backend refuses; next ordinary message resumes on saved configuration in the same conversation. This ticket preserves, not extends, that contract. Basis: prior approved REQ-001/004/009, current service guards. Covers BEH-003, REQ-004, AC-005.

## Scope Guardrail
### In-Scope Use Cases
UC-001: save and immediately view one stopped collaborator/copy Agent or member's model/config.
UC-002: save and immediately view stopped Team effective settings and applicable member rows.
UC-003: cancel/failure/readback feedback for that Save journey.
### Out Of Scope
New model-selection design, runtime switching, persistence-format changes, provider behavior changes, launch defaults, task closure policy, independent stop/resume redesign, editing closed Tasks, other Settings bugs. Prior Tasks stay closed. No release authorization; no touching real user runs/data or paid inference for proof.
### Non-goals
No new UX layout, global cache framework, performance program, or exhaustive provider certification.
### Preserved Boundary
BEH-003; per-instance changes must never affect unrelated runs or members. No data/conversation loss or reset is acceptable.
### Review Authority
Blocking findings must cite approved REQ/AC/BEH. New behavior/policy/migration/compatibility obligations are Requirement Gaps needing approval; unrelated findings go to Task Manager as follow-ups, not ticket expansion.

## Requirements And Acceptance Criteria
| REQ | Requirement | Behavior/UC/scenarios | AC and observable verification |
|---|---|---|---|
| REQ-001 | After a successful Save and its automatic readback, open Settings shows the authoritative accepted model/config, not the previous value, without navigation/reload/resume. | BEH-001; UC-001/002; SCN-001/002 | **AC-001:** stopped parent → gear → Agent/member edit → Save, remain in Settings: editor and summary show accepted value, successful settled state is clean; assert against API readback. |
| REQ-002 | All affected Team/member rows reflect effective saved settings, including thinking/fast labels if changed; repeated edits and reopen agree with authoritative state. | BEH-001; UC-001/002; SCN-001/002 | **AC-002:** Team default edit affects followers only; own settings/unrelated targets remain; second edit and reopening agree. **AC-004:** regression matrix covers supported Agent-copy, Team, member, collaborator/delegated and root-kind paths; same-value settings-only edit where applicable. |
| REQ-003 | Cancel/rejected/failed saves cannot appear successful or leave misleading saved/unsaved state. If persistence succeeds but display readback fails, report that distinction and permit read-only refresh/retry rather than pretending rollback or requiring resume. | BEH-002; UC-003; SCN-003 | **AC-003:** Cancel causes no mutation and restores displayed canonical; rejected/network save retains recoverable edits/error with no success; post-commit read failure shows refresh-needed/error, not stale “Saved”; successful retry reconciles without resaving. |
| REQ-004 | Preserve stopped/running eligibility, runtime locks, launch defaults, target identity, stop/resume/conversations. | BEH-003; UC-001/002; SCN-002/004 | **AC-005:** existing restriction/continuity tests pass; no resume/start call on Save or refresh; unrelated copy/root/member settings and IDs/history unchanged. |
| REQ-005 | Prove this journey on a source-current isolated desktop app and add proportionate regressions, without touching user's runs or consuming model quota. | BEH-001..003; all UC/SCN | **AC-006:** actual Save-without-navigation desktop assertions + authoritative readback, source/build identity, exact commands, limitations, screenshots/supporting evidence and owned cleanup receipts. Scripted external runtime is allowed, falsely presenting it as live inference is not. |

## UI, Quality, Data And Dependencies
UI applies only to the existing Settings controls, summary and Save bar. Preserve locks, stopped-edit hints, Team inheritance labels and normal disclosure. Product Design not requested; all Product-owned UI/UX fields **N/A — not applicable**. QR-001 reliability maps REQ-001..004; settled success must be authoritative, no fixed timing SLA. QR-002 safety maps REQ-005/AC-006: isolated source-current app, owned ports/data/processes, zero provider quota. Existing saved configuration is read/written by existing contracts; historical state must remain usable, no loss/reset/migration authorized. Dependency: current delegated save/read APIs; exact root/target identity remains authoritative. Evidence screenshots are observational, not normative visual redesign.

## Decisions / Assumptions
- DEC-001 (Solution Designer, Decided): successful mutation alone is insufficient UI proof; require canonical readback before settled success. Reason: summaries/following members may resolve differently than a local draft. This stays within authoritative-state requirement.
- DEC-002 (Solution Designer, Decided): when write succeeds but refresh fails, report saved-but-not-refreshed and offer existing-style read retry. Reason: treating it as rollback or showing stale Saved is misleading. No extra normal-path label/Reset design.
- DEC-003 (Solution Designer, Decided): include parent Team/Org paths as bounded regressions of the shared editor, not new capabilities. Reason: current component shares Save logic across all root kinds; no target isolation regressions.
- ASM-001: missing standalone collaboration refresh explains report. Source evidence strong; reproduce at validation boundary before claiming fix. Implementation/API-E2E own confirmation; escalate contradictory persistence findings.
- Needs user: None. Release remains unauthorized.

## Supplemental Artifacts / Traceability
Canonical factual evidence: `investigation-notes.md`; chronological index: `solution-revision-record.md`. User screenshots remain external evidence at original attached absolute paths recorded in investigation notes. Prior completed feature package is context, not this ticket's approval authority. REQ table supplies REQ→BEH/UC/SCN/AC mapping; REQ-005 covers all rows. No behavior-defining supplement.

## Architecture Phase Input And Readiness
Readiness passed: problem, evidence limits, desired/preserved behavior, testable AC, scenario validity, scope/data constraints/decisions and approval recorded. Approved SR-001 ready for architecture. Trace mutation persistence, authoritative read models and rendering owners; decide smallest correct publication delta, not blind persistence changes. Execution proof remains a downstream gate, not claimed complete here.
