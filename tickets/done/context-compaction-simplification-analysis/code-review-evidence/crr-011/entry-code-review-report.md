# Code Review — CRR-010

## Latest authoritative result

**Pass — implementation-source re-review of IR006. 9.40/10 (94.0/100).** API-F007's source correction is independently verified; the original focused public GraphQL regression is now green. **Product acceptance closure remains with API/E2E**, including actual worktree desktop save/readback/reopen and the stopped recovery campaign. Latest completed API result remains **API-REV-005 Fail78.6%**; no confidence rescore or Delivery advancement.

Date/reviewer: 2026-09-30 / Code Reviewer. Entry **Implementation Review**, overall round **10**. Task **Large / High**, independent reviewed route retained despite the small local fix. Classification: **N/A — Pass**, not a failure classification.

## Review context and scope

- Trigger: Implementation Engineer **IR-006** completed Local Fix for **CRR-009 / API-F007**, canonical `implementation-handoff.md` and `implementation-revision-record.md`; focused evidence `implementation-evidence/ir-006/README.md` and exact patch/inventory.
- Requirements: approved **SR028**, `requirements-doc.md`, `investigation-notes.md`, cumulative `solution-revision-record.md`; design **SR030** in `design-spec.md`; independent **ARCH-REV-003** in `design-review-report.md` / `architecture-review-revision-record.md`; **SR031** supported-scenario clarification. Still-relevant prompt/history/acceptance/recovery supplements retained in cumulative index. Requirements and design remain separate authorities and are unchanged from CRR009.
- Prior review: CRR009 focused Fail/implementation Local Fix; CRR008 full source Pass9.40, with its affected Settings-readiness rationale corrected by CRR009. Current report revalidates that affected path; unchanged source conclusions/evidence are reused, not represented as new full-suite execution. Prior canonical copied to `code-review-evidence/crr-010/review-entry-code-review-report.md` as input evidence only. CRR001 initial baseline and CRR002–009 retained in revision record.
- API context: current investigation, execution coverage report, ledger and API revision record **API005 Fail78.6** / API-F007; prior API004Fail90.7 historical. No successful ten-path test-review entry. Product/Delivery/DR artifacts **N/A — not applicable**.
- HEAD **6908ccff483f1eca522caa65bfaaf6dcfcc26750**, branch `codex/context-compaction-simplification-analysis`; worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`. IR006's three files are **pending**, not in HEAD; worktree plus handoff reviewed. Last refreshed origin/personal8caa610ff438c288d9aca9f2efe2c33924fbf517 unchanged.
- Scope: one production file `autobyteus-server-ts/src/services/server-settings-service.ts`; implementation unit delta and new narrow real-AppConfig integration test; relevant unchanged UI/store/GraphQL/config/runtime path previously traced in CRR009. Prior IR005 strategy/recovery/SDK/persistence/DTO/UI work remains hash-identical to its171-entry inventory. Ten API-owned paths match IR006 intake; the original API regression was rerun without edits.
- Exclusions: broad source reinspection of unchanged code, full suite/typecheck, new live-provider work, desktop launch, current semantic fidelity proof and full product recovery/resume/crash acceptance. Reviewer edits only review reports/history/evidence.

## Behavior basis and supported scenario gate

Approved intent understood and unchanged. **BEH001/005 / REQ008 / AC010**, configuration **DS005**, requires current optional budget controls to remain usable. Related **AC012** exact current model tuple/no-import semantics remain unchanged; the numeric setting is not that model tuple. No new requirement or provisional behavior ID.

| Basis | Current status | Forward production path and lifecycle evidence |
| --- | --- | --- |
| User sets supported numeric budget ceiling | **Confirmed in source and focused GraphQL boundary** | User opens Settings → Server Settings → Compaction card; ready bound window accepts positive16000 or blank-to-clear → store `UPDATE_SERVER_SETTING` → resolver → ServerSettingsService policy → ordinary AppConfig writer → readback/reload → runtime capacity. No contradictory or concurrent workflow assumed. Actual fixed desktop interaction not rerun. |
| Credential write-only / ordinary read exclusion contract | **Preserved** | Ordinary Settings writes and list queries retain the same credential-name regex for every key except the exact predefined nonsecret ceiling. True credential names still reject before writing; ordinary config-derived read keys still filter them. No metadata-wide exemption. |
| Other settings and persistence semantics | **Preserved** | After classification, existing read-only metadata, normalization, custom-key handling, retired-key AppConfig protection and writer choice execute unchanged. Numeric key stays `set`; model tuple stays `setDurably`. Normal saved numeric data reloads without a migration or private-file workaround. |
| BEH001–006 / DS001–010 unaffected approved paths | **Retained from CRR008** | IR005171 hashes unchanged; no delta to compressed-content contract, strategy-owned3 attempts/SDK policy, safe acceptance/commit, live epoch/FIFO/ACK/stop, shared DTOs/UI, history/current snapshot/frozen migration. These are reused source conclusions, not new runtime acceptance. |

### Candidate and mechanism disposition

- **CG027 (revalidated): supported normal scenario / Reachable; API-F007 correction verified.** Independent initiating basis remains REQ008/AC010 and ordinary Settings use documented in API005/CRR009, not the new helper or test. At `server-settings-service.ts:68–72`, one named exact-key comparison precedes the unchanged regex. The same constant registers metadata at137–140; reads at242–244 and writes at296–298 share that predicate. Only the exact public key changes classification. Expected consequence is normal save/readback/clear; current independent positive GraphQL and real config reload tests prove these bounded boundaries. Source defect resolved; product retest still due.
- **CG028: preserved security contract / Supported Explicit Edge Scenario.** Governing contract is existing write-only credential management and CRR009's required preservation, exercised when a caller submits a credential-like setting to ordinary Settings or requests its ordinary projection. Exact-match exception is not a prefix/suffix/substring or general metadata bypass. Existing generic credential rejection/read filtering remains for other keys; twelve representative security/lookalike controls confirm this. Synthetic names reproduce the established protection contract; they do not invent a new product behavior.
- No held candidate, new source finding, unsupported mechanism or speculative coordination requirement. Earlier MP004 and MP007 supported preservation/recovery decisions retained; MP005/006 rejected paths and SR031 unsupported identical-ID diagnostic remain rejected/not scored. No new or reclassified additional material premise.

## Data-flow and ownership review

| Spine | Start → authoritative owner → meaningful effect | Ownership and current delta |
| --- | --- | --- |
| DS005 Settings write (affected primary) | User numeric-control Save → CompactionConfigCard → settings store/Apollo → GraphQL resolver → ServerSettingsService → AppConfig → saved current numeric setting | UI owns draft validity, service owns key classification/metadata, config owns persistence. Fix stays in service; no caller bypass or new owner. |
| Settings return/read (affected return path) | AppConfig effective/config data → service key projection → GraphQL list → settings store → card readback/reopen | Shared local predicate retains read/write agreement; blank clear remains visible from persisted config. Return transport unchanged. |
| Runtime capacity (unchanged downstream) | Normal LLM phase → runtime settings resolver → capacity calculation → planner/fit boundaries | Reads the same key/value; provider input ceilings, output reserve and final fit untouched. No provider call needed to validate this predicate. |
| DS001–004/007–010 (unaffected primary/event/local paths) | Preparation/strategy/commit; restore/inspection; core recovery → server admission/FIFO → live projections/UI | CRR008's explicit spines and owner checks retained by hash/source-delta verification. No new retry, registry, outbox, ledger or lifecycle branch. |

Design health: **bug fix / Local Implementation Defect; no broader refactor needed**. Existing owner is correct. A short predicate states the actual classification exception once for read/write, rather than relaxing TOKEN matching globally or exempting any registered metadata. This is not an alternate legacy path or patch-on-patch recovery design.

## Mandatory structural / design checks

All checks apply to current scope; unaffected evidence comes from CRR008, with CRR009's correction retained. Pass here means source suitability for next validation, not product acceptance.

| Check | Result | Evidence / required action |
| --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Local incorrect classification in existing owner; bounded correction, no broader refactor. |
| Approved behavior-defining supplements matched | Pass | Same approved budget control and security posture; no prompt/retry/default/approval change. |
| Data-flow spine inventory clarity and preservation | Pass | Full UI→service→config→readback/runtime and return path above; prior spines unchanged. |
| Ownership boundary preservation and clarity | Pass | Classification remains service-owned; persistence remains AppConfig-owned. |
| Off-spine concern clarity | Pass | Predicate serves settings owner, not a new main-line service. |
| Existing capability/subsystem reuse | Pass | Existing Settings/GraphQL/config reused; no new registry or security subsystem. |
| Reusable owned structures | Pass | One local predicate and metadata key constant; no copied policy across read/write. |
| Shared structure/data-model tightness | Pass | No new DTO, optional field, parallel representation or shared base. |
| Repeated coordination ownership | Pass | No new coordination; read/write classification unified under current owner. |
| Empty indirection | Pass | Predicate owns the exact exception policy, not a forwarding wrapper. |
| Scope-appropriate SoC/file responsibility | Pass | Small classification change in existing Settings service; tests separated by boundary. |
| Ownership-driven dependency | Pass | No imports/new dependency cycles or deeper-layer shortcuts. |
| Authoritative Boundary Rule | Pass | UI/store/resolver continue service entry; no direct config write added above service. |
| File placement | Pass | Production in services, unit and narrow integration in their established test directories. |
| Flat-vs-over-split layout | Pass | No separate one-constant module or arbitrary folder/layer created. |
| Interface/API/query/command boundary clarity | Pass | Existing key/value Settings subject unchanged; no ambiguous new identity/control. |
| Naming quality / responsibility alignment | Pass | Exact context key and `isSensitiveSettingName`; comment explains tokens-versus-credential distinction. |
| No unjustified duplication | Pass | Two former raw regex consumers use one predicate; constant also registers metadata. |
| Patch-on-patch complexity control | Pass | Exact approved key only; no broad allowlist, fallback or recovery machinery. |
| Dead/obsolete code cleanup | Pass | Raw direct regex call sites replaced; no dead alternative helper. |
| Relevant test scenarios / assertions | Pass | Valid save/read/clear/reload; real credential/read-only/retired/custom guards; original API regression unchanged. |
| Test fixture/helper reuse and coherence | Pass | Unit mocks reset including durable-write history; integration uses isolated temp config and shared reopen helper. |
| No stale/compatibility-only changed tests | Pass | Two relevant behavior groups; no disabled expectations or stale output assertions added. |
| API/E2E readiness | Pass for source handoff | Exact original regression now2Pass; full actual fixed desktop/recovery validation explicitly pending. |

## Source size / structure audit

| Changed production file | Effective nonempty | >500 | >220 delta | Ownership / placement | Action |
| --- | ---: | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/server-settings-service.ts` |376|Pass|IR0067add/3delete; cumulative vs refreshed8caa15add/17delete, both below220|Coherent settings classification/metadata owner; correctly placed|None|

