# Requirements Doc

## Status (`Design-ready`)

Approved by the user on 2026-08-21. The user explicitly approved the broken-link repair policy and authorized the solution work to continue.

## Goal / Problem Statement

Make agent startup resilient to stale workspace-skill materialization. When an optional configured skill has moved or is no longer available, an AutoByteus workspace link whose target no longer exists must not prevent an otherwise valid agent run from starting. AutoByteus must remove only the broken symbolic link, recreate it when the skill has a valid current source, and otherwise warn and omit the skill.

The reported Daily Assistant + Codex + `gpt-5.6-luna` failure is the reproducing symptom. It is not a Luna, provider, or Codex thread-start compatibility problem.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | A persistent `.codex/skills/shell-first-operating-practice` symlink points to the skill's deleted former agent-local source. The current source resolves from the shared skills repository, but the materializer treats the different symlink target as a fatal collision and aborts activation. | Recognize that the existing target no longer exists, unlink only that broken symlink, create a replacement link to the valid current source, and let activation continue. | Valid configured skills remain available at the runtime's normal workspace skill path. User or target content is never deleted. | FR-002, FR-003, FR-007; AC-001, AC-002, AC-006 |
| BEH-002 | The materializer treats every different symlink as one collision state, whether its target is live or missing. | Distinguish a broken symlink from live different symlinks and non-symlink collisions. Automatically repair only the broken-link state; preserve a safe hard boundary around live/unowned content. | Same-source symlinks remain idempotent. Live different symlinks and non-symlink paths are not overwritten or trusted. | FR-002, FR-003, FR-006; AC-003, AC-007, AC-008, AC-009 |
| BEH-003 | The concrete materializer exception is attached as the preparation error's cause, while logs and the UI normally expose only `Failed to prepare agent run ...`. | Reconciliation and omission produce actionable server warnings. Genuine preparation failures retain the stable user-safe outer error and also log the underlying error object/cause for diagnosis. | Command error codes and the user-safe UI error contract remain unchanged. | FR-004; AC-004 |
| BEH-004 | A genuinely unresolvable configured skill is already warned about and skipped, and activation proceeds when no later materialization collision intervenes. A broken runtime link for such a configured name is not currently reconciled because only resolved `Skill` objects reach the materializer. | Preserve warning-and-skip startup. If the configured runtime path is a broken symlink, remove only that broken link and leave the path absent; do not manufacture a source. | Optional missing skills remain non-blocking. Invalid/unsafe configured names do not become filesystem paths. | FR-001, FR-002, FR-003; AC-005, AC-006 |
| BEH-005 | Direct Codex `thread/start` succeeds with `gpt-5.6-luna`; the observed activation fails earlier in AutoByteus workspace-skill preparation. | Make no provider/model mapping or fallback change for this defect. | Selected runtime and model reach the existing backend unchanged after preparation succeeds. | FR-005; AC-010 |

## Investigation Findings

- Daily Assistant declares `shell-first-operating-practice`.
- The skill moved on 2026-08-05 from the Daily Assistant package to `/Users/normy/autobyteus_org/autobyteus-skills/shell-first-operating-practice`.
- The persistent link was created on 2026-06-25 and still targets the deleted former location.
- The delivered AutoByteus 1.4.53 production backend reproduces `ACTIVATION_FAILED` with an isolated copy of the stale link.
- Removing only that isolated broken link, with all other variables unchanged, makes the same Daily Assistant/Codex/Luna activation succeed and produces the correct new link.
- Starting without any resolvable copy of the configured skill already warns, skips the skill, and succeeds.
- Installed Codex advertises `gpt-5.6-luna`, and direct `thread/start` succeeds with the same model and workspace.
- The completed shell-CWD ticket does not change activation, skill resolution/materialization, or preparation error wrapping. This defect is present on the personal base branch and is isolated to this new ticket.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/evidence/full-stack-reproduction/experiment-report.md` | Evidence: isolated production reproduction and A/B controls | FR-001, FR-002, FR-004, FR-005, FR-007 | AC-001, AC-004, AC-005, AC-010 | Complete; approval N/A (evidence only) | Establishes the exact failure, causal stale-link variable, successful control, and missing-skill baseline. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/evidence/reported-ui-error.png` | Evidence: reported Electron UI state | FR-004 | AC-004 | Complete; approval N/A (evidence only) | Confirms the user-visible generic preparation failure that motivated the diagnostic requirement. |

