# Architecture Review Revision Record

## Revision Index
| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | 1 / DS-001 Architecture Design Complete | SR-012; approval context SR-010/011 | N/A | Fail — Design Impact | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | 2 / DS-002 review recovery | SR-013; approved basis SR-012 | Fail — Design Impact | Pass | AR-001, AR-002, AR-003 resolved |
| ARCH-REV-003 | 3 / DS-003 first-install sidecar acquisition | SR-014; approved basis SR-012 | Pass | Pass | AR-001–003 remain resolved; none new |
| ARCH-REV-004 | 4 / DS-004 managed restart recovery | SR-016; SR-012 approved, SR-015 CI method | Pass | Pass | AR-001–003 retained; F-API-02 design recovery accepted, source/validation open |

## Revision Entries
### ARCH-REV-001 — Protected installation and authenticated update baseline
- Canonical design review report: `design-review-report.md` in this ticket.
- Review round/trigger: 1, 2026-11-18; Solution Designer's DS-001 handoff, `architecture-handoff.md`.
- Relevant solution revision: SR-012; no prior current-design findings. Archived fallback reviews are not this design's baseline.
- Prior authoritative decision: N/A.
- Current authoritative decision: **Fail — Design Impact**, Large/High confirmed.
- Established baseline: approved intent/current production paths reviewed; broad protected-path, nonroot-writer and independent desktop-signing direction accepted. Initial executable custody, managed activation lifecycle and committed authenticated identity are insufficiently concrete for implementation.

#### Prior Finding Resolution
None.

- New/remaining findings: **AR-001** immutable bootstrap privilege crossing; **AR-002** safe activation/normal quit/opt-out/relaunch coordination; **AR-003** signed record and committed-version authority.
- Material classification changes: none. Findings are within REQ-001/003/005/007 and AC-001/003/004/006/008; no product-policy expansion or fresh user approval requested.
- Material-premise gate: Pass; findings concern already supported normal paths and explicit AC-008 obligations, not invented failure scenarios.
- Recommended recipient: Solution Designer via handoff rules; no implementation handoff.
- Remaining risks: initial crossing feasibility unproved; OS/architecture/real-update acceptance remains downstream. Historical supplement readiness labels need refresh without altering raw evidence. No release authorization.


### ARCH-REV-002 — Concrete custody, managed lifecycle and committed identity
- Canonical design review report: `design-review-report.md` in this ticket.
- Review round/trigger: 2, 2026-11-18; Solution Designer's `architecture-rereview.md`, SR-013 / DS-002, responding to ARCH-REV-001 AR-001–003.
- Relevant solution revision IDs: SR-013; requirements remain SR-012, unchanged.
- Prior authoritative decision: Fail — Design Impact.
- Current authoritative decision: **Pass**, Large/High unchanged.
- Review delta: re-established unchanged approved behavior; redrew initial setup, publish/stage, automatic normal quit, explicit restart, opt-out/refusal/status and local writer transactions. Reopened lifecycle/readiness source; production source unchanged at `ead5fafcb4`.

#### Prior Finding Resolution
| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Blocking / High | Resolved at architecture boundary | SR-013, DS-002 privilege/resource sections | Selected retained-parent sealed helper crossing, one-shot pkexec and OS UID, embedded-only privileged resources, streamed verified payload, ordered provisioning/owned rollback. Noble `guest-observations.txt` records two one-shot authorizations and UID results; not full production/GUI proof. |
| AR-002 | Blocking / High | Resolved | SR-013, DS-002 managed activation lifecycle | ElectronApplication composition and sole managed will-quit handler; coordinator stage generation, ordinary-quit-only automatic rule, explicit restart, cancellation cutoff, confirmed stop, fixed outer-image relaunch and lost-reply status. Verified against existing applicationShutdown and readiness/policy source. |
| AR-003 | Blocking / Medium | Resolved | SR-013, DS-002 authenticated identity/atomic commit | Exact signed JSON/Ed25519 contract, admission/consumer fixtures, service-owned same-inode signed attrs, baseline digest, stage/rename/fsync/status order and first-install/two-upgrade examples. Inode witness demonstrates old/new descriptor pairing only, not power-loss acceptance. |

- New or remaining finding IDs: None.
- Material classification changes: prior Design Impact blockers resolved; no intent/scope change or new approval requested. Prior unaffected architecture rulings retained.
- Supplemental coherence: current SR-013 investigation header and superseded banners close obsolete user-action ambiguity; historical raw observations retained.
- Material-premise gate: Pass; no new unsupported scenario or failure machinery required.
- Recommended recipients: primary Implementation Engineer via pass rule; informational Solution Designer after primary succeeds.
- Residual risk: implementation must validate production helper/authentication, store/IPC/signing and exact lifecycle, real host/architecture/update/data matrix. These are existing downstream gates, not a conditional architecture pass. No release authorized.


