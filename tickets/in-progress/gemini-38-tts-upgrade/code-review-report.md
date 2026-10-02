# Code Review Report — Gemini 3.8 TTS upgrade

## Review Round Meta

- Review Entry Point: **Implementation Review** (latest-base delivery re-entry).
- Requirements Doc Reviewed As Context: `requirements-doc.md` (`SR-004`, approved `BEH-001–004`, `SCN-001–006`, `AC-001–010`).
- Investigation Notes / Solution Revision Record Reviewed As Context: `investigation-notes.md`, `solution-revision-record.md` through evidence-only `SR-012`.
- Design Spec / Design Review / Architecture Review Revision Record Reviewed As Context: `design-spec.md` (`SR-006`), `design-review-report.md`, `architecture-review-revision-record.md` (`ARCH-REV-002` Pass).
- Supplemental Task Artifacts Reviewed As Context: behavior-defining N/A; `solution-handoff-sr006.md` and `solution-validation-update-sr012.md` are coordination/evidence context.
- Implementation Handoff / Revision Record Reviewed As Context: current `implementation-handoff.md` and `implementation-revision-record.md` (`IR-003`); they are indexes, not proof.
- Code Review Revision Record: `code-review-revision-record.md`; Current Code Review Revision ID: **`CRR-008`**; Current Review Round: source round 3 / overall review result 8.
- Trigger: `/implementation_engineer` returned delivery-stage `IR-003` Local Fix after `DR-001` lockfile-conflict blocker. Latest-base merge `c6586a07f` has parents pre-integration checkpoint `a2c433de8` and `origin/personal` `b0b077b02`; clean worktree at review start. No push.
- Prior Review Rounds Reviewed: `CRR-001/002` source finding/resolution; `CRR-003–005` historical failure-origin; `CRR-006/007` successful-test finding/resolution. Latest authoritative round: **`CRR-008`**.
- Coverage / Execution / API Revision Reviewed As Context: `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` through `API-REV-006` Pass / 95.0% **pre-integration**; `API-REV-005` actual one-call Vertex Express TTS WAV proof is also pre-integration.
- Delivery Revision Record / Related ID: `delivery-revision-record.md`, `docs-sync-report.md`, `release-deployment-report.md`, **`DR-001` Blocked / Local Fix**. No delivery completion, user verification or release claim.
- Failing Scenario IDs / Exact Failing Commands / Failure Evidence Paths: N/A for implementation re-review. One reviewer self-check built-server E2E initially failed `TEST_SERVER_START_FAILED` because generated shared contract `dist` was absent after prior cleanup; documented `pnpm -C autobyteus-server-ts build` restored it and the same focused server suite passed 39/39. This is a build prerequisite, not a source finding or live-provider result.

## Routing Classification Review

- Task size: **Large**. Architectural risk: **High**. Selected route: **Implementation Review**. Independent source review required: **Yes**.
- Classification evidence: major shared SDK and lock integration, startup setting migration, provider speech request/output change, UI/server defaults, and cross-modality regression boundaries remain material. This merge did not change approved intent or lower risk.

## Review Scope

