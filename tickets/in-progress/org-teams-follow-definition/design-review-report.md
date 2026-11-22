# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/requirements-doc.md` (Approved, unchanged)
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/investigation-notes.md`
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/solution-revision-record.md` (SR-001..SR-016)
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-spec.md` (SR-016, commit `7361b6627e`; § SR-016 Revision)
- Supplemental Task Artifacts Reviewed: `org-container-storage-contract.md` (§10 rows), `release-deployment-report.md` (DR-001 Blocked: 35 conflicting files with `origin/personal` `f2c0d2a902`)
- Relevant Solution Revision IDs: SR-016
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-011`
- Current Review Round: `11`
- Trigger: SR-016 after delivery DR-001 (the base gained autobyteus-587 cross-node file transfer and autobyteus-599 session renewal)
- Prior Review Round Reviewed: 10 (`ARCH-REV-010`, Pass)
- Latest Authoritative Round: 11
- Current-State Evidence Basis: `origin/personal` `f2c0d2a902` (166 commits after `9f6add773b`; `git describe` = `v1.5.14-beta.7-64-gf2c0d2a902`). Read:
  - **587 is released:** its commit `11b7ed5444` is contained in tag `v1.5.14-beta.7`;
  - `agent-collaboration/execution/remote/transferred-files.ts:1-60`: `ReceivedFilesPlan.paths` = `<agent folder>/received_files/<sender's run ID>/<file name>`; the agent folder is the run's `config.memoryDir`, "a Team member's or an Org agent's own";
  - `agent-collaboration/execution/communication/root-communication-engine.ts:250-251`: an accepted message from another node is stored with `referenceFiles: plan.paths`, i.e. absolute paths into the receiving agent's folder;
  - `agent-org-execution/domain/agent-org-run.ts:113`: the Org root plans received files into its member's folder, which on `f2c0d2a902` is under `agent_orgs/<orgRunId>/…`;
  - `agent-org-execution/services/agent-org-reference-content-service.ts:71-92`: the Org message-reference route serves the **stored absolute path** (`fs.createReadStream(filePath)`);
  - no changes on `f2c0d2a902` to the message, Org tree, Team tree, agent metadata, shared records, Task-resource schemas or the migrations folder (`git diff --stat`).

## Routing Classification Review

- Task size `Large`; architectural risk `High`. Independent review required: `Yes`. No correction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. The requirements are unchanged.
- SR-016's runtime mapping is sound:
  - Org units are ordinary Team and agent runs, so 587's received/outgoing files and 599's renewal reach them through their own roots and compositions;
  - the container hosts no agent, so `LiveAgentOrgContainer.remoteNodeOf()` returns `null`;
  - the Org-hosting additions are not ported, since their files are deleted;
  - FU-003's peer notice moves onto the base's reworked node path.
- SR-016 misses one released stored shape. 587, shipped in `v1.5.14-beta.7`, stores files received from another node as **absolute paths into the receiving agent's folder** in that message's `referenceFiles`. For an Org member that folder is inside `agent_orgs/<orgRunId>/…`. The conversion renames those folders (contract §1, §9) and keeps log lines unchanged, so converted references point to folders that no longer exist. The Org reference route serves the stored absolute path (AR-011).

| Behavior ID | Status | Notes |
| --- | --- | --- |
| BEH-001..BEH-005, REQ-006, REQ-009, DEC-006, DEC-007 | Confirmed | As ARCH-REV-010; SR-016's runtime mapping |
| BEH-006 conversion (REQ-007, AC-006): conversations keep their content | Needs Correction | Received-file references from 587 (AR-011) |

## Supplemental Artifact Coherence Verdict

| Artifact | Verdict | Notes |
| --- | --- | --- |
| `org-container-storage-contract.md` | Fail on one point | §10's 587 row covers new received files. §9's log-line row ("→ the member's unit log, unchanged") and §7 ("nothing is rewritten") do not cover the released absolute received-file paths in `referenceFiles` (AR-011) |
| `release-deployment-report.md` (DR-001) | Pass | The trigger is correctly stated |

## Structural Verdicts

