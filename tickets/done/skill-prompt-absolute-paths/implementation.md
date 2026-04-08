# Implementation

Use this single artifact for both:
- the stable Stage 6 implementation baseline
- the live Stage 6 execution/progress record
- brief downstream handoff/status pointers for Stages 7, 8, and 9

Write to:
- `tickets/done/skill-prompt-absolute-paths/implementation.md`

## Scope Classification

- Classification: `Small`
- Reasoning: The ticket is limited to skill-content formatting and tests in `autobyteus-ts`. No subsystem refactor or runtime contract change is required.
- Workflow Depth:
  - `Small` -> draft `implementation.md` solution sketch -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> finalize `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/skill-prompt-absolute-paths/workflow-state.md`
- Investigation notes: `tickets/done/skill-prompt-absolute-paths/investigation-notes.md`
- Requirements: `tickets/done/skill-prompt-absolute-paths/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/skill-prompt-absolute-paths/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/skill-prompt-absolute-paths/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `N/A`

## Document Status

- Current Status: `Execution Complete`
- Notes: Stage 5 reached `Go Confirmed` on 2026-04-08. This artifact is now the approved Stage 6 baseline plus execution tracker. A scoped local-fix cycle reopened on 2026-04-08 after final consistency review found stale prompt/tool guidance text that still described all skill links as relative after the absolute-link formatter landed. That local-fix cycle is now complete.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - `UC-001` Rewrite same-directory internal skill links in preloaded prompt output.
  - `UC-002` Rewrite child-directory internal skill links in preloaded prompt output.
  - `UC-003` Rewrite parent-relative internal skill links when the target exists.
  - `UC-004` Preserve external URLs, anchors, already-absolute paths, and unresolved targets.
  - `UC-005` Reuse the same formatting behavior in `load_skill`.
- Spine Inventory In Scope:
  - `DS-001` Preloaded skill registration -> prompt skill-detail rendering.
  - `DS-002` On-demand skill load -> formatted tool result rendering.
- Primary Spine Span Sufficiency Rationale:
  - The fix must remain visible from skill registration through final model-visible content, otherwise the design hides the actual authoritative boundary that determines what path string the model sees.
- Primary Owners / Main Domain Subjects:
  - `SkillRegistry` owns resolved `Skill` objects and their `rootPath`.
  - A new shared skill-content formatter owns Markdown link-target rewriting for model-visible skill content.
  - `AvailableSkillsProcessor` owns preloaded skill prompt assembly.
  - `load_skill` owns on-demand skill block assembly.
- Requirement Coverage Guarantee (all requirements mapped to at least one use case):
  - `REQ-001` -> `UC-001`, `UC-002`, `UC-003`
  - `REQ-002` -> `UC-004`
  - `REQ-003` -> `UC-001`, `UC-002`, `UC-003`
  - `REQ-004` -> `UC-005`
  - `REQ-005` -> `UC-001` through `UC-005`
- Design-Risk Use Cases (if any, with risk/objective):
  - `UC-004` is the key guardrail use case to prevent over-rewriting.
- Target Architecture Shape:
  - Introduce a small pure formatter utility that rewrites only Markdown link targets which are relative and resolvable from `skill.rootPath`.
  - Keep `Skill Base Path` in the rendered prompt/tool output.
  - Keep the model-facing guidance text truthful by explaining that resolvable Markdown links are already absolute while remaining plain-text relative references still require `Skill Base Path` arithmetic.
  - Replace direct use of `skill.content` with formatted content in both `AvailableSkillsProcessor` and `load_skill`.
- New Owners/Boundary Interfaces To Introduce:
  - `formatSkillContentForPrompt(skill)` or equivalent helper in `autobyteus-ts` skill/prompt formatting area.
- Primary file/task set: see `Implementation Work Table`.
- API/Behavior Delta:
  - The model-visible skill content changes from relative link targets to absolute link targets when the files exist.
  - No user-facing API contract changes and no new tool surface.
- Key Assumptions:
  - Markdown links are the right and sufficient target for this ticket.
  - Using the symlink path under the skill root is acceptable because the filesystem resolves it.
- Known Risks:
  - If some skills rely on non-Markdown file references, this ticket will not help those references.
  - Formatting must avoid rewriting prose examples or code samples accidentally.

### Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: implement the formatter before the consumers.
- Test-driven: add or update unit tests for the formatter/consumers alongside implementation.
- Mandatory modernization rule: no backward-compatibility shims or duplicate path-formatting branches.
- Mandatory cleanup rule: no raw `skill.content` concatenation should remain in the two model-visible formatting surfaces if the shared helper replaces it cleanly.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-001, DS-002 | Skill content formatter | `autobyteus-ts/src/skills/...` shared formatter | None | Establish one authoritative rewrite behavior first |
| 2 | DS-001 | `AvailableSkillsProcessor` | `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | Shared formatter | Preloaded prompt output should consume the shared formatter |
| 3 | DS-002 | `load_skill` | `autobyteus-ts/src/tools/skill/load-skill.ts` | Shared formatter | On-demand skill output should reuse the same behavior |
| 4 | DS-001, DS-002 | Validation | `available-skills-processor` and `load_skill` tests | All implementation files | Lock in correct same-dir/child-dir/parent-dir/unchanged-target cases |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Shared skill-content formatting logic | `N/A` | `autobyteus-ts/src/skills/...` or adjacent shared utility path | Skill formatting | `Create` | Unit tests cover rewriting and non-rewriting cases |
| Preloaded prompt injection | `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | Same | Prompt rendering | `Modify` | Unit/integration prompt assertions |
| `load_skill` output rendering | `autobyteus-ts/src/tools/skill/load-skill.ts` | Same | Skill tool formatting | `Modify` | Tool unit/integration assertions |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-001, DS-002 | Shared formatter | Rewrite resolvable relative Markdown link targets to absolute filesystem paths | `N/A` | `autobyteus-ts/src/skills/format-skill-content-for-prompt.ts` | Create | None | Completed | `autobyteus-ts/tests/unit/skills/format-skill-content-for-prompt.test.ts` | Passed | `N/A` | N/A | Planned | New source file is 54 effective non-empty lines |
| C-002 | DS-001 | Prompt processor | Replace raw `skill.content` usage with formatted content | `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | Same | Modify | C-001 | Completed | `autobyteus-ts/tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts` | Passed | `autobyteus-ts/tests/integration/agent/agent-skills.test.ts` | Passed | Planned | Changed-source diff is +2/-1; file remains 95 effective non-empty lines |
| C-003 | DS-002 | Skill tool | Replace raw `skill.content` usage with formatted content | `autobyteus-ts/src/tools/skill/load-skill.ts` | Same | Modify | C-001 | Completed | `autobyteus-ts/tests/unit/tools/skill/load-skill.test.ts` | Passed | `autobyteus-ts/tests/integration/tools/skill/load-skill.test.ts` | Passed | Planned | Changed-source diff is +2/-1; file remains 81 effective non-empty lines |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `REQ-001` | `AC-001`, `AC-002`, `AC-003` | `DS-001`, `DS-002` | `Solution Sketch` | `UC-001`, `UC-002`, `UC-003` | `C-001`, `C-002`, `C-003` | Unit + Integration | `AV-001`, `AV-002`, `AV-003` |
| `REQ-002` | `AC-004` | `DS-001`, `DS-002` | `Solution Sketch` | `UC-004` | `C-001`, `C-002`, `C-003` | Unit + Integration | `AV-004` |
| `REQ-003` | `AC-005` | `DS-001`, `DS-002` | `Solution Sketch` | `UC-001`, `UC-002`, `UC-003` | `C-001`, `C-002`, `C-003` | Unit + Integration | `AV-005` |
| `REQ-004` | `AC-006` | `DS-002` | `Solution Sketch` | `UC-005` | `C-001`, `C-003` | Unit + Integration | `AV-006` |
| `REQ-005` | `AC-007` | `DS-001`, `DS-002` | `Solution Sketch` | `UC-001` through `UC-005` | `C-001`, `C-002`, `C-003` | Unit + Integration | `AV-001` through `AV-006` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `REQ-001` | `DS-001` | Same-directory relative link becomes absolute in preloaded prompt output | `AV-001` | API | Planned |
| `AC-002` | `REQ-001` | `DS-001` | Child-directory relative link becomes absolute in preloaded prompt output | `AV-002` | API | Planned |
| `AC-003` | `REQ-001` | `DS-001`, `DS-002` | Parent-relative link becomes absolute when target exists | `AV-003` | API | Planned |
| `AC-004` | `REQ-002` | `DS-001`, `DS-002` | External/absolute/anchor/unresolved targets stay unchanged | `AV-004` | API | Planned |
| `AC-005` | `REQ-003` | `DS-001`, `DS-002` | Link label remains unchanged and rendered path stays at the skill-visible location | `AV-005` | API | Planned |
| `AC-006` | `REQ-004` | `DS-002` | `load_skill` output matches preloaded formatter behavior | `AV-006` | API | Planned |