### ARCH-REV-003 — Exact-release attestation acquisition before authorization
- Canonical design review report: `design-review-report.md` in this ticket.
- Review round/trigger: 3, 2026-11-18; Solution Designer's `first-launch-record-handoff.md`, SR-014 / DS-003, following implementation intake's missing detached-metadata acquisition question.
- Relevant revisions: SR-014; approved requirements remain SR-012; prior architecture pass ARCH-REV-002 for DS-002.
- Prior authoritative decision: Pass.
- Current authoritative decision: **Pass**, Large/High unchanged.
- Delta independently reviewed: exact-tag/sidecar identity from existing build naming owner, normal-user acquisition only after Install selection, bounded fixed-origin HTTPS before authentication, opened local-file verification plus independent root re-verification, and no fetch on healthy/managed/redirection/cancellation paths. Redrew L2 acquisition/authorization and release publication in the current report.
- Evidence: current core-artifact diff at `df2ed790ce`; unchanged requirements/production source; reopened build.ts repository/flavor/name functions and release workflow version/asset publication. Investigation's live HEAD is transport evidence only, not signed-asset or package validation.

#### Prior Finding Resolution
| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Remains resolved | SR-013/014, DS-002/003 | Selected immutable helper/UID/resource crossing retained. Unprivileged fetch/precheck precedes it; root still independently validates exact pinned tuple and streamed bytes. |
| AR-002 | Resolved | Remains resolved | SR-013, retained DS-002 lifecycle | No change to managed coordinator, deferred normal quit, opt-out cutoff or explicit restart; prior source/ruling reused. |
| AR-003 | Resolved | Remains resolved | SR-013/014 | Same exact-byte signed record, key and same-inode commit authority; concrete sidecar producer/consumer naming added, not a competing attestation format. |

- New/remaining findings: None. No behavior change, fresh approval, migration, alternate package, privileged networking or latest-release fallback introduced.
- Material-premise gate: Pass. Acquisition/refusal traces directly to approved first install and AC-003; no claim of offline managed enrollment or need for extra resilience machinery.
- Recommended recipients: Implementation Engineer via primary pass rule; informational Solution Designer after delivery succeeds.
- Residual risk: real compiled package/sidecar acquisition, redirect/deadline/size refusal, mutation rejection and no-network cases must be exercised downstream; full previous host/architecture/update/data acceptance gates remain. No release or production secrets authorized.


### ARCH-REV-004 — Explicit manual restart handed back to the ordinary supervisor
- Canonical design review report: `design-review-report.md` in this ticket.
- Round/trigger: 4, 2026-11-19; `architecture-rereview-sr016.md`, IR-004 `implementation-handoff.md`, IMP-31/32 and API-REV-002 / F-API-02, following CRR-003 origin classification.
- Relevant revisions: SR-016 / DS-004; SR-012 requirements unchanged; SR-015 Linux-only native validation method retained.
- Prior authoritative decision: Pass (ARCH-REV-003 / DS-003).
- Current authoritative decision: **Pass**, Large/High unchanged, at HEAD `2f2090e933`.
- Delta: independent review of current supervisor/launcher/main/session source and native failure evidence. Redrew managed launch, manual success, confirmed-old recovery, ordinary quit and bounded R1 receive/re-entry. Existing session owns stop/outcome/intent; original ordinary-user AppRun owns reap and one canonical exec. No privileged/renderer/public command channel.
- Changed ruling and evidence: prior canonical app.relaunch selection is no longer viable for the observed supported Noble path. IMP-31 records verified ACK, actual canonical exec then FUSE EPERM before AppRun, versus healthy same-byte independent menu. The design's R/exit76 pair, direct-child credentials and dispatch-time cancellation replace that mechanism without changing requirements. No claim that the revised full package already works.

#### Prior Finding Resolution
| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Remains resolved | SR-013/014/016 | First-install authentication/resource custody unchanged; restart adds no privilege/enrollment route. |
| AR-002 | Resolved | Remains resolved with changed dispatch ruling | SR-016 DS-004; IMP-31/32 | Session retains sequencing/stop/generation/writer-outcome authority; main handback only for explicit manual intent, parent reaps direct main then controls fixed re-entry. Ordinary quit never reopens. |
| AR-003 | Resolved | Remains resolved | SR-013/016 | Same signed committed-inode authority; handback cannot choose another executable or interpret ACK as GUI readiness. |
| F-API-02 (downstream) | Open design-origin restart failure | Revised design accepted; implementation/independent validation still open | IR-004 / API-REV-002 / SR-016 | Actual failure basis confirmed; DS-004 is selected response, not an executed fix. |

- New/open architecture findings: None. F-API-01 remains for independent recheck; its separate source correction is not reviewed or accepted as runtime success here.
- Material-premise gate: Pass; MP-001 independently witnessed by supported Settings action and actual native successor, not inferred from a generic API or stand-in.
- Recommended recipients: Implementation Engineer primary pass; informational Solution Designer after delivery succeeds.
- Remaining risks: real packaged transport/re-entry, native descriptor/signal cleanup and old/new recovery must be proven. Repeat continued GUI journey and affected native Linux builds under SR-015, retain all other API-REV-002 open cases. No policy/data/support/release change, no production secrets or publication.