## Design Health Assessment (Mandatory)

- Change posture (`Bug Fix`): persisted workspace-skill projection repair plus diagnostic correction.
- Initial design issue signal (`Yes`): the expected-path state model omits the reachable broken-symlink state.
- Root cause classification (`Missing Invariant` and `Duplicated Policy Or Coordination`): the lifecycle lacks an invariant for reconciling disposable links after a skill-source relocation, and Codex/Claude duplicate the same materialization policy.
- Refactor posture (`Likely Needed`): one shared materialization policy should own path inspection, safe reconciliation, holder tracking, and cleanup while runtime-specific composition retains `.codex` versus `.claude` placement.
- Evidence basis: production A/B reproduction; exact materializer exception; nearly identical Codex and Claude materializers; current same-source/collision/cleanup unit suites.
- Requirement or scope impact: the repair must apply consistently to both runtime workspace-link implementations without changing provider/model behavior or broad skill discovery.

## Recommendations

1. Make broken symlink a first-class materialization state rather than treating it as a live collision.
2. Carry safe configured-skill resolution outcomes far enough to remove a broken link even when no current skill source resolves.
3. Centralize the common Codex/Claude materialization state machine; retain only runtime placement/configuration at runtime-specific boundaries.
4. Keep live different-symlink and non-symlink collisions fatal and non-destructive because the runtime auto-discovers those paths and AutoByteus cannot safely trust or replace them.
5. Log the original preparation error object server-side while preserving the stable generic error exposed through the command/UI boundary.

## Scope Classification (`Medium`)

The user-facing defect is narrow, but the safe fix crosses configured-skill resolution outcomes, shared workspace materialization, both runtime composition points, and preparation diagnostics. It does not require a UI, database, model-catalog, or external API change.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- **UC-001 — Repair a moved skill:** A user starts or restores an agent whose active configured skill resolves at a new source while its expected runtime workspace path is a symlink to a missing old target.
- **UC-002 — Omit an unavailable skill:** A user starts or restores an agent whose optional configured skill has no current valid source and whose expected runtime path is missing or is a broken symlink.
- **UC-003 — Preserve safe collision handling:** Startup encounters a live different symlink or a non-symlink at the expected configured-skill path.
- **UC-004 — Diagnose a genuine preparation failure:** Run preparation fails for a reason that cannot be safely degraded or reconciled.
- **UC-005 — Preserve normal runtime/model activation:** A configured skill is already correctly materialized, or no materialization is required, and the selected runtime/model starts through its existing path.

### Out of Scope

- Codex model-catalog changes, Luna identifier translation, or provider/model fallback.
- Changes to the completed shell-CWD ticket, its branch, or its artifacts.
- A new Activity event, toast, or other frontend warning transport; actionable warnings for this ticket are server diagnostics.
- Broad skill catalog/discovery, skill authoring, or agent-package migration redesign.
- Automatically deleting or overwriting a live different symlink, directory, or file at a runtime workspace skill path.
- A background filesystem sweep. Reconciliation occurs on demand for configured skills during run bootstrap.
- Repair of unrelated user filesystem corruption or manual tampering.

### Preserved Behavior Boundary

- Preserve BEH-003's stable user-safe command/UI error contract and BEH-005's provider/model behavior.
- Preserve same-source link reuse and holder-count cleanup under AC-007.
- Preserve non-destructive collision behavior under FR-003 and AC-008/AC-009.
- A link operation may unlink only the runtime workspace link path itself; it must never traverse or delete the target.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It must not be treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The solution designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Functional Requirements

