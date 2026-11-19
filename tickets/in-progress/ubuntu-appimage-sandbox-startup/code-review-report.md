# Code review — protected Ubuntu AppImage

## CRR-006 — implementation source rereview, 2026-11-19

**Fail — one implementation-owned Local Fix, F-CR-003.** IR-006 resolves both submitted findings at source: an incomplete enrollment now names the administrator repair step, and an authorized low-space refusal now tells the desktop user where to make room. A separate, earlier step in the **same AC-003 install journey** still gives only a technical reason when release evidence is missing or invalid. Retained graphical evidence and unchanged source establish this independently of the IR-006 fixtures. Do not reopen F-API-03/04 to track that different path.

- **Round 6, Full Re-Audit**: the change introduces a shared helper/launcher exit-status contract; rechecked the structural checks and scorecard, then followed both the changed and retained refusal branches through the *actual user-facing error*. Full structural review is not a new host-matrix execution.
- Received `7777348208aeba9902de448a1eca4ea6def78a41`, product `1d21c76fd3`, on `fix/ubuntu-appimage-sandbox-startup` → final target `personal`. Compared against CRR-005 `b803a1086d` (product `c90f3ba8f2`) and retained CRR-004 source audit. Personal base `f7b4d687`; merge `bc87bef825`. Evidence paths relative to this ticket.
- Authorities: `requirements-doc.md` approved SR-012; investigation, solution revision history through SR-016, `design-spec.md` DS-004, ARCH-REV-004 design review, manual refusal and stage-lifetime clarifications, SR-015 native CI disposition. Trigger: IR-006 implementation handoff/history after API-REV-003 Fail / CRR-005. Project DESIGN.md, TESTING.md (visible recovery guidance separate from rollback), shared design principles, Example 7 and scope rules apply. No new requirement, privilege, prerequisite or actor. Delivery revision N/A.
- **Large / High unchanged**: privileged one-shot setup, nonroot installation writer, signed release identity and managed process lifetime still span critical boundaries. No downstream forwarding on this result. No code or durable test fix by reviewer.

## Behavior and production-path basis

| Approved scenario | Actual trigger, path and preserved outcome | Assessment |
| --- | --- | --- |
| SCN-001 / BEH-001, normal | User opens official download on restricted desktop. Classified sandbox failure → consent → acquire signed evidence → sealed helper/Ubuntu authorization → verified protected copy, original-user launch | Mainline retained. Acquisition refusal before authorization is independently required; see F-CR-003. |
| SCN-002 / BEH-002, normal | Direct/menu launch on capable or enrolled desktop. Absent root remains unmanaged; verified root redirects/opens canonical GUI | Healthy-path checks unchanged; verified-image failure does not become “absent.” |
| SCN-003 / BEH-003, operational | Packaged Node/server invokes original ELF before managed GUI routing | No enrollment, auth, or new status handling in Node mode. |
| SCN-004 / BEH-004, normal and explicit edges | User manually requests restart or later independently quits; writer compares signed candidate/live identity. Session stops server before activation, supervisor reopens only on confirmed explicit handback | No changed updater/writer policy. Client and canonical restart still reject a failed Managed check. Prior API-REV-003 independent update/notification/continuity results apply to the tested bytes. |
| SCN-005 / BEH-005, explicit refusal/removal | User opens valid download against incomplete enrollment, or consents to setup when a precondition fails. No re-enrollment/bypass; explain what to do; preserve/roll back owned resources only | Repair/low-space fixed; pre-authorization missing/invalid release evidence still lacks the required next step. Scope includes all three, not general-purpose system repair. |

## Candidate gate, resolutions and finding

