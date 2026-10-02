# Architecture Review Revision Record — Gemini 3.8 TTS upgrade

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete | SR-004, SR-005 | N/A | Fail | DR-001, DR-002 |
| ARCH-REV-002 | Round 2 / revised Architecture Design Complete | SR-004, SR-006 | Fail | Pass | DR-001, DR-002 resolved |

## Revision Entries

### ARCH-REV-001 — Initial independent architecture review baseline

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/design-review-report.md`
- Review round and trigger: 1; Solution Designer's Large/High `Architecture Design Complete` handoff.
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/solution-handoff.md`; no prior reviewer findings.
- Relevant solution revision IDs: `SR-004`, `SR-005`.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail` / `Design Impact`.
- What changed in the review result or what baseline was established: Approved/current behavior basis and Large/High gate confirmed. Current-only audio ownership, startup one-key migration and explicit test-vault route are sound. `DS-005` lacks the existing non-TTS production request/result path; multi-speaker voice-config guidance omits a required nesting level.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: `DR-001`, `DR-002`.
- Material classification changes: None; `task_size=Large`, `architectural_risk=High` remain valid.
- Recommended recipient: `/solution_designer`.
- Remaining risks or uncertainty: SDK metadata serialization, real 3.8 runtime entitlement/response and credential alias require later implementation/API-E2E verification; no unsupported fallback is justified.

### ARCH-REV-002 — Re-review of non-TTS spines and multi-speaker protocol

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/design-review-report.md`
- Review round and trigger: 2; revised Large/High `Architecture Design Complete` package after `ARCH-REV-001` Fail.
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/solution-handoff-sr006.md`; `DR-001`, `DR-002`.
- Relevant solution revision IDs: `SR-004` approved basis; `SR-006` design correction. `SR-005` remains historical.
- Prior authoritative decision: `Fail` / `Design Impact`.
- Current authoritative decision: `Pass`.
- What changed in the review result or what baseline was established: `DS-005–007` now trace existing LLM/image/video requests through owning adapters and distinct SDK calls back to text/file results; SDK upgrade/validation is a separate secondary `DS-008`. Multi-speaker entries now explicitly nest `voiceConfig.prebuiltVoiceConfig.voiceName` and validate Google's at-most-two-prebuilt-speaker limit. The isolated-vault real Gemini LLM check makes the existing REQ-007 regression obligation executable without changing product behavior.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| DR-001 | Open / Design Impact | Resolved | `ARCH-REV-001`, `SR-006`; `design-spec.md` behavior map, spine inventory `DS-005–008`, owner/boundary, file map, change sequence | Compared corrected spines with `BaseLLM`/`GeminiLLM` nonstream/stream calls, `GeminiImageClient.generateImage`, `GeminiVideoClient.generateVideo`/file retrieval and server media service; each production path now has caller, adapter/SDK boundary and returned effect. |
| DR-002 | Open / Design Impact | Resolved | `ARCH-REV-001`, `SR-006`; `design-spec.md` Interface Shape And Concrete Guidance and validation sequence | Exact `{ speaker, voiceConfig: { prebuiltVoiceConfig: { voiceName } } }` matches current adapter's nesting and Google's 3.8 guide; turn metadata, speaker-count guard and deterministic wire test are explicit. |

- New or remaining finding IDs: None.
- Material classification changes: None; `task_size=Large`, `architectural_risk=High` remain valid.
- Recommended recipient: `/implementation_engineer` primary pass handoff; `/solution_designer` informational pass notification after primary succeeds.
- Remaining risks or uncertainty: Latest SDK version, metadata serialization, live 3.8/Gemini access, actual returned format and credential alias require implementation/API-E2E evidence. A skip is not a pass; no old-model fallback or LLM catalog change is approved.
