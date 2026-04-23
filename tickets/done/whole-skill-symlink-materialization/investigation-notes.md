# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Medium`
- Triage Rationale:
  - The task touches two runtime backends (`codex` and `claude`), changes filesystem materialization semantics, and needs early proof against real runtime behavior before design/implementation.
- Investigation Goal:
  - Prove whether Codex can use a whole-directory symlink under workspace `.codex/skills` instead of a copied fallback bundle, determine whether `agents/openai.yaml` blocks that design, and determine whether the Claude runtime has the same stale-copy problem and should follow the same direction.
- Primary Questions To Resolve:
  - Does real Codex discovery accept a skill directory in `.codex/skills` that is itself a symlink to an external skill root?
  - Does Codex require `agents/openai.yaml`, or is `SKILL.md` alone enough for skill discovery?
  - Does the current Claude runtime still copy configured skills into `.claude/skills`, creating the same stale-update problem?
  - Can Claude reasonably follow the same whole-directory symlink design, or is there an immediate blocker?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-23 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` | Confirm current Codex fallback materialization behavior and naming | Codex currently copies missing configured skills into `.codex/skills/autobyteus-<sanitized>-<hash>`, dereferences source symlinks, writes `.autobyteus-runtime-skill.json`, and generates `agents/openai.yaml` when missing. | Yes |
| 2026-04-23 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Confirm when Codex materialization is used | Codex first calls `skills/list`; only configured skills not already discoverable by name are materialized into the workspace. | No |
| 2026-04-23 | Code | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | Confirm current intended Codex bundle semantics | Tests still encode copied self-contained bundles, ownership marker writes, generated `openai.yaml`, and the current `autobyteus-...-hash` directory naming. | Yes |
| 2026-04-23 | Command | `node <<'EOF' ... codex app-server initialize -> initialized -> skills/list on direct directory and whole-directory symlink fixtures ... EOF` | Prove actual Codex discovery behavior for directory symlinks | Real `codex app-server` discovered both the direct project skill and the whole-directory symlinked project skill. For the symlinked case it returned the external source-root `SKILL.md` path, not a copied workspace path. | No |
| 2026-04-23 | Command | `node <<'EOF' ... codex app-server initialize -> initialized -> skills/list on a skill fixture with SKILL.md only and no agents/openai.yaml ... EOF` | Determine whether `agents/openai.yaml` blocks a pure directory-symlink design | Real `codex app-server` discovered the skill successfully with only `SKILL.md`. `agents/openai.yaml` is not required for Codex skill discovery. | No |
| 2026-04-23 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts` | Confirm current Claude fallback materialization behavior | Claude currently copies configured skills into `.claude/skills/<sanitized-name>` using `fs.cp(...)`, writes `.autobyteus-runtime-skill.json`, and therefore has the same stale-copy problem as Codex fallback materialization. Claude does not add the extra hash suffix today. | Yes |
| 2026-04-23 | Code | `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts` | Confirm current intended Claude bundle semantics | Tests encode copied workspace bundles, ownership marker writes, and last-holder cleanup behavior. | Yes |
| 2026-04-23 | Code | `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` | Check existing live coverage for Claude project skills | Existing live integration coverage proves Claude Code can load a project skill from `.claude/skills/<skill-name>` with just `SKILL.md` when project skill settings are enabled. | Yes |
| 2026-04-23 | Command | `claude --version` | Confirm live Claude CLI availability before trying a symlink probe | Local CLI is installed (`2.1.90 (Claude Code)`). | No |
| 2026-04-23 | Command | `claude -p --setting-sources project --permission-mode default "Use the project skill $whole_folder_symlink_probe ..."` against a temp `.claude/skills/<name>` whole-directory symlink fixture | Try to prove live Claude symlink behavior directly in investigation | Probe could not complete because the local environment returned `Your organization does not have access to Claude. Please login again or contact your administrator.` This blocked live proof of the symlink behavior in this environment. | Yes |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - Codex: `CodexThreadBootstrapper.bootstrapForCreate(...)` in `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`
  - Claude: `ClaudeSessionBootstrapper.bootstrapForCreate(...)` in `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts`