### Step-By-Step Plan

1. Add a shared formatter for model-visible skill content that rewrites resolvable relative Markdown link targets to absolute filesystem paths.
2. Wire the formatter into `AvailableSkillsProcessor`.
3. Wire the same formatter into `load_skill`.
4. Align the model-facing path-resolution guidance copy in both consumers with the new absolute-link behavior.
5. Add focused unit and integration tests covering architect-style links, unchanged targets, and the truthful guidance copy.
6. Run targeted tests and record Stage 6/7 evidence.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design/common-practice rules reapplied during implementation (and any file-level design weakness routed as `Design Impact` when needed): `Yes`
- Spine Span Sufficiency preserved (implementation still follows a global enough primary spine, not only a local touched path): `Yes`
- Authoritative Boundary Rule preserved (no boundary bypass / no mixed-level dependency): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

### Test Strategy

- Unit tests:
  - formatter behavior via prompt-processor and `load_skill` unit tests
- Integration tests:
  - `autobyteus-ts/tests/integration/agent/agent-skills.test.ts`
  - `autobyteus-ts/tests/integration/tools/skill/load-skill.test.ts`
- Stage 6 boundary: file and service-level verification only (unit + integration)
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/done/skill-prompt-absolute-paths/api-e2e-testing.md`
  - expected acceptance criteria count: `7`
  - critical flows to validate: preloaded prompt rendering and `load_skill` output rendering
  - expected scenario count: `6`
  - known environment constraints: no live external service dependency expected

## Execution Tracking (Stage 6+)

- 2026-04-08: Stage 5 reached `Go Confirmed`; Stage 6 unlocked.
- 2026-04-08: Implementation starting with shared formatter extraction before consumer updates.
- 2026-04-08: Implemented `autobyteus-ts/src/skills/format-skill-content-for-prompt.ts` and wired it into `AvailableSkillsProcessor` and `load_skill`.
- 2026-04-08: Targeted executable validation passed:
  - `pnpm exec vitest --run tests/unit/skills/format-skill-content-for-prompt.test.ts tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts tests/unit/tools/skill/load-skill.test.ts tests/integration/agent/agent-skills.test.ts tests/integration/tools/skill/load-skill.test.ts`
  - `pnpm exec tsc -p tsconfig.build.json --noEmit`
- 2026-04-08: Proactive Stage 8 source-size pressure check is clean:
  - `autobyteus-ts/src/skills/format-skill-content-for-prompt.ts` = `54` effective non-empty lines
  - `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` = `95`
  - `autobyteus-ts/src/tools/skill/load-skill.ts` = `81`
- 2026-04-08: Final Stage 9/10 consistency pass exposed one remaining gap: the shared formatter had already rewritten Markdown link targets to absolute paths, but the `AvailableSkillsProcessor` and `load_skill` guidance copy still told the model that skill instructions were relative and always required manual root-path arithmetic.
- 2026-04-08: Stage 6 reopened as a scoped local-fix cycle to align the model-facing guidance copy with the implemented absolute-link behavior, then rerun the focused verification slice.
- 2026-04-08: Local-fix implementation updated `AvailableSkillsProcessor` and `load_skill` guidance copy so the prompt/tool output now explicitly says rewritten Markdown links are already absolute and that `Skill Base Path` arithmetic remains only for remaining plain-text relative references.
- 2026-04-08: Local-fix validation rerun passed:
  - `pnpm exec vitest --run tests/unit/skills/format-skill-content-for-prompt.test.ts tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts tests/unit/tools/skill/load-skill.test.ts tests/integration/agent/agent-skills.test.ts tests/integration/tools/skill/load-skill.test.ts`
  - `pnpm exec tsc -p tsconfig.build.json --noEmit`