No implementation-source thresholds applied to unit/integration/API tests. Audit of pending production paths identifies only this service after correcting an initial nonrecursive audit pathspec; actual full `git diff HEAD --name-only` filtered results are persisted. No source changed during that audit. Prior cumulative source-size evidence remains valid for unaffected files.

## Legacy, persistence, cleanup and docs

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | Exact current public-key semantics, no version/alias/old preference path. |
| No legacy old-behavior retention | Pass | Wrong heuristic outcome replaced; no branch preserving rejection for old runs. |
| Dead/obsolete cleanup complete | Pass | One shared predicate replaces both consumers; no item requiring removal. |
| Approved persisted-data transition followed | Pass | **Not Affected / no migration**: same key/value/writer/reader; old settings import remains absent. |
| No version-specific dual read/write/request fallback | Pass | No serialized data/format change. |
| Transition mechanics match reviewed design | Pass | Normal saved-config reload and blank clear pass; no new crash/atomicity promise or migration mechanics. |

Removal inventory: **None outstanding**. Documentation impact: implementation/review handoff and history corrected; no new user-facing syntax, setting or configuration procedure. Delivery still owns final documentation synchronization; do not describe historic API-F007 failures as prior passes.

## Independent checks and limits

Evidence: `code-review-evidence/crr-010/README.md`, exact logs/exits, entry/source/owner audits and reference index.

