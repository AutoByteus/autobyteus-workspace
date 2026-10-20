# Solution Revision Record: remove-skill-improvement

| Revision ID | Phase | Trigger | Prior | Current | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-205 (the user's decision 2026-10-20) | N/A | Ready for Approval | BEH-001..005, REQ-001..006, AC-001..005, DEC-001..004 | DEC-001 (old data) put to the user |
| SR-002 | Requirements | The user's answer on DEC-001 and his Work Journal question | Ready for Approval | Approved | DEC-001, DEC-005, BEH-005, UC-003, REQ-004..006, AC-003, AC-004; release notes | Old data removed once (C); Work Journal kept |
| SR-003 | Mixed (Evidence + Design) | Architecture investigation | Approved; no design | Approved; design Ready | REQ-005, AC-004, release notes | Self-evolution leftovers and a third key added within DEC-001; design Ready, Large / High |

### SR-001: requirements baseline

- Trigger: Project Task autobyteus-205 from `/project_task_manager`.
- Findings:
  - the feature is a leaf;
  - the direct-message grants and the `server_helper` launch purpose are used only by it, so both are removed with it;
  - the user's data: 4 records, the helper agent, 3 helper runs, 2 `.env` keys.
- Decisions: DEC-002..004 decided within the direction. DEC-001 (what to do with old data) is `Needs user`, recommended A (leave everything).
- Follow-up recorded: FU-001.
- Next action: the user's answer on DEC-001, then design.

### SR-002: approval

- The user, 2026-10-20: "regarding the old data for self-improvements, let's just remove them … it was really bad user experience". DEC-001 = C: remove the records, both settings keys, the helper agent definition and its runs, on every install, at the first start. The user backs up first.
- The user asked whether Skill Improvement introduced the "work nodes" (the Work Journal). Answered: it was built for the memory program, with Skill Improvement as its first reader. Kept (DEC-005, within the direction; the user was told he can ask for its removal as a separate Task).
- Changed: requirements DEC-001, DEC-005, BEH-005, UC-003, REQ-004..006, AC-003, AC-004; the release notes rewritten (backup first; what is deleted; no going back without the backup).
- Approval: DEC-001 by the user; the rest within the direction, with the user informed.
- Next action: architecture design (the migration conventions check is mandatory).

### SR-003: architecture design

- Evidence (A-01..A-09):
  - the same feature under its earlier name "self evolution" left a root folder (40 KB), 4 per-run evolver sessions and the `ENABLE_SELF_EVOLUTION` key;
  - 3 per-run improver sessions exist;
  - an existing `retiredSettingNames` policy removes settings from `.env`;
  - run deletion = history row + folder;
  - precedents for built-in and memory-walk removals.
- Requirements: REQ-005 extended with the self-evolution leftovers and the third key. This is evidence inside DEC-001's "remove the old data of this feature". The user is informed. The Skill Self-Evolver definition is kept as the Task says.
- Design:
  - D-2: grants removed;
  - D-3: `launchPurpose` removed;
  - D-5: settings retired through the policy;
  - migration `20261020_remove_skill_improvement_data` (M1..M6, M5 ordering guard);
  - guideline checklist and shape → fixture inventory.
- Classification: Large / High (a deletion migration, GraphQL removal, the `send_message_to` path).
- Next action: handoff per the rules.
