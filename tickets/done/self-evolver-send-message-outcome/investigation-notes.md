# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete — dedicated worktree created from latest `origin/personal`.
- Current Status: Investigation complete and requirements design-ready for small follow-up contract cleanup.
- Investigation Goal: Understand current self-evolver direct-message behavior and define the minimal delta for replacing the target-facing `self_evolution_outcome` message type with a target-oriented skill update message contract.
- Scope Classification (`Small`/`Medium`/`Large`): Small.
- Scope Classification Rationale: The global `send_message_to(target_agent_run_id=...)` architecture is already merged. The remaining change is prompt/grant/message-type/docs/tests cleanup.
- Scope Summary: Change self-evolver target direct message type to `skill_update` and make final `reference_files` guidance dynamic for all files inside editable skill roots.
- Primary Questions To Resolve:
  1. Is the global direct-run send-message architecture already present? Yes.
  2. What exact message type should the target agent receive? Recommendation: `skill_update`.
  3. Should reference files be fixed or dynamic? Dynamic based on actual changed/relevant files inside editable skill roots.
  4. Does this require new notification machinery? No.

## Request Context

The user confirmed that the current architecture is now much simpler because the Skill Self-Evolver can use `send_message_to` directly. They identified that `message_type: "self_evolution_outcome"` is semantically wrong from the receiver perspective. The target agent should receive a message that means its skill guidance has been updated. The user also confirmed that the self-evolver can change any file inside the skill package root, so `reference_files` must be chosen dynamically from actual edits/relevance rather than being fixed to `SKILL.md`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git superrepo/workspace.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolver-send-message-outcome`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolver-send-message-outcome/tickets/done/self-evolver-send-message-outcome`
- Current Branch: `codex/self-evolver-send-message-outcome`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolver-send-message-outcome`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `origin/personal` resolved to `a267513eaff06e7d40a373472f74b214d4d997cb` (`feat(agent-communication): add global active run messaging`). Main `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` also matches this commit.
- Task Branch: `codex/self-evolver-send-message-outcome`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal` / `origin/personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The larger global direct-run messaging implementation is already merged. Do not redesign it; implement only the target-facing message contract cleanup.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-12 | Command | `git fetch origin personal`; `git rev-parse HEAD`; `git rev-parse origin/personal` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Verify latest baseline | Main repo `personal` matches `origin/personal` at `a267513e...`. | No |
| 2026-06-12 | Command | `git worktree add -b codex/self-evolver-send-message-outcome ... origin/personal` | Create dedicated ticket worktree | Worktree created from latest `origin/personal`. | No |
| 2026-06-12 | Code | `autobyteus-server-ts/src/agent-communication/services/send-message-to-tool-contract.ts` | Inspect public tool contract | `send_message_to` has exactly one selector: `recipient_name` or `target_agent_run_id`. `target_agent_run_id` is exact active `AgentRun.runId`. | No |
| 2026-06-12 | Code | `autobyteus-server-ts/src/agent-communication/services/send-message-to-dispatcher.ts` | Inspect routing boundary | `target_agent_run_id` routes through `GlobalAgentRunMessageRouter`; `recipient_name` remains team-context delivery. | No |
| 2026-06-12 | Code | `autobyteus-server-ts/src/agent-communication/services/global-agent-run-message-router.ts` | Inspect direct delivery | Router validates grants, requires active target run, posts runtime input, emits `INTER_AGENT_MESSAGE`, and records grant usage. | Update tests for `skill_update` grant |
| 2026-06-12 | Code | `autobyteus-server-ts/src/agent-communication/services/direct-agent-run-message-grant-registry.ts` | Inspect grant semantics | Grants restrict target ids, message types, reference files/roots, delivery count, and expiry. | Update allowed message type in self-evolver strategy/tests |
| 2026-06-12 | Code | `autobyteus-server-ts/src/agent-communication/services/global-agent-run-message-runtime-builders.ts` | Inspect target-visible message shape | Direct messages are model-visible with sender identity, content, reference files, and metadata. | No |
| 2026-06-12 | Code | `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md`; `agent-config.json` | Inspect helper instructions/tools | Helper has `run_bash` and `send_message_to`; current instruction says `self_evolution_outcome`. | Update instruction to `skill_update` and dynamic refs |
| 2026-06-12 | Code | `autobyteus-server-ts/src/self-evolution/services/strategies/single-agent-evolver-strategy.ts` | Inspect current self-evolver prompt/grant | Strategy registers `allowedMessageTypes: ["self_evolution_outcome"]`, prompt says `self_evolution_outcome`, metadata has `self_evolution_outcome_message_type`. | Update to `skill_update` and target message metadata |
| 2026-06-12 | Code | `autobyteus-server-ts/src/self-evolution/services/self-evolution-record-lifecycle.ts`; `self-evolution-target-notification-service.ts` | Confirm no new notification needed | `finalizeRecord` accepts override; generic notification fallback exists but current strategy supplies grant usage summary. | No new notification design |
| 2026-06-12 | Code | `autobyteus-server-ts/src/self-evolution/services/self-evolution-skill-target-resolver.ts` | Confirm skill target scope | Skill root and `SKILL.md` are resolved, but skills are packages/directories; writable target roots are the edit boundary. | Prompt should allow any file in root |
| 2026-06-12 | Command | `rg -n "self_evolution_outcome|send_message_sent|notificationSummary|outcome_message_type|message_type" ...` | Locate affected source/docs/tests | Current string appears in strategy, built-in agent instruction, docs, unit tests, and web docs. | Update all in scope |

## Current Behavior / Current Flow

Current baseline flow:

```text
User clicks Self improve
  -> Web SelfEvolutionComposerCta calls GraphQL startAgentRunSelfEvolution/startTeamMemberSelfEvolution
  -> SelfEvolutionService resolves active target, launch snapshot, skill targets, and anonymized work-history evidence
  -> SingleAgentEvolverStrategy launches visible Skill Self-Evolver run with run_bash + send_message_to
  -> Strategy registers a one-use direct-message grant for message_type "self_evolution_outcome"
  -> Strategy posts task prompt with editable skill roots, evidence, target_agent_run_id, and outcome message-type instruction
  -> Helper edits/no-ops skill package files
  -> Helper may call send_message_to(target_agent_run_id, message_type "self_evolution_outcome", content, reference_files)
  -> GlobalAgentRunMessageRouter validates grant and active target, then posts model-visible direct message
  -> Strategy summarizes grant usage into SelfEvolutionRunRecord.notificationSummary
