# Architecture Design Revision Record — COLLAB-FOLLOWUP-001

Approved requirements and latest `design-spec.md` are authoritative. This new ticket does not continue old AORG architecture revision numbering.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| AD-REV-001 | Requirements Engineer, approved RER-002 | N/A — initial baseline | Initial Architecture Baseline | Architecture Design Complete; Medium/High; independent review selected |

## Revision Entries

### AD-REV-001 — deferred configured workers, deliberate selection, canonical sent attachment

- Triggering role/report/round: Requirements Engineer handoff for COLLAB-FOLLOWUP-001; `requirements-doc.md`, `investigation-notes.md`, `requirements-revision-record.md` RER-002 at `53fffe8bd4845b902e48b567649e061bea39ddfc`.
- Triggering finding IDs: **N/A — initial architecture baseline**. Scope provenance is the three approved issue families USER-pre-message-member-lifecycle, LIVE-PUB-mounted-navigation, API-FIND-040; not new outcomes for the completed old ticket.
- Prior authoritative design result: **N/A**.
- Current authoritative design result: **Architecture Design Complete**, `task_size=Medium`, `architectural_risk=High`; independent review required, not yet reviewed or implemented.
- Why recorded: map all three new-ticket behaviors to actual current owners, independently compare pinned original personal, establish bounded mechanisms and preservation/validation limits before repair.
- Approved IDs: BEH-001–003; REQ-001–006; AC-001–008; SCN-001–007. Explicit Team **and Org** unused-member scope retained. User's subsequent first-inter-Agent-input comment confirms existing approved SCN-002; source was rechecked, no requirement reinterpretation.
- Design sections: complete initial mandatory structure; CD-001 fresh configured deferral; CD-002 necessary exact receiver-membership/origin split; CD-003 latest explicit selection guard; CD-004 canonical reactive message. All have file/interface/spine/removal/sequence/transition mappings.
- Supplements added: `architecture-investigation.md`, `architecture-design-self-validation.md`, bounded source witnesses/diagnostics under `architecture-evidence/AD-REV-001/`.
- Data decision: current Team V2 / Org V1 directly usable with existing nullable provider bindings; no migration, reset, loss, replay, backfill, external-definition or cutover action.
- Downstream/review impact: review the bounded target and the receiver authorization/selection propagation boundaries. Event publication and original failure provenance must stay separate; fixed helpers alone do not prove frontend acceptance. After review, implementation/source review/focused executable validation use their own completed-result rules. Delivery owns finalization and terminal package; no successful delivery claim here.
- Routing: fresh `get_handoff_rules` selected the initial completed-design / High-risk rule to `/software_engineering_team/architecture_reviewer`; exact rule retained in `architecture-evidence/AD-REV-001/selected-handoff-rule.json`. No duplicate assignment or implementation handoff.
- Remaining risks: historical publication-only cause unassigned; controlled probes are not hosted or full Pinia/backend tests; native DeepSeek availability unverified; durable real-composition regressions and normal desktop/narrow journeys still required. Task/Restore/Stop and binding durability must be preserved. No automatic old massive-suite rerun.