- Changed implementation and behavior reviewed: clean resolution of four root `pnpm-lock.yaml` `@protobufjs` conflict regions, the effective merged `@google/genai@2.24.0` → `protobufjs@7.5.4` snapshot, and task-relevant auto-merge interactions. Rechecked current audio catalog/adapter, AppConfig migration, server/web default and installed-SDK path against approved design and prior source finding.
- Files / areas reviewed: `pnpm-lock.yaml`, `autobyteus-ts/pnpm-lock.yaml`, `autobyteus-ts/package.json`, core audio factory/adapter/model map/voices, `autobyteus-server-ts/src/config/{app-config.ts,migrations/retired-speech-model-selection.ts,media-default-model-settings.ts}`, server media schema, web media defaults, merged live harness/provider E2E, and focused tests. `git show --remerge-diff` isolated the manual resolution; first-parent/second-parent diffs distinguished upstream-only changes from task edits.
- Explicit exclusions: unrelated `origin/personal` collaboration, gateway, web settings and release changes are not reopened as this ticket's implementation; no owner-private secret read, provider call, browser render, deployment, docs sync or user verification. Post-integration API/E2E confidence is downstream, not inferred from pre-merge 95.0%.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: current-only 3.8 Flash/Flash-Lite TTS with Flash blank fallback and one-key saved-retired-ID transition; preserve non-Google audio and Gemini LLM/image/video, existing speech/file contract, value-safe isolated live validation.
- Design-spec behavior map verified against integrated implementation: **Yes**. `DS-001–008` and `ARCH-REV-002` remain applicable; merge resolution changes dependency graph packaging, not source owners or public interfaces.
- Design review report and round confirmed: `ARCH-REV-002` Pass resolved prior architecture `DR-001/002`; distinct delivery `DR-001` was the recent merge blocker.
- Behavior-basis status: **Confirmed**. Changed/newly discovered supported behavior: none. Remaining material ambiguity: none for source review; actual provider availability and post-merge executable confidence remain downstream.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradiction / New Basis |
| --- | --- | --- | --- |
| `BEH-001` | Confirmed | Settings selector/service and `AppConfig.initialize()` → one-key migration → current catalog/resolver. Factory has only exact 3.8 Flash/Lite Google TTS; server/web blank fallback is Flash. Historical IDs occur in migration, not runtime catalog. Merge kept migration call after config load and before runtime settings. | None. |
| `BEH-002` | Confirmed | Existing speech tool → media service → audio factory → `GeminiAudioClient` structured turns/voice config → Google SDK → strict WAV or explicit PCM validation → file URL/media output. `CR-001` malformed-WAV path remains rejected. | None. |
| `BEH-003` | Confirmed | Explicit importer/test-vault/runner remains separate from production. Merged live harness retains current GraphQL `useGeminiMode { setup }` and format-aware audio assertion. No secret import was performed in IR-003 or review. | None. |
| `BEH-004` | Confirmed | Package importer, root/nested locks and installed package identify `@google/genai` 2.24.0. Existing LLM/image/video adapters and LLM IDs are unchanged by ticket merge; their supported request/return spines remain owned by each adapter. Root protobuf graph has no 7.6.2 orphan edge. | None. |

## Supported Product Scenario And Reachability Gate

| Scenario ID | Related Behavior / Contract IDs | Kind / Actor / Goal | Supported Entry Surface / Event | Shape / Forward Path / Lifecycle / Consequence | Independent Evidence | Validity / Use |
| --- | --- | --- | --- | --- | --- | --- |
| `SCN-001` | `BEH-001`, `AC-001–003` | User/admin chooses speech default; startup reads saved selection | Existing Settings selector and server startup | Settings → service/AppConfig → `.env` or blank fallback → catalog → later speech; retained retired file selection transforms once before normal read. | Approved requirements, design `DS-001`, current config/factory/defaults and tests | Supported Normal Scenario / Use |
| `SCN-002/003` | `BEH-002`, `AC-004–006` | Speech user/agent requests single or mapped-dialogue audio | Existing `generate_speech` tool/client | Tool → media service → factory/adapter → SDK/provider → validated WAV/file URL → requested path, or explicit error. | Approved requirements, design `DS-002/003`, current adapter/service and `CRR-002` validation | Supported Normal Scenario / Use |
| `SCN-004` | `BEH-003`, `AC-007/008` | Test operator performs safe real validation | Explicit importer dry-run/TTY confirmation and scoped live runner | Isolated SQLite vault → configured mode/client → real provider → value-safe pass/fail; no production vault. Prior live result is pre-merge. | Approved requirements, design `DS-004`, runner/importer and API-REV-005/006 history | Supported Explicit Edge Scenario / Use |
| `SCN-005` | `BEH-004`, `AC-009` | User/agent keeps supported Gemini modalities working after shared SDK cutover | Existing LLM and image/video request surfaces | Public request → owning adapter → SDK → text/stream/media result; current merge must package the same SDK correctly. | Approved requirements, design `DS-005–008`, package/locks, installed SDK and regression suites | Supported Normal Scenario / Use |
| Lockfile integration contract | `BEH-004`, reproducible workspace build | Operator builds/deploys the reviewed candidate | Root `pnpm install --frozen-lockfile` and package build | Root importer → resolved SDK/protobuf graph → installed package → adapter builds/runtime; broken snapshot blocks install or runtime dependency resolution. | Delivery DR-001 blocker, pnpm lock format, installed package declares `protobufjs:^7.5.4`, frozen offline install and builds | Supported Explicit Operational Contract / Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `CAND-LOCK-001` | Four merge conflicts and an orphaned `protobufjs:7.6.2` snapshot edge could make integrated package invalid | Lockfile integration contract / `SCN-005` | Ordinary frozen workspace install on latest-base merged branch | Root importer → `@google/genai` snapshot → protobuf package/snapshot → SDK build/runtime; orphan would threaten reproducibility | `git show --remerge-diff c6586a07f`, current root/nested locks, installed SDK package declaration, IR-003 frozen offline install | **Promote for verification; resolved, no open finding** | Merge retained coherent 7.5.4 package/snapshot graph, removed 7.6.2 references, frozen install and builds passed. No extra fallback or second graph is warranted. |
| `CAND-ENV-001` | Reviewer built-server test initially failed before server startup | `SCN-004` operational test prerequisites | Focused built-server E2E invoked after generated shared `dist` had been cleaned | Missing build output → `TEST_SERVER_START_FAILED`; documented server build restores shared outputs → same suite passes | Initial 30/30 core, 38/38 server unit with built-server E2E startup failure; rebuild then 39/39 server pass | **Reject as implementation finding** | A supported build prerequisite, not an implementation defect; no score deduction or machinery. Record execution limitation honestly. |

