# Code review — desktop signing trust

**CRR-002: Pass for independent executable validation.** F-CR-001 is resolved. The default generator now makes a positive decision about **first use before its first write**. Today’s published desktop signatures are grounds to refuse fresh provisioning; the existing protected signer run and both signatures are, separately, evidence that may satisfy the read-only pre-tag gate. Neither result authorizes another provisioning run, rotation or release.

## Review round and authority

- Round 2, **Full Re-Audit**: IR-002 adds a read-only history stage to the privileged provisioning sequence and shares the workflow/job names with the verifier. Rechecked the complete non-ticket delta from CRR-001, affected callers and existing trust boundaries; reconsidered all structural checks and scores. Unchanged custody, workflow, shell integration and failure tests retain their original evidence, not new execution claims.
- `fix/desktop-signing-trust` → `origin/personal`; base `a728fbcad3`, source `291a6c0d33`, received `89f45b99c9e6ce92fbd2e253a3d26f0ce4eb8e18`. Prior CRR-001 Fail at `72d59d7796`; IR-001/002. Approved SR-001, DS-001, ARCH-REV-001 Pass; API-REV and DR N/A. **Medium / High confirmed**, given durable signing authority despite bounded release-tool changes.
- Basis: requirements, investigation, solution and architecture history, design spec and review, implementation handoff/revision record, M1 and IMP-01–05. Project AGENTS/DESIGN/TESTING/RELEASE, shared design principles, ticket scope and scenario gate. No new supplement, business decision or support promise.

## Behavior and supported production paths

| Approved basis / independent trigger | Source conclusion |
| --- | --- |
| SCN/BEH-001: designated custodian sets up trust once | Validate official admin-visible scopes/local destination → inspect release evidence → recheck scopes/destination → create-only nonce claim → generate one Ed25519 pair and exclusive private backup → verify exact environment policy before private upload → read back public footprint. Pass. M1 remains provisioning evidence, not proof of remote signing. |
| 002: founder needs a durable backup | Only the custodian communicates its path. Exact file identity, owner/mode/link count and public fingerprint guard removal after explicit saved confirmation. Pass at source; real acknowledgement/removal is **not** asserted. |
| 003: unexpected, partial, concurrent or repeated setup | Missing settings alone cannot establish first use. Conflicting history/read errors stop before claim; ambiguous writes preserve custody/claim, no blind retry. Separately authorized replacement requires prior fingerprint and positive witness; it is not a recovery path here. Pass. |
| 004: owner prepares a stable/beta release (including no-push) | Both shell paths invoke the read-only verifier before version/commit/tag/push. Verifier requires official origin, exact settings/policy, qualifying push/tag commit and attempt, pinned signing code, successful signer after current generation, both signed records under current anchor, then rereads settings. No private read, sign operation, or witness bypass. Pass. |
| 005: integration and milestone reporting | Guide covers routine release readiness, once-only setup and founder confirmation. Independent validation, approved merge, verified cleanup and M2 remain downstream. Mac owns existing-tag release operations. |

### Prior finding and candidate gate

**F-CR-001 — resolved at source; supported SCN-001/003, this ticket.** The trigger was an authorized operator seeing empty settings/local destination while official evidence of a previous desktop signer might exist or could not be inspected. That decision is explicitly in DS-001; it does not rely on a hostile administrator or a synthetic caller.

1. In `generate-desktop-signing-key.mjs`, the default branch calls `requireFirstUse(historyRequest)`, then `samePrior(null)` and `local()` **before** the claim POST, directory creation, key generation or stdin upload. A settings/claim change observed during inspection cannot inherit the earlier eligibility. The explicit replacement branch retains its stronger existing-witness requirement.
2. `desktop-first-use.mjs:inspectAssets` queries the fixed official repository for release IDs, tags and asset **names** only. It bounds the collection, checks total/unique releases and cursor progress, refuses incomplete asset lists and any managed sidecar (even a partial pair), and requires the known bootstrap release to be accounted for. Unsigned legacy AppImages, Android and server assets do not themselves imply managed desktop trust.
3. `inspectRuns` checks the official workflow's counted run history from the introduction day, including non-push events; matches the known bootstrap run/tag/SHA; distinguishes known pre-managed workflow bytes from the managed workflow at the run commit. Every relevant managed attempt must be accounted for and its named signer completed/skipped. Unknown code, changed identity, executed signer, denial, missing history or inspection bounds refuse with reconciliation guidance. This is an absence-of-conflict check, **not** a demand for a previously successful signer to bootstrap.
4. IMP-04 demonstrates the old first-mutation counterexample, clean 73/73 Node tests, genuine first-use fixture, earlier successful attempt despite a later skip, conflict/denial/truncation and no-write/no-backup controls. IMP-05 shows the actual current history reader refusing on the four public managed sidecars. No real first setup was repeated to prove the fix.

**Other candidates:** The fixed bootstrap identifiers and two workflow blob identities are public evidence anchors for this official repository, not signing keys or a replaceable registry. Review checked the actual six returned run IDs/SHAs in the introduction window read-only; the five pre-bootstrap run commits resolve locally to the configured legacy blob and beta.2 to the managed blob. This supports the historical compatibility decision; unknown history intentionally asks for reconciliation. A guarantee that a privileged administrator can never erase history, an unlimited archive scan or a production rotation exercise is unsupported and not required. No held candidate, new material premise or follow-up.