- **FR-001 — Preserve non-blocking missing-skill behavior:** A safe configured skill name that cannot be resolved to a valid current skill remains warning-only and does not independently prevent startup.
- **FR-002 — Repair only broken links:** At an active configured skill's expected runtime materialization path, a symlink whose resolved target no longer exists must be unlinked at the link path only. If a valid current source exists, AutoByteus must then create a replacement link to that source; otherwise the path remains absent and the skill is omitted.
- **FR-003 — Enforce the non-destructive safety boundary:** AutoByteus must not traverse or delete target content, overwrite a non-symlink, replace a different symlink whose target still exists, or accept unexpected live content as the configured skill.
- **FR-004 — Provide actionable diagnostics:** Broken-link repair/omission warnings must identify runtime, run, skill name, workspace link path, prior target, current source when any, and disposition. Genuine preparation failures must log their underlying error/cause server-side while retaining the existing user-safe outer failure.
- **FR-005 — Preserve provider/model selection:** The selected runtime and `gpt-5.6-luna` identifier must pass through existing configuration unchanged; no fallback is introduced.
- **FR-006 — Keep the materialization policy consistent across runtime profiles:** Codex and Claude must share the same path-state and repair policy while preserving `.codex/skills` and `.claude/skills` placement respectively.
- **FR-007 — Recover existing installations on demand:** Existing broken materialization links must be repairable during normal create/restore bootstrap without manual cleanup or a database migration.

## Acceptance Criteria

- **AC-001:** Given the observed broken Codex symlink and the valid shared skill source, startup removes only the broken link, creates `.codex/skills/shell-first-operating-practice` pointing to the shared source, and activates Daily Assistant without manual cleanup.
- **AC-002:** The repaired link exposes the valid current skill source; target source files remain intact before, during, and after repair.
- **AC-003:** The equivalent broken-link state under `.claude/skills` follows the same repair decision and preserves Claude-specific placement.
- **AC-004:** Repair/omission has an actionable server warning. If preparation fails for a non-degradable reason, server diagnostics include the original error/cause while the command/UI retains its stable generic failure and code.
- **AC-005:** A configured safe skill name with no resolvable source and no live collision is warned about and does not independently block startup.
- **AC-006:** If that unresolved skill's expected runtime path is a broken symlink, AutoByteus removes only the link, warns that no replacement source exists, leaves the path absent, and continues.
- **AC-007:** A same-source symlink is reused idempotently, holder counting still prevents premature cleanup, and final cleanup unlinks only the still-matching materialization link.
- **AC-008:** A different symlink whose target exists is not overwritten, deleted, or trusted; startup fails safely and server diagnostics expose the cause.
- **AC-009:** A file or directory at the expected materialization path is not overwritten, deleted, or trusted; startup fails safely and server diagnostics expose the cause.
- **AC-010:** The selected `codex_app_server` runtime and `gpt-5.6-luna` identifier reach the existing Codex thread configuration unchanged after workspace preparation.
- **AC-011:** Regression coverage distinguishes missing path, same-source symlink, broken symlink with replacement source, broken symlink without replacement source, live different symlink, and non-symlink collision for the shared policy, plus Codex/Claude placement and preparation-cause logging.

## Constraints / Dependencies

