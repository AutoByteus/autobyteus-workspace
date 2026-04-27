# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/tickets/done/external-channel-stream-output-dedupe/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/tickets/done/external-channel-stream-output-dedupe/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/tickets/done/external-channel-stream-output-dedupe/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/tickets/done/external-channel-stream-output-dedupe/design-review-report.md`

## Background Artifact Package

- Original requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/tickets/done/external-channel-open-session-delivery/requirements.md`
- Original investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/tickets/done/external-channel-open-session-delivery/investigation-notes.md`
- Original design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/tickets/done/external-channel-open-session-delivery/design-spec.md`
- Original design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/tickets/done/external-channel-open-session-delivery/design-review-report.md`
- Original implementation handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/tickets/done/external-channel-open-session-delivery/implementation-handoff.md`
- Original code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/tickets/done/external-channel-open-session-delivery/review-report.md`
- Original API/E2E report: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/tickets/done/external-channel-open-session-delivery/api-e2e-report.md`
- Original docs sync report: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/tickets/done/external-channel-open-session-delivery/docs-sync-report.md`
- Original handoff summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/tickets/done/external-channel-open-session-delivery/handoff-summary.md`
- Original release/deployment report: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/tickets/done/external-channel-open-session-delivery/release-deployment-report.md`

## What Changed

- Removed the parser-owned ambiguous `mergeAssistantText` accumulation policy from `channel-output-event-parser.ts`.
- Extended `ParsedChannelOutputEvent` with `textKind: "STREAM_FRAGMENT" | "FINAL_TEXT" | null` so the parser stays stateless but communicates text-source semantics to the collector.
- Added collector-adjacent pure text assembly in `channel-output-text-assembler.ts`:
  - true deltas append normally,
  - cumulative snapshots resolve to the latest snapshot,
  - suffix/prefix-overlapping stream fragments are deduped,
  - final text selection remains explicit and separate from stream assembly.
- Updated `ChannelRunOutputEventCollector` to own per-turn assembly:
  - `SEGMENT_CONTENT` with `STREAM_FRAGMENT` uses overlap-safe stream assembly,
  - `SEGMENT_END` with `FINAL_TEXT` updates final text,
  - `TURN_COMPLETED` still returns final text first, then accumulated stream text.
- Added targeted parser, collector, assembler, and runtime publication coverage for the duplicated streamed output bug.
- Left `autobyteus-message-gateway/` unchanged as required by scope.

## Key Files Or Areas

- Source:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/autobyteus-server-ts/src/external-channel/runtime/channel-output-event-parser.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/autobyteus-server-ts/src/external-channel/runtime/channel-output-text-assembler.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/autobyteus-server-ts/src/external-channel/runtime/channel-run-output-event-collector.ts`
- Tests:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/autobyteus-server-ts/tests/unit/external-channel/runtime/channel-output-event-parser.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/autobyteus-server-ts/tests/unit/external-channel/runtime/channel-run-output-event-collector.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe/autobyteus-server-ts/tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts`

## Important Assumptions

- Stream fragments can arrive as true deltas, cumulative snapshots, or suffix/prefix-overlapping fragments depending on backend/runtime event shape.
- Final text from a text `SEGMENT_END` is more authoritative than accumulated stream fragments when present.
- Without stable raw event IDs, exact duplicate fragments and intentional repeated text cannot be perfectly distinguished; this implementation keeps the existing exact-duplicate/cumulative-snapshot behavior and adds conservative overlap handling.
- Gateway callback transport should continue treating `replyText` as opaque content.

## Known Risks

- A one-character alphabetic overlap is not treated as an overlap to avoid corrupting normal word splits such as `cat` + `tail`; if a backend emits only one-character alphabetic overlaps, those remain outside this conservative fix.
- If future backends emit multiple independent final text segments in one turn, `chooseFinalOutputText` uses the same overlap/cumulative policy for final text rather than blindly replacing or blindly concatenating.
- Broader live Autobyteus/Codex/Claude/mixed-team stream shapes still need downstream executable/API/E2E validation beyond these local unit/runtime tests.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - `mergeAssistantText` was removed from parser ownership and has no remaining active source/test references.
  - No gateway-side text cleanup, stale inbox status compatibility, runtime-data cleanup, binding cleanup, or release packaging changes were introduced.
  - Changed source effective non-empty line counts: parser `203`, collector `93`, text assembler `60`.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-stream-output-dedupe`
- Branch: `codex/external-channel-stream-output-dedupe`
- Base/finalization target: `origin/personal` / `personal`
- Release background: v1.2.84 open-session delivery is already present on this base.
- Dependency prep: `pnpm install --offline` was run because the fresh worktree had no installed workspace dependencies.
- Shared package / Prisma prep: `pnpm -C autobyteus-server-ts run build` was run successfully; this built shared workspace packages and generated Prisma Client before compiling server source.
- Initial direct server `tsc` before dependency/shared prep failed due missing workspace package build outputs and generated Prisma types; after install/build prep, direct server build typecheck passed.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E validation environments or treat that work as part of this section.
Do not report API, E2E, or broader executable validation as passed in this artifact.

- `pnpm install --offline` — passed.
- `pnpm -C autobyteus-server-ts run build` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/channel-output-event-parser.test.ts tests/unit/external-channel/runtime/channel-run-output-event-collector.test.ts tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts --passWithNoTests` — passed, 3 files / 18 tests.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed after shared package / Prisma prep.
- `git diff --check` — passed.
- `rg -n "mergeAssistantText" autobyteus-server-ts/src autobyteus-server-ts/tests || true` — no active matches.
- `({ git diff --name-only; git ls-files --others --exclude-standard; } | rg '^autobyteus-message-gateway/')` — no tracked or untracked gateway file changes.

## Downstream Validation Hints / Suggested Scenarios

- Validate the observed Telegram symptom with a Codex/team coordinator response that previously produced word duplication, e.g. `Sent the the student student ...`; persisted `replyTextFinal` should be clean before gateway callback publication.
- Validate a stream with no final text snapshot still publishes clean text assembled from overlapping fragments.
- Validate final snapshot precedence when both stream fragments and final text arrive for the same turn.
- Validate representative Autobyteus, Codex, Claude, and mixed-team outputs still do not publish tool/reasoning/internal member text externally.
- Confirm no gateway inbox cleanup/reset behavior is expected from this ticket.

## API / E2E / Executable Validation Still Required

- Realistic external-channel run-output delivery through the server callback path with a live or mock gateway target.
- Team coordinator follow-up delivery after internal worker activity, verifying final `replyTextFinal` and gateway callback payload text.
- Backend event-shape coverage across Autobyteus, Codex, Claude, and mixed-team runs.
