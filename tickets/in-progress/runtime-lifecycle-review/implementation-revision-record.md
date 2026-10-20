# Implementation Revision Record — runtime-lifecycle-review

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, ARCH-REV-002 Pass (+ ARCH-REV-003 Pass for SR-011) | N/A (AR-008 implementation note applied) | `Initial Baseline` | SR-010, SR-011, ARCH-REV-002, ARCH-REV-003 | Implemented; to code review |

## Revision Entries

### IR-001 — Agent Runtimes page: server capability, readiness refactor, application count, GraphQL, Settings section

- Triggering role, report path, and round: architecture reviewer (run `architecture_reviewer_7ebca9c9153f477cb5a5c6cd16d04a85`), `design-review-report.md` ARCH-REV-002 Pass of SR-010; then ARCH-REV-003 Pass of the SR-011 delta (Application agents in the running-agent count), which came from this implementation's Design Impact question to the Solution Designer.
- Triggering finding IDs: N/A. Reviewer implementation notes applied: Codex `requiresOpenaiAuth !== true` rule kept; Claude non-JSON "logged in" fallback kept; `SignInReading.detail` and vendor status output never reach GraphQL or logs; AR-008 (narrow kernel reader, Team members counted).
- Classification: Initial Baseline.
- Prior authoritative result: N/A.
- Current authoritative result: implemented and implementation-checked at `8a2db203dc`; ready for code review.
- Related solution revision IDs: SR-010, SR-011.
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation of the reviewed package.
- Approved behavior or requirement IDs affected: BEH-001…BEH-006; REQ-001…REQ-008 (REQ-009 not adopted); AC-001…AC-011 (AC-008 removed).
- Implementation delta: see `implementation-handoff.md` "Reviewed Behavior Implementation Trace" and "Key Files Or Areas".
- Changed files or areas: server `runtime-management/agent-runtimes/` (new), `api/graphql/types/agent-runtimes.ts` (new) + `schema.ts`, `compositions/agent-runtime-status-composition.ts` (new) + `build-studio-server.ts`, `application-platform/` (adapter, orchestration wiring, execution scope + kernel reader, host-management contract and binding); web `components/settings/agent-runtimes/`, `composables/settings/useAgentRuntimes.ts`, GraphQL documents, `types/agentRuntimes.ts`, `pages/settings.vue`, en/zh-CN catalogs; tests beside each.
- Local validation and result: IMP-01…IMP-10 in the handoff's Checks Run. All pass except one baseline architecture-guard case (IMP-05, FU-005), which this change does not cause.
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Large/High).
- Remaining limitations or risks: handoff "Known Risks".