1. Same implementation-owned four-file server command: **4files/80Pass**, exit0 (44 service unit,2 real AppConfig integration,27 config,7 GraphQL resolver unit). Numeric value is written through service, then process cache removed and configuration reconstructed for persisted reload/clear. Negative tests retain security/read-only/retired/custom behavior.
2. Exact CRR009 public-schema regression command: **1file/2Pass/11filtered**, exit0; numeric positive and credential negative. Original API-owned source unchanged. This verifies the source correction at GraphQL boundary, not full API005 success or the cumulative successful-test review.
3. Owned diff whitespace and new-file whitespace pass; source-size/hash checks pass. Requirements/design/API report unchanged; all3 IR006,171 IR005 inventory hashes and10 API paths match. All1196 protected pending entry paths preserved.

Total fresh reviewer-selected **82Pass**, eleven deliberate filters; no failed checks in this selected scope. Standard server Vitest/Prisma setup, no provider flags. Implementation's production `tsc --noEmit` exit0 retained with attribution, not rerun. No full-suite/test-tree/web typecheck claim. Prior red tests/UI/HTTP remain immutable historical evidence.

## Mandatory scorecard

**9.40/10 =94.0/100**, arithmetic mean. Current source score uses revalidated affected Settings/readiness plus explicitly reused unaffected CRR008 conclusions, not an automatic Pass or API confidence rescore. No unsupported scenario or accepted Qwen deviation drives a deduction. No new mandatory source remedy is hidden in the remaining limitations.

