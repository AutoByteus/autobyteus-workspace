# Design Review Report — Gemini Speech Voice/Style Expansion

## Review Round Meta

- Package: `gemini-tts-voice-schema-audit`.
- Upstream Requirements Doc: [requirements-doc.md](requirements-doc.md), approved **SR-012**.
- Upstream Investigation Notes: [investigation-notes.md](investigation-notes.md), including supplement inventory and ARCH-EVID-007–010 / SR-015.
- Upstream Solution Revision Record: [solution-revision-record.md](solution-revision-record.md), through **SR-015**.
- Reviewed Design Spec: [design-spec.md](design-spec.md), current **SR-015**; concrete contract [generate-speech-schema.json](generate-speech-schema.json), unchanged.
- Supplemental Task Artifacts Reviewed: all rows in the supplement verdict below. No Product/behavior-defining supplement.
- Relevant Solution Revision IDs: SR-010 exploratory evidence, SR-011 recommendation, SR-012 approval, SR-013 architecture/schema, SR-014 execution-base clarification, **SR-015 conflict recovery**. Earlier SR-004–009 are historical context, not competing intended-behavior authorities. Triggering implementation **IR-001 / IB-001**.
- Architecture Review Revision Record: [architecture-review-revision-record.md](architecture-review-revision-record.md).
- Current Architecture Review Revision ID: **ARCH-REV-002**.
- Current Review Round: **2**; completed 2026-10-02.
- Trigger: Solution Designer SR-015 recovery of Implementation's **IR-001 Blocked / Design Impact, IB-001** pending dependency-merge conflict.
- Prior Review Round Reviewed: **ARCH-REV-001 Pass of SR-014**, including all structural verdicts and MP-001; no unresolved architecture findings. The other upgrade package's ARCH-REV-002/CRR-008 remain dependency evidence, not this package's review.
- Latest Authoritative Round: **ARCH-REV-002**, against SR-015 / approved SR-012.
- Current-State Evidence Basis: independent read-only pending-merge/stage/diff inspection, production input path/composition, harness call sites and existing assertion contracts, current GraphQL result shape, manifest/lock/build/test prerequisites. Requirements/schema equal checkpoint bytes. Reused still-valid round-1 speech/schema/history evidence and rechecked affected integration/ownership sections. Upstream CRR-008 and DR-004 re-read. No source/index/ref change, dependency install/build/test, credential import, provider request or live/audible test by reviewer. Only owned review artifacts updated.

### Execution/source context

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit`; branch `codex/gemini-tts-voice-schema-audit`. Current **HEAD f1b03b4ed90b1d88f588319a945a22a980b93e73** is the task-document checkpoint above original e04cfef23. **MERGE_HEAD c6586a07f3c2585aa13673875c1bc34c971b6e5e**, merge base **b0b077b02571098a6bf7993ab46b67a69fdb8f9d**. One unmerged file, `test-support/live-e2e/live-e2e-harness.ts`, with two regions. Automatic dependency content is pending, not an admitted execution base or implemented expansion.
- Pinned development dependency: **c6586a07f3c2585aa13673875c1bc34c971b6e5e**. The git object exists. Source read from `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade`; upstream review evidence is referenced by absolute path below.
- Authoritative dependency evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/code-review-report.md` (**CRR-008**, integrated source Pass) and `release-deployment-report.md` in that same directory (**DR-004**, user-verification/finalization hold).
- **SR-015 resolves the observed IB-001 design decision:** preserve stage 2 only in the six-import/environment-aware-wrapper conflict regions, preserve its two environment-supplying call sites, and keep all nonconflicting automatic content, especially incoming `useGeminiMode.setup`. No whole-file side selection, optional environment/no-op fallback, production normalizer/compaction rewrite or second merge/reset. Implementation completes the existing merge, records both-parent ancestry/effective source/locks and runs the specified frozen-install/build/focused base checks before expansion. Further material conflicts return upstream.
- Independent in-memory comparison of the proposed two-region selection (not written/applied) yields **only the nested setup query change versus checkpoint harness**. Existing normalizer/local resolver/owner resolver/production supervisor bytes equal HEAD. Requirements SHA-256 `49c312ad3d343a872702f04caa7c5b84493a7cc03116e1be4e5997a672730279`; schema SHA-256 `1539325a31b2c35cd2d44a9f3744fa6eaf9446556d260d4fbae924101d777a66`, both equal checkpoint bytes.
- **CRR-008 certifies c6586a07f only, not the resulting combination.** This package's High-risk independent source review must inspect the effective integration/resolution along with the expansion; architecture Pass does not certify an unbuilt merged tree.
- Old-package finalization is **not** a local coding prerequisite. Its separately owned verification/finalization hold must be reconciled before the new package can transitively merge it to the target. This review neither accepts nor releases that old package.

