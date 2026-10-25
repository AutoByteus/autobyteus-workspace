# Implementation Revision Record — autobyteus-303

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md` ARCH-REV-003 Pass (SR-003), updated by ARCH-REV-005 Pass (SR-005) during implementation | N/A | `Initial Baseline` | SR-003, SR-005; ARCH-REV-003, ARCH-REV-005; CRR N/A; API-REV N/A; DR N/A | Implemented; code commit `5135bb73dc`; routed to code review (Large / High) |

## Revision Entries

### IR-001 — Initial implementation: tool, service, readers, page

- Triggering role, report path, and round: Architecture reviewer, `tickets/in-progress/available-agent-runtimes-tool/design-review-report.md`, ARCH-REV-003 (Pass on SR-003); during implementation ARCH-REV-005 (Pass on SR-005: `signIn?: "not checked"`, `limitsNote`).
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: implemented at `5135bb73dc` on `codex/available-agent-runtimes-tool`; implementation-scoped checks pass (IMP-01…IMP-08).
- Related solution revision IDs: SR-003, SR-005
- Related architecture-review revision IDs: ARCH-REV-003, ARCH-REV-005
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001…003; REQ-001…005, REQ-007…010; AC-001…012.
- Implementation delta: change sequence 1–8 of the design spec (parsers and fixtures; Claude idle-input control query with `listModels` on it and `MODEL_DISCOVERY_PROBE_PROMPT` removed; `runAcpExtensionRequest`; `ReadDeadline` and the optional `{deadline}` options; `readUsageLimits` on four strategies; provider usage readers; `AvailableAgentRuntimesService`; tool, MCP adapter, loader unit, GraphQL query, composition binding; Settings → Model Routing; docs and glossary). SR-005 delta applied in the same round.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: server typecheck Pass; server unit suite 826 files / 6869 tests Pass; focused server suites 240 tests Pass; web tests 72 Pass; web guards Pass; live dev-stack read 4.79 s; rendered page inspected (IMP-07, IMP-08).
- Next recipient or routing: code review (handoff rule for Large / High).
- Remaining limitations or risks: `implementation-handoff.md` § Known Risks.
