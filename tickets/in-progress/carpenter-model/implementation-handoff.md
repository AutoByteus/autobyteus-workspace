# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/design-spec.md`
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/system-prompt-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/agent-identity-prompt-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/working-environment-prompt-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/bash-operating-practice-prompt-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/file-and-directory-practice-prompt-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/team-and-runtime-prompt-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/prompt-value-binding-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/system-skill-decision.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/classroom-simulation-composed-system-prompt.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/architecture-review-revision-record.md`
- Triggering rework reports and revision records:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/code-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/code-review-revision-record.md`

## Current Implementation Summary

The current implementation replaces the three runtime-specific prompt-construction paths with one server-owned carpenter composer and projects its result through the existing native, Codex, and Claude high-authority instruction boundaries. A provider-neutral runtime-tool-exposure owner normalizes configured names and automatically adds exactly `send_message_to` and `delegate_task` for valid team contexts while leaving standalone exposure configured-only. Under `SR-004`, native Skills is now one direct platform-owned catalog append inside `SystemPromptProcessingStep`; the complete result is validated before state or LLM mutation. The generic core prompt-mutator configuration, pipeline, abstractions, registry/registration, barrels/root exports, and obsolete tests are deleted without aliases or a constructor compatibility slot. Fence containment now distinguishes openings from legal active closes and preserves same-marker non-closing content.

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-004` (retains `SR-003` automatic-team-tool behavior)
- Related architecture-review revision IDs: `ARCH-REV-004`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001`, `CR-002`; premise `CR-MP-001`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-001` | One minimal structured foundation for every runtime | `agent-execution/prompt/carpenter-prompt-composer.ts`; native/Codex/Claude bootstrap callers | Implemented once and projected without provider-local rewording. |
| `BEH-002` | Configured-only lazy skills; no skill bodies in the prompt | Core `system-prompt/append-configured-skills-catalog.ts`; existing Codex/Claude materializers retained | Native catalog is a direct platform append containing validated metadata and absolute `SKILL.md` paths only. |
| `BEH-003` | Provider-native tool transport plus two automatic team tools | `agent-execution/shared/runtime-agent-tool-exposure.ts`; native resolver and Agent Tools MCP inputs | Configured names normalize/deduplicate; team contexts add exactly the two approved names. |
| `BEH-004` | Same semantic prompt across native, Codex, and Claude | Native factory, `codex-thread-bootstrapper.ts`, `claude-session-bootstrapper.ts`, `claude-session.ts`, `claude-sdk-client.ts` | Native uses `AgentConfig.systemPrompt`; Codex uses `baseInstructions`; Claude uses SDK `systemPrompt` and leaves `prompt` user-only. |
| `BEH-005` | Bind exact effective workspace and distinguish skill roots | Each bootstrap resolves workspace before calling the composer; working-environment renderer | Composer requires and renders a nonblank absolute workspace path. |
| `BEH-006` | Preserve one source-neutral Skill model | Existing `SkillService`/registries/providers retained; `skills/loader.ts` validation tightened | No skill kind or loader tool added. |
| `BEH-007` | Name plus optional description/body, with no role or fallback | `carpenter-prompt-sections.ts` | Blank optional content omits; description never becomes instructions. |
| `BEH-008` | Stable section order, correct fence containment, terminal Skills only, no generic mutator surface | Composer and corrected `markdown-heading-containment.ts`; core `AgentConfig`/bootstrap; deleted pipeline/processor files and exports | Active fences close only with the same marker, sufficient length, and trailing spaces/tabs only. No configurable/public generic prompt mutation remains. |
| `BEH-009` | Exact concise Bash section | `BASH_OPERATING_PRACTICE_SECTION` | Implemented from the approved supplement. |
| `BEH-010` | Exact separate file/directory section | `FILE_AND_DIRECTORY_PRACTICE_SECTION` | Implemented from the approved supplement. |
| `BEH-011` | Team Instruction plus context-derived Team Runtime only for members | `team-runtime-instruction-renderer.ts`; roster/delegation manifest builders | Standalone omits both; valid team context renders fixed messaging/delegation protocol and current rosters. |
| `BEH-012` | Fail/suppress dynamic values at their owning boundary; reject unresolved final payload | Composer scalar/body validation; direct Skills appender; core `system-prompt-processing-step.ts` | One direct append runs exactly once; a real registered configured skill with placeholder-shaped valid metadata proves rejection before processed-state assignment or LLM configuration. |

## Key Files Or Areas

- Added shared prompt ownership under `autobyteus-server-ts/src/agent-execution/prompt/`.
- Added `autobyteus-server-ts/src/agent-team-execution/services/team-runtime-instruction-renderer.ts` and tightened team roster/context validation.
- Replaced `configured-agent-tool-exposure.ts` with `runtime-agent-tool-exposure.ts`; propagated the single shape through native and the existing Codex/Claude Agent Tools MCP transport paths.
- Simplified native, Codex, and Claude bootstrap/session prompt projections; Claude now sends persistent content through SDK `systemPrompt` rather than rebuilding XML in user turns.
- Extracted native catalog rendering to focused `append-configured-skills-catalog.ts`; `SystemPromptProcessingStep` invokes it directly once and owns complete-payload validation.
- Removed the core `AgentConfig` prompt-mutator default/property/constructor/copy slot, updated every positional caller, and deleted the generic pipeline, processor abstractions, registry/registration, public barrels/root export, and obsolete suites.
- Corrected authored Markdown containment with separate opening/active-close recognition and focused backtick, tilde, non-close, longer-close, trailing-whitespace, and overflow coverage.
- Removed old runtime prompt composers, provider bootstrap strategies, Claude turn-input builder, and their obsolete unit tests.
- Removed `systemPromptProcessorNames` from the server domain/config/service, agent-management tools, GraphQL surface, startup registry injection, built-in agent configs, generated web types, authoring form/detail/store/query paths, localization, and affected unit fixtures.
- Added/updated focused server, core, and web unit/component coverage for the new owners and removals.
- Updated current core architecture/runtime/Skills documentation and repository fixture/migration writers so retired prompt-mutator names are absent from current source, public barrels, active tests, and durable current docs.

## Important Assumptions

- A non-null `MemberTeamContext` reaching a bootstrap is already the selected runtime team context and must carry a live `send_message_to` delivery binding; missing bindings fail rather than silently degrading.
- Existing file-backed JSON remains a readable superset. The current normalizer ignores historical unknown keys and new writes omit the removed processor field; no bulk rewrite is required.
- Codex and Claude provider-native configured-skill materialization remains authoritative and does not need a duplicate carpenter Skills catalog.

## Known Risks

- API/E2E/integration coverage remains downstream-owned and still contains known stale imports/field names for the renamed runtime exposure in three provider/session suites. Exact locations are listed in the coverage hints below.
- Full server `pnpm typecheck` remains unusable because the existing `tsconfig.json` includes tests while declaring `rootDir: src`, producing repository-wide `TS6059`; the source-only build config typecheck passed.
- Web Nuxt typecheck could not run because the current `vue-tsc`/TypeScript toolchain resolves an unavailable `typescript/package.json` export (`./lib/tsc`). Focused mounted component/store tests passed, but this tooling failure remains an environment limitation.
- The test-inclusive core TypeScript check remains blocked by unrelated existing strict-test errors; the production build passed and the output contained no positional `AgentConfig` signature failures.
- Current core durable docs were updated for the closed platform append and ordinary lazy Skills boundary. Delivery still owns final documentation no-impact/sync against the integrated branch state.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement` / `Behavior Change` / `Refactor`
- Reviewed root-cause classification: `Boundary Or Ownership Issue` and `Duplicated Policy Or Coordination`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `Yes` — `CR-001` was routed through `SR-004` / `ARCH-REV-004` before implementation revision.
- Evidence / notes: semantic prompt composition has one owner, team runtime rendering is bounded to team context, runtime tool exposure has one provider-neutral owner, and native prompt completion is now structurally closed around one direct platform Skills append. Provider adapters consume those boundaries without reconstructing policy or changing MCP lifecycle ownership.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: the largest changed implementation files remain below 500 effective nonblank lines (489, 477, and 460). No revision source file crosses the 220-line delta signal. The core generic prompt-mutation files and exports are deleted rather than aliased. Historical JSON supersets are handled only by generic recognized-field projection/unknown-key tolerance, not a version-specific compatibility branch.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Directly Usable — No Migration`
- Design-spec decision reference: `design-spec.md` → `Persisted Data / State Transition Decision`
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: current file config projection recognizes only current fields; existing JSON supersets continue loading, historical processor names never enter the domain/runtime, and current writers omit the removed field.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model`
- Branch: `codex/carpenter-model`
- Root dependencies were installed with `pnpm install --frozen-lockfile`; Prisma client generation was run for server source checking. No dependency or lockfile change was introduced.
- Server test setup resets its isolated SQLite test database as part of Vitest setup.

