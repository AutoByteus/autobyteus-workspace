# Code Review — CRR-009

## Latest result

**API/E2E Failure-Origin Review: Fail — Local Fix, implementation-owned. API-F007 confirmed and open.** The normal numeric effective-context override is rejected by the production credential-name guard. Correct that bounded classification defect without weakening credential protection; return for source review and then API/E2E. No Delivery or successful-test review.

Date/reviewer: 2026-09-30 / Code Reviewer. Round **9**. Task **Large / High**, reviewed route unchanged. Latest executable result remains **API-REV-005 Fail /78.6%**. Historical CRR-008 implementation-source **Pass9.40** is not rescored in this focused round; its affected Settings-preservation/readiness rationale is corrected below. The current failure takes precedence over that earlier readiness conclusion.

## Context and scope

- Trigger: API Engineer's API-REV-005 completed failure package; API-C09 actual desktop Settings and API-C05 GraphQL regression; approved **REQ-008 / AC-010**, related AC-012. No new intended behavior.
- Authority: current `requirements-doc.md` **SR028**, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md` **SR030**, `design-review-report.md` / `architecture-review-revision-record.md` **ARCH-REV-003**, and **SR031** supported-scenario clarification. Complete earlier solution/prompt/history/acceptance supplements remain indexed. Requirements and design remain separate authorities.
- Implementation: `implementation-handoff.md` / `implementation-revision-record.md` **IR005**. HEAD/source **6908ccff483f1eca522caa65bfaaf6dcfcc26750**, IR005 base **5cb7b049ae3158108bff2cb70ed80e89540586d9**, refreshed origin/personal **8caa610ff438c288d9aca9f2efe2c33924fbf517**; branch `codex/context-compaction-simplification-analysis`. Current pending worktree, not commit alone.
- Review context: `code-review-revision-record.md` CRR001–008; prior canonical preserved as `code-review-evidence/crr-009/review-entry-code-review-report.md` (input evidence, not a competing authority). CRR001 baseline remains present.
- API context: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`; current evidence `api-e2e-evidence/api-rev-005/ir005-resume/`. Product and Delivery/DR: **N/A — not applicable**.
- Inspected smallest relevant path: actual numeric control and settings store, GraphQL resolver, ServerSettingsService registration/write guard, AppConfig writer and runtime capacity consumption, two new GraphQL assertions, reported HTTP/UI evidence and current/baseline source identity.
- Excluded: full source audit/scorecard, cumulative ten-path successful-test review, broad suite/typecheck, further provider campaign, relaunch of desktop, recovery/semantic acceptance. No production or durable-test changes by reviewer.

## Supported behavior and candidate gate

**CG-027 — Promote API-F007. Supported Normal Scenario / Reachable.**

| Gate | Independent basis and evidence |
| --- | --- |
| Actor and coherent goal | A run user configures the supported effective context ceiling to control compaction budgeting for normal long-running work. REQ008 preserves existing ratio/budget/current controls; AC010 says current optional overrides/ratios remain usable. Design configuration row BEH001/005 and DS005 preserves the Settings entry; design lines119–126 explicitly keep ratio/budget/diagnostic controls and ordinary saving. This is not a test-only threshold invention. |
| Entry and ordinary workflow | Open Settings → Server Settings → Compaction configuration; change only Effective context override from blank to positive integer16000 and Save. One normal bound window, ready settings, valid draft, no concurrent rebind, credential operation or artificial timing. |
| Forward path | `CompactionConfigCard.vue:65–80,144–157,213–245` validates positive integer and submits `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE`; `stores/serverSettings.ts:386–421` calls `UPDATE_SERVER_SETTING`; GraphQL `server-settings.ts:79–85` invokes `ServerSettingsService.updateSetting`. |
| State and consequence | Service registers this key as a public editable ceiling (`server-settings-service.ts:51–58,133–136`), but line68 unanchored `TOKEN` matches the `TOKENS` substring. Lines292–294 reject before metadata, normalization and AppConfig write at295–311. Mutation returns rejection; store throws, card displays it. No value saved; reopening remains blank. User cannot apply this supported control. |
| Intended continuation | On a valid write AppConfig `set:481–495` updates current config/environment and its configured file. Core `CompactionRuntimeSettingsResolver:54–61` reads the numeric setting; `llm-phase.ts:84–92` and `token-budget.ts:43–67` use it as effective context capacity, while preserving provider input limits and output reserve. The observed rejection prevents reaching this path; no claim current recovery/compaction logic itself failed. |
| Independent confirmation | Requirements/design support predates the new regression. API's worktree-built desktop UI, captured screenshot/DOM, reopen and public HTTP results show the same behavior. Reviewer independently reran the normal schema test: positive Fail, credential-negative Pass. Source audit directly confirms exact matched substring and ordering. |
| Proportionate response | Bounded production settings classification fix, with the numeric public control usable and real credential settings still protected. No new registry, migration, retry state, outbox, security bypass or product requirement. |