## Routing Classification Review

- Task size: **Medium**.
- Architectural risk: **High**.
- Classification rationale reviewed: four existing speech production files plus bounded existing-harness preservation and focused tests/docs; no UI/service/DB. Shared identity/nullable schema, privacy and effective-source integration retain High risk. The bounded recovery does not itself make this a new Large feature or authorize the inherited dependency's unrelated redesign.
- Independent Architecture Review required: **Yes**.
- Classification evidence or correction required: **None**; classification retained. Integration prerequisites do not authorize expanding or silently reimplementing the old upgrade.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**.
- Approved requirements / intended behavior understood: explicit SR-012 approval of SR-011's two recommended speech improvements. Experiment authorization and the old model-upgrade approval are separate.
- Relevant existing behavior and evidence confirmed: round-1 pinned factory/client/schema/service paths remain applicable and the speech requirements/schema are unchanged. For recovery, production AgentRun normalizes admitted context-file locators before backend dispatch; current test wrapper composes that boundary against scenario roots. GraphQL useGeminiMode returns GeminiConfigurationCommandResult.setup. These independent contracts agree with the two-region preservation plus incoming query.
- Scope guardrail confirmed: existing `generate_speech` surface only; additional prebuilt/Extended single IDs and ordered dialogue styles in scope. Featured 30/Kore, Flash blank default/separate Lite, configured route, output/global-style/mapping and unrelated providers/modalities preserved. Creation/replication/discovery UI/custom promises/streaming/new persistence/runtime/importer work excluded.
- Approved change, preserved behavior, and outside scope understood: **Yes**. Deferred BEH-004/005 do not get invented execution spines.
- Every prospective blocking Design Impact finding traceable to approved authority: **Yes — no blocking finding remains**.
- Remaining material ambiguity: **None for architecture**. Actual provider acceptance and audible performance remain explicit executable acceptance gates, not assumed successes.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Supported normal user/agent choice discovery; REQ-001 / AC-001 | Pass | Pass — agent discovers the configured speech tool; factory/model schema -> server projection -> formatter currently advertises the featured subset. | Pass — DS-001 retains the 30 and Kore; one provenance-backed addition with language/quality qualification; no full-catalog assertion. | Confirmed | Implement schema/help assertions. |
| BEH-002 | Supported normal single-speaker request; REQ-002 / AC-002 | Pass | Pass — user asks agent for audio using the existing generate_speech surface and a legitimate catalog ID; tool/parser -> service -> factory/client -> configured runtime -> provider -> path. Current enum/check is the actual blocker. | Pass — DS-002/004 replace only local membership admission, preserve exact ID and configured provider, validate WAV before output success. | Confirmed | Exact-forwarding, default, invalid/unavailable-ID and implemented-tool tests; authorized live acceptance downstream. |
| BEH-003 | Supported normal existing dialogue with optional turn delivery; REQ-003 / AC-003 | Pass | Pass — agent invokes generate_speech with Speaker: utterance lines and existing 1–2 featured mapping. Client owns parsing and request parts; server does not reinterpret turns. | Pass — DS-003/005 resolve exact-count nullable styles into one ordered turn array; transcript and metadata remain separate. | Confirmed | Test positional association, fallback, malformed inputs and SDK wire; audible acceptance remains required. |
| BEH-006 | Supported explicit provider rejection/configured-access contract; REQ-006/007 / AC-006/007 | Pass | Pass — an ordinary speech request on the configured route can be rejected for voice/access/quota; route-specific probe failures and existing error path establish the edge. No fallback contract exists. | Pass — DS-004 returns safe truthful failure, not output success or substitution. Existing semantic key/runtime resolver and unrelated capabilities preserved. | Confirmed | Fixed/local versus sanitized external errors; sentinel privacy and regression checks. |
| BEH-004 | Deferred creation | Pass | Pass — request/history is identified as deferred, not an approved delivered lifecycle. | Pass — no creation spine, key switch or persistence introduced. | Confirmed | N/A — do not implement. |
| BEH-005 | Deferred replication/custom lifecycle | Pass | Pass — no approved replication/consent-ingestion journey this round. | Pass — no replication or custom-dialogue promise. | Confirmed | N/A — do not implement. |

