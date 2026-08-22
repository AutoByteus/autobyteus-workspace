# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer`; architecture review Round 2; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/architecture-review-revision-record.md` | None; approved implementation baseline | `Initial Baseline` | `SR-002`, `ARCH-REV-002`, `N/A` for `CRR-*`, `API-REV-*`, and `DR-*` | Implementation complete and ready for source review |

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