- Execution boundaries:
  - Codex decides `reuse vs materialize` in the bootstrapper, then delegates filesystem work to `CodexWorkspaceSkillMaterializer`.
  - Claude directly materializes configured skills through `ClaudeWorkspaceSkillMaterializer` during bootstrap.
- Owning subsystems / capability areas:
  - `src/agent-execution/backends/codex/...`
  - `src/agent-execution/backends/claude/...`
  - `src/runtime-management/claude/client/...` for the live Claude project-skill integration evidence
- Optional modules involved:
  - Codex app-server client path for `skills/list` discovery preflight
  - Claude SDK client path for project skill loading
- Folder / file placement observations:
  - The current Codex and Claude materializers are the correct filesystem owners for this behavior.
  - Codex naming/suffix logic is local to `codex-workspace-skill-materializer.ts`; Claude naming is simpler and already hash-free.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | `prepareWorkspaceSkills`, `filterConfiguredSkillsForMaterialization` | Decide which Codex configured skills still need workspace materialization | Same-name discoverable skills are skipped already; only the fallback materializer path needs redesign. | Keep reuse-vs-materialize policy here. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` | `copySkillTree`, `ensureMaterializedSkillBundle`, `ensureOpenAiAgentConfig` | Codex fallback filesystem materialization + marker/config generation | Uses copied bundles, a hash suffix, and an ownership marker inside the materialized root. These choices all conflict with a pure whole-directory symlink design. | This file is the correct owner for the new symlink behavior and naming cleanup. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | `bootstrapInternal` | Claude bootstrap and configured-skill exposure | Claude currently materializes all exposed configured skills through its workspace materializer; there is no same-name discovery preflight like Codex. | If Claude is refactored, this bootstrapper likely stays the policy owner. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts` | `ensureMaterializedSkillBundle` | Claude workspace skill materialization and cleanup ownership | Uses `fs.cp(...)` into `.claude/skills/<sanitized-name>` and writes an ownership marker into the copied root, so it has the same stale-copy behavior as Codex fallback materialization. | This file is the correct owner for a Claude symlink-based redesign. |
| `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` | `"loads a project skill from .claude/skills when project skill settings are enabled"` | Existing live Claude project-skill validation | Real Claude Code already loads a project skill from `.claude/skills/<name>` with just `SKILL.md`. | This is the strongest existing evidence supporting a Claude symlink design when live symlink proof is blocked. |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-23 | Probe | Real `codex app-server` JSON-RPC initialize + `skills/list` against a temp workspace with `.codex/skills/whole_folder_symlink_probe -> <external-skill-root>` | Codex discovered the symlinked project skill and reported the external source-root `SKILL.md` path. | Whole-directory symlink fallback is viable for Codex discovery, and internal relative paths remain anchored to the original source tree. |
| 2026-04-23 | Probe | Real `codex app-server` JSON-RPC initialize + `skills/list` against a temp workspace skill containing only `SKILL.md` | Codex discovered the skill with no `agents/openai.yaml`. | A pure Codex whole-directory symlink does not need runtime-owned `openai.yaml` generation just to be discoverable. |
| 2026-04-23 | Probe | Real `claude -p --setting-sources project` against a temp `.claude/skills/<name>` whole-directory symlink fixture | The environment blocked the run with `Your organization does not have access to Claude. Please login again or contact your administrator.` | Live Claude symlink proof is blocked in this environment; design confidence must come from code-path evidence plus the existing direct-directory live test. |

### External Code / Dependency Findings

- Upstream repo / package / sample examined:
  - Local installed `codex` app-server binary through direct JSON-RPC probing
  - Local installed `claude` CLI (`Claude Code`) through direct CLI probing
- Version / tag / commit / release:
  - `claude --version` -> `2.1.90 (Claude Code)`
  - `codex` version not separately captured; live behavior was verified against the locally installed `codex app-server`
- Files, endpoints, or examples examined:
  - Codex `skills/list`
  - Claude project skill loading via existing integration test and attempted CLI prompt run
