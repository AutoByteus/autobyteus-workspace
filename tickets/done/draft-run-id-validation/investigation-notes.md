# Investigation Notes

## Investigation Meta

- Package identifier: `draft-run-id-validation`
- Request / ticket: Project Task from `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), "Security hardening (OBS-001): validate draft run IDs". Origin: OBS-001 in `tickets/done/composer-context-file-removal/api-e2e-execution-coverage-report.md` (Project Task `project_task_9261def1-bb86-494f-aa1a-bbd643e2f9a4`). The user's decision on 2026-10-09/10 was "definitely do it now".
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation`, branch `codex/draft-run-id-validation`
- Resolved base remote / branch / revision: `origin/personal` @ `d28c56d5de8e5429e73dd7c42b78767cc531180c`, fetched on 2026-10-10
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree and branch created from the freshly fetched `origin/personal`. The first attempt was stopped and its worktree removed (see the handover file in the Task context). The work resumed on 2026-10-10 by the composer-context-file-removal Solution Designer: same path and branch, recreated from `origin/personal` @ `d28c56d5d` (unchanged). These notes were restored from the Task context `ctx_d7714264c7ab__investigation-notes.md`. Findings 1–3 were re-verified in code on this base (`required` is trim-only; `safeIdentity`; `sendDraftRouteError`; the agent-final route rethrows; the layout guard throws a plain `Error`).
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-10)
- Investigation status: Requirements investigation complete; architecture investigation not yet started

## Initial Request And Clarifications

- Original request:
  - Validate `agent_draft.draftRunId` with `safeIdentity`.
  - Do the same for `teamDraftId` and any other trim-only draft-locator field.
  - Audit every owner kind, every codec field, `/rest/drafts/*` and the context-file routes.
  - Traversal or malformed IDs must return 400 with `detail`: never 500, never a read or delete.
  - Keep `resolveSafeChildPath`.
  - Convert the three `observeOnly` probes into graded tests and add per-owner-kind unit tests.
  - Make sure legitimate ID formats still pass.
- Clarifications received: none yet.
- User-supplied facts and constraints:
  - Nothing outside the draft root is reachable today, and there is no privilege gain today.
  - The fix is about a consistent trust boundary ahead of per-user or per-agent access (remote access).
  - Merge is required; whether to release is the user's decision.
- Initial ambiguity: how far "every field" extends. It could also cover the final-owner `runId` and the stored filename. See DEC-001 and DEC-002 in the requirements doc.

## Product And Domain Understanding

- Product area: composer context-file attachments (draft uploads before send, final files after send) on `autobyteus-server-ts`.
- Affected actors or systems:
  - The web/desktop composer: upload, GET preview, DELETE remove, finalize on send.
  - Paired remote (phone) clients, through the remote-access route policy.
  - The server-side locator-to-local-path resolver used for runtime input.
- Relevant terminology:
  - **Owner descriptor:** `{kind, …ids}`.
  - **Draft locator:** `/rest/drafts/<owner path>/context-files/<storedFilename>`.
  - **Final locator:** `/rest/runs/…`, `/rest/team-runs/…`, `/rest/agent-org-runs/…` or `/rest/agent-collaborations/…`.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-10 | Doc | `tickets/done/composer-context-file-removal/api-e2e-execution-coverage-report.md` § Out-Of-Scope Observations | Origin evidence | OBS-001: live HTTP 200/204 cross-owner read/delete via `..%2Fagent-runs%2Fvictim`; `%2E%2E` reaches `draft_context_files/context_files`; `..%2F..%2Fx` → 500 without detail | — |
