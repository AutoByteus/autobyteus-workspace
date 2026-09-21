# Architecture Assertion-Validity Record

**Later authority note:** AAV-001's retained-provider-history answer below remains
resolved. RER-028 separately supersedes its RER-026/027 configured-only live
scope; AD-REV-019 now designs task-inclusive events/Tasks/Messages. The no-new-AD
statement in the completed assertion-only round is historical, not a restriction
on this later user-approved parity revision.

## AAV-001 — Task-origin provider history versus configured communication presentation

- Date: 2026-09-11.
- Stable package: `AORG-FLAT-TEAM-001`.
- Trigger: API/E2E's bounded assertion-validity question during `API-REV-022`.
- Inspected artifact: `6ef456e0a3fd568e732bafbd79c5f9abb2aed1f4`, branch
  `requirements/flat-agent-organization-model`, isolated task worktree
  `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model`.
- Requirements at inquiry: `RER-026@16b560f82c1edda24e17a1330edc5c820a1328b6`.
- Current authority: user-confirmed
  `RER-027@c7d435ee661525e1e85fbd5b032817fc6703c8be`.
- Completed design/review: `AD-REV-018@36f76ebbdb23b7ee235f94ab38968cf2adefbe00`
  / `ARCH-REV-016@6ce3dbc3c1a38b7212f9dd77a12b7ef362e98577` Pass.
- Current outcome: **Resolved — assertion-validity clarification only**.
  The resolution below supersedes the original inquiry's pending decision and
  hold. The original inquiry is retained as evidence, not an open gap.
- Original outcome: **Requirement Gap — bounded interpretation of an exclusion**.
  This is not source-defect attribution, a proposed fix, an API/E2E result,
  or a completed architecture-design revision. AD-REV-018 remains unchanged.

### Observed facts and evidence

API/E2E reports successful durable task-Team-Agent to configured
`/research-team/analyst` communication, with an exact message/reference. Live
receiver presentation contains no task-origin `MEMBER_INPUT_MESSAGE` packet,
and configured Org Messages excludes the record. After supported restart and
Restore, the ordinary retained provider-history conversation displays the task
packet; the configured Messages facet still excludes it.

Evidence under the ticket:

- `api-e2e-evidence/API-REV-022/live/task-history-observation-pending.json`
- `api-e2e-evidence/API-REV-022/live/MSG-task-directions.json`
- `api-e2e-evidence/API-REV-022/live/POSTRESTART-narrow.json`

`MSG-task-directions.json` correlates durable message
`collabmsg_DOHTET5wWgRBp9A3xXtsO1saI04NiJpj` and marker
`API22-TASKTEAM-CFG` to a retained `trace_type: user` record from
`AgentRun.postUserMessage`. This is real accepted input, not evidence that the
new configured-pair event was emitted. Architecture inspected the supplied
evidence and current source; it did not rerun the browser or provider.

Current frontend source separately establishes the history path:

1. `autobyteus-web/services/agentOrgExecution/agentOrgContextHydration.ts`
   fetches the exact Org/member/run projection and applies its conversation via
   `buildConversationFromProjection`.
2. `autobyteus-web/services/runHydration/runProjectionConversation.ts` is the
   shared retained-conversation mapper, distinct from the live configured-pair
   member-input publication and Org Messages perspective filtering.

### What the completed design does and does not establish

DS-028, the AD-REV-018 both-endpoint classifier, and VAL-040 explicitly exclude
all task-involved endpoint pairs from the **new configured-member event and
configured Messages facet**, while preserving existing accepted task delivery,
sidecar/root event, and input release. They do not specify blanket removal of
accepted task input from retained provider conversation history.

Consequently, the reported observation does not by itself prove violation of
that two-endpoint event/facet mechanism. Nor does this establish a cumulative
pass: `requirements-doc.md` REQ-034 and the RER-026 revision narrative also say
task-scoped sends produce no inbound member-input presentation, alongside
live/reconnect/restore parity. VAL-040's general statement that excluded
attempts remain absent does not explicitly disambiguate a retained ordinary
provider-history entry from a new member-input event. The event-type distinction
cannot silently narrow an approved user-visible exclusion.

### Exact upstream decision requested

Requirements Engineering must clarify whether the task-scoped exclusion means:

1. No new configured-pair `MEMBER_INPUT_MESSAGE` or configured Messages row;
   ordinary truthful retained provider input history remains outside this
   exclusion; or
2. No task-origin inbound packet anywhere in the receiver center, including
   retained provider-history rendering after reconnect/Restore.

