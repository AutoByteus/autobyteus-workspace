# CRR-001 / CR-001 — first-use installer permission trace

## Independent scenario basis

Approved SR018 SCN-001/011/013, REQ-006/013/018/019 and AC-012/018/019 require a normal supported computer's single install-and-start invocation to complete setup and print a usable folder after the user grants administrator approval. The actor is the participating computer's user/storage owner. This is first installation with no product-owned directories yet, not an artificial concurrent operation, hostile file mutation, or outage. The current release is deliberately unqualified: the path below is the **approved target production release path**, not a claim that an installer is already published.

## Forward path and permission consequence

1. Release packaging embeds the version in `scripts/public/nfs/install.sh`. Line4 sets `umask 077`; line45 invokes the installed binary without changing that mask.
2. `autobyteus-nfs/internal/cli/run.go:62–66` obtains administrator approval and calls `Elevate`. `cli/install.go:28` runs `/usr/bin/sudo -- <binary> internal-install …`. No mask reset exists in these callers or `InstallRoot`.
3. The installed local `sudoers(5)` manual reports that `umask_override` defaults off; the normal policy unions the invoking mask with its configured mask. Thus 077 is not relaxed by default elevation. This agrees with the [upstream sudo policy manual](https://github.com/sudo-project/sudo/blob/main/docs/sudoers.man.in) (`umask_override` and `umask` sections). No actual sudo invocation or inspection of private sudo policy was performed.
4. `cli/install.go:43–50` creates private config and separately intended-0755 executable parents using `platform.RootDirectory`. `platform/commands.go:71–82` recursively creates missing parents with `os.Mkdir(p, mode)` and does not set their final modes. Go applies the caller's umask to `Mkdir` permissions, so requested0755 becomes0700 with077. See [Go os.Mkdir contract](https://pkg.go.dev/os?GOOS=linux#Mkdir).
5. `TrustedPath` (`platform/commands.go:55–60`) accepts root-owned0700 directories: it rejects group/other writes, not missing traversal. `AtomicFile` does chmod the executable itself0755, but does not repair its parents.
6. Fresh Mac `/Library/AutoByteusNFS` and `libexec`, or Linux `/usr/libexec/autobyteus-nfs` (and a missing intermediate parent), consequently lack nonroot traversal. This contradicts `autobyteus-nfs/README.md:87–90`'s separately traversable executable contract.
7. `service/probe.go:119–138` and `143–158` launch that fixed binary after selecting the nonroot credential. Directory search permission is required for exec: these children cannot reach it through a root0700 parent. Create/connect therefore cannot finish the mandatory nonroot verification; source creation can fail first.
8. The same mask reaches `cli/run.go:74` for `/etc/autobyteus-nfs` and `setup/apply.go:158–163` for its public `nodes/` directory. If reached, these become0700 too; chmod0644 on JSON is insufficient to allow a nonroot desktop/launcher to read through those parents. This is the same root cause, not a second speculative finding.

## Personally executed diagnostic and limit

Command from the worktree:

```sh
python3 tickets/in-progress/shared-network-workspaces/code-review-evidence/crr-001/check-installer-umask.py
```

`installer-umask-result.json`: both verifier and final create child observe077; requested0755 mkdir yields0700. The diagnostic copies the **current installer**, changes only its release-tag placeholder, doubles platform/download assets and the binary, and uses real shell/tar/checksum/install behavior. The fake binary observes mask and equivalent OS mkdir semantics, not Go `RootDirectory` or root ownership. All temporary download/home resources were removed. There was no network download, sudo, OS installation, export/mount, daemon, Docker, provider or live user-data action.

The missing nonroot access is a source/OS-contract inference from this observed inherited mask plus the traced root installation and credential drop, **not an executed privileged installation failure**. Default elevation and newly created product directories are explicit preconditions. An already permissive directory or a custom permissive sudo policy can mask the defect; neither is the fresh-install contract.

## Proportionate correction / revalidation

Honor the intended modes for newly owned public and executable directories despite the installer's mask; keep private configuration/receipts0700 and refuse unsafe pre-existing paths rather than broadly chmod/adopt them. Add a regression spanning restrictive-mask bootstrap/installation and intended nonroot binary traversal/public descriptor access, including the necessary parent directories. Keep downloads private. No source-data permission relaxation, new lifecycle framework, outage isolation or upstream behavior change is needed.

The existing six installer/packaging tests pass but fake the executable and do not assert the root directory/nonroot boundary. They are useful archive/plumbing checks, not proof against this defect. Actual clean-machine privileged proof remains an authorized downstream gate.
