# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready` — explicitly approved by the user on 2026-08-27.

## Goal / Problem Statement

Correct a production identity mismatch that prevents browser-uploaded context files, including images, from being sent to an Agent nested below another Team in a hierarchical Team run. On the Docker node exposed at `http://localhost:8001`, file upload succeeds, but send-time finalization supplies the root TeamRun ID while the context-file contract requires the target Agent's exact containing TeamRun ID. The backend therefore rejects the valid nested member with HTTP 400.

This is a product bug exposed by the affected hierarchical Team topology, not a Docker upload, request-size, MIME-type, mount-permission, or transient node failure.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | A browser-uploaded image can be finalized and sent to a direct member of a root Team because the root and containing TeamRun identities are the same. | Direct-root Team members continue to receive supported browser-uploaded context files. | Standalone Agent upload/send and direct-root Team-member upload/send remain unchanged. | REQ-002, REQ-004; AC-002, AC-006 |
| BEH-002 | A browser-uploaded image addressed to a nested Team Agent is staged successfully, but send-time finalization uses the root TeamRun ID and receives HTTP 400 because the member belongs to a different containing TeamRun. | The send owner uses the focused Agent execution's exact containing TeamRun ID and canonical rooted member address, allowing the staged file to finalize and the message to enter normal Agent execution. | Exact identity validation remains strict; the backend must not guess by basename or silently accept a mismatched TeamRun/member pair. | REQ-001, REQ-003, REQ-005; AC-001, AC-003, AC-004, AC-005 |
| BEH-003 | Text-only messages to the same nested Agent succeed because no context-file finalization request is made. | Text-only messages continue to succeed with the same target and runtime behavior. | Team stream routing, Agent startup, and text submission semantics remain unchanged. | REQ-002; AC-002 |
| BEH-004 | The established final context-file contract resolves a Team member by exact containing TeamRun ID plus canonical rooted member address and stores the file under the resolved AgentRun memory directory. | Every Team send caller supplies that exact compound identity for the focused Agent execution. | The server remains authoritative for resolving physical memory location and AgentRun storage; the frontend must not construct filesystem paths. | REQ-001, REQ-003; AC-003, AC-004 |

## Investigation Findings

