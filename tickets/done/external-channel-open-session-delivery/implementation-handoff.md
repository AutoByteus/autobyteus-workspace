# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery/tickets/done/external-channel-open-session-delivery/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery/tickets/done/external-channel-open-session-delivery/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery/tickets/done/external-channel-open-session-delivery/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery/tickets/done/external-channel-open-session-delivery/design-review-report.md`

## What Changed

- Replaced the receipt-owned one-reply workflow with an open external route/run output delivery runtime.
- Inbound receipts now remain ingress idempotency and accepted-dispatch audit records only; outbound publish lifecycle moved to durable run-output delivery records.
- Added run/team event parsing, team coordinator eligibility filtering, turn text collection, route/run delivery persistence, recovery scheduling, and callback outbox publishing for eligible outputs.
- Preserved initial/direct replies during cutover by attaching the output runtime at accepted dispatch time and recovering already-finished turn text from run history when stream events arrived before attach.
- Restored active output links from cached bindings and restorable delivery records on runtime startup.
- Added binding lifecycle notifications so route/run subscriptions reconcile when bindings or cached run ids change.
- Updated `ReplyCallbackService` to publish by route + output target + turn id, treating publish as complete after callback outbox enqueue/duplicate and leaving provider delivery state to existing delivery events.
- Aligned message-gateway ingress disposition handling on `ACCEPTED | UNBOUND | DUPLICATE` and replaced `COMPLETED_ROUTED` with `COMPLETED_ACCEPTED`.
- Removed the obsolete receipt workflow runtime, exact-turn reply bridges, their active startup, and their now-invalid tests.

## Key Files Or Areas

- Server domain and persistence:
  - `autobyteus-server-ts/src/external-channel/domain/models.ts`
  - `autobyteus-server-ts/src/external-channel/providers/channel-run-output-delivery-provider.ts`
  - `autobyteus-server-ts/src/external-channel/providers/file-channel-run-output-delivery-provider.ts`
  - `autobyteus-server-ts/src/external-channel/providers/file-channel-run-output-delivery-row.ts`
  - `autobyteus-server-ts/src/external-channel/services/channel-run-output-delivery-service.ts`
- Server output runtime:
  - `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-delivery-runtime.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-link-registry.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-output-event-parser.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-eligibility.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-event-collector.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-publisher.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-recovery-scheduler.ts`
  - `autobyteus-server-ts/src/external-channel/services/channel-team-output-target-identity.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-runtime-singleton.ts`
- Server cutover boundaries:
  - `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts`
  - `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`
  - `autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts`
  - `autobyteus-server-ts/src/external-channel/services/channel-binding-lifecycle-events.ts`
  - `autobyteus-server-ts/src/server-runtime.ts`
- Gateway disposition contract:
  - `autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts`
  - `autobyteus-message-gateway/src/domain/models/inbox-store.ts`
  - `autobyteus-message-gateway/src/application/services/inbound-inbox-service.ts`
  - `autobyteus-message-gateway/src/infrastructure/inbox/file-inbox-store.ts`
- Tests added/updated:
  - `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts`
  - `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-output-event-parser.test.ts`
  - `autobyteus-server-ts/tests/unit/external-channel/services/channel-run-output-delivery-service.test.ts`
  - Existing receipt/callback/ingress/binding/gateway tests updated to the new contract.

## Important Assumptions

- Provider delivery still flows through the existing gateway callback outbox and outbound sender; this change does not reimplement Telegram/provider send or provider retry semantics.
- Output delivery is considered published once the callback outbox enqueue succeeds or reports a duplicate callback idempotency key.
- Team bindings continue to target the coordinator/entry member by configured `targetNodeName`, coordinator metadata, or a single member fallback.
- Team output delivery keys use the stable team run + coordinator member name identity when available so records remain stable when member run id is learned later.
- Run-history text recovery is best-effort and relies on existing assistant raw traces for the accepted dispatch turn.

## Known Risks

