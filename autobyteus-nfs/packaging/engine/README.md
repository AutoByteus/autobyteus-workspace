# Corrected Noble Ganesha release input (SR020)

This release-owned recipe keeps Ubuntu 4.3-8ubuntu1 sources, distro patches/rules
and adds only upstream commit98eb77c4fd94effa6882b214698a77752ec79f6e's two dispatch
substitutions. Backport provenance is in get-dir-delegation.patch; it is not the
prototype quilt template. Version4.3-8ubuntu1+autobyteus1 is distinct from Ubuntu.
The changelog's build@example.invalid is an explicit automated build identity,
not an assertion of authorship of the upstream fix. Fixed SOURCE_DATE_EPOCH is
2026-10-14 UTC. Exact rebuilt bytes are locked; reproducibility is not presumed.

Build only on an isolated Ubuntu24.04 native arm64/amd64 builder with authenticated
Ubuntu deb-src enabled. Install build-essential, devscripts, fakeroot, curl,
ca-certificates, lsb-release and exact-source build dependencies using the distro
index (`apt-get build-dep nfs-ganesha=4.3-8ubuntu1`). Then, as nonroot:

    python3 build.py --work /owned/new-work --output /owned/new-output --base <actual-pinned-builder>

Output contains only the main/VFS runtime pair, full corresponding modified Debian
source (original tar, modified delta, dsc, this recipe and copyright), build
inventory/buildinfo, copyright and immutable manifest. It does not install any
engine. Other FSAL/dev/debug build outputs are deliberately not distributed.

Merge manifests once per candidate and retain those exact artifact bytes for
native and Docker builds and eventual authorized publication. Changed package or
recipe identities invalidate qualification. End users never run this recipe or
need a compiler/PPA/package command. No artifact is qualified merely by building.
