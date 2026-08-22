# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer`; architecture review Round 2; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/architecture-review-revision-record.md` | None; approved implementation baseline | `Initial Baseline` | `SR-002`, `ARCH-REV-002`, `N/A` for `CRR-*`, `API-REV-*`, and `DR-*` | Implementation complete and ready for source review |
| IR-002 | `/architecture_reviewer`; architecture review Round 6; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/architecture-review-revision-record.md` | `ARCH-DI-002` resolved upstream; prior implementation evidence superseded | `Local Fix` | `SR-003`, `SR-004`, `SR-005`, `ARCH-REV-006`, `N/A` for `CRR-*`, `API-REV-*`, and `DR-*` | Absolute-only reset implemented and ready for fresh source review |

## Revision Entries

### IR-001 — External absolute terminal cwd with resolver-owned access preflight

- Triggering role, report path, and round: `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/architecture-review-revision-record.md`; Round 2 passed.
- Triggering finding IDs: None. The approved design resolves `ARCH-DI-001`; `MP-001` remains covered by the implementation and focused no-spawn checks.
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: Implementation complete; ready for `/code_reviewer` source review.
- Related solution revision IDs: `SR-002` (with `SR-001` as the original solution baseline).
- Related architecture-review revision IDs: `ARCH-REV-002`.
- Related code-review revision IDs: `N/A`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this baseline or implementation revision is recorded: Records the first implementation handoff for the architecture-approved terminal cwd contract and the resolver-owned inaccessible-cwd preflight.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-007`; `REQ-001`–`REQ-010`; `AC-001`–`AC-010`.
- Implementation delta:
  - `resolveExecutionCwd` now classifies absolute input before workspace anchoring, accepts normalized physical external directories, preserves workspace lexical/physical containment for relative input, and rejects relative input without a configured workspace with an actionable error.
  - The resolver validates directory type and performs host `accessSync` preflight (`X_OK` on POSIX, `F_OK` on Windows) before either process owner is reached. Permission failures map to `Working directory '<path>' is not accessible.`
  - Tool schemas/descriptions and terminal documentation now state external absolute support, relative workspace anchoring, omitted defaults, per-call/process scope, and the non-sandbox posture.
  - Stale absolute-cwd rejection coverage was replaced with external foreground/background success, symlink normalization, preserved relative traversal/default behavior, invalid-directory mapping, and inaccessible absolute/relative no-spawn checks for both tools.
