# Code review — protected Ubuntu AppImage

## CRR-007 — implementation source rereview, 2026-11-19

**Pass for independent API/E2E validation.** F-CR-003 is resolved in source. The desktop refusal now distinguishes loss of connectivity, unavailable official verification files, and a download that cannot be verified. Every case still stops before authorization. F-API-03/04 remain source-resolved; **API-REV-003 remains Fail pending independent current-package execution**.

- **Round 7, Targeted Delta Review** after CRR-006 Fail. The complete non-ticket diff against `2aa53e656a` consists of two existing production paths (`internal/acquire/record.go`, the caller's image-open error in `cmd/launcher/main.go`), one acquisition test and the Linux user guide. Same callers, Fetch signature, control flow, trust decision and request/response types. The exported safe error is used by the already-dependent launcher, not a new process or command contract. Rechecked the affected source, bounded return values, tests, docs, size and scores; carried forward the unaffected structural checks from the CRR-006 full audit.
- Reviewed source `8f10fa9287`, received `ca2e88097705c878ec431ba869276be6e4a20c32`. Branch `fix/ubuntu-appimage-sandbox-startup` → final target `personal`. Personal base `f7b4d687`, integration merge `bc87bef825`. Ticket-relative evidence references below.
- Approved SR-012 requirements and scope; DS-004/SR-016, ARCH-REV-004, SR-015 isolated native CI and unchanged manual-refusal/stage-lifetime clarifications. Trigger: IR-007 handoff/history and CRR-006 F-CR-003. API-REV-003/CRR-005/IR-006 remain relevant to the outstanding graphical retests; DR N/A. Project DESIGN/TESTING guidance and shared design principles retained.
- **Large / High** unchanged; signed first install, native privilege boundary and protected update lifecycle still justify independent source review. No reviewer changes to product or test code and no release authorization.

## Behavior and production-path basis

| Approved scenario | Actual trigger, path and preserved outcome | Assessment |
| --- | --- | --- |
| SCN-001 / BEH-001, normal | User opens official download on restricted desktop. Classified sandbox failure → consent → acquire signed evidence → sealed helper/Ubuntu authorization → verified protected copy, original-user launch | Acquisition refusals now explain the appropriate action before any authorization. Mainline retained. |
| SCN-002 / BEH-002, normal | Direct/menu launch on capable or enrolled desktop. Absent root remains unmanaged; verified root redirects/opens canonical GUI | Healthy-path checks unchanged; verified-image failure does not become “absent.” |
| SCN-003 / BEH-003, operational | Packaged Node/server invokes original ELF before managed GUI routing | No enrollment, auth, or new status handling in Node mode. |
| SCN-004 / BEH-004, normal and explicit edges | User manually requests restart or later independently quits; writer compares signed candidate/live identity. Session stops server before activation, supervisor reopens only on confirmed explicit handback | No changed updater/writer policy. Client and canonical restart still reject a failed Managed check. Prior API-REV-003 independent update/notification/continuity results apply to the tested bytes. |
| SCN-005 / BEH-005, explicit refusal/removal | User opens valid download against incomplete enrollment, or consents to setup when a precondition fails. No re-enrollment/bypass; explain what to do; preserve/roll back owned resources only | All three observed refusal paths have source-level fixes. No automatic repair, reenrollment or recovery from an unsigned source. |

## Candidate gate and finding resolutions

**F-API-03 — resolved in source (supported, this ticket).** `internal/launch/managed_linux.go:15–51`: absent per-user root alone returns absent; otherwise `verifiedImage` preserves protected ancestor/support checks, service identity and non-writable regular live file. Any verification failure returns no executable, sends raw detail to stderr, and returns fixed repair language with the per-user root derived by `install.ForUID`, not input text. Initial `cmd/launcher/main.go:47–55` rejects before both launch and uninstall dispatch; `launch.Explain` receives the action, not just the diagnostic. No blocked-uninstall advice or automatic repair. IMP-39 shows old/new GUI controls, unchanged synthetic marker and no fallback; original inode restoration was a fixture reset, not user guidance.

**F-API-04 — resolved in source (supported, this ticket).** `internal/install/provision_linux.go` retains the measured-volume preflight and its deferred rollback. Only this preflight returns ErrInsufficientInstallSpace. `cmd/provision/main.go:46–56` distinguishes that sentinel (including wrapping) from a matching string and unrelated subprocess errors; one shared status is declared in `internal/protocol/provision.go`. `internal/launch/authorize_linux.go:67–95` maps status 78 only for provision; 126, 127, unknown/start/signal and uninstall do not masquerade as storage failure. No parsing helper output, new credentials, altered trust or status-as-authorization. GUI identifies the install volume and a safe make-room/admin/retry step. IMP-40 distinguishes real successful authorization/low space, actual cancellation and an unrelated refused volume; rolled back test install and unchanged work checked separately. Restoring normal capacity enabled normal setup/removal.

**F-CR-003 — supported explicit edge, this ticket; resolved in source.** Trigger: a desktop user chooses Install on a restricted host and the official release files are unavailable, unreadable or invalid. SR-012 AC-003 and DS-004 “Access and refusal” require a safe next action *before* authorization; prior real API-07/07b dialogs established the gap.

| Current source return path (under `autobyteus-web/linux-install`) | Outcome verified |
| --- | --- |
| `internal/acquire/record.go:get` — connection/response-read error vs non-200 | Connection/interruption returns bounded reconnect/retry advice. Missing record **or signature** returns retry later/support for this release's unavailable verification files, displaying only the numeric status. No response body/header/redirect URL echoed. |
| `get` / `Fetch` / `verifyDownload`, or `cmd/launcher/main.go` open failure | Oversized or unverifiable evidence, version/arch mismatch, unreadable image, wrong file size/digest return fresh official download/support guidance. Fixed text; no raw path or returned usable record/signature. |
| Successful acquisition | Build-pinned target and redirect/read bounds unchanged. Verify signed record for the expected release, hash bytes on the same regular handle and rewind it; launcher only then invokes the sealed provisioning helper, which still independently verifies the stream. No alternative trust path, additional network retry, writable-target change or new privilege. |
| Visible desktop result | Launcher returns the selected error directly to `Explain`. IMP-42 screenshots distinguish retry-later from fresh-official-copy, not just from a nonzero exit. Audit-log positive control: the sole pkexec execution in the observed interval belongs to restored valid assets, after all refusals, and the prompt was deliberately canceled. |

**Other candidates:** A new automatic repair/remove feature is rejected: neither approved refusal contract authorizes mutation in those cases. A second error transport for the existing post-auth branch is not needed: the bounded status already carries that contract. F-API-01/02 remain independently verified in API-REV-003 (including direct/menu explicit successors); F-CR-001/002 remain resolved. No held candidate. MP-001 (actual restart-context mount failure) is unchanged; no new material premise beyond the supported refusal scenarios above. Scenario and material-premise basis: confirmed.

## Structural and design checks

| Check | Result and basis |
| --- | --- |
| Design health | Pass — the correction supplies actionable recovery on the original pre-auth refusal path, without weakening it. |
| Supplements | Pass — returned status does not redefine automatic failure, stage lifetime, release isolation or authority. |
| Spine clarity | Pass — detection, unprivileged acquisition, privileged setup, routine writer and manual handback remain explicit. |
| Boundary clarity | Pass — helper owns storage diagnosis; desktop owns wording; neither decides trust from an error. |
| Off-spine concerns | Pass — terminal diagnostics separate from fixed post-auth GUI copy. |
| Existing capability reuse | Pass — existing process status/Explain, no IPC service. |
| Reusable structures | Pass — common status value owned once by the protocol. |
| Data-model tightness | Pass — no schema, general command or new persistent grant. |
| Coordination ownership | Pass — app quit, setup and writer remain independent owners. |
| Empty indirection | Pass — verifiedImage performs real checks; mapper separates status from UI. |
| Separation/file responsibility | Pass — preflight, process exit, presentation and protected-file verification at their owning layers. |
| Dependency direction | Pass — launcher/provision depend on protocol value, not on one another's implementation. |
| Visible dependencies | Pass — ForUID, Managed, Authorize and underlying process status explicit. |
| Authoritative boundary | Pass — fixed files and signed bytes; no caller-provided privileged path or output-as-command. |
| Placement | Pass — changes in Linux install/launch/protocol, user guide and tests. |
| Partitioning | Pass — narrow additive native status, no extra layer. |
| Interface/command identity | Pass — status 78 operation-scoped; unknown/uninstall do not become low space. |
| Naming | Pass — sentinel and exit constant distinguish measured preflight from incidental text. |
| Duplication | Pass — no repeated credential, rollback or verification policy. |
| Patch layering | Pass — local change at each failure origin; does not add fallback behind rejection. |
| Dead code | Pass — all new functions/status have callers; old generic post-auth wrapper removed. |
| Test assertions | Pass — actual Fetch exercised with real signer/verifier and open file; assert action, bounded/redacted failure and request order, plus positive exact-evidence/rewind control. IMP-42 separately observes GUI and authorization. |
| Fixtures/helpers | Pass — owner-level tests plus actual graphical fixtures; no production keys or end-user profile. |
| Stale tests | None identified in implementation delta; successful API test-code review not triggered. |
| Readiness | Pass for independent validation. AC-003 counterexamples have source-level fixes; independent current-package closure is still required. |

## Source size, legacy and docs

`evidence/CRR-007-source-size.tsv` updates the 56-path cumulative production inventory; tests excluded. This round: acquisition 109→124 nonempty lines, launcher 119→119. Prior maximum growth +211 and maximum current size 500 unchanged; no >220 or >500 trigger. No new subsystem, persisted state, migration, compatibility branch, dead fallback or unused recipient of the new guidance. The guide now names the official releases page and distinguishes service availability from an invalid download; documentation supplements, not replaces, the dialog. No follow-ups.

## Evidence and limits

- Read implementation Checks Run, full source/test diff and IMP-41/42. On the prior code eight acquisition subcases failed; on reviewed source all ten passed within the 20-top-level-case native module run. The test stubs the local HTTP transport (restored after the test), not verification or file hashing. It checks exact pinned requests, suppressed raw errors, unusable results on failure and exact evidence/handle position on success.
- The implementation-owned Noble x64 GUI witness uses a signed full test fixture with rebuilt native assets and retained full application payload, separate test origin/trust. Inspected missing-file and mismatched-download dialog captures; IMP-42 also records oversized, bad signature and offline controls. No install components or change to synthetic work on refusal. This is not clean hosted CI, independent QA, or a live production-network result.
- No repeat tests, VM run, secret access, push or release by reviewer. No change to IR-006 managed verification/post-auth handling, native writer, release workflow or managed restart contracts. IMP-38–40, earlier API-REV-003 Ubuntu launches, signed updates and native x64/ARM64 smoke retain their original bounds, not current-package acceptance.

## Scorecard

| Priority | Category | Score / 10 | Rationale / action |
| --- | --- | ---: | --- |
| 1 | Data-flow spine clarity | 9.5 | Distinct pre- vs post-auth return paths; no hidden route. |
| 2 | Ownership and boundary encapsulation | 9.5 | Helper measures; desktop explains; writer and supervisor remain distinct. |
| 3 | API/interface/command clarity | 9.4 | Same Fetch result; fixed safe messages express access vs verification failure. |
| 4 | Separation and placement | 9.4 | Corrections at existing process/verification boundaries. |
| 5 | Shared structure/model | 9.4 | Shared status without a new storage or transfer schema. |
| 6 | Naming and readability | 9.3 | Cause/status distinguishable; no arbitrary output trusted. |
| 7 | API/E2E readiness | 9.3 | Current source, sensitive regression and bounded real GUI evidence justify independent rerun. |
| 8 | Runtime correctness and behavioral fidelity | 9.3 | Correct pre-auth action and no authorization on refusal; IR-006 distinctions preserved. |
| 9 | No legacy retention | 9.5 | No fallback on trust failure or data migration. |
| 10 | Cleanup completeness | 9.3 | Existing rollback/owned cleanup preserved; evidence distinguishes rollback from recovery guidance. |

Rounded summary **9.4/10**; not a pass rule. No speculative score deduction.

## Latest result and route

**CRR-007 Pass — Targeted Delta Review, Large / High.** No open source findings, held material premise or active failure classification. Next owner **/api_e2e_engineer**. API-REV-003 remains Fail until independently superseded. Repeat current-package pre-auth missing/invalid/mismatch and connectivity controls, both IR-006 desktop refusals and their state/rollback controls, and SR-015 secret-isolated native x64/ARM64 packaging and smoke. Earlier scoped evidence remains reusable for unchanged behaviors; do not claim the local fixture is hosted CI. Successful-test review (including QA's writer test change) only after successful API/E2E. No delivery, publishing or release.