The primary spines span the supported entry and meaningful published outcome. Local SDK experiments establish feasibility only; they do not substitute for product reachability or implemented-tool acceptance.

**Affected preserved contract recheck:** existing context attachment composer -> agentRunStore attachment finalization/submission -> AgentStreamingService SEND_MESSAGE -> server agent stream handler/command coordinator -> AgentRun normalization -> backend. SR-015 changes neither this product path nor its production owner. Its harness disposition retains the existing equivalent facade/normalizer using scenario-owned roots, with current admitted/unadmitted/recording/source-message assertions. See MP-002; no new speech behavior ID is invented. IB-001 is design-disposed, but merge/base checks remain unexecuted.

## Supplemental Artifact Coherence Verdict

Paths in this table are ticket-relative unless explicitly absolute. Investigation owns the complete linked inventory; design/requirements link the evidence relevant to their decisions. Historical status is scoped to the round that produced it.

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| generate-speech-schema.json — projected technical contract | Pass | Pass | Pass | Pass | Pass — design-owned; no new behavior approval | Project from production schema and compare/test; do not create duplicate runtime policy. |
| voice-feature-probe-sr010.md — six bounded exploratory operations, provenance and cleanup | Pass | Pass | Pass | Pass | Pass — exploratory, not formal acceptance | Preserve limits: extra-ID WAV proven, audibility/tool path not proven. |
| speech-value-recommendation-sr011.md — approved recommendation context | Pass | Pass | Pass | Pass | Pass — canonical SR-012 captures approval | None. |
| voice-schema-audit-report.md — original provider/app comparison | Pass | Pass | Pass | Pass | Pass — earlier untested claims explicitly superseded | None. |
| voice-provider-probe-sr005.md — Express listing 404 | Pass | Pass | Pass | Pass | Pass — route/request-specific evidence | No global availability inference. |
| solution-proposal-sr004.md — historical broad proposal | Pass | Pass | Pass | Pass | Pass — unapproved historical draft, narrowed later | Do not implement deferred proposal. |
| voice-scope-update-sr008.md — discovery exclusion/scope evolution | Pass | Pass | Pass | Pass | Pass — historical draft | None. |
| voice-capability-clarification-sr009.md — catalog versus ID and then-untested creation | Pass | Pass | Pass | Pass | Pass — superseded only where SR-010 added evidence | None. |
| test-vault-usability-assessment-sr006.md — adjacent ergonomics explanation | Pass | Pass | Pass | Pass | Pass — recommendation, not tooling approval | No importer redesign in this ticket. |
| test-vault-runtime-explanation-sr007.md — isolated importer/runtime binding explanation | Pass | Pass | Pass | Pass | Pass — evidence, not new credential policy | Retain fresh authorization/isolated exact-DB validation. |
| solution-handoff-sr013.md — original full architecture submission | Pass | Pass | Pass | Pass | Pass — only execution-base wording superseded by SR-014 | Read alongside current design/clarification. |
| solution-base-clarification-sr014.md — development admission versus finalization ownership | Pass | Pass | Pass | Pass | Pass — no requirement/schema change; conflict action refined by SR-015 | Preserve separate old delivery hold. |
| solution-base-recovery-sr015.md — exact pending merge, bounded disposition and checks | Pass | Pass | Pass | Pass | Pass — current completed design, not source resolution | Execute only named resolution under Implementation ownership. |
| implementation-handoff.md / implementation-revision-record.md / implementation-base-blocker-ir001.md / dependency-merge-conflict-ir001.patch | Pass | Pass | Pass | Pass | Pass — IR-001/IB-001 Blocked historical trigger; no expansion Pass | Preserve pending merge; record implementation resolution and checked base truthfully. |
| architecture-pass-notification-archrev001.md | Pass | Pass | Pass | Pass | Pass — receipt of earlier SR-014 Pass only | No current-round Pass or duplicate forwarding inferred. |
| Absolute upstream code-review-report.md / release-deployment-report.md at the dependency ticket path above | Pass | Pass | Pass | Pass | Pass — CRR-008 source authority / DR-004 hold; not new-feature acceptance | Carry dependency provenance and delivery gate forward. |
| Absolute upstream solution-current-key-probe-sr014.md at that dependency ticket path | Pass | Pass | Pass | Pass | Pass — historical basic-speech proof from a different package | No expansion/audible acceptance inferred. |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature/bounded behavior change; current restriction and global-only delivery described against read source. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Contract/local-invariant mismatch for newly approved IDs and style structure; not retroactively calling the old subset defective. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No broad refactor; narrow gate/style/error cleanup in existing adapter/factory. | None. |
| Refactor decision is supported by concrete design or residual-risk rationale | Pass | Current owners already parse/map/publish; canonical turns eliminate downstream parallel style state; no new forwarding layer. | Follow named cleanup. |
| Recovery posture / root cause / no broader refactor | Pass | IB-001 is integration authority, not a demonstrated production resolver defect. Current composition/source/contracts are intact; bounded stage retention plus query fix suffices. | No normalizer/compaction refactor or compatibility fixture. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary discovery: configured model -> model schema -> server projection -> formatter -> agent contract | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary single synthesis: agent/tool -> service -> client/runtime/SDK -> validated WAV -> path/result | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Primary dialogue synthesis: same full path, with client-owned turns/mapping | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Return/error: provider -> decode/validation -> publication/result, or safe failure/cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Bounded local, parent GeminiAudioClient: parse/type/count/style/mapping -> canonical turns | Pass | Pass | N/A — internal flow | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| MediaGenerationService | Pass | Pass | Pass | Pass | Tool calls generateSpeech; service owns configured client/publication sequencing, not Google turn policy. |
| GeminiAudioClient | Pass | Pass | Pass | Pass | Public generateSpeech is the shared invariant/request/audio/error boundary, including direct library callers. |
| Model.parameterSchema / factory | Pass | Pass | Pass | Pass | Sole production parameter authority; server projects rather than copying Google schema. |
| Semantic runtime/key and path owners | Pass | Pass | Pass | Pass | Existing resolver/path entries reused; no server raw SDK/.env/vault bypass. |
| Existing live-E2E AgentRun wrapper | Pass | Pass | Pass | Pass | Preserve required scenario environment and production normalizer boundary; do not replace with incoming no-op or alter production admission. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server tool/service -> core multimedia | Pass | Pass | Pass | Pass | No Google SDK mapping in server, no core dependency on server/import/test harness. |
| Core audio adapter -> runtime/model mapping/SDK | Pass | Pass | Pass | Pass | Configured route only; no catalog lookup, secondary credential or fallback. |
| Factory/client -> featured metadata | Pass | Pass | Pass | Pass | Descriptions and dialogue subset only; metadata cannot recreate a single-ID allowlist. |
| SR-015 isolated dependency integration | Pass | Pass | Pass | Pass | Existing merge only; current fixture composition retained in named regions. Incoming nonconflicting fixes retained; effective tree gets new source review. No old-worktree/finalization mutation. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| generate_speech / service generateSpeech | Pass | Pass | Pass — configured model, transcript, output path | Low | Pass |
| voice_name | Pass | Pass | Pass — exact configured-provider single ID, not display name | Low | Pass |
| speaker_mapping | Pass | Pass | Pass — dialogue label -> featured voice | Low | Pass |
| turn_styles | Pass | Pass | Pass — accepted prompt-turn position, exact count | Medium | Pass |
| GeminiAudioClient.generateSpeech | Pass | Pass | Pass — model config/transcript -> audio response | Low | Pass |
| wrapProductAgentBackendForLiveE2e(backend, environment) | Pass | Pass | Pass — required scenario roots/baseUrl, existing AgentRun facade | Low | Pass |
| Harness useGeminiMode GraphQL selection | Pass | Pass | Pass — mode command -> setup result | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Schema/defaults/projection | Pass | Pass | N/A | Pass | Existing ParameterSchema supports raw item union and string pattern. |
| Turn validation / provider translation | Pass | Pass | N/A | Pass | Extend existing private normalizer and adapter; no second transcript DTO/service. |
| Credentials/runtime/audio/path/history | Pass | Pass | N/A | Pass | Existing owners suffice; no new persistence or operational tool. |
| Safe error translation | Pass | Pass | N/A | Pass | Keep fixed/local and external sanitization in provider adapter. |
| Recovery context translation | Pass | Pass | N/A | Pass | Preserve existing normalizer/resolver/owner/layout composition; no new support abstraction. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Core multimedia/audio | Pass | Pass | Pass | Pass | Model contract, featured metadata, normalization and Google translation. |
| Server agent-tools/media | Pass | Pass | Pass | Pass | Tool entry/projection and publication, not duplicate provider invariants. |
| Existing secrets/runtime and path subsystems | Pass | Pass | Pass | Pass | Reused, unchanged authority. |
| Test-support/live-e2e | Pass | Pass | Pass | Pass | Downstream scoped validation; never a production feature dependency. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared Gemini Flash/Lite parameter schema | Pass | Pass | Pass | Pass | One factory-owned contract; no server/model copies. |
| Featured and verified-addition metadata | Pass | Pass | Pass | Pass | Existing voice file; separate descriptive meanings, no admission catalog. |
| SpeechTurn / effective-style resolution | Pass | N/A — private existing adapter type | Pass | Pass | One normalized array; no unnecessary public extraction. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Gemini parameter schema | Pass | Pass | Pass | Pass | Pass | Existing fields plus optional styles; no voice_id alias or new per-call model. |
| Ordered style input -> SpeechTurn | Pass | Pass | Pass | Pass | Pass | Count validation then immediate effective-style normalization; no downstream parallel arrays. |
| Featured / verified addition metadata | Pass | Pass | Pass | Pass | Pass | IDs/displayName/languageCode remain provenance, not all-catalog or quality authority. |

