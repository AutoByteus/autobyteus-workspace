# Code Review Report — autobyteus-305, build step 1 (signed server package)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-003; editorial SR-005)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited sections only)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-005, `Ready`)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001..FU-005); `options-report.md` not reopened (design governs)
- Relevant Solution Revision IDs: `SR-005`
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass, round 2; N-1)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-002`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation of build step 1 ready (IR-001)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update`, `origin/personal@9d59ab82ec..4a968218e9` (code in `01c56f1b95`, `5c33c1b7b0`).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. Step 1 alone changes the image build, a CI job with `contents: write` and a signing secret, the launcher, and the supply-chain trust anchor (public key). No correction.

## Review Scope

- Changed implementation and behavior reviewed: design-spec "Change / Refactor Sequence" step 1. That is the `server-package` Dockerfile stage and the runtime pinned by digest; `system-level.json` and its check; the workflow's level check, digest per variant and `publish-server-package` job; the describe, sign and key-generation scripts; the public key; the removal of `bootstrap.sh` and its environment; the moved consumers of the old layout; and the docs (DESIGN.md rule 9 exception, GLOSSARY, RELEASE.md, TESTING.md, Docker README).
- Files / areas reviewed: all 30 changed non-ticket files (`git diff --stat origin/personal...HEAD -- . ':!tickets'`). Also read for context: the unchanged `release-desktop.yml` and `release-android.yml` release-creation steps, `container-config.sh` hash inputs, `scripts/desktop-release.sh`, and the migration folders.
- Explicit exclusions: steps 2–5 (starter, C1/C2, launcher `update`, desktop UI, resume). They are not implemented and not reviewed here.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-009/AC-011 (each release publishes a signed package per architecture; the image's built-in package is the same), groundwork for REQ-004 (signature) and REQ-008 (system level), BEH-001 preserved, Removal plan.
- Design-spec behavior map verified against the implementation: DS-004 matches the code in call order: prepare-release → check-system-level → build/push from the digest → per architecture `docker create`+`cp` → tar/gzip → describe → sign (verified against the committed public key) → wait for the release → upload archive, description and signature with `--clobber`. The three workflow forms match the DS-004 table. The package job is gated on `build_variant == ''`, so zh dispatches skip it.
- Design review report and round confirmed: ARCH-REV-002, round 2, Pass. N-1 was applied: `<node>-server-packages`, and `system-level.json` uses the DS-004 shape.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered |
| --- | --- | --- | --- |
| BEH-003 (REQ-009, AC-011) | Confirmed | `Dockerfile.monorepo:47-65,121`; workflow `publish-server-package`; `describe-server-package.mjs`, `sign-server-package.mjs`. IMP-06/IMP-07: archive equals the image folder byte for byte (files, links, modes); the signature verifies, and a tampered description does not; 0.28 GB | — |
| BEH-005 groundwork (REQ-008) | Confirmed | `check-system-level.mjs` hashes `baseImages` plus the Dockerfile from `FROM … AS runtime` to the marker, and refuses a default digest that differs from `baseImages.default`; `server-package.json.systemLevel` | — |
| BEH-001 (preserved) | Confirmed | supervisord program `cd /opt/autobyteus/server-package && exec node dist/app.js …`; launcher loses only dead `-e` args; `CONFIG_HASH_VERSION` unchanged and those args are not hash inputs (`container-config.sh:2-11`, read); IMP-05, IMP-09 | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR-S1 | REQ-009, AC-011, DS-004 | Operational | Release owner | Tag push publishes a release | `v*` tag push (`scripts/desktop-release.sh`) | Normal | DS-004 as traced above | Image plus 6 package files on the release | RELEASE.md; workflow triggers | Supported Normal Scenario | Use |
| CR-S2 | DS-004 form 2 | Operational | Release owner | Re-publish an existing tag | manual dispatch with `release_ref` | Explicit Edge | same job, `--clobber` | Files replaced, image matches | workflow inputs; Docker README "release_ref" | Supported Explicit Edge Scenario | Use |
| CR-S3 | DS-004 form 3, A-1 | Operational | Release owner | Publish the zh variant, including for a tag older than this change | manual dispatch `publish_zh` | Explicit Edge | check step refuses a ref without `system-level.json`, otherwise builds from the zh digest; no package job | zh image; old refs pointed to their own workflow | workflow `publish_zh` input; Docker README | Supported Explicit Edge Scenario | Use |
| CR-S4 | REQ-009 prerequisite | Contract | Release workflows | GitHub release exists before the upload | Desktop **or** Android workflow (`softprops/action-gh-release`, whichever finishes first) | Normal | wait loop `gh release view` up to 30 min | Upload after creation; partial release otherwise (R-05) | `release-desktop.yml:668-705`, `release-android.yml:417-441`; RELEASE.md case `v1.5.9-beta.14` (Android-only release) | Supported Normal Scenario | Use |
| CR-S5 | BEH-001 | Operational | Node owner | `autobyteus-docker upgrade --all` to a step-1 image | launcher | Normal | recreate on image-ID change; volumes kept | Server runs from the package | IMP-05/IMP-09; left to API/E2E for a real upgrade | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CC-01 | A-1: refuse a `release_ref` without `system-level.json` instead of keeping `BASE_IMAGE_TAG` | CR-S3; Principle 8 | zh dispatch of an older tag | Without the refusal, the old Dockerfile ignores `BASE_IMAGE_DIGEST` and builds zh on the default `latest` base. The refusal comes before any build | workflow "Check system level"; test `…refs_before_packages` | Reject (as a defect): the mechanism is correct | — | Confirmed. Clean cut, explicit outcome, a way out is named. See CR-N1 for its wording |
| CC-02 | The A-1 way-out command omits the variant input | CR-S3 | Operator copies the printed command for a zh re-publish | Without `-f publish_zh=true`, the old ref's workflow publishes the **default** variant: it re-pushes `:<version>` and, for a stable ref, `:latest` | `release-server-docker.yml` error line; base prepare-release tags logic | Promote, non-blocking | This ticket | One-line message fix; recorded as CR-N1. It does not affect the score or route: the message already says to re-publish "with the workflow of that ref", and the operator chooses the inputs |
| CC-03 | A-2: `rm` of the self-link plus the escaping-link guard | CR-S1; AC-011 | Every image build | `docker cp` refuses an escaping link. `rm` without `-f` fails loudly if pnpm stops making it. The guard fails the image build, not the release | Dockerfile:55; `escapingLinks`; IMP-06/07 extraction worked | Reject (as a defect) | — | Confirmed: right place (build time), no server code resolves its own name |
| CC-04 | The package version comes from `autobyteus-web/package.json`; a version different from the tag is refused only after the image push | CR-S1, CR-S2 | Tag push | Tag pushes cannot mismatch: `release-desktop.yml:101-105` enforces web version = tag, and `desktop-release.sh` bumps it before tagging. A mismatch needs a dispatch with a `release_ref` branch whose version is not the tag | read | Reject: Technically Possible but Unsupported/Contrived | — | — |
| CC-05 | `escapingLinks` treats an absolute link inside the package as not escaping | CR-S1 | — | pnpm deploy writes relative links; IMP-06/07 found every link portable (byte-identical extraction) | — | Reject: not reachable | — | — |
| CC-06 | `dataMigrations` reads only directories | DEC-005 contract (C3) | Every build | Every Prisma and app-data migration is a folder. The only file is `migration_lock.toml`, which is correctly excluded | `ls -p` of both folders | Reject (as a defect) | — | Confirmed |
| CC-07 | CLI installs float (`latest`, cache buster) inside the hashed "system part", without a level change | DEC-006 | Every build | Accepted by DEC-006: CLIs stay at the image's versions | requirements DEC-006 | Reject | — | By decision |
| CC-08 | `CONFIG_HASH_VERSION` stays `v6` | BEH-001 | Launcher update | The removed `-e` args are not hash inputs. A new image recreates by image ID anyway | `container-config.sh:2-11` | Reject (as a defect) | — | Confirmed |
| CC-09 | Workflow comment says the Desktop workflow creates the release; the Android workflow can create it too | CR-S4 | — | The wait loop works for either; wording only | `release-android.yml:417-441` | Promote, non-blocking | This ticket | CR-N2, wording |
| CC-10 | GLOSSARY "Built-in server package … the same folder that image's release publishes" is not true for zh images (built in their own run; AC-011 excludes zh) | Principle 15; DS-004 table | — | Wording only | design-spec DS-004 form 3 | Promote, non-blocking | This ticket | CR-N3, wording |
| CC-11 | "Free runner disk space" step duplicated in two jobs | Principle 13 | — | Two copies of one cleanup list in one workflow | workflow | Reject | — | Proportionate in YAML; a composite action would add a file for 8 lines |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | `No Design Issue Found`; no server source changed; read-only start (IMP-08) holds A-13 | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | DS-004 forms, C3 fields, Removal plan, consumers list (AR-005) all match | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-004 implemented in call order in one workflow; one writer per artifact | — |
| Ownership boundary preservation and clarity | Pass | `describe-server-package.mjs` is the one writer of C3 and `server-package.json`; `check-system-level.mjs` is the one level check; the release version's one owner stays `autobyteus-web/package.json` | — |
| Off-spine concern clarity | Pass | Level check and signing are off the build's main line, as owned scripts | — |
| Existing capability reuse | Pass | Reuses `onnxruntime-web-packaging.mjs`, `extract_step` and `run_bash` test helpers, the existing disk-free step | — |
| Reusable owned structures | Pass | No duplicated description shape; `base_image_digest()` appears in `build.sh` and `build-multi-arch.sh` (two existing sibling scripts that already repeat their argument handling) | — |
| Shared-structure tightness | Pass | `server-package.json` has 5 fields; the description adds only `archive`; no duplicate version fields | — |
| Repeated coordination ownership | Pass | Digest selection owned by `system-level.json` (workflow via `jq`, scripts via `node`), drift between Dockerfile default and file refused | — |
| Empty indirection | Pass | — | — |
| Separation of concerns / file responsibility | Pass | Four scripts, one concern each (≤142 lines) | — |
| Ownership-driven dependency | Pass | Scripts import Node built-ins only (design dependency rule) | — |
| Authoritative Boundary Rule | Pass | No caller reaches past `describe` into its internals; sign checks against the committed public key | — |
| File placement | Pass | `scripts/server-package/`, `autobyteus-server-ts/docker/` as the design maps | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface clarity | Pass | `describe` subcommands `package-json` / `description` take explicit options; strict option parsing | — |
| Naming quality / one vocabulary | Pass (CR-N3 wording) | "server package", "built-in server package", "system level" used consistently; "build" not used as a noun for the package | Optional: CR-N3 |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files | Pass | `bootstrap.sh`, its `COPY`/`chmod`, entrypoint call and path check, `WORKSPACE_ROOT`/`BIND_HOST`, `AUTOBYTEUS_WORKSPACE_ROOT`/`SKIP_SYNC` (launcher bash and PS, compose, `.env.example`, `docker-start.sh`, e2e). `git grep` finds no leftover reference outside `test-results/` logs and the retired-asset guard | — |
| Test scenarios and assertions clear and requirement-aligned | Pass | 20 tests: they run the workflow's own step bodies with fake `docker`/`gh`, check that the signature verifies over the exact bytes, that the archive tree equals the image folder, the upload order, refusals and key custody (no `PRIVATE KEY` in output) | — |
| Test fixtures / helpers reusable and coherent | Pass | Reuses `test_release_channel_workflow_steps` helpers; one fixture builder | — |
| No stale / duplicated / compatibility-only tests | Pass | Old-layout assertions updated, not kept | — |
| API/E2E readiness | Pass | Images kept for reuse; probes' paths moved; handoff lists what remains (real release, two Docker probes, upgrade path) | — |

## Source File Size And Structure Audit

| Source File | Before (non-empty) | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `.github/workflows/release-server-docker.yml` | 225 | 353 | Pass | Pass (+128) | Pass | Pass | — | — |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | 120 | 121 | Pass | Pass | Pass | Pass | — | — |
| `scripts/server-package/describe-server-package.mjs` | new | 142 lines | Pass | Pass | Pass | Pass | — | — |
| `scripts/server-package/check-system-level.mjs`, `sign-…`, `generate-…` | new | 58 / 46 / 46 | Pass | Pass | Pass | Pass | — | — |
| `build.sh`, `build-multi-arch.sh`, `entrypoint.sh`, launcher files | small | small | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | `BASE_IMAGE_TAG` removed outright; old refs refused with a way out (A-1) |
| No legacy old-behavior retention | Pass | The `/app` server layout is gone; only the `<node>-workspace` mount remains (FU-004, user approval needed) |
| Dead code removed in touched files | Pass | See structural row |
| Approved persisted-data transition followed | Pass | `Not Affected`; the new compose volume is mounted empty |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change.
- Why: new release assets, secret, level rule, rule-9 exception, glossary terms, test-node recipe.
- Files: `DESIGN.md`, `GLOSSARY.md`, `RELEASE.md`, `TESTING.md` (own commit, as TESTING.md requires), `autobyteus-server-ts/docker/README.md`. The root `README.md` Docker section names only launcher volumes; it changes with the launcher volume in step 2 (handoff). Agreed.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

No premise from ARCH-REV-002 bears on step 1 beyond those confirmed above. None is new or reclassified.

## Review Scorecard (Mandatory)

- Overall score: `9.5/10` (simple average)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | DS-004 is one readable job in call order; the three workflow forms behave as the design table says | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | One writer of C3; one level check; one version owner; the sign step verifies against the committed key | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | C3 is concrete and frozen with explicit types (string ABI, bare base64, contents at the archive root), and the evidence shows real examples | The A-1 way-out message omits the variant input (CR-N1) | Print `-f publish_zh=true` for zh |
| 4 | Separation of Concerns and File Placement | 9.5 | Small, single-concern scripts in the mapped folders | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.6 | `server-package.json` = description minus `archive`; migration kinds prefixed to avoid collisions | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | Terms match GLOSSARY; comments explain the why (self-link, upload order) | Two wording slips (CR-N2, CR-N3) | Fix the wording |
| 7 | API/E2E Readiness | 9.4 | Local images, moved probe paths, clear list of what only a release proves | Real release path and the two heavy probes not yet run (by necessity) | API/E2E runs them |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Byte identity on both architectures, signature checks, read-only start, CLI smoke | The secret/key pair is proven only by the first release (the sign step fails closed on a mismatch) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | `BASE_IMAGE_TAG` dropped without a dual path; bootstrap removed everywhere | — | — |
| 10 | Cleanup Completeness | 9.5 | All Removal-plan items plus dead `BIND_HOST`; retired-asset guard extended | — | — |

## Findings

No blocking findings.

Non-blocking notes (this ticket; implementation may take them with step 2 or before delivery; they do not reopen this review):

- **CR-N1** (CC-02): `release-server-docker.yml`, "Check system level", the refusal for a ref without `system-level.json` prints `gh workflow run release-server-docker.yml --ref <ref> -f release_tag=<tag>`. For a zh dispatch it should also print `-f publish_zh=true`. Otherwise, following it re-publishes the default variant, re-pushing `:<version>` and, for a stable ref, `:latest`.
- **CR-N2** (CC-09): the comment above "Wait for the GitHub release" says the Desktop Release workflow creates the release. The Android workflow can create it too (`release-android.yml:417-441`; case `v1.5.9-beta.14`). Say "the Desktop or Android Release workflow". The Docker README line has the same wording.
- **CR-N3** (CC-10): GLOSSARY "Built-in server package … the same folder that image's release publishes". This holds for default-variant images only; zh images build their own (design DS-004, form 3). Add "for default-variant images", or drop the clause.

Assumptions the implementation asked about, all confirmed:
- A-1 (refuse old refs instead of a `BASE_IMAGE_TAG` dual path): confirmed (CC-01).
- A-2 (remove the self-link, refuse escaping links at build time): confirmed (CC-03).
- C3 frozen details (`prisma/`/`app-data/` prefixes, string `nodeModuleVersion`, bare base64 signature, contents at the archive root): consistent with the design's C3 and with `process.versions.modules`, which the step-3 verifier will compare.
- `CONFIG_HASH_VERSION` stays `v6` until the step-2 volume: confirmed (CC-08).

## Follow-ups

- Follow-ups this review added: None.

## Classification

N/A (Pass).

## Recommended Recipient

- API/E2E engineer, per `get_handoff_rules` (primary pass rule); implementation engineer informed.

## Residual Risks

- Only the first release proves the real release path: the secret/key pair, the runner disk for pulling both architectures, and the 30-minute wait (R-05). The sign step fails closed on a key mismatch, and a missing release fails the job with a clear message (partial release in the RELEASE.md sense).
- Any edit in the runtime system part, including the CLI install lines, now needs a level raise (by design).
- AC-011 is proven locally on the workflow's own step bodies (IMP-06/07), not on GitHub yet.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5/10; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: the non-blocking notes CR-N1..CR-N3 are wording and message fixes. API/E2E should run the two Docker probes (`prisma-engine-discovery.docker.mjs`, `nodes-docker-address-probe.mjs`) against `autobyteus-server-305-test:step1`, the launcher upgrade path on test-owned nodes, and the compose start. Do not touch `autobyteus-server-0/1/2`.
