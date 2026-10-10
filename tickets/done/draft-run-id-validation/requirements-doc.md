# Requirements Document — draft-run-id-validation

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `draft-run-id-validation`
- Request / ticket: Project Task `project_task_5f097b56-100a-4a94-9fab-fbbe2e1d778f` (OBS-001 from `composer-context-file-removal`)
- Requirements owner: Solution Designer
- Date: 2026-10-10
- Approval state and reference: Approved by the user on 2026-10-10: "what is your suggestion, do it as you suggested." This accepts the SR-001 baseline with DEC-001, DEC-002 (filename allowlist) and DEC-003 all Yes, as recommended.
- Exact approved baseline: SR-001 as refined on 2026-10-10 (REQ-001..009, AC-001..009)
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: the server's context-file owner IDs `agent_draft.draftRunId`, `team_member_draft.teamDraftId` and `agent_final.runId` are only trimmed. A crafted ID such as `..%2Fagent-runs%2Fvictim` addresses another owner's draft. This was proven live: GET 200 and DELETE 204 cross-owner. The same exposure exists on upload, on finalize, and in runtime locator resolution. A deeper traversal trips the path guard and returns 500 without a `detail`. All other owner IDs are already validated.
- Desired outcome: every context-file entry point rejects any owner ID or stored filename that could resolve outside its own owner folder. It answers 400 with a `detail`, never 500, and never reads, writes, moves or deletes a file. Legitimate IDs and existing drafts keep working.
- Success: traversal probes return 400 + `detail`, and every sentinel file is untouched. All supported clients' flows (attach, preview, remove, send) are unchanged.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001 | Draft GET/DELETE with a traversal `draftRunId`: cross-owner 200/204; deep escape → 500 | 400 + detail; no file touched | Valid IDs: 200/204/404 as today |
| BEH-002 | Contract | SCN-001 | Same for `teamDraftId` (code-inferred) | Same as BEH-001 | Same |
| BEH-003 | Contract | SCN-001 | Upload with a traversal owner writes into another owner's folder | 400 + detail; nothing written | Valid upload |
| BEH-004 | Contract | SCN-001 | Finalize with a traversal draft owner can move another owner's draft | 400 + detail; nothing moved | Valid finalize |
| BEH-005 | Contract | SCN-002 | `GET /rest/runs/<runId>/…` with a traversal `runId` → 404 (admission-gated); invalid filename after admission → 500 | 400 + detail for malformed `runId` or filename (DEC-001) | Valid final reads |
| BEH-006 | System | SCN-003 | A traversal draft locator in message content resolves to another owner's file | Unresolved (not resolved to any file) | Valid locators resolve |
| BEH-007 | Contract | — | Org, collaboration and Team-final IDs already validated → 400 | Unchanged | Yes |
| BEH-008 | Contract | SCN-001 | Stored filename with control characters (e.g. `%00`) likely → 500 | 400 + detail (DEC-002) | Generated names unaffected |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| Desktop/web user | Attach, preview, remove, send files | Unchanged | No broken drafts |
| Paired remote client (via remote-access route policy) | Same routes over the network | Cannot reach another owner's files | Consistent trust boundary |
| Agent runtime | Resolve attachment locators to files | Only its own owners' files | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| UC | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Reject malformed or traversal owner IDs and stored filenames on every context-file route (upload, finalize, draft GET/DELETE, final GETs) | SCN-001, SCN-002 |
| UC-002 | Runtime locator resolution never resolves a malformed locator | SCN-003 |
| UC-003 | Legitimate IDs and existing drafts keep working | SCN-004 |

### Out Of Scope

- Project-task context-file routes (they already validate).
- Per-user or per-agent authorization of drafts (a future capability). Remote-access policy changes.
- Release (the user decides after merge).

### Non-Goals

- No new authorization model. Any well-formed draft locator stays addressable by its own locator, as today.

### Preserved Behavior Boundary

BEH-007; every valid request's status and outcome; `resolveSafeChildPath` stays as defence in depth; no change to locator strings or the storage layout.

### Review Authority

Standard: blocking findings must cite REQ/AC/BEH IDs; scope-changing proposals are `Requirement Gap`s needing user approval.

## Requirements

