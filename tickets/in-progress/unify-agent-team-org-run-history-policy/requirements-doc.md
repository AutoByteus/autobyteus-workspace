# Requirements Document — Unify Agent Team and Agent Org run-history catalog policy

## Document status

- Status: **Approved**.
- Current solution revision: `SR-004` (design-only recovery; approval basis remains SR-002).
- Package identifier: `unify-agent-team-org-run-history-policy`.
- Request: User ticket and verification instruction, 2026-09-24.
- Requirements owner: Solution Designer.
- Approval state/reference: User message, 2026-09-24: “cool. if it makes the code base cleaner. lets go. i approve”, affirming the recommended policy after the explicit approval request and follow-up explanation.
- Exact approved baseline: `SR-001` requirements text and DEC-001–003 proposal, affirmed by the 2026-09-24 user approval; recorded as `SR-002` without a behavior change.
- Behavior-defining supplements: N/A.

## Problem and desired outcome

The reported divergence is confirmed: Team reads a cached, admitted history index without index writes; Org's first read per service instance rebuilds the index from admitted execution trees and writes it. This creates read-side effects, inconsistent missing-row recovery and state scope, and an Org create ordering dependency. The intended outcome is one explicit, predictable policy that keeps local lifecycle history and imported-memory inspection safe without losing existing persisted data.

## Approved behavior

**Approved policy:** Treat each history index as the operational authority for listed rows. Both families perform admitted, normalized, read-only queries from the index and update it through explicit lifecycle events; no automatic history reconciliation on normal reads or routine startup. Provide an explicit, local-only repair/reconciliation operation for exceptional missing-row recovery if needed; never run it for an imported folder. Missing index means an empty catalog until lifecycle events or approved repair; corrupt index fails visibly without overwriting it. The approved rationale is that it preserves Team behavior, avoids repeated Org tree scans/writes and cold-start cost, and keeps imported inspection read-only. It does change Org's automatic self-heal and Team's tolerant corrupt-index handling; those changes are within the user-approved choice. “Tree authority” remains for tree-owned run/package facts, especially archive, but a tree by itself is not an admitted history row under this policy.

## Relevant current and desired behavior

| ID | Kind / scenario | Current behavior | Approved desired behavior | Preserved boundary | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User, SCN-001 | Team catalog read is index-only; Org first instance read scans trees and writes index. | Same admitted, normalized, no-write row query for both; no history tree scan on catalog query after readiness. | Mixed history still filters archived inactive roots and reads detail trees as needed. | Investigation source log. |
| BEH-002 | System, SCN-002 | Both catalog owners record lifecycle rows; Org create preinitializes before manager create. | Explicit lifecycle write semantics without hidden pre-create dependency; preserve supported create/restore/summary/terminate/archive/delete and Team unarchive. | Manager gates, serialization, compensation and existing row fields. | Source log. |
| BEH-003 | Operational, SCN-003 | Imported Team memory can query catalog; Org memory branch bypasses catalog store to avoid writes. | Both memory sources use the same read-only owner query; imported folders never have index mutations. | One tree read per inspected root in memory explorer; admission exclusion. | Memory branch source; ticket constraint. |
| BEH-004 | Operational/contract, SCN-004 | Team orphan tree stays unlisted; Org first initialization projects it. Missing/corrupt index handling differs. | Approved index authority: no automatic orphan recovery; explicit local-only repair if supported; missing empty; corrupt error, no overwrite. | Existing valid index files and trees remain usable, summary/termination facts retained. | Catalog/store code. |

## Stakeholders and scope guardrail