- Host port `8001` maps to container `autobyteus-server-0`, running `autobyteus/autobyteus-server:latest` at image digest `sha256:4ebe776a10df6366705053d5681346498e557324ce78651d9aa6676dcfbe4bae`.
- The comparator Docker node on port `8006` uses the same image digest. The 8001 container has writable data/workspace mounts and already contains many successfully finalized images for direct-root Team members.
- The affected image upload succeeds: three failed attempts left staged PNG files under `/home/autobyteus/data/draft_context_files/...`. The HTTP 400 occurs only on `POST /rest/context-files/finalize`.
- The backend logged exact failures for `/requirements_engineering_team/requirements_engineer` and `/product_design_prototyping_team/product_prototyper`, stating that each member could not be resolved for the root department TeamRun.
- In the affected execution tree, the root TeamRun is `software_development_department_...`, while Product Prototyper's containing TeamRun is `product_design_prototyping_team_...`. The current web send store passes the former; the context-file resolver correctly requires the latter.
- The working embedded-node example is a direct-root `/solution_designer` member whose root and containing TeamRun IDs are identical, explaining why the same image flow succeeds there.
- Existing server integration coverage proves the contract: a nested member finalizes with the child/containing TeamRun ID and is intentionally rejected when the root TeamRun ID is substituted. The focused server tests passed (`2` files, `9` tests).
- Existing web store coverage misses the defect: its attachment-bearing send case targets a direct-root member, while its nested send case carries no uploaded attachment and does not assert the final-owner identity.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/docker-node-runtime-evidence.md` | Runtime evidence and root-cause trace | REQ-001, REQ-002, REQ-003 | AC-001, AC-002, AC-003, AC-004 | Complete / approval N/A (evidence only) | Records the container, log, topology, storage, comparator, code, and test evidence supporting the requirements basis. |

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor posture: `Likely Needed`
- Evidence basis: the Team execution view exposes root identity and member address to the send owner but no explicit query for the Agent's containing TeamRun identity. The send owner therefore substitutes root identity at a boundary whose established compound identity is containing TeamRun plus rooted member address. Backend exact-match validation and integration coverage behave correctly.
- Requirement or scope impact: the correction should strengthen the existing Team execution-view boundary with an exact containing-Team query and use it in the existing send path. No new subsystem, backend fallback, Docker special case, compatibility wrapper, or persisted-data migration is authorized.

## Recommendations

1. Keep the backend's exact compound-identity validation unchanged.
2. Let the authoritative Team execution view resolve an AgentRun ID to its exact containing TeamRun ID across configured and task execution nodes.
3. Make the Team send owner require that identity before context-file finalization and use it in the final-owner descriptor; continue using the root/draft identity for staging ownership.
4. Add focused web coverage for an uploaded attachment sent to a nested Agent and preserve the existing server exact-match coverage.
5. Do not add a root-ID fallback or basename guessing; both would weaken the hierarchical identity invariant and could misroute files.

## Scope Classification (`Small`/`Medium`/`Large`)

`Small`

The root cause is localized to one missing execution-view identity query and one incorrect final-owner argument in the web Team send path. The server API, storage layout, Docker configuration, and persisted schema remain valid.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: A user attaches one supported browser-uploaded image or other already-supported context file and sends it to a configured Agent nested below another Team in a hierarchical Team run.
- `UC-002`: The same final-owner identity resolution remains correct for any focusable Agent execution represented in the canonical Team execution tree, including task Agent executions, without changing their existing availability or navigation semantics.
- `UC-003`: Direct-root Team members and text-only nested Team messages continue to work.
- `UC-004`: Invalid or mismatched TeamRun/member final-owner identities remain rejected without guessing.

### Out of Scope

- New attachment types, new image-processing features, or changes to supported file-size/MIME limits.
- Changing standalone Agent context-file behavior.
- Docker image, port, mount, permission, VNC, or container lifecycle redesign.
- Changing Team message routing, lazy Agent runtime startup, task delegation, or Team navigation behavior.
- Recovering or permanently retaining abandoned failed draft attachments beyond the existing draft lifecycle.
- Changing the final context-file REST URL shape or adding compatibility fallbacks for the incorrect root-Team identity.
- The unrelated historical 500 responses observed for obsolete unrooted context-file locators in older runs.

### Preserved Behavior Boundary

Preserve BEH-001, BEH-003, and the exact-validation portion of BEH-004. The change may alter only how the Team send owner obtains and supplies the final context-file owner's containing TeamRun identity.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It must not be treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The solution designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Functional Requirements

- `REQ-001`: Before finalizing uploaded context files for a Team member, the Team send path must resolve the focused AgentRun ID to one exact canonical member address and one exact containing TeamRun ID from the current canonical Team execution tree.
- `REQ-002`: Standalone Agent sends, direct-root Team-member sends, and text-only Team-member sends must preserve their current successful outcomes.
- `REQ-003`: The final context-file owner supplied to the server must use the exact containing TeamRun ID and canonical rooted member address; root TeamRun identity may be used only when the target Agent is actually contained by the root Team.
- `REQ-004`: The correction must remain node-agnostic and must not depend on Docker-specific branches, configuration overrides, container restarts, or destructive data changes.
- `REQ-005`: If the focused Agent execution has no exact containing TeamRun identity in the current execution tree, the send must fail before finalization with a traceable client-side cause rather than guessing, misrouting, or weakening server validation.
- `REQ-006`: Existing failed/staged drafts and final context files must remain governed by the existing context-file lifecycle; no bulk rewrite or migration is required.

## Acceptance Criteria

- `AC-001`: Given a hierarchical Team run whose root is a department and whose focused Agent belongs to a nested Product Team, sending text plus one supported uploaded image completes context-file finalization without HTTP 400 and dispatches the message to that exact AgentRun.
- `AC-002`: A direct-root Team Agent still accepts an equivalent uploaded image, and a nested Team Agent still accepts a text-only message.
- `AC-003`: The nested finalization request carries the nested/containing TeamRun ID plus the canonical rooted member address, not the root department TeamRun ID.
- `AC-004`: The finalized locator is readable through the existing REST route and resolves to the target AgentRun's nested memory directory; no client-supplied filesystem path is introduced.
- `AC-005`: A deliberately mismatched containing TeamRun/member pair or an AgentRun missing from the current execution tree is rejected without Agent dispatch and with a traceable reason.
- `AC-006`: Standalone Agent context-file finalization and existing direct-root final locators remain unchanged.
- `AC-007`: No Team definition, Team run execution tree, existing final context file, Docker volume, or unrelated node data is rewritten or deleted by the correction.

## Constraints / Dependencies

- The current Team execution tree is the authoritative frontend source for root, containing-Team, AgentRun, and canonical member-address relationships.
- The backend context-file owner resolver remains authoritative for mapping the exact logical owner to the physical Agent memory directory.
- Draft ownership and final ownership intentionally use different lifecycle identities: a launch/root draft scope for staging and the exact containing TeamRun for final Team-member storage.
- The current context-file draft cleanup TTL is 24 hours; failed drafts may expire under that existing policy.
- Runtime/container investigation was read-only; the affected container was not restarted or modified.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: staged context files under `<app-data-dir>/draft_context_files/...` and finalized files under the resolved AgentRun's `<memory-dir>/context_files/...`.
- Required outcome: `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: preserve all existing final files and Team/run state. Existing abandoned drafts remain subject to the established 24-hour cleanup policy.
- Unacceptable data loss or corruption: deletion, relocation, or corruption of existing final context files, Team definitions, Team execution trees, conversations, or unrelated Docker-volume data.
- Relevant availability, maintenance-window, or rollout constraints: no data migration or maintenance window; a normal code build/release is sufficient.
- Related requirement and acceptance-criteria IDs: REQ-004, REQ-006; AC-006, AC-007.