## Structural / Design Checks

`Pass` below means no new integrated-task gap; previous unaffected evidence is preserved, and the changed lock/config overlap was revalidated. No source-file limit is applied to tests.

| Check | Result | Evidence / Required Action |
| --- | --- | --- |
| Task design health assessment present/evidence-backed/preserved | Pass | SR-006 narrow existing-owner replacement remains; merge adds no new design posture. |
| Behavior-defining supplements aligned | Pass | N/A — none; no screenshot treated as normative. |
| Data-flow spine inventory clarity/preservation | Pass | `DS-001–008` still trace Settings/config, speech return, safe live operation and non-TTS SDK results; merge changes only dependency resolution in those spines. |
| Ownership boundary preservation/clarity | Pass | AppConfig owns one-key transition, audio adapter owns Google wire/WAV, each modality adapter owns its SDK translation; no bypass introduced. |
| Off-spine concern clarity | Pass | Migration and validation remain subordinate to config/audio owners, not competing coordinators. |
| Existing capability/subsystem reuse | Pass | Existing durable assignment writer, runtime resolver, importer and client factory reused. |
| Reusable owned structures | Pass | Shared Gemini voice vocabulary remains audio-owned; no merge-introduced duplicate schema. |
| Shared-structure/data-model tightness | Pass | `SpeechTurn`, model map and provider configs remain narrow; no common kitchen-sink structure. |
| Repeated coordination ownership | Pass | Flash fallback resides in server/web settings policy; route selection remains existing runtime resolver. |
| Empty indirection | Pass | No new pass-through-only production boundary from IR-003. |
| Separation of concerns/file responsibility | Pass | Root lock owns graph, AppConfig startup owns transition, audio factory/catalog and adapter retain distinct concerns. |
| Ownership-driven dependency check | Pass | Tool uses media service/factory, not SDK internals; web uses settings contract, not private file. |
| Authoritative Boundary Rule | Pass | No caller simultaneously uses an outer owner and its internal migration/serializer; merged code retains current interfaces. |
| File placement | Pass | Migration in config subsystem, voices in audio, dependency graph in root/nested lock. |
| Flat-vs-over-split layout | Pass | Narrow migration/voice files justified; no new fragmentation. |
| Interface/API/query/command clarity | Pass | Current model IDs and setting key explicit; old IDs confined to migration; no ambiguous selector. |
| Naming quality/local readability | Pass | Model IDs and lock snapshot versions literal/traceable; no misleading alias. |
| No unjustified duplication | Pass | No second provider adapter, importer, or old/new lock graph. |
| Patch-on-patch complexity control | Pass | Merge resolved one graph rather than retaining dual-version workaround; no runtime fallback. |
| Dead/obsolete code cleanup | Pass | Retired TTS IDs only migration/history; no 7.6.2 root-lock orphan. |
| Relevant test scenarios/assertions | Pass | Task audio/config/SDK/browser-component tests remain, plus prior real provider evidence; post-merge API/E2E is explicitly next. |
| Test fixture/helper reuse/structure | Pass | Merged live harness retains provider-specific file assertion and scoped mode; no test-only scenario fabricated as product requirement. |
| No stale/duplicated/compatibility-only tests | Pass | Current focused tests pass after documented build prerequisite; no task-specific stale fixture detected. |
| API/E2E readiness | Pass | Clean merge, frozen install and builds, focused repository checks; suitable for proportionate post-integration API/E2E, not delivery sign-off. |

