# Requirements Document — memory-sync-large-files

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `memory-sync-large-files`
- Request / ticket: Project Task `autobyteus-workspace-7` — "Memory Sync: one attachment over ~37 MiB stops all syncing" (FU-001 of `autobyteus-workspace-6`)
- Requested by: `/project_task_manager` (run `project_task_manager_89e33a2ea30f422fab0407e4dc2b13bb`)
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer` coordinator of the assigned team)
- Date: 2026-11-15
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: this conversation's messages informing the user, 2026-11-15 (SR-001 baseline; SR-002 revision of REQ-008/AC-007/AC-008/DEC-007/SCN-005 to the project rule `DESIGN.md` rule 9; SR-003 clarification of REQ-005/SCN-004/DEC-006/AC-005: a lost connection is run-level and the next run resumes, per ARCH-REV-001 AR-005). The Task lets the designer "propose and justify" skip vs transfer; no decision below needs the user.
- Exact approved requirements baseline / solution revision: this document at SR-003
- Behavior-defining supplements and their approved versions: None (the probe is evidence only)

## Problem And Desired Outcome

- Problem: A Memory Sync source sends each changed file whole, base64-encoded, in JSON batches with no byte budget; the hub accepts at most 50 MiB per request. One file above ~37 MiB, or two 20 MiB files in one batch, makes the hub answer `Request body is too large`; the run fails, the same files are planned first on every later run, and **nothing syncs any more** (reproduced). Files ≥ 384 MiB cannot be base64-encoded and files ≥ 2 GiB make the scan itself fail (measured). Real raw-trace files on the user's node already reach 54 MB, and the sibling ticket will allow 2 GiB video attachments.
- Affected actors or systems: node owners with Memory Sync on (opt-in); the hub node; agents producing long traces or receiving large attachments.
- Desired outcome: Memory Sync carries files of any supported size to the hub, keeps every request below the hub's limit, never base64-encodes a whole large file, and one problem file never stops the others; the owner sees which files did not sync and why.
- Observable definition of success: with a 2 GiB file and small files changed together, one sync run imports all of them on a hub of the same release; a failing file is listed while every other file syncs.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001..SCN-004 | A run is all-or-nothing; batches are cut by file count only | Batches are cut by count **and** bytes; each file has its own outcome | Run gate (one run at a time), interval, `batchSize` setting, key order | memory-sync-service.ts |
| BEH-002 | System | SCN-001, SCN-002 | One file > ~37 MiB (or several files) exceeds 50 MiB → every later run fails | Large files travel by a separate large-file transfer in bounded pieces of raw bytes; no request exceeds the hub limit | Hub verification of size and SHA-256 before a file becomes visible | Probe A/B |
| BEH-003 | System | SCN-001 | ≥ 384 MiB cannot be base64-encoded | No whole-file base64 for large files | — | measurement |
| BEH-004 | System | SCN-001 | ≥ 2 GiB file breaks the scan | Scan and change detection work for any file size | Stable-read deferral of files that change while read | measurement |
| BEH-005 | System | SCN-001, SCN-003 | Every unchanged file is re-read and hashed every run | Unchanged files (same size and modification time as last synced) are not re-read | A changed file is detected and re-sent | scanner code |
| BEH-006 | Operational | SCN-007 | Status shows only `error · Request body is too large` | Status lists files not synced (name, size, reason, next retry); the node log has one warning per file problem | `Current job` / `Last sync` lines; run-level errors | Probe status |
| BEH-007 | Contract | SCN-005 | Only one ingest route (batches, 50 MiB) | Hub adds large-file transfer; source and hub of the same release | Hub data layout and manifest semantics; batch idempotency | route + store code |
| BEH-008 | System | SCN-006 | Hub unreachable / token invalid / hub disabled fails the run | Same | Same messages and job `error` | parser |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Source node owner | Keep memory synced to the hub | All files sync; problems are named | Opt-in feature; no new setting required |
| Hub node owner | Receive a complete, intact corpus | Only verified complete files appear | Hub may run an older or newer version than the source |
| Node itself | Keep running agents | Sync memory use independent of file size | Background loop runs every minute by default |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A source syncs changed files of any size to an updated hub | SCN-001, SCN-002, SCN-003 |
| UC-002 | A source isolates, reports and retries a file that fails, while the rest sync | SCN-004 |
| UC-003 | Source and hub of the same release interoperate; mixed versions are the owner's update responsibility (`DESIGN.md` rule 9) | SCN-005 |
| UC-004 | The owner sees which files did not sync and why | SCN-007 |

### Out Of Scope

- Delete propagation, append/range/delta sync of a changed file, compression, deduplication across sources.
- A viewer for imported attachments on the hub (the hub has none today).
- A per-source setting to exclude files by size or type (follow-up FU-001 in `follow-ups.md`).
- Reverse-proxy configuration in front of a hub (documented only).
- Context-file upload limits and the attach journey (`autobyteus-workspace-6`).
- Changing the Memory Sync capability gate or its migration.

### Non-Goals

- Faster sync throughput than today for small files.
- Proving a 10 GiB transfer in automated tests (the size limit is a configuration of the sibling ticket; behavior is size-independent by design and proven with 2 GiB once plus scaled-down thresholds in automated tests).

### Preserved Behavior Boundary

- BEH-007 preserved column; BEH-008; AC-006, AC-007.
- Invariant: a file appears in the hub's imports only after its full size and SHA-256 are verified; nothing partial is ever visible in the imported Memory view.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | No request a source sends to a hub exceeds the hub's 50 MiB request limit, whatever the number and sizes of changed files; batches have a byte budget with a safety margin below that limit. | BEH-001, BEH-002 | Must | Released hubs keep 50 MiB | Probe shows the 413 path | Task; DEC-001 |
| REQ-002 | A file larger than what fits in a batch is transferred to a hub that supports it as raw bytes in bounded pieces (never as one whole-file base64 value), up to at least 10 GiB; source and hub memory used by the transfer does not grow with the file size. | BEH-002, BEH-003, BEH-004 | Must | Real traces 54 MB; videos up to 2 GiB (max configurable 10 GiB) | Node ceilings measured (384 MiB base64, 2 GiB readFile); streaming avoids both | Task; manager; DEC-001 |
| REQ-003 | A large transfer interrupted mid-way resumes from what the hub already received on the next attempt rather than restarting from zero. | BEH-002 | Should | 2 GiB over a home network | Design to prove | DEC-005 |
| REQ-004 | A file whose size and modification time equal its last synced record is not re-read; a changed file is read in a streaming way to compute its hash. | BEH-004, BEH-005 | Must | IO and memory every minute | Code read | DEC-003 |
| REQ-005 | A problem with one file (it changes while being read, or the hub rejects it or its content) does not stop other files in the same run; a lost connection or unreachable hub is not a problem of one file (REQ-006): the run stops and the next run resumes an interrupted large transfer (REQ-003); the file is retried on later runs with an increasing delay (Sync now retries at once), and is retried at once when it changes. | BEH-001, BEH-002 | Must | "one bad file never blocks the rest" | Probe shows poisoning today | Task; DEC-005, DEC-006 |
| REQ-006 | Problems that affect every file (hub unreachable, token invalid or revoked, hub disabled, Memory Sync held back) still fail the run as today, with the same messages. | BEH-008 | Must | Preserve | Code read | Preserved |
| REQ-007 | The owner sees, in Nodes → Memory Sync, the number of files not synced and for each (up to a bounded list) its path, size, reason in plain words and next retry time; the node log has one warning line per file when a problem is first recorded or its reason changes. | BEH-006 | Must | "clear logs/status for the owner" | — | Task; DEC-004 |
| REQ-008 | Source and hub of the same release carry every file size; no detection of, fallback for, or negotiation with an older or newer node is built (`DESIGN.md` rule 9); the feature document tells owners to update every Memory Sync node together. | BEH-007 | Must | Project rule: no compatibility between software versions | `DESIGN.md` rule 9 | DEC-007 (SR-002) |
| REQ-009 | On the hub, a large file becomes visible in the imports, and in the manifest, only after its full size and SHA-256 are verified; partial transfers are stored outside the imported tree and are removed when abandoned. | BEH-007 | Must | Integrity | Store code | Preserved invariant |
| REQ-010 | The Memory Sync feature document describes the new behavior, the limits and the release order with `autobyteus-workspace-6`; handoffs and delivery notes state that this change is released before or with `autobyteus-workspace-6`. | — | Must | Manager instruction | — | Manager message |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-005 | BEH-002 / SCN-001 | Two real server processes (hub + source, both this version); a 40 MiB attachment and a small trace in another run changed; Sync now | Run succeeds; both files imported with identical bytes; status lists no problems | — | E2E (multi-process), from the probe |
| AC-002 | REQ-001 | BEH-001 / SCN-003 | Many changed files whose total is several times 50 MiB, each below the batch threshold | All imported over several batches; every request body < 50 MiB | — | Unit (batch planner with byte budget) + integration (recorded request sizes) |
| AC-003 | REQ-002, REQ-004 | BEH-003, BEH-004 / SCN-001 | A 2 GiB file (sparse/generated) on the source; Sync now | File imported, SHA-256 equal; source and hub RSS growth during the transfer stays below 200 MiB | — | One measured run (validation evidence), not a CI test |
| AC-004 | REQ-005 | BEH-001 / SCN-004 | One file the hub rejects (e.g. hub-side verification failure) plus other changed files | Others imported in the same run; the failing file is listed with its reason; next background run does not retry it before its delay; Sync now retries it; after it is fixed (changed) it syncs | — | Unit + integration |
| AC-005 | REQ-003, REQ-006 | SCN-004 | A large transfer interrupted after some pieces (connection lost or hub stopped; the run ends with a job error) | Next attempt sends only the remaining bytes; result identical | If the hub discarded the partial transfer, it restarts from zero | Integration |
| AC-006 | REQ-006 | BEH-008 / SCN-006 | Invalid token, or hub unreachable | Run fails with today's message; job `error` | — | Existing tests stay green + unit |
| AC-007 | REQ-008 | BEH-007 / SCN-005 | Feature document | States that every Memory Sync node must run the same release and be updated together | — | Review |
| AC-008 | REQ-008, REQ-009 | BEH-007 | A batch whose operations carry inline (base64) content, as the source sends for small files | Accepted and committed with today's verification and idempotency | — | Existing E2E `memory-sync-api.e2e.test.ts` stays green |
| AC-009 | REQ-009 | BEH-007 | Partial large transfer on the hub; then a manifest read and imported Memory view | Partial file not under `imports/<id>/agents|agent_teams`, not in manifest; abandoned partials removed after their expiry | — | Unit + integration |
| AC-010 | REQ-007 | BEH-006 / SCN-007 | A file problem recorded | GraphQL status returns the count and list entries; the card shows "N files not synced" with path, size, reason, next retry (English and Chinese); one log warning | No problems → no extra line | Web component test + GraphQL E2E |
| AC-011 | REQ-004 | BEH-005 | An unchanged synced 100 MiB file over several runs | The file is not read (no hashing) on later runs | A content change with a new mtime is detected and re-sent | Unit |
| AC-012 | REQ-010 | — | Docs and handoffs | `memory_sync.md` updated; release-order note present in handoff and delivery notes | — | Review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal / Event | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User + System | Owner, then background loop | A large attachment reaches the hub | Owner attaches a video (40 MiB–2 GiB) to a run; next background run or Sync now | Memory Sync on, hub configured | Attachment stored under the run's `context_files/`; run detects it; transfers it in pieces with the small files | Imported on the hub | Old hub → AC-007 | Supported Normal Scenario | Context-file layout; sibling 2 GiB plan | REQ-001..005, AC-001, AC-003 |
| SCN-002 | System | Agent run | Long run's trace file grows past the batch limit | Trace append | Memory Sync on | Changed trace detected; sent as a large file | Imported | — | Supported Normal Scenario | Real files 40–54 MB | REQ-002, AC-001 |
| SCN-003 | Operational | Owner | First sync after enabling on a node with much memory | Enable + Sync now | Thousands of files | Batches by bytes and count over runs | All imported, no 413 | — | Supported Normal Scenario | Code | REQ-001, AC-002 |
| SCN-004 | System | Background loop | One file fails, or a transfer is interrupted | Hub rejects a file or its content; file changes during read; connection drops during a transfer | Other changed files | Rejected file recorded as a file failure, others continue, retry later; changed file deferred to the next run; connection drop: run error as REQ-006, next run resumes the large transfer from the hub's received bytes | Rest imported (in the same run for a rejection, on the next run for a drop) | — | Supported Normal Scenario | Probe | REQ-003, REQ-005, AC-004, AC-005 |
| SCN-005 | Operational | Owners of two nodes | Nodes on different versions | Update one node only | Hub older or newer | — | Not supported: owners update every node together | — | Technically Possible but Unsupported/Contrived (`DESIGN.md` rule 9) | `DESIGN.md` rule 9; `memory_sync.md` "Update every node together" | REQ-008, AC-007, AC-008 |
| SCN-006 | Operational | Owner | Hub not usable | Token revoked / hub down | — | Run fails | `error · <message>` | — | Supported Normal Scenario | Code | REQ-006, AC-006 |
| SCN-007 | User | Owner | Know what did not sync | Opens Nodes → Memory Sync | Problems recorded | Reads card | Count + list with reasons | — | Supported Normal Scenario | Card | REQ-007, AC-010 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (a status block in the existing Memory Sync card); no Product Design request.
- Linked UI/UX or interaction supplement: N/A — not applicable
- Product design fields: N/A — not applicable
- Required states: no problems → nothing extra; problems → a line "N files not synced" in the card's warning colour, then a list (at most 20 entries, then "and N more") of `path · size · reason · next retry <time>`; localized (en, zh-CN) like the rest of the card.
- Product decisions that need the user: None (DEC-004 decided within the existing card's pattern).

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 / AC-002 | Compatibility | Every request body < 50 MiB (target ≤ 40 MiB including JSON) | Any changed set | Unit + integration |
| QR-002 | REQ-002 / AC-003 | Performance | Transfer memory growth < 200 MiB for a 2 GiB file on source and hub | Local two-process run | Measured once |
| QR-003 | REQ-004 / AC-011 | Performance | An unchanged file is not read on later runs | Any size | Unit |
| QR-004 | REQ-009 / AC-009 | Reliability | No partial file visible in imports | Interrupted transfer | Unit + integration |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`
- Must be preserved: source-state fingerprints of synced files (no full re-sync after the update); hub imports, manifest and batch idempotency records.
- Acceptable loss: per-file problem records and partial transfers (diagnostic or resumable; loss only causes a retry from zero).
- Constraints: older versions reading the state file may drop new fields; that must only cause retries.
- Unknowns: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Hub batch route (50 MiB) | Every request below the limit | Route code | None |
| Source ↔ hub release | Same release (`DESIGN.md` rule 9) | DESIGN.md | Owners must update together |
| Node access gate | New hub routes admit only memory sync source credentials | `node-route-permissions.ts` prefix rule | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval |
| --- | --- | --- | --- | --- |
| `probes/large-file-sync-probe.e2e.test.ts.txt` | Reproduction on two real server processes | REQ-001, REQ-005, AC-001 | Current | Evidence only |