| Priority / category | Score | Why | Remaining limitation / drag | Expected improvement |
| --- | ---: | --- | --- | --- |
|1 Data-Flow Spine Inventory and Clarity|9.5|Affected write/return/runtime path explicit; prior spines retained|Cross-layer recovery paths remain necessarily distributed|Keep path-based coverage synchronized|
|2 Ownership Clarity and Boundary Encapsulation|9.5|Local Settings policy owns exact exception; existing owners retained|Admission/ACK lifecycle still spans distinct owners|Preserve documented single-owner invariants|
|3 API / Interface / Query / Command Clarity|9.5|No interface change; existing explicit content/epoch contracts retained|Existing control/observation interfaces richer than value contract|Avoid concrete provider leakage|
|4 Separation of Concerns and File Placement|9.4|376-line service adds only local policy; coherent unit/integration boundaries|Existing cumulative owners retain prior size/complexity pressure|Reassess on future substantive edits, not forced split here|
|5 Shared-Structure / Data-Model Tightness and Reusable Owned Structures|9.4|Shared read/write predicate; no new loose model|Unchanged core/wire contracts require coordinated maintenance|Keep producer/consumer contract checks|
|6 Naming Quality and Local Readability|9.2|New exact-key meaning/comment clear; prior concrete names retained|Prior dense coordinator/input transitions unchanged|Improve readability when those lines next change; no scope expansion|
|7 API/E2E Readiness|9.1|API-F007 source cause corrected; exact GraphQL2Pass plus80 local checks green|Actual desktop/recovery and inherited broad validation limits remain|API owner must rerun affected product flow and report truthfully|
|8 Runtime Correctness And Behavioral Fidelity|9.3|Save/read/clear/real reload proven; prior safe commit/recovery conclusions retained|Current full-product/semantic/crash proof incomplete|Complete authorized representative validation separately|
|9 No Backward-Compatibility / No Legacy Retention|9.6|No dual behavior/import/version branch added|Frozen historical preservation remains an isolated separate concern|Keep historical logic out of current runtime|
|10 Cleanup Completeness|9.5|No obsolete predicate consumers; owner work preserved|Delivery docs/user/finalization gates not reached|Complete through Delivery after valid acceptance|

