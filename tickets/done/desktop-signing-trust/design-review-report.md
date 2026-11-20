# Architecture Review — desktop signing trust (autobyteus-11)

## Review Round Meta
- Requirements: `requirements-doc.md`, approved **SR-001**.
- Investigation: `investigation-notes.md`; solution history: `solution-revision-record.md`.
- Design: `design-spec.md`, **DS-001**; current handoff `architecture-handoff.md`.
- Supplemental artifacts: none with behavior authority; earlier autobyteus-5 results are context, not production trust proof.
- Review history: `architecture-review-revision-record.md`, **ARCH-REV-001**, round **1**, 2026-11-20. Prior result: N/A for this ticket.
- Trigger: Architecture Design Complete; urgent first production trust provisioning and pre-tag guard.
- Workspace: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/desktop-signing-trust`, branch `fix/desktop-signing-trust`, reviewed HEAD **f4a6d10189**, production base **a728fbcad3**, final target `origin/personal`.
- Reviewer performed source/document review and read-only GitHub queries. No key generation, private-secret retrieval, settings write, workflow dispatch/rerun, tag, push or publication.

## Routing Classification Review
**Medium / High — confirmed; independent review required.** Bounded release tooling changes, but first durable signing authority, partial multi-system writes, custody and release admission are security-sensitive. Size is not inflated by documentation. Requirements approved within explicit founder direction; no pending design approval.

## Upstream Behavior And Production-Path Basis Confirmation
**Overall: Confirmed.** UC/BEH/SCN/REQ/AC use the same 001–005 numbering. First provisioning is authorized; replacement/rotation, server trust and release execution are not. M1 is operational readiness/configuration evidence, not remote signing proof, and must not wait for backup confirmation or merge. Founder backup confirmation remains required to complete custody. Preflight is a snapshot, not a guarantee against subsequent administrator changes.

Opened current source: `scripts/desktop-release.sh:141–189,193–247,260–298,408–415` (stable/beta/prepare and mutation boundary); `scripts/desktop-package/prepare-build-trust.mjs` (public-only production build vs disposable build-only identity), `sign-release.mjs:10–21` (Ed25519/private-derived public equality and signature verification), `release-record.mjs` (bounded canonical records); `.github/workflows/release-desktop.yml:412–416,525–529,642–690` (build public input and isolated signer); `RELEASE.md:550–557`. Server generator read only as a contrasting implementation; its repository-secret scope is not reusable here. Root DESIGN.md/TESTING.md and applicable release checklist read; no closer scripts/.github AGENTS.md.

Independent live observations at review: run **44685600710**, attempt 1, is a failed **push** run on `v1.5.14-beta.2`, SHA `a728fbcad32a21410e7427bdc70aed9a5baed528`. Both Linux jobs failed at trust preparation, signer/publisher skipped. Release has **8 assets**. Environment list empty; repo desktop variable names empty; matching repo/available-org private-secret metadata lists empty. These are read-time observations, not an exclusive provisioning lease; operator must recheck all required scopes immediately before writes.

| Behavior | Kind / approved trigger | Intent alignment | Current evidence | Target path | Status / action |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Founder-authorized first setup | Pass | Pass: absent scoped settings, failed public-trust builds | Pass: serialized one-key setup, protected policy before secret, verified M1 | Confirmed; prioritize M1 |
| BEH-002 | Founder locally backs up sole private file | Pass | Pass: explicitly approved custody contract | Pass: path-only notice, explicit saved confirmation, owned-file removal | Confirmed; never presume confirmation |
| BEH-003 | Repeat/conflict/partial state | Pass | Pass: explicit operational/security requirement | Pass: create-only claim, no replacement or destructive recovery | Confirmed; disposable tests |
| BEH-004 | Stable/beta/prepare release helper | Pass | Pass: existing helper currently mutates before checking trust | Pass: one read-only scope/current-generation witness gate before mutation | Confirmed; no witness means no new tag |
| BEH-005 | Integrated delivery | Pass | Pass: existing release ownership/checklist | Pass: review, merge, cleanup, M2; no release execution here | Confirmed |

No blocking Design Impact finding proposed; no ambiguity requires new product approval. Root-cause evidence is sufficient before structural review.

## Supplemental Artifact Coherence Verdict
| Artifact | Purpose/scope | Core links | Complete for purpose | Consistent | Approval/status | Action |
| --- | --- | --- | --- | --- | --- | --- |
| architecture-handoff.md | Pass | Pass | Pass | Pass | Pass | Carries M1/M2 and no-release boundaries |
| Prior engineering result | Pass: historical context | Pass | N/A for new trust | Pass | Pass | Never treat as production provisioning proof |

## Task Design Health Assessment Verdict
| Check | Result | Evidence / action |
| --- | --- | --- |
| Present/current posture | Pass | Missing setup and pre-tag owners identified |
| Root cause explicit/evidenced | Pass | Build fails before signer; helper lacks pre-mutation trust check |
| Refactor/no-refactor decision | Pass | Extend bounded release scripts, no key service or extra pipeline |
| Concrete response | Pass | Generator, shared strict state reader/policy, one release verifier; reuse signer/record verification |

## Spine Inventory Verdict
Reviewer labels below index the design's operational sequences; no new behavior is added.

| Spine | Scope / call-order narrative | Readable | Narrative | Facade/owner | Naming | One owner/node | Off-spine concerns | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | Custodian -> generator preinspect -> create-only claim -> exclusive backup/local pair check -> restricted environment+typed policy readback -> public anchor create/readback -> environment-secret stdin upload -> scope/metadata readback -> immediate M1 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| P2 | Operator path-only notice -> coordinator/founder -> explicit saved confirmation -> exact owned-file cleanup -> custody receipt | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| P3 | Any setup boundary refusal/ambiguity -> generator stops -> retains one key/owned claim where needed -> nonsecret reconciliation instructions -> explicitly coordinated recovery, never regenerate | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| R1 | Stable/beta/prepare -> preliminary version/repo checks -> shared read-only trust verifier -> current policy/key/secret-generation checks -> historical run/attempt/code+both signatures -> allow normal mutation or refuse unchanged | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| R2 | Mac owner independently chooses existing-tag rerun -> existing protected signer -> official signed sidecars -> later R1 witness | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| D1 | Implementation/self-check -> independent source/validation -> Delivery merge/cleanup -> M2 -> coordinator/manager | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

P3 is the bounded transaction/failure path. P2 and M1 are meaningful return/event paths, not hidden inside final delivery. R2 is an externally owned prerequisite for a positive future preflight, **not** permission for this team/node to rerun or publish.

## Boundary Encapsulation Verdict
| Owner | Public entry clear | Internals internal | Bypass controlled | Verdict / notes |
| --- | --- | --- | --- | --- |
| Desktop generator | Pass | Pass | Pass | Pass: fixed repo, named environment, local private bytes only to backup/stdin |
| Shared trust state/policy | Pass | Pass | Pass | Pass: strict public parser and exact typed policy reused by generator and verifier |
| Release verifier | Pass | Pass | Pass | Pass: public/metadata evidence only; no signing/backup access |
| Existing protected signer | Pass | Pass | Pass | Pass: retains private/public equality; builds have public input only |
| Founder custody | Pass | Pass | Pass | Pass: no password-manager access or transmission of private file |

## Dependency Direction / Forbidden Shortcut Verdict
| Boundary | Allowed dependencies | Forbidden shortcuts | Direction | Verdict |
| --- | --- | --- | --- | --- |
| Generator | Pass: Node crypto/fs, shared policy, explicit gh | Pass: no server key, broad secret, upsert rotation or private diagnostics | Pass | Pass |
| Pre-tag helper/verifier | Pass: state reader, trusted run evidence, existing record verifier | Pass: no secret read/signing oracle, bypass flag or local-pair substitute | Pass | Pass |
| M1/M2 routing | Pass: operator -> coordinator -> manager/founder | Pass: no delayed M1 behind merge/backup or competing release | Pass | Pass |

Composition-root/dependency check: **Pass**. CLI entrypoints drive ordered operations; shared readers/crypto checks do not own orchestration. No global mutable owner, hidden callback loop or missing-dependency silent fallback is proposed.

## Interface Boundary Verdict
| Interface | Subject clear | Singular responsibility | Identity explicit | Generic risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| generate-desktop-signing-key CLI | Pass | Pass | Pass: official repo, environment, public fingerprint, owned backup and nonce | Low | Pass |
| replacement option | Pass | Pass | Pass: expected old fingerprint + consistent state + fresh destination | Low, separately authorized only | Pass; not invoked in production here |
| check-release-trust CLI | Pass | Pass | Pass: current scope/key/generation and selected run/attempt/tag | Low | Pass |
| M1 / custody / M2 receipt | Pass | Pass | Pass: public footprint, local path/confirmation, SHA/tests respectively | Low | Pass |

Empty-indirection check: **Pass**. Shared trust state/policy is genuinely reused; separate generator and verifier differ in authority and side effects, not empty forwarding.

## Existing Capability / Subsystem Reuse Verdict
| Need | Existing checked | Reuse sound | New piece justified | Verdict / notes |
| --- | --- | --- | --- | --- |
| Desktop signing | Pass | Pass | Pass | Pass: keep existing signer and release-record verifier |
| Release mutation gate | Pass | Pass | Pass | Pass: extend both existing tag-producing paths, including no-push/prepare |
| One-time setup | Pass | Pass | Pass | Pass: server generator is analogy only; its secret scope/custody differs |
| Release readiness docs | Pass | Pass | N/A | Pass: extend RELEASE.md, not a second release authority |

## Subsystem / Capability-Area Allocation Verdict
| Area | Ownership clear | Reuse/create sound | Supports owners | Verdict |
| --- | --- | --- | --- | --- |
| scripts/desktop-package | Pass | Pass | Pass | Pass: desktop identity/policy/proof |
| scripts/desktop-release.sh | Pass | Pass | Pass | Pass: existing tag lifecycle calls verifier |
| Coordinator/Delivery | Pass | Pass | Pass | Pass: milestone relay/custody completion vs merge/finalization |

## Reusable Owned Structures Verdict
| Structure | Extraction evaluated | Shared file choice | Owner clear | Verdict |
| --- | --- | --- | --- | --- |
| Strict public-key/state/policy checks | Pass | Pass: desktop-package scope | Pass | Pass |
| Signed release records | Pass | Pass: existing release-record.mjs | Pass | Pass |
| M1 vs signing witness | Pass | Pass: separate records | Pass | Pass: provisioning receipt is not cryptographic remote-use proof |

## Shared Structure / Data Model Tightness Verdict
| Structure | Field meaning | Redundancy controlled | Overlap controlled | Core/variant decision | Verdict |
| --- | --- | --- | --- | --- | --- |
| Current trust state | Pass | Pass | Pass | Pass | Pass: public DER fingerprint, env identity/policy and secret metadata are distinct |
| Signing witness | Pass | Pass | Pass | Pass | Pass: tag SHA/run attempt/job/code/signature and temporal checks each serve admission |
| Public provisioning claim | Pass | Pass | Pass | N/A | Pass: ownership nonce, not a secret or remote proof |

Derived consumers: **Pass** (generator, preflight and docs/receipts named; build/signer still consume their existing variable/secret). Vocabulary: **Pass**; no new application-domain meaning. Treat “current generation” as verified metadata freshness plus successful protected signing evidence, never the mere secret name.

## File Responsibility Mapping Verdict
| File / area | Singular concern | Matches owner | Re-tightened | Verdict |
| --- | --- | --- | --- | --- |
| generate-desktop-signing-key.mjs | Pass | Pass | Pass | Pass |
| shared desktop public-state/policy reader | Pass | Pass | Pass | Pass |
| check-release-trust.mjs | Pass | Pass | Pass | Pass |
| desktop-release.sh | Pass | Pass | Pass | Pass: calls one gate before bump/sync/commit/tag/push |
| focused script/helper integration tests | Pass | Pass | N/A | Pass: fake gh/disposable pairs and throwaway repository only |
| RELEASE.md | Pass | Pass | N/A | Pass: preparation/custody/witness failure instructions |

## Subsystem / Folder / File Placement Verdict
| Path | Placement clear | Owning folder | Mixed/over-split risk | Verdict |
| --- | --- | --- | --- | --- |
| scripts/desktop-package/ | Pass | Pass | Low | Pass |
| existing release helper/tests | Pass | Pass | Low | Pass |
| RELEASE.md / ticket receipts | Pass | Pass | Low | Pass: global instructions vs ticket evidence separated |

## Removal / Decommission Completeness Verdict
| Item | Removal named | Replacement clear | Scope explicit | Verdict |
| --- | --- | --- | --- | --- |
| Ungated stable/beta mutation | Pass | Pass | Pass | Pass: no-push/prepare not exempt |
| Task-created private backup | Pass | Pass | Pass | Pass: only after founder confirmation, exact owned file |
| Public coordination claim | Pass | Pass | Pass | Pass: owned nonce only; retain partial/unknown state for recovery |
| Dead source | N/A | N/A | N/A | No independently identified dead code; no unrelated cleanup |

## Legacy / Backward-Compatibility Verdict
| Area | Legacy retention | Clean cut | Verdict / notes |
| --- | --- | --- | --- |
| Release helper trust gate | No | Pass | Pass: no bypass for old behavior |
| Historical signing witness | No | Pass | Pass: evidence of current key use, not runtime compatibility; bounded trusted code identity required |
| Existing incomplete settings | No | Pass | Pass: stop/reconcile, not silently adopt or replace |

## Persisted-Data Transition Verdict
| Subject | Decision | Evidence sufficient | Proportionate | Migration safety | Verdict |
| --- | --- | --- | --- | --- | --- |
| App/client/profile data | Not affected | Pass | Pass | N/A | Pass |
| GitHub trust config | First creation only; reject unexpected prior state | Pass: source/live absence + operator recheck | Pass | N/A | Pass |
| Backup/coordination claim | New bounded operational state | Pass: exclusive file, ownership nonce, partial-state and confirmation rules | Pass | N/A | Pass |

No app migration, dual reader, server-key transition or production rotation is authorized. Partial external writes are not a database migration; they require truthful retained custody/reconciliation, already specified.

## Change / Refactor Safety Verdict
| Area | Sequence realistic | Temporary seams explicit | Cleanup explicit | Verdict |
| --- | --- | --- | --- | --- |
| Disposable generator check -> first setup -> M1 | Pass | Pass | Pass | Pass |
| Environment policy readback before secret upload | Pass | Pass | Pass | Pass |
| Existing-tag Mac witness -> future preflight | Pass | Pass | Pass | Pass: lack of witness blocks new tag, not M1 |
| Founder confirmation -> private cleanup -> M2 | Pass | Pass | Pass | Pass |

Node built-ins and existing CLI tools introduce no workspace dist/codegen dependency; focused clean-run evidence is appropriate. No production signing run is authorized as a test. Preserve code review/validation/delivery gates after early M1.

## Example Adequacy Verdict
| Topic | Needed | Clear | Avoided shape | Verdict |
| --- | --- | --- | --- | --- |
| Secret/public/policy ordering | Yes | Pass | Pass: secret never enters unrestricted environment | Pass |
| Partial/conflicting setup | Yes | Pass | Pass: no regenerate/rollback gamble | Pass |
| Current-generation witness | Yes | Pass | Pass: both signatures, trusted code/run and strict job-start freshness | Pass |
| Bootstrap without witness | Yes | Pass | Pass: existing Mac-owned beta.2, not a new local tag | Pass |

## Material Premise Validation
**None additional required.** Repeat/conflict/interruption, secret-generation freshness and scoped access are explicit approved BEH-003/004 obligations, not reviewer-invented threat scenarios. The existing-tag bootstrap is grounded in live push-run/tag identity and current failed jobs; it does not authorize this reviewer/node to execute that release. Trusted release-operator/admin assumptions remain explicit; tag patterns restrict refs, not which humans may create them.

## Unresolved Approved-Behavior Or Current-State Gaps
None blocking implementation/provisioning design. No production signing witness exists at intake; that is an explicit fail-closed preflight state. M1 does not depend on acquiring such a witness or founder backup confirmation. If Mac cannot establish the first witness, return for a separate bootstrap decision rather than weakening the gate.

## Review Decision
**Pass — ARCH-REV-001 / SR-001 / DS-001, Medium / High.** Ready for implementation and the explicitly authorized first-provisioning sequence. No new findings. This is not M1 completion, a remote-key-match claim, or release permission.

## Findings
None.

## Classification
Pass. No active Design Impact / Requirement Gap / Unclear finding.

## Recommended Recipient
Primary: Implementation Engineer through pass rule; informational Solution Designer after primary delivery. **Carry M1 urgency:** immediately upon verified settings, send the nonsecret footprint and path-only backup notice to coordinator for manager/founder relay. Do not wait for code merge, backup confirmation, complete helper work or final handoff. Founder confirmation gates custody completion and cleanup; M2 follows verified delivery/cleanup.

## Residual Risks
- GitHub environment-secret GET exposes metadata, not the private value; environment secrets are read at job start. The proposed temporal/signature/code checks are an inference of current-generation use, not plaintext readback. Strictly require current secret creation/update and environment identity to predate the actual successful signer job start; equal/unknown timestamps refuse. [Secret API](https://docs.github.com/en/rest/actions/secrets#get-an-environment-secret), [read timing](https://docs.github.com/en/actions/reference/security/secrets#when-github-actions-reads-secrets).
- Verify typed **tag** policy, exact list and no branch/reviewer/wait extras before private upload. The API distinguishes tag from branch rules; a matching name alone is insufficient. The actual environment is `desktop-release-signing` as wired at workflow line647. [GitHub policy API](https://docs.github.com/en/rest/deployments/branch-policies#create-a-deployment-branch-policy).
- A create-only public claim is cooperative serialization, not protection against non-cooperating admins. Use the documented create endpoint rather than update/upsert and verify ownership/readback; any ambiguous/conflicting result must stop before generating/replacing a key. No lock takeover or guessed absence. [Variable API](https://docs.github.com/en/rest/actions/variables#create-a-repository-variable).
- Trust the witness's reviewed signer/workflow content and exact run/attempt/ref, not job titles. Current fixed signer/environment contract is the initial known basis; unknown content must fail rather than dynamically trusting arbitrary historical code. No production run is authorized to test this verifier.
- Single-key upload success and matching public readback do not prove remote signing. M1 must say so explicitly. Capture only safe metadata; local generator must not inherit tracing/debug behavior that exposes stdin, and failure paths must suppress child/API content containing private material or invalid variable values.
- Founder backup may remain pending after M1. Keep exactly the owned private backup safely outside Git; do not attach it, read a password manager, delete it prematurely or claim secure media erasure. Production replacement remains prohibited here even though the reusable script has a separately guarded option.
- Current beta.2 remains Mac-owned with 8 assets and failed Linux builds. No rerun, tag, publish, production-signing test or server-key access by this node. Operator must recheck state/lease before writes; these read-only review observations cannot reserve it.

## Latest Authoritative Result
- Decision: **Pass**.
- Material-premise gate: **Pass**.
- Revision: **ARCH-REV-001**, task **autobyteus-11**, **SR-001 / DS-001 / Medium / High**.
- M1, founder confirmation/private cleanup, positive production witness, merge and M2 remain pending. No release authorized.