## Assumptions

| ID | Assumption | Why Necessary | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Modification time changes whenever the app rewrites a memory file | Fast path REQ-004 | All writers are normal file writes/appends; rename-into-place gives a new mtime | Accepted (standard rsync heuristic) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Skip files above the hub limit, or transfer them? | Defines what reaches the hub | (a) skip with warning; (b) chunked/streamed transfer. Real raw traces on this node are 40–54 MB; the hub's imported Memory view reads raw traces | Skipping would silently drop core memory (long runs' traces), not just videos. Transfer large files as raw bytes in bounded pieces through new hub routes; keep batches for small files. **Transfer.** | Solution Designer | Decided |
| DEC-002 | Sync run attachments of any size (2 GiB videos), or exclude them? | Hub disk and bandwidth | Today every file under the roots syncs; no hub viewer for attachments; owner opted in | Preserve today's rule (everything under the roots). A size or type exclusion is new product behavior and a setting; recorded as follow-up FU-001. **Sync all.** | Solution Designer | Decided |
| DEC-003 | How to detect changes without re-reading? | IO each minute | size+mtime vs. full hash | A file whose size and mtime equal the last synced record is unchanged (rsync's default); otherwise hash it streaming. | Solution Designer | Decided |
| DEC-004 | How the owner sees problems | Visible behavior | Existing card lines | Keep `Current job` / `Last sync`; add a warning-coloured "N files not synced" block with a bounded list; job state values unchanged (a run with file problems is `success`). | Solution Designer | Decided |
| DEC-005 | Retry and resume policy | Avoid re-sending 2 GiB every minute | Fixed retry vs backoff; restart vs resume | Delay doubles from 1 min to at most 1 h per unchanged failing file; Sync now ignores the delay; a changed file is retried at once; large transfers resume from the hub's received offset. | Solution Designer | Decided |
| DEC-006 | Which errors are file-level vs run-level | Isolation without hiding outages | Auth/unreachable/hub disabled/held back affect all files | Those, and any network error or lost connection, stay run-level (REQ-006); a large transfer resumes on the next run. A rejection of one batch or one file's content is file-level: the batch is retried file by file to find the failing file. | Solution Designer | Decided |
| DEC-007 | Mixed versions | Nodes update separately | SR-001: detect an old hub and list large files as "hub must be updated"; `DESIGN.md` rule 9 forbids version checks, fallbacks and old/new APIs side by side | Follow the project rule: no mixed-version handling; document "update every node together" (revised in SR-002). | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-002 | AC-001, AC-002 | SCN-001, SCN-003 | Probe |
| REQ-002 | UC-001 | BEH-002..004 | AC-003 | SCN-001, SCN-002 | Measurements |
| REQ-003 | UC-002 | BEH-002 | AC-005 | SCN-004 | — |
| REQ-004 | UC-001 | BEH-004, BEH-005 | AC-003, AC-011 | SCN-001, SCN-003 | Code |
| REQ-005 | UC-002 | BEH-001, BEH-002 | AC-001, AC-004 | SCN-004 | Probe |
| REQ-006 | UC-002 | BEH-008 | AC-006 | SCN-006 | Code |
| REQ-007 | UC-004 | BEH-006 | AC-010 | SCN-007 | Probe status |
| REQ-008 | UC-003 | BEH-007 | AC-007, AC-008 | SCN-005 | Code |
| REQ-009 | UC-001 | BEH-007 | AC-009 | SCN-001, SCN-004 | Code |
| REQ-010 | — | — | AC-012 | — | Manager |

## Architecture Phase Input

- Approved scenarios: SCN-001..SCN-007.
- Constraints: same-release contract (`DESIGN.md` rule 9); manifest atomicity and idempotency; nothing partial visible; bounded memory; one run at a time; additive persisted state.
- Deferred to architecture: route shapes, piece size, batch byte budget and large-file threshold, staging location and expiry, state record shape, owner split of the source service.
- Facts to verify: streaming request body with Node `fetch`; Fastify raw body streaming; that the manifest lock is reusable for large-file commits.
- Risks: release order (R-003).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction, user informed; SR-001, revised SR-002, clarified SR-003)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
