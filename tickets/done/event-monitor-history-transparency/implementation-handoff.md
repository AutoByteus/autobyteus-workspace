# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/design-spec.md`
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/system-prompt-activity-ux-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/system-instruction-raw-trace-schema.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/activity-transparency-ux-spec.md` (deferred context only; no additional visible kinds implemented)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/data-migration-conventions-audit.md` (persisted-data convention evidence; no additional product behavior)
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/architecture-review-revision-record.md`
- Triggering rework report and revision record:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/code-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/code-review-revision-record.md`

## Current Implementation Summary

The approved prompt-first Activity slice is implemented across core trace persistence, Native/Claude/Codex runtime handoffs, standalone/team live transport, history projection, Memory Inspector, and desktop/mobile Activity. Rework `IR-002` makes the supported server and browser streaming diagnostics content-safe, restores the missing authoritative `ToolApprovalTarget` type import, and applies SR-015 current-subject terminology. It adds no retry machinery: SR-014/ARCH-REV-002 classify CR-F-001's premise as `Not Reachable` and preserve newly-created-version-only Native/Codex publication. The implementation adds only the reviewed visible `system_instruction` kind and preserves the Event Monitor as a turn-scoped Event Monitor-compatible projection.

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-012`, `SR-014`, `SR-015` (`SR-013` superseded/withdrawn)
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-F-001`, `CR-F-002`, `CR-F-003`; `MP-CR-001` is now `Not Reachable` and requires no implementation change.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-SP-001 | Add one chronological System instructions Activity entry and preserve tool/compaction entries. | `autobyteus-web/types/activity/RunActivity.ts`; `services/activity/*`; `components/progress/RunActivityItem.vue`; `components/mobile/MobileRunActivityItem.vue`; `stores/agentActivityStore.ts` | Implemented one specialized `system_instruction` variant in the shared bounded Activity trajectory. Existing tool/compaction variants remain specialized. |
| BEH-SP-002 | Capture the exact successfully configured Native prompt without changing runtime behavior. | `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts`; `agent/context/agent-runtime-state.ts`; `memory/memory-manager.ts` | `suppliedAt` is sampled immediately before `configureSystemPrompt`; persistence occurs only after success. Only newly created committed capture is staged. Full prompt console logging was removed. |
| BEH-SP-003 | Capture the exact Claude SDK `systemPrompt` argument and clean up on failure. | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`; `claude-system-instruction-capture.ts`; Claude event converter | Capture occurs after usable `startQueryTurn` return and before iteration. Persistence failure closes the query and publishes no event. |
| BEH-SP-004 | Capture the exact Codex `baseInstructions` on thread start/resume. | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts`; `codex-thread.ts`; `backend/codex-agent-run-backend.ts` | Capture follows a valid thread ID. A created record is staged and published once after listener binding and before the first start/append input. Startup failure clears the staged capture. |
| BEH-SP-005 | Keep the existing bounded Activity lifecycle with no pinning. | `autobyteus-server-ts/src/run-history/projection/recent-run-projection-policy.ts`; `autobyteus-web/services/activity/recentActivity*`; `stores/agentActivityStore.ts` | Activity remains capped at 100; mobile continues to show its first-ten presentation. System entries can disappear through normal recent trimming or rotation. |
| BEH-SP-006 | Omit absent/malformed system evidence without reconstruction. | `autobyteus-ts/src/memory/models/system-instruction-trace.ts`; `autobyteus-server-ts/src/agent-memory/services/raw-trace-record-normalizer.ts`; `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | Strict exact-key parsing drops only a malformed system row. No current-definition fallback, placeholder, archive scan, or historical rewrite was added. |
| BEH-SP-007 | Preserve Event Monitor selection, count, paging, cursors, and generation. | `autobyteus-server-ts/src/run-history/projection/event-monitor-active-trace-page-projection.ts`; `active-trace-event-page-policy.ts`; `recent-run-projection-policy.ts`; `run-projection-*`; `autobyteus-web/services/eventMonitor/*` | Run-scoped system events are excluded before every Event Monitor policy/projector path and cannot leak prompt content or alter Event Monitor-compatible counts/cursors. Current-subject variables use Event Monitor-compatible terminology. |
| BEH-SP-008 | Establish a narrow, extensible typed Activity boundary. | `autobyteus-web/types/activity/RunActivity.ts`; `services/activity/runActivityPresentation.ts`; desktop/mobile dispatch components | `RunActivityBase` owns only kind, activity ID, and timestamp. Kind-specific renderers and presentation use exhaustive switches with unreachable assertions; no generic event bag or fallback component was introduced. |
| BEH-SP-009 | Normalize all runtimes to one provider-neutral semantic event across standalone/team transport. | `autobyteus-server-ts/src/agent-execution/domain/system-instructions-supplied-event.ts`; `events/pending-system-instruction-event.ts`; stream mappers/team adapters/contracts; `agent-stream-handler.ts`; web parser/handler/team adapter and `AgentStreamingService.ts` | Canonical payload is exactly `{trace_id, content, ts}` with `statusHint:null`. Team adds only existing routing fields and the browser adapter removes them before common dispatch. The runtime accumulator explicitly ignores the already-persisted event. Supported server/browser debug modes log only event type, trace ID, timestamp, and derived code-point length for this kind; sentinel coverage proves exact content is not serialized. |
| BEH-SP-010 | Restore only from active raw trace with truthful run scope. | `autobyteus-ts/src/memory/store/run-memory-file-store.ts`; `autobyteus-server-ts/src/agent-memory/domain/models.ts`; local run-view provider; raw replay transformer; GraphQL Memory View converter/types | Normalization distinguishes run from turn scope; system replay reuses the raw ID and has no turn group. Activity reads `includeArchive:false`; GraphQL exposes nullable turn/sequence for run-scoped records. |

## Key Files Or Areas

- Core exact-five-field model, active folding, turn-only typed readers, and compaction archive membership: `autobyteus-ts/src/memory/**`.
- Runtime capture/publication and canonical semantic event: `autobyteus-server-ts/src/agent-execution/**` and `src/agent-memory/**`.
- Standalone/team contracts and projection: `autobyteus-server-ts/src/services/agent-streaming/**`, `src/agent-team-execution/**`, and `autobyteus-team-stream-contracts/**`.
- Content-safe supported diagnostics: `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` and `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`.
- History, Event Monitor separation, and Memory Inspector scope: `autobyteus-server-ts/src/run-history/projection/**`, `src/api/graphql/**`, and corresponding web GraphQL/memory types.
- Activity contract, admission, hydration, and responsive disclosure UI: `autobyteus-web/types/activity/**`, `services/activity/**`, `services/agentStreaming/**`, `services/runHydration/**`, `stores/agentActivityStore.ts`, and desktop/mobile Activity components.

## Important Assumptions

- Existing selected-run authorization remains the disclosure boundary for exact prompt content.
- Run metadata supplies `autobyteus`, `claude_agent_sdk`, or `codex_app_server`; an unknown value receives neutral source copy.
- Provider-owned hidden/effective context is outside scope; labels describe only the exact AutoByteus-owned handoff string.
- Existing raw files are version-agnostic JSONL and remain valid without fabricated historical instruction rows.

## Known Risks

- Exact prompt content can be sensitive under the existing selected-run authorization boundary.
- Active JSONL reads remain whole-file reads; offset-indexed paging is deferred.
- Activity can truthfully lose the entry after its 100-entry bound or active trace rotation/compaction.
- Provider-effective context, archive Activity navigation, broader trajectory kinds, and user-input Activity remain deferred.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature + behavior-preserving refactor.
- Reviewed root-cause classification: Boundary Or Ownership Issue + Shared Structure Looseness.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` for run/turn trace separation and the narrow Activity-owned contract; broader kinds/storage paging remain deferred.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `Yes`
- Evidence / notes: CR-F-001 was routed upstream. SR-014/ARCH-REV-002 applied the Product-Reachability Gate and classified MP-CR-001 `Not Reachable`; implementation therefore correctly retains the reviewed newly-created-version-only lifecycle and adds no reused-row publication, rollback, durable publication state, pending registry, or retry-specific coverage. Turn-only APIs, run-scoped normalization, explicit Event Monitor/Activity selection, and the typed desktop/mobile boundary remain intact.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Obsolete broad reader/archive symbols have no remaining matches. Current replay-selection variables use Event Monitor-compatible terminology rather than treating current event kinds as legacy. Claude capture was split into a focused helper; the largest affected authored production files remain at or below 500 effective non-empty lines. Generated GraphQL output is excluded from authored-source size measurement.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Directly Usable — No Migration`
- Design-spec decision reference: `design-spec.md` → “Persisted Data / State Transition Decision”.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: Existing turn JSONL remains readable. The strict new five-field kind is additive, old/absent rows produce no Activity entry, and active-only hydration does not consult archives. The existing snapshot-v5 migration diff is exactly a caller rename from `listRawTracesOrdered` to `listTurnRawTracesOrdered`; its ID, decoder, transform, status, cleanup, and recovery behavior are unchanged. Its six focused disposable-fixture tests pass.
- Migration implementation and focused checks, only when `Migration Required`: N/A — no new migration or recovery code is authorized or present.
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Dependencies were installed in this worktree using the repository's pnpm workspace with offline resolution.
- Prisma client generation was run before the server production TypeScript build.
- The repository's broad server `typecheck` script is not a valid pass signal in this checkout because its test-inclusive config reports TS6059 (`rootDir: src` while tests are included). The production `tsconfig.build.json` check passed.
- `pnpm --filter autobyteus exec nuxi typecheck` remains blocked by the installed `vue-tsc`/TypeScript package-export incompatibility (`ERR_PACKAGE_PATH_NOT_EXPORTED` for `./lib/tsc`). Direct full-project `tsc` over `.nuxt/tsconfig.json` is also not a green project-wide signal because it includes hundreds of unrelated existing test/source/optional-dependency errors. For CR-F-003, a strict temporary `.nuxt`-derived configuration with `files:["stores/agentActivityStore.ts"]` and empty `include` passed, proving the changed production store and its imported production dependencies semantically compile. The Nuxt production build and focused Vue tests also passed; the broader limitations are not reported as passes.

## Local Implementation Checks Run

- `pnpm --filter autobyteus-ts build` — passed.
- `pnpm --filter @autobyteus/team-stream-contracts build` — passed; checked-in contract outputs regenerated.
- `pnpm --filter autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` followed by `pnpm --filter autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm --filter autobyteus build` — passed after final UI/a11y changes; Nuxt client/server build and 15-route prerender completed. Existing large-chunk warnings remain.
- Core focused Vitest (`system-instruction-trace.test.ts`, `system-prompt-processing-step.test.ts`) — 2 files, 4 tests passed.
- Server focused Vitest across normalization, active-only history, replay identity, pending publication, Native/Claude/Codex capture, team/standalone transport, and GraphQL Memory View — 13 files, 84 tests passed.
- Web focused Vitest across the System instructions component, Activity feed/store, hydration/parser, and mobile regressions — 7 files, 46 tests passed.
- IR-002 server debug regression: `agent-stream-handler-system-instruction-debug.test.ts` plus the adjacent handler suite — 2 files, 19 tests passed. The sentinel exact prompt was absent from captured console arguments while event type, `trace_id`, `ts`, and code-point length remained present.
- IR-002 browser debug/type regression: `AgentStreamingService.spec.ts` plus `agentActivityStore.spec.ts` — 2 files, 45 tests passed. The browser sentinel was absent from captured debug arguments; existing tool-approval store behavior remained green.
- IR-002 SR-015 checks: recent projection terminology/policy and the unchanged snapshot-v5 migration — 2 files, 8 tests passed using repository disposable fixtures.
- IR-002 production-source semantic check: `tsc --noEmit` using a temporary `.nuxt/tsconfig.json`-derived config whose only root file was `stores/agentActivityStore.ts` — passed with zero diagnostics.
- IR-002 production checks: `pnpm --filter autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` and `pnpm --filter autobyteus build` — passed; Nuxt completed client/server build and 15-route prerender with existing large-chunk warnings only.
- Audits: obsolete broad raw-trace method names absent; no authored changed production source over 500 effective non-empty lines; temporary preview route absent; `git diff --check` clean.

These are implementation-scoped checks only. They are not API/E2E sign-off.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: standalone and team Activity feeds on desktop and mobile, including collapsed/expanded System instructions disclosure; Memory Inspector run-scoped row rendering was source/build checked.
- Approved UI/UX, interaction, requirement, or design references: `system-prompt-activity-ux-spec.md`, `requirements.md` AC-SP-008, and `design-spec.md` Activity/UI invariants.
- Existing design system, shared components, and adjacent product surfaces reviewed: current tool/compaction cards, `ActivityFeed`, desktop workspace Activity, mobile focused-run list, status/badge/icon/spacing conventions.
- Project development / preview instructions and rendered surface used: normal Nuxt development server with a temporary isolated Activity preview route; the route was deleted after inspection.
- States, layouts, viewports, and interactions inspected: Chromium at 1280px desktop and 390px mobile; collapsed and expanded states; desktop keyboard Enter toggle; mobile pointer toggle; long multi-line/long-token content; horizontal containment; internal content scrolling; focusable selectable monospaced content; accessible button/region relationships.
- Visual or interaction issues found and corrected: added capture time to summary/detail/accessibility copy; made the disclosure content region labeled and the scrollable `<pre>` keyboard-focusable; verified `pre-wrap`, safe word breaking, 320px maximum content height, and no page-level horizontal overflow at 390px.
- Supporting evidence and remaining unverified states or limitations: local screenshots were inspected from `/tmp/system-instruction-desktop-final.png` and `/tmp/system-instruction-mobile-final.png` and were intentionally not added to the repository. Automated component checks cover translations and accessibility attributes. Full integrated browser/API/E2E validation remains downstream work.
- IR-002 rendered-result impact: no visible UI or interaction changed; the rework affects debug-only logging, a type-only import, and internal current-subject naming. The approved IR-001 rendered result therefore remains authoritative and no speculative UI change was introduced.

## Downstream Coverage Hints / Suggested Scenarios

- Exercise a real Native, Claude, and Codex new run/resume and compare the expanded Activity text byte-for-string with the actual runtime handoff argument.
- Confirm Native/Codex emits exactly once after live listener binding and before the first backend input; inject persistence failure and confirm no live event/first input.
- Inject Claude persistence failure after usable query creation and verify query cleanup with no output iteration or semantic event.
- Restart with a valid active row, then trim/rotate it, verifying Activity restoration then honest absence without archive reads.
- Compare Event Monitor recent/page/cursor/generation/count output for equivalent fixtures with and without a system row, including tied timestamps and compaction archive membership.
- Verify standalone/team live payload parity and raw ID reuse across live and reload.
- Recheck desktop/mobile keyboard, screen-reader naming, exact whitespace, selection, long-line containment, Activity 100, and mobile ten on integrated application data.

## API / E2E / Executable Coverage Investigation And Execution Still Required

The `api_e2e_engineer` must independently investigate existing durable API/E2E coverage, decide what remains valid or requires change, prepare the mandatory coverage investigation artifact, and execute broader repository/system validation after code review. No API/E2E completion claim is made here.
