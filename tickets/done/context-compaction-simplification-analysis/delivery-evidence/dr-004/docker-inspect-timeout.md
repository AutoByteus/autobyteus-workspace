# Supplemental local manifest probe

A read-only `docker buildx imagetools inspect autobyteus/autobyteus-server:1.4.92-beta.7`
produced no output for over3minutes while CI was still publishing. Delivery stopped
only its own matching docker/buildx CLI processes with TERM; no Docker daemon,
image/container or app was stopped/changed. This is not successful image verification
and not a CI failure. CI publication receipt / registry verification is separate.

Follow-up: the owned process tree included docker-credential-desktop get and was
fully stopped. Public anonymous registry HTTP200 metadata independently verified
both versioned and floating beta multiarch manifests. See docker-publication-final.json;
all release CI workflows subsequently succeeded. The local probe is still not Pass.
