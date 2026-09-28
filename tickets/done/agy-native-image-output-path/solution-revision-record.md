# Solution Revision Record — agy-native-image-output-path

## SR-001 — Investigation and draft requirements (2026-09-28)
- Trigger: User report + two screenshots (Daily Assistant, AGY CLI, Gemini 3.8 Flash High; tool card `output: null` while the reply states the path); request to experiment.
- Prior result/status: N/A (new package). Related historical authority: `tickets/done/agy-runtime-image-codex-prep-20260926` REQ-002/AC-002 (E-055).
- Current status: Requirements Draft, awaiting approval (DEC-001, DEC-002). No design yet.
- Affected IDs: BEH-001/002, REQ-001..004, AC-001..004, SCN-001/002.
- Evidence: E-001..E-008 including native AGY 1.2.12 probes; key discovery `brain/<conv>/.system_generated/steps/<step_index>/output.txt`.
- Approval impact: Reverses a prior approved exclusion; explicit user approval required.
- Design/review/routing impact: None yet; no handoff during approval hold.

## SR-002 — Reliability evidence after user direction (2026-09-28)
- Trigger: User questioned the hack cost, then directed: bounded read is wanted if conversation lookup is direct, code change small and reliability good ("I think it's worth it").
- Prior status: SR-001 Draft. Current: Draft, reliability evidence added; awaiting explicit approval of REQ-001..003 and DEC-001/002.
- Evidence: E-009 (direct conversation id), E-010 (historical scan), E-011/E-012 (production-mode multi-turn, parallel and resume probes).
- Approval impact: none recorded yet. Design/routing: none.

## SR-003 — Approval and architecture design (2026-09-28)
- Trigger: User "Okay, then go ahead. If you think that we can use the design principles to have a good design."
- Prior status: SR-002 Draft. Current: Requirements **Approved**; **Architecture Design Complete**; `task_size=Small`, `architectural_risk=High` (undocumented provider-storage dependency; newly servable `~/.gemini` file via existing content route).
- Affected: REQ-001..004, AC-001..004, DEC-001 (B by parity), DEC-002 (show args); DS-001/DS-002.
- Sections: requirements status/decisions; investigation E-013..E-016; new `design-spec.md`.
- Approval basis: explicit go-ahead; DEC choices delegated to design, recorded transparently for user override. Supersedes prior ticket `agy-runtime-image-codex-prep-20260926` REQ-002 exclusion of brain lookup/path, for the single-step-file mechanism only (no transcript/copy/turn gating).
- Routing: per handoff rules. Remaining gaps: live e2e on real AGY after implementation; future AGY layout drift (fallback + warning).

## SR-004 — ARCH-REV-001 alignment (2026-09-28)
- Trigger: Architecture Reviewer ARCH-REV-001 Fail — Design Impact: ARCH-001 (design omitted output text required by REQ-001/BEH-001), ARCH-002 (stale status text); residual note: reader must never throw.
- Prior status: SR-003 Architecture Design Complete. Current: **revised Architecture Design Complete**, `task_size=Small`, `architectural_risk=High` (unchanged).
- Resolution: ARCH-001 option (a) — resolved result carries `output` (bounded AGY output text) plus `file_path`; reader resolution returns `outputText`; example, narrative, tests, e2e updated. Never-throw: reader wraps all fs calls (`READ_FAILED`), converter guards the resolver (`RESOLVER_FAILED`) with a throwing-resolver test. ARCH-002: requirements status/round, DEC-001/002 marked resolved, AC-004 made concrete, REQ-005/AC-005 restate approved DEC-002/REQ-001 text; investigation assumption marked verified by E-014.
- Approval impact: None — design aligned to already-approved REQ-001; no intended-behavior change.
- Routing: re-review by independent architecture reviewer (High risk). Remaining gaps unchanged.
- Review outcome (informational, recorded 2026-09-28): ARCH-REV-002 **Pass** on SR-004 basis (`design-review-report.md`, `architecture-review-revision-record.md`); reviewer delivered the implementation handoff to `/implementation_engineer`. No Solution Designer forwarding.
