# Delivery Handoff — Awaiting User Verification (+ one Solution Designer decision)

DR-001. Large / High, reviewed route. SR-010/012/014; ARCH-REV-001..003; IR-001/IR-002; CRR-001 (Fail F-001) → CRR-002 Pass; API-REV-001 Pass (93.5%); CRR-003 test review Pass.

## Integrated candidate
- Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal, branch `codex/work-journal` (not pushed).
- HEAD b0c81c8f20, a merge of origin/personal @ e2e21402b1d4dae9919d7e19b387cae493308f38. The bootstrap base was cba6b85122. The 9 new base commits are the codex-segment-turn-admission-drops ticket (server Codex thread code), with no overlap and no conflicts.
- Checkpoint ea30b1c98e holds the CRR-003 artifacts. Product code is unchanged since 8f5bb563b1.
- Post-integration rerun passed:
  - src typecheck;
  - work-journal 76 (+2 skipped), app-data-migrations 403, skill-improvement 27, Codex thread (base area) 84;
  - rebuilt dist, then E2E restore-transport 1/1, remove-work-trace-exports startup 1/1, append-only-message-logs startup 2/2 (the first AOML-1 run on the integrated state).
- Repository checks: artifact hygiene and licensing pass.
- Evidence audit: delivery-evidence-audit.md. Every checked claim holds.

## Behavior delivered
- Every run gets `work_journal/` beside its raw traces: one plain-Markdown file per raw-trace file (closed files written once, the active file updated after each turn and compaction) plus a manifest.
- Tool calls read the same across Claude, Codex, AGY, AutoByteus and Grok, as Command, Write file, Edit file, Search web or Tool: <name>, with links back to the raw records.
- Skill Improvement now hands the improver the Work Journal (manifest, root, active file) instead of the old work-trace export.
- **On first start, a migration deletes the old `work_traces/` export folders.** They were derived exports. Raw traces are untouched, and folders without a manifest and symlinks are left alone.

## User verification checklist
1. Start this worktree's build: `pnpm --silent isolated-app start --build` (from the worktree).
2. Run an agent (any runtime) through a short task that runs a command, reads a file and edits a file.
3. Open the run's memory folder in the instance data root: `memory/agents/<run>/work_journal/work_journal_active.md`. Expect one plain line per tool call, readable without knowing the runtime, each with a ↗ link.
4. Optional: start Skill Improvement on that agent's skill. The improver should begin by reading the Work Journal manifest.
5. Stop the instance with `pnpm --silent isolated-app stop`.

## Decisions needed
- **Your verification**, and the release decision (none, beta or stable).
- **probes/** (untracked, 544 KB) holds samples of your real ~/.autobyteus memory: shell commands, file paths, agent and team names. It is not committed unless you say so. The default is to keep it out of the repository and delete it with the worktree.
- **Rollback finding** (sent to Solution Designer): after a rollback, the current release would ignore Skill Improvement session files written by this build, and those skills would start a fresh improver session. There is no crash and no raw-trace impact. The fix or the documentation is pending SD's decision; finalization waits for it.

## Residual risks
- N2 cost was not measured on slower hardware (0.27 s cold once per process; 0.3–0.6 s per turn on the largest 28 MB file).
- Grok is not live (429).
- The full ~2 h server E2E suite was not re-run after the AOML-1 test fix. AOML passes alone, including in delivery.
- AE-006 is a shared-DB suite-order flake (FU-T1); there is a base architecture-guard failure (FU-T2).

## Remaining gates
User verification, the SD rollback decision, the probes decision, archiving, `--no-ff` finalization per RELEASE.md, any release, and cleanup.

## Update — rollback decision (2026-10-19)
Solution Designer chose the code fix (SR-016): the session file keeps writing `schemaVersion: 1`, so the current release still reads it after a rollback. It goes through architecture review and implementation, then returns to delivery for re-integration and re-check before finalization. SD recommends keeping probes/ uncommitted.

## Update — rollback decision superseded (SR-018)
You corrected the rule: rollback compatibility is needed only for releases whose migration converts existing data. So there is no code fix. The session-file change is an accepted rollback effect: after a rollback, Skill Improvement starts a fresh improver session once. RELEASE.md and the data-migration guideline are updated in this ticket. The revised package returns through architecture review before delivery finalizes.