Affected basis status: **Contradicted** for usable optional numeric Settings override under BEH001/005 / REQ008 / AC010. AC012 current-model tuple no-import/exact-persistence contract is related context, **not independently found broken by this numeric-key rejection**. No missing requirement, unsupported concurrency premise or new behavior ID.

## API-F007 — numeric setting falsely classified as a credential

**Severity: Medium; blocking the affected acceptance criterion and current validation progression. Status: Open. Owner: Implementation Engineer.**

Location: `autobyteus-server-ts/src/services/server-settings-service.ts:68,133–136,290–311`.

Expected: a valid positive context ceiling saves and is returned through ordinary Settings, retaining existing credential/read-only/retired-key and value-validation protections. Observed: `Sensitive settings must use their write-only credential editor.` before any numeric-key write. The credential negative control correctly remains rejected.

**Origin: production implementation defect, with an earlier review gap.** It is not a provider outage, model quality/availability restriction, invalid test, fixture/database issue, new post-review production change, runtime-only surprise, or inadequate approved design. Fresh inventory audit matches all171 IR005 owned/adapted entries; pending production diff is empty. Independent `git show` comparison finds the identical regex and write-guard bytes at8caa610f,5cb7b049,6908ccff and current worktree, and Node evaluates the match as `TOKEN` in every case. This is evidence of an inherited source defect, **not** an executed historical baseline, introduction-commit diagnosis or acceptance waiver.

### Bounded earlier review correction

CRR008 reused prior CRR005 Settings-preservation evidence and marked API/E2E readiness “Pass for source handoff” with no source blocker. That confirmation did not adequately trace the already-approved numeric budget control through the actual generic write guard. The source-detectable invariant that should have been caught is: **a predefined editable noncredential budget key is rejected unconditionally because its name contains `TOKENS`**. Current-model tuple, factory/default and mock/component success do not establish this separate key's public save path.

Only that affected configuration-preservation/readiness rationale is withdrawn and corrected by API-F007. Prior source score9.40 remains a historical result, not current settings acceptance; no unrelated category rescoring or full source audit is performed. Earlier CR001/002 closures and independently verified strategy/retry/recovery/persistence conclusions are not invalidated by this failure.

## Focused verification and evidence

Reviewer exact command (normal server Vitest/Prisma setup, no provider flags), cwd `<worktree>/autobyteus-server-ts`:

```sh
pnpm exec vitest run tests/e2e/server-settings/server-settings-graphql.e2e.test.ts -t 'numeric compaction context ceiling|credential-like settings' --no-watch
```

**Exit1: 1Pass /1Fail /11 filtered skips, one file.** Positive fails at line729 with the reported credential-editor message. Test setup uses fresh owned temporary config, public GraphQL schema/resolver and real service; key environment is restored in `finally`. The negative control confirms current true credential-name rejection. No direct stub of the guard and no live-model dependency. Reviewer did not modify either assertion or rerun the broader suite.

