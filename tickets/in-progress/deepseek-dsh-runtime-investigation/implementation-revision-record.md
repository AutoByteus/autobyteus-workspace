# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 3 (Pass) | N/A | `Initial Baseline` | SR-004, ARCH-REV-003, CRR N/A, API-REV N/A, DR N/A | Implemented; local checks green; live E2E per handoff |

## Revision Entries

### IR-001 — DeepSeek Harness on the shared ACP backend through the credential proxy's provider relay

- Triggering role, report path, and round: Architecture Reviewer (`/software_engineering_team/architecture_reviewer`), `tickets/in-progress/deepseek-dsh-runtime-investigation/design-review-report.md`, round 3, Pass.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation of design spec SR-004, change sequence steps 1–6, at the commits named in `implementation-handoff.md`.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: REQ-001…REQ-015, AC-001…AC-017, QR-001…QR-004.
- Implementation delta: shared ACP launch contract (run/discovery launches, relay id, instructions on every launch), restore by `session/load` or `session/resume`, config-option selection, `AcpSessionEffect` (+ activity) and provider-call effects, one end owner (`AcpSessionLauncher.end`), relay refusal before spawn; Grok migrated with no behavior change. Credential proxy provider relays (`/relay/<relayId>/…`), stream reader, observers, `ProviderRelayAccess`, process relay slot, relay grant on the run pass, `RunPassRevocation` replacing `IntegrationRunAccess.revokeForRun`; compositions wired (studio general process and application scope get the host's access and `runPasses`; standalone host `null`). DeepSeek Harness runtime (home, launch profile, discovery, catalog, availability, Agent Runtimes strategy, session profile, projection, provider-call effects, payloads, Work Journal translation), runtime-kind registration in server, contracts and web; docs and glossary.
- Changed files or areas: see `implementation-handoff.md`, Key Files Or Areas.
- Local validation and result: see `implementation-handoff.md`, Checks Run.
- Next recipient or routing: Code Reviewer (Large / High route).
- Remaining limitations or risks: see `implementation-handoff.md`, Known Risks.