| REQ | Requirement | BEH | Priority |
| --- | --- | --- | --- |
| REQ-001 | Every owner ID field of every draft and final owner kind is validated as a safe identity: non-empty; no surrounding whitespace; no `/`, `\` or control characters; not `.` or `..`. This is the same rule the other kinds already use. `memberAddress` keeps its existing canonical team-address validation. | BEH-001..005 | Must |
| REQ-002 | A malformed or traversal owner ID or stored filename on any context-file route returns 400 with a `detail` message. It is never 500, and the server never reads, writes, moves or deletes any file. | BEH-001..005, 008 | Must |
| REQ-003 | If a path still fails the storage containment guard (defence in depth), the route answers 4xx with `detail`, not 500, and touches nothing. | BEH-001 | Must |
| REQ-004 | Runtime locator resolution treats a malformed locator as unresolved. | BEH-006 | Must |
| REQ-005 | All ID formats produced by current clients and the server still pass: server `<slug>_<32hex>` (agent, team, Org, task team, delegated child) and web `temp-<ms>-<n>`, `temp-chat-<ms>-<n>`, `team-draft-<uuid>`. Existing drafts remain addressable. | — | Must |
| REQ-006 | Tests: validator unit tests per owner kind and field, including legitimate formats; server integration traversal cases per route; the three `observeOnly` API/E2E probes become graded (400 + detail, all sentinels intact), plus `team-runs` and `/rest/runs/` traversal cases. | all | Must |
| REQ-009 (DEC-003) | `agent_draft` and `team_member_draft` descriptors with unknown extra fields are rejected (400 + detail), like the other owner kinds. | BEH-003, BEH-004 | Must (approved) |
| REQ-007 (DEC-001) | `agent_final.runId` gets the same validation, and the agent-final route maps validation errors to 400 + detail. | BEH-005 | Must (approved) |
| REQ-008 (DEC-002) | Stored filenames are validated against an allowlist: only `A-Z a-z 0-9 . _ -`, and not dot-only. This rejects control characters, NUL and every separator (400 + detail). The server has generated every stored filename in exactly this character set since `d39b26e37` (2026-04-13), so all existing files pass. | BEH-008 | Must (approved) |

## Acceptance Criteria

| AC | REQ | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 002 | GET and DELETE `/rest/drafts/agent-runs/..%2Fagent-runs%2Fvictim/context-files/<f>`, `/rest/drafts/agent-runs/%2E%2E/context-files/<f>`, `..%2F..%2Fx` | 400 + detail; victim, draft-root-level and app-data sentinels intact | API/E2E graded probes + server integration |
| AC-002 | REQ-001, 002 | Same with `team-runs/<traversal teamDraftId>/members/...` | 400 + detail; sentinels intact | Integration + API/E2E |
| AC-003 | REQ-001, 002 | Upload and finalize with a traversal draft owner | 400 + detail; nothing written or moved | Integration |
| AC-004 | REQ-003 | A path that would fail only the containment guard | 4xx + detail, not 500 | Unit/integration |
| AC-005 | REQ-004 | Resolve a traversal draft locator | `null` (unresolved) | Unit |
| AC-006 | REQ-005 | All listed legitimate ID formats on upload → GET → DELETE → finalize | Same results as today | Unit + integration |
| AC-007 | REQ-007 | `GET /rest/runs/%2E%2E/context-files/<f>` and an invalid filename after admission | 400 + detail | Integration + API/E2E |
| AC-008 | REQ-008 | Stored filename containing `%00`, a space or `:`, or a dot-only name (`.`, `%2E`) | 400 + detail; a generated `ctx_<token>__<stem>.<ext>` name still works | Integration |
| AC-009 | REQ-009 | Upload or finalize with `{kind:'agent_draft', draftRunId, extra:1}` | 400 + detail; nothing written | Integration |

## Relevant Scenarios And Journeys

| Scenario | Kind | Actor | Goal | Trigger | Expected | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | Any HTTP client, incl. paired remote clients | Address a draft through upload, GET, DELETE or finalize | Crafted owner ID or filename | 400 + detail; nothing touched | Supported Explicit Edge Scenario (server trust boundary; user decision to enforce) | OBS-001 live probe |
| SCN-002 | Contract | Same | Read a final file | Crafted `runId` or filename | 400 + detail | Supported Explicit Edge Scenario | Code |
| SCN-003 | System | Agent runtime | Resolve a locator from message content | Crafted locator | Unresolved | Supported Explicit Edge Scenario | Code |
| SCN-004 | User | Desktop/web user | Attach, preview, remove, send | Normal use | Unchanged | Supported Normal Scenario | Prior ticket CF tests |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. Product design: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| QR | REQ/AC | Area | Requirement |
| --- | --- | --- | --- |
| QR-001 | REQ-001..004 | Security | No context-file entry point resolves an owner path outside its own owner folder |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`. Draft folder names created by supported clients already satisfy the rule; no migration; no loss.

