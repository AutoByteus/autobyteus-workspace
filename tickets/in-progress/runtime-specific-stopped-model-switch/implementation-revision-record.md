# Implementation Revision Record — Runtime-specific stopped-run model switching

The current code and `implementation-handoff.md` are authoritative; this record indexes completed implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / initial implementation | N/A | Initial Baseline | SR-002, SR-003; ARCH-REV-001; CRR/API-REV/DR N/A | Implementation complete for independent source review |

## Revision Entries

### IR-001 — Runtime-specific selection and truthful option contract

- Triggering role, report path, and round: Architecture Reviewer Pass, `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/design-review-report.md`, ARCH-REV-001; initial implementation.
- Triggering finding IDs: N/A — no blocking architecture finding.
- Classification: Initial Baseline; `task_size=Medium`, `architectural_risk=High` confirmed.
- Prior authoritative result: N/A.
- Current authoritative result: Implementation complete; independent Code Review required by High-risk route.
- Related solution revision IDs: SR-002 approved requirements, SR-003 design.
- Related architecture-review revision IDs: ARCH-REV-001 Pass.
- Related code-review, API/E2E, delivery revision IDs: N/A.
- Why recorded: Establishes the first implementation handoff baseline against the reviewed runtime-specific policy.
- Approved behavior / requirement IDs: BEH-001–006; REQ-001–007; AC-001–009.
- Implementation delta: External runtime options/Save use current catalog membership plus target schema without capacity metadata; AutoByteus retains verified positive non-decreasing capacity. Obsolete external capacity readers were deleted. GraphQL option numeric fields, Web queries/types/fixtures were removed in lockstep and generated GraphQL regenerated from the current backend schema. Agent/Team/Org stopped writers and restore/provider-binding paths remain unchanged. Web copy and catalog-mismatch feedback were updated; relevant docs synchronized.
- Changed areas: `autobyteus-server-ts/src/llm-management`, GraphQL option DTO, Claude/Codex selection-only readers, `autobyteus-web` option query/generated types/picker/Settings copy, focused unit tests and docs.
- Local validation: Server TypeScript build-config typecheck passed after shared build and Prisma generation; five focused server suites passed (41 tests), then revised selection/native suites passed (14 tests). Four focused Web suites passed (52 tests) before final localized-label polish, with the affected component suite passing again (12 tests). Nuxt production build, GraphQL codegen, Web/localization guards, literal audit and `git diff --check` passed. Full `nuxi typecheck` did not run because its npx-installed vue-tsc/typescript pair failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`; Nuxt production build passed. Temporary local Web preview remained blank because `/rest/health` proxy had no backend, so no browser visual/interaction pass is claimed.
- Next recipient / routing: `get_handoff_rules` selected `/code_reviewer` for High-risk independent source review.
- Remaining limitations / risks: Real smaller-window provider continuation unverified; separately loaded Web display/schema catalog may lag server options (visible fallback/retry and schema-unavailable block implemented); external GraphQL consumers, if any, remain a review concern. API/E2E owns executable system/provider validation and final coverage classification.
