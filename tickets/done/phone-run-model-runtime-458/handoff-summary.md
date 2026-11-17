# Handoff Summary — phone-run-model-runtime-458 (autobyteus-458, with autobyteus-506's build items)

## What Ships

- The phone conversation's own readable layout (12 px margins, 17 px / 1.5 type at Standard, a name and avatar once per turn); another agent's message as on the desktop (the founder's SR-004).
- **Text size** in the ⋮ menu (15 / 17 / 19 / 21 px), kept on the phone.
- **Settings** in the ⋮ menu: a stopped run's runtime and model, Save through the node's stopped-run update; a refused Save's message; a live run's one-tap stop (a Team or Org member stops its Team or Org), the phone staying on Settings.
- The composer's rounded lower corners (desktop and phone).
- The shared stop (agent and Team) reports success when the node stopped the run (REQ-011), on the desktop and the phone.

## Classification

- `task_size` `Medium`, `architectural_risk` `Low`, route `Direct` (CRR-001 failure-origin: CR-001 Local Fix; API-REV-002 Pass 94%; CRR-002 Pass; after delivery's DR-001 block: API-REV-003 Pass 94%, test-only renumber, test review not required on the direct route).

## Integrated State

- Merged `origin/personal` `e16f0b0d55` (autobyteus-448 part 1, autobyteus-483) as `15c1fa5b56`; this ticket's MSP-59 renumbered MSP-66 (`7a1eca6dcd`); the full phone probe 66/66 on the merged state; localization checks, typecheck and the web suite at baseline.

## Verification

- From the evidence: AC-001…AC-009 proven, nothing left for the user.

## Residual Risks And Follow-ups

- The 94% reflects host load (an Antigravity discovery timeout in the first full probe run, rerun clean) and base-side flaky checks: FU-002 (`menus-open-upward` U03 at 1024×440) and FU-003 (intermittent MSP-41), both failing on the base too.
- `follow-ups.md` FU-001…FU-003, for the Solution Designer.

## Release

- No release: none requested. Release notes are ready.