- Stakeholders: users viewing or managing retained Team/Org runs; memory explorer users inspecting local/imported folders; server operators needing safe recovery; implementation and validation owners.
- UC-001: View retained mixed collaboration history without read-side persistence effects.
- UC-002: Create/restore/update/archive/delete current collaboration runs with correct durable row behavior.
- UC-003: Inspect local/imported memory catalogs read-only, with bounded tree reads.
- UC-004: Recover a damaged/missing local history index only through an explicit approved operation, under the approved policy.
- In scope: both catalog services, justified shared core, direct consumers, memory-branch source integration after merge, obsolete Team index adapter assessment, compatibility checks.
- Out of scope: standalone agent history, execution-tree schema, unrelated UI changes, legacy migration redesign, generic corruption recovery beyond the approved catalog policy.
- Preserved boundary: existing supported listing/order/filtering, row data, Team unarchive, Org archive, deletion, summary first-write, termination, restore, readiness admission, queue/compensation, and non-local read-only behavior, except explicit decisions in BEH-004.
- Review authority: a downstream finding that introduces new recovery, migration, operational or compatibility obligations must return as a requirement gap for user approval; technical review cannot amend this policy by itself.

## Requirements

| ID | Requirement | Related behavior | Priority/source |
| --- | --- | --- | --- |
| REQ-001 | Team and Org catalog row queries must have identical authority/admission/normalization semantics and perform no history-index writes or per-run tree projection. | BEH-001, BEH-003 | Must; user ticket. |
| REQ-002 | Local lifecycle events must durably maintain one row per admitted Team/Org run, preserving currently supported operations, first nonempty summary, timestamps and archive semantics. | BEH-002 | Must; user ticket/current contract. |
| REQ-003 | Run creation must not rely on implicit Org history initialization before package creation. | BEH-002 | Must; user ticket. |
| REQ-004 | In-memory row and write serialization scope must be consistent per resolved memory directory for both families; no cross-directory state leakage. | BEH-001, BEH-002 | Must; user ticket. |
| REQ-005 | Imported/non-local memory inspection must remain read-only; admission exclusions apply to both; catalog queries must not read every tree per call. | BEH-001, BEH-003 | Must; user ticket. |
| REQ-006 | Existing valid persisted indexes and trees must remain usable without unintended loss of summaries, termination or archive facts. Any rebuild/repair must be explicit and local-only. | BEH-004 | Must; approved DEC-001–002. |
| REQ-007 | Missing/corrupt index and tree-without-row behavior must be uniform and documented across families. Approved: missing reads empty, corrupt fails without overwrite, orphan tree remains unlisted until explicit local repair. | BEH-004 | Approved via 2026-09-24 user message; user ticket. |

## Acceptance criteria

| ID | Requirement / scenario | Observable outcome / verification intent |
| --- | --- | --- |
| AC-001 | REQ-001, SCN-001 | For each family, first and subsequent catalog queries return only admitted, normalized rows and cause zero index writes and zero history tree reads; a new service instance does not cause reconciliation. Instrument stores. Admission readiness may perform its own separate validation. |
| AC-002 | REQ-002–004, SCN-002 | Create/restore/summary/termination/Team archive-unarchive/Org archive/delete preserve their current visible outcomes; concurrent writes serialize and determinately failed archive/delete restore validated prior state. Org create succeeds without preinitialize ordering. |
| AC-003 | REQ-005, SCN-003 | Imported memory source files and indexes remain byte-identical after listing; Team and Org source adapters use owner query, and root inspection reads at most one execution tree per root per request (excluding explicit readiness validation). |
| AC-004 | REQ-006–007, SCN-004 | Representative existing valid Team/Org index arrays remain directly readable with all fields intact; approved missing/corrupt/orphan behavior is covered by family-parity tests; explicit repair, if retained, never runs on imported sources. |
| AC-005 | REQ-001–007, SCN-001–004 | Focused history, Team-run and Org-run tests plus relevant memory and integration checks pass after dependencies are available. No version-specific fallback is added to normal reads. |

## Relevant scenarios