All structural sections of ARCH-REV-010 stand. SR-016's runtime mapping passes:
- 587/599 on unit roots;
- `remoteNodeOf: null` on the container (Principle 16: a required boundary method, implemented explicitly, not a fallback);
- deleted files stay deleted;
- both-sides conflict rule;
- FU-003 moved onto the base's node path.

One row fails:

| Section | Row | Verdict | Notes |
| --- | --- | --- | --- |
| Persisted-Data Transition | Released Org log lines and member inputs with 587 received-file paths | Fail | Released shape (beta.7) not in the conversion's input map (AR-011) |

## Material Premise Validation

### `MP-11` — An Org member received files from another node on v1.5.14-beta.7, then the upgrade converts the Org

- Related requirement: REQ-007, AC-006 (conversations, messages and memory kept), DEC-001
- Initiating basis kind: `User`/`Operational`. On a released build with 587, a peer node messages or delegates to an Org member with files: cross-node file transfer, a supported feature. The user then upgrades to the build with this ticket.
- Forward path:
  - On beta.7 the Org root plans the files into the member's folder `agent_orgs/<org>/<team>/<agent>/received_files/<sender>/…` (`agent-org-run.ts:113`, `transferred-files.ts` `ReceivedFilesPlan.paths`).
  - It stores the message with `referenceFiles` = those absolute paths (`root-communication-engine.ts:250-251`), and the agent's input names them.
  - The conversion renames the member folder to `agent_teams/<team>/<agent>/` (or `agents/<agent>/`) and writes the line to the unit log unchanged (contract §9).
  - The Org reference route then serves the stored absolute path (`agent-org-reference-content-service.ts:71-92`), and so does a unit's own reference reader.
- Consequence:
  - the message's files no longer open in the Org view (not found), though the bytes were moved and still exist;
  - the agent's own history names paths that no longer exist;
  - REQ-007's "conversations keep their content" fails for these messages.
- Reachability: `Reachable` (587 shipped in a release before this ticket). The user's own Org has no peer lines (checked in earlier rounds), but the released shape exists.
- Review consequence: AR-011.

## Unresolved Approved-Behavior Or Current-State Gaps

None in the requirements.

## Review Decision

`Fail`

## Findings

### AR-011 — The conversion misses 587's released absolute received-file paths

- Type: `Design Impact`; severity Medium
- Protects: REQ-007, AC-006, DEC-001 (every conversation, message and memory kept); guideline whole-input mapping
- Problem: since `v1.5.14-beta.7`, a message from another node to an Org member is stored with `referenceFiles` holding absolute paths inside the member's folder under `agent_orgs/<orgRunId>/…`. The conversion moves the folder, keeps the line unchanged, and rewrites no traces. Those references then point nowhere, and the Org reference route serves only the stored absolute path (MP-11). SR-016 treats 587 as runtime-only.
- Required update: decide in the design and contract §9 how released received-file references survive the move. Options:
  - **(a)** the conversion rewrites, in the converted log lines, every `referenceFiles` entry under the old member folder to the same relative path under the new folder (part of the whole-line mapping). It decides the traces separately: either rewrite their recorded reference paths with a typed visitor, or state why they may stay;
  - **(b)** the reference readers (the Org edge, R-7, and the units' readers) resolve a path under an old member folder to the moved folder. That would be a lasting mapping, which Principle 15/8 argue against, so it needs a stated reason.
  
  Add a fixture with a beta.7 cross-node line (received files under a member folder) and a test that its reference opens after conversion.
- Proportionate: one more input kind in an irreversible migration of released data.
- Recipient: Solution Designer

## Classification

`Design Impact` (AR-011).

## Recommended Recipient

Solution Designer.

## Residual Risks

- The rest of SR-016 can proceed as written. Check whether 599, if released, stored any path under an Org member folder outside `work_journal/`. Its hand-over notice is composed from the current folder at renewal time, so it is unaffected by the move.
- Earlier notes (ARCH-REV-005/007/009/010) still apply.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-11 reachable)
- Notes: SR-016's re-integration plan is right for the runtime: units are ordinary runs and the container hosts no agent. Only 587's released stored paths into Org member folders need a place in the conversion. Classification is Large / High.