- Relevant behavior, contract, or constraint learned:
  - Codex project skill discovery accepts a directory symlink and does not require `agents/openai.yaml`.
  - Claude live project skill loading is already proven for a normal `.claude/skills/<name>` directory with only `SKILL.md`.
  - Live Claude verification is currently blocked by environment access, not by a discovered runtime incompatibility.
- Confidence and freshness:
  - Codex symlink discovery: High / 2026-04-23
  - Codex no-`openai.yaml` discovery: High / 2026-04-23
  - Claude stale-copy issue from local code: High / 2026-04-23
  - Claude whole-directory symlink viability: Medium / 2026-04-23 because live proof was blocked

### Reproduction / Environment Setup

- Required services, mocks, or emulators:
  - Local `codex app-server`
  - Local `claude` CLI
- Required config, feature flags, or env vars:
  - None for Codex probes beyond the local installed binary
  - `--setting-sources project` for the Claude project-skill probe
- Required fixtures, seed data, or accounts:
  - Temp workspaces with `.codex/skills` or `.claude/skills`
  - Temp external skill roots
- External repos, samples, or artifacts cloned/downloaded for investigation:
  - None
- Setup commands that materially affected the investigation:
  - `git fetch origin`
  - `git worktree add -b codex/whole-skill-symlink-materialization /Users/normy/autobyteus_org/autobyteus-worktrees/whole-skill-symlink-materialization origin/personal`
- Cleanup notes for temporary investigation-only setup:
  - Temp probe directories were removed at the end of each script run.

## Constraints

- Technical constraints:
  - A pure whole-directory symlink cannot safely store runtime-owned marker files inside the symlink target without mutating the source skill.
  - Removing the current suffix means fallback ownership/collision handling must become explicit when `.codex/skills/<name>` or `.claude/skills/<name>` already exists and points somewhere else.
- Environment constraints:
  - Live Claude project-skill probing is blocked here by account/org access.
- Third-party / API constraints:
  - Codex discovery viability is proven against the local installed `codex app-server`; Claude live symlink proof could not be completed against the local installed CLI because of access failure.

## Unknowns / Open Questions

- Unknown:
  - Whether live Claude Code explicitly filters out directory symlinks under `.claude/skills`, despite the existing direct-directory project-skill integration passing.
- Why it matters:
  - If Claude rejects symlinked skill directories, Codex and Claude would need different fallback designs.
- Planned follow-up:
  - Reuse or extend the existing Claude project-skill live integration path once a Claude-capable environment is available, or proceed with the refactor based on current evidence if the user prefers not to split the ticket.

## Implications

### Requirements Implications

- The Codex solution can require whole-directory symlink fallback instead of copied bundles because the real runtime proved it works.
- Codex should stop generating runtime-owned `agents/openai.yaml` for fallback materialization because it is not needed for discovery and conflicts with a pure directory-symlink design.
- Claude has the same stale-copy problem from the local backend code path, but the requirement should record that live symlink proof is currently weaker than Codex due environment access.

### Design Implications

- Both materializers should move from `copy + marker file inside materialized root` to `symlink + ownership inferred from symlink identity`.
- Codex should remove the hash suffix and use an intuitive workspace path, most likely `.codex/skills/<sanitized-skill-name>`.
- Cleanup/ownership should be based on `lstat`/`readlink`/`realpath` checks rather than a marker file inside the materialized root.
- Collision handling becomes explicit: if the intuitive workspace path already exists and is not a runtime-owned symlink to the same source root, the materializer should fail loudly instead of hiding the conflict behind a suffix.

### Implementation / Placement Implications

- Codex implementation should stay in:
  - `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts`
  - related Codex unit/integration tests
- Claude implementation should stay in:
  - `autobyteus-server-ts/src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts`
  - related Claude unit tests
- Codex bootstrap reuse-vs-materialize policy already lives in the right owner and likely needs only minor adjustments, if any.

## Re-Entry Additions

Append new dated evidence here when later stages reopen investigation.
