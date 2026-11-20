# autobyteus-11 — independent release trust validation

API-REV-001 • First QA round after CRR-002 / IR-002, approved SR-001, DS-001, ARCH-REV-001. Medium / High; reviewed route. Branch `fix/desktop-signing-trust` → `origin/personal`. No release authority. See [investigation](api-e2e-coverage-investigation.md), [progress](api-e2e-test-progress.md) and [revisions](api-e2e-revision-record.md).

## Environments

- **Fixture:** Ubuntu 26.04 x86_64 as ordinary user, Node 22.23.2, Python 3.14.4, Git 2.53.0. Clean tracked scripts, workflow and contract inputs archived from review 3a693c7d4fd458418eb17ca3990a55f350dfaaba (same product as 291a6c0d33); no installed project dependencies. Empty QA home and temp, environment allowlist, no credentials or real backups. First baseline, then overlay only the two reported QA test files. No UI, provider, migration or app version transition in scope.
- **Official:** same reviewed checker, gh 2.46.0, official fetch and push origin. Authorized GitHub metadata reads, public record and signature bytes. No secret-value API, no production write. The official reader and the explicit-run verifier queried existing material only. GitHub authenticates the reading operator, not an impersonation of the signer.
- **Evidence:** `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/desktop-signing-trust/tickets/in-progress/desktop-signing-trust/evidence`.

## Cases

| ID / AC | Command or steps; environment | Result and evidence |
|---|---|---|
| API-01 / 001–003 | Fixture: `node --test scripts/desktop-package/*.test.mjs`; actual first-use, provisioning, inventory and custody functions; fake remote responses/secret sink, real temporary filesystem and disposable crypto. | Pass. [73/73 original](evidence/API-01-02-fresh-node.log); [74/74 with QA regression](evidence/API-01-02-with-custody-race.log). Look for “complete paginated history”, “interruption after material write 1” through 6, and “custody reserved during history inspection”. Known skipped-signer bootstrap admitted, exact claim→environment→tag rule→public→upload→unlock; partial, prior-use, denied, truncated, conflict and concurrent reservation refused without unsafe writes. Explicit saved flag plus exact file identity/fingerprint required for synthetic deletion. |
| API-02 / 004 | Same command, witness tests with two independently checked architectures’ records, synthetic timestamps, jobs, tags and signatures. | Pass. [Node log](evidence/API-01-02-with-custody-race.log): “current generation with both verified architectures”, “wrong attempt refuses”, “different signer code refuses”, “invalid arm64 signature refuses”, “permission failure refuses”, “no successful current witness”. Wrong key/time/code/tag/job/asset or unknown state cannot substitute for current proof. |
| API-03 / 004 | Fixture: `python3 -B -m unittest discover -v -s scripts/tests -p test_desktop_release_trust_boundary.py`. Real bash, Node checker and Git; local-only working repo and empty bare origin. All combinations of release / beta / prepare and normal / --no-push. | Pass. [Test result](evidence/API-03-helper.log), [six subcases and assertions](../../../scripts/tests/test_desktop_release_trust_boundary.py). Each reached the real origin refusal with operator recovery text; branch, local and remote refs, tracked bytes, untracked paths and absence of FETCH_HEAD preserved. IMP-02 six helper / 21 workflow checks reused only for unchanged mechanics; those suites were **not** rerun here. |
| API-04 / 001,004 | Official: `node tickets/in-progress/desktop-signing-trust/evidence/API-04-readonly.mjs`; then `node scripts/desktop-package/check-release-trust.mjs` normally and with `DESKTOP_RELEASE_WITNESS_RUN_ID=44685600710`. | Pass. [Read-only probe](evidence/API-04-readonly.mjs), [observations](evidence/API-04-official.log). Single typed tag rule, M1 fingerprint still current, no claim or shadow. Four managed sidecars make another first use inadmissible. Separately, both verifier invocations returned v1.5.14-beta.2 / a728fbcad32a21410e7427bdc70aed9a5baed528 / 44685600710 attempt 2. Current public anchor verified both signed records after run/attempt, tag, generation and five code-pin checks. Not a hash of re-downloaded full AppImages or a new signing run. |
| API-05 / 002,005 | Inspect [M1 receipt](milestone-1.md), [IMP-01 footprint](evidence/IMP-01-provisioning.txt) and RELEASE.md; correlate with API-01's successful synthetic deletion, and refusal on absent confirmation or wrong identity. | Pass for executable custody guards and handoff instructions. Actual founder save and custodian deletion **not tested**: no confirmation received; QA neither observed nor touched the real backup or password manager. M1 was reported already; no M2, merge or release here. |
| API-06 / 005 | Separate fresh no-local, no-tags clone of review 3a693c7d4f; exact frozen install, CI Node/Go gates, Linux x64 unsigned packaging command, layout, updater metadata, Prisma engines and actual packaged server startup. Ubuntu 26.04 (not the hosted 22.04 runner), pnpm 10.28.2 and pinned Go 1.27.4. | Pass. [Clean Linux command record and excerpt](evidence/API-06-clean-linux.log): “Packaged server startup validation passed” and local SHA-256. Earlier host-only setup gaps fixed in disposable tooling; final build from clean outputs. Other platforms, runner secrets, signing/upload steps **not tested** here. This is not a rerun of the Mac-owned workflow or a signed-release result. |

