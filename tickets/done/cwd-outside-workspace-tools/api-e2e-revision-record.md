# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/code-review-report.md`; API/E2E Round 1 | `SR-002`, `ARCH-REV-002`, `IR-001`, `CRR-001` | N/A | Pass / 93.2% |
| API-REV-002 | `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/code-review-report.md` (`CRR-003`); API/E2E Round 2 | `SR-003`/`SR-004`/`SR-005`, `ARCH-REV-006`, `IR-002`, `CRR-003` | Superseded Pass / 93.2% (historical, not approval evidence) | Pass / 93.3% |

## Revision Entries

### API-REV-001 — Initial terminal cwd coverage and built-package validation

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/code-review-report.md`; Round 1 after source review pass for commit `3c2967d95`.
- Triggering finding or scenario IDs: No code-review finding. Coverage investigation identified `API-001`: no-workspace absolute `start_background_process` symmetry was not durably covered.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-002`, `ARCH-REV-002`, `IR-001`, `CRR-001`; delivery `N/A`.
- Why this baseline or coverage/execution revision was recorded: First completed API/E2E result. It establishes the required `API-REV-001` baseline and records the initial canonical coverage investigation, durable coverage addition, repository execution, and built package-consumer evidence.
- Coverage decisions or durable test paths changed: Existing terminal unit/integration/schema coverage remained valid. Added one durable integration scenario in `autobyteus-ts/tests/integration/tools/terminal/terminal-tools.test.ts` proving an absolute external cwd for `start_background_process` with `workspaceRootPath: null`, including output/status/stop cleanup. No production source or stale coverage removal was performed in this round.
- Scenarios added, changed, removed, or rechecked: `API-001` added; `API-002`–`API-008` rechecked and passed; `API-009` Windows ACL/WSL not tested; `API-010` MCP adjacent check not tested because `/opt/homebrew/bin/uv` is unavailable. Prior absolute-cwd rejection assertions had already been replaced upstream in reviewed commit `3c2967d95`.
- Commands, environment, fixture, or broader-validation delta: On macOS 26.5.2 arm64 with Node `v22.23.1`, pnpm `10.28.2`, Vitest `4.0.18`: focused unit/schema `18 files / 111 tests` passed; terminal integration `2 files / 15 tests` passed; adjacent rerun without MCP `6 files / 38 tests` passed; package build and runtime dependency verification passed; local tarball package-consumer install/import and real foreground/background lifecycle passed; `git diff --check` passed. Initial adjacent MCP attempt recorded `spawn /opt/homebrew/bin/uv ENOENT`.

#### Prior Failure Resolution

None. This is the required initial baseline with no prior API/E2E result or confidence.

- Canonical artifacts and sections updated:
  - Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/api-e2e-coverage-investigation.md`
  - Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/api-e2e-execution-coverage-report.md`
  - Evidence directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/evidence/`
  - Durable test path: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/tests/integration/tools/terminal/terminal-tools.test.ts`
- Prior result and confidence: `N/A`.
- Current result and confidence: `Pass`, `93.2%` overall applicable-category average. No applicable category is below 90%; the default 95% clean target is not met because Windows ACL/WSL and the missing MCP executable remain explicit residual gaps.
- New or remaining failure IDs: No task failure. Remaining untested evidence IDs: `API-009` (Windows/WSL), `API-010` (MCP adjacent fixture unavailable).
- Recommended recipient: `/code_reviewer` for proportional durable test-code review of API-001, then `/delivery_engineer` after that review.
- Remaining risks, blocked evidence, or untested scope: Windows host accessibility/ACL ordering before WSL conversion, WSL runtime/conversion, normal cwd preflight TOCTOU, and MCP stdio adjacent coverage without `/opt/homebrew/bin/uv`. Browser, Electron, server transport, persisted-data, and distributed validation are out of scope for the changed backend terminal boundary.

### API-REV-002 — Fresh absolute-only reset coverage and package-consumer validation

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/code-review-report.md` with `CRR-003`; Round 2 after source review pass for commit `95f538b66` / `IR-002`.
- Triggering finding or scenario IDs: No code-review finding. Fresh validation was required because the approved contract reset from relative-plus-absolute behavior to absolute-only provided cwd values; current scenarios are `API2-001` through `API2-010`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-003`, `SR-004`, `SR-005`, `ARCH-REV-006`, `IR-002`, `CRR-003`; delivery `N/A`.
- Why this coverage/execution revision was recorded: The prior `API-REV-001` and delivery artifacts were explicitly superseded by the absolute-only reset. This entry records a fresh investigation, fresh repository execution, fresh built-package consumer probe, and fresh bounded documentation check without reusing superseded approval evidence.
- Coverage decisions or durable test paths changed: No durable test path was added, updated, or removed in this round. Existing current tests remain valid for relative rejection/no-spawn, absolute external lifecycle, omitted defaults, absolute validation, exact schemas/docs, and the generic file-tool documentation boundary.
- Scenarios added, changed, removed, or rechecked: `API2-001`–`API2-008` passed on macOS/POSIX; `API2-009` Windows/WSL is not tested; `API2-010` MCP stdio is not tested because its required external fixture cwd is absent. The current absolute-only tests were rechecked unchanged.
- Commands, environment, fixture, or broader-validation delta: On macOS arm64 with Node `v22.23.1`, pnpm `10.28.2`, and Vitest `4.0.18`: 18 unit/schema files / 111 tests passed; six terminal integration files / 28 tests passed; six adjacent non-MCP files / 38 tests passed after the MCP setup failure; build passed; a fresh packed local consumer imported terminal subpaths and passed external/no-workspace foreground, managed background output/status/stop, and foreground/background relative rejection with zero records; the generic docs block matched `HEAD^`; `git diff --check` passed.

#### Prior Failure Resolution

No prior API/E2E failure applies to this reset. Historical `API-REV-001` was superseded by upstream contract reset, not resolved as a test failure; its result and confidence are not reused as approval evidence.

- Canonical artifacts and sections updated:
  - Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/api-e2e-coverage-investigation.md`
  - Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/api-e2e-execution-coverage-report.md`
  - This revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/api-e2e-revision-record.md`
  - Evidence directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/evidence/`
- Prior result and confidence: `Superseded Pass / 93.2%`; not reused as current evidence.
- Current result and confidence: `Pass / 93.3%` for host-applicable macOS/POSIX scope. No applicable category is below 90%; the default 95% target is not met because Windows/WSL and the optional MCP fixture remain untested.
- New or remaining failure IDs: No task failure. Remaining untested IDs: `API2-009` (Windows/WSL) and `API2-010` (MCP external fixture).
- Recommended recipient: `/code_reviewer` for proportional test-code review disposition; `Not Applicable` because API-REV-002 made no durable coverage edits.
- Remaining risks, blocked evidence, or untested scope: Windows ACL/host-before-WSL accessibility and WSL runtime/conversion, normal filesystem preflight TOCTOU, and MCP stdio without `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus_mcps/pdf_mcp`. Browser, Electron, server transport, persisted-data, and distributed validation are out of scope.