The first interpretation matches the mechanism explicitly documented in
AD-REV-018, but Architecture does not approve it as product intent merely
because current source behaves that way. The second would require an
architecture impact assessment; no filtering, data deletion, schema change, or
other implementation prescription is authorized by this record. Requirements
owns any canonical clarification and any approval required by a behavior change.
No new Product prototype is requested by this record.

### Scope and next action

- Keep only the disputed restored-center assertion unclassified pending that
  answer; independent API/E2E checks and owned cleanup may continue.
- Preserve the successful live-event/facet observations and the restored-history
  observation separately. Do not convert either into a source finding or a
  strengthened assertion pass without the authority clarification.
- Cumulative classification remains `task_size=Large` /
  `architectural_risk=High`; this inquiry adds no implementation scope.
- Route this bounded Requirement Gap to Requirements Engineering under the
  current handoff rule. Return the authoritative answer to Architecture for
  the API/E2E assertion disposition and any necessary design reconciliation.
- Requirements, design, source, tests, and downstream-owned dirty evidence are
  unchanged by this record. No AD-REV-019 is created because no architecture
  design round has been completed.

### Resolution — RER-027 authoritative answer (2026-09-11)

Requirements Engineering returned explicit user confirmation after a read-only
comparison with the earlier AgentTeam implementation. Canonical authority is
`requirements-doc.md` REQ-015/034, AC-010/029, SCN-005/018 and DEC-022;
`investigation-notes.md` records both the source comparison and the distinction
between ordinary task messages and task-result system notifications.

**AAV-001 option 1 is authoritative.** Truthful retained provider input history
is outside the configured-member event/Messages exclusion. Accepted task
messages/results remain in the original Agent's normal conversation/history
after settlement and Restore. Settled task executions leave the active tree;
showing their retained input does not reactivate them or create configured
membership or a mounted-Team root.

The scoped validation disposition is:

| Observation or proposed assertion | Disposition under RER-027 |
| --- | --- |
| Task-involved accepted delivery has no new configured-member `MEMBER_INPUT_MESSAGE` and no configured Org Messages row | Supported exclusion; preserve the existing live-event/facet evidence as such. |
| Genuine accepted task input is visible in the receiver's ordinary retained provider conversation after Restore | Permitted and required retained-history behavior; not evidence that a prohibited new configured-member event was emitted. |
| Every task-origin packet must be absent everywhere in the restored center | Unsupported assertion; do not count it as a source failure or convert it to a passing assertion. |
| Retained task messages/results remain inspectable after the task settles, without bringing it back into the active tree | Supported preserved behavior; API/E2E owns evidence and coverage, not this clarification record. |
| A stored task submission by itself proves its result notification reached the delegator | Unsupported inference; preserve actual accepted input, never fabricate a missing notification. |

Configured-to-configured exact-once event/row, identity/reference,
live/reconnect/Restore and unrelated-participant exclusions remain unchanged.
Rejected or uncommitted sends still cannot fabricate accepted messages. A
provider `user` role is not proof of external-human provenance and does not
make task input eligible for REQ-033's first-user-message history summary.

**Earlier Team comparison correction:** the immutable Team baseline
`5fb16658e7bd2aefd750f99eb596a17382e161ac` publishes accepted receiver input
without a configured-pair gate and resolves Messages identities using
task-inclusive execution locations, as documented by Requirements Engineering.
Do not describe Org's configured-only event/facet restriction as full Team
task-presentation parity. RER-027 confirms retained task history and settlement;
it does not expand Org's scoped live event/Messages population. The existing
shared presentation language and configured-pair parity remain valid.

**Architecture impact check:** DS-028's both-endpoint classifier, single root
sidecar and separate retained conversation hydration already accommodate this
answer. VAL-040's event/facet matrix is unchanged; its general exclusion and
live/restored equivalence language is scoped to those configured-member
consequences, not blanket equality with the entire provider conversation.
No new design mechanism, source/test edit, filter, migration, recovery,
retention/routing/command/schema change, or Product gate is authorized. This
record is the clarification supplement to AD-REV-018, not a new design round.
AD-REV-018 / ARCH-REV-016 remain the completed design/review authorities;
no AD-REV-019 or independent re-review is needed for this assertion-only return.

Cumulative `task_size=Large` / `architectural_risk=High` remains unchanged;
the bounded disposition adds zero implementation scope. Only the AAV-001
assertion hold is released. Return the answer to the requesting API/E2E owner
so independent validation and cleanup can continue under the clarified scope.
API/E2E retains ownership of report/coverage disposition. No source-defect
finding, strengthened assertion pass, cumulative execution pass, or delivery
readiness follows from this answer. All unrelated holds/findings remain with
their existing owners.


