# DR-007 Integration Recovery — Local Fix

- Date: 2026-09-11
- State: **Blocked — Local Fix**; no current integrated user-verification candidate.
- Classification: **Large / High / architecture-reviewed**, unchanged.
- Current upstream chain: `RER-026 / AD-REV-018 / ARCH-REV-016 Pass / IR-034 / CRR-050 Pass / API-REV-019 Pass / CRR-051 Not Applicable`.
- Source: `2221322710a6a1f5dae06a74135bca008aef88a6`; artifact: `a5eae9ce3889e6100302a85da54e5b1a02c25176`.
- Protected ticket HEAD: `7c1ef261933eeb7b9912cb30f599ebf34864d31e` on `requirements/flat-agent-organization-model`.
- Latest fetched target: `origin/personal@5645b49d6f51faa60bd3545bc8e3f0e7e3f96793`; **11 base-only commits**.
- Merge command: `git merge --no-edit origin/personal`; failed with **17 conflicting paths**.
- Recovery: all conflict hunks/index stages captured; `git merge --abort` restored the exact checkpoint. Zero unmerged/staged/tracked differences immediately after abort; 2,086 pre-existing dirty/untracked file hashes verified without mismatch. Subsequent modifications are DR-007 blocker records only.

## Reconciliation Boundaries

1. GeneralProcessRunSupervisor and application execution kernel: preserve flat-Team execution factories, separate AgentOrg root scope, active-root directory, exact routing/lifecycle, and collaboration location/history owners while integrating the base's `RunModelSelectionValidator` dependency and stopped-run compatible model behavior. Do not reintroduce `MixedTeamManager`/recursive configured Team architecture from the base hunk.
2. AgentTeamRunManager and model-config mutator: retain flat configured-Agent membership and root ownership while supporting the base's complete model-selection patch and read-back verification. Audit auto-merged imports/call sites, not only conflict markers; a renamed validation service can leave apparently clean references unresolved.
3. Shared RuntimeModelConfigFields and Team configuration adapters: preserve exact scope readiness/failure/Retry and no stale launch payload while adopting the base's `ExistingRunModelSelection` and directly-edited propagation. Keep flat Team member disclosure and current locked AgentOrg member configuration/Back/New semantics; do not accidentally unlock Org identity or restore recursive configured Team forms.
4. Reconcile the five conflicted server tests and three conflicted docs against the combined behavior. The exact 17-path list and conflict patch are attached; test expectations must not simply discard either approved behavior.
5. Renew focused tests for base model-selection save/read-back, standalone Agent/Team lifecycles, application-scope injection, flat Team/Org launch readiness, configured-member message presentation, IR-033 Apollo-shaped edits, and IR-034 exact settlement/Offline projection. Then perform implementation validation and applicable cumulative source review/API-E2E routing before returning to Delivery.
6. On Delivery re-entry, repeat latest-base fetch/integration, docs sync, full current ARM64 package generation and shell launch, then obtain explicit user verification before any finalization/release.

These are integration/source corrections, not newly invented requirements or an architecture replacement. If preserving the two approved contracts reveals genuine intended-behavior ambiguity, stop and use the implementation stage's upstream routing rules rather than guessing.

## Ownership / Evidence Safety

The local checkpoint stages only 15 explicitly named tracked documentation/review files. All 2,071 raw untracked evidence files remain unchanged and unstaged; the protected archive/manifest location is in `checkpoint-scope.log`. Raw runtime databases, copied environment files and keys are not suitable for indiscriminate staging or publication. Preserve them; Delivery must explicitly audit/exclude sensitive/runtime artifacts before final publication. Do not use `git add .` or `git add -A`.

## Prior Validation And Artifact

API-REV-019 remains Pass at 95.4% for `a5eae9ce3889e6100302a85da54e5b1a02c25176`; it is not a Pass for an unproduced merge. Counts: server 59 files/289 tests; web 141/859; Electron 9/39; extra migration/summary/startup 3/28. Builds, guards, audit and Brief Studio passed; immutable fixture 18/18 and other-owner 10/10 integrity were recorded. No test-code delta at CRR-051.

The existing upstream AppImage is 1.4.68, 524,007,664 bytes, SHA-256 `dfceecd28aa4902865ba3559b5a2193a09d290b272562ac0ac33f734638aa9c3`, freshly matched against API-REV-019/final/integrity.log. It predates the target's 1.4.69 release and is **not** a post-integration DR-007 build. Delivery did not rebuild or launch it in this round.

## Bounded Evidence

- Successful queue passage is inferred from exact durable changes within matching local MCP HTTP intervals. Independent JSON-RPC ingress/request-ID and FIFO executor-start timestamps were not captured; root/nested Org controls preceded access logging.
- The inspected direct-task sample records initializing-to-Offline. Do not call it an independently observed Running-to-Offline sample. Task-Team terminal Offline convergence, durable settledAt, and healthy remaining status scope are directly supported.
- Production Chromium proves bounded automatic recovery exhaustion. Subsequent normal history selection/Restore establishes a clear complete view; it is not in-place automatic recovery of the exhausted instance.
- API-FIND-025 was a corrected exact-root Stop locator, not a product fix. API-FIND-024/026 are historical Not Reproduced stalls on corrected auto-approved/reference-valid paths, including task-to-task delivery; no original source cause was established and no retry/replay/timeout change is authorized.
- No native-shell manual launch or multi-node deployment is claimed by API-REV-019. Raw harness corrections and retrospective repository-only scoring remain explicit in API-REV-019/case-reconciliation.md.
- External definition publication and unrelated broad Nuxt/fixed-px baselines remain outside ticket attribution.

## Required Route

`get_handoff_rules` selected the code/packaging Local Fix rule: `/software_engineering_team/implementation_engineer`. No terminal completion or Requirements return is eligible.
