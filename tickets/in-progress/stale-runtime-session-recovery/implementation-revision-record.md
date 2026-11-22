# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 (Pass) | N/A | `Initial Baseline` | SR-002, ARCH-REV-002 | Implemented; checks IMP-01…IMP-09 pass; to code review |
| IR-002 | Architecture Reviewer, ARCH-REV-003 (Pass) for SR-003, answering Code Reviewer CRR-001 | CR-001, CR-002 | `Design Impact` (resolved upstream by SR-003) | SR-003, ARCH-REV-003, CRR-001 | Implemented; checks IMP-10…IMP-14 pass; to code review |

## Revision Entries

### IR-001 — Lost runtime session renewal, standalone and members

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/stale-runtime-session-recovery/design-review-report.md`, ARCH-REV-002 (Pass)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented as design-spec.md SR-002's Change/Refactor Sequence, steps 1–7; Large / High confirmed.
- Related solution revision IDs: SR-002 (with DEC-006 for N-1)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001…BEH-007; REQ-001…REQ-007; AC-001…AC-006 (AC-007 is API/E2E's).
- Implementation delta:
  - typed error `SavedRuntimeSessionMissingError`; `buildSessionRenewal` and `RuntimeSwitch.cause`;
  - recognition in the Codex, Antigravity, ACP (Grok, DeepSeek) and Claude backends; Claude `verifyResumable` at restore;
  - standalone renewal in `restoreStarted` via `activateInFreshSession`; `RUNTIME_SESSION_LOST` log;
  - AR-002 removal of the staged member activation; `beginSessionRenewal`, `configured-agent-session-renewal.ts`, `replace_lost_session` with the renamed shared compare-and-set, in all five consumers;
  - application-scope lifecycle gets the switch port (N-4, see the handoff's deviations);
  - N-1 probe (PRB-009): Grok matcher kept;
  - glossary and module docs.
- Changed files or areas: see the handoff's Key Files Or Areas; commits `67eb9a07fd`…`2acd842c95` on `0da6bfbfc1`.
- Local validation and result: IMP-01…IMP-09 Pass. Negative controls first found two untested pieces (the Claude factory's check, the confirmed release before a renewal); tests were added in `0681fcd3af`, and all 16 controls now fail as expected (IMP-03).
- Next recipient or routing: Code Reviewer (Large/High).
- Remaining limitations or risks: no Claude built-server E2E (a scripted Claude harness would be new); recognized texts are version-specific (RSK-001); Claude restores open their process at activation (RSK-003).

### IR-002 — Every composition renews with the hand-over notice; two unread fields removed

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md`, ARCH-REV-003 (Pass, note N-5), for SR-003; the trigger was Code Reviewer, `code-review-report.md`, CRR-001 (Fail, `Design Impact`).
- Triggering finding IDs: CR-001, CR-002
- Classification: `Design Impact` (decided upstream as DEC-007 (a); implemented here)
- Prior authoritative result: IR-001, code review Fail: the application paths renewed without the notice, and the host's standalone lifecycle could not renew (CR-002); two fields were set and never read in production (CR-001).
- Current authoritative result: every composition gives both parts; AC-008 tested per composition; the two fields removed. Large / High confirmed.
- Related solution revision IDs: SR-003
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: rework for CRR-001 after SR-003.
- Approved behavior or requirement IDs affected: REQ-003, REQ-006 (extended), AC-008, BEH-006, BEH-007.
- Implementation delta:
  - application execution scope: `AgentRunPlatformNotices([RuntimeHandoverNoticeService])` as the run manager's `inputPreface` and as the run and resource managers' `lifecycleObserver`, wired as the general supervisor wires them; its lifecycle switching (`2acd842c95`) kept;
  - standalone application host: `runtimeSwitching: { memory: new RuntimeSwitchRecorder() }`, and the notice first in its `AgentRunPlatformNotices`, as the studio orders it;
  - `general-process-run-supervisor-input.ts`: the `runtimeSwitching` comment rewritten (N-5: no switch on the host because it serves no run-selection surface);
  - CR-001: `RuntimeSwitch.cause` (and `RuntimeSwitchCause`) and `CodexAppServerRpcError.rpcCode` removed; the glossary line changed accordingly;
  - AC-008 tests: application scope through its real kernel builder (including a run that took an input before its renewal, which pins the lifecycle observers); the host's delegated copy and member through the real general supervisor built with the host's wiring; the host start's wiring pinned in its lifecycle test; the studio E2E checks the notice on the first input after a renewal and no second notice later;
  - `run_history.md` names the three compositions.
- Changed files or areas: `application-execution-scope-kernel-builder.ts`, `start-standalone-application-host.ts`, `general-process-run-supervisor-input.ts`, `runtime-switch.ts`, `codex-app-server-client.ts`; tests listed in the handoff; `GLOSSARY.md`, `run_history.md`. Commits `a2db91def8`, `f79773703d`, `132471ccd9`, `1df7771aac`.
- Local validation and result: IMP-10…IMP-14 Pass. A negative control first showed the scope's lifecycle observers untested; a test was added (`132471ccd9`). Each observer alone clears the notice cache, so only removing both fails (NC-R2-02c).
- Next recipient or routing: Code Reviewer (Large/High).
- Remaining limitations or risks: no full built-host E2E (the host serves no run API); the host test uses the real supervisor with the host's wiring, and the host start's wiring is pinned separately. No Claude built-server E2E (unchanged from IR-001).