## Findings / prior-finding resolution

**No new source finding. API-F007 source correction verified; product acceptance retest pending.** The CRR009 earlier-review gap remains acknowledged: a predefined public noncredential key was wrongly rejected before metadata, and earlier readiness confirmation missed that full path. The current source/GraphQL result replaces only that affected readiness hold, not the historical failing evidence.

CR001/002, ARCH-F001/IR003-LF001, ARCH-F002/IR005-LF001 and API F001/002/003/OBS001/F006 retain their prior scoped resolutions. API-F005 remains SR020 accepted known/nonblocking **not fixed/Pass**, Qwen STOPPED; API-F004 remains historical cause unknown. Detailed prior/current table is in CRR010 revision entry.

## Residuals and next stage

- API005 **Fail78.6** remains latest completed result. API005542Pass/1Fail/46files and whole GraphQL12Pass/1Fail are prior API evidence, not overwritten by this focused reviewer2Pass. Successful separate proportional review of **ten cumulative API paths** still required after eventual API Pass; API005-LF001 is a scoped test correction, not general approval.
- API must revalidate actual worktree desktop Settings Save/readback/reopen, then the stopped heldA/attachment/queuedB/retry/cancel/post-response/reconnect/saved-resume flow. Implementation reported CUA unavailable; reviewer did not independently relaunch a desktop or claim rendered Pass. Follow current repository testing guidance for owned isolated app, never the user's app/data.
- Prior loopback3parent/0compaction/0remote was protocol-only, not inference/semantic proof. No new provider campaign/budget authorized. SR0221fidelityFail/3scopedusable/exhausted;v6parked, no prompt/default/support change.
- SR031 identical-ID Team/Org injected diagnostic remains Fail with unsupported production premise, not scored; no withdrawn retention machinery. Other14 residuals,7baselinecontract failures, fullwebtypecheck6836, fullsuite/crash/current-live/integrated UI/Delivery/user limits remain unwaived.
- No source/durable-test edit, staging/commit, remote refresh/push/merge/release, provider call, private credential/history access or unrelated pending/SDK/generated-output cleanup by reviewer. Eventual origin/personal finalization remains Delivery-owned.

## Routing

Latest review decision **Pass**, supported-scenario/material-premise gates **Pass**, failure classification **N/A**. Ready for API/E2E revalidation, not Delivery. Fresh handoff rule selection and confirmed receipt follow; only the single most-specific outcome recipient is notified under the team contract.

Fresh `get_handoff_rules` selected **“When implementation review passes and the cumulative package is ready for API, end-to-end, and executable coverage work.”** → sole **/api_e2e_engineer**. API-owned fix/failure-origin/Delivery conditions do not apply. No additional informational recipient under the developer single-recipient contract. Confirmed receipt follows send.

Confirmed **accepted=true / DELIVERED** to sole **/api_e2e_engineer**, exact AgentRun **api_e2e_engineer_96e63b834264434986f16a8037990c3f**,863 cumulative references attached. Receipt `code-review-evidence/crr-010/handoff-receipt.json`. No duplicate implementation/SD/Delivery outcome notification. Source review stops after this handoff.
