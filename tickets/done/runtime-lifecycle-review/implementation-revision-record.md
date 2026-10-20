# Implementation Revision Record — runtime-lifecycle-review

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, ARCH-REV-002 Pass (+ ARCH-REV-003 Pass for SR-011) | N/A (AR-008 implementation note applied) | `Initial Baseline` | SR-010, SR-011, ARCH-REV-002, ARCH-REV-003 | Implemented; code review Fail (CRR-001) |
| IR-002 | Code reviewer, `code-review-report.md`, CRR-001 Fail | CR-001, CR-002 (CR-003 → SR-012, no code change) | `Local Fix` | SR-012, CRR-001, CRR-002 | Fixed; code review Pass (CRR-002); reviewer routed to API/E2E |

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

### IR-002 — Claude signed-out reading; agent count never defaults to zero

- Triggering role, report path, and round: code reviewer (run `code_reviewer_064191c97ef649089bdbc6f42050e984`), `code-review-report.md`, CRR-001 (Fail, Local Fix).
- Triggering finding IDs: CR-001 (Medium), CR-002 (Low). CR-003, the table/stacked switch, was decided by the Solution Designer as SR-012 (container-width switch kept), so no code change.
- Classification: Local Fix.
- Prior authoritative result: IR-001, code review Fail.
- Current authoritative result: fixed at `52aa663edd`; affected checks pass; ready for the targeted delta review.
- Related solution revision IDs: SR-012.
- Related architecture-review revision IDs: N/A.
- Related code-review revision IDs: CRR-001.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: a signed-out Claude showed "Sign-in unknown". Claude 2.1.302 prints `{"loggedIn": false}` and exits 1, and IR-001 treated every non-zero exit as unknown. Separately, a failing running-agent count was silently read as 0.
- Approved behavior or requirement IDs affected: BEH-005, REQ-005, AC-006 and AC-009 (Claude "Not signed in" + "Sign in from its command line."); BEH-003, REQ-003, AC-004 (no Update when the count is unreadable).
- Implementation delta:
  - `claude-agent-runtime-strategy.ts`: the status JSON is read whatever the exit code. `loggedIn === true` → signedIn. `loggedIn === false` → signedOut with `describeFailure` detail, so the readiness reason text is unchanged. A JSON object without a boolean `loggedIn` at exit 0 → signedOut, as before. With no JSON, exit 0 plus "logged in" text → signedIn; anything else → unknown.
  - `agent-runtime-status-service.ts`: `runningAgents()` calls the port directly; the try/catch that returned 0 is removed.
- Changed files or areas: the two source files above; `agent-runtime-strategies.test.ts` (the signed-out fake now exits 1 like the vendor; new cases for a JSON object without `loggedIn`, and for "logged in" text with exit 1 → unknown); `agent-runtime-status-service.test.ts` (an unreadable count blocks Update and starts no process).
- Local validation and result: IMP-12 (server typecheck clean; agent-runtimes, resolver, application-platform and Grok-registration tests: 17 files, 149 tests pass). IMP-11 ran the real Claude 2.1.302 in an empty temporary HOME through the strategy: `RAW exitCode=1`, `READING {"state":"signedOut","detail":""}`.
- Next recipient or routing: `/software_engineering_team/code_reviewer` (targeted delta review).
- Remaining limitations or risks: unchanged from IR-001 except that the UI-breakpoint question is closed by SR-012.