## External Contracts And Dependencies

| Contract | Constraint |
| --- | --- |
| Fastify 4.29.1 | The wildcard `/drafts/*` gets the raw URL (the codec decodes); param routes get decoded params. Validation runs on decoded values. |

## Supplemental Artifacts

| Artifact | Purpose | Status |
| --- | --- | --- |
| Task context `ctx_ae6a85a189a1__handover.md` | Prior attempt's handover | Reference |
| `tickets/done/composer-context-file-removal/api-e2e-execution-coverage-report.md` (OBS-001) | Origin evidence | Reference |

## ID Rule Rationale

- Owner IDs use the existing shared `safeIdentity` rule, not a strict character allowlist. Historical run folders may contain spaces or punctuation (`agent-run-id-sanitization` NG-001: no migration of old folders), and a draft's owner ID for an existing run is that run's ID, so a strict allowlist could block composing in old runs. The primary control remains canonicalize-then-verify-containment (`resolveSafeChildPath`), as OWASP recommends, with early 400 rejection in front of it. Evidence: all 692 agent memory folders on the user's install match `[A-Za-z0-9_-]`, but other installs may differ.

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | No supported client sends owner IDs with surrounding whitespace (the web trims first) | Confirmed in code |

## Open Decisions And Questions

| ID | Question | Recommendation | Status |
| --- | --- | --- | --- |
| DEC-001 | Also validate `agent_final.runId` (it's gated today, but inconsistent)? | Yes: REQ-007 (a traversal `runId` changes from 404 to 400). Validate format before lookup: RFC 9110 400, as in Google AIP-193 INVALID_ARGUMENT before NOT_FOUND. The 400 depends only on the input, so it reveals nothing about which runs exist | Resolved: Yes |
| DEC-002 | Validate stored filenames? | Yes, as an allowlist (REQ-008). Allowlisting is OWASP's preferred input validation, and the server generates every filename in this character set, so nothing legitimate is rejected | Resolved: Yes |
| DEC-003 | Reject extra unknown fields on `agent_draft`/`team_member_draft` descriptors like the other kinds? | Yes (revised 2026-10-10). Strict schemas are standard practice and the other kinds already do it. The only producer, the web app's `contextFileOwner.ts`, sends exactly the known fields (repo grep: no mobile or gateway producer) | Resolved: Yes |

## Status-Code Changes (malformed input only)

- Untrimmed owner IDs: previously trimmed and accepted → 400.
- Traversal IDs on upload/finalize/draft GET/DELETE: 200/204/500 → 400.
- Agent-final invalid filename: 500 → 400. Agent-final traversal `runId`: 404 → 400 (DEC-001).

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | 001–005 | 001–003 | 001 |
| REQ-002 | UC-001 | 001–005, 008 | 001–003 | 001 |
| REQ-003 | UC-001 | 001 | 004 | 001 |
| REQ-004 | UC-002 | 006 | 005 | 003 |
| REQ-005 | UC-003 | — | 006 | 004 |
| REQ-006 | all | all | all | all |
| REQ-007 | UC-001 | 005 | 007 | 002 |
| REQ-008 | UC-001 | 008 | 008 | 001 |
| REQ-009 | UC-001 | 003, 004 | 009 | 001 |

## Architecture Phase Input

- Single fix point: the owner codec (`context-file-owner-types.ts`); route error mapping in `api/rest/context-files.ts`; the layout guard's error class.
- Verify every legitimate ID format against the rule in unit tests.

## Readiness Check

- Content ready for approval: `Yes`.
- Approved basis ready for design: `Yes` (2026-10-10).
