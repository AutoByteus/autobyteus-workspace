# Implementation Revision Record: autobyteus-581

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 3 (Pass) | N/A (non-blocking N-3, N-4 applied) | `Initial Baseline` | SR-007, ARCH-REV-003 | Implemented steps 1–8; live API-key sandbox path passes; Codex login token (U-1) fails live, Grok (U-2) unproven; handed to Code Review |

## Revision Entries

### IR-001 — Provider relay through a paired relay node, sandbox nodes, and the public skill

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/sandbox-provider-relay-581/design-review-report.md`, round 3, Pass.
- Triggering finding IDs: N/A. Non-blocking notes applied: N-3 (the skill does not say a sandbox cannot reach the host's other runs; the stale option-A lines in the design spec are ignored, no sandbox route rule exists), N-4 (`role` carried through `PeerNode`/`toPeerNode`, the peer GraphQL type, the web store and the Nodes page row).
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: see `implementation-handoff.md`.
- Related solution revision IDs: SR-007.
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the initial implementation of the approved package.
- Approved behavior or requirement IDs affected: BEH-001 to BEH-007; REQ-001 to REQ-018.
- Implementation delta: the design's Change Sequence steps 1 to 8 (see the handoff's trace and key files).
- Changed files or areas: `autobyteus-ts/src/llm` (endpoint option); `autobyteus-server-ts/src/credential-proxy` (relays, access, settings, local route, peer forwarder, relay-node handler, activity log, login reader, relay offer); `remote-collaboration` (peer relay client, peer role, pairing with role); runtime launches (native, Claude, Codex, ACP for Grok and DeepSeek Harness); sign-in reader and strategies; secret catalog; settings; `sandboxes/` and `agent-tools/sandboxes/`; compositions; Electron release version; web Nodes page label; docs; the public skill in `AutoByteus/autobyteus-skills`.
- Local validation and result: see the handoff's Checks Run.
- Next recipient or routing: `/code_reviewer` (Large / High). U-1 (Codex login token fails live) and U-2 (not proven) are reported in the handoff for the Solution Designer's and the user's decision.
- Remaining limitations or risks: see the handoff's Known Risks.
