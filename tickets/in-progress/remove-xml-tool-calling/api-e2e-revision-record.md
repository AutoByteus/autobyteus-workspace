# API/E2E Revision Record

The latest coverage investigation and execution coverage report are authoritative. This record preserves the concise history of completed API/E2E rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | `code_reviewer`; `code-review-report.md`; round 1 plus user-requested real testing | `SR-001`, `ARCH-REV-001`, `IR-001`, `CRR-001` | N/A | Pass / 97% |

## Revision Entries

### API-REV-001 — Initial native-only tool-calling coverage and real-execution baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/code-review-report.md`; API/E2E round 1, extended by the user's explicit direction to execute real tests after importing `/Users/normy/.autobyteus/server-data/.env` through the pnpm secret importer.
- Triggering finding or scenario IDs: `CRR-001` passed with no source findings and identified one coverage-owned final-native-arguments expectation; the validation round covered `NATIVE-HANDLER-001`, `NATIVE-TEXT-001`, `PUBLIC-SURFACE-001`, `NATIVE-CONT-001`, `NATIVE-NOTOOL-001`, `CONFIG-RETIRE-001`, `AUTOBYTEUS-CHAT-001`, `BUILD-001`, `LIVE-NATIVE-001`, `LIVE-NOTOOL-001`, `LIVE-AUTOBYTEUS-001`, and `BROWSER-SETTINGS-001`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-001`, `ARCH-REV-001`, `IR-001`, `CRR-001`.
- Why this baseline or coverage/execution revision was recorded: This is the first completed API/E2E result. No earlier result or confidence was inferred.
- Coverage decisions or durable test paths changed: Added 1 test path, updated 39 test paths, and removed 65 stale legacy-protocol test paths. The exact per-path inventory is authoritative in `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/api-e2e-execution-coverage-report.md` and `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/validation-logs/round1/durable-coverage-diff.txt`. Material changes replace parser/formatter/text-history/selector coverage with native handler, provider history, continuation, zero-invocation text, exact retired-key, current Settings, supported-surface, and removed-surface assertions.
- Scenarios added, changed, removed, or rechecked: Added removed-public-surface import/build protection and stronger native/config/UI negative coverage; changed the final `write_file` arguments expectation to the provider-supplied `{ path }`; rechecked mixed/parallel native calls, identity/context/order, interruption/failure suppression, live file projections, provider-native histories, ordered/context-file continuation, no-tool streaming, AutoByteus ordinary content/media, exact key retirement, builds, live provider execution, and realistic Settings; removed legacy XML/JSON/sentinel parser, formatter, manifest, text-history, selector, server-setting, and web-card scenarios.
- Commands, environment, fixture, or broader-validation delta: Repository execution passed the final full core unit suite (287 files / 1,512 tests), native-flow core integrations (3 / 18), affected server coverage (4 / 74), focused web coverage (2 / 4), core/server/web builds, and static/diff checks. A value-safe pnpm importer dry run and actual pseudo-TTY import applied 19 test-DB migrations and configured 9 secrets without printing values. Broader validation was `Required` and completed through real DeepSeek native tools/compaction/continuation, real OpenAI no-tool AgentRun, and Chrome Settings execution against isolated worktree-resolved services. AutoByteus credential readiness passed, but remote model discovery was unavailable and is recorded as `Not Tested` rather than passed.

#### Prior Failure Resolution

None. No prior completed API/E2E round or unresolved prior failure existed. Within this round, the first authoritative DeepSeek attempt observed invalid external compactor JSON; the harness correctly rejected the failed phase, and an immediate clean rerun passed all native-tool, compaction, memory, continuation, and exact-artifact assertions. Initial server diagnostics with an incorrect temporary dependency link were superseded by authoritative reruns after verifying that the server resolved this ticket worktree's core package.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/api-e2e-coverage-investigation.md` — final coverage dispositions, repository evidence, confidence scorecard, broader-validation decision, and residual risks
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/api-e2e-execution-coverage-report.md` — authoritative round 1 execution, evidence, exact durable path inventory, cleanup, classification, and result
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/validation-logs/round1` — value-safe command logs, durable diff inventory, and browser screenshots
- Prior result and confidence: N/A
- Current result and confidence: **Pass / 97%**
- New or remaining failure IDs: None. `LIVE-AUTOBYTEUS-001` remains explicitly `Not Tested` because remote capability discovery was unavailable.
- Recommended recipient: `code_reviewer` for mandatory proportional review of the added, updated, and removed repository-resident durable coverage.
- Remaining risks, blocked evidence, or untested scope: External compactor responses remain stochastic; AutoByteus remote execution was not possible after discovery failure; not every native provider was exercised live; removed subpath consumers outside this repository cannot be enumerated. No critical acceptance criterion lacks direct evidence and no validation blocker remains.
