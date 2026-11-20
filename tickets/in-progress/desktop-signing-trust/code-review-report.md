# Source review — desktop signing trust

**CRR-001: Fail — implementation-owned Local Fix (F-CR-001).** The pre-tag gate and the scoped secret-upload path are separate from the defect. The default generator checks whether settings and a local backup exist, but not the **release state** required to decide whether this is genuinely first provisioning. Missing settings are not affirmative evidence that a desktop signing identity has never been established. **This does not invalidate M1 or authorize provisioning again.**

## Round and basis

- Initial Implementation Review, **Full Review**, 2026-11-20. **Medium / High confirmed**: bounded release-tooling change, high impact of establishing a durable signing identity used for installed software. Independent review required.
- `fix/desktop-signing-trust` → `origin/personal`, base `a728fbcad3`, source `88646150044118bc368238a9331fe646cc375f68`, received evidence HEAD `150b17d80e`. No prior CRR, API-REV or DR. No client or frontend work.
- Basis: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md` (SR-001); `design-spec.md` DS-001, architecture handoff/report/revision record ARCH-REV-001 Pass; IR-001 implementation handoff/checks/history; M1 and IMP-01–03. Applied shared design principles and scope rules, root AGENTS/DESIGN/TESTING/RELEASE. No behavior-defining supplement or closer scripts instructions. The historical Ubuntu ticket is not an alternative authority for this ticket.
- Read the changed production scripts, tests and guide, the shell callers/mutation tail, existing workflow checkout/sign/publish and release-record checks. Reviewed the clean disposable test evidence before running anything. Did not rerun the recorded suites, provision, invoke a tag creator, sign, publish, alter remote state or access the founder's backup. A new diagnostic intercepted the first mutation and used only simulated read-only metadata.

## Behaviors, supported triggers and production paths

| Approved scenario | Trigger, path and outcome | Result |
| --- | --- | --- |
| 001 / normal first setup | Authorized custodian, exclusive window → default generator → inspect scopes → create-only nonce claim → exclusive local pair → environment restriction/readback → public variable → environment secret over stdin → verify footprint, remove owned claim, relay M1. | Actual first setup had separate prior investigation and founder context. Reusable initial eligibility is incomplete (F-CR-001). |
| 002 / normal founder custody | Custodian gives path only. After explicit founder saved confirmation, removal command checks designated directory/file, owner/mode, dev:ino, link count and public fingerprint before unlink/absence check. | Pass in source/disposable evidence. No assumption that a CLI flag supplies human confirmation; only custodian may act after it. No real removal verified by this review. |
| 003 / explicit repeat, interruption or conflict | Same/other designated operator may encounter a prior trust generation, partial external state or ambiguous API result. Existing settings/claim/local directory refuse; failed writes are not retried/destructively rolled back. Explicit replacement requires fingerprint + previous witness. | Claim/partial-write boundaries pass for inspected state. Default path misses prior/conflicting release evidence even when release inspection is unavailable. |
| 004 / stable or beta release preparation | Release owner invokes release/prepare or beta, including no-push. Read-only check before bump/commit/tag/push (also before beta fetch). It validates official origin, complete scoped state and current-generation witness; shell aborts on failure. | Source pass; positive hosted witness remains an execution gate. No release action taken. |
| 005 / delivery | Reviewer → executable validation → authorized integration/cleanup and M2 via coordinator. Mac alone owns existing-tag release decisions. | Boundaries preserved; not complete, no handoff to delivery. |

## Finding and candidate/mechanism gate

**F-CR-001 — default first setup does not inspect conflicting or unknown release state. Promote / this ticket / High consequence.** DS-001 §1 explicitly includes release state in preinspection, and AC-001/003 require absence of conflicting state and no silent replacement on repeat/unknown. The real investigation used the failed tag run and its eight **non-desktop** assets, separately from empty settings, when establishing first setup. After a normal founder save/removal or on another designated machine, the absence of a local backup directory is expected. If the settings are also absent but official release evidence indicates the prior managed desktop signing identity, this is a reconciliation decision, not a fresh installation. An inability to inspect the required release evidence is not proof of absence. No hostile administrator or stolen credential is needed for this contract.

- `scripts/desktop-package/generate-desktop-signing-key.mjs:24–47`: default `prior` tests claim/public variable/environment/secret. Only explicit replacement calls `existingWitness`. Default calls `read` (= `desktop-trust-state.mjs:inventory`), then posts the claim, creates custody storage and generates a new key. Reinspection repeats the same inventory. No release read or other required release-state input. RELEASE.md's reusable first-setup instructions do not impose that missing inspection either.
- `evidence/CRR-001-preclaim.mjs` and `.txt`: empty settings and a clean disposable home, metadata reader configured to refuse release-state queries. The real inventory/default decision reached the first claim POST **without requesting any release metadata**; the diagnostic intercepted it before any write or generation. IMP-02's success fixture demonstrates what the default flow does after claim success. This establishes the decision gap; it does **not** claim a second production key was created.
- **Correction:** distinguish verified first setup from existing/conflicting desktop signing evidence or indeterminate release state before the first mutation; preserve first setup on the documented failed/skipped-signer/no-desktop-sidecar case. Bound inspection to the relevant official desktop release evidence; do not equate unrelated or legacy assets with existing managed trust. Stop for explicit reconciliation if history is inconclusive, not remote repair. Add disposable positive/negative cases showing no claim/key/backup/upload on conflicting or inaccessible evidence. Document the operator's decision. **No production replay, rotation, credential access, new workflow or privileged release required.**

Other candidate dispositions:

- **Use:** cooperative create-only claim is justified by approved repeat/partial/concurrent provisioning, including cross-host operation. It is not a lock against independent admin edits. No need to invent a stronger distributed lock.
- **Use:** compare secret creation/update, public update and environment creation/update strictly against signer start; verify both canonical signed release records and reviewed signer at the matching tagged commit. Actual provisioning receipts cannot substitute for that positive witness.
- **Reject:** requiring a successful prior signing witness for genuine *first* setup would deadlock the approved bootstrap. F-CR-001 is an absence/conflict check, not that requirement. Reject branch secret access, a local production signing challenge, retry via a new tag and guarantees against future admin edits.
- No new scenario, ambiguous requirement, held evidence item or architecture redesign. ARCH-REV-001 material-premise rulings retained; defect is implementation alignment with the existing first-use contract.

## Other source and structural checks

| Check group | Result and evidence |
| --- | --- |
| Design health / supplements / data-flow map | One bounded setup transaction and one pre-tag trust gate. M1 and custody completion correctly separate. Contract shortfall is specifically the input to first-use admission. |
| Ownership, boundaries and off-spine work | Shared state reader handles official metadata/policy; generator owns writes; custody owns confirmed unlink; verifier owns witness; shell owns mutations. No app/server-signing responsibility moved. |
| Existing capabilities and shared model | Reuses existing release-record verification, official signing job, Node crypto, authenticated gh and release helper. One SPKI fingerprint, explicit environment ID and secret-generation metadata, no new key service or second persisted client identity. |
| Repeated coordination / indirection | One verifier used by both tag creators. Read/write injection supports isolated tests; code pins verified against all five reviewed files, including the tag-triggered workflow. No empty coordinator identified. |
| Separation, dependencies, placement and layout | Concrete responsibilities under scripts/desktop-package, with two shell calls. No package-manager build needed by a clean checkout; setup depends on verifier only for explicit rotation, not vice versa. |
| Authoritative boundary / explicit interfaces | gh uses fixed official repo/host, sanitized child environment and suppressed child error content. Secret input via stdin only to named environment. Typed single tag policy with no extra gate accepted before upload. Public anchor is canonical Ed25519 SPKI; build jobs retain only public input. |
| Scope, naming, duplication | Desktop-only variable/secret/claim and environment; complete scope listing paginates/count-checks and refuses conflicting declarations. Distinct meanings for setup, local pair, sign witness and release; no server key reuse. |
| Failure handling and legacy | No blind retry or fallback when claim/writes ambiguous; preserving a claim/backup is deliberate. Clean/checked first-use decision still needs F-CR-001. Existing signer checks remain necessary; no compatibility bypass, dead alternate implementation or unnecessary migration. |
| Runtime witness contract | Official successful push, exact workflow/ref/attempt/SHA and signer step, dereferenced tag commit, reviewed code digests, published canonical x64/arm64 record/signature assets with bounded sizes, actual cryptographic verification using today's anchor, scope/generation reread. Bounded automatic search plus validated explicit run ID, not a bypass. Source pins are intentional maintenance points. |
| Tests, fixtures, staleness and executable readiness | 57 Node, six helper and 21 workflow-control checks reported passing. Disposable state and keys; shell tests use temporary repos with a controlled checker to prove no mutation on denial. Not a hosted positive-path or founder-cleanup proof. New first-use case needed before API/E2E. |
| Docs, persistence and cleanup | RELEASE.md documents authority, positive vs negative evidence, custody, bootstrap and no-push gate, but misses conflicting historical release state in initial eligibility. No client/profile/schema transition. Only new external trust metadata and a restricted backup; actual custody/merge tracked separately. Nothing to remove as legacy. |

### Source size

Nonempty lines, base → product: check-release-trust.mjs **0→111**; desktop-key-custody.mjs **0→26**; desktop-trust-state.mjs **0→93**; generate-desktop-signing-key.mjs **0→94**; desktop-release.sh **395→397**. No source exceeds 500 or grows by >220. Tests and guide excluded. No size-based finding.

## Evidence limits

IMP-01/M1 establish the public settings, verified local pair and successful one-time submission, **not remote key equality**. IMP-03 records the correct refusal while no complete witness was available. Read-only reviewer spot-check of official run **44685600710**, attempt 2, matched the actual run/commit/job fields used by the verifier. At the sampled point the signing job had succeeded but publication was still in progress and the two published signature assets were not present. That observation is not a complete witness or a prediction of the eventual result. No release polling/dispatch is required to correct F-CR-001. Do not access the backup in review/QA. Custodian and coordinator alone track explicit founder confirmation; neither final cleanup nor M2 is asserted here.

## Scorecard

| Priority | Category | /10 | Rationale / action |
| --- | --- | ---: | --- |
| 1 | Data-flow spine clarity | 9.2 | Paths explicit; first-use decision must include release state. |
| 2 | Ownership / boundary encapsulation | 9.3 | Narrow writer, verifier and custody owners. |
| 3 | API / interface / command clarity | 9.2 | Scope-qualified upload and witness selection; no new release API. |
| 4 | Separation and placement | 9.4 | Existing release tooling remains the integration point. |
| 5 | Shared structure / data model | 9.3 | One inventory/policy format and fingerprint; extend absence evidence, not signer authority. |
| 6 | Naming / readability | 9.1 | Setup, completion, witness and custody distinguished. |
| 7 | API/E2E readiness | 7.5 | Release-evidence conflict/denial never reaches the default setup decision. |
| 8 | Runtime fidelity | 7.2 | F-CR-001 can misclassify a prior or unknown trust state as first setup. |
| 9 | No compatibility/legacy retention | 9.5 | No weaker fallback or alternate signer. |
| 10 | Cleanup completeness | 9.2 | Reconciliation and confirmed unlink appropriately bounded; real confirmation pending. |

**Overall 8.9/10** rounded; F-CR-001 overrides the mean. No follow-ups. **Latest authoritative result: Fail, implementation-owned Local Fix → /implementation_engineer.** Return a source/evidence delta for rereview before API/E2E. M1 stands; no production operation authorized by this review.