## AAV-002 — Supported Org file/package roundtrip versus Org-only root admission

- Date: 2026-09-12.
- Package: `AORG-FLAT-TEAM-001`; bounded question from API/E2E during API-REV-032.
- Authority: RER-033@f84c5299f10898f49acff6a0e481d1cd61c769a9,
  REQ-026/037, AC-032/035, ORG-CASE-062/064; AD-REV-025 / ARCH-REV-022,
  inherited DS-031b/c and DS-038b/r.
- Read-only source inspected at 8f744b4d68e0ef163e4106eae2d5bb407440399f.
  This assertion answer is not a new completed architecture-design round,
  source-defect classification, test result, or implementation assignment.

### Evidence and boundary

1. `autobyteus-server-ts/src/agent-packages/utils/package-root-summary.ts:55–83`
   checks absolute/existing directory and requires a top-level `agents`,
   `agent-teams`, or `applications` directory. It does not recognize
   `agent-orgs` alone. It does not check reference closure at this stage.
2. `agent-packages/services/agent-package-service.ts:282–300` calls that
   validator before local root registration and catalog refresh.
   `agent-org-definition/providers/file-agent-org-definition-provider.ts:35`
   subsequently discovers `agent-orgs` under registered additional roots.
   Org discovery within a registered package and structural acceptance of an
   Org-only package root are distinct contracts.
3. DS-031b/c and DS-038b/r retain existing package registration, per-definition
   semantic admission, and supported file-copy/export/reimport. They add no
   export API or explicit Org-only root admission. REQ-037 / AC-035 require
   preservation of authored vocabulary and exact reference meaning through
   supported operations; they do not separately prescribe an Org-only Settings
   import-root acceptance assertion.
4. API-owned `api-e2e-evidence/API-REV-032/live/AUTH-owned-roundtrip-prepared.json`
   records copying only `agent-orgs/api32-local-owned-org/`, including children.
   Its copied `agent-teams/local-team/team-config.json` still references
   `aorg-lead`, `aorg-analyst`, and `aorg-verifier` with `refScope: shared`.
   The copy is not a self-contained dependency bundle. This does not establish
   that those dependencies are absent from every registered source; nor does
   it explain the observed rejection, which occurred at the earlier structural
   gate. The original rejection is not a reference-resolution failure.

### Bounded assertion disposition

Use a complete supported package for the AC-035 roundtrip: preserve the copied
Org and owned children unchanged, include the exact referenced shared Agent
packages under the established `agents/` family, and include any further real
required dependencies. Do not add empty sentinel directories merely to bypass
root validation, retarget refs, promote owned children into global definitions,
or relax codecs. Validate through normal Settings registration and semantic
read/reopen, not direct registry mutation. Registration alone is not success:
compare exact authored bytes/meaning, refs, handoffs, owned identity/resolution,
and global-catalog exclusion. Distinguish unchanged uppercase GraphQL enum
mapping from required lowercase `org_local` in the authored JSON.

Keep the original Org-only structural rejection and export evidence. It is
**not a supported success assertion for this unchanged roundtrip design** and
must not be counted as an implementation failure or a passing negative test
against an invented requirement. The complete-package fixture correction can
proceed within API/E2E ownership; do not erase or relabel the original result
as a successful import. Success on the complete package would prove only that
supported roundtrip, not Org-only admission.

This does not decide that a self-contained Org-only package should be forbidden
as product behavior. That broader acceptance question remains unadjudicated;
if required, Requirements Engineering owns its explicit scope before an
implementation or assertion is added. It is not necessary to resolve it to
continue the already supported complete-package roundtrip.

No source/test/requirements/design-spec/review revision or route changes are
made by this answer. Cumulative Large/High and AD-REV-025 / ARCH-REV-022 remain
unchanged; no AD-REV-026 is created. API/E2E owns remaining execution, coverage,
reporting and cleanup. No API-REV-032 pass or delivery readiness is inferred.
Current handoff rules contain no matching stage-outcome rule for this bounded
assertion reply; return it by ordinary message only to the requesting API/E2E
execution, with no duplicate assignment or additional recipient.


## AAV-003 — Retained Uploaded File Label Versus Recorded Storage Basename

- Date: 2026-09-12; package `AORG-FLAT-TEAM-001`.
- Trigger: API-REV-034 bounded assertion-validity question, not a stage result.
- Authority: RER-033 / AD-REV-026 / ARCH-REV-023 Pass; IR-055 / CRR-082;
  inspected HEAD `841508edcb766eaf918ddd9bedf8217ae8ab3d6a` in the canonical
  `requirements/flat-agent-organization-model` worktree.
