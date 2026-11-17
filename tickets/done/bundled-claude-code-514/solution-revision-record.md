# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-514 (investigation first) | N/A | N/A | Ready for Approval | DEC-001; REQ-001..REQ-003 (A+ only) | Recommendation A+ held for the founder |
| SR-002 | Mixed | Founder chooses A+ | N/A | Ready for Approval | Approved; design Ready | DEC-001, REQ-002, AC-001 | Design for removing the bundled binaries from packaged builds |

## Revision Entries

### SR-001 — Investigation and recommendation

- Phase and classification: `Initial Baseline`
- Trigger: Task autobyteus-514 and the founder's comment "I'm not sure whether it's worth doing it".
- Evidence: `investigation-notes.md`, `evidence/probes-2026-11-17.md` (P1–P9).
- Current status: requirements `Ready for Approval`; design not started.
- Intended behavior changed: N/A (baseline).
- Approval impact: DEC-001 needs the user; asked in the Solution Designer's conversation on 2026-11-17.
- Downstream impact: none until the founder decides.
- Next action: record the founder's choice; then design (A+: small packaging change) or rewrite the requirements for B/C.

### SR-002 — The founder chooses A+; design

- Phase and classification: `Mixed` (approval, then design)
- Trigger: the user's answers in the Solution Designer's conversation, 2026-11-17: asked whether dropping the bundled copy is doable ("If it's doable, then that's great."), then "then lets go it agreed".
- Prior status: requirements `Ready for Approval` (SR-001).
- Current status: requirements `Approved` (option A+); design `Ready` (`design-spec.md`).
- Affected IDs: DEC-001 decided; REQ-002 and AC-001 sharpened (SDK package stays; Windows layout; build-only release run).
- Intended behavior changed: No (A+ was the recommended option presented at SR-001; wording only made precise).
- Approval: User, 2026-11-17, option A+.
- Classification: `Small` / `Low` (design-spec.md).
- Next action: hand off per the rules.