**F-API-03 — resolved in source (supported, this ticket).** `internal/launch/managed_linux.go:15–51`: absent per-user root alone returns absent; otherwise `verifiedImage` preserves protected ancestor/support checks, service identity and non-writable regular live file. Any verification failure returns no executable, sends raw detail to stderr, and returns fixed repair language with the per-user root derived by `install.ForUID`, not input text. Initial `cmd/launcher/main.go:47–55` rejects before both launch and uninstall dispatch; `launch.Explain` receives the action, not just the diagnostic. No blocked-uninstall advice or automatic repair. IMP-39 shows old/new GUI controls, unchanged synthetic marker and no fallback; original inode restoration was a fixture reset, not user guidance.

**F-API-04 — resolved in source (supported, this ticket).** `internal/install/provision_linux.go` retains the measured-volume preflight and its deferred rollback. Only this preflight returns ErrInsufficientInstallSpace. `cmd/provision/main.go:46–56` distinguishes that sentinel (including wrapping) from a matching string and unrelated subprocess errors; one shared status is declared in `internal/protocol/provision.go`. `internal/launch/authorize_linux.go:67–95` maps status 78 only for provision; 126, 127, unknown/start/signal and uninstall do not masquerade as storage failure. No parsing helper output, new credentials, altered trust or status-as-authorization. GUI identifies the install volume and a safe make-room/admin/retry step. IMP-40 distinguishes real successful authorization/low space, actual cancellation and an unrelated refused volume; rolled back test install and unchanged work checked separately. Restoring normal capacity enabled normal setup/removal.

**F-CR-003 — open, promote / this ticket: pre-authorization acquisition refusals lack recovery guidance.**

- **Independent trigger/authority:** A desktop user chooses Install for a launcher-bearing download. DS-004 “Access and refusal” explicitly includes missing sidecars, size/signature errors and release/image mismatch and requires the launcher to distinguish retrying access from an invalid official download. REQ-003 / AC-003 require refusal to explain recovery. The requirement predates the error branches and the test feed.
- **Current path:** after consent, `cmd/launcher/main.go:97–103` returns `acquire.Fetch`'s error as-is, before `Authorize`. `internal/acquire/record.go:47–69,84–112` returns HTTP/size errors and unwrapped release verification or image-mismatch errors. `cmd/launcher/main.go:116–121` → `internal/launch/consent_linux.go:40–46` displays that text, with no next action. IR-006's status-to-dialog mapper cannot be reached: there is no privileged process in this branch.
- **Concrete evidence:** inspect `evidence/API-07-404-error.png` (“official release sidecar unavailable (HTTP 404)”), `API-07-oversize-app.log` / `API-07-oversize-error.png`, `API-07b-invalidsig.png` (“release signature refused”), and `API-07b-mismatched.png` (“outer AppImage is not the signed regular file”). Only an OK button is offered. `API-07b-refusals.log` records the no-install controls. These screenshots are historical; compared their source path to this HEAD: acquisition, release verification and Explain unchanged, as is the launcher's Fetch-error return. They prove the previously reported **bounded refusal-before-auth pass**; they do not prove actionable recovery. In contrast the offline/redirect path really does say “reconnect and retry” (API-07c).
- **Consequence and correction:** user is safely stopped but cannot tell whether to retry when the official release is available or stop using unverifiable bytes and obtain the release again from the official source / seek support. Surface bounded, appropriate next actions on this acquisition path; preserve the existing positive network-retry control, pre-auth refusal, redaction, signed checks and no alternate trust or automatic retry. No new service, privileged repair, universal error framework or new platform requirement. Regression evidence must distinguish unavailable evidence from invalid/mismatched evidence on the graphical surface.

**Other candidates:** A new automatic repair/remove feature is rejected: neither approved refusal contract authorizes mutation in those cases. A second error transport for the existing post-auth branch is not needed: the bounded status already carries that contract. F-API-01/02 remain independently verified in API-REV-003 (including direct/menu explicit successors); F-CR-001/002 remain resolved. No held candidate. MP-001 (actual restart-context mount failure) is unchanged; no new material premise beyond the supported refusal scenarios above. Scenario and material-premise basis: confirmed.

## Structural and design checks