- Basis: established context-file/history parity, DS-044/045, CF-08 and VAL-071.
- Outcome: **Resolved — existing human-label assertion is valid in this case**.
  This is not a completed design revision or an implementation assignment.

### Evidence

1. `api-e2e-evidence/API-REV-034/live/CF-task-message_agent.json` records one
   normal Send, the text attachment's displayName
   `API34-CF-TASK-MESSAGE_AGENT.txt`, separate storedFilename
   `ctx_b40cebe41258__API34-CF-TASK-MESSAGE_AGENT.txt`, and original exact Org/
   AgentRun locator. API's receipt reports original recording/projection and
   both immediate Opens successful; Architecture did not rerun them.
2. `live/CF-label-confirmation.json` in the same round records both widths
   1502/390 with the prefixed text label/aria Open name and unchanged clean image
   label. Both text Opens return hash
   `b0d123679b4a6e8fe612777157f34746a3ff99ef410e51e4b3b195da620bc867`;
   both views retain raw-user-row hash
   `118c5b50b88a43deb71059b5fe3f20a8a3bbb17a6ae0ced1b06ec920454bba22`.
   The receipt reports no runtime writes, mutations or page errors. Read-only
   inspection of `live/screenshots/CF-label-area-390.png` corroborates the
   visible prefix. These are API-owned observations, not new Architecture
   browser/execution results or independent Sends at each width.
3. `autobyteus-server-ts/src/services/agent-streaming/agent-org-stream-handler.ts:123`
   constructs `new ContextFile(filePath)`. `autobyteus-ts/src/agent/message/context-file.ts:35–38`
   supplies basename when no fileName is supplied. DS-044 therefore correctly
   preserves the accepted stored basename in this raw record. It is not proof
   of corruption or association loss.
4. `autobyteus-web/services/runHydration/runProjectionConversation.ts:156–158`
   and `services/eventMonitor/eventMonitorActiveTraceBrowsePresentation.ts:27–31`
   pass recorded fileName as displayName to shared hydration. In
   `utils/contextFiles/contextAttachmentModel.ts:64–66,191–204,245–253`, an
   explicit displayName overrides the established uploaded-name derivation.
   That derivation removes the upload storage prefix from a recognized uploaded
   locator's stored filename. It already existed at pre-AD026 source
   `3d9a019d320878c421429f27c0f074f9a4c4c2f5`. Current media hydration passes
   no explicit filename; the asymmetry explains the different image label.

### Assertion Disposition And Limits

CF-08's **same file label/type/locator** and DS-045's **familiar label and Open**
refer to the user-facing attachment label, not mandatory literal rendering of
raw `file_name`. For this ordinary upload the expected visible text and aria
name remain `API34-CF-TASK-MESSAGE_AGENT.txt` / `Open API34-CF-TASK-MESSAGE_AGENT.txt`
after cold return. Treating the new storage prefix as an allowed label would
weaken that existing assertion. Correct Open bytes do not satisfy label parity.

DS-044's exact accepted-name preservation and DS-045's instruction to carry
captured type/name through shared hydration are still valid. The stored fact
and the shared presentation result are different layers. Carrying that fact
is not authority to bypass familiar uploaded-name presentation or to equate
all captured basenames with explicit human display names. The design's
prohibition on filename/directory reconstruction concerns inventing a missing
attachment association or owner; it does not prohibit the existing display
formatting of an already-recorded, recognized upload. No URI, owner, file bytes,
raw fact or historical association needs rewriting to answer this question.

This bounded answer does not prescribe global prefix stripping, discard explicit
custom labels, or change unrelated workspace/external-locator naming policies.
Do not weaken exact type/locator/row/Open checks, broaden filename inference,
repair API fixtures/history, add a new schema/migration/lookup/cache, or resume
settled tasks. Keep the observed label mismatch separate from the scoped
success of the prior non-media association correction. API/E2E owns execution
and reporting; Code Reviewer owns subsequent source failure-origin attribution.
If correction actually requires a new contract/owner/persistence decision,
return that demonstrated Design Impact rather than silently expanding scope.

Only this assertion record is changed. Requirements, design/review authority,
cumulative Large/High, and the implementation/validation route are unchanged.
No AD-REV-027, fresh architecture pass, source finding/fix assignment, API34
cumulative Pass or Delivery readiness is created. Existing actual-installation
cutover and unrelated held validation remain separate. Current handoff rules
have no matching stage-outcome rule for this assertion-only reply; return one
ordinary answer to the requesting API/E2E execution, not duplicate specialist
work or a whole-round Architecture hold.