## File Responsibility Mapping Verdict

Paths are relative to the execution base.

| File | Responsibility Is Singular And Clear? | Responsibility Matches Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts/src/multimedia/audio/audio-client-factory.ts | Pass | Pass | Pass | Pass | Shared model config schema/default/help only. |
| autobyteus-ts/src/multimedia/audio/gemini-tts-voices.ts | Pass | Pass | Pass | Pass | Featured names plus qualified tested metadata. |
| autobyteus-ts/src/multimedia/audio/api/gemini-audio-client.ts | Pass | Pass | Pass | Pass | Normalize/validate/map/decode/sanitize under one provider boundary; no lifecycle/catalog service. |
| autobyteus-server-ts/src/agent-tools/media/media-tool-parameter-schemas.ts | Pass | Pass | Pass | Pass | Projection and explanatory wording; no handwritten competing provider schema. |
| Named core/server tests and existing live-e2e capability boundary | Pass | Pass | N/A | Pass | Deterministic assertions belong to implementation, live/audible acceptance to API/E2E. |
| test-support/live-e2e/live-e2e-harness.ts | Pass | Pass | Pass | Pass | Two-region preservation under existing test runtime owner; keep automatic nested setup query, no unrelated harness/production rewrite. |
| Existing provider/media docs | Pass | Pass | N/A | Pass | Delivery synchronizes qualified contract, not blanket feature success. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Core multimedia/audio schema/metadata and api adapter | Pass | Pass | Low | Pass | Existing compact provider capability fits; no generic shared folder or artificial module. |
| Server agent-tools/media projection/service | Pass | Pass | Low | Pass | Entry/publication stays distinct from core provider translation. |
| Existing unit/e2e/docs locations | Pass | Pass | Low | Pass | Tests/docs attached to the corresponding owners. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Single voice enum/membership gate | Pass | Pass | Pass | Pass | One string-shape path; retain legitimate dialogue featured constraint. |
| Unconditional global-style propagation | Pass | Pass | Pass | Pass | One effective-style resolver, not old/new builders. |
| Complete-catalog implication | Pass | Pass | Pass | Pass | Featured/tested/untested distinctions in help. |
| Raw external error interpolation | Pass | Pass | Pass | Pass | Static safe categories/status; no raw body/message/cause attachment or logging. |
| Pending harness conflict markers / older no-op alternative | Pass | Pass | Pass | Pass | Remove only named conflicts after Pass; preserve current wrapper and other automatic content. Actual removal is not claimed completed. |
| Files/models/voice lifecycle | N/A | N/A | N/A | Pass | No unrelated decommission or old-model reintroduction in this delta. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Voice identity selection | No | Pass | Pass | One current string field/path; not enum-versus-ID branching. |
| Dialogue style | No | Pass | Pass | Optional override on one normalizer; old valid calls work through current semantics. |
| Generic tool-history reader | No | Pass | Pass | Version-agnostic dictionaries and optional input do not justify compatibility/migration code. |
| Runtime/model routes | No | Pass | Pass | No old model, credential or route fallback added. |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Reader / Semantic / Invariant Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Generic historical tool argument dictionaries | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Generic Record<string, unknown> projection; old voice/global-style args remain meaningful; omitted turn_styles inherits global. No typed enum store or new writer. |
| AudioModel config defaults | Not Affected — in-memory defaults | Pass | Pass | N/A | Pass | Built from parameter defaults; no persisted default-array/version introduced. |
| Saved settings/credential vault/output WAV | Not Affected by this expansion | Pass | Pass | N/A | Pass | No selection/settings/key/file-schema change; old upgrade's migration is reused as reviewed dependency, not recreated here. |
| Recordings/profiles | Not Affected | Pass | Pass | N/A | Pass | No new ingestion/profile persistence. |