- Broader event-shape coverage across Autobyteus, Codex, Claude, and mixed-team runtimes still needs downstream executable validation with realistic runs.
- Provider-specific correlation-message requirements beyond current callback envelope usage should be exercised by API/E2E validation, especially Telegram managed-gateway flows.
- Runtime startup restores links from cached binding run ids; if a binding points at a run that is no longer resolvable, it will not attach until binding/runtime state changes again.
- Existing durable documentation still mentions the old receipt workflow in places; delivery/docs sync should update or explicitly mark no-impact after the integrated refresh.
- Branch remains behind `origin/personal` by 2 commits; delivery stage must refresh against `origin/personal` before finalization.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - Deleted receipt workflow runtime/state/effect files and exact-turn reply bridge files/tests.
  - Removed active `ROUTED` gateway/server contract usage; active source/tests now use `ACCEPTED`.
  - New output runtime was split into runtime, parser, eligibility, collector, publisher, scheduler, registry, and team-target identity files. No changed source implementation file exceeds 500 effective non-empty lines.
  - The largest remaining new source owner is `channel-run-output-delivery-runtime.ts`; it was assessed after splitting and remains the cohesive lifecycle/subscription/serialization owner.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery`
- Branch: `codex/external-channel-open-session-delivery`
- Base/finalization target: `origin/personal` / `personal`
- Dependency prep performed with existing workspace packages; `pnpm install --offline` completed successfully earlier in implementation.
- `pnpm -C autobyteus-server-ts run build` regenerated Prisma Client as part of prebuild.
- Attempted `pnpm -C autobyteus-server-ts run typecheck`; it failed because the package `tsconfig.json` includes `tests` while `rootDir` is `src`, producing repository-wide TS6059 errors for tests outside `src`. Source build/typecheck commands below passed.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E validation environments or treat that work as part of this section.
Do not report API, E2E, or broader executable validation as passed in this artifact.

- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed.
- `pnpm -C autobyteus-server-ts run build` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/services/reply-callback-service.test.ts tests/unit/external-channel/services/channel-message-receipt-service.test.ts tests/unit/external-channel/services/channel-ingress-service.test.ts tests/unit/external-channel/services/channel-binding-service.test.ts tests/integration/external-channel/providers/file-channel-message-receipt-provider.integration.test.ts tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts tests/unit/external-channel/runtime/channel-output-event-parser.test.ts tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts tests/unit/external-channel/services/channel-run-output-delivery-service.test.ts --passWithNoTests` — passed, 9 files / 39 tests.
- `pnpm -C autobyteus-message-gateway run typecheck` — passed.
- `pnpm -C autobyteus-message-gateway exec vitest run tests/unit/infrastructure/server-api/autobyteus-server-client.test.ts tests/unit/application/services/inbound-forwarder-worker.test.ts tests/unit/infrastructure/inbox/file-inbox-store.test.ts tests/integration/application/services/inbound-forwarder-worker.integration.test.ts tests/integration/infrastructure/inbox/file-inbox-store.integration.test.ts tests/e2e/inbound-webhook-forwarding.e2e.test.ts --passWithNoTests` — passed, 6 files / 14 tests.
- `git diff --check` — passed.
- Active source/test grep for removed receipt workflow/reply bridge and `ROUTED`/`COMPLETED_ROUTED` refs — passed with no active matches.

## Downstream Validation Hints / Suggested Scenarios

- Validate a realistic external-channel direct reply path: inbound Telegram/gateway message -> accepted dispatch -> direct coordinator reply -> one callback outbox envelope -> provider send.
- Validate the reported async team path: Telegram message to team coordinator -> coordinator delegates -> worker sends back via `send_message_to` -> coordinator emits later user-facing response -> callback outbox receives it without a second Telegram message.
- Validate two coordinator follow-up turns preserve stream order and use distinct idempotency keys.
- Validate worker/internal member output is not delivered externally unless surfaced by the coordinator/entry member.
- Validate restart recovery: pending/finalized output delivery records publish once, already-published records do not duplicate, and cached team binding restoration uses coordinator/member identity correctly.
- Validate gateway retry/inbox behavior against live server ingress `ACCEPTED` responses.

## API / E2E / Executable Validation Still Required

- Full managed Telegram/message-gateway flow with real server callback target and provider adapter behavior.
- End-to-end agent-team runs across Autobyteus, Codex, Claude, and mixed-team event shapes.
- Restart/recovery validation under durable app-data storage.
- Provider-specific delivery-event observation after callback outbox publish.