```

Target behavior keeps the same spine but replaces the direct message contract:

```text
Helper changes durable skill package files
  -> send_message_to({ target_agent_run_id, message_type: "skill_update", content, reference_files })
  -> target run receives a model-visible skill update message
```

No durable skill package change:

```text
Helper makes no skill file changes
  -> no target send_message_to call
  -> helper's own final response may explain no-op
  -> record can summarize send_message_not_attempted
```

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Contract Cleanup.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness / Naming Drift.
- Refactor posture evidence summary: The existing architecture is healthy. The weak part is only the semantic string and prompt contract exposed to the target message flow.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `send-message-to-dispatcher.ts` | Clean one-tool selector split already exists. | No router refactor needed. | No |
| `global-agent-run-message-router.ts` | Grant-aware active-run direct delivery exists. | Reuse existing owner. | Only update tests if literals change |
| `single-agent-evolver-strategy.ts` | Current literal is producer-oriented and repeated in grant/prompt/metadata. | Small contract cleanup needed. | Yes |
| `skill-evolver/agent.md` | Helper instruction uses `self_evolution_outcome`. | Prompt should become target-oriented. | Yes |
| Skill package model | Skills are directories with supporting files. | Reference file guidance must be dynamic. | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution/services/strategies/single-agent-evolver-strategy.ts` | Launch helper, register grant, build prompt, summarize delivery | Main implementation locus for message type and reference guidance. | Modify here. |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md` | Durable helper instruction | Needs target-oriented message type and dynamic reference-file instruction. | Modify here. |
| `autobyteus-server-ts/src/agent-communication/services/global-agent-run-message-router.ts` | Direct active-run delivery | Healthy; no production change expected except tests. | Reuse. |
| `autobyteus-server-ts/src/agent-communication/services/direct-agent-run-message-grant-registry.ts` | Grant validation | Healthy; no production change expected. | Reuse. |
| `autobyteus-server-ts/tests/self-evolution/single-agent-evolver-strategy.test.ts` | Strategy prompt/grant behavior coverage | Currently expects `self_evolution_outcome`. | Update. |
| `autobyteus-server-ts/tests/unit/agent-communication/global-agent-run-message-router.test.ts` | Grant behavior tests | Uses self-evolution outcome examples. | Update to `skill_update` or generic names. |
| `autobyteus-server-ts/docs/modules/self_evolution.md` and related docs | Current documented contract | Documents `self_evolution_outcome`. | Update. |

## Runtime / Probe Findings

No runtime probe was needed for this design pass. Static code inspection is sufficient because the requested change is a small prompt/grant/message-type contract cleanup. Downstream API/E2E should decide whether to run existing self-evolution and global-routing coverage after implementation.

## External / Public Source Findings

None. This is internal architecture/product semantics.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for investigation.
- Required config, feature flags, env vars, or accounts: None for investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin personal`; `git worktree add -b codex/self-evolver-send-message-outcome ... origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The previous larger architecture goal is already implemented on `origin/personal`.
2. `self_evolution_outcome` is now the only product/design mismatch: it describes the helper workflow rather than the target-facing event.
3. `skill_update` is a better exact message type because it is short, target-oriented, and covers one or many files inside one or more skill package roots.
4. Reference files must remain dynamic because the helper may update/create/reorganize supporting files inside the skill package, not just edit `SKILL.md`.
5. No new notification service should be introduced; the existing direct `send_message_to` route is the correct boundary.

## Constraints / Dependencies / Compatibility Facts

- Direct exact-run route is live-only.
- Direct exact-run messages are model-visible and emit direct `INTER_AGENT_MESSAGE`; they do not use Team Communication projection.
- The helper direct-message grant should continue to restrict target run, allowed message type, reference roots, max accepted deliveries, and expiry.
- Skill package edit scope is whole editable skill root, not only `SKILL.md`.
- In-scope behavior should be clean-cut; do not keep a dual accepted `self_evolution_outcome`/`skill_update` target-facing message contract.

## Open Unknowns / Risks

- Automatic skill reload is not implemented; the delivered message remains the target agent's model-visible instruction to use/reload updated guidance.
- Deleted files cannot be useful `reference_files`; content should mention deletion and reference surviving relevant files.

## Notes For Architect Reviewer

This is intentionally small. The design should preserve the existing healthy global direct-run messaging architecture and only correct the self-evolver target-facing message contract from `self_evolution_outcome` to `skill_update`, with dynamic reference-file guidance for actual skill package changes.
