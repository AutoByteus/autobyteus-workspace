# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (replaces the SR-001 design "patch the private profile"; SR-001 is recorded in `solution-revision-record.md`)
- Approved requirements baseline: `requirements-doc.md` at SR-002; approved by the **User** on 2026-10-18 ("Okay, restore it. Let's go restore it." / "We shouldn't do anything considering NFS right now." / "the design before the NFS change was actually the correct direction").
- Behavior-defining supplements: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix/tickets/in-progress/workspace-skill-collision-fix/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md` (2026-10-18). `design-examples.md` not used.
- Project design-principle conflicts or discrepancies: none

## Current-State Read

In `v1.5.6-beta.1` each Claude/Codex/Grok run exposed configured skills through the shared `WorkspaceSkillMaterializer` (`shared/workspace-skill-materializer.ts` + `workspace-skill-links.ts`) via per-runtime profiles (`claude/claude-workspace-skill-materializer.ts` → `.claude/skills`, `codex/codex-workspace-skill-materializer.ts` → `.codex/skills`, `grok/grok-workspace-skill-materializer.ts` → `.grok/skills`). Codex first asked `skills/list` which configured skills it already discovered natively at the same path (`planWorkspaceSkillRequests`, `reconcile-discoverable`). Holders were released at run end (Claude `ClaudeSessionCleanup`, Codex `CodexThreadCleanup`, ACP factory release). The NFS-only `RuntimeSkillProfile` path ran only when `configuredSharedWorkspace(workingDirectory)` matched a shared network workspace.

Commit `2448e166bd` (NFS extraction) deleted the shared-workspace binding, deleted the three per-runtime materializer profiles, Codex preflight and cleanup, and made `preparePrivateRuntimeSkills` unconditional — causing both bugs. The shared materializer files themselves were left in the tree (only tests and an ACP alternative reached them). Antigravity skill handling (`antigravity/capsule/*`, launched with `--add-dir <workspace>`) and the AutoByteus runtime were not changed in skill behavior.

Between `v1.5.6-beta.1` and `HEAD` the affected runtime files changed only through `2448e166bd`, `a2023feff3` (unused imports), and merge `156ea2dacc` (investigation notes, "Restore Inventory").

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: restore spans Claude, Codex, Grok/ACP backends, provider factory wiring, Codex client manager, Claude SDK client, ~20 source files restored/edited and ~6 source files removed, plus restoring/removing ~15 test files. Content is a known-good prior state, but the file and subsystem span is broad.
- Architectural risk: `Low`
- Risk rationale: target is the shipped, user-proven beta.1 behavior; no new contract, persistence, security or concurrency behavior; the change removes one owner (NFS-only private profile) that has no remaining trigger. Main risk is mechanical (merge errors while restoring), covered by restored beta.1 tests, typecheck and new regression tests.
- Escalation trigger: any beta.1 file whose restore conflicts with a non-NFS change made after beta.1; any test that cannot be restored as in beta.1.

## Architecture Investigation Evidence

| Source / Command | Reference | Observation | Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| `git show v1.5.6-beta.1:…/prepare-private-runtime-skills.ts` | gate `configuredSharedWorkspace` | private path only on shared workspaces in beta.1 | Restore = materializer everywhere; private path has no trigger → remove | — |
| `git diff --stat v1.5.6-beta.1 HEAD -- <runtime areas>` | 35 files | Only the extraction (+ unused-import cleanup) changed them | Restore by file from beta.1 is safe | — |
| `git show 2448e166bd -- antigravity autobyteus` | AGY factory, AutoByteus factory | Only NFS env/shared-workspace lookups removed | No AGY/AutoByteus skill restore needed | — |
| `git show HEAD:…/workspace-skill-links.ts` `removeLinkToSource` | release | beta.1 removes a same-source link it adopted when the last holder releases | Restore exactly (DEC-103); follow-up F2 | — |

## Intended Change

Restore v1.5.6-beta.1 skill exposure for Claude, Codex and Grok on every workspace; remove the NFS-only private skill profile path; add regression tests for the user's setup and brand-new runs.

## Change Scope (Mandatory)

- In scope: UC-101, UC-102. Areas: Claude/Codex/Grok(ACP) skill exposure, release and wiring; Codex client manager and Claude SDK client private-skill options; provider preparation guard; provider factory composition; tests for these.
- Deliberately left alone: Antigravity and AutoByteus runtimes; all non-skill parts of the NFS extraction (shared workspace binding/mount observation/admission, scoped git environment, PTY, workspace registry, workspace resolvers); skill catalog/scope.
- Follow-ups (for `/project_task_manager`; `Needs user` where marked):
  - F1 (Needs user): the same NFS commit also changed two local-workspace behaviors outside skills: (a) Claude/Codex workspace resolvers now raise an error for any registered workspace that cannot be opened, instead of silently falling back to the temp workspace; (b) the AutoByteus runtime now opens a registered workspace that is not yet loaded, instead of falling back to the temp workspace. Both look like improvements (a run no longer silently runs in the temp folder), so they are kept; the user decides whether to keep or restore.
  - F2: beta.1 behavior, restored unchanged: for Claude (and Codex when Codex does not already discover it), a user-created link to the same skill is adopted and removed by the app when the run ends; the next run recreates it.
  - F3: beta.1 behavior, restored unchanged: Antigravity refuses a configured-skill run when `<workspace>/.agents/skills/<name>` exists (even a same-skill link).
  - F4: Leftover `<memory>/runtime-skill-profiles/` folders created by beta.2 runs are inert; optional cleanup.
  - F5: Process rule for the NFS project: NFS work must not change skill behavior on normal workspaces; any future NFS skill design needs user approval and must keep normal workspaces on this path.
  - F6: Add "workspace with same-skill links + brand-new run, per runtime" to the release real-app smoke checks.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior | Approved Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-101 | System | REQ-101, REQ-105 / AC-101..104 | Run create/restore | private profile, refuse on any entry | beta.1 materializer | DS-101, DS-102 |
| BEH-102 | System | REQ-102 / AC-105 | New run | ENOENT | starts (no memory-folder dependency) | DS-101 |
| BEH-103 | System | REQ-103 / AC-106 | — | private path in run path | removed | — |
| BEH-104 | System | REQ-104 / AC-107 | — | unchanged | unchanged | — |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (regression revert)
- Current design issue found: `Yes`
- Structural triggers: Legacy-cleanup trigger — keeping the private-profile path with no trigger would be a dead parallel path; remove it. Authoritative-boundary trigger checked: restored beta.1 owners (materializer as process-wide link registry; per-runtime profiles; Claude/Codex cleanup owners) have single entry points; no bypass introduced.
- Root cause classification: `Boundary Or Ownership Issue` — an NFS-scoped mechanism replaced the normal-workspace owner of skill exposure during an extraction.
- Refactor needed now: `Yes` — restore the beta.1 owner and remove the NFS-only path.
- Evidence: investigation notes "History", "Restore Inventory".
- Design response: below.
- Intentional deferrals: F1–F6.

## Terminology

- Restore: set a file's skill-related content to its `v1.5.6-beta.1` state, keeping non-skill post-beta.1 changes (NFS removals, unused-import cleanup).

## Legacy Removal Policy (Mandatory)

- Obsolete paths and files: NFS-only private skill profile path (list in Removal Plan).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. Run memory format unchanged. beta.2 leftover `<memory>/runtime-skill-profiles/` folders are inert (F4).

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-101 | Primary End-to-End | BEH-101, 102 | Run create/restore | Runtime session/thread with skills visible in the workspace skill folder | Runtime bootstrapper + `WorkspaceSkillMaterializer` | Restored path |
| DS-102 | Return-Event | BEH-101 | Run end / preparation failure | Holders released, links the app holds removed | `ClaudeSessionCleanup`, `CodexThreadCleanup`, ACP factory release | Restored cleanup |

## Primary Execution Spine(s)

- DS-101: `Run start/restore → AgentRunManager → BackendFactory.beginPreparation → Claude/Codex bootstrapper or ACP factory.prepare → (Codex: skills/list preflight) → WorkspaceSkillMaterializer.materializeConfiguredWorkspaceSkills → runtime session/thread (native discovery of <workspace>/.<runtime>/skills)`
- DS-102: `Run end/failed preparation → session/thread cleanup or preparation release → WorkspaceSkillMaterializer.cleanupMaterializedWorkspaceSkills`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-101 | As in beta.1: bootstrapper builds requests (Codex marks natively discoverable skills), materializer links missing skills into the workspace skill folder, accepts same-source links, repairs broken links, applies the collision policy to workspace-owned entries; runtime discovers them natively. | bootstrapper, materializer, runtime | materializer (paths), bootstrapper (requests) | per-runtime materialization profile |
| DS-102 | As in beta.1: holders released; link removed when last holder releases and it still points at the source. | cleanup owners, materializer | materializer | — |

## Spine Actors / Main-Line Nodes

`AgentRunManager`; runtime backend factories; Claude/Codex bootstrappers; ACP factory; `WorkspaceSkillMaterializer`; Claude session cleanup; Codex thread cleanup.

## Ownership Map

As beta.1: `WorkspaceSkillMaterializer` (process-wide per runtime profile) owns workspace skill paths and holders; bootstrappers/factories own requests and per-run receipts; cleanup owners release receipts.

## Thin Entry Facades / Public Wrappers

| Facade | Owner | Why | Must Not Own |
| --- | --- | --- | --- |
| `get{Claude,Codex,Grok}WorkspaceSkillMaterializer()` | `WorkspaceSkillMaterializer` | per-runtime profile + singleton | policy |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `src/agent-execution/backends/shared/runtime-skill-profile.ts` | Dead after restore: its only trigger (shared workspace binding) was deleted; user direction to not consider NFS | beta.1 materializer | In This Change | |
| `src/agent-execution/backends/shared/prepare-private-runtime-skills.ts` (incl. `privateSkillInstructions`) | same | — | In This Change | |
| `src/agent-execution/backends/acp/acp-private-skill-adapter.ts`, `grok/grok-private-skills.ts`, ACP factory `privateSkills` dependency/`profile` owner field/launch-arg and validate calls | same | Grok materializer | In This Change | ACP factory deps become beta.1's `skillMaterializer` (required) |
| `src/agent-execution/backends/codex/thread/codex-private-skill-discovery.ts`, Codex client manager `CodexPrivateSkillRoots`/profile key/`skills/extraRoots/set`, Codex thread manager profile lease + discovery + `privateSkillProfile.release()` | same | beta.1 Codex preflight + cleanup | In This Change | |
| `src/runtime-management/claude/client/claude-private-skill-discovery.ts`, `privateSkillPlugin` option and `plugins` in `claude-sdk-client.ts`, `privateSkillPlugin` in Claude query options | same | beta.1 Claude path | In This Change | |
| `privateSkillProfile` fields in Claude/Codex run contexts; `ownSkillProfile` in `ProviderPreparationGuard` and factories | same | beta.1 `ownSkill` / `ownCodexClient` | In This Change | |
| Tests only for the private path: `shared/runtime-skill-profile.test.ts`, `shared/prepare-private-runtime-skills.test.ts`, `shared/private-skill-bootstrappers.test.ts`, `shared/private-skill-discovery.test.ts`, `codex/codex-private-profile-process.test.ts`, `grok/grok-private-profile-process.test.ts`, `skills/github/private-profile-source-lifecycle.test.ts`; private-profile cases in `codex-app-server-client-manager.test.ts`, Claude cleanup/terminal-release tests, `e2e/agent-definitions/agent-package-private-skills.e2e.test.ts`, `e2e/skills/github-skill-runtime-harness.ts`, `fixtures/codex-owned-terminal-cli.mjs` | Dead with the path | Restored beta.1 tests + new regression tests | In This Change | Restore the beta.1 versions where they exist; otherwise drop the private-profile cases |

## Bounded Local / Internal Spines

As in beta.1 (materializer registry acquire/release state machine). No change.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk |
| --- | --- | --- | --- | --- | --- |
| Per-runtime materialization profile | DS-101 | materializer | `.claude/.codex/.grok` skill roots | runtime-specific folder | — |

## Ownership Boundaries

Restored as beta.1. No caller reaches materializer internals (`WorkspaceSkillLinks`).

## Boundary Encapsulation Map

| Boundary | Internals | Callers | Forbidden Bypass | Fix |
| --- | --- | --- | --- | --- |
| `WorkspaceSkillMaterializer` | `WorkspaceSkillLinks`, registry | bootstrappers, ACP factory, cleanup owners | direct link manipulation | — |

## Dependency Rules

- Runtime backends may depend on the materializer and their per-runtime profile getters.
- No skill code may import `workspaces/shared-workspace-*` (deleted) or any NFS concept.
- No reintroduction of the deleted NFS non-skill pieces.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `materializeConfiguredWorkspaceSkills({runId, workingDirectory, requests, workspaceCollisionPolicy, onAcquired, assertAccepting})` | one run's workspace skill links | beta.1 | runId + workspace | unchanged from beta.1 |
| `cleanupMaterializedWorkspaceSkills(descriptors)` | holders | beta.1 | descriptor | unchanged |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| as beta.1 | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift | Action |
| --- | --- | --- | --- | --- |
| as beta.1 | — | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Skill exposure | beta.1 materializer (still in tree) | Reuse | proven |

## Subsystem / Capability-Area Allocation

| Area | Owns | Decision |
| --- | --- | --- |
| `agent-execution/backends/shared` | materializer, links, collision policy | Reuse (restore callers) |
| `agent-execution/backends/{claude,codex,grok,acp}` | runtime wiring/cleanup | Restore |
| `runtime-management/{claude,codex}/client` | remove private-skill options | Modify |
| `agent-execution/providers`, `compositions` | wiring | Restore |

## Final File Responsibility Mapping (Restore Inventory)

Restore from `v1.5.6-beta.1` (skill content only; keep post-beta.1 non-skill changes):

| File | Action |
| --- | --- |
| `src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts` | Restore (re-add) |
| `src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` | Restore (re-add) |
| `src/agent-execution/backends/grok/grok-workspace-skill-materializer.ts` | Restore (re-add) |
| `src/agent-execution/backends/codex/backend/codex-thread-cleanup.ts` | Restore (re-add); `backend/index.ts` export |
| `src/agent-execution/backends/claude/backend/{claude-session-bootstrapper,claude-agent-run-backend-factory,claude-agent-run-context}.ts` | Restore skill parts; drop `preparePrivateRuntimeSkills`/profile |
| `src/agent-execution/backends/claude/session/{claude-session-cleanup,claude-session-manager,claude-session-query-options}.ts` | Restore skill parts (`hasMaterializedSkills` from `materializedConfiguredSkills`); keep NFS `scopedProjectGitEnvironment` removed; drop private plugin |
| `src/agent-execution/backends/codex/backend/{codex-thread-bootstrapper,codex-agent-run-backend-factory,codex-agent-run-context}.ts` | Restore skill parts incl. `planWorkspaceSkillRequests` preflight and `ownCodexClient`; drop profile |
| `src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Restore beta.1 cleanup; drop profile lease/discovery |
| `src/runtime-management/codex/client/codex-app-server-client-manager.ts` | beta.1 shape without the NFS scoped env and without private profile key/extraRoots |
| `src/runtime-management/claude/client/claude-sdk-client.ts` | Remove `privateSkillPlugin`/plugins/validation |
| `src/agent-execution/backends/acp/backend/acp-agent-run-backend-factory.ts` | Materializer path only (beta.1 non-shared path) |
| `src/agent-execution/backends/grok/grok-build-agent-run-backend-factory.ts` | Restore `skillMaterializer: getGrokWorkspaceSkillMaterializer()` |
| `src/agent-execution/backends/provider-preparation-guard.ts` | Restore `ownSkill`, `ownCodexClient`; remove `ownSkillProfile` |
| `src/agent-execution/providers/agent-provider-factory-builder.ts`, `src/compositions/create-process-agent-provider-factory-builder.ts` | Restore materializer/clientManager/threadCleanup wiring |
| `src/agent-execution/backends/shared/workspace-skill-collision-policy.ts` | Unchanged from beta.1 |
| Not restored (NFS, keep removed): `workspaces/shared-workspace-binding.ts`, `shared-workspace-mount-observation.ts`, `services/shared-run-workspace-admission.ts`, `autobyteus/native-shared-workspace.ts`, `runtime-management/shared/scoped-project-git-environment.ts`, PTY and workspace-resolver NFS hunks, AGY env hunk | — |

Tests: restore beta.1 `claude/claude-workspace-skill-materializer.test.ts`, `codex/codex-workspace-skill-materializer.test.ts`, `codex/backend/codex-thread-bootstrapper.test.ts` (skill parts), `integration/agent-execution/codex-thread-bootstrapper.integration.test.ts`, and the beta.1 skill-related parts of the other tests changed by `2448e166bd`; keep `shared/workspace-skill-materializer*.test.ts`, `skills/github/runtime-generation.test.ts`, `skills/services/skill-service-all-installed-scope.test.ts` as on HEAD (they test the restored materializer).

New regression tests (REQ-105):
- Materializer/bootstrapper level, per runtime (Claude `.claude/skills`, Codex `.codex/skills`, Grok `.grok/skills`): workspace entry is an absolute link to the configured skill folder (the user's shape, e.g. `…/agents/<agent>/skills/<skill>`), configured-skill agent, new run → run prepares, link still present and pointing at the same folder while the run holds it; resumed run likewise.
- Different skill (real folder, different `SKILL.md`) with the same name → beta.1 collision error for configured-skill agent; preferred for all-installed.
- Brand-new run with absent member memory folder → preparation succeeds (Claude/Codex/Grok).
- E2E (server, test-owned data and workspace): brand-new run of an agent with configured skills in a workspace with and without same-skill links under `.claude/skills` and `.codex/skills`.

## Applied Patterns

Registry (materializer) as in beta.1.

## Target Subsystem / Folder / File Mapping

As in the Restore Inventory; no new folders.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Note |
| --- | --- | --- | --- | --- |
| as beta.1 | — | Yes | Low | — |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Restore method | `git show v1.5.6-beta.1:<file>` as the reference; re-apply only non-skill post-beta.1 changes (NFS removals, unused imports) | Hand-writing a new variant of the beta.1 logic | Exactness |
| NFS gate | Remove the private branch entirely | `if (false /* shared */)` or keeping `preparePrivateRuntimeSkills` returning null | No dead path |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep private-profile path behind a flag | Future NFS | Rejected | NFS designs its own approach later with approval (F5) |
| SR-001 classifier patch | Earlier design | Rejected by user direction | beta.1 restore |

## Change / Refactor Sequence

1. Discard the uncommitted SR-001 implementation in the worktree: unstage and restore the staged SR-001 deletions (`workspace-skill-links.ts`, `workspace-skill-materializer.ts`, `workspace-skill-materializer*.test.ts`, `skills/github/runtime-generation.test.ts`), restore all modified tracked files to `HEAD`, and remove the untracked `shared/workspace-skill-entry.ts` and `workspace-skill-entry.test.ts`. Keep the ticket folder (AR-002).
2. Restore source per the inventory; remove the private-profile path; typecheck.
3. Restore beta.1 tests; remove private-path tests; add regression tests.
4. Run server unit, integration (`test:integration:prepare` once), typecheck, relevant E2E.
5. Downstream: API/E2E real runtime checks (Claude, Codex, Grok; AGY unchanged smoke) and isolated Electron real-app check with a test data package and a test workspace with same-skill links under `.claude/skills` and `.codex/skills`; then delivery `v1.5.6-beta.4`.

## Key Tradeoffs

- Exact restore keeps beta.1 quirks (F2, F3) to avoid new behavior in an urgent beta.
- Removing the NFS private path now means a future NFS skill design starts fresh (user direction).

## Risks

- Restore merge errors → mitigated by beta.1 tests, typecheck, regression tests.
- Tests changed after beta.1 for unrelated reasons may need adaptation; keep their non-skill intent.

## Guidance For Implementation

- Use the `v1.5.6-beta.1` tag as the reference for every restored file; diff restored files against it to prove only non-skill/NFS differences remain.
- Never use the user's real workspaces or `.claude`/`.codex` folders in tests or checks.