Source-based reader/writer evidence is sufficient for this optional contract addition; no private histories or production vault were inspected. No bulk rewrite, startup scan, version branch or recovery journal is justified. Discovery of a contrary typed persisted contract must return upstream before adding migration machinery.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| SR-015 pending merge recovery before expansion | Pass | Pass — explicit stage selection, both-parent ancestry/effective-tree checks and independent old delivery boundary | Pass — named markers/no-op alternative only; no second merge/reset or whole-file side | Pass |
| Factory metadata/schema plus adapter delta | Pass | Pass — one current schema/normalizer | Pass — old single gate/global-only assignment removed | Pass |
| Focused/build/wire/privacy checks | Pass | Pass — fake SDK credentials/fetch interception, no semantic-audio claim | Pass | Pass |
| Source review -> API/E2E -> Delivery | Pass | Pass — fresh live authorization and explicit old hold reconciliation | Pass — test-owned state cleanup; no automatic paid retry | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Extra single ID / unchanged fields | Yes | Pass | Pass | Pass | Exact tested ID and existing prompt/output/global style. |
| Nullable positional styles / repeated speaker | Yes | Pass | Pass | Pass | Three-turn null fallback and wrong-count rejection explain per-turn, not per-speaker meaning. |
| Exact Google request nesting | Yes | Pass | Pass | Pass | Single voiceConfig.voice; dialogue speakerVoiceConfigs[].voiceConfig.prebuiltVoiceConfig.voiceName. |
| Base recovery versus release | Yes | Pass | Pass | Pass | SR-015 exact regions/query/expected delta/checks; prior SR-014 development versus finalization distinction retained. |

