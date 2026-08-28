# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `CRR-002`, API/E2E round 1 | `SR-004`, `ARCH-REV-005`, `IR-002`, `CRR-002` | N/A | Pass / 97% |
| API-REV-002 | `/code_reviewer`, `CRR-003`, API/E2E Local Fix round 2 | `API-REV-001`, `CRR-003`, `TR-F-001`, `TR-F-002` | Pass / 97% (delivery suspended for test review) | Pass / 97% |
| API-REV-003 | `/code_reviewer`, `CRR-004`, API/E2E Local Fix round 3 | `API-REV-002`, `CRR-004`, `TR-F-003` | Pass / 97% (delivery suspended for test review) | Pass / 97% |

## Revision Entries

### API-REV-001 — Deterministic Agent Tools lifecycle and real Classroom validation baseline

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/code-review-report.md`; API/E2E round 1
- Triggering finding or scenario IDs: mandatory post-`CRR-002` coverage investigation; `API-SC-ROUTE-001`, `API-SC-TEAM-001`, `API-SC-LISTENER-001`, `API-SC-PROVIDER-001`, `API-SC-CODEX-LIVE-001`, `API-SC-CODEX-TEAM-001`, `API-BROWSER-CLASSROOM-001`, `API-BROWSER-NESTED-001`
- Related revisions: `SR-004`, `ARCH-REV-005`, `IR-002`, `CRR-002`
- Why recorded: this is the first completed API/E2E result. It establishes the authoritative baseline after classifying every stale issuer/releaser integration/E2E fixture and completing repository, real-provider, lifecycle, and explicitly requested browser validation.
- Coverage decisions/durable paths changed: obsolete revoke/bearer/main-listener harness assumptions were replaced with deterministic headerless exact-run activation/deactivation and the production private-listener composition; focused Team/listener integration coverage was added; the obsolete releaser fixture was removed.
- Scenarios added, changed, removed, or rechecked:
  - added full supported Team cleanup/restore and Studio listener/gateway lifecycle integrations;
  - updated provider/run/application/live E2E fixtures to the current activator/deactivator and Team DTO contracts;
  - removed the revoke/partial-owner releaser fixture;
  - rechecked cancel/reject/accepted cleanup, inactive 404, two-cycle restore, gateway preservation, real Codex, public Classroom, nested Team task lifecycle, and DeepSeek restore.
- Commands/environment/broader-validation delta: prepared shared packages; ran narrow/focused/broad integration/E2E/build/preflight; ran real Codex standalone and targeted Team stop/restore; imported both requested Agent Package roots and isolated secret identifiers; ran live browser Classroom with Codex and nested Classroom with AutoByteus/DeepSeek V4 Flash; performed final cleanup/audits.

#### Prior Failure Resolution

None. This is the initial API/E2E baseline; prior result and confidence are `N/A`.

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/api-e2e-execution-coverage-report.md`
  - this revision record
- Prior result/confidence: `N/A`
- Current result/confidence: `Pass / 97%`
- New or remaining failure IDs: no changed-scope failure IDs. Broad unrelated stale baseline failures and four non-targeted live Codex event-shape cases remain documented, without contradicting critical direct evidence.
- Recommended recipient: `/code_reviewer` for proportional review of changed durable test code.
- Remaining risks/untested scope: live Claude Agent SDK not credentialed; Electron-native shell unchanged/not launched; broad repository baselines are not globally green.

### API-REV-002 — Current Team DTO and GraphQL durable coverage repair

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/api-e2e-test-review-report.md`; API/E2E Local Fix round 2 after `CRR-003`
- Triggering findings: `TR-F-001` (four stale name-keyed Codex websocket/projection assertions) and `TR-F-002` (removed metadata/member-route GraphQL fields plus compatibility-only helper decoding)
- Related revisions: `API-REV-001`, `CRR-003`; implementation source remains under authoritative `CRR-002 Pass`
- Why recorded: the first proportional test review suspended delivery despite the clean implementation result; this round repairs and re-executes the changed durable test/helper package.
- Coverage decisions/durable paths changed: replaced all remaining name-keyed Team event assertions with exact execution-tree run IDs; removed legacy metadata/member-route decoding; centralized current GraphQL documents; added ungated schema validation; updated live fixtures to current create/websocket/vault/tool contracts.
- Scenarios rechecked: complete live Codex, Claude, and AutoByteus/DeepSeek Team files; current GraphQL document contract; affected collection; manager/resource/Mixed lifecycle regression; build; forbidden-symbol/diff/cleanup/secret audits; every available aggregate live file was attempted and non-clean model outcomes were retained honestly.
- Commands/environment/broader-validation delta: real provider runs used current Studio composition, isolated application data, secret-vault provisioning, and `deepseek-v4-flash`; browser journeys were not repeated because no product source changed and the existing real public/nested Classroom evidence remains valid.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `TR-F-001` | API/E2E-owned Local Fix | all five Codex Team cases now use current `executionTree`/exact `agentRunId` and `agent_run_id`; complete file passes 5/5 | `54-live-codex-team-full-final.log`; `75-round2-final-audits-cleanup.log` |
| `TR-F-002` | API/E2E-owned Local Fix | current-schema-only helper/documents/callers; compatibility decoding absent; documents validate without provider gates | `74-round2-final-build-contract-regression.log`; `75-round2-final-audits-cleanup.log` |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/api-e2e-execution-coverage-report.md`
  - this revision record