- Codex and Claude discover workspace skills from runtime-owned conventional directories; a live collision cannot be safely ignored because doing so could load unexpected instructions.
- Symbolic-link inspection must use `lstat`/`readlink`; it must not infer link absence from `stat` alone.
- Expected workspace directory names must be derived only from configured names already accepted by the configured-skill resolver. Invalid/unsafe raw names must never enter materialization.
- Filesystem races must fail closed: re-check the link identity immediately before unlinking a broken link and do not replace a path that changed into live or non-symlink content.
- Existing run lifecycle cleanup and runtime-specific working-directory resolution remain authoritative.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: disposable runtime workspace skill symlinks under `<workspace>/.codex/skills/<name>` and `<workspace>/.claude/skills/<name>`; expected count is small and bounded by configured skills per active workspace.
- Required outcome (`Discard or Rebuild`): the broken link projection is discarded and rebuilt on demand from the authoritative current configured-skill resolution when available.
- Existing data to preserve, discard/rebuild, transform, or quarantine: preserve current skill source directories and all non-symlink/live collision content; discard only a verified broken link at the expected runtime path; recreate only the link.
- Unacceptable data loss or corruption: deleting/traversing a link target, deleting a file/directory, overwriting a live different symlink, or linking to an unresolved/invalid source.
- Relevant availability, maintenance-window, or rollout constraints: no startup-wide migration or maintenance window; repair is local, idempotent, and on demand before the runtime session/thread starts.
- Related requirement and acceptance-criteria IDs: FR-002, FR-003, FR-007; AC-001, AC-002, AC-006, AC-008, AC-009.

## Assumptions

- Configured skills are optional runtime enrichment; an unresolved skill may be omitted as current product behavior already demonstrates.
- A broken symlink is a disposable projection because the target is absent and unlinking the link path does not mutate target content.
- A live different symlink or non-symlink cannot be proven to be disposable from the current filesystem representation alone.
- Server warning logs are the approved diagnostic surface for degraded startup in this ticket.

## Risks / Open Questions

- **Resolved:** Broken symlink versus live collision behavior is explicitly defined by FR-002/FR-003.
- **Resolved:** No Activity/UI warning work is required; FR-004 targets server diagnostics and preserves the generic UI failure contract.
- **Resolved:** Codex and Claude use one shared policy with runtime-specific placement (FR-006).
- **Residual risk, outside this ticket:** Arbitrary unsupported manual filesystem mutation beyond the enumerated path states is not a reason to broaden automatic deletion behavior.
- **Residual risk, separate review candidate:** Existing materializer acquisition may race for concurrent first-time acquisitions of the same workspace/source key. If implementation evidence proves the repair cannot be made race-safe inside the shared owner without changing holder semantics, that is a requirement/design impact to report rather than silently expanding scope.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Case IDs |
| --- | --- |
| FR-001 | UC-002 |
| FR-002 | UC-001, UC-002 |
| FR-003 | UC-001, UC-002, UC-003 |
| FR-004 | UC-001, UC-002, UC-003, UC-004 |
| FR-005 | UC-005 |
| FR-006 | UC-001, UC-002, UC-003, UC-005 |
| FR-007 | UC-001, UC-002 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Production-equivalent Codex moved-skill repair and activation success. |
| AC-002 | Link-only mutation and target-content preservation. |
| AC-003 | Claude profile parity for the shared repair policy. |
| AC-004 | Degraded warning plus genuine-failure cause visibility without UI contract leakage. |
| AC-005 | Missing-source/no-collision non-blocking baseline. |
| AC-006 | Missing-source/broken-link cleanup without replacement. |
| AC-007 | Same-source idempotency, reference lifecycle, and guarded cleanup. |
| AC-008 | Live different-symlink fail-closed boundary. |
| AC-009 | Non-symlink fail-closed boundary. |
| AC-010 | Model/runtime pass-through regression boundary. |
| AC-011 | Durable state-matrix and integration coverage intent. |

## Approval Status

- **Approved:** User approved the exact link-only repair policy on 2026-08-21: remove only a broken symbolic link, recreate it when a valid current skill location exists, and never delete target content.
- **Approved:** User previously established that an unavailable optional skill should warn rather than block startup.
- **Approved for design:** User stated the proposed robust solution was correct and directed the team to continue.
- Evidence supplements are observational and require no separate approval.