## Local Fix Update - API/E2E Round 1

- Trigger: API/E2E validation found a stale same-route/same-team target-node recovery bug where a finalized coordinator output record was marked `PUBLISHED` after the route was rebound to `targetNodeName: worker` on the same `teamRunId`.
- Fix: `ChannelBindingService.isRouteBoundToTarget()` now validates against the current exact route binding and compares `ChannelRunOutputTarget` identity directly. Explicit current team `targetNodeName` must match the output record's `entryMemberName`; stale mismatches return `BINDING_NOT_FOUND` to `ReplyCallbackService`, and the runtime marks the output record `UNBOUND` without callback outbox enqueue.
- Local fix artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery/tickets/done/external-channel-open-session-delivery/implementation-local-fix-1.md`
- Post-fix checks:
  - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed.
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts --passWithNoTests` — passed, 1 file / 4 tests.
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts tests/unit/external-channel/services/channel-binding-service.test.ts tests/unit/external-channel/services/reply-callback-service.test.ts --passWithNoTests` — passed, 3 files / 20 tests.
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/services/reply-callback-service.test.ts tests/unit/external-channel/services/channel-message-receipt-service.test.ts tests/unit/external-channel/services/channel-ingress-service.test.ts tests/unit/external-channel/services/channel-binding-service.test.ts tests/integration/external-channel/providers/file-channel-message-receipt-provider.integration.test.ts tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts tests/unit/external-channel/runtime/channel-output-event-parser.test.ts tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts tests/unit/external-channel/services/channel-run-output-delivery-service.test.ts --passWithNoTests` — passed, 9 files / 41 tests.
  - `git diff --check` — passed.
  - Active removed-path/legacy grep — passed with no active matches.
- Routing note: API/E2E added repository-resident durable validation, so this fixed state must return through `code_reviewer` before API/E2E resumes.


## Local Fix Update - Code Review Round 2

- Trigger: code review found `CR-002-001`, the reverse stale same-team target gap where an explicit-member output could still publish after the same route was rebound to the default/null team target on the same `teamRunId`.
- Fix: `ChannelBindingService.isRouteBoundToTarget()` now resolves current team binding identity through an explicit team-run boundary dependency. Default/null current team bindings compare against the effective entry/coordinator identity instead of accepting any output member on the same team run. Explicit current team bindings compare by member name and can fall back to member-run identity when needed.
- Shared identity owner: `autobyteus-server-ts/src/external-channel/services/channel-team-output-target-identity.ts` now owns team output target identity resolution for runtime target creation and binding validation.
- Durable validation added/updated:
  - `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts` now covers stale explicit worker output after rebinding to the default/null team target, expecting `UNBOUND` and no callback outbox enqueue.
  - `autobyteus-server-ts/tests/unit/external-channel/services/channel-binding-service.test.ts` now covers explicit current team target matching, default/null current target matching, and member-run-id-only explicit matching.
- Local fix artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery/tickets/done/external-channel-open-session-delivery/implementation-local-fix-2.md`
- Post-fix checks:
  - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed.
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts tests/unit/external-channel/services/channel-binding-service.test.ts tests/unit/external-channel/services/reply-callback-service.test.ts --passWithNoTests` — passed, 3 files / 22 tests.
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/services/reply-callback-service.test.ts tests/unit/external-channel/services/channel-message-receipt-service.test.ts tests/unit/external-channel/services/channel-ingress-service.test.ts tests/unit/external-channel/services/channel-binding-service.test.ts tests/integration/external-channel/providers/file-channel-message-receipt-provider.integration.test.ts tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts tests/unit/external-channel/runtime/channel-output-event-parser.test.ts tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts tests/unit/external-channel/services/channel-run-output-delivery-service.test.ts --passWithNoTests` — passed, 9 files / 43 tests.
  - `git diff --check` — passed.
  - Active removed-path/legacy grep — passed with no active matches.
- Routing note: API/E2E added repository-resident durable validation, so this fixed state must return through `code_reviewer` before API/E2E resumes.