## Acceptance-Criteria Proof

| Critical criterion | Result at this boundary |
|---|---|
| AC-001 • first setup and correct scope | Proven by API-01, API-04 and existing custodian receipt IMP-01/M1. Official reads through the real inventory verified current scope and fingerprint without retrieving private bytes. Repeating first setup is forbidden, and now correctly refused. |
| AC-002 • backup life cycle | Guards proven by API-01/05, original owner-only retained file by custodian's M1 receipt. **Only the user can confirm** the actual backup was saved. Once explicitly confirmed, only the designated custodian removes and verifies the original under the approved procedure. Delivery must seek the confirmation and verified cleanup receipt; no assumption or indefinite retention substituted for either. |
| AC-003 • repeat/conflict/interruption | Proven by API-01, including synthetic interrupted states at every material-write boundary, no new identity on default retry and no downloaded or overwritten real key. Official conflicting-history control in API-04. |
| AC-004 • next stable or beta, no-push included | Proven by API-02/03/04: negative and positive crypto path, byte/refs invariants at actual CLI boundary, and actual public existing-tag witness. No real tag creation needed or authorized. Earlier IMP-03 was a truthful refusal before that successful attempt; do not generalize it to current state. |
| AC-005 • checklist, review, evidence, integration and M2 | Independent validation portion and existing guide/review evidenced here. Actual merge, verified custody cleanup and M2 **not proven**: downstream Delivery/custodian acts after remaining gates. Test-code review is still required. |

## Confidence and broader validation

**Required — live read-only CLI/API.** Repository checks cannot establish actual permissions, scope, schema or current signed records. Official reads in API-04 addressed that gap. The application UI did not change: launching its windows would not exercise this operator decision. The operator-facing CLI was tested directly. An existing Mac-owned release is evidence of current trust at the time of checking, not a decision about the next release.

| Category | Post-repository | After official reads | Basis; residual / improvement |
|---|---:|---:|---|
| Requirement/acceptance proof | 89% | 96% | API-01–05 join executable controls to real public state. Custody confirmation is human-only; future state requires another preflight. |
| Changed-boundary execution | 94% | 98% | Actual generator functions, subprocess commands and official checker; don't repeat the authorized first upload. |
| Integration realism/mock gap | 75% | 96% | Fixtures do not prove the wire. API-04 exercised GitHub and public signatures end to end. Real interruption deliberately not induced. |
| Environment/configuration/identity | 78% | 96% | Current official config and existing signer witness match public M1 receipt. Settings can change later; repeat read-only checks at release time. |
| Failure/recovery/lifecycle | 95% | 97% | Denial/partial history, interrupted writes, new reservation, wrong/stale proofs and real conflict. In-flight live writes not disturbed. |
| Operator surface (no browser or desktop shell needed) | 95% | 97% | Real refusal plus operator recovery advice (six helper variants); actual successful verifier. No tag/push to exercise a success path. |
| Durable regressions | 96% | 96% | New custody race and real-checker helper boundary run without credentials; public live check kept out of hermetic CI. |

Scope: confidence in independently verifiable release-operator behavior, not completion of user custody or delivery. The clean unsigned build adds AC-005 evidence without changing this operator-risk score. Arithmetic mean 88.9% after repository checks, 96.6% after official reads (no final category below 90%). Snapshot proof cannot prevent a later administrative settings change; pinned-code changes intentionally require new review.

## Test delta and cleanup

- Updated `scripts/desktop-package/desktop-trust-provision.test.mjs`: a synthetic custody reservation appears during the history read; assert no claim/upload/file and preservation of the pre-existing note.
- Added `scripts/tests/test_desktop_release_trust_boundary.py`: real helper/checker refusals across all six command forms. No durable tests removed; no product code changed. The `prepare` check protects the real shared pre-tag gate, not a separate compatibility path. No data migration or compatibility-only behavior added.
- `evidence/API-04-readonly.mjs` is an opt-in, ticket-local observation recipe, not an automatic test or production action. The first wrapper run incorrectly assumed every read passes an explicit HTTP method; fixed the wrapper to honor the product reader's default GET and repeated. No product failure.
- Removed the test-owned fixture and clean clone (including private staging tools, temporary Git repos, QA homes, local unsigned image, public test anchor, caches and smoke state). No running user app, production backup or production settings were touched. No product follow-up or missing test dependency.

**Result: Pass — 96.6% for independently executable scope.** Request proportional review of both QA test paths on the reviewed Medium/High route. No M2 or release claim.
