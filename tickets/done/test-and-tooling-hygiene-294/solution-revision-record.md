# Solution Revision Record — test-and-tooling-hygiene-294

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-294 incl. comments to 2026-10-27) | N/A | N/A | Ready for Approval | BEH-001..030, REQ-001..030, AC-001..032 | waits for DEC-018 |
| SR-002 | Requirements | The user's answer, 2026-10-27 | DEC-018, DEC-024, DEC-025 | Ready for Approval | Approved | withdrawn REQ-008, 013, 015, 020, 028; new BEH-031/REQ-031/AC-033; REQ-004, REQ-007 narrowed | approved by the user |
| SR-003 | Design | Architecture design on the SR-002 basis | N/A | N/A (no design) | Design Ready | REQ-001..007, 009..012, 014, 016..019, 021..027, 029..031 | `design-spec.md`; Large / High |
| SR-004 | Mixed | The user's clarification of DEC-025, 2026-10-27 | DEC-025 | Approved / Design Ready | Approved / Design Ready | REQ-031, H-31 | wording refined; scope unchanged |
| SR-005 | Mixed | ARCH-REV-001 (Fail) | AR-001, AR-002, AR-003, R-1..R-5 | Approved / Design Ready | Approved / Design Ready | BEH-032, REQ-032, AC-034; REQ-007 design | four bug fixes proposed; design revised |
| SR-006 | Design | ARCH-REV-002 (Pass) R-6 | R-6 | Design Ready | Design Ready | BEH-032, REQ-032 | design sections aligned with § Group C; no decision changed |

## Revision Entries

### SR-001 — Requirements baseline for the merged hygiene ticket