The nested request/metadata shape also agrees with the installed baseline and Google's [generateContent speech guide](https://ai.google.dev/gemini-api/docs/generate-content/speech-generation). That contract evidence does not prove provider entitlement, real tool-schema acceptance or audible style compliance.

## Material Premise Validation

### MP-001 — A normal OpenAI tool-schema projection forces omitted turn_styles to top-level null

- Related approved requirement / contract: REQ-003 preserves omission/global fallback; shared tool contract is projected through existing LLM formatters, not a new strict-mode feature.
- Relevant behavior: BEH-003, DS-001/003.
- Initiating basis kind: **User**.
- Independent supported initiating trigger: user requests dialogue through an agent using the existing generate_speech tool, omitting per-turn styles to retain global delivery.
- Support evidence: exposed agent tool invocation/MediaAutobyteusTool and current ToolSchemaProvider/formatters. The supported request is independent of the hypothesized strict-schema transformation.
- Forward path: configured audio model -> server tool schema -> OpenAiJsonSchemaFormatter -> normalizeOpenAiToolParameters -> LLM tool invocation -> BaseTool/server parser -> service/client. Current normalizer adds object additionalProperties:false; it does **not** rewrite optional fields as required-null. strict:true is explicitly rejected. Gemini formatter projects the raw schema; raw union array items are retained by ParameterSchema/coercion.
- Lifecycle preconditions/consequence: omission can stay omission on the current supported formatter path. The imagined mandatory top-level null is not produced by that projection. An LLM may independently supply malformed input, which the approved local validation rejects; that is not evidence for mandatory synthetic null semantics.
- Scenario validity: **Technically Possible but Unsupported/Contrived** for the assumed enabled strict transformation.
- Reachability: **Not Reachable** under the current supported projection contract.
- Review consequence: no finding and no new nullable top-level compatibility path. Retain design's nullable **items**, optional array and local rejection of explicit top-level null; validate current projections downstream. A future strict-mode contract would need separate evidence/design authority.

