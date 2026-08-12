# Implementation Revision Record

The current code and `implementation-handoff.md` are authoritative. This record locates the implementation baseline and later deltas; it is not independent proof of review acceptance.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| `IR-001` | `architecture_reviewer`; `design-review-report.md`; initial implementation round | `N/A` | `Initial Baseline` | `SR-003`, `ARCH-REV-003`; `CRR-*`, `API-REV-*`, `DR-*`: `N/A` | Implementation complete; ready for code review |
| `IR-002` | `code_reviewer` `CRR-001`, then `architecture_reviewer` `ARCH-REV-004`; rework round 1 | `CR-001`, `CR-002`, `CR-MP-001` | `Local Fix` after approved `Design Impact` | `SR-004`, `ARCH-REV-004`, `CRR-001`; `API-REV-*`, `DR-*`: `N/A` | Revised implementation complete; ready for source re-review |

## Revision Entries

### IR-001 — Shared carpenter prompt and runtime tool exposure baseline

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/design-review-report.md`; initial implementation round
- Triggering finding IDs: `N/A` (`AR-001` is obsolete and `AR-002`/`AR-003` were resolved in the reviewed solution)
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: Implementation complete; ready for code review
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: establishes the first complete source implementation of the architecture-approved Carpenter Model contract and the exact state presented for source review.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-012`; `R-001`–`R-014`; `AC-001`–`AC-014` (durable project documentation sync for `R-006`/`AC-006` remains delivery-owned).
- Implementation delta: added one shared carpenter prompt composer, team runtime renderer, fence-aware heading containment, and provider-neutral runtime-tool-exposure resolver; projected the result through native/Codex/Claude; made native Skills terminal metadata/path-only with post-Skills payload validation; removed runtime-specific prompt reconstruction and the optional system-prompt-processor authoring/runtime surface across server/GraphQL/web.
- Changed files or areas: server agent prompt/team/runtime exposure and three runtime adapters; Agent Tools MCP exposure inputs; core Skills/final prompt step; server agent-definition/config/GraphQL/tools/startup surfaces; web generated types/form/detail/stores/queries/localization; focused unit/component tests; obsolete prompt strategy/composer files removed.
- Local validation and result: server source-only TypeScript check passed; 127 affected/new server unit tests passed; 7 core unit tests and core build passed; 108 affected web component/store tests passed; `git diff --check` passed.
- Next recipient or routing: `code_reviewer`
- Remaining limitations or risks: downstream API/E2E coverage investigation and execution are required; known stale integration/E2E references are listed in `implementation-handoff.md`; full server typecheck and web Nuxt typecheck have existing/toolchain blockers recorded there; live browser rendering was not performed; durable documentation sync remains for delivery.

### IR-002 — Close native prompt mutation and fence containment boundaries

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/code-review-report.md`; `CRR-001`, followed by architecture re-review `ARCH-REV-004`; implementation rework round 1
- Triggering finding IDs: `CR-001`, `CR-002`; premise `CR-MP-001`
- Classification: `Local Fix` after approved upstream `Design Impact`
- Prior authoritative result: `IR-001` implementation received `CRR-001` `Fail — Design Impact`
- Current authoritative result: Revised implementation complete; ready for source re-review
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-004`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: records the architecture-approved source revision that closes the omitted core public/runtime mutation surface and corrects the reachable fenced-Markdown containment defect.
- Approved behavior or requirement IDs affected: `BEH-002`, `BEH-008`, `BEH-012`; `R-010`, `R-014`; `AC-010`, `AC-014`
- Implementation delta: removed the core generic prompt-mutator configuration, pipeline, abstractions, registry/registration, public exports, compatibility slot, and obsolete tests; updated all positional `AgentConfig` callers; extracted a direct configured-Skills catalog appender and invoked it exactly once before final validation/state/LLM mutation; replaced synthetic processor coverage with a real registered skill containing valid placeholder-shaped metadata; corrected fence closing to require the same marker, sufficient length, and trailing spaces/tabs only; updated exact containment coverage, active fixtures/scripts, and current durable docs.
- Changed files or areas: `autobyteus-ts` AgentConfig/bootstrap/system-prompt/pipelines/root exports/tests/docs and positional callers; server containment helper/tests and native factory caller; web/server active fixtures; repository seeding/legacy migration writers; current implementation artifacts.
- Local validation and result: server source-only TypeScript check passed; 17 focused server tests passed; 48 focused core unit/narrow-integration tests passed; core build/runtime-dependency verification passed; 4 focused web component tests passed; Python compile check passed; exact retired-name search returned no current-source/public-barrel/active-test/current-doc matches; `git diff --check` passed.
- Next recipient or routing: `code_reviewer`
- Remaining limitations or risks: API/E2E coverage investigation/execution remains blocked until source re-review passes; three known downstream provider/session suites still use the pre-revision runtime-exposure name and are listed in `implementation-handoff.md`; repository-wide typecheck/tooling limitations remain recorded there; final integrated-state documentation verification remains delivery-owned.