- Phase and classification: `Initial Baseline`
- Triggering input: Task `autobyteus-294` (description and ten comments), PM messages of 2026-10-26 and 2026-10-27.
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Ready for Approval`; design not started.
- IDs affected: BEH-001..030, REQ-001..030, AC-001..032, SCN-001..005, DEC-001..023.
- Scenario-basis changes: SCN-005 (DLC-008's released-shape restore) classified Technically Possible but Unsupported/Contrived.
- Why recorded: first coherent baseline, presented to the user with DEC-018.
- Canonical sections changed: all (new).
- Supplements: none; evidence under `evidence/`.
- Product design: N/A.
- Intended behavior changed: N/A (baseline).
- Approval impact: pending; the user is asked DEC-018; DEC-001..017 and DEC-019..023 decided by the Solution Designer within the direction.
- Behavior-defining supplement versions: none.
- Design/review basis: N/A.
- Post-design classification: N/A.
- Applied handoff-rule outcome: N/A.
- Downstream impact: N/A.
- Base: rebased at the user's request (2026-10-27) to `origin/personal` `2f48d85d4d`; base-sensitive items re-measured there (investigation notes, Meta), figures updated (105 production / 271 test-file type errors). No requirement changed.
- Remaining gaps: DEC-018; U-1, U-2 (investigation notes).
- Next action: the user's answer to DEC-018, then approval and architecture design.

### SR-002 — The user's scope decision and approval

- Phase and classification: `Refinement` (scope reduced, one requirement added)
- Triggering input: the user's message, 2026-10-27 ("Okay, go ahead … still worth fixing … Regarding the live compaction … we don't have to test that … if it's unit test, then it's possible, but if it's a real test, it will fail … maybe you can write that into the testing MD … maybe that's a global thing"), answering the Solution Designer's question whether the ticket is worth doing and its proposal to drop the optional items and leave Rule 9 out.
- Triggering finding IDs: DEC-018 (resolved: left out), DEC-024, DEC-025 (new).
- Prior status: Ready for Approval. Current status: requirements `Approved`; design starts.
- IDs affected: withdrawn BEH-008/013/015/021/029, REQ-008/013/015/020/028, AC-010/015/017/022/030, SCN-004, DEC-007 (narrowed), DEC-017/019/023; new BEH-031, REQ-031, AC-033, DEC-024, DEC-025; REQ-004 and AC-004 (unit tests only, no live compaction run), REQ-007 (Vue 3 import in generated code).
- Scenario-basis changes: SCN-004 withdrawn.
- Canonical sections changed: Document Status, behaviour table, Out Of Scope, Requirements, Acceptance Criteria, Decisions, Traceability, Readiness; `follow-ups.md` FU-005..FU-008.
- Intended behavior changed: `Yes` (scope reduced; TESTING.md rule added).
- Approval: `User`, the message above; baseline `requirements-doc.md` at SR-002.
- Downstream impact: architecture design on this basis.
- Remaining gaps: none for requirements.
- Next action: architecture design.

### SR-003 — Architecture design

- Phase and classification: `Design` (initial design on the approved basis)
- Trigger: requirements approved at SR-002.
- Prior status: no design. Current status: `design-spec.md` `Ready`.
- IDs affected: every in-scope REQ (work items H-01..H-31, groups A-F).
- Canonical sections changed: `design-spec.md` (new); investigation notes § Architecture Investigation Findings.
- Intended behavior changed: `No`.
- Approval impact: none; the SR-002 approval covers this design's basis.
- Classification: `task_size` Large, `architectural_risk` High (deployment pipeline gate, dependency declarations, blast radius of production type fixes).
- Applied handoff-rule outcome: see `handoff-architecture-design-complete.md`.
- Remaining gaps: none.
- Next action: route by the handoff rules.

### SR-004 — The user's clarification of the live-compaction rule

- Phase and classification: `Refinement` (wording of an approved requirement, by the user)
- Trigger: the user, 2026-10-27: tests that rely on a real API key and a large input (compaction needs enough input to trigger) cannot be reliably tested; end-to-end tests that do not rely on a key or a huge input can still be tested.
- IDs affected: REQ-031, DEC-025, design H-31 text. Scope, other REQs and the classification unchanged; H-26's single Codex run (small input, signed-in CLI) stays.
- Approval: the user's own words (above).
- Downstream impact: the architecture reviewer is told of the H-31 wording change; nothing else changes in the reviewed basis.
- Next action: architecture review continues.

### SR-005 — Architecture review ARCH-REV-001

- Phase and classification: `Requirement Gap` (AR-001) + `Design Impact` (AR-002, AR-003); recommendations R-1..R-5.
- Trigger: `design-review-report.md` ARCH-REV-001 (Fail), 2026-10-27.
- Solution Designer's triage of all 105 production type errors (SD-18; design-spec § Group C table): 2 outside the final scope (server fixture reached only through an excluded spec), 13 dead code (four components, the audio-recorder chain rendered nowhere, the overridden `nuxt.config.ts` `ignore`), 1 codegen setting, 8 behind four live bugs (BEH-032 a-d), 81 type-only. The reviewer's "not yet established" files (NotificationRow, MonacoEditor, `useProviderApiKeySectionRuntime`, `nuxt.config.ts`) are type-only or dead; `MobileTeamMessages` is a live bug (c); `transcriptionStore` is dead, not live.
- Requirements: BEH-032, REQ-032, AC-034, DEC-026 (Needs user); Non-Goals and Preserved Behavior Boundary updated; status Ready for Approval for REQ-032 only.
- Design: per-file disposition table and the restated escalation trigger (AR-002); the checker fails on unattributed diagnostics, compiler failure without diagnostics, signals, start failures, with `--pretty false` (AR-003); R-1 scope through `nuxt.config.ts` `typescript.tsConfig.exclude` (no separate web typecheck tsconfig); R-2 `vite`/`vue-bundle-renderer` declared; R-3 `beforeAll`; R-4 owner wording; R-5 TESTING.md note. Removal Plan and Files updated.
- Classification: unchanged (Large / High).
- Approval: REQ-032 approved by the user ("yesss go ahead", 2026-10-27, answering "Shall I fix these four bugs here?"); SR-002/SR-004 approvals unchanged.
- Applied handoff-rule outcome: revised package to `/software_engineering_team/architecture_reviewer` (Large / High), `handoff-architecture-design-complete.md` round 2.
- Next action: architecture review round 2.

### SR-006 — Architecture review ARCH-REV-002 (Pass) and R-6 alignment

- Phase and classification: `Evidence-only clarification` (editorial alignment of the design with its own § Group C).
- Trigger: `design-review-report.md` ARCH-REV-002, Pass, 2026-10-27; R-6 non-blocking; the reviewer handed the package to `/software_engineering_team/implementation_engineer` and told it § Group C governs.
- Changed: design-spec § Task Size (escalation trigger without "or follow-up"), Change Scope (BEH-032, audio-recorder chain, `nuxt.config.ts`), the behaviour map (BEH-032 row), the health-assessment posture, the change sequence. No decision, requirement or classification changed.
- Approval impact: none. Routing: none (the review Pass is informational; the reviewer made the implementation handoff).
- Next action: implementation (by the implementation engineer).