### MP-002 — The incoming no-op fixture would drop an existing supported context-input validation contract

- Related requirement / established contract: REQ-006 / AC-006 preservation and REQ-007 / AC-007 isolated validation; existing AgentRun provider-input normalization contract, not a new speech/attachment feature.
- Relevant behavior: preserved boundary associated with BEH-006; approved speech BEH-001/002/003 remain unchanged. No new behavior ID required.
- Initiating basis kind: **Contract** — existing product-input parity in established isolated harness checks; the independent user path below establishes the represented behavior.
- Independent supported initiating trigger: user attaches/uploads a context file using the existing `ContextFilePathInputArea` composer and sends it with an agent message. TESTING.md separately governs product-boundary checks in isolated/test-owned runtime storage; no test-only setup is used to establish the product action.
- Support evidence: context composer/upload store and agentRunStore.sendUserInputAndSubscribe finalize owned attachments; AgentStreamingService sends executable locators in SEND_MESSAGE. Production supervisor injects the actual layout/owner/local resolver into AgentRunProviderInputNormalizer, before backend dispatch. These are independent of the disputed harness fixture.
- Forward product path: composer -> agentRunStore finalization/submission -> AgentStreamingService -> server agent-stream-handler / AgentRunCommandCoordinator -> active AgentRun.postUserMessage -> providerInputNormalizer.normalizeForProvider -> backend.dispatchUserInput. Admitted existing owned context locators can become contained local paths; the normalizer copies provider input while preserving recording locators and source message. Existing harness operational checks exercise the same facade against scenario-owned roots; both live harness call sites supply environment.
- Lifecycle preconditions/consequence: production normalizer/resolver/owner/supervisor bytes remain equal checkpoint HEAD. Replacing the **test wrapper** with resolve:()=>null would not itself edit production, but would erase its current translation representation and violate the established admitted-context regression contract. Existing tests corroborate the already evidenced product contract; their synthetic inputs do not create its reachability. No fresh test Pass is claimed.
- Scenario validity: **Supported Normal Scenario**, plus applicable existing validation contract.
- Reachability: **Reachable** for supported context dispatch and its faithful test-boundary representation.
- Review consequence: SR-015's bounded preservation is proportionate: retain current regions/environment calls, remove older alternative, keep incoming query fix. Do not introduce new normalization policy, state, fallback or production refactor. IB-001's design authority is resolved; implementation/base validation and new effective-tree source review remain required.

