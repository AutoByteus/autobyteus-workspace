# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md` ARCH-REV-001 (Pass), SR-002 | N/A | `Initial Baseline` | SR-001, SR-002; ARCH-REV-001; CRR N/A; API-REV N/A; DR N/A | Intended Change 1-3 and the doc implemented at `5054f97a17`; unit, typechecks, live AC-005 ×3 and live AC-003 (fresh) pass → code reviewer (Medium/High) |

## Revision Entries

### IR-001 — Start-up bounds, Grok's announced catalog, workspace trust for Grok runs

- Triggering role, report path, and round: architecture reviewer, `tickets/in-progress/grok-release-smoke-551/design-review-report.md` (ARCH-REV-001 Pass), implementation round 1.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: commit `5054f97a17` plus the documents commit; `implementation-handoff.md`.
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review, API/E2E and delivery revision IDs: `N/A`
- Why this baseline is recorded: the initial implementation of the design.
- Approved behavior or requirement IDs affected: REQ-001, REQ-002, REQ-003 (BEH-001..004); AC-001, AC-002, AC-003 (unit and live fresh case), AC-005.
- Implementation delta:
  - Connection: `AGENT_START_TIMEOUT_MS` 90 s and `REQUEST_TIMEOUT_MS` 30 s replace `INITIALIZE_TIMEOUT_MS`. `onConnectionNotification` added, with each listener contained.
  - Discovery helper: 90 s bound; `boundEndsAt` passed to `use`; `runAcpDiscoveryHandshake(profile, { method, withinMs }, options)` returns `{ initialize, followUp }`.
  - Grok: probes 10 s; `_x.ai/models/update` with a 3 s wait; `normalizeGrokBuildModels(modelState)`; `GROK_FOLDER_TRUST=0` in run launches only.
  - Module doc updated.
- Changed files or areas:
  - `autobyteus-server-ts/src/runtime-management/acp/{acp-client-connection,acp-discovery-handshake}.ts`
  - `autobyteus-server-ts/src/runtime-management/grok/{grok-build-capability,grok-build-launch-profile}.ts`
  - `autobyteus-server-ts/docs/modules/grok_build_runtime.md`
  - four unit test files, one of them new
- Local validation and result:
  - IMP-01: 65 files / 554 tests pass. Controls on base fail where expected.
  - IMP-02: both typechecks PASS.
  - IMP-03: live AC-104 ×3 pass; trust list unchanged.
  - IMP-04: live discovery returns `grok-4.7` in initialize + about 3.07 s on a fresh sign-in.
- Next recipient or routing: `get_handoff_rules` → `/code_reviewer`.
- Remaining limitations or risks: AC-003's stale live case and AC-006 are left to API/E2E and the release smoke. See the handoff's Known Risks (the two 90 s timers; an agent exit during the wait; Grok quota).
