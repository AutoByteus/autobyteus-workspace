# IMP-D001 — Source-generation ownership is not the existing link lease

## Result and scope

**Design Impact**, identified during implementation preparation against SR-018 /
ARCH-REV-002. No production change or executable validation is claimed. Source
basis: `e642fd477d071e21d46a8d3b09c5370c5bbdba28` in the assigned worktree.
`source-audit.json` records the exact inspected file hashes.

This is one narrow correction to the private configured-skill design, not a
request to reopen hosting, trusted-LAN policy, physical-test sequencing, or
DEC015. ARCH-REV-002 remains the completed architectural Pass. D-001 remains
deferred, not repaired. No new outage/worker/stream machinery is requested.

## Design instruction that cannot be reused as written

`design-spec.md`, Configured Skills And Runtime Lifecycle (lines 173–185),
requires resolving the managed-source generation/lease, registering exact
profile/source leases before awaited preparation, and releasing after exact
process close. It says source-generation acquisition/publication stays with
the existing skill owner and the profile uses its pinned generation. The AGY
row similarly says to keep its private source leases. Its file map allocates
runtime profile/capsule work but no new source-retention boundary.

**The current implementation does not provide source-generation leases.** Its
link-holder receipts cannot be used as source-retention authority. Private
profile ownership and source-byte ownership are different lifetimes.

## Forward production trace

Paths are relative to the worktree root, not the integration checkout.

1. A user opens **Skills → Sources**, chooses **Update** and confirms it:
   `autobyteus-web/components/skills/SkillSourcesModal.vue:23,72–76,233–247`.
   This is an existing supported UI operation, not manual state corruption.
2. `autobyteus-web/stores/skillSourcesStore.ts:122–145` sends the source-ID
   mutation. `autobyteus-server-ts/src/api/graphql/types/skills.ts:327–332`
   delegates Update/Remove to `SkillSourceService`.
3. `autobyteus-server-ts/src/skills/services/skill-source-service.ts:154–187`
   prepares a new generation and publishes it; `afterPublication:213–219`
   calls repository cleanup with only the current generation to keep.
   The source operation's private serialization (`250–255`) does not accept
   runtime holders or protect a profile's acquisition.
4. `autobyteus-server-ts/src/skills/installers/github-skill-repository.ts:63–88`
   deletes every other owned generation. There is no runtime reference-count
   check. Removal (`skill-source-service.ts:190–198`) similarly retires the
   catalog record and deletes owned source files without draining agents.
5. `SkillService.resolveManagedSkillForMaterialization` (`skill-service.ts:
   170–173`) returns the current catalog winner for source ID/name. It does not
   acquire, pin or return a release token.
6. `workspace-skill-materializer.ts` receipts are keyed by materialized path
   plus holder ID (`392–399`). Acquisition can transfer an owned link and its
   holders to the newly selected generation (`acquireManaged`); release
   (`447` onward) removes the exact workspace link after its final holder.
   It does not prevent the source repository from deleting an older tree.
7. AGY `agy-configured-skill-linker.ts:101–109` creates a private directory
   symlink after validating the source. It does not obtain a source lease.
   `agy-run-capsule.ts:100–107` explicitly handles removed source on restore
   by dropping its dangling private link and warning, not by recovering a
   pinned generation.

Current `autobyteus-server-ts/docs/modules/skills.md`, Managed GitHub source
lifecycle and Workspace collision policy, explicitly describes retirement
after publication, no active-context refresh, and **no snapshot guarantee** for
older runs. These are current contracts, not an inferred missing safety feature.

The existing `tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts:187–213`
encodes A running → source update → B acquisition → both close orders, with
the old source both deleted and deliberately retained. It expects the old
source to be absent in the normal cleanup case despite A's remaining holder.
**Inspected only; not executed in this round.** The test corroborates the
production contract; it does not independently establish a new scenario.

## Why implementation needs a design correction

A private symlink is permitted by SR018, but it cannot meet a claimed pinned
source lifetime by reusing the current holder. A complete private copy is also
permitted by SR018, but that is a profile-owned snapshot, not an existing
source lease. Treating them as interchangeable would obscure which owner can
remove which bytes and what an Update/Remove does. Adding source retention
inside a runtime profile would bypass the existing source deletion authority;
changing the source owner to defer cleanup is a new lifecycle contract, not a
mechanical adaptation of the existing lease.

The ordinary peer-stop defect FR011 does **not** by itself require source-byte
pinning. Independent private profile ownership can solve peer-stop without
changing Update/Remove semantics. Likewise, source cleanup is not being called
a new baseline bug: current docs explicitly permit it.

## Required narrow resolution (Solution Designer)

Reconcile the private-profile section/interface/file map with actual source
ownership. Prefer the smallest solution preserving the existing source policy;
do not infer a new retained-generation guarantee from this finding. State:

- whether an execution holds private links with the existing source-availability
  limitations, or a complete profile-owned snapshot, or deliberately introduces
  source leases;
- the source acquisition/current-selection and cleanup authority for the chosen
  form; distinguish exact process/profile release from source deletion;
- how the existing AGY capsule follows that decision, without inventing an
  already-present source lease;
- the concrete affected owner/files and proportionate local checks. If a new
  source-retention contract is actually intended, handle its scope/approval and
  Update/Remove behavior explicitly rather than introducing it in implementation.

This requests a technical ownership decision within the already delegated v1
direction, **not another user questionnaire** or a new outage/chaos gate.
No requirement is being changed by the implementation engineer. BEH002/005,
REQ003/010 and the local/configured-skill preservation boundary are the relevant
constraints; an old-generation snapshot is not claimed to be a separate AC.

## Validation and limits

Static source/contract inspection only. No dependencies installed, production
source changed, product build, unit/API/E2E suite, provider invocation, mount,
export, VM, container, credentials, user-data mutation or release. A linked
profile losing retired source is a consequence of the source trace above, not
a newly executed NFS/runtime failure. All original healthy setup, runtime,
preview, peer-stop, independent physical and explicit user-verification work
remains. Return the corrected cumulative package through the configured route.
