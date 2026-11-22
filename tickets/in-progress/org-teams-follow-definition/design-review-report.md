# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/requirements-doc.md` (Approved, unchanged)
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/investigation-notes.md`
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/solution-revision-record.md` (SR-001..SR-017)
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-spec.md` (SR-017, commit `bc43dbc88b`; § SR-016 and § SR-017 Revisions, reviewed together)
- Supplemental Task Artifacts Reviewed: `org-container-storage-contract.md` (§1, §7, §9 path row, §10 row), `contract-validation.md` (SR-017 note), `release-deployment-report.md` (DR-001)
- Relevant Solution Revision IDs: SR-016, SR-017
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-012`
- Current Review Round: `12`
- Trigger: SR-017 after ARCH-REV-011 Fail (AR-011)
- Prior Review Round Reviewed: 11 (`ARCH-REV-011`, Fail)
- Latest Authoritative Round: 12
- Current-State Evidence Basis: the ARCH-REV-011 reads on `f2c0d2a902`:
  - 587 released in `v1.5.14-beta.7`;
  - `ReceivedFilesPlan.paths` absolute;
  - `referenceFiles` stored at `root-communication-engine.ts:250-251`;
  - the Org reference route serves the stored path;
  - the base changes no stored schema.
  
  The design's Migration Plan is opened for its interruption and completion rules: step 1, "current container (has `units`) → already done"; the per-unit retry recognition "a unit whose target folder exists with a valid target file and `containedIn` is recognized as done"; step 6, the container file written last.

## Routing Classification Review

- Task size `Large`; architectural risk `High`. Independent review required: `Yes`. No correction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. The requirements are unchanged.
- SR-016 (runtime mapping) is accepted as in ARCH-REV-011.
- SR-017 resolves AR-011's substance with option (a):
  - one exact prefix map built from the conversion's own renames, compared after `path.resolve`;
  - rewriting only app-owned typed path fields node-wide: log `referenceFiles` (written and other runs' logs, active and sealed), Task records and `updates[]`, ad-hoc Tasks and comments, trace `media.*` and `file_attachments[].uri`;
  - reuse of the released frozen visitor and its rule ("typed fields only, never prose or provider history");
  - prose, journals and provider sessions left as verbatim records, with the reason stated;
  - readers unchanged, so no lasting mapping;
  - a byte pre-check; reference IDs confirmed unstored; a predecessor writer check;
  - 599 confirmed unreleased.
- One rule is missing: how the node-wide rewrite is completion-gated across a retry (AR-012).

| Behavior ID | Status | Notes |
| --- | --- | --- |
| BEH-001..BEH-005, REQ-006, REQ-009, DEC-006, DEC-007 | Confirmed | As ARCH-REV-011 |
| BEH-006 conversion: received-file references (REQ-007, AC-006) | Confirmed in substance; Needs Correction on interruption | AR-012 |

## Supplemental Artifact Coherence Verdict

| Artifact | Verdict | Notes |
| --- | --- | --- |
| `org-container-storage-contract.md` | Pass | §1, §7, the §9 path row and the §10 row are consistent with SR-017 |
| `contract-validation.md` | Pass | The SR-017 note is right: values change, not shapes, so V-1..V-6 stand. The behavior is proven by the fixture test |

## Structural Verdicts

All structural sections of ARCH-REV-010/011 stand. SR-017's rows:

| Section | Row | Verdict | Notes |
| --- | --- | --- | --- |
| Persisted-Data Transition | Released received-file paths (587) | Pass | Exact prefix map, typed fields only, frozen visitor reused, idempotent rewrite, readers unchanged (Principle 8/15) |
| Persisted-Data Transition | Interruption and completion gating of the node-wide rewrite | Fail | AR-012 |
| Legacy / Backward-Compatibility | No lasting mapping in readers | Pass | — |

## Material Premise Validation

### `MP-12` — The conversion is interrupted after a unit's rename and before its path rewrite completes

- Related contract: data migration guideline §7 (atomic per file; retry; completion; no journal), the design's Migration Plan "Interruption", Principle 5
- Initiating basis kind: `Contract`. The guideline makes an interrupted attempt and its retry a governed case for a startup migration (§7 retry example; the design's own Interruption rule).
- Forward path: the attempt renames unit `U`'s folder (rename committed). It stops before the node-wide rewrite has visited every file naming `agent_orgs/<org>/U/`. The next start retries:
  - the per-unit recognition ("target folder exists with a valid target file and `containedIn` → done") skips `U`;
  - if the container file (step 6) was already written, step 1 classifies the whole Org "already done".
  
  SR-017 places the rewrite "in the same per-Org step as the renames, after a unit's folder rename is committed". It does not say the rewrite is re-run for units recognized as done, or that the container file (the Org's completion marker) is written only after the node-wide rewrite has completed.
- Consequence: some typed paths keep the old prefix permanently. Their references never open again, and nothing later revisits them.
- Reachability: `Reachable` under the governing contract (the guideline's retry case)
- Review consequence: AR-012.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Fail`

## Findings

### AR-012 — The node-wide path rewrite has no completion gating across a retry

- Type: `Design Impact`; severity Medium
- Protects: REQ-007, AC-006 (references open after conversion); the Migration Plan's interruption and completion rules (guideline §7); Principle 5
- Problem: the rewrite is idempotent, but nothing guarantees a retry runs it. The per-unit "done" check and step 1's "container has `units` → already done" can both skip it after a crash between a unit's rename and the end of the rewrite (MP-12).
- Required update: state the gating.
  - The node-wide rewrite for an Org is re-run (byte pre-check, idempotent) on every attempt until that Org's conversion is complete, including for units recognized as already renamed.
  - The container file is written only after the rewrite has visited every candidate file for that Org's prefixes, so it stays the single completion marker (step 6 last).
  - Add a test: interrupt after a rename and before the rewrite finishes, retry, and check that every typed path names the new folder.
- Proportionate: one ordering rule and one test, in an irreversible migration.
- Recipient: Solution Designer

## Classification

`Design Impact` (AR-012).

## Recommended Recipient

Solution Designer.

## Residual Risks

- **One node pass:** with several Orgs, do the rewrite as one node pass with all Orgs' prefix maps, not one pass per Org. Measure it on the synthetic large Org (earlier note).
- **Predecessors of the newly touched files:** the rewrite now writes files outside the Org folder: other runs' logs (active and sealed), Task records, ad-hoc Tasks, traces of every agent. Classify the earlier migrations that write or rename those files under the registry rule, and apply R-4(c)'s wait (`waiting_for_<id>`) to them. Examples: `append-only-message-logs-v1`, the `raw-trace-*` layout migrations, `project-task-*`, `team-communication-projection-address`, `delegated-run-own-attachment-links`. The registry test enforces the classification.
- Earlier notes still apply.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-12 reachable under the guideline's retry contract)
- Notes: SR-016 and SR-017 are right in substance: the runtime mapping, and a typed, exact, idempotent rewrite of released received-file paths with readers unchanged. Only the rewrite's completion gating across a retry needs stating. Classification is Large / High.