## Structural and design checks

| Checks | Result / basis |
| --- | --- |
| Design health, approved artifacts, data-flow ordering | Pass. Two distinct trust decisions: default absence-of-conflict and release-time positive proof. New input arrives before mutation; normal release preparation does not scan first-use history. |
| Ownership/boundaries, off-spine concerns | Pass. First-use reader is metadata-only; shared module owns official scope/policy names; generator owns writes; separate custody cleanup and signer-witness readers; shell alone owns tag mutation. |
| Existing capabilities, reusable structures, shared model | Pass. Existing API/pagination and crypto verifier reused. No parallel truth store or new private data format. Fixed public historical anchors are not fallback keys. |
| Coordination, empty indirection, separation of concerns | Pass. One first-use eligibility stage, one cooperative claim; history reader performs distinct bounded work. No retry or key generation in the history reader. |
| Dependency direction, visible dependencies, authoritative boundaries | Pass. Explicit request injection is for tests; CLI uses fixed production reader. Exact typed tag-only policy, environment ID and public readback before scoped stdin upload. Verification uses only public metadata and bytes. No server or build-job private access. |
| Placement, split/flat layout, interface and naming | Pass. Coherent scripts under desktop-package. Shared workflow/signer names extracted unchanged. First-use guard, confirmed removal and pre-tag witness have distinct APIs and outcomes. |
| Duplication, accumulated patches, dead code, legacy | Pass. No fallback from first-use refusal to replacement, no duplicate workflow, no stale unguarded tag branch. Supported legacy asset recognition does not authorize signing or schema compatibility. |
| Behavioral assertions, fixture isolation/cohesion, stale tests | Pass. Disposable history fixture and clean temp home, explicit before-write assertions, multi-page/attempt cases and preserved rotation isolation. Existing stable/beta helper tests use controlled checker exits, not the real cloud wire. No stale duplicate identified. |
| API/E2E readiness | Pass. Real negative **and** positive read-only boundaries now have evidence; QA can independently validate both without handling the backup or running a release. |

**Size, data and docs:** Effective lines base → current: check-release-trust 0→109, desktop-first-use 0→76, desktop-trust-state 0→94, desktop-key-custody 0→26, generate-desktop-signing-key 0→96, desktop-release.sh 395→397. All ≤500, no >220 effective delta. Tests/fixtures excluded. No client/profile migration, signer format change, backward-compatibility layer or obsolete path to remove. RELEASE.md now distinguishes an eligible historical bootstrap from missing settings alone and documents the reconciliation boundary. Documented M1 and founder cleanup remain separate.

## Evidence and limits

Reviewed IMP-04/05 against the actual source and test deltas. IMP-05 separately records the successful read-only pre-tag verifier result for the **Mac-owned** existing tag `v1.5.14-beta.2`, official run `44685600710` attempt 2, commit `a728fbcad3`. It used public release records/signatures for both architectures and current scope/generation metadata. IMP-03's earlier refusal was correct at that earlier time. IMP-02's 57 Node, six helper and 21 workflow controls retain their original scope; only the 73 Node tests are claimed as rerun by implementation in IR-002. The reviewer checked public run metadata and git blobs, not a second generator run, live mutation, suite rerun, or inspection of the founder's backup. Approval is a source finding disposition, not a guarantee about future administrative changes.

## Scorecard

| Priority | Category | /10 | Rationale / action |
| --- | --- | ---: | --- |
| 1 | Data-flow spine clarity | 9.4 | First-use eligibility now explicitly precedes claiming trust. |
| 2 | Ownership / boundaries | 9.3 | Public inspection separated from mutation and private custody. |
| 3 | API/interface/command clarity | 9.2 | No more implicit first-use inference; signer selection cannot bypass proof. |
| 4 | Separation / placement | 9.4 | Single focused history reader, limited to initial setup. |
| 5 | Shared model | 9.3 | Existing scope/policy representation and signature formats retained. |
| 6 | Naming / readability | 9.1 | Setup, claim, first use, witness and confirmation distinct. |
| 7 | API/E2E readiness | 9.3 | Safe executable cases with realistic metadata and bounded read-only real controls. |
| 8 | Runtime fidelity | 9.3 | Previously missing conflict/unknown decision now covered before any write. |
| 9 | No legacy retention | 9.5 | No alternate trust mechanism or tag bypass. |
| 10 | Cleanup completeness | 9.2 | Source cleanup controls retained; operator confirmation remains a delivery dependency. |

**Overall 9.3/10; Pass.** No open findings. Primary next owner **/api_e2e_engineer**. Independent validation: exercise both historical decisions, denied/incomplete reads and preclaim no-mutation using disposable fixtures; validate release-helper stable/beta/no-push/prepare guards in isolated repos and verify available real official evidence **read-only**. Never rerun production provisioning, use the real private backup/key, rotate, sign, dispatch, tag or publish for this review/QA. M1 stands. M2 is not complete.
