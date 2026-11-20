# Handoff: Architecture Design Complete → Architecture Review

- Package: `semantic-memory-for-every-agent` (Project Task autobyteus-554)
- From: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`)
- Requested by: `/project_task_manager`, for the founder
- Date: 2026-11-19
- Result: `Architecture Design Complete`, `task_size=Large`, `architectural_risk=High`, SR-001
- Route: handoff rule "Large or High → `/architecture_reviewer`"

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent`
- Branch: `codex/semantic-memory-for-every-agent`, from `origin/personal` at `8430d9ef12`
- The ticket documents are uncommitted.
- Finalization target: `origin/personal`.

## Request

The founder's request (2026-11-19):
- semantic memory is on for every agent, and the switch and every check of it go;
- the Memory area gets a read-only view of each agent's semantic folder.

The requirements are approved within his direction; the user was informed (DEC-001…007).

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md` (FU-001).

## Points for the reviewer

1. One gate (`AgentSemanticMemory`) becomes unconditional. Every runtime already threads the path (INV-2).
2. Clean-cut removal of the field, including a GraphQL contract change under rule 9. Stored keys are handled by the existing tolerant readers; the config writer's retired-key drop list keeps the key name.
3. A new read-only listing service, confined to the folder: `lstat`, no links followed, bounded. File content comes from the existing node-file loader.
4. The Memory page gets a new `semantic` tab and a link from an agent's runs page.

## Delivery gates

- Release only on the founder's word.
- No change to his data is planned.

---

## SR-002 resubmission (2026-11-19)

- AR-001 (Requirement Gap): resolved within the direction, by applying the existing autobyteus-308 rule.
  - REQ-006: the tab hides internal agents while "Show internal agents" is off.
  - New AC-008.
  - DEC-008.
  - `listFolders()` filters by `InternalAgentVisibility.hiddenDefinitionIds()`, received like the explorer service receives it; `listFiles(id)` is unfiltered, because opening by id is exempt.
- AR-002 (Design Impact): Option A.
  - Link rows are listed (from `lstat`) but not openable; only `kind: "file"` calls `loadNodeFile`.
  - REQ-007 and AC-006 now test selecting a link row; the example shows one.
  - DEC-009.
- N-2: noted in Guidance.

---

## SR-007 resubmission (2026-11-20): the approved UI integrated

- Result: `Architecture Design Complete`, `Large` / `High`.
- What happened since ARCH-REV-002:
  - SR-003: the UI went to the Product Team and the implementation was paused (uncommitted `wip-uncommitted.patch`).
  - SR-004: a read-only Skills-style folder view; a node-side read-only refusal; links not followed.
  - SR-005: the Memory page follows the owner hierarchy.
  - SR-006: autobyteus-555 merged in (one node-wide global semantic folder, the prompt section, the Global tab).
  - SR-007: the founder approved the UI ("Approved", 2026-11-20); the UI/UX spec is normative.
- Read in order: design-spec "SR-007 Revision", "SR-006 Revision", "SR-004 Revision". They govern over the SR-002 sections you reviewed. The SR-002 parts that still stand: the gate (DS-001), the field removal, tolerant readers, the internal-agent rule, links not opened.
- UI/UX spec: /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/semantic-memory-view-554/ui-ux-spec.md

---

## SR-008 resubmission (2026-11-20): consolidated design (ARCH-REV-003)

- `design-spec.md` is now one current design (AR-003), and the overlays are gone.
- DS-003 has a decision for each workspace-id caller (AR-004, AR-005 d).
- AR-006: the local source uses the episodic catalog's read API; imported sources use one discovery per request (AC-012 measures it).
- Requirements: REQ-007 is extended; AC-008 is corrected; AC-011 and AC-012 are new; the DEC statuses are fixed.

---

## SR-009 resubmission (2026-11-20): over-long definition folder names (CRR-003 CR-002)

- New design-spec section "Definition Folder Names And Preparation Failures":
  - one name rule (DEC-016) for the semantic folder, the episodic catalog folder and the `semantic_ws_` lookup;
  - preparation contained per folder, so the run starts without that section and logs (DEC-015);
  - no migration;
  - pinning tests.
- Requirements: REQ-001 and REQ-010 are reworded; AC-013 and AC-014 are new.
- Evidence: code-review-report CRR-003; `evidence/API-10d-re05-launch-error.log`.