## Source File Size And Structure Audit

Effective nonempty lines of task-changed production source (relative to integrated base). No changed file exceeds 500; `>220` is a structural signal, not a test-file rule.

| Source File | Effective Lines | >500 | >220 / SoC / Placement | Classification / Action |
| --- | ---: | --- | --- | --- |
| `autobyteus-server-ts/src/config/app-config.ts` | 479 | Pass | Existing config owner; task delta only shared-startup migration call. Upstream removed unrelated callback getters. | Pass / none |
| `autobyteus-server-ts/src/config/migrations/retired-speech-model-selection.ts` | 30 | Pass | One historical one-key transform under config. | Pass / none |
| `autobyteus-server-ts/src/config/media-default-model-settings.ts` | 47 | Pass | One server fallback constant. | Pass / none |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-parameter-schemas.ts` | 109 | Pass | Existing tool wording, no provider protocol leak. | Pass / none |
| `autobyteus-ts/src/multimedia/audio/api/gemini-audio-client.ts` | 219 | Pass | Provider request/response/validation remains one adapter; original >220 replacement was previously audited. | Pass / none |
| `autobyteus-ts/src/multimedia/audio/audio-client-factory.ts` | 228 | Pass | Catalog/registration cohesive; task delta smaller and voice list extracted. | Pass / none |
| `autobyteus-ts/src/multimedia/audio/gemini-tts-voices.ts` | 36 | Pass | Audio-owned vocabulary. | Pass / none |
| `autobyteus-ts/src/utils/gemini-model-mapping.ts` | 57 | Pass | Current TTS model map alongside existing Gemini mapping. | Pass / none |
| `autobyteus-web/components/settings/mediaDefaultModelSettings.ts` | 50 | Pass | Existing web default settings policy. | Pass / none |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Runtime catalog/map remains current-only; old IDs confined to startup migration. |
| No legacy old-behavior retention | Pass | No old Google TTS registration/style-prefixed prompt/implicit unknown-MIME PCM fallback. |
| Dead/obsolete code cleanup | Pass | No orphan 7.6.2 lock edge or obsolete task fixture. |
| Approved persisted-data transition followed without unnecessary work | Pass | Exactly one saved key in `.env`; no SQLite/vault migration. |
| No version-specific dual reads/writes or request-time fallback | Pass | One startup transform; current resolver uses new IDs. |
| Transition mechanics match reviewed design | Pass | Inherited override captured before dotenv, value-safe rejection, durable one-key writer, validation, in-memory update; focused config tests pass. |

## Dead / Obsolete / Legacy Items Requiring Removal

None in the reviewed task scope. Historical IDs in the migration module are approved transition data, not current runtime catalog entries.

## Docs-Impact Verdict

- Docs impact: **Yes**, downstream delivery docs sync remains pending after DR-001 blocker; this source review does not author or approve release notes.
- Areas likely affected: audio model/default and migration/operator notes, SDK version/validation summary, scoped live-provider evidence and caveats.

## Additional Material Premise Validation

Upstream `ARCH-REV-002` design-premise decisions remain confirmed; no new/reclassified product premise is needed. The lockfile contract and built-test prerequisite are classified in the candidate gate rather than used to invent a new product workflow.

## Review Scorecard

- Overall score: **9.4/10; 94/100** (simple mean for trend visibility only; not the decision rule). Baseline `CRR-002` source Pass was 9.4; the bounded merge does not change those source-quality conclusions.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | `DS-001–008` remain intact across merged config, audio and SDK paths. | No post-merge live end-to-end observation yet. | API/E2E should confirm integrated paths. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | Config, audio, SDK modality and importer owners remain distinct. | Shared root lock is a broad dependency surface by nature. | Retain focused ownership as SDK evolves; no local fix. |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Current IDs, settings and speech contract are explicit; no merge API change. | External provider behavior is not statically guaranteed. | Validate integrated live contract downstream. |
| 4 | Separation of Concerns and File Placement | 9.4 | Migration/audio voice extraction remain in their owners; lock resolution stays packaging-only. | AppConfig is substantial but under hard limit and unchanged in concern. | Monitor future additions rather than split this merge. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.4 | Voice vocabulary and provider-specific payload shapes are focused. | SDK types remain an external change risk. | Keep wire tests at adapter boundaries. |
| 6 | Naming Quality and Local Readability | 9.5 | Exact IDs/versions and named migration are clear. | Lockfile snapshot syntax is intrinsically dense. | Preserve graph verification on future merges. |
| 7 | API/E2E Readiness | 9.2 | Frozen install, builds, focused suites and real pre-merge proof support next stage. | Post-integration API/E2E has not run. | Execute proportionate integrated validation; do not reuse 95% as post-merge result. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | Strict WAV checks, migration and installed-SDK adapter regressions pass; lock graph coherent. | Exact current provider entitlement is external/time-sensitive. | Downstream live or justified bounded validation as API/E2E decides. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Old IDs only in startup transition; no runtime alias/fallback. | Migration remains while saved old values can exist. | Retire migration only after separately evidenced fleet transition. |
| 10 | Cleanup Completeness | 9.6 | Conflict markers/orphan edge gone and task runtime legacy removed. | Delivery docs/release cleanup remains outstanding, not source-owned. | Delivery completes its own gates. |

## Findings

No open source finding. `CR-001` remains resolved: strict WAV `fmt`/frame validation occurs before save, and focused merged-core audio tests passed. The recent delivery `DR-001` lock integration blocker is resolved in the candidate, not a new source defect.

## Classification And Recommended Recipient

- Review Decision: **Pass**; no Local Fix, Design Impact, Requirement Gap or Unclear classification.
- Recommended next recipient: `/api_e2e_engineer` for proportionate **post-integration** executable validation on the Large/High reviewed route. Inform `/implementation_engineer` only after the primary handoff succeeds, per implementation-pass rule.

## Residual Risks

Prior API-REV-005 real Vertex Express `gemini-3.8-flash-tts` WAV success and API-REV-006 95.0% confidence are genuine but **pre-integration** evidence. This report does not claim current provider availability, AI Studio quota resolution, audible playback, rendered Settings after merge, docs sync, user verification, push or release. The initial reviewer built-server self-check required restoring generated shared build outputs; the documented build and rerun passed. API/E2E owns post-merge confidence and any safe provider-call decision; no paid call or credential import was made here.

## Latest Authoritative Result

- Review Decision: **Pass** (`CRR-008`, IR-003 latest-base integrated source).
- Review Entry Point: Implementation Review; Supported Product Scenario Gate: **Pass**; Material-Premise Gate: **Pass**.
- Score Summary: **9.4/10, 94/100**, all ten categories ≥9.0.
- Failure Origin: N/A; delivery lockfile conflict resolved. No new source finding.
- Recommended Recipient: `/api_e2e_engineer` primary, `/implementation_engineer` informational after primary succeeds.
- Notes: A clean integrated source candidate is ready for post-integration API/E2E. It is not delivery/release approval.
