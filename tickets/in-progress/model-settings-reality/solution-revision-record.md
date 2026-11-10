# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (autobyteus-9 + user's re-check instruction) | N/A | N/A | Approved | BEH-001..012, REQ-001..014, AC-001..013 | Approved by the Solution Designer within the direction; user informed |
| SR-002 | Mixed | Architecture design; user: "if you think it's clear now, then we could start to work on it now" | N/A | Approved (SR-001), no design | Approved (SR-002), design Ready | REQ-007, REQ-008; DEC-013..DEC-015 | design-spec.md written; Large / High |
| SR-003 | Design | ARCH-REV-001 (Fail, Design Impact) | AR-001, AR-002, AR-003, R-3, R-4 | Design Ready (SR-002) | Design Ready (SR-003); requirements unchanged (SR-002) | BEH-012, BEH-008, BEH-002; REQ-013, REQ-008, REQ-002 | derived-consumer list completed; fallback reason kept (DEC-D1); creation trace table; one always-on mode; canonical top-level stored form |

## Revision Entries

### SR-001 — Baseline: truthful Claude settings on both runtimes, declared keys only, docs sync, model lists refresh without restart

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Project Task autobyteus-9 (description and comments), Project Task Manager message 2026-11-10 relaying the user's instruction to re-check every part on the latest origin/personal.
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Approved`; design not yet written
- IDs affected: BEH-001..BEH-012, REQ-001..REQ-014, AC-001..AC-013, SCN-001..SCN-008, DEC-001..DEC-012, QR-001..QR-003
- Scenario-basis changes: N/A (baseline)
- Why recorded: first coherent baseline after investigation on `origin/personal` `310fc2745`.
- Re-check result (user instruction): A/FU-001, B/FU-004, B/FU-005, C/FU-002, D still exist; A/FU-003's reported 400 no longer reproduces through Claude Code 2.1.280/2.1.322, but Off is ineffective on the SDK runtime (PRB-A1), which the requirements address instead (DEC-004, DEC-012).
- Notable departures from the Task's suggestions, with evidence: SDK runtime removes Off instead of "Off does not send a stored effort" (PRB-A1); switch rows default to thinking On (provider default, DEC-002); Part D is a client freshness and messaging fix because the server already reads lists fresh (PRB-D3).
- Canonical sections: all of requirements-doc.md; investigation-notes.md created.
- Supplemental artifacts added: `evidence/probe-results-2026-11-10.md`, `probes/*.mts`.
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval: Solution Designer within the direction (no `Needs user` decision; DEC-002/008/009/010 decided within the user's stated direction and the Task's delegation to the team); user informed in the Solution Designer's conversation, 2026-11-10. Baseline: requirements-doc.md at SR-001.
- Behavior-defining supplements: None
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (no handoff yet)
- Downstream impact: architecture design next
- Remaining gaps: UNK-001 (exact identifiers of the user's incident; mechanism established)
- Next action: architecture investigation and design-spec.md

### SR-002 — Architecture design and design-driven requirement clarifications

- Phase and classification: Mixed (`Refinement` of REQ-007/REQ-008 + design)
- Triggering input: the user, 2026-11-10: "if you think it's clear now, then we could start to work on it now"; architecture investigation (investigation-notes "Architecture Investigation Findings"). Base fast-forwarded to `origin/personal` `fd0eb664c` (the 11 commits since `310fc2745` touch no cited file).
- Triggering finding IDs: N/A
- Prior status: requirements Approved (SR-001); no design
- Current status: requirements Approved (SR-002); design `Ready` ([design-spec.md](design-spec.md))
- IDs affected: REQ-007 (settings in `extra_params` included; standard fields untouched), REQ-008 (external runtimes: keys the runtime reads), DEC-013, DEC-014, DEC-015 added
- Why: the application portable launch contract carries AutoByteus settings in `extra_params` and accepts standard fields; a launch-time catalog read for external runtimes would add ≈2.3 s per Claude launch (QR-003).
- Canonical sections changed: requirements Requirements/Decisions/Document Status; investigation-notes Architecture Investigation Findings; design-spec.md created
- Supplements: none added
- Intended behavior changed: `No` for user-visible behavior; REQ-008's guarantee for external runtimes is stated at runtime-key granularity (DEC-014)
- Approval: Solution Designer within the direction (no `Needs user` decision); the user is informed with the design handoff summary, 2026-11-10
- Post-design classification: `Large` / `High` (design-spec Task Size And Architectural Risk)
- Applied handoff-rule outcome: recorded in [handoff.md](handoff.md)
- Downstream impact: architecture review per the handoff rules
- Remaining gaps: UNK-001 (exact incident identifiers; covered by AC-010/012/013)
- Next action: hand off per rules

### SR-003 — Design revision for ARCH-REV-001

- Phase and classification: Design, `Design Impact`
- Triggering input: architecture review ARCH-REV-001, round 1, `Fail` ([design-review-report.md](design-review-report.md)): AR-001 (blocking), AR-002, AR-003 (low), residual R-3, R-4.
- Prior status: design Ready (SR-002). Current status: design Ready (SR-003); requirements Approved at SR-002, unchanged.
- IDs affected: BEH-012/REQ-013/AC-013 (consumers of the new result kind and catalog throw), BEH-008/REQ-008/AC-008 (creation trace, canonical stored form), BEH-002/REQ-002 (policy mode).
- Changes:
  - AR-001: complete derived-consumer list with a decision per consumer: usability fallback reason kept (`model_unavailable` + precise `detail`, DEC-D1; persisted vocabulary unchanged, Not Affected); `invalidModelMessage`, `refusalOf` and the application capability validator use the wording owner; `runtimeCurrentModelDescriptors` and the application validator behavior changes accepted with tests; cache preloader unaffected.
  - AR-002: DS-003 creation trace table (agent/team/team-from-root-config callers incl. remote inbound delegation and remote team run starter; one projection point each; per-runtime key sets).
  - AR-003: one mode `adaptive_required` for Fable 5, Fable 5.1, Opus 5.5 (measured PRB-A3: explicit adaptive accepted; sampling parameters rejected by the API on all three); FU-001 consistent.
  - R-3: projection writes declared settings in one canonical top-level form (no `extra_params` container), read by the validator and the web editor.
  - R-4: glossary headword "Offered models" only.
- Intended behavior changed: `No` (Fable 5/5.1 now send explicit adaptive thinking, the provider's always-on default; no visible change).
- Approval impact: none (requirements basis SR-002 unchanged).
- Supplements: `evidence/probe-results-2026-11-10.md` PRB-A3 added.
- Classification: unchanged, `Large` / `High`.
- Next action: focused re-review by the architecture reviewer.

#### SR-003 review outcome (recorded 2026-11-10)

- Architecture review ARCH-REV-002 (round 2): `Pass` for SR-003; AR-001..AR-003 resolved, R-3 and R-4 addressed. Report: [design-review-report.md](design-review-report.md); record: [architecture-review-revision-record.md](architecture-review-revision-record.md). The reviewer handed off to `/software_engineering_team/implementation_engineer` with non-blocking guidance IG-1..IG-3. Informational; no Solution Designer handoff repeated.
