# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / `design-spec.md` SR-001 / initial | N/A | `Initial Baseline` | SR-001, SR-002; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implemented; local checks pass |

## Revision Entries

### IR-001 — Daily Assistant becomes an ordinary collaborator; Model Router stays out by its own registry mark

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-delegation-target/tickets/in-progress/daily-assistant-delegation-target/design-spec.md` (SR-001), initial round
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: `collaborationEligible` on each built-in registry entry (Daily Assistant `true`, Model Router `false`); `CollaboratorCandidatePolicy` excludes only ineligible built-ins; the web New-chat mirror is renamed to `utils/collaborators/collaborationIneligibleAgentDefinitionIds.ts` and pinned to the registry flag by its contract spec.
- Related solution revision IDs: SR-001; SR-002 (approval confirmation only, no change)
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: initial implementation baseline
- Approved behavior or requirement IDs affected: REQ-001…REQ-003 (REQ-004 preserved, untouched); BEH-001…BEH-005; AC-001, AC-002 (unit part), AC-004 (unit part), AC-005, AC-006
- Implementation delta: registry field + policy set rename/derivation + comments; web mirror rename and check rename; contract spec now parses the flag; server/web unit tests flipped and extended; two live probes' `@` assertions; three module docs; dead `MEMORY_COMPACTOR_AGENT_DEFINITION_ID` import removed (server test typecheck baseline 1182 → 1181)
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas
- Local validation and result: IMP-01…IMP-06 in `implementation-handoff.md` § Checks Run — all Pass (IMP-01 is the expected-fail reproduction on the base policy)
- Next recipient or routing: `get_handoff_rules` Small/Low → direct API/E2E
- Remaining limitations or risks: RSK-001 (delegated DA copy reporting back) and peer probe on isolated nodes left to API/E2E; live probes edited but not run