- Changed files or areas:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/src/tools/terminal/execution-cwd.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/src/tools/terminal/tools/run-bash.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/src/tools/terminal/tools/start-background-process.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/docs/terminal_tools.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/tests/unit/tools/terminal/run-bash.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/tests/integration/tools/terminal/terminal-tools.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/tests/unit/tools/usage/providers/run-bash-openai-schema.test.ts`
- Local validation and result:
  - `pnpm exec vitest --run tests/unit/tools/terminal/ tests/unit/tools/usage/providers/run-bash-openai-schema.test.ts` — passed, 18 files / 110 tests.
  - `pnpm exec vitest --run tests/integration/tools/terminal/terminal-tools.test.ts tests/integration/tools/terminal/background-process-manager.test.ts` — passed, 2 files / 14 tests.
  - `pnpm run build` — passed TypeScript build and runtime dependency verification.
  - `git diff --check` — passed.
  - POSIX inaccessible-cwd fixtures remove directory search permission and verify no executor/manager start call and no background record; Windows ACL/WSL execution remains downstream validation.
- Next recipient or routing: `/code_reviewer` for source and architecture review before API/E2E coverage investigation.
- Remaining limitations or risks:
  - Local evidence is macOS/POSIX only. Windows host ACL behavior, host-path preflight ordering relative to WSL conversion, and WSL runtime failures require downstream supported-platform checks.
  - The access check is a preflight and remains subject to TOCTOU changes before the OS spawn; it is not a sandbox.
  - Built output was compiled locally but package-consumer/runtime verification and broader API/E2E coverage remain downstream responsibilities.

### IR-002 — Absolute-only provided cwd reset and durable documentation alignment

- Triggering role, report path, and round: `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/architecture-review-revision-record.md`; Round 6 (`ARCH-REV-006`) after the `SR-003` reset and `SR-004`/`SR-005` documentation corrections.
- Triggering finding IDs: `ARCH-DI-002` was resolved upstream. Prior implementation, code-review, API/E2E, and delivery evidence covered the superseded relative-cwd contract and is not approval evidence for this revision.
- Classification: `Local Fix`.
- Prior authoritative result: `IR-001` implementation handoff for the superseded contract; downstream evidence superseded by the approved absolute-only reset.
- Current authoritative result: The approved absolute-only reset is implemented and ready for a fresh `/code_reviewer` source review.
- Related solution revision IDs: `SR-003`, `SR-004`, `SR-005`.
- Related architecture-review revision IDs: `ARCH-REV-006` (current pass); `ARCH-REV-005` (prior durable-cross-reference pass).
- Related code-review revision IDs: `N/A` for this revision; historical `CRR-001`/`CRR-002` are superseded.
- Related API/E2E revision IDs: `N/A` for this revision; historical `API-REV-001` is superseded.
- Related delivery revision IDs: `N/A` for this revision; historical `DR-001`/`DR-002` are superseded.
- Why this baseline or implementation revision is recorded: Records implementation of the approved `SR-003` absolute-only provided-cwd contract and the bounded durable documentation correction required by `SR-004`/`SR-005`.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-007`; `REQ-001`–`REQ-010`; `AC-001`–`AC-010`.
- Implementation delta:
  - `resolveExecutionCwd` now rejects every provided non-absolute value with `Working directory must be an absolute path.` before workspace joining, physical resolution, or process creation. Omitted cwd still selects the configured workspace root or `os.tmpdir()`.
  - Existing absolute physical normalization, directory/type validation, host accessibility preflight, working-directory error mapping, and host-before-WSL boundary remain in the resolver. Foreground/background lifecycle owners are unchanged.
  - The two cwd-bearing schemas use the exact concise field descriptions from the approved design. Tool-level descriptions and both durable terminal documentation surfaces now state absolute-only provided values, external accessible-directory support, unchanged omitted defaults, per-call/process scope, and no workspace identity persistence.
  - Relative-success and workspace-relative accessibility tests were removed. Public foreground/background tests now assert relative rejection and no-spawn behavior; external absolute success, defaults, symlink normalization, invalid targets, and inaccessible absolute no-spawn behavior remain covered.
  - The schema test compares both durable docs with serialized schemas and asserts the generic file-tool `path`/`base_dir`/`edit_file` contract markers. A separate exact-section comparison against `HEAD` proves the generic file-tool section is unchanged.
- Changed files or areas:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/src/tools/terminal/execution-cwd.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/src/tools/terminal/tools/run-bash.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/src/tools/terminal/tools/start-background-process.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/docs/terminal_tools.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/docs/tool_schema_and_configuration.md` (terminal cross-reference only)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/tests/unit/tools/terminal/run-bash.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/tests/integration/tools/terminal/terminal-tools.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/autobyteus-ts/tests/unit/tools/usage/providers/run-bash-openai-schema.test.ts`
- Local validation and result:
  - `pnpm exec vitest --run tests/unit/tools/terminal/ tests/unit/tools/usage/providers/run-bash-openai-schema.test.ts` — passed, 18 files / 111 tests.
  - `pnpm exec vitest --run tests/integration/tools/terminal/` — passed, 6 files / 28 tests.
  - `pnpm run build` — passed TypeScript compilation and `[verify:runtime-deps] OK`.
  - `git diff --check` — passed.
  - Generic file-tool contract proof — passed; the 1,036-byte generic section matched `HEAD` exactly.
- Next recipient or routing: `/code_reviewer` for fresh source and architecture review before API/E2E coverage investigation.
- Remaining limitations or risks:
  - Local evidence is macOS/POSIX only. Windows ACL behavior, host-path validation before Windows-to-WSL conversion, WSL execution, built-package consumer behavior, and broader API/E2E evidence remain downstream.
  - Accessibility preflight remains subject to TOCTOU changes before OS spawn and is not sandbox enforcement.