| 2026-10-10 | Doc | `/Users/normy/autobyteus_org/composer-context-file-removal-reports/terminal-receipt-verification.md` | Prior receipt | OBS-001 listed as the recommended separate task | — |
| 2026-10-10 | Code | `autobyteus-server-ts/src/context-files/domain/context-file-owner-types.ts` | Codec and validators | `required()` (trim-only) is used for `agent_draft.draftRunId`, `team_member_draft.teamDraftId` and `agent_final.runId`. `safeIdentity` is used for every Org, Team-final and collaboration ID. `memberAddress` uses `assertAgentTeamAddress`. `filename()` trims and rejects `..`, `/` and `\`, but not control characters | Design: apply `safeIdentity` to the remaining fields |
| 2026-10-10 | Code | `src/context-files/store/context-file-layout.ts` | Path derivation | Draft dir = `resolveSafeChildPath(draftRoot, "agent-runs", draftRunId, "context_files")`, and similarly for the other kinds. A containment failure throws a plain `Error("Invalid context-file path.")` | Keep it as defence in depth |
| 2026-10-10 | Code | `src/api/rest/context-files.ts` | Routes and error mapping | `sendDraftRouteError` maps `ContextFileDescriptorError`/`CollaborationContractError` → 400 and owner-not-found → 404, and rethrows everything else (→ 500). Upload and finalize map every error → 400. `GET /runs/:runId/context-files/:file` maps only `StandaloneContextFileOwnerNotFoundError` → 404 and rethrows `ContextFileDescriptorError` (→ 500) | Route mapping must cover new validation errors on the agent-final route |
| 2026-10-10 | Code | `src/context-files/services/context-file-read-service.ts`, `context-file-owner-resolver.ts` | Read/delete path | Draft read/delete: `validateDraftOwner` (only Org and collaboration kinds are checked against an admitted final owner; `agent_draft` and `team_member_draft` are not), then cleanup, then layout path, then `fs.stat`/`fs.unlink`. Agent final: `readiness.isAdmitted("agent", runId)` first, so an unadmitted `..` → 404 | — |
| 2026-10-10 | Code | `src/context-files/services/context-file-local-path-resolver.ts` | Server-side locator resolution for runtime input | Uses the same `parseDraftContextFileLocator`. Any thrown error → `null` (unresolved). With trim-only IDs, a traversal draft locator in message content resolves to another owner's draft file | It inherits codec validation automatically |
| 2026-10-10 | Code | `src/agent-memory/store/agent-memory-layout.ts` | Agent final path | `getStandaloneRunDirPath` already rejects `/`, `\`, `.` and `..` with a plain `Error` | — |
| 2026-10-10 | Code | `src/agent-collaboration/domain/agent-team-address.ts` | `memberAddress` validation | Canonical rooted address: rejects `.`/`..` segments, empty segments, `\` and untrimmed values. The layout stores it as `encodeURIComponent(address)` (a single path segment) | Already safe; no change |
| 2026-10-10 | Code | `src/context-files/domain/context-file-upload-policy.ts` | Stored-filename format | Generated names are `ctx_<token>__<stem><.ext>` with the stem sanitized to `[a-zA-Z0-9._-]` | Rejecting control characters cannot affect a generated name |
| 2026-10-10 | Code | `src/agent-execution/identity/agent-run-id.ts`, `src/agent-team-execution/domain/team-run-id.ts`, `src/agent-org-execution/services/agent-org-run-planner.ts`, `src/agent-team-execution/task-delegation/task-team-run-identity-factory.ts` | Legitimate server ID formats | Agent, Team, Org, task-Team and delegated-child IDs are `<slug [a-z0-9_]>_<32 hex>` | All pass `safeIdentity` |
| 2026-10-10 | Code | `autobyteus-web/stores/agentContextsStore.ts:90`, `stores/chatDraftStore.ts:67`, `types/agent/TeamLaunchDraft.ts:105`, `utils/contextFiles/contextFileOwner.ts` | Legitimate client draft IDs | `temp-<ms>-<n>`, `temp-chat-<ms>-<n>`, `team-draft-<uuid>`, or a real run ID once a run exists. The web trims every owner ID before sending | All pass `safeIdentity`. Stricter "no surrounding whitespace" cannot break the web client |
| 2026-10-10 | Code | `autobyteus-server-ts/src/api/rest/project-task-context-files.ts`, `src/projects/stores/projects-layout.ts` | Audit of the adjacent Project-task draft routes | IDs already go through a safe-id check (`/`, `\`, `\0`, `.`, `..`), and errors map to 400/404 | Out of scope; already consistent |
| 2026-10-10 | Code | `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs:309-370` | `observeOnly` probes | Three `observeOnly` paths (`%2E%2E`, `..%2F..%2Fx`, `..%2Fagent-runs%2Fvictim`) run GET+DELETE and are not graded. The draft-root-level and other-owner sentinels are only reported, not asserted. Only the app-data sentinel is asserted | Grade them: 400 + detail, with all sentinels intact |
| 2026-10-10 | Code | `autobyteus-server-ts/tests/integration/api/rest/draft-context-files-universal.integration.test.ts`, `tests/integration/api/rest/context-files.integration.test.ts`, `tests/unit/context-files/context-file-owner-types.test.ts` | Existing coverage | `INVALID_LOCATORS` → 400 + detail and absent → 404 already cover the safe kinds. There are no traversal cases for `agent_draft` or `team_member_draft` | Extend |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Draft read/remove at `GET`/`DELETE /rest/drafts/agent-runs/<draftRunId>/context-files/<f>` | The codec decodes `%2F` inside the ID segment and only trims it. The layout joins it into the path | A crafted ID addresses another owner's draft inside the draft root: 200/204 live. A deeper escape trips the containment guard → 500 with no `detail` | OBS-001 live probe; code | High (live-proven) |
| BEH-002 | Contract | Same, for `/rest/drafts/team-runs/<teamDraftId>/members/<addr>/…` | `teamDraftId` is trim-only, same as above | Same exposure inside the draft root (code-inferred) | Code | High (code); not live-probed |
| BEH-003 | Contract | `POST /rest/context-files/upload` with the owner descriptor JSON | The owner is parsed by the same validator | A traversal `draftRunId`/`teamDraftId` writes into another owner's folder. Errors → 400 | Code | Medium-high (code-inferred) |
| BEH-004 | Contract | `POST /rest/context-files/finalize` with `draftOwner` + `finalOwner` | Same draft validator | A traversal draft owner can move another owner's draft into the caller's admitted final run. Errors → 400 | Code | Medium-high (code-inferred) |
| BEH-005 | Contract | `GET /rest/runs/<runId>/context-files/<f>` | `runId` is trim-only, but admission (`isAdmitted`) gates it first | A traversal ID gets 404 (not reachable). An invalid stored filename after admission → `ContextFileDescriptorError` rethrown → 500 | Code | High (code) |
| BEH-006 | System | Runtime input: a draft/final locator in message content resolved to a local path | Same codec. An error → unresolved | A traversal draft locator resolves to another owner's draft file | Code | High (code) |
| BEH-007 | Contract | Org, collaboration and Team-final kinds | `safeIdentity` → `ContextFileDescriptorError` → 400 + detail | Already correct and covered by integration tests | Code + tests | High |
| BEH-008 | Contract | Stored filename in any locator | `filename()` trims and rejects `..`, `/` and `\` | `%00`/control characters pass. The `fs` call then throws a non-ENOENT error → 500 (code-inferred) | Code | Medium (not live-probed) |

The scenario of a crafted raw-HTTP ID from another client is a `Supported Explicit Edge Scenario`. Its governing contract is the server trust boundary: remote-access paired clients reach these routes through `remote-access-route-policy.ts`. The user has explicitly decided the boundary must be enforced.

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `context-file-owner-types.ts` `parseDraftContextFileOwnerDescriptor` / `parseFinalContextFileOwnerDescriptor` / `parseDraftContextFileLocator` | The single validation point for all owner descriptors and draft locators | Every entry point (routes, resolver, finalize, upload) inherits a fix made here | Use the existing `safeIdentity`; no new validator needed |
| `context-file-layout.ts` `resolveSafeChildPath` | Containment guard | Must be kept | Whether a guard trip should map to 400 rather than 500: a design decision (defence in depth) |
| `api/rest/context-files.ts` agent-final GET | Rethrows `ContextFileDescriptorError` | Would become a 500 once `runId` is validated | Route error mapping must include it |
| Web `contextFileOwner.ts` | Trims and requires non-empty | No client change required | Optional mirror validation is not needed |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Draft folders under `<appData>/draft_context_files/{agent-runs,team-runs,agent-org-runs,agent-collaborations}/…`. They have a 24 h TTL, are pruned by cleanup, and have no schema.
- Evidence paths: `context-file-layout.ts` and `context-file-upload-policy.ts`.

### Structural Surfaces

- REST routes: `/rest/context-files/upload`, `/rest/context-files/finalize`, `GET`/`DELETE /rest/drafts/*`, and four final GET routes.
- The server locator resolver.
- The context-file owner codec, which is the single trust-boundary owner.

### Potential Structural Impacts To Investigate

- API or external-contract change: some malformed input moves to 400 (see the requirements doc's status-code deltas). Valid requests are unchanged.
- Persistence schema or invariant change: none.
- Security or privacy boundary change: yes. The boundary is tightened, with no new boundary.
- Concurrency or lifecycle change: none.
- Deployment/migration/ownership/refactoring: none expected.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Prior API/E2E run (composer-context-file-removal CF-001, observeOnly rows) | `..%2Fagent-runs%2Fvictim`, `%2E%2E`, `..%2F..%2Fx` | 200/204 cross-owner; reaches `draft_context_files/context_files`; 500 without detail | REQ-001, REQ-002, AC-001..AC-003 | `tickets/done/composer-context-file-removal/api-e2e-evidence/` |
| 2026-10-10 live re-probe (running desktop server 127.0.0.1:29695, own probe owner `obs001_victim`) | Upload to `agent_draft obs001_victim`, then GET/DELETE via `..%2Fagent-runs%2Fobs001_victim`; deep `..%2F..%2Fx` | GET 200, DELETE 204 (victim's own locator then 404); deep escape 500 `Invalid context-file path.`. Probe file removed by the probe itself | Confirms BEH-001 and REQ-002 on the current app | this conversation |

No new live probe was run in this phase. (Superseded on 2026-10-10 by the re-probe row above for BEH-001.) The code paths for BEH-002..BEH-006 and BEH-008 are inferred from source. API/E2E will prove them.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (2026-10-09/10) | "definitely do it now" | Explicit | Priority: do now | — |
| Task text | Do not break existing drafts; merge required; release is the user's call | Explicit | REQ-006, out-of-scope release | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Fastify wildcard route `request.url` | Fastify 4.29.1 | `/drafts/*` receives the raw (still percent-encoded) URL; the codec decodes each segment | `context-files.ts:139-143` | — |
| Fastify param routes (`/runs/:runId/…`) | Fastify 4.29.1 | Params are percent-decoded before the handler | Prior OBS-001 report | — |

## Persisted Data And State Facts

- Affected stored subject: draft context-file folders, named by owner IDs.
- Current readers and writers: upload (write), GET (read), DELETE (delete), finalize (move), cleanup (TTL prune), local-path resolver (read).
- Required preservation: every existing draft folder created by a supported client keeps working. Generated IDs never contain `/`, `\`, control characters or surrounding whitespace, and are never `.` or `..`.
- Acceptable loss: none needed. No folder becomes unaddressable for supported clients.
- Remaining evidence gap: none material.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. This is a backend/security change with no UI change.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `tickets/done/composer-context-file-removal/api-e2e-execution-coverage-report.md` (OBS-001) | API/E2E (prior ticket) | Origin evidence | Read-only reference | REQ-001..REQ-003 | Final | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Third-party or remote clients might send IDs with surrounding whitespace that were previously trimmed | They would now get 400 | No such client exists in the repo; the web trims first. Accept | Open (accepted) |
| UNK-001 | Unknown | Exact status of `%00` in the stored filename today (500 inferred) | Determines whether it is a real fix or only consistency | API/E2E to observe | Open |

## Architecture Investigation Findings

Pending until requirements are approved.

## Requirement Implications

- The fix point is the single owner codec. Every route and the resolver inherit it.
- Three fields are trim-only: `agent_draft.draftRunId`, `team_member_draft.teamDraftId` and `agent_final.runId`. The first two are in-root reachable today. The third is gated by admission.
- The agent-final route's error mapping currently turns a descriptor error into a 500. Validating `runId` would make that visible, so the route mapping must be in scope.
- Status-code deltas are confined to malformed input.

## Notes For Architecture Design

- Map SCN-001..SCN-004 onto: the codec validators, then the route error mapping (`sendDraftRouteError`, the agent-final route), then the layout guard (unchanged; decide its error class).
- Verify that `safeIdentity` covers every legitimate ID format listed above (unit test).
- Decide whether the layout guard's error becomes a `ContextFileDescriptorError` (or a dedicated error) so that an unforeseen guard trip still maps to 4xx rather than 500.