No further additional premise is needed. Configured-provider failure and pinned development/finalization separation retain their established basis.

## Unresolved Approved-Behavior Or Current-State Gaps

**None at the architecture-decision boundary.** SR-015 supplies an independently verified bounded disposition for IB-001. The merge still has the recorded two conflicts; resolving them and executing base checks is the named Implementation next step, not a claimed successful base. Further discovered conflicts/failures return upstream. Live schema/audible acceptance remains incomplete, not an omitted requirement.

## Review Decision

**Pass — SR-015 recovery and unchanged speech design are ready for Implementation against approved SR-012.** Resume only the existing named merge resolution/base checks first. No in-scope architecture blocker remains. This is not a completed merge/build/source review, feature acceptance, user verification or release approval.

## Findings

**None new or remaining at design review.** Prior ARCH-REV-001 had no finding. External triggering **IB-001** is **design-disposed by SR-015**, not asserted implemented/resolved in source; its verification and pending execution status are recorded in ARCH-REV-002's prior-finding table. No new ID is assigned for the same integration issue.

## Classification

**N/A — Pass; no failure classification.** `task_size=Medium`, `architectural_risk=High` retained.

## Recommended Recipient

Current `get_handoff_rules` checked after completed-result persistence, 2026-10-02. Primary Pass/package-ready rule returns **/implementation_engineer**. After confirmed primary delivery, informational Pass rule returns **/solution_designer**. Fail/Blocked rule does not match. No direct code-review/delivery bypass or duplicate forwarding.

## Residual Risks

- **Schema acceptance:** two designer SDK interceptions prove local serialization only; actual model/tool acceptance and relevant formatter projections remain executable checks. No shared formatter rewrite is preauthorized.
- **Audio meaning:** prior extra-ID/dialogue probes returned WAV but bypassed the app gate and were not auditioned/transcribed. Implemented-tool output, dialogue order, style contrast and directions-not-spoken remain AC-002/003 obligations. Header/byte checks alone cannot satisfy them.
- **Availability/provenance:** one tested ID on one route/key/time; English sample does not establish Arabic quality, all-library access, custom voices, Flash-Lite live parity or every supplied ID. Maintain accurate help and truthful provider errors.
- **Privacy:** implement sanitization without logging/rethrowing raw external body/message/cause; use sentinel tests through the actual SDK path. Live checks need fresh bounded authorization and supported isolated vault import/cleanup, never reuse deleted probe state.
- **Development/delivery dependency:** exact merge is still pending at f1b03b4ed / MERGE_HEAD c6586a07f, with the two known harness conflicts. Complete only the reviewed disposition, preserve other automatic content, record both parents/effective delta and pass frozen-install/build/focused base checks before expansion. Further material conflicts or broader lock/source changes return upstream. **Old CRR-008 is not a Pass of the effective combination**; new independent source review covers it. Old DR-004 hold remains separately owned and cannot be bypassed by transitive finalization.
- **Scope:** existing cancellation/temp/publication semantics are preserved, not redesigned. Creation/replication/discovery UI/runtime/importer improvements remain deferred.

## Latest Authoritative Result

- Review Decision: **Pass**.
- Material-Premise Gate: **Pass** — MP-001 remains rejected with no machinery; MP-002 supported existing input/validation contract confirms proportional preservation.
- Notes: **ARCH-REV-002**, approved **SR-012**, design **SR-015**, trigger **IR-001 / IB-001**. Pending source resolution/base checks precede expansion; effective combination needs new source review. No merge/build/live/audible/finalization success inferred.
