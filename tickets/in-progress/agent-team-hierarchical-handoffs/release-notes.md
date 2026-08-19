# Canonical Hierarchical AgentTeam Execution And AgentRun Input Admission

> **Unpublished draft.** Retained at the DR-011 SR-028 remote-verification
> checkpoint. The local Electron candidate passed user testing, but the user
> requested another-machine testing from the ticket branch. Do not publish,
> tag, merge into `personal`, or treat this as a release until later explicit
> authorization and a fresh base/tag/version check.

## What's New

- AgentTeam definitions support rooted hierarchical Agent and Team placements,
  ordered handoff guidance, exact coordinator ingress, and nested task execution
  without flat rosters or synthetic representatives.
- Team-bound AutoByteus, Codex, and Claude Agents receive the same exact
  `AgentTeam Addressing` and `AgentTeam Collaboration` guidance plus intrinsic
  `get_handoff_rules`, `send_message_to`, and `delegate_task` tools.
- Every ordinary input path now converges on one AgentRun-owned FIFO and explicit
  provider-dispatch contract. AgentRun, not callers or providers, selects start,
  exact active-turn append, or later-turn wait.
- Team execution identity remains canonical across backend and frontend:
  `{rootTeamRunId, taskTeamRunIds, memberAddress, taskAgentRunId}`.

## Improvements

- Multiple distinct commands can be admitted without a second command-registry
  queue or provider-specific busy policy. Typed command lifecycle tracks
  admission, forwarding, turn association, completion, failure, rejection, and
  cancellation.
- Codex preserves exact active-turn steering. AutoByteus and Claude retain
  accepted active input for a later turn, resolving the formerly blocked Claude
  task-peer reverse reply without duplicating provider queues.
- Stop/interrupt and ordinary input have one ordered AgentRun owner. Waiting
  input does not steer into a closing turn and drains once after rejection/throw
  or canonical interrupted terminal.
- Claude Agent SDK is pinned to `0.3.231` with exact compatible Anthropic/MCP
  peers. Required intrinsic Team MCP tools load on the first turn, while product
  interruption keeps the singular AbortController settlement/cleanup path.
- Team streams, launch, messaging, delegation, approval, status, history,
  memory, token usage, artifacts, and desktop/mobile navigation retain strict
  canonical execution identity and fail-closed behavior.

## Data And Compatibility

- AgentRun input admission and interrupt reservations are intentionally
  non-persisted live state. No database migration or compatibility reader is
  introduced.
- Existing schema-v3 TeamRun metadata, canonical task/communication/token
  records, and physical memory lineage are unchanged.
- Provider-local input queues, retry/fallback between dispatch kinds,
  `streamInput`/priority scheduling, `Query.interrupt()` product fallback,
  retired `Team Runtime` copy, and different-command busy rejection are not
  supported.

## Validation

- Full source review: CRR-089 Pass, `9.5/10 (95.4/100)`.
- API/E2E: API-REV-040 Pass, `98%` confidence.
- Durable test review: CRR-090 Pass across exactly five updated server-test
  paths, with no findings.
- Currentized focus `18/18`, top-level integration `3/3`, and SR-028 affected
  selection `223/223` passed.
- Broad server `620` active tests and broad web `540/540` passed; the declared
  skipped Claude repository capability suite was excluded from provider proof.
- Both production builds passed.
- Checked-disposable real browser/provider validation passed `12/12` across
  AutoByteus, Codex, and Claude, including exact task-peer reply, configured Stop
  plus waiting FIFO, standalone, imported Team, public classroom,
  desktop/mobile/reference, restore, termination, and cleanup paths.

## Operational Disclosure

Earlier validation rounds accidentally targeted the operational production
SQLite database twice: API-REV-014 applied one pending Prisma migration and
recorded a failed canonical migration; API-REV-018 inherited that target on an
unsafe raw start. No rollback or repair was attempted. API-REV-040 and delivery
did not inspect or act on that database, used/accepted only checked disposable
target evidence, and did not touch the protected user stack.

## Packaging Note

A fresh macOS arm64 Electron `1.4.50` DMG/ZIP was built from the current SR-028
checkpoint for local user verification. Package and archive integrity, bundle
identity/version/architecture, embedded server, native-helper permissions, and
symlink integrity passed. The package is not Developer ID signed or notarized,
was not launched by delivery, and has not been published or released.

The README build completed only after a packaging-only recovery that
temporarily materialized the already-built `@autobyteus/team-stream-contracts`
workspace package inside the application root; source and manifests were not
changed and the original symlink was restored. A durable correction remains a
release-reproducibility follow-up before treating the clean command as a release
build.