Reviewer evidence: `code-review-evidence/crr-009/settings-regression.log/.exit`, `origin-audit.py/.json`, `source-evidence.json`, `entry-audit.json`, `owner-preservation.json`, `README.md` and complete `reference-index.json`.

API evidence inspected: `API-F007-http.json` (HTTP200 application rejection, filtered key absent before/after), `API-F007-ui-confirm.json`, `API-F007-ui-reopen.json`, `API-F007-settings.png` (visually inspected), `API-F007-origin-audit.json`, regression delta/current test and execution report. UI is the API owner's actual run, **not a new reviewer desktop execution**. API final whole GraphQL file12Pass/1Fail and total542Pass/1Fail across46files remain attributed to API, not reviewer reruns. Listing/persistence assertions after the failed positive's first assertion are unexecuted in this replay; HTTP/reopen evidence separately establishes the failed save.

## Required next action / preserved limits

1. Implementation owner corrects the bounded distinction between this approved public numeric setting and credential-like settings. Preserve actual credential write-only handling and read filtering, read-only/retired-key rules, existing ordinary custom-setting semantics and applicable value validation. Do not broadly disable the security guard or silently redirect users to hidden configuration edits. No schema/migration/architecture change is requested.
2. Retain the API-owned red regression and negative control; coordinate any durable-test adaptations with its owner. Verify valid normal Settings save/readback/reopen and that sensitive writes/read exposure remain protected. Existing tuple/default/no-import and capacity/provider-reserve behavior must remain unchanged.
3. Return implementation evidence for **source review**, then API/E2E again. API must resume the stopped valid Settings/recovery product journey; source or deterministic test success cannot replace it. Eventual successful proportional review covers **ten cumulative API-owned paths**, still pending.
4. API005 **Fail78.6** remains; no new provider campaign/budget is authorized. API's loopback emulator3parent/0compaction/0remote requests is protocol evidence, not inference/semantic proof. Full heldA/attachment/queuedB/retry/cancel/post-response/reconnect/saved-resume product phases remain Not Tested. Actual app setup/seed streaming success is not their substitute.
5. Preserve prior dispositions: F006 correction/C01Pass; F005 SR020 accepted known/nonblocking **not fixed/Pass**, Qwen STOPPED; F004 historical cause unknown; SR0221fidelityFail/3scopedusable/exhausted and v6parked. Unsupported same-ID Team/Org diagnostic remains failed but not a scored supported defect. No withdrawn retention machinery. Seven baseline-reproduced contract failures, other14 residuals, webtypecheck6836 and fullsuite/crash/current-live limits remain disclosed, not waived.

Reviewer preserved all pending/external work and generated outputs. No source/durable-test edit, secrets/private history access, provider call, remote refresh, commit, push, merge, release or SDK/WIP cleanup. Eventual origin/personal finalization remains Delivery-owned.

## Classification and routing

Confirmed **Local Fix — implementation defect / API-F007**. No Design Impact, Requirement Gap or Unclear classification. This is focused failure-origin review, not successful-test review. Fresh rule selection and delivery receipt are recorded below after tool confirmation. Required next owner: Implementation Engineer; no duplicate API/SD/Delivery outcome handoff.


Fresh `get_handoff_rules` selected the single most-specific rule: **“When API/E2E failure-origin review confirms that the owning problem is an implementation defect.”** → **/implementation_engineer**. The generic source-Local-Fix rule is less specific; no API-owned, pass, upstream or Delivery route applies. Sole outcome handoff; receipt follows confirmed send.

Confirmed **accepted=true / DELIVERED** to sole **/implementation_engineer**, exact AgentRun **implementation_engineer_d565b3adf8074d59878dc089de6d3df1**,816 cumulative/current references attached. Receipt `code-review-evidence/crr-009/handoff-receipt.json`. No additional outcome recipient, source fix or Delivery advancement. Review stops after this confirmed handoff.
