# Handoff — phone-text-size-three-steps-534 (autobyteus-534)

- Classification: `Architecture Design Complete`, `task_size=Small`, `architectural_risk=Low` → direct implementation.
- Package: `phone-text-size-three-steps-534`; SR-001.
- Task: autobyteus-534 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), follow-up of autobyteus-525; requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-three-steps-534`, branch `codex/phone-text-size-three-steps-534`, base `origin/personal` @ `bd2053ee51` (contains 525, released in `v1.5.13-beta.10`); finalization target `origin/personal`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-three-steps-534/tickets/in-progress/phone-text-size-three-steps-534/`

## Request (the founder, 2026-11-18, via the PM)

(1) The smallest text size is way too small; remove it; the second one is the default and the smallest. (2) "On this phone" above "Text size" is redundant: show only the "Text size" header and then the sizes. Saved Small must not break (→ Standard silently). Check every phone screen at the three steps. Desktop untouched. Release only on his word (next beta).

## Approval

Solution Designer within the direction; user informed 2026-11-18. Decisions: DEC-001 (saved Small read as Standard by the existing reader, no explicit mapping, storage untouched), DEC-002 ("Text size" becomes the menu's visible header; "On this phone" only as the menu's invisible accessible name), DEC-003 (letters 16/19/22 px, three columns).

## Build

`design-spec.md` "File Responsibility Mapping": `phoneTextSizeSteps.ts`, `MobileOnThisPhoneMenu.vue`, en/zh-CN `mobileOnThisPhone.ts`, their tests, probe MSP-60. Store, CSS, screens, desktop unchanged.

## Verification expected

Unit (three steps; saved `small` → Standard, root 100 %, no throw, other key and stored value untouched; menu without "On this phone", header "Text size", three buttons); phone bundle probe MSP-60 (rewritten) and MSP-74; screenshots of the open control and the run list at Standard, Large, Largest; a start with `small` saved.

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`.

## Route record

`get_handoff_rules` 2026-11-18: Small/Medium + Low → `/implementation_engineer`.

## SR-002 (2026-11-18) — Settings last in the run's ⋮

- The founder asked directly (with a screenshot): in the run's ⋮ menu, Settings goes to the bottom, below VNC Viewer. Approved by the founder's own words.
- Build: `design-spec.md` "Run Menu Order (SR-002)": `MobileRunMenu.vue` appends Settings last; tests and probe expectations with VNC Viewer updated.
- IR-001 (`d4a14666a4`) stays; add this change on top. The API/E2E round started on IR-001 should cover SR-001 and SR-002 together after this implementation round.
- Route: Small + Low → `/implementation_engineer`.
