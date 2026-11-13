# Handoff — Architecture Design Complete (autobyteus-460)

- Result: `Architecture Design Complete`, `task_size: Large`, `architectural_risk: High`
- Package: `running-agent-config-reload-460`, Project Task `autobyteus-460` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager` for the user
- Current revision: SR-002
- Workspace:
  - worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/running-agent-config-reload-460`, branch `codex/running-agent-config-reload-460`;
  - base `origin/personal` at `7b8bcf932fca35e8937dd3158d6a05ebbca5e227`;
  - finalization target `origin/personal`.
  - The ticket documents are not committed yet (the user has not asked for commits). Read them from the worktree.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/running-agent-config-reload-460/tickets/in-progress/running-agent-config-reload-460/`

## Original request and goal

When the user adds a skill to an agent's configuration while a run of it is going, the run should pick it up and the agent should be told, instead of waiting for a new run. Incidents:
- 2026-11-10: the GitHub skill added to the Project Task Manager;
- 2026-11-13: the reflection skill.

Constraints: keep it simple; integration access only through the autobyteus-337 skill rule; the user approves the direction before the build (done).

## Approval basis

The user approved the direction on 2026-11-13 in the Solution Designer's conversation (quotes in `requirements-doc.md` Document Status and SR-002):
- a "now available" message with the `SKILL.md` path on every runtime;
- the runtime also sets up an added skill (links; Antigravity capsule; native: no system prompt change, cache follow-up FU-006 already sent to the PM);
- removal is a message only (unlinking: FU-007);
- integration access added mid-run starts at the restart, and the message says so;
- instructions and semantic memory: follow-up FU-005.

## What the reviewer should look at first

- DS-003 lifecycle: acquiring shared workspace links while a run is active and racing its release. Design: `onAcquired` pushes into the run-held list and `assertAccepting` checks the run is active; release is idempotent. See design "Concrete Examples" and investigation notes, Architecture Investigation Findings.
- The new backend contract method `applyDefinitionSkills` on all runtimes, and `RunWorkspaceSkills` as the one owner of the add-only policy (Codex planner passed in).
- The changed restored-run rule (DEC-002) on existing `seen_skill_versions.json` records: decided `Directly Usable — No Migration`.
- `IntegrationRunAccess.integrationsStartingOnRestart`: a read only; nothing is granted.
- The one recorded deviation: the subsystem name "skill update notices" now also drives setup (Principle 15; reason in the design).

## Evidence and open items

- Claude CLI picks up a skill folder linked mid-session (Measured): `evidence/claude-skill-hot-reload-probe.mjs`, `evidence/claude-skill-hot-reload-probe-output.txt`.
- U-001: whether Codex, Grok, DeepSeek and Antigravity list a newly linked folder before their next activation is unproven. It is not required, because the message gives the path.
- Follow-ups FU-001 … FU-007 in `follow-ups.md` (FU-006 already sent to the PM at the user's request; the rest are sent when the ticket leaves the team).

## Expected output

Independent architecture review of `design-spec.md` against the approved `requirements-doc.md` (SR-002).

## Files

- `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `follow-ups.md`, `evidence/`.

## Route

`get_handoff_rules`: Large / High → `/software_engineering_team/architecture_reviewer` (sent 2026-11-13).

## Round 2 — revised for ARCH-REV-001 (SR-003, 2026-11-13)

- Result: `Architecture Design Complete` (revised), `task_size: Large`, `architectural_risk: High` (unchanged). Requirements unchanged (Approved, SR-002).
- AR-001 (blocking), confirmed in the code. Fix: `RunWorkspaceSkills` is the single holder of a run's workspace links from preparation to release.
  - It owns a `closed` fact and one in-flight add.
  - `release()` sets `closed`, awaits the add, then releases; it is the only release path on Claude (cleanup `skills` stage), Codex (`releasePreparation`) and ACP (`releaseResources`), including failed preparation.
  - The guard reads `closed`, never `isActive()`.
  - Preparation lists (`ProviderPreparationGuard.ownSkill`, factory `skills` arrays, `owner.skills`) and run-context `materializedConfiguredSkills` are removed.
  - AGY needs no release ordering: its links live in its per-run capsule, never shared and kept for resume (`agy-run-capsule.ts:24-31, 91-118`); its `active` flag is not a release fact (an interrupt also clears it, `agy-agent-run-backend.ts:121`).
  - See the design's DS-003 narrative, Ownership Map, Interface Mapping, Examples, Removal Plan and Sequence.
- AR-002: one name per acquisition; a failed name is logged, not applied, and retried on the next save. AGY links one binding per call; its manifest lists only the names that succeeded.
- AR-003: stated in Risks; given to the live check.
- AR-004: added and removed in the tracker's `skillDirs` terms; AC-004 walked through in Guidance.
- Also: investigation-notes correction; `docs/design-cases.md` Case 22 added.
- Route: `/software_engineering_team/architecture_reviewer` (round 2).