| Check | Result and basis |
| --- | --- |
| Design health | Pass for boundaries; behavioral conformance exception F-CR-003. |
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
| Test assertions | Pass for IR-006; prior API-07 coverage demonstrates rejection, not the separate F-CR-003 recovery action. |
| Fixtures/helpers | Pass — owner-level tests plus actual graphical fixtures; no production keys or end-user profile. |
| Stale tests | None identified in implementation delta; successful API test-code review not triggered. |
| Readiness | **Fail for AC-003** — F-CR-003 counterexample. Other confidence does not override it. |

## Source size, legacy and docs

`evidence/CRR-006-source-size.tsv`: **56 changed implementation-source paths** in the cumulative inventory, tests excluded. AppUpdater unchanged **500** nonempty; largest effective growth **+211** (provisioning); no >500 or >220-delta trigger. IR-006 production files: provision main 53, preflight 211, authorize 89, managed check 99, shared constant 4. No arbitrary split.

No legacy retention or system/data migration. Retain supported portable/native paths; no version-dependent alternate signer, permissive read, unprotected launch or force-removal. No dead/obsolete item identified. User guide `autobyteus-web/docs/linux-managed-desktop.md` correctly distinguishes repair and freeing the install volume; it does not replace the in-dialog AC-003 contract. No new follow-up or independent design recovery.

## Evidence and limits

Reviewed the handoff Checks Run before considering test execution. IMP-38 records 19 Go top-level cases and full signed disposable x64 layout verification; inspected actual added tests for typed-vs-text, exit classification and absent-vs-incomplete semantics. IMP-39/40 show Noble graphical repair, storage, cancellation, unknown, restored capacity/removal and preserved work. Reviewed actual dialog captures separately from logs. The local package rebuilt native assets using a retained full desktop payload; **not clean native CI**. Acquisition defect is settled by the current source and existing graphical evidence, so no duplicate suite/VM run by reviewer. Older Ubuntu/update and x64/ARM64 native CI results remain scoped, not an IR-006 byte-equivalence claim.

## Scorecard

| Priority | Category | Score / 10 | Rationale / action |
| --- | --- | ---: | --- |
| 1 | Data-flow spine clarity | 9.5 | Distinct pre- vs post-auth return paths; no hidden route. |
| 2 | Ownership and boundary encapsulation | 9.5 | Helper measures; desktop explains; writer and supervisor remain distinct. |
| 3 | API/interface/command clarity | 9.4 | Single operation-qualified reserved status; no authority expansion. |
| 4 | Separation and placement | 9.4 | Corrections at existing process/verification boundaries. |
| 5 | Shared structure/model | 9.4 | Shared status without a new storage or transfer schema. |
| 6 | Naming and readability | 9.3 | Cause/status distinguishable; no arbitrary output trusted. |
| 7 | API/E2E readiness | 7.5 | Approving AC-003 now would repeat a visible failure; fix acquisition guidance first. |
| 8 | Runtime correctness and behavioral fidelity | 7.5 | IR-006 paths corrected; F-CR-003 still contradicts the same recovery contract. |
| 9 | No legacy retention | 9.5 | No fallback on trust failure or data migration. |
| 10 | Cleanup completeness | 9.3 | Existing rollback/owned cleanup preserved; evidence distinguishes rollback from recovery guidance. |

Rounded summary **9.0/10**; not a pass rule. No speculative score deduction.

## Latest result and route

**CRR-006 Fail — implementation-owned Local Fix, F-CR-003.** F-API-03/04 are resolved at source, awaiting independent execution. The new finding is the ticket's own first-install behavior, not a defect introduced by IR-006, a test problem or a changed business decision. Return to **/implementation_engineer**; source rereview before independent API/E2E. On eventual pass, rerun both IR-006 graphical failures and controls plus affected acquisition refusals on current signed test packages; retain SR-015 isolated native Linux package/smoke boundary. API-REV-003 remains Fail. No post-success test review, delivery, publication or release authorized.