## Local Implementation Checks Run

- `autobyteus-server-ts`: `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed.
- `autobyteus-server-ts`: revised containment plus native factory suites — 17 tests passed, including exact backtick/tilde/non-close/long-close/overflow cases.
- `autobyteus-ts`: revised bootstrap/catalog/config/public-surface suites plus the focused AgentFactory skill integration — 48 tests passed.
- `autobyteus-ts`: `pnpm build` — passed, including runtime-dependency verification.
- `autobyteus-web`: affected Agent Definition form component suite — 4 tests passed.
- Repository fixture/migration Python sources: `python3 -m py_compile ...` — passed.
- Retired-name absence search over current source, public barrels, active tests, scripts, and durable current docs (excluding historical ticket/migration artifacts) — no matches.
- Repository: `git diff --check` — passed.
- Known non-passing tool checks are recorded under Known Risks rather than represented as behavior failures.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: agent definition create/edit form and agent detail display; the obsolete optional system-prompt-processor control and display are removed.
- Approved UI/UX, interaction, requirement, or design references: `R-005`, `AC-005`, `BEH-008`, and the design's complete authoring-surface removal inventory; no separate visual redesign supplement exists.
- Existing design system, shared components, and adjacent product surfaces reviewed: existing `AgentDefinitionForm.vue`, `AgentDefinitionDetailSections.vue`, their mounted tests, adjacent agent cards/team details/mobile contexts, and shared stores/query shapes.
- Project development / preview instructions and rendered surface used: Vitest-mounted Vue component DOM was used for focused render/interaction inspection. A live browser preview was not started because this change only removes an obsolete control and API field and downstream environment/API validation is not owned here.
- States, layouts, viewports, and interactions inspected: create/edit payload emission, form text/control absence, detail display absence, and affected desktop/mobile fixture compatibility through the 108-test changed-surface set.
- Visual or interaction issues found and corrected: stale labels, fixtures, generated properties, detail rows, and form/store payload fields were removed; no new layout or visual element was introduced.
- Supporting evidence and remaining unverified states or limitations: mounted component assertions verify absence and current payload shape. Live browser responsive/focus behavior remains unverified; the Nuxt typecheck tooling failure is recorded above. This is implementation self-validation, not API/E2E sign-off.

## Downstream Coverage Hints / Suggested Scenarios

- Assert byte/semantic parity of the carpenter section order across native, Codex `baseInstructions`, and Claude SDK `systemPrompt`, including blank optional bodies and authored-heading containment around fenced code.
- Exercise team and standalone runtime bootstraps: configured-name normalization/deduplication; automatic exposure of exactly `send_message_to` and `delegate_task`; provider-native schemas; no prompt tool catalog; live team delivery binding failure.
- Verify Claude multi-turn behavior keeps raw user content in `prompt` and supplies the unchanged carpenter system prompt separately on every SDK query without changing session identity, cleanup, or client reference counting.
- Verify native configured skills render only the exact `## Skills` metadata/path catalog, preserve configured order, omit bodies, suppress NONE/empty/unresolved/invalid entries, and reject unresolved placeholders after the single direct append before state/LLM mutation.
- Verify file-backed historical JSON supersets still read through generic current-field projection and that all current write/API/UI paths omit retired prompt-mutator fields.
- Known stale downstream-owned coverage requiring investigation/update before execution:
  - `autobyteus-server-ts/tests/integration/agent-execution/claude-session-manager.integration.test.ts`
  - `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts`

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. The `api_e2e_engineer` must first produce the required coverage investigation artifact, decide whether the listed existing integration/E2E coverage is valid/stale/update/remove/replace/expand, maintain durable coverage as appropriate, and then execute broader coverage with evidence. No API/E2E pass is claimed by this implementation handoff.
