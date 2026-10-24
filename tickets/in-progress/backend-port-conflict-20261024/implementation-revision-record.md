# Implementation Revision Record

## Revision Index
| Revision | Trigger | Findings | Classification | Related revisions | Result |
| --- | --- | --- | --- | --- | --- |
| IR-003 | Code Reviewer CRR-001 Fail | CR-001/002 Local Fix | Large/High | SR-001..006; ARCH-REV-003; CRR-001; API-REV/DR N/A | Ready for source re-review; scoped validation passes |
| IR-002 | Architecture Reviewer ARCH-REV-003 / D3.1; SR-006 evidence | IMP-DI-001 resolved upstream; no new design gap | Large/High | SR-001..006; ARCH-REV-003; CRR/API-REV/DR N/A | Ready for Code Review; overall acceptance outstanding |
| IR-001 | Architecture Reviewer ARCH-REV-002 Pass / D2 implementation handoff | Incoming N/A; new IMP-DI-001 | Design Impact | SR-001..003; ARCH-REV-002; CRR/API-REV/DR N/A | Ownership-continuity design recovery required; no production changes |

## IR-001 — Native survivor ownership continuity
- Prior authoritative result: N/A (initial implementation baseline).
- Triggering role/report/round: Architecture Reviewer, `design-review-report.md`, round 2 / ARCH-REV-002 Pass; incoming findings N/A.
- Current authoritative result: Design Impact IMP-DI-001, described fully in `implementation-handoff.md`.
- Related solution revisions SR-001/SR-002/SR-003; architecture revision ARCH-REV-002. Code review/API/E2E/delivery revisions N/A.
- Reason: actual resolver/spawn observation can capture leader before child creation, then child only after leader exit. D2 requires live identity continuity and forbids rediscovered numeric-group authority but does not specify a mechanism preserving it across this supported command/adoption transition.
- Affected: BEH-003/004, REQ-003/004, AC-004/005; R1 unchanged. Classification Large/High unchanged.
- Delta: ticket-only feasibility probes, raw logs, handoff/revision record. No production implementation, no compatibility path, no widened scope.
- Validation: IMP-01 initial first-snapshot hypothesis failed and retained; corrected IMP-02 demonstrates non-overlapping observations in 10/10 cases and actual executor adoption; IMP-03 reconfirms P-005 baseline false stop success. These are not acceptance passes. Exact fixture processes/root cleanup completed.
- Next route: returned Design Impact rule -> `/software_engineering_team/solution_designer`; no duplicate reviewer/source-review forwarding.
- Remaining limitations: no package build, changed server/desktop execution, frontend inspection or Windows/WSL runtime validation. All implementation remains pending concrete design recovery.

## IR-002 — D3.1 retained-anchor implementation and scoped validation
- Prior result: Design Impact IR-001 / IMP-DI-001. Trigger: Architecture Reviewer ARCH-REV-003 Pass, D3.1, SR-004/005 resolves continuous native ownership and forced completion settlement. SR-006 adds Codex conversation evidence/limits without changing approved design. CRR/API-REV/DR N/A.
- Current result: Ready for Code Review; not overall acceptance. Large/High unchanged. BEH-001..004 / REQ-001..006.
- Actual delta: f34ad8749 initial production implementation; f247bf6f6 unconfirmed WSL/flush fixes; a4bcde070 startup-finally barrier; 1ad504c03 clipped observation deadlines; e3ef32cc2 expired backend wait; 54bd74c83 readiness/result ordering; 9047d0af5 control-error vs exit; 241041c00 empty observation/known-anchor-exit guards;10990feb1 post-preflight bind-race diagnosis after captured exit, preserving non-conflict fatal detail and stale-generation rejection. Full current trace is in implementation-handoff.md.
- Native short-lived survivors now have a retained gate-created group anchor before user code. Scope belongs to host, not agent output record; both commands share it. Studio/standalone, Windows backend wire, awaited desktop/update preparation and typed safe conflict UI implemented; old in-scope paths removed.
- Final IMP-13..18 checks at10990feb1:132 native/core,141 Electron,209 server,11 component tests pass; production typechecks pass. IMP-19 current package build passes. IMP-20 actual English/Chinese desktop conflict/retry/recovery, sentinel/no-active-work quit/unrelated survival and cleanup receipts recorded; limitations explicitly retained. No Codex lifecycle source change; native results do not close reported Codex-origin coverage. Full host/desktop conversation evidence remains downstream; no broader acceptance/release/install/integration claimed.

## IR-003 — stop/retirement serialization and capture lifetime
- Prior result: IR-002 Ready for Code Review, challenged by CRR-001 Fail / CR-001 and CR-002. Trigger report `code-review-report.md`, history `code-review-revision-record.md`, reviewer evidence CR-01, commitffac4611d.
- Current result: Ready for source re-review; local corrections and scoped revalidation complete. Large/High unchanged; design/requirements valid, no new authority or intended-behavior change. Related SR-001..006, ARCH-REV-003, CRR-001; API-REV/DR N/A.
- Production d0338db0b: scope operation-kind discrimination, original-deadline retirement→drain sequencing and identity-safe operation removal; manager capture/listener release without consumers; executor/background-start finally release unrecorded captures. Preserves background history/output, ordinary agent lifetimes and host ownership.
- BEH-003/004, REQ-003/004/005, AC-004/005 affected. No compatibility fallback, new provider policy, user-data mutation or release/install.
- Eight new durable regressions pass; unchanged reviewer probe reproduced2 failures before fix then2 passes after. Current total501 durable scoped tests, production typechecks and current task-local desktop rebuild pass (IMP-22..32). Shared-foundation rerun plan and exact final evidence in implementation-check-ledger.md. Source review must independently confirm resolution; active-work/full-host/desktop Codex coverage remains outstanding.
