# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `solution-designer-handoff.md`, initial | N/A | `Initial Baseline` | SR-001 | Six items implemented in per-item commits; checks pass; ready for direct API/E2E |
| IR-002 | Code Reviewer, `code-review-report.md` CRR-001 (failure-origin of API-REV-001 API-12) | FO-001, FO-002 | `Local Fix` | SR-001, CRR-001, API-REV-001 | Fixed with a census; third web site and server issue texts named; checks rerun |

## Revision Entries

### IR-001: web UI cleanup round (icons, runtime names, Waiting, literal paths, Depends-on Enter, Memory voice search)

- Triggering role, report path, and round: Solution Designer, `solution-designer-handoff.md`, initial
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: commits `4d0ce7095a`, `2b53fd8ad3`, `51a0aec3ac`, `a3dbfcb495`, `52225e1468`, `f9c1a8d5e3`, `cba9eca3ef`, `3e7be8bc10`; checks IMP-00…IMP-09
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: initial implementation handoff
- Approved behavior or requirement IDs affected: BEH-001…007; REQ-001…005, 007…009; AC-001…007, 009…012 (AC-008 is the Product Team's)
- Implementation delta: see the handoff's Current Implementation Summary. The handoff's self-review lists everything beyond the design's named callers: readiness reasons, journal header, materializer label, system-instruction labels, Token Statistics maps, the empty-kind default in the New chat hint, neutral voice-status wording, and the submenu indent.
- Changed files or areas: web (icons, names, embedding card, picker, voice), server (names, notice builder), contract package (names), `GLOSSARY.md`, `autobyteus-web/docs/settings.md`, tests and probes
- Local validation and result: see the handoff's Checks Run
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E for Medium + Low)
- Remaining limitations or risks: AC-011 with the voice extension enabled and the in-app look at the remaining group B pages are API/E2E's; R-01 longer names wrap in the Agent Runtimes table

### IR-002: runtime names where runtime kinds were still shown (CRR-001 Local Fix)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-001), after API/E2E `api-e2e-execution-coverage-report.md` (API-REV-001, API-12)
- Triggering finding IDs: FO-001, FO-002
- Classification: `Local Fix`
- Prior authoritative result: IR-001 (`b34c2a36ea`)
- Current authoritative result: commit `1a4bfd2ae9`; IMP-10…IMP-12
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Why this implementation revision is recorded: FO-001/FO-002 Local Fix, plus the census the reviewer asked for
- Approved behavior or requirement IDs affected: BEH-003; REQ-003; AC-003, AC-004, AC-005
- Implementation delta: these now use `agentRuntimeName`:
  - the launch-authority summary (FO-001);
  - the agent detail "Default runtime" (FO-002);
  - the token-usage meter Runtime row (census);
  - six server texts users see that named a known runtime by its kind (Application launch-setup issues, launch-usability fallbacks).
  Two unit expectations left from item 2 are corrected.
- Changed files or areas: `ApplicationExecutionResourceSlotEditor.vue`, `AgentDefinitionDetailSections.vue`, `TokenUsageMeterPanel.vue`, `application-launch-host-capability-validator.ts`, `launch-usability-check.ts`, and their tests
- Local validation and result: IMP-10 (new tests fail on base), IMP-11 (server typecheck + full unit suite), IMP-12 (full web suite + guards)
- Classification recheck: `Medium` / `Low`, unchanged
- Next recipient or routing: direct API/E2E (`get_handoff_rules`: Medium/Low Local Fix)
- Remaining limitations or risks: FU-002 (other identifiers in the summary) is outside this ticket
