# Delivery Handoff — Application-Owned MCP Capability

## Current Status

`Blocked at DR-004 — latest-base Agent Tools MCP session ownership conflicts require upstream design reconciliation.`

- Date: `2026-08-27`
- Current delivery revision: `DR-004`
- Current lineage: `SR-008; ARCH-REV-008; IR-005; CRR-009; API-REV-004`
- Earlier platform scope: `API-REV-001 Pass / 97.2%` for `AC-001`–`AC-031`
- Renewed Agent/UI scope: `API-REV-004 Pass / 97.6%` for `AC-032`–`AC-039`
- Proportional durable-test review: `CRR-009 Pass; no findings`
- Documentation sync: `DR-003 checkpoint updated; latest-base combined docs blocked`
- User acknowledgement: `Received for DR-003; superseded for finalization by a material latest-base change`
- Renewed user verification required: `Yes, after the combined design is implemented and revalidated`
- Repository finalization/release/deployment: `Not performed`

## Integrated State

- Ticket branch: `codex/application-owned-mcp-capability`
- Finalization target: `origin/personal` -> local `personal`
- Latest tracked base: `ebef77eb32bbeaefd4fccdb6998240264c82a3c1`
- Protected ticket checkpoint: `aaf7e076ed66c5daaf142f896230ad63085330c7`
- Divergence after the DR-004 fetch and aborted merge: `4 behind / 4 ahead`
- Integration method: `Attempted merge; aborted after 12 content conflicts`
- New base commits integrated: `None; merge did not complete`
- Electron build: `Not run`; no valid latest-base integrated state exists.
- Detailed evidence: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/delivery-integration-evidence.log`

## Latest-Base Design Conflict

The new base finalizes `agent-tools-mcp-session-resume`: deterministic tokenless
run-session identities on a dedicated loopback listener, fresh activation on
restore, and exact-run session deactivation during termination. The application
capability was reviewed against the prior bearer-backed session model and adds
application/binding/producer route identity and capabilities in the same
session, provider-factory, host, and execution-kernel owners.

The merge conflicted across five docs, five production owners, and two durable
tests. Resolving those conflicts mechanically could either remove application
authorization or regress the newly released stop/restore contract. The merge
was therefore aborted and classified `Design Impact`.

Canonical blocker:
`/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/delivery-latest-base-conflict-report.md`.

## Delivered Behavior

1. Application manifest v5 can declare static application-owned `agentTools[]`; backend definition v7 implements the exact `agentToolHandlers` name set.
2. Selected tools remain application-local. Claude/Codex receive an authenticated `application_agent_tool` route through the existing Agent Tools MCP host; AutoByteus-native runs receive a bound local projection over the same common capability.
3. Platform/static names are reserved. An application route may outrank a same-name configured external MCP tool only inside that owning application; general-process and other-application sessions do not inherit it.
4. The common gateway revalidates current declaration, availability, exact application/binding/producer ownership, schema, and bounded result, then invokes the exact owning worker once without automatic retry.
5. Package import/reload/removal and exact re-entry use one serialized staged catalog transition. Affected tool lanes close and drain before worker stop; unrelated applications remain untouched.
6. Maintained Brief Studio keeps `get_brief_context` read-only. The actual configured Codex/Luna researcher and writer each call it exactly once first at their role boundary, use the returned marker, create their canonical workspace files with Luna's built-in `apply_patch`, publish relative paths, and complete the full Team handoff.
7. The model-facing `apply_patch`, Codex native `item/fileChange` / `file_change`, and AutoByteus normalized `edit_file` lifecycle are distinct. Neither built-in nor normalized name is a configured routed tool.
8. Existing artifact relay/reconciliation—not the context tool—moves the same Brief to `in_review`, publishes the final writer artifact, emits the existing notification/refresh, and renders the result in the supported Brief Studio browser UI.

## Verification Evidence

- Feature matrix for the original platform scope: `33 files / 234 tests` passed under API-REV-001.
- Renewed focused repository matrix: `6 files / 97 tests` passed.
- Current built-package contract: `1 file / 4 tests` passed.
- SDK/devkit/Brief builds, Brief backend typecheck/package validation, and production server build passed.
- Default optional Codex gate compiled and skipped the expected `10` tests.
- Exact live `gpt-5.6-luna` file-change case passed `1` test with `9` filtered skips in `13.65s`.
- Actual shipped researcher/writer browser journey passed all `AC-032`–`AC-039` evidence joins: application, binding, member, run, tool invocation, provider patch, normalized trace, handoff, artifact revision, Brief state, and semantic UI observation.
- Canonical joined evidence: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-004/identity-trace-artifact-ui-join.json`
- Browser observation: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-004/final-browser-observation.json`
- Browser screenshot: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-004/final-browser-in-review.png`

## Documentation Sync

Long-lived documentation now reflects current v5/v7 contracts, authoring, route isolation/precedence, worker authorization/result handling, staged transition and drain behavior, and the exact Brief Studio Agent-to-UI workflow.

Canonical report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/docs-sync-report.md`.

## Persisted Data And Generated Artifacts

- Existing application databases, bindings, journals, launch overrides, Agent/Team definitions, and global MCP configuration remain directly usable without migration.
- Generated/importable application packages from manifest v4/backend v6 are rebuildable artifacts and must be regenerated on v5/v7; no production compatibility fallback was added.
- Reproducible build/package output generated during delivery checks was cleaned from the worktree.

## Residual Risks And Non-Feature Failures

- External model behavior and provider availability remain inherently nondeterministic.
- Supplemental server typecheck is blocked by the pre-existing `rootDir/include` TS6059 configuration; production build and ticket-relevant TypeScript/Vitest paths passed.
- One observer-only SQLite read saw a transient lock and immediately resumed.
- Codex used its bundled bubblewrap because the system copy was absent; both provider turns and patches completed.
- Historical `API-BROAD-001` retains 25 reproducible failures in five unchanged workspace/run-history files from API-REV-001. They were not represented as ticket passes and were not reclassified by API-REV-004.
- The older unavailable optional-inference attempt is historical; API-REV-004 subsequently ran the exact shipped Luna model successfully.

## Authoritative Artifact Package

- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/requirements.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/investigation-notes.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-spec.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/application-owned-mcp-intended-behavior.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/implementation-handoff.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-coverage-investigation.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-execution-coverage-report.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-test-review-report.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/delivery-revision-record.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/docs-sync-report.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/release-deployment-report.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/release-notes.md`

## Explicit Integration And Verification Hold

The prior DR-003 acknowledgement is not authorization for an unresolved
latest-base combination. Until the new session/application design passes the
full downstream cycle and receives renewed user verification:

- keep the ticket under `tickets/in-progress/application-owned-mcp-capability`;
- do not create the final delivery commit;
- do not push the ticket branch;
- do not merge/push `personal`;
- do not tag, publish, release, deploy, archive, or clean up the ticket worktree/branch.

After explicit acceptance, delivery will refresh `origin/personal` again, protect current delivery edits if needed, re-integrate and rerun checks if the target advanced, request renewed verification if the handoff materially changes, then archive and finalize in the documented order.