## Assumptions

- The target Agent is represented in the canonical Team execution tree before the send owner finalizes attachments, as it is for the reproduced configured nested members.
- Existing focusable task Agent executions use the same exact AgentRun-to-containing-Team relationship already represented in the execution tree.
- The supported image/file has already passed the existing upload validation; this change does not redefine supported content.

## Risks / Open Questions

- The frontend execution-tree query must cover configured Agents, task Agents directly owned by a Team, and Agents nested inside task Teams; handling only configured members would leave the identity boundary incomplete.
- The current generic name `teamRunId` in context-file owner descriptors denotes the containing TeamRun. The design must make that meaning explicit at the call site without introducing a second compatibility shape.
- Historical obsolete unrooted locators produced separate read-time 500 logs in older runs. They are evidence of an adjacent legacy issue but are not causally related to this send-time HTTP 400 and are outside this ticket.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Case(s) |
| --- | --- |
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-003 |
| REQ-003 | UC-001, UC-002, UC-004 |
| REQ-004 | UC-001, UC-003 |
| REQ-005 | UC-002, UC-004 |
| REQ-006 | UC-001, UC-003 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | Positive nested configured-Team image-bearing send |
| AC-002 | Direct-root image and nested text regression behavior |
| AC-003 | Request identity contract at the web/server boundary |
| AC-004 | Final locator read and physical nested-Agent ownership |
| AC-005 | Missing/mismatched identity negative path |
| AC-006 | Standalone and direct-root preservation |
| AC-007 | Non-destructive persisted-state behavior |

## Approval Status

Approved by the user on 2026-08-27. The user explicitly confirmed that focusing any Agent must support text, an image/context file, or both regardless of Team nesting, and then approved the ticket after the root cause and proposed correction scope were explained.

Locked approved scope: correct the nested Team final-owner identity in product code and add focused regression coverage, without changing Docker configuration, server validation, storage schema, or unrelated attachment behavior.