| ID | Kind / validity | Trigger and sequence | Expected outcome / alternate |
| --- | --- | --- | --- |
| SCN-001 | User / Supported Normal Scenario | User opens workspace collaboration history; server queries both catalogs and details. | Admitted history shown, archived inactive hidden, no catalog read write. A corrupt index follows approved error behavior. |
| SCN-002 | System/User / Supported Normal Scenario | Service creates/restores a root run; activity and termination update it; user manages stored history. A supported concurrent case is Archive from workspace history while message submission restores the same stopped Team (PM-001 in ARCH-REV-001). | Row and tree facts stay coordinated through lifecycle, with existing manager gates and compensation on failures; an archive must not succeed against a run that became managed before its inactive check. |
| SCN-003 | User / Supported Explicit Edge Scenario | User opens Memory explorer on imported memory folder and requests Team/Org roots. | Listing does not mutate imported data and does not add per-row history tree projection overhead. |
| SCN-004 | Operational/contract / **Supported Explicit Edge Scenario after approval** | A valid local tree has no row, or local index is absent/corrupt. | Under approved policy, catalog read does not repair; explicit local repair may recover tree-derived fields, but index-only summary/termination cannot be invented if unavailable. This is approved as the exceptional recovery policy. |

## Quality, data continuity and dependencies

- QR-001 (REQ-001/005): No query-side history-index write or all-tree row projection; bounded memory explorer root reads.
- QR-002 (REQ-002/004): Serialized writes and compensation/readback on applicable failed delete/archive.
- QR-003 (REQ-005): Zero writes to imported folder history data.
- Persisted data affected: **Yes**. Existing valid arrays must be directly usable; no schema change is requested. Under the approved policy no routine rebuild/migration is needed, but explicit recovery may need to preserve an existing good index row's summary/termination because those fields are not derivable from a tree. No loss of data present in a valid existing index is authorized; an absent/corrupt index may have unrecoverable index-only facts, so repair must not claim lossless reconstruction.
- External dependency: unmerged `codex/memory-team-view-slow-load` branch; integrate its sources only if/when merged. Current shared package-readiness owner and app-data migration contracts must remain intact.
- UI/prototype: N/A — no visual change requested.
- Behavior-defining supplements: N/A.

## Approved user decisions

| ID | Approved decision | Alternatives / consequence | State |
| --- | --- | --- | --- |
| DEC-001 | **Index-authoritative history rows** for both families. | Tree-derived rows require explicit reconciliation and make Team orphan runs newly visible; index authority ends Org's automatic read-time self-heal. | Approved, 2026-09-24 user message. |
| DEC-002 | **No routine history reconciliation**; explicit local-only repair operation. | Startup reconciliation could preserve Org self-heal but adds work/cold-start cost and would make Team orphan rows visible. No repair means orphan rows stay absent permanently unless lifecycle restores them. | Approved, 2026-09-24 user message. |
| DEC-003 | **Missing index = empty; corrupt index = error/no overwrite**; recovery only through explicit local repair. | Current Team silently returns empty on corruption while Org throws; chosen parity alters one side. | Approved, 2026-09-24 user message. |

## Traceability and architecture input

- REQ-001 → UC-001/003, BEH-001/003, AC-001/003, SCN-001/003.
- REQ-002–004 → UC-002, BEH-002, AC-002, SCN-002.
- REQ-005 → UC-001/003, BEH-001/003, AC-001/003, SCN-001/003.
- REQ-006–007 → UC-004, BEH-004, AC-004/005, SCN-004; approved DEC-001–003.
- Architecture maps the selected authority and reconciliation policy to both lifecycle/catalog paths, preserve family-specific projection and compensation, and verify compatibility against representative persisted arrays. The approved requirements leave shared-core structure, placement and transition mechanism to `design-spec.md`.

## Readiness check

- Current divergence evidence-backed: Yes, with source inspection; executable tests unavailable in fresh worktree.
- Desired and preserved behavior explicit: Yes; DEC-001–003 approved.
- Scope/non-goals and traceability: Yes.
- Material assumptions and open decisions visible: Yes.
- Content ready for user approval: Yes; approval received.
- User approval received / approved basis ready for design: **Yes / Yes**; `SR-001` policy approved in the 2026-09-24 user message and recorded by `SR-002`.