- Prior result/confidence: `Pass / 97%`, with delivery suspended by `CRR-003`
- Current result/confidence: `Pass / 97%`
- New or remaining failure IDs: none for the reviewed changed scope. Aggregate live all-runtime/mixed-task/mixed-Team completions remain non-clean due observed model/tool-selection nondeterminism; they are residual evidence, not claimed passes.
- Recommended recipient: `/code_reviewer` for repeated proportional review of the round-2 durable test/helper changes.
- Remaining risks/untested scope: one complete final nested-mixed aggregate provider file was not rerun after the vault/current-contract update; the real nested Classroom browser journey and complete individual providers pass. Electron-native shell remains unchanged/not launched; broad repository baselines are not globally green.

### API-REV-003 — Current Team task-event durable coverage repair

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/api-e2e-test-review-report.md`; API/E2E Local Fix round 3 after `CRR-004`
- Triggering finding: `TR-F-003` — the changed mixed-task live file waited for retired task activation/result wire events and compatibility-only task/execution fields.
- Related revisions: `API-REV-002`, `CRR-004`; implementation source remains under authoritative `CRR-002 Pass`.
- Why recorded: the second proportional test review suspended delivery until task-Agent activation, task-Team activation, submission, and review assertions matched the strict current Team stream contract and were executable without provider gates.
- Coverage decisions/durable paths changed: updated `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`; added `tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts`; removed the retired task wire predicates/extraction branches but no scenario file.
- Scenarios rechecked: current task-Agent and task-Team activation, current submitted/reviewed `TASK_CHANGED` records, gated live-file collection, dedicated system-task-notification projection, production build, both available real mixed-task cases, forbidden-symbol/diff/cleanup/secret audits.
- Commands/environment/broader-validation delta: real mixed-task attempts used isolated application data/vault with AutoByteus DeepSeek v4 Flash and Codex capability; no product/browser source changed, so the already-passing requested Classroom browser journeys were retained rather than repeated.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `TR-F-003` task-Agent/task-Team activation | API/E2E-owned Local Fix | strict parser plus `TASK_AGENT_ACTIVATED`/`TASK_TEAM_ACTIVATED`, exact execution IDs, and current task record assertions; zero retired activation fields remain | `77-round3-task-contract-focused.log`, `82-live-mixed-task-current-events-rerun.log`, `84-round3-final-audits-cleanup.log` |
| `TR-F-003` submit/review lifecycle | API/E2E-owned Local Fix | current `TASK_CHANGED` status/update assertions replace retired result-submitted/result-reviewed envelopes; ungated submitted/reviewed DTOs pass | `77-round3-task-contract-focused.log`, `83-round3-final-bounded-regression.log` |
| provider-gated contract blind spot | API/E2E-owned Local Fix | new ungated current task-event contract executes 2/2 independently of live capability | `77`, `78`, `81`, `83` |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/api-e2e-execution-coverage-report.md`
  - this revision record
- Prior result/confidence: `Pass / 97%`, with delivery suspended by `CRR-004`.
- Current result/confidence: `Pass / 97%`.
- New or remaining failure IDs: none for the reviewed current task-event contract. The full live mixed-task file is explicitly non-clean on a separate system-task-notification wait and failed-case cleanup hooks; no aggregate pass is claimed.
- Recommended recipient: `/code_reviewer` for repeated proportional review of the two round-3 durable test paths.
- Remaining risks/untested scope: aggregate live provider/model orchestration remains nondeterministic; the live websocket did not expose the separate notification event although its dedicated projection unit passed; unchanged Electron-native shell and broad stale repository baselines are not claimed.
